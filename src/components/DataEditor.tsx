import { useState } from 'react';
import { useStore } from '../store';
import type { BaseElement } from '../types';
import { FIELDS, HAS_TABLE, MULTI_SERIES } from './fields';
import { ColorField, Icon, IconButton, Button } from './ui';
import { FieldControl } from './FieldControl';

/** Parse CSV / TSV (e.g. pasted from Excel / Google Sheets) */
export function parseTable(text: string) {
  const rows = text.trim().split(/\r?\n/).map((r) => r.split(r.includes('\t') ? '\t' : /,|;/).map((c) => c.trim().replace(/^"|"$/g, '')));
  if (!rows.length) return null;
  const isNum = (s: string) => s !== '' && isFinite(+s.replace(/[,%$€£]/g, ''));
  const hasHeader = rows[0].slice(1).some((c) => !isNum(c)) || (rows.length > 1 && !isNum(rows[0][1] ?? '') );
  const header = hasHeader ? rows[0] : null;
  const body = hasHeader ? rows.slice(1) : rows;
  const nSeries = Math.max(1, ...body.map((r) => r.length - 1));
  return {
    labels: body.map((r) => r[0] ?? ''),
    series: Array.from({ length: nSeries }, (_, s) => ({
      name: header?.[s + 1] ?? `Series ${s + 1}`,
      values: body.map((r) => +(r[s + 1] ?? '0').replace(/[,%$€£]/g, '') || 0),
    })),
  };
}

export function DataEditor({ el }: { el: BaseElement }) {
  const st = useStore.getState;
  const [paste, setPaste] = useState<string | null>(null);
  const up = (fn: (e: BaseElement) => void, key?: string) => st().updateElement(el.id, fn, key);
  const fields = FIELDS[el.type].filter((f) => f.data);
  const multi = MULTI_SERIES[el.type];
  const series = el.data.series;

  return (
    <div className="data-editor">
      {fields.map((f) => <FieldControl key={f.key} el={el} f={f} />)}
      {HAS_TABLE[el.type] && (
        <>
          <div className="table-wrap">
            <table className="dtable">
              <thead>
                <tr>
                  <th className="lbl">{el.type === 'kpi' ? 'Point' : 'Label'}</th>
                  {series.map((s, si) => (
                    <th key={si}>
                      <div className="series-head">
                        {multi && <ColorField value={s.color} onChange={(c) => up((e) => { e.data.series[si].color = c; }, 'scol')} />}
                        <input dir="auto" value={s.name} onChange={(ev) => up((e) => { e.data.series[si].name = ev.target.value; }, 'sname' + si)} />
                        {multi && series.length > 1 && <IconButton size={12} icon="x" title="Remove series" onClick={() => up((e) => { e.data.series.splice(si, 1); })} />}
                      </div>
                    </th>
                  ))}
                  <th className="act" />
                </tr>
              </thead>
              <tbody>
                {el.data.labels.map((l, i) => (
                  <tr key={i}>
                    <td className="lbl"><input dir="auto" value={l} onChange={(ev) => up((e) => { e.data.labels[i] = ev.target.value; }, 'lbl' + i)} /></td>
                    {series.map((s, si) => (
                      <td key={si}>
                        <input
                          className="num" inputMode="decimal"
                          value={Number.isFinite(s.values[i]) ? String(s.values[i] ?? 0) : ''}
                          onChange={(ev) => {
                            const v = parseFloat(ev.target.value);
                            up((e) => { e.data.series[si].values[i] = Number.isFinite(v) ? v : 0; }, `v${si}_${i}`);
                          }}
                          onKeyDown={(ev) => {
                            if (ev.key === 'ArrowUp' || ev.key === 'ArrowDown') {
                              ev.preventDefault();
                              const d = (ev.shiftKey ? 10 : 1) * (ev.key === 'ArrowUp' ? 1 : -1);
                              up((e) => { e.data.series[si].values[i] = +((e.data.series[si].values[i] ?? 0) + d).toFixed(4); }, `v${si}_${i}`);
                            }
                          }}
                        />
                      </td>
                    ))}
                    <td className="act">
                      <IconButton size={12} icon="x" title="Remove row" onClick={() => up((e) => { e.data.labels.splice(i, 1); e.data.series.forEach((s) => s.values.splice(i, 1)); })} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="table-actions">
            <Button variant="ghost" icon="plus" onClick={() => up((e) => {
              e.data.labels.push(`Item ${e.data.labels.length + 1}`);
              e.data.series.forEach((s) => s.values.push(s.values[s.values.length - 1] ?? 10));
            })}>Row</Button>
            {multi && <Button variant="ghost" icon="plus" onClick={() => up((e) => {
              e.data.series.push({ name: `Series ${e.data.series.length + 1}`, color: '$' + e.data.series.length, values: e.data.labels.map((_, i) => Math.round((e.data.series[0]?.values[i] ?? 10) * 0.7)) });
            })}>Series</Button>}
            <Button variant="ghost" icon="file" onClick={() => setPaste(paste === null ? '' : null)}>Paste CSV</Button>
          </div>
          {paste !== null && (
            <div className="paste-box">
              <textarea dir="auto" autoFocus placeholder={'Paste from Excel / Sheets or CSV:\nMonth, 2025, 2026\nJan, 12, 18\nFeb, 19, 24'} value={paste} onChange={(e) => setPaste(e.target.value)} rows={6} />
              <div className="table-actions">
                <Button variant="primary" onClick={() => {
                  const t = parseTable(paste);
                  if (!t || !t.labels.length) { st().notify('Could not read that data'); return; }
                  up((e) => {
                    e.data.labels = t.labels;
                    const keep = multi ? t.series : t.series.slice(0, 1);
                    e.data.series = keep.map((s, i) => ({ name: s.name, color: e.data.series[i]?.color ?? '$' + i, values: s.values }));
                  });
                  setPaste(null);
                  st().notify(`Imported ${t.labels.length} rows`);
                }}>Apply data</Button>
                <Button variant="ghost" onClick={() => setPaste(null)}>Cancel</Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** Data sheet: every element's numbers in one place — swap data without touching the animation */
export function DataSheet() {
  const elements = useStore((s) => s.project.elements);
  const st = useStore.getState;
  const withData = elements.filter((e) => FIELDS[e.type].some((f) => f.data) || HAS_TABLE[e.type]);
  return (
    <div className="data-sheet">
      <p className="hint">
        <Icon name="sparkle" size={13} /> Edit the numbers of every element here. Animations, styles and timing stay exactly as designed — perfect for reusing a branded template with new data.
      </p>
      {withData.map((el) => (
        <div key={el.id} className="sheet-item">
          <div className="sheet-head" onClick={() => st().select(el.id)}>
            <Icon name={el.type} size={13} /> <span>{el.name}</span>
          </div>
          <DataEditor el={el} />
        </div>
      ))}
      {!withData.length && <div className="empty-hint">No data-driven elements yet.</div>}
    </div>
  );
}
