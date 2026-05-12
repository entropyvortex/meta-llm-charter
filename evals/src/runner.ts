import { execa } from 'execa';
import fs from 'fs/promises';
import path from 'path';
import { TrialConfig, TrialResult } from './types.js';
import { runTrialInSandbox } from './docker.js';

const BASELINE_CLAUDE_MD =
  'You are a principal-level software engineer. Think carefully, write high-quality code, and ship production-ready changes.\n';

export interface RunnerEnv {
  /** Path to the v1.3 charter on the host (mounted into trial workspace as CLAUDE.md). */
  charterPath: string;
  /** Per-trial scratch dir on the host where prompt + task files live before mounting. */
  promptDir: string;
  /** Trial workspace on the host (already prepared as a clean snapshot by index.ts). */
  workspaceDir: string;
  apiKey: string;
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
  timeout 300s stdbuf -o0 -e0 claude -p --bare --dangerously-skip-permissions --output-format text --verbose --debug < /prompts/${config.trialId}.task.txt 2>&1 || echo "=== CLAUDE TIMED OUT OR CRASHED (exit code $? ) ===" && \
  echo "=== CLAUDE FINISHED ==="`;

  const { transcript, exitCode } = await runTrialInSandbox({
    command: containerCommand,
    workspaceMount: env.workspaceDir,
    promptMount: env.promptDir,
    apiKey: env.apiKey,
  });

  const endTime = new Date();
  const durationMs = endTime.getTime() - startTime.getTime();

  const gitDiff = await captureGitDiff(env.workspaceDir);
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

async function captureGitDiff(workspaceDir: string): Promise<string> {
  try {
    const { stdout } = await execa('git', ['diff', 'HEAD'], { cwd: workspaceDir });
    return stdout;
  } catch {
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