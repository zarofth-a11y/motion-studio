import type { BaseElement, Project } from '../types';

/**
 * Auto-arrange: re-flows the elements into rows that suit the current canvas shape.
 * Reading order is preserved (top-to-bottom, then by x). Large charts get full rows on
 * portrait/square canvases; small items (KPI, ring, counter, growth) share rows.
 */

const BIG = new Set(['bar', 'line', 'pie']);

/** Preferred width / height for an element type */
function aspect(el: BaseElement) {
  switch (el.type) {
    case 'ring': return 1;
    case 'counter': return 2.6;
    case 'growth': return 3;
    case 'kpi': return 1.6;
    case 'bar': return el.props.orientation === 'horizontal' ? 1.3 : 1.5;
    case 'line': return 1.6;
    case 'pie': return !el.props.showLegend ? 1 : el.props.legendPosition === 'bottom' ? 1 : 1.8;
    default: return 3;
  }
}

/** Approximate fitted height of a text element at a given width */
function textHeight(el: BaseElement, width: number) {
  const lines = String(el.props.text ?? '').split('\n');
  const chars = Math.max(1, ...lines.map((l) => l.length));
  const size = Number(el.props.size) || 64;
  const fitted = Math.min(size * el.fontScale, width / (0.55 * chars));
  return fitted * (Number(el.props.lineHeight) || 1.2) * lines.length * 1.15;
}

export function autoLayout(project: Project) {
  const { width: W, height: H } = project.canvas;
  const els = project.elements.filter((e) => e.visible && !e.locked);
  if (!els.length) return;

  // rescue text that became unreadably small (e.g. after older destructive resizes)
  const minText = Math.min(W, H) * 0.028;
  for (const e of els) if (e.type === 'text' && Number(e.props.size) * e.fontScale < minText) e.props.size = Math.round(minText / e.fontScale);

  const portrait = H > W * 1.1;
  const square = !portrait && W < H * 1.25;
  const maxPerLine = portrait ? 2 : square ? 3 : 4;

  // 1) Group into the rows the user already designed (vertical overlap → same row)
  const sorted = [...els].sort((a, b) => a.y + a.h / 2 - (b.y + b.h / 2));
  const rows: BaseElement[][] = [];
  for (const el of sorted) {
    const row = rows[rows.length - 1];
    if (row) {
      const top = Math.min(...row.map((r) => r.y)), bottom = Math.max(...row.map((r) => r.y + r.h));
      const overlap = Math.min(bottom, el.y + el.h) - Math.max(top, el.y);
      if (overlap > Math.min(el.h, bottom - top) * 0.4 && el.type !== 'text' && row[0].type !== 'text') { row.push(el); continue; }
    }
    rows.push([el]);
  }

  // 2) Break rows into lines that suit the canvas shape
  const lines: BaseElement[][] = [];
  for (const row of rows) {
    let line: BaseElement[] = [];
    const flush = () => { if (line.length) lines.push(line); line = []; };
    for (const el of [...row].sort((a, b) => a.x - b.x)) {
      if (el.type === 'text' || (BIG.has(el.type) && (portrait || square))) { flush(); lines.push([el]); continue; }
      line.push(el);
      if (line.length >= maxPerLine) flush();
    }
    flush();
  }

  // 2b) On wide/square canvases, pack consecutive chart lines side by side again
  const slots = (l: BaseElement[]) => l.reduce((a, e) => a + (BIG.has(e.type) && !portrait && !square ? 2 : 1), 0);
  if (!portrait) {
    for (let i = 0; i < lines.length - 1; i++) {
      const a = lines[i], b = lines[i + 1];
      const textLine = a[0].type === 'text' || b[0].type === 'text';
      const bigAlone = square && [...a, ...b].some((e) => BIG.has(e.type));
      if (!textLine && !bigAlone && slots(a) + slots(b) <= maxPerLine) { lines.splice(i, 2, [...a, ...b]); i--; }
    }
  }

  // 3) Size each line
  const m = Math.round(Math.min(W, H) * 0.06);
  const gap = Math.round(Math.min(W, H) * 0.03);
  const availW = W - m * 2, availH = H - m * 2;
  const minSlots = portrait ? 2 : 3; // a lone small item (e.g. a ring) only takes one slot, not the full width
  const plan = lines.map((line) => {
    const isText = line[0].type === 'text';
    const weights = line.map((e) => (BIG.has(e.type) && !portrait && !square ? 2 : 1));
    const allSmall = line.every((e) => !BIG.has(e.type) && e.type !== 'text');
    const nSlots = Math.max(weights.reduce((a, b) => a + b, 0), allSmall ? Math.min(minSlots, maxPerLine) : 0);
    const unit = (availW - gap * (nSlots - 1)) / nSlots;
    const widths = weights.map((w) => unit * w + gap * (w - 1));
    const heights = line.map((e, i) => (e.type === 'text' ? textHeight(e, widths[i]) : widths[i] / aspect(e)));
    return { line, widths, h: Math.max(...heights), isText };
  });

  // Fit vertically: scale chart lines (width AND height, so shapes keep their proportions)
  const gaps = gap * (plan.length - 1);
  const textH = plan.filter((p) => p.isText).reduce((a, p) => a + p.h, 0);
  const chartH = plan.filter((p) => !p.isText).reduce((a, p) => a + p.h, 0);
  if (chartH > 0) {
    const room = availH - textH - gaps;
    const k = Math.max(0.15, room / chartH);
    for (const p of plan) {
      if (p.isText) continue;
      p.h *= k;
      // can't get wider than the canvas: if growing, stretch height only beyond that
      const lineW = p.widths.reduce((a, b) => a + b, 0) + gap * (p.widths.length - 1);
      const wk = Math.min(k, availW / lineW);
      p.widths = p.widths.map((w) => w * wk);
    }
  }
  const total = plan.reduce((a, p) => a + p.h, 0) + gaps;

  // 4) Place: lines centered horizontally, stack centered vertically
  let y = m + Math.max(0, (availH - total) / 2);
  for (const p of plan) {
    const lineW = p.widths.reduce((a, b) => a + b, 0) + gap * (p.widths.length - 1);
    let x = p.isText ? m : m + (availW - lineW) / 2;
    p.line.forEach((el, i) => {
      el.x = Math.round(x);
      el.y = Math.round(y);
      el.w = Math.max(20, Math.round(p.isText ? availW : p.widths[i]));
      el.h = Math.max(20, Math.round(p.h));
      x += p.widths[i] + gap;
    });
    y += p.h + gap;
  }

  // rescue strokes that became hairlines (e.g. after older destructive resizes)
  for (const e of els) {
    const size = Math.min(e.w, e.h);
    if (e.type === 'ring' && e.strokeWidth < size * 0.03) e.strokeWidth = Math.round(size * 0.08);
    if (e.type === 'line' && e.strokeWidth < 2) e.strokeWidth = Math.max(3, Math.round(size * 0.012));
  }
}
