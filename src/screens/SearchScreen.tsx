import { useMemo, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CloseIcon, LockIcon, SearchIcon } from '../components/icons';
import Page from '../components/Page';
import { withDescendants, type Note } from '../data';
import { loadRecentSearches, saveRecentSearches } from '../db';
import { formatDate } from '../format';
import { liveNotes } from '../state';
import { useStore } from '../store';
import { COMPOSE, FONT, lift, useTheme } from '../theme';
import { htmlToText, useKeyboardHeight } from '../utils';

type Props = {
  /** Folder the search was opened from; null on the home page. */
  folderId: string | null;
  onOpenNote: (note: Note) => void;
  onClose: () => void;
};

const RECENT_MAX = 8;

/**
 * Samsung Notes (One UI 8.5) search: its own page that slides in, with the
 * search field docked at the bottom and recent searches until you type.
 */
export default function SearchScreen({ folderId, onOpenNote, onClose }: Props) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { state } = useStore();
  const keyboard = useKeyboardHeight();
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<'all' | 'folder'>(folderId ? 'folder' : 'all');
  const [recent, setRecent] = useState(loadRecentSearches);

  const folder = folderId ? state.folders.find((f) => f.id === folderId) : undefined;
  /** Searchable text per note, made once per note change rather than on every keystroke. */
  const plain = useMemo(() => {
    const map = new Map<string, string>();
    for (const n of liveNotes(state.notes)) map.set(n.id, n.locked ? '' : htmlToText(n.body));
    return map;
  }, [state.notes]);

  const remember = (term: string) => {
    const q = term.trim();
    if (!q) return;
    const next = [q, ...recent.filter((r) => r.toLowerCase() !== q.toLowerCase())].slice(0, RECENT_MAX);
    setRecent(next);
    saveRecentSearches(next);
  };

  const clearRecent = () => {
    setRecent([]);
    saveRecentSearches([]);
  };

  const q = query.trim().toLowerCase();
  const inScope = scope === 'folder' && folderId ? withDescendants(state.folders, [folderId]) : null;
  const results = q
    ? liveNotes(state.notes)
        // Locked notes match on their title only — their content stays private (and encrypted).
        .filter((n) => (!inScope || inScope.has(n.folderId)) && `${n.title}\n${plain.get(n.id) ?? ''}`.toLowerCase().includes(q))
        .sort((a, b) => b.updatedAt - a.updatedAt)
    : [];

  /** The text with every match drawn in coral bold. */
  const mark = (text: string) => {
    if (!q) return text;
    const parts: ReactNode[] = [];
    const lower = text.toLowerCase();
    let at = 0;
    for (let i = lower.indexOf(q); i !== -1; i = lower.indexOf(q, at)) {
      if (i > at) parts.push(text.slice(at, i));
      parts.push(
        <Text key={i} style={styles.match}>
          {text.slice(i, i + q.length)}
        </Text>,
      );
      at = i + q.length;
    }
    parts.push(text.slice(at));
    return parts;
  };

  /** Preview starting near the first match, so it's visible in two lines. */
  const snippet = (text: string) => {
    const i = text.toLowerCase().indexOf(q);
    return i > 40 ? `…${text.slice(i - 30)}` : text;
  };

  const dockBottom = keyboard ? keyboard - insets.bottom + 8 : 16;

  return (
    <Page title="Search" onClose={onClose}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: dockBottom + 140 }}>
        {!q && recent.length > 0 && (
          <View>
            <View style={styles.recentHead}>
              <Text style={[styles.recentTitle, { color: t.subtext }]}>Recent searches</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Clear recent searches" hitSlop={10} onPress={clearRecent}>
                <Text style={[styles.clear, { color: COMPOSE }]}>Clear</Text>
              </Pressable>
            </View>
            {recent.map((r) => (
              <Pressable key={r} accessibilityRole="button" onPress={() => setQuery(r)} android_ripple={{ color: t.ripple }} style={styles.recentRow}>
                <SearchIcon color={t.subtext} size={20} />
                <Text numberOfLines={1} style={[styles.recentText, { color: t.text }]}>
                  {r}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {!q && recent.length === 0 && <Text style={[styles.hint, { color: t.emptySub }]}>Search note titles and text.</Text>}

        {!!q && results.length === 0 && (
          <View style={styles.empty}>
            <Text style={[styles.emptyTitle, { color: t.emptyTitle }]}>No results</Text>
            <Text style={[styles.emptySub, { color: t.emptySub }]}>Try a different word.</Text>
          </View>
        )}

        {results.length > 0 && (
          <View style={styles.list}>
            <Text style={[styles.count, { color: t.subtext }]}>{results.length === 1 ? '1 note' : `${results.length} notes`}</Text>
            {results.map((n) => {
              const text = (plain.get(n.id) ?? '').replace(/\s+/g, ' ');
              return (
                <Pressable
                  key={n.id}
                  accessibilityRole="button"
                  accessibilityLabel={n.locked ? `${n.title || 'Locked note'}, locked` : undefined}
                  onPress={() => {
                    remember(query);
                    onOpenNote(n);
                  }}
                  android_ripple={{ color: t.ripple }}
                  style={[styles.note, { backgroundColor: t.card }, lift(t)]}
                >
                  <View style={styles.titleRow}>
                    {n.locked && <LockIcon color={t.subtext} size={16} />}
                    <Text numberOfLines={1} style={[styles.noteTitle, { color: t.text }]}>
                      {mark(n.title || (n.locked ? 'Locked note' : text.slice(0, 80)))}
                    </Text>
                  </View>
                  {!!n.title && !!text && (
                    <Text numberOfLines={2} style={[styles.notePreview, { color: t.emptyTitle }]}>
                      {mark(snippet(text))}
                    </Text>
                  )}
                  <Text style={[styles.noteMeta, { color: t.subtext }]}>
                    {`${state.folders.find((f) => f.id === n.folderId)?.name ?? ''} · ${formatDate(n.updatedAt)}`}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* One UI 8.5 docks the search field at the bottom, within thumb reach. */}
      <View style={[styles.dock, { bottom: dockBottom + insets.bottom }]}>
        {folder && (
          <View style={styles.scopeRow}>
            {(['all', 'folder'] as const).map((s) => {
              const on = scope === s;
              return (
                <Pressable
                  key={s}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  onPress={() => setScope(s)}
                  style={[styles.scope, { backgroundColor: on ? t.text : t.dialog }, !t.dark && styles.shadow]}
                >
                  <Text numberOfLines={1} style={[styles.scopeText, { color: on ? t.bg : t.dialogTitle }]}>
                    {s === 'all' ? 'All notes' : folder.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
        <View style={[styles.pill, { backgroundColor: t.dialog }, !t.dark && styles.shadow]}>
          <SearchIcon color={t.subtext} size={22} />
          <TextInput
            autoFocus
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => remember(query)}
            placeholder={scope === 'folder' && folder ? `Search in ${folder.name}` : 'Search notes'}
            placeholderTextColor={t.subtext}
            cursorColor={t.text}
            returnKeyType="search"
            style={[styles.input, { color: t.text }]}
          />
          {!!query && (
            <Pressable accessibilityRole="button" accessibilityLabel="Clear search" hitSlop={10} onPress={() => setQuery('')}>
              <CloseIcon color={t.subtext} size={20} />
            </Pressable>
          )}
        </View>
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  recentHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 6,
  },
  recentTitle: { fontSize: 14 },
  clear: { fontFamily: FONT, fontSize: 14, fontWeight: 'bold' },
  recentRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, gap: 16 },
  recentText: { flex: 1, fontSize: 16 },
  hint: { fontSize: 14, textAlign: 'center', marginTop: 48 },
  empty: { alignItems: 'center', marginTop: 72 },
  emptyTitle: { fontSize: 17, lineHeight: 24 },
  emptySub: { fontSize: 13, lineHeight: 18, marginTop: 12 },
  list: { paddingHorizontal: 12, paddingTop: 12, gap: 8 },
  count: { fontSize: 13, marginLeft: 12, marginBottom: 2 },
  note: { borderRadius: 20, paddingHorizontal: 18, paddingVertical: 14, overflow: 'hidden' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  noteTitle: { flexShrink: 1, fontFamily: FONT, fontSize: 16, fontWeight: 'bold' },
  notePreview: { fontSize: 14, lineHeight: 19, marginTop: 4 },
  noteMeta: { fontSize: 12, marginTop: 8 },
  match: { color: COMPOSE, fontWeight: 'bold' },
  dock: { position: 'absolute', left: 16, right: 16, gap: 10 },
  scopeRow: { flexDirection: 'row', gap: 8 },
  scope: { minHeight: 36, borderRadius: 18, paddingHorizontal: 16, justifyContent: 'center', maxWidth: 200 },
  scopeText: { fontFamily: FONT, fontSize: 14 },
  pill: { height: 52, borderRadius: 26, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, gap: 10 },
  input: { flex: 1, fontSize: 17, paddingVertical: 0 },
  shadow: { elevation: 4, shadowColor: 'rgba(0,0,0,0.5)' },
});
