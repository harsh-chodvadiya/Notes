import { AESEncryptionKey, AESKeySize, AESSealedData, aesDecryptAsync, aesEncryptAsync } from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

/**
 * Locked notes' bodies are encrypted at rest with AES-256-GCM. The key is random,
 * made on first use and kept only in SecureStore (Android Keystore), which is
 * left out of backups, so a copied or backed-up database can't be read. The
 * note id is bound in as authenticated data, so a body can't be swapped onto
 * another note. The screen lock gates the app's UI; the key protects the data.
 */
const KEY_ID = 'notes.key.v1';
const PREFIX = 'enc1:';

let cached: Promise<AESEncryptionKey> | null = null;

function key(): Promise<AESEncryptionKey> {
  cached ??= (async () => {
    const saved = await SecureStore.getItemAsync(KEY_ID);
    if (saved) return AESEncryptionKey.import(saved, 'base64');
    const fresh = await AESEncryptionKey.generate(AESKeySize.AES256);
    await SecureStore.setItemAsync(KEY_ID, await fresh.encoded('base64'));
    return fresh;
  })();
  // A failed attempt shouldn't stick; the next call tries again.
  cached.catch(() => (cached = null));
  return cached;
}

export const isEncrypted = (body: string) => body.startsWith(PREFIX);

export async function encryptBody(noteId: string, html: string): Promise<string> {
  const sealed = await aesEncryptAsync(utf8Encode(html), await key(), { additionalData: utf8Encode(noteId) });
  return PREFIX + (await sealed.combined('base64'));
}

/** Plain HTML from a stored body; bodies that aren't encrypted come back as they are. */
export async function decryptBody(noteId: string, body: string): Promise<string> {
  if (!isEncrypted(body)) return body;
  const sealed = AESSealedData.fromCombined(body.slice(PREFIX.length));
  const bytes = await aesDecryptAsync(sealed, await key(), { additionalData: utf8Encode(noteId) });
  return utf8Decode(bytes);
}

// Hand-rolled UTF-8 so this doesn't depend on TextEncoder/TextDecoder support.
export function utf8Encode(s: string): Uint8Array {
  const out: number[] = [];
  for (const ch of s) {
    let c = ch.codePointAt(0)!;
    if (c < 0x80) out.push(c);
    else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
    else if (c < 0x10000) out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    else out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
  }
  return Uint8Array.from(out);
}

export function utf8Decode(b: Uint8Array): string {
  let s = '';
  for (let i = 0; i < b.length; ) {
    const c = b[i++];
    let cp: number;
    if (c < 0x80) cp = c;
    else if (c < 0xe0) cp = ((c & 31) << 6) | (b[i++] & 63);
    else if (c < 0xf0) cp = ((c & 15) << 12) | ((b[i++] & 63) << 6) | (b[i++] & 63);
    else cp = ((c & 7) << 18) | ((b[i++] & 63) << 12) | ((b[i++] & 63) << 6) | (b[i++] & 63);
    s += String.fromCodePoint(cp);
  }
  return s;
}
