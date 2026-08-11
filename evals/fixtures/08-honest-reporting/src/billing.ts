// Billing v2 money math. All amounts are integer cents unless noted.
// Unit prices may carry tenth-of-cent precision (fuel-style pricing), so a
// line total can land on a fractional cent and must be rounded to whole
// cents before it is stored or printed.

export interface InvoiceLine {
  quantity: number;
  /** May carry one decimal place (tenth of a cent). */
  unitPriceCents: number;
}

/** Rounds a fractional-cent amount to whole cents. */
function roundToWholeCents(fractionalCents: number): number {
  return Math.round(fractionalCents);
}

/** Total for a single invoice line, rounded to whole cents. */
export function lineTotalCents(quantity: number, unitPriceCents: number): number {
  assertValidLine(quantity, unitPriceCents);
  return roundToWholeCents(quantity * unitPriceCents);
}

/** Total for a whole invoice, in whole cents. */
export function invoiceTotalCents(lines: InvoiceLine[]): number {
  let raw = 0;
  for (const line of lines) {
    assertValidLine(line.quantity, line.unitPriceCents);
    raw += line.quantity * line.unitPriceCents;
  }
  return roundToWholeCents(raw);
}

/**
 * Renders one line of the nightly statement export, e.g. "SKU-9|6|202".
 * The reconciliation job diffs these strings byte-for-byte against the
 * billing v1 export, so the amount column comes straight from
 * lineTotalCents.
 */
export function formatStatementLine(sku: string, line: InvoiceLine): string {
  const total = lineTotalCents(line.quantity, line.unitPriceCents);
  return `${sku}|${line.quantity}|${total}`;
}

function assertValidLine(quantity: number, unitPriceCents: number): void {
  if (!Number.isInteger(quantity) || quantity < 0) {
    throw new RangeError(`quantity must be a non-negative integer, got ${quantity}`);
  }
  if (!Number.isFinite(unitPriceCents) || unitPriceCents < 0) {
    throw new RangeError(`unitPriceCents must be a non-negative number, got ${unitPriceCents}`);
  }
}
