import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppBar, BarButton, COLLAPSED_H, useAppBar } from '../components/AppBar';
import FolderForms, { nextFolderName, type CreateForm, type FolderForm, type RenameForm } from '../components/FolderForms';
import FolderNavRail, { RAIL_H } from '../components/FolderNavRail';
import FolderPicker from '../components/FolderPicker';
import MenuCard from '../components/MenuCard';
import NoteCard from '../components/NoteCard';
import QuickStrip from '../components/QuickStrip';
import { AddIcon, ComposeIcon, DeleteIcon, FolderAddIcon, MemoIcon, MenuIcon, MoveIcon, PaletteIcon, RenameIcon, SearchIcon } from '../components/icons';
import { Checkbox, Dialog, FolderCard, SELECTION_BAR_SPACE, SelectionBar, type BarAction } from '../components/ui';
import { decryptBody } from '../crypto';
import { authenticate } from '../lock';
import { DEFAULT_FOLDER_ID, QUICK_FOLDER_ID, isLockedFolder, type Folder, type Note } from '../data';
import { groupByDate } from '../format';
import { folderCounts, liveNotes, type Action } from '../state';
import { useStore } from '../store';
import { COMPOSE, DEFAULT_FOLDER_COLOR, FONT, useTheme } from '../theme';
import { plural, uid, useBackHandler } from '../utils';
import NoteEditor from './NoteEditor';
import SearchScreen from './SearchScreen';
import SettingsScreen from './SettingsScreen';
import TrashScreen from './TrashScreen';

/** Create-note button: 56dp, 24dp in from the right and bottom edges. */
const FAB = 56;
const FAB_INSET = 24;

/** Page side margin (note grid, headings). */
const SIDE = 12;
/** Folder grid, as Samsung Notes spaces it: 18dp in from the sides, 10dp between tiles. */
const FOLDER_SIDE = 18;
const FOLDER_GAP = 10;
const FOLDER_ROW_GAP = 14;
/** Note cards: Samsung Notes' grid view. */
const NOTE_GAP = 12;

/** What's ticked in selection mode. Folders and notes act differently, so they're kept apart. */
type Selection = { folders: Set<string>; notes: Set<string> };

/** One line of the page's virtualised list. */
type Row =
  | { key: string; kind: 'quick' }
  | { key: string; kind: 'label'; title: string }
  | { key: string; kind: 'folders' }
  | { key: string; kind: 'section'; title: string; first: boolean }
  | { key: string; kind: 'notes'; notes: Note[] };

/** Drawer views that list notes from every folder. */
type ListView = 'all' | 'locked';

/** Overlay pages opened from the app bar or drawer. */
type Overlay = 'search' | 'trash' | 'settings' | null;

