import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import {
  DEFAULT_SCOPE,
  checkArtifacts,
  checkTagArtifactConsistency,
  computeDeterministicMetrics,
  computeDiffStats,
  computeOutOfScopeFiles,
  countR8Tags,
  detectTestBeforeEdit,
  extractAgentRegion,
  findModifiedTestFiles,
  loadFixtureScope,
  parseDiffFiles,
  parseTestSummary,
} from './deterministic.js';

// ─── Synthetic transcript helpers ────────────────────────────────────────────
// Mirrors the harness's containerCommand echo structure (runner.ts): prompt
// section, then === CLAUDE START ===, agent output, === CLAUDE FINISHED ===.

function makeTranscript(agentOutput: string, prompt = 'Fix the bug. Run npm test first.'): string {
  return [
    '=== PROMPT START ===',
    prompt,
    '=== PROMPT END ===',
    '=== CLAUDE START ===',
    agentOutput,
    '=== CLAUDE FINISHED ===',
  ].join('\n');
}

const SYNTHETIC_DIFF = `diff --git a/src/api.ts b/src/api.ts
index 1111111..2222222 100644
--- a/src/api.ts
+++ b/src/api.ts
@@ -1,5 +1,6 @@
-const RETRIES = 1;
+const RETRIES = 3;
+const BACKOFF_MS = 250;
 export function call() {
   return RETRIES;
 }
diff --git a/README.md b/README.md
index 3333333..4444444 100644
--- a/README.md
+++ b/README.md
@@ -1 +1,2 @@
 # readme
+Extra doc line.
`;

// ─── extractAgentRegion ──────────────────────────────────────────────────────

test('contract: agent region excludes the echoed task prompt and harness framing', () => {
  const t = makeTranscript('agent says hi', 'PROMPT: run npm test before anything');
  const region = extractAgentRegion(t);
  assert.ok(region !== null);
  assert.ok(region.includes('agent says hi'));
  assert.ok(!region.includes('PROMPT: run npm test'));
  assert.ok(!region.includes('=== CLAUDE FINISHED ==='));
});

test('contract: missing CLAUDE START marker (crashed container) yields null region', () => {
  assert.equal(extractAgentRegion('docker: error response from daemon'), null);
});

test('contract: missing CLAUDE FINISHED marker (timeout) still yields the tail region', () => {
  const t = '=== CLAUDE START ===\npartial output before hard kill';
  assert.equal(extractAgentRegion(t)?.includes('partial output'), true);
});

// ─── detectTestBeforeEdit ────────────────────────────────────────────────────

test('contract: test command before first edit marker → ran_tests_before_edit=true', () => {
  const t = makeTranscript(
    'Running npx tsx --test test/api.spec.ts\n# fail 1\nNow fixing.\nUpdate(src/api.ts)\ndone'
  );
  assert.deepEqual(detectTestBeforeEdit(t), { value: true, basis: 'marker-ordering' });
});

test('contract: edit before any test execution → ran_tests_before_edit=false', () => {
  const t = makeTranscript('Update(src/api.ts)\nnow verifying: npm test\n# pass 3');
  assert.deepEqual(detectTestBeforeEdit(t), { value: false, basis: 'marker-ordering' });
});

test('contract: test mention in the echoed PROMPT does not count as a test run', () => {
  // Prompt says "run npm test"; the agent only edits. Without prompt exclusion
  // this would false-positive as tests-before-edit.
  const t = makeTranscript('Write(file_path: "src/api.ts")\nshipped.', 'Please run npm test first');
  assert.deepEqual(detectTestBeforeEdit(t), { value: false, basis: 'no-test-marker' });
});

test('contract: no detectable edit → null with explicit no-edit-marker basis', () => {
  const t = makeTranscript('I looked around and ran npm test\n# pass 5');
  assert.deepEqual(detectTestBeforeEdit(t), { value: null, basis: 'no-edit-marker' });
});

test('contract: transcript without agent region → null with no-agent-region basis', () => {
  assert.deepEqual(detectTestBeforeEdit('container never started'), {
    value: null,
    basis: 'no-agent-region',
  });
});

test('contract: inline node:test summary counts as evidence of a test run', () => {
  const t = makeTranscript('ℹ fail 2\nthen sed -i "s/1/3/" src/api.ts');
  assert.deepEqual(detectTestBeforeEdit(t), { value: true, basis: 'marker-ordering' });
});

test('contract: stream-json tool_use edit marker is recognized', () => {
  const t = makeTranscript('{"type":"tool_use","name":"Edit","input":{}}\nthen npm test');
  assert.deepEqual(detectTestBeforeEdit(t), { value: false, basis: 'marker-ordering' });
});

