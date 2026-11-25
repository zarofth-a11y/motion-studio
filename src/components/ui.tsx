import { useEffect, useRef, useState, type ReactNode } from 'react';
import { resolveColor } from '../lib/color';
import { useStore } from '../store';

// ───────────────── Icons ─────────────────
const P: Record<string, ReactNode> = {
  play: <path d="M7 4.5v15l13-7.5z" fill="currentColor" stroke="none" />,
  pause: <g fill="currentColor" stroke="none"><rect x="6" y="4.5" width="4" height="15" rx="1" /><rect x="14" y="4.5" width="4" height="15" rx="1" /></g>,
  start: <g><path d="M6 5v14" /><path d="M18 5 9 12l9 7z" fill="currentColor" /></g>,
  end: <g><path d="M18 5v14" /><path d="M6 5l9 7-9 7z" fill="currentColor" /></g>,
  prev: <path d="M15 6 9 12l6 6" />,
  next: <path d="M9 6l6 6-6 6" />,
  loop: <g><path d="M17 2l3 3-3 3" /><path d="M4 11V9a4 4 0 0 1 4-4h12" /><path d="M7 22l-3-3 3-3" /><path d="M20 13v2a4 4 0 0 1-4 4H4" /></g>,
  undo: <g><path d="M9 14 4 9l5-5" /><path d="M4 9h11a5 5 0 0 1 0 10h-3" /></g>,
  redo: <g><path d="m15 14 5-5-5-5" /><path d="M20 9H9a5 5 0 0 0 0 10h3" /></g>,
  eye: <g><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></g>,
  eyeOff: <g><path d="M3 3l18 18" /><path d="M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6" /></g>,
  lock: <g><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></g>,
  unlock: <g><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 7.8-1.2" /></g>,
  trash: <g><path d="M4 7h16" /><path d="M10 11v6M14 11v6" /><path d="M6 7l1 13h10l1-13" /><path d="M9 7V4h6v3" /></g>,
  copy: <g><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></g>,
  up: <path d="m6 15 6-6 6 6" />,
  down: <path d="m6 9 6 6 6-6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  export: <g><path d="M12 3v12" /><path d="m7 8 5-5 5 5" /><path d="M5 15v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" /></g>,
  save: <g><path d="M5 3h11l3 3v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" /><path d="M7 3v5h8V3" /><rect x="7" y="13" width="10" height="6" rx="1" /></g>,
  grid: <g><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></g>,
  file: <g><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><path d="M14 3v6h6" /></g>,
  upload: <g><path d="M12 15V3" /><path d="m7 8 5-5 5 5" /><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" /></g>,
  download: <g><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" /></g>,
  camera: <g><path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" /><circle cx="12" cy="13" r="3.5" /></g>,
  ring: <g><circle cx="12" cy="12" r="8" opacity=".3" /><path d="M12 4a8 8 0 1 1-7.6 10.5" /></g>,
  counter: <g><path d="M5 8l3-2v12" /><path d="M12 7.5a2.5 2.5 0 0 1 5 0c0 2.5-5 5-5 10.5h5" /></g>,
  bar: <g><path d="M4 20h16" /><rect x="5" y="11" width="3" height="7" rx="1" /><rect x="10.5" y="6" width="3" height="12" rx="1" /><rect x="16" y="9" width="3" height="9" rx="1" /></g>,
  pie: <g><path d="M12 3a9 9 0 1 0 9 9h-9z" /><path d="M15 3.5A9 9 0 0 1 20.5 9H15z" /></g>,
  line: <g><path d="M3 17l5-5 4 3 8-8" /><path d="M3 21h18" opacity=".4" /></g>,
  kpi: <g><rect x="3" y="5" width="18" height="14" rx="3" /><path d="M7 10h5M7 14h3" /><path d="m14 15 2-3 2 1.5" /></g>,
  growth: <g><path d="M4 18 10 12l3 3 7-8" /><path d="M15 7h5v5" /></g>,
  text: <g><path d="M5 6V4h14v2" /><path d="M12 4v16" /><path d="M9 20h6" /></g>,
  rtl: <g><path d="M10 4h7M14 4v12M10 4a3 3 0 0 0 0 6h4" /><path d="m7 17-3 2 3 2M4 19h14" /></g>,
  ltr: <g><path d="M10 4h7M14 4v12M10 4a3 3 0 0 0 0 6h4" /><path d="m17 17 3 2-3 2M6 19h14" /></g>,
  sparkle: <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />,
  folder: <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />,
  fit: <g><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></g>,
  safe: <g><rect x="3" y="5" width="18" height="14" rx="2" /><rect x="6" y="8" width="12" height="8" rx="1" strokeDasharray="2 2" /></g>,
};

