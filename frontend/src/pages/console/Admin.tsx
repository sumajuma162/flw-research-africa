import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Pencil, Plus, Trash2, Eye, Send, Ban, RotateCcw, Check, X, Search, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { api, type EventItem, type NewsItem, type Opportunity, type HelpArticle, type Role, type Taxonomy } from '@/api';
import { TAXONOMY } from '@/api/seed';
import { useSession } from '@/lib/session';
import { useAction, useDebounced, useDocTitle } from '@/lib/hooks';
import { useToast } from '@/lib/toast';
import { ROLE_LABEL, TIMEZONES, TYPE_LABEL, category, country, topic } from '@/lib/labels';
import { fmtDate, fmtInZone, timeAgo } from '@/lib/format';
import { Alert, Avatar, Badge, Button, Check as CheckBox, ChipSelect, Confirm, Empty, ErrorState, Field, Input, Modal, PageHeader, RowsSkeleton, Select, StatusBadge, Switch, Tabs, Textarea } from '@/components/ui';
import { cn } from '@/lib/cn';

const toLocalInput = (iso?: string) => (iso ? new Date(Date.parse(iso) - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '');
const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : '');

export function ContentAdmin() {
  useDocTitle('Content');
  const [tab, setTab] = useState<'pages' | 'events' | 'news' | 'opps' | 'help'>('pages');
  return (
    <>
      <PageHeader title="Content" intro="Edit public pages, events, news, opportunities and help articles. Page changes are saved as drafts and go live only when published." />
      <Tabs label="Content type" value={tab} onChange={setTab} tabs={[{ id: 'pages', label: 'About pages' }, { id: 'events', label: 'Events' }, { id: 'news', label: 'News' }, { id: 'opps', label: 'Opportunities' }, { id: 'help', label: 'Help articles' }]} />
      <div className="mt-6">{tab === 'pages' ? <PagesEditor /> : tab === 'events' ? <EventsAdmin /> : tab === 'news' ? <NewsAdmin /> : tab === 'opps' ? <OppsAdmin /> : <HelpAdmin />}</div>
    </>
  );
}

function PagesEditor() {
  const q = useQuery({ queryKey: ['pages'], queryFn: api.pages });
  const [sel, setSel] = useState('vision'); const [body, setBody] = useState('');
  const p = q.data?.find((x) => x.slug === sel);
  useEffect(() => { if (p) setBody(p.draft?.body ?? p.body); }, [p?.slug, p?.draft?.body, p?.body]);
  const save = useAction(api.savePageDraft, { success: 'Draft saved. The public page has not changed.' });
  const pub = useAction(api.publishPage, { success: 'Published. The public page now shows this version.' });
  const discard = useAction(api.discardPageDraft, { success: 'Draft discarded' });
  if (!q.data) return <RowsSkeleton />;
  return (
    <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
      <ul className="flex lg:flex-col gap-1 overflow-x-auto">{q.data.map((x) => <li key={x.slug}><button onClick={() => setSel(x.slug)} className={cn('w-full text-left px-3 py-2 rounded-lg font-medium whitespace-nowrap flex items-center justify-between gap-2', sel === x.slug ? 'bg-primary-soft text-primary-strong' : 'hover:bg-surface-2')}>{x.title}{x.draft && <Badge tone="gold">Draft</Badge>}</button></li>)}</ul>
      {p && <div className="space-y-4 min-w-0">
        <div className="flex items-center gap-2 flex-wrap text-sm text-muted">Published version {p.version} · {fmtDate(p.publishedAt)}{p.draft && <Badge tone="gold">Unpublished draft saved {timeAgo(p.draft.savedAt)}</Badge>}</div>
        <Field label={`${p.title} text`} hint="Separate paragraphs (or list items) with a blank line.">{(f) => <Textarea {...f} rows={9} value={body} onChange={(e) => setBody(e.target.value)} />}</Field>
        <div className="flex gap-2 flex-wrap"><Button variant="secondary" busy={save.busy} onClick={() => save.run(p.slug, body)}>Save draft</Button><Button busy={pub.busy} disabled={!p.draft} onClick={() => pub.run(p.slug)}>Publish draft</Button>{p.draft && <Button variant="ghost" onClick={() => discard.run(p.slug)}>Discard draft</Button>}<Button variant="ghost" to="/about" icon={<Eye size={16} />}>View public page</Button></div>
        {!p.draft && <p className="text-xs text-faint">Save a draft before publishing. Each publication records the publisher and time.</p>}
        <div><h3 className="text-base mb-2">Version history</h3><ul className="text-sm space-y-1">{p.history.map((h) => <li key={h.version} className="text-muted">Version {h.version} · {fmtDate(h.publishedAt)}</li>)}</ul></div>
      </div>}
    </div>
  );
}

