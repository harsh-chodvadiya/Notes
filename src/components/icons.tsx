import type { ReactElement } from 'react';
import Svg, { Path } from 'react-native-svg';

// Traced from Samsung Notes on a 420dpi phone (1dp = 2.625px), so the
// 63-unit viewBox is exactly 24dp and every coordinate is a device pixel.
const VIEW_BOX = '0 0 63 63';
const STROKE = 4.5;

type IconProps = { color: string; size?: number };

/** Navigation drawer: three rounded bars. */
export function MenuIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox={VIEW_BOX}>
      <Path d="M13.75 14.5H49.25M13.75 31.5H49.25M13.75 48.5H49.25" stroke={color} strokeWidth={STROKE} strokeLinecap="round" />
    </Svg>
  );
}

/** Home: filled house for the folder-page path rail. */
export function HomeIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox={VIEW_BOX}>
      <Path
        d="M31.5 11.5L10.5 29.5A2 2 0 0 0 12 33H15.5V48A4 4 0 0 0 19.5 52H26.5V38H36.5V52H43.5A4 4 0 0 0 47.5 48V33H51A2 2 0 0 0 52.5 29.5L31.5 11.5Z"
        fill={color}
      />
    </Svg>
  );
}

/** New folder: folder outline open at the bottom-right for a plus. */
export function FolderAddIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox={VIEW_BOX}>
      <Path
        d="M29.5 47.5H16.5A5 5 0 0 1 11.5 42.5V20.5A5 5 0 0 1 16.5 15.5H23.2A3.5 3.5 0 0 1 26 16.9L28.6 20.5H46.5A5 5 0 0 1 51.5 25.5V31M44.5 36.5V48M38.75 42.25H50.25"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

/** Create note: rounded square open at the top-right, with a 45° pencil. */
export function ComposeIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox={VIEW_BOX}>
      <Path
        d="M26.8 9.5H19.75A6.75 6.75 0 0 0 13 16.25V45.75A6.75 6.75 0 0 0 19.75 52.5H45.25A6.75 6.75 0 0 0 52 45.75V37.25"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinecap="round"
        fill="none"
      />
      {/* Pencil body with a rounded end, then the nib separated by a thin gap. */}
      <Path d="M28.76 24.26L43.06 9.96A6.7 6.7 0 0 1 52.54 19.44L38.24 33.74Z" fill={color} />
      <Path d="M25.5 27.5L35 37L23.5 39Z" fill={color} stroke={color} strokeWidth={1} strokeLinejoin="round" />
    </Svg>
  );
}

// Selection-bar actions, traced from Samsung Notes' Manage folders bar.
// Thinner 4px strokes than the toolbar icons.
const BAR_STROKE = 4.2;

export type BarIcon = (props: IconProps) => ReactElement;

/** Move: folder outline with an arrow pointing in. */
export function MoveIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox={VIEW_BOX}>
      <Path
        d="M9.75 43.5V17.5A6 6 0 0 1 15.75 11.5H22.5A3 3 0 0 1 24.9 12.7L28.6 17.2A2.5 2.5 0 0 0 30.6 18.2H48.5A6 6 0 0 1 54.5 24.2V43.5A6 6 0 0 1 48.5 49.5H15.75A6 6 0 0 1 9.75 43.5ZM23.5 33.5H41.5M34.5 25.5L42.5 33.5L34.5 41.5"
        stroke={color}
        strokeWidth={BAR_STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

/** Create subfolder: a large thin plus. */
export function AddIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox={VIEW_BOX}>
      <Path d="M32 9.5V53M10.5 31H53.5" stroke={color} strokeWidth={BAR_STROKE} strokeLinecap="round" />
    </Svg>
  );
}

/** Folder colour: palette with a thumb notch on the right and five paint dots. */
export function PaletteIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox={VIEW_BOX}>
      <Path
        d="M52 26.5H43A4.5 4.5 0 0 0 43 35.5H52A21 21 0 1 1 52 26.5Z"
        stroke={color}
        strokeWidth={BAR_STROKE}
        strokeLinejoin="round"
        fill="none"
      />
      <Path
        d="M34 14.2a2.8 2.8 0 1 0 0.01 0ZM24 18.2a2.8 2.8 0 1 0 0.01 0ZM19 28.2a2.8 2.8 0 1 0 0.01 0ZM24 38.2a2.8 2.8 0 1 0 0.01 0ZM35 42.2a2.8 2.8 0 1 0 0.01 0Z"
        fill={color}
      />
    </Svg>
  );
}

