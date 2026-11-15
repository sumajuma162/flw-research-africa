import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowUpRight, CalendarDays, Copy, Check as CheckIcon, Download, ExternalLink, FileText, Globe2, Lock, MapPin, Users, Video, Database, Wrench, BookOpen, Sprout, Landmark, ClipboardList, Share2, CalendarPlus } from 'lucide-react';
import type { ResourceView, EventItem, ResourceType } from '@/api';
import { api } from '@/api';
import { TYPE_LABEL, VIS_LABEL, country, topic } from '@/lib/labels';
import { fmtInZone, fmtLocal, sameOffset, viewerTimeZone, fmtSize } from '@/lib/format';
import { useAction } from '@/lib/hooks';
import { useToast } from '@/lib/toast';
import { Badge, Button, Modal } from './ui';
import { cn } from '@/lib/cn';

export function Logo({ compact = false, inverse = false }: { compact?: boolean; inverse?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg width="36" height="36" viewBox="0 0 36 36" aria-hidden>
        <rect width="36" height="36" rx="10" fill={inverse ? '#FFFFFF' : 'var(--primary)'} />
        <path d="M18 29 C18 21 18 16 18 11" stroke={inverse ? '#1E6B45' : 'var(--on-primary)'} strokeWidth="2.2" strokeLinecap="round" fill="none" />
        <path d="M18 19 C13 19 10 15.5 10 11.5 C14.5 11.5 18 14.5 18 19Z" fill={inverse ? '#1E6B45' : 'var(--on-primary)'} />
        <path d="M18 23 C23 23 26 19.5 26 15.5 C21.5 15.5 18 18.5 18 23Z" fill={inverse ? '#1E6B45' : 'var(--on-primary)'} opacity=".85" />
        <circle cx="18" cy="8" r="3" fill="#E3A72F" />
      </svg>
      {!compact && <span className="leading-tight"><span className={cn('block font-display font-bold text-[15.5px]', inverse ? 'text-white' : 'text-fg')}>FLW Research</span><span className={cn('block text-[12px]', inverse ? 'text-white/80' : 'text-muted')}>Network in Africa</span></span>}
    </span>
  );
}

export const TYPE_ICON: Record<ResourceType, typeof FileText> = { publication: FileText, dataset: Database, tool: Wrench, methodology: ClipboardList, best_practice: BookOpen, indigenous_knowledge: Sprout, policy_brief: Landmark };
const TYPE_TONE: Record<ResourceType, 'solidGreen' | 'solidTerracotta' | 'solidGold' | 'blue' | 'green' | 'terracotta'> = { publication: 'solidGreen', dataset: 'solidTerracotta', tool: 'solidGold', methodology: 'blue', best_practice: 'green', indigenous_knowledge: 'terracotta', policy_brief: 'blue' };

export function TypeBadge({ type }: { type: ResourceType }) {
  const I = TYPE_ICON[type];
  return <Badge tone={TYPE_TONE[type]} icon={<I size={13} aria-hidden />}>{TYPE_LABEL[type]}</Badge>;
}
export function VisBadge({ v }: { v: ResourceView['visibility'] }) {
  if (v === 'public') return <Badge tone="green" icon={<Globe2 size={12} aria-hidden />}>{VIS_LABEL[v]}</Badge>;
  return <Badge tone={v === 'members' ? 'gold' : 'red'} icon={<Lock size={12} aria-hidden />}>{VIS_LABEL[v]}</Badge>;
}

export function ResourceCard({ r, compact }: { r: ResourceView; compact?: boolean }) {
  return (
    <Link to={`/knowledge/${r.slug}`} className="card card-hover p-5 flex flex-col gap-3 no-underline h-full group min-w-0">
      <div className="flex items-center justify-between gap-2 flex-wrap"><TypeBadge type={r.type} />{r.visibility !== 'public' && <VisBadge v={r.visibility} />}</div>
      <h3 className="text-[17px] leading-snug group-hover:text-primary transition-colors">{r.v.title}</h3>
      {!compact && <p className="text-[15px] text-muted line-clamp-3">{r.v.summary}</p>}
      <div className="mt-auto pt-2 flex items-center justify-between gap-3 text-sm text-muted">
        <span className="truncate">{r.v.countries.map(country).slice(0, 2).join(', ')}{r.v.countries.length > 2 ? ` +${r.v.countries.length - 2}` : ''} · {r.v.year}</span>
        <span className="truncate text-right">{r.v.authors[0]}{r.v.authors.length > 1 ? ' et al.' : ''}</span>
      </div>
    </Link>
  );
}

