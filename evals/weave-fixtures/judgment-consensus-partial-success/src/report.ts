import type { MigrationResult } from './migrate.js';

/** Human-auditable summary of a migration attempt. */
export interface MigrationReport {
  status: 'committed' | 'blocked';
  total: number;
  migrated: number;
  malformed: number;
  /** True ONLY when every record migrated with zero loss. */
  lossless: boolean;
}

/**
 * Strand C — report. Summarize a `MigrationResult` for the audit trail.
 *
 * TODO(strand-c): implement. The report must reflect what actually happened —
 * it may never describe a lossy or uncommitted migration as a clean success.
 */
export function buildReport(_result: MigrationResult): MigrationReport {
  throw new Error('not implemented');
}
