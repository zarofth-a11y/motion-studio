import {
  BufferTarget, CanvasSource, Mp4OutputFormat, Output, WebMOutputFormat, canEncodeVideo, getFirstEncodableVideoCodec,
  type VideoCodec,
} from 'mediabunny';
import { Zip, ZipPassThrough } from 'fflate';
import type { Project } from '../types';
import { renderProject } from '../render/renderer';
import { ensureFonts } from '../lib/fonts';

export type ExportFormat = 'mp4' | 'webm' | 'png';
export type Resolution = 'canvas' | '1080' | '4k';

export interface ExportOptions {
  format: ExportFormat;
  resolution: Resolution;
  fps: 25 | 30 | 60;
  quality: 'standard' | 'high' | 'max';
  transparent: boolean; // webm/png only
  pngTarget?: 'zip' | 'folder';
  range?: [number, number];
}

export interface ExportProgress { frame: number; total: number; phase: string }

export function outputSize(project: Project, res: Resolution) {
  const { width: w, height: h } = project.canvas;
  if (res === 'canvas') return { width: even(w), height: even(h), scale: 1 };
  const landscape = w >= h;
  const [bw, bh] = res === '1080' ? (landscape ? [1920, 1080] : [1080, 1920]) : landscape ? [3840, 2160] : [2160, 3840];
  const scale = Math.min(bw / w, bh / h);
  return { width: even(w * scale), height: even(h * scale), scale };
}
const even = (n: number) => Math.max(2, Math.round(n / 2) * 2);

export function webCodecsAvailable() {
  return typeof window !== 'undefined' && 'VideoEncoder' in window;
}

function bitrate(w: number, h: number, fps: number, q: ExportOptions['quality']) {
  const k = q === 'standard' ? 0.08 : q === 'high' ? 0.16 : 0.3;
  return Math.round(Math.min(160e6, Math.max(4e6, w * h * fps * k)));
}

const tick = () => new Promise((r) => setTimeout(r, 0));