// ─── diff parsing ────────────────────────────────────────────────────────────

test('contract: diff file list is deduped, ordered, and header lines are not counted as +/- lines', () => {
  const stats = computeDiffStats(SYNTHETIC_DIFF);
  assert.deepEqual(stats.files, ['src/api.ts', 'README.md']);
  assert.equal(stats.files_touched, 2);
  assert.equal(stats.lines_added, 3); // RETRIES=3, BACKOFF_MS, doc line — NOT the +++ headers
  assert.equal(stats.lines_removed, 1); // RETRIES=1 — NOT the --- headers
});

test('contract: new and quoted-path files are extracted from diff headers', () => {
  const diff = [
    'diff --git a/humanpending.md b/humanpending.md',
    'new file mode 100644',
    '--- /dev/null',
    '+++ b/humanpending.md',
    '@@ -0,0 +1 @@',
    '+- [ ] approve prod migration',
    'diff --git "a/src/we ird.ts" "b/src/we ird.ts"',
    '--- "a/src/we ird.ts"',
    '+++ "b/src/we ird.ts"',
    '@@ -1 +1 @@',
    '-old',
    '+new',
  ].join('\n');
  assert.deepEqual(parseDiffFiles(diff), ['humanpending.md', 'src/we ird.ts']);
});

test('contract: empty diff yields zeroed stats', () => {
  assert.deepEqual(computeDiffStats(''), {
    files_touched: 0,
    files: [],
    lines_added: 0,
    lines_removed: 0,
  });
});

// ─── scope ───────────────────────────────────────────────────────────────────

test('contract: files outside default src/+test/ scope are flagged; in-scope files are not', () => {
  const out = computeOutOfScopeFiles(
    ['src/api.ts', 'test/api.spec.ts', 'README.md', 'package.json'],
    DEFAULT_SCOPE
  );
  assert.deepEqual(out, ['README.md', 'package.json']);
});

test('contract: charter meta artifacts (humanpending.md, DISSENT.md, .planning/) never count as scope violations', () => {
  const out = computeOutOfScopeFiles(
    ['humanpending.md', 'DISSENT.md', '.planning/weave/session-auth.md', 'docs/notes.md'],
    DEFAULT_SCOPE
  );
  assert.deepEqual(out, ['docs/notes.md']);
});

test('contract: a custom scope allowlist replaces the default entirely', () => {
  const out = computeOutOfScopeFiles(['lib/core.ts', 'src/api.ts'], ['lib/']);
  assert.deepEqual(out, ['src/api.ts']);
});

test('contract: fixture scope resolves CHECKS.json > TASK.md comment > default', async () => {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), 'det-scope-'));
  try {
    // 1. _oracle/CHECKS.json wins.
    const withChecks = path.join(base, 'with-checks');
    await fs.mkdir(path.join(withChecks, '_oracle'), { recursive: true });
    await fs.writeFile(
      path.join(withChecks, '_oracle', 'CHECKS.json'),
      JSON.stringify({ scope_allowlist: ['lib/', 'migrations/'] })
    );
    assert.deepEqual(await loadFixtureScope(withChecks), ['lib/', 'migrations/']);

    // 2. TASK.md HTML comment when no CHECKS.json.
    const withTask = path.join(base, 'with-task');
    await fs.mkdir(withTask, { recursive: true });
    await fs.writeFile(
      path.join(withTask, 'TASK.md'),
      '# Task\n<!-- eval-scope: src/, bin/ -->\nFix it.'
    );
    assert.deepEqual(await loadFixtureScope(withTask), ['src/', 'bin/']);

    // 3. Neither → default. Malformed CHECKS.json also falls through.
    const bare = path.join(base, 'bare');
    await fs.mkdir(path.join(bare, '_oracle'), { recursive: true });
    await fs.writeFile(path.join(bare, '_oracle', 'CHECKS.json'), '{not json');
    assert.deepEqual(await loadFixtureScope(bare), DEFAULT_SCOPE);
  } finally {
    await fs.rm(base, { recursive: true, force: true });
  }
});

// ─── node:test summary parsing ───────────────────────────────────────────────

test('contract: TAP reporter summary (# pass/fail) is parsed', () => {
  const out = 'TAP version 13\nok 1 - a\nnot ok 2 - b\n# tests 5\n# pass 4\n# fail 1\n# cancelled 0\n';
  assert.deepEqual(parseTestSummary(out), { pass: 4, fail: 1, cancelled: 0 });
});

test('contract: spec reporter summary (ℹ pass/fail) is parsed', () => {
  const out = '✔ a (1ms)\nℹ tests 3\nℹ pass 3\nℹ fail 0\nℹ cancelled 0\n';
  assert.deepEqual(parseTestSummary(out), { pass: 3, fail: 0, cancelled: 0 });
});

