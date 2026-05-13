export interface NoteMetadata {
  title: string;
  tags: string[];
  created: string;       // ISO 8601
  modified: string;      // ISO 8601
  pinned?: boolean;
  favorited?: boolean;
  deleted?: boolean;
  attachments?: string[];
  [key: string]: unknown;
}

export interface Note {
  filePath: string;       // absolute path inside the data dir
  fileName: string;       // basename, e.g. "Inline image test.md"
  metadata: NoteMetadata;
  content: string;        // markdown body (without frontmatter)
}

export interface Attachment {
  fileName: string;
  filePath: string;       // absolute path
  size: number;
  mtime: string;
}

export interface Workspace {
  dataDir: string;
  notesDir: string;
  attachmentsDir: string;
}

export interface AppSettings {
  dataDir?: string;
  theme: 'light' | 'dark' | 'system';
  fontSize: number;
  editorTabSize: number;
  editorWordWrap: 'off' | 'on' | 'bounded';
  showLineNumbers: boolean;
}

export type Sort =
  | { by: 'title';    type: 'asc' | 'desc' }
  | { by: 'modified'; type: 'asc' | 'desc' }
  | { by: 'created';  type: 'asc' | 'desc' };

export interface NotesApi {
  list:   () => Promise<Note[]>;
  read:   (filePath: string) => Promise<Note>;
  write:  (note: Note) => Promise<Note>;
  create: (title: string) => Promise<Note>;
  rename: (filePath: string, newTitle: string) => Promise<Note>;
  trash:  (filePath: string) => Promise<void>;
  restore: (filePath: string) => Promise<void>;
}

export interface WorkspaceApi {
  current:    () => Promise<Workspace | null>;
  pickFolder: () => Promise<Workspace | null>;
}

export interface AttachmentsApi {
  list:        () => Promise<Attachment[]>;
  importFiles: () => Promise<Attachment[]>;
  importPaths: (paths: string[]) => Promise<Attachment[]>;
  remove:      (fileName: string) => Promise<void>;
  url:         (fileName: string) => string;
}

export interface SettingsApi {
  get:    () => Promise<AppSettings>;
  update: (patch: Partial<AppSettings>) => Promise<AppSettings>;
}

export interface ExportApi {
  toHtml: (note: Note) => Promise<string>;
  toPdf:  (note: Note) => Promise<void>;
}

export interface ImportApi {
  enex: () => Promise<{ imported: number; failed: number }>;
}

export interface NotableApi {
  workspace:   WorkspaceApi;
  notes:       NotesApi;
  attachments: AttachmentsApi;
  settings:    SettingsApi;
  export:      ExportApi;
  import:      ImportApi;
  onNotesChanged: (cb: () => void) => () => void;
}

declare global {
  interface Window {
    notable: NotableApi;
  }
}

export const ATTACHMENT_TOKEN = '@attachment';
export const IMAGE_EXTS = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'avif', 'bmp', 'ico'
]);
