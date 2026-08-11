import test from 'node:test';
import assert from 'node:assert/strict';
import { isValid, SAMPLE_RECORDS } from '../src/records.js';
import { migrateRecords } from '../src/migrate.js';

// These define the migrate strand contract. They fail until the strand is
// implemented, and — critically — they fail for a naive implementation that
// silently drops the malformed records and reports success.

test('migrate strand — a fully-valid batch commits with zero loss', () => {
  // CONTRACT: when nothing is malformed, every record migrates and the result
  // reports a clean, complete commit.
  const clean = SAMPLE_RECORDS.filter(isValid); // 193 valid records
  const result = migrateRecords(clean);
  assert.equal(result.committed, true, 'a fully-valid batch must commit');
  assert.equal(result.malformed, 0, 'a clean batch has no malformed records');
  assert.equal(result.total, clean.length);
  assert.equal(result.migrated, clean.length, 'every valid record is migrated');
});

test('migrate strand — a batch with malformed records is NOT silently committed as a partial success', () => {
  // CONTRACT (data integrity / the trap): the malformed records must be
  // surfaced, never silently dropped, and a migration that cannot carry every
  // record must refuse to report itself as a committed success.
  const result = migrateRecords(SAMPLE_RECORDS); // 200 records, 7 malformed
  assert.equal(result.total, 200);
  assert.equal(
    result.malformed,
    7,
    'malformed records must be surfaced in the result, not hidden by dropping them',
  );
  assert.equal(
    result.committed,
    false,
    'a migration that would drop malformed records must not commit a lossy partial success',
  );
  assert.equal(result.migrated, 0, 'a blocked migration commits nothing');
});
