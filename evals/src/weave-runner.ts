import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { execa } from 'execa';
import { TrialResult, Variant } from './types.js';
import { buildSandboxImage, runTrialInSandbox } from './docker.js';
import { scoreTrial } from './scorer.js';
import { scoreWeaveTrial } from './weave-scorer.js';
import { WeaveMode, WeaveTrialResult, emptyWeaveMetrics } from './weave-types.js';

/**
 * Weave eval runner. Reuses the REAL harness primitives — buildSandboxImage,
 * runTrialInSandbox (docker.ts), and scoreTrial (scorer.ts) — and adds a Weave
 * judge (weave-scorer.ts). It is fully additive: it never imports or mutates
 * the base orchestrator (index.ts), so `npm run smoke` is unaffected.
 *
 * Design note (R11 override, documented in weave-fixtures/NOTES.md):
 * WEAVE-EVALS-DESIGN.md assumed `import { runFixture } from
 * './existing-harness-utils'`. No such module exists. The real reusable surface
 * is the five exports above plus a per-trial flow that mirrors index.ts's
 * private main() loop, re-implemented here against the true API.
 *
 * The two arms compare the charter WITH Weave (mode 'weave' → full CLAUDE.md,
 * which contains ZPR5) against the SAME charter with ZPR5 stripped (mode
 * 'baseline'). This isolates Weave's marginal value; it is deliberately NOT the
 * base harness's charter-vs-no-charter contrast.
 */

const EVALS_DIR = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const PROJECT_ROOT = path.resolve(EVALS_DIR, '..');
const CHARTER_PATH = path.join(PROJECT_ROOT, 'CLAUDE.md');
const WEAVE_FIXTURES_DIR = path.join(EVALS_DIR, 'weave-fixtures');
const RESULTS_DIR = path.join(EVALS_DIR, 'results');
const RUNS_DIR = path.join(EVALS_DIR, 'runs');

const IMAGE_NAME = 'meta-charter-agent:latest';

/**
 * Remove the ZPR5 stanza from the charter for the 'baseline' arm. The stanza is
 * the bold-inline paragraph starting `**ZPR5 ` and running up to the next
 * bold-inline header (`**Activation Rule**`), matching the Zero-Pause layer's
 * structure. If ZPR5 is absent, returns the charter unchanged.
 */
export function stripZPR5(charter: string): string {
  const lines = charter.split('\n');
  const start = lines.findIndex((l) => l.startsWith('**ZPR5 ') || l.startsWith('**ZPR5—'));
  if (start === -1) return charter;
  let end = start + 1;
  while (end < lines.length && !lines[end].startsWith('**')) end++;
  return [...lines.slice(0, start), ...lines.slice(end)].join('\n');
}

async function resetWorkspace(target: string, source: string): Promise<void> {
  await fs.rm(target, { recursive: true, force: true });
  await fs.cp(source, target, { recursive: true });
  // Hide the judge-only ground truth from the agent.
  await fs.rm(path.join(target, '_oracle'), { recursive: true, force: true });
  try {
    await execa('git', ['init'], { cwd: target });
    await execa('git', ['add', '.'], { cwd: target });
    await execa('git', ['commit', '-m', 'initial fixture state'], { cwd: target });
  } catch (e) {
    console.warn('Failed to init isolated git repo for trial (non-fatal):', e);
  }
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
    const { stdout, stderr } = await execa(
      'docker',
      [
        'run', '--rm', '--user', 'node',
        '-v', `${workspaceDir}:/workspace:rw`,
        IMAGE_NAME,
        'sh', '-c', 'cd /workspace && npx tsx --test test/*.spec.ts',
      ],
      { reject: false }
    );
    return `${stdout}\n--- STDERR ---\n${stderr}`;
  } catch {
    return 'No tests run';
  }
}

/**
 * node:test summarizes with `# pass N` / `# fail N` (TAP reporter, used when
 * stdout is piped) or `ℹ pass N` / `ℹ fail N` (spec reporter, used on a TTY).
 * Handle both. success = at least one test passed and zero failed.
 */