/** Rename: outlined pencil with a separate nib. */
export function RenameIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox={VIEW_BOX}>
      <Path
        d="M15.75 35.75L38.7 12.8A7.8 7.8 0 0 1 49.7 23.8L26.75 46.75ZM15.75 35.75L12.5 52L26.75 46.75"
        stroke={color}
        strokeWidth={BAR_STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

/** Delete: bin with a handle, lid bar and two inner lines. */
export function DeleteIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox={VIEW_BOX}>
      <Path
        d="M13 16.5H53.5M25 16.5V10A2.5 2.5 0 0 1 27.5 7.5H38A2.5 2.5 0 0 1 40.5 10V16.5M15.5 19.5L17.6 49.5A5 5 0 0 0 22.6 54.5H41.6A5 5 0 0 0 46.6 49.5L48.5 19.5M28 29.5V42.5M37.5 29.5V42.5"
        stroke={color}
        strokeWidth={BAR_STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

// Note editor toolbar and Text options panel, traced from Samsung Notes' editor.
const EDIT_STROKE = 4;

function Stroke({ d, color, size = 24, width = EDIT_STROKE }: IconProps & { d: string; width?: number }) {
  return (
    <Svg width={size} height={size} viewBox={VIEW_BOX}>
      <Path d={d} stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

export const ChecklistIcon = (p: IconProps) => (
  <Stroke
    {...p}
    d="M13.5 18.5A7 7 0 0 1 20.5 11.5H45A7 7 0 0 1 52 18.5V43.5A7 7 0 0 1 45 50.5H20.5A7 7 0 0 1 13.5 43.5ZM22 29L33 37.5L47 24"
  />
);

/** Text options: lines beside a "T". */
export const TextOptionsIcon = (p: IconProps) => (
  <Stroke {...p} d="M14 13.5H50M14 30.5H24.5M14 47.5H23.5M35.5 34V29.5H55.5V34M43.5 29.5V48M39.5 48H48.5" />
);

export const UndoIcon = (p: IconProps) => <Stroke {...p} d="M30 15.5L16.5 29.5L30 43.5M16.5 29.5H46.5A6.5 6.5 0 0 1 53 36V48.5" />;

export const RedoIcon = (p: IconProps) => <Stroke {...p} d="M33 15.5L46.5 29.5L33 43.5M46.5 29.5H16.5A6.5 6.5 0 0 0 10 36V48.5" />;

export function BulletsIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox={VIEW_BOX}>
      <Path d="M29.5 13.5H52.5M29.5 30H52.5M29.5 46.5H52.5" stroke={color} strokeWidth={EDIT_STROKE} strokeLinecap="round" />
      <Path d="M14.5 10.8a3.2 3.2 0 1 0 0.01 0ZM14.5 26.8a3.2 3.2 0 1 0 0.01 0ZM14.5 42.8a3.2 3.2 0 1 0 0.01 0Z" fill={color} />
    </Svg>
  );
}

export function NumberedIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox={VIEW_BOX}>
      <Path d="M28 13.5H51M28 30H51M28 46.5H51" stroke={color} strokeWidth={EDIT_STROKE} strokeLinecap="round" />
      <Path
        d="M11 12L14 10V19M10.5 27.5A3 3 0 0 1 16.5 27.5C16.5 30 10.5 31 10.5 34H16.5M10.5 42.5A3 3 0 0 1 16.5 42.5A2.5 2.5 0 0 1 13.5 45.5A2.8 2.8 0 0 1 16.5 48.2A3 3 0 0 1 10.5 49"
        stroke={color}
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

export const AlignLeftIcon = (p: IconProps) => <Stroke {...p} d="M14 13.5H52M14 30H33M14 47H44" />;
export const AlignCenterIcon = (p: IconProps) => <Stroke {...p} d="M14 13.5H52M24.5 30H42.5M18.5 47H48.5" />;
export const AlignRightIcon = (p: IconProps) => <Stroke {...p} d="M14 13.5H52M33 30H52M22 47H52" />;

export function BoldIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox={VIEW_BOX}>
      <Path
        fillRule="evenodd"
        fill={color}
        d="M15.5 11.5H38.5A8.5 8.5 0 0 1 43 27A10 10 0 0 1 40 51H15.5ZM25 17.5V26.5H35.5A4.5 4.5 0 0 0 35.5 17.5ZM25 33.5V45H36.5A5.75 5.75 0 0 0 36.5 33.5Z"
      />
    </Svg>
  );
}

