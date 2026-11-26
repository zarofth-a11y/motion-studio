import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { download, gifSize, outputSize, renderStill, runExport, webCodecsAvailable, type ExportFormat, type ExportOptions, type ExportProgress, type Resolution } from '../export/exporter';
import { Button, Icon, Modal, Row, Segmented, Toggle } from './ui';
import { useT } from '../i18n';
import { canEncodeVideo } from 'mediabunny';

const FORMATS: { id: ExportFormat; title: string; desc: string }[] = [
  { id: 'mp4', title: 'MP4', desc: 'H.264 · universal playback, opaque' },
  { id: 'webm', title: 'WebM', desc: 'VP9 · supports alpha transparency' },
  { id: 'png', title: 'PNG Sequence', desc: 'Lossless frames · transparent · .zip' },
  { id: 'gif', title: 'GIF', desc: 'Loops everywhere · chats, web, slides' },
];

export function ExportDialog() {
  const t = useT();
  const project = useStore((s) => s.project);
  const close = () => useStore.getState().setModal(null);
  const [format, setFormat] = useState<ExportFormat>(project.canvas.transparent ? 'webm' : 'mp4');
  const [resolution, setRes] = useState<Resolution>('1080');
  const [fps, setFps] = useState<25 | 30 | 60>(30);
  const [gifFps, setGifFps] = useState(20);
  const [gifLong, setGifLong] = useState(720);
  const [quality, setQuality] = useState<ExportOptions['quality']>('high');
  const [transparent, setTransparent] = useState(project.canvas.transparent);
  const [pngTarget, setPngTarget] = useState<'zip' | 'folder'>('zip');
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [result, setResult] = useState<{ blob?: Blob; filename: string; savedToFolder?: boolean; ms: number; codec?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [alphaOk, setAlphaOk] = useState<boolean | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const isGif = format === 'gif';
  const size = isGif ? gifSize(project, gifLong) : outputSize(project, resolution);
  const outFps = isGif ? gifFps : fps;
  const frames = Math.round(project.canvas.duration * outFps);
  const folderSupported = 'showDirectoryPicker' in window;
  const busy = !!progress && !result && !error;

  useEffect(() => {
    if (!webCodecsAvailable()) { setAlphaOk(false); return; }
    canEncodeVideo('vp9', { width: 1280, height: 720, alpha: 'keep' }).then(setAlphaOk).catch(() => setAlphaOk(false));
  }, []);

  const start = async () => {
    setError(null); setResult(null);
    const ac = new AbortController();
    abortRef.current = ac;
    const t0 = performance.now();
    setProgress({ frame: 0, total: frames, phase: 'Preparing' });
    try {
      const r = await runExport(project, { format, resolution, fps: outFps, quality, transparent, pngTarget, gifSize: gifLong }, setProgress, ac.signal);
      setResult({ ...r, ms: performance.now() - t0 });
      if (r.blob) download(r.blob, r.filename);
    } catch (e) {
      if ((e as Error).name === 'AbortError') { setProgress(null); return; }
      console.error(e);
      setError((e as Error).message || String(e));
    }
  };

  const still = async () => {
    const b = await renderStill(project, useStore.getState().time, project.canvas.transparent);
    if (b) download(b, `${project.name || 'frame'}_${useStore.getState().time.toFixed(2)}s.png`);
  };

  const pct = progress ? Math.round((progress.frame / Math.max(1, progress.total)) * 100) : 0;
  const videoUnsupported = (format === 'mp4' || format === 'webm') && !webCodecsAvailable();

  return (
    <Modal title={t('Export')} onClose={() => { abortRef.current?.abort(); close(); }} width={600}
      footer={
        <>
          <Button variant="ghost" icon="camera" onClick={still} disabled={busy}>{t('Current frame PNG')}</Button>
          <div style={{ flex: 1 }} />
          {busy ? (
            <Button variant="danger" onClick={() => abortRef.current?.abort()}>{t('Cancel')}</Button>
          ) : (
            <Button variant="primary" icon="export" onClick={start} disabled={videoUnsupported || (format === 'webm' && transparent && alphaOk === false)}>
              {result ? t('Export again') : t('Export {f}', { f: format === 'png' ? 'PNG' : format.toUpperCase() })}
            </Button>
          )}
        </>
      }>
      <div className="fmt-cards">
        {FORMATS.map((f) => (
          <button key={f.id} className={`fmt-card ${format === f.id ? 'on' : ''}`} disabled={busy} onClick={() => { setFormat(f.id); if (f.id !== 'mp4') setTransparent(project.canvas.transparent || transparent); }}>
            <span className="fmt-title">{t(f.title)}</span>
            <span className="fmt-desc">{t(f.desc)}</span>
          </button>
        ))}
      </div>
      {isGif ? (
        <>
          <Row label={t('Size (long edge)')}>
            <Segmented value={String(gifLong)} onChange={(v) => setGifLong(+v)} options={[{ value: '480', label: '480 px' }, { value: '720', label: '720 px' }, { value: '1080', label: '1080 px' }]} />
          </Row>
          <Row label={t('Frame rate')}>
            <Segmented value={String(gifFps)} onChange={(v) => setGifFps(+v)} options={[{ value: '12', label: '12 fps' }, { value: '15', label: '15 fps' }, { value: '20', label: '20 fps' }, { value: '25', label: '25 fps' }]} />
          </Row>
        </>
      ) : (
        <>
          <Row label={t('Resolution')}>
            <Segmented value={resolution} onChange={setRes} options={[{ value: '1080', label: '1080p' }, { value: '4k', label: '4K' }, { value: 'canvas', label: t('Canvas size') }]} />
          </Row>
          <Row label={t('Frame rate')}>
            <Segmented value={String(fps) as '25' | '30' | '60'} onChange={(v) => setFps(+v as 25 | 30 | 60)} options={[{ value: '25', label: '25 fps' }, { value: '30', label: '30 fps' }, { value: '60', label: '60 fps' }]} />
          </Row>
        </>
      )}
      {format !== 'png' && !isGif && (
        <Row label={t('Quality')}>
          <Segmented value={quality} onChange={setQuality} options={[{ value: 'standard', label: t('Standard') }, { value: 'high', label: t('High') }, { value: 'max', label: t('Maximum') }]} />
        </Row>
      )}
      {format !== 'mp4' && (
        <Row label={t('Transparent background')}><Toggle value={transparent} onChange={setTransparent} /></Row>
      )}
      {format === 'png' && folderSupported && (
        <Row label={t('Save as')}>
          <Segmented value={pngTarget} onChange={setPngTarget} options={[{ value: 'zip', label: t('ZIP archive') }, { value: 'folder', label: t('Folder on disk') }]} />
        </Row>
      )}
      {isGif && <p className="hint">{t('GIFs are limited to 256 colors per frame and get large quickly — 720 px at 15–20 fps is a good balance for chats and the web.')}{transparent ? ' ' + t('Transparent GIFs have hard (non-smoothed) edges; use WebM or PNG for soft transparency.') : ''}</p>}
      {format === 'mp4' && project.canvas.transparent && <p className="hint warn">{t('MP4 (H.264) can’t store transparency — the canvas background color will be used. Choose WebM or PNG for alpha.')}</p>}
      {format === 'webm' && transparent && alphaOk === false && <p className="hint warn">{t('This browser can’t encode WebM with alpha. Use Chrome or Edge, or export a PNG sequence.')}</p>}
      {format === 'webm' && transparent && alphaOk && <p className="hint">{t('VP9 with alpha plays with transparency in Chrome, Edge, Firefox, After Effects (with plugin), Premiere and DaVinci Resolve.')}</p>}
      {videoUnsupported && <p className="hint warn">{t('Your browser doesn’t support WebCodecs video encoding. Use a recent Chrome, Edge or Safari, or export a PNG sequence.')}</p>}

      <div className="export-summary">
        <div><span>{t('Output')}</span><b>{size.width} × {size.height}</b></div>
        <div><span>{t('Duration')}</span><b>{project.canvas.duration.toFixed(2)}s</b></div>
        <div><span>{t('Frames')}</span><b>{frames}</b></div>
        <div><span>{t('Alpha')}</span><b>{format !== 'mp4' && transparent ? t('Yes') : t('No')}</b></div>
      </div>

      {progress && (
        <div className="progress">
          <div className="progress-head">
            <span>{error ? t('Export failed') : result ? t('Done') : t(progress.phase.replace(/^Encoding (AVC|HEVC|VP9|VP8|AV1)$/, 'Encoding {codec}'), { codec: progress.phase.split(' ')[1] ?? '' })}</span>
            <span className="mono">{result ? `${(result.ms / 1000).toFixed(1)}s` : `${progress.frame}/${progress.total} · ${pct}%`}</span>
          </div>
          <div className="bar"><div style={{ width: `${result ? 100 : pct}%` }} className={error ? 'err' : result ? 'ok' : ''} /></div>
        </div>
      )}
      {error && <p className="hint warn">{t(error)}</p>}
      {result && (
        <div className="export-done">
          <Icon name="sparkle" size={16} />
          <div>
            <b>{result.savedToFolder ? t('Saved frames to folder “{name}”', { name: result.filename }) : result.filename}</b>
            <span className="muted small">{result.blob ? ` · ${(result.blob.size / 1048576).toFixed(1)} MB` : ''}{result.codec ? ` · ${result.codec.toUpperCase()}` : ''}</span>
          </div>
          {result.blob && <Button variant="ghost" icon="download" onClick={() => download(result.blob!, result.filename)}>{t('Download')}</Button>}
        </div>
      )}
    </Modal>
  );
}
