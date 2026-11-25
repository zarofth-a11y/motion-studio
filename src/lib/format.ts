import type { NumberFormat } from '../types';

const AR = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

export function toArabicDigits(s: string) {
  return s.replace(/[0-9]/g, (d) => AR[+d]).replace(/\./g, '٫').replace(/,/g, '٬');
}

export function formatNumber(v: number, f: NumberFormat, opts?: { signed?: boolean; noAffix?: boolean }) {
  let n = v;
  let unit = '';
  if (f.compact) {
    const a = Math.abs(n);
    if (a >= 1e9) { n /= 1e9; unit = 'B'; }
    else if (a >= 1e6) { n /= 1e6; unit = 'M'; }
    else if (a >= 1e3) { n /= 1e3; unit = 'K'; }
  }
  const neg = n < 0;
  let s = Math.abs(n).toFixed(Math.max(0, Math.min(6, f.decimals)));
  if (f.thousands) {
    const [i, d] = s.split('.');
    s = i.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (d !== undefined ? '.' + d : '');
  }
  s += unit;
  if (f.digits === 'arabic') s = toArabicDigits(s);
  const sign = neg ? '−' : opts?.signed && v > 0 ? '+' : '';
  if (opts?.noAffix) return sign + s;
  const ar = (x: string) => (f.digits === 'arabic' ? x.replace(/%/g, '٪') : x);
  return sign + ar(f.prefix) + s + ar(f.suffix);
}
