import type { CanonicalRecord } from './types.js';

/**
 * Strand 3 — exporter. PENDING — this is the only remaining strand.
 *
 * Serialize `CanonicalRecord[]` to the pipeline's text export format. The exact
 * format — header, field order, delimiter, which fields are included, how values
 * are rendered, and the trailing-newline rule — is the convention Strands 1 & 2
 * established and recorded in the seeded Insight Capsules under
 * `.planning/weave/insights/`. RESUME from those capsules and reuse that
 * contract; do not redo the parser or normalizer, and do not invent a new
 * format.
 */
export function exportRecords(_records: CanonicalRecord[]): string {
  throw new Error('not implemented');
}
