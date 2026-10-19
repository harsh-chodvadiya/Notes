import { StyleSheet, Text } from 'react-native';
import type { Folder } from '../data';
import { useTheme } from '../theme';
import { ColorPalette, Dialog, DialogInput, DialogLabel } from './ui';

export type FolderForm =
  /** `moveFolderIds` / `moveNoteIds`: created from the Move sheet, so the selection moves into it. */
  | { mode: 'create'; parentId: string | null; name: string; color: string; moveFolderIds?: string[]; moveNoteIds?: string[] }
  | { mode: 'rename'; id: string; original: string; name: string }
  | { mode: 'color'; ids: string[]; color: string };

export type CreateForm = Extract<FolderForm, { mode: 'create' }>;
export type RenameForm = Extract<FolderForm, { mode: 'rename' }>;

type Props = {
  form: FolderForm | null;
  folders: Folder[];
  onChange: (form: FolderForm | null) => void;
  onCreate: (form: CreateForm) => void;
  onRename: (form: RenameForm) => void;
  onColor: (ids: string[], color: string) => void;
};

/** Samsung names new folders "Folder 1", "Folder 2", … skipping names in use. */
export function nextFolderName(siblings: Folder[]) {
  const taken = new Set(siblings.map((f) => f.name.toLowerCase()));
  let n = 1;
  while (taken.has(`folder ${n}`)) n++;
  return `Folder ${n}`;
}

/** Names must be unique among a folder's siblings. */
const nameTaken = (folders: Folder[], name: string, parentId: string | null, exceptId?: string) =>
  folders.some((f) => f.parentId === parentId && f.id !== exceptId && f.name.toLowerCase() === name.trim().toLowerCase());

/** Create folder, Rename folder and Change folder colour dialogs. */
export default function FolderForms({ form, folders, onChange, onCreate, onRename, onColor }: Props) {
  const t = useTheme();
  if (!form) return null;
  const cancel = () => onChange(null);

  if (form.mode === 'create') {
    const taken = nameTaken(folders, form.name, form.parentId);
    const valid = !!form.name.trim() && !taken;
    return (
      <Dialog
        visible
        title="Create folder"
        onClose={cancel}
        actions={[
          { label: 'Cancel', onPress: cancel },
          { label: 'Add', disabled: !valid, onPress: () => onCreate(form) },
        ]}
      >
        <DialogInput label="Folder name" value={form.name} onChangeText={(name) => onChange({ ...form, name })} onSubmit={() => valid && onCreate(form)} />
        {taken && <Text style={[styles.error, { color: t.error }]}>Folder name already in use.</Text>}
        <DialogLabel>Colour</DialogLabel>
        <ColorPalette value={form.color} onChange={(color) => onChange({ ...form, color })} />
      </Dialog>
    );
  }

  if (form.mode === 'rename') {
    const parentId = folders.find((f) => f.id === form.id)?.parentId ?? null;
    const taken = nameTaken(folders, form.name, parentId, form.id);
    // Like Samsung, "Rename" stays off until the name actually changes.
    const valid = !!form.name.trim() && form.name.trim() !== form.original && !taken;
    return (
      <Dialog
        visible
        title="Rename folder"
        onClose={cancel}
        actions={[
          { label: 'Cancel', onPress: cancel },
          { label: 'Rename', disabled: !valid, onPress: () => onRename(form) },
        ]}
      >
        <DialogInput label="Folder name" value={form.name} onChangeText={(name) => onChange({ ...form, name })} onSubmit={() => valid && onRename(form)} />
        {taken && <Text style={[styles.error, { color: t.error }]}>Folder name already in use.</Text>}
      </Dialog>
    );
  }

  // Colour applies as soon as a swatch is tapped; Cancel is the only button.
  return (
    <Dialog visible title="Change folder colour" onClose={cancel} actions={[{ label: 'Cancel', onPress: cancel }]}>
      <ColorPalette value={form.color} onChange={(color) => onColor(form.ids, color)} />
    </Dialog>
  );
}

const styles = StyleSheet.create({
  error: { fontSize: 13, marginTop: 6 },
});
