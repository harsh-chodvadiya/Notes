import { DEFAULT_FOLDER_ID, QUICK_FOLDER_ID, type Folder, type Note } from '../data';
import { diffState, folderCounts, isEmptyDiff, reducer, type Action, type State } from '../state';

const folder = (id: string, parentId: string | null = null): Folder => ({ id, name: id, color: '#000000', parentId });
const note = (id: string, folderId: string, extra: Partial<Note> = {}): Note => ({
  id,
  folderId,
  title: id,
  body: '',
  updatedAt: 1,
  ...extra,
});

const base = (): State => ({
  folders: [folder(DEFAULT_FOLDER_ID), folder('a'), folder('a1', 'a'), folder('b')],
  notes: [note('n1', 'a'), note('n2', 'a1'), note('n3', 'b'), note('n4', DEFAULT_FOLDER_ID)],
});

/** Applies a diff to a plain copy, the way the database would. */
function applyToCopy(prev: State, next: State): State {
  const d = diffState(prev, next);
  const upsert = <T extends { id: string }>(list: T[], rows: T[], removed: string[]) => {
    const out = list.filter((x) => !removed.includes(x.id)).map((x) => rows.find((r) => r.id === x.id) ?? x);
    return [...out, ...rows.filter((r) => !list.some((x) => x.id === r.id))];
  };
  return {
    folders: upsert(prev.folders, d.upsertFolders, d.deleteFolderIds),
    notes: upsert(prev.notes, d.upsertNotes, d.deleteNoteIds),
  };
}

const byId = <T extends { id: string }>(xs: T[]) => [...xs].sort((a, b) => a.id.localeCompare(b.id));

describe('reducer + diff stay in step (what the database stores)', () => {
  const actions: Action[] = [
    { type: 'addFolder', folder: folder('c') },
    { type: 'updateFolders', ids: ['a', 'b'], patch: { color: '#FF0000' } },
    { type: 'moveFolders', ids: ['b'], parentId: 'a' },
    { type: 'deleteFolders', ids: ['a'] },
    { type: 'saveNote', note: note('n9', 'b', { title: 'new' }) },
    { type: 'saveNote', note: note('n1', 'a', { title: 'edited' }) },
    { type: 'moveNotes', ids: ['n1', 'n3'], folderId: 'b' },
    { type: 'trashNotes', ids: ['n1'], at: 5 },
    { type: 'deleteNotes', ids: ['n2', 'n3'] },
    { type: 'batch', actions: [{ type: 'trashNotes', ids: ['n4'], at: 9 }, { type: 'deleteFolders', ids: ['b'] }] },
  ];

  it.each(actions.map((a) => [a.type, a] as const))('%s', (_, action) => {
    const prev = base();
    const next = reducer(prev, action);
    const stored = applyToCopy(prev, next);
    expect(byId(stored.folders)).toEqual(byId(next.folders));
    expect(byId(stored.notes)).toEqual(byId(next.notes));
  });

  it('writes only what changed', () => {
    const prev = base();
    const d = diffState(prev, reducer(prev, { type: 'saveNote', note: note('n1', 'a', { title: 'x' }) }));
    expect(d.upsertNotes.map((n) => n.id)).toEqual(['n1']);
    expect(d.upsertFolders).toEqual([]);
  });

  it('a no-op leaves nothing to write', () => {
    const prev = base();
    expect(isEmptyDiff(diffState(prev, reducer(prev, { type: 'deleteFolders', ids: [DEFAULT_FOLDER_ID] })))).toBe(true);
  });
});

describe('folders', () => {
  it('deleting a folder removes its subfolders and moves their notes to All Notes', () => {
    const next = reducer(base(), { type: 'deleteFolders', ids: ['a'] });
    expect(next.folders.map((f) => f.id)).toEqual([DEFAULT_FOLDER_ID, 'b']);
    expect(next.notes.filter((n) => n.folderId === DEFAULT_FOLDER_ID).map((n) => n.id).sort()).toEqual(['n1', 'n2', 'n4']);
  });

  it('the built-in folder cannot be moved or deleted', () => {
    const s = base();
    expect(reducer(s, { type: 'deleteFolders', ids: [DEFAULT_FOLDER_ID] })).toBe(s);
    expect(reducer(s, { type: 'moveFolders', ids: [DEFAULT_FOLDER_ID], parentId: 'a' }).folders[0].parentId).toBeNull();
  });

  it('Quick notes cannot be deleted, moved, or take folders in', () => {
    const s = { ...base(), folders: [...base().folders, folder(QUICK_FOLDER_ID)] };
    expect(reducer(s, { type: 'deleteFolders', ids: [QUICK_FOLDER_ID] })).toBe(s);
    expect(reducer(s, { type: 'moveFolders', ids: [QUICK_FOLDER_ID], parentId: 'a' }).folders.find((f) => f.id === QUICK_FOLDER_ID)?.parentId).toBeNull();
    expect(reducer(s, { type: 'moveFolders', ids: ['b'], parentId: QUICK_FOLDER_ID })).toBe(s);
  });
});

describe('Recycle bin', () => {
  it('trash, then restore', () => {
    const trashed = reducer(base(), { type: 'trashNotes', ids: ['n1'], at: 42 });
    expect(trashed.notes.find((n) => n.id === 'n1')?.deletedAt).toBe(42);
    const restored = reducer(trashed, { type: 'restoreNotes', ids: ['n1'] });
    expect(restored.notes.find((n) => n.id === 'n1')).toMatchObject({ deletedAt: null, folderId: 'a' });
  });

  it('a note whose folder is gone restores into All Notes', () => {
    let s = reducer(base(), { type: 'trashNotes', ids: ['n3'], at: 1 });
    // Simulate the folder vanishing while the note sat in the bin.
    s = { ...s, folders: s.folders.filter((f) => f.id !== 'b') };
    s = reducer(s, { type: 'restoreNotes', ids: ['n3'] });
    expect(s.notes.find((n) => n.id === 'n3')?.folderId).toBe(DEFAULT_FOLDER_ID);
  });

  it('undo puts the earlier state back', () => {
    const before = base();
    const after = reducer(before, { type: 'batch', actions: [{ type: 'deleteFolders', ids: ['a'] }, { type: 'trashNotes', ids: ['n3'], at: 1 }] });
    const undone = reducer(after, { type: 'replace', state: before });
    expect(applyToCopy(after, undone)).toEqual({ folders: expect.arrayContaining(before.folders), notes: expect.arrayContaining(before.notes) });
  });
});

describe('folderCounts', () => {
  it('counts subfolder notes in their parents and skips the bin', () => {
    const s = reducer(base(), { type: 'trashNotes', ids: ['n3'], at: 1 });
    const counts = folderCounts(s.folders, s.notes);
    expect(counts.get('a')).toBe(2);
    expect(counts.get('a1')).toBe(1);
    expect(counts.get('b')).toBe(0);
    expect(counts.get(DEFAULT_FOLDER_ID)).toBe(1);
  });

  it('survives a parent cycle in bad data', () => {
    const counts = folderCounts([folder('x', 'y'), folder('y', 'x')], [note('n', 'x')]);
    expect(counts.get('x')).toBe(1);
    expect(counts.get('y')).toBe(1);
  });
});