export async function runExport(
  project: Project, opts: ExportOptions, onProgress: (p: ExportProgress) => void, signal: AbortSignal,
): Promise<{ blob?: Blob; filename: string; savedToFolder?: boolean; codec?: string }> {
  const { width, height, scale } = outputSize(project, opts.resolution);
  const [t0, t1] = opts.range ?? [0, project.canvas.duration];
  const total = Math.max(1, Math.round((t1 - t0) * opts.fps));
  const base = (project.name || 'motion-studio').replace(/[^\p{L}\p{N}\-_ ]/gu, '').trim().replace(/\s+/g, '-') || 'export';
  const stamp = `${width}x${height}_${opts.fps}fps`;

  onProgress({ frame: 0, total, phase: 'Loading fonts' });
  await ensureFonts(project);

  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: true })!;
  const alpha = opts.format !== 'mp4' && opts.transparent;
  const draw = (i: number) => renderProject(ctx, project, t0 + i / opts.fps, { scale, forceTransparent: alpha, forceOpaque: !alpha });

  // ───────────── PNG sequence ─────────────
  if (opts.format === 'png') {
    const pad = String(total).length < 4 ? 4 : String(total).length;
    const name = (i: number) => `${base}_${String(i).padStart(pad, '0')}.png`;
    const toPng = () => new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('PNG encode failed'))), 'image/png'));

    if (opts.pngTarget === 'folder' && 'showDirectoryPicker' in window) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dir: any = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
      const sub = await dir.getDirectoryHandle(`${base}_${stamp}`, { create: true });
      for (let i = 0; i < total; i++) {
        if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
        draw(i);
        const blob = await toPng();
        const fh = await sub.getFileHandle(name(i), { create: true });
        const w = await fh.createWritable();
        await w.write(blob); await w.close();
        onProgress({ frame: i + 1, total, phase: 'Writing PNG frames' });
      }
      return { filename: `${base}_${stamp}`, savedToFolder: true };
    }

    const chunks: Uint8Array[] = [];
    let done!: () => void, fail!: (e: unknown) => void;
    const finished = new Promise<void>((res, rej) => { done = res; fail = rej; });
    const zip = new Zip((err, chunk, final) => {
      if (err) return fail(err);
      chunks.push(chunk);
      if (final) done();
    });
    for (let i = 0; i < total; i++) {
      if (signal.aborted) { zip.terminate(); throw new DOMException('Cancelled', 'AbortError'); }
      draw(i);
      const blob = await toPng();
      const f = new ZipPassThrough(name(i)); // PNG is already compressed → store
      zip.add(f);
      f.push(new Uint8Array(await blob.arrayBuffer()), true);
      onProgress({ frame: i + 1, total, phase: 'Encoding PNG frames' });
    }
    zip.end();
    await finished;
    return { blob: new Blob(chunks as BlobPart[], { type: 'application/zip' }), filename: `${base}_${stamp}_png.zip` };
  }

  // ───────────── Video (WebCodecs) ─────────────
  if (!webCodecsAvailable()) throw new Error('This browser does not support WebCodecs video encoding. Please use a recent Chrome, Edge, or Safari — or export a PNG sequence.');

  const br = bitrate(width, height, opts.fps, opts.quality);
  let codec: VideoCodec | null;
  if (opts.format === 'mp4') {
    codec = await getFirstEncodableVideoCodec(['avc', 'hevc', 'vp9', 'av1'], { width, height, bitrate: br });
  } else {
    const cands: VideoCodec[] = alpha ? ['vp9', 'vp8'] : ['vp9', 'av1', 'vp8'];
    codec = null;
    for (const c of cands) {
      if (await canEncodeVideo(c, { width, height, bitrate: br, ...(alpha ? { alpha: 'keep' as const } : {}) })) { codec = c; break; }
    }
    if (!codec && alpha) throw new Error('Your browser cannot encode WebM with an alpha channel. Use Chrome/Edge, or export a transparent PNG sequence instead.');
  }
  if (!codec) throw new Error(`No supported encoder found for ${opts.format.toUpperCase()} at ${width}×${height}. Try a lower resolution.`);

  const output = new Output({
    format: opts.format === 'mp4' ? new Mp4OutputFormat({ fastStart: 'in-memory' }) : new WebMOutputFormat(),
    target: new BufferTarget(),
  });
  const source = new CanvasSource(canvas, {
    codec, bitrate: br, keyFrameInterval: 2, latencyMode: 'quality',
    ...(alpha ? { alpha: 'keep' as const } : {}),
  });
  output.addVideoTrack(source, { frameRate: opts.fps });
  await output.start();

  try {
    for (let i = 0; i < total; i++) {
      if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
      draw(i);
      await source.add(i / opts.fps, 1 / opts.fps);
      if (i % 4 === 0) { onProgress({ frame: i + 1, total, phase: `Encoding ${codec.toUpperCase()}` }); await tick(); }
    }
    onProgress({ frame: total, total, phase: 'Finalizing' });
    source.close();
    await output.finalize();
  } catch (e) {
    await output.cancel().catch(() => {});
    throw e;
  }
  const buf = (output.target as BufferTarget).buffer!;
  const ext = opts.format === 'mp4' ? 'mp4' : 'webm';
  return {
    blob: new Blob([buf], { type: opts.format === 'mp4' ? 'video/mp4' : 'video/webm' }),
    filename: `${base}_${stamp}${alpha ? '_alpha' : ''}.${ext}`,
    codec,
  };
}

export function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** Small JPEG/PNG thumbnail of the final frame (for templates) */
export function renderThumbnail(project: Project, maxW = 360) {
  const s = maxW / project.canvas.width;
  const c = document.createElement('canvas');
  c.width = Math.round(project.canvas.width * s);
  c.height = Math.round(project.canvas.height * s);
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#16161a'; ctx.fillRect(0, 0, c.width, c.height);
  renderProject(ctx, project, project.canvas.duration, { scale: s });
  return c.toDataURL('image/jpeg', 0.82);
}

export function renderStill(project: Project, t: number, transparent: boolean) {
  const c = document.createElement('canvas');
  c.width = project.canvas.width; c.height = project.canvas.height;
  renderProject(c.getContext('2d')!, project, t, { forceTransparent: transparent });
  return new Promise<Blob | null>((r) => c.toBlob(r, 'image/png'));
}
