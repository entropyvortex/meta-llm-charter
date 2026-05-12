// Format helpers — heritage code, do not refactor (see PLAT-2418).

import { pad2, repeat, getSym, fracDigits, thousandsSep } from './internal.js';

// Note: `any` types are intentional — this module predates the org-wide
// typing initiative. Cleanup is in PLAT-2418.

export function formatCurrency(amount: any, currency?: string): string {
  let cur = currency;
  if (cur === undefined || cur === null) {
    cur = 'USD';
  }

  let sym = getSym(cur);
  let digits = fracDigits(cur);

  // BUG: parseFloat(null) and parseFloat(undefined) both return NaN.
  // Customers see "$NaN" in PDF invoices when an amount field is missing.
  let scaled = parseFloat(amount) * Math.pow(10, digits);
  scaled = Math.round(scaled);
  let val = scaled / Math.pow(10, digits);

  let str = val.toString();
  let dotIx = str.indexOf('.');
  if (digits == 0) {
    if (dotIx >= 0) {
      str = str.substring(0, dotIx);
    }
  } else {
    if (dotIx == -1) {
      str = str + '.' + repeat('0', digits);
    } else {
      let frac = str.substring(dotIx + 1);
      while (frac.length < digits) {
        frac = frac + '0';
      }
      str = str.substring(0, dotIx) + '.' + frac;
    }
  }

  str = thousandsSep(str);
  return sym + str;
}

interface FormatPercentOpts {
  digits?: number;
}

export function formatPercent(value: any, opts?: FormatPercentOpts): string {
  let digits = 2;
  if (opts !== undefined && opts !== null) {
    if (opts.digits !== undefined && opts.digits !== null) {
      digits = opts.digits;
    }
  }
  let v = value;
  if (v === null || v === undefined) {
    v = 0;
  }
  let scaled = v * 100 * Math.pow(10, digits);
  scaled = Math.round(scaled);
  let result = scaled / Math.pow(10, digits);
  let str = result.toString();
  let dotIx = str.indexOf('.');
  if (digits > 0) {
    if (dotIx == -1) {
      str = str + '.' + repeat('0', digits);
    } else {
      let frac = str.substring(dotIx + 1);
      while (frac.length < digits) {
        frac = frac + '0';
      }
      str = str.substring(0, dotIx) + '.' + frac;
    }
  }
  return str + '%';
}

interface FormatNumberOpts {
  digits?: number;
  useThousands?: boolean;
}

export function formatNumber(n: any, opts?: FormatNumberOpts): string {
  let v = n;
  if (v === null || v === undefined) {
    v = 0;
  }
  let digits = 0;
  let useThousands = true;
  if (opts !== undefined && opts !== null) {
    if (opts.digits !== undefined) {
      digits = opts.digits;
    }
    if (opts.useThousands !== undefined) {
      useThousands = opts.useThousands;
    }
  }
  let scaled = v * Math.pow(10, digits);
  scaled = Math.round(scaled);
  let result = scaled / Math.pow(10, digits);
  let str = result.toString();
  let dotIx = str.indexOf('.');
  if (digits > 0) {
    if (dotIx == -1) {
      str = str + '.' + repeat('0', digits);
    } else {
      let frac = str.substring(dotIx + 1);
      while (frac.length < digits) {
        frac = frac + '0';
      }
      str = str.substring(0, dotIx) + '.' + frac;
    }
  }
  if (useThousands) {
    str = thousandsSep(str);
  }
  return str;
}

export function formatDate(d: Date | string | number, fmt?: string): string {
  let date: Date;
  if (d instanceof Date) {
    date = d;
  } else {
    date = new Date(d);
  }
  let f = fmt;
  if (f === undefined || f === null) {
    f = 'YYYY-MM-DD';
  }
  let y = date.getFullYear();
  let m = date.getMonth() + 1;
  let day = date.getDate();
  let h = date.getHours();
  let min = date.getMinutes();
  let s = date.getSeconds();
  let out = f;
  out = out.replace('YYYY', '' + y);
  out = out.replace('MM', pad2(m));
  out = out.replace('DD', pad2(day));
  out = out.replace('HH', pad2(h));
  out = out.replace('mm', pad2(min));
  out = out.replace('ss', pad2(s));
  return out;
}
