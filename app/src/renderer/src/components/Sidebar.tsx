import { useMemo } from 'react';
import { useStore } from '@renderer/store/app';
import { FolderIcon, HomeIcon, MoonIcon, StarIcon, SunIcon, TagIcon, TrashIcon } from './icons';
import { toggleTheme } from '@renderer/hooks/useTheme';

export function Sidebar() {
  const notes = useStore(s => s.notes);
  const activeTag = useStore(s => s.activeTag);
  const showFavorites = useStore(s => s.showFavorites);
  const showTrash = useStore(s => s.showTrash);
  const setActiveTag = useStore(s => s.setActiveTag);
  const setShowFavorites = useStore(s => s.setShowFavorites);
  const setShowTrash = useStore(s => s.setShowTrash);
  const workspace = useStore(s => s.workspace);
  const settings = useStore(s => s.settings);

  const tags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const n of notes) {
      if (n.metadata.deleted) continue;
      for (const t of n.metadata.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [notes]);

  const allCount       = notes.filter(n => !n.metadata.deleted).length;
  const favoritesCount = notes.filter(n => n.metadata.favorited && !n.metadata.deleted).length;
  const trashCount     = notes.filter(n =>  n.metadata.deleted).length;

  const isAll = !activeTag && !showFavorites && !showTrash;

  function selectAll() {
    setActiveTag(null);
    setShowFavorites(false);
    setShowTrash(false);
  }

  function pickWorkspace() {
    window.notable.workspace.pickFolder().catch(console.error);
  }

  return (
    <aside
      className="flex flex-col h-full text-sm select-none scrollbar-thin overflow-y-auto"
      style={{ background: 'var(--color-sidebar)', color: 'var(--color-sidebar-fg)' }}
    >
      <div className="titlebar-drag flex items-center justify-between px-4 h-10 border-b border-black/20">
        <span className="font-semibold">Notable</span>
        <button
          aria-label="Toggle theme"
          className="p-1 rounded hover:bg-white/10"
          onClick={toggleTheme}
          title={`Theme: ${settings?.theme ?? 'system'}`}
        >
          {settings?.theme === 'dark' ? <MoonIcon /> : <SunIcon />}
        </button>
      </div>

      <button
        className="flex items-center gap-2 px-4 py-2 text-left hover:bg-white/5 truncate"
        onClick={pickWorkspace}
        title={workspace?.dataDir ?? 'Pick a notes folder'}
      >
        <FolderIcon size={14} />
        <span className="truncate text-xs opacity-80">
          {workspace?.dataDir ?? 'No folder selected'}
        </span>
      </button>

      <nav className="px-2 mt-2 flex flex-col gap-0.5">
        <SideItem icon={<HomeIcon />} label="All Notes"  count={allCount}       active={isAll}          onClick={selectAll} />
        <SideItem icon={<StarIcon />} label="Favorites"  count={favoritesCount} active={showFavorites}  onClick={() => { setShowFavorites(!showFavorites); setActiveTag(null); }} />
        <SideItem icon={<TrashIcon />} label="Trash"     count={trashCount}     active={showTrash}      onClick={() => { setShowTrash(!showTrash); setActiveTag(null); }} />
      </nav>

      {tags.length > 0 && (
        <>
          <div className="px-4 mt-4 mb-1 text-[11px] uppercase tracking-wider opacity-50">Tags</div>
          <nav className="px-2 flex flex-col gap-0.5 pb-4">
            {tags.map(([tag, count]) => (
              <SideItem
                key={tag}
                icon={<TagIcon />}
                label={tag}
                count={count}
                active={activeTag === tag}
                onClick={() => { setActiveTag(activeTag === tag ? null : tag); setShowFavorites(false); setShowTrash(false); }}
              />
            ))}
          </nav>
        </>
      )}

      <div className="mt-auto px-4 py-2 text-[11px] opacity-50">
        Phase 1 build — open a folder to start
      </div>
    </aside>
  );
}

function SideItem(props: {
  icon: React.ReactNode;
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={props.onClick}
      className={`group flex items-center gap-2 px-2 py-1.5 rounded text-left ${
        props.active ? 'bg-white/15' : 'hover:bg-white/5'
      }`}
    >
      <span className="opacity-80">{props.icon}</span>
      <span className="flex-1 truncate">{props.label}</span>
      <span className="text-xs opacity-50 group-hover:opacity-80">{props.count}</span>
    </button>
  );
}
