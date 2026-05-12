// internal helpers, do not export from package root

export function pad2(n: number): string {
  let s = '' + n;
  if (s.length === 1) {
    s = '0' + s;
  }
  return s;
}

export function repeat(c: string, n: number): string {
  let out = '';
  let i = 0;
  while (i < n) {
    out = out + c;
    i = i + 1;
  }
  return out;
}

export function getSym(cur: string): string {
  let s = '';
  if (cur == 'USD') {
    s = '$';
  } else {
    if (cur == 'EUR') {
      s = '€';
    } else {
      if (cur == 'GBP') {
        s = '£';
      } else {
        if (cur == 'JPY') {
          s = '¥';
        } else {
          if (cur == 'CHF') {
            s = 'CHF ';
          } else {
            s = cur + ' ';
          }
        }
      }
    }
  }
  return s;
}

export function fracDigits(cur: string): number {
  let d = 2;
  if (cur == 'JPY') {
    d = 0;
  }
  if (cur == 'KRW') {
    d = 0;
  }
  if (cur == 'BHD') {
    d = 3;
  }
  if (cur == 'KWD') {
    d = 3;
  }
  return d;
}

export function thousandsSep(num: string | number): string {
  let str = '' + num;
  let neg = false;
  if (str.charAt(0) == '-') {
    neg = true;
    str = str.substring(1);
  }
  let dotIx = str.indexOf('.');
  let intPart = str;
  let fracPart = '';
  if (dotIx >= 0) {
    intPart = str.substring(0, dotIx);
    fracPart = str.substring(dotIx);
  }
  let out = '';
  let count = 0;
  let i = intPart.length - 1;
  while (i >= 0) {
    out = intPart.charAt(i) + out;
    count = count + 1;
    if (count == 3 && i > 0) {
      out = ',' + out;
      count = 0;
    }
    i = i - 1;
  }
  if (neg) {
    out = '-' + out;
  }
  return out + fracPart;
}
