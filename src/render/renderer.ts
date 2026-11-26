import type { BaseElement, Project } from '../types';
import { getEasing, EASINGS } from '../lib/easing';
import { formatNumber } from '../lib/format';
import { resolveColor, withAlpha } from '../lib/color';

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

interface RC {
  ctx: Ctx;
  el: BaseElement;
  t: number;
  pal: string[];
  rtl: boolean;
  fonts: string;
  scale: number; // output scale (for blur etc.)
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const num = (v: unknown, d = 0) => (typeof v === 'number' && isFinite(v) ? v : typeof v === 'string' && v.trim() !== '' && isFinite(+v) ? +v : d);
const str = (v: unknown, d = '') => (v === undefined || v === null ? d : String(v));
const bool = (v: unknown, d = false) => (typeof v === 'boolean' ? v : d);

/** Animation progress for item i (with stagger), eased. */
function prog(rc: RC, i = 0) {
  const a = rc.el.anim;
  const dur = Math.max(0.0001, a.duration);
  const raw = clamp01((rc.t - a.delay - i * a.stagger) / dur);
  return getEasing(a.easing, a.bezier)(raw);
}
/** Linear (un-eased) progress — used where overshoot must not apply */
function progClamped(rc: RC, i = 0) {
  const p = prog(rc, i);
  return clamp01(p);
}

function font(rc: RC, size: number, weight?: number) {
  return `${weight ?? rc.el.fontWeight} ${Math.max(1, size).toFixed(2)}px ${rc.fonts}`;
}

function col(rc: RC, c: string | undefined, fb = '#ffffff') {
  return resolveColor(c, rc.pal, fb);
}

function txt(
  rc: RC, s: string, x: number, y: number, size: number, color: string,
  align: CanvasTextAlign = 'center', baseline: CanvasTextBaseline = 'middle', weight?: number, maxW?: number,
) {
  const { ctx } = rc;
  ctx.font = font(rc, size, weight);
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  if (maxW && maxW > 0) ctx.fillText(s, x, y, maxW); else ctx.fillText(s, x, y);
}

/** Largest font size ≤ `size` at which every string in `strs` fits within `maxW` (keeps text inside its box). */
function fitSize(rc: RC, strs: string[], size: number, maxW: number, weight?: number) {
  if (maxW <= 0) return size;
  rc.ctx.font = font(rc, size, weight);
  let w = 0;
  for (const s of strs) w = Math.max(w, rc.ctx.measureText(s).width);
  return w > maxW ? size * (maxW / w) : size;
}

/** Horizontal alignment that respects reading direction */
function sideAlign(rc: RC, a: string): CanvasTextAlign {
  if (a === 'center') return 'center';
  const start = a === 'start';
  return (start !== rc.rtl) ? 'left' : 'right';
}

function niceCeil(v: number) {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  const steps = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
  const s = steps.find((x) => n <= x + 1e-9) ?? 10;
  return s * p;
}

function roundRectPath(ctx: Ctx, x: number, y: number, w: number, h: number, r: number | number[]) {
  ctx.beginPath();
  if (w < 0) { x += w; w = -w; }
  if (h < 0) { y += h; h = -h; }
  const max = Math.min(w, h) / 2;
  const rr = Array.isArray(r) ? r.map((v) => Math.max(0, Math.min(v, max))) : Math.max(0, Math.min(r, max));
  ctx.roundRect(x, y, w, h, rr as number | number[]);
}

// ───────────────────────── element drawers ─────────────────────────

function drawRing(rc: RC) {
  const { ctx, el } = rc;
  const P = el.props;
  const size = Math.min(el.w, el.h);
  const cx = el.w / 2, cy = el.h / 2;
  const sw = Math.min(el.strokeWidth, size / 2);
  const r = size / 2 - sw / 2;
  const max = num(P.max, 100) || 100;
  const value = num(P.value, 75);
  const p = prog(rc);
  const frac = Math.max(0, (value / max) * p);
  const start = (num(P.startAngle, -90) * Math.PI) / 180;
  const dir = bool(P.clockwise, true) !== rc.rtl ? 1 : -1;
  const color = col(rc, str(P.color, '$0'));
  const cap: CanvasLineCap = el.radius > 0 ? 'round' : 'butt';

  ctx.lineWidth = sw;
  ctx.lineCap = 'butt';
  ctx.strokeStyle = withAlpha(col(rc, str(P.trackColor, '#ffffff')), num(P.trackOpacity, 0.12));
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();

  if (frac > 0.0005) {
    const end = start + dir * Math.PI * 2 * Math.min(frac, 1);
    let stroke: string | CanvasGradient = color;
    if (bool(P.gradient, false)) {
      const g = ctx.createConicGradient(start, cx, cy);
      const c2 = col(rc, str(P.color2, '$1'));
      g.addColorStop(0, dir > 0 ? c2 : color);
      g.addColorStop(Math.min(frac, 1) * 0.999 + 0.0001, dir > 0 ? color : c2);
      g.addColorStop(1, dir > 0 ? color : c2);
      stroke = g;
    }
    if (bool(P.glow, false)) { ctx.shadowColor = withAlpha(color, 0.7); ctx.shadowBlur = sw * 1.2; }
    ctx.strokeStyle = stroke;
    ctx.lineCap = cap;
    ctx.beginPath(); ctx.arc(cx, cy, r, start, end, dir < 0); ctx.stroke();
    ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';
  }

  const label = str(P.label);
  const finalShown = bool(P.showAsPercent, true) ? (value / max) * 100 : value;
  const fs = fitSize(rc, [formatNumber(finalShown, el.format)], (r - sw / 2) * 0.62 * el.fontScale, (r - sw / 2) * 1.7);
  if (bool(P.showValue, true)) {
    const shown = bool(P.showAsPercent, true) ? (value / max) * 100 * p : value * p;
    txt(rc, formatNumber(shown, el.format), cx, label ? cy - fs * 0.12 : cy, fs, col(rc, el.textColor), 'center', 'middle');
  }
  if (label) txt(rc, label, cx, cy + fs * 0.62, fs * 0.3, col(rc, el.mutedColor), 'center', 'middle', 500, r * 1.5);
}

function drawCounter(rc: RC) {
  const { el } = rc;
  const P = el.props;
  const from = num(P.from, 0), to = num(P.to, 1000);
  const p = prog(rc);
  const v = from + (to - from) * p;
  const align = sideAlign(rc, str(P.align, 'center'));
  const x = align === 'center' ? el.w / 2 : align === 'left' ? 0 : el.w;
  const label = str(P.label);
  const labelAbove = str(P.labelPosition, 'below') === 'above';
  const fs = fitSize(rc, [formatNumber(from, el.format), formatNumber(to, el.format)], el.h * (label ? 0.62 : 0.8) * el.fontScale, el.w * 0.98);
  const lfs = fs * 0.28;
  const gap = fs * 0.12;
  const total = fs + (label ? lfs + gap : 0);
  const top = (el.h - total) / 2;
  const valY = labelAbove && label ? top + lfs + gap + fs / 2 : top + fs / 2;
  txt(rc, formatNumber(v, el.format), x, valY, fs, col(rc, str(P.color, el.textColor)), align, 'middle', undefined);
  if (label) {
    const ly = labelAbove ? top + lfs / 2 : top + fs + gap + lfs / 2;
    const lp = clamp01((rc.t - el.anim.delay - 0.15) / 0.5);
    rc.ctx.globalAlpha *= EASINGS.easeOutCubic(lp);
    txt(rc, label, x, ly, lfs, col(rc, el.mutedColor), align, 'middle', 500);
  }
}

function seriesMax(el: BaseElement) {
  let m = 0;
  for (const s of el.data.series) for (const v of s.values) if (isFinite(v)) m = Math.max(m, v);
  return m;
}

function drawGrid(rc: RC, x: number, y: number, w: number, h: number, lines: number, horizontalBars: boolean, max: number, axisLabels: boolean, fs: number) {
  const { ctx, el } = rc;
  ctx.strokeStyle = withAlpha(col(rc, el.mutedColor), 0.18);
  ctx.lineWidth = Math.max(1, el.strokeWidth * 0.08);
  ctx.setLineDash([]);
  for (let i = 0; i <= lines; i++) {
    const f = i / lines;
    ctx.beginPath();
    if (horizontalBars) {
      const gx = rc.rtl ? x + w - w * f : x + w * f;
      ctx.moveTo(gx, y); ctx.lineTo(gx, y + h);
    } else {
      const gy = y + h - h * f;
      ctx.moveTo(x, gy); ctx.lineTo(x + w, gy);
    }
    ctx.stroke();
    if (axisLabels) {
      const s = formatNumber(max * f, { ...el.format, decimals: max * f % 1 ? 1 : 0 });
      if (horizontalBars) {
        const gx = rc.rtl ? x + w - w * f : x + w * f;
        txt(rc, s, gx, y + h + fs * 0.9, fs * 0.85, col(rc, el.mutedColor), 'center', 'middle', 400);
      } else {
        txt(rc, s, rc.rtl ? x + w + fs * 0.6 : x - fs * 0.6, y + h - h * f, fs * 0.85, col(rc, el.mutedColor), rc.rtl ? 'left' : 'right', 'middle', 400);
      }
    }
  }
}

function drawBar(rc: RC) {
  const { ctx, el } = rc;
  const P = el.props;
  const horizontal = str(P.orientation, 'vertical') === 'horizontal';
  const labels = el.data.labels;
  const series = el.data.series.length ? el.data.series : [{ name: '', color: '$0', values: [] }];
  const n = labels.length || 1;
  const ns = series.length;
  const max = num(P.maxValue, 0) > 0 ? num(P.maxValue, 0) : niceCeil(seriesMax(el));
  const fs = Math.max(Math.min(el.w, el.h) * 0.055, Math.max(el.w, el.h) * 0.016) * el.fontScale;
  const showLabels = bool(P.showLabels, true), showValues = bool(P.showValues, true);
  const showGrid = bool(P.showGrid, true), axisLabels = bool(P.axisLabels, false);
  const gapF = clamp01(num(P.gap, 0.35));
  const innerGap = num(P.seriesGap, 0.08);
  const r = el.radius;
  const track = bool(P.showTrack, false);

  // plot area
  let px = 0, py = 0, pw = el.w, ph = el.h;
  if (horizontal) {
    // measure label column
    let lw = 0;
    if (showLabels) {
      ctx.font = font(rc, fs, 500);
      for (const l of labels) lw = Math.max(lw, ctx.measureText(l).width);
      lw += fs * 0.9;
    }
    const vw = showValues ? fs * 4.2 : fs * 0.5;
    if (rc.rtl) { px = vw; pw = el.w - lw - vw; } else { px = lw; pw = el.w - lw - vw; }
    if (axisLabels) ph -= fs * 1.8;
  } else {
    const top = showValues ? fs * 1.9 : fs * 0.5;
    const bottom = showLabels ? fs * 2.2 : 0;
    py = top; ph = el.h - top - bottom;
    if (axisLabels) { const aw = fs * 3.2; pw -= aw; if (!rc.rtl) px = aw; }
  }
  if (pw <= 4 || ph <= 4) return;

  const gp = clamp01((rc.t - el.anim.delay) / 0.6);
  if (showGrid) {
    ctx.save(); ctx.globalAlpha *= EASINGS.easeOutCubic(gp);
    drawGrid(rc, px, py, pw, ph, Math.max(1, Math.round(num(P.gridLines, 4))), horizontal, max, axisLabels, fs);
    ctx.restore();
  }

  const band = (horizontal ? ph : pw) / n;
  const groupW = band * (1 - gapF);
  const barW = (groupW - (ns - 1) * groupW * innerGap) / ns;

  for (let i = 0; i < n; i++) {
    const idx = rc.rtl && !horizontal ? n - 1 - i : i; // visual slot
    const p = prog(rc, i);
    const bandStart = (horizontal ? py : px) + band * idx + (band - groupW) / 2;
    for (let s = 0; s < ns; s++) {
      const v = series[s].values[i] ?? 0;
      const frac = Math.max(0, v) / max;
      const color = col(rc, series[s].color || `$${s}`);
      const off = bandStart + s * (barW + groupW * innerGap);
      if (horizontal) {
        const L = pw * frac * p;
        const x0 = rc.rtl ? px + pw : px;
        const radii = rc.rtl ? [r, 0, 0, r] : [0, r, r, 0];
        if (track) { ctx.fillStyle = withAlpha(color, 0.12); roundRectPath(ctx, rc.rtl ? px : px, off, pw, barW, r); ctx.fill(); }
        if (L > 0.1) {
          ctx.fillStyle = barFill(rc, color, rc.rtl ? x0 - L : x0, off, rc.rtl ? x0 : x0 + L, off, P);
          roundRectPath(ctx, rc.rtl ? x0 - L : x0, off, L, barW, track ? r : radii); ctx.fill();
        }
        if (showValues) {
          const vx = rc.rtl ? x0 - L - fs * 0.5 : x0 + L + fs * 0.5;
          ctx.save(); ctx.globalAlpha *= clamp01(p * 3);
          txt(rc, formatNumber(v * clamp01(p), el.format), vx, off + barW / 2, fs, col(rc, el.textColor), rc.rtl ? 'right' : 'left', 'middle');
          ctx.restore();
        }
      } else {
        const L = ph * frac * p;
        const y0 = py + ph;
        if (track) { ctx.fillStyle = withAlpha(color, 0.12); roundRectPath(ctx, off, py, barW, ph, r); ctx.fill(); }
        if (L > 0.1) {
          ctx.fillStyle = barFill(rc, color, off, y0, off, y0 - L, P);
          roundRectPath(ctx, off, y0 - L, barW, L, track ? r : [r, r, 0, 0]); ctx.fill();
        }
        if (showValues) {
          ctx.save(); ctx.globalAlpha *= clamp01(p * 3);
          txt(rc, formatNumber(v * clamp01(p), el.format), off + barW / 2, y0 - L - fs * 0.75, fs, col(rc, el.textColor), 'center', 'middle', undefined, Math.max(barW * 1.6, fs * 3));
          ctx.restore();
        }
      }
    }
    if (showLabels) {
      const lp = EASINGS.easeOutCubic(clamp01((rc.t - el.anim.delay - i * el.anim.stagger) / 0.5));
      ctx.save(); ctx.globalAlpha *= lp;
      if (horizontal) {
        const ly = bandStart + groupW / 2;
        txt(rc, labels[i], rc.rtl ? el.w : 0, ly, fs, col(rc, el.mutedColor), rc.rtl ? 'right' : 'left', 'middle', 500);
      } else {
        txt(rc, labels[i], bandStart + groupW / 2, py + ph + fs * 1.2, fs, col(rc, el.mutedColor), 'center', 'middle', 500, band * 0.98);
      }
      ctx.restore();
    }
  }
}

function barFill(rc: RC, color: string, x0: number, y0: number, x1: number, y1: number, P: BaseElement['props']) {
  if (!bool(P.gradient, false)) return color;
  const g = rc.ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, withAlpha(color, 0.45));
  g.addColorStop(1, color);
  return g;
}

