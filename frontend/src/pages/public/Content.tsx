import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, CalendarDays, CheckCircle2, Clock, Globe2, Lock, Mail, MapPin, Target, Eye, Compass, ListChecks, HeartHandshake, Video, Users, ArrowRight } from 'lucide-react';
import { api } from '@/api';
import { TAXONOMY } from '@/api/seed';
import { IMAGES } from '@/lib/media';
import { fmtDate, fmtInZone, newKey, relDeadline } from '@/lib/format';
import { country, topic } from '@/lib/labels';
import { useAction, useDocTitle } from '@/lib/hooks';
import { useSession } from '@/lib/session';
import { Alert, Avatar, Badge, Button, CardsSkeleton, Empty, ErrorState, ErrorSummary, Field, Input, PageHeader, RowsSkeleton, Select, Skeleton, Tabs, Textarea } from '@/components/ui';
import { CalendarButton, EventCard, EventTime, ExternalLinkButton, ShareButton } from '@/components/domain';
import { cn } from '@/lib/cn';

const Paras = ({ text, className }: { text: string; className?: string }) => <div className={cn('prose-flw', className)}>{text.split(/\n\n+/).map((p, i) => <p key={i}>{p}</p>)}</div>;

export function About() {
  useDocTitle('About');
  const q = useQuery({ queryKey: ['pages'], queryFn: api.pages });
  const page = (s: string) => q.data?.find((p) => p.slug === s);
  const icons: Record<string, typeof Eye> = { vision: Eye, mission: Compass, aim: Target };
  return (
    <>
      <section className="bg-surface-2"><div className="wrap py-12 md:py-16 grid gap-10 md:grid-cols-[1.1fr_1fr] items-center">
        <div><p className="eyebrow mb-2">About the network</p><h1 className="text-[32px] md:text-[44px]">Food Loss and Waste Research Network in Africa</h1>
          <p className="text-[18px] text-muted mt-4 max-w-xl">A community of people working to understand and reduce the food lost between harvest and the plate, grounded in African realities and evidence.</p></div>
        <img src={IMAGES.storage.src} alt={IMAGES.storage.alt} className="rounded-2xl w-full aspect-[3/2] object-cover" />
      </div></section>
      <div className="wrap py-14">
        {q.isLoading ? <RowsSkeleton n={4} /> : q.isError ? <ErrorState error={q.error} retry={() => q.refetch()} /> : <>
          <div className="grid gap-5 md:grid-cols-3">
            {['vision', 'mission', 'aim'].map((s) => { const p = page(s); const I = icons[s]; return p && (
              <section key={s} className="card p-6"><span className="w-11 h-11 rounded-xl bg-primary-soft text-primary flex items-center justify-center mb-4"><I size={22} /></span><h2 className="text-xl mb-2">{p.title}</h2><Paras text={p.body} className="text-[16px] text-muted" /></section>); })}
          </div>
          <div className="grid gap-10 md:grid-cols-2 mt-14">
            <section><h2 className="text-[26px] mb-5 flex items-center gap-2"><ListChecks className="text-secondary" />Objectives</h2>
              <ol className="space-y-4">{page('objectives')?.body.split(/\n\n+/).map((o, i) => <li key={i} className="flex gap-4"><span className="w-8 h-8 rounded-full bg-secondary-soft text-secondary font-bold flex items-center justify-center shrink-0 tabular">{i + 1}</span><p className="pt-1">{o}</p></li>)}</ol></section>
            <section><h2 className="text-[26px] mb-5 flex items-center gap-2"><HeartHandshake className="text-secondary" />Core values</h2>
              <ul className="grid grid-cols-2 gap-3">{page('values')?.body.split(/\n\n+/).map((v) => <li key={v} className="panel p-4 font-semibold font-display">{v}</li>)}</ul></section>
          </div>
          <section className="mt-14"><h2 className="text-[26px] mb-2">Who we work with</h2><p className="text-muted mb-5">Nine groups of people take part in the network.</p>
            <ul className="flex flex-wrap gap-2">{TAXONOMY.categories.map((c) => <li key={c.id} className="chip">{c.label}</li>)}</ul></section>
          <p className="text-xs text-faint mt-10">Page versions: {q.data?.map((p) => `${p.title} v${p.version}`).join(' · ')}. Last published {fmtDate(q.data?.[0]?.publishedAt)}.</p>
        </>}
        <div className="mt-10 flex gap-3 flex-wrap"><Button to="/leadership" variant="secondary">Meet the interim leadership</Button><Button to="/join">Apply to join</Button></div>
      </div>
    </>
  );
}

