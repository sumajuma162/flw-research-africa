import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Check, X, RotateCcw, ShieldCheck, Sprout, AlertTriangle, UserCheck, Inbox, Database, ExternalLink } from 'lucide-react';
import { api } from '@/api';
import { useSession } from '@/lib/session';
import { useAction, useDocTitle } from '@/lib/hooks';
import { category, country, topic, language } from '@/lib/labels';
import { fmtDate, timeAgo, fmtSize } from '@/lib/format';
import { Alert, Badge, Button, Check as CheckBox, Empty, ErrorState, Field, PageHeader, RowsSkeleton, Select, Sheet, Tabs, Textarea, Skeleton } from '@/components/ui';
import { TypeBadge, VisBadge } from '@/components/domain';
import { cn } from '@/lib/cn';

const KINDS = [['applications', 'Applications'], ['submissions', 'Submissions'], ['reports', 'Reports'], ['contact', 'Contact'], ['privacy', 'Privacy'], ['feedback', 'Feedback'], ['closures', 'Closures']] as const;
type Kind = (typeof KINDS)[number][0] | 'all';

export function Queue() {
  useDocTitle('Staff queue');
  const { user } = useSession();
  const [sp, setSp] = useSearchParams();
  const tab = (sp.get('tab') ?? 'all') as Kind;
  const [mine, setMine] = useState(false);
  const q = useQuery({ queryKey: ['queue'], queryFn: api.queue, refetchInterval: 20_000 });
  const assign = useAction(api.assign, { success: 'Assignment updated' });
  const [open, setOpen] = useState<{ kind: string; id: string } | null>(null);
  const nav = useNavigate();
  const items = (q.data?.items ?? []).filter((i) => (tab === 'all' || i.kind === tab) && (!mine || i.assigneeId === user?.id));
  const count = (k: string) => q.data?.items.filter((i) => i.kind === k).length ?? 0;
  const tabs = [{ id: 'all' as Kind, label: 'All', count: q.data?.items.length }, ...KINDS.filter(([k]) => count(k) > 0 || tab === k).map(([k, l]) => ({ id: k as Kind, label: l, count: count(k) }))];
  return (
    <>
      <PageHeader title="Queue" intro="Everything waiting for staff action. Assign an item to yourself so others know you are on it." />
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
        <Tabs label="Queue type" value={tab} onChange={(t) => setSp(t === 'all' ? {} : { tab: t }, { replace: true })} tabs={tabs} />
        <label className="flex items-center gap-2 text-sm shrink-0"><input type="checkbox" className="check" checked={mine} onChange={(e) => setMine(e.target.checked)} />Assigned to me</label>
      </div>
      {q.isError ? <ErrorState error={q.error} retry={() => q.refetch()} /> : !q.data ? <RowsSkeleton /> : items.length === 0 ? <Empty icon={<Inbox size={22} />} title="Nothing waiting" body="The queue is clear for your roles. New items appear here automatically." /> : (
        <ul className="card divide-y divide-line">{items.map((i) => (
          <li key={`${i.kind}-${i.id}`} className="p-4 flex flex-col md:flex-row md:items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex gap-2 items-center flex-wrap mb-1"><Badge tone={i.kind === 'reports' ? 'red' : i.kind === 'submissions' ? 'blue' : i.kind === 'applications' ? 'green' : 'gold'}>{KINDS.find(([k]) => k === i.kind)?.[1]}</Badge><span className="text-xs text-faint">{timeAgo(i.createdAt)}</span>{i.flag && <Badge tone="terracotta" icon={<AlertTriangle size={11} />}>{i.flag}</Badge>}</div>
              <p className="font-semibold truncate">{i.title}</p><p className="text-sm text-muted truncate">{i.subtitle}</p>
            </div>
            <div className="flex gap-2 items-center shrink-0">
              {['applications', 'submissions', 'reports', 'contact', 'privacy'].includes(i.kind) && (
                <select aria-label="Assignee" className="input !min-h-[38px] !py-1 !w-44 text-sm" value={i.assigneeId ?? ''} onChange={(e) => assign.run(i.kind, i.id, e.target.value || null)}>
                  <option value="">Unassigned</option>{q.data!.staff.map((s) => <option key={s.id} value={s.id}>{s.id === user?.id ? `Me (${s.name})` : s.name}</option>)}
                </select>)}
              <Button size="sm" onClick={() => (i.link ? nav(i.link) : setOpen({ kind: i.kind, id: i.id }))}>Open</Button>
            </div>
          </li>))}</ul>)}
      <Sheet open={!!open} onClose={() => setOpen(null)} title={KINDS.find(([k]) => k === open?.kind)?.[1] ?? 'Item'}>
        {open && <QueueDetail kind={open.kind} id={open.id} onDone={() => setOpen(null)} />}
      </Sheet>
    </>
  );
}

