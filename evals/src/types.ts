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
  notes: string;
}

export interface TaskDefinition {
  name: string;
  prompt: string;
  /** Absolute path to the fixture directory snapshot copied into the trial workspace. */
  fixtureDir: string;
}