export function Icon({ name, size = 16, className }: { name: keyof typeof P | string; size?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      {P[name] ?? null}
    </svg>
  );
}

export function IconButton({ icon, title, onClick, active, disabled, size = 16, className = '' }: {
  icon: string; title: string; onClick?: () => void; active?: boolean; disabled?: boolean; size?: number; className?: string;
}) {
  return (
    <button className={`icon-btn ${active ? 'active' : ''} ${className}`} title={title} aria-label={title} onClick={onClick} disabled={disabled}>
      <Icon name={icon} size={size} />
    </button>
  );
}

// ───────────────── Layout ─────────────────
export function Section({ title, children, defaultOpen = true, right }: { title: string; children: ReactNode; defaultOpen?: boolean; right?: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`section ${open ? 'open' : ''}`}>
      <div className="section-head" onClick={() => setOpen(!open)}>
        <Icon name="down" size={12} className="chev" />
        <span>{title}</span>
        <div className="section-right" onClick={(e) => e.stopPropagation()}>{right}</div>
      </div>
      {open && <div className="section-body">{children}</div>}
    </div>
  );
}

export function Row({ label, children, wide }: { label: ReactNode; children: ReactNode; wide?: boolean }) {
  return (
    <label className={`row ${wide ? 'wide' : ''}`}>
      <span className="row-label">{label}</span>
      <div className="row-ctl">{children}</div>
    </label>
  );
}

export function Grid2({ children }: { children: ReactNode }) {
  return <div className="grid2">{children}</div>;
}

// ───────────────── Inputs ─────────────────
/** Number input with a scrubbable label (drag horizontally like pro motion apps) */
export function NumberField({ label, value, onChange, step = 1, min, max, suffix, precision }: {
  label?: string; value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number; suffix?: string; precision?: number;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const clampV = (v: number) => Math.min(max ?? Infinity, Math.max(min ?? -Infinity, v));
  const prec = precision ?? (step < 0.01 ? 3 : step < 0.1 ? 2 : step < 1 ? 1 : 0);
  const display = draft ?? (Number.isFinite(value) ? +value.toFixed(precision ?? Math.max(prec, 4)) : 0).toString();
  const startScrub = (e: React.PointerEvent) => {
    e.preventDefault();
    const x0 = e.clientX, v0 = value;
    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture(e.pointerId);
    const move = (ev: PointerEvent) => {
      const k = ev.shiftKey ? 10 : ev.altKey ? 0.1 : 1;
      const v = clampV(v0 + Math.round((ev.clientX - x0) / 2) * step * k);
      onChange(+v.toFixed(prec + 1));
    };
    const up = () => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
  };
  return (
    <div className="numfield">
      {label && <span className="scrub" onPointerDown={startScrub} title="Drag to adjust · Shift ×10 · Alt ×0.1">{label}</span>}
      <input
        type="text" inputMode="decimal" value={display}
        onFocus={(e) => { setDraft(display); e.target.select(); }}
        onChange={(e) => {
          setDraft(e.target.value);
          const v = parseFloat(e.target.value);
          if (Number.isFinite(v)) onChange(clampV(v));
        }}
        onBlur={() => setDraft(null)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
            const k = (e.shiftKey ? 10 : 1) * (e.key === 'ArrowUp' ? 1 : -1);
            const v = clampV(+(value + step * k).toFixed(prec + 1));
            onChange(v); setDraft(String(+v.toFixed(prec)));
          }
        }}
      />
      {suffix && <span className="numfield-suffix">{suffix}</span>}
    </div>
  );
}

export function Slider({ value, onChange, min, max, step = 0.01, suffix, precision }: {
  value: number; onChange: (v: number) => void; min: number; max: number; step?: number; suffix?: string; precision?: number;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="slider">
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)} style={{ ['--pct' as string]: `${Math.max(0, Math.min(100, pct))}%` }} />
      <NumberField value={value} onChange={onChange} step={step} min={min} max={max * 10} suffix={suffix} precision={precision} />
    </div>
  );
}

