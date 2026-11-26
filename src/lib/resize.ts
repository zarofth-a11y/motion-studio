import type { Project } from '../types';

export type ScaleMode = 'stretch' | 'fit' | 'none';

/**
 * Resize the canvas of `p` to w×h, laying elements out from `base` — the project as it was
 * before this run of resizes started. Always working from the same base makes resizing
 * non-destructive: wide → vertical → wide (or a typo like 19 px) returns the original layout
 * instead of compounding the scale each time.
 */
export function applyResize(p: Project, base: Project, w: number, h: number, mode: ScaleMode) {
  const bw = base.canvas.width, bh = base.canvas.height;
  const byId = new Map(base.elements.map((e) => [e.id, e]));
  if (mode !== 'none' && bw > 0 && bh > 0) {
    const sx = w / bw, sy = h / bh;
    // stretch: every box follows the canvas on both axes; fit: one uniform factor, centered
    const fx = mode === 'stretch' ? sx : Math.min(sx, sy);
    const fy = mode === 'stretch' ? sy : Math.min(sx, sy);
    const ox = mode === 'stretch' ? 0 : (w - bw * fx) / 2;
    const oy = mode === 'stretch' ? 0 : (h - bh * fy) / 2;
    const k = Math.min(fx, fy); // strokes & corner radii, so they still fit their boxes
    for (const e of p.elements) {
      const b = byId.get(e.id);
      if (!b) continue; // added after this resize run began: leave it where the user put it
      e.x = Math.round(b.x * fx + ox); e.y = Math.round(b.y * fy + oy);
      e.w = Math.max(20, Math.round(b.w * fx)); e.h = Math.max(20, Math.round(b.h * fy));
      e.strokeWidth = Math.max(0.5, b.strokeWidth * k);
      // text: area-preserving factor (rendering also auto-fits text to its box width)
      if (e.type === 'text') e.props.size = Math.max(4, Math.round(Number(b.props.size) * Math.sqrt(fx * fy)));
      else if (e.type !== 'ring' && e.type !== 'pie') e.radius = Math.round(b.radius * k);
    }
  } else {
    for (const e of p.elements) {
      const b = byId.get(e.id);
      if (b) { e.x = b.x; e.y = b.y; e.w = b.w; e.h = b.h; e.strokeWidth = b.strokeWidth; e.radius = b.radius; if (e.type === 'text') e.props.size = b.props.size; }
    }
  }
  p.canvas.width = w; p.canvas.height = h;
}
