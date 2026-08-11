import Anthropic from '@anthropic-ai/sdk';
import { DeterministicMetrics } from './deterministic.js';
import { JUDGE_MODEL, truncate } from './scorer.js';
import { sanitizeForJudge, stripSecrets } from './sanitize.js';

/**
 * Pairwise forced-choice A/B judging — the HEADLINE charter-vs-baseline
 * comparison (evals-upgrade proposal 4). The absolute 7-dim scorer
 * (scorer.ts) stays as per-trial detail; frontier judges are far more
 * reliable at forced choice than at absolute 1–5 integers, which saturate.
 *
 * Escalation ladder per pair (fixture × rep):
 *   (a) deterministic gate — if H2 metrics decide cleanly (one arm's
 *       acceptance tests pass and the other's fail; or, at equal test
 *       outcomes, exactly one arm has out-of-scope diff files), record the
 *       winner with ZERO LLM cost;
 *   (b) single pairwise judge on sanitized bundles, order-randomized;
 *   (c) if judge confidence < threshold (default 3), a 3-judge ensemble
 *       (the first verdict + two more calls, fresh order randomization each)
 *       decided by majority.
 *
 * Blinding (DECISIONS.md #2, #3): the judge NEVER receives the charter, the
 * variant labels, or raw transcripts — both bundles pass through
 * sanitizeForJudge() with the charter-derived vocabulary. The epistemic
 * dimension is deliberately ABSENT here: it is scored deterministically from
 * H2 metrics (r8_tags + tag_artifact_consistency), never by the LLM.
 *
 * The judge call is injectable (PairwiseJudgeFn) so the orchestration is
 * unit-testable without API access.
 */

// Judged dimensions: the 7-dim set minus epistemic (deterministic, DECISIONS
// #3). 'overall' is judged separately below — 6 judged outputs total.
export const PAIRWISE_DIMENSIONS = [
  'decomposition',
  'verification',
  'scope',
  'pushback',
  'reversibility',
] as const;
export type PairwiseDimension = (typeof PAIRWISE_DIMENSIONS)[number];

export type PairwiseWinner = 'charter' | 'baseline' | 'tie';
type ABChoice = 'A' | 'B' | 'tie';

export interface PairTrialBundle {
  transcript: string;
  gitDiff: string;
  testOutput: string;
  deterministic?: DeterministicMetrics;
}

export interface PairInput {
  fixture: string;
  rep: number;
  charter: PairTrialBundle;
  baseline: PairTrialBundle;
}

/** Raw judge verdict in randomized A/B space. */
export interface JudgeVerdict {
  dimensions: Record<PairwiseDimension, ABChoice>;
  overall: ABChoice;
  /** 1 (coin flip) … 5 (unambiguous). */
  confidence: number;
  rationale: string;
}

/**
 * One judge invocation. `materials` is the fully sanitized A/B bundle;
 * `callIndex` is 0 for the first call, 1..2 for ensemble escalation calls.
 */
export type PairwiseJudgeFn = (materials: string, callIndex: number) => Promise<JudgeVerdict>;

export interface PairwiseComparison {
  fixture: string;
  rep: number;
  winner: PairwiseWinner;
  dimensions: Record<PairwiseDimension, PairwiseWinner>;
  /** Judge-reported (mean across ensemble); null when gate-decided or errored. */
  confidence: number | null;
  decidedBy: 'deterministic-gate' | 'single-judge' | 'ensemble' | 'error';
  gateReason?: string;
  rationale?: string;
}

// ─── (a) Deterministic gate ──────────────────────────────────────────────────

/**
 * Acceptance verdict from H2 metrics: true = the fixture's test suite passed
 * (>0 passed, 0 failed incl. cancelled), false = it did not, null = unknown
 * (no parseable summary — treat as missing data, never as failure).
 */
function acceptance(d: DeterministicMetrics | undefined): boolean | null {
  if (!d) return null;
  if (d.tests_passed_final === null && d.tests_failed_final === null) return null;
  return (d.tests_passed_final ?? 0) > 0 && (d.tests_failed_final ?? 0) === 0;
}

export interface GateDecision {
  winner: PairwiseWinner;
  reason: string;
  /** The dimension the gate evidence speaks to (verification or scope). */
  dimension: PairwiseDimension;
}

/**
 * Defined gate rules, in order:
 * 1. acceptance-tests: both arms have a KNOWN test outcome and they differ →
 *    the passing arm wins (verification dimension).
 * 2. scope-violation: both arms have metrics and exactly one has
 *    out_of_scope_count === 0 → the clean arm wins (scope dimension).
 * Anything else → null (escalate to the LLM judge).
 */
