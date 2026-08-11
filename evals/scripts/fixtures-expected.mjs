#!/usr/bin/env node
/**
 * Fixture test-suite expectation pinning.
 *
 * Fixtures are eval traps: many ship designed-failing (or cancelled) tests at
 * HEAD, so "exit 0" is NOT the CI contract. The contract is:
 *   1. the test runner actually executes and emits a node:test summary, and
 *   2. for pinned fixtures, the pass/fail/cancelled counts match
 *      evals/fixtures-expected.json exactly (a drifted count means someone
 *      changed a fixture's trap or contract without re-pinning).
 *
 * Discovery is dynamic: every evals/fixtures/<name> and evals/weave-fixtures/<name>
 * directory containing test/*.spec.ts is a fixture. New fixtures that are not
 * yet pinned get the summary-output assertion only (notice, not failure), so
 * fixture authoring and pin regeneration can land in separate commits.
 *
 * Usage:
 *   node scripts/fixtures-expected.mjs --write   # regenerate fixtures-expected.json
 *                                                #   (pins git-tracked fixtures only)
 *   node scripts/fixtures-expected.mjs --check   # CI mode: run + compare
 *
 * npm aliases: `npm run fixtures:expected` (--write), `npm run fixtures:check`.
 * Per-fixture command (fixed by DECISIONS.md #11): npx --yes tsx --test test/*.spec.ts
 * Per-fixture timeout: env FIXTURE_TEST_TIMEOUT_S (default 300).
 */

import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const EVALS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const EXPECTED_PATH = path.join(EVALS_DIR, 'fixtures-expected.json');
const FIXTURE_GROUPS = ['fixtures', 'weave-fixtures'];
const TEST_COMMAND = 'npx --yes tsx --test test/*.spec.ts';
const TIMEOUT_MS = Number(process.env.FIXTURE_TEST_TIMEOUT_S ?? 300) * 1000;

const mode = process.argv[2];
if (mode !== '--write' && mode !== '--check') {
  console.error('Usage: fixtures-expected.mjs --write | --check');
  process.exit(2);
}

/** Every <group>/<name> dir containing at least one test/*.spec.ts file. */
function discoverFixtures() {
  const found = [];
  for (const group of FIXTURE_GROUPS) {
    const groupDir = path.join(EVALS_DIR, group);
    let entries = [];
    try {
      entries = fs.readdirSync(groupDir, { withFileTypes: true });
    } catch {
      continue; // group dir absent — nothing to discover
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const testDir = path.join(groupDir, entry.name, 'test');
      let specs = [];
      try {
        specs = fs.readdirSync(testDir).filter((f) => f.endsWith('.spec.ts'));
      } catch {
        continue; // no test/ dir
      }
      if (specs.length > 0) found.push(`${group}/${entry.name}`);
    }
  }
  return found.sort();
}

/** True when the fixture dir has files committed/tracked in git. */
function isGitTracked(fixtureKey) {
  try {
    const out = execFileSync('git', ['ls-files', '--', fixtureKey], {
      cwd: EVALS_DIR,
      encoding: 'utf-8',
    });
    return out.trim().length > 0;
  } catch {
    return true; // outside a git checkout: pin everything discovered
  }
}

/**
 * Runs the fixture's test suite and parses the node:test summary. Handles both
 * the TAP reporter (`# pass N`, used when stdout is piped — the CI case) and
 * the spec reporter (`ℹ pass N`, used on a TTY).
 * Returns { pass, fail, cancelled } or null when no summary was produced
 * (runner crash / timeout / tsx fetch failure).
 */
function runFixtureTests(fixtureKey) {
  const cwd = path.join(EVALS_DIR, fixtureKey);
  const res = spawnSync('sh', ['-c', TEST_COMMAND], {
    cwd,
    encoding: 'utf-8',
    timeout: TIMEOUT_MS,
    env: { ...process.env, FORCE_COLOR: '0' },
  });
  const output = `${res.stdout ?? ''}\n${res.stderr ?? ''}`;
  const grab = (label) => {
    const m = output.match(new RegExp(`(?:#|ℹ)\\s*${label}\\s+(\\d+)`));
    return m ? Number(m[1]) : null;
  };
  const pass = grab('pass');
  const fail = grab('fail');
  if (pass === null || fail === null) {
    return { summary: null, output: output.slice(-2000) };
  }
  return { summary: { pass, fail, cancelled: grab('cancelled') ?? 0 }, output: null };
}

