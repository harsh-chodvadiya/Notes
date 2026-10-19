import { useMemo, useRef, type ReactNode } from 'react';
import {
  Animated,
  Dimensions,
  type FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { FONT, useTheme } from '../theme';
import { TipPressable } from './Tooltip';

// One UI collapsing app bar, measured frame by frame from Samsung Notes'
// "All notes" page while dragging (px values are from a 1080x2408 screen).

/** Expanded bar height as a share of the screen height (842px / 2408px). */
const EXPANDED_RATIO = 842 / 2408;
/** Row holding the nav button, collapsed title and actions. */
export const ROW_H = 64;
/** Collapsed bar: the row plus 16dp of air above it. */
export const COLLAPSED_H = ROW_H + 16;
/** Vertical centre of the big title, as a share of the expanded height. */
const TITLE_CENTER = 388.5 / 842;
const TITLE_BOX_H = 36;
/** Count line under the big title (Samsung's "3 folders"). */
const SUBTITLE_H = 22;
/** The big title rises at 2/3 of the scroll speed while the bar moves 1:1. */
const TITLE_PARALLAX = 2 / 3;
/** Fade windows as shares of the collapse distance (308px, 294–494px of 632px). */
const BIG_FADE_END = 308 / 632;
const SMALL_FADE = [294 / 632, 494 / 632];
/** Nav and action icons sit 36dp from the screen edges. */
const ICON_INSET = 36;
const BUTTON = 48;

export function useAppBar() {
  const expanded = Math.round(Dimensions.get('screen').height * EXPANDED_RATIO);
  const range = expanded - COLLAPSED_H;
  const scrollY = useRef(new Animated.Value(0)).current;
  /** The page's list (virtualised, so long folders stay fast). */
  const scrollRef = useRef<FlatList<any>>(null);

  const onScroll = useMemo(
    () => Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true }),
    [scrollY]
  );

  // Never rest half-collapsed: settle to whichever end is nearer.
  const snap = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    if (y > 0 && y < range) scrollRef.current?.scrollToOffset({ offset: y < range / 2 ? 0 : range, animated: true });
  };

  return {
    expanded,
    range,
    scrollY,
    scrollRef,
    onScroll,
    onScrollEndDrag: (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (Math.abs(e.nativeEvent.velocity?.y ?? 0) < 0.1) snap(e);
    },
    onMomentumScrollEnd: snap,
  };
}

export type AppBarState = ReturnType<typeof useAppBar>;

type Props = {
  bar: AppBarState;
  title: string;
  /** Small grey line under the big title, e.g. "3 folders". */
  subtitle?: string;
  left?: ReactNode;
  right?: ReactNode;
};

/** Draw over a ScrollView whose content starts with `bar.expanded` of blank space. */
export function AppBar({ bar, title, subtitle, left, right }: Props) {
  const t = useTheme();
  const { expanded, range, scrollY } = bar;

  const clamp = 'clamp' as const;
  const translateY = scrollY.interpolate({ inputRange: [0, range], outputRange: [0, -range], extrapolate: clamp });
  // Inside the bar (already moving 1:1), push the title back down by 1/3.
  const titleY = scrollY.interpolate({
    inputRange: [0, range],
    outputRange: [0, range * (1 - TITLE_PARALLAX)],
    extrapolate: clamp,
  });
  const bigOpacity = scrollY.interpolate({ inputRange: [0, range * BIG_FADE_END], outputRange: [1, 0], extrapolate: clamp });
  const smallOpacity = scrollY.interpolate({
    inputRange: SMALL_FADE.map((f) => f * range),
    outputRange: [0, 1],
    extrapolate: clamp,
  });

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.bar, { height: expanded, backgroundColor: t.bg, transform: [{ translateY }] }]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.bigWrap,
          // Title and subtitle centred together, so the pair sits where the title alone would.
          { top: expanded * TITLE_CENTER - (TITLE_BOX_H + (subtitle ? SUBTITLE_H : 0)) / 2, opacity: bigOpacity, transform: [{ translateY: titleY }] },
        ]}
      >
        <Text numberOfLines={1} maxFontSizeMultiplier={1.2} style={[styles.bigTitle, { color: t.text }]}>
          {title}
        </Text>
        {!!subtitle && (
          <Text numberOfLines={1} maxFontSizeMultiplier={1.2} style={[styles.subtitle, { color: t.subtext }]}>
            {subtitle}
          </Text>
        )}
      </Animated.View>

      <View pointerEvents="box-none" style={[styles.row, { top: expanded - ROW_H }]}>
        <View style={[styles.slot, { left: ICON_INSET - BUTTON / 2 }]}>{left}</View>
        <Animated.Text accessibilityRole="header" numberOfLines={1} maxFontSizeMultiplier={1.2} style={[styles.smallTitle, { color: t.text, opacity: smallOpacity }]}>
          {title}
        </Animated.Text>
        {/* Right-aligned row, so the last button keeps Samsung's 36dp inset. */}
        <View style={[styles.slot, styles.rightSlot, { right: ICON_INSET - BUTTON / 2 }]}>{right}</View>
      </View>
    </Animated.View>
  );
}

/** 48dp touch target for the bar's nav and action icons. */
/** Icon-only header button; long-press shows its label as a tooltip. */
export function BarButton({ onPress, label, children }: { onPress: () => void; label: string; children: ReactNode }) {
  const t = useTheme();
  return (
    <TipPressable
      tooltip={label}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      android_ripple={{ color: t.ripple, borderless: true, radius: BUTTON / 2 }}
      style={styles.button}
    >
      {children}
    </TipPressable>
  );
}

const styles = StyleSheet.create({
  button: { width: BUTTON, height: BUTTON, alignItems: 'center', justifyContent: 'center' },
  bar: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  bigWrap: { position: 'absolute', left: 0, right: 0, paddingHorizontal: 24 },
  // Samsung Notes' Folders page: 30sp title, 15sp grey count under it. (The system font has no semibold, so bold.)
  bigTitle: { height: TITLE_BOX_H, fontFamily: FONT, fontSize: 30, lineHeight: TITLE_BOX_H, fontWeight: 'bold', textAlign: 'center' },
  subtitle: { height: SUBTITLE_H, fontFamily: FONT, fontSize: 15, lineHeight: SUBTITLE_H, textAlign: 'center' },
  row: { position: 'absolute', left: 0, right: 0, height: ROW_H, justifyContent: 'center' },
  slot: { position: 'absolute', top: (ROW_H - BUTTON) / 2, width: BUTTON, height: BUTTON },
  rightSlot: { width: undefined, flexDirection: 'row' },
  // Collapsed title starts where the nav button's 60dp touch area ends.
  smallTitle: { marginLeft: 60, marginRight: 72, fontFamily: FONT, fontSize: 20.5, fontWeight: 'bold' },
});
