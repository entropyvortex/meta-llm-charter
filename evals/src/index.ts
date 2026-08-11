import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import { execa } from 'execa';
import { createObjectCsvWriter } from 'csv-writer';
import { RunManifest, TrialConfig, TrialResult, Variant } from './types.js';
import { buildSandboxImage } from './docker.js';
import {
  gitHeadSha,
  resolveAgentModel,
  resolveTrialTimeoutS,
  runSingleTrial,
  sha256OfFile,
  writeRunManifest,
} from './runner.js';
import { JUDGE_MODEL, scoreTrial } from './scorer.js';
import { computeDeterministicMetrics, loadFixtureScope } from './deterministic.js';
import {
  PairInput,
  PairwiseComparison,
  analyzePairwise,
  comparePair,
} from './pairwise-scorer.js';
import { buildRedactionVocabulary } from './sanitize.js';
import { loadTasks } from './tasks/index.js';

const EVALS_DIR = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const PROJECT_ROOT = path.resolve(EVALS_DIR, '..');
const CHARTER_PATH = path.join(PROJECT_ROOT, 'CLAUDE.md');
const FIXTURES_DIR = path.join(EVALS_DIR, 'fixtures');
const RUNS_DIR = path.join(EVALS_DIR, 'runs');

// Number of times each (fixture, variant) pair is run. Total trials =
// discovered fixtures × 2 variants × TRIALS_PER_PAIR (default 3).
const TRIALS_PER_PAIR = Number(process.env.TRIALS_PER_PAIR ?? 3);

// Optional comma-separated allowlist (fixture name substrings). When set, only
// matching fixtures run — useful for debugging a single trap quickly.
const FIXTURE_FILTER = process.env.FIXTURE
  ? process.env.FIXTURE.split(',').map((s) => s.trim())
  : null;

const VARIANTS: Variant[] = ['charter', 'baseline'];

/**
 * Snapshots the fixture into the trial workspace and commits it in a fresh,
 * isolated git repo. Returns the initial commit SHA — the runner diffs against
 * it to capture agent changes even if the agent stages or commits.
 *
 * Identity is passed inline (-c) so trials never depend on operator/runner git
 * config. A failure here is FATAL: without the initial commit there is no diff
 * evidence channel, and a judged trial without a diff is garbage data.
 */
