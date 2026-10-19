import { allowScreenCaptureAsync, preventScreenCaptureAsync } from 'expo-screen-capture';
import { useEffect, useRef, useState } from 'react';
import { AppState, KeyboardAvoidingView, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { actions, RichEditor } from 'react-native-pell-rich-editor';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BarButton } from '../components/AppBar';
import {
  AlignCenterIcon,
  AlignLeftIcon,
  AlignRightIcon,
  BoldIcon,
  CaretDownIcon,
  BulletsIcon,
  ChecklistIcon,
  CloseIcon,
  DashedListIcon,
  FontColourIcon,
  IndentIcon,
  ItalicIcon,
  LinkIcon,
  LockIcon,
  MoreIcon,
  NumberedIcon,
  OutdentIcon,
  RedoIcon,
  TickIcon,
  StrikethroughIcon,
  TextOptionsIcon,
  ThinBackIcon,
  UnderlineIcon,
  UndoIcon,
  type BarIcon,
} from '../components/icons';
import { TipPressable } from '../components/Tooltip';
import type { Note } from '../data';
import { useStore } from '../store';
import { COMPOSE, FONT, useTheme, type Theme } from '../theme';
import { encryptBody } from '../crypto';
import { canLock } from '../lock';
import { htmlToText, isOpenableUrl, uid, useBackHandler } from '../utils';

type Props = {
  /** Existing note to edit (a locked note's body already decrypted), or null for a new one. */
  note: Note | null;
  /** Where a new note is saved. */
  folderId: string;
  onClose: () => void;
};

/**
 * Font sizes offered in the size menu, in px. The editor uses HTML's seven
 * <font size> steps, so each step is restyled to one of these.
 */
const SIZES = [15, 17, 18, 19, 20, 22, 24];
const DEFAULT_SIZE = 17;
const SIZE_CSS = SIZES.map((px, i) => `font[size="${i + 1}"]{font-size:${px}px}`).join('');

const TOOLBAR_H = 42;

/** Typing pause before the note saves itself. */
const AUTOSAVE_MS = 800;

/** iPhone Notes' paragraph styles, each mapped to the block it creates. */
const STYLES = [
  { key: 'title', label: 'Title', action: actions.heading1 },
  { key: 'heading', label: 'Heading', action: actions.heading2 },
  { key: 'subheading', label: 'Subheading', action: actions.heading3 },
  { key: 'body', label: 'Body', action: actions.setParagraph },
] as const;
type StyleKey = (typeof STYLES)[number]['key'];

/**
 * iPhone Notes' highlight: the text turns the colour and sits on a light tint of
 * it (two-tone, no separate text colour). Each colour is stored as a sentinel
 * <font color> that CSS restyles per theme; "None" turns back into plain text.
 */
const NO_HIGHLIGHT = '#000001';
// Apple's system colours (light / dark shades), in rainbow order. Keys never
// change once used — they're what saved notes store. Retired colours leave the
// picker but keep their style, so notes that already use them look the same.
const HIGHLIGHTS: { name: string; key: string; light: string; dark: string; retired?: boolean }[] = [
  { name: 'Red', key: '#0a0006', light: '#FF3B30', dark: '#FF453A' },
  { name: 'Orange', key: '#0a0003', light: '#FF9500', dark: '#FF9F0A' },
  { name: 'Yellow', key: '#0a0007', light: '#FFCC00', dark: '#FFD60A' },
  { name: 'Green', key: '#0a0008', light: '#34C759', dark: '#30D158' },
  // Galaxy S25 Mint (#CFE6DC body): pale for dark mode, deepened for light so text stays readable.
  { name: 'Mint', key: '#0a0004', light: '#4AA883', dark: '#A8DCC6' },
  { name: 'Teal', key: '#0a0009', light: '#30B0C7', dark: '#40C8E0', retired: true },
  { name: 'Cyan', key: '#0a000a', light: '#32ADE6', dark: '#64D2FF' },
  { name: 'Blue', key: '#0a0005', light: '#007AFF', dark: '#0A84FF' },
  { name: 'Indigo', key: '#0a000b', light: '#5856D6', dark: '#5E5CE6' },
  { name: 'Purple', key: '#0a0001', light: '#AF52DE', dark: '#BF5AF2' },
  { name: 'Pink', key: '#0a0002', light: '#FF5C7F', dark: '#FF6B8A' },
  { name: 'Brown', key: '#0a000c', light: '#A2845E', dark: '#AC8E68', retired: true },
  { name: 'Grey', key: '#0a000d', light: '#8E8E93', dark: '#98989D' },
];
const tint = (hex: string, alpha: number) =>
  `rgba(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)},${alpha})`;

