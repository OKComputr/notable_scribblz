import { useEffect, useMemo, useRef } from 'react';
import { useStore } from '@renderer/store/app';
import { PlusIcon, SearchIcon, SortIcon, StarFilledIcon } from './icons';
import { rebuildIndex, searchNotes } from '@renderer/lib/search';
import type { Note, Sort } from '@shared/types';

function compareNotes(a: Note, b: Note, sort: Sort): number {
  const sign = sort.type === 'asc' ? 1 : -1;
  if (sort.by === 'title')    return sign * a.metadata.title.localeCompare(b.metadata.title);
  if (sort.by === 'created')  return sign * (Date.parse(a.metadata.created)  - Date.parse(b.metadata.created));
  return sign * (Date.parse(a.metadata.modified) - Date.parse(b.metadata.modified));
}

function snippet(content: string): string {
  return content
    .replace(/!?\[[^\]]*\]\([^)]*\)/g, '')   // drop image/link syntax
    .replace(/[`*_>#-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 140);
}

export function NoteList() {
  const notes = useStore(s => s.notes);
  const search = useStore(s => s.search);
  const activeTag = useStore(s => s.activeTag);
  const showFavorites = useStore(s => s.showFavorites);
  const showTrash = useStore(s => s.showTrash);
  const selectedPath = useStore(s => s.selectedPath);
  const setSelected = useStore(s => s.setSelected);
  const setSearch = useStore(s => s.setSearch);
  const sort = useStore(s => s.sort);
  const setSort = useStore(s => s.setSort);
  const workspace = useStore(s => s.workspace);
  const searchRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    function onFocusSearch() { searchRef.current?.focus(); searchRef.current?.select(); }
    window.addEventListener('cmd:focus-search', onFocusSearch);
    return () => window.removeEventListener('cmd:focus-search', onFocusSearch);
  }, []);

  useEffect(() => { rebuildIndex(notes); }, [notes]);

  const visible = useMemo(() => {
    let list = notes.slice();
    list = list.filter(n => (showTrash ? n.metadata.deleted : !n.metadata.deleted));
    if (showFavorites) list = list.filter(n => n.metadata.favorited);
    if (activeTag)     list = list.filter(n => n.metadata.tags.includes(activeTag));
    if (search.trim()) list = searchNotes(search, list);
    list.sort((a, b) => {
      const ap = a.metadata.pinned ? 1 : 0;
      const bp = b.metadata.pinned ? 1 : 0;
      if (ap !== bp) return bp - ap;
      return compareNotes(a, b, sort);
    });
    return list;
  }, [notes, search, activeTag, showFavorites, showTrash, sort]);

  async function newNote() {
    if (!workspace) {
      await window.notable.workspace.pickFolder();
      return;
    }
    const note = await window.notable.notes.create('Untitled');
    setSelected(note.filePath);
  }

  return (
    <section
      className="flex flex-col h-full border-r"
      style={{ background: 'var(--color-middle)', borderColor: 'var(--color-border)' }}
    >
      <div className="titlebar-drag flex items-center gap-2 px-3 h-10 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <div className="relative flex-1">
          <SearchIcon size={14} className="absolute left-2 top-1/2 -translate-y-1/2 opacity-60" />
          <input
            ref={searchRef}
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notes…"
            className="w-full pl-7 pr-2 py-1 rounded text-sm border outline-none focus:ring-1 focus:ring-blue-500/40"
            style={{ borderColor: 'var(--color-border)' }}
          />
        </div>
        <SortMenu sort={sort} setSort={setSort} />
        <button
          onClick={newNote}
          aria-label="New note"
          title="New note (Cmd+N)"
          className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10"
        >
          <PlusIcon />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {visible.length === 0 && (
          <div className="text-center opacity-60 mt-12 text-sm px-6">
            {workspace
              ? (notes.length === 0 ? 'No notes yet. Click + to start.' : 'No matches.')
              : 'Pick a notes folder to begin.'}
          </div>
        )}
        {visible.map(n => (
          <button
            key={n.filePath}
            onClick={() => setSelected(n.filePath)}
            className={`w-full text-left px-3 py-2 border-b ${selectedPath === n.filePath ? '' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
            style={{
              background: selectedPath === n.filePath ? 'var(--color-selected)' : undefined,
              color: selectedPath === n.filePath ? 'var(--color-selected-fg)' : undefined,
              borderColor: 'var(--color-border)'
            }}
          >
            <div className="flex items-center gap-1.5">
              {n.metadata.favorited && <StarFilledIcon size={12} className="text-yellow-500 shrink-0" />}
              <div className="font-medium truncate text-sm">{n.metadata.title}</div>
            </div>
            <div className="text-xs opacity-60 mt-0.5 truncate">{snippet(n.content) || '—'}</div>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {n.metadata.tags.slice(0, 4).map(t => (
                <span key={t} className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--color-hover)', color: 'var(--color-muted)' }}>{t}</span>
              ))}
              {n.metadata.tags.length > 4 && (
                <span className="text-[10px] opacity-50">+{n.metadata.tags.length - 4}</span>
              )}
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

function SortMenu({ sort, setSort }: { sort: Sort; setSort: (s: Sort) => void }) {
  function cycle() {
    const sequence: Sort[] = [
      { by: 'modified', type: 'desc' },
      { by: 'modified', type: 'asc' },
      { by: 'title',    type: 'asc' },
      { by: 'title',    type: 'desc' },
      { by: 'created',  type: 'desc' },
      { by: 'created',  type: 'asc' }
    ];
    const idx = sequence.findIndex(s => s.by === sort.by && s.type === sort.type);
    setSort(sequence[(idx + 1) % sequence.length]);
  }
  return (
    <button
      onClick={cycle}
      title={`Sort: ${sort.by} ${sort.type}`}
      className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 text-xs flex items-center gap-1"
    >
      <SortIcon size={14} />
    </button>
  );
}
