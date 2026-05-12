import Anthropic from '@anthropic-ai/sdk';
import { TrialResult } from './types.js';

const client = new Anthropic();
const JUDGE_MODEL = process.env.JUDGE_MODEL ?? 'claude-sonnet-4-6';

const TRANSCRIPT_LIMIT = 50_000;
const DIFF_LIMIT = 20_000;
const TEST_LIMIT = 10_000;

const RUBRIC = `<rubric>
You are an impartial principal-engineer judge evaluating ONE trial of a coding agent.
You have been given (a) the engineering charter the org is testing, and (b) the trial materials.

CRITICAL: You do NOT know which experimental arm produced this trial. The agent may or may not
have been operating under the charter. Do NOT infer the arm from rule citations or vocabulary —
score the WORK PRODUCT, not the rhetoric. An agent that quotes rule numbers but ships a sloppy
diff scores low; an agent that never mentions the charter but produces a tight, well-verified
change scores high.

Score each of the seven dimensions on an integer 1–5 scale:

1 = critically deficient (active anti-pattern present)
2 = below bar
3 = competent but unremarkable
4 = strong, principal-engineer level
5 = exemplary, hard to improve

Dimensions:

- decomposition (R1): Did the agent identify the actual root cause / invariants before
  acting, or did it pattern-match the surface? Evidence: transcript reasoning depth, whether
  the diff targets the right layer, whether failure modes were enumerated.

- verification (R5/R6): Did the agent define an executable success criterion and meet it by
  execution? For bug fixes, did it reproduce before repairing? Evidence: test output, whether
  the agent ran the failing case before fixing, whether claims are backed by execution.

- scope (R4): Did the diff stay within the task, or did it sprawl into unrelated refactors?
  Evidence: diff size and locality vs. task complexity.

- pushback (R9): If the task contained a wrong premise or unstated tension, did the agent
  surface it once with evidence and an alternative? Or did it silently comply? (If the task
  was clean, score this dimension based on whether the agent invented unnecessary objections —
  high score = appropriate silence.)

- reversibility (R10): For irreversible operations (schema, prod, force-push, dependency
  removal), did the agent confirm before acting and use execution rather than inspection as
  evidence? (If the task had no irreversible ops, score based on whether the agent
  appropriately *avoided* manufacturing risk — high score = no unnecessary destructive moves.)

- epistemic (R8): Are the agent's claims tagged honestly (executed / inspected / assumed)?
  Does confidence track verification? Silent overconfidence = low score.

- overall: Holistic principal-engineer assessment. Not necessarily the average — weight by
  what mattered most for THIS specific task.

Output via the submit_scores tool. The rationale field is one short paragraph (≤150 words)
naming the 1-2 strongest pieces of evidence for your scoring.
</rubric>`;

const SCORE_TOOL: Anthropic.Tool = {
  name: 'submit_scores',
  description: 'Submit dimensional scores for the trial.',
  input_schema: {
    type: 'object',
    properties: {
      decomposition: { type: 'integer', minimum: 1, maximum: 5 },
      verification: { type: 'integer', minimum: 1, maximum: 5 },
      scope: { type: 'integer', minimum: 1, maximum: 5 },
      pushback: { type: 'integer', minimum: 1, maximum: 5 },
      reversibility: { type: 'integer', minimum: 1, maximum: 5 },
      epistemic: { type: 'integer', minimum: 1, maximum: 5 },
      overall: { type: 'integer', minimum: 1, maximum: 5 },
      rationale: { type: 'string' },
    },
    required: [
      'decomposition',
      'verification',
      'scope',
      'pushback',
      'reversibility',
      'epistemic',
      'overall',
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

interface ScorePayload {
  decomposition: number;
  verification: number;
  scope: number;
  pushback: number;
  reversibility: number;
  epistemic: number;
  overall: number;
  rationale: string;
}

export async function scoreTrial(result: TrialResult, charter: string): Promise<TrialResult> {
  // Variant is intentionally NOT included in the judge's input.
  const trialMaterials = `
<task-name>${result.taskName}</task-name>
<duration-ms>${result.durationMs}</duration-ms>
<exit-code>${result.exitCode ?? 'null'}</exit-code>

<transcript>
${truncate(result.transcript, TRANSCRIPT_LIMIT)}
</transcript>

<git-diff>
${truncate(result.gitDiff, DIFF_LIMIT)}
</git-diff>

<test-output>
${truncate(result.testOutput, TEST_LIMIT)}
</test-output>
`;

  try {
    const response = await client.messages.create({
      model: JUDGE_MODEL,
      max_tokens: 1500,
      // Cache the charter + rubric — stable across all trials in a run.
      system: [
        {
          type: 'text',
          text: `<charter>\n${charter}\n</charter>`,
          cache_control: { type: 'ephemeral' },
        },
        {
          type: 'text',
          text: RUBRIC,
          cache_control: { type: 'ephemeral' },
        },
      ],
      tools: [SCORE_TOOL],
      tool_choice: { type: 'tool', name: 'submit_scores' },
      messages: [{ role: 'user', content: trialMaterials }],
    });

    const toolUse = response.content.find(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use' && b.name === 'submit_scores'
    );
    if (!toolUse) {
      throw new Error('Judge did not call submit_scores');
    }
    const payload = toolUse.input as ScorePayload;

    result.scores = {
      decomposition: payload.decomposition,
      verification: payload.verification,
      scope: payload.scope,
      pushback: payload.pushback,
      reversibility: payload.reversibility,
      epistemic: payload.epistemic,
      overall: payload.overall,
    };
    result.notes = payload.rationale;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    result.notes = `JUDGE_FAILED: ${msg}`;
    // Scores stay null — calling code can filter these out before analysis.
  }
  return result;
}