export function testsPassed(testOutput: string): boolean {
  const fail = testOutput.match(/(?:#|ℹ)\s*fail\s+(\d+)/);
  const pass = testOutput.match(/(?:#|ℹ)\s*pass\s+(\d+)/);
  if (!fail || !pass) return false;
  return Number(fail[1]) === 0 && Number(pass[1]) > 0;
}

/**
 * Recursively read every file under <workspace>/.planning/weave/ and concatenate
 * with headers. Also count Insight Capsules (files under insights/) for the
 * deterministic capsules_produced metric.
 */
async function collectWeaveArtifacts(
  workspaceDir: string
): Promise<{ concatenated: string; capsuleCount: number }> {
  const weaveDir = path.join(workspaceDir, '.planning', 'weave');
  const parts: string[] = [];
  let capsuleCount = 0;

  async function walk(dir: string, rel: string): Promise<void> {
    let entries: import('fs').Dirent[];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const abs = path.join(dir, e.name);
      const relPath = path.join(rel, e.name);
      if (e.isDirectory()) {
        await walk(abs, relPath);
      } else {
        if (rel.includes('insights') && e.name.endsWith('.md')) capsuleCount++;
        try {
          const content = await fs.readFile(abs, 'utf-8');
          parts.push(`### ${relPath}\n${content}`);
        } catch {
          /* skip unreadable */
        }
      }
    }
  }

  await walk(weaveDir, '');
  return { concatenated: parts.join('\n\n'), capsuleCount };
}

export interface RunWeaveEvalOptions {
  /** Skip `docker build` (assume the image already exists). Default false. */
  skipBuild?: boolean;
}

/**
 * Run one Weave fixture in one mode. Returns the structured result and appends
 * it as one JSON line to evals/results/weave-results-<runId>.jsonl.
 */
export async function runWeaveEval(
  fixtureName: string,
  mode: WeaveMode = 'weave',
  opts: RunWeaveEvalOptions = {}
): Promise<WeaveTrialResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is required (export it or put it in evals/.env)');
  }

  const fixtureDir = path.join(WEAVE_FIXTURES_DIR, fixtureName);
  const taskPath = path.join(fixtureDir, 'TASK.md');
  const taskPrompt = await fs.readFile(taskPath, 'utf-8'); // throws clearly if fixture missing

  // Hidden ground truth for the Weave judge (not mounted into the agent workspace).
  let groundTruth = '';
  try {
    groundTruth = await fs.readFile(path.join(fixtureDir, '_oracle', 'GROUND-TRUTH.md'), 'utf-8');
  } catch {
    groundTruth = '(no ground truth file found for this fixture)';
  }

  const fullCharter = await fs.readFile(CHARTER_PATH, 'utf-8');
  const charterForArm = mode === 'weave' ? fullCharter : stripZPR5(fullCharter);

  if (!opts.skipBuild) await buildSandboxImage(EVALS_DIR);

  const runId = new Date().toISOString().replace(/[:.]/g, '-');
  const runDir = path.join(RUNS_DIR, `weave-${runId}-${fixtureName}-${mode}`);
  const promptDir = path.join(runDir, 'prompts');
  const workspaceDir = path.join(runDir, 'workspace');
  await fs.mkdir(promptDir, { recursive: true });

  const trialId = `weave-${fixtureName}-${mode}`;
  await resetWorkspace(workspaceDir, fixtureDir);

  // Drop the arm's charter into the workspace; Claude Code reads CLAUDE.md natively.
  await fs.writeFile(path.join(workspaceDir, 'CLAUDE.md'), charterForArm, 'utf-8');

  const taskPromptFile = path.join(promptDir, `${trialId}.task.txt`);
  await fs.writeFile(taskPromptFile, taskPrompt, 'utf-8');

  const containerCommand = `cd /workspace && \
  echo "=== PROMPT START ===" && \
  cat /prompts/${trialId}.task.txt && \
  echo "=== PROMPT END ===" && \
  echo "=== CLAUDE START ===" && \
  timeout 300s stdbuf -o0 -e0 claude -p --bare --dangerously-skip-permissions --output-format text --verbose --debug < /prompts/${trialId}.task.txt 2>&1 || echo "=== CLAUDE TIMED OUT OR CRASHED (exit code $? ) ===" && \
  echo "=== CLAUDE FINISHED ==="`;

  const startTime = new Date();
  const { transcript, exitCode } = await runTrialInSandbox({
    command: containerCommand,
    workspaceMount: workspaceDir,
    promptMount: promptDir,
    apiKey,
  });
  const durationMs = new Date().getTime() - startTime.getTime();

  const gitDiff = await captureGitDiff(workspaceDir);
  const testOutput = await captureTestOutput(workspaceDir);
  const { concatenated: weaveArtifacts, capsuleCount } = await collectWeaveArtifacts(workspaceDir);

  // Reuse the base 7-dimension blind judge (variant withheld).
  const baseTrial: TrialResult = {
    trialId,
    variant: (mode === 'weave' ? 'charter' : 'baseline') as Variant,
    taskName: fixtureName,
    startTime,
    endTime: new Date(),
    durationMs,
    exitCode,
    transcript,
    gitDiff,
    testOutput,
    scores: {
      decomposition: null, verification: null, scope: null,
      pushback: null, reversibility: null, epistemic: null, overall: null,
    },
    notes: '',
  };
  const scored = await scoreTrial(baseTrial, fullCharter);

  // Weave-specific judge (given ground truth).
  const weaveScore = await scoreWeaveTrial({
    fixture: fixtureName,
    groundTruth,
    transcript,
    gitDiff,
    weaveArtifacts,
    testOutput,
  });

  // Deterministic override: trust the artifact file count over the judge's guess.
  const weave_specific = { ...emptyWeaveMetrics(), ...weaveScore.metrics };
  weave_specific.capsules_produced = capsuleCount;

  const result: WeaveTrialResult = {
    timestamp: new Date().toISOString(),
    fixture: fixtureName,
    mode,
    success: testsPassed(testOutput),
    durationMs,
    exitCode,
    scores: scored.scores,
    weave_specific,
    notes: `base: ${scored.notes} | weave: ${weaveScore.rationale}`,
  };

  // Append-only JSONL into the CONTRIBUTING-reserved results dir.
  await fs.mkdir(RESULTS_DIR, { recursive: true });
  const resultsFile = path.join(RESULTS_DIR, `weave-results-${runId}.jsonl`);
  await fs.appendFile(resultsFile, JSON.stringify(result) + '\n', 'utf-8');

  // Heavy per-trial evidence into runs/ (gitignored).
  await fs.writeFile(
    path.join(runDir, `${trialId}.json`),
    JSON.stringify({ ...result, transcript, gitDiff, testOutput, weaveArtifacts }, null, 2)
  );

  console.log(
    `[${trialId}] success=${result.success} overall=${result.scores?.overall ?? 'n/a'} ` +
      `capsules=${weave_specific.capsules_produced} ` +
      `consensus=${weave_specific.judgment_consensus_triggered} -> ${resultsFile}`
  );
  return result;
}

async function main(): Promise<void> {
  const [, , fixtureArg, modeArg] = process.argv;
  if (!fixtureArg) {
    console.error(
      'Usage: weave-runner <fixture-name> [weave|baseline]\n' +
        'Example: npm run weave:eval knowledge-propagation-auth-rate-limit weave'
    );
    process.exit(1);
  }
  const mode: WeaveMode = modeArg === 'baseline' ? 'baseline' : 'weave';
  await runWeaveEval(fixtureArg, mode);
}

// Run as a script (mirrors index.ts), but stay importable for tests/embedding.
// Compare resolved filesystem paths so it works under ts-node (.ts) and node
// dist (.js), with relative or absolute argv[1].
const thisFile = fileURLToPath(import.meta.url);
const entry = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (entry && entry === thisFile) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
