import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Building2, CheckCircle2, Circle, Clock, ExternalLink, LifeBuoy, Search, Users, Video, BookOpen, FileText, Subtitles, ThumbsUp, ThumbsDown, Plus, GraduationCap } from 'lucide-react';
import { api } from '@/api';
import { TAXONOMY } from '@/api/seed';
import { IMAGES, imageFor } from '@/lib/media';
import { country, language, topic, category } from '@/lib/labels';
import { fmtDate } from '@/lib/format';
import { useAction, useDebounced, useDocTitle } from '@/lib/hooks';
import { useSession } from '@/lib/session';
import { Alert, Avatar, Badge, Button, CardsSkeleton, Empty, ErrorState, Field, Input, Modal, PageHeader, RowsSkeleton, Select, Skeleton, Textarea } from '@/components/ui';
import { ExternalLinkButton } from '@/components/domain';
import { FeedbackModal } from '@/components/layout';
import { cn } from '@/lib/cn';

export function Organisations() {
  useDocTitle('Organisations');
  const q = useQuery({ queryKey: ['orgs'], queryFn: api.organisations });
  const { isMember } = useSession();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: '', type: 'Research institute', country: '', description: '', website: '' });
  const a = useAction(api.proposeOrganisation, { success: 'Organisation proposed. An administrator will review it.', onSuccess: () => setOpen(false) });
  return (
    <div className="wrap py-10">
      <PageHeader eyebrow="Partners and institutions" title="Organisations" intro="Universities, institutes, NGOs, government bodies, companies and community groups taking part in the network."
        actions={isMember ? <Button variant="secondary" icon={<Plus size={16} />} onClick={() => setOpen(true)}>Propose an organisation</Button> : undefined} />
      {q.isLoading ? <CardsSkeleton /> : q.isError ? <ErrorState error={q.error} retry={() => q.refetch()} /> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{q.data!.map((o) => (
          <Link key={o.id} to={`/organisations/${o.slug}`} className="card card-hover p-5 no-underline flex flex-col gap-2">
            <span className="w-11 h-11 rounded-xl bg-secondary-soft text-secondary flex items-center justify-center"><Building2 size={20} /></span>
            <h2 className="text-lg">{o.name}</h2><p className="text-sm text-muted">{o.type} · {country(o.country)}</p><p className="text-[15px] text-muted line-clamp-2">{o.description}</p>
            <p className="text-sm text-faint mt-auto pt-2 flex items-center gap-1.5"><Users size={14} />{o.memberCount} confirmed {o.memberCount === 1 ? 'member' : 'members'}</p>
          </Link>))}</div>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title="Propose an organisation" footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button busy={a.busy} onClick={() => a.run(f)}>Send for approval</Button></>}>
        <div className="space-y-4">
          <p className="text-sm text-muted">You will become its representative and confirm members who say they work there.</p>
          <Field label="Name" error={a.errors.name} required>{(p) => <Input {...p} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />}</Field>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Type" required>{(p) => <Select {...p} value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>{['University', 'Research institute', 'NGO', 'Government body', 'Company', 'Community group'].map((t) => <option key={t}>{t}</option>)}</Select>}</Field>
            <Field label="Country" required>{(p) => <Select {...p} value={f.country} onChange={(e) => setF({ ...f, country: e.target.value })}><option value="">Choose…</option>{TAXONOMY.countries.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</Select>}</Field>
          </div>
          <Field label="Website" error={a.errors.website} optional>{(p) => <Input {...p} type="url" placeholder="https://" value={f.website} onChange={(e) => setF({ ...f, website: e.target.value })} />}</Field>
          <Field label="Short description" optional>{(p) => <Textarea {...p} rows={3} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />}</Field>
        </div>
      </Modal>
    </div>
  );
}

