import { useRef, useState } from 'react';
import { selectedElement, useStore, type Panel } from '../store';
import type { BaseElement, EasingName, Entrance } from '../types';
import { ARABIC_FONTS, BUILTIN_PALETTES, LATIN_FONTS } from '../defaults';
import { EASING_LABELS, getEasing } from '../lib/easing';
import { removeFont, uploadFont, useCustomFonts } from '../lib/fonts';
import { FIELDS, STAGGERED } from './fields';
import { FieldControl } from './FieldControl';
import { DataEditor, DataSheet } from './DataEditor';
import { Button, ColorField, Grid2, Icon, IconButton, NumberField, Row, Section, Segmented, Select, Slider, TextField, Toggle } from './ui';

const TABS: { id: Panel; label: string }[] = [
  { id: 'element', label: 'Design' }, { id: 'data', label: 'Data' }, { id: 'canvas', label: 'Canvas' }, { id: 'brand', label: 'Brand' },
];

export function Inspector() {
  const panel = useStore((s) => s.panel);
  const el = useStore(selectedElement);
  return (
    <aside className="inspector">
      <div className="tabs">
        {TABS.map((t) => (
          <button key={t.id} className={panel === t.id ? 'on' : ''} onClick={() => useStore.getState().setPanel(t.id)}>{t.label}</button>
        ))}
      </div>
      <div className="inspector-body">
        {panel === 'element' && (el ? <ElementPanel el={el} /> : <NoSelection />)}
        {panel === 'data' && (el ? <ElementData el={el} /> : <DataSheet />)}
        {panel === 'canvas' && <CanvasPanel />}
        {panel === 'brand' && <BrandPanel />}
      </div>
    </aside>
  );
}

function NoSelection() {
  return (
    <div className="no-sel">
      <div className="no-sel-icon"><Icon name="grid" size={28} /></div>
      <h3>Nothing selected</h3>
      <p>Select an element on the canvas, in the layers list or on the timeline to edit its design and animation.</p>
      <div className="shortcuts">
        <div><kbd>Space</kbd> Play / pause</div>
        <div><kbd>⌘Z</kbd> Undo · <kbd>⇧⌘Z</kbd> Redo</div>
        <div><kbd>⌘D</kbd> Duplicate · <kbd>⌫</kbd> Delete</div>
        <div><kbd>←↑→↓</kbd> Nudge (⇧ ×10)</div>
        <div><kbd>,</kbd> <kbd>.</kbd> Step frame</div>
      </div>
    </div>
  );
}

function ElementData({ el }: { el: BaseElement }) {
  return (
    <>
      <div className="el-header">
        <Icon name={el.type} size={16} /><span>{el.name}</span>
        <button className="link" onClick={() => useStore.getState().select(null)}>All data →</button>
      </div>
      <Section title="Values">
        <DataEditor el={el} />
      </Section>
      <FormatSection el={el} />
    </>
  );
}

function FormatSection({ el }: { el: BaseElement }) {
  if (el.type === 'text') return null;
  const up = (fn: (e: BaseElement) => void, k: string) => useStore.getState().updateElement(el.id, fn, k);
  const f = el.format;
  return (
    <Section title="Number format">
      <Grid2>
        <Row label="Prefix"><TextField value={f.prefix} onChange={(v) => up((e) => { e.format.prefix = v; }, 'fpre')} placeholder="$" /></Row>
        <Row label="Suffix"><TextField value={f.suffix} onChange={(v) => up((e) => { e.format.suffix = v; }, 'fsuf')} placeholder="%" /></Row>
      </Grid2>
      <Row label="Decimals"><NumberField value={f.decimals} min={0} max={6} step={1} onChange={(v) => up((e) => { e.format.decimals = Math.round(v); }, 'fdec')} /></Row>
      <Row label="Thousands separator"><Toggle value={f.thousands} onChange={(v) => up((e) => { e.format.thousands = v; }, 'fth')} /></Row>
      <Row label="Compact (K / M / B)"><Toggle value={f.compact} onChange={(v) => up((e) => { e.format.compact = v; }, 'fcmp')} /></Row>
      <Row label="Digits">
        <Segmented value={f.digits} onChange={(v) => up((e) => { e.format.digits = v; }, 'fdig')} options={[{ value: 'latin', label: '123' }, { value: 'arabic', label: '١٢٣' }]} />
      </Row>
    </Section>
  );
}

