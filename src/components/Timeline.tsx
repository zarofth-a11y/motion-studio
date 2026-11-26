import { useRef, useState } from 'react';
import { useStore } from '../store';
import { Icon, IconButton, NumberField, Select } from './ui';
import type { BaseElement } from '../types';
import { resolveColor } from '../lib/color';
import { useT } from '../i18n';

const TRACK_H = 30;

export function itemCount(el: BaseElement) {
  if (el.type === 'bar' || el.type === 'pie') return Math.max(1, el.data.labels.length);
  if (el.type === 'line') return Math.max(1, el.data.series.length);
  if (el.type === 'text') return String(el.props.text ?? '').split('\n').length;
  return 1;
}

export function fmtTime(t: number, fps: number) {
  const s = Math.floor(t);
  const f = Math.floor((t - s) * fps + 1e-6);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}:${String(f).padStart(2, '0')}`;
}

export function Timeline() {
  const project = useStore((s) => s.project);
  const time = useStore((s) => s.time);
  const playing = useStore((s) => s.playing);
  const loop = useStore((s) => s.loop);
  const selectedId = useStore((s) => s.selectedId);
  const t = useT();
  const [fps, setFps] = useState(30);
  const [pxPerSec, setPx] = useState(140);
  const areaRef = useRef<HTMLDivElement>(null);
  const st = useStore.getState;
  const D = project.canvas.duration;
  const width = Math.max(D * pxPerSec, 200);
  const frame = 1 / fps;

  const timeAt = (clientX: number) => {
    const r = areaRef.current!.getBoundingClientRect();
    return Math.max(0, Math.min(D, (clientX - r.left + areaRef.current!.scrollLeft) / pxPerSec));
  };
  const scrub = (e: React.PointerEvent) => {
    st().setPlaying(false);
    const snap = (t: number) => (e.shiftKey ? t : Math.round(t * fps) / fps);
    st().setTime(snap(timeAt(e.clientX)));
    const tgt = e.currentTarget as HTMLElement;
    tgt.setPointerCapture(e.pointerId);
    const mv = (ev: PointerEvent) => st().setTime(ev.shiftKey ? timeAt(ev.clientX) : Math.round(timeAt(ev.clientX) * fps) / fps);
    const up = () => { tgt.removeEventListener('pointermove', mv); tgt.removeEventListener('pointerup', up); };
    tgt.addEventListener('pointermove', mv); tgt.addEventListener('pointerup', up);
  };

  const dragClip = (e: React.PointerEvent, el: BaseElement, mode: 'move' | 'start' | 'end') => {
    e.stopPropagation();
    st().select(el.id);
    const x0 = e.clientX;
    const { delay, duration } = el.anim;
    const tgt = e.currentTarget as HTMLElement;
    tgt.setPointerCapture(e.pointerId);
    const q = (v: number) => Math.round(v * fps) / fps;
    const mv = (ev: PointerEvent) => {
      const dt = (ev.clientX - x0) / pxPerSec;
      st().updateElement(el.id, (t) => {
        if (mode === 'move') t.anim.delay = Math.max(0, q(delay + dt));
        if (mode === 'end') t.anim.duration = Math.max(frame, q(duration + dt));
        if (mode === 'start') {
          const nd = Math.max(0, Math.min(delay + duration - frame, q(delay + dt)));
          t.anim.duration = delay + duration - nd;
          t.anim.delay = nd;
        }
      }, 'clip-' + mode);
    };
    const up = () => { tgt.removeEventListener('pointermove', mv); tgt.removeEventListener('pointerup', up); };
    tgt.addEventListener('pointermove', mv); tgt.addEventListener('pointerup', up);
  };

  // ruler ticks
  const step = pxPerSec >= 200 ? 0.25 : pxPerSec >= 90 ? 0.5 : 1;
  const ticks: number[] = [];
  for (let t = 0; t <= D + 1e-6; t += step) ticks.push(+t.toFixed(3));

  return (
    <div className="timeline">
      <div className="tl-bar">
        <div className="transport">
          <IconButton icon="start" title={t('Go to start (Home)')} onClick={() => { st().setTime(0); }} />
          <IconButton icon="prev" title={t('Previous frame (,)')} onClick={() => st().setTime(time - frame)} />
          <button className="play-btn" onClick={() => st().togglePlay()} title={t('Play / Pause (Space)')}>
            <Icon name={playing ? 'pause' : 'play'} size={16} />
          </button>
          <IconButton icon="next" title={t('Next frame (.)')} onClick={() => st().setTime(time + frame)} />
          <IconButton icon="end" title={t('Go to end (End)')} onClick={() => st().setTime(D)} />
          <IconButton icon="loop" title={t('Loop playback')} active={loop} onClick={() => st().setLoop(!loop)} />
        </div>
        <div className="timecode" dir="ltr">
          <span className="tc-main">{fmtTime(time, fps)}</span>
          <span className="tc-sub">/ {fmtTime(D, fps)} · F{Math.round(time * fps)}</span>
        </div>
        <div className="tl-right">
          <span className="muted small">{t('Preview FPS')}</span>
          <Select value={fps} onChange={setFps} options={[{ value: 25, label: '25' }, { value: 30, label: '30' }, { value: 60, label: '60' }]} />
          <span className="muted small">{t('Duration')}</span>
          <div style={{ width: 74 }}>
            <NumberField value={D} step={0.1} min={0.5} max={120} suffix={t('s')} onChange={(v) => st().update((p) => { p.canvas.duration = v; }, 'duration')} />
          </div>
          <button className="btn btn-ghost small" onClick={() => st().fitDuration()} title={t('Set duration to fit all animations + 1s hold')}>{t('Fit')}</button>
          <input className="tl-zoom" type="range" min={40} max={400} value={pxPerSec} onChange={(e) => setPx(+e.target.value)} title={t('Timeline zoom')} />
        </div>
      </div>
      <div className="tl-main">
        <div className="tl-names">
          <div className="tl-ruler-spacer" />
          {[...project.elements].reverse().map((el) => (
            <div key={el.id} className={`tl-name ${selectedId === el.id ? 'sel' : ''} ${!el.visible ? 'dim' : ''}`} style={{ height: TRACK_H }} onClick={() => st().select(el.id)}>
              <Icon name={el.type} size={13} />
              <span>{el.name}</span>
            </div>
          ))}
        </div>
        <div className="tl-area" ref={areaRef} dir="ltr">
          <div style={{ width: width + 40, position: 'relative' }}>
            <div className="tl-ruler" onPointerDown={scrub}>
              {ticks.map((tk) => (
                <div key={tk} className={`tick ${Number.isInteger(tk) ? 'major' : ''}`} style={{ left: tk * pxPerSec }}>
                  {Number.isInteger(tk) && <span>{tk}s</span>}
                </div>
              ))}
            </div>
            <div className="tl-tracks" onPointerDown={scrub}>
              {[...project.elements].reverse().map((el) => {
                const a = el.anim;
                const n = itemCount(el);
                const tail = Math.max(0, n - 1) * a.stagger;
                const color = resolveColor(
                  el.type === 'ring' ? String(el.props.color ?? '$0') : el.type === 'kpi' ? String(el.props.accent ?? '$0') : el.data.series[0]?.color ?? '$0',
                  project.palette.colors,
                );
                return (
                  <div key={el.id} className={`tl-track ${selectedId === el.id ? 'sel' : ''}`} style={{ height: TRACK_H }}>
                    <div
                      className={`clip ${selectedId === el.id ? 'sel' : ''} ${!el.visible ? 'dim' : ''}`}
                      style={{ left: a.delay * pxPerSec, width: Math.max(6, (a.duration + tail) * pxPerSec), ['--clip' as string]: color }}
                      onPointerDown={(e) => dragClip(e, el, 'move')}
                      title={`${el.name}: ${a.delay.toFixed(2)}s → ${(a.delay + a.duration + tail).toFixed(2)}s`}
                    >
                      {a.entrance !== 'none' && <div className="clip-in" style={{ width: Math.min(a.entranceDuration, a.duration + tail) * pxPerSec }} />}
                      {tail > 0 && <div className="clip-tail" style={{ width: tail * pxPerSec }} />}
                      <span className="clip-label">{el.name}</span>
                      <span className="clip-h l" onPointerDown={(e) => dragClip(e, el, 'start')} />
                      <span className="clip-h r" onPointerDown={(e) => dragClip(e, el, 'end')} />
                    </div>
                  </div>
                );
              })}
              {project.elements.length === 0 && <div className="tl-empty">{t('Add an element from the library to start animating')}</div>}
            </div>
            <div className="tl-end" style={{ left: D * pxPerSec }} />
            <div className="playhead" style={{ left: time * pxPerSec }}><span /></div>
          </div>
        </div>
      </div>
    </div>
  );
}