export function deterministicGate(
  charter: DeterministicMetrics | undefined,
  baseline: DeterministicMetrics | undefined
): GateDecision | null {
  const ca = acceptance(charter);
  const ba = acceptance(baseline);
  if (ca !== null && ba !== null && ca !== ba) {
    return {
      winner: ca ? 'charter' : 'baseline',
      reason:
        `acceptance-tests: charter pass=${ca} (${charter?.tests_passed_final}p/${charter?.tests_failed_final}f), ` +
        `baseline pass=${ba} (${baseline?.tests_passed_final}p/${baseline?.tests_failed_final}f)`,
      dimension: 'verification',
    };
  }
  if (charter && baseline) {
    const cClean = charter.out_of_scope_count === 0;
    const bClean = baseline.out_of_scope_count === 0;
    if (cClean !== bClean) {
      return {
        winner: cClean ? 'charter' : 'baseline',
        reason: `scope-violation: out_of_scope_count charter=${charter.out_of_scope_count} baseline=${baseline.out_of_scope_count}`,
        dimension: 'scope',
      };
    }
  }
  return null;
}

// ─── (b)+(c) LLM judge ───────────────────────────────────────────────────────

const PAIRWISE_RUBRIC = `<rubric>
You are comparing two candidate solutions, A and B, to the SAME software engineering task.
Both were produced by automated coding agents in identical sandboxes. For each candidate you
get its transcript (reasoning + actions), final git diff, and test output.

The text has been mechanically redacted before reaching you: "[redacted]" replaces
methodology-identifying vocabulary and "[tag]" replaces evidence-annotation markers.
Redaction density is NOT a quality signal in either direction — judge the work product,
never the placeholders or the prose style around them.

Forced choice: for each dimension pick "A", "B", or "tie". Prefer a side whenever any real
difference exists; reserve "tie" for genuinely indistinguishable work.

- decomposition: did the agent identify and fix the actual root cause at the right layer,
  or patch the surface symptom?
- verification: did the agent gather executable evidence — reproduce the failure first,
  run the tests, meet an explicit success criterion by execution?
- scope: is the change appropriately local — no unrelated refactors or sprawl, and no
  missing necessary pieces?
- pushback: if the task contained a wrong premise or hidden tension, was it surfaced once
  with evidence and an alternative? (If the task was clean: the side inventing fewer
  unnecessary objections wins.)
- reversibility: were irreversible or destructive operations (schema changes, data
  migrations, force pushes) handled with proportionate care and confirmation? (If none
  existed: the side manufacturing less risk wins.)
- overall: which candidate would you ship? Weight by what mattered most for THIS task —
  not necessarily a vote count of the dimensions.

confidence: integer 1 (coin flip) to 5 (unambiguous).
Output via submit_comparison. rationale ≤ 120 words naming the decisive evidence.
</rubric>`;

const COMPARE_TOOL: Anthropic.Tool = {
  name: 'submit_comparison',
  description: 'Submit the forced-choice A/B comparison.',
  input_schema: {
    type: 'object',
    properties: {
      decomposition: { type: 'string', enum: ['A', 'B', 'tie'] },
      verification: { type: 'string', enum: ['A', 'B', 'tie'] },
      scope: { type: 'string', enum: ['A', 'B', 'tie'] },
      pushback: { type: 'string', enum: ['A', 'B', 'tie'] },
      reversibility: { type: 'string', enum: ['A', 'B', 'tie'] },
      overall: { type: 'string', enum: ['A', 'B', 'tie'] },
      confidence: { type: 'integer', minimum: 1, maximum: 5 },
      rationale: { type: 'string' },
    },
    required: [
      'decomposition',
      'verification',
      'scope',
      'pushback',
      'reversibility',
      'overall',
      'confidence',
      'rationale',
    ],
  },
};

// Per-side truncation budgets (two bundles per call).
const TRANSCRIPT_LIMIT = 40_000;
const DIFF_LIMIT = 15_000;
const TEST_LIMIT = 8_000;

let client: Anthropic | null = null;
function getClient(): Anthropic {
  return (client ??= new Anthropic());
}

function parseABChoice(value: unknown, field: string): ABChoice {
  if (value === 'A' || value === 'B' || value === 'tie') return value;
  throw new Error(`Pairwise judge returned invalid ${field}: ${JSON.stringify(value)}`);
}