export function OrganisationDetail() {
  const { slug = '' } = useParams();
  const q = useQuery({ queryKey: ['org', slug], queryFn: () => api.organisation(slug), retry: false });
  const { isMember } = useSession();
  const claim = useAction(api.claimAffiliation, { success: 'Request sent to the organisation’s representative' });
  const decide = useAction(api.decideAffiliation, { success: 'Affiliation updated' });
  useDocTitle(q.data?.org.name ?? 'Organisation');
  if (q.isError) return <div className="wrap py-10"><ErrorState error={q.error} /></div>;
  if (!q.data) return <div className="wrap py-10"><Skeleton className="h-48" /></div>;
  const { org, members, isRep, pendingClaims, myClaim } = q.data;
  return (
    <div className="wrap py-10 grid gap-10 lg:grid-cols-[1fr_320px]">
      <div className="min-w-0">
        <Link to="/organisations" className="link inline-flex items-center gap-1 mb-6"><ArrowLeft size={16} />All organisations</Link>
        <div className="flex items-start gap-4"><span className="w-16 h-16 rounded-2xl bg-secondary-soft text-secondary flex items-center justify-center shrink-0"><Building2 size={30} /></span>
          <div><h1 className="text-[28px] md:text-[34px]">{org.name}</h1><p className="text-muted">{org.type} · {country(org.country)}</p></div></div>
        {org.status === 'pending' && <div className="mt-4"><Alert tone="warning">Awaiting administrator approval. Only administrators can see this page.</Alert></div>}
        <p className="text-[17px] mt-6 prose-flw">{org.description}</p>
        <div className="mt-4"><ExternalLinkButton href={org.website} label="Visit website" /></div>
        <section className="mt-10"><h2 className="text-xl mb-4">Members who list this organisation</h2>
          {typeof members === 'number' ? <Alert tone="info">{members} confirmed members. <Link to="/login" className="link">Sign in</Link> to see who they are.</Alert>
            : members.length === 0 ? <p className="text-muted">No confirmed members have chosen to show this affiliation yet.</p>
            : <ul className="grid sm:grid-cols-2 gap-3">{members.map((m) => <li key={m.id}><Link to={`/members/${m.id}`} className="card card-hover p-3 flex items-center gap-3 no-underline"><Avatar name={m.name} hue={m.avatarHue} /><span><span className="font-semibold block">{m.name}</span><span className="text-sm text-muted">{category(m.category)}</span></span></Link></li>)}</ul>}
        </section>
      </div>
      <aside className="space-y-4">
        {isMember && !isRep && (
          <div className="card p-5"><h2 className="text-base mb-2">Do you work here?</h2>
            {myClaim === 'confirmed' ? <p className="text-success flex items-center gap-2"><CheckCircle2 size={18} />Your affiliation is confirmed.</p>
              : myClaim === 'pending' ? <p className="text-muted">Your request is waiting for the representative to confirm it.</p>
              : <><p className="text-sm text-muted mb-3">The organisation’s representative will confirm your affiliation before it shows as confirmed.</p><Button size="sm" busy={claim.busy} onClick={() => claim.run(org.id)}>Request affiliation</Button></>}
          </div>
        )}
        {isRep && (
          <div className="card p-5"><h2 className="text-base mb-1">You represent this organisation</h2><p className="text-sm text-muted mb-3">Confirm members who say they work here.</p>
            {pendingClaims.length === 0 ? <p className="text-sm text-faint">No requests waiting.</p> : pendingClaims.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-2 py-2 border-t border-line"><span className="font-medium">{c.name}</span><span className="flex gap-1"><Button size="sm" onClick={() => decide.run(c.id, true)}>Confirm</Button><Button size="sm" variant="ghost" onClick={() => decide.run(c.id, false)}>Decline</Button></span></div>))}
          </div>
        )}
      </aside>
    </div>
  );
}

const KIND_ICON = { guide: FileText, webinar: Video, resource: BookOpen };
export function Learn() {
  useDocTitle('Learning');
  const q = useQuery({ queryKey: ['collections'], queryFn: api.collections });
  const { isMember } = useSession();
  return (
    <div className="wrap py-10">
      <PageHeader eyebrow="Capacity building" title="Learning collections" intro="Short, practical collections of guides, recordings and resources. Members can track what they have completed." />
      {q.isLoading ? <CardsSkeleton n={3} /> : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">{q.data!.map((c) => (
          <Link key={c.id} to={`/learn/${c.slug}`} className="card card-hover overflow-hidden no-underline flex flex-col">
            <img src={imageFor(c.image).src} alt="" loading="lazy" className="w-full aspect-[16/9] object-cover" />
            <div className="p-5 flex flex-col gap-2 flex-1">
              <div className="flex gap-2"><Badge tone="green">{c.level}</Badge><Badge>{topic(c.topic)}</Badge></div>
              <h2 className="text-lg">{c.title}</h2><p className="text-muted text-[15px]">{c.summary}</p>
              <div className="mt-auto pt-3 text-sm text-muted flex items-center justify-between"><span className="flex items-center gap-1.5"><Clock size={14} />{c.items.reduce((s, i) => s + i.minutes, 0)} min · {c.items.length} items</span>
                {isMember && <span className="font-semibold text-primary tabular">{c.done}/{c.items.length} done</span>}</div>
              {isMember && <div className="h-1.5 rounded-full bg-surface-3 overflow-hidden"><div className="h-full bg-primary" style={{ width: `${(c.done / c.items.length) * 100}%` }} /></div>}
            </div>
          </Link>))}</div>
      )}
      <p className="text-sm text-faint mt-8 flex items-center gap-2"><GraduationCap size={16} />Collections support learning; they do not award certificates or accreditation.</p>
    </div>
  );
}
export function CollectionPage() {
  const { slug = '' } = useParams();
  const q = useQuery({ queryKey: ['collection', slug], queryFn: () => api.collection(slug), retry: false });
  const t = useAction(api.toggleProgress);
  useDocTitle(q.data?.title ?? 'Learning');
  if (q.isError) return <div className="wrap py-10"><ErrorState error={q.error} /></div>;
  if (!q.data) return <div className="wrap py-10"><Skeleton className="h-64" /></div>;
  const c = q.data; const done = c.progress?.filter((x) => c.items.some((i) => i.id === x)).length ?? 0;
  return (
    <div className="wrap py-10 max-w-4xl">
      <Link to="/learn" className="link inline-flex items-center gap-1 mb-6"><ArrowLeft size={16} />All collections</Link>
      <div className="grid gap-8 md:grid-cols-[1fr_280px] items-start">
        <div><div className="flex gap-2 mb-3"><Badge tone="green">{c.level}</Badge><Badge>{topic(c.topic)}</Badge></div><h1 className="text-[30px] md:text-[36px]">{c.title}</h1><p className="text-[17px] text-muted mt-3">{c.summary}</p>
          <h2 className="text-lg mt-6 mb-2">You will be able to</h2><ul className="space-y-1.5">{c.objectives.map((o) => <li key={o} className="flex gap-2"><CheckCircle2 size={18} className="text-primary shrink-0 mt-0.5" />{o}</li>)}</ul></div>
        <img src={imageFor(c.image).src} alt="" className="rounded-2xl w-full aspect-[4/3] object-cover" />
      </div>
      {c.progress ? <div className="mt-8 panel p-4"><div className="flex justify-between text-sm mb-2"><span className="font-semibold">Your progress</span><span className="tabular">{done} of {c.items.length} complete</span></div><div className="h-2 rounded-full bg-surface overflow-hidden"><div className="h-full bg-primary transition-all" style={{ width: `${(done / c.items.length) * 100}%` }} /></div><p className="text-xs text-faint mt-2">Only you can see your progress.</p></div>
        : <div className="mt-8"><Alert tone="info"><Link to="/login" className="link">Sign in</Link> as a member to track your progress.</Alert></div>}
      <ol className="mt-6 space-y-3">{c.items.map((i, idx) => { const I = KIND_ICON[i.kind]; const isDone = c.progress?.includes(i.id); return (
        <li key={i.id} className={cn('card p-4 flex gap-4 items-start', isDone && 'border-primary/40')}>
          {c.progress ? <button className="mt-0.5 shrink-0 text-primary" aria-label={isDone ? `Mark “${i.title}” as not done` : `Mark “${i.title}” as done`} aria-pressed={isDone} onClick={() => t.run(i.id)}>{isDone ? <CheckCircle2 size={26} /> : <Circle size={26} className="text-line-strong" />}</button>
            : <span className="w-7 h-7 rounded-full bg-surface-2 flex items-center justify-center text-sm font-bold shrink-0 tabular">{idx + 1}</span>}
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted flex items-center gap-2 flex-wrap"><I size={14} />{i.kind === 'webinar' ? 'Recording' : i.kind === 'guide' ? 'Guide' : 'Resource'} · {i.minutes} min · {language(i.language)}{i.kind === 'webinar' && <span className="inline-flex items-center gap-1"><Subtitles size={13} />{i.captions ? 'Captions available' : 'No captions yet'}</span>}</p>
            <h3 className={cn('text-[16px] mt-0.5', isDone && 'text-muted')}>{i.title}</h3><p className="text-sm text-muted">{i.summary}</p>
            {i.resourceSlug && <Link to={`/knowledge/${i.resourceSlug}`} className="link text-sm inline-flex items-center gap-1 mt-1">Open resource<ExternalLink size={13} /></Link>}
          </div>
        </li>); })}</ol>
    </div>
  );
}

