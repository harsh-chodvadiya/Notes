import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Note } from '../data';
import { formatDate } from '../format';
import { COMPOSE, FONT, lift, useTheme } from '../theme';
import { htmlToText } from '../utils';
import { LockIcon } from './icons';

type Props = {
  /** Newest first. */
  notes: Note[];
  onOpen: (note: Note) => void;
  onSeeAll: () => void;
};

/** Cards shown before "See all" takes over. */
const MAX = 10;
const CARD_W = 128;
const CARD_H = 104;

/** Home's quick-notes strip: recent quick notes in a sideways row, with "See all" for the folder. */
export default function QuickStrip({ notes, onOpen, onSeeAll }: Props) {
  const t = useTheme();
  return (
    <View>
      <View style={styles.head}>
        <Text accessibilityRole="header" style={[styles.title, { color: t.text }]}>
          Quick notes
        </Text>
        <Pressable accessibilityRole="button" accessibilityLabel={`See all ${notes.length} quick notes`} hitSlop={10} onPress={onSeeAll}>
          <Text style={styles.seeAll}>See all</Text>
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {notes.slice(0, MAX).map((n) => {
          const text = n.locked ? '' : htmlToText(n.body).replace(/\s+/g, ' ');
          const title = n.title || (n.locked ? 'Locked note' : text.slice(0, 60)) || 'Untitled';
          const date = formatDate(n.updatedAt);
          return (
            <Pressable
              key={n.id}
              accessibilityRole="button"
              accessibilityLabel={`${title}${n.locked ? ', locked' : ''}, ${date}`}
              onPress={() => onOpen(n)}
              android_ripple={{ color: t.ripple }}
              style={[styles.card, { backgroundColor: t.folder }, lift(t)]}
            >
              <View style={styles.titleRow}>
                {n.locked && <LockIcon color={t.subtext} size={14} />}
                <Text numberOfLines={1} maxFontSizeMultiplier={1.2} style={[styles.cardTitle, { color: t.text }]}>
                  {title}
                </Text>
              </View>
              {/* Locked notes never show their content outside the editor. */}
              {!!n.title && !!text && (
                <Text numberOfLines={3} maxFontSizeMultiplier={1.2} style={[styles.preview, { color: t.emptyTitle }]}>
                  {text}
                </Text>
              )}
              <Text maxFontSizeMultiplier={1.2} style={[styles.date, { color: t.subtext }]}>
                {date}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
  title: { fontFamily: FONT, fontSize: 18, fontWeight: 'bold' },
  seeAll: { fontFamily: FONT, fontSize: 14, fontWeight: 'bold', color: COMPOSE },
  // Vertical room so the cards' light-mode shadow isn't clipped by the scroller.
  row: { gap: 10, paddingHorizontal: 12, paddingVertical: 6 },
  card: { width: CARD_W, height: CARD_H, borderRadius: 16, padding: 12, overflow: 'hidden' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardTitle: { flexShrink: 1, fontFamily: FONT, fontSize: 13, fontWeight: 'bold' },
  preview: { fontSize: 11, lineHeight: 15, marginTop: 4 },
  date: { position: 'absolute', left: 12, bottom: 9, fontSize: 10 },
});