export function EventCard({ e, horizontal }: { e: EventItem; horizontal?: boolean }) {
  const d = new Date(e.startsAt);
  const day = new Intl.DateTimeFormat('en-GB', { timeZone: e.timezone, day: 'numeric' }).format(d);
  const mon = new Intl.DateTimeFormat('en-GB', { timeZone: e.timezone, month: 'short' }).format(d);
  const past = Date.parse(e.endsAt) < Date.now();
  return (
    <Link to={`/events/${e.id}`} className={cn('card card-hover p-4 flex gap-4 no-underline group', horizontal ? 'items-center' : 'items-start')}>
      <div className={cn('shrink-0 w-16 rounded-xl text-center py-2', past ? 'bg-surface-3 text-muted' : 'bg-primary-soft text-primary-strong')}>
        <div className="font-display font-bold text-2xl leading-none tabular">{day}</div><div className="text-xs font-semibold uppercase tracking-wide mt-1">{mon}</div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex gap-2 flex-wrap mb-1">{e.online ? <Badge tone="blue" icon={<Video size={12} aria-hidden />}>Online</Badge> : <Badge tone="terracotta" icon={<MapPin size={12} aria-hidden />}>{e.location}</Badge>}{e.membersOnly && <Badge tone="gold" icon={<Lock size={12} aria-hidden />}>Members</Badge>}{e.status === 'draft' && <Badge>Draft</Badge>}{e.cancelled && <Badge tone="red">Cancelled</Badge>}</div>
        <h3 className="text-[16px] leading-snug group-hover:text-primary">{e.title}</h3>
        <p className="text-sm text-muted mt-1">{fmtInZone(e.startsAt, e.timezone)}</p>
      </div>
    </Link>
  );
}

/** Event time in its own zone, plus the viewer's local time when different (FR004). */
export function EventTime({ e }: { e: EventItem }) {
  return (
    <div className="space-y-1">
      <p className="font-semibold flex items-center gap-2"><CalendarDays size={18} className="text-primary" aria-hidden />{fmtInZone(e.startsAt, e.timezone)}</p>
      <p className="text-sm text-muted pl-7">Ends {fmtInZone(e.endsAt, e.timezone)}</p>
      {!sameOffset(e.startsAt, e.timezone) && <p className="text-sm text-muted pl-7">Your time ({viewerTimeZone}): {fmtLocal(e.startsAt)}</p>}
    </div>
  );
}

export function buildCitation(r: ResourceView) {
  const auth = r.v.authors.join(', ');
  const parts = [`${auth} (${r.v.year}). ${r.v.title}.`, `${TYPE_LABEL[r.type]}, version ${r.v.no}.`, 'FLW Research Network in Africa knowledge hub.'];
  if (r.v.doi) parts.push(`https://doi.org/${r.v.doi}`);
  else if (r.v.url) parts.push(r.v.url);
  return parts.join(' ');
}

export function CitationBox({ r }: { r: ResourceView }) {
  const [copied, setCopied] = useState(false);
  const text = buildCitation(r);
  const toast = useToast();
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2200); toast({ kind: 'success', text: 'Citation copied to clipboard' }); }
    catch { const el = document.getElementById('citation-text'); if (el) { const range = document.createRange(); range.selectNodeContents(el); const sel = window.getSelection(); sel?.removeAllRanges(); sel?.addRange(range); } toast({ kind: 'info', text: 'Citation selected. Press Ctrl+C or Cmd+C to copy.' }); }
    api.recordCitation(r.slug);
  };
  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between gap-2 mb-2"><h3 className="text-base">Cite this resource</h3>
        <Button size="sm" variant="secondary" onClick={copy} icon={copied ? <CheckIcon size={16} /> : <Copy size={16} />}>{copied ? 'Copied' : 'Copy citation'}</Button></div>
      <p id="citation-text" className="text-[14.5px] font-mono leading-relaxed break-words select-all">{text}</p>
      {!r.v.doi && <p className="text-xs text-faint mt-2">No DOI was recorded for this resource.</p>}
    </div>
  );
}

/** External destinations are always announced before navigation (IR004). */
export function ExternalLinkButton({ href, label = 'Open link', variant = 'secondary' }: { href: string; label?: string; variant?: 'primary' | 'secondary' }) {
  const [open, setOpen] = useState(false);
  let host = href; try { host = new URL(href).host; } catch { /* keep */ }
  return (
    <>
      <Button variant={variant} icon={<ExternalLink size={16} />} onClick={() => setOpen(true)}>{label}</Button>
      <Modal open={open} onClose={() => setOpen(false)} title="You are leaving the network site" size="sm"
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Stay here</Button><a className="btn btn-primary" href={href} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}>Continue to {host}<ArrowUpRight size={16} /></a></>}>
        <p className="text-muted">This link opens <strong className="text-fg break-all">{host}</strong> in a new tab. The network does not control external sites and their access conditions may differ.</p>
      </Modal>
    </>
  );
}

