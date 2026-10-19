import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  Easing,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputInstance,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { BlankCircleIcon, CheckCircleIcon, type BarIcon } from './icons';
import { FOLDER_ASPECT, FOLDER_BODY, FOLDER_FLAP, FOLDER_VIEW_BOX, SHADOW_PAD } from './folderShape';
import { COMPOSE, FOLDER_COLORS, FONT, flapColor, useTheme } from '../theme';

const SHADOW_BLUR = 3;
const SHADOW_LAYERS = Array.from({ length: 8 }, (_, i) => 2 * SHADOW_BLUR * Math.sqrt(-2 * Math.log((i + 0.5) / 8)));
const SHADOW_COLOR = '#333333';
/** Dark-mode folder outline, sampled from Samsung Notes (#474749). */
const FOLDER_OUTLINE = '#47474A';

/** Selection tick: Samsung's coral when checked. */
export function Checkbox({ checked, size = 24 }: { checked: boolean; size?: number }) {
  const t = useTheme();
  return checked ? (
    <CheckCircleIcon size={size} color={COMPOSE} />
  ) : (
    <BlankCircleIcon size={size} color={t.checkbox} />
  );
}

type FolderCardProps = {
  name: string;
  color: string;
  count: number;
  width: number;
  selecting: boolean;
  selected: boolean;
  onPress: () => void;
  onLongPress: () => void;
};

export function FolderCard({ name, color, count, width, selecting, selected, onPress, onLongPress }: FolderCardProps) {
  const t = useTheme();
  const pad = (width * SHADOW_PAD) / 100;
  return (
    <Pressable
      accessibilityRole={selecting ? 'checkbox' : 'button'}
      accessibilityLabel={`${name}, folder, ${count} ${count === 1 ? 'note' : 'notes'}`}
      accessibilityState={selecting ? { checked: selected } : undefined}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={300}
      style={({ pressed }) => [{ width, height: width * FOLDER_ASPECT }, pressed && { opacity: 0.7 }]}
    >
      <Svg viewBox={FOLDER_VIEW_BOX} style={{ position: 'absolute', top: -pad, left: -pad, right: -pad, bottom: -pad }}>
        {!t.dark &&
          SHADOW_LAYERS.map((w) => (
            <Path
              key={w}
              d={FOLDER_BODY}
              transform="translate(0 1.5)"
              stroke={SHADOW_COLOR}
              strokeOpacity={2 / 255}
              strokeWidth={w}
              strokeLinejoin="round"
              fill="none"
            />
          ))}
        <Path d={FOLDER_FLAP} fill={flapColor(color, t.dark)} />
        {/* Dark mode outlines the body (0.7dp) where light mode has its shadow, as Samsung Notes does. */}
        <Path
          d={FOLDER_BODY}
          fill={t.folder}
          stroke={t.dark ? FOLDER_OUTLINE : 'none'}
          strokeWidth={70 / width}
          strokeLinejoin="round"
        />
      </Svg>
      <View style={styles.folderBody}>
        {selecting ? (
          <Checkbox checked={selected} size={16} />
        ) : (
          <Text maxFontSizeMultiplier={1.15} style={[styles.folderCount, { color: t.subtext }]}>
            {count}
          </Text>
        )}
        <Text numberOfLines={2} maxFontSizeMultiplier={1.15} style={[styles.folderName, { color: t.text }]}>
          {name}
        </Text>
      </View>
    </Pressable>
  );
}

export type DialogAction = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
};

type DialogProps = {
  visible: boolean;
  title?: string;
  message?: string;
  children?: ReactNode;
  actions: DialogAction[];
  onClose: () => void;
};

/**
 * One UI dialog as Samsung Notes draws it: a bottom-anchored card 10dp from the
 * sides and 16dp above the nav bar, 24dp padding, text buttons split by a hairline.
 */
export function Dialog({ visible, title, message, children, actions, onClose }: DialogProps) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardOpen();
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior="padding" style={[styles.dialogRoot, { backgroundColor: t.backdrop }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        {/* Over the keyboard Samsung leaves only 8dp; otherwise 16dp above the nav bar. */}
        <View style={[styles.dialog, { backgroundColor: t.dialog, marginBottom: keyboard ? 8 : insets.bottom + 16 }]}>
          {!!title && (
            <Text accessibilityRole="header" style={[styles.dialogTitle, { color: t.dialogTitle }]}>
              {title}
            </Text>
          )}
          {!!message && <Text style={[styles.dialogMsg, { color: t.dialogText }]}>{message}</Text>}
          {children}
          <View style={styles.dialogActions}>
            {actions.map((a, i) => (
              <View key={a.label} style={styles.dialogActionWrap}>
                {i > 0 && <View style={[styles.vDivider, { backgroundColor: t.dialogLine }]} />}
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !!a.disabled }}
                  onPress={a.onPress}
                  disabled={a.disabled}
                  android_ripple={{ color: t.ripple }}
                  style={styles.dialogAction}
                >
                  <Text style={[styles.dialogActionText, { color: t.dialogButton }, a.disabled && { opacity: 0.4 }]}>{a.label}</Text>
                </Pressable>
              </View>
            ))}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function useKeyboardOpen() {
  const [open, setOpen] = useState(Keyboard.isVisible());
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setOpen(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setOpen(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return open;
}

/** Name field: opens with the text selected, underlined like One UI. */
export function DialogInput({
  value,
  onChangeText,
  onSubmit,
  label,
}: {
  value: string;
  onChangeText: (v: string) => void;
  onSubmit: () => void;
  /** Spoken name of the field. */
  label?: string;
}) {
  const t = useTheme();
  const ref = useRef<TextInputInstance>(null);
  // autoFocus fires before the Modal's window takes focus, so the keyboard
  // never opens; focusing a beat later does.
  useEffect(() => {
    const id = setTimeout(() => ref.current?.focus(), 150);
    return () => clearTimeout(id);
  }, []);
  return (
    <TextInput
      ref={ref}
      accessibilityLabel={label}
      selectTextOnFocus
      value={value}
      onChangeText={onChangeText}
      onSubmitEditing={onSubmit}
      maxLength={50}
      selectionColor={t.dark ? '#4A6670' : '#B7D3DD'}
      cursorColor={t.dialogButton}
      style={[styles.input, { color: t.dialogButton, borderColor: t.dialogButton }]}
    />
  );
}

/** "Colour" caption with Samsung's dotted rule running to the right edge. */
export function DialogLabel({ children }: { children: string }) {
  const t = useTheme();
  return (
    <View style={styles.labelRow}>
      <Text style={[styles.label, { color: t.dialogLabel }]}>{children}</Text>
      <View style={[styles.dots, { borderColor: t.dialogLabel }]} />
    </View>
  );
}

/** Samsung's 12 folder colours, 6 per row, with a thin white tick on the chosen one. */
export function ColorPalette({ value, onChange }: { value: string; onChange: (color: string) => void }) {
  return (
    <View style={styles.palette}>
      {[FOLDER_COLORS.slice(0, 6), FOLDER_COLORS.slice(6, 12)].map((row, r) => (
        <View key={r} style={styles.paletteRow}>
          {row.map(({ color, name }) => (
            <Pressable
              key={color}
              accessibilityRole="radio"
              accessibilityState={{ checked: value === color }}
              accessibilityLabel={name}
              onPress={() => onChange(color)}
              style={[styles.swatch, { backgroundColor: color }]}
            >
              {value === color && (
                <Svg width={SWATCH} height={SWATCH} viewBox="0 0 34 34">
                  <Path
                    d="M6.5 16L16.3 23.8L28 10.6"
                    stroke="#FCFCFC"
                    strokeWidth={1.6}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                </Svg>
              )}
            </Pressable>
          ))}
          {/* Hold a short last row to the same 6-column grid. */}
          {Array.from({ length: 6 - row.length }, (_, k) => (
            <View key={`gap${k}`} style={styles.swatchGap} />
          ))}
        </View>
      ))}
    </View>
  );
}

export type BarAction = {
  icon: BarIcon;
  label: string;
  onPress: () => void;
  disabled?: boolean;
};

// One UI 9 made the floating bar more compact and rounder, with larger gaps
// at the sides and bottom than One UI 8.5 (estimated — no public measurements).
const BAR_H = 58;
const BAR_GAP_SIDE = 22;
const BAR_GAP_BOTTOM = 18;
/** Room the bar takes at the bottom, so content can scroll clear of it. */
export const SELECTION_BAR_SPACE = BAR_H + BAR_GAP_BOTTOM;

type SelectionBarProps = {
  actions: BarAction[];
  /** Slides the bar off-screen, e.g. while scrolling down. */
  hidden?: boolean;
};

/**
 * One UI 8.5 floating action bar: a pill detached from the screen edges,
 * icon + label per action.
 */
export function SelectionBar({ actions, hidden = false }: SelectionBarProps) {
  const t = useTheme();
  const offset = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(offset, {
      toValue: hidden ? SELECTION_BAR_SPACE + 16 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [hidden, offset]);

  return (
    <Animated.View style={[styles.selectBar, { backgroundColor: t.selectTint }, !t.dark && styles.selectShadow, { transform: [{ translateY: offset }] }]}>
      {actions.map((a) => (
        <Pressable
          key={a.label}
          accessibilityRole="button"
          accessibilityLabel={a.label}
          accessibilityState={{ disabled: !!a.disabled }}
          disabled={a.disabled}
          onPress={a.onPress}
          android_ripple={{ color: t.ripple, borderless: true, radius: 30 }}
          style={[styles.selectAction, a.disabled && { opacity: 0.4 }]}
        >
          <a.icon color={t.selectIcon} size={24} />
          <Text style={[styles.selectLabel, { color: t.selectLabel }]} numberOfLines={1} maxFontSizeMultiplier={1.2}>
            {a.label}
          </Text>
        </Pressable>
      ))}
    </Animated.View>
  );
}

const SWATCH = 34;

const styles = StyleSheet.create({
  // Count in the tab's corner, name bold at the foot (Samsung Notes: 10dp in, 4dp / 6dp from top and bottom).
  folderBody: { flex: 1, paddingLeft: 10, paddingRight: 6, paddingTop: 4, paddingBottom: 6, justifyContent: 'space-between' },
  folderCount: { fontSize: 12 },
  folderName: { fontFamily: FONT, fontSize: 13, lineHeight: 17, fontWeight: 'bold' },
  dialogRoot: { flex: 1, justifyContent: 'flex-end' },
  dialog: { marginHorizontal: 10, borderRadius: 26, paddingTop: 24, paddingHorizontal: 24, paddingBottom: 20 },
  dialogTitle: { fontFamily: FONT, fontSize: 17.5, fontWeight: 'bold', lineHeight: 24, marginBottom: 18 },
  dialogMsg: { fontSize: 15, lineHeight: 20, marginBottom: 2 },
  dialogActions: { flexDirection: 'row', marginTop: 16, minHeight: 36 },
  dialogActionWrap: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  dialogAction: { flex: 1, minHeight: 36, alignItems: 'center', justifyContent: 'center' },
  dialogActionText: { fontFamily: FONT, fontSize: 18, fontWeight: 'bold' },
  vDivider: { width: 1, height: 16 },
  input: { fontSize: 18, borderBottomWidth: 2, paddingHorizontal: 4, paddingTop: 10, paddingBottom: 6 },
  labelRow: { flexDirection: 'row', alignItems: 'center', marginTop: 24 },
  label: { fontSize: 14, lineHeight: 18 },
  dots: { flex: 1, marginLeft: 18, borderTopWidth: 1.5, borderStyle: 'dotted' },
  palette: { gap: 16, marginTop: 9 },
  paletteRow: { flexDirection: 'row', justifyContent: 'space-between' },
  swatch: { width: SWATCH, height: SWATCH, borderRadius: SWATCH / 2 },
  swatchGap: { width: SWATCH },
  selectBar: {
    position: 'absolute',
    left: BAR_GAP_SIDE,
    right: BAR_GAP_SIDE,
    bottom: BAR_GAP_BOTTOM,
    height: BAR_H,
    borderRadius: BAR_H / 2,
    overflow: 'hidden',
    flexDirection: 'row',
    paddingHorizontal: 6,
  },
  // Light mode lifts the pill off the page with a shadow; dark mode has none.
  selectShadow: { elevation: 4, shadowColor: 'rgba(0,0,0,0.5)' },
  selectAction: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  selectLabel: { fontFamily: FONT, fontSize: 10, marginTop: 3, paddingHorizontal: 2 },
});