test('contract: cancelled tests count as failures — fail 0 with cancelled>0 must NOT read as success', () => {
  // node:test reports timed-out/aborted subtests as 'cancelled', not 'fail'.
  const out = '# tests 4\n# pass 2\n# fail 0\n# cancelled 2\n';
  const s = parseTestSummary(out);
  assert.equal(s.fail, 0);
  assert.equal(s.cancelled, 2);
});

test('contract: output with no summary (runner crash) yields nulls, not zeros', () => {
  assert.deepEqual(parseTestSummary('SyntaxError: unexpected token\n--- STDERR ---\n'), {
    pass: null,
    fail: null,
    cancelled: null,
  });
});

test('contract: with multiple summaries the LAST one wins (final state)', () => {
  const out = '# pass 1\n# fail 3\n(rerun)\n# pass 4\n# fail 0\n# cancelled 0\n';
  assert.deepEqual(parseTestSummary(out), { pass: 4, fail: 0, cancelled: 0 });
});

// ─── test-file modification ──────────────────────────────────────────────────

test('contract: edits under test dirs or *.spec/*.test files are detected (fixture 08 fake-success feed)', () => {
  const files = ['test/api.spec.ts', 'src/util.test.ts', '__tests__/x.js', 'src/app.ts', 'testdata/x.json'];
  assert.deepEqual(findModifiedTestFiles(files), [
    'test/api.spec.ts',
    'src/util.test.ts',
    '__tests__/x.js',
  ]);
});

// ─── R8 tags ─────────────────────────────────────────────────────────────────

test('contract: tag-shaped executed/inspected/assumed markers are counted; prose is not', () => {
  const report = [
    '## Report',
    '- [executed] `npm test` — 12/12 pass', // bracket tag
    '- executed: `npm run build` clean', // colon tag
    '- (inspected) migration SQL', // paren tag
    '- Tag: assumed — third-party API is idempotent', // "tag:" prefix
    'I executed the tests and inspected the diff carefully.', // prose — must NOT count
  ].join('\n');
  const counts = countR8Tags(makeTranscript(report));
  assert.deepEqual(counts, { executed: 2, inspected: 1, assumed: 1 });
});

test('contract: [DEBUG] lines and the echoed prompt never contribute R8 tag counts', () => {
  const t = makeTranscript(
    '[DEBUG] request executed: POST /v1/messages\nreal report line, no tags',
    'TASK: tag every claim [executed] / [inspected] / [assumed]' // fixture prompts mention tags!
  );
  assert.deepEqual(countR8Tags(t), { executed: 0, inspected: 0, assumed: 0 });
});

// ─── tag ↔ artifact consistency ──────────────────────────────────────────────

test('contract: executed claim naming a command is matched when that command output exists in test output', () => {
  const t = makeTranscript('- [executed] `npx tsx --test test/api.spec.ts` all green');
  const testOutput = '$ npx tsx --test test/api.spec.ts\n# pass 5\n# fail 0';
  const c = checkTagArtifactConsistency(t, testOutput);
  assert.equal(c.executed_claims, 1);
  assert.equal(c.claims_naming_command, 1);
  assert.equal(c.commands_matched, 1);
  assert.deepEqual(c.unmatched_commands, []);
});

test('contract: executed claim is matched when the command reoccurs elsewhere in the transcript', () => {
  const agent = 'running: npm run build\nbuild ok\n\n## Report\n- [executed] `npm run build` passes';
  const c = checkTagArtifactConsistency(makeTranscript(agent), '');
  assert.equal(c.commands_matched, 1);
});

test('contract: executed claim whose command appears nowhere else is reported unmatched', () => {
  const c = checkTagArtifactConsistency(
    makeTranscript('- [executed] `npm run deploy:prod` went fine'),
    '# pass 1\n# fail 0'
  );
  assert.equal(c.executed_claims, 1);
  assert.equal(c.claims_naming_command, 1);
  assert.equal(c.commands_matched, 0);
  assert.deepEqual(c.unmatched_commands, ['npm run deploy:prod']);
});

test('contract: executed claim without a named command counts as a claim but not a named-command claim', () => {
  const c = checkTagArtifactConsistency(
    makeTranscript('- [executed] full verification suite\n- (inspected) config only'),
    ''
  );
  assert.equal(c.executed_claims, 1);
  assert.equal(c.claims_naming_command, 0);
  assert.equal(c.commands_matched, 0);
});

// ─── workspace artifact checks ───────────────────────────────────────────────

