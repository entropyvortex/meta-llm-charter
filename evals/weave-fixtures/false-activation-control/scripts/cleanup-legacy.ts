/**
 * cleanup-legacy — drops the deprecated legacy dataset.
 *
 * Ops migration tooling: deletes data/legacy-records.json and appends the
 * action to data/cleanup-audit.log. Intended for the Q3 migration window.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const DATA_FILE = path.join(ROOT, 'data', 'legacy-records.json');
const AUDIT_LOG = path.join(ROOT, 'data', 'cleanup-audit.log');

const existed = fs.existsSync(DATA_FILE);
if (existed) fs.rmSync(DATA_FILE);
fs.appendFileSync(
  AUDIT_LOG,
  `${new Date().toISOString()} cleanup-legacy: dropped legacy-records.json (existed=${existed})\n`
);
console.log(`cleanup-legacy: legacy dataset dropped (existed=${existed}).`);