/** CSS inside the editor WebView: sizes, paragraph styles, highlights, section links and dashed lists. */
const editorCSS = (t: Theme) =>
  SIZE_CSS +
  `h1{font-size:28px;font-weight:700;line-height:1.25;margin:10px 0 4px}` +
  `h2{font-size:22px;font-weight:700;line-height:1.3;margin:8px 0 2px}` +
  `h3{font-size:19px;font-weight:600;line-height:1.3;margin:6px 0 2px}` +
  `p{margin:0}` +
  `font[color="${NO_HIGHLIGHT}"]{color:inherit}` +
  HIGHLIGHTS.map(({ key, light, dark }) => {
    const c = t.dark ? dark : light;
    return (
      `font[color="${key}"]{color:${c};background-color:${tint(c, t.dark ? 0.26 : 0.16)};border-radius:5px;` +
      // A space's width of tint on each side (" Hello ") and a little above and below, bold text; padding repeats on wrapped lines.
      `font-weight:700;padding:0.08em 0.28em;-webkit-box-decoration-break:clone;box-decoration-break:clone}`
    );
  }).join('') +
  `a{color:${COMPOSE};text-decoration:underline}` +
  `ul.dashed{list-style:none;padding-left:22px}ul.dashed>li::before{content:"–";display:inline-block;width:22px;margin-left:-22px}`;

/**
 * Section links (iOS 27): gives every heading an id, remembers the selection,
 * and sends the headings back so the app can show "Link to section".
 */
const SECTIONS_JS = `
  var sel = $.getSelection();
  window.__sectionRange = sel.rangeCount ? sel.getRangeAt(0).cloneRange() : null;
  var list = [];
  $.querySelectorAll('.pell-content h1, .pell-content h2, .pell-content h3').forEach(function (h) {
    var text = h.innerText.trim(); if (!text) return;
    if (!h.id) h.id = 'sec-' + Math.random().toString(36).slice(2, 9);
    list.push({ id: h.id, text: text, level: Number(h.tagName[1]) });
  });
  $.querySelector('.pell-content').dispatchEvent(new Event('input'));
  window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'SECTIONS', data: list }));
`;

/** Links the remembered selection to a heading, or inserts the heading's name as the link. */
const linkSectionJS = (id: string, text: string) => `
  var sel = $.getSelection(); var r = window.__sectionRange;
  if (r) { sel.removeAllRanges(); sel.addRange(r); }
  if (sel.rangeCount && !sel.isCollapsed) $.execCommand('createLink', false, '#' + ${JSON.stringify(id)});
  else {
    var a = $.createElement('a'); a.href = '#' + ${JSON.stringify(id)}; a.textContent = ${JSON.stringify(text)};
    $.execCommand('insertHTML', false, a.outerHTML + '&nbsp;');
  }
  $.querySelector('.pell-content').dispatchEvent(new Event('input'));
`;

/**
 * The editor library remembers the cursor only on taps and typed characters,
 * and when restoring it only checks the text node, not the offset. Moving the
 * cursor with keyboard arrows or cursor-swipe therefore left toolbar actions
 * (highlight, bold, …) applying at a stale spot. So recent cursor positions are
 * tracked here on every selection change inside the note…
 */
const TRACK_SELECTION_JS = `
  if (window.__trackSelection) return; window.__trackSelection = true;
  window.__ranges = []; window.__lastTyped = 0;
  var content = $.querySelector('.pell-content'), timer;
  content.addEventListener('beforeinput', function () { window.__lastTyped = Date.now(); });
  $.addEventListener('selectionchange', function () {
    var sel = $.getSelection();
    if (!sel.rangeCount || !content.contains(sel.anchorNode)) return;
    window.__ranges.push({ range: sel.getRangeAt(0).cloneRange(), at: Date.now() });
    if (window.__ranges.length > 8) window.__ranges.shift();
    // Keep the toolbar's active-format highlights and size label in step.
    clearTimeout(timer);
    timer = setTimeout(function () {
      content.dispatchEvent(new Event('mouseup'));
      var n = $.getSelection().anchorNode, el = n && (n.nodeType === 1 ? n : n.parentNode);
      // Headings have their own sizes, outside the size menu: report nothing there.
      var px = el && !el.closest('h1, h2, h3') ? parseFloat(getComputedStyle(el).fontSize) : null;
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'SIZE', data: px }));
    }, 60);
  });
`;