export const ItalicIcon = (p: IconProps) => <Stroke {...p} d="M35 15L29 47M28.5 12.8H42M21.5 49.3H35" />;
export const UnderlineIcon = (p: IconProps) => (
  <Stroke {...p} d="M20.5 16V32A11 11 0 0 0 42.5 32V16M16.5 15.5H24.5M38.5 15.5H46.5M15 51.5H51" />
);
export const StrikethroughIcon = (p: IconProps) => (
  <Stroke {...p} d="M14 20.5V15H50V20.5M32 15V28M32 38V47.5M26.5 47.5H39.5M13.5 31.5H52.5" />
);
export const IndentIcon = (p: IconProps) => <Stroke {...p} d="M13.5 13.5H52.5M13.5 48.5H52.5M34 25H52M34 36.5H52M15 23L23.5 31.5L15 40" />;
export const OutdentIcon = (p: IconProps) => (
  <Stroke {...p} d="M13.5 13.5H52.5M13.5 48.5H52.5M34 25H52M34 36.5H52M23.5 23L15 31.5L23.5 40" />
);
export const CloseIcon = (p: IconProps) => <Stroke {...p} width={3.6} d="M18 18L45 45M45 18L18 45" />;
/** Thin tick used in Samsung's dropdown menus. */
export const TickIcon = (p: IconProps) => <Stroke {...p} width={3.6} d="M13 31.5L25.5 43.5L50 19.5" />;

/** Font colour: a "T" over a bar showing the current colour (Samsung's icon). */
export function FontColourIcon({ color, swatch, size = 24 }: IconProps & { swatch: string }) {
  return (
    <Svg width={size} height={size} viewBox={VIEW_BOX}>
      <Path
        d="M22 19V15H48V19M33.5 15V36M29.5 37.5H43.5"
        stroke={color}
        strokeWidth={EDIT_STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Path d="M17 49H53A2 2 0 0 1 55 51V52A2 2 0 0 1 53 54H17A2 2 0 0 1 15 52V51A2 2 0 0 1 17 49Z" fill={swatch} />
    </Svg>
  );
}

export const DashedListIcon = (p: IconProps) => <Stroke {...p} d="M28 13.5H52M28 30H52M28 46.5H52M11 13.5H18M11 30H18M11 46.5H18" />;

/** Search: magnifier in the toolbar's stroke weight. */
export function SearchIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox={VIEW_BOX}>
      <Path d="M27.5 12.5a15 15 0 1 0 0.01 0ZM38.5 38.5L51 51" stroke={color} strokeWidth={STROKE} strokeLinecap="round" fill="none" />
    </Svg>
  );
}

/** All notes: a notebook with ring holes, as in Samsung's drawer. */
/**
 * Outline glyph, or with `filled` its solid version for a selected item: the
 * shape filled in the icon colour and its inner lines cut out in `cutout`
 * (the colour behind the icon).
 */
type FillableProps = IconProps & { filled?: boolean; cutout?: string };

function Fillable({ color, size = 24, filled, cutout = 'transparent', shape, lines }: FillableProps & { shape: string; lines: string }) {
  if (!filled) return <Stroke color={color} size={size} d={shape + lines} />;
  return (
    <Svg width={size} height={size} viewBox={VIEW_BOX}>
      <Path d={shape} stroke={color} strokeWidth={EDIT_STROKE} strokeLinejoin="round" fill={color} />
      {!!lines && <Path d={lines} stroke={cutout} strokeWidth={EDIT_STROKE} strokeLinecap="round" fill="none" />}
    </Svg>
  );
}

