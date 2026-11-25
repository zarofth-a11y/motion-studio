import { useStore } from '../store';
import { ELEMENT_META } from '../defaults';
import { Icon, IconButton } from './ui';
import type { ElementType } from '../types';

const ORDER: ElementType[] = ['ring', 'counter', 'bar', 'pie', 'line', 'kpi', 'growth', 'text'];

export function LeftPanel() {
  const elements = useStore((s) => s.project.elements);
  const selectedId = useStore((s) => s.selectedId);
  const st = useStore.getState;

  return (
    <aside className="left-panel">
      <div className="panel-title">Library</div>
      <div className="library">
        {ORDER.map((t) => (
          <button key={t} className="lib-item" onClick={() => st().addElement(t)} title={`Add ${ELEMENT_META[t].label}`}>
            <span className="lib-icon"><Icon name={t} size={22} /></span>
            <span className="lib-name">{ELEMENT_META[t].label}</span>
          </button>
        ))}
      </div>
      <div className="panel-title layers-title">
        Layers <span className="count">{elements.length}</span>
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
              onChange={(e) => st().updateElement(el.id, (t) => { t.name = e.target.value; }, 'name')}
              onFocus={() => st().select(el.id)}
            />
            <div className="layer-actions" onClick={(e) => e.stopPropagation()}>
              <IconButton size={13} icon="up" title="Bring forward" onClick={() => st().moveElement(el.id, 1)} />
              <IconButton size={13} icon="down" title="Send backward" onClick={() => st().moveElement(el.id, -1)} />
              <IconButton size={13} icon={el.locked ? 'lock' : 'unlock'} title={el.locked ? 'Unlock' : 'Lock'} active={el.locked} onClick={() => st().updateElement(el.id, (t) => { t.locked = !t.locked; })} />
              <IconButton size={13} icon={el.visible ? 'eye' : 'eyeOff'} title={el.visible ? 'Hide' : 'Show'} onClick={() => st().updateElement(el.id, (t) => { t.visible = !t.visible; })} />
            </div>
          </div>
        ))}
        {elements.length === 0 && <div className="empty-hint">Your composition is empty.<br />Click an item above to add it.</div>}
      </div>
    </aside>
  );
}
