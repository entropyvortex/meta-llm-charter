import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import { execa } from 'execa';
import { createObjectCsvWriter } from 'csv-writer';
import { TrialConfig, TrialResult, Variant } from './types.js';
import { buildSandboxImage } from './docker.js';
import { runSingleTrial } from './runner.js';
import { scoreTrial } from './scorer.js';
import { loadTasks } from './tasks/index.js';

const EVALS_DIR = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const PROJECT_ROOT = path.resolve(EVALS_DIR, '..');
const CHARTER_PATH = path.join(PROJECT_ROOT, 'CLAUDE.md');
const FIXTURES_DIR = path.join(EVALS_DIR, 'fixtures');
const RUNS_DIR = path.join(EVALS_DIR, 'runs');

// Number of times each (fixture, variant) pair is run. Total trials =
// fixtures × 2 × TRIALS_PER_PAIR. Default 3 → 5 fixtures × 2 × 3 = 30 trials.
const TRIALS_PER_PAIR = Number(process.env.TRIALS_PER_PAIR ?? 3);

// Optional comma-separated allowlist (fixture name substrings). When set, only
// matching fixtures run — useful for debugging a single trap quickly.
const FIXTURE_FILTER = process.env.FIXTURE
  ? process.env.FIXTURE.split(',').map((s) => s.trim())
  : null;

const VARIANTS: Variant[] = ['charter', 'baseline'];

async function resetWorkspace(target: string, source: string): Promise<void> {
  await fs.rm(target, { recursive: true, force: true });
  await fs.cp(source, target, { recursive: true });

  // ←←← ADD THIS BLOCK
  try {
    await execa('git', ['init'], { cwd: target });
    await execa('git', ['add', '.'], { cwd: target });
    await execa('git', ['commit', '-m', 'initial fixture state'], { cwd: target });
    console.log(`Initialized fresh git repo for trial workspace`);
  } catch (e) {
    console.warn('Failed to init isolated git repo for trial (non-fatal):', e);
  }
  // ←←← END OF BLOCK
}

async function main(): Promise<void> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is required (export it or put it in evals/.env)');
  }

  await fs.access(CHARTER_PATH);
  const charter = await fs.readFile(CHARTER_PATH, 'utf-8');

  let tasks = await loadTasks(FIXTURES_DIR);
  if (FIXTURE_FILTER) {
    tasks = tasks.filter((t) => FIXTURE_FILTER.some((f) => t.name.includes(f)));
  }
  if (tasks.length === 0) {
    throw new Error(`No fixtures found in ${FIXTURES_DIR}${FIXTURE_FILTER ? ` matching ${FIXTURE_FILTER.join(',')}` : ''}`);
  }

  console.log(
    `Loaded ${tasks.length} fixture(s): ${tasks.map((t) => t.name).join(', ')}`
  );
  console.log(
    `Plan: ${tasks.length} × ${VARIANTS.length} × ${TRIALS_PER_PAIR} = ${tasks.length * VARIANTS.length * TRIALS_PER_PAIR} trials`
  );

  await buildSandboxImage(EVALS_DIR);

  await fs.mkdir(RUNS_DIR, { recursive: true });
  const runId = new Date().toISOString().replace(/[:.]/g, '-');
  const runDir = path.join(RUNS_DIR, runId);
  const promptDir = path.join(runDir, 'prompts');
  const workspaceDir = path.join(runDir, 'workspace');
  const transcriptsDir = path.join(runDir, 'transcripts');
  await fs.mkdir(promptDir, { recursive: true });
  await fs.mkdir(transcriptsDir, { recursive: true });

  const results: TrialResult[] = [];

  // Build the trial schedule: for each task × variant × repetition.
  const schedule: { task: typeof tasks[number]; variant: Variant; rep: number }[] = [];
  for (const task of tasks) {
    for (const variant of VARIANTS) {
      for (let rep = 0; rep < TRIALS_PER_PAIR; rep++) {
        schedule.push({ task, variant, rep });
      }
    }
  }

  // Interleave so a partial run still has both arms represented.
  schedule.sort((a, b) => a.rep - b.rep);

  for (let i = 0; i < schedule.length; i++) {
    const { task, variant, rep } = schedule[i];
    const config: TrialConfig = {
      trialId: `trial-${i.toString().padStart(3, '0')}-${task.name}-${variant}-r${rep}`,
      variant,
      taskName: task.name,
      taskPrompt: task.prompt,
      claudeCommand:
        process.env.CLAUDE_COMMAND ?? 'claude -p --bare --dangerously-skip-permissions --output-format text --verbose',
    };

    console.log(`[${i + 1}/${schedule.length}] ${config.trialId}`);
    await resetWorkspace(workspaceDir, task.fixtureDir);

    let result = await runSingleTrial(config, {
      charterPath: CHARTER_PATH,
      promptDir,
      workspaceDir,
      apiKey,
    });
    result = await scoreTrial(result, charter);
    results.push(result);

    await fs.writeFile(
      path.join(transcriptsDir, `${config.trialId}.json`),
      JSON.stringify(result, null, 2)
    );
  }

  const csvWriter = createObjectCsvWriter({
    path: path.join(runDir, 'results.csv'),
    header: [
      { id: 'trialId', title: 'Trial ID' },
      { id: 'variant', title: 'Variant' },
      { id: 'taskName', title: 'Task' },
      { id: 'durationMs', title: 'Duration (ms)' },
      { id: 'exitCode', title: 'Exit Code' },
      { id: 'decomposition', title: 'Decomposition' },
      { id: 'verification', title: 'Verification' },
      { id: 'scope', title: 'Scope' },
      { id: 'pushback', title: 'Pushback' },
      { id: 'reversibility', title: 'Reversibility' },
      { id: 'epistemic', title: 'Epistemic' },
      { id: 'overall', title: 'Overall' },
      { id: 'notes', title: 'Notes' },
    ],
  });

  const flatRows = results.map((r) => ({
    trialId: r.trialId,
    variant: r.variant,
    taskName: r.taskName,
    durationMs: r.durationMs,
    exitCode: r.exitCode,
    ...r.scores,
    notes: r.notes,
  }));

  await csvWriter.writeRecords(flatRows);
  console.log(`Done. Results in ${runDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