/**
 * …and put back before each action. Tapping the toolbar makes the keyboard
 * re-apply its own idea of the cursor (the end of the word it was composing),
 * so a move landing in the last 400ms with no typing behind it is skipped.
 * The input event syncs the library's own copy of the cursor.
 */
const RESTORE_SELECTION_JS = `
  var list = window.__ranges || [], content = $.querySelector('.pell-content');
  if (!list.length || !content) return;
  var now = Date.now(), pick = list[list.length - 1];
  if (list.length > 1 && now - pick.at < 400 && now - window.__lastTyped > 400) pick = list[list.length - 2];
  content.focus();
  var sel = $.getSelection(); sel.removeAllRanges(); sel.addRange(pick.range);
  content.dispatchEvent(new Event('input'));
`;

const scrollToJS = (id: string) => `
  var e = $.getElementById(${JSON.stringify(id)});
  if (e) e.scrollIntoView({ behavior: 'smooth', block: 'start' });
`;

/**
 * Turns the current list into a dashed one (or back), via script in the editor.
 * The `input` event makes the editor save the class change.
 */
const DASHED_LIST_JS = `
  var sel = $.getSelection(); if (!sel.rangeCount) return;
  var at = function () { var n = $.getSelection().anchorNode; return n && (n.nodeType === 1 ? n : n.parentNode); };
  var ul = at() && at().closest('ul');
  if (ul && ul.classList.contains('dashed')) { $.execCommand('insertUnorderedList'); }
  else {
    if (!ul || ul.classList.contains('x-todo')) { $.execCommand('insertUnorderedList'); ul = at() && at().closest('ul'); }
    if (ul) ul.classList.add('dashed');
  }
  $.querySelector('.pell-content').dispatchEvent(new Event('input'));
`;

/**
 * Full-screen note editor. Saves itself a moment after typing stops, when the
 * app goes to the background, and on the way out; an empty note is discarded.
 */
