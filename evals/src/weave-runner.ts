import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import { execa } from 'execa';
import { RunManifest, TrialResult, Variant } from './types.js';
import { buildSandboxImage, runTrialInSandbox } from './docker.js';
import {
  captureGitDiff,
  gitHeadSha,
  resolveAgentModel,
  resolveTrialTimeoutS,
  sha256OfFile,
  writeRunManifest,
} from './runner.js';
import { JUDGE_MODEL, scoreTrial } from './scorer.js';
import {
  DeterministicMetrics,
  computeDeterministicMetrics,
  loadFixtureScope,
} from './deterministic.js';
import { scoreWeaveTrial } from './weave-scorer.js';
import { WeaveMode, WeaveTrialResult, emptyWeaveMetrics } from './weave-types.js';
import { resolveFixtureSkill } from './fixture-skill.js';

/**
 * Weave eval runner. Reuses the REAL harness primitives — buildSandboxImage,
 * runTrialInSandbox (docker.ts), and scoreTrial (scorer.ts) — and adds a Weave
 * judge (weave-scorer.ts). It is fully additive: it never imports or mutates
 * the base orchestrator (index.ts), so `npm run smoke` is unaffected.
 *
 * Design note (R7 override, documented in weave-fixtures/NOTES.md):
 * WEAVE-EVALS-DESIGN.md assumed `import { runFixture } from
 * './existing-harness-utils'`. No such module exists. The real reusable surface
 * is the five exports above plus a per-trial flow that mirrors index.ts's
 * private main() loop, re-implemented here against the true API.
 *
 * ── Arm definition (DECISIONS.md #5) ────────────────────────────────────────
 * Both arms receive the SAME core charter (CLAUDE.md). The 'weave'
 * (skill-present) arm additionally gets `.claude/skills/<skill>/` (from the
 * repo root) copied into the trial workspace; 'baseline' gets no skill dir.
 * The skill under test defaults to "weave" and can be declared per fixture in
 * `_oracle/CHECKS.json` → `"skill"` (fixture-skill.ts) — e.g. zp-positive-path
 * declares "zero-pause". The selection is recorded in the run manifest
 * (`weaveSkill`). WEAVE-PROTOCOL.md is a non-normative archive and ships to
 * NEITHER arm. This isolates the skill's marginal value on top of the v3 core.
 *
 * The previous mechanism — stripZPR5(), which cut the ZPR5 stanza out of the
 * v2 charter for the baseline arm — is RETIRED: v3 has no ZPR5 stanza in the
 * core, so skill-present vs skill-absent is the arm contrast now.
 */

const EVALS_DIR = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const PROJECT_ROOT = path.resolve(EVALS_DIR, '..');
const CHARTER_PATH = path.join(PROJECT_ROOT, 'CLAUDE.md');
/** Skill dirs live here; the skill-present arm hard-fails if the selected one is missing. */
const SKILLS_DIR = path.join(PROJECT_ROOT, '.claude', 'skills');
const WEAVE_FIXTURES_DIR = path.join(EVALS_DIR, 'weave-fixtures');
const RESULTS_DIR = path.join(EVALS_DIR, 'results');
const RUNS_DIR = path.join(EVALS_DIR, 'runs');

const IMAGE_NAME = 'meta-charter-agent:latest';

/**
 * Same contract as index.ts's resetWorkspace (plus oracle removal): snapshot,
 * commit with inline git identity, return the initial commit SHA for the diff
 * evidence channel. Fatal on failure — a diff-less trial is unjudgeable.
 */
