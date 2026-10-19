/**
 * Date labels in the phone's language. `locale` is left undefined in the app,
 * which makes Intl use the device locale; tests pass one in.
 */

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** Whether the locale writes times on a 24-hour clock (en-GB "14:05") rather than 12-hour (en-US "2:05 pm"). */
const uses24h = (locale?: string) => new Intl.DateTimeFormat(locale, { hour: 'numeric' }).resolvedOptions().hour12 === false;

/** Card date: the time today ("14:05" / "2:05 pm"), otherwise the day ("17 Oct", "17 Oct 2025"). */
export function formatDate(ms: number, now = new Date(), locale?: string) {
  const d = new Date(ms);
  if (startOfDay(d).getTime() === startOfDay(now).getTime()) {
    // 24-hour keeps the leading zero ("09:05"); 12-hour doesn't ("9:05 am").
    return d.toLocaleTimeString(locale, { hour: uses24h(locale) ? '2-digit' : 'numeric', minute: '2-digit' });
  }
  return d.toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    ...(d.getFullYear() === now.getFullYear() ? {} : { year: 'numeric' }),
  });
}

/**
 * iPhone Notes-style date sections for items sorted newest first: Today,
 * Yesterday, Previous 7 Days, Previous 30 Days, then this year's months, then
 * earlier years. Days are calendar days, not 24-hour spans.
 */
export function groupByDate<T extends { updatedAt: number }>(items: T[], now = new Date(), locale?: string) {
  const today = startOfDay(now);
  const label = (ms: number) => {
    const d = new Date(ms);
    // Rounded, so a daylight-saving day of 23 or 25 hours still counts as one.
    const days = Math.round((today.getTime() - startOfDay(d).getTime()) / 86_400_000);
    if (days <= 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days <= 7) return 'Previous 7 Days';
    if (days <= 30) return 'Previous 30 Days';
    return d.getFullYear() === today.getFullYear() ? d.toLocaleDateString(locale, { month: 'long' }) : String(d.getFullYear());
  };
  const groups: { title: string; items: T[] }[] = [];
  for (const item of items) {
    const title = label(item.updatedAt);
    const last = groups[groups.length - 1];
    if (last?.title === title) last.items.push(item);
    else groups.push({ title, items: [item] });
  }
  return groups;
}
