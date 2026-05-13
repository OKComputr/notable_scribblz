import { create } from 'zustand';
import type { Attachment, AppSettings, Note, Sort, Workspace } from '@shared/types';

export type ViewMode = 'split' | 'editor' | 'preview';

type State = {
  workspace: Workspace | null;
  notes: Note[];
  attachments: Attachment[];
  selectedPath: string | null;
  search: string;
  activeTag: string | null;            // null = all
  showFavorites: boolean;
  showTrash: boolean;
  viewMode: ViewMode;
  settings: AppSettings | null;
  sort: Sort;
  loading: boolean;
  setWorkspace: (ws: Workspace | null) => void;
  setNotes: (notes: Note[]) => void;
  setAttachments: (a: Attachment[]) => void;
  setSelected: (p: string | null) => void;
  setSearch: (s: string) => void;
  setActiveTag: (t: string | null) => void;
  setShowFavorites: (v: boolean) => void;
  setShowTrash: (v: boolean) => void;
  setViewMode: (m: ViewMode) => void;
  setSettings: (s: AppSettings) => void;
  setSort: (s: Sort) => void;
  setLoading: (v: boolean) => void;
};

export const useStore = create<State>((set) => ({
  workspace: null,
  notes: [],
  attachments: [],
  selectedPath: null,
  search: '',
  activeTag: null,
  showFavorites: false,
  showTrash: false,
  viewMode: 'split',
  settings: null,
  sort: { by: 'modified', type: 'desc' },
  loading: false,
  setWorkspace:    (ws)    => set({ workspace: ws }),
  setNotes:        (notes) => set({ notes }),
  setAttachments:  (a)     => set({ attachments: a }),
  setSelected:     (p)     => set({ selectedPath: p }),
  setSearch:       (s)     => set({ search: s }),
  setActiveTag:    (t)     => set({ activeTag: t }),
  setShowFavorites: (v)    => set((s) => ({ showFavorites: v, showTrash: v ? false : s.showTrash })),
  setShowTrash:    (v)     => set((s) => ({ showTrash: v, showFavorites: v ? false : s.showFavorites })),
  setViewMode:     (m)     => set({ viewMode: m }),
  setSettings:     (s)     => set({ settings: s }),
  setSort:         (s)     => set({ sort: s }),
  setLoading:      (v)     => set({ loading: v })
}));

export function getSelectedNote(): Note | undefined {
  const { notes, selectedPath } = useStore.getState();
  return notes.find(n => n.filePath === selectedPath);
}
