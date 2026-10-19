import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, Pressable, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { encryptBody, isEncrypted } from './crypto';
import { TRASH_DAYS } from './data';
import { applyDiff, loadState } from './db';
import { diffState, isEmptyDiff, reducer, type Action, type State } from './state';
import { COMPOSE, FONT, useTheme } from './theme';

export type { Action, State } from './state';

type ToastAction = { label: string; onPress: () => void };

type StoreValue = {
  state: State;
  /** Applies the action and saves it. False if saving failed (nothing changes then). */
  dispatch: (action: Action) => boolean;
  /** Dispatches, then shows `message` with an Undo button that puts the previous state back. */
  undoable: (action: Action, message: string) => void;
  toast: (msg: string, action?: ToastAction) => void;
};

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  // Starts from what's saved on the device; every change is written before it shows.
  const [state, setState] = useState(loadState);
  const current = useRef(state);
  /** Undo offer, valid only until the next change. */
  const undo = useRef<State | null>(null);

  const [toastMsg, setToastMsg] = useState('');
  const [toastAction, setToastAction] = useState<ToastAction | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const hideToast = useCallback(() => {
    clearTimeout(timer.current);
    setToastAction(null);
    undo.current = null;
    Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }).start();
  }, [opacity]);

  const toast = useCallback(
    (msg: string, action?: ToastAction) => {
      clearTimeout(timer.current);
      setToastMsg(msg);
      setToastAction(action ?? null);
      Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }).start();
      // Longer when there's a button to reach for.
      timer.current = setTimeout(hideToast, action ? 5000 : 2000);
    },
    [opacity, hideToast]
  );

  const commit = useCallback(
    (action: Action) => {
      const prev = current.current;
      const next = reducer(prev, action);
      if (next === prev) return true;
      const diff = diffState(prev, next);
      if (!isEmptyDiff(diff)) {
        try {
          applyDiff(diff);
        } catch (e) {
          console.warn('Save failed', e);
          toast("Couldn't save changes");
          return false;
        }
      }
      current.current = next;
      setState(next);
      return true;
    },
    [toast]
  );

  const dispatch = useCallback(
    (action: Action) => {
      // Any other change makes an earlier snapshot unsafe to put back.
      if (undo.current) {
        undo.current = null;
        setToastAction(null);
      }
      return commit(action);
    },
    [commit]
  );

  const undoable = useCallback(
    (action: Action, message: string) => {
      const before = current.current;
      if (!dispatch(action)) return;
      undo.current = before;
      toast(message, {
        label: 'Undo',
        onPress: () => {
          const snapshot = undo.current;
          hideToast();
          if (snapshot) commit({ type: 'replace', state: snapshot });
        },
      });
    },
    [commit, dispatch, toast, hideToast]
  );

  // Start-up housekeeping.
  useEffect(() => {
    // Recycle bin: notes older than TRASH_DAYS go for good.
    const cutoff = Date.now() - TRASH_DAYS * 86_400_000;
    const expired = current.current.notes.filter((n) => n.deletedAt && n.deletedAt < cutoff).map((n) => n.id);
    if (expired.length) commit({ type: 'deleteNotes', ids: expired });

    // Notes locked before encryption existed get encrypted now.
    (async () => {
      for (const { id } of current.current.notes.filter((n) => n.locked && !isEncrypted(n.body))) {
        try {
          const n = current.current.notes.find((x) => x.id === id);
          if (!n || !n.locked || isEncrypted(n.body)) continue;
          const body = await encryptBody(n.id, n.body);
          // Re-read: the note may have changed while encrypting.
          const latest = current.current.notes.find((x) => x.id === id);
          if (latest && latest.body === n.body && latest.locked) commit({ type: 'saveNote', note: { ...latest, body } });
        } catch (e) {
          console.warn('Encrypting locked note failed', e);
        }
      }
    })();
  }, [commit]);

  const value = useMemo(() => ({ state, dispatch, undoable, toast }), [state, dispatch, undoable, toast]);

  return (
    <StoreContext.Provider value={value}>
      {children}
      <Toast message={toastMsg} action={toastAction} opacity={opacity} />
    </StoreContext.Provider>
  );
}

function Toast({ message, action, opacity }: { message: string; action: ToastAction | null; opacity: Animated.Value }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Animated.View
      pointerEvents={action ? 'box-none' : 'none'}
      accessibilityLiveRegion="polite"
      style={[styles.toastWrap, { bottom: insets.bottom + 96, opacity }]}
    >
      <Animated.View style={[styles.toast, { backgroundColor: t.toast }]}>
        <Text style={styles.toastText}>{message}</Text>
        {action && (
          <Pressable accessibilityRole="button" hitSlop={12} onPress={action.onPress}>
            <Text style={styles.toastAction}>{action.label}</Text>
          </Pressable>
        )}
      </Animated.View>
    </Animated.View>
  );
}

export function useStore() {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore must be used inside <StoreProvider>');
  return store;
}

const styles = StyleSheet.create({
  toastWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 100 },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    maxWidth: '85%',
  },
  toastText: { color: '#fff', fontSize: 14, flexShrink: 1 },
  toastAction: { color: COMPOSE, fontFamily: FONT, fontSize: 14, fontWeight: 'bold' },
});
