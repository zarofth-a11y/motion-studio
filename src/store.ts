import { create } from 'zustand';
import type { BaseElement, ElementType, Palette, Project, Template } from './types';
import { BUILTIN_PALETTES, builtinTemplates, createElement, createProject } from './defaults';
import { uid } from './lib/color';
import { contentEnd } from './render/renderer';
import { tr } from './i18n';
import { ELEMENT_META } from './defaults';

const LS_PROJECT = 'motionstudio.project.v1';
const LS_TEMPLATES = 'motionstudio.templates.v1';
const LS_PALETTES = 'motionstudio.palettes.v1';

function load<T>(key: string, fb: T): T {
  try {
    const s = localStorage.getItem(key);
    return s ? (JSON.parse(s) as T) : fb;
  } catch {
    return fb;
  }
}
function save(key: string, v: unknown) {
  try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) { console.warn('Storage full?', e); }
}

const clone = <T,>(v: T): T => structuredClone(v);

export type Panel = 'element' | 'data' | 'canvas' | 'brand';

interface State {
  project: Project;
  selectedId: string | null;
  time: number;
  playing: boolean;
  loop: boolean;
  zoom: number | 'fit';
  panel: Panel;
  showSafeArea: boolean;
  templates: Template[];
  palettes: Palette[];
  past: Project[];
  future: Project[];
  lastKey: string;
  lastAt: number;
  modal: null | 'export' | 'templates' | 'saveTemplate';
  toast: string | null;

  update: (fn: (p: Project) => void, key?: string) => void;
  updateElement: (id: string, fn: (el: BaseElement) => void, key?: string) => void;
  addElement: (type: ElementType) => void;
  removeElement: (id: string) => void;
  duplicateElement: (id: string) => void;
  moveElement: (id: string, dir: -1 | 1) => void;
  select: (id: string | null) => void;
  setTime: (t: number) => void;
  setPlaying: (b: boolean) => void;
  togglePlay: () => void;
  setLoop: (b: boolean) => void;
  setZoom: (z: number | 'fit') => void;
  setPanel: (p: Panel) => void;
  setModal: (m: State['modal']) => void;
  notify: (msg: string) => void;
  undo: () => void;
  redo: () => void;
  newProject: () => void;
  loadProject: (p: Project) => void;
  saveTemplate: (name: string, thumbnail?: string) => void;
  applyTemplate: (t: Template, keepData?: boolean) => void;
  deleteTemplate: (id: string) => void;
  importTemplates: (list: Template[]) => void;
  savePalette: (name: string) => void;
  applyPalette: (p: Palette) => void;
  deletePalette: (id: string) => void;
  fitDuration: () => void;
}

const initialProject = (): Project => {
  const saved = load<Project | null>(LS_PROJECT, null);
  if (saved && saved.elements) return saved;
  return clone(builtinTemplates()[0].project);
};