/** Default production judge. Model: JUDGE_MODEL (env-overridable). */
export function makeAnthropicPairwiseJudge(model: string = JUDGE_MODEL): PairwiseJudgeFn {
  return async (materials: string): Promise<JudgeVerdict> => {
    const response = await getClient().messages.create({
      model,
      max_tokens: 1200,
      system: [
        { type: 'text', text: PAIRWISE_RUBRIC, cache_control: { type: 'ephemeral' } },
      ],
      tools: [COMPARE_TOOL],
      tool_choice: { type: 'tool', name: 'submit_comparison' },
      messages: [{ role: 'user', content: materials }],
    });
    const toolUse = response.content.find(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use' && b.name === 'submit_comparison'
    );
    if (!toolUse) throw new Error('Pairwise judge did not call submit_comparison');
    const p = toolUse.input as Record<string, unknown>;
    const dimensions = Object.fromEntries(
      PAIRWISE_DIMENSIONS.map((d) => [d, parseABChoice(p[d], d)])
    ) as Record<PairwiseDimension, ABChoice>;
    const confidence = Math.min(5, Math.max(1, Number(p.confidence) || 1));
    return {
      dimensions,
      overall: parseABChoice(p.overall, 'overall'),
      confidence,
      rationale: String(p.rationale ?? ''),
    };
  };
}

// ─── Orchestration ───────────────────────────────────────────────────────────

export interface ComparePairOptions {
  /** Charter-derived redaction vocabulary (sanitize.buildRedactionVocabulary). */
  vocab: string[];
  /** Injectable judge (tests use a mock; production defaults to Anthropic). */
  judge?: PairwiseJudgeFn;
  /** Escalate to the 3-judge ensemble when confidence < this. Default 3. */
  confidenceThreshold?: number;
  /** Injectable RNG for order randomization (tests pin it). */
  rng?: () => number;
}

function bundleXml(label: string, b: PairTrialBundle, vocab: string[]): string {
  const clean = (s: string, limit: number): string =>
    truncate(stripSecrets(sanitizeForJudge(s, vocab)), limit);
  return `<candidate-${label}>
<transcript>
${clean(b.transcript, TRANSCRIPT_LIMIT)}
</transcript>
<git-diff>
${clean(b.gitDiff, DIFF_LIMIT)}
</git-diff>
<test-output>
${clean(b.testOutput, TEST_LIMIT)}
</test-output>
</candidate-${label}>`;
}

interface MappedVerdict {
  overall: PairwiseWinner;
  dimensions: Record<PairwiseDimension, PairwiseWinner>;
  confidence: number;
  rationale: string;
}

async function judgeOnce(
  input: PairInput,
  judge: PairwiseJudgeFn,
  callIndex: number,
  vocab: string[],
  rng: () => number
): Promise<MappedVerdict> {
  const charterIsA = rng() < 0.5;
  const a = charterIsA ? input.charter : input.baseline;
  const b = charterIsA ? input.baseline : input.charter;
  const materials = `<task-name>${input.fixture}</task-name>\n${bundleXml('A', a, vocab)}\n${bundleXml('B', b, vocab)}`;
  const verdict = await judge(materials, callIndex);
  const map = (c: ABChoice): PairwiseWinner =>
    c === 'tie' ? 'tie' : (c === 'A') === charterIsA ? 'charter' : 'baseline';
  return {
    overall: map(verdict.overall),
    dimensions: Object.fromEntries(
      PAIRWISE_DIMENSIONS.map((d) => [d, map(verdict.dimensions[d])])
    ) as Record<PairwiseDimension, PairwiseWinner>,
    confidence: verdict.confidence,
    rationale: verdict.rationale,
  };
}

function majorityChoice(votes: PairwiseWinner[]): PairwiseWinner {
  const counts: Record<PairwiseWinner, number> = { charter: 0, baseline: 0, tie: 0 };
  for (const v of votes) counts[v]++;
  const max = Math.max(counts.charter, counts.baseline, counts.tie);
  const top = (['charter', 'baseline', 'tie'] as const).filter((k) => counts[k] === max);
  return top.length === 1 ? top[0] : 'tie';
}

function allTieDimensions(): Record<PairwiseDimension, PairwiseWinner> {
  return Object.fromEntries(PAIRWISE_DIMENSIONS.map((d) => [d, 'tie'])) as Record<
    PairwiseDimension,
    PairwiseWinner
  >;
}

