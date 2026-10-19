import { useState } from 'react';
import { Appearance } from 'react-native';
import { getSetting, setSetting } from './db';

/** App theme: follow the phone, or always light / dark. */
export type ThemePref = 'system' | 'light' | 'dark';

const THEME_KEY = 'theme';

export function getThemePref(): ThemePref {
  const v = getSetting(THEME_KEY);
  return v === 'light' || v === 'dark' ? v : 'system';
}

/**
 * Overrides the colour scheme app-wide, so `useColorScheme` (and so `useTheme`)
 * and native UI such as dialogs follow the choice.
 */
export function applyThemePref(pref: ThemePref) {
  Appearance.setColorScheme(pref === 'system' ? 'unspecified' : pref);
}

export function useThemePref() {
  const [pref, setPref] = useState(getThemePref);
  const update = (next: ThemePref) => {
    setSetting(THEME_KEY, next);
    applyThemePref(next);
    setPref(next);
  };
  return [pref, update] as const;
}

/** Drawer folder tree: whether it's shown at all, and which folders have their subfolders unfolded (none by default). */
export type DrawerTree = { open: boolean; expanded: string[] };

const TREE_KEY = 'drawerTree';

export function getDrawerTree(): DrawerTree {
  try {
    const v = JSON.parse(getSetting(TREE_KEY) ?? '{}');
    return { open: v.open !== false, expanded: Array.isArray(v.expanded) ? v.expanded : [] };
  } catch {
    return { open: true, expanded: [] };
  }
}

export function saveDrawerTree(tree: DrawerTree) {
  setSetting(TREE_KEY, JSON.stringify(tree));
}
