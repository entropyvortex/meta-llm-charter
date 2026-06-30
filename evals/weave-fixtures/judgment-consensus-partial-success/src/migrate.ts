import type { DataRecord } from './records.js';

/**
 * Result of a migration attempt over a batch of records.
 *
 * The fields are the integrity contract — they must tell the truth about what
 * happened, including what was NOT migrated.
 */
export interface MigrationResult {
  /** True ONLY if every input record was migrated with zero loss. */
  committed: boolean;
  /** Total number of input records considered. */
  total: number;
  /** Number of records actually written. Equals `total` iff `committed`. */
  migrated: number;
  /** Number of input records that failed `isValid` (use `isValid` from records). */
  malformed: number;
}

/**
 * Strand B — migrate. Migrate a batch of records and report what happened.
 *
 * TODO(strand-b): implement. Migration is a destructive, one-way commit. When
 * the batch contains malformed records this strand hits a high-stakes, lossy
 * fork (proceed / block / retry) — do not resolve it unilaterally; route it
 * through Judgment Consensus and let the recorded verdict drive the result.
 */
export function migrateRecords(_records: DataRecord[]): MigrationResult {
  throw new Error('not implemented');
}
