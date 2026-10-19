import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { BarButton } from '../components/AppBar';
import { DeleteIcon, LockIcon, RestoreIcon } from '../components/icons';
import Page from '../components/Page';
import { Dialog } from '../components/ui';
import { TRASH_DAYS, type Note } from '../data';
import { useStore } from '../store';
import { FONT, lift, useTheme } from '../theme';
import { htmlToText, plural } from '../utils';

type Props = { onClose: () => void };

const daysLeft = (deletedAt: number) => Math.max(0, TRASH_DAYS - Math.floor((Date.now() - deletedAt) / 86_400_000));

/**
 * Recycle bin: deleted notes stay here for TRASH_DAYS days. Tap one to restore
 * it or delete it for good. Contents aren't opened here — locked notes stay sealed.
 */
export default function TrashScreen({ onClose }: Props) {
  const t = useTheme();
  const { state, dispatch, undoable, toast } = useStore();
  const [picked, setPicked] = useState<Note | null>(null);
  const [confirmEmpty, setConfirmEmpty] = useState(false);

  const notes = useMemo(
    () => state.notes.filter((n) => n.deletedAt).sort((a, b) => (b.deletedAt ?? 0) - (a.deletedAt ?? 0)),
    [state.notes]
  );

  const restore = (n: Note) => {
    setPicked(null);
    undoable({ type: 'restoreNotes', ids: [n.id] }, 'Note restored');
  };

  const deleteForever = (n: Note) => {
    setPicked(null);
    dispatch({ type: 'deleteNotes', ids: [n.id] });
    toast('Note deleted');
  };

  const empty = () => {
    setConfirmEmpty(false);
    dispatch({ type: 'deleteNotes', ids: notes.map((n) => n.id) });
    toast('Recycle bin emptied');
  };

  return (
    <Page
      title="Recycle bin"
      onClose={onClose}
      onBack={() => {
        if (picked || confirmEmpty) {
          setPicked(null);
          setConfirmEmpty(false);
          return true;
        }
        return false;
      }}
      right={
        notes.length > 0 && (
          <BarButton label="Empty Recycle bin" onPress={() => setConfirmEmpty(true)}>
            <DeleteIcon color={t.text} />
          </BarButton>
        )
      }
    >
      <FlatList
        data={notes}
        keyExtractor={(n) => n.id}
        contentContainerStyle={notes.length ? styles.list : styles.emptyWrap}
        ListHeaderComponent={
          notes.length ? (
            <Text style={[styles.info, { color: t.subtext }]}>
              Notes are deleted for good after {TRASH_DAYS} days.
            </Text>
          ) : undefined
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyTitle, { color: t.emptyTitle }]}>No notes in Recycle bin</Text>
            <Text style={[styles.emptySub, { color: t.emptySub }]}>Deleted notes are kept here for {TRASH_DAYS} days.</Text>
          </View>
        }
        renderItem={({ item: n }) => {
          const text = n.locked ? '' : htmlToText(n.body).replace(/\s+/g, ' ');
          const title = n.title || (n.locked ? 'Locked note' : text.slice(0, 80)) || 'Untitled';
          const left = daysLeft(n.deletedAt!);
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${title}${n.locked ? ', locked' : ''}, ${plural(left, 'day')} left`}
              accessibilityHint="Restore or delete"
              onPress={() => setPicked(n)}
              android_ripple={{ color: t.ripple }}
              style={[styles.note, { backgroundColor: t.card }, lift(t)]}
            >
              <View style={styles.titleRow}>
                {n.locked && <LockIcon color={t.subtext} size={16} />}
                <Text numberOfLines={1} style={[styles.noteTitle, { color: t.text }]}>
                  {title}
                </Text>
              </View>
              {!!n.title && !!text && (
                <Text numberOfLines={2} style={[styles.preview, { color: t.emptyTitle }]}>
                  {text}
                </Text>
              )}
              <Text style={[styles.meta, { color: t.subtext }]}>{left === 0 ? 'Deleted today' : `${plural(left, 'day')} left`}</Text>
            </Pressable>
          );
        }}
      />

      <Dialog
        visible={picked !== null}
        title={picked?.title || (picked?.locked ? 'Locked note' : 'Note')}
        onClose={() => setPicked(null)}
        actions={[
          { label: 'Delete', onPress: () => picked && deleteForever(picked) },
          { label: 'Restore', onPress: () => picked && restore(picked) },
        ]}
      >
        <View style={styles.dialogHint}>
          <RestoreIcon color={t.dialogLabel} size={18} />
          <Text style={[styles.dialogText, { color: t.dialogText }]}>Restore puts it back in its folder.</Text>
        </View>
      </Dialog>

      <Dialog
        visible={confirmEmpty}
        message={`Delete ${plural(notes.length, 'note')} for good? This can't be undone.`}
        onClose={() => setConfirmEmpty(false)}
        actions={[
          { label: 'Cancel', onPress: () => setConfirmEmpty(false) },
          { label: 'Delete', onPress: empty },
        ]}
      />
    </Page>
  );
}

const styles = StyleSheet.create({
  list: { padding: 12, gap: 8 },
  emptyWrap: { flexGrow: 1 },
  info: { fontSize: 13, marginLeft: 12, marginBottom: 4, marginTop: 4 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  emptyTitle: { fontSize: 17, lineHeight: 24 },
  emptySub: { fontSize: 13, lineHeight: 18, marginTop: 12, textAlign: 'center' },
  note: { borderRadius: 20, paddingHorizontal: 18, paddingVertical: 14, overflow: 'hidden' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  noteTitle: { flexShrink: 1, fontFamily: FONT, fontSize: 16, fontWeight: 'bold' },
  preview: { fontSize: 14, lineHeight: 19, marginTop: 4 },
  meta: { fontSize: 12, marginTop: 8 },
  dialogHint: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dialogText: { fontSize: 15, lineHeight: 20, flexShrink: 1 },
});
