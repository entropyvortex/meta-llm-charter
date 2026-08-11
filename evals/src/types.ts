import type { DeterministicMetrics } from './deterministic.js';

export type Variant = 'charter' | 'baseline';

export interface TrialConfig {
  trialId: string;
  variant: Variant;
  taskName: string;
  taskPrompt: string;
  /** Headless claude invocation; the runner appends the task prompt. */
  claudeCommand: string;
}

export interface TrialScores {
  decomposition: number | null;
  verification: number | null;
  scope: number | null;
  pushback: number | null;
  reversibility: number | null;
  epistemic: number | null;
  overall: number | null;
}

export interface TrialResult {
  trialId: string;
  variant: Variant;
  taskName: string;
  startTime: Date;
  endTime: Date;
  durationMs: number;
  exitCode: number | null;
  transcript: string;
  gitDiff: string;
  testOutput: string;
  scores: TrialScores;
  /**
   * Judge-free metric layer (deterministic.ts): exact booleans/counts from
   * transcript + diff + test output + workspace artifacts. Primary tuning
   * signal; per DECISIONS.md #3 the epistemic dimension is scored from these
   * (r8_tags + tag_artifact_consistency) in pairwise analysis, not by the LLM
   * judge. Optional so pre-metric result construction stays valid.
   */
  deterministic?: DeterministicMetrics;
  notes: string;
}

export interface TaskDefinition {
  name: string;
  prompt: string;
  /** Absolute path to the fixture directory snapshot copied into the trial workspace. */
  fixtureDir: string;
}

/**
 * Written to runs/<id>/manifest.json before trials start, so every number in
 * results.csv / results JSONL is traceable to pinned models, an exact charter
 * file, and an exact harness commit.
 */
export interface RunManifest {
  runId: string;
  /** ISO-8601 timestamp of manifest creation (run start). */
  timestamp: string;
  /** Exact agent model passed to `claude --model` (env AGENT_MODEL, mandatory). */
  agentModel: string;
  /** Judge model used by the scorer (env JUDGE_MODEL or scorer default). */
  judgeModel: string;
  trialsPerPair: number;
  /** Per-trial agent timeout in seconds (env TRIAL_TIMEOUT_S, default 600). */
  trialTimeoutS: number;
  /** Fixture names scheduled in this run. */
  fixtures: string[];
  /** SHA-256 of the charter file dropped into charter-arm workspaces. */
  charterSha256: string;
  /** Git HEAD of the harness repo at run time ('unknown' outside a git checkout). */
  harnessGitSha: string;
  /** Weave runs only: which arm this run dir belongs to. */
  weaveMode?: 'weave' | 'baseline';
  /**
   * Weave runs, skill-present arm only: the `.claude/skills/<name>/` dir
   * copied into the trial workspace. Per-fixture via _oracle/CHECKS.json
   * "skill" (default "weave") — see fixture-skill.ts. publish-run uses it to
   * add the skill text to the transcript-blinding vocabulary.
   */
  weaveSkill?: string;
}