export const useStore = create<State>((set, get) => ({
  project: initialProject(),
  selectedId: null,
  time: 0,
  playing: false,
  loop: true,
  zoom: 'fit',
  panel: 'element',
  showSafeArea: false,
  templates: load<Template[]>(LS_TEMPLATES, []),
  palettes: load<Palette[]>(LS_PALETTES, []),
  past: [],
  future: [],
  lastKey: '',
  lastAt: 0,
  modal: null,
  toast: null,

  update: (fn, key = '') => {
    const s = get();
    const next = clone(s.project);
    fn(next);
    const now = performance.now();
    const coalesce = key !== '' && key === s.lastKey && now - s.lastAt < 800;
    set({
      project: next,
      past: coalesce ? s.past : [...s.past.slice(-80), s.project],
      future: [],
      lastKey: key,
      lastAt: now,
    });
  },
  updateElement: (id, fn, key) =>
    get().update((p) => {
      const el = p.elements.find((e) => e.id === id);
      if (el) fn(el);
    }, key ? id + ':' + key : ''),
  addElement: (type) => {
    const { project } = get();
    const el = createElement(type, project.canvas.width, project.canvas.height);
    // fit large elements into small canvases
    const k = Math.min(1, (project.canvas.width * 0.8) / el.w, (project.canvas.height * 0.8) / el.h);
    if (k < 1) {
      el.w = Math.round(el.w * k); el.h = Math.round(el.h * k);
      el.x = Math.round((project.canvas.width - el.w) / 2); el.y = Math.round((project.canvas.height - el.h) / 2);
    }
    el.anim.delay = Math.min(get().time, Math.max(0, project.canvas.duration - el.anim.duration));
    if (project.canvas.direction === 'rtl') el.format.digits = 'arabic';
    const n = project.elements.filter((e) => e.type === type).length;
    el.name = tr(ELEMENT_META[type].label) + (n ? ' ' + (n + 1) : '');
    get().update((p) => { p.elements.push(el); });
    set({ selectedId: el.id, panel: 'element' });
  },
  removeElement: (id) => {
    get().update((p) => { p.elements = p.elements.filter((e) => e.id !== id); });
    if (get().selectedId === id) set({ selectedId: null });
  },
  duplicateElement: (id) => {
    const src = get().project.elements.find((e) => e.id === id);
    if (!src) return;
    const el = clone(src);
    el.id = uid('el'); el.name = src.name + tr(' copy'); el.x += 30; el.y += 30;
    get().update((p) => { p.elements.splice(p.elements.findIndex((e) => e.id === id) + 1, 0, el); });
    set({ selectedId: el.id });
  },
  moveElement: (id, dir) =>
    get().update((p) => {
      const i = p.elements.findIndex((e) => e.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= p.elements.length) return;
      [p.elements[i], p.elements[j]] = [p.elements[j], p.elements[i]];
    }),
  select: (id) => set({ selectedId: id }),
  setTime: (t) => set({ time: Math.max(0, Math.min(get().project.canvas.duration, t)) }),
  setPlaying: (b) => {
    if (b && get().time >= get().project.canvas.duration - 1e-3) set({ time: 0 });
    set({ playing: b });
  },
  togglePlay: () => get().setPlaying(!get().playing),
  setLoop: (b) => set({ loop: b }),
  setZoom: (z) => set({ zoom: z }),
  setPanel: (p) => set({ panel: p }),
  setModal: (m) => set({ modal: m, playing: m ? false : get().playing }),
  notify: (msg) => {
    set({ toast: msg });
    setTimeout(() => { if (get().toast === msg) set({ toast: null }); }, 2600);
  },
  undo: () => {
    const { past, project, future } = get();
    if (!past.length) return;
    set({ project: past[past.length - 1], past: past.slice(0, -1), future: [project, ...future], lastKey: '' });
  },
  redo: () => {
    const { past, project, future } = get();
    if (!future.length) return;
    set({ project: future[0], future: future.slice(1), past: [...past, project], lastKey: '' });
  },
  newProject: () => {
    const p = createProject('Untitled');
    set({ project: p, past: [...get().past, get().project], future: [], selectedId: null, time: 0 });
  },
  loadProject: (p) => set({ project: clone(p), past: [...get().past, get().project], future: [], selectedId: null, time: 0 }),
  saveTemplate: (name, thumbnail) => {
    const p = clone(get().project);
    p.name = name;
    const t: Template = { id: uid('tpl'), name, createdAt: Date.now(), thumbnail, project: p };
    const templates = [t, ...get().templates];
    set({ templates });
    save(LS_TEMPLATES, templates);
    get().notify(tr('Template “{name}” saved', { name }));
  },
  applyTemplate: (t, keepData = false) => {
    const cur = get().project;
    const next = clone(t.project);
    next.id = uid('prj');
    next.elements.forEach((e) => (e.id = uid('el')));
    if (keepData) {
      // Swap design but keep current numbers: match elements by type in order
      const pools = new Map<string, BaseElement[]>();
      for (const e of cur.elements) pools.set(e.type, [...(pools.get(e.type) ?? []), e]);
      for (const e of next.elements) {
        const src = pools.get(e.type)?.shift();
        if (!src) continue;
        e.data = clone(src.data);
        for (const k of DATA_KEYS[e.type]) if (k in src.props) e.props[k] = src.props[k];
      }
    }
    get().loadProject(next);
    get().notify(keepData ? tr('Template applied — your data was kept') : tr('Loaded “{name}”', { name: t.name }));
  },
  deleteTemplate: (id) => {
    const templates = get().templates.filter((t) => t.id !== id);
    set({ templates });
    save(LS_TEMPLATES, templates);
  },
  importTemplates: (list) => {
    const templates = [...list.map((t) => ({ ...t, id: uid('tpl'), builtIn: false })), ...get().templates];
    set({ templates });
    save(LS_TEMPLATES, templates);
    get().notify(tr('Imported {n} template(s)', { n: list.length }));
  },
  savePalette: (name) => {
    const pal: Palette = { id: uid('pal'), name, colors: [...get().project.palette.colors] };
    const palettes = [pal, ...get().palettes];
    set({ palettes });
    save(LS_PALETTES, palettes);
    get().update((p) => { p.palette = { ...pal, colors: [...pal.colors] }; });
    get().notify(tr('Palette “{name}” saved', { name }));
  },
  applyPalette: (pal) => get().update((p) => { p.palette = { ...pal, colors: [...pal.colors] }; }),
  deletePalette: (id) => {
    const palettes = get().palettes.filter((p) => p.id !== id);
    set({ palettes });
    save(LS_PALETTES, palettes);
  },
  fitDuration: () => {
    const end = contentEnd(get().project);
    get().update((p) => { p.canvas.duration = Math.max(1, Math.ceil((end + 1) * 2) / 2); });
  },
}));

/** Props that are "data" (numbers & labels), kept when swapping a template design */
export const DATA_KEYS: Record<ElementType, string[]> = {
  ring: ['value', 'max', 'label'],
  counter: ['from', 'to', 'label'],
  bar: [],
  pie: ['centerLabel'],
  line: [],
  kpi: ['title', 'value', 'delta', 'deltaLabel'],
  growth: ['value', 'label'],
  text: ['text'],
};

export const allPalettes = () => [...useStore.getState().palettes, ...BUILTIN_PALETTES];

// autosave project (debounced)
let saveTimer: number | undefined;
useStore.subscribe((s, prev) => {
  if (s.project === prev.project) return;
  clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => save(LS_PROJECT, s.project), 400);
});

export const selectedElement = (s: State) => s.project.elements.find((e) => e.id === s.selectedId) ?? null;
