import { BrowserWindow, app, dialog, ipcMain, shell } from 'electron';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import chokidar, { type FSWatcher } from 'chokidar';
import type { Note, Workspace } from '@shared/types';
import { loadSettings, saveSettings } from './store';
import {
  createNote,
  ensureWorkspaceLayout,
  importAttachments,
  listAttachments,
  listNotes,
  makeWorkspace,
  readNote,
  removeAttachment,
  renameNote,
  restoreFromTrash,
  trashNote,
  writeNote
} from './workspace';

let workspace: Workspace | null = null;
let watcher: FSWatcher | null = null;

function broadcast(channel: string, ...args: unknown[]): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(channel, ...args);
  }
}

function emitNotesChanged(): void {
  broadcast('notes:changed');
}

async function setWorkspaceFromDir(dir: string | undefined | null): Promise<Workspace | null> {
  if (!dir) return null;
  const ws = makeWorkspace(dir);
  await ensureWorkspaceLayout(ws);
  workspace = ws;
  await saveSettings({ dataDir: dir });
  watcher?.close();
  watcher = chokidar.watch(ws.notesDir, {
    ignored: /(^|[\\/])\..+|node_modules/,
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 }
  });
  watcher.on('add',    emitNotesChanged);
  watcher.on('change', emitNotesChanged);
  watcher.on('unlink', emitNotesChanged);
  return ws;
}

function requireWorkspace(): Workspace {
  if (!workspace) throw new Error('No workspace open');
  return workspace;
}

function defaultWorkspaceDir(): string {
  return join(app.getPath('documents'), 'Notable Modern');
}

export async function initWorkspaceFromSettings(): Promise<void> {
  const s = await loadSettings();
  const dir = s.dataDir ?? defaultWorkspaceDir();
  try {
    await setWorkspaceFromDir(dir);
  } catch (err) {
    console.error('Failed to open workspace', err);
  }
}

export function registerIpc(): void {
  // ---- Workspace ----
  ipcMain.handle('workspace:current', async () => workspace);
  ipcMain.handle('workspace:pickFolder', async () => {
    const win = BrowserWindow.getFocusedWindow();
    const result = await dialog.showOpenDialog(win!, {
      title: 'Select your notes folder',
      properties: ['openDirectory', 'createDirectory']
    });
    if (result.canceled || !result.filePaths[0]) return null;
    const ws = await setWorkspaceFromDir(result.filePaths[0]);
    emitNotesChanged();
    return ws;
  });

  // ---- Notes ----
  ipcMain.handle('notes:list',    async ()                                  => listNotes(requireWorkspace()));
  ipcMain.handle('notes:read',    async (_e, filePath: string)              => readNote(filePath));
  ipcMain.handle('notes:write',   async (_e, note: Note)                    => writeNote(note));
  ipcMain.handle('notes:create',  async (_e, title: string)                 => createNote(requireWorkspace(), title));
  ipcMain.handle('notes:rename',  async (_e, filePath: string, t: string)   => renameNote(requireWorkspace(), filePath, t));
  ipcMain.handle('notes:trash',   async (_e, filePath: string)              => trashNote(requireWorkspace(), filePath));
  ipcMain.handle('notes:restore', async (_e, filePath: string)              => restoreFromTrash(requireWorkspace(), filePath));

  // ---- Attachments ----
  ipcMain.handle('attachments:list',        async ()                       => listAttachments(requireWorkspace()));
  ipcMain.handle('attachments:importPaths', async (_e, paths: string[])    => importAttachments(requireWorkspace(), paths));
  ipcMain.handle('attachments:importFiles', async () => {
    const win = BrowserWindow.getFocusedWindow();
    const result = await dialog.showOpenDialog(win!, {
      title: 'Attach files',
      properties: ['openFile', 'multiSelections']
    });
    if (result.canceled || result.filePaths.length === 0) return [];
    return importAttachments(requireWorkspace(), result.filePaths);
  });
  ipcMain.handle('attachments:remove', async (_e, fileName: string) => removeAttachment(requireWorkspace(), fileName));

  // ---- Settings ----
  ipcMain.handle('settings:get',    async () => loadSettings());
  ipcMain.handle('settings:update', async (_e, patch) => saveSettings(patch));

  // ---- Export ----
  ipcMain.handle('export:html', async (_e, note: Note) => {
    return `<!doctype html><meta charset="utf-8"><title>${note.metadata.title}</title><pre>${
      note.content.replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' })[c]!)
    }</pre>`;
  });
  ipcMain.handle('export:pdf', async (_e, note: Note) => {
    const win = BrowserWindow.getFocusedWindow();
    if (!win) return;
    const result = await dialog.showSaveDialog(win, {
      title: 'Export note as PDF',
      defaultPath: `${note.metadata.title}.pdf`,
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    });
    if (result.canceled || !result.filePath) return;
    const data = await win.webContents.printToPDF({ printBackground: true });
    await fs.writeFile(result.filePath, data);
    shell.showItemInFolder(result.filePath);
  });

  // ---- ENEX import (stub for now; phase 3) ----
  ipcMain.handle('import:enex', async () => {
    const win = BrowserWindow.getFocusedWindow();
    await dialog.showMessageBox(win!, {
      type: 'info',
      message: 'ENEX import',
      detail: 'Coming in a later commit.'
    });
    return { imported: 0, failed: 0 };
  });

  // ---- Attachment URL helper (renderer constructs file:// URLs from these) ----
  ipcMain.handle('attachments:resolvePath', async (_e, fileName: string) => {
    return join(requireWorkspace().attachmentsDir, fileName);
  });
}
