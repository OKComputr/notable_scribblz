import { useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { NoteList } from './components/NoteList';
import { EditorPane } from './components/EditorPane';
import { useStore } from './store/app';
import { useTheme, toggleTheme } from './hooks/useTheme';
import { useMenuCommand } from './hooks/useMenuCommand';

export default function App() {
  const setWorkspace   = useStore(s => s.setWorkspace);
  const setNotes       = useStore(s => s.setNotes);
  const setAttachments = useStore(s => s.setAttachments);
  const setSettings    = useStore(s => s.setSettings);
  const setSelected    = useStore(s => s.setSelected);
  const workspace      = useStore(s => s.workspace);
  useTheme();

  // Initial load: workspace + settings.
  useEffect(() => {
    async function init(): Promise<void> {
      const [ws, settings] = await Promise.all([
        window.notable.workspace.current(),
        window.notable.settings.get()
      ]);
      setSettings(settings);
      if (ws) {
        setWorkspace(ws);
        await Promise.all([refreshNotes(), refreshAttachments()]);
      }
    }
    init().catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Watch for FS changes (chokidar -> IPC).
  useEffect(() => {
    if (!workspace) return;
    const off = window.notable.onNotesChanged(() => {
      refreshNotes().catch(console.error);
      refreshAttachments().catch(console.error);
    });
    return off;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspace?.dataDir]);

  // Menu commands handled at the top level.
  useMenuCommand('cmd:open-data-folder', async () => {
    const ws = await window.notable.workspace.pickFolder();
    if (ws) {
      setWorkspace(ws);
      await Promise.all([refreshNotes(), refreshAttachments()]);
    }
  });
  useMenuCommand('cmd:new-note', async () => {
    const current = useStore.getState().workspace;
    if (!current) {
      const ws = await window.notable.workspace.pickFolder();
      if (!ws) return;
      setWorkspace(ws);
    }
    const note = await window.notable.notes.create('Untitled');
    setSelected(note.filePath);
  });
  useMenuCommand('cmd:toggle-theme', toggleTheme);

  async function refreshNotes(): Promise<void> {
    const list = await window.notable.notes.list();
    setNotes(list);
  }
  async function refreshAttachments(): Promise<void> {
    const list = await window.notable.attachments.list();
    setAttachments(list);
  }

  return (
    <div className="grid h-full" style={{ gridTemplateColumns: '210px 300px minmax(0,1fr)' }}>
      <Sidebar />
      <NoteList />
      <EditorPane />
    </div>
  );
}
