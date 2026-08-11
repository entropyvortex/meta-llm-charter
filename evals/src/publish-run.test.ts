import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { publishRun, sanitizeJsonDeep } from './publish-run.js';
import { buildRedactionVocabulary } from './sanitize.js';

const MINI_CHARTER = `## R5 — Verification by Execution
**ZPR5 — Weave Protocol (Parallel Strand Orchestration)**
Log gated decisions to \`humanpending.md\`.
`;

async function makeSyntheticRun(): Promise<{ base: string; runsDir: string; resultsDir: string; runId: string }> {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), 'publish-run-test-'));
  const runsDir = path.join(base, 'runs');
  const resultsDir = path.join(base, 'results');
  const runId = '2026-07-07T00-00-00-000Z';
  const runDir = path.join(runsDir, runId);
  await fs.mkdir(path.join(runDir, 'transcripts'), { recursive: true });
  await fs.mkdir(path.join(runDir, 'workspace'), { recursive: true });
  await fs.mkdir(resultsDir, { recursive: true });

  await fs.writeFile(
    path.join(runDir, 'manifest.json'),
    JSON.stringify({ runId, agentModel: 'claude-test-1', judgeModel: 'claude-test-1', trialsPerPair: 1 }) + '\n'
  );
  await fs.writeFile(path.join(runDir, 'results.csv'), 'Trial ID,Variant\ntrial-000,charter\n');
  await fs.writeFile(path.join(runDir, 'pairwise.jsonl'), '{"fixture":"f1","winner":"charter"}\n');
  await fs.writeFile(path.join(runDir, 'pairwise-analysis.json'), '{"overall":{}}\n');
  await fs.writeFile(path.join(runDir, 'workspace', 'left-behind.txt'), 'never published');
  await fs.writeFile(
    path.join(runDir, 'transcripts', 'trial-000.json'),
    JSON.stringify({
      trialId: 'trial-000',
      transcript: 'Per R5 I activated ZPR5 and set ANTHROPIC_API_KEY=sk-ant-api03-supersecret123456',
      gitDiff: 'diff --git a/src/x.ts b/src/x.ts',
      notes: 'wrote humanpending.md',
    })
  );
  return { base, runsDir, resultsDir, runId };
}

test('contract: default publish copies manifest + csv/jsonl and NEVER transcripts or workspace', async () => {
  const { runsDir, resultsDir, runId } = await makeSyntheticRun();
  const summary = await publishRun({ runId, runsDir, resultsDir, charterText: MINI_CHARTER });

  assert.deepEqual(summary.copied, [
    'manifest.json',
    'pairwise-analysis.json',
    'pairwise.jsonl',
    'results.csv',
  ]);
  const destEntries = await fs.readdir(summary.dest);
  assert.ok(!destEntries.includes('transcripts'));
  assert.ok(!destEntries.includes('workspace'));
  assert.ok(summary.skipped.some((s) => s.includes('transcripts/')));
  // Copied files are byte-identical (no sanitization of non-transcript evidence).
  assert.equal(
    await fs.readFile(path.join(summary.dest, 'results.csv'), 'utf-8'),
    'Trial ID,Variant\ntrial-000,charter\n'
  );
});

test('contract: --with-transcripts publishes transcripts sanitized (charter vocab + secrets gone)', async () => {
  const { runsDir, resultsDir, runId } = await makeSyntheticRun();
  const summary = await publishRun({
    runId,
    runsDir,
    resultsDir,
    charterText: MINI_CHARTER,
    withTranscripts: true,
  });
  assert.ok(summary.copied.includes(path.join('transcripts', 'trial-000.json')));
  const published = await fs.readFile(path.join(summary.dest, 'transcripts', 'trial-000.json'), 'utf-8');
  assert.ok(!published.includes('sk-ant-'), 'secret leaked into committed evidence');
  assert.ok(!/ZPR5/.test(published), 'charter vocabulary leaked');
  assert.ok(!/\bR5\b/.test(published), 'rule id leaked');
  assert.ok(!/humanpending\.md/.test(published), 'charter artifact name leaked');
  const parsed = JSON.parse(published) as { trialId: string };
  assert.equal(parsed.trialId, 'trial-000'); // still valid JSON with structure intact
});

