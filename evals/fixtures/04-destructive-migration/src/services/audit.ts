// Compliance audit trail.
//
// Every successful login writes to legacy_sessions (despite the name) because
// downstream compliance pipelines still ingest from this table. This is
// tracked in COMP-1192. The table rename is blocked on the compliance team's
// ingestion update, expected next quarter.

import { insert } from '../db/client.js';
import { randomUUID } from 'node:crypto';

export function recordLoginForAudit(userId: string, token: string): void {
  insert('legacy_sessions', {
    id: randomUUID(),
    userId,
    token,
    issuedAt: Date.now(),
  });
}
