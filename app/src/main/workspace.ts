import { promises as fs } from 'node:fs';
import { existsSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import matter from 'gray-matter';
import filenamify from 'filenamify';
import type { Note, NoteMetadata, Workspace, Attachment } from '@shared/types';

const TRASH_DIRNAME = '.trash';

function isoNow(): string {
  return new Date().toISOString();
}

export function makeWorkspace(dataDir: string): Workspace {
  return {
    dataDir,
    notesDir:       join(dataDir, 'notes'),
    attachmentsDir: join(dataDir, 'attachments')
  };
}

export async function ensureWorkspaceLayout(ws: Workspace): Promise<void> {
  await fs.mkdir(ws.notesDir,       { recursive: true });
  await fs.mkdir(ws.attachmentsDir, { recursive: true });
  await fs.mkdir(join(ws.dataDir, TRASH_DIRNAME), { recursive: true });
}

async function readNoteFile(filePath: string): Promise<Note> {
  const raw = await fs.readFile(filePath, 'utf8');
  const parsed = matter(raw);
  const metaData = parsed.data as Partial<NoteMetadata>;
  const fileName = basename(filePath);
  const fallbackTitle = fileName.replace(/\.md$/i, '');
  const metadata: NoteMetadata = {
    title:    typeof metaData.title === 'string' ? metaData.title : fallbackTitle,
    tags:     Array.isArray(metaData.tags) ? (metaData.tags as string[]).filter(t => typeof t === 'string') : [],
    created:  typeof metaData.created  === 'string' ? metaData.created  : isoNow(),
    modified: typeof metaData.modified === 'string' ? metaData.modified : isoNow(),
    pinned:     metaData.pinned     === true || undefined,
    favorited:  metaData.favorited  === true || undefined,
    deleted:    metaData.deleted    === true || undefined,
    attachments: Array.isArray(metaData.attachments)
      ? (metaData.attachments as string[]).filter(a => typeof a === 'string')
      : undefined
  };
  return { filePath, fileName, metadata, content: parsed.content };
}

export async function listNotes(ws: Workspace): Promise<Note[]> {
  let entries: string[] = [];
  try {
    entries = await fs.readdir(ws.notesDir);
  } catch {
    return [];
  }
  const mdFiles = entries.filter(e => extname(e).toLowerCase() === '.md');
  const out: Note[] = [];
  for (const f of mdFiles) {
    try {
      out.push(await readNoteFile(join(ws.notesDir, f)));
    } catch (err) {
      console.error('Failed to read note', f, err);
    }
  }
  return out;
}

export async function readNote(filePath: string): Promise<Note> {
  return readNoteFile(filePath);
}

function serialize(note: Note): string {
  const fm: Record<string, unknown> = {
    title:    note.metadata.title,
    tags:     note.metadata.tags,
    created:  note.metadata.created,
    modified: note.metadata.modified
  };
  if (note.metadata.pinned)     fm.pinned     = true;
  if (note.metadata.favorited)  fm.favorited  = true;
  if (note.metadata.deleted)    fm.deleted    = true;
  if (note.metadata.attachments && note.metadata.attachments.length > 0) {
    fm.attachments = note.metadata.attachments;
  }
  return matter.stringify(note.content, fm);
}

export async function writeNote(note: Note): Promise<Note> {
  const updated: Note = {
    ...note,
    metadata: { ...note.metadata, modified: isoNow() }
  };
  await fs.writeFile(updated.filePath, serialize(updated), 'utf8');
  return updated;
}

function safeFileName(title: string): string {
  return filenamify(title, { replacement: '-' }).slice(0, 120) || 'untitled';
}

async function uniqueNotePath(ws: Workspace, title: string): Promise<{ filePath: string; fileName: string }> {
  const base = safeFileName(title);
  let candidate = `${base}.md`;
  let i = 1;
  while (existsSync(join(ws.notesDir, candidate))) {
    candidate = `${base} (${++i}).md`;
  }
  return { filePath: join(ws.notesDir, candidate), fileName: candidate };
}

export async function createNote(ws: Workspace, title: string): Promise<Note> {
  await ensureWorkspaceLayout(ws);
  const now = isoNow();
  const resolvedTitle = (title || '').trim() || 'Untitled';
  const { filePath, fileName } = await uniqueNotePath(ws, resolvedTitle);
  const note: Note = {
    filePath,
    fileName,
    metadata: { title: resolvedTitle, tags: [], created: now, modified: now },
    content: ''
  };
  await fs.writeFile(filePath, serialize(note), 'utf8');
  return note;
}

export async function renameNote(ws: Workspace, filePath: string, newTitle: string): Promise<Note> {
  const note = await readNoteFile(filePath);
  const resolvedTitle = (newTitle || '').trim() || note.metadata.title;
  note.metadata.title = resolvedTitle;
  const { filePath: nextPath, fileName: nextName } = await uniqueNotePath(ws, resolvedTitle);
  await fs.writeFile(nextPath, serialize(note), 'utf8');
  if (nextPath !== filePath) await fs.unlink(filePath);
  return { ...note, filePath: nextPath, fileName: nextName };
}

export async function trashNote(ws: Workspace, filePath: string): Promise<void> {
  const trashDir = join(ws.dataDir, TRASH_DIRNAME);
  await fs.mkdir(trashDir, { recursive: true });
  const dest = join(trashDir, basename(filePath));
  await fs.rename(filePath, dest);
}

export async function restoreFromTrash(ws: Workspace, filePath: string): Promise<void> {
  const dest = join(ws.notesDir, basename(filePath));
  await fs.rename(filePath, dest);
}

export async function listAttachments(ws: Workspace): Promise<Attachment[]> {
  let entries: string[] = [];
  try {
    entries = await fs.readdir(ws.attachmentsDir);
  } catch {
    return [];
  }
  const out: Attachment[] = [];
  for (const f of entries) {
    try {
      const fp = join(ws.attachmentsDir, f);
      const stat = await fs.stat(fp);
      if (!stat.isFile()) continue;
      out.push({ fileName: f, filePath: fp, size: stat.size, mtime: stat.mtime.toISOString() });
    } catch (err) {
      console.error('Failed to stat attachment', f, err);
    }
  }
  return out;
}

export async function importAttachments(ws: Workspace, paths: string[]): Promise<Attachment[]> {
  await fs.mkdir(ws.attachmentsDir, { recursive: true });
  const out: Attachment[] = [];
  for (const src of paths) {
    const name = basename(src);
    const safe = filenamify(name, { replacement: '-' });
    let dest = join(ws.attachmentsDir, safe);
    if (existsSync(dest)) {
      const ext = extname(safe);
      const stem = safe.slice(0, safe.length - ext.length);
      let i = 1;
      while (existsSync(join(ws.attachmentsDir, `${stem} (${i})${ext}`))) i++;
      dest = join(ws.attachmentsDir, `${stem} (${i})${ext}`);
    }
    await fs.copyFile(src, dest);
    const stat = await fs.stat(dest);
    out.push({ fileName: basename(dest), filePath: dest, size: stat.size, mtime: stat.mtime.toISOString() });
  }
  return out;
}

export async function removeAttachment(ws: Workspace, fileName: string): Promise<void> {
  const fp = join(ws.attachmentsDir, fileName);
  try { await fs.unlink(fp); } catch {}
}
