import { COMPOSE, QUICK_COLOR } from './theme';

/** `parentId` null = top level (Samsung's "Folders" root). */
export type Folder = { id: string; name: string; color: string; parentId: string | null };

export type Note = {
  id: string;
  folderId: string;
  title: string;
  body: string;
  updatedAt: number;
  /**
   * Opens only through the phone's screen lock; content hidden in lists and search.
   * A locked note's `body` is stored encrypted (see `crypto.ts`).
   */
  locked?: boolean;
  /** When it went to the Recycle bin; unset while it's a live note. */
  deletedAt?: number | null;
};

/** Days a note stays in the Recycle bin before it's deleted for good. */
export const TRASH_DAYS = 30;

/** Built-in folder: new notes from the home page land here. Always coral, and it has no folder options. */
export const DEFAULT_FOLDER_ID = 'f-all-notes';

/** Removed built-in folder; its notes are moved into All Notes on start-up. */
export const OLD_QUICK_NOTE_FOLDER_ID = 'f-quick-notes';

/**
 * Built-in Quick notes folder (iPhone Notes style): short notes made from Home's
 * quick-note button. Shown as a strip on Home and its own drawer row rather than
 * as a folder tile, and it never holds subfolders.
 */
export const QUICK_FOLDER_ID = 'f-quick';

/** Built-in folders that cannot be renamed, moved, coloured, or deleted. */
export function isLockedFolder(id: string) {
  return id === DEFAULT_FOLDER_ID || id === QUICK_FOLDER_ID;
}

export const seedFolders: Folder[] = [
  { id: DEFAULT_FOLDER_ID, name: 'All Notes', color: COMPOSE, parentId: null },
  { id: QUICK_FOLDER_ID, name: 'Quick notes', color: QUICK_COLOR, parentId: null },
];

/** The folder and everything nested under it. */
export function withDescendants(folders: Folder[], ids: Iterable<string>): Set<string> {
  const out = new Set(ids);
  let grew = true;
  while (grew) {
    grew = false;
    for (const f of folders) {
      if (f.parentId && out.has(f.parentId) && !out.has(f.id)) {
        out.add(f.id);
        grew = true;
      }
    }
  }
  return out;
}
