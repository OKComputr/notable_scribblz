import { app, BrowserWindow, Menu, shell, protocol, net } from 'electron';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { initWorkspaceFromSettings, registerIpc } from './ipc';
import { loadSettings } from './store';

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  const isDev = !app.isPackaged;
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 760,
    minHeight: 480,
    title: 'Notable Modern',
    show: false,
    autoHideMenuBar: false,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.on('ready-to-show', () => mainWindow?.show());
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (isDev && process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

function registerAttachmentProtocol(): void {
  // Renderer requests `attachment://<filename>` and we resolve to the
  // workspace's attachments directory at runtime.
  protocol.handle('attachment', async (request) => {
    const url = new URL(request.url);
    const fileName = decodeURIComponent(url.pathname.replace(/^\//, '') || url.hostname);
    const s = await loadSettings();
    if (!s.dataDir) return new Response('No workspace open', { status: 404 });
    const filePath = join(s.dataDir, 'attachments', fileName);
    return net.fetch(pathToFileURL(filePath).toString());
  });
}

// Must run BEFORE app.whenReady().
protocol.registerSchemesAsPrivileged([
  { scheme: 'attachment', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, bypassCSP: true } }
]);

app.whenReady().then(async () => {
  registerAttachmentProtocol();
  registerIpc();
  await initWorkspaceFromSettings();

  Menu.setApplicationMenu(buildMenu());
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

function buildMenu(): Menu {
  const isMac = process.platform === 'darwin';
  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac ? [{ role: 'appMenu' as const }] : []),
    {
      label: 'File',
      submenu: [
        { label: 'New Note',  accelerator: 'CmdOrCtrl+N', click: () => mainWindow?.webContents.send('cmd:new-note') },
        { label: 'Open Data Folder…', accelerator: 'CmdOrCtrl+Shift+O',
          click: () => mainWindow?.webContents.send('cmd:open-data-folder') },
        { type: 'separator' },
        { label: 'Attach…', accelerator: 'CmdOrCtrl+Shift+A',
          click: () => mainWindow?.webContents.send('cmd:attach') },
        { label: 'Export as PDF…', click: () => mainWindow?.webContents.send('cmd:export-pdf') },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' }
      ]
    },
    { role: 'editMenu' },
    {
      label: 'View',
      submenu: [
        { label: 'Toggle Theme', accelerator: 'CmdOrCtrl+Shift+T',
          click: () => mainWindow?.webContents.send('cmd:toggle-theme') },
        { label: 'Focus Search', accelerator: 'CmdOrCtrl+F',
          click: () => mainWindow?.webContents.send('cmd:focus-search') },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }
      ]
    },
    { role: 'windowMenu' },
    {
      role: 'help',
      submenu: [
        { label: 'Notable Project', click: () => shell.openExternal('https://github.com/notable/notable') }
      ]
    }
  ];
  return Menu.buildFromTemplate(template);
}
