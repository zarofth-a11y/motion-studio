import { useStore } from '../store';
import type { BaseElement } from '../types';
import type { FieldDef } from './fields';
import { useT } from '../i18n';
import { ColorField, NumberField, Row, Segmented, Select, Slider, TextField, Toggle } from './ui';

export function FieldControl({ el, f }: { el: BaseElement; f: FieldDef }) {
  const t = useT();
  if (f.show && !f.show(el)) return null;
  const v = el.props[f.key];
  const set = (val: number | string | boolean) =>
    useStore.getState().updateElement(el.id, (e) => { e.props[f.key] = val; }, 'p:' + f.key);
  let ctl;
  switch (f.kind) {
    case 'num':
      ctl = <NumberField value={Number(v ?? 0)} onChange={set} step={f.step} min={f.min} max={f.max} suffix={f.suffix && t(f.suffix)} />; break;
    case 'slider':
      ctl = <Slider value={Number(v ?? 0)} onChange={set} min={f.min ?? 0} max={f.max ?? 1} step={f.step} suffix={f.suffix} />; break;
    case 'text':
      ctl = <TextField value={String(v ?? '')} onChange={set} />; break;
    case 'textarea':
      ctl = <TextField multiline value={String(v ?? '')} onChange={set} />; break;
    case 'color':
      ctl = <ColorField value={String(v ?? '#ffffff')} onChange={set} />; break;
    case 'toggle':
      ctl = <Toggle value={!!v} onChange={set} />; break;
    case 'select':
      ctl = <Select value={String(v ?? '')} onChange={set} options={f.options!.map((o) => ({ ...o, label: t(o.label) }))} />; break;
    case 'segment':
      ctl = <Segmented value={String(v ?? '')} onChange={set} options={f.options!.map((o) => ({ ...o, label: t(o.label) }))} />; break;
  }
  return <Row label={t(f.label)} wide={f.kind === 'textarea'}>{ctl}</Row>;
}