export const NotebookIcon = (p: FillableProps) => (
  <Fillable
    {...p}
    shape="M22 11.5H41A6 6 0 0 1 47 17.5V45.5A6 6 0 0 1 41 51.5H22A6 6 0 0 1 16 45.5V17.5A6 6 0 0 1 22 11.5Z"
    lines="M16 22H21M16 31.5H21M16 41H21"
  />
);

export const FolderOutlineIcon = (p: FillableProps) => (
  <Fillable
    {...p}
    shape="M9.75 43.5V17.5A6 6 0 0 1 15.75 11.5H22.5A3 3 0 0 1 24.9 12.7L28.6 17.2A2.5 2.5 0 0 0 30.6 18.2H48.5A6 6 0 0 1 54.5 24.2V43.5A6 6 0 0 1 48.5 49.5H15.75A6 6 0 0 1 9.75 43.5Z"
    lines=""
  />
);

/** Section link: two chain halves. */
export const LinkIcon = (p: IconProps) => (
  <Stroke {...p} d="M26 37L37 26M30.5 20.5L35 16A8.5 8.5 0 0 1 47 28L42.5 32.5M32.5 42.5L28 47A8.5 8.5 0 0 1 16 35L20.5 30.5" />
);

/** Samsung's editor app bar: a thinner, taller back chevron. */
export const ThinBackIcon = (p: IconProps) => <Stroke {...p} width={3.2} d="M41 8L18 31.5L41 55" />;

/** More options: three vertical dots. */
export function MoreIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox={VIEW_BOX}>
      <Path d="M31.5 11.8a3.7 3.7 0 1 0 0.01 0ZM31.5 27.8a3.7 3.7 0 1 0 0.01 0ZM31.5 43.8a3.7 3.7 0 1 0 0.01 0Z" fill={color} />
    </Svg>
  );
}

// Lock, selection circles, size caret and Move sheet glyphs.
const LOCK_BODY = 'M21 29H42A5 5 0 0 1 47 34V49A5 5 0 0 1 42 54H21A5 5 0 0 1 16 49V34A5 5 0 0 1 21 29Z';
const LOCK_SHACKLE = 'M23 29V21A8.5 8.5 0 0 1 40 21V29';
const LOCK_KEYHOLE = 'M31.5 38.5V44.5';

export function LockIcon({ color, size = 24, filled, cutout = 'transparent' }: FillableProps) {
  if (!filled) return <Stroke color={color} size={size} d={LOCK_BODY + LOCK_SHACKLE + LOCK_KEYHOLE} />;
  return (
    <Svg width={size} height={size} viewBox={VIEW_BOX}>
      <Path d={LOCK_SHACKLE} stroke={color} strokeWidth={EDIT_STROKE} strokeLinecap="round" fill="none" />
      <Path d={LOCK_BODY} stroke={color} strokeWidth={EDIT_STROKE} strokeLinejoin="round" fill={color} />
      <Path d={LOCK_KEYHOLE} stroke={cutout} strokeWidth={EDIT_STROKE} strokeLinecap="round" />
    </Svg>
  );
}

/** Selection tick: filled circle with a cut-out check. */
export function CheckCircleIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox={VIEW_BOX}>
      <Path d="M31.5 8a23.5 23.5 0 1 0 0.01 0Z" fill={color} />
      <Path d="M20.5 32L28.5 40L43 24.5" stroke="#FFFFFF" strokeWidth={4.6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

export const BlankCircleIcon = (p: IconProps) => <Stroke {...p} width={3.6} d="M31.5 10a21.5 21.5 0 1 0 0.01 0Z" />;

export function CaretDownIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox={VIEW_BOX}>
      <Path d="M22 26.5H41L31.5 38Z" fill={color} stroke={color} strokeWidth={2} strokeLinejoin="round" />
    </Svg>
  );
}

/** Quick notes: a memo pad with a top binding and two lines of text. Filled: a solid pad, lines cut out. */
const MEMO_BODY = 'M18 15.5H45A5.5 5.5 0 0 1 50.5 21V46A5.5 5.5 0 0 1 45 51.5H18A5.5 5.5 0 0 1 12.5 46V21A5.5 5.5 0 0 1 18 15.5Z';
const MEMO_RINGS = 'M22 10.5V19M31.5 10.5V19M41 10.5V19';
const MEMO_LINES = 'M12.5 24H50.5M21.5 33H41.5M21.5 41.5H34';