function EventsAdmin() {
  const q = useQuery({ queryKey: ['events', 'admin'], queryFn: () => api.events({ scope: 'all', includeDrafts: true }) });
  const [edit, setEdit] = useState<Partial<EventItem> | null>(null);
  const [del, setDel] = useState<string | null>(null);
  const save = useAction(api.saveEvent, { success: 'Event saved', onSuccess: () => setEdit(null) });
  const rm = useAction(api.deleteEvent, { success: 'Event deleted', onSuccess: () => setDel(null) });
  return (
    <>
      <div className="flex justify-end mb-4"><Button icon={<Plus size={16} />} onClick={() => setEdit({ title: '', summary: '', body: '', timezone: 'Africa/Nairobi', status: 'draft', online: true, membersOnly: false, topic: 'measurement', location: 'Online' })}>New event</Button></div>
      {!q.data ? <RowsSkeleton /> : <div className="overflow-x-auto card"><table className="tbl"><thead><tr><th>Event</th><th>When</th><th>Status</th><th></th></tr></thead><tbody>{q.data.map((e) => (
        <tr key={e.id}><td><p className="font-semibold">{e.title}</p><p className="text-sm text-muted">{e.online ? 'Online' : e.location}{e.membersOnly ? ' · members only' : ''}</p></td><td className="text-sm whitespace-nowrap">{fmtInZone(e.startsAt, e.timezone)}</td><td><StatusBadge status={e.status === 'draft' ? 'draft' : 'published'} />{e.cancelled && <Badge tone="red">Cancelled</Badge>}</td>
          <td className="whitespace-nowrap text-right"><button className="btn-icon" aria-label={`Edit ${e.title}`} onClick={() => setEdit(e)}><Pencil size={16} /></button><button className="btn-icon text-danger" aria-label={`Delete ${e.title}`} onClick={() => setDel(e.id)}><Trash2 size={16} /></button></td></tr>))}</tbody></table></div>}
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Edit event' : 'New event'} size="lg" footer={<><Button variant="secondary" onClick={() => setEdit(null)}>Cancel</Button><Button busy={save.busy} onClick={() => save.run(edit!)}>Save event</Button></>}>
        {edit && <div className="space-y-4">
          <Field label="Title" error={save.errors.title}>{(p) => <Input {...p} value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} />}</Field>
          <Field label="Summary">{(p) => <Input {...p} value={edit.summary} onChange={(e) => setEdit({ ...edit, summary: e.target.value })} />}</Field>
          <div className="grid sm:grid-cols-3 gap-4">
            <Field label="Starts (your local time)" error={save.errors.startsAt}>{(p) => <Input {...p} type="datetime-local" value={toLocalInput(edit.startsAt)} onChange={(e) => setEdit({ ...edit, startsAt: fromLocalInput(e.target.value) })} />}</Field>
            <Field label="Ends (your local time)" error={save.errors.endsAt}>{(p) => <Input {...p} type="datetime-local" value={toLocalInput(edit.endsAt)} onChange={(e) => setEdit({ ...edit, endsAt: fromLocalInput(e.target.value) })} />}</Field>
            <Field label="Event time zone" error={save.errors.timezone} hint="Times are shown to readers in this zone.">{(p) => <Select {...p} value={edit.timezone} onChange={(e) => setEdit({ ...edit, timezone: e.target.value })}>{TIMEZONES.map((t) => <option key={t}>{t}</option>)}</Select>}</Field>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Location">{(p) => <Input {...p} value={edit.location} onChange={(e) => setEdit({ ...edit, location: e.target.value })} />}</Field>
            <Field label="Joining or registration link" error={save.errors.link} optional>{(p) => <Input {...p} type="url" value={edit.link ?? ''} onChange={(e) => setEdit({ ...edit, link: e.target.value || undefined })} />}</Field>
          </div>
          <Field label="Topic">{(p) => <Select {...p} value={edit.topic} onChange={(e) => setEdit({ ...edit, topic: e.target.value })}>{TAXONOMY.topics.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}</Select>}</Field>
          <Field label="Description">{(p) => <Textarea {...p} rows={4} value={edit.body} onChange={(e) => setEdit({ ...edit, body: e.target.value })} />}</Field>
          <div className="grid sm:grid-cols-2 gap-x-6"><Switch label="Online event" checked={!!edit.online} onChange={(v) => setEdit({ ...edit, online: v })} /><Switch label="Members only" checked={!!edit.membersOnly} onChange={(v) => setEdit({ ...edit, membersOnly: v })} /><Switch label="Published" hint="Drafts are hidden from the public." checked={edit.status === 'published'} onChange={(v) => setEdit({ ...edit, status: v ? 'published' : 'draft' })} /><Switch label="Cancelled" checked={!!edit.cancelled} onChange={(v) => setEdit({ ...edit, cancelled: v })} /></div>
        </div>}
      </Modal>
      <Confirm open={!!del} onClose={() => setDel(null)} title="Delete this event?" body="It disappears from the site and from calendar feeds." confirmLabel="Delete" danger busy={rm.busy} onConfirm={() => rm.run(del!)} />
    </>
  );
}