function EasingCurve({ name, bezier }: { name: EasingName; bezier: [number, number, number, number] }) {
  const fn = getEasing(name, bezier);
  const pts: string[] = [];
  for (let i = 0; i <= 60; i++) { const x = i / 60; pts.push(`${(x * 100).toFixed(1)},${(80 - fn(x) * 60).toFixed(1)}`); }
  return (
    <svg className="curve" viewBox="-4 0 108 100" preserveAspectRatio="none">
      <line x1="0" y1="80" x2="100" y2="80" className="axis" />
      <line x1="0" y1="20" x2="100" y2="20" className="axis" />
      <polyline points={pts.join(' ')} />
    </svg>
  );
}

function ElementPanel({ el }: { el: BaseElement }) {
  const st = useStore.getState;
  const up = (fn: (e: BaseElement) => void, k: string) => st().updateElement(el.id, fn, k);
  const latin = useCustomFonts();
  const fonts = [...latin, ...LATIN_FONTS, ...ARABIC_FONTS];
  const stagger = STAGGERED[el.type];
  const a = el.anim;
  const styleFields = FIELDS[el.type].filter((f) => !f.data);
  const dataFields = FIELDS[el.type].filter((f) => f.data);

  return (
    <>
      <div className="el-header">
        <Icon name={el.type} size={16} />
        <input dir="auto" value={el.name} onChange={(e) => up((t) => { t.name = e.target.value; }, 'name')} />
        <IconButton icon="copy" title="Duplicate (⌘D)" onClick={() => st().duplicateElement(el.id)} />
        <IconButton icon="trash" title="Delete (⌫)" onClick={() => st().removeElement(el.id)} />
      </div>

      {dataFields.length > 0 && (
        <Section title="Content">
          {dataFields.map((f) => <FieldControl key={f.key} el={el} f={f} />)}
          {['bar', 'pie', 'line', 'kpi'].includes(el.type) && (
            <button className="link" onClick={() => st().setPanel('data')}>Edit data table →</button>
          )}
        </Section>
      )}
      {['bar', 'pie', 'line'].includes(el.type) && !dataFields.length && (
        <Section title="Content">
          <p className="hint">{el.data.labels.length} rows · {el.data.series.length} series</p>
          <button className="link" onClick={() => st().setPanel('data')}>Edit data table →</button>
        </Section>
      )}

      <Section title="Transform">
        <Grid2>
          <NumberField label="X" value={el.x} onChange={(v) => up((t) => { t.x = v; }, 'x')} />
          <NumberField label="Y" value={el.y} onChange={(v) => up((t) => { t.y = v; }, 'y')} />
          <NumberField label="W" value={el.w} min={10} onChange={(v) => up((t) => { t.w = v; }, 'w')} />
          <NumberField label="H" value={el.h} min={10} onChange={(v) => up((t) => { t.h = v; }, 'h')} />
          <NumberField label="R" value={el.rotation} suffix="°" onChange={(v) => up((t) => { t.rotation = v; }, 'rot')} />
          <NumberField label="α" value={Math.round(el.opacity * 100)} min={0} max={100} suffix="%" onChange={(v) => up((t) => { t.opacity = v / 100; }, 'op')} />
        </Grid2>
        <div className="align-row">
          <Button variant="ghost" onClick={() => up((t) => { t.x = Math.round((st().project.canvas.width - t.w) / 2); }, 'ax')}>Center H</Button>
          <Button variant="ghost" onClick={() => up((t) => { t.y = Math.round((st().project.canvas.height - t.h) / 2); }, 'ay')}>Center V</Button>
        </div>
      </Section>

      <Section title={el.type === 'text' ? 'Text style' : 'Chart style'}>
        {styleFields.map((f) => <FieldControl key={f.key} el={el} f={f} />)}
        {el.type !== 'text' && el.type !== 'counter' && el.type !== 'growth' && (
          <Row label={el.type === 'ring' ? 'Ring thickness' : el.type === 'line' ? 'Line width' : 'Stroke width'}>
            <Slider value={el.strokeWidth} min={1} max={el.type === 'ring' ? 120 : 40} step={0.5} onChange={(v) => up((t) => { t.strokeWidth = v; }, 'sw')} suffix="px" precision={1} />
          </Row>
        )}
        {el.type !== 'text' && el.type !== 'counter' && el.type !== 'line' && (
          <Row label={el.type === 'ring' ? 'Rounded caps' : el.type === 'pie' ? 'Rounded slices' : 'Corner radius'}>
            {el.type === 'ring' || el.type === 'pie'
              ? <Toggle value={el.radius > 0} onChange={(v) => up((t) => { t.radius = v ? 1 : 0; }, 'rad')} />
              : <Slider value={Math.min(el.radius, 200)} min={0} max={200} step={1} onChange={(v) => up((t) => { t.radius = v; }, 'rad')} suffix="px" />}
          </Row>
        )}
      </Section>

      <Section title="Typography">
        <Row label="Font">
          <Select value={el.font} onChange={(v) => up((t) => { t.font = v; }, 'font')} options={[{ value: '', label: 'Brand fonts (Latin + Arabic)' }, ...fonts.map((f) => ({ value: f, label: f }))]} />
        </Row>
        <Row label="Weight">
          <Select value={el.fontWeight} onChange={(v) => up((t) => { t.fontWeight = v; }, 'fw')} options={[300, 400, 500, 600, 700, 800, 900].map((w) => ({ value: w, label: `${w} · ${({ 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'Semibold', 700: 'Bold', 800: 'Extra Bold', 900: 'Black' } as Record<number, string>)[w]}` }))} />
        </Row>
        <Row label="Text scale"><Slider value={el.fontScale} min={0.3} max={3} step={0.01} onChange={(v) => up((t) => { t.fontScale = v; }, 'fs')} /></Row>
        <Row label="Primary text"><ColorField value={el.textColor} onChange={(v) => up((t) => { t.textColor = v; }, 'tc')} /></Row>
        {el.type !== 'text' && <Row label="Secondary text"><ColorField value={el.mutedColor} onChange={(v) => up((t) => { t.mutedColor = v; }, 'mc')} /></Row>}
      </Section>

      {el.type !== 'text' && <FormatSection el={el} />}

      <Section title="Animation">
        <Grid2>
          <NumberField label="Delay" value={a.delay} step={0.05} min={0} suffix="s" onChange={(v) => up((t) => { t.anim.delay = v; }, 'delay')} />
          <NumberField label="Dur" value={a.duration} step={0.05} min={0.05} suffix="s" onChange={(v) => up((t) => { t.anim.duration = v; }, 'dur')} />
        </Grid2>
        <Row label="Easing">
          <Select value={a.easing} onChange={(v) => up((t) => { t.anim.easing = v; }, 'ease')} options={(Object.keys(EASING_LABELS) as EasingName[]).map((k) => ({ value: k, label: EASING_LABELS[k] }))} />
        </Row>
        <EasingCurve name={a.easing} bezier={a.bezier} />
        {a.easing === 'custom' && (
          <div className="bezier">
            <span className="muted small">cubic-bezier(</span>
            {a.bezier.map((b, i) => (
              <NumberField key={i} value={b} step={0.01} min={i % 2 === 0 ? 0 : -1} max={i % 2 === 0 ? 1 : 2} precision={2}
                onChange={(v) => up((t) => { const nb = [...t.anim.bezier] as [number, number, number, number]; nb[i] = v; t.anim.bezier = nb; }, 'bz' + i)} />
            ))}
            <span className="muted small">)</span>
          </div>
        )}
        {stagger && (
          <Row label={stagger}><Slider value={a.stagger} min={0} max={1.5} step={0.01} suffix="s" onChange={(v) => up((t) => { t.anim.stagger = v; }, 'stag')} /></Row>
        )}
        <Row label="Entrance">
          <Select value={a.entrance} onChange={(v) => up((t) => { t.anim.entrance = v; }, 'ent')} options={([
            ['none', 'None'], ['fade', 'Fade'], ['slideUp', 'Slide up'], ['slideDown', 'Slide down'], ['slideLeft', 'Slide left'], ['slideRight', 'Slide right'], ['scale', 'Scale'], ['blur', 'Blur in'],
          ] as [Entrance, string][]).map(([value, label]) => ({ value, label }))} />
        </Row>
        {a.entrance !== 'none' && (
          <Row label="Entrance time"><Slider value={a.entranceDuration} min={0.05} max={3} step={0.05} suffix="s" onChange={(v) => up((t) => { t.anim.entranceDuration = v; }, 'entd')} /></Row>
        )}
        <div className="align-row">
          <Button variant="ghost" onClick={() => { st().setTime(a.delay); st().setPlaying(true); }}>▶ Preview from here</Button>
        </div>
      </Section>
    </>
  );
}

