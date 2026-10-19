import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Easing, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FONT, useTheme } from '../theme';
import { useBackHandler } from '../utils';
import { BarButton } from './AppBar';
import { ThinBackIcon } from './icons';

/** Slide-in from the right on open, out again on `close()`, which then calls `onClose`. */
export function useSlideIn(onClose: () => void) {
  const { width } = useWindowDimensions();
  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(slide, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [slide]);

  const close = () =>
    Animated.timing(slide, { toValue: 0, duration: 200, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(onClose);

  const translateX = slide.interpolate({ inputRange: [0, 1], outputRange: [width * 0.25, 0] });
  return { close, style: { opacity: slide, transform: [{ translateX }] } };
}

type Props = {
  title: string;
  onClose: () => void;
  /** Buttons at the right of the header. */
  right?: ReactNode;
  /** Back press while open; return true to consume it (e.g. to close an inner dialog first). */
  onBack?: () => boolean;
  children: ReactNode;
  /** Above the main screen and below the editor. */
  zIndex?: number;
};

/** Full-screen page over the notes screen: header with a back chevron and title. */
export default function Page({ title, onClose, right, onBack, children, zIndex = 20 }: Props) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { close, style } = useSlideIn(onClose);

  useBackHandler(() => {
    if (onBack?.()) return true;
    close();
    return true;
  });

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        { zIndex, backgroundColor: t.bg, paddingTop: insets.top, paddingBottom: insets.bottom },
        style,
      ]}
    >
      <View style={[styles.header, { borderBottomColor: t.dialogLine }]}>
        <BarButton label="Navigate up" onPress={close}>
          <ThinBackIcon color={t.text} />
        </BarButton>
        <Text accessibilityRole="header" numberOfLines={1} style={[styles.title, { color: t.text }]}>
          {title}
        </Text>
        {right}
      </View>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  header: { height: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, borderBottomWidth: StyleSheet.hairlineWidth },
  title: { flex: 1, fontFamily: FONT, fontSize: 20, fontWeight: 'bold', marginLeft: 8 },
});