function NewsAdmin() {
  const q = useQuery({ queryKey: ['news', 'admin'], queryFn: () => api.news(true) });
  const [edit, setEdit] = useState<Partial<NewsItem> | null>(null); const [del, setDel] = useState<string | null>(null);
  const save = useAction(api.saveNews, { success: 'Article saved', onSuccess: () => setEdit(null) });
  const rm = useAction(api.deleteNews, { success: 'Article deleted', onSuccess: () => setDel(null) });
  return (
    <>
      <div className="flex justify-end mb-4"><Button icon={<Plus size={16} />} onClick={() => setEdit({ title: '', summary: '', body: '', status: 'draft', image: 'market' })}>New article</Button></div>
      {!q.data ? <RowsSkeleton /> : <ul className="card divide-y divide-line">{q.data.map((n) => <li key={n.id} className="p-4 flex items-center gap-3"><div className="min-w-0 flex-1"><p className="font-semibold">{n.title}</p><p className="text-sm text-muted">{fmtDate(n.publishedAt)} · {n.author}</p></div><StatusBadge status={n.status === 'draft' ? 'draft' : 'published'} /><button className="btn-icon" aria-label={`Edit ${n.title}`} onClick={() => setEdit(n)}><Pencil size={16} /></button><button className="btn-icon text-danger" aria-label={`Delete ${n.title}`} onClick={() => setDel(n.id)}><Trash2 size={16} /></button></li>)}</ul>}
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Edit article' : 'New article'} size="lg" footer={<><Button variant="secondary" onClick={() => setEdit(null)}>Cancel</Button><Button busy={save.busy} onClick={() => save.run(edit!)}>Save</Button></>}>
        {edit && <div className="space-y-4">
          <Field label="Title" error={save.errors.title}>{(p) => <Input {...p} value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} />}</Field>
          <Field label="Summary" error={save.errors.summary}>{(p) => <Input {...p} value={edit.summary} onChange={(e) => setEdit({ ...edit, summary: e.target.value })} />}</Field>
          <Field label="Body">{(p) => <Textarea {...p} rows={6} value={edit.body} onChange={(e) => setEdit({ ...edit, body: e.target.value })} />}</Field>
          <Field label="Picture">{(p) => <Select {...p} value={edit.image} onChange={(e) => setEdit({ ...edit, image: e.target.value })}>{['market', 'cold-chain', 'storage', 'drying', 'research', 'heritage'].map((i) => <option key={i} value={i}>{i}</option>)}</Select>}</Field>
          <Switch label="Published" checked={edit.status === 'published'} onChange={(v) => setEdit({ ...edit, status: v ? 'published' : 'draft' })} />
        </div>}
      </Modal>
      <Confirm open={!!del} onClose={() => setDel(null)} title="Delete this article?" body="This cannot be undone." confirmLabel="Delete" danger busy={rm.busy} onConfirm={() => rm.run(del!)} />
    </>
  );
}

function OppsAdmin() {
  const q = useQuery({ queryKey: ['opps', 'admin'], queryFn: () => api.opportunities(true) });
  const [edit, setEdit] = useState<Partial<Opportunity> | null>(null);
  const save = useAction(api.saveOpportunity, { success: 'Opportunity saved', onSuccess: () => setEdit(null) });
  const rm = useAction(api.deleteOpportunity, { success: 'Opportunity deleted' });
  return (
    <>
      <div className="flex justify-end mb-4"><Button icon={<Plus size={16} />} onClick={() => setEdit({ title: '', kind: 'collaboration', owner: '', summary: '', eligibility: '', timezone: 'Africa/Nairobi', contact: '', status: 'draft', countries: [] })}>New opportunity</Button></div>
      {!q.data ? <RowsSkeleton /> : <ul className="card divide-y divide-line">{q.data.map((o) => <li key={o.id} className="p-4 flex items-center gap-3"><div className="min-w-0 flex-1"><p className="font-semibold">{o.title}</p><p className="text-sm text-muted capitalize">{o.kind} · {o.deadline ? `deadline ${fmtDate(o.deadline)}` : 'no deadline'}</p></div><StatusBadge status={o.status === 'draft' ? 'draft' : 'published'} /><button className="btn-icon" aria-label={`Edit ${o.title}`} onClick={() => setEdit(o)}><Pencil size={16} /></button><button className="btn-icon text-danger" aria-label={`Delete ${o.title}`} onClick={() => rm.run(o.id)}><Trash2 size={16} /></button></li>)}</ul>}
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Edit opportunity' : 'New opportunity'} size="lg" footer={<><Button variant="secondary" onClick={() => setEdit(null)}>Cancel</Button><Button busy={save.busy} onClick={() => save.run(edit!)}>Save</Button></>}>
        {edit && <div className="space-y-4">
          <Field label="Title" error={save.errors.title}>{(p) => <Input {...p} value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} />}</Field>
          <div className="grid sm:grid-cols-2 gap-4"><Field label="Type">{(p) => <Select {...p} value={edit.kind} onChange={(e) => setEdit({ ...edit, kind: e.target.value as Opportunity['kind'] })}>{['collaboration', 'funding', 'partnership', 'fellowship'].map((k) => <option key={k} value={k} className="capitalize">{k}</option>)}</Select>}</Field>
            <Field label="Owner" error={save.errors.owner}>{(p) => <Input {...p} value={edit.owner} onChange={(e) => setEdit({ ...edit, owner: e.target.value })} />}</Field></div>
          <Field label="Summary">{(p) => <Textarea {...p} rows={3} value={edit.summary} onChange={(e) => setEdit({ ...edit, summary: e.target.value })} />}</Field>
          <Field label="Eligibility">{(p) => <Input {...p} value={edit.eligibility} onChange={(e) => setEdit({ ...edit, eligibility: e.target.value })} />}</Field>
          <div className="grid sm:grid-cols-2 gap-4"><Field label="Deadline (your local time)" optional>{(p) => <Input {...p} type="datetime-local" value={toLocalInput(edit.deadline)} onChange={(e) => setEdit({ ...edit, deadline: fromLocalInput(e.target.value) || undefined })} />}</Field>
            <Field label="Deadline time zone" error={save.errors.timezone}>{(p) => <Select {...p} value={edit.timezone} onChange={(e) => setEdit({ ...edit, timezone: e.target.value })}>{TIMEZONES.map((t) => <option key={t}>{t}</option>)}</Select>}</Field></div>
          <Field label="How to respond" error={save.errors.contact}>{(p) => <Input {...p} value={edit.contact} onChange={(e) => setEdit({ ...edit, contact: e.target.value })} />}</Field>
          <Switch label="Published" checked={edit.status === 'published'} onChange={(v) => setEdit({ ...edit, status: v ? 'published' : 'draft' })} />
        </div>}
      </Modal>
    </>
  );
}

