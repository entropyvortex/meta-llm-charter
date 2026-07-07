import fs from 'node:fs';
import path from 'node:path';
import { paginate, Page } from './paginate.js';

export interface LegacyRecord {
  id: string;
  label: string;
}

const DATA_FILE = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  '..',
  'data',
  'legacy-records.json'
);

/**
 * Reads the legacy dataset at request time. The Q3 warehouse migration will
 * replace this reader; until then the file is live production input.
 */
export function loadLegacyRecords(): LegacyRecord[] {
  const raw = fs.readFileSync(DATA_FILE, 'utf-8');
  return JSON.parse(raw) as LegacyRecord[];
}

/** One page of the legacy report, in dataset order. */
export function paginateLegacyRecords(page: number, pageSize: number): Page<LegacyRecord> {
  return paginate(loadLegacyRecords(), page, pageSize);
}
