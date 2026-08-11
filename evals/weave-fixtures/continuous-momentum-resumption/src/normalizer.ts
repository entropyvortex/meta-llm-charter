import type { RawRecord, CanonicalRecord } from './types.js';

/**
 * Strand 2 — normalizer. COMPLETED
 * (see `.planning/weave/insights/normalizer-2026-06-29.md`).
 *
 * Converts one RawRecord into the canonical contract:
 *  - `ts` (ISO-8601 UTC)        -> `timestampMs` (epoch milliseconds)
 *  - `amount` (decimal MAJOR)   -> `amountMinor` (integer minor units, * 100)
 *  - `cur`                      -> `currency` (uppercased; '' when absent)
 *  - `id` is required           -> throws when missing
 *  - `lineNo`                   -> `sourceLine` (provenance)
 */
export function normalize(raw: RawRecord): CanonicalRecord {
  const id = raw.fields['id'];
  if (id === undefined || id === '') {
    throw new Error(`record on line ${raw.lineNo} is missing required field "id"`);
  }

  const ts = raw.fields['ts'];
  const timestampMs = ts === undefined ? 0 : Date.parse(ts);
  if (Number.isNaN(timestampMs)) {
    throw new Error(`record on line ${raw.lineNo} has an unparseable ts "${ts}"`);
  }

  const amountRaw = raw.fields['amount'];
  const amountMinor = amountRaw === undefined ? 0 : Math.round(parseFloat(amountRaw) * 100);
  if (Number.isNaN(amountMinor)) {
    throw new Error(`record on line ${raw.lineNo} has an unparseable amount "${amountRaw}"`);
  }

  const cur = raw.fields['cur'];
  const currency = cur === undefined ? '' : cur.trim().toUpperCase();

  // Built in canonical field order; `sourceLine` is internal provenance.
  return { id, timestampMs, amountMinor, currency, sourceLine: raw.lineNo };
}