export function MemoIcon({ color, size = 24, filled, cutout = 'transparent' }: FillableProps) {
  if (!filled) return <Stroke color={color} size={size} d={MEMO_BODY + MEMO_RINGS + MEMO_LINES} />;
  return (
    <Svg width={size} height={size} viewBox={VIEW_BOX}>
      <Path d={MEMO_BODY} stroke={color} strokeWidth={EDIT_STROKE} strokeLinejoin="round" fill={color} />
      {/* Rings: solid above the pad, cut out where they cross it. */}
      <Path d={MEMO_RINGS} stroke={color} strokeWidth={EDIT_STROKE} strokeLinecap="round" />
      <Path d="M22 17.5V19M31.5 17.5V19M41 17.5V19" stroke={cutout} strokeWidth={EDIT_STROKE} strokeLinecap="round" />
      <Path d={MEMO_LINES} stroke={cutout} strokeWidth={EDIT_STROKE} strokeLinecap="round" />
    </Svg>
  );
}

/** Drawer's Folders row (Samsung Notes): a folder with a downward chevron inside. */
export const FoldersIcon = (p: FillableProps) => (
  <Fillable
    {...p}
    shape="M9.75 43.5V17.5A6 6 0 0 1 15.75 11.5H22.5A3 3 0 0 1 24.9 12.7L28.6 17.2A2.5 2.5 0 0 0 30.6 18.2H48.5A6 6 0 0 1 54.5 24.2V43.5A6 6 0 0 1 48.5 49.5H15.75A6 6 0 0 1 9.75 43.5Z"
    lines="M24.5 30.5L32 37.5L39.5 30.5"
  />
);

export const FolderCheckIcon = (p: IconProps) => (
  <Stroke
    {...p}
    d="M9.75 43.5V17.5A6 6 0 0 1 15.75 11.5H22.5A3 3 0 0 1 24.9 12.7L28.6 17.2A2.5 2.5 0 0 0 30.6 18.2H48.5A6 6 0 0 1 54.5 24.2V43.5A6 6 0 0 1 48.5 49.5H15.75A6 6 0 0 1 9.75 43.5ZM23.5 33.5L29.5 39.5L40.5 28"
  />
);

/** Settings cog (One UI style): six broad teeth with slanted flanks around an open hub. */
const GEAR_PATH = (() => {
  const c = 31.5;
  const outer = 21.5;
  const inner = 16;
  // Degrees clockwise from 12 o'clock.
  const pt = (r: number, deg: number) => {
    const a = ((deg - 90) * Math.PI) / 180;
    return `${(c + r * Math.cos(a)).toFixed(2)} ${(c + r * Math.sin(a)).toFixed(2)}`;
  };
  let d = '';
  for (let i = 0; i < 6; i++) {
    const m = i * 60;
    d +=
      `${i ? 'L' : 'M'}${pt(inner, m - 21)}L${pt(outer, m - 12)}` +
      `A${outer} ${outer} 0 0 1 ${pt(outer, m + 12)}L${pt(inner, m + 21)}` +
      `A${inner} ${inner} 0 0 1 ${pt(inner, m + 39)}`;
  }
  return `${d}ZM31.5 24a7.5 7.5 0 1 0 0.01 0Z`;
})();

export const SettingsIcon = (p: IconProps) => <Stroke {...p} d={GEAR_PATH} />;

/** Expand / collapse: a chevron pointing right, or down when `open`. */
export const ChevronIcon = ({ open, ...p }: IconProps & { open: boolean }) => (
  <Stroke {...p} width={3.2} d={open ? 'M19 25L31.5 37.5L44 25' : 'M25 19L37.5 31.5L25 44'} />
);

/** Restore from the Recycle bin: an anticlockwise arrow. */
export const RestoreIcon = (p: IconProps) => <Stroke {...p} d="M14.5 31.5A17 17 0 1 0 19.5 19.5M19.5 10.5V19.5H28.5" />;