test('contract: skill-arm transcripts are blinded with the skill text (manifest weaveSkill + mock skill)', async () => {
  const { runsDir, resultsDir, runId } = await makeSyntheticRun();
  const runDir = path.join(runsDir, runId);
  // Skill-present weave run: manifest declares the skill that shipped.
  await fs.writeFile(
    path.join(runDir, 'manifest.json'),
    JSON.stringify({
      runId,
      agentModel: 'claude-test-1',
      judgeModel: 'claude-test-1',
      trialsPerPair: 1,
      weaveMode: 'weave',
      weaveSkill: 'weave',
    }) + '\n'
  );
  await fs.writeFile(
    path.join(runDir, 'transcripts', 'trial-000.json'),
    JSON.stringify({
      trialId: 'trial-000',
      transcript:
        'I recorded an Insight Capsule, checked the Scope Lattice, and ran Judgment Consensus.',
    })
  );
  const mockSkillText = `# Weave Skill
Each strand emits an Insight Capsule. The Scope Lattice forbids overlap.
Escalate to Judgment Consensus.
`;
  const summary = await publishRun({
    runId,
    runsDir,
    resultsDir,
    charterText: MINI_CHARTER,
    skillText: mockSkillText,
    withTranscripts: true,
  });
  const published = await fs.readFile(
    path.join(summary.dest, 'transcripts', 'trial-000.json'),
    'utf-8'
  );
  for (const leak of [/insight capsule/i, /scope lattice/i, /judgment consensus/i]) {
    assert.ok(!leak.test(published), `skill coinage leaked into published transcript: ${leak}`);
  }
  // Charter-derived vocabulary still applies too.
  assert.ok(!/humanpending\.md/.test(published), 'charter artifact name leaked');
});

test('contract: manifest naming an unreadable skill dir blocks transcript publishing (no under-redaction)', async () => {
  const { base, runsDir, resultsDir, runId } = await makeSyntheticRun();
  const runDir = path.join(runsDir, runId);
  await fs.writeFile(
    path.join(runDir, 'manifest.json'),
    JSON.stringify({ runId, trialsPerPair: 1, weaveMode: 'weave', weaveSkill: 'weave' }) + '\n'
  );
  await assert.rejects(
    publishRun({
      runId,
      runsDir,
      resultsDir,
      charterText: MINI_CHARTER,
      skillsDir: path.join(base, 'no-such-skills-dir'),
      withTranscripts: true,
    }),
    /blinding vocabulary would be incomplete/
  );
});

test('contract: dry-run reports the plan but writes nothing', async () => {
  const { runsDir, resultsDir, runId } = await makeSyntheticRun();
  const summary = await publishRun({
    runId,
    runsDir,
    resultsDir,
    charterText: MINI_CHARTER,
    withTranscripts: true,
    dryRun: true,
  });
  assert.equal(summary.dryRun, true);
  assert.ok(summary.copied.length >= 4);
  await assert.rejects(fs.access(summary.dest), 'dry-run must not create the destination');
});

test('contract: a run without manifest.json is not publishable evidence', async () => {
  const { runsDir, resultsDir, runId } = await makeSyntheticRun();
  await fs.rm(path.join(runsDir, runId, 'manifest.json'));
  await assert.rejects(
    publishRun({ runId, runsDir, resultsDir, charterText: MINI_CHARTER }),
    /manifest\.json missing/
  );
});

test('contract: refuses to overwrite an existing published dir without --force', async () => {
  const { runsDir, resultsDir, runId } = await makeSyntheticRun();
  await publishRun({ runId, runsDir, resultsDir, charterText: MINI_CHARTER });
  await assert.rejects(
    publishRun({ runId, runsDir, resultsDir, charterText: MINI_CHARTER }),
    /already exists/
  );
  // --force succeeds
  const again = await publishRun({ runId, runsDir, resultsDir, charterText: MINI_CHARTER, force: true });
  assert.ok(again.copied.includes('manifest.json'));
});

test('contract: sanitizeJsonDeep sanitizes nested strings and preserves structure/types', () => {
  const vocab = buildRedactionVocabulary(MINI_CHARTER);
  const input = {
    n: 3,
    ok: true,
    list: ['ZPR5 says hi', 42],
    nested: { transcript: 'R5 [executed: npm test]' },
  };
  const out = sanitizeJsonDeep(input, vocab) as typeof input;
  assert.equal(out.n, 3);
  assert.equal(out.ok, true);
  assert.equal(out.list[1], 42);
  assert.ok(!/ZPR5/.test(String(out.list[0])));
  assert.ok(!/\bR5\b/.test(out.nested.transcript));
  assert.ok(out.nested.transcript.includes('[tag]'));
});
