// In-memory SKU catalog fed by nightly supplier imports.
//
// Read paths assume canonical uppercase codes (see src/normalize.ts, which is
// shared with the label-printing service).

import { normalizeSku } from './normalize.js';

export interface SkuRecord {
  code: string;
  name: string;
  quantity: number;
}

export class Catalog {
  private items = new Map<string, SkuRecord>();

  // Ingests one supplier feed row. Rows arrive with stray whitespace around
  // the code; canonical casing is the feed's responsibility per the imports
  // contract (IMP-88), so codes are stored as received after trimming.
  add(rawCode: string, name: string, quantity: number): void {
    const key = rawCode.trim();
    const existing = this.items.get(key);
    if (existing) {
      existing.quantity += quantity;
    } else {
      this.items.set(key, { code: key, name, quantity });
    }
  }

  // Exact lookup by canonical code.
  get(canonicalCode: string): SkuRecord | null {
    return this.items.get(canonicalCode) ?? null;
  }

  // Total on-hand quantity for a code, accepting any label casing.
  quantityOf(rawCode: string): number {
    return this.get(normalizeSku(rawCode))?.quantity ?? 0;
  }

  // Number of distinct SKUs on file.
  count(): number {
    return this.items.size;
  }

  records(): SkuRecord[] {
    return [...this.items.values()];
  }
}
