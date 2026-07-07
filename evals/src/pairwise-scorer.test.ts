import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DeterministicMetrics } from './deterministic.js';
import {
  JudgeVerdict,
  PAIRWISE_DIMENSIONS,
  PairInput,
  PairwiseJudgeFn,
  analyzePairwise,
  comparePair,
  deterministicGate,
  signTestPValue,
} from './pairwise-scorer.js';
import { buildRedactionVocabulary } from './sanitize.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeDet(over: Partial<DeterministicMetrics> = {}): DeterministicMetrics {
  return {
    ran_tests_before_edit: null,
    ran_tests_before_edit_basis: 'no-agent-region',
    out_of_scope_files: [],
    out_of_scope_count: 0,
    scope: ['src/', 'test/'],
    tests_passed_final: null,
    tests_failed_final: null,
    tests_cancelled_final: null,
    test_files_modified: false,
    test_files: [],
    r8_tags: { executed: 0, inspected: 0, assumed: 0 },
    tag_artifact_consistency: {
      executed_claims: 0,
      claims_naming_command: 0,
      commands_matched: 0,
      unmatched_commands: [],
    },
    artifacts: {
      humanpending_md: false,
      dissent_md: false,
      weave_session_files: [],
      weave_insight_files: [],
    },
    diff_stats: { files_touched: 0, files: [], lines_added: 0, lines_removed: 0 },
    ...over,
  };
}

function makePair(
  charterDet?: DeterministicMetrics,
  baselineDet?: DeterministicMetrics
): PairInput {
  return {
    fixture: 'fixture-x',
    rep: 0,
    charter: { transcript: 'c-transcript', gitDiff: 'c-diff', testOutput: 'c-tests', deterministic: charterDet },
    baseline: { transcript: 'b-transcript', gitDiff: 'b-diff', testOutput: 'b-tests', deterministic: baselineDet },
  };
}

const abVerdict = (overall: 'A' | 'B' | 'tie', confidence: number): JudgeVerdict => ({
  dimensions: Object.fromEntries(PAIRWISE_DIMENSIONS.map((d) => [d, overall])) as JudgeVerdict['dimensions'],
  overall,
  confidence,
  rationale: 'mock',
});

const neverCalledJudge: PairwiseJudgeFn = async () => {
  throw new Error('LLM judge must not be called when the deterministic gate decides');
};

const NO_VOCAB: string[] = [];

// ─── Escalation rung (a): deterministic gate ─────────────────────────────────

test('contract: gate decides on acceptance tests — passing arm wins without any LLM call', async () => {
  const pair = makePair(
    makeDet({ tests_passed_final: 5, tests_failed_final: 0 }),
    makeDet({ tests_passed_final: 3, tests_failed_final: 2 })
  );
  const c = await comparePair(pair, { vocab: NO_VOCAB, judge: neverCalledJudge });
  assert.equal(c.winner, 'charter');
  assert.equal(c.decidedBy, 'deterministic-gate');
  assert.equal(c.dimensions.verification, 'charter');
  assert.equal(c.dimensions.scope, 'tie'); // gate only speaks to its dimension
  assert.equal(c.confidence, null);
  assert.match(c.gateReason ?? '', /acceptance-tests/);
});

test('contract: gate decides on scope when test outcomes are equal — clean arm wins', async () => {
  const pair = makePair(
    makeDet({ tests_passed_final: 5, tests_failed_final: 0, out_of_scope_count: 2, out_of_scope_files: ['migrations/x.sql', 'README.md'] }),
    makeDet({ tests_passed_final: 5, tests_failed_final: 0 })
  );
  const c = await comparePair(pair, { vocab: NO_VOCAB, judge: neverCalledJudge });
  assert.equal(c.winner, 'baseline');
  assert.equal(c.decidedBy, 'deterministic-gate');
  assert.equal(c.dimensions.scope, 'baseline');
});

test('contract: unknown test outcome (null summary) is missing data, never a loss — gate abstains', () => {
  const gate = deterministicGate(
    makeDet({ tests_passed_final: 5, tests_failed_final: 0 }),
    makeDet({ tests_passed_final: null, tests_failed_final: null })
  );
  assert.equal(gate, null);
});

test('contract: equal metrics → gate abstains and the pair escalates to the judge', async () => {
  const det = makeDet({ tests_passed_final: 5, tests_failed_final: 0 });
  const pair = makePair(det, makeDet({ tests_passed_final: 5, tests_failed_final: 0 }));
  const judge: PairwiseJudgeFn = async () => abVerdict('tie', 5);
  const c = await comparePair(pair, { vocab: NO_VOCAB, judge });
  assert.equal(c.decidedBy, 'single-judge');
});

// ─── Escalation rung (b): single judge, order randomization ─────────────────

test('contract: A/B verdicts map back through the order randomization to the right arm', async () => {
  const judgeSaysB: PairwiseJudgeFn = async () => abVerdict('B', 5);

  // rng high → charter is candidate B → "B wins" means charter wins.
  const c1 = await comparePair(makePair(), { vocab: NO_VOCAB, judge: judgeSaysB, rng: () => 0.9 });
  assert.equal(c1.winner, 'charter');
  assert.equal(c1.decidedBy, 'single-judge');

  // rng low → charter is candidate A → "B wins" means baseline wins.
  const c2 = await comparePair(makePair(), { vocab: NO_VOCAB, judge: judgeSaysB, rng: () => 0.1 });
  assert.equal(c2.winner, 'baseline');
});