const LEADERS = [
  { name: 'Dr. Sharon Mada', role: 'Network Coordinator and Partnerships Lead', hue: 150, body: 'Coordinates the network’s activities and builds partnerships with institutions, funders and governments.' },
  { name: 'Anthony Nchagwa', role: 'Innovation and Grants Lead', hue: 35, body: 'Leads innovation programmes and the network’s work on grants and funding opportunities for members.' },
  { name: 'Prof. Lucy Onditi', role: 'Research Chair and Scientific Lead', hue: 18, body: 'Guides the network’s research agenda and upholds scientific integrity in what the network shares.' },
];
export function Leadership() {
  useDocTitle('Leadership');
  return (
    <div className="wrap py-10 md:py-14">
      <PageHeader eyebrow="Governance" title="Interim leadership" intro="The founding steering committee has appointed three interim leaders to guide the network through its founding phase." />
      <div className="grid gap-5 md:grid-cols-3">
        {LEADERS.map((l) => <article key={l.name} className="card p-6"><Avatar name={l.name.replace(/^(Dr\.|Prof\.)\s/, '')} hue={l.hue} size={64} /><h2 className="text-xl mt-4">{l.name}</h2><p className="text-secondary font-semibold text-[15px]">{l.role}</p><p className="text-muted mt-3">{l.body}</p></article>)}
      </div>
      <Alert tone="info" title="Contact details are being confirmed">Leadership email addresses will be published once the network’s domain and mailboxes are verified. Until then, use the <Link to="/contact" className="link">contact form</Link>.</Alert>
    </div>
  );
}

export function NewsList() {
  useDocTitle('News');
  const q = useQuery({ queryKey: ['news'], queryFn: () => api.news() });
  return (
    <div className="wrap py-10">
      <PageHeader eyebrow="Announcements" title="News" intro="Updates from the network and its members." />
      {q.isLoading ? <CardsSkeleton n={3} /> : q.isError ? <ErrorState error={q.error} retry={() => q.refetch()} /> : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">{q.data!.map((n, i) => (
          <Link key={n.id} to={`/news/${n.id}`} className={cn('card card-hover overflow-hidden no-underline flex flex-col', i === 0 && 'md:col-span-2 lg:col-span-2')}>
            <img src={IMAGES[n.image]?.src ?? IMAGES.market.src} alt="" loading="lazy" className={cn('w-full object-cover', i === 0 ? 'aspect-[2/1]' : 'aspect-[3/2]')} />
            <div className="p-5"><p className="text-sm text-muted">{fmtDate(n.publishedAt)} · {n.author}</p><h2 className={cn('mt-1', i === 0 ? 'text-2xl' : 'text-lg')}>{n.title}</h2><p className="text-muted mt-2">{n.summary}</p></div>
          </Link>))}</div>
      )}
    </div>
  );
}
export function NewsDetail() {
  const { id = '' } = useParams();
  const q = useQuery({ queryKey: ['news', id], queryFn: () => api.newsItem(id), retry: false });
  useDocTitle(q.data?.title ?? 'News');
  if (q.isError) return <div className="wrap py-10"><ErrorState error={q.error} /></div>;
  if (!q.data) return <div className="wrap py-10"><Skeleton className="h-64" /></div>;
  const n = q.data;
  return (
    <article className="wrap py-10 max-w-3xl">
      <Link to="/news" className="link inline-flex items-center gap-1 mb-6"><ArrowLeft size={16} />All news</Link>
      <p className="text-sm text-muted">{fmtDate(n.publishedAt)} · {n.author}</p>
      <h1 className="text-[30px] md:text-[40px] mt-2">{n.title}</h1>
      <p className="text-[19px] text-muted mt-3">{n.summary}</p>
      <img src={IMAGES[n.image]?.src ?? IMAGES.market.src} alt={IMAGES[n.image]?.alt ?? ''} className="rounded-2xl w-full aspect-[2/1] object-cover my-8" />
      <Paras text={n.body} className="text-[17px] leading-relaxed" />
      {n.status === 'draft' && <Alert tone="warning">Draft: only editors can see this article.</Alert>}
    </article>
  );
}

