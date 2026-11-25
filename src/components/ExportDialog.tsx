import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { download, outputSize, renderStill, runExport, webCodecsAvailable, type ExportFormat, type ExportOptions, type ExportProgress, type Resolution } from '../export/exporter';
import { Button, Icon, Modal, Row, Segmented, Toggle } from './ui';
import { canEncodeVideo } from 'mediabunny';

const FORMATS: { id: ExportFormat; title: string; desc: string }[] = [
  { id: 'mp4', title: 'MP4', desc: 'H.264 · universal playback, opaque' },
  { id: 'webm', title: 'WebM', desc: 'VP9 · supports alpha transparency' },
  { id: 'png', title: 'PNG Sequence', desc: 'Lossless frames · transparent · .zip' },
];

export function ExportDialog() {
  const project = useStore((s) => s.project);
  const close = () => useStore.getState().setModal(null);
  const [format, setFormat] = useState<ExportFormat>(project.canvas.transparent ? 'webm' : 'mp4');
  const [resolution, setRes] = useState<Resolution>('1080');
  const [fps, setFps] = useState<25 | 30 | 60>(30);
  const [quality, setQuality] = useState<ExportOptions['quality']>('high');
  const [transparent, setTransparent] = useState(project.canvas.transparent);
  const [pngTarget, setPngTarget] = useState<'zip' | 'folder'>('zip');
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [result, setResult] = useState<{ blob?: Blob; filename: string; savedToFolder?: boolean; ms: number; codec?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [alphaOk, setAlphaOk] = useState<boolean | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const size = outputSize(project, resolution);
  const frames = Math.round(project.canvas.duration * fps);
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
      const r = await runExport(project, { format, resolution, fps, quality, transparent, pngTarget }, setProgress, ac.signal);
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
  const videoUnsupported = format !== 'png' && !webCodecsAvailable();

  return (
    <Modal title="Export" onClose={() => { abortRef.current?.abort(); close(); }} width={600}
      footer={
        <>
          <Button variant="ghost" icon="camera" onClick={still} disabled={busy}>Current frame PNG</Button>
          <div style={{ flex: 1 }} />
          {busy ? (
            <Button variant="danger" onClick={() => abortRef.current?.abort()}>Cancel</Button>
          ) : (
            <Button variant="primary" icon="export" onClick={start} disabled={videoUnsupported || (format === 'webm' && transparent && alphaOk === false)}>
              {result ? 'Export again' : `Export ${format === 'png' ? 'PNGs' : format.toUpperCase()}`}
            </Button>
          )}
        </>
      }>
      <div className="fmt-cards">
        {FORMATS.map((f) => (
          <button key={f.id} className={`fmt-card ${format === f.id ? 'on' : ''}`} disabled={busy} onClick={() => { setFormat(f.id); if (f.id !== 'mp4') setTransparent(project.canvas.transparent || transparent); }}>
            <span className="fmt-title">{f.title}</span>
            <span className="fmt-desc">{f.desc}</span>
          </button>
        ))}
      </div>
      <Row label="Resolution">
        <Segmented value={resolution} onChange={setRes} options={[{ value: '1080', label: '1080p' }, { value: '4k', label: '4K' }, { value: 'canvas', label: 'Canvas size' }]} />
      </Row>
      <Row label="Frame rate">
        <Segmented value={String(fps) as '25' | '30' | '60'} onChange={(v) => setFps(+v as 25 | 30 | 60)} options={[{ value: '25', label: '25 fps' }, { value: '30', label: '30 fps' }, { value: '60', label: '60 fps' }]} />
      </Row>
      {format !== 'png' && (
        <Row label="Quality">
          <Segmented value={quality} onChange={setQuality} options={[{ value: 'standard', label: 'Standard' }, { value: 'high', label: 'High' }, { value: 'max', label: 'Maximum' }]} />
        </Row>
      )}
      {format !== 'mp4' && (
        <Row label="Transparent background"><Toggle value={transparent} onChange={setTransparent} /></Row>
      )}
      {format === 'png' && folderSupported && (
        <Row label="Save as">
          <Segmented value={pngTarget} onChange={setPngTarget} options={[{ value: 'zip', label: 'ZIP archive' }, { value: 'folder', label: 'Folder on disk' }]} />
        </Row>
      )}
      {format === 'mp4' && project.canvas.transparent && <p className="hint warn">MP4 (H.264) can’t store transparency — the canvas background color will be used. Choose WebM or PNG for alpha.</p>}
      {format === 'webm' && transparent && alphaOk === false && <p className="hint warn">This browser can’t encode WebM with alpha. Use Chrome or Edge, or export a PNG sequence.</p>}
      {format === 'webm' && transparent && alphaOk && <p className="hint">VP9 with alpha plays with transparency in Chrome, Edge, Firefox, After Effects (with plugin), Premiere and DaVinci Resolve.</p>}
      {videoUnsupported && <p className="hint warn">Your browser doesn’t support WebCodecs video encoding. Use a recent Chrome, Edge or Safari, or export a PNG sequence.</p>}

      <div className="export-summary">
        <div><span>Output</span><b>{size.width} × {size.height}</b></div>
        <div><span>Duration</span><b>{project.canvas.duration.toFixed(2)}s</b></div>
        <div><span>Frames</span><b>{frames}</b></div>
        <div><span>Alpha</span><b>{format !== 'mp4' && transparent ? 'Yes' : 'No'}</b></div>
      </div>

      {progress && (
        <div className="progress">
          <div className="progress-head">
            <span>{error ? 'Export failed' : result ? 'Done' : progress.phase}</span>
            <span className="mono">{result ? `${(result.ms / 1000).toFixed(1)}s` : `${progress.frame}/${progress.total} · ${pct}%`}</span>
          </div>
          <div className="bar"><div style={{ width: `${result ? 100 : pct}%` }} className={error ? 'err' : result ? 'ok' : ''} /></div>
        </div>
      )}
      {error && <p className="hint warn">{error}</p>}
      {result && (
        <div className="export-done">
          <Icon name="sparkle" size={16} />
          <div>
            <b>{result.savedToFolder ? `Saved frames to folder “${result.filename}”` : result.filename}</b>
            <span className="muted small">{result.blob ? ` · ${(result.blob.size / 1048576).toFixed(1)} MB` : ''}{result.codec ? ` · ${result.codec.toUpperCase()}` : ''}</span>
          </div>
          {result.blob && <Button variant="ghost" icon="download" onClick={() => download(result.blob!, result.filename)}>Download</Button>}
        </div>
      )}
    </Modal>
  );
}
