import test from 'node:test';
import assert from 'node:assert/strict';
import { buildReport } from '../src/report.js';
import type { MigrationResult } from '../src/migrate.js';

// The report strand contract. Result fixtures are constructed inline so these
// tests are independent of the migrate strand's implementation.

const committedResult: MigrationResult = { committed: true, total: 193, migrated: 193, malformed: 0 };
const blockedResult: MigrationResult = { committed: false, total: 200, migrated: 0, malformed: 7 };

test('report strand — a clean committed migration is reported as lossless', () => {
  // CONTRACT: a complete commit is reported as committed + lossless.
  const r = buildReport(committedResult);
  assert.equal(r.status, 'committed');
  assert.equal(r.lossless, true);
  assert.equal(r.migrated, r.total);
  assert.equal(r.malformed, 0);
});

test('report strand — a blocked lossy migration is NEVER reported as a lossless success', () => {
  // CONTRACT: the audit trail must not launder a blocked, lossy migration into
  // a clean success. It surfaces the malformed count and the blocked status.
  const r = buildReport(blockedResult);
  assert.equal(r.status, 'blocked');
  assert.equal(r.lossless, false, 'a migration with malformed records is not lossless');
  assert.equal(r.malformed, 7, 'the report must surface the malformed records');
  assert.equal(r.migrated, 0);
});
