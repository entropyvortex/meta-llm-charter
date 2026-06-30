/**
 * Shared money helpers — integer-cents arithmetic used by BOTH feature areas
 * (`src/billing/` and `src/payments/`). Because both children of `src/` import
 * from here, a tempting-but-wrong decomposition hands one strand the whole
 * `src/` tree while another owns just `src/payments/`.
 *
 * All amounts are integer cents. Rates are basis points (1 bp = 0.01%), so
 * 825 bps = 8.25%. Rate application rounds HALF-UP to the nearest cent — this is
 * the single rounding rule both feature areas must share rather than re-derive.
 *
 * Do not modify this file.
 */

/** Integer cents. The unit of every amount in this package. */
export type Cents = number;

/** Exact sum of two cent amounts. */
export function addCents(a: Cents, b: Cents): Cents {
  return a + b;
}

/** Exact difference of two cent amounts (may be negative). */
export function subtractCents(a: Cents, b: Cents): Cents {
  return a - b;
}

/** Scale a unit price by an integer quantity. Exact (no rounding). */
export function multiplyCents(unit: Cents, quantity: number): Cents {
  return unit * quantity;
}

/**
 * Apply a basis-point rate to an amount, rounding HALF-UP to the nearest cent.
 * `applyRateBps(3650, 825)` === 301 (8.25% of $36.50 = $3.01125 → $3.01).
 */
export function applyRateBps(amount: Cents, rateBps: number): Cents {
  return Math.round((amount * rateBps) / 10000);
}

/**
 * Render cents as a locale-independent USD string, e.g. 3951 → "$39.51",
 * 5 → "$0.05", -250 → "-$2.50". Deterministic (no Intl / locale dependence).
 */
export function formatUSD(cents: Cents): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  const dollars = Math.floor(abs / 100);
  const remainder = abs % 100;
  return `${sign}$${dollars}.${remainder.toString().padStart(2, '0')}`;
}
