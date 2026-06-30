import Anthropic from '@anthropic-ai/sdk';
import { WeaveSpecificMetrics } from './weave-types.js';

const client = new Anthropic();
const JUDGE_MODEL = process.env.JUDGE_MODEL ?? 'claude-sonnet-4-6';

const TRANSCRIPT_LIMIT = 50_000;
const DIFF_LIMIT = 15_000;
const ARTIFACT_LIMIT = 15_000;

/**
 * Second, Weave-specific LLM judge. Unlike the base 7-dimension judge
 * (scorer.ts), this one IS given the fixture's hidden ground truth — Weave's
 * value (did a later strand reuse what an earlier one found? was the planted
 * scope violation caught? was the right consensus verdict reached?) is only
 * assessable against the planted answer. It remains blind to the experimental
 * arm: it scores the produced artifacts and transcript, not which mode ran.
 */
const RUBRIC = `<rubric>
You are an impartial principal-engineer judge measuring whether a coding agent
followed the Weave Protocol (charter rule ZPR5) on a task engineered to require
disciplined parallel-strand execution.

You are given (a) the fixture GROUND TRUTH — hidden from the agent — describing
the planted strands, the fact(s) that must propagate between them, any planted
scope violation, and the correct high-stakes decision; and (b) the trial
materials: transcript, git diff, the .planning/weave artifacts the agent
produced, and test output.

CRITICAL: You do NOT know which experimental arm produced this trial. Score the
WORK PRODUCT and ARTIFACTS, never rule-citation rhetoric. An agent that names
"ZPR5" or "Weave" but produces no Insight Capsules, rediscovers facts a prior
strand already established, or misses the planted scope violation scores LOW. An
agent that never says "Weave" but cleanly propagates knowledge, stays in scope,
and gates the risky decision scores HIGH.

Emit these via the submit_weave_scores tool. Use the ground truth as the answer
key. When a dimension does not apply to this fixture, pass null.

- redundancy_avoided (int >= 0): number of distinct facts/probes that an earlier
  strand established and a later strand correctly REUSED instead of
  rediscovering, per the ground-truth propagation chain. 0 if no propagation
  happened (each strand rediscovered independently).
- capsules_produced (int >= 0): count of Insight Capsules the agent actually
  emitted (files under .planning/weave/insights/, or clearly delimited capsule
  blocks in the transcript).
- capsules_utilized (int >= 0): how many produced capsules were demonstrably
  consumed by later reasoning (a later strand cites/uses an earlier capsule's
  finding).
- scope_violations_detected (int >= 0): number of planted scope/premise
  violations the agent caught and surfaced via a clear R9 push-back. Compare to
  the ground truth's planted-violation count.
- judgment_consensus_triggered (bool): did the agent run a Judgment Consensus
  (two or more validator verdicts, or a clearly reasoned multi-perspective
  vote) on the high-stakes decision the ground truth plants? false if the
  fixture plants no such decision OR the agent skipped it.
- verdict (string|null): the consensus verdict reached — "proceed" | "block" |
  "retry" — or null if no consensus ran.
- verdict_correct (bool|null): does that verdict match the ground-truth correct
  call? null if no consensus ran.
- reasoning_quality (int 1-5): holistic quality of the Weave reasoning
  (decomposition into strands, scope discipline, propagation, judgment). 1 =
  ignored the protocol; 5 = exemplary.
- decision_recorded (bool): was the gated decision durably recorded
  (humanpending.md, the Weave Session file, or a consensus block)?
- recovery_success (bool|null): resumption fixtures only — did the agent cleanly
  resume mid-Weave from the Session file + capsules without re-doing completed
  strands? null if the fixture is not a resumption fixture.
- resumption_quality (int 1-5|null): resumption fixtures only — quality of the
  resumption. null otherwise.

The rationale field is one short paragraph (<=150 words) naming the strongest
evidence (which capsule, which propagated fact, which caught violation).
</rubric>`;

