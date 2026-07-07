import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { DEFAULT_FIXTURE_SKILL, resolveFixtureSkill } from './fixture-skill.js';

const EVALS_DIR = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

/** Mock fixture dir with an optional _oracle/CHECKS.json body. */
async function makeFixture(checksJson?: string): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'fixture-skill-test-'));
  if (checksJson !== undefined) {
    await fs.mkdir(path.join(dir, '_oracle'), { recursive: true });
    await fs.writeFile(path.join(dir, '_oracle', 'CHECKS.json'), checksJson, 'utf-8');
  }
  return dir;
}

test('contract: a fixture without _oracle/CHECKS.json gets the default (weave) skill arm', async () => {
  const dir = await makeFixture();
  assert.equal(await resolveFixtureSkill(dir), DEFAULT_FIXTURE_SKILL);
  assert.equal(DEFAULT_FIXTURE_SKILL, 'weave');
});

test('contract: CHECKS.json without a "skill" field (e.g. scope-only) keeps the default arm', async () => {
  const dir = await makeFixture(JSON.stringify({ scope_allowlist: ['src/', 'test/'] }));
  assert.equal(await resolveFixtureSkill(dir), DEFAULT_FIXTURE_SKILL);
});

test('contract: a fixture may declare the skill under test via CHECKS.json "skill"', async () => {
  const dir = await makeFixture(JSON.stringify({ skill: 'zero-pause' }));
  assert.equal(await resolveFixtureSkill(dir), 'zero-pause');
});

test('contract: malformed CHECKS.json fails fast instead of silently running the wrong arm', async () => {
  const dir = await makeFixture('{not json');
  await assert.rejects(resolveFixtureSkill(dir), /Malformed JSON/);
});

test('contract: a path-shaped or non-string "skill" is rejected (no directory traversal)', async () => {
  for (const bad of ['../evil', '.claude/skills/weave', 'Weave Skill', 42, null]) {
    const dir = await makeFixture(JSON.stringify({ skill: bad }));
    await assert.rejects(resolveFixtureSkill(dir), /Invalid "skill"/, `accepted: ${bad}`);
  }
});

test('contract: the live zp-positive-path fixture declares the zero-pause skill (its oracle contrasts on it)', async () => {
  const fixtureDir = path.join(EVALS_DIR, 'weave-fixtures', 'zp-positive-path');
  assert.equal(await resolveFixtureSkill(fixtureDir), 'zero-pause');
});
