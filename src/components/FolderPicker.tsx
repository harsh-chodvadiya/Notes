import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { QUICK_FOLDER_ID, type Folder } from '../data';
import { ADD_GREEN, FONT, useTheme } from '../theme';
import { AddIcon, FolderCheckIcon, FolderOutlineIcon } from './icons';

type Props = {
  visible: boolean;
  /**
   * 'folders': moving folders — to the top level or into a main folder.
   * 'notes': moving notes — into any folder (notes can't sit at the top level).
   */
  mode: 'folders' | 'notes';
  folders: Folder[];
  /** Folders that can't be picked: the ones being moved, or the notes' current folder. */
  blocked: Set<string>;
  /** Folders mode: false when a folder being moved has subfolders — it may only go to the top level. */
  canNest?: boolean;
  onPick: (folderId: string | null) => void;
  onCreate: () => void;
  onClose: () => void;
};

const ROW_H = 48;
const INDENT = 24;

/** Samsung's "Select destination folder" sheet: the folder tree plus "Create folder". */
export default function FolderPicker({ visible, mode, folders, blocked, canNest = true, onPick, onCreate, onClose }: Props) {
  const t = useTheme();
  const insets = useSafeAreaInsets();

  const row = (key: string, depth: number, label: string, icon: ReactNode, onPress: (() => void) | null) => (
    <Pressable
      key={key}
      accessibilityRole="button"
      accessibilityState={{ disabled: !onPress }}
      disabled={!onPress}
      onPress={onPress ?? undefined}
      android_ripple={{ color: t.ripple }}
      style={[styles.row, { paddingLeft: 16 + depth * INDENT }, !onPress && { opacity: 0.4 }]}
    >
      {icon}
      <Text numberOfLines={1} style={[styles.name, { color: t.dialogTitle }]}>
        {label}
      </Text>
    </Pressable>
  );

  const folderRow = (f: Folder, depth: number, pickable: boolean) =>
    row(f.id, depth, f.name, <FolderOutlineIcon size={24} color={f.color} />, pickable && !blocked.has(f.id) ? () => onPick(f.id) : null);

  // Folders go at most two levels deep, so only main folders can take a folder in.
  const mains = folders.filter((f) => f.parentId === null);
  const canCreate = mode === 'notes' || canNest;

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
      <View style={[styles.root, { backgroundColor: t.backdrop }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        <View style={[styles.sheet, { backgroundColor: t.dialog, marginBottom: insets.bottom + 16 }]}>
          <Text accessibilityRole="header" style={[styles.title, { color: t.dialogTitle }]}>
            Select destination folder
          </Text>
          <View style={[styles.rule, { backgroundColor: t.dialogLine }]} />
          <ScrollView style={[styles.list, { backgroundColor: t.dialogList }]} bounces={false}>
            {mode === 'folders' ? (
              <>
                {row('root', 0, 'Folders', <FolderCheckIcon size={24} color={t.selectIcon} />, () => onPick(null))}
                {/* Quick notes holds notes only, never folders. */}
                {mains.map((f) => folderRow(f, 1, canNest && f.id !== QUICK_FOLDER_ID))}
              </>
            ) : (
              mains.flatMap((f) => [folderRow(f, 0, true), ...folders.filter((c) => c.parentId === f.id).map((c) => folderRow(c, 1, true))])
            )}
            {row('create', 0, 'Create folder', <AddIcon size={26} color={ADD_GREEN} />, canCreate ? onCreate : null)}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  sheet: { marginHorizontal: 10, borderRadius: 26, paddingTop: 24, paddingBottom: 10, maxHeight: '75%' },
  title: { fontFamily: FONT, fontSize: 17.5, fontWeight: 'bold', lineHeight: 24, marginHorizontal: 24 },
  rule: { height: 1, marginHorizontal: 8, marginTop: 14 },
  list: { margin: 10, marginTop: 10, borderRadius: 20 },
  row: { minHeight: ROW_H, flexDirection: 'row', alignItems: 'center', paddingRight: 16 },
  name: { flex: 1, fontSize: 17, marginLeft: 16 },
});
