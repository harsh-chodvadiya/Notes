import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

/**
 * Note lock: the phone's own screen lock, through the system prompt —
 * fingerprint or face, with the phone's PIN, pattern or password as fallback.
 * The app keeps no PIN of its own.
 */

/** The phone has a screen lock (or biometrics) set up, so notes can be locked. */
export async function canLock() {
  return (await LocalAuthentication.getEnrolledLevelAsync()) !== LocalAuthentication.SecurityLevel.NONE;
}

/** System unlock prompt; true once the user passes it. */
export async function authenticate(promptMessage = 'Unlock note') {
  const result = await LocalAuthentication.authenticateAsync({ promptMessage });
  return result.success;
}

/** Leftovers from the app's own PIN lock, which was removed. */
const OLD_KEYS = ['notes.pin.v1', 'notes.biometrics.v1', 'notes.pinAttempts.v1'];

export function forgetOldPin() {
  for (const key of OLD_KEYS) SecureStore.deleteItemAsync(key).catch(() => {});
}
