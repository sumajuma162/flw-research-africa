const userTz = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return 'UTC'; } })();
export const viewerTimeZone = userTz;

export function fmtDate(iso?: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!iso) return '';
  return new Intl.DateTimeFormat('en-GB', opts).format(new Date(iso));
}
export function tzAbbr(iso: string, tz: string) {
  try {
    const part = new Intl.DateTimeFormat('en-GB', { timeZone: tz, timeZoneName: 'short' }).formatToParts(new Date(iso)).find((p) => p.type === 'timeZoneName')?.value ?? tz;
    const map: Record<string, string> = { 'GMT+3': 'EAT', 'GMT+2': 'CAT/SAST', 'GMT+1': 'WAT', GMT: 'GMT' };
    return map[part] ? `${map[part]}, ${part === 'GMT' ? 'UTC' : part.replace('GMT', 'UTC')}` : part.replace('GMT', 'UTC');
  } catch { return tz; }
}
/** "13 Nov 2026, 14:00 EAT (UTC+3)" in the event's own time zone (DR002, FR004). */
export function fmtInZone(iso: string, tz: string) {
  const s = new Intl.DateTimeFormat('en-GB', { timeZone: tz, day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso));
  return `${s} ${tzAbbr(iso, tz)}`;
}
export function fmtLocal(iso: string) {
  return new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso));
}
export function sameOffset(iso: string, tz: string) {
  const f = (z: string) => new Intl.DateTimeFormat('en-GB', { timeZone: z, hour: '2-digit', minute: '2-digit', day: '2-digit', hour12: false }).format(new Date(iso));
  try { return f(tz) === f(userTz); } catch { return true; }
}
export function timeAgo(iso: string) {
  const s = (Date.now() - Date.parse(iso)) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)} d ago`;
  return fmtDate(iso);
}
export function relDeadline(iso?: string) {
  if (!iso) return 'Open until filled';
  const d = Math.ceil((Date.parse(iso) - Date.now()) / 864e5);
  if (d < 0) return 'Closed';
  if (d === 0) return 'Closes today';
  return `Closes in ${d} day${d === 1 ? '' : 's'}`;
}
export const fmtSize = (b?: number) => (!b ? '' : b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.round(b / 1e3)} KB`);
export const initials = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
export const newKey = () => (crypto?.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2));
