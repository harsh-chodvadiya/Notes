import { DEFAULT_FOLDER_ID, QUICK_FOLDER_ID, isLockedFolder, withDescendants, type Folder, type Note } from './data';

/**
 * App state and its reducer. Pure (no React, no database), so it can be unit
 * tested. The database is written from `diffState(before, after)`, never from
 * the action itself, so storage can't drift from what the reducer produced.
 */
export type State = {
  folders: Folder[];
  notes: Note[];
};

export type Action =
  | { type: 'addFolder'; folder: Folder }
  | { type: 'updateFolders'; ids: string[]; patch: Partial<Omit<Folder, 'id' | 'parentId'>> }
  | { type: 'moveFolders'; ids: string[]; parentId: string | null }
  /** Also removes every subfolder; their notes move to the default folder. */
  | { type: 'deleteFolders'; ids: string[] }
  /** Adds the note, or replaces the one with the same id. */
  | { type: 'saveNote'; note: Note }
  | { type: 'moveNotes'; ids: string[]; folderId: string }
  /** To the Recycle bin. */
  | { type: 'trashNotes'; ids: string[]; at: number }
  /** Out of the Recycle bin; a note whose folder is gone goes to the default folder. */
  | { type: 'restoreNotes'; ids: string[] }
  /** Gone for good. */
  | { type: 'deleteNotes'; ids: string[] }
  /** Puts back an earlier state wholesale (Undo). */
  | { type: 'replace'; state: State }
  /** Several actions as one change (one save, one Undo). */
  | { type: 'batch'; actions: Action[] };

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'addFolder':
      return { ...state, folders: [...state.folders, action.folder] };
    case 'updateFolders': {
      const ids = new Set(action.ids);
      return { ...state, folders: state.folders.map((f) => (ids.has(f.id) ? { ...f, ...action.patch } : f)) };
    }
    case 'moveFolders': {
      // Quick notes holds notes only.
      if (action.parentId === QUICK_FOLDER_ID) return state;
      const ids = new Set(action.ids.filter((id) => !isLockedFolder(id)));
      return { ...state, folders: state.folders.map((f) => (ids.has(f.id) ? { ...f, parentId: action.parentId } : f)) };
    }
    case 'deleteFolders': {
      const ids = withDescendants(
        state.folders,
        action.ids.filter((id) => !isLockedFolder(id))
      );
      if (!ids.size) return state;
      return {
        folders: state.folders.filter((f) => !ids.has(f.id)),
        notes: state.notes.map((n) => (ids.has(n.folderId) ? { ...n, folderId: DEFAULT_FOLDER_ID } : n)),
      };
    }
    case 'saveNote': {
      const exists = state.notes.some((n) => n.id === action.note.id);
      return {
        ...state,
        notes: exists ? state.notes.map((n) => (n.id === action.note.id ? action.note : n)) : [action.note, ...state.notes],
      };
    }
    case 'moveNotes': {
      const ids = new Set(action.ids);
      return { ...state, notes: state.notes.map((n) => (ids.has(n.id) && n.folderId !== action.folderId ? { ...n, folderId: action.folderId } : n)) };
    }
    case 'trashNotes': {
      const ids = new Set(action.ids);
      return { ...state, notes: state.notes.map((n) => (ids.has(n.id) && !n.deletedAt ? { ...n, deletedAt: action.at } : n)) };
    }
    case 'restoreNotes': {
      const ids = new Set(action.ids);
      const folderIds = new Set(state.folders.map((f) => f.id));
      return {
        ...state,
        notes: state.notes.map((n) =>
          ids.has(n.id) && n.deletedAt
            ? { ...n, deletedAt: null, folderId: folderIds.has(n.folderId) ? n.folderId : DEFAULT_FOLDER_ID }
            : n
        ),
      };
    }
    case 'deleteNotes': {
      const ids = new Set(action.ids);
      return { ...state, notes: state.notes.filter((n) => !ids.has(n.id)) };
    }
    case 'replace':
      return action.state;
    case 'batch':
      return action.actions.reduce(reducer, state);
    default:
      return state;
  }
}

export type Diff = {
  upsertFolders: Folder[];
  deleteFolderIds: string[];
  upsertNotes: Note[];
  deleteNoteIds: string[];
};

/** Rows to write so storage matches `next`. Relies on the reducer keeping untouched items by reference. */
export function diffState(prev: State, next: State): Diff {
  const diff = <T extends { id: string }>(before: T[], after: T[]) => {
    const old = new Map(before.map((x) => [x.id, x]));
    const upsert = after.filter((x) => old.get(x.id) !== x);
    const kept = new Set(after.map((x) => x.id));
    return { upsert, removed: before.filter((x) => !kept.has(x.id)).map((x) => x.id) };
  };
  const folders = diff(prev.folders, next.folders);
  const notes = diff(prev.notes, next.notes);
  return {
    upsertFolders: folders.upsert,
    deleteFolderIds: folders.removed,
    upsertNotes: notes.upsert,
    deleteNoteIds: notes.removed,
  };
}

export const isEmptyDiff = (d: Diff) =>
  !d.upsertFolders.length && !d.deleteFolderIds.length && !d.upsertNotes.length && !d.deleteNoteIds.length;

/** Notes that aren't in the Recycle bin. */
export const liveNotes = (notes: Note[]) => notes.filter((n) => !n.deletedAt);

/** Notes in each folder, subfolders' notes included, in one pass. */
export function folderCounts(folders: Folder[], notes: Note[]): Map<string, number> {
  const parent = new Map(folders.map((f) => [f.id, f.parentId]));
  const counts = new Map<string, number>(folders.map((f) => [f.id, 0]));
  for (const n of notes) {
    if (n.deletedAt) continue;
    // Walk up the tree; `seen` guards against a cycle in bad data.
    const seen = new Set<string>();
    for (let id: string | null | undefined = n.folderId; id && counts.has(id) && !seen.has(id); id = parent.get(id)) {
      seen.add(id);
      counts.set(id, counts.get(id)! + 1);
    }
  }
  return counts;
}
