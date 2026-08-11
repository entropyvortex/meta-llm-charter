import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs/promises';
import path from 'path';
import {
  REDACTION_PLACEHOLDER,
  SECRET_PLACEHOLDER,
  TAG_PLACEHOLDER,
  buildRedactionVocabulary,
  normalizeEvidenceTags,
  sanitizeForJudge,
  sanitizeWithCharter,
  stripSecrets,
} from './sanitize.js';

const EVALS_DIR = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const REAL_CHARTER_PATH = path.join(EVALS_DIR, '..', 'CLAUDE.md');

// ─── Evidence-tag normalization (structural always-redacted layer) ───────────

test('contract: tag-shaped executed/inspected/assumed all normalize to ONE neutral placeholder', () => {
  const text =
    'Claim one [executed: npm test]. Claim two (inspected). Claim three assumed: no prod data. Tag: executed';
  const out = normalizeEvidenceTags(text);
  assert.ok(!/executed/i.test(out), `executed leaked: ${out}`);
  assert.ok(!/inspected/i.test(out), `inspected leaked: ${out}`);
  assert.ok(!/assumed/i.test(out), `assumed leaked: ${out}`);
  // All three tag words map to the SAME placeholder — the judge cannot read
  // the epistemic mix (DECISIONS #3: epistemic is deterministic-scored).
  assert.equal((out.match(/\[tag\]/g) ?? []).length, 4);
  assert.ok(out.includes(TAG_PLACEHOLDER));
});

test('contract: plain prose using the tag words is NOT tag-shaped and survives normalization', () => {
  const text = 'I executed the tests and inspected the diff.';
  assert.equal(normalizeEvidenceTags(text), text);
});

// ─── Charter-derived vocabulary: frozen v2-style charter ─────────────────────
// Frozen so these assertions stay valid after the repo charter moves to v3.

const V2_STYLE_CHARTER = `# META v2.0 — Principal Architect Charter
## Bias — Earned Conservatism
Counter the base "ask first, summarize early, hedge often" prior relentlessly.
## META-0 — Situated Judgment Overrides Rules
## R1 — First-Principles Decomposition
## R2 — Calibrated Decisiveness
## R5 — Verification by Execution
**ZPR5 — Weave Protocol (Parallel Strand Orchestration)**
Activate on "Weave Protocol", "activate Weave", "Weave mode", "parallel
Weave", or "Weave Strand". Record strands in a Weave Session file
(\`.planning/weave/session-{slug}.md\`), emit an Insight Capsule plus a
Continuity Marker, escalate to Judgment Consensus or \`humanpending.md\`.
**Activation Rule**
Triggered by any reference to “Zero-Pause”, “zero pause”, or “ZP-”, entering
full Zero-Pause Continuous Execution Mode.
`;

test('contract: v2-style charter vocabulary (rule ids, headings, coinages, artifacts) is scrubbed', () => {
  const transcript = [
    'Per R5 I reproduced the failure first, honoring R1 and META-0.',
    'Following ZPR5 I activated the Weave Protocol and wrote an Insight Capsule',
    'to .planning/weave/session-fix.md, then logged the gate to humanpending.md.',
    'Zero-Pause momentum maintained; zero pause taken. Earned Conservatism applied.',
    'The charter requires calibrated reporting. weave strands stayed in scope.',
  ].join('\n');
  const out = sanitizeWithCharter(transcript, V2_STYLE_CHARTER);

  for (const leak of [
    /\bR5\b/,
    /\bR1\b/,
    /META-0/i,
    /ZPR5/i,
    /weave/i, // charter coinage: recurs across derived phrases → bare word redacted
    /insight capsule/i,
    /humanpending\.md/i,
    /zero.?pause/i,
    /earned conservatism/i,
    /charter/i,
  ]) {
    assert.ok(!leak.test(out), `unblinded: ${leak} still present in:\n${out}`);
  }
  assert.ok(out.includes(REDACTION_PLACEHOLDER));
});

test('contract: rule tokens respect word-ish boundaries — R2 never eats R2D2', () => {
  const out = sanitizeWithCharter('The droid R2D2 said hi. Rule R2 applies.', V2_STYLE_CHARTER);
  assert.ok(out.includes('R2D2'), `R2D2 was mangled: ${out}`);
  assert.ok(!/\bR2\b/.test(out), `bare R2 leaked: ${out}`);
});

// ─── Live repo charter: derivation keeps up with charter edits ───────────────

