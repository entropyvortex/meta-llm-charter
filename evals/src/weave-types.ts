import { TrialScores } from './types.js';

/**
 * Weave eval modes — arm contrast is skill-present vs skill-absent
 * (DECISIONS #5).
 *
 * - `weave`    → the v3 core charter (CLAUDE.md) plus `.claude/skills/weave/`
 *               copied into the trial workspace, so the agent HAS the Weave
 *               skill available.
 * - `baseline` → the SAME v3 core charter with NO skill directory. Both arms
 *               share an identical core, so the contrast isolates the Weave
 *               skill's *marginal* value rather than re-measuring charter vs.
 *               no-charter (which the existing harness already does).
 *               WEAVE-PROTOCOL.md is a non-normative archive and ships to
 *               neither arm; the old stripZPR5() mechanism is retired.
 */
export type WeaveMode = 'weave' | 'baseline';

/**
 * Weave-specific metrics. Mirrors the schema in WEAVE-EVALS-DESIGN.md §7.
 *
 * Fields are nullable: a metric is `null` when it does not apply to a given
 * fixture (e.g. resumption_quality on a non-resumption fixture) or could not be
 * extracted. Deterministic fields (capsules_produced, judgment_consensus_
 * triggered) are computed by the runner from produced artifacts; qualitative
 * fields are assessed by the Weave judge (`weave-scorer.ts`) against the
 * fixture's hidden ground truth.
 */
export interface WeaveSpecificMetrics {
  /** Distinct facts an earlier strand established that a later strand REUSED instead of rediscovering. */
  redundancy_avoided: number | null;
  /** Insight Capsules the agent actually emitted (files under .planning/weave/insights/ or delimited blocks). */
  capsules_produced: number | null;
  /** Produced capsules demonstrably consumed by later reasoning. */
  capsules_utilized: number | null;
  /** Scope/premise violations the agent caught and surfaced via an R9 push-back. */
  scope_violations_detected: number | null;
  /** Did the agent run a Judgment Consensus (>=2 validator verdicts) on the planted high-stakes decision? */
  judgment_consensus_triggered: boolean | null;
  /** The consensus verdict reached: 'proceed' | 'block' | 'retry' | null. */
  verdict: string | null;
  /** Does the verdict match the ground-truth correct call? */
  verdict_correct: boolean | null;
  /** Holistic quality of the Weave reasoning, 1-5. */
  reasoning_quality: number | null;
  /** Was the gated decision recorded (humanpending.md / session file / consensus block)? */
  decision_recorded: boolean | null;
  /** Resumption fixtures only: did the agent cleanly resume from session + capsules? */
  recovery_success: boolean | null;
  /** Resumption fixtures only: quality of the resumption, 1-5. */
  resumption_quality: number | null;
}

export function emptyWeaveMetrics(): WeaveSpecificMetrics {
  return {
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
  };
}

/**
 * One Weave trial result — one JSON line in evals/results/weave-results-*.jsonl.
 * Carries the standard 7-dimension charter scores (so Weave trials remain
 * comparable to the base harness) plus the weave_specific object.
 */
export interface WeaveTrialResult {
  timestamp: string;
  fixture: string;
  mode: WeaveMode;
  /** Did the fixture's own acceptance tests pass (the code outcome was achieved)? */
  success: boolean;
  durationMs?: number;
  exitCode?: number | null;
  /** Reused 7-dimension blind judge (scorer.ts). Null dims when the judge failed. */
  scores?: TrialScores;
  weave_specific: WeaveSpecificMetrics;
  notes?: string;
}