function QueueDetail({ kind, id, onDone }: { kind: string; id: string; onDone: () => void }) {
  const [text, setText] = useState('');
  const app = useQuery({ queryKey: ['app-detail', id], queryFn: () => api.applicationDetail(id), enabled: kind === 'applications' });
  const rep = useQuery({ queryKey: ['rep-detail', id], queryFn: () => api.reportDetail(id), enabled: kind === 'reports' });
  const con = useQuery({ queryKey: ['con-detail', id], queryFn: () => api.contactDetail(id), enabled: kind === 'contact' });
  const prv = useQuery({ queryKey: ['prv-detail', id], queryFn: () => api.dataRequestDetail(id), enabled: kind === 'privacy' });
  const fbs = useQuery({ queryKey: ['feedback-list'], queryFn: api.feedbackList, enabled: kind === 'feedback' });
  const users = useQuery({ queryKey: ['users-closure'], queryFn: () => api.users({ status: 'closure_pending' }), enabled: kind === 'closures' });
  const opts = { success: 'Decision recorded', onSuccess: onDone };
  const decideApp = useAction(api.decideApplication, opts);
  const resolveRep = useAction(api.resolveReport, opts);
  const resolveCon = useAction(api.resolveContact, opts);
  const resolvePrv = useAction(api.resolveDataRequest, opts);
  const resolveFb = useAction(api.resolveFeedback, opts);
  const closure = useAction(api.decideClosure, opts);
  const { hasRole } = useSession();
  const note = (label: string, err?: string, hint?: string) => <Field label={label} error={err} hint={hint}>{(p) => <Textarea {...p} rows={3} value={text} onChange={(e) => setText(e.target.value)} />}</Field>;

  if (kind === 'applications') { const d = app.data; if (!d) return <Skeleton className="h-60" />; return (
    <div className="space-y-4">
      <div><p className="font-display font-semibold text-xl">{d.applicant.name}</p><p className="text-muted text-sm">{d.applicant.email}</p></div>
      <dl className="panel p-4 grid grid-cols-[110px_1fr] gap-2 text-[15px]"><dt className="text-muted">Reference</dt><dd className="font-mono">{d.app.ref}</dd><dt className="text-muted">Group</dt><dd>{category(d.app.category)}</dd><dt className="text-muted">Country</dt><dd>{country(d.app.country)}</dd><dt className="text-muted">Affiliation</dt><dd>{d.app.affiliation || '—'}</dd><dt className="text-muted">Interests</dt><dd>{d.app.interests.map(topic).join(', ')}</dd><dt className="text-muted">Consent</dt><dd>{d.app.consentVersion}</dd><dt className="text-muted">Applied</dt><dd>{fmtDate(d.app.createdAt)}</dd></dl>
      <div><p className="label">Motivation</p><p className="text-[15px]">{d.app.motivation || <span className="text-muted">Not given</span>}</p></div>
      {note('Reason for your decision', decideApp.errors.reason, 'Recorded with the decision. For rejections, it is sent to the applicant.')}
      <div className="flex gap-2"><Button variant="secondary" icon={<X size={16} />} busy={decideApp.busy} onClick={() => decideApp.run(id, false, text)}>Reject</Button><Button icon={<UserCheck size={16} />} busy={decideApp.busy} onClick={() => decideApp.run(id, true, text || 'Meets membership criteria.')}>Approve</Button></div>
    </div>); }
  if (kind === 'reports') { const d = rep.data; if (!d) return <Skeleton className="h-60" />; return (
    <div className="space-y-4">
      <Badge tone="red">{d.report.reason}</Badge>
      {d.threadTitle && <p className="text-sm text-muted">In discussion: <strong className="text-fg">{d.threadTitle}</strong></p>}
      <div><p className="label">Reported content by {d.authorName}</p><blockquote className="panel p-4 text-[15px] border-l-4 border-danger">{d.content || <em className="text-muted">Content no longer available</em>}</blockquote></div>
      {d.report.details && <div><p className="label">Reporter’s details</p><p className="text-[15px]">{d.report.details}</p><p className="text-xs text-faint mt-1">Reporter identity is restricted.</p></div>}
      {note('What did you decide and why?', resolveRep.errors.note)}
      <div className="flex gap-2 flex-wrap"><Button variant="secondary" busy={resolveRep.busy} onClick={() => resolveRep.run(id, 'dismiss', text)}>Dismiss report</Button><Button variant="danger" busy={resolveRep.busy} onClick={() => resolveRep.run(id, 'remove', text)}>Remove content</Button>
        {hasRole('admin') && <Button variant="danger" busy={resolveRep.busy} onClick={() => resolveRep.run(id, 'remove_suspend', text)}>Remove and suspend author</Button>}</div>
    </div>); }
  if (kind === 'contact') { const d = con.data; if (!d) return <Skeleton className="h-60" />; return (
    <div className="space-y-4"><p className="font-display font-semibold text-xl">{d.subject}</p><p className="text-sm text-muted">{d.name} · <span className="select-all">{d.email}</span> · {d.ref}</p><p className="panel p-4 text-[15px] whitespace-pre-wrap">{d.message}</p>
      {note('How was it resolved?', resolveCon.errors.resolution, 'For example: replied by email and introduced to the partnerships lead.')}<Button icon={<Check size={16} />} busy={resolveCon.busy} onClick={() => resolveCon.run(id, text)}>Mark resolved</Button></div>); }
  if (kind === 'privacy') { const d = prv.data; if (!d) return <Skeleton className="h-60" />; return (
    <div className="space-y-4"><p className="font-display font-semibold text-xl capitalize">{d.req.kind} request</p><p className="text-sm text-muted">{d.user.name} · {d.user.email} · {d.req.ref}</p><p className="panel p-4 text-[15px]">{d.req.details}</p>
      <Alert tone="warning" title="Check identity first">Confirm the request came from the account holder before releasing or deleting data. Exports must exclude other members’ private data.</Alert>
      {note('Outcome', resolvePrv.errors.resolution, 'Include any data kept and the reason (for example, legal retention).')}<Button icon={<ShieldCheck size={16} />} busy={resolvePrv.busy} onClick={() => resolvePrv.run(id, text)}>Resolve request</Button></div>); }
  if (kind === 'feedback') { const d = fbs.data?.find((f) => f.id === id); if (!d) return <Skeleton className="h-40" />; return (
    <div className="space-y-4"><p className="text-sm text-muted">{d.ref} · page {d.page} · {fmtDate(d.createdAt)}</p><p className="panel p-4 text-[15px]">{d.message}</p>{note('Response (sent to the member if signed in)')}<Button busy={resolveFb.busy} onClick={() => resolveFb.run(id, text)}>Mark resolved</Button></div>); }
  if (kind === 'closures') { const u = users.data?.find((x) => x.id === id); if (!u) return <Skeleton className="h-40" />; return (
    <div className="space-y-4"><p className="font-display font-semibold text-xl">{u.name}</p><p className="text-sm text-muted">{u.email}</p><p className="panel p-4">Reason: {u.closureReason || 'Not given'}</p>
      <Alert tone="info">Approving anonymises public attribution and closes the account. Retained records follow the retention schedule.</Alert>
      <div className="flex gap-2"><Button variant="secondary" busy={closure.busy} onClick={() => closure.run(id, false)}>Decline</Button><Button variant="danger" busy={closure.busy} onClick={() => closure.run(id, true)}>Close account</Button></div></div>); }
  return null;
}