export function Help() {
  useDocTitle('Help centre');
  const [q, setQ] = useState(''); const dq = useDebounced(q, 250);
  const r = useQuery({ queryKey: ['help', dq], queryFn: () => api.help(dq), placeholderData: (p) => p });
  const [fb, setFb] = useState(false);
  const groups = (r.data ?? []).reduce<Record<string, typeof r.data>>((a, h) => { (a[h.category] ??= []).push(h); return a; }, {});
  return (
    <div className="wrap py-10 max-w-4xl">
      <PageHeader eyebrow="Support" title="Help centre" intro="Guides for joining, sharing resources, privacy and using the site on slow connections." />
      <div className="relative mb-8"><Search size={19} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" /><label htmlFor="hq" className="sr-only">Search help</label><input id="hq" type="search" className="input !rounded-full !pl-11 !min-h-[50px]" placeholder="Search help articles…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      {!r.data ? <RowsSkeleton /> : r.data.length === 0 ? <Empty icon={<LifeBuoy size={22} />} title="No articles match" body="Try another word, or send us your question." action={<Button to="/contact">Contact us</Button>} /> :
        <div className="space-y-8">{Object.entries(groups).map(([cat, list]) => <section key={cat}><h2 className="text-lg mb-3">{cat}</h2><ul className="grid sm:grid-cols-2 gap-3">{list!.map((h) => <li key={h.id}><Link to={`/help/${h.slug}`} className="card card-hover p-4 block no-underline"><span className="font-semibold">{h.title}</span><span className="block text-sm text-muted line-clamp-2 mt-1">{h.body}</span></Link></li>)}</ul></section>)}</div>}
      <div className="panel p-5 mt-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3"><p><strong>Still stuck?</strong> <span className="text-muted">Tell us what you were trying to do.</span></p><div className="flex gap-2"><Button variant="secondary" onClick={() => setFb(true)}>Send feedback</Button><Button to="/contact">Contact us</Button></div></div>
      <FeedbackModal open={fb} onClose={() => setFb(false)} />
    </div>
  );
}
export function HelpArticle() {
  const { slug = '' } = useParams();
  const q = useQuery({ queryKey: ['help-article', slug], queryFn: () => api.helpArticle(slug), retry: false });
  const [voted, setVoted] = useState<null | boolean>(null); const [fb, setFb] = useState(false);
  useDocTitle(q.data?.title ?? 'Help');
  if (q.isError) return <div className="wrap py-10"><ErrorState error={q.error} /></div>;
  if (!q.data) return <div className="wrap py-10"><Skeleton className="h-48" /></div>;
  return (
    <article className="wrap py-10 max-w-3xl">
      <Link to="/help" className="link inline-flex items-center gap-1 mb-6"><ArrowLeft size={16} />Help centre</Link>
      <p className="eyebrow mb-2">{q.data.category}</p><h1 className="text-[30px]">{q.data.title}</h1><p className="text-sm text-faint mt-2">Updated {fmtDate(q.data.updatedAt)}</p>
      <div className="prose-flw text-[17px] mt-6">{q.data.body.split(/\n\n+/).map((p) => <p key={p}>{p}</p>)}</div>
      <div className="panel p-4 mt-8 flex flex-wrap items-center gap-3">{voted === null ? <><span className="font-semibold">Was this helpful?</span><Button size="sm" variant="secondary" icon={<ThumbsUp size={14} />} onClick={() => setVoted(true)}>Yes</Button><Button size="sm" variant="secondary" icon={<ThumbsDown size={14} />} onClick={() => { setVoted(false); setFb(true); }}>No</Button></> : <span className="text-muted">{voted ? 'Thanks for letting us know.' : 'Thanks. Tell us what was missing so we can improve this article.'}</span>}</div>
      <FeedbackModal open={fb} onClose={() => setFb(false)} />
    </article>
  );
}