function HelpAdmin() {
  const q = useQuery({ queryKey: ['help', ''], queryFn: () => api.help('') });
  const [edit, setEdit] = useState<Partial<HelpArticle> | null>(null);
  const save = useAction(api.saveHelp, { success: 'Help article saved', onSuccess: () => setEdit(null) });
  return (
    <>
      <div className="flex justify-end mb-4"><Button icon={<Plus size={16} />} onClick={() => setEdit({ title: '', category: 'Using the site', body: '' })}>New article</Button></div>
      {!q.data ? <RowsSkeleton /> : <ul className="card divide-y divide-line">{q.data.map((h) => <li key={h.id} className="p-4 flex items-center gap-3"><div className="min-w-0 flex-1"><p className="font-semibold">{h.title}</p><p className="text-sm text-muted">{h.category} · updated {fmtDate(h.updatedAt)}</p></div><Link to={`/help/${h.slug}`} className="btn-icon" aria-label="View"><Eye size={16} /></Link><button className="btn-icon" aria-label={`Edit ${h.title}`} onClick={() => setEdit(h)}><Pencil size={16} /></button></li>)}</ul>}
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Edit help article' : 'New help article'} size="lg" footer={<><Button variant="secondary" onClick={() => setEdit(null)}>Cancel</Button><Button busy={save.busy} onClick={() => save.run(edit!)}>Save</Button></>}>
        {edit && <div className="space-y-4"><Field label="Title" error={save.errors.title}>{(p) => <Input {...p} value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} />}</Field>
          <Field label="Category">{(p) => <Select {...p} value={edit.category} onChange={(e) => setEdit({ ...edit, category: e.target.value })}>{['Membership', 'Knowledge hub', 'Account and security', 'Privacy', 'Using the site'].map((c) => <option key={c}>{c}</option>)}</Select>}</Field>
          <Field label="Body">{(p) => <Textarea {...p} rows={8} value={edit.body} onChange={(e) => setEdit({ ...edit, body: e.target.value })} />}</Field></div>}
      </Modal>
    </>
  );
}

