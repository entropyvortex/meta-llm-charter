import { createHash } from 'node:crypto';
import { execa } from 'execa';
import fs from 'fs/promises';
import path from 'path';
import { RunManifest, TrialConfig, TrialResult } from './types.js';
import { runTrialInSandbox } from './docker.js';

const BASELINE_CLAUDE_MD =
  'You are a principal-level software engineer. Think carefully, write high-quality code, and ship production-ready changes.\n';

/**
 * The agent model is mandatory and pinned per run: an unpinned CLI default
 * silently drifts across CLI releases, confounding every cross-run comparison.
 * The value is interpolated into a `sh -c` container command, so restrict it
 * to model-id-safe characters.
 */
export function resolveAgentModel(): string {
  const model = process.env.AGENT_MODEL?.trim();
  if (!model) {
    throw new Error(
      'AGENT_MODEL is required and has no default. Pin the trial agent model explicitly,\n' +
        'e.g. AGENT_MODEL=claude-sonnet-4-6 (an unpinned model confounds cross-run comparisons).'
    );
  }
  if (!/^[A-Za-z0-9._:@/-]+$/.test(model)) {
    throw new Error(`AGENT_MODEL contains characters outside [A-Za-z0-9._:@/-]: "${model}"`);
  }
  return model;
}

/** Per-trial agent timeout in seconds. Env TRIAL_TIMEOUT_S, default 600. */
export function resolveTrialTimeoutS(): number {
  const raw = process.env.TRIAL_TIMEOUT_S ?? '600';
  const t = Number(raw);
  if (!Number.isInteger(t) || t <= 0) {
    throw new Error(`TRIAL_TIMEOUT_S must be a positive integer (seconds), got "${raw}"`);
  }
  return t;
}

export async function sha256OfFile(filePath: string): Promise<string> {
  const content = await fs.readFile(filePath);
  return createHash('sha256').update(content).digest('hex');
}

export async function gitHeadSha(repoDir: string): Promise<string> {
  try {
    const { stdout } = await execa('git', ['rev-parse', 'HEAD'], { cwd: repoDir });
    return stdout.trim();
  } catch {
    return 'unknown';
  }
}

export async function writeRunManifest(runDir: string, manifest: RunManifest): Promise<void> {
  await fs.mkdir(runDir, { recursive: true });
  await fs.writeFile(
    path.join(runDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2) + '\n',
    'utf-8'
  );
}

export interface RunnerEnv {
  /** Path to the v3 core charter on the host (mounted into trial workspace as CLAUDE.md). */
  charterPath: string;
  /** Per-trial scratch dir on the host where prompt + task files live before mounting. */
  promptDir: string;
  /** Trial workspace on the host (already prepared as a clean snapshot by index.ts). */
  workspaceDir: string;
  apiKey: string;
  /** Pinned agent model (resolveAgentModel()); passed as `claude --model`. */
  agentModel: string;
  /** Per-trial agent timeout in seconds (resolveTrialTimeoutS()). */
  trialTimeoutS: number;
  /**
   * SHA of the workspace's 'initial fixture state' commit, recorded by
   * resetWorkspace(). Diffing against it (rather than HEAD) keeps the evidence
   * channel intact even when the agent stages or commits its own work.
   */
  initialCommit: string;
}

/**
 * Writes the per-variant CLAUDE.md into the workspace, then runs `claude -p`
 * headless inside the sandbox. This uses Claude Code's native system-prompt
 * mechanism rather than a synthetic CLI flag — so the experiment measures the
 * production delivery surface, not a synthetic one.
 */
