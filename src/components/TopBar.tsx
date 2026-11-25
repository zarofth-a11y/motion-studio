import { useRef } from 'react';
import { useStore } from '../store';
import { download } from '../export/exporter';
import { Button, IconButton } from './ui';
import type { Project } from '../types';

export function TopBar() {
  const name = useStore((s) => s.project.name);
  const canUndo = useStore((s) => s.past.length > 0);
  const canRedo = useStore((s) => s.future.length > 0);
  const dir = useStore((s) => s.project.canvas.direction);
  const st = useStore.getState;
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <header className="topbar">
      <div className="brand">
        <div className="logo"><span /><span /><span /></div>
        <span className="brand-name">Motion Studio</span>
      </div>
      <div className="tb-group">
        <Button variant="ghost" icon="file" onClick={() => { if (confirm('Start a new empty project? Unsaved changes can be undone with ⌘Z.')) st().newProject(); }}>New</Button>
        <input ref={fileRef} type="file" accept=".json" hidden onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          try {
            const j = JSON.parse(await f.text());
            const p: Project = j.project ?? j.templates?.[0]?.project ?? j;
            if (!p.elements || !p.canvas) throw new Error();
            st().loadProject(p);
            st().notify(`Opened “${p.name}”`);
          } catch { st().notify('Not a valid project file'); }
          e.target.value = '';
        }} />
        <Button variant="ghost" icon="folder" onClick={() => fileRef.current?.click()}>Open</Button>
        <Button variant="ghost" icon="download" onClick={() => { const p = st().project; download(new Blob([JSON.stringify({ motionStudio: 1, project: p }, null, 2)], { type: 'application/json' }), `${p.name || 'project'}.motion.json`); }}>Save file</Button>
        <span className="tb-sep" />
        <IconButton icon="undo" title="Undo (⌘Z)" disabled={!canUndo} onClick={() => st().undo()} />
        <IconButton icon="redo" title="Redo (⇧⌘Z)" disabled={!canRedo} onClick={() => st().redo()} />
      </div>
      <div className="tb-center">
        <input className="project-name" dir="auto" value={name} onChange={(e) => st().update((p) => { p.name = e.target.value; }, 'pname')} />
      </div>
      <div className="tb-group right">
        <div className="dir-switch" title="Layout direction">
          <button className={dir === 'ltr' ? 'on' : ''} onClick={() => st().update((p) => { p.canvas.direction = 'ltr'; })}>EN · LTR</button>
          <button className={dir === 'rtl' ? 'on' : ''} onClick={() => st().update((p) => { p.canvas.direction = 'rtl'; })}>ع · RTL</button>
        </div>
        <Button variant="ghost" icon="grid" onClick={() => st().setModal('templates')}>Templates</Button>
        <Button variant="ghost" icon="save" onClick={() => st().setModal('saveTemplate')}>Save as template</Button>
        <Button variant="primary" icon="export" onClick={() => st().setModal('export')}>Export</Button>
      </div>
    </header>
  );
}
