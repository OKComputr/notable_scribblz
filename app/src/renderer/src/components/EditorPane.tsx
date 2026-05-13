import { useCallback, useEffect, useState } from 'react';
import { Editor } from './Editor';
import { Preview } from './Preview';
import { useStore } from '@renderer/store/app';
import { EditIcon, EyeIcon, PaperclipIcon, SplitIcon, StarFilledIcon, StarIcon, TrashIcon } from './icons';
import { useMenuCommand } from '@renderer/hooks/useMenuCommand';
import type { Note } from '@shared/types';
import { IMAGE_EXTS } from '@shared/types';

let saveTimer: number | null = null;
function debounceSave(fn: () => void): void {
  if (saveTimer != null) window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(fn, 300) as unknown as number;
}

export function EditorPane() {
  const selectedPath = useStore(s => s.selectedPath);
  const notes = useStore(s => s.notes);
  const settings = useStore(s => s.settings);
  const viewMode = useStore(s => s.viewMode);
  const setViewMode = useStore(s => s.setViewMode);
  const setSelected = useStore(s => s.setSelected);

  const note = notes.find(n => n.filePath === selectedPath) ?? null;
  const [draft, setDraft] = useState<string>(note?.content ?? '');
  const [title, setTitle] = useState<string>(note?.metadata.title ?? '');
  const [tagInput, setTagInput] = useState<string>('');

  useEffect(() => {
    setDraft(note?.content ?? '');
    setTitle(note?.metadata.title ?? '');
    setTagInput('');
  }, [note?.filePath]);

  const persist = useCallback((next: Note) => {
    debounceSave(() => {
      window.notable.notes.write(next).catch(console.error);
    });
  }, []);

  function onContentChange(next: string): void {
    setDraft(next);
    if (note) persist({ ...note, content: next });
  }

  async function onTitleBlur(): Promise<void> {
    if (!note) return;
    const t = title.trim();
    if (!t || t === note.metadata.title) return;
    try {
      const renamed = await window.notable.notes.rename(note.filePath, t);
      setSelected(renamed.filePath);
    } catch (err) {
      console.error(err);
    }
  }

  async function toggleFav(): Promise<void> {
    if (!note) return;
    const next: Note = { ...note, metadata: { ...note.metadata, favorited: !note.metadata.favorited } };
    await window.notable.notes.write(next);
  }

  async function trash(): Promise<void> {
    if (!note) return;
    if (!window.confirm(`Move "${note.metadata.title}" to trash?`)) return;
    await window.notable.notes.trash(note.filePath);
    setSelected(null);
  }

  async function addTag(): Promise<void> {
    if (!note) return;
    const t = tagInput.trim();
    if (!t) return;
    if (note.metadata.tags.includes(t)) { setTagInput(''); return; }
    const next: Note = { ...note, metadata: { ...note.metadata, tags: [...note.metadata.tags, t] } };
    setTagInput('');
    await window.notable.notes.write(next);
  }

  async function removeTag(tag: string): Promise<void> {
    if (!note) return;
    const next: Note = { ...note, metadata: { ...note.metadata, tags: note.metadata.tags.filter(t => t !== tag) } };
    await window.notable.notes.write(next);
  }

  async function attach(): Promise<void> {
    if (!note) return;
    const added = await window.notable.attachments.importFiles();
    if (!added.length) return;
    const snippets = added.map(a => {
      const ext = a.fileName.split('.').pop()?.toLowerCase() ?? '';
      const prefix = IMAGE_EXTS.has(ext) ? '!' : '';
      return `${prefix}[${a.fileName}](@attachment/${a.fileName})`;
    });
    const insertion = `\n\n${snippets.join('\n\n')}\n`;
    const nextContent = draft + insertion;
    setDraft(nextContent);
    if (note) persist({ ...note, content: nextContent });
  }

  useMenuCommand('cmd:attach',     attach);
  useMenuCommand('cmd:export-pdf', () => { if (note) window.notable.export.toPdf(note).catch(console.error); });

  if (!note) {
    return (
      <div className="flex-1 flex items-center justify-center text-center px-8" style={{ background: 'var(--color-main)' }}>
        <div className="opacity-60 max-w-md">
          <h2 className="text-lg font-medium mb-2">No note selected</h2>
          <p className="text-sm">Pick a note from the list, or press <kbd>⌘N</kbd> to create one.</p>
        </div>
      </div>
    );
  }

  const themeForEditor = document.body.classList.contains('theme-dark') ? 'dark' : 'light';

  return (
    <section className="flex-1 flex flex-col h-full min-w-0" style={{ background: 'var(--color-main)' }}>
      <div
        className="titlebar-drag flex items-center gap-2 px-3 h-10 border-b"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={onTitleBlur}
          onKeyDown={(e) => { if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur(); }}
          className="flex-1 min-w-0 bg-transparent text-sm font-medium outline-none"
        />
        <button onClick={attach}   title="Attach files (⌘⇧A)"          className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10"><PaperclipIcon /></button>
        <button onClick={toggleFav} title="Toggle favorite"             className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10">
          {note.metadata.favorited ? <StarFilledIcon className="text-yellow-500" /> : <StarIcon />}
        </button>
        <button onClick={trash}    title="Move to trash"               className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10"><TrashIcon /></button>
        <div className="w-px h-5" style={{ background: 'var(--color-border)' }} />
        <ViewToggle viewMode={viewMode} onChange={setViewMode} />
      </div>

      <div className="px-3 py-2 border-b flex items-center gap-2 flex-wrap text-xs" style={{ borderColor: 'var(--color-border)' }}>
        {note.metadata.tags.map(t => (
          <button
            key={t}
            onClick={() => removeTag(t)}
            title="Click to remove"
            className="px-1.5 py-0.5 rounded-full border"
            style={{ borderColor: 'var(--color-border-strong)' }}
          >
            {t} <span className="opacity-40">×</span>
          </button>
        ))}
        <input
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
          placeholder="add tag…"
          className="bg-transparent outline-none text-xs px-1 min-w-0 w-24"
        />
      </div>

      <div className="flex-1 min-h-0">
        {viewMode === 'editor'  && <div className="h-full"><Editor
            value={draft}
            onChange={onContentChange}
            theme={themeForEditor}
            wordWrap={settings?.editorWordWrap   ?? 'on'}
            fontSize={settings?.fontSize         ?? 14}
            tabSize={settings?.editorTabSize     ?? 2}
            showLineNumbers={settings?.showLineNumbers ?? true}
          /></div>}
        {viewMode === 'preview' && <Preview source={draft} theme={themeForEditor} />}
        {viewMode === 'split'   && (
          <div className="grid grid-cols-2 h-full">
            <div className="border-r" style={{ borderColor: 'var(--color-border)' }}>
              <Editor
                value={draft}
                onChange={onContentChange}
                theme={themeForEditor}
                wordWrap={settings?.editorWordWrap   ?? 'on'}
                fontSize={settings?.fontSize         ?? 14}
                tabSize={settings?.editorTabSize     ?? 2}
                showLineNumbers={settings?.showLineNumbers ?? true}
              />
            </div>
            <Preview source={draft} theme={themeForEditor} />
          </div>
        )}
      </div>
    </section>
  );
}

function ViewToggle({ viewMode, onChange }: { viewMode: 'split' | 'editor' | 'preview'; onChange: (m: 'split' | 'editor' | 'preview') => void }) {
  function btn(target: 'split' | 'editor' | 'preview', icon: React.ReactNode, label: string) {
    return (
      <button
        title={label}
        onClick={() => onChange(target)}
        className={`p-1 rounded ${viewMode === target ? 'bg-black/10 dark:bg-white/15' : 'hover:bg-black/5 dark:hover:bg-white/10'}`}
      >
        {icon}
      </button>
    );
  }
  return (
    <div className="flex items-center">
      {btn('editor',  <EditIcon  />, 'Editor only')}
      {btn('split',   <SplitIcon />, 'Split view')}
      {btn('preview', <EyeIcon   />, 'Preview only')}
    </div>
  );
}