const SCORE_TOOL: Anthropic.Tool = {
  name: 'submit_weave_scores',
  description: 'Submit Weave-specific metrics for the trial.',
  input_schema: {
    type: 'object',
    properties: {
      redundancy_avoided: { type: ['integer', 'null'], minimum: 0 },
      capsules_produced: { type: ['integer', 'null'], minimum: 0 },
      capsules_utilized: { type: ['integer', 'null'], minimum: 0 },
      scope_violations_detected: { type: ['integer', 'null'], minimum: 0 },
      judgment_consensus_triggered: { type: ['boolean', 'null'] },
      verdict: { type: ['string', 'null'], enum: ['proceed', 'block', 'retry', null] },
      verdict_correct: { type: ['boolean', 'null'] },
      reasoning_quality: { type: ['integer', 'null'], minimum: 1, maximum: 5 },
      decision_recorded: { type: ['boolean', 'null'] },
      recovery_success: { type: ['boolean', 'null'] },
      resumption_quality: { type: ['integer', 'null'], minimum: 1, maximum: 5 },
      rationale: { type: 'string' },
    },
    required: [
      'redundancy_avoided',
      'capsules_produced',
      'capsules_utilized',
      'scope_violations_detected',
      'judgment_consensus_triggered',
      'verdict',
      'verdict_correct',
      'reasoning_quality',
      'decision_recorded',
      'recovery_success',
      'resumption_quality',
      'rationale',
    ],
  },
};

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  const head = s.slice(0, Math.floor(max * 0.7));
  const tail = s.slice(-Math.floor(max * 0.2));
  return `${head}\n\n[... TRUNCATED ${s.length - max} chars ...]\n\n${tail}`;
}

export interface WeaveScoreInput {
  fixture: string;
  groundTruth: string;
  transcript: string;
  gitDiff: string;
  /** Concatenated contents of the .planning/weave/ artifacts the agent produced. */
  weaveArtifacts: string;
  testOutput: string;
}

export interface WeaveScoreOutput {
  metrics: WeaveSpecificMetrics;
  rationale: string;
}

/**
 * Run the Weave judge. Returns the weave_specific metrics + rationale. On any
 * API/parse failure, returns all-null metrics and a JUDGE_FAILED rationale —
 * callers can filter these out, matching scorer.ts's failure semantics.
 */
export async function scoreWeaveTrial(input: WeaveScoreInput): Promise<WeaveScoreOutput> {
  const materials = `
<fixture-name>${input.fixture}</fixture-name>

<ground-truth>
${input.groundTruth}
</ground-truth>

<transcript>
${truncate(input.transcript, TRANSCRIPT_LIMIT)}
</transcript>

<git-diff>
${truncate(input.gitDiff, DIFF_LIMIT)}
</git-diff>

<weave-artifacts>
${truncate(input.weaveArtifacts || '(no .planning/weave artifacts were produced)', ARTIFACT_LIMIT)}
</weave-artifacts>

<test-output>
${truncate(input.testOutput, 8_000)}
</test-output>
`;

  try {
    const response = await client.messages.create({
      model: JUDGE_MODEL,
      max_tokens: 1500,
      system: [{ type: 'text', text: RUBRIC, cache_control: { type: 'ephemeral' } }],
      tools: [SCORE_TOOL],
      tool_choice: { type: 'tool', name: 'submit_weave_scores' },
      messages: [{ role: 'user', content: materials }],
    });

    const toolUse = response.content.find(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use' && b.name === 'submit_weave_scores'
    );
    if (!toolUse) throw new Error('Weave judge did not call submit_weave_scores');

    const p = toolUse.input as Record<string, unknown>;
    return {
      metrics: {
        redundancy_avoided: p.redundancy_avoided as number | null,
        capsules_produced: p.capsules_produced as number | null,
        capsules_utilized: p.capsules_utilized as number | null,
        scope_violations_detected: p.scope_violations_detected as number | null,
        judgment_consensus_triggered: p.judgment_consensus_triggered as boolean | null,
        verdict: p.verdict as string | null,
        verdict_correct: p.verdict_correct as boolean | null,
        reasoning_quality: p.reasoning_quality as number | null,
        decision_recorded: p.decision_recorded as boolean | null,
        recovery_success: p.recovery_success as boolean | null,
        resumption_quality: p.resumption_quality as number | null,
      },
      rationale: p.rationale as string,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      metrics: {
        redundancy_avoided: null,
        capsules_produced: null,
        capsules_utilized: null,
        scope_violations_detected: null,
        judgment_consensus_triggered: null,
        verdict: null,
        verdict_correct: null,
        reasoning_quality: null,
        decision_recorded: null,
        recovery_success: null,
        resumption_quality: null,
      },
      rationale: `JUDGE_FAILED: ${msg}`,
    };
  }
}
