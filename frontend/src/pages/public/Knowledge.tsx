import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, SlidersHorizontal, X, ChevronRight, History, ShieldCheck, Sprout, Database, AlertTriangle, Pencil, Archive, Lock, Info } from 'lucide-react';
import { api, type ResourceType } from '@/api';
import { TAXONOMY } from '@/api/seed';
import { TYPE_LABEL, country, topic, language, STATUS_LABEL } from '@/lib/labels';
import { fmtDate } from '@/lib/format';
import { useAction, useDebounced, useDocTitle } from '@/lib/hooks';
import { useSession } from '@/lib/session';
import { Alert, Badge, Button, CardsSkeleton, Empty, ErrorState, Field, Modal, PageHeader, Pagination, Select, Sheet, Skeleton, StatusBadge, Textarea } from '@/components/ui';
import { CitationBox, DownloadButton, ExternalLinkButton, ResourceCard, ShareButton, TopicChips, TypeBadge, VisBadge, TYPE_ICON } from '@/components/domain';
import { cn } from '@/lib/cn';

const FILTERS = ['type', 'country', 'topic', 'language', 'year'] as const;

export function KnowledgePage({ datasetsOnly = false }: { datasetsOnly?: boolean }) {
  useDocTitle(datasetsOnly ? 'Datasets' : 'Knowledge hub');
  const [sp, setSp] = useSearchParams();
  const { isMember } = useSession();
  const [q, setQ] = useState(sp.get('q') ?? '');
  const dq = useDebounced(q, 350);
  const [sheet, setSheet] = useState(false);
  const f = Object.fromEntries(FILTERS.map((k) => [k, sp.get(k) ?? ''])) as Record<(typeof FILTERS)[number], string>;
  if (datasetsOnly) f.type = 'dataset';
  const sort = sp.get('sort') ?? 'relevance';
  const page = Number(sp.get('page') ?? 1);
  const set = (k: string, v: string) => { const n = new URLSearchParams(sp); if (v) n.set(k, v); else n.delete(k); if (k !== 'page') n.delete('page'); setSp(n, { replace: true }); };
  useEffect(() => { if ((sp.get('q') ?? '') !== dq) set('q', dq); /* eslint-disable-next-line */ }, [dq]);

  const query = useQuery({ queryKey: ['search', dq, f, sort, page], queryFn: () => api.search({ q: dq, ...f, sort, page, pageSize: 9 }), placeholderData: (p) => p });
  const active = FILTERS.filter((k) => f[k] && !(datasetsOnly && k === 'type'));
  const label = (k: string, v: string) => (k === 'type' ? TYPE_LABEL[v as ResourceType] : k === 'country' ? country(v) : k === 'topic' ? topic(v) : k === 'language' ? language(v) : v);
  const clearAll = () => { const n = new URLSearchParams(); if (q) n.set('q', q); setSp(n, { replace: true }); };

  const filters = (
    <div className="space-y-5">
      {!datasetsOnly && <Field label="Resource type">{(p) => <Select {...p} value={f.type} onChange={(e) => set('type', e.target.value)}><option value="">All types</option>{(Object.keys(TYPE_LABEL) as ResourceType[]).map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}{query.data?.facets[t] ? ` (${query.data.facets[t]})` : ''}</option>)}</Select>}</Field>}
      <Field label="Country or region">{(p) => <Select {...p} value={f.country} onChange={(e) => set('country', e.target.value)}><option value="">All countries</option>{TAXONOMY.countries.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</Select>}</Field>
      <Field label="Topic">{(p) => <Select {...p} value={f.topic} onChange={(e) => set('topic', e.target.value)}><option value="">All topics</option>{TAXONOMY.topics.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</Select>}</Field>
      <Field label="Language">{(p) => <Select {...p} value={f.language} onChange={(e) => set('language', e.target.value)}><option value="">All languages</option>{TAXONOMY.languages.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</Select>}</Field>
      <Field label="Publication year">{(p) => <Select {...p} value={f.year} onChange={(e) => set('year', e.target.value)}><option value="">Any year</option>{query.data?.years.map((y) => <option key={y} value={y}>{y}</option>)}</Select>}</Field>
      {active.length > 0 && <Button variant="ghost" size="sm" onClick={clearAll} icon={<X size={14} />}>Clear all filters</Button>}
    </div>
  );

  return (
    <div className="wrap py-8 md:py-10">
      <PageHeader eyebrow={datasetsOnly ? 'Research data' : 'Knowledge hub'} title={datasetsOnly ? 'Dataset catalogue' : 'Find research, tools and practice'}
        intro={datasetsOnly ? 'Datasets are held by their custodians. Each record shows coverage, method and how to get access.' : 'Search publications, datasets, tools, methods, policy briefs and community knowledge from across Africa.'}
        actions={isMember ? <Button to="/submit" variant="secondary">Submit a resource</Button> : undefined} />
      <form role="search" onSubmit={(e) => e.preventDefault()} className="flex gap-2 mb-4">
        <div className="relative flex-1"><Search size={19} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
          <label htmlFor="kq" className="sr-only">Search</label>
          <input id="kq" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={datasetsOnly ? 'Search datasets…' : 'Search titles, summaries, authors and keywords…'} className="input !rounded-full !pl-11 !min-h-[50px]" /></div>
        <button type="button" className="btn btn-secondary lg:hidden" onClick={() => setSheet(true)} aria-label="Filters"><SlidersHorizontal size={18} /><span className="hidden sm:inline">Filters</span>{active.length > 0 && <span className="pill bg-primary text-on-primary !px-2 !py-0">{active.length}</span>}</button>
      </form>
      {active.length > 0 && <div className="flex flex-wrap gap-2 mb-4" aria-label="Active filters">{active.map((k) => <button key={k} className="chip" aria-pressed="true" onClick={() => set(k, '')}>{label(k, f[k])}<X size={14} aria-label="Remove filter" /></button>)}</div>}
      <div className="grid lg:grid-cols-[260px_1fr] gap-8">
        <aside className="hidden lg:block" aria-label="Filters"><div className="sticky top-24 card p-5"><h2 className="text-base mb-4 flex items-center gap-2"><SlidersHorizontal size={16} />Filters</h2>{filters}</div></aside>
        <section aria-live="polite" aria-busy={query.isFetching} className="min-w-0">
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <p className="text-muted text-[15px]">{query.data ? <><strong className="text-fg tabular">{query.data.count}</strong> {query.data.count === 1 ? 'result' : 'results'}{dq && <> for “{dq}”</>}</> : 'Searching…'}</p>
            <label className="flex items-center gap-2 text-sm"><span className="text-muted">Sort</span>
              <select className="input !min-h-[38px] !py-1 !w-auto text-[15px]" value={sort} onChange={(e) => set('sort', e.target.value)}>
                <option value="relevance">Best match</option><option value="newest">Newest</option><option value="oldest">Oldest</option><option value="popular">Most viewed</option><option value="title">Title A–Z</option>
              </select></label>
          </div>
          {!!query.data?.hiddenMembers && <div className="mb-4"><Alert tone="info" icon={<Lock size={18} />}>Members can also see {query.data.hiddenMembers} members-only {query.data.hiddenMembers === 1 ? 'resource' : 'resources'}. <Link to="/login" className="link">Sign in</Link> or <Link to="/join" className="link">apply to join</Link>.</Alert></div>}
          {query.isError ? <ErrorState error={query.error} retry={() => query.refetch()} /> : !query.data ? <CardsSkeleton /> : query.data.results.length === 0 ? (
            <Empty icon={<Search size={22} />} title="No resources match" body={<>Try fewer words, check the spelling, or remove a filter.{active.length ? ' You have filters switched on.' : ''}</>}
              action={<>{active.length > 0 && <Button variant="secondary" onClick={clearAll}>Clear filters</Button>}<Button variant="secondary" onClick={() => { setQ(''); }}>Clear search</Button></>} />
          ) : (
            <div className={cn('grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 transition-opacity', query.isFetching && 'opacity-60')}>
              {query.data.results.map((r) => datasetsOnly ? (
                <Link key={r.id} to={`/knowledge/${r.slug}`} className="card card-hover p-5 flex flex-col gap-3 no-underline">
                  <div className="flex items-center gap-2"><span className="w-9 h-9 rounded-lg bg-secondary-soft text-secondary flex items-center justify-center"><Database size={18} /></span>{r.visibility !== 'public' && <VisBadge v={r.visibility} />}</div>
                  <h3 className="text-[17px] leading-snug">{r.v.title}</h3>
                  <dl className="text-sm grid grid-cols-[auto_1fr] gap-x-3 gap-y-1"><dt className="text-muted">Custodian</dt><dd className="truncate">{r.v.dataset?.custodian}</dd><dt className="text-muted">Period</dt><dd>{r.v.dataset?.period}</dd><dt className="text-muted">Access</dt><dd className="line-clamp-2">{r.v.dataset?.access}</dd></dl>
                </Link>
              ) : <ResourceCard key={r.id} r={r} />)}
            </div>
          )}
          {query.data && <Pagination page={page} count={query.data.count} pageSize={9} onPage={(p) => { set('page', String(p)); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />}
        </section>
      </div>
      <Sheet open={sheet} onClose={() => setSheet(false)} title="Filters" side="bottom" footer={<Button className="flex-1" onClick={() => setSheet(false)}>Show {query.data?.count ?? ''} results</Button>}>{filters}</Sheet>
    </div>
  );
}

export function ResourceDetail() {
  const { slug = '' } = useParams();
  const nav = useNavigate();
  const q = useQuery({ queryKey: ['resource', slug], queryFn: () => api.resource(slug), retry: false });
  const [withdraw, setWithdraw] = useState(false); const [reason, setReason] = useState('');
  const w = useAction(api.withdrawResource, { success: 'Resource withdrawn', onSuccess: () => setWithdraw(false) });
  useDocTitle(q.data?.v.title ?? 'Resource');
  useEffect(() => { if (q.data?.status === 'published') api.recordView(slug); }, [slug, q.data?.status]);
  const r = q.data;
  const Icon = r ? TYPE_ICON[r.type] : Database;
  const meta = useMemo(() => r ? [
    ['Countries', r.v.countries.map(country).join(', ')], ['Language', language(r.v.language)], ['Year', String(r.v.year)], ['Version', `${r.v.no}${r.versionCount > 1 ? ` of ${r.versionCount}` : ''}`],
    ['Rights', r.v.rights], ['Published', fmtDate(r.publishedAt) || 'Not yet published'], ['Contributor', r.ownerName],
  ] : [], [r]);

  if (q.isError) return <div className="wrap py-10"><ErrorState error={q.error} retry={() => q.refetch()} /></div>;
  if (!r) return <div className="wrap py-10 space-y-4"><Skeleton className="h-6 w-40" /><Skeleton className="h-10 w-3/4" /><Skeleton className="h-40 w-full" /></div>;
  return (
    <div className="wrap py-8 md:py-10">
      <nav aria-label="Breadcrumb" className="text-sm text-muted flex items-center gap-1 mb-5 flex-wrap"><Link to="/knowledge" className="hover:text-fg">Knowledge hub</Link><ChevronRight size={14} /><Link to={`/knowledge?type=${r.type}`} className="hover:text-fg">{TYPE_LABEL[r.type]}</Link></nav>
      {r.status === 'withdrawn' && <div className="mb-5"><Alert tone="warning" icon={<Archive size={18} />} title="This resource has been withdrawn">{r.withdrawnReason} The record stays here so existing citations still resolve, but files and links are no longer available.</Alert></div>}
      {r.status !== 'published' && r.status !== 'withdrawn' && <div className="mb-5"><Alert tone="info" title={`Not public: ${STATUS_LABEL[r.status]}`}>Only you and reviewers can see this page until it is published.</Alert></div>}
      {r.pendingVersion && r.canEdit && <div className="mb-5"><Alert tone="info">A new version you submitted is waiting for review. Readers see the current published version until it is accepted.</Alert></div>}
      <div className="grid lg:grid-cols-[1fr_320px] gap-10">
        <article className="min-w-0">
          <div className="flex flex-wrap gap-2 mb-3"><TypeBadge type={r.type} /><VisBadge v={r.visibility} />{r.status !== 'published' && <StatusBadge status={r.status} />}</div>
          <h1 className="text-[28px] md:text-[36px] leading-tight">{r.v.title}</h1>
          <p className="text-[17px] text-muted mt-2">{r.v.authors.join(', ')}</p>
          <div className="flex flex-wrap gap-2 mt-6">
            {r.status === 'published' && <DownloadButton r={r} />}
            {r.status === 'published' && r.v.url && <ExternalLinkButton href={r.v.url} label={r.type === 'dataset' ? 'Go to the data source' : 'Open source link'} variant={r.v.fileName ? 'secondary' : 'primary'} />}
            {r.status === 'published' && r.visibility === 'public' && <ShareButton title={r.v.title} path={`/knowledge/${r.slug}`} />}
          </div>
          <section className="mt-8"><h2 className="text-xl mb-2">Summary</h2><p className="text-[17px] leading-relaxed prose-flw">{r.v.summary}</p>
            {r.v.keywords.length > 0 && <p className="text-sm text-muted mt-3">Keywords: {r.v.keywords.join(', ')}</p>}</section>
          {r.v.dataset && (
            <section className="mt-8 card p-5"><h2 className="text-xl mb-4 flex items-center gap-2"><Database size={20} className="text-secondary" />Dataset details</h2>
              <dl className="grid sm:grid-cols-[160px_1fr] gap-x-4 gap-y-3 text-[15px]">
                {[['Custodian', r.v.dataset.custodian], ['Collection period', r.v.dataset.period], ['Coverage', r.v.dataset.coverage], ['Method', r.v.dataset.method], ['Licence or access', r.v.dataset.access], ['Persistent identifier', r.v.dataset.pid || 'Not available']].map(([k, v]) => <div key={k} className="contents"><dt className="text-muted font-medium">{k}</dt><dd className={!v || v === 'Not available' ? 'text-faint italic' : ''}>{v || 'Not provided'}</dd></div>)}
              </dl>
              <p className="text-sm text-muted mt-4 flex gap-2"><Info size={16} className="shrink-0 mt-0.5" />The network lists this dataset; the custodian holds the data and decides who may use it.</p>
            </section>
          )}
          {r.v.ik && (
            <section className="mt-8 rounded-2xl p-5 bg-secondary-soft"><h2 className="text-xl mb-3 flex items-center gap-2"><Sprout size={20} className="text-secondary" />Community knowledge</h2>
              <p className="text-[15px] mb-4">This knowledge belongs to <strong>{r.v.ik.community}</strong>. It is shared with their permission and on their terms.</p>
              <dl className="grid sm:grid-cols-[180px_1fr] gap-x-4 gap-y-2 text-[15px]">
                <dt className="text-muted font-medium">Permission given by</dt><dd>{r.v.ik.authority}</dd>
                <dt className="text-muted font-medium">Limits on sharing</dt><dd>{r.v.ik.restrictions}</dd>
                <dt className="text-muted font-medium">Permission checked</dt><dd>{r.v.ik.confirmedBy ? <span className="inline-flex items-center gap-1.5"><ShieldCheck size={16} className="text-success" />Confirmed by a network reviewer</span> : 'Awaiting reviewer confirmation'}</dd>
              </dl>
              <p className="text-sm text-muted mt-4">Communities can ask for this record to be withdrawn at any time through the <Link to="/contact" className="link">contact form</Link>.</p>
            </section>
          )}
          <section className="mt-8"><h2 className="text-xl mb-3">Topics</h2><TopicChips ids={r.v.topics} link /></section>
          <section className="mt-8"><CitationBox r={r} /></section>
          <section className="mt-8"><h2 className="text-xl mb-3 flex items-center gap-2"><History size={20} />Version history</h2>
            <ol className="border-l-2 border-line ml-2 space-y-4">
              {r.history.slice().reverse().map((h) => (
                <li key={h.no} className="pl-5 relative"><span className={cn('absolute -left-[7px] top-1.5 w-3 h-3 rounded-full', h.status === 'published' ? 'bg-primary' : 'bg-line-strong')} />
                  <p className="font-medium">Version {h.no} <StatusBadge status={h.status} /></p>
                  <p className="text-sm text-muted">Submitted {fmtDate(h.submittedAt)}{h.reviewedAt ? ` · reviewed ${fmtDate(h.reviewedAt)}` : ''}</p>
                  {h.reviewNote && <p className="text-sm mt-1 panel p-2">Reviewer note: {h.reviewNote}</p>}
                </li>
              ))}
            </ol>
          </section>
        </article>
        <aside className="space-y-5">
          <div className="card p-5">
            <div className="w-12 h-12 rounded-xl bg-primary-soft text-primary flex items-center justify-center mb-4"><Icon size={22} /></div>
            <dl className="space-y-3 text-[15px]">{meta.map(([k, v]) => <div key={k}><dt className="text-sm text-muted">{k}</dt><dd className="font-medium">{v}</dd></div>)}</dl>
            {r.status === 'published' && <p className="text-xs text-faint mt-4 tabular">{r.stats.views} views · {r.stats.downloads} downloads · {r.stats.citations} citations copied</p>}
            <p className="text-xs text-faint mt-2">Approved through network moderation. This is not formal scientific peer review.</p>
          </div>
          {(r.canEdit || r.canWithdraw) && r.status !== 'withdrawn' && (
            <div className="card p-5 space-y-2"><h2 className="text-base mb-2">Manage</h2>
              {r.canEdit && <Button variant="secondary" className="w-full" icon={<Pencil size={16} />} onClick={() => nav(`/submit?edit=${r.id}`)}>{r.status === 'published' ? 'Submit a new version' : 'Edit submission'}</Button>}
              {r.canWithdraw && <Button variant="ghost" className="w-full text-danger" icon={<Archive size={16} />} onClick={() => setWithdraw(true)}>Withdraw</Button>}
            </div>
          )}
          {r.related.length > 0 && <div><h2 className="text-base mb-3">Related</h2><div className="space-y-3">{r.related.map((x) => <ResourceCard key={x.id} r={x} compact />)}</div></div>}
        </aside>
      </div>
      <Modal open={withdraw} onClose={() => setWithdraw(false)} title="Withdraw this resource?" footer={<><Button variant="secondary" onClick={() => setWithdraw(false)}>Cancel</Button><Button variant="danger" busy={w.busy} onClick={() => w.run(r.slug, reason)}>Withdraw resource</Button></>}>
        <p className="text-muted mb-4 flex gap-2"><AlertTriangle size={18} className="text-warning shrink-0 mt-0.5" />Files and links stop working straight away. The record and its citation remain, marked as withdrawn.</p>
        <Field label="Reason (shown publicly)" error={w.errors.reason} required>{(p) => <Textarea {...p} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="For example: superseded by a corrected dataset" />}</Field>
      </Modal>
    </div>
  );
}

export function Datasets() { return <KnowledgePage datasetsOnly />; }
export { Badge };