export function Events() {
  useDocTitle('Events');
  const [scope, setScope] = useState<'upcoming' | 'past'>('upcoming');
  const [t, setT] = useState('');
  const q = useQuery({ queryKey: ['events', scope, t], queryFn: () => api.events({ scope, topic: t || undefined }) });
  const { isMember } = useSession();
  return (
    <div className="wrap py-10">
      <PageHeader eyebrow="Gather and learn" title="Events" intro="Webinars, workshops and listening sessions. Times show in each event’s own time zone and in yours." />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <Tabs label="Event time" value={scope} onChange={setScope} tabs={[{ id: 'upcoming', label: 'Upcoming' }, { id: 'past', label: 'Past' }]} />
        <label className="flex items-center gap-2 text-sm"><span className="text-muted">Topic</span><select className="input !min-h-[38px] !py-1 !w-auto" value={t} onChange={(e) => setT(e.target.value)}><option value="">All topics</option>{TAXONOMY.topics.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</select></label>
      </div>
      {!isMember && <div className="mb-5"><Alert tone="info" icon={<Lock size={18} />}>Some events are for members only. <Link to="/login" className="link">Sign in</Link> to see them.</Alert></div>}
      {q.isLoading ? <RowsSkeleton /> : q.isError ? <ErrorState error={q.error} retry={() => q.refetch()} /> : q.data!.length === 0 ? <Empty icon={<CalendarDays size={22} />} title={scope === 'upcoming' ? 'No upcoming events' : 'No past events'} body="Try another topic, or check back soon." /> : (
        <div className="grid gap-4 md:grid-cols-2">{q.data!.map((e) => <EventCard key={e.id} e={e} />)}</div>
      )}
    </div>
  );
}
export function EventDetail() {
  const { id = '' } = useParams();
  const q = useQuery({ queryKey: ['event', id], queryFn: () => api.event(id), retry: false });
  useDocTitle(q.data?.title ?? 'Event');
  if (q.isError) return <div className="wrap py-10"><ErrorState error={q.error} /></div>;
  if (!q.data) return <div className="wrap py-10"><Skeleton className="h-64" /></div>;
  const e = q.data; const past = Date.parse(e.endsAt) < Date.now();
  return (
    <div className="wrap py-10 grid lg:grid-cols-[1fr_340px] gap-10">
      <article className="min-w-0">
        <Link to="/events" className="link inline-flex items-center gap-1 mb-6"><ArrowLeft size={16} />All events</Link>
        <div className="flex gap-2 flex-wrap mb-3"><Badge tone="green">{topic(e.topic)}</Badge>{e.membersOnly && <Badge tone="gold" icon={<Lock size={12} />}>Members only</Badge>}{past && <Badge>Past event</Badge>}{e.status === 'draft' && <Badge tone="gold">Draft</Badge>}</div>
        <h1 className="text-[30px] md:text-[38px]">{e.title}</h1>
        <p className="text-[18px] text-muted mt-3">{e.summary}</p>
        <Paras text={e.body} className="mt-6 text-[17px]" />
      </article>
      <aside className="card p-5 space-y-5 self-start lg:sticky lg:top-24">
        <EventTime e={e} />
        <p className="flex items-start gap-2">{e.online ? <Video size={18} className="text-primary mt-0.5" /> : <MapPin size={18} className="text-primary mt-0.5" />}{e.online ? 'Online event' : e.location}</p>
        {!past && <div className="flex flex-col gap-2">
          {e.link && <ExternalLinkButton href={e.link} label={e.online ? 'Join or register' : 'Register (external)'} variant="primary" />}
          <CalendarButton e={e} />
          {!e.membersOnly && <ShareButton title={e.title} path={`/events/${e.id}`} />}
        </div>}
        <p className="text-xs text-faint">Registration is managed on an external site where shown.</p>
      </aside>
    </div>
  );
}

const KIND: Record<string, { label: string; tone: 'green' | 'gold' | 'blue' | 'terracotta' }> = { funding: { label: 'Funding', tone: 'gold' }, collaboration: { label: 'Collaboration', tone: 'green' }, partnership: { label: 'Partnership', tone: 'blue' }, fellowship: { label: 'Fellowship', tone: 'terracotta' } };
export function Opportunities() {
  useDocTitle('Opportunities');
  const [kind, setKind] = useState('');
  const [showClosed, setShowClosed] = useState(false);
  const q = useQuery({ queryKey: ['opps'], queryFn: () => api.opportunities() });
  const list = (q.data ?? []).filter((o) => (!kind || o.kind === kind) && (showClosed || !o.deadline || Date.parse(o.deadline) > Date.now()));
  return (
    <div className="wrap py-10">
      <PageHeader eyebrow="Work together" title="Opportunities" intro="Collaboration calls, funding, fellowships and partnerships. A listing does not mean the network funds or endorses the opportunity." />
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <button className="chip" aria-pressed={!kind} onClick={() => setKind('')}>All</button>
        {Object.entries(KIND).map(([k, v]) => <button key={k} className="chip" aria-pressed={kind === k} onClick={() => setKind(kind === k ? '' : k)}>{v.label}</button>)}
        <label className="ml-auto flex items-center gap-2 text-sm"><input type="checkbox" className="check" checked={showClosed} onChange={(e) => setShowClosed(e.target.checked)} />Show closed</label>
      </div>
      {q.isLoading ? <CardsSkeleton n={4} /> : list.length === 0 ? <Empty title="No open opportunities match" body="Try another type or show closed opportunities." /> : (
        <div className="grid gap-4 md:grid-cols-2">{list.map((o) => { const closed = o.deadline && Date.parse(o.deadline) < Date.now(); return (
          <Link key={o.id} to={`/opportunities/${o.id}`} className={cn('card card-hover p-5 no-underline flex flex-col gap-2', closed && 'opacity-70')}>
            <div className="flex items-center justify-between gap-2"><Badge tone={KIND[o.kind].tone}>{KIND[o.kind].label}</Badge><span className={cn('text-sm font-semibold flex items-center gap-1', closed ? 'text-muted' : 'text-secondary')}><Clock size={14} />{relDeadline(o.deadline)}</span></div>
            <h2 className="text-lg">{o.title}</h2><p className="text-muted text-[15px]">{o.summary}</p>
            <p className="text-sm text-faint mt-auto pt-2">Posted by {o.owner}{o.countries.length ? ` · ${o.countries.map(country).join(', ')}` : ''}</p>
          </Link>); })}</div>
      )}
    </div>
  );
}
export function OpportunityDetail() {
  const { id = '' } = useParams();
  const q = useQuery({ queryKey: ['opp', id], queryFn: () => api.opportunity(id), retry: false });
  useDocTitle(q.data?.title ?? 'Opportunity');
  if (q.isError) return <div className="wrap py-10"><ErrorState error={q.error} /></div>;
  if (!q.data) return <div className="wrap py-10"><Skeleton className="h-64" /></div>;
  const o = q.data; const closed = o.deadline && Date.parse(o.deadline) < Date.now();
  return (
    <div className="wrap py-10 max-w-3xl">
      <Link to="/opportunities" className="link inline-flex items-center gap-1 mb-6"><ArrowLeft size={16} />All opportunities</Link>
      <Badge tone={KIND[o.kind].tone}>{KIND[o.kind].label}</Badge>
      <h1 className="text-[30px] md:text-[38px] mt-3">{o.title}</h1>
      {closed && <div className="mt-4"><Alert tone="warning" title="This opportunity is closed">The deadline has passed.</Alert></div>}
      <dl className="card p-5 mt-6 grid sm:grid-cols-[150px_1fr] gap-x-4 gap-y-3">
        <dt className="text-muted font-medium">Deadline</dt><dd>{o.deadline ? fmtInZone(o.deadline, o.timezone) : 'Open until filled'}</dd>
        <dt className="text-muted font-medium">Posted by</dt><dd>{o.owner}</dd>
        <dt className="text-muted font-medium">Who can apply</dt><dd>{o.eligibility}</dd>
        {o.countries.length > 0 && <><dt className="text-muted font-medium">Countries</dt><dd>{o.countries.map(country).join(', ')}</dd></>}
        <dt className="text-muted font-medium">How to respond</dt><dd className="break-words">{o.contact}</dd>
      </dl>
      <p className="text-[17px] mt-6">{o.summary}</p>
      <p className="text-sm text-faint mt-6">Listing an opportunity does not mean the network has awarded or endorsed funding.</p>
    </div>
  );
}

export function Contact() {
  useDocTitle('Contact');
  const [key] = useState(newKey);
  const [f, setF] = useState({ name: '', email: '', subject: '', message: '', website: '' });
  const [done, setDone] = useState<string | null>(null);
  const a = useAction(api.contact, { onSuccess: (r) => setDone(r.ref) });
  const submit = (e: FormEvent) => { e.preventDefault(); a.run(f, key); };
  return (
    <div className="wrap py-10 grid gap-10 lg:grid-cols-[1fr_380px]">
      <div className="max-w-2xl">
        <PageHeader eyebrow="Get in touch" title="Contact the network" intro="Questions about membership, partnerships or a resource? We reply to every message." />
        {done ? (
          <div className="card p-8 text-center"><CheckCircle2 size={40} className="text-success mx-auto mb-3" /><h2 className="text-2xl">Message sent</h2><p className="text-muted mt-2">Your reference is <strong className="text-fg font-mono">{done}</strong>. We sent a confirmation to {f.email}.</p>
            <Button className="mt-6" variant="secondary" onClick={() => { setDone(null); setF({ name: '', email: '', subject: '', message: '', website: '' }); }}>Send another message</Button></div>
        ) : (
          <form onSubmit={submit} noValidate className="space-y-5">
            <ErrorSummary errors={a.errors} />
            <div className="grid sm:grid-cols-2 gap-5">
              <Field id="f-name" label="Your name" error={a.errors.name} required>{(p) => <Input {...p} autoComplete="name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />}</Field>
              <Field id="f-email" label="Email for our reply" error={a.errors.email} required>{(p) => <Input {...p} type="email" autoComplete="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />}</Field>
            </div>
            <Field id="f-subject" label="Subject" error={a.errors.subject} required>{(p) => <Input {...p} value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} />}</Field>
            <Field id="f-message" label="Message" error={a.errors.message} hint={`${f.message.length} characters. At least 20.`} required>{(p) => <Textarea {...p} rows={6} value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} />}</Field>
            <div className="hidden" aria-hidden><label>Website<input tabIndex={-1} autoComplete="off" value={f.website} onChange={(e) => setF({ ...f, website: e.target.value })} /></label></div>
            <Button type="submit" busy={a.busy} icon={<Mail size={18} />}>Send message</Button>
          </form>
        )}
      </div>
      <aside className="space-y-4">
        <img src={IMAGES['cold-chain'].src} alt="" className="rounded-2xl w-full aspect-[3/2] object-cover" />
        <div className="card p-5 space-y-3"><h2 className="text-lg">Other routes</h2>
          <p className="text-muted text-[15px] flex gap-2"><Globe2 size={18} className="shrink-0 mt-0.5" />Suggested website: www.flwresearchafrica.org (to be verified)</p>
          <p className="text-muted text-[15px] flex gap-2"><Users size={18} className="shrink-0 mt-0.5" />Members can message each other directly from the <Link to="/directory" className="link">directory</Link>.</p>
          <p className="text-muted text-[15px] flex gap-2"><ArrowRight size={18} className="shrink-0 mt-0.5" />Many answers are in the <Link to="/help" className="link">help centre</Link>.</p>
        </div>
      </aside>
    </div>
  );
}

export function Policies() {
  useDocTitle('Privacy and terms');
  const [tab, setTab] = useState<'privacy' | 'membership' | 'conduct' | 'contributions'>('privacy');
  const text = {
    privacy: ['We collect only what we need to run the network: your name, email, country, stakeholder group and the details you choose to add to your profile.', 'Your profile is private by default. You decide which fields appear in the member directory, and you can change this at any time.', 'Optional emails such as newsletters are off until you switch them on. You can ask for a copy of your data, a correction or deletion from Privacy requests.', 'Notice version: privacy-2026.1 (draft for approval).'],
    membership: ['Membership is open to people working on food loss and waste in or with Africa, across the nine stakeholder groups.', 'Applications are reviewed by the membership team. If your application is not approved, you can appeal to the network coordinator.'],
    conduct: ['Be respectful and stay on topic. Promotional posts, harassment and sharing other people’s personal data are not allowed.', 'Report anything that breaks these rules. Moderators review reports and may remove content or suspend accounts.'],
    contributions: ['You keep the rights to what you share. You choose a licence or access condition for each resource.', 'Community and indigenous knowledge is published only with the permission of the people who hold it, and can be withdrawn at their request.', 'Network approval checks provenance, rights and visibility. It is not formal scientific peer review.'],
  }[tab];
  return (
    <div className="wrap py-10 max-w-3xl">
      <PageHeader eyebrow="Policies" title="Privacy and terms" intro="Draft policies for review by network leadership." />
      <Tabs label="Policy" value={tab} onChange={setTab} tabs={[{ id: 'privacy', label: 'Privacy notice' }, { id: 'membership', label: 'Membership' }, { id: 'conduct', label: 'Community conduct' }, { id: 'contributions', label: 'Contributions' }]} />
      <div className="prose-flw mt-6 text-[17px]">{text.map((p) => <p key={p}>{p}</p>)}</div>
    </div>
  );
}

export function NotFound() {
  useDocTitle('Page not found');
  return (
    <div className="wrap py-20 text-center max-w-xl">
      <img src={IMAGES.storage.src} alt="" className="rounded-2xl w-full aspect-[2/1] object-cover mb-8" />
      <h1 className="text-3xl">We could not find that page</h1>
      <p className="text-muted mt-3">The link may be old or mistyped. Try searching the knowledge hub instead.</p>
      <div className="mt-6 flex justify-center gap-3 flex-wrap"><Button to="/">Go to home page</Button><Button to="/knowledge" variant="secondary">Search the hub</Button></div>
    </div>
  );
}
export { Select, Skeleton };
