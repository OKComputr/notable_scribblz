import Fuse from 'fuse.js';
import type { Note } from '@shared/types';

let fuse: Fuse<Note> | null = null;
let lastVersion = 0;

export function rebuildIndex(notes: Note[]): void {
  fuse = new Fuse(notes, {
    includeScore: true,
    threshold: 0.35,
    ignoreLocation: true,
    keys: [
      { name: 'metadata.title', weight: 0.5 },
      { name: 'metadata.tags',  weight: 0.2 },
      { name: 'content',        weight: 0.3 }
    ]
  });
  lastVersion++;
}

export function searchNotes(query: string, notes: Note[]): Note[] {
  if (!fuse || lastVersion === 0) rebuildIndex(notes);
  const q = query.trim();
  if (!q) return notes;
  return fuse!.search(q).map(r => r.item);
}