const SIZE_PRESETS = [
  { label: 'Full HD 16:9 · 1920×1080', w: 1920, h: 1080 },
  { label: '4K UHD 16:9 · 3840×2160', w: 3840, h: 2160 },
  { label: 'Vertical 9:16 · 1080×1920', w: 1080, h: 1920 },
  { label: 'Square 1:1 · 1080×1080', w: 1080, h: 1080 },
  { label: 'Portrait 4:5 · 1080×1350', w: 1080, h: 1350 },
  { label: 'HD 16:9 · 1280×720', w: 1280, h: 720 },
  { label: 'Ultrawide 21:9 · 2560×1080', w: 2560, h: 1080 },
];

function CanvasPanel() {
  const c = useStore((s) => s.project.canvas);
  const name = useStore((s) => s.project.name);
  const st = useStore.getState;
  const up = (fn: (p: ReturnType<typeof st>['project']) => void, k: string) => st().update(fn, k);
  const preset = SIZE_PRESETS.find((p) => p.w === c.width && p.h === c.height);
  const resize = (w: number, h: number, rescale: boolean) => up((p) => {
    if (rescale) {
      const sx = w / p.canvas.width, sy = h / p.canvas.height, s = Math.min(sx, sy);
      const ox = (w - p.canvas.width * s) / 2, oy = (h - p.canvas.height * s) / 2;
      for (const e of p.elements) {
        e.x = Math.round(e.x * s + ox); e.y = Math.round(e.y * s + oy); e.w = Math.round(e.w * s); e.h = Math.round(e.h * s);
        e.strokeWidth *= s;
        if (e.type === 'text') e.props.size = Math.round(Number(e.props.size) * s);
        else if (e.type !== 'ring' && e.type !== 'pie') e.radius = Math.round(e.radius * s);
      }
    }
    p.canvas.width = w; p.canvas.height = h;
  }, 'size');
  const [rescale, setRescale] = useState(true);
  return (
    <>
      <Section title="Project">
        <Row label="Name"><TextField value={name} onChange={(v) => up((p) => { p.name = v; }, 'pname')} /></Row>
      </Section>
      <Section title="Dimensions">
        <Row label="Preset">
          <Select value={preset ? preset.label : 'custom'} onChange={(v) => { const p = SIZE_PRESETS.find((x) => x.label === v); if (p) resize(p.w, p.h, rescale); }}
            options={[...SIZE_PRESETS.map((p) => ({ value: p.label, label: p.label })), ...(preset ? [] : [{ value: 'custom', label: `Custom · ${c.width}×${c.height}` }])]} />
        </Row>
        <Grid2>
          <NumberField label="W" value={c.width} min={16} max={8192} suffix="px" onChange={(v) => resize(Math.round(v), c.height, false)} />
          <NumberField label="H" value={c.height} min={16} max={8192} suffix="px" onChange={(v) => resize(c.width, Math.round(v), false)} />
        </Grid2>
        <Row label="Scale layout with preset"><Toggle value={rescale} onChange={setRescale} /></Row>
      </Section>
      <Section title="Background">
        <Row label="Transparent"><Toggle value={c.transparent} onChange={(v) => up((p) => { p.canvas.transparent = v; }, 'tr')} /></Row>
        {!c.transparent && <Row label="Color"><ColorField value={c.background} onChange={(v) => up((p) => { p.canvas.background = v; }, 'bg')} /></Row>}
        {c.transparent && <p className="hint">Transparency is preserved in WebM (VP9 alpha) and PNG sequence exports. MP4 will use the background color.</p>}
      </Section>
      <Section title="Direction & language">
        <Row label="Layout direction">
          <Segmented value={c.direction} onChange={(v) => {
            up((p) => { p.canvas.direction = v; }, 'dir');
          }} options={[{ value: 'ltr', label: <><Icon name="ltr" size={14} /> LTR</> }, { value: 'rtl', label: <><Icon name="rtl" size={14} /> RTL</> }]} />
        </Row>
        <p className="hint">RTL mirrors charts, axis order, alignment and text flow for Arabic layouts.</p>
        <div className="align-row">
          <Button variant="ghost" onClick={() => up((p) => { p.elements.forEach((e) => { e.format.digits = 'arabic'; }); }, 'dig')}>All digits ١٢٣</Button>
          <Button variant="ghost" onClick={() => up((p) => { p.elements.forEach((e) => { e.format.digits = 'latin'; }); }, 'dig')}>All digits 123</Button>
        </div>
      </Section>
      <Section title="Timing">
        <Row label="Duration"><NumberField value={c.duration} step={0.1} min={0.5} max={120} suffix="s" onChange={(v) => up((p) => { p.canvas.duration = v; }, 'duration')} /></Row>
        <div className="align-row"><Button variant="ghost" onClick={() => st().fitDuration()}>Fit to animations</Button></div>
      </Section>
    </>
  );
}