export function DownloadButton({ r }: { r: ResourceView }) {
  const [done, setDone] = useState<{ fileName: string; fileSize: number; expiresInMinutes: number } | null>(null);
  const a = useAction(api.download, { onSuccess: (x) => setDone(x) });
  if (!r.v.fileName) return null;
  return (
    <>
      <Button icon={<Download size={16} />} busy={a.busy} onClick={() => a.run(r.slug)}>Download {fmtSize(r.v.fileSize)}</Button>
      <Modal open={!!done} onClose={() => setDone(null)} title="Download ready" size="sm" footer={<Button onClick={() => setDone(null)}>Done</Button>}>
        <p className="text-muted">In the live system, <strong className="text-fg">{done?.fileName}</strong> ({fmtSize(done?.fileSize)}) downloads from a secure link that expires in {done?.expiresInMinutes} minutes. This demo records the download but does not store real files.</p>
      </Modal>
    </>
  );
}

export function ShareButton({ title, path }: { title: string; path: string }) {
  const [open, setOpen] = useState(false); const toast = useToast();
  const url = `https://www.flwresearchafrica.org${path}`;
  const wa = `https://wa.me/?text=${encodeURIComponent(`${title} — ${url}`)}`;
  const copy = async () => { try { await navigator.clipboard.writeText(url); toast({ kind: 'success', text: 'Link copied' }); } catch { toast({ kind: 'info', text: 'Select the link and copy it' }); } };
  return (
    <>
      <Button variant="secondary" icon={<Share2 size={16} />} onClick={() => setOpen(true)}>Share</Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Share" size="sm">
        <p className="text-sm text-muted mb-3">Links show a preview with the title and summary in WhatsApp and other apps. Members-only content asks people to sign in.</p>
        <div className="panel p-3 font-mono text-sm break-all select-all mb-4">{url}</div>
        <div className="flex flex-wrap gap-2">
          <a className="btn btn-primary" href={wa} target="_blank" rel="noopener noreferrer">Share on WhatsApp<ArrowUpRight size={16} /></a>
          <Button variant="secondary" icon={<Copy size={16} />} onClick={copy}>Copy link</Button>
        </div>
      </Modal>
    </>
  );
}

const SANDBOX = import.meta.env.VITE_SANDBOX === 'true';
export function icsFor(e: EventItem) {
  const f = (iso: string) => iso.replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const esc = (s: string) => s.replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//FLW Research Africa//Events//EN', 'BEGIN:VEVENT', `UID:${e.id}@flwresearchafrica.org`, `DTSTAMP:${f(new Date().toISOString())}`,
    `DTSTART:${f(e.startsAt)}`, `DTEND:${f(e.endsAt)}`, `SUMMARY:${esc(e.title)}`, `DESCRIPTION:${esc(e.summary)}`, `LOCATION:${esc(e.online ? e.link ?? 'Online' : e.location)}`, e.cancelled ? 'STATUS:CANCELLED' : 'STATUS:CONFIRMED', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
}
export function CalendarButton({ e }: { e: EventItem }) {
  const [open, setOpen] = useState(false); const toast = useToast();
  const ics = icsFor(e);
  const g = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(e.title)}&dates=${e.startsAt.replace(/[-:]/g, '').replace(/\.\d{3}/, '')}/${e.endsAt.replace(/[-:]/g, '').replace(/\.\d{3}/, '')}&details=${encodeURIComponent(e.summary)}&location=${encodeURIComponent(e.online ? 'Online' : e.location)}`;
  const save = () => {
    try { const blob = new Blob([ics], { type: 'text/calendar' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${e.id}.ics`; a.click(); toast({ kind: 'success', text: 'Calendar file created' }); }
    catch { toast({ kind: 'info', text: 'Copy the calendar text below into a .ics file' }); }
  };
  return (
    <>
      <Button variant="secondary" icon={<CalendarPlus size={16} />} onClick={() => setOpen(true)}>Add to calendar</Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Add to your calendar" size="sm">
        <div className="flex flex-col gap-2 mb-4">
          <a className="btn btn-secondary" href={g} target="_blank" rel="noopener noreferrer">Google Calendar<ArrowUpRight size={16} /></a>
          {!SANDBOX && <Button variant="secondary" icon={<Download size={16} />} onClick={save}>Download .ics for Outlook or Apple Calendar</Button>}
        </div>
        {SANDBOX && <p className="text-sm text-muted mb-2">For Outlook or Apple Calendar, copy this text into a file named <code className="font-mono">event.ics</code> and open it.</p>}
        <details open={SANDBOX}><summary className="text-sm text-muted cursor-pointer">Show calendar file text</summary><pre className="panel p-3 mt-2 text-xs overflow-x-auto select-all">{ics}</pre></details>
      </Modal>
    </>
  );
}

export function TopicChips({ ids, link }: { ids: string[]; link?: boolean }) {
  const nav = useNavigate();
  return <div className="flex flex-wrap gap-2">{ids.map((t) => link ? <button key={t} className="chip" onClick={() => nav(`/knowledge?topic=${t}`)}>{topic(t)}</button> : <span key={t} className="chip">{topic(t)}</span>)}</div>;
}

export function MemberCount({ n }: { n: number | null }) { return <>{n === null ? '<3' : n}</>; }
export { Users };