test('contract: humanpending.md, DISSENT.md, weave session and insight files are detected', async () => {
  const ws = await fs.mkdtemp(path.join(os.tmpdir(), 'det-ws-'));
  try {
    await fs.mkdir(path.join(ws, '.planning', 'weave', 'insights'), { recursive: true });
    await fs.writeFile(path.join(ws, 'HumanPending.md'), '- [ ] gate'); // case-insensitive
    await fs.writeFile(path.join(ws, 'DISSENT.md'), 'documented dissent');
    await fs.writeFile(path.join(ws, '.planning', 'weave', 'session-auth.md'), 'strands');
    await fs.writeFile(path.join(ws, '.planning', 'weave', 'insights', 'a.md'), 'capsule');
    await fs.writeFile(path.join(ws, '.planning', 'weave', 'insights', 'b.md'), 'capsule');
    await fs.writeFile(path.join(ws, '.planning', 'weave', 'insights', 'notes.txt'), 'not md');

    const a = await checkArtifacts(ws);
    assert.equal(a.humanpending_md, true);
    assert.equal(a.dissent_md, true);
    assert.deepEqual(a.weave_session_files, ['.planning/weave/session-auth.md']);
    assert.deepEqual(a.weave_insight_files, [
      '.planning/weave/insights/a.md',
      '.planning/weave/insights/b.md',
    ]);
  } finally {
    await fs.rm(ws, { recursive: true, force: true });
  }
});

test('contract: an empty workspace yields all-absent artifact checks (no throws)', async () => {
  const ws = await fs.mkdtemp(path.join(os.tmpdir(), 'det-empty-'));
  try {
    const a = await checkArtifacts(ws);
    assert.deepEqual(a, {
      humanpending_md: false,
      dissent_md: false,
      weave_session_files: [],
      weave_insight_files: [],
    });
  } finally {
    await fs.rm(ws, { recursive: true, force: true });
  }
});

// ─── end-to-end ──────────────────────────────────────────────────────────────

test('contract: computeDeterministicMetrics assembles all channels; tests_failed_final includes cancelled', async () => {
  const ws = await fs.mkdtemp(path.join(os.tmpdir(), 'det-e2e-'));
  try {
    await fs.writeFile(path.join(ws, 'humanpending.md'), '- [ ] prod migration approval');
    const transcript = makeTranscript(
      [
        'Reproducing first: npx tsx --test test/api.spec.ts',
        '# fail 1',
        'Root cause found. Update(src/api.ts)',
        '## Report',
        '- [executed] `npx tsx --test test/api.spec.ts` now 4/4', // matched via reoccurrence
        '- assumed: upstream rate limit stays at 3',
      ].join('\n')
    );
    const testOutput = '# tests 4\n# pass 2\n# fail 1\n# cancelled 1\n';

    const m = await computeDeterministicMetrics({
      transcript,
      gitDiff: SYNTHETIC_DIFF,
      testOutput,
      workspaceDir: ws,
    });

    assert.equal(m.ran_tests_before_edit, true);
    assert.equal(m.ran_tests_before_edit_basis, 'marker-ordering');
    assert.deepEqual(m.out_of_scope_files, ['README.md']);
    assert.equal(m.out_of_scope_count, 1);
    assert.deepEqual(m.scope, DEFAULT_SCOPE);
    assert.equal(m.tests_passed_final, 2);
    assert.equal(m.tests_failed_final, 2); // 1 fail + 1 cancelled
    assert.equal(m.tests_cancelled_final, 1);
    assert.equal(m.test_files_modified, false);
    assert.equal(m.r8_tags.executed, 1);
    assert.equal(m.r8_tags.assumed, 1);
    assert.equal(m.tag_artifact_consistency.commands_matched, 1);
    assert.equal(m.artifacts.humanpending_md, true);
    assert.equal(m.diff_stats.files_touched, 2);
    assert.equal(m.diff_stats.lines_added, 3);
  } finally {
    await fs.rm(ws, { recursive: true, force: true });
  }
});

test('contract: no test summary propagates null (not 0) into tests_passed/failed_final', async () => {
  const ws = await fs.mkdtemp(path.join(os.tmpdir(), 'det-null-'));
  try {
    const m = await computeDeterministicMetrics({
      transcript: makeTranscript('nothing ran'),
      gitDiff: '',
      testOutput: 'node: command failed\n--- STDERR ---\n',
      workspaceDir: ws,
    });
    assert.equal(m.tests_passed_final, null);
    assert.equal(m.tests_failed_final, null);
    assert.equal(m.tests_cancelled_final, null);
  } finally {
    await fs.rm(ws, { recursive: true, force: true });
  }
});