function BrandPanel() {
  const project = useStore((s) => s.project);
  const saved = useStore((s) => s.palettes);
  const custom = useCustomFonts();
  const st = useStore.getState;
  const fileRef = useRef<HTMLInputElement>(null);
  const [palName, setPalName] = useState('');
  const c = project.canvas;
  const pal = project.palette.colors;
  const up = (fn: (p: typeof project) => void, k: string) => st().update(fn, k);

  return (
    <>
      <Section title="Brand fonts">
        <Row label="Latin font">
          <Select value={c.latinFont} onChange={(v) => up((p) => { p.canvas.latinFont = v; }, 'lf')} options={[...custom, ...LATIN_FONTS].map((f) => ({ value: f, label: f }))} />
        </Row>
        <Row label="Arabic font">
          <Select value={c.arabicFont} onChange={(v) => up((p) => { p.canvas.arabicFont = v; }, 'af')} options={[...custom, ...ARABIC_FONTS].map((f) => ({ value: f, label: f }))} />
        </Row>
        <div className="font-preview" style={{ fontFamily: `"${c.latinFont}", "${c.arabicFont}"` }}>
          <span>Aa 0123</span><span dir="rtl">أبجد ٠١٢٣</span>
        </div>
        <p className="hint">Mixed text automatically uses the Latin font for English and the Arabic font for Arabic glyphs.</p>
        <input ref={fileRef} type="file" accept=".ttf,.otf,.woff,.woff2" hidden onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          try { const fam = await uploadFont(f); st().notify(`Font “${fam}” installed`); } catch { st().notify('Could not load that font file'); }
          e.target.value = '';
        }} />
        <Button icon="upload" onClick={() => fileRef.current?.click()}>Upload font (TTF, OTF, WOFF)</Button>
        {custom.length > 0 && (
          <div className="font-list">
            {custom.map((f) => (
              <div key={f} className="font-item">
                <span style={{ fontFamily: `"${f}"` }}>{f}</span>
                <IconButton size={12} icon="trash" title="Remove font" onClick={() => removeFont(f)} />
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Brand palette" right={<span className="muted small">{project.palette.name}</span>}>
        <div className="palette-edit">
          {pal.map((col, i) => (
            <div key={i} className="pal-slot">
              <label className="pal-color" style={{ background: col }}>
                <input type="color" value={/^#[0-9a-f]{6}$/i.test(col) ? col : '#ffffff'} onChange={(e) => up((p) => { p.palette.colors[i] = e.target.value; }, 'pc' + i)} />
              </label>
              <input className="pal-hex mono" value={col} onChange={(e) => up((p) => { p.palette.colors[i] = e.target.value; }, 'pc' + i)} />
              {pal.length > 1 && <IconButton size={11} icon="x" title="Remove color" onClick={() => up((p) => { p.palette.colors.splice(i, 1); }, '')} />}
            </div>
          ))}
          {pal.length < 12 && (
            <button className="pal-add" onClick={() => up((p) => { p.palette.colors.push('#ffffff'); }, '')} title="Add color"><Icon name="plus" size={14} /></button>
          )}
        </div>
        <p className="hint">Elements linked to brand colors update instantly when you edit or swap the palette.</p>
        <div className="save-pal">
          <input className="text-input" placeholder="Palette name" value={palName} onChange={(e) => setPalName(e.target.value)} />
          <Button icon="save" onClick={() => { st().savePalette(palName.trim() || `Palette ${saved.length + 1}`); setPalName(''); }}>Save</Button>
        </div>
      </Section>

      <Section title="Saved palettes">
        <div className="pal-list">
          {[...saved, ...BUILTIN_PALETTES].map((p) => (
            <div key={p.id} className="pal-row" onClick={() => st().applyPalette(p)} title="Apply palette">
              <div className="pal-strip">{p.colors.map((c, i) => <span key={i} style={{ background: c }} />)}</div>
              <span className="pal-name">{p.name}</span>
              {saved.some((s) => s.id === p.id) && (
                <span onClick={(e) => e.stopPropagation()}><IconButton size={12} icon="trash" title="Delete palette" onClick={() => st().deletePalette(p.id)} /></span>
              )}
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
