import { openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';
import { DEFAULT_FOLDER_ID, OLD_QUICK_NOTE_FOLDER_ID, seedFolders, type Folder, type Note } from './data';
import type { Diff, State } from './state';

/** On-device SQLite store for folders, notes and settings. */
const db = openDatabaseSync('notes.db');

/**
 * Schema migrations, in order. `PRAGMA user_version` records how many have run,
 * so each runs exactly once. Never edit or reorder a released step — add one.
 */
const MIGRATIONS: ((db: SQLiteDatabase) => void)[] = [
  // 1: the original schema. Databases from before versioning already have some
  // of it, so every statement here is safe to repeat.
  (db) => {
    db.execSync(`
      CREATE TABLE IF NOT EXISTS folders (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        color TEXT NOT NULL,
        parent_id TEXT
      );
      CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY NOT NULL,
        folder_id TEXT NOT NULL,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS notes_folder ON notes (folder_id);
      CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);
    `);
    if (!db.getAllSync<{ name: string }>('PRAGMA table_info(notes)').some((c) => c.name === 'locked')) {
      db.execSync('ALTER TABLE notes ADD COLUMN locked INTEGER NOT NULL DEFAULT 0');
    }
    // Quick note was removed: its notes join All Notes and the folder goes.
    db.runSync('UPDATE notes SET folder_id = ? WHERE folder_id = ?', DEFAULT_FOLDER_ID, OLD_QUICK_NOTE_FOLDER_ID);
    db.runSync('DELETE FROM folders WHERE id = ?', OLD_QUICK_NOTE_FOLDER_ID);
  },
  // 2: Recycle bin.
  (db) => {
    db.execSync('ALTER TABLE notes ADD COLUMN deleted_at INTEGER');
  },
];

db.execSync('PRAGMA journal_mode = WAL;');
const version = db.getFirstSync<{ user_version: number }>('PRAGMA user_version')?.user_version ?? 0;
for (let v = version; v < MIGRATIONS.length; v++) {
  db.withTransactionSync(() => {
    MIGRATIONS[v](db);
    // PRAGMA takes no bound parameters; `v + 1` is always a small integer.
    db.execSync(`PRAGMA user_version = ${v + 1}`);
  });
}

// The built-in All Notes folder always exists.
for (const f of seedFolders) {
  db.runSync('INSERT OR IGNORE INTO folders (id, name, color, parent_id) VALUES (?, ?, ?, ?)', f.id, f.name, f.color, f.parentId);
}

type FolderRow = { id: string; name: string; color: string; parent_id: string | null };
type NoteRow = {
  id: string;
  folder_id: string;
  title: string;
  body: string;
  updated_at: number;
  locked: number;
  deleted_at: number | null;
};

/** Everything, for the store's starting state. Folders keep creation order. */
export function loadState(): State {
  const folders = db
    .getAllSync<FolderRow>('SELECT * FROM folders ORDER BY rowid')
    .map((r): Folder => ({ id: r.id, name: r.name, color: r.color, parentId: r.parent_id }));
  const notes = db.getAllSync<NoteRow>('SELECT * FROM notes ORDER BY updated_at DESC').map(
    (r): Note => ({
      id: r.id,
      folderId: r.folder_id,
      title: r.title,
      body: r.body,
      updatedAt: r.updated_at,
      locked: !!r.locked,
      deletedAt: r.deleted_at,
    })
  );
  return { folders, notes };
}

const marks = (n: number) => Array(n).fill('?').join(', ');

/** Writes a state change, all or nothing. Throws if the database refuses it. */
export function applyDiff(d: Diff) {
  db.withTransactionSync(() => {
    for (const f of d.upsertFolders) {
      db.runSync(
        `INSERT INTO folders (id, name, color, parent_id) VALUES (?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET name = excluded.name, color = excluded.color, parent_id = excluded.parent_id`,
        f.id,
        f.name,
        f.color,
        f.parentId
      );
    }
    for (const n of d.upsertNotes) {
      db.runSync(
        `INSERT INTO notes (id, folder_id, title, body, updated_at, locked, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET folder_id = excluded.folder_id, title = excluded.title, body = excluded.body,
           updated_at = excluded.updated_at, locked = excluded.locked, deleted_at = excluded.deleted_at`,
        n.id,
        n.folderId,
        n.title,
        n.body,
        n.updatedAt,
        n.locked ? 1 : 0,
        n.deletedAt ?? null
      );
    }
    if (d.deleteNoteIds.length) db.runSync(`DELETE FROM notes WHERE id IN (${marks(d.deleteNoteIds.length)})`, ...d.deleteNoteIds);
    if (d.deleteFolderIds.length) db.runSync(`DELETE FROM folders WHERE id IN (${marks(d.deleteFolderIds.length)})`, ...d.deleteFolderIds);
  });
}

export function getSetting(key: string): string | null {
  return db.getFirstSync<{ value: string }>('SELECT value FROM settings WHERE key = ?', key)?.value ?? null;
}

export function setSetting(key: string, value: string) {
  db.runSync('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', key, value);
}

/** Most recent search terms, newest first. */
export function loadRecentSearches(): string[] {
  try {
    return JSON.parse(getSetting('recentSearches') ?? '[]') as string[];
  } catch {
    return [];
  }
}

export function saveRecentSearches(list: string[]) {
  setSetting('recentSearches', JSON.stringify(list));
}
