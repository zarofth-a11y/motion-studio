import type { EasingName } from '../types';

const c1 = 1.70158, c3 = c1 + 1, c4 = (2 * Math.PI) / 3;

function bounceOut(x: number) {
  const n1 = 7.5625, d1 = 2.75;
  if (x < 1 / d1) return n1 * x * x;
  if (x < 2 / d1) return n1 * (x -= 1.5 / d1) * x + 0.75;
  if (x < 2.5 / d1) return n1 * (x -= 2.25 / d1) * x + 0.9375;
  return n1 * (x -= 2.625 / d1) * x + 0.984375;
}

export const EASINGS: Record<Exclude<EasingName, 'custom'>, (x: number) => number> = {
  linear: (x) => x,
  easeInQuad: (x) => x * x,
  easeOutQuad: (x) => 1 - (1 - x) * (1 - x),
  easeInOutQuad: (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2),
  easeInCubic: (x) => x * x * x,
  easeOutCubic: (x) => 1 - Math.pow(1 - x, 3),
  easeInOutCubic: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  easeOutQuart: (x) => 1 - Math.pow(1 - x, 4),
  easeInOutQuart: (x) => (x < 0.5 ? 8 * x ** 4 : 1 - Math.pow(-2 * x + 2, 4) / 2),
  easeOutExpo: (x) => (x === 1 ? 1 : 1 - Math.pow(2, -10 * x)),
  easeInOutExpo: (x) =>
    x === 0 ? 0 : x === 1 ? 1 : x < 0.5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2,
  easeOutBack: (x) => 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2),
  easeOutElastic: (x) =>
    x === 0 ? 0 : x === 1 ? 1 : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * c4) + 1,
  easeOutBounce: bounceOut,
};

export const EASING_LABELS: Record<EasingName, string> = {
  linear: 'Linear', easeInQuad: 'Ease In', easeOutQuad: 'Ease Out', easeInOutQuad: 'Ease In Out',
  easeInCubic: 'Cubic In', easeOutCubic: 'Cubic Out', easeInOutCubic: 'Cubic In Out',
  easeOutQuart: 'Quart Out', easeInOutQuart: 'Quart In Out', easeOutExpo: 'Expo Out',
  easeInOutExpo: 'Expo In Out', easeOutBack: 'Back Out (overshoot)', easeOutElastic: 'Elastic Out',
  easeOutBounce: 'Bounce Out', custom: 'Custom Bézier',
};

/** CSS-style cubic-bezier solver */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sy = (t: number) => ((ay * t + by) * t + cy) * t;
  const dx = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const e = sx(t) - x;
      if (Math.abs(e) < 1e-6) return sy(t);
      const d = dx(t);
      if (Math.abs(d) < 1e-6) break;
      t -= e / d;
    }
    let lo = 0, hi = 1;
    t = x;
    for (let i = 0; i < 30; i++) {
      const v = sx(t);
      if (Math.abs(v - x) < 1e-6) break;
      if (x > v) lo = t; else hi = t;
      t = (lo + hi) / 2;
    }
    return sy(t);
  };
}

const bezierCache = new Map<string, (x: number) => number>();

export function getEasing(name: EasingName, bezier: [number, number, number, number]) {
  if (name === 'custom') {
    const k = bezier.join(',');
    let fn = bezierCache.get(k);
    if (!fn) { fn = cubicBezier(...bezier); bezierCache.set(k, fn); }
    return fn;
  }
  return EASINGS[name] ?? EASINGS.linear;
}