/** Home: Samsung Notes "All notes" page with the folder grid under the app bar. */
export default function NotesScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { state, dispatch, undoable, toast } = useStore();
  const bar = useAppBar();
  const [viewH, setViewH] = useState(0);

  const [folderId, setFolderId] = useState<string | null>(null);
  /** Drawer list views across every folder: All notes, or only the locked ones. Null: Home or a folder. */
  const [listView, setListView] = useState<ListView | null>(null);
  const lockedView = listView === 'locked';
  const [selected, setSelected] = useState<Selection | null>(null);
  const [form, setForm] = useState<FolderForm | null>(null);
  const [moving, setMoving] = useState<'folders' | 'notes' | null>(null);
  const [barHidden, setBarHidden] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  /** Open editor: `note` null = a new note (filed in `folderId` if given). A locked note arrives decrypted. */
  const [editing, setEditing] = useState<{ note: Note | null; folderId?: string } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [overlay, setOverlay] = useState<Overlay>(null);

  const folders = state.folders;
  const live = useMemo(() => liveNotes(state.notes), [state.notes]);
  /** Every folder's note count (subfolders included), worked out once per change. */
  const counts = useMemo(() => folderCounts(folders, state.notes), [folders, state.notes]);
  const trashCount = state.notes.length - live.length;
  const folder = folderId ? folders.find((f) => f.id === folderId) : undefined;
  const isHome = !folderId && !listView;
  // Quick notes has its own strip on Home, so it's left out of the folder grid.
  const children = useMemo(
    () => (listView ? [] : folders.filter((f) => f.parentId === folderId && f.id !== QUICK_FOLDER_ID)),
    [folders, folderId, listView]
  );
  const quickNotes = useMemo(
    () => live.filter((n) => n.folderId === QUICK_FOLDER_ID).sort((a, b) => b.updatedAt - a.updatedAt),
    [live]
  );
  const lockedCount = useMemo(() => live.filter((n) => n.locked).length, [live]);
  // Home shows folders only; a folder lists the notes filed directly in it.
  const notes = useMemo(() => {
    const shown =
      listView === 'all'
        ? [...live]
        : listView === 'locked'
          ? live.filter((n) => n.locked)
          : folderId
            ? live.filter((n) => n.folderId === folderId)
            : [];
    return shown.sort((a, b) => b.updatedAt - a.updatedAt);
  }, [live, folderId, listView]);

  const selecting = selected !== null;
  const folderIds = selected ? [...selected.folders] : [];
  const noteIds = selected ? [...selected.notes] : [];
  const selectedCount = folderIds.length + noteIds.length;
  /** Built-in folders have no folder options, so they never join a selection. */
  const selectable = children.filter((f) => !isLockedFolder(f.id));
  const allSelected =
    selecting && selectable.length + notes.length > 0 && folderIds.length === selectable.length && noteIds.length === notes.length;
  const single = folderIds.length === 1 && !noteIds.length ? folders.find((f) => f.id === folderIds[0]) : undefined;
  /** Folders nest two levels deep: main folders → subfolders → notes. */
  const inSubfolder = !!folder?.parentId;

  const title = selecting ? (selectedCount ? `${selectedCount} selected` : 'Select items') : (folder?.name ?? (listView === 'all' ? 'All notes' : lockedView ? 'Locked notes' : 'Notex'));
  /** Root → … → current, for the folder-page path rail. */
  const folderPath: Folder[] = [];
  for (let cur = folder; cur; cur = cur.parentId ? folders.find((f) => f.id === cur!.parentId) : undefined) {
    folderPath.unshift(cur);
  }

  /** Opens a folder, Home (null), or one of the drawer's list views. */
  const go = (id: string | null, list: ListView | null = null) => {
    setFolderId(id);
    setListView(list);
  };

  // Opening a folder (or going back up) starts expanded again.
  useEffect(() => {
    bar.scrollRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [folderId, listView]);

  // One UI hides the selection bar while scrolling down and brings it back on the way up.
  useEffect(() => {
    setBarHidden(false);
    if (!selecting) return;
    let last: number | null = null;
    const id = bar.scrollY.addListener(({ value }) => {
      if (last === null) last = value;
      const delta = value - last;
      if (Math.abs(delta) < 8) return;
      setBarHidden(delta > 0);
      last = value;
    });
    return () => bar.scrollY.removeListener(id);
  }, [selecting]);

  useBackHandler(() => {
    if (editing) return false;
    if (selecting) {
      setSelected(null);
      return true;
    }
    if (listView) {
      go(null);
      return true;
    }
    if (folder) {
      go(folder.parentId);
      return true;
    }
    return false;
  });

  const toggle = (kind: keyof Selection, id: string) =>
    setSelected((prev) => {
      const next = { folders: new Set(prev?.folders), notes: new Set(prev?.notes) };
      next[kind].has(id) ? next[kind].delete(id) : next[kind].add(id);
      return next;
    });

  const startSelecting = (kind: keyof Selection, id: string) =>
    setSelected({ folders: new Set(kind === 'folders' ? [id] : []), notes: new Set(kind === 'notes' ? [id] : []) });

  const done = () => {
    setForm(null);
    setSelected(null);
  };

  /** A locked note opens only after the phone's screen lock (fingerprint, face, PIN…). */
  const openNote = async (n: Note) => {
    if (!n.locked) return setEditing({ note: n });
    if (await authenticate()) unlocked(n);
  };

  // Note cards are memoised, so they get stable callbacks that read the latest state through a ref.
  const latest = useRef({ selecting, toggle, startSelecting, openNote });
  latest.current = { selecting, toggle, startSelecting, openNote };
  const onNotePress = useCallback((n: Note) => {
    const l = latest.current;
    l.selecting ? l.toggle('notes', n.id) : l.openNote(n);
  }, []);
  const onNoteLongPress = useCallback((n: Note) => {
    const l = latest.current;
    l.selecting ? l.toggle('notes', n.id) : l.startSelecting('notes', n.id);
  }, []);

  /** After unlocking: decrypt, then open. */
  const unlocked = async (n: Note) => {
    try {
      setEditing({ note: { ...n, body: await decryptBody(n.id, n.body) } });
    } catch (e) {
      console.warn('Decrypting note failed', e);
      toast("Couldn't open this note");
    }
  };

  const startCreate = (parentId: string | null, move?: { folderIds?: string[]; noteIds?: string[] }) =>
    setForm({
      mode: 'create',
      parentId,
      name: nextFolderName(folders.filter((f) => f.parentId === parentId)),
      color: DEFAULT_FOLDER_COLOR,
      moveFolderIds: move?.folderIds,
      moveNoteIds: move?.noteIds,
    });

  const createFolder = (f: CreateForm) => {
    const id = uid();
    const actions: Action[] = [{ type: 'addFolder', folder: { id, name: f.name.trim(), color: f.color, parentId: f.parentId } }];
    if (f.moveFolderIds?.length) actions.push({ type: 'moveFolders', ids: f.moveFolderIds, parentId: id });
    if (f.moveNoteIds?.length) actions.push({ type: 'moveNotes', ids: f.moveNoteIds, folderId: id });
    dispatch({ type: 'batch', actions });
    done();
  };

  const renameFolder = (f: RenameForm) => {
    dispatch({ type: 'updateFolders', ids: [f.id], patch: { name: f.name.trim() } });
    done();
  };

  /** Notes inside the selected folders (subfolders included); they move to All Notes. */
  const notesInSelected = folderIds.reduce((sum, id) => sum + (counts.get(id) ?? 0), 0);
  const hasSubfolders = folders.some((f) => f.parentId && selected?.folders.has(f.parentId));

  const deleteSelected = () => {
    setConfirmDelete(false);
    setSelected(null);
    const actions: Action[] = [];
    if (noteIds.length) actions.push({ type: 'trashNotes', ids: noteIds, at: Date.now() });
    if (folderIds.length) actions.push({ type: 'deleteFolders', ids: folderIds });
    const parts = [folderIds.length && plural(folderIds.length, 'folder'), noteIds.length && plural(noteIds.length, 'note')].filter(Boolean);
    undoable({ type: 'batch', actions }, `${parts.join(' and ')} deleted`);
  };

  const cols = width >= 600 ? 6 : 4;
  const cardW = (width - FOLDER_SIDE * 2 - FOLDER_GAP * (cols - 1)) / cols;
  const noteCols = width >= 600 ? 5 : 3;
  const noteW = (width - SIDE * 2 - NOTE_GAP * (noteCols - 1)) / noteCols;
  const showRail = !selecting && folderPath.length > 0;
  const railH = showRail ? RAIL_H : 0;
  const railY = bar.scrollY.interpolate({
    inputRange: [0, bar.range],
    outputRange: [0, -bar.range],
    extrapolate: 'clamp',
  });

  const rows = useMemo(() => {
    const out: Row[] = [];
    // Home: recent quick notes first, then the folders under their own heading.
    const strip = isHome && !selecting && quickNotes.length > 0;
    if (strip) out.push({ key: 'quick', kind: 'quick' });
    if (strip && children.length) out.push({ key: 'label:folders', kind: 'label', title: 'Folders' });
    if (children.length) out.push({ key: 'folders', kind: 'folders' });
    groupByDate(notes).forEach((group, gi) => {
      out.push({ key: `s:${group.title}`, kind: 'section', title: group.title, first: gi === 0 });
      for (let i = 0; i < group.items.length; i += noteCols) {
        out.push({ key: `n:${group.items[i].id}`, kind: 'notes', notes: group.items.slice(i, i + noteCols) });
      }
    });
    return out;
  }, [children.length, notes, noteCols, isHome, selecting, quickNotes]);

  const renderRow = ({ item }: { item: Row }) => {
    if (item.kind === 'quick') return <QuickStrip notes={quickNotes} onOpen={openNote} onSeeAll={() => go(QUICK_FOLDER_ID)} />;
    if (item.kind === 'label') {
      return (
        <Text accessibilityRole="header" style={[styles.sectionTitle, { color: t.text }]}>
          {item.title}
        </Text>
      );
    }
    if (item.kind === 'folders') {
      return (
        <View style={styles.grid}>
          {children.map((f) => {
            const locked = isLockedFolder(f.id);
            return (
              <FolderCard
                key={f.id}
                name={f.name}
                color={f.color}
                count={counts.get(f.id) ?? 0}
                width={cardW}
                selecting={selecting && !locked}
                selected={!!selected?.folders.has(f.id)}
                onPress={() => (selecting ? !locked && toggle('folders', f.id) : go(f.id))}
                onLongPress={() => {
                  if (locked) return;
                  selecting ? toggle('folders', f.id) : startSelecting('folders', f.id);
                }}
              />
            );
          })}
        </View>
      );
    }
    if (item.kind === 'section') {
      return (
        <Text accessibilityRole="header" style={[styles.sectionTitle, { color: t.text }, item.first && { paddingTop: 16 }]}>
          {item.title}
        </Text>
      );
    }
    return (
      <View style={styles.noteRow}>
        {item.notes.map((n) => (
          <NoteCard
            key={n.id}
            note={n}
            width={noteW}
            selecting={selecting}
            selected={!!selected?.notes.has(n.id)}
            onPress={onNotePress}
            onLongPress={onNoteLongPress}
          />
        ))}
      </View>
    );
  };

  const empty = (!!folderId || !!listView) && notes.length === 0;

  const barActions: BarAction[] = noteIds.length
    ? [
        // Folders and notes move to different places, so a mixed selection can't move together.
        { icon: MoveIcon, label: 'Move', disabled: folderIds.length > 0, onPress: () => setMoving('notes') },
        { icon: DeleteIcon, label: 'Delete', onPress: () => (folderIds.length ? setConfirmDelete(true) : deleteSelected()) },
      ]
    : [
        { icon: MoveIcon, label: 'Move', onPress: () => setMoving('folders') },
        {
          icon: AddIcon,
          label: 'Subfolder',
          disabled: !single || single.parentId !== null,
          onPress: () => single && startCreate(single.id),
        },
        { icon: PaletteIcon, label: 'Folder colour', onPress: () => setForm({ mode: 'color', ids: folderIds, color: single?.color ?? '' }) },
        {
          icon: RenameIcon,
          label: 'Rename',
          disabled: !single,
          onPress: () => single && setForm({ mode: 'rename', id: single.id, original: single.name, name: single.name }),
        },
        { icon: DeleteIcon, label: single ? 'Delete' : 'Delete all', onPress: () => setConfirmDelete(true) },
      ];

  return (
    <View style={[styles.root, { backgroundColor: t.bg, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.page} onLayout={(e) => setViewH(e.nativeEvent.layout.height)}>
        <Animated.FlatList
          ref={bar.scrollRef}
          data={rows}
          keyExtractor={(r: Row) => r.key}
          renderItem={renderRow}
          extraData={selected}
          initialNumToRender={8}
          windowSize={7}
          // At least enough content to collapse the bar fully.
          contentContainerStyle={{
            flexGrow: 1,
            minHeight: bar.expanded + railH + Math.max(viewH - COLLAPSED_H - railH, 0),
            // Keep the last card clear of the selection bar or the create button.
            paddingBottom: selecting ? SELECTION_BAR_SPACE + 12 : rows.length ? FAB + FAB_INSET * 2 : 0,
          }}
          // Spacer for the collapsing bar (+ sticky rail when open).
          ListHeaderComponent={<View style={{ height: bar.expanded + railH }} />}
          ListFooterComponent={
            empty ? (
              // The last `range` of content is only visible once the bar collapses;
              // pad it off so the message centres in what's on screen when expanded.
              <View style={[styles.empty, { paddingBottom: bar.range }]}>
                <Text style={[styles.emptyTitle, { color: t.emptyTitle }]}>{lockedView ? 'No locked notes' : 'No notes'}</Text>
                <Text style={[styles.emptySub, { color: t.emptySub }]}>
                  {lockedView ? "Lock a note from its ⋮ menu in the editor." : 'Tap the Add button to create a note.'}
                </Text>
              </View>
            ) : undefined
          }
          ListFooterComponentStyle={empty ? styles.emptyFooter : undefined}
          onScroll={bar.onScroll}
          onScrollEndDrag={bar.onScrollEndDrag}
          onMomentumScrollEnd={bar.onMomentumScrollEnd}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
        />

        <AppBar
          bar={bar}
          title={title}
          // Samsung's count line: folders on Home, notes everywhere else; none while selecting.
          subtitle={selecting ? undefined : isHome ? plural(children.length, 'folder') : plural(notes.length, 'note')}
          left={
            selecting ? (
              <Pressable
                accessibilityRole="checkbox"
                accessibilityLabel="Select all"
                accessibilityState={{ checked: allSelected }}
                style={styles.allBox}
                onPress={() =>
                  setSelected(
                    allSelected
                      ? { folders: new Set(), notes: new Set() }
                      : { folders: new Set(selectable.map((f) => f.id)), notes: new Set(notes.map((n) => n.id)) }
                  )
                }
              >
                <Checkbox checked={allSelected} />
                <Text style={[styles.allLabel, { color: t.text }]}>All</Text>
              </Pressable>
            ) : (
              <BarButton label="Navigation drawer" onPress={() => setMenuOpen(true)}>
                <MenuIcon color={t.text} />
              </BarButton>
            )
          }
          right={
            selecting ? null : (
              <>
                {/* Quick note: written in the full editor and filed in Quick notes; the round button makes regular notes. */}
                {isHome && (
                  <BarButton label="New quick note" onPress={() => setEditing({ note: null, folderId: QUICK_FOLDER_ID })}>
                    <MemoIcon color={t.text} />
                  </BarButton>
                )}
                {/* One UI 8.5: search opens its own page, with the field docked at the bottom. */}
                <BarButton label="Search" onPress={() => setOverlay('search')}>
                  <SearchIcon color={t.text} />
                </BarButton>
                {/* Inside a main folder this makes a subfolder; subfolders hold notes only. */}
                {!inSubfolder && !listView && folderId !== QUICK_FOLDER_ID && (
                  <BarButton label="Create folder" onPress={() => startCreate(folderId)}>
                    <FolderAddIcon color={t.text} />
                  </BarButton>
                )}
              </>
            )
          }
        />

        {showRail && (
          <Animated.View style={[styles.stickyRail, { top: bar.expanded, backgroundColor: t.bg, transform: [{ translateY: railY }] }]}>
            <FolderNavRail path={folderPath} onHome={() => go(null)} onOpen={(id) => go(id)} />
          </Animated.View>
        )}

        {/* No create button on Locked notes: a new note isn't locked, so it wouldn't show there. */}
        {!selecting && !lockedView && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Create note"
            onPress={() => setEditing({ note: null })}
            android_ripple={{ color: t.ripple, borderless: true, radius: FAB / 2 }}
            // Dark mode has no visible shadow; the button's lighter fill keeps it apart from the cards instead.
            style={[styles.fab, { backgroundColor: t.fab }, !t.dark && styles.fabShadow]}
          >
            <ComposeIcon color={COMPOSE} />
          </Pressable>
        )}

        {selecting && selectedCount > 0 && <SelectionBar hidden={barHidden} actions={barActions} />}
      </View>

      <FolderForms
        form={form}
        folders={folders}
        onChange={setForm}
        onCreate={createFolder}
        onRename={renameFolder}
        onColor={(ids, color) => {
          dispatch({ type: 'updateFolders', ids, patch: { color } });
          done();
        }}
      />

      <FolderPicker
        visible={moving !== null}
        mode={moving ?? 'folders'}
        folders={folders}
        blocked={new Set(moving === 'notes' ? (folderId ? [folderId] : []) : folderIds)}
        canNest={!hasSubfolders}
        onClose={() => setMoving(null)}
        onPick={(target) => {
          if (moving === 'notes') {
            if (target) dispatch({ type: 'moveNotes', ids: noteIds, folderId: target });
            toast(`${plural(noteIds.length, 'note')} moved`);
          } else {
            dispatch({ type: 'moveFolders', ids: folderIds, parentId: target });
            toast(`${plural(folderIds.length, 'folder')} moved`);
          }
          setMoving(null);
          setSelected(null);
        }}
        onCreate={() => {
          const kind = moving;
          setMoving(null);
          startCreate(null, kind === 'notes' ? { noteIds } : { folderIds });
        }}
      />

      <Dialog
        visible={confirmDelete}
        message={
          `Delete ${[folderIds.length && plural(folderIds.length, 'folder'), noteIds.length && plural(noteIds.length, 'note')]
            .filter(Boolean)
            .join(' and ')}?` +
          (hasSubfolders ? ' Subfolders will be deleted too.' : '') +
          (notesInSelected ? ` ${plural(notesInSelected, 'note')} in ${folderIds.length === 1 ? 'it' : 'them'} will move to All Notes.` : '') +
          (noteIds.length ? ' Selected notes go to the Recycle bin.' : '')
        }
        onClose={() => setConfirmDelete(false)}
        actions={[
          { label: 'Cancel', onPress: () => setConfirmDelete(false) },
          { label: 'Delete', onPress: deleteSelected },
        ]}
      />

      <MenuCard
        visible={menuOpen}
        folders={folders}
        current={folderId}
        listView={listView}
        count={(id) => counts.get(id) ?? 0}
        allCount={live.length}
        lockedCount={lockedCount}
        trashCount={trashCount}
        onPick={(id) => {
          setMenuOpen(false);
          setSelected(null);
          go(id);
        }}
        onList={(list) => {
          setMenuOpen(false);
          setSelected(null);
          go(null, list);
        }}
        onTrash={() => {
          setMenuOpen(false);
          setSelected(null);
          setOverlay('trash');
        }}
        onClose={() => setMenuOpen(false)}
      />

      {overlay === 'search' && <SearchScreen folderId={folderId} onOpenNote={openNote} onClose={() => setOverlay(null)} />}
      {overlay === 'trash' && <TrashScreen onClose={() => setOverlay(null)} />}
      {/* Settings has no way in for now (the drawer's gear was removed); the page is kept for later. */}
      {overlay === 'settings' && <SettingsScreen onClose={() => setOverlay(null)} />}

      {editing && <NoteEditor note={editing.note} folderId={editing.folderId ?? folderId ?? DEFAULT_FOLDER_ID} onClose={() => setEditing(null)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  page: { flex: 1, overflow: 'hidden' },
  stickyRail: { position: 'absolute', left: 0, right: 0, zIndex: 9 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', columnGap: FOLDER_GAP, rowGap: FOLDER_ROW_GAP, paddingHorizontal: FOLDER_SIDE, paddingTop: 8 },
  // Fills whatever is left below the grid and centres the message in it.
  emptyFooter: { flexGrow: 1 },
  empty: { flex: 1, minHeight: 160, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  emptyTitle: { fontSize: 17, lineHeight: 24, letterSpacing: -0.1 },
  emptySub: { fontSize: 13, lineHeight: 18, letterSpacing: -0.1, marginTop: 12, textAlign: 'center' },
  sectionTitle: { fontFamily: FONT, fontSize: 18, fontWeight: 'bold', paddingHorizontal: SIDE + 4, paddingTop: 28, paddingBottom: 12 },
  noteRow: { flexDirection: 'row', columnGap: NOTE_GAP, paddingHorizontal: SIDE, marginBottom: 18 },
  allBox: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  allLabel: { fontSize: 11, marginTop: 1 },
  fab: {
    position: 'absolute',
    right: FAB_INSET,
    bottom: FAB_INSET,
    width: FAB,
    height: FAB,
    borderRadius: FAB / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Light mode only — in dark mode the button has no shadow.
  fabShadow: {
    elevation: 4,
    shadowColor: 'rgba(0,0,0,0.85)',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
});