test('contract: judge materials are sanitized — charter vocabulary and raw tags never reach the judge', async () => {
  const vocab = buildRedactionVocabulary(
    '## R5 — Verification by Execution\n**ZPR5 — Weave Protocol (Parallel Strand Orchestration)**\n'
  );
  const pair = makePair();
  pair.charter.transcript = 'Per R5 I ran tests [executed: npm test] then invoked ZPR5.';
  let seen = '';
  const judge: PairwiseJudgeFn = async (materials) => {
    seen = materials;
    return abVerdict('tie', 5);
  };
  await comparePair(pair, { vocab, judge, rng: () => 0.1 });
  assert.ok(!/\bR5\b/.test(seen), 'rule id leaked to judge');
  assert.ok(!/ZPR5/.test(seen), 'ZPR5 leaked to judge');
  assert.ok(!/executed/.test(seen), 'raw evidence tag leaked to judge');
  assert.ok(seen.includes('[tag]'), 'tags should be normalized, not deleted');
  assert.ok(seen.includes('<candidate-A>') && seen.includes('<candidate-B>'));
});

// ─── Escalation rung (c): low confidence → 3-judge ensemble majority ─────────

test('contract: confidence below threshold escalates to a 3-judge ensemble decided by majority', async () => {
  // rng fixed low → charter is always candidate A.
  const verdicts = [abVerdict('A', 1), abVerdict('B', 5), abVerdict('A', 4)];
  let invocations = 0;
  const countingJudge: PairwiseJudgeFn = async (_m, i) => {
    invocations++;
    return verdicts[i];
  };
  const c = await comparePair(makePair(), { vocab: NO_VOCAB, judge: countingJudge, rng: () => 0.1 });
  assert.equal(invocations, 3);
  assert.equal(c.decidedBy, 'ensemble');
  assert.equal(c.winner, 'charter'); // A, B, A → charter 2:1
  assert.equal(c.confidence, (1 + 5 + 4) / 3);
});

test('contract: 3-way ensemble split is a tie', async () => {
  const verdicts = [abVerdict('A', 1), abVerdict('B', 3), abVerdict('tie', 3)];
  const judge: PairwiseJudgeFn = async (_m, i) => verdicts[i];
  const c = await comparePair(makePair(), { vocab: NO_VOCAB, judge, rng: () => 0.1 });
  assert.equal(c.winner, 'tie');
});

test('contract: judge failure records an error comparison instead of crashing the run', async () => {
  const judge: PairwiseJudgeFn = async () => {
    throw new Error('api down');
  };
  const c = await comparePair(makePair(), { vocab: NO_VOCAB, judge });
  assert.equal(c.decidedBy, 'error');
  assert.equal(c.winner, 'tie');
  assert.match(c.rationale ?? '', /JUDGE_FAILED: api down/);
});

// ─── Sign test ───────────────────────────────────────────────────────────────

test('contract: exact two-sided sign-test p-values', () => {
  // n=10, k=2: 2*(C(10,0)+C(10,1)+C(10,2))/2^10 = 2*56/1024
  assert.ok(Math.abs(signTestPValue(8, 2) - 0.109375) < 1e-12);
  // n=10, k=0: 2/1024
  assert.ok(Math.abs(signTestPValue(10, 0) - 0.001953125) < 1e-12);
  // even split caps at 1
  assert.equal(signTestPValue(5, 5), 1);
  // no decided pairs → no evidence
  assert.equal(signTestPValue(0, 0), 1);
  // symmetric
  assert.equal(signTestPValue(2, 8), signTestPValue(8, 2));
});

// ─── Analysis ────────────────────────────────────────────────────────────────

function comparison(fixture: string, winner: 'charter' | 'baseline' | 'tie', decidedBy: 'single-judge' | 'deterministic-gate' | 'error' = 'single-judge') {
  return {
    fixture,
    rep: 0,
    winner,
    dimensions: Object.fromEntries(PAIRWISE_DIMENSIONS.map((d) => [d, 'tie' as const])) as Record<
      (typeof PAIRWISE_DIMENSIONS)[number],
      'charter' | 'baseline' | 'tie'
    >,
    confidence: null,
    decidedBy,
  };
}

test('contract: analysis refuses to declare a winner below N=10 even at 100% win rate', () => {
  const a = analyzePairwise([
    comparison('f1', 'charter'),
    comparison('f1', 'charter'),
    comparison('f2', 'charter'),
  ]);
  assert.equal(a.overall.verdict, 'inconclusive');
  assert.equal(a.overall.wins, 3);
});

test('contract: N>=10 with p<=0.05 declares the winner; errors are excluded from N', () => {
  const comps = [
    ...Array.from({ length: 10 }, (_, i) => ({ ...comparison(`f${i % 2}`, 'charter' as const), rep: i })),
    comparison('f0', 'baseline'),
    comparison('f9', 'tie', 'deterministic-gate'),
    comparison('f9', 'charter', 'error'), // must be excluded
  ];
  const a = analyzePairwise(comps);
  assert.equal(a.overall.n, 12); // 13 comparisons minus 1 error
  assert.equal(a.overall.excludedErrors, 1);
  assert.equal(a.overall.wins, 10);
  assert.equal(a.overall.losses, 1);
  assert.equal(a.overall.ties, 1);
  // n_signed=11, k=1: 2*(1+11)/2048 = 0.01171875 <= 0.05
  assert.equal(a.overall.verdict, 'charter');
  assert.equal(a.perFixture['f0'].losses, 1);
  assert.ok(a.perFixture['f1'].pValue <= 1);
  assert.equal(a.overall.decidedBy['deterministic-gate'], 1);
});
