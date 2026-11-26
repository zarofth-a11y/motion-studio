import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { renderProject } from '../render/renderer';
import { ensureFonts } from '../lib/fonts';
import { IconButton, Select } from './ui';
import type { BaseElement } from '../types';
import { useT } from '../i18n';

type Handle = 'move' | 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';
const HANDLES: Handle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
const SNAP = 8;

export function Preview() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const project = useStore((s) => s.project);
  const selectedId = useStore((s) => s.selectedId);
  const zoomSetting = useStore((s) => s.zoom);
  const showSafe = useStore((s) => s.showSafeArea);
  const t = useT();
  const [avail, setAvail] = useState({ w: 800, h: 450 });
  const [guides, setGuides] = useState<{ x: number[]; y: number[] }>({ x: [], y: [] });
  const [hover, setHover] = useState<string | null>(null);
  const { width: CW, height: CH, transparent } = project.canvas;

  useLayoutEffect(() => {
    const el = wrapRef.current!;
    const ro = new ResizeObserver(() => setAvail({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const fit = Math.min((avail.w - 64) / CW, (avail.h - 64) / CH);
  const zoom = Math.max(0.02, zoomSetting === 'fit' ? fit : zoomSetting);
  const dispW = CW * zoom, dispH = CH * zoom;

  // ── render loop ──
  useEffect(() => {
    let raf = 0, last = performance.now();
    let lastProject: unknown = null, lastTime = -1, lastScale = -1, dirty = true;
    const onFonts = () => { dirty = true; };
    document.fonts.addEventListener('loadingdone', onFonts);
    ensureFonts(useStore.getState().project).then(onFonts);
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const s = useStore.getState();
      if (s.playing) {
        let t = s.time + dt;
        const D = s.project.canvas.duration;
        if (t >= D) {
          if (s.loop) t = t % D;
          else { t = D; useStore.setState({ playing: false }); }
        }
        useStore.setState({ time: t });
      }
      const c = canvasRef.current;
      if (c) {
        const st = useStore.getState();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const z = Number(c.dataset.zoom || 1);
        const scale = z * dpr;
        const pw = Math.max(1, Math.round(st.project.canvas.width * scale));
        const ph = Math.max(1, Math.round(st.project.canvas.height * scale));
        if (c.width !== pw || c.height !== ph) { c.width = pw; c.height = ph; dirty = true; }
        if (dirty || st.project !== lastProject || st.time !== lastTime || scale !== lastScale) {
          renderProject(c.getContext('2d')!, st.project, st.time, { scale });
          lastProject = st.project; lastTime = st.time; lastScale = scale; dirty = false;
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); document.fonts.removeEventListener('loadingdone', onFonts); };
  }, []);

  useEffect(() => { ensureFonts(project); }, [project.canvas.latinFont, project.canvas.arabicFont, project]);

  // ── drag / resize ──
  const startDrag = (e: React.PointerEvent, el: BaseElement, handle: Handle) => {
    e.stopPropagation();
    useStore.getState().select(el.id);
    if (el.locked || e.button !== 0) return;
    const x0 = e.clientX, y0 = e.clientY;
    const start = { x: el.x, y: el.y, w: el.w, h: el.h };
    const ratio = start.w / start.h;
    const others = useStore.getState().project.elements.filter((o) => o.id !== el.id && o.visible);
    const xs = [0, CW / 2, CW, ...others.flatMap((o) => [o.x, o.x + o.w / 2, o.x + o.w])];
    const ys = [0, CH / 2, CH, ...others.flatMap((o) => [o.y, o.y + o.h / 2, o.y + o.h])];
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
    const move = (ev: PointerEvent) => {
      const dx = (ev.clientX - x0) / zoom, dy = (ev.clientY - y0) / zoom;
      let { x, y, w, h } = start;
      const gx: number[] = [], gy: number[] = [];
      if (handle === 'move') {
        x += dx; y += dy;
        if (!ev.altKey) {
          const th = SNAP / zoom;
          const sx = bestSnap([x, x + w / 2, x + w], xs, th);
          if (sx) { x += sx.d; gx.push(sx.v); }
          const sy = bestSnap([y, y + h / 2, y + h], ys, th);
          if (sy) { y += sy.d; gy.push(sy.v); }
        }
        if (ev.shiftKey) { if (Math.abs(dx) > Math.abs(dy)) y = start.y; else x = start.x; }
      } else {
        if (handle.includes('e')) w = start.w + dx;
        if (handle.includes('s')) h = start.h + dy;
        if (handle.includes('w')) { w = start.w - dx; x = start.x + dx; }
        if (handle.includes('n')) { h = start.h - dy; y = start.y + dy; }
        if (ev.shiftKey && handle.length === 2) {
          const nh = w / ratio;
          if (handle.includes('n')) y = start.y + start.h - nh;
          h = nh;
        }
        w = Math.max(20, w); h = Math.max(20, h);
      }
      setGuides({ x: gx, y: gy });
      useStore.getState().updateElement(el.id, (t) => { t.x = Math.round(x); t.y = Math.round(y); t.w = Math.round(w); t.h = Math.round(h); }, 'drag');
    };
    const up = () => {
      setGuides({ x: [], y: [] });
      target.removeEventListener('pointermove', move);
      target.removeEventListener('pointerup', up);
    };
    target.addEventListener('pointermove', move);
    target.addEventListener('pointerup', up);
  };

  const zoomOptions = [
    { value: 'fit', label: t('Fit ({n}%)', { n: Math.round(fit * 100) }) },
    { value: '0.25', label: '25%' }, { value: '0.5', label: '50%' }, { value: '0.75', label: '75%' }, { value: '1', label: '100%' }, { value: '2', label: '200%' },
  ];

  return (
    <div className="preview" ref={wrapRef} onPointerDown={() => useStore.getState().select(null)}>
      <div className="preview-scroll" dir="ltr">
        <div className={`stage ${transparent ? 'checker' : ''}`} style={{ width: dispW, height: dispH }}>
          <canvas ref={canvasRef} data-zoom={zoom} style={{ width: dispW, height: dispH }} />
          <div className="overlay">
            {project.elements.map((el) => el.visible && (
              <div
                key={el.id}
                className={`hit ${selectedId === el.id ? 'selected' : ''} ${hover === el.id ? 'hover' : ''} ${el.locked ? 'locked' : ''}`}
                style={{ left: el.x * zoom, top: el.y * zoom, width: el.w * zoom, height: el.h * zoom, transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined }}
                onPointerDown={(e) => startDrag(e, el, 'move')}
                onPointerEnter={() => setHover(el.id)}
                onPointerLeave={() => setHover(null)}
              >
                {selectedId === el.id && (
                  <>
                    <span className="hit-label">{el.name}<em>{Math.round(el.w)}×{Math.round(el.h)}</em></span>
                    {!el.locked && HANDLES.map((h) => <span key={h} className={`handle h-${h}`} onPointerDown={(e) => startDrag(e, el, h)} />)}
                  </>
                )}
              </div>
            ))}
            {guides.x.map((g, i) => <div key={'gx' + i} className="guide gv" style={{ left: g * zoom }} />)}
            {guides.y.map((g, i) => <div key={'gy' + i} className="guide gh" style={{ top: g * zoom }} />)}
            {showSafe && <div className="safe-area" />}
          </div>
        </div>
      </div>
      <div className="preview-hud" onPointerDown={(e) => e.stopPropagation()}>
        <span className="hud-dim">{CW} × {CH}{transparent ? ' · ' + t('Alpha') : ''} · {project.canvas.direction.toUpperCase()}</span>
        <IconButton icon="safe" title={t('Toggle title-safe guides')} active={showSafe} onClick={() => useStore.setState({ showSafeArea: !showSafe })} />
        <Select value={zoomSetting === 'fit' ? 'fit' : String(zoomSetting)} onChange={(v) => useStore.getState().setZoom(v === 'fit' ? 'fit' : +v)} options={zoomOptions} />
      </div>
    </div>
  );
}

function bestSnap(points: number[], targets: number[], th: number) {
  let best: { d: number; v: number } | null = null;
  for (const p of points) for (const t of targets) {
    const d = t - p;
    if (Math.abs(d) <= th && (!best || Math.abs(d) < Math.abs(best.d))) best = { d, v: t };
  }
  return best;
}