export function Review() {
  const { id = '' } = useParams(); const nav = useNavigate();
  const q = useQuery({ queryKey: ['review', id], queryFn: () => api.reviewItem(id), retry: false });
  const [checks, setChecks] = useState({ provenance: false, rights: false, visibility: false, ik: false });
  const [note, setNote] = useState('');
  const d = useAction(api.decideReview, { success: 'Decision recorded and the contributor notified', onSuccess: () => nav('/console?tab=submissions') });
  useDocTitle('Review submission');
  if (q.isError) return <ErrorState error={q.error} />;
  if (!q.data) return <RowsSkeleton />;
  const r = q.data; const v = r.v; const pending = v.status === 'pending';
  const allChecked = checks.provenance && checks.rights && checks.visibility && (r.type !== 'indigenous_knowledge' || checks.ik);
  return (
    <>
      <Link to="/console?tab=submissions" className="link inline-flex items-center gap-1 mb-5"><ArrowLeft size={16} />Queue</Link>
      <PageHeader eyebrow={`Review · version ${v.no}`} title={v.title} intro={`Submitted by ${r.submitterName} ${timeAgo(v.submittedAt)}`} />
      {r.isOwn && <div className="mb-5"><Alert tone="warning" title="This is your own submission">Another reviewer must decide on it. You can read it but the decision buttons are disabled.</Alert></div>}
      {!pending && <div className="mb-5"><Alert tone="info" title="Already decided">This version is {v.status}{r.reviewerName && r.reviewerName !== 'Unknown' ? ` (reviewed by ${r.reviewerName})` : ''}.</Alert></div>}
      <div className="grid gap-8 xl:grid-cols-[1fr_380px]">
        <article className="space-y-5 min-w-0">
          <div className="flex gap-2 flex-wrap"><TypeBadge type={r.type} /><VisBadge v={r.visibility} /></div>
          {r.previous && <div className="panel p-4"><p className="text-sm font-semibold mb-1">Currently published (version {r.previous.no})</p><p className="text-[15px] text-muted">{r.previous.title}</p><p className="text-sm text-muted mt-1 line-clamp-2">{r.previous.summary}</p></div>}
          <section className="card p-5 space-y-3"><h2 className="text-lg">Submission</h2><p className="text-[15px]">{v.summary}</p>
            <dl className="grid sm:grid-cols-[140px_1fr] gap-x-4 gap-y-2 text-[15px] border-t border-line pt-3">
              {[['Authors', v.authors.join(', ')], ['Year', v.year], ['Language', language(v.language)], ['Countries', v.countries.map(country).join(', ')], ['Topics', v.topics.map(topic).join(', ')], ['Keywords', v.keywords.join(', ') || '—'], ['Rights', v.rights], ['DOI', v.doi || '—']].map(([k, x]) => <div key={k as string} className="contents"><dt className="text-muted">{k}</dt><dd className="break-words">{x}</dd></div>)}
              <dt className="text-muted">Source</dt><dd className="break-all">{v.fileName ? `${v.fileName} (${fmtSize(v.fileSize)}) · scanned, no threats found` : <a href={v.url} target="_blank" rel="noopener noreferrer" className="link inline-flex items-center gap-1">{v.url}<ExternalLink size={13} /></a>}</dd>
            </dl></section>
          {v.dataset && <section className="card p-5"><h2 className="text-lg mb-3 flex items-center gap-2"><Database size={18} className="text-secondary" />Dataset metadata</h2>
            <dl className="grid sm:grid-cols-[140px_1fr] gap-x-4 gap-y-2 text-[15px]">{[['Custodian', v.dataset.custodian], ['Period', v.dataset.period], ['Coverage', v.dataset.coverage], ['Method', v.dataset.method], ['Access', v.dataset.access], ['Identifier', v.dataset.pid || 'Not available']].map(([k, x]) => <div key={k} className="contents"><dt className="text-muted">{k}</dt><dd className={cn(!x && 'text-danger')}>{x || 'Missing'}</dd></div>)}</dl></section>}
          {v.ik && <section className="rounded-2xl p-5 bg-secondary-soft"><h2 className="text-lg mb-3 flex items-center gap-2"><Sprout size={18} className="text-secondary" />Community permission</h2>
            <dl className="grid sm:grid-cols-[160px_1fr] gap-x-4 gap-y-2 text-[15px]"><dt className="text-muted">Community</dt><dd>{v.ik.community}</dd><dt className="text-muted">Permission from</dt><dd>{v.ik.authority}</dd><dt className="text-muted">Limits</dt><dd>{v.ik.restrictions}</dd></dl></section>}
          {r.history.length > 1 && <section><h2 className="text-lg mb-2">Earlier reviews</h2><ul className="space-y-2">{r.history.filter((h) => h.reviewNote).map((h) => <li key={h.no} className="panel p-3 text-sm">v{h.no} · {h.status}: {h.reviewNote}</li>)}</ul></section>}
        </article>
        <aside className="card p-5 space-y-4 self-start xl:sticky xl:top-24">
          <h2 className="text-lg">Review checklist</h2>
          <CheckBox label="Provenance is clear" hint="Authors, source and dates are recorded and plausible." checked={checks.provenance} onChange={(x) => setChecks({ ...checks, provenance: x })} disabled={!pending || r.isOwn} />
          <CheckBox label="Rights allow sharing" hint="The rights statement matches the source; no copyright problem." checked={checks.rights} onChange={(x) => setChecks({ ...checks, rights: x })} disabled={!pending || r.isOwn} />
          <CheckBox label="Visibility is appropriate" hint="No sensitive or participant-level data is exposed." checked={checks.visibility} onChange={(x) => setChecks({ ...checks, visibility: x })} disabled={!pending || r.isOwn} />
          {r.type === 'indigenous_knowledge' && <CheckBox label="Community permission confirmed" hint="I have checked the permission scope with the named authority." checked={checks.ik} onChange={(x) => setChecks({ ...checks, ik: x })} disabled={!pending || r.isOwn} />}
          <Field label="Note to the contributor" error={d.errors.note} hint="Required when returning or rejecting.">{(p) => <Textarea {...p} rows={4} value={note} onChange={(e) => setNote(e.target.value)} disabled={!pending || r.isOwn} />}</Field>
          <div className="grid gap-2">
            <Button icon={<Check size={16} />} disabled={!pending || r.isOwn || !allChecked} busy={d.busy} onClick={() => d.run(id, 'accept', note, checks)}>Accept and publish</Button>
            <Button variant="secondary" icon={<RotateCcw size={16} />} disabled={!pending || r.isOwn} busy={d.busy} onClick={() => d.run(id, 'return', note, checks)}>Return for changes</Button>
            <Button variant="ghost" className="text-danger" icon={<X size={16} />} disabled={!pending || r.isOwn} busy={d.busy} onClick={() => d.run(id, 'reject', note, checks)}>Reject</Button>
          </div>
          {!allChecked && pending && !r.isOwn && <p className="text-xs text-muted">Complete every check to enable Accept.</p>}
          <p className="text-xs text-faint">Network moderation, not formal scientific peer review.</p>
        </aside>
      </div>
    </>
  );
}
export { Select };
