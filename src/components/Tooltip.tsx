import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Pressable, StyleSheet, Text, View, useWindowDimensions, type PressableProps, type ViewInstance } from 'react-native';
import { FONT, useTheme } from '../theme';

/**
 * One UI tooltips: long-press an icon-only button and its name shows in a small
 * pill beside it, staying 1.5s after the finger lifts. One host at the app's
 * root draws it above everything, so buttons only report where they are.
 */

/** Where the button is, in window coordinates, and which side of it the pill goes. */
type Anchor = { x: number; y: number; w: number; h: number; above?: boolean };
type TooltipApi = { show: (label: string, anchor: Anchor) => void; hide: (afterMs?: number) => void };

const TooltipContext = createContext<TooltipApi | null>(null);

/** How long the pill stays once the finger lifts. */
const LINGER_MS = 1500;
/** Space between the button and the pill, and the pill's minimum distance from the screen sides. */
const GAP = 6;
const EDGE = 8;
/** Below the button unless it would come this close to the screen's foot. */
const FOOT = 120;

export function TooltipProvider({ children }: { children: ReactNode }) {
  const t = useTheme();
  const { width, height } = useWindowDimensions();
  const [tip, setTip] = useState<{ label: string; anchor: Anchor } | null>(null);
  /** The pill's own size, measured before it's placed and faded in. */
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const show = useCallback(
    (label: string, anchor: Anchor) => {
      clearTimeout(timer.current);
      opacity.setValue(0);
      setSize(null);
      setTip({ label, anchor });
    },
    [opacity]
  );

  const hide = useCallback(
    (afterMs = 0) => {
      clearTimeout(timer.current);
      timer.current = setTimeout(
        () => Animated.timing(opacity, { toValue: 0, duration: 150, useNativeDriver: true }).start(({ finished }) => finished && setTip(null)),
        afterMs
      );
    },
    [opacity]
  );

  useEffect(() => {
    if (tip && size) Animated.timing(opacity, { toValue: 1, duration: 120, useNativeDriver: true }).start();
  }, [tip, size, opacity]);

  useEffect(() => () => clearTimeout(timer.current), []);

  let place = { left: 0, top: 0 };
  if (tip && size) {
    const { x, y, w, h, above } = tip.anchor;
    const below = y + h + GAP;
    place = {
      left: Math.min(Math.max(x + w / 2 - size.w / 2, EDGE), width - EDGE - size.w),
      top: above || below + size.h > height - FOOT ? y - GAP - size.h : below,
    };
  }

  return (
    <TooltipContext.Provider value={{ show, hide }}>
      {children}
      {tip && (
        <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.host}>
          <Animated.View
            onLayout={(e) => {
              const { width: w, height: h } = e.nativeEvent.layout;
              if (!size || size.w !== w || size.h !== h) setSize({ w, h });
            }}
            style={[styles.pill, { backgroundColor: t.toast, opacity }, place]}
          >
            <Text numberOfLines={1} style={styles.text}>
              {tip.label}
            </Text>
          </Animated.View>
        </View>
      )}
    </TooltipContext.Provider>
  );
}

/**
 * A Pressable that shows `tooltip` on long-press. Taps work as usual. `tooltipAbove`
 * for buttons over the keyboard (the editor toolbar), which would hide a pill below them.
 */
export function TipPressable({
  tooltip,
  tooltipAbove,
  onLongPress,
  onPressOut,
  ...rest
}: PressableProps & { tooltip: string; tooltipAbove?: boolean }) {
  const api = useContext(TooltipContext);
  const ref = useRef<ViewInstance>(null);
  return (
    <Pressable
      ref={ref}
      onLongPress={(e) => {
        ref.current?.measureInWindow((x, y, w, h) => api?.show(tooltip, { x, y, w, h, above: tooltipAbove }));
        onLongPress?.(e);
      }}
      onPressOut={(e) => {
        api?.hide(LINGER_MS);
        onPressOut?.(e);
      }}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  host: { ...StyleSheet.absoluteFill, zIndex: 1000, elevation: 1000 },
  pill: { position: 'absolute', maxWidth: 240, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 7 },
  text: { fontFamily: FONT, fontSize: 14, color: '#FFFFFF' },
});
