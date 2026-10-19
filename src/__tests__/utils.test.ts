import { utf8Decode, utf8Encode } from '../crypto';
import { formatDate, groupByDate } from '../format';
import { htmlToText, isOpenableUrl } from '../utils';

describe('htmlToText', () => {
  it('turns blocks into lines and decodes entities', () => {
    expect(htmlToText('<div>Hello&nbsp;<b>world</b></div><div>a &lt; b &amp;&amp; c</div>')).toBe('Hello world\na < b && c');
  });

  it('collapses runs of blank lines', () => {
    expect(htmlToText('one<br><br><br><br>two')).toBe('one\n\ntwo');
  });
});

describe('isOpenableUrl', () => {
  it.each(['https://example.com', 'http://x.y', 'mailto:a@b.c', ' HTTPS://caps.example '])('allows %s', (u) => {
    expect(isOpenableUrl(u)).toBe(true);
  });
  it.each(['javascript:alert(1)', 'intent://scan#Intent;end', 'file:///sdcard/x', 'tel:123', 'content://x'])('blocks %s', (u) => {
    expect(isOpenableUrl(u)).toBe(false);
  });
});

describe('dates', () => {
  const now = new Date(2026, 9, 19, 12, 0); // 19 Oct 2026, noon

  it('formats today as a time, otherwise a day', () => {
    expect(formatDate(new Date(2026, 9, 19, 9, 5).getTime(), now, 'en-GB')).toBe('09:05');
    expect(formatDate(new Date(2026, 9, 19, 9, 5).getTime(), now, 'en-US')).toMatch(/^9:05\s?AM$/i);
    expect(formatDate(new Date(2026, 9, 2).getTime(), now, 'en-GB')).toBe('2 Oct');
    expect(formatDate(new Date(2024, 0, 3).getTime(), now, 'en-GB')).toMatch(/2024/);
  });

  it('groups by calendar day, newest first', () => {
    const at = (y: number, m: number, d: number, h = 10) => ({ updatedAt: new Date(y, m, d, h).getTime() });
    const groups = groupByDate([at(2026, 9, 19), at(2026, 9, 18, 23), at(2026, 9, 15), at(2026, 9, 1), at(2026, 2, 3), at(2025, 5, 1)], now, 'en-GB');
    expect(groups.map((g) => [g.title, g.items.length])).toEqual([
      ['Today', 1],
      ['Yesterday', 1],
      ['Previous 7 Days', 1],
      ['Previous 30 Days', 1],
      ['March', 1],
      ['2025', 1],
    ]);
  });
});

describe('utf8', () => {
  it.each(['plain', 'Grüße – “quotes”', 'हिन्दी', 'emoji 🔒👍🏽', '<p>html &amp; stuff</p>'])('round-trips %s', (s) => {
    expect(utf8Decode(utf8Encode(s))).toBe(s);
  });

  it('matches the standard encoder', () => {
    // a, é (2 bytes), € (3 bytes), 😀 (4 bytes)
    expect(Array.from(utf8Encode('aé€😀'))).toEqual([0x61, 0xc3, 0xa9, 0xe2, 0x82, 0xac, 0xf0, 0x9f, 0x98, 0x80]);
  });
});
