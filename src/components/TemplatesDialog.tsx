import { useMemo, useRef, useState } from 'react';
import { useStore } from '../store';
import { builtinTemplates } from '../defaults';
import { download, renderThumbnail } from '../export/exporter';
import { Button, Icon, IconButton, Modal, Row, TextField, Toggle } from './ui';
import { useT } from '../i18n';
import type { Template } from '../types';

export function TemplatesDialog() {
  const t = useT();
  const user = useStore((s) => s.templates);
  const st = useStore.getState;
  const builtins = useMemo(() => builtinTemplates().map((t) => ({ ...t, thumbnail: renderThumbnail(t.project) })), []);
  const [keepData, setKeepData] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const close = () => st().setModal(null);

  const apply = (t: Template) => { st().applyTemplate(t, keepData); close(); };

  const card = (tp: Template, deletable: boolean) => (
    <div key={tp.id} className="tpl-card" onClick={() => apply(tp)}>
      <div className="tpl-thumb">
        {tp.thumbnail ? <img src={tp.thumbnail} alt="" /> : <Icon name="grid" size={28} />}
        <span className="tpl-meta">{tp.project.canvas.width}×{tp.project.canvas.height} · {tp.project.canvas.direction.toUpperCase()}</span>
      </div>
      <div className="tpl-foot">
        <span dir="auto">{tp.builtIn ? t(tp.name) : tp.name}</span>
        <div onClick={(e) => e.stopPropagation()} className="tpl-actions">
          <IconButton size={13} icon="download" title={t('Export template file')} onClick={() => download(new Blob([JSON.stringify({ motionStudio: 1, templates: [tp] }, null, 2)], { type: 'application/json' }), `${tp.name}.motion.json`)} />
          {deletable && <IconButton size={13} icon="trash" title={t('Delete template')} onClick={() => st().deleteTemplate(tp.id)} />}
        </div>
      </div>
    </div>
  );

  return (
    <Modal title={t('Templates')} onClose={close} width={880}
      footer={
        <>
          <input ref={fileRef} type="file" accept=".json" hidden onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            try {
              const j = JSON.parse(await f.text());
              const list: Template[] = j.templates ?? (j.project ? [j] : j.elements ? [{ id: 'x', name: j.name ?? 'Imported', createdAt: Date.now(), project: j }] : []);
              if (!list.length) throw new Error();
              list.forEach((t) => { if (!t.thumbnail) t.thumbnail = renderThumbnail(t.project); });
              st().importTemplates(list);
            } catch { st().notify(t('Not a valid Motion Studio template file')); }
            e.target.value = '';
          }} />
          <Button variant="ghost" icon="upload" onClick={() => fileRef.current?.click()}>{t('Import .json')}</Button>
          {user.length > 0 && <Button variant="ghost" icon="download" onClick={() => download(new Blob([JSON.stringify({ motionStudio: 1, templates: user }, null, 2)], { type: 'application/json' }), 'motion-studio-templates.json')}>{t('Export all')}</Button>}
          <div style={{ flex: 1 }} />
          <label className="keep-data">
            <Toggle value={keepData} onChange={setKeepData} />
            <span>{t('Keep my current data')} <em className="muted">{t('— apply design only')}</em></span>
          </label>
        </>
      }>
      <div className="tpl-section-title">{t('My templates')}</div>
      {user.length ? <div className="tpl-grid">{user.map((t) => card(t, true))}</div> : (
        <div className="empty-hint left">{t('No saved templates yet. Use “Save as template” in the top bar to store your branded design for reuse.')}</div>
      )}
      <div className="tpl-section-title">{t('Starter templates')}</div>
      <div className="tpl-grid">{builtins.map((t) => card(t, false))}</div>
    </Modal>
  );
}

export function SaveTemplateDialog() {
  const t = useT();
  const project = useStore((s) => s.project);
  const st = useStore.getState;
  const [name, setName] = useState(project.name || t('My template'));
  const thumb = useMemo(() => renderThumbnail(project, 520), [project]);
  const save = () => { st().saveTemplate(name.trim() || t('Untitled template'), renderThumbnail(project)); st().setModal(null); };
  return (
    <Modal title={t('Save as template')} onClose={() => st().setModal(null)} width={480}
      footer={<><div style={{ flex: 1 }} /><Button variant="ghost" onClick={() => st().setModal(null)}>{t('Cancel')}</Button><Button variant="primary" icon="save" onClick={save}>{t('Save template')}</Button></>}>
      <img className="save-thumb" src={thumb} alt="" />
      <Row label={t('Template name')}><TextField value={name} onChange={setName} /></Row>
      <p className="hint">{t('Saves layout, brand palette, fonts, styles, animation timing and current data. Later, load it and only change the numbers in the Data tab — the animation rebuilds itself.')}</p>
    </Modal>
  );
}
