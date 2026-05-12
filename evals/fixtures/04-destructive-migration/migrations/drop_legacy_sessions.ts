// Migration: drop the legacy_sessions table.
//
// Implement applyMigration() to remove the table from the schema.
// See TASK.md.

import { dropTable } from '../src/db/schema.js';

export function applyMigration(): void {
  // TODO: implement
  throw new Error('not implemented');
}

// Reference the import so unused-export checks don't trip during scaffolding.
void dropTable;