async function resetWorkspace(target: string, source: string): Promise<string> {
  await fs.rm(target, { recursive: true, force: true });
  await fs.cp(source, target, { recursive: true });
  // Hide the judge-only ground truth from the agent.
  await fs.rm(path.join(target, '_oracle'), { recursive: true, force: true });
  // DECISIONS #5: WEAVE-PROTOCOL.md ships to NEITHER arm (defensive — fixtures
  // should not contain it, but a stray copy would contaminate the contrast).
  await fs.rm(path.join(target, 'WEAVE-PROTOCOL.md'), { force: true });
  try {
    await execa('git', ['init'], { cwd: target });
    await execa('git', ['add', '.'], { cwd: target });
    await execa(
      'git',
      [
        '-c', 'user.email=evals@meta-charter.invalid',
        '-c', 'user.name=META Evals Harness',
        '-c', 'commit.gpgsign=false',
        'commit', '-m', 'initial fixture state',
      ],
      { cwd: target }
    );
    const { stdout } = await execa('git', ['rev-parse', 'HEAD'], { cwd: target });
    return stdout.trim();
  } catch (e) {
    throw new Error(
      `Failed to initialize trial workspace git repo at ${target} — ` +
        `aborting instead of producing diff-less (unjudgeable) trials: ${e}`
    );
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
  // Both throw on missing/invalid values — no silent defaults for run-defining knobs.
  const agentModel = resolveAgentModel();
  const trialTimeoutS = resolveTrialTimeoutS();
  const judgeModel = JUDGE_MODEL;

  // Early, clear check so users don't get a cryptic ENOENT or daemon error later.
  // Note: `--version` only checks for the client binary. Actual `build`/`run`
  // will still fail (with a clearer message) if the daemon is unreachable.
  try {
    await execa('docker', ['--version'], { stdio: 'ignore' });
  } catch {
    throw new Error(
      'Docker is not available (or the daemon is not running).\n' +
      'The eval harness runs the agent inside a hardened `docker` sandbox.\n' +
      'Install/start Docker, then retry.'
    );
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

  // DECISIONS #5: both arms get the same core charter; only the skill-present
  // arm gets a skill dir. Which skill is per-fixture (fixture-skill.ts):
  // _oracle/CHECKS.json may declare "skill" (default "weave") — e.g.
  // zp-positive-path declares "zero-pause" because its oracle contrasts on the
  // zero-pause skill. Fail fast (before the docker build) if it is missing.
  const coreCharter = await fs.readFile(CHARTER_PATH, 'utf-8');
  const skillName = await resolveFixtureSkill(fixtureDir);
  const skillDir = path.join(SKILLS_DIR, skillName);
  if (mode === 'weave') {
    try {
      await fs.access(skillDir);
    } catch {
      throw new Error(
        `Skill directory not found: ${skillDir}\n` +
          `DECISIONS #5 defines the skill-present arm as core CLAUDE.md + .claude/skills/${skillName}/\n` +
          `copied into the trial workspace (fixture ${fixtureName} selects "${skillName}" via\n` +
          '_oracle/CHECKS.json; default is "weave"). Author the skill dir first — the baseline\n' +
          'arm runs without it.'
      );
    }
  }

  if (!opts.skipBuild) await buildSandboxImage(EVALS_DIR);

  const runId = new Date().toISOString().replace(/[:.]/g, '-');
  const runDir = path.join(RUNS_DIR, `weave-${runId}-${fixtureName}-${mode}`);
  const promptDir = path.join(runDir, 'prompts');
  const workspaceDir = path.join(runDir, 'workspace');
  await fs.mkdir(promptDir, { recursive: true });

  const trialId = `weave-${fixtureName}-${mode}`;
  const initialCommit = await resetWorkspace(workspaceDir, fixtureDir);

  const manifest: RunManifest = {
    runId,
    timestamp: new Date().toISOString(),
    agentModel,
    judgeModel,
    trialsPerPair: 1, // weave-runner executes exactly one (fixture, mode) trial per run
    trialTimeoutS,
    fixtures: [fixtureName],
    charterSha256: await sha256OfFile(CHARTER_PATH),
    harnessGitSha: await gitHeadSha(PROJECT_ROOT),
    weaveMode: mode,
    // Skill-present arm only: which .claude/skills/<name>/ dir shipped, so
    // downstream tooling (publish-run blinding) can find the skill text.
    ...(mode === 'weave' ? { weaveSkill: skillName } : {}),
  };
  await writeRunManifest(runDir, manifest);

  // Both arms: the same core charter. Claude Code reads CLAUDE.md natively.
  await fs.writeFile(path.join(workspaceDir, 'CLAUDE.md'), coreCharter, 'utf-8');
  // Skill-present arm only: the fixture-selected skill dir. (.claude/ is
  // pathspec-excluded from the judge's diff in runner.ts captureGitDiff, so
  // this never unblinds.)
  if (mode === 'weave') {
    await fs.cp(skillDir, path.join(workspaceDir, '.claude', 'skills', skillName), {
      recursive: true,
    });
  }

  const taskPromptFile = path.join(promptDir, `${trialId}.task.txt`);
  await fs.writeFile(taskPromptFile, taskPrompt, 'utf-8');

  const containerCommand = `cd /workspace && \
  echo "=== PROMPT START ===" && \
  cat /prompts/${trialId}.task.txt && \
  echo "=== PROMPT END ===" && \
  echo "=== CLAUDE START ===" && \
  timeout ${trialTimeoutS}s stdbuf -o0 -e0 claude -p --bare --model ${agentModel} --dangerously-skip-permissions --output-format text --verbose --debug < /prompts/${trialId}.task.txt 2>&1 || echo "=== CLAUDE TIMED OUT OR CRASHED (exit code $? ) ===" && \
  echo "=== CLAUDE FINISHED ==="`;

  const startTime = new Date();
  const { transcript, exitCode } = await runTrialInSandbox({
    command: containerCommand,
    workspaceMount: workspaceDir,
    promptMount: promptDir,
    apiKey,
    // Container hard-stop trails the in-container `timeout` so the trial
    // timeout stays the single knob (buffer covers container start + echo).
    timeoutMs: (trialTimeoutS + 120) * 1000,
  });
  const durationMs = new Date().getTime() - startTime.getTime();

  const gitDiff = await captureGitDiff(workspaceDir, initialCommit);
  const testOutput = await captureTestOutput(workspaceDir);
  const { concatenated: weaveArtifacts, capsuleCount } = await collectWeaveArtifacts(workspaceDir);

  // Judge-free metric layer (zero API cost), computed before any LLM judging.
  // Scope comes from the SOURCE fixture dir (its _oracle/ was stripped from
  // the workspace above). See deterministic.ts for honesty bounds.
  const deterministic = await computeDeterministicMetrics({
    transcript,
    gitDiff,
    testOutput,
    workspaceDir,
    scope: await loadFixtureScope(fixtureDir),
  });

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
  const scored = await scoreTrial(baseTrial, coreCharter);

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

  // `deterministic` rides along in the JSONL line and the runDir evidence JSON
  // without touching weave-types.ts (owned by the weave-restructure stage).
  const result: WeaveTrialResult & { deterministic: DeterministicMetrics } = {
    timestamp: new Date().toISOString(),
    fixture: fixtureName,
    mode,
    success: testsPassed(testOutput),
    durationMs,
    exitCode,
    scores: scored.scores,
    weave_specific,
    deterministic,
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

// Always execute when this file is the entrypoint (ts-node or built JS).
// Matches the pattern used in src/index.ts. The conditional guard was too
// fragile under `node --loader ts-node/esm`.
main().catch((err) => {
  if (err instanceof Error) {
    console.error(err.message);
    if (err.stack) console.error(err.stack);
  } else {
    console.error('weave-runner error:', err);
  }
  process.exit(1);
});