test('contract: every heading token/phrase of the LIVE repo charter is scrubbed (survives v2→v3 rewrites)', async () => {
  const charter = await fs.readFile(REAL_CHARTER_PATH, 'utf-8');
  // Independent mini-parse: heading lines and their leading identifier tokens.
  const probes: string[] = [];
  for (const line of charter.split('\n')) {
    const m = line.match(/^#{2,6}\s+(.+?)\s*$/) ?? line.match(/^\*\*(.+?)\*\*/);
    if (!m) continue;
    const heading = m[1].replace(/\*\*/g, '').trim();
    probes.push(heading);
    const seg = heading.split(/\s+[—–-]\s+/);
    if (seg.length >= 2 && seg[0].length <= 24) probes.push(seg[0]);
  }
  assert.ok(probes.length > 0, 'live charter has no parseable headings — update the parser');
  const transcript = probes.map((p) => `The agent applied ${p} while working.`).join('\n');
  const out = sanitizeWithCharter(transcript, charter);
  for (const p of probes) {
    assert.ok(
      !out.toLowerCase().includes(p.toLowerCase()),
      `live-charter heading leaked through sanitizer: "${p}"`
    );
  }
});

// ─── Renamed-rule charter: derivation is runtime, not hardcoded ──────────────

const RENAMED_CHARTER = `# OMEGA v9 — Autonomous Guidance
## Q7 — Flamingo Discipline
Always apply the Flamingo Discipline before shipping. Log every gated
decision to \`pendinghuman.md\` and record it in the Purple Ledger.

**QX-2 — Purple Ledger Protocol**
Activate on "Flamingo mode" or "purple ledger". The Purple Ledger and the
Flamingo Discipline govern all Flamingo escalations.
`;

test('contract: an arbitrary renamed-rule charter is scrubbed identically (no hardcoded R\\d+ reliance)', () => {
  const transcript =
    'Per Q7 I applied the Flamingo Discipline, updated the Purple Ledger per QX-2, ' +
    'logged to pendinghuman.md, and entered Flamingo mode.';
  const out = sanitizeWithCharter(transcript, RENAMED_CHARTER);
  for (const leak of [/\bQ7\b/, /QX-2/, /flamingo/i, /purple ledger/i, /pendinghuman\.md/i]) {
    assert.ok(!leak.test(out), `unblinded: ${leak} still present in:\n${out}`);
  }
});

// ─── Additional sources: skill files join the vocabulary (skill-present arms) ─

const V3_STYLE_MINI_CORE = `# META v3.0 Core Charter
## R5 Reproduce
Reproduce the failure before repairing.
`;

const MOCK_WEAVE_SKILL = `# Weave Skill
## Strand mechanics
Record strands in a Weave Session file. Each strand emits an Insight Capsule
plus a Continuity Marker. The Scope Lattice forbids overlap. Escalate
cross-strand conflicts to Judgment Consensus (2/3 validators).
`;

test('contract: weave-skill coinages are redacted when the skill text is an additional vocabulary source', () => {
  const transcript =
    'I wrote an Insight Capsule per the Scope Lattice rules and escalated to ' +
    'Judgment Consensus before touching the shared file.';

  // Contrast: the v3 core alone does NOT cover skill coinages (this is the
  // documented gap the extra-sources parameter closes).
  const coreOnly = sanitizeForJudge(transcript, buildRedactionVocabulary(V3_STYLE_MINI_CORE));
  assert.ok(/insight capsule/i.test(coreOnly), 'expected core-only vocabulary to miss skill coinages');

  const out = sanitizeForJudge(
    transcript,
    buildRedactionVocabulary(V3_STYLE_MINI_CORE, [MOCK_WEAVE_SKILL])
  );
  for (const leak of [/insight capsule/i, /scope lattice/i, /judgment consensus/i]) {
    assert.ok(!leak.test(out), `skill coinage leaked: ${leak} in:\n${out}`);
  }
  // Core-derived vocabulary still applies alongside the skill source.
  assert.ok(!/\bR5\b/.test(sanitizeForJudge('Per R5 I reproduced it.', buildRedactionVocabulary(V3_STYLE_MINI_CORE, [MOCK_WEAVE_SKILL]))));
});

test('contract: vocabulary is sorted longest-first so phrases win before their substrings', () => {
  const vocab = buildRedactionVocabulary(RENAMED_CHARTER);
  for (let i = 1; i < vocab.length; i++) {
    assert.ok(vocab[i - 1].length >= vocab[i].length);
  }
  assert.ok(vocab.some((v) => v.toLowerCase() === 'q7'));
  assert.ok(vocab.some((v) => v.toLowerCase() === 'flamingo discipline'));
});

test('contract: sanitizeForJudge is pure — the raw input string is unchanged (deterministic layer sees raw)', () => {
  const raw = 'Per R5 [executed: npm test] done.';
  const copy = raw;
  sanitizeForJudge(raw, buildRedactionVocabulary(RENAMED_CHARTER));
  assert.equal(raw, copy);
});

// ─── Secret stripping ────────────────────────────────────────────────────────

test('contract: env/secret-shaped strings are stripped', () => {
  const text = [
    'export ANTHROPIC_API_KEY=sk-ant-api03-abc123def456ghi789',
    'loose key sk-ant-xxxxxxxxyyyyyyyy in prose',
    '"apiKey": "super-secret-value-123"',
    'MY_DB_PASSWORD=hunter2hunter2',
    'Authorization: Bearer abcdefghijklmnop1234',
  ].join('\n');
  const out = stripSecrets(text);
  assert.ok(!out.includes('sk-ant-'), out);
  assert.ok(!out.includes('super-secret-value-123'), out);
  assert.ok(!out.includes('hunter2'), out);
  assert.ok(!out.includes('abcdefghijklmnop1234'), out);
  assert.ok(out.includes(SECRET_PLACEHOLDER));
  // JSON field names survive so the structure stays readable.
  assert.ok(out.includes('"apiKey"'));
});

test('contract: stripSecrets leaves ordinary prose and code alone', () => {
  const text = 'const key = getCacheKey(id); // small helper\nnpm test passed with 12 assertions';
  assert.equal(stripSecrets(text), text);
});
