import { randomUUID } from 'expo-crypto';
import { useEffect, useRef, useState } from 'react';
import { BackHandler, Dimensions, Keyboard } from 'react-native';

export const uid = () => randomUUID();

export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** Return true to consume the hardware back press. */
export function useBackHandler(handler: () => boolean) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => ref.current());
    return () => sub.remove();
  }, []);
}

/** Links in notes may open only web pages and email. */
export const isOpenableUrl = (url: string) => /^(https?:|mailto:)/i.test(url.trim());

/** Plain text from the editor's HTML, for previews and emptiness checks. */
export function htmlToText(html: string) {
  return html
    .replace(/<(br|\/div|\/p|\/li|\/h\d)\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * How much of the screen's bottom the keyboard covers, in dp (0 while hidden).
 * Measured from the keyboard's top edge, since the reported height can leave
 * out the keyboard's own toolbar row.
 */
export function useKeyboardHeight() {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (e) =>
      setHeight(Math.max(e.endCoordinates.height, Dimensions.get('screen').height - e.endCoordinates.screenY))
    );
    const hide = Keyboard.addListener('keyboardDidHide', () => setHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return height;
}