export function TextField({ value, onChange, placeholder, multiline, dir }: { value: string; onChange: (v: string) => void; placeholder?: string; multiline?: boolean; dir?: 'rtl' | 'ltr' | 'auto' }) {
  return multiline ? (
    <textarea className="text-input" dir={dir ?? 'auto'} rows={3} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
  ) : (
    <input className="text-input" dir={dir ?? 'auto'} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
  );
}

export function Select<T extends string | number>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <div className="select">
      <select value={String(value)} onChange={(e) => {
        const o = options.find((o) => String(o.value) === e.target.value);
        if (o) onChange(o.value);
      }}>
        {options.map((o) => <option key={String(o.value)} value={String(o.value)}>{o.label}</option>)}
      </select>
      <Icon name="down" size={12} />
    </div>
  );
}

export function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" className={`toggle ${value ? 'on' : ''}`} onClick={(e) => { e.preventDefault(); onChange(!value); }} role="switch" aria-checked={value}>
      <span />
    </button>
  );
}

export function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode; title?: string }[] }) {
  return (
    <div className="segmented">
      {options.map((o) => (
        <button type="button" key={o.value} title={o.title} className={o.value === value ? 'on' : ''} onClick={(e) => { e.preventDefault(); onChange(o.value); }}>{o.label}</button>
      ))}
    </div>
  );
}

/** Color field: brand palette references ($0…) or any custom color */
export function ColorField({ value, onChange, allowPalette = true }: { value: string; onChange: (v: string) => void; allowPalette?: boolean }) {
  const palette = useStore((s) => s.project.palette.colors);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const resolved = resolveColor(value, palette, '#000000');
  const isRef = value?.[0] === '$';
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    window.addEventListener('mousedown', h);
    return () => window.removeEventListener('mousedown', h);
  }, [open]);
  return (
    <div className="colorfield" ref={ref}>
      <button type="button" className="swatch-btn" onClick={(e) => { e.preventDefault(); setOpen(!open); }}>
        <span className="swatch" style={{ background: resolved }} />
        <span className="color-text">{isRef ? `Brand ${parseInt(value.slice(1)) + 1}` : value}</span>
        {isRef && <span className="badge">LINKED</span>}
      </button>
      {open && (
        <div className="color-pop">
          {allowPalette && (
            <>
              <div className="pop-label">Brand palette <span className="muted">— linked, updates with palette</span></div>
              <div className="pop-swatches">
                {palette.map((c, i) => (
                  <button key={i} type="button" className={`pop-sw ${value === '$' + i ? 'sel' : ''}`} style={{ background: c }} title={`Brand ${i + 1}`} onClick={() => { onChange('$' + i); setOpen(false); }} />
                ))}
              </div>
            </>
          )}
          <div className="pop-label">Custom</div>
          <div className="pop-custom">
            <input type="color" value={/^#[0-9a-f]{6}$/i.test(resolved) ? resolved : '#ffffff'} onChange={(e) => onChange(e.target.value)} />
            <input className="text-input mono" value={isRef ? resolved : value} onChange={(e) => onChange(e.target.value)} />
          </div>
          <div className="pop-swatches">
            {['#ffffff', '#e5e5ea', '#8e8e98', '#3a3a3c', '#17171c', '#000000', '#30d158', '#ff453a'].map((c) => (
              <button key={c} type="button" className="pop-sw" style={{ background: c }} onClick={() => { onChange(c); setOpen(false); }} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function Button({ children, onClick, variant = 'default', icon, disabled, title, className = '' }: {
  children?: ReactNode; onClick?: () => void; variant?: 'default' | 'primary' | 'ghost' | 'danger'; icon?: string; disabled?: boolean; title?: string; className?: string;
}) {
  return (
    <button type="button" className={`btn btn-${variant} ${className}`} onClick={onClick} disabled={disabled} title={title}>
      {icon && <Icon name={icon} size={15} />}
      {children}
    </button>
  );
}

export function Modal({ title, onClose, children, width = 560, footer }: { title: string; onClose: () => void; children: ReactNode; width?: number; footer?: ReactNode }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <div className="modal-back" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ width }}>
        <div className="modal-head">
          <h2>{title}</h2>
          <IconButton icon="x" title="Close" onClick={onClose} />
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}
