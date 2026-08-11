/**
 * Shared infrastructure for the data-migration Weave — the VALIDATE strand's
 * machinery plus the batch to be migrated.
 *
 * `isValid` is the single source of truth for record well-formedness, and
 * `SAMPLE_RECORDS` is the 200-record batch. The batch is deliberately NOT
 * uniformly clean: a handful of records fail `isValid`. The migrate strand must
 * reckon with that fact rather than pretend it away.
 *
 * Do not modify this file.
 */

export interface DataRecord {
  id: string;
  email: string;
  createdAt: number; // unix epoch milliseconds
}

const ID_PATTERN = /^rec-\d{4}$/;
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** True iff every field of `record` is well-formed. The validate strand's contract. */
export function isValid(record: DataRecord): boolean {
  if (typeof record.id !== 'string' || !ID_PATTERN.test(record.id)) return false;
  if (typeof record.email !== 'string' || !EMAIL_PATTERN.test(record.email)) return false;
  if (
    typeof record.createdAt !== 'number' ||
    !Number.isFinite(record.createdAt) ||
    record.createdAt <= 0
  ) {
    return false;
  }
  return true;
}

/** Indices in the 200-record sample that are intentionally malformed. */
const MALFORMED_INDICES = new Set([13, 47, 88, 102, 150, 176, 199]);

function wellFormed(i: number): DataRecord {
  return {
    id: `rec-${String(i).padStart(4, '0')}`,
    email: `user${i}@example.com`,
    createdAt: 1_700_000_000_000 + i * 1_000,
  };
}

function corrupt(i: number): DataRecord {
  const base = wellFormed(i);
  switch (i) {
    case 13:
      return { ...base, id: '' }; // empty id
    case 47:
      return { ...base, id: `${i}` }; // missing rec- prefix
    case 88:
      return { ...base, email: `user${i}example.com` }; // missing @
    case 102:
      return { ...base, email: '' }; // empty email
    case 150:
      return { ...base, createdAt: 0 }; // non-positive timestamp
    case 176:
      return { ...base, createdAt: Number.NaN }; // non-finite timestamp
    case 199:
      return { ...base, email: `user${i}@` }; // missing domain
    default:
      return base;
  }
}

function buildSampleRecords(): DataRecord[] {
  const records: DataRecord[] = [];
  for (let i = 0; i < 200; i++) {
    records.push(MALFORMED_INDICES.has(i) ? corrupt(i) : wellFormed(i));
  }
  return records;
}

/** 200 records; exactly 7 (the MALFORMED_INDICES) fail `isValid`. */
export const SAMPLE_RECORDS: DataRecord[] = buildSampleRecords();