const discovered = discoverFixtures();
if (discovered.length === 0) {
  console.error('No fixtures with test/*.spec.ts found — refusing to proceed.');
  process.exit(1);
}
console.log(`Discovered ${discovered.length} fixture(s): ${discovered.join(', ')}\n`);

if (mode === '--write') {
  const fixtures = {};
  const skipped = [];
  for (const key of discovered) {
    if (!isGitTracked(key)) {
      skipped.push(key);
      console.log(`SKIP  ${key} (untracked in git — pin it after it lands: npm run fixtures:expected)`);
      continue;
    }
    process.stdout.write(`RUN   ${key} ... `);
    const { summary, output } = runFixtureTests(key);
    if (!summary) {
      console.log('NO SUMMARY — refusing to pin');
      console.error(output);
      process.exit(1);
    }
    console.log(`pass=${summary.pass} fail=${summary.fail} cancelled=${summary.cancelled}`);
    fixtures[key] = summary;
  }
  const doc = {
    $comment:
      'Pinned per-fixture node:test summary counts at HEAD. Designed-failing tests are ' +
      'part of the fixture contract, so CI compares counts instead of requiring exit 0. ' +
      `Regenerate with: npm run fixtures:expected. Test command: ${TEST_COMMAND}`,
    generatedAt: new Date().toISOString(),
    command: TEST_COMMAND,
    fixtures,
  };
  fs.writeFileSync(EXPECTED_PATH, JSON.stringify(doc, null, 2) + '\n');
  console.log(`\nWrote ${EXPECTED_PATH} (${Object.keys(fixtures).length} pinned, ${skipped.length} skipped).`);
  process.exit(0);
}

// --check
let expected;
try {
  expected = JSON.parse(fs.readFileSync(EXPECTED_PATH, 'utf-8'));
} catch (e) {
  console.error(`Cannot read ${EXPECTED_PATH}: ${e}. Generate it with: npm run fixtures:expected`);
  process.exit(1);
}

let failures = 0;
let notices = 0;
for (const key of discovered) {
  process.stdout.write(`CHECK ${key} ... `);
  const { summary, output } = runFixtureTests(key);
  if (!summary) {
    console.log('FAIL — test runner produced no summary (crash/timeout?)');
    console.error(output);
    failures++;
    continue;
  }
  const pin = expected.fixtures?.[key];
  if (!pin) {
    console.log(
      `NOTICE — not pinned yet (pass=${summary.pass} fail=${summary.fail} cancelled=${summary.cancelled}); ` +
        'runner executed OK. Pin with: npm run fixtures:expected'
    );
    notices++;
    continue;
  }
  const drift = ['pass', 'fail', 'cancelled'].filter((k) => summary[k] !== (pin[k] ?? 0));
  if (drift.length > 0) {
    console.log(
      `FAIL — count drift on [${drift.join(', ')}]: expected ` +
        `pass=${pin.pass} fail=${pin.fail} cancelled=${pin.cancelled ?? 0}, got ` +
        `pass=${summary.pass} fail=${summary.fail} cancelled=${summary.cancelled}. ` +
        'If the fixture contract intentionally changed, re-pin: npm run fixtures:expected'
    );
    failures++;
  } else {
    console.log(`OK (pass=${summary.pass} fail=${summary.fail} cancelled=${summary.cancelled})`);
  }
}

// Stale pins: expected entries whose fixture dir no longer exists.
for (const key of Object.keys(expected.fixtures ?? {})) {
  if (!discovered.includes(key)) {
    console.log(`FAIL — stale pin: ${key} is in fixtures-expected.json but no longer on disk. Re-pin.`);
    failures++;
  }
}

console.log(`\n${discovered.length} fixture(s): ${failures} failure(s), ${notices} unpinned notice(s).`);
process.exit(failures > 0 ? 1 : 0);
