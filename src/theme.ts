import { useColorScheme } from 'react-native';

/** One UI Sans, the Samsung system font; other phones fall back to their default. */
export const FONT = 'sec';

/** Samsung Notes' coral: create-note button and selection ticks. */
export const COMPOSE = '#F26549';

/** Green "+" on Samsung's Create folder rows. */
export const ADD_GREEN = '#00A53C';

/**
 * Samsung Notes' folder colours, in its palette order (sampled). Samsung's Orange
 * (#FF7043) is left out: it's too close to COMPOSE, which only All Notes may use.
 */
export const FOLDER_COLORS: { color: string; name: string }[] = [
  { color: '#939393', name: 'Grey' },
  { color: '#FF4133', name: 'Red' },
  { color: '#FFC107', name: 'Yellow' },
  { color: '#8BC34A', name: 'Light green' },
  { color: '#009E7C', name: 'Green' },
  { color: '#47D6DC', name: 'Light blue' },
  { color: '#F6B7B4', name: 'Pink' },
  { color: '#BB5FCB', name: 'Violet' },
  { color: '#A4BDFD', name: 'Sky blue' },
  { color: '#5485EE', name: 'Blue' },
  { color: '#7E6967', name: 'Light brown' },
];
export const DEFAULT_FOLDER_COLOR = FOLDER_COLORS[0].color;

/**
 * A folder tile's flap colour. Samsung Notes lightens only its grey in light mode
 * (#939393 → #D1D1D1, sampled); every other colour is the same in both modes.
 */
export const flapColor = (color: string, dark: boolean) => (!dark && color === DEFAULT_FOLDER_COLOR ? '#D1D1D1' : color);

/** Built-in Quick notes folder: always Samsung's yellow. */
export const QUICK_COLOR = '#FFC107';

/**
 * One UI design tokens (SESL `basic_token_*`, the set One UI 8.5/9 apps use),
 * read from Samsung's appcompat colour resources.
 */
const GRAY = {
  g01: '#FCFCFF',
  g05: '#F3F3F5',
  g10: '#E9E9EC',
  g15: '#E4E4E7',
  g20: '#CCCCCE',
  g30: '#B7B7BB',
  g40: '#A3A3A7',
  g50: '#848487',
  g60: '#636368',
  g70: '#4D4D52',
  g80: '#3A3A3D',
  g90: '#252528',
  g95: '#17171A',
  g100: '#010102',
};

/** Dark mode's shared surface (folders, create button, bars, dialogs): darker than g90. */
const DARK_SURFACE = '#1A1A1D';

const light = {
  dark: false,
  /** Samsung Notes' light background (sampled). */
  bg: '#FCFCFC',
  /** sys_surface_bright: folder cards */
  card: GRAY.g01,
  /** Folder tiles, note cards and quick-note cards. */
  folder: GRAY.g01,
  /** on_surface_container_highest: primary text and icons */
  text: GRAY.g100,
  /** on_surface_container / _lowest */
  emptyTitle: GRAY.g70,
  emptySub: GRAY.g50,
  subtext: GRAY.g50,
  fab: GRAY.g01,
  /** sys_outline: unticked selection circle */
  checkbox: GRAY.g20,
  /** state_pressed_on_surface */
  ripple: 'rgba(0,0,0,0.1)',
  /** state_selected_on_surface: active toolbar toggles */
  selected: 'rgba(0,0,0,0.1)',
  /** Note editor: toolbar icons, Text options groups and the active-item circle (sampled). */
  tool: GRAY.g90,
  toolGroup: GRAY.g10,
  toolOn: GRAY.g20,
  error: '#D93E36',
  backdrop: 'rgba(0,0,0,0.18)',
  dialog: GRAY.g01,
  dialogTitle: GRAY.g100,
  dialogText: GRAY.g90,
  dialogButton: GRAY.g100,
  dialogLabel: GRAY.g50,
  /** sys_outline_low */
  dialogLine: GRAY.g15,
  dialogList: GRAY.g05,
  /** Floating selection bar: the folder-card colour. */
  selectTint: GRAY.g01,
  selectIcon: GRAY.g100,
  selectLabel: GRAY.g100,
  toast: GRAY.g80,
  /** Navigation drawer panel and its dotted rules. */
  // Slightly see-through, so the page shows faintly behind the floating drawer.
  drawer: 'rgba(252,252,255,0.9)',
  drawerDots: GRAY.g30,
};

export type Theme = typeof light;

const dark: Theme = {
  dark: true,
  // Samsung Notes' dark background (sampled).
  bg: '#010101',
  card: DARK_SURFACE,
  // Samsung Notes' folder body (sampled), shared by note and quick-note cards.
  folder: '#171717',
  text: GRAY.g01,
  emptyTitle: GRAY.g20,
  emptySub: GRAY.g40,
  subtext: GRAY.g40,
  // A step lighter than the note and folder cards, so the borderless button stands apart from them.
  fab: '#2A2A2E',
  checkbox: GRAY.g60,
  ripple: 'rgba(255,255,255,0.2)',
  selected: 'rgba(255,255,255,0.1)',
  tool: GRAY.g10,
  toolGroup: GRAY.g80,
  toolOn: GRAY.g60,
  error: '#F56962',
  backdrop: 'rgba(0,0,0,0.65)',
  dialog: DARK_SURFACE,
  dialogTitle: GRAY.g01,
  dialogText: GRAY.g10,
  dialogButton: GRAY.g01,
  dialogLabel: GRAY.g40,
  dialogLine: GRAY.g80,
  dialogList: GRAY.g100,
  selectTint: DARK_SURFACE,
  selectIcon: GRAY.g01,
  selectLabel: GRAY.g01,
  toast: GRAY.g80,
  // Sampled from Samsung Notes' drawer (#171717, dots #525252).
  drawer: 'rgba(23,23,26,0.9)',
  drawerDots: GRAY.g70,
};

/**
 * Light mode's cards are nearly the background's colour (as in Samsung Notes), so a
 * soft shadow sets them apart: the folder tiles' shadow, measured on the phone
 * (about 6% darker at the edge, fading out over 4dp, a touch lower than wide).
 * Dark mode needs none: there the cards are lighter than the page.
 */
const LIFT = { boxShadow: '0px 1px 4px rgba(0, 0, 0, 0.13)' } as const;
export const lift = (t: Theme) => (t.dark ? null : LIFT);

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}
