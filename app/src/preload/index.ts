import { contextBridge, ipcRenderer } from 'electron';
import type { Note, NotableApi, AppSettings, Workspace, Attachment } from '@shared/types';

const api: NotableApi = {
  workspace: {
    current:    () => ipcRenderer.invoke('workspace:current')    as Promise<Workspace | null>,
    pickFolder: () => ipcRenderer.invoke('workspace:pickFolder') as Promise<Workspace | null>
  },
  notes: {
    list:    () => ipcRenderer.invoke('notes:list')   as Promise<Note[]>,
    read:    (p)        => ipcRenderer.invoke('notes:read',    p)        as Promise<Note>,
    write:   (n)        => ipcRenderer.invoke('notes:write',   n)        as Promise<Note>,
    create:  (t)        => ipcRenderer.invoke('notes:create',  t)        as Promise<Note>,
    rename:  (p, t)     => ipcRenderer.invoke('notes:rename',  p, t)     as Promise<Note>,
    trash:   (p)        => ipcRenderer.invoke('notes:trash',   p)        as Promise<void>,
    restore: (p)        => ipcRenderer.invoke('notes:restore', p)        as Promise<void>
  },
  attachments: {
    list:        () => ipcRenderer.invoke('attachments:list')        as Promise<Attachment[]>,
    importFiles: () => ipcRenderer.invoke('attachments:importFiles') as Promise<Attachment[]>,
    importPaths: (paths: string[]) => ipcRenderer.invoke('attachments:importPaths', paths) as Promise<Attachment[]>,
    remove:      (fileName: string) => ipcRenderer.invoke('attachments:remove', fileName)  as Promise<void>,
    url:         (fileName: string) => `attachment:///${encodeURIComponent(fileName)}`
  },
  settings: {
    get:    () => ipcRenderer.invoke('settings:get')                          as Promise<AppSettings>,
    update: (patch: Partial<AppSettings>) =>
              ipcRenderer.invoke('settings:update', patch)                    as Promise<AppSettings>
  },
  export: {
    toHtml: (n) => ipcRenderer.invoke('export:html', n) as Promise<string>,
    toPdf:  (n) => ipcRenderer.invoke('export:pdf',  n) as Promise<void>
  },
  import: {
    enex: () => ipcRenderer.invoke('import:enex') as Promise<{ imported: number; failed: number }>
  },
  onNotesChanged: (cb: () => void) => {
    const listener = (): void => cb();
    ipcRenderer.on('notes:changed', listener);
    return () => ipcRenderer.off('notes:changed', listener);
  }
};

// Forward menu commands as DOM events so the renderer can hang plain handlers.
[
  'cmd:new-note',
  'cmd:open-data-folder',
  'cmd:attach',
  'cmd:export-pdf',
  'cmd:toggle-theme',
  'cmd:focus-search'
].forEach(channel => {
  ipcRenderer.on(channel, () => {
    window.dispatchEvent(new CustomEvent(channel));
  });
});

contextBridge.exposeInMainWorld('notable', api);
