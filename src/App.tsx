import { useEffect } from 'react';
import { useStore } from './store';
import { TopBar } from './components/TopBar';
import { LeftPanel } from './components/LeftPanel';
import { Preview } from './components/Preview';
import { Inspector } from './components/Inspector';
import { Timeline } from './components/Timeline';
import { ExportDialog } from './components/ExportDialog';
import { SaveTemplateDialog, TemplatesDialog } from './components/TemplatesDialog';
import { loadStoredFonts } from './lib/fonts';

export default function App() {
  const modal = useStore((s) => s.modal);
  const toast = useStore((s) => s.toast);

  useEffect(() => { loadStoredFonts(); }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = useStore.getState();
      const tag = (e.target as HTMLElement)?.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (e.target as HTMLElement)?.isContentEditable;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'z' && !typing) { e.preventDefault(); if (e.shiftKey) s.redo(); else s.undo(); return; }
      if (mod && e.key.toLowerCase() === 'y' && !typing) { e.preventDefault(); s.redo(); return; }
      if (mod && e.key.toLowerCase() === 'e') { e.preventDefault(); s.setModal('export'); return; }
      if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); s.setModal('saveTemplate'); return; }
      if (typing || s.modal) return;
      const sel = s.selectedId;
      if (e.code === 'Space') { e.preventDefault(); s.togglePlay(); return; }
      if (e.key === 'Home') { s.setTime(0); return; }
      if (e.key === 'End') { s.setTime(s.project.canvas.duration); return; }
      if (e.key === ',') { s.setPlaying(false); s.setTime(s.time - 1 / 30); return; }
      if (e.key === '.') { s.setPlaying(false); s.setTime(s.time + 1 / 30); return; }
      if (e.key === 'Escape') { s.select(null); return; }
      if (!sel) return;
      if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); s.removeElement(sel); return; }
      if (mod && e.key.toLowerCase() === 'd') { e.preventDefault(); s.duplicateElement(sel); return; }
      const step = e.shiftKey ? 10 : 1;
      const nudge: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
      if (nudge[e.key]) {
        e.preventDefault();
        const [dx, dy] = nudge[e.key];
        s.updateElement(sel, (el) => { if (!el.locked) { el.x += dx; el.y += dy; } }, 'nudge');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="app">
      <TopBar />
      <div className="workspace">
        <LeftPanel />
        <Preview />
        <Inspector />
      </div>
      <Timeline />
      {modal === 'export' && <ExportDialog />}
      {modal === 'templates' && <TemplatesDialog />}
      {modal === 'saveTemplate' && <SaveTemplateDialog />}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