function drawPie(rc: RC) {
  const { ctx, el } = rc;
  const P = el.props;
  const values = (el.data.series[0]?.values ?? []).map((v) => Math.max(0, v || 0));
  const labels = el.data.labels;
  const total = values.reduce((a, b) => a + b, 0) || 1;
  const legend = bool(P.showLegend, true);
  const legendPos = str(P.legendPosition, 'side');
  const fs = Math.min(el.w, el.h) * 0.05 * el.fontScale;

  let cx = el.w / 2, cy = el.h / 2, R = Math.min(el.w, el.h) / 2;
  let lx = 0, ly = 0, lw = 0;
  if (legend) {
    if (legendPos === 'side') {
      const chartW = Math.min(el.h, el.w * 0.55);
      R = chartW / 2;
      lw = el.w - chartW - fs * 2;
      cx = rc.rtl ? el.w - R : R;
      lx = rc.rtl ? 0 : chartW + fs * 2;
      ly = cy - (labels.length * fs * 2) / 2 + fs;
    } else {
      const lh = Math.ceil(labels.length / 2) * fs * 2 + fs;
      R = Math.min(el.w, el.h - lh) / 2;
      cy = R;
      ly = R * 2 + fs * 1.5;
      lx = 0; lw = el.w;
    }
  }
  R = Math.max(2, R);
  const innerRatio = clamp01(num(P.inner, 0.62));
  const thickness = R * (1 - innerRatio);
  const midR = R - thickness / 2;
  const pad = (num(P.padAngle, 1.5) * Math.PI) / 180;
  const start = (num(P.startAngle, -90) * Math.PI) / 180;
  const dir = rc.rtl ? -1 : 1;
  const sweepMode = el.anim.stagger <= 0;
  const pAll = progClamped(rc);
  const popOut = bool(P.popOut, false);
  const roundCaps = el.radius > 0 && innerRatio > 0.05;

  let acc = 0;
  for (let i = 0; i < values.length; i++) {
    const a = (values[i] / total) * Math.PI * 2;
    const a0 = acc; acc += a;
    let drawn: number;
    if (sweepMode) drawn = Math.max(0, Math.min(a, pAll * Math.PI * 2 - a0));
    else drawn = a * progClamped(rc, i);
    const pp = Math.min(pad, a * 0.4);
    if (drawn <= pp) continue;
    const s0 = start + dir * (a0 + pp / 2);
    const s1 = start + dir * (a0 + drawn - pp / 2);
    const color = col(rc, '$' + (i + num(P.colorOffset, 0)));
    let ox = 0, oy = 0;
    if (popOut && i === 0) {
      const mid = start + dir * (a0 + a / 2);
      const k = R * 0.05 * (sweepMode ? pAll : progClamped(rc, i));
      ox = Math.cos(mid) * k; oy = Math.sin(mid) * k;
    }
    if (roundCaps) {
      ctx.strokeStyle = color; ctx.lineWidth = thickness; ctx.lineCap = 'round';
      const capA = Math.min((thickness / 2) / midR, (s1 - s0) * dir / 2);
      ctx.beginPath(); ctx.arc(cx + ox, cy + oy, midR, s0 + dir * capA, s1 - dir * capA, dir < 0); ctx.stroke();
    } else {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(cx + ox, cy + oy, R, s0, s1, dir < 0);
      if (innerRatio > 0.01) ctx.arc(cx + ox, cy + oy, R * innerRatio, s1, s0, dir > 0);
      else ctx.lineTo(cx + ox, cy + oy);
      ctx.closePath(); ctx.fill();
    }
    if (bool(P.sliceLabels, false) && drawn >= a * 0.98) {
      const mid = start + dir * (a0 + a / 2);
      const pct = (values[i] / total) * 100;
      txt(rc, formatNumber(pct, { ...el.format, prefix: '', suffix: '%', decimals: 0 }), cx + Math.cos(mid) * midR, cy + Math.sin(mid) * midR, fs * 0.9, '#ffffff', 'center', 'middle', 700);
    }
  }

  const center = str(P.centerMode, 'total');
  if (innerRatio > 0.35 && center !== 'none') {
    const cfs = R * innerRatio * 0.5 * el.fontScale;
    const cl = str(P.centerLabel, '');
    const v = center === 'first' ? (values[0] / total) * 100 : total;
    const f = center === 'first' ? { ...el.format, suffix: '%', prefix: '', decimals: el.format.decimals } : el.format;
    txt(rc, formatNumber(v * pAll, f), cx, cl ? cy - cfs * 0.15 : cy, cfs, col(rc, el.textColor), 'center', 'middle');
    if (cl) txt(rc, cl, cx, cy + cfs * 0.6, cfs * 0.32, col(rc, el.mutedColor), 'center', 'middle', 500, R * innerRatio * 1.6);
  }

  if (legend) {
    for (let i = 0; i < labels.length; i++) {
      const lp = EASINGS.easeOutCubic(clamp01((rc.t - el.anim.delay - 0.1 - i * 0.08) / 0.5));
      if (lp <= 0) continue;
      ctx.save(); ctx.globalAlpha *= lp;
      let ix = lx, iy = ly + i * fs * 2, iw = lw;
      if (legendPos !== 'side') { const colW = lw / 2; const gut = fs * 2.5; iy = ly + Math.floor(i / 2) * fs * 2; iw = colW - gut; ix = rc.rtl ? lx + lw - (i % 2 + 1) * colW + gut : lx + (i % 2) * colW; }
      const off = (1 - lp) * fs;
      const color = col(rc, '$' + (i + num(P.colorOffset, 0)));
      ctx.fillStyle = color;
      const sx = rc.rtl ? ix + iw - fs * 0.8 : ix;
      roundRectPath(ctx, sx + (rc.rtl ? off : -off), iy - fs * 0.4, fs * 0.8, fs * 0.8, fs * 0.25); ctx.fill();
      const tx = rc.rtl ? sx - fs * 0.5 : sx + fs * 1.3;
      txt(rc, labels[i], tx, iy, fs, col(rc, el.textColor), rc.rtl ? 'right' : 'left', 'middle', 500, iw * 0.6);
      const pct = (values[i] / total) * 100;
      const vs = bool(P.legendPercent, true) ? formatNumber(pct, { ...el.format, prefix: '', suffix: '%', decimals: 0 }) : formatNumber(values[i], el.format);
      txt(rc, vs, rc.rtl ? ix : ix + iw, iy, fs, col(rc, el.mutedColor), rc.rtl ? 'left' : 'right', 'middle', 600);
      ctx.restore();
    }
  }
}

