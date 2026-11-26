import { useStore } from '../store';
import { ELEMENT_META } from '../defaults';
import { Icon, IconButton } from './ui';
import type { ElementType } from '../types';
import { useT } from '../i18n';

const ORDER: ElementType[] = ['ring', 'counter', 'bar', 'pie', 'line', 'kpi', 'growth', 'text'];

export function LeftPanel() {
  const elements = useStore((s) => s.project.elements);
  const selectedId = useStore((s) => s.selectedId);
  const st = useStore.getState;
  const t = useT();

  return (
    <aside className="left-panel">
      <div className="panel-title">{t('Library')}</div>
      <div className="library">
        {ORDER.map((ty) => (
          <button key={ty} className="lib-item" onClick={() => st().addElement(ty)} title={t(ELEMENT_META[ty].hint)}>
            <span className="lib-icon"><Icon name={ty} size={22} /></span>
            <span className="lib-name">{t(ELEMENT_META[ty].label)}</span>
          </button>
        ))}
      </div>
      <div className="panel-title layers-title">
        {t('Layers')} <span className="count">{elements.length}</span>
      </div>
      <div className="layers">
        {[...elements].reverse().map((el) => (
          <div
            key={el.id}
            className={`layer ${selectedId === el.id ? 'sel' : ''} ${!el.visible ? 'dim' : ''}`}
            onClick={() => st().select(el.id)}
          >
            <Icon name={el.type} size={14} className="layer-icon" />
            <input
              className="layer-name"
              value={el.name}
              dir="auto"
              onChange={(e) => st().updateElement(el.id, (x) => { x.name = e.target.value; }, 'name')}
              onFocus={() => st().select(el.id)}
            />
            <div className="layer-actions" onClick={(e) => e.stopPropagation()}>
              <IconButton size={13} icon="up" title={t('Bring forward')} onClick={() => st().moveElement(el.id, 1)} />
              <IconButton size={13} icon="down" title={t('Send backward')} onClick={() => st().moveElement(el.id, -1)} />
              <IconButton size={13} icon={el.locked ? 'lock' : 'unlock'} title={el.locked ? t('Unlock') : t('Lock')} active={el.locked} onClick={() => st().updateElement(el.id, (x) => { x.locked = !x.locked; })} />
              <IconButton size={13} icon={el.visible ? 'eye' : 'eyeOff'} title={el.visible ? t('Hide') : t('Show')} onClick={() => st().updateElement(el.id, (x) => { x.visible = !x.visible; })} />
            </div>
          </div>
        ))}
        {elements.length === 0 && <div className="empty-hint">{t('Your composition is empty.')}<br />{t('Click an item above to add it.')}</div>}
      </div>
    </aside>
  );
}