export async function runSingleTrial(
  config: TrialConfig,
  env: RunnerEnv
): Promise<TrialResult> {
  const startTime = new Date();

  const claudeMdContent =
    config.variant === 'charter'
      ? await fs.readFile(env.charterPath, 'utf-8')
      : BASELINE_CLAUDE_MD;

  // Drop CLAUDE.md into the trial workspace. Claude Code reads it natively.
  await fs.writeFile(path.join(env.workspaceDir, 'CLAUDE.md'), claudeMdContent, 'utf-8');

  // Write task prompt to the prompt mount (avoids any shell escaping in the container command).
  const taskPromptFile = path.join(env.promptDir, `${config.trialId}.task.txt`);
  await fs.writeFile(taskPromptFile, config.taskPrompt, 'utf-8');

  // The container reads the task prompt from /prompts and pipes it to claude -p.
  const containerCommand = `cd /workspace && \
  echo "=== PROMPT START ===" && \
  cat /prompts/${config.trialId}.task.txt && \
  echo "=== PROMPT END ===" && \
  echo "=== CONTAINER DEBUG ===" && \
  echo "whoami: $(whoami)" && \
  echo "uid/gid: $(id)" && \
  echo "~ contents:" && ls -la ~ || true && \
  echo "free memory:" && free -h || true && \
  echo "=== CLAUDE START ===" && \
  timeout ${env.trialTimeoutS}s stdbuf -o0 -e0 claude -p --bare --model ${env.agentModel} --dangerously-skip-permissions --output-format text --verbose --debug < /prompts/${config.trialId}.task.txt 2>&1 || echo "=== CLAUDE TIMED OUT OR CRASHED (exit code $? ) ===" && \
  echo "=== CLAUDE FINISHED ==="`;

  const { transcript, exitCode } = await runTrialInSandbox({
    command: containerCommand,
    workspaceMount: env.workspaceDir,
    promptMount: env.promptDir,
    apiKey: env.apiKey,
    // Container hard-stop trails the in-container `timeout` so the trial
    // timeout stays the single knob (buffer covers container start + echo).
    timeoutMs: (env.trialTimeoutS + 120) * 1000,
  });

  const endTime = new Date();
  const durationMs = endTime.getTime() - startTime.getTime();

  const gitDiff = await captureGitDiff(env.workspaceDir, env.initialCommit);
  const testOutput = await captureTestOutput(env.workspaceDir);

  return {
    trialId: config.trialId,
    variant: config.variant,
    taskName: config.taskName,
    startTime,
    endTime,
    durationMs,
    exitCode,
    transcript,
    gitDiff,
    testOutput,
    scores: {
      decomposition: null,
      verification: null,
      scope: null,
      pushback: null,
      reversibility: null,
      epistemic: null,
      overall: null,
    },
    notes: '',
  };
}

/**
 * Judge evidence channel. Diffs against the recorded initial fixture commit —
 * NOT `git diff HEAD` — so an agent that stages or commits its work neither
 * blanks the diff nor changes its baseline. `git add -A` first makes untracked
 * agent-created files visible. CLAUDE.md and .claude/ are pathspec-excluded:
 * the arm's charter is written untracked into the workspace and must never
 * reach the judge via the diff (verified: exclusion holds across staging and
 * agent commits).
 */
export async function captureGitDiff(
  workspaceDir: string,
  initialCommit: string
): Promise<string> {
  try {
    await execa('git', ['add', '-A'], { cwd: workspaceDir });
    const { stdout } = await execa(
      'git',
      ['diff', initialCommit, '--', '.', ':(exclude)CLAUDE.md', ':(exclude).claude'],
      { cwd: workspaceDir }
    );
    return stdout;
  } catch (e) {
    console.warn(`captureGitDiff failed for ${workspaceDir} (judge will see an empty diff):`, e);
    return '';
  }
}

async function captureTestOutput(workspaceDir: string): Promise<string> {
  try {
    // Run test INSIDE the sandbox image
    const { stdout, stderr } = await execa('docker', [
      'run', '--rm',
      '--user', 'node',
      '-v', `${workspaceDir}:/workspace:rw`,
      'meta-charter-agent:latest',
      'sh', '-c', 'cd /workspace && npx tsx --test test/*.spec.ts'
    ], { reject: false });

    return `${stdout}\n--- STDERR ---\n${stderr}`;
  } catch {
    return 'No tests run';
  }
}