import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Line } from 'react-native-svg';
import app from '../../app.json';
import { QUICK_FOLDER_ID, type Folder } from '../data';
import { getDrawerTree, saveDrawerTree, type DrawerTree } from '../settings';
import { FONT, useTheme } from '../theme';
import { ChevronIcon, DeleteIcon, FolderOutlineIcon, FoldersIcon, LockIcon, MemoIcon, NotebookIcon } from './icons';

type Props = {
  visible: boolean;
  folders: Folder[];
  /** Open folder, or null for Home (the Folders row) or a list view. */
  current: string | null;
  /** All notes or Locked notes is open. */
  listView: 'all' | 'locked' | null;
  /** Notes in a folder, subfolders included. */
  count: (folderId: string) => number;
  allCount: number;
  lockedCount: number;
  /** Notes in the Recycle bin. */
  trashCount: number;
  /** A folder, or null for Home. */
  onPick: (folderId: string | null) => void;
  onList: (view: 'all' | 'locked') => void;
  onTrash: () => void;
  onClose: () => void;
};

// Measured from Samsung Notes' drawer on a 420dpi phone (1dp = 2.625px).
/** Panel: up to 300dp wide (about three quarters of a phone), floating 8dp clear of the screen's left edge and the system bars. */
const DRAWER_W = 300;
const MARGIN = 8;
const RADIUS = 16;
/** Space above the first row (Samsung's gear row, now without the gear). */
const TOP_GAP_IN = 16;
/** Rows sit 8dp in from both sides; the selected one gets a rounded fill. */
const SIDE = 8;
const ROW_H = 52;
const ROW_RADIUS = 8;
/** Icon 12dp into the row, title at 56dp; each tree level indents the icon 30dp. */
const ICON_X = 12;
const ICON_BOX = 28;
/** Drawn icon size, inside ICON_BOX. */
const ICON = 24;
const CHEVRON_BOX = 30;
const TITLE_GAP = 16;
const INDENT = 30;
/** Dotted rule: 22dp / 27dp in from the panel's sides, in a 19dp-tall band. */
const RULE_LEFT = 22;
const RULE_RIGHT = 27;
const RULE_BAND = 19;
const DOT = 1.5;
const DOT_PITCH = 4.45;

/** Samsung Notes' navigation drawer: views, a dotted rule, then the folder tree under a Folders row. */
export default function MenuCard({
  visible,
  folders,
  current,
  listView,
  count,
  allCount,
  lockedCount,
  trashCount,
  onPick,
  onList,
  onTrash,
  onClose,
}: Props) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const slide = useRef(new Animated.Value(0)).current;
  const drawerW = Math.min(DRAWER_W, Math.round(width * 0.75));
  /** Folded state of the folder tree, remembered across launches. */
  const [tree, setTree] = useState(getDrawerTree);
  const updateTree = (next: DrawerTree) => {
    setTree(next);
    saveDrawerTree(next);
  };
  const toggleFolder = (id: string) =>
    updateTree({
      ...tree,
      expanded: tree.expanded.includes(id) ? tree.expanded.filter((x) => x !== id) : [...tree.expanded, id],
    });

  useEffect(() => {
    if (!visible) return;
    slide.setValue(0);
    Animated.timing(slide, { toValue: 1, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [visible, slide]);

  /** Selectable rows' icons: filled while that row is the open view, cut out in the row's highlight. */
  type Glyph = (p: { color: string; filled?: boolean; cutout?: string }) => ReactNode;
  const glyph = (Icon: Glyph, color: string, on: boolean) => <Icon color={color} filled={on} cutout={t.toolGroup} />;

  type RowOpts = {
    depth?: number;
    on?: boolean;
    /** Shown only when above zero, as Samsung does. */
    count?: number;
    /** Left of the icon: the expand / collapse chevron. */
    chevron?: { open: boolean; label: string; onPress: () => void };
    /** Tapping the icon does this instead of opening the row (the Folders row folds the tree). */
    iconPress?: { label: string; expanded: boolean; onPress: () => void };
  };

  const row = (key: string, label: string, icon: ReactNode, onPress: () => void, opts: RowOpts = {}) => {
    const iconX = ICON_X + (opts.depth ?? 0) * INDENT;
    const toggle = opts.chevron ?? opts.iconPress;
    return (
      <Pressable
        key={key}
        accessibilityRole="button"
        accessibilityState={{ selected: !!opts.on }}
        accessibilityLabel={opts.count ? `${label}, ${opts.count}` : label}
        onPress={onPress}
        android_ripple={{ color: t.ripple }}
        style={[styles.row, opts.on && { backgroundColor: t.toolGroup }]}
      >
        {opts.chevron && (
          // Centred under the parent level's folder icon, one indent to the left.
          <View pointerEvents="none" style={[styles.chevron, { left: iconX - INDENT + ICON / 2 - CHEVRON_BOX / 2 }]}>
            <ChevronIcon open={opts.chevron.open} color={t.subtext} size={30} />
          </View>
        )}
        {/* The icon (plus the chevron's space) is its own button when the row folds. */}
        <Pressable
          disabled={!toggle}
          accessibilityRole={toggle ? 'button' : undefined}
          accessibilityLabel={opts.chevron?.label ?? opts.iconPress?.label}
          accessibilityState={toggle ? { expanded: opts.chevron?.open ?? opts.iconPress?.expanded } : undefined}
          onPress={toggle?.onPress}
          style={[styles.icon, { paddingLeft: iconX, width: iconX + ICON_BOX }]}
        >
          {icon}
        </Pressable>
        <Text numberOfLines={1} style={[styles.label, { color: t.dialogTitle }, opts.on && styles.labelOn]}>
          {label}
        </Text>
        {!!opts.count && <Text style={[styles.count, { color: t.subtext }]}>{opts.count}</Text>}
      </Pressable>
    );
  };

  const branch = (parentId: string | null, depth: number): ReactNode[] =>
    folders
      // Quick notes has its own row in the top group.
      .filter((f) => f.parentId === parentId && f.id !== QUICK_FOLDER_ID)
      .flatMap((f) => {
        const hasChildren = folders.some((c) => c.parentId === f.id);
        const open = tree.expanded.includes(f.id);
        return [
          row(f.id, f.name, glyph(FolderOutlineIcon, f.color, f.id === current), () => onPick(f.id), {
            depth,
            on: f.id === current,
            count: count(f.id),
            chevron: hasChildren ? { open, label: `${open ? 'Collapse' : 'Expand'} ${f.name}`, onPress: () => toggleFolder(f.id) } : undefined,
          }),
          ...(hasChildren && open ? branch(f.id, depth + 1) : []),
        ];
      });

  const translateX = slide.interpolate({ inputRange: [0, 1], outputRange: [-(drawerW + MARGIN), 0] });

  // Dotted rule as round-capped zero-length dashes: Android won't draw a dotted border on one side of a view.
  const ruleW = drawerW - RULE_LEFT - RULE_RIGHT;
  const rule = (
    <View style={styles.ruleBand}>
      <Svg width={ruleW} height={DOT}>
        <Line
          x1={DOT / 2}
          y1={DOT / 2}
          x2={ruleW - DOT / 2}
          y2={DOT / 2}
          stroke={t.drawerDots}
          strokeWidth={DOT}
          strokeLinecap="round"
          strokeDasharray={`0 ${DOT_PITCH}`}
        />
      </Svg>
    </View>
  );

  const home = current === null && !listView;
  const topFolders = folders.filter((f) => f.parentId === null && f.id !== QUICK_FOLDER_ID).length;

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
      <Pressable accessibilityLabel="Close menu" style={[StyleSheet.absoluteFill, { backgroundColor: t.backdrop }]} onPress={onClose} />
      <Animated.View
        style={[
          styles.drawer,
          {
            width: drawerW,
            top: insets.top + MARGIN,
            bottom: insets.bottom + MARGIN,
            backgroundColor: t.drawer,
            transform: [{ translateX }],
          },
        ]}
      >
        <ScrollView bounces={false} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          {row('all', 'All notes', glyph(NotebookIcon, t.dialogTitle, listView === 'all'), () => onList('all'), {
            on: listView === 'all',
            count: allCount,
          })}
          {row('quick', 'Quick notes', glyph(MemoIcon, t.dialogTitle, current === QUICK_FOLDER_ID), () => onPick(QUICK_FOLDER_ID), {
            on: current === QUICK_FOLDER_ID,
            count: count(QUICK_FOLDER_ID),
          })}
          {row('locked', 'Locked notes', glyph(LockIcon, t.dialogTitle, listView === 'locked'), () => onList('locked'), {
            on: listView === 'locked',
            count: lockedCount,
          })}
          {row('trash', 'Recycle bin', <DeleteIcon color={t.dialogTitle} />, onTrash, { count: trashCount })}
          {rule}
          {row('folders', 'Folders', glyph(FoldersIcon, t.dialogTitle, home), () => onPick(null), {
            on: home,
            count: topFolders,
            // As in Samsung Notes, the Folders icon folds the whole tree away.
            iconPress: {
              label: tree.open ? 'Collapse folders' : 'Expand folders',
              expanded: tree.open,
              onPress: () => updateTree({ ...tree, open: !tree.open }),
            },
          })}
          {tree.open && branch(null, 1)}
        </ScrollView>
        {/* App name and version, pinned to the drawer's foot. */}
        <Text style={[styles.version, { color: t.subtext }]}>
          {app.expo.name} {app.expo.version}
        </Text>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  drawer: {
    position: 'absolute',
    left: MARGIN,
    borderRadius: RADIUS,
    overflow: 'hidden',
    elevation: 12,
  },
  content: { paddingHorizontal: SIDE, paddingTop: TOP_GAP_IN, paddingBottom: 24 },
  version: { fontFamily: FONT, fontSize: 12, textAlign: 'center', paddingTop: 8, paddingBottom: 16 },
  row: { height: ROW_H, borderRadius: ROW_RADIUS, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', paddingRight: 22 },
  icon: { height: ROW_H, justifyContent: 'center' },
  chevron: { position: 'absolute', top: 0, bottom: 0, width: CHEVRON_BOX, justifyContent: 'center', alignItems: 'center' },
  label: { flex: 1, fontFamily: FONT, fontSize: 17, marginLeft: TITLE_GAP },
  labelOn: { fontWeight: 'bold' },
  count: { fontSize: 14, marginLeft: 8 },
  // The dots sit at the foot of the band, 2dp above the Folders row.
  ruleBand: { height: RULE_BAND, justifyContent: 'flex-end', paddingBottom: 2 - DOT / 2, paddingLeft: RULE_LEFT - SIDE },
});