// Grid cartogram: one tile per country, placed roughly by geography. Light and accessible (no map tiles).
const GRID: Record<string, [number, number]> = {
  MA: [1, 0], DZ: [2, 0], TN: [3, 0], EG: [5, 0], SN: [0, 1], ML: [1, 1], NE: [3, 1], SD: [5, 1], SL: [0, 2], BF: [1, 2], BJ: [2, 2], NG: [3, 2], ET: [6, 2],
  CI: [0, 3], GH: [1, 3], TG: [2, 3], CM: [3, 3], UG: [5, 3], KE: [6, 3], CD: [3, 4], RW: [4, 4], TZ: [5, 4], ZM: [3, 5], MW: [4, 5], MZ: [5, 5], NA: [2, 6], BW: [3, 6], ZW: [4, 6], ZA: [3, 7],
};
export function NetworkMap() {
  useDocTitle('Network map');
  const q = useQuery({ queryKey: ['map'], queryFn: api.mapStats });
  const [sel, setSel] = useState<string | null>('TZ');
  const data = Object.fromEntries((q.data ?? []).map((d) => [d.country, d]));
  const max = Math.max(1, ...(q.data ?? []).map((d) => d.members ?? 1));
  const S = 64, G = 6;
  const s = sel ? data[sel] : undefined;
  return (
    <div className="wrap py-10">
      <PageHeader eyebrow="Reach" title="Network map" intro="Where members, organisations and published resources are, by country. Counts under 3 members are hidden to protect privacy." />
      {q.isLoading ? <Skeleton className="h-[480px]" /> : (
        <div className="grid gap-8 lg:grid-cols-[1fr_320px] items-start">
          <div className="card p-4 overflow-x-auto">
            <svg viewBox={`0 0 ${7 * (S + G)} ${8 * (S + G)}`} className="w-full max-w-[520px] mx-auto block" role="img" aria-label="Grid map of African countries shaded by number of members">
              {Object.entries(GRID).map(([c, [x, y]]) => {
                const d = data[c]; const m = d?.members ?? (d?.rawMembers ? 1 : 0);
                const shade = m === 0 ? 'var(--surface-3)' : `color-mix(in srgb, var(--primary) ${25 + (m / max) * 75}%, var(--surface))`;
                const text = m === 0 ? 'var(--muted)' : m / max > 0.45 ? 'var(--on-primary)' : 'var(--fg)';
                return (
                  <g key={c} transform={`translate(${x * (S + G)},${y * (S + G)})`} role="button" tabIndex={0} aria-label={`${country(c)}: ${d?.members ?? (d?.rawMembers ? 'fewer than 3' : 0)} members`} onClick={() => setSel(c)} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setSel(c)} className="cursor-pointer focus:outline-none">
                    <rect width={S} height={S} rx={10} fill={shade} stroke={sel === c ? 'var(--accent)' : 'var(--line)'} strokeWidth={sel === c ? 3.5 : 1} />
                    <text x={S / 2} y={S / 2 + 1} textAnchor="middle" dominantBaseline="middle" fontSize="15" fontWeight="700" fill={text} fontFamily="Inter, sans-serif">{c}</text>
                    {d?.resources ? <circle cx={S - 11} cy={11} r={5} fill="var(--accent)" /> : null}
                  </g>
                );
              })}
            </svg>
            <div className="flex flex-wrap gap-4 justify-center text-sm text-muted mt-3"><span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-surface-3 border border-line" />No members</span><span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded" style={{ background: 'color-mix(in srgb, var(--primary) 40%, var(--surface))' }} />Fewer</span><span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-primary" />More members</span><span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-accent" />Has published resources</span></div>
          </div>
          <aside className="card p-5 lg:sticky lg:top-24">
            {s || sel ? <>
              <h2 className="text-xl">{country(sel!)}</h2>
              <dl className="grid grid-cols-3 gap-3 my-4 text-center">
                <div className="panel p-3"><dt className="text-xs text-muted">Members</dt><dd className="font-display font-bold text-2xl text-primary tabular">{s?.members ?? (s?.rawMembers ? '<3' : 0)}</dd></div>
                <div className="panel p-3"><dt className="text-xs text-muted">Organisations</dt><dd className="font-display font-bold text-2xl text-primary tabular">{s?.organisations ?? 0}</dd></div>
                <div className="panel p-3"><dt className="text-xs text-muted">Resources</dt><dd className="font-display font-bold text-2xl text-primary tabular">{s?.resources ?? 0}</dd></div>
              </dl>
              <div className="flex flex-col gap-2"><Button variant="secondary" to={`/knowledge?country=${sel}`}>Resources from {country(sel!)}</Button><Button variant="ghost" to={`/directory?country=${sel}`}>Members in the directory</Button></div>
            </> : <p className="text-muted">Choose a country.</p>}
          </aside>
          <details className="lg:col-span-2 card p-4"><summary className="font-semibold cursor-pointer">Show the data as a table</summary>
            <div className="overflow-x-auto mt-3"><table className="tbl"><thead><tr><th>Country</th><th>Members</th><th>Organisations</th><th>Public resources</th></tr></thead>
              <tbody>{(q.data ?? []).sort((a, b) => country(a.country).localeCompare(country(b.country))).map((d) => <tr key={d.country}><td>{country(d.country)}</td><td className="tabular">{d.members ?? (d.rawMembers ? 'Fewer than 3' : 0)}</td><td className="tabular">{d.organisations}</td><td className="tabular">{d.resources}</td></tr>)}</tbody></table></div></details>
        </div>
      )}
    </div>
  );
}
export { IMAGES };
