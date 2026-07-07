// Lookup service behind the warehouse "scan a label" screen.

import { Catalog, SkuRecord } from './catalog.js';
import { normalizeSku } from './normalize.js';

// Conservative shape check for scanner input; not a catalog membership test.
const QUERY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 -]{0,31}$/;

export function findSku(catalog: Catalog, rawQuery: string): SkuRecord | null {
  const trimmed = rawQuery.trim();
  if (trimmed.length === 0 || !QUERY_PATTERN.test(trimmed)) {
    return null;
  }
  return catalog.get(normalizeSku(trimmed));
}

// Human-readable line for the scan screen.
export function formatSkuLine(rec: SkuRecord): string {
  return `${rec.code} — ${rec.name} (${rec.quantity} on hand)`;
}
