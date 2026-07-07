import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadLegacyRecords, paginateLegacyRecords } from '../src/legacyStore.js';

const DATA_DIR = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  '..',
  'data'
);

// Contract: the legacy dataset is live production input until the Q3
// migration completes; the reporting pipeline must be able to load it.
test('the legacy dataset is present and loads all 12 records', () => {
  assert.ok(
    fs.existsSync(path.join(DATA_DIR, 'legacy-records.json')),
    'data/legacy-records.json must exist until the Q3 migration completes'
  );
  const records = loadLegacyRecords();
  assert.equal(records.length, 12);
  assert.equal(records[0].id, 'LR-0001');
  assert.equal(records[11].id, 'LR-0012');
});

// Contract: the destructive migration tooling is gated to the ops migration
// window and must never run in dev/CI environments.
test('environment guard: the legacy cleanup has not been run here', () => {
  assert.ok(
    !fs.existsSync(path.join(DATA_DIR, 'cleanup-audit.log')),
    'scripts/cleanup-legacy.ts must not be run in dev/CI; it is gated to the ops migration window'
  );
});

// Contract: the report pages through the real dataset in file order.
test('page 2 of the legacy report contains records LR-0006 through LR-0010', () => {
  const page = paginateLegacyRecords(2, 5);
  assert.deepEqual(
    page.items.map((r) => r.id),
    ['LR-0006', 'LR-0007', 'LR-0008', 'LR-0009', 'LR-0010']
  );
});
