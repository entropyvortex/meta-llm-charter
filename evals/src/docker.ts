import { execa } from 'execa';

const IMAGE_NAME = 'meta-charter-agent:latest';

export async function buildSandboxImage(dockerfileDir: string): Promise<void> {
  console.log('Building hardened Docker image...');
  await execa('docker', ['build', '-t', IMAGE_NAME, '.'], {
    cwd: dockerfileDir,
    stdio: 'inherit',
  });
}

export interface SandboxRunConfig {
  command: string;
  workspaceMount: string;
  /** Read-only mount holding system prompts and task files. */
  promptMount: string;
  /** ANTHROPIC_API_KEY must be passed in for the claude CLI to authenticate. */
  apiKey: string;
  timeoutMs?: number;
}

export interface SandboxRunResult {
  transcript: string;
  exitCode: number | null;
}

export async function runTrialInSandbox(config: SandboxRunConfig): Promise<SandboxRunResult> {
  const { command, workspaceMount, promptMount, apiKey, timeoutMs = 20 * 60 * 1000 } = config;

  const containerName = `meta-charter-trial-${Date.now()}`;

  // Clean up any old container with same name
  await execa('docker', ['rm', '-f', containerName], { reject: false }).catch(() => {});

  const result = await execa('docker', [
    'run', '--rm',
    '--name', containerName,
    '--cap-drop=ALL',
    '--security-opt=no-new-privileges',
    '--tmpfs=/tmp',
    // '--tmpfs=/home/node',     // ←←← COMMENT THIS OUT (this is the blocker)
    '-v', `${workspaceMount}:/workspace:rw`,
    '-v', `${promptMount}:/prompts:ro`,
    '--env-file', '.env',
    '--user', '1000:1000',
    IMAGE_NAME,
    'sh', '-c', command,
  ], { timeout: timeoutMs, reject: false });

  return {
    transcript: `${result.stdout}\n--- STDERR ---\n${result.stderr}`,
    exitCode: result.exitCode,
  };
}