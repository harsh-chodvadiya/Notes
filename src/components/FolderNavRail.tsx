import { useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type ScrollViewInstance } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { Folder } from '../data';
import { FONT, lift, useTheme } from '../theme';
import { HomeIcon } from './icons';

/** Height of the sticky path rail below the app bar. */
export const RAIL_H = 60;
const FOLDER_PATH =
  'M9.75 43.5V17.5A6 6 0 0 1 15.75 11.5H22.5A3 3 0 0 1 24.9 12.7L28.6 17.2A2.5 2.5 0 0 0 30.6 18.2H48.5A6 6 0 0 1 54.5 24.2V43.5A6 6 0 0 1 48.5 49.5H15.75A6 6 0 0 1 9.75 43.5Z';

type Props = {
  /** Ancestor folders from root to current (current last). */
  path: Folder[];
  onHome: () => void;
  onOpen: (id: string) => void;
};

/** Rounded folder in the folder's colour: outlined for ancestors, filled for the current one. */
function FolderGlyph({ color, filled }: { color: string; filled: boolean }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 63 63">
      <Path
        d={FOLDER_PATH}
        stroke={color}
        strokeWidth={4.5}
        strokeLinejoin="round"
        fill={filled ? color : 'none'}
      />
    </Svg>
  );
}

function Chevron({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24">
      <Path d="M9 5.5L15.5 12L9 18.5" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

/**
 * Folder-page path as one capsule: Home, then each folder (its colour folder +
 * name) joined by chevrons. Home and ancestors are tappable; the current folder
 * is in the main text colour. Long paths scroll sideways.
 */
export default function FolderNavRail({ path, onHome, onOpen }: Props) {
  const t = useTheme();
  const scroll = useRef<ScrollViewInstance>(null);
  if (!path.length) return null;

  return (
    <ScrollView
      ref={scroll}
      horizontal
      showsHorizontalScrollIndicator={false}
      // Keep the current folder in view when the path is wider than the screen.
      onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: false })}
      contentContainerStyle={styles.rail}
    >
      <View style={[styles.capsule, { backgroundColor: t.card }, lift(t)]}>
        <Pressable
          accessibilityLabel="Home"
          onPress={onHome}
          android_ripple={{ color: t.ripple, borderless: true, radius: 22 }}
          hitSlop={8}
          style={styles.home}
        >
          <HomeIcon color={t.subtext} size={28} />
        </Pressable>

        {path.map((f, i) => {
          const last = i === path.length - 1;
          return (
            <View key={f.id} style={styles.seg}>
              <Chevron color={t.subtext} />
              <Pressable
                accessibilityLabel={last ? `${f.name}, current folder` : f.name}
                disabled={last}
                onPress={() => onOpen(f.id)}
                hitSlop={8}
                style={styles.folder}
              >
                <FolderGlyph color={f.color} filled={last} />
                <Text numberOfLines={1} style={[styles.name, { color: last ? t.text : t.subtext }]}>
                  {f.name}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // Grows to the full width; a long path scrolls instead.
  rail: { flexGrow: 1, height: RAIL_H, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 },
  capsule: { flexGrow: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 7 },
  home: { justifyContent: 'center' },
  seg: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  folder: { flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: 180 },
  name: { fontFamily: FONT, fontSize: 15, flexShrink: 1 },
});
