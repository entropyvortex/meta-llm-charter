// Canonical SKU form: uppercase, no whitespace.
//
// Shared with the label-printing service — every printed label is canonical.
// Example: '  ab-101 ' -> 'AB-101'.

export function normalizeSku(raw: string): string {
  return raw.replace(/\s+/g, '').toUpperCase();
}
