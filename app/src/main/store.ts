import { app } from 'electron';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import type { AppSettings } from '@shared/types';

const SETTINGS_FILE = 'settings.json';

const DEFAULTS: AppSettings = {
  dataDir: undefined,
  theme: 'system',
  fontSize: 14,
  editorTabSize: 2,
  editorWordWrap: 'on',
  showLineNumbers: true
};

let cache: AppSettings | null = null;

function settingsPath(): string {
  return join(app.getPath('userData'), SETTINGS_FILE);
}

export async function loadSettings(): Promise<AppSettings> {
  if (cache) return cache;
  try {
    const raw = await fs.readFile(settingsPath(), 'utf8');
    cache = { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    cache = { ...DEFAULTS };
  }
  return cache!;
}

export async function saveSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  const current = await loadSettings();
  const next = { ...current, ...patch };
  await fs.mkdir(app.getPath('userData'), { recursive: true });
  await fs.writeFile(settingsPath(), JSON.stringify(next, null, 2), 'utf8');
  cache = next;
  return next;
}