function linePoints(xs: number[], ys: number[], smooth: boolean, ctx: Ctx, move = true) {
  if (!xs.length) return;
  if (move) ctx.moveTo(xs[0], ys[0]); else ctx.lineTo(xs[0], ys[0]);
  if (!smooth || xs.length < 3) { for (let i = 1; i < xs.length; i++) ctx.lineTo(xs[i], ys[i]); return; }
  for (let i = 0; i < xs.length - 1; i++) {
    const x0 = xs[Math.max(0, i - 1)], y0 = ys[Math.max(0, i - 1)];
    const x1 = xs[i], y1 = ys[i], x2 = xs[i + 1], y2 = ys[i + 1];
    const x3 = xs[Math.min(xs.length - 1, i + 2)], y3 = ys[Math.min(xs.length - 1, i + 2)];
    const k = 0.18;
    ctx.bezierCurveTo(x1 + (x2 - x0) * k, y1 + (y2 - y0) * k, x2 - (x3 - x1) * k, y2 - (y3 - y1) * k, x2, y2);
  }
}

function drawLine(rc: RC) {
  const { ctx, el } = rc;
  const P = el.props;
  const labels = el.data.labels;
  const n = Math.max(2, labels.length);
  const fs = Math.max(Math.min(el.w, el.h) * 0.05, Math.max(el.w, el.h) * 0.016) * el.fontScale;
  const showLabels = bool(P.showLabels, true), showGrid = bool(P.showGrid, true);
  const axisLabels = bool(P.axisLabels, false);
  let lo = Infinity, hi = -Infinity;
  for (const s of el.data.series) for (const v of s.values) if (isFinite(v)) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
  if (!isFinite(lo)) { lo = 0; hi = 1; }
  if (bool(P.startAtZero, true)) lo = Math.min(0, lo);
  const max = num(P.maxValue, 0) > 0 ? num(P.maxValue, 0) : niceCeil(hi * 1.08);
  const min = lo < 0 ? -niceCeil(-lo * 1.08) : bool(P.startAtZero, true) ? 0 : lo - (hi - lo) * 0.15;
  const dot = num(P.dotSize, 1.6) * el.strokeWidth;
  const padT = Math.max(fs * 1.6, dot * 1.2), padB = showLabels ? fs * 2.2 : dot;
  const padX = Math.max(dot * 1.5, fs * 0.6);
  let px = padX, pw = el.w - padX * 2;
  if (axisLabels) { const aw = fs * 3.2; pw -= aw; if (!rc.rtl) px += aw; }
  const py = padT, ph = el.h - padT - padB;
  if (pw <= 4 || ph <= 4) return;

  if (showGrid) {
    const gp = clamp01((rc.t - el.anim.delay) / 0.6);
    ctx.save(); ctx.globalAlpha *= EASINGS.easeOutCubic(gp);
    drawGrid(rc, px, py, pw, ph, Math.max(1, Math.round(num(P.gridLines, 4))), false, max, axisLabels, fs);
    ctx.restore();
  }
  const X = (i: number) => { const f = i / (n - 1); return rc.rtl ? px + pw - pw * f : px + pw * f; };
  const Y = (v: number) => py + ph - ((v - min) / (max - min || 1)) * ph;

  if (showLabels) {
    for (let i = 0; i < labels.length; i++) {
      const lp = EASINGS.easeOutCubic(clamp01((rc.t - el.anim.delay - (i / n) * el.anim.duration * 0.8) / 0.4));
      ctx.save(); ctx.globalAlpha *= lp;
      txt(rc, labels[i], X(i), py + ph + fs * 1.3, fs, col(rc, el.mutedColor), 'center', 'middle', 500, (pw / n) * 1.1);
      ctx.restore();
    }
  }

  const smooth = bool(P.smooth, true);
  el.data.series.forEach((s, si) => {
    const p = progClamped(rc, si);
    if (p <= 0) return;
    const color = col(rc, s.color || `$${si}`);
    const xs = s.values.slice(0, n).map((_, i) => X(i));
    const ys = s.values.slice(0, n).map((v) => Y(v));
    if (!xs.length) return;
    const headX = rc.rtl ? px + pw - pw * p : px + pw * p;
    ctx.save();
    ctx.beginPath();
    if (rc.rtl) ctx.rect(headX, 0, el.w - headX, el.h); else ctx.rect(-dot * 3, 0, headX + dot * 3, el.h);
    ctx.clip();
    if (bool(P.showArea, true)) {
      const g = ctx.createLinearGradient(0, py, 0, py + ph);
      g.addColorStop(0, withAlpha(color, num(P.areaOpacity, 0.35)));
      g.addColorStop(1, withAlpha(color, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      linePoints(xs, ys, smooth, ctx);
      ctx.lineTo(xs[xs.length - 1], py + ph); ctx.lineTo(xs[0], py + ph); ctx.closePath(); ctx.fill();
    }
    ctx.strokeStyle = color; ctx.lineWidth = el.strokeWidth; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    if (bool(P.glow, false)) { ctx.shadowColor = withAlpha(color, 0.6); ctx.shadowBlur = el.strokeWidth * 3; }
    ctx.beginPath(); linePoints(xs, ys, smooth, ctx); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();
    if (bool(P.showDots, true)) {
      for (let i = 0; i < xs.length; i++) {
        const reached = rc.rtl ? xs[i] >= headX - 0.5 : xs[i] <= headX + 0.5;
        if (!reached) continue;
        const dp = clamp01((Math.abs(headX - xs[i]) / (pw / n)) * 2);
        const rr = dot * EASINGS.easeOutBack(dp);
        ctx.fillStyle = col(rc, str(P.dotFill, '#0b0b0f'));
        ctx.strokeStyle = color; ctx.lineWidth = el.strokeWidth * 0.8;
        ctx.beginPath(); ctx.arc(xs[i], ys[i], Math.max(0, rr), 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
    }
    if (bool(P.showValues, true)) {
      const last = Math.min(xs.length, n) - 1;
      const reached = p >= 0.999;
      if (reached && last >= 0) {
        const vp = EASINGS.easeOutCubic(clamp01((rc.t - el.anim.delay - si * el.anim.stagger - el.anim.duration) / 0.4));
        ctx.save(); ctx.globalAlpha *= vp;
        txt(rc, formatNumber(s.values[last], el.format), xs[last] + (rc.rtl ? -dot : dot), ys[last] - dot - fs * 0.8 - (1 - vp) * fs, fs * 1.1, col(rc, el.textColor), rc.rtl ? 'left' : 'right', 'middle');
        ctx.restore();
      }
    }
  });
}

function sparkline(rc: RC, vals: number[], x: number, y: number, w: number, h: number, color: string, p: number) {
  const { ctx } = rc;
  if (vals.length < 2) return;
  const lo = Math.min(...vals), hi = Math.max(...vals);
  const xs = vals.map((_, i) => (rc.rtl ? x + w - (w * i) / (vals.length - 1) : x + (w * i) / (vals.length - 1)));
  const ys = vals.map((v) => y + h - ((v - lo) / (hi - lo || 1)) * h);
  ctx.save();
  ctx.beginPath();
  const head = rc.rtl ? x + w - w * p : x + w * p;
  if (rc.rtl) ctx.rect(head, y - h, x + w - head + 10, h * 3); else ctx.rect(x - 10, y - h, head - x + 10, h * 3);
  ctx.clip();
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, withAlpha(color, 0.3)); g.addColorStop(1, withAlpha(color, 0));
  ctx.fillStyle = g;
  ctx.beginPath(); linePoints(xs, ys, true, ctx); ctx.lineTo(xs[xs.length - 1], y + h); ctx.lineTo(xs[0], y + h); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = color; ctx.lineWidth = Math.max(1.5, rc.el.strokeWidth * 0.5); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); linePoints(xs, ys, true, ctx); ctx.stroke();
  ctx.restore();
}

function drawKpi(rc: RC) {
  const { ctx, el } = rc;
  const P = el.props;
  const m = Math.min(el.w, el.h);
  const pad = m * 0.1;
  const accent = col(rc, str(P.accent, '$0'));
  // card
  if (bool(P.showCard, true)) {
    ctx.fillStyle = withAlpha(col(rc, str(P.cardColor, '#1c1c22')), num(P.cardOpacity, 1));
    roundRectPath(ctx, 0, 0, el.w, el.h, el.radius); ctx.fill();
    if (bool(P.border, true)) {
      ctx.strokeStyle = withAlpha(col(rc, str(P.borderColor, '#ffffff')), 0.1);
      ctx.lineWidth = Math.max(1, m * 0.006);
      roundRectPath(ctx, 0.5, 0.5, el.w - 1, el.h - 1, el.radius); ctx.stroke();
    }
    if (bool(P.accentBar, true)) {
      ctx.save(); roundRectPath(ctx, 0, 0, el.w, el.h, el.radius); ctx.clip();
      ctx.fillStyle = accent;
      const bw = el.w * progClamped(rc);
      ctx.fillRect(rc.rtl ? el.w - bw : 0, 0, bw, Math.max(2, m * 0.025));
      ctx.restore();
    }
  }
  const p = prog(rc);
  const align: CanvasTextAlign = rc.rtl ? 'right' : 'left';
  const sx = rc.rtl ? el.w - pad : pad;
  const tfs = m * 0.085 * el.fontScale;
  txt(rc, str(P.title, 'Revenue'), sx, pad + tfs / 2, tfs, col(rc, el.mutedColor), align, 'middle', 500, el.w - pad * 2);
  const vfs = fitSize(rc, [formatNumber(num(P.value, 0), el.format)], m * 0.24 * el.fontScale, el.w - pad * 2);
  const vy = pad + tfs + m * 0.06 + vfs / 2;
  const value = num(P.value, 0) * p;
  txt(rc, formatNumber(value, el.format), sx, vy, vfs, col(rc, el.textColor), align, 'middle', undefined, el.w - pad * 2);

  const delta = num(P.delta, 0);
  const dfs = m * 0.07 * el.fontScale;
  const dy = vy + vfs / 2 + m * 0.07 + dfs / 2;
  const dp = EASINGS.easeOutCubic(clamp01((rc.t - el.anim.delay - el.anim.duration * 0.4) / 0.5));
  if (bool(P.showDelta, true) && dp > 0) {
    ctx.save(); ctx.globalAlpha *= dp;
    const up = delta >= 0;
    const dc = col(rc, up ? str(P.posColor, '#30d158') : str(P.negColor, '#ff453a'));
    const ds = (up ? '▲ ' : '▼ ') + formatNumber(Math.abs(delta) * p, { ...el.format, prefix: '', suffix: '%', decimals: num(P.deltaDecimals, 1), compact: false });
    ctx.font = font(rc, dfs, 600);
    const tw = ctx.measureText(ds).width;
    const pw = tw + dfs * 1.2, ph = dfs * 1.8;
    const px = rc.rtl ? sx - pw : sx;
    ctx.fillStyle = withAlpha(dc, 0.16);
    roundRectPath(ctx, px, dy - ph / 2, pw, ph, ph / 2); ctx.fill();
    txt(rc, ds, px + pw / 2, dy, dfs, dc, 'center', 'middle', 600);
    const dl = str(P.deltaLabel, '');
    if (dl) txt(rc, dl, rc.rtl ? px - dfs * 0.6 : px + pw + dfs * 0.6, dy, dfs, col(rc, el.mutedColor), align, 'middle', 400, el.w - pad * 2 - pw);
    ctx.restore();
  }
  if (bool(P.showSpark, true)) {
    const vals = el.data.series[0]?.values ?? [];
    const top = dy + dfs + m * 0.06;
    const h = el.h - top - pad * 0.8;
    if (h > 8) sparkline(rc, vals, pad, top, el.w - pad * 2, h, accent, progClamped(rc));
  }
}

function drawGrowth(rc: RC) {
  const { ctx, el } = rc;
  const P = el.props;
  const v = num(P.value, 12.5);
  const p = prog(rc);
  const up = v >= 0;
  const color = col(rc, up ? str(P.posColor, '#30d158') : str(P.negColor, '#ff453a'));
  const style = str(P.style, 'pill');
  const label = str(P.label, '');
  const h = el.h;
  let fs = h * (label && style !== 'pill' ? 0.42 : 0.46) * el.fontScale;
  {
    // shrink so arrow + final number (+ pill padding) fit the box width
    ctx.font = font(rc, fs);
    const fw = ctx.measureText(formatNumber(v, el.format, { signed: bool(P.showSign, true) })).width;
    const need = fw + (bool(P.showArrow, true) ? fs * 1.25 : 0) + (style === 'pill' ? fs * 1.2 : 0);
    if (need > el.w * 0.98) fs *= (el.w * 0.98) / need;
  }
  const s = formatNumber(v * p, el.format, { signed: bool(P.showSign, true) });
  ctx.font = font(rc, fs);
  const tw = ctx.measureText(s).width;
  const aw = bool(P.showArrow, true) ? fs * 0.9 : 0;
  const gap = aw ? fs * 0.35 : 0;
  const contentW = aw + gap + tw;
  const cy = label && style !== 'pill' ? h * 0.36 : h / 2;
  let x0 = (el.w - contentW) / 2;
  if (style === 'pill') {
    const pw = contentW + fs * 1.2, ph = Math.min(h, fs * 1.9);
    const pX = (el.w - pw) / 2;
    ctx.fillStyle = withAlpha(color, num(P.pillOpacity, 0.16));
    roundRectPath(ctx, pX, cy - ph / 2, pw, ph, Math.min(el.radius, ph / 2)); ctx.fill();
  }
  const arrowFirst = !rc.rtl;
  if (aw) {
    const ax = arrowFirst ? x0 + aw / 2 : x0 + tw + gap + aw / 2;
    const bounce = (1 - EASINGS.easeOutBack(clamp01(p))) * fs * 0.6 * (up ? 1 : -1);
    ctx.save();
    ctx.translate(ax, cy + bounce);
    if (!up) ctx.rotate(Math.PI);
    ctx.fillStyle = color;
    const a = aw * 0.5;
    ctx.beginPath();
    ctx.moveTo(0, -a); ctx.lineTo(a * 0.95, a * 0.15); ctx.lineTo(a * 0.32, a * 0.15);
    ctx.lineTo(a * 0.32, a); ctx.lineTo(-a * 0.32, a); ctx.lineTo(-a * 0.32, a * 0.15); ctx.lineTo(-a * 0.95, a * 0.15);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  const tx = arrowFirst ? x0 + aw + gap : x0;
  txt(rc, s, tx, cy, fs, style === 'plain-white' ? col(rc, el.textColor) : color, 'left', 'middle');
  if (label) {
    const ly = style === 'pill' ? cy + fs * 1.35 : h * 0.8;
    if (ly < h + fs) txt(rc, label, el.w / 2, Math.min(ly, h - fs * 0.3), fs * 0.38, col(rc, el.mutedColor), 'center', 'middle', 500, el.w);
  }
}

function drawText(rc: RC) {
  const { ctx, el } = rc;
  const P = el.props;
  const text = str(P.text, 'Title');
  const align = sideAlign(rc, str(P.align, 'start'));
  const lines = text.split('\n');
  ctx.letterSpacing = `${num(P.tracking, 0) * num(P.size, 64) * el.fontScale}px`;
  const fs = fitSize(rc, lines, num(P.size, 64) * el.fontScale, el.w);
  ctx.letterSpacing = '0px';
  const lh = fs * num(P.lineHeight, 1.2);
  const x = align === 'center' ? el.w / 2 : align === 'left' ? 0 : el.w;
  const total = lines.length * lh;
  const y0 = (el.h - total) / 2 + lh / 2;
  const reveal = str(P.reveal, 'lines');
  lines.forEach((line, i) => {
    let a = 1, dy = 0;
    if (reveal === 'lines') {
      const lp = prog(rc, i);
      a = clamp01(lp); dy = (1 - lp) * fs * 0.5;
    }
    ctx.save(); ctx.globalAlpha *= a;
    ctx.letterSpacing = `${num(P.tracking, 0) * fs}px`;
    txt(rc, line, x, y0 + i * lh + dy, fs, col(rc, el.textColor), align, 'middle');
    ctx.restore();
  });
}

const DRAWERS: Record<BaseElement['type'], (rc: RC) => void> = {
  ring: drawRing, counter: drawCounter, bar: drawBar, pie: drawPie, line: drawLine, kpi: drawKpi, growth: drawGrowth, text: drawText,
};

export function fontStack(project: Project, el?: BaseElement) {
  const fams = [el?.font, project.canvas.latinFont, project.canvas.arabicFont].filter(Boolean) as string[];
  return [...new Set(fams)].map((f) => `"${f}"`).join(', ') + ', system-ui, sans-serif';
}

export function renderElement(ctx: Ctx, project: Project, el: BaseElement, t: number, scale = 1) {
  if (!el.visible) return;
  const a = el.anim;
  const ep = el.anim.entrance === 'none' ? 1 : EASINGS.easeOutCubic(clamp01((t - a.delay) / Math.max(0.01, a.entranceDuration)));
  if (ep <= 0 && a.entrance !== 'none') return;
  ctx.save();
  ctx.globalAlpha = el.opacity * (a.entrance === 'none' ? 1 : ep);
  const cx = el.x + el.w / 2, cy = el.y + el.h / 2;
  ctx.translate(cx, cy);
  if (el.rotation) ctx.rotate((el.rotation * Math.PI) / 180);
  const d = 1 - ep;
  const m = Math.min(el.w, el.h) * 0.25;
  switch (a.entrance) {
    case 'slideUp': ctx.translate(0, d * m); break;
    case 'slideDown': ctx.translate(0, -d * m); break;
    case 'slideLeft': ctx.translate(d * m, 0); break;
    case 'slideRight': ctx.translate(-d * m, 0); break;
    case 'scale': { const s = 0.8 + 0.2 * ep; ctx.scale(s, s); break; }
    case 'blur': if (d > 0.001) ctx.filter = `blur(${(d * 14 * scale).toFixed(2)}px)`; break;
  }
  ctx.translate(-el.w / 2, -el.h / 2);
  const rc: RC = {
    ctx, el, t, pal: project.palette.colors, rtl: project.canvas.direction === 'rtl', fonts: fontStack(project, el), scale,
  };
  ctx.direction = rc.rtl ? 'rtl' : 'ltr';
  try { DRAWERS[el.type](rc); } catch (e) { console.warn('render error', el.type, e); }
  ctx.restore();
}

export interface RenderOpts {
  scale?: number;
  forceTransparent?: boolean;
  forceOpaque?: boolean;
}

export function renderProject(ctx: Ctx, project: Project, t: number, opts: RenderOpts = {}) {
  const s = opts.scale ?? 1;
  const { width, height, background, transparent } = project.canvas;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.setTransform(s, 0, 0, s, 0, 0);
  if (opts.forceOpaque || !(transparent || opts.forceTransparent)) {
    ctx.fillStyle = resolveColor(background, project.palette.colors, '#000');
    ctx.fillRect(0, 0, width, height);
  }
  for (const el of project.elements) renderElement(ctx, project, el, t, s);
  ctx.restore();
}

/** Time at which every element has finished animating */
export function contentEnd(project: Project) {
  let end = 0;
  for (const el of project.elements) {
    const items = el.type === 'bar' || el.type === 'pie' ? el.data.labels.length : el.type === 'line' ? el.data.series.length : el.type === 'text' ? String(el.props.text ?? '').split('\n').length : 1;
    end = Math.max(end, el.anim.delay + el.anim.duration + Math.max(0, items - 1) * el.anim.stagger);
  }
  return end;
}