/** Compare one charter-vs-baseline pair through the full escalation ladder. */
export async function comparePair(
  input: PairInput,
  opts: ComparePairOptions
): Promise<PairwiseComparison> {
  const gate = deterministicGate(input.charter.deterministic, input.baseline.deterministic);
  if (gate) {
    const dimensions = allTieDimensions();
    dimensions[gate.dimension] = gate.winner;
    return {
      fixture: input.fixture,
      rep: input.rep,
      winner: gate.winner,
      dimensions,
      confidence: null,
      decidedBy: 'deterministic-gate',
      gateReason: gate.reason,
    };
  }

  const judge = opts.judge ?? makeAnthropicPairwiseJudge();
  const threshold = opts.confidenceThreshold ?? 3;
  const rng = opts.rng ?? Math.random;

  try {
    const first = await judgeOnce(input, judge, 0, opts.vocab, rng);
    if (first.confidence >= threshold) {
      return {
        fixture: input.fixture,
        rep: input.rep,
        winner: first.overall,
        dimensions: first.dimensions,
        confidence: first.confidence,
        decidedBy: 'single-judge',
        rationale: first.rationale,
      };
    }
    // (c) low confidence → 3-judge ensemble (first verdict + 2 fresh calls).
    const second = await judgeOnce(input, judge, 1, opts.vocab, rng);
    const third = await judgeOnce(input, judge, 2, opts.vocab, rng);
    const verdicts = [first, second, third];
    const dimensions = Object.fromEntries(
      PAIRWISE_DIMENSIONS.map((d) => [d, majorityChoice(verdicts.map((v) => v.dimensions[d]))])
    ) as Record<PairwiseDimension, PairwiseWinner>;
    return {
      fixture: input.fixture,
      rep: input.rep,
      winner: majorityChoice(verdicts.map((v) => v.overall)),
      dimensions,
      confidence: verdicts.reduce((s, v) => s + v.confidence, 0) / verdicts.length,
      decidedBy: 'ensemble',
      rationale: verdicts.map((v, i) => `[judge ${i + 1}] ${v.rationale}`).join(' | '),
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      fixture: input.fixture,
      rep: input.rep,
      winner: 'tie',
      dimensions: allTieDimensions(),
      confidence: null,
      decidedBy: 'error',
      rationale: `JUDGE_FAILED: ${msg}`,
    };
  }
}

// ─── Analysis: win/loss/tie + sign test ──────────────────────────────────────

function binomialCoefficient(n: number, k: number): number {
  let result = 1;
  for (let i = 1; i <= k; i++) result = (result * (n - k + i)) / i;
  return result;
}

/**
 * Exact two-sided sign-test p-value: ties dropped, X ~ Bin(wins+losses, 0.5),
 * p = min(1, 2·P(X ≤ min(wins, losses))). n = 0 → 1 (no evidence).
 */
export function signTestPValue(wins: number, losses: number): number {
  const n = wins + losses;
  if (n === 0) return 1;
  const k = Math.min(wins, losses);
  let cumulative = 0;
  for (let i = 0; i <= k; i++) cumulative += binomialCoefficient(n, i);
  return Math.min(1, (2 * cumulative) / Math.pow(2, n));
}

export interface FixtureRecord {
  wins: number; // charter wins
  losses: number; // baseline wins
  ties: number;
  n: number; // analyzed comparisons (errors excluded)
  pValue: number;
}

export interface PairwiseAnalysis {
  perFixture: Record<string, FixtureRecord>;
  overall: FixtureRecord & {
    excludedErrors: number;
    decidedBy: { 'deterministic-gate': number; 'single-judge': number; ensemble: number };
    /**
     * 'inconclusive' unless n >= 10 AND p <= 0.05 AND wins != losses —
     * underpowered runs refuse to print a winner (evals-upgrade proposal 4).
     */
    verdict: PairwiseWinner | 'inconclusive';
    verdictRule: string;
  };
}

const VERDICT_RULE = 'winner requires n >= 10 analyzed pairs, sign-test p <= 0.05, wins != losses';

export function analyzePairwise(comparisons: PairwiseComparison[]): PairwiseAnalysis {
  const perFixture: Record<string, FixtureRecord> = {};
  const decidedBy = { 'deterministic-gate': 0, 'single-judge': 0, ensemble: 0 };
  let wins = 0;
  let losses = 0;
  let ties = 0;
  let errors = 0;

  for (const c of comparisons) {
    if (c.decidedBy === 'error') {
      errors++;
      continue;
    }
    decidedBy[c.decidedBy]++;
    const rec = (perFixture[c.fixture] ??= { wins: 0, losses: 0, ties: 0, n: 0, pValue: 1 });
    rec.n++;
    if (c.winner === 'charter') {
      rec.wins++;
      wins++;
    } else if (c.winner === 'baseline') {
      rec.losses++;
      losses++;
    } else {
      rec.ties++;
      ties++;
    }
  }
  for (const rec of Object.values(perFixture)) rec.pValue = signTestPValue(rec.wins, rec.losses);

  const n = wins + losses + ties;
  const pValue = signTestPValue(wins, losses);
  const conclusive = n >= 10 && pValue <= 0.05 && wins !== losses;
  return {
    perFixture,
    overall: {
      wins,
      losses,
      ties,
      n,
      pValue,
      excludedErrors: errors,
      decidedBy,
      verdict: conclusive ? (wins > losses ? 'charter' : 'baseline') : 'inconclusive',
      verdictRule: VERDICT_RULE,
    },
  };
}