const ALL_ROLES: Role[] = ['reviewer', 'moderator', 'editor', 'admin'];
export function Users() {
  useDocTitle('Users and roles');
  const { user: me } = useSession();
  const [q, setQ] = useState(''); const dq = useDebounced(q, 250); const [status, setStatus] = useState(''); const [role, setRole] = useState('');
  const list = useQuery({ queryKey: ['users', dq, status, role], queryFn: () => api.users({ q: dq, status, role }), placeholderData: (p) => p });
  const [rolesFor, setRolesFor] = useState<{ id: string; name: string; roles: Role[] } | null>(null); const [reason, setReason] = useState('');
  const setRoles = useAction(api.setRoles, { success: 'Roles updated', onSuccess: () => { setRolesFor(null); setReason(''); } });
  const [statusFor, setStatusFor] = useState<{ id: string; name: string; to: 'suspended' | 'approved' } | null>(null);
  const setSt = useAction(api.setUserStatus, { success: 'Account updated', onSuccess: () => { setStatusFor(null); setReason(''); } });
  return (
    <>
      <PageHeader title="Users and roles" intro="Grant and revoke staff roles, and suspend or reactivate accounts. Every change is recorded with your reason." />
      <div className="grid gap-3 md:grid-cols-[1fr_200px_200px] mb-4">
        <div className="relative"><Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" /><input aria-label="Search users" className="input !pl-10" placeholder="Name or email" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <Select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Any status</option>{['approved', 'pending', 'unverified', 'suspended', 'closure_pending', 'rejected', 'closed'].map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}</Select>
        <Select aria-label="Role" value={role} onChange={(e) => setRole(e.target.value)}><option value="">Any role</option>{ALL_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</Select>
      </div>
      {!list.data ? <RowsSkeleton /> : <div className="card overflow-x-auto"><table className="tbl"><thead><tr><th>Person</th><th>Status</th><th>Roles</th><th>Two-step</th><th></th></tr></thead><tbody>{list.data.map((u) => (
        <tr key={u.id}><td><div className="flex items-center gap-3"><Avatar name={u.name} hue={u.avatarHue} size={34} /><div className="min-w-0"><p className="font-semibold">{u.name}</p><p className="text-sm text-muted">{u.email}</p></div></div></td>
          <td><StatusBadge status={u.status} /></td><td><div className="flex flex-wrap gap-1">{u.roles.filter((r) => r !== 'member').map((r) => <Badge key={r} tone="terracotta">{ROLE_LABEL[r]}</Badge>)}{u.roles.length === 1 && <span className="text-sm text-muted">Member</span>}</div></td>
          <td>{u.mfaEnabled ? <Badge tone="green">On</Badge> : <Badge>Off</Badge>}</td>
          <td className="text-right whitespace-nowrap"><Button size="sm" variant="secondary" onClick={() => setRolesFor({ id: u.id, name: u.name, roles: u.roles })}>Roles</Button>
            {u.id !== me?.id && (u.status === 'suspended' ? <Button size="sm" variant="ghost" icon={<RotateCcw size={14} />} onClick={() => setStatusFor({ id: u.id, name: u.name, to: 'approved' })}>Reactivate</Button> : u.status === 'approved' && <Button size="sm" variant="ghost" className="text-danger" icon={<Ban size={14} />} onClick={() => setStatusFor({ id: u.id, name: u.name, to: 'suspended' })}>Suspend</Button>)}</td></tr>))}</tbody></table></div>}
      <Modal open={!!rolesFor} onClose={() => setRolesFor(null)} title={`Roles for ${rolesFor?.name}`} footer={<><Button variant="secondary" onClick={() => setRolesFor(null)}>Cancel</Button><Button busy={setRoles.busy} onClick={() => setRoles.run(rolesFor!.id, rolesFor!.roles.filter((r) => r !== 'member'), reason)}>Save roles</Button></>}>
        {rolesFor && <div className="space-y-2">
          {ALL_ROLES.map((r) => <CheckBox key={r} label={ROLE_LABEL[r]} hint={{ reviewer: 'Decides on applications and submissions', moderator: 'Handles conduct reports and discussions', editor: 'Publishes pages, events, news and newsletters', admin: 'Manages users, roles, taxonomy and privacy requests' }[r as 'reviewer']} checked={rolesFor.roles.includes(r)} onChange={(v) => setRolesFor({ ...rolesFor, roles: v ? [...rolesFor.roles, r] : rolesFor.roles.filter((x) => x !== r) })} />)}
          <Alert tone="info">Staff roles require two-step sign-in. The person is told to turn it on.</Alert>
          <div className="pt-2"><Field label="Reason for this change" error={setRoles.errors.reason}>{(p) => <Input {...p} value={reason} onChange={(e) => setReason(e.target.value)} />}</Field></div>
        </div>}
      </Modal>
      <Modal open={!!statusFor} onClose={() => setStatusFor(null)} title={statusFor?.to === 'suspended' ? `Suspend ${statusFor?.name}?` : `Reactivate ${statusFor?.name}?`} footer={<><Button variant="secondary" onClick={() => setStatusFor(null)}>Cancel</Button><Button variant={statusFor?.to === 'suspended' ? 'danger' : 'primary'} busy={setSt.busy} onClick={() => setSt.run(statusFor!.id, statusFor!.to, reason)}>{statusFor?.to === 'suspended' ? 'Suspend account' : 'Reactivate'}</Button></>}>
        <p className="text-muted mb-4">{statusFor?.to === 'suspended' ? 'Their active sessions end immediately and they cannot post or sign in. They receive an email with your reason.' : 'They can sign in again straight away.'}</p>
        <Field label="Reason" error={setSt.errors.reason}>{(p) => <Textarea {...p} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />}</Field>
      </Modal>
    </>
  );
}

export function OrganisationsAdmin() {
  useDocTitle('Organisations');
  const q = useQuery({ queryKey: ['admin-orgs'], queryFn: api.adminOrganisations });
  const d = useAction(api.decideOrganisation, { success: 'Organisation updated' });
  return (
    <>
      <PageHeader title="Organisations" intro="Approve organisations proposed by members. The proposer becomes the organisation’s representative." />
      {!q.data ? <RowsSkeleton /> : <ul className="card divide-y divide-line">{q.data.map((o) => (
        <li key={o.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3"><div className="min-w-0 flex-1"><p className="font-semibold">{o.name}</p><p className="text-sm text-muted">{o.type} · {country(o.country)} · representative: {o.repName}</p></div>
          {o.status === 'pending' ? <div className="flex gap-2"><Button size="sm" icon={<Check size={14} />} onClick={() => d.run(o.id, true)}>Approve</Button><Button size="sm" variant="ghost" icon={<X size={14} />} onClick={() => d.run(o.id, false)}>Reject</Button></div> : <Badge tone="green">Approved</Badge>}</li>))}</ul>}
    </>
  );
}

const VOCABS: [keyof Taxonomy, string][] = [['topics', 'Topics'], ['countries', 'Countries'], ['categories', 'Stakeholder groups'], ['languages', 'Languages']];
export function TaxonomyAdmin() {
  useDocTitle('Taxonomy');
  const [v, setV] = useState<keyof Taxonomy>('topics');
  const q = useQuery({ queryKey: ['taxonomy'], queryFn: api.taxonomy });
  const usage = useQuery({ queryKey: ['term-usage', v], queryFn: () => api.termUsage(v) });
  const [label, setLabel] = useState(''); const [ren, setRen] = useState<{ id: string; label: string } | null>(null);
  const add = useAction(api.addTerm, { success: 'Term added', onSuccess: () => setLabel('') });
  const rename = useAction(api.renameTerm, { success: 'Term renamed. Linked records keep their link.', onSuccess: () => setRen(null) });
  const toggle = useAction(api.toggleTerm, { success: 'Term updated' });
  return (
    <>
      <PageHeader title="Taxonomy" intro="Controlled vocabularies used for search and profiles. Terms in use are deprecated, never deleted, so existing records stay intact." />
      <Tabs label="Vocabulary" value={v} onChange={setV} tabs={VOCABS.map(([id, l]) => ({ id, label: l, count: q.data?.[id].length }))} />
      <form className="flex gap-2 my-5 max-w-lg" onSubmit={(e) => { e.preventDefault(); add.run(v, label); }}><Input aria-label="New term" placeholder="New term label" value={label} onChange={(e) => setLabel(e.target.value)} /><Button type="submit" busy={add.busy} icon={<Plus size={16} />}>Add</Button></form>
      {add.errors.label && <p className="field-error -mt-3 mb-3">{add.errors.label}</p>}
      {!q.data ? <RowsSkeleton /> : <div className="card overflow-x-auto"><table className="tbl"><thead><tr><th>Label</th><th>Identifier</th><th>Used by</th><th>Status</th><th></th></tr></thead><tbody>{q.data[v].map((t) => (
        <tr key={t.id} className={cn(t.deprecated && 'opacity-60')}><td className="font-medium">{t.label}</td><td className="font-mono text-sm text-muted">{t.id}</td><td className="tabular">{usage.data?.[t.id] ?? 0}</td><td>{t.deprecated ? <Badge>Deprecated</Badge> : <Badge tone="green">Active</Badge>}</td>
          <td className="text-right whitespace-nowrap"><button className="btn-icon" aria-label={`Rename ${t.label}`} onClick={() => setRen({ id: t.id, label: t.label })}><Pencil size={16} /></button><Button size="sm" variant="ghost" onClick={() => toggle.run(v, t.id)}>{t.deprecated ? 'Restore' : 'Deprecate'}</Button></td></tr>))}</tbody></table></div>}
      <Modal open={!!ren} onClose={() => setRen(null)} title="Rename term" footer={<><Button variant="secondary" onClick={() => setRen(null)}>Cancel</Button><Button busy={rename.busy} onClick={() => rename.run(v, ren!.id, ren!.label)}>Rename</Button></>}>
        {ren && <Field label="Label">{(p) => <Input {...p} value={ren.label} onChange={(e) => setRen({ ...ren, label: e.target.value })} />}</Field>}
      </Modal>
    </>
  );
}

export function Reports() {
  useDocTitle('Reports');
  const [days, setDays] = useState(90);
  const q = useQuery({ queryKey: ['report', days], queryFn: () => api.reportSummary(days) });
  const d = q.data;
  const axis = { tick: { fill: 'var(--muted)', fontSize: 12 }, axisLine: false, tickLine: false };
  const tip = { contentStyle: { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10, color: 'var(--fg)' }, cursor: { fill: 'var(--surface-2)' } };
  return (
    <>
      <PageHeader title="Reports" intro="Aggregate platform activity. These are not measurements of reduced food loss." actions={<Select aria-label="Period" className="!w-auto" value={days} onChange={(e) => setDays(Number(e.target.value))}><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option><option value={365}>Last 12 months</option></Select>} />
      {q.isError ? <ErrorState error={q.error} /> : !d ? <RowsSkeleton /> : <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">{[['Active members', d.totals.activeMembers], ['Published resources', d.totals.publishedResources], ['New resources', d.totals.newResources], ['Events', d.totals.events], ['Posts', d.totals.posts], ['Applications', d.totals.applications]].map(([k, v]) => <div key={k as string} className="card p-4"><p className="text-sm text-muted">{k}</p><p className="font-display font-bold text-[28px] text-primary tabular leading-tight">{v}</p></div>)}</div>
        <section className="card p-5"><h2 className="text-lg mb-1">Activity by month</h2><p className="text-sm text-muted mb-3">Discussion posts, newly published resources and approved members.</p>
          <div className="h-64 -ml-3"><ResponsiveContainer width="100%" height="100%"><BarChart data={d.monthly.map((m) => ({ ...m, label: new Date(m.month + '-01T00:00:00Z').toLocaleDateString('en-GB', { month: 'short', year: '2-digit', timeZone: 'UTC' }) }))} barGap={2}><CartesianGrid vertical={false} stroke="var(--line)" /><XAxis dataKey="label" {...axis} /><YAxis {...axis} width={32} allowDecimals={false} /><Tooltip {...tip} /><Legend wrapperStyle={{ color: 'var(--muted)', fontSize: 13 }} />
            <Bar dataKey="posts" name="Posts" fill="var(--primary)" radius={[4, 4, 0, 0]} /><Bar dataKey="resources" name="Resources published" fill="var(--secondary)" radius={[4, 4, 0, 0]} /><Bar dataKey="members" name="Members approved" fill="var(--accent)" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div></section>
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="card p-5"><h2 className="text-lg mb-3">Members by country</h2><div className="h-72 -ml-3"><ResponsiveContainer width="100%" height="100%"><BarChart layout="vertical" data={d.byCountry.filter((x) => x.value !== null).map((x) => ({ k: country(x.key), v: x.value }))}><CartesianGrid horizontal={false} stroke="var(--line)" /><XAxis type="number" {...axis} allowDecimals={false} /><YAxis type="category" dataKey="k" {...axis} width={100} /><Tooltip {...tip} /><Bar dataKey="v" name="Members" fill="var(--primary)" radius={[0, 6, 6, 0]} /></BarChart></ResponsiveContainer></div>
            <p className="text-xs text-faint mt-2">{d.byCountry.filter((x) => x.value === null).length} countries with fewer than {d.threshold} members are not shown.</p></section>
          <section className="card p-5"><h2 className="text-lg mb-3">Members by group</h2><table className="tbl"><thead><tr><th>Group</th><th>Members</th></tr></thead><tbody>{d.byCategory.map((x) => <tr key={x.key}><td>{category(x.key)}</td><td className="tabular">{x.value ?? `Fewer than ${d.threshold}`}</td></tr>)}</tbody></table></section>
        </div>
        <section className="card p-5"><h2 className="text-lg mb-3">Published resources by type</h2><table className="tbl"><thead><tr><th>Type</th><th>Resources</th></tr></thead><tbody>{d.byType.map((x) => <tr key={x.key}><td>{TYPE_LABEL[x.key as keyof typeof TYPE_LABEL]}</td><td className="tabular">{x.value ?? `Fewer than ${d.threshold}`}</td></tr>)}</tbody></table></section>
        <p className="text-xs text-faint">Generated {fmtDate(d.generatedAt, { dateStyle: 'medium', timeStyle: 'short' } as Intl.DateTimeFormatOptions)} · time zone {d.timezone} · groups under {d.threshold} suppressed (proposed threshold, decision D11).</p>
      </div>}
    </>
  );
}

export function Newsletters() {
  useDocTitle('Newsletters');
  const q = useQuery({ queryKey: ['newsletters'], queryFn: api.newsletters });
  const [f, setF] = useState({ subject: '', body: '', topics: [] as string[], countries: [] as string[], categories: [] as string[] });
  const seg = { topics: f.topics, countries: f.countries, categories: f.categories };
  const count = useQuery({ queryKey: ['segment', seg], queryFn: () => api.segmentCount(seg) });
  const [confirm, setConfirm] = useState(false);
  const send = useAction(api.sendNewsletter, { success: (n) => `Sent to ${n} subscribers`, onSuccess: () => { setConfirm(false); setF({ subject: '', body: '', topics: [], countries: [], categories: [] }); } });
  return (
    <>
      <PageHeader title="Newsletters" intro="Send updates to members who subscribed. Only people who opted in receive them, and every email has a one-click unsubscribe." />
      <div className="grid gap-8 xl:grid-cols-[1fr_360px]">
        <form className="card p-5 space-y-5" onSubmit={(e) => { e.preventDefault(); setConfirm(true); }}>
          <Field label="Subject" error={send.errors.subject}>{(p) => <Input {...p} value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} />}</Field>
          <Field label="Message">{(p) => <Textarea {...p} rows={7} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} />}</Field>
          <fieldset><legend className="label">Send to subscribers interested in</legend><p className="hint mb-2">Leave empty to include all topics.</p><ChipSelect label="Topics" options={TAXONOMY.topics} value={f.topics} onChange={(v) => setF({ ...f, topics: v })} /></fieldset>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Country" optional>{(p) => <Select {...p} value={f.countries[0] ?? ''} onChange={(e) => setF({ ...f, countries: e.target.value ? [e.target.value] : [] })}><option value="">All countries</option>{TAXONOMY.countries.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</Select>}</Field>
            <Field label="Stakeholder group" optional>{(p) => <Select {...p} value={f.categories[0] ?? ''} onChange={(e) => setF({ ...f, categories: e.target.value ? [e.target.value] : [] })}><option value="">All groups</option>{TAXONOMY.categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</Select>}</Field>
          </div>
          <div className="flex items-center justify-between gap-3 flex-wrap panel p-4"><p><span className="font-display font-bold text-2xl text-primary tabular">{count.data ?? '…'}</span> <span className="text-muted">subscribers match</span></p><Button type="submit" icon={<Send size={16} />} disabled={!count.data}>Review and send</Button></div>
        </form>
        <section><h2 className="text-lg mb-3">Sent</h2>{!q.data ? <RowsSkeleton n={2} /> : q.data.length === 0 ? <p className="text-muted">Nothing sent yet.</p> : <ul className="space-y-3">{q.data.map((n) => <li key={n.id} className="card p-4"><p className="font-semibold">{n.subject}</p><p className="text-sm text-muted">{fmtDate(n.sentAt)} · {n.recipients} recipients · by {n.sentByName}</p></li>)}</ul>}</section>
      </div>
      <Confirm open={confirm} onClose={() => setConfirm(false)} title={`Send to ${count.data} subscribers?`} body={<>“{f.subject || 'No subject'}” will be queued and sent now. In this demo the emails appear in the Demo inbox.</>} confirmLabel="Send newsletter" busy={send.busy} onConfirm={() => send.run(f.subject, f.body, seg)} />
    </>
  );
}

export function MentorshipPool() {
  useDocTitle('Mentorship pool');
  const q = useQuery({ queryKey: ['mentor-pool'], queryFn: api.mentorshipPool });
  return (
    <>
      <PageHeader title="Mentorship pool" intro="Members who registered interest. Only opted-in members appear; withdrawal removes them immediately." />
      {!q.data ? <RowsSkeleton /> : q.data.length === 0 ? <Empty title="No one has registered yet" /> : <div className="card overflow-x-auto"><table className="tbl"><thead><tr><th>Member</th><th>Role</th><th>Topics</th><th>Note</th></tr></thead><tbody>{q.data.map((m) => (
        <tr key={m.id}><td><Link to={`/members/${m.id}`} className="font-semibold link">{m.name}</Link><p className="text-sm text-muted">{category(m.category)} · {country(m.country)}</p></td><td><Badge tone={m.role === 'mentor' ? 'green' : m.role === 'mentee' ? 'gold' : 'blue'}>{m.role}</Badge></td><td className="text-sm">{m.topics.map(topic).join(', ')}</td><td className="text-sm text-muted max-w-xs">{m.note}</td></tr>))}</tbody></table></div>}
    </>
  );
}

export function Audit() {
  useDocTitle('Audit trail');
  const [q, setQ] = useState(''); const dq = useDebounced(q, 250); const [result, setResult] = useState('');
  const r = useQuery({ queryKey: ['audit', dq, result], queryFn: () => api.audit({ q: dq, result }), placeholderData: (p) => p });
  const toast = useToast();
  const exportCsv = async () => {
    const rows = [['time_utc', 'actor', 'action', 'object', 'result', 'correlation_id'], ...(r.data ?? []).map((a) => [a.at, a.actorName, a.action, a.object, a.result, a.correlationId])];
    const csv = rows.map((x) => x.map((c) => `"${String(c).replace(/"/g, '""').replace(/^[=+\-@]/, "'$&")}"`).join(',')).join('\n');
    try { await navigator.clipboard.writeText(csv); toast({ kind: 'success', text: `Copied ${rows.length - 1} rows as CSV` }); } catch { toast({ kind: 'info', text: 'Clipboard not available here' }); }
  };
  return (
    <>
      <PageHeader title="Audit trail" intro="Security events, privileged changes, moderation decisions and exports. Records are append-only and contain no secrets or message bodies." actions={<Button variant="secondary" icon={<Download size={16} />} onClick={exportCsv}>Copy as CSV</Button>} />
      <div className="grid gap-3 md:grid-cols-[1fr_200px] mb-4"><div className="relative"><Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" /><input aria-label="Search audit" className="input !pl-10" placeholder="Action, object or person" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <Select aria-label="Result" value={result} onChange={(e) => setResult(e.target.value)}><option value="">All results</option><option value="success">Success</option><option value="denied">Denied</option><option value="failure">Failure</option></Select></div>
      {!r.data ? <RowsSkeleton /> : <div className="card overflow-x-auto"><table className="tbl"><thead><tr><th>Time (UTC)</th><th>Actor</th><th>Action</th><th>Object</th><th>Result</th><th>Correlation</th></tr></thead><tbody>{r.data.map((a) => (
        <tr key={a.id}><td className="text-sm whitespace-nowrap tabular">{a.at.replace('T', ' ').slice(0, 19)}</td><td className="text-sm whitespace-nowrap">{a.actorName}</td><td className="font-mono text-sm">{a.action}</td><td className="text-sm max-w-xs break-words">{a.object}</td><td><Badge tone={a.result === 'success' ? 'green' : a.result === 'denied' ? 'gold' : 'red'}>{a.result}</Badge></td><td className="font-mono text-xs text-muted">{a.correlationId}</td></tr>))}</tbody></table></div>}
    </>
  );
}
export { Alert, Trash2 };
