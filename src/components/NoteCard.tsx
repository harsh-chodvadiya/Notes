import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import type { Note } from '../data';
import { formatDate } from '../format';
import { COMPOSE, FONT, lift, useTheme } from '../theme';
import { htmlToText } from '../utils';
import { LockIcon } from './icons';
import { Checkbox } from './ui';

/** Page-shaped preview, as tall as this share of its width. */
export const NOTE_ASPECT = 1.3;

type Props = {
  note: Note;
  width: number;
  selecting: boolean;
  selected: boolean;
  onPress: (note: Note) => void;
  onLongPress: (note: Note) => void;
};

/**
 * Samsung Notes' grid card: a page-shaped preview with the date over its foot,
 * and the title below. Memoised: the list re-renders it only when its own
 * props change, so callbacks passed in must be stable.
 */
function NoteCard({ note, width, selecting, selected, onPress, onLongPress }: Props) {
  const t = useTheme();
  const text = note.locked ? '' : htmlToText(note.body);
  const title = note.title || text.split('\n')[0] || 'Untitled';
  const date = formatDate(note.updatedAt);
  return (
    <Pressable
      accessibilityRole={selecting ? 'checkbox' : 'button'}
      accessibilityLabel={`${title}${note.locked ? ', locked' : ''}, ${date}`}
      accessibilityState={selecting ? { checked: selected } : undefined}
      accessibilityHint={selecting ? undefined : 'Long press to select'}
      onPress={() => onPress(note)}
      onLongPress={() => onLongPress(note)}
      delayLongPress={300}
      style={({ pressed }) => [{ width }, pressed && { opacity: 0.7 }]}
    >
      <View style={[styles.card, { height: width * NOTE_ASPECT, backgroundColor: t.folder }, lift(t), selected && styles.cardSelected]}>
        {/* Locked notes never show their content outside the editor. */}
        {note.locked ? (
          <View style={styles.locked}>
            <LockIcon color={t.subtext} size={26} />
          </View>
        ) : (
          <Text maxFontSizeMultiplier={1.2} style={[styles.preview, { color: t.emptyTitle }]}>
            {text}
          </Text>
        )}
        {/* Preview fades into the card so the date reads cleanly over its bottom. */}
        <View style={styles.fade} pointerEvents="none">
          <Svg width="100%" height="100%">
            <Defs>
              <LinearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={t.folder} stopOpacity={0} />
                <Stop offset="0.75" stopColor={t.folder} stopOpacity={1} />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#fade)" />
          </Svg>
        </View>
        <Text maxFontSizeMultiplier={1.2} style={[styles.meta, { color: t.subtext }]}>
          {date}
        </Text>
        {selecting && (
          <View style={styles.check}>
            <Checkbox checked={selected} size={20} />
          </View>
        )}
      </View>
      <Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={[styles.title, { color: t.text }]}>
        {title}
      </Text>
    </Pressable>
  );
}

export default memo(NoteCard);

const styles = StyleSheet.create({
  // The 2dp border is only coloured when selected; padding makes up for it so content doesn't move.
  card: { borderRadius: 16, padding: 9, overflow: 'hidden', borderWidth: 2, borderColor: 'transparent' },
  cardSelected: { borderColor: COMPOSE },
  locked: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  preview: { fontSize: 11, lineHeight: 15 },
  title: { fontFamily: FONT, fontSize: 14, fontWeight: 'bold', marginTop: 7, paddingHorizontal: 2 },
  fade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '45%' },
  meta: { position: 'absolute', right: 9, bottom: 7, fontSize: 11 },
  // Bottom-left, over the faded foot opposite the date, so it never covers the preview.
  check: { position: 'absolute', left: 7, bottom: 5 },
});
