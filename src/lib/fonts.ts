import type { Project } from '../types';
import { useSyncExternalStore } from 'react';

// ── tiny IndexedDB key/value store for uploaded font files ──
const DB = 'motionstudio-fonts';
function db(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore('fonts');
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function idb<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  const d = await db();
  return new Promise((res, rej) => {
    const tx = d.transaction('fonts', mode);
    const req = fn(tx.objectStore('fonts'));
    req.onsuccess = () => res(req.result as T);
    req.onerror = () => rej(req.error);
  });
}

let customFamilies: string[] = [];
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function useCustomFonts() {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => customFamilies,
  );
}

async function register(family: string, buf: ArrayBuffer) {
  const face = new FontFace(family, buf);
  await face.load();
  document.fonts.add(face);
  if (!customFamilies.includes(family)) customFamilies = [...customFamilies, family];
  emit();
}

export async function loadStoredFonts() {
  try {
    const keys = await idb<IDBValidKey[]>('readonly', (s) => s.getAllKeys());
    for (const k of keys) {
      const buf = await idb<ArrayBuffer>('readonly', (s) => s.get(k));
      if (buf) await register(String(k), buf).catch(() => {});
    }
  } catch (e) {
    console.warn('font store unavailable', e);
  }
}

export async function uploadFont(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const family = file.name.replace(/\.(ttf|otf|woff2?|)$/i, '').replace(/[-_]+/g, ' ').trim();
  await register(family, buf);
  await idb('readwrite', (s) => s.put(buf, family));
  return family;
}

export async function removeFont(family: string) {
  await idb('readwrite', (s) => s.delete(family));
  for (const f of [...document.fonts]) if (f.family.replace(/"/g, '') === family) document.fonts.delete(f);
  customFamilies = customFamilies.filter((f) => f !== family);
  emit();
}

/** Ensure every font used by the project is loaded before drawing (critical for export). */
export async function ensureFonts(project: Project) {
  const fams = new Set<string>([project.canvas.latinFont, project.canvas.arabicFont]);
  const weights = new Set<number>([400, 500, 600, 700]);
  for (const el of project.elements) {
    if (el.font) fams.add(el.font);
    weights.add(el.fontWeight);
  }
  const jobs: Promise<unknown>[] = [];
  for (const f of fams) for (const w of weights) {
    jobs.push(document.fonts.load(`${w} 32px "${f}"`, 'Aa٠١ابت').catch(() => {}));
  }
  await Promise.all(jobs);
}
