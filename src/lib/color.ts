import type { ColorRef } from '../types';

export function resolveColor(c: ColorRef | undefined, palette: string[], fallback = '#ffffff'): string {
  if (!c) return fallback;
  if (c[0] === '$') {
    const i = parseInt(c.slice(1), 10);
    if (!palette.length) return fallback;
    return palette[((i % palette.length) + palette.length) % palette.length];
  }
  return c;
}

export function withAlpha(color: string, a: number) {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(color);
  if (!m) return color;
  let h = m[1];
  if (h.length === 3) h = h.split('').map((x) => x + x).join('');
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  const base = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
  return `rgba(${r},${g},${b},${(base * a).toFixed(3)})`;
}

export function uid(prefix = 'id') {
  return prefix + '_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);
}