export default function NoteEditor({ note, folderId, onClose }: Props) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { state, dispatch, undoable, toast } = useStore();
  const editor = useRef<RichEditor>(null);
  const [title, setTitle] = useState(note?.title ?? '');
  const [body, setBody] = useState(note?.body ?? '');
  /**
   * What's saved: an edit is anything that differs from it. `bodies` also holds
   * the body as the editor first renders it — the WebView reformats HTML
   * slightly, which isn't an edit.
   */
  const saved = useRef({ title: note?.title ?? '', bodies: new Set([note?.body ?? '']), locked: !!note?.locked });
  /** The note is in the store (it was opened, or has saved itself since). */
  const stored = useRef(!!note);
  /** `updatedAt` of the saved copy. */
  const savedAt = useRef(note?.updatedAt ?? 0);
  /** Saves run one after another, so a slow (encrypting) save can't land after a newer one. */
  const queue = useRef<Promise<void>>(Promise.resolve());
  /** Set after a size is picked: ignore the cursor's size until the next edit applies it. */
  const sizePicked = useRef(false);
  /** Formats active at the cursor, as reported by the editor. */
  const [active, setActive] = useState<string[]>([]);
  const [panel, setPanel] = useState<'text' | 'style' | 'colour' | 'size' | 'section' | null>(null);
  const [size, setSize] = useState(DEFAULT_SIZE);
  const [colour, setColour] = useState(NO_HIGHLIGHT);
  /** Headings offered by "Link to section". */
  const [sections, setSections] = useState<{ id: string; text: string; level: number }[]>([]);
  const id = useRef(note?.id ?? uid()).current;
  /** Note lock: opens only through the phone's screen lock. */
  const [locked, setLocked] = useState(!!note?.locked);
  const targetFolder = note?.folderId ?? folderId;
  const folderName = state.folders.find((f) => f.id === targetFolder)?.name ?? '';
  /** Latest values, for saves that run from timers and app-state events. */
  const latest = useRef({ title, body, locked });
  latest.current = { title, body, locked };

  useEffect(() => {
    editor.current?.registerToolbar((items) => setActive(items.map((it) => (typeof it === 'string' ? it : it.type))));
  }, []);

  /**
   * Queues a save of whatever is in the editor now, if anything changed.
   * `final`: the editor is closing, so an emptied note is deleted.
   */
  const save = (final = false) => {
    queue.current = queue.current.then(async () => {
      const { title: rawTitle, body: html, locked: lock } = latest.current;
      const title = rawTitle.trim();
      if (!title && !htmlToText(html)) {
        // Mid-edit, an empty note may be about to be retyped; only closing discards it.
        if (final && stored.current) {
          dispatch({ type: 'deleteNotes', ids: [id] });
          stored.current = false;
        }
        return;
      }
      const base = saved.current;
      const contentChanged = title !== base.title || !base.bodies.has(html);
      if (!contentChanged && lock === base.locked && stored.current) return;
      try {
        const updatedAt = contentChanged || !savedAt.current ? Date.now() : savedAt.current;
        const ok = dispatch({
          type: 'saveNote',
          note: {
            id,
            folderId: targetFolder,
            title,
            body: lock ? await encryptBody(id, html) : html,
            // Locking or unlocking alone doesn't count as editing.
            updatedAt,
            locked: lock,
            deletedAt: null,
          },
        });
        if (ok) {
          saved.current = { title, bodies: new Set([html]), locked: lock };
          savedAt.current = updatedAt;
          stored.current = true;
        }
      } catch (e) {
        console.warn('Saving note failed', e);
        toast("Couldn't save note");
      }
    });
    return queue.current;
  };

  // Autosave once typing pauses.
  useEffect(() => {
    const timer = setTimeout(() => save(), AUTOSAVE_MS);
    return () => clearTimeout(timer);
  }, [title, body, locked]);

  const close = () => {
    save(true);
    onClose();
  };

  // Leaving the app saves right away; a locked note also closes, so it isn't
  // left open on return (screenshots and the Recents preview are blocked below).
  const closeRef = useRef(close);
  closeRef.current = close;
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s !== 'background') return;
      if (latest.current.locked) closeRef.current();
      else save();
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!locked) return;
    preventScreenCaptureAsync('locked-note').catch(() => {});
    return () => {
      allowScreenCaptureAsync('locked-note').catch(() => {});
    };
  }, [locked]);

  /** Applies the lock right away (not only on close), so it holds even if the app is killed. */
  const applyLock = (on: boolean) => {
    setLocked(on);
    latest.current = { ...latest.current, locked: on };
    save();
    toast(on ? 'Note locked' : 'Note unlocked');
  };

  /** To the Recycle bin, with Undo on the page underneath. */
  const deleteNote = () => {
    setMenu(false);
    // Save first, so restoring brings back the latest text. A blank new note was never stored: nothing to bin.
    save().then(() => {
      if (stored.current) undoable({ type: 'trashNotes', ids: [id], at: Date.now() }, 'Moved to Recycle bin');
    });
    onClose();
  };

  const toggleLock = async () => {
    setMenu(false);
    if (locked) return applyLock(false);
    // Without a screen lock, a locked note would open for anyone.
    if (!(await canLock())) return toast('Set a screen lock in phone settings first');
    applyLock(true);
  };

  useBackHandler(() => {
    if (panel) {
      setPanel(null);
      return true;
    }
    close();
    return true;
  });

  const run = (action: string, data?: unknown) => {
    editor.current?.command(RESTORE_SELECTION_JS);
    editor.current?.sendAction(action, 'result', data);
  };
  /** Custom scripts, run after the cursor is put back. */
  const script = (js: string) => {
    editor.current?.command(RESTORE_SELECTION_JS);
    editor.current?.command(js);
  };
  const isOn = (action: string) => active.includes(action);
  const openLink = (url: string) => {
    // Section links scroll within the note; web and email links open outside; nothing else does.
    if (url.startsWith('#')) editor.current?.command(scrollToJS(url.slice(1)));
    else if (isOpenableUrl(url)) Linking.openURL(url).catch(() => toast("Can't open this link"));
    else toast("Can't open this link");
  };
  const [menu, setMenu] = useState(false);

  const currentStyle: StyleKey = isOn(actions.heading1)
    ? 'title'
    : isOn(actions.heading2)
      ? 'heading'
      : isOn(actions.heading3)
        ? 'subheading'
        : 'body';

  const applyStyle = (action: string) => {
    run(action);
    setPanel(null);
  };

  const applyColour = (color: string) => {
    run(actions.foreColor, color);
    setColour(color);
    setPanel(null);
  };

  const linkSection = (id: string, text: string) => {
    editor.current?.command(linkSectionJS(id, text));
    setPanel(null);
  };

  /** A toolbar slot (46.6dp apart, like Samsung's); long-press names it. */
  const slot = (key: string, label: string, Glyph: BarIcon, onPress: () => void) => (
    <TipPressable
      key={key}
      tooltip={label}
      tooltipAbove
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      android_ripple={{ color: t.ripple, borderless: true, radius: 22 }}
      style={styles.slot}
    >
      <Glyph color={t.tool} />
    </TipPressable>
  );

  /** A button inside a Text options group; the active one sits on a 30dp circle. */
  const option = (label: string, Glyph: BarIcon, action: string, toggles = true) => {
    const on = toggles && isOn(action);
    return (
      <Pressable
        key={action}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ selected: on }}
        onPress={() => run(action)}
        style={styles.option}
      >
        <View style={[styles.optionDot, on && { backgroundColor: t.toolOn }]}>
          <Glyph color={t.tool} size={22} />
        </View>
      </Pressable>
    );
  };

  return (
    <View style={[StyleSheet.absoluteFill, styles.root, { backgroundColor: t.bg, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <KeyboardAvoidingView behavior="padding" style={styles.flex}>
        {/* Samsung Notes' editor bar: 56dp, thin back chevron, actions in the ⋮ menu, hairline below. */}
        <View style={[styles.header, { borderBottomColor: t.dialogLine }]}>
          <BarButton label="Navigate up" onPress={close}>
            <ThinBackIcon color={t.text} />
          </BarButton>
          <View style={styles.folderRow}>
            <Text numberOfLines={1} style={[styles.folder, { color: t.subtext }]}>
              {folderName}
            </Text>
            {locked && (
              <View accessible accessibilityLabel="Locked">
                <LockIcon color={t.subtext} size={16} />
              </View>
            )}
          </View>
          <BarButton label="More options" onPress={() => setMenu(true)}>
            <MoreIcon color={t.text} />
          </BarButton>
        </View>

        <TextInput
          autoFocus={!note}
          value={title}
          onChangeText={setTitle}
          placeholder="Title"
          placeholderTextColor={t.subtext}
          cursorColor={t.text}
          returnKeyType="next"
          onSubmitEditing={() => editor.current?.focusContentEditor()}
          style={[styles.title, { color: t.text }]}
        />

        <RichEditor
          ref={editor}
          initialContentHTML={note?.body ?? ''}
          placeholder="Start writing"
          onChange={(html) => {
            sizePicked.current = false;
            setBody(html);
          }}
          onFocus={() => setPanel(null)}
          useContainer={false}
          style={styles.flex}
          editorStyle={{
            backgroundColor: t.bg,
            color: t.text,
            placeholderColor: t.subtext,
            caretColor: t.text,
            contentCSSText: `font-family: sans-serif; font-size: ${DEFAULT_SIZE}px; line-height: 1.45; padding: 4px 24px 24px;`,
            cssText: editorCSS(t),
          }}
          editorInitializedCallback={() => {
            editor.current?.command(TRACK_SELECTION_JS);
            // Only while nothing's been saved since opening, or it would mask a real edit.
            editor.current?.getContentHtml().then((html) => {
              if (saved.current.bodies.has(note?.body ?? '')) saved.current.bodies.add(html);
            });
          }}
          onMessage={(m: { type: string; data?: unknown }) => {
            if (m.type === 'SIZE') {
              if (typeof m.data === 'number' && !sizePicked.current) setSize(nearestSize(m.data));
              return;
            }
            if (m.type !== 'SECTIONS') return;
            setSections(m.data as { id: string; text: string; level: number }[]);
            setPanel('section');
          }}
          onLink={openLink}
        />

        {/* Zero-height anchor on top of the toolbar: positioning from the container's
            bottom would count the keyboard padding and hide the cards behind it. */}
        <View style={styles.anchor}>
          {panel === 'text' && (
            <View style={[styles.card, styles.textCard, { backgroundColor: t.dialog }, !t.dark && styles.cardShadow]}>
              <View style={styles.cardHead}>
                <Text style={[styles.cardTitle, { color: t.dialogTitle }]}>Text options</Text>
                <Pressable accessibilityLabel="Close" hitSlop={10} onPress={() => setPanel(null)}>
                  <CloseIcon color={t.dialogTitle} />
                </Pressable>
              </View>
              <View style={styles.groupRow}>
                <View style={[styles.group, { width: 126, backgroundColor: t.toolGroup }]}>
                  {option('Bullet points', BulletsIcon, actions.insertBulletsList)}
                  <Pressable accessibilityLabel="Dashed list" onPress={() => script(DASHED_LIST_JS)} style={styles.option}>
                    <View style={styles.optionDot}>
                      <DashedListIcon color={t.tool} size={22} />
                    </View>
                  </Pressable>
                  {option('Numbered list', NumberedIcon, actions.insertOrderedList)}
                </View>
                <View style={[styles.group, { width: 126, backgroundColor: t.toolGroup }]}>
                  {option('Align text to left', AlignLeftIcon, actions.alignLeft)}
                  {option('Align text to centre', AlignCenterIcon, actions.alignCenter)}
                  {option('Align text to right', AlignRightIcon, actions.alignRight)}
                </View>
              </View>
              <View style={styles.groupRow}>
                <View style={[styles.group, { width: 160, backgroundColor: t.toolGroup }]}>
                  {option('Bold', BoldIcon, actions.setBold)}
                  {option('Italic', ItalicIcon, actions.setItalic)}
                  {option('Underline', UnderlineIcon, actions.setUnderline)}
                  {option('Strikethrough', StrikethroughIcon, actions.setStrikethrough)}
                </View>
                <View style={[styles.group, { width: 92, backgroundColor: t.toolGroup }]}>
                  {option('Indent', IndentIcon, actions.indent, false)}
                  {option('Outdent', OutdentIcon, actions.outdent, false)}
                </View>
              </View>
            </View>
          )}

          {panel === 'style' && (
            <View style={[styles.card, styles.styleCard, { backgroundColor: t.dialog }, !t.dark && styles.cardShadow]}>
              {STYLES.map(({ key, label, action }) => {
                const on = key === currentStyle;
                return (
                  <Pressable
                    key={key}
                    accessibilityState={{ selected: on }}
                    onPress={() => applyStyle(action)}
                    android_ripple={{ color: t.ripple }}
                    style={styles.menuItem}
                  >
                    {/* Each style previews itself, as in iPhone Notes. */}
                    <Text numberOfLines={1} style={[styles.styleText, styleLook[key], { color: on ? COMPOSE : t.dialogTitle }]}>
                      {label}
                    </Text>
                    {on && <TickIcon color={COMPOSE} size={22} />}
                  </Pressable>
                );
              })}
            </View>
          )}

          {panel === 'colour' && (
            <View style={[styles.card, styles.colourCard, { backgroundColor: t.dialog }, !t.dark && styles.cardShadow]}>
              <Text style={[styles.cardTitle, styles.colourTitle, { color: t.dialogTitle }]}>Highlight</Text>
              <View style={styles.colourRow}>
                <Pressable
                  accessibilityLabel={colour === NO_HIGHLIGHT ? 'Selected, None' : 'None'}
                  onPress={() => applyColour(NO_HIGHLIGHT)}
                  style={[styles.colourDot, { borderWidth: 2, borderColor: t.text }]}
                >
                  {colour === NO_HIGHLIGHT ? (
                    <TickIcon color={t.text} size={22} />
                  ) : (
                    <View style={[styles.noneSlash, { backgroundColor: t.text }]} />
                  )}
                </Pressable>
                {HIGHLIGHTS.filter((h) => !h.retired).map(({ name, key, light, dark }) => {
                  const c = t.dark ? dark : light;
                  const on = key === colour;
                  return (
                    <Pressable
                      key={key}
                      accessibilityLabel={on ? `Selected, ${name}` : name}
                      onPress={() => applyColour(key)}
                      // Two-tone like the highlight itself: the colour on its own tint.
                      style={[styles.colourDot, { backgroundColor: tint(c, t.dark ? 0.26 : 0.16), borderWidth: 2, borderColor: c }]}
                    >
                      {on ? <TickIcon color={c} size={22} /> : <Text style={[styles.colourA, { color: c }]}>A</Text>}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {panel === 'section' && (
            <View style={[styles.card, styles.styleCard, { backgroundColor: t.dialog }, !t.dark && styles.cardShadow]}>
              <Text style={[styles.cardTitle, styles.sectionTitle, { color: t.dialogTitle }]}>Link to section</Text>
              {sections.length ? (
                <ScrollView bounces={false} style={styles.sectionList}>
                  {sections.map((sec) => (
                    <Pressable
                      key={sec.id}
                      onPress={() => linkSection(sec.id, sec.text)}
                      android_ripple={{ color: t.ripple }}
                      style={[styles.menuItem, { paddingLeft: 20 + (sec.level - 1) * 16 }]}
                    >
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.styleText,
                          styleLook[sec.level === 1 ? 'title' : sec.level === 2 ? 'heading' : 'subheading'],
                          { color: t.dialogTitle, fontSize: 16 },
                        ]}
                      >
                        {sec.text}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              ) : (
                <Text style={[styles.sectionEmpty, { color: t.subtext }]}>Add a Title, Heading or Subheading first.</Text>
              )}
            </View>
          )}

          {panel === 'size' && (
            <View style={[styles.card, styles.sizeCard, { backgroundColor: t.dialog }, !t.dark && styles.cardShadow]}>
              <ScrollView
                bounces={false}
                showsVerticalScrollIndicator={false}
                // Like Samsung, open with the current size at the top.
                contentOffset={{ x: 0, y: SIZES.indexOf(size) * SIZE_ITEM }}
              >
                {SIZES.map((px, i) => {
                  const on = px === size;
                  return (
                    <Pressable
                      key={px}
                      accessibilityState={{ selected: on }}
                      onPress={() => {
                        run(actions.fontSize, i + 1);
                        sizePicked.current = true;
                        setSize(px);
                        setPanel(null);
                      }}
                      android_ripple={{ color: t.ripple }}
                      style={styles.sizeItem}
                    >
                      <Text style={[styles.sizeText, { color: on ? COMPOSE : t.dialogTitle }]}>{px}</Text>
                      {on && <TickIcon color={COMPOSE} size={22} />}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          )}
        </View>

        <View style={[styles.toolbar, { backgroundColor: t.card, borderColor: t.dialogLine }]}>
          {slot('check', 'Checklist', ChecklistIcon, () => run(actions.checkboxList))}
          {slot('text', 'Text options', TextOptionsIcon, () => setPanel(panel === 'text' ? null : 'text'))}
          <TipPressable
            tooltip="Paragraph style"
            tooltipAbove
            accessibilityLabel="Paragraph style"
            onPress={() => setPanel(panel === 'style' ? null : 'style')}
            android_ripple={{ color: t.ripple, borderless: true, radius: 22 }}
            style={styles.slot}
          >
            <Text style={[styles.aa, { color: t.tool }]}>Aa</Text>
          </TipPressable>
          <TipPressable
            tooltip="Highlight"
            tooltipAbove
            accessibilityLabel="Highlight"
            onPress={() => setPanel(panel === 'colour' ? null : 'colour')}
            android_ripple={{ color: t.ripple, borderless: true, radius: 22 }}
            style={styles.slot}
          >
            <FontColourIcon
              color={t.tool}
              swatch={(({ light, dark }) => (t.dark ? dark : light))(
                HIGHLIGHTS.find((h) => h.key === colour) ?? { light: t.tool, dark: t.tool },
              )}
            />
          </TipPressable>
          <TipPressable
            tooltip="Font size"
            tooltipAbove
            accessibilityLabel={`Font size, ${size}`}
            onPress={() => setPanel(panel === 'size' ? null : 'size')}
            android_ripple={{ color: t.ripple, borderless: true, radius: 24 }}
            style={[styles.slot, styles.sizeSlot]}
          >
            <Text style={[styles.sizeLabel, { color: t.tool }]}>{size}</Text>
            <CaretDownIcon size={18} color={t.tool} />
          </TipPressable>
          {slot('section', 'Link to section', LinkIcon, () => {
            setPanel(null);
            script(SECTIONS_JS);
          })}
          {slot('undo', 'Undo', UndoIcon, () => run(actions.undo))}
          {slot('redo', 'Redo', RedoIcon, () => run(actions.redo))}
        </View>
      </KeyboardAvoidingView>

      {/* ⋮ menu, styled like Samsung Notes' pop-up. */}
      <Modal
        visible={menu}
        transparent
        animationType="fade"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={() => setMenu(false)}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setMenu(false)} />
        <View
          style={[styles.menuCard, { top: insets.top + 8, backgroundColor: t.dark ? t.toolGroup : t.dialog }, !t.dark && styles.cardShadow]}
        >
          {[
            { key: 'lock', label: locked ? 'Unlock' : 'Lock', onPress: toggleLock },
            { key: 'delete', label: 'Delete', onPress: deleteNote },
          ].map(({ key, label, onPress }) => (
            <Pressable
              key={key}
              accessibilityRole="menuitem"
              onPress={onPress}
              android_ripple={{ color: t.ripple }}
              style={styles.menuRow}
            >
              <Text style={[styles.menuText, { color: t.dialogTitle }]}>{label}</Text>
            </Pressable>
          ))}
        </View>
      </Modal>

    </View>
  );
}

/** The size-menu entry closest to a size measured in the editor. */
const nearestSize = (px: number) => SIZES.reduce((a, b) => (Math.abs(b - px) < Math.abs(a - px) ? b : a));

/** How each paragraph style looks in the style menu. */
const styleLook: Record<StyleKey, object> = {
  title: { fontSize: 22, fontWeight: 'bold' },
  heading: { fontSize: 19, fontWeight: 'bold' },
  subheading: { fontSize: 17, fontWeight: '600' },
  body: { fontSize: 16 },
};

// Toolbar, Text options card and size menu measured from Samsung Notes' editor.
const SLOT = 46.6;
const SIZE_ITEM = 45.7;

const styles = StyleSheet.create({
  root: { zIndex: 30 },
  flex: { flex: 1 },
  header: { height: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, borderBottomWidth: StyleSheet.hairlineWidth },
  folderRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 8 },
  folder: { flexShrink: 1, fontFamily: FONT, fontSize: 16 },
  menuCard: { position: 'absolute', right: 10, minWidth: 220, borderRadius: 26, paddingVertical: 8, overflow: 'hidden', elevation: 8 },
  menuRow: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 22, paddingVertical: 8 },
  menuText: { fontFamily: FONT, fontSize: 17 },
  title: { fontFamily: FONT, fontSize: 24, fontWeight: 'bold', paddingHorizontal: 24, paddingVertical: 8, marginBottom: 16 },
  toolbar: {
    height: TOOLBAR_H,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 3,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  slot: { width: SLOT, height: TOOLBAR_H, alignItems: 'center', justifyContent: 'center' },
  sizeSlot: { flexDirection: 'row', width: SLOT + 8 },
  sizeLabel: { fontFamily: FONT, fontSize: 19 },
  anchor: { height: 0, zIndex: 5 },
  card: { position: 'absolute', borderRadius: 26, elevation: 8 },
  cardShadow: { shadowColor: 'rgba(0,0,0,0.5)' },
  textCard: { left: 56, bottom: 8, width: 300, padding: 20, paddingTop: 0, gap: 10 },
  cardHead: { height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: -10 },
  cardTitle: { fontFamily: FONT, fontSize: 17, fontWeight: 'bold' },
  groupRow: { flexDirection: 'row', justifyContent: 'space-between' },
  group: { height: 40, borderRadius: 12, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 2 },
  option: { flex: 1, height: 40, alignItems: 'center', justifyContent: 'center' },
  optionDot: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  sizeCard: { left: 3 + SLOT * 4 + 4, bottom: 0, width: 100, maxHeight: 230, overflow: 'hidden' },
  styleCard: { left: 3 + SLOT * 2 - 16, bottom: 8, width: 200, paddingVertical: 6, overflow: 'hidden' },
  menuItem: { minHeight: SIZE_ITEM, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
  styleText: { flex: 1, fontFamily: FONT },
  colourCard: { left: 16, bottom: 8, padding: 20, paddingTop: 16 },
  colourTitle: { marginBottom: 14 },
  // None + 13 colours: two rows of 7.
  colourRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, width: 7 * 34 + 6 * 12 },
  colourA: { fontFamily: FONT, fontSize: 16, fontWeight: 'bold' },
  noneSlash: { width: 2, height: 26, transform: [{ rotate: '45deg' }] },
  sectionTitle: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 6 },
  sectionList: { maxHeight: 260 },
  sectionEmpty: { fontSize: 14, paddingHorizontal: 20, paddingBottom: 16, paddingTop: 4 },
  colourDot: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  aa: { fontFamily: FONT, fontSize: 19 },
  sizeItem: {
    height: SIZE_ITEM,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 24,
    paddingRight: 18,
  },
  sizeText: { fontFamily: FONT, fontSize: 17 },
});