async function resetWorkspace(target: string, source: string): Promise<string> {
  await fs.rm(target, { recursive: true, force: true });
  await fs.cp(source, target, { recursive: true });

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

async function main(): Promise<void> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is required (export it or put it in evals/.env)');
  }
  // Both throw on missing/invalid values — no silent defaults for run-defining knobs.
  const agentModel = resolveAgentModel();
  const trialTimeoutS = resolveTrialTimeoutS();
  const judgeModel = JUDGE_MODEL;

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

  // Manifest first: every row in results.csv must be traceable to pinned
  // models, the exact charter bytes, and the harness commit that produced it.
  const manifest: RunManifest = {
    runId,
    timestamp: new Date().toISOString(),
    agentModel,
    judgeModel,
    trialsPerPair: TRIALS_PER_PAIR,
    trialTimeoutS,
    fixtures: tasks.map((t) => t.name),
    charterSha256: await sha256OfFile(CHARTER_PATH),
    harnessGitSha: await gitHeadSha(PROJECT_ROOT),
  };
  await writeRunManifest(runDir, manifest);
  console.log(`Manifest written: ${path.join(runDir, 'manifest.json')}`);

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
        process.env.CLAUDE_COMMAND ??
        `claude -p --bare --model ${agentModel} --dangerously-skip-permissions --output-format text --verbose`,
    };

    console.log(`[${i + 1}/${schedule.length}] ${config.trialId}`);
    const initialCommit = await resetWorkspace(workspaceDir, task.fixtureDir);

    let result = await runSingleTrial(config, {
      charterPath: CHARTER_PATH,
      promptDir,
      workspaceDir,
      apiKey,
      agentModel,
      trialTimeoutS,
      initialCommit,
    });
    // Deterministic metrics run BEFORE and independently of the LLM judge:
    // zero API cost, exact values, and (DECISIONS #3) the source of the
    // epistemic dimension downstream. Read the workspace before the next
    // trial's resetWorkspace wipes it.
    result.deterministic = await computeDeterministicMetrics({
      transcript: result.transcript,
      gitDiff: result.gitDiff,
      testOutput: result.testOutput,
      workspaceDir,
      scope: await loadFixtureScope(task.fixtureDir),
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
      // Deterministic (judge-free) metric layer — primary tuning signal.
      { id: 'detRanTestsBeforeEdit', title: 'Det: Tests Before Edit' },
      { id: 'detRanTestsBeforeEditBasis', title: 'Det: Tests-Before-Edit Basis' },
      { id: 'detOutOfScopeCount', title: 'Det: Out-of-Scope Files' },
      { id: 'detTestsPassedFinal', title: 'Det: Tests Passed (final)' },
      { id: 'detTestsFailedFinal', title: 'Det: Tests Failed (final, incl. cancelled)' },
      { id: 'detTestFilesModified', title: 'Det: Test Files Modified' },
      { id: 'detR8Executed', title: 'Det: R8 executed tags' },
      { id: 'detR8Inspected', title: 'Det: R8 inspected tags' },
      { id: 'detR8Assumed', title: 'Det: R8 assumed tags' },
      { id: 'detTagConsistency', title: 'Det: Executed-Tag Consistency (matched/named)' },
      { id: 'detFilesTouched', title: 'Det: Diff Files' },
      { id: 'detLinesAdded', title: 'Det: Diff Lines Added' },
      { id: 'detLinesRemoved', title: 'Det: Diff Lines Removed' },
      { id: 'detHumanpending', title: 'Det: humanpending.md' },
      { id: 'detDissent', title: 'Det: DISSENT.md' },
      { id: 'notes', title: 'Notes' },
    ],
  });

  // Nulls become '' in the CSV so "unknown" is never conflated with 0/false.
  const cell = (v: boolean | number | string | null | undefined): boolean | number | string =>
    v === null || v === undefined ? '' : v;

  const flatRows = results.map((r) => {
    const d = r.deterministic;
    return {
      trialId: r.trialId,
      variant: r.variant,
      taskName: r.taskName,
      durationMs: r.durationMs,
      exitCode: r.exitCode,
      ...r.scores,
      detRanTestsBeforeEdit: cell(d?.ran_tests_before_edit),
      detRanTestsBeforeEditBasis: cell(d?.ran_tests_before_edit_basis),
      detOutOfScopeCount: cell(d?.out_of_scope_count),
      detTestsPassedFinal: cell(d?.tests_passed_final),
      detTestsFailedFinal: cell(d?.tests_failed_final),
      detTestFilesModified: cell(d?.test_files_modified),
      detR8Executed: cell(d?.r8_tags.executed),
      detR8Inspected: cell(d?.r8_tags.inspected),
      detR8Assumed: cell(d?.r8_tags.assumed),
      detTagConsistency: d
        ? `${d.tag_artifact_consistency.commands_matched}/${d.tag_artifact_consistency.claims_naming_command}`
        : '',
      detFilesTouched: cell(d?.diff_stats.files_touched),
      detLinesAdded: cell(d?.diff_stats.lines_added),
      detLinesRemoved: cell(d?.diff_stats.lines_removed),
      detHumanpending: cell(d?.artifacts.humanpending_md),
      detDissent: cell(d?.artifacts.dissent_md),
      notes: r.notes,
    };
  });

  await csvWriter.writeRecords(flatRows);

  // ── Pairwise phase (HEADLINE comparison; PAIRWISE=0 disables) ─────────────
  // Forced-choice A/B per (fixture, rep) with the escalation ladder:
  // deterministic gate → single judge → 3-judge ensemble. The absolute
  // per-trial scores above stay as detail; sign-test analysis lands in
  // pairwise-analysis.json. Default ON so `npm start` produces the headline.
  if (process.env.PAIRWISE !== '0') {
    // schedule[i] ↔ results[i] (one push per schedule entry, in order).
    const byKey = new Map<string, Partial<Record<Variant, TrialResult>>>();
    for (let i = 0; i < results.length; i++) {
      const key = `${schedule[i].task.name}\u0000${schedule[i].rep}`;
      const slot = byKey.get(key) ?? {};
      slot[schedule[i].variant] = results[i];
      byKey.set(key, slot);
    }
    const pairs: PairInput[] = [];
    for (const [key, slot] of byKey) {
      if (!slot.charter || !slot.baseline) continue; // partial run — unpaired
      const sep = key.lastIndexOf('\u0000');
      const bundle = (r: TrialResult) => ({
        transcript: r.transcript,
        gitDiff: r.gitDiff,
        testOutput: r.testOutput,
        deterministic: r.deterministic,
      });
      pairs.push({
        fixture: key.slice(0, sep),
        rep: Number(key.slice(sep + 1)),
        charter: bundle(slot.charter),
        baseline: bundle(slot.baseline),
      });
    }

    const vocab = buildRedactionVocabulary(charter);
    const comparisons: PairwiseComparison[] = [];
    for (const pair of pairs) {
      const c = await comparePair(pair, { vocab });
      console.log(
        `[pairwise] ${pair.fixture} r${pair.rep}: ${c.winner} (${c.decidedBy}${c.gateReason ? `: ${c.gateReason}` : ''})`
      );
      comparisons.push(c);
    }
    const analysis = analyzePairwise(comparisons);
    await fs.writeFile(
      path.join(runDir, 'pairwise.jsonl'),
      comparisons.map((c) => JSON.stringify(c)).join('\n') + '\n',
      'utf-8'
    );
    await fs.writeFile(
      path.join(runDir, 'pairwise-analysis.json'),
      JSON.stringify(analysis, null, 2) + '\n',
      'utf-8'
    );
    const o = analysis.overall;
    console.log(
      `Pairwise headline: charter ${o.wins}W/${o.losses}L/${o.ties}T over ${o.n} pairs, ` +
        `sign-test p=${o.pValue.toFixed(4)} → verdict: ${o.verdict}` +
        (o.excludedErrors > 0 ? ` (${o.excludedErrors} pair(s) excluded on judge error)` : '')
    );
  }

  console.log(`Done. Results in ${runDir}`);
}

main().catch((err) => {
  if (err instanceof Error) {
    console.error(err.message);
    if (err.stack) console.error(err.stack);
  } else {
    console.error('evals error:', err);
  }
  process.exit(1);
});
