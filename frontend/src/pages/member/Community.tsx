import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Flag, Lock, MessagesSquare, Plus, Search, Trash2, Unlock, HandHeart, Briefcase, UserPlus, Crown, LogOut, X, FileText, StickyNote, Check } from 'lucide-react';
import { api } from '@/api';
import { TAXONOMY } from '@/api/seed';
import { topic } from '@/lib/labels';
import { timeAgo, fmtDate } from '@/lib/format';
import { useAction, useDebounced, useDocTitle } from '@/lib/hooks';
import { useSession } from '@/lib/session';
import { Alert, Avatar, Badge, Button, ChipSelect, Empty, ErrorState, Field, Input, Modal, PageHeader, RowsSkeleton, Select, Textarea, Confirm, StatusBadge } from '@/components/ui';
import { ResourceCard } from '@/components/domain';
import { cn } from '@/lib/cn';

export function Community() {
  useDocTitle('Community');
  const [t, setT] = useState(''); const [q, setQ] = useState(''); const dq = useDebounced(q, 300);
  const r = useQuery({ queryKey: ['threads', t, dq], queryFn: () => api.threads({ topic: t || undefined, q: dq }), placeholderData: (p) => p });
  const [open, setOpen] = useState(false); const nav = useNavigate();
  const [f, setF] = useState({ title: '', topic: '', body: '' });
  const create = useAction(api.createThread, { success: 'Discussion started', onSuccess: (id) => { setOpen(false); setF({ title: '', topic: '', body: '' }); nav(`/community/${id}`); } });
  return (
    <>
      <PageHeader title="Community discussions" intro="Ask questions, share experience and learn from members across the continent. Discussions are visible to members only." actions={<Button icon={<Plus size={18} />} onClick={() => setOpen(true)}>Start a discussion</Button>} />
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1"><Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" /><label htmlFor="cq" className="sr-only">Search discussions</label><input id="cq" className="input !pl-10" placeholder="Search discussions" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <Select aria-label="Topic" className="sm:!w-60" value={t} onChange={(e) => setT(e.target.value)}><option value="">All topics</option>{TAXONOMY.topics.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</Select>
      </div>
      {r.isError ? <ErrorState error={r.error} retry={() => r.refetch()} /> : !r.data ? <RowsSkeleton /> : r.data.length === 0 ? <Empty icon={<MessagesSquare size={22} />} title="No discussions found" body="Start one and invite others to join." action={<Button onClick={() => setOpen(true)}>Start a discussion</Button>} /> : (
        <ul className="card divide-y divide-line">{r.data.map((d) => (
          <li key={d.id}><Link to={`/community/${d.id}`} className="flex gap-3 p-4 no-underline hover:bg-surface-2">
            <Avatar name={d.authorName} hue={d.authorHue} />
            <div className="min-w-0 flex-1"><p className="font-semibold leading-snug">{d.title}</p>
              <div className="flex gap-2 flex-wrap items-center mt-1 text-sm text-muted"><Badge tone="green">{topic(d.topic)}</Badge>{d.status === 'locked' && <Badge icon={<Lock size={11} />}>Closed</Badge>}<span>{d.authorName}</span><span>·</span><span>{d.replies} {d.replies === 1 ? 'reply' : 'replies'}</span><span>·</span><span>{timeAgo(d.lastAt)}</span></div></div>
          </Link></li>))}</ul>)}
      <Modal open={open} onClose={() => setOpen(false)} title="Start a discussion" size="lg" footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button busy={create.busy} onClick={() => create.run(f)}>Post discussion</Button></>}>
        <div className="space-y-4">
          <Field label="Title" error={create.errors.title} hint="A clear question or topic gets better answers.">{(p) => <Input {...p} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />}</Field>
          <Field label="Topic" error={create.errors.topic}>{(p) => <Select {...p} value={f.topic} onChange={(e) => setF({ ...f, topic: e.target.value })}><option value="">Choose…</option>{TAXONOMY.topics.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</Select>}</Field>
          <Field label="Message" error={create.errors.body}>{(p) => <Textarea {...p} rows={6} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} />}</Field>
          <p className="text-sm text-muted">Follow the <Link to="/policies" className="link">community conduct rules</Link>. Do not share other people’s personal data.</p>
        </div>
      </Modal>
    </>
  );
}

export function ThreadPage() {
  const { id = '' } = useParams();
  const q = useQuery({ queryKey: ['thread', id], queryFn: () => api.thread(id), retry: false });
  const [body, setBody] = useState('');
  const reply = useAction(api.reply, { success: 'Reply posted', onSuccess: () => setBody('') });
  const [report, setReport] = useState<string | null>(null); const [reason, setReason] = useState('Spam or advertising'); const [details, setDetails] = useState('');
  const rep = useAction(api.report, { success: 'Thanks. A moderator will review this.', onSuccess: () => { setReport(null); setDetails(''); } });
  const mod = useAction(api.moderateThread, { success: 'Discussion updated' });
  const [rm, setRm] = useState<string | null>(null); const [rmReason, setRmReason] = useState('');
  const remove = useAction(api.removePost, { success: 'Post removed', onSuccess: () => setRm(null) });
  useDocTitle(q.data?.title ?? 'Discussion');
  if (q.isError) return <ErrorState error={q.error} />;
  if (!q.data) return <RowsSkeleton />;
  const t = q.data;
  return (
    <>
      <Link to="/community" className="link inline-flex items-center gap-1 mb-5"><ArrowLeft size={16} />All discussions</Link>
      <div className="flex gap-2 mb-2 flex-wrap"><Badge tone="green">{topic(t.topic)}</Badge>{t.status === 'locked' && <Badge icon={<Lock size={11} />}>Closed to replies</Badge>}</div>
      <h1 className="text-[26px] md:text-[32px]">{t.title}</h1>
      {t.canModerate && <div className="flex gap-2 mt-3 flex-wrap"><Badge tone="terracotta">Moderator tools</Badge>
        {t.status === 'open' ? <Button size="sm" variant="secondary" icon={<Lock size={14} />} onClick={() => mod.run(t.id, 'lock')}>Close to replies</Button> : <Button size="sm" variant="secondary" icon={<Unlock size={14} />} onClick={() => mod.run(t.id, 'unlock')}>Reopen</Button>}</div>}
      <ol className="mt-6 space-y-4">{t.posts.map((p, i) => (
        <li key={p.id} className={cn('card p-4 md:p-5', i === 0 && 'border-primary/40')}>
          <div className="flex items-center gap-3"><Avatar name={p.authorName} hue={p.authorHue} size={36} /><div className="flex-1 min-w-0"><p className="font-semibold">{p.authorName}{i === 0 && <span className="text-xs text-muted font-normal ml-2">started the discussion</span>}</p><p className="text-xs text-faint">{timeAgo(p.createdAt)}</p></div>
            {p.status === 'visible' && !p.mine && (p.reported ? <span className="text-xs text-muted">Reported</span> : <button className="btn-icon text-muted" aria-label="Report this post" title="Report" onClick={() => setReport(p.id)}><Flag size={16} /></button>)}
            {t.canModerate && p.status === 'visible' && <button className="btn-icon text-danger" aria-label="Remove this post" title="Remove" onClick={() => setRm(p.id)}><Trash2 size={16} /></button>}</div>
          {p.status === 'removed' ? <p className="mt-3 text-muted italic">This post was removed by a moderator.</p> : <p className="mt-3 whitespace-pre-wrap text-[16px]">{p.body}</p>}
        </li>))}</ol>
      {t.status === 'open' ? (
        <form className="card p-4 md:p-5 mt-6 space-y-3" onSubmit={(e) => { e.preventDefault(); reply.run(t.id, body); }}>
          <Field label="Your reply" error={reply.errors.body}>{(p) => <Textarea {...p} rows={4} value={body} onChange={(e) => setBody(e.target.value)} />}</Field>
          <div className="flex justify-end"><Button type="submit" busy={reply.busy}>Post reply</Button></div>
        </form>) : <div className="mt-6"><Alert tone="info" icon={<Lock size={18} />}>This discussion is closed to new replies.</Alert></div>}
      <Modal open={!!report} onClose={() => setReport(null)} title="Report this post" footer={<><Button variant="secondary" onClick={() => setReport(null)}>Cancel</Button><Button busy={rep.busy} onClick={() => rep.run({ targetType: 'post', targetId: report!, threadId: t.id, reason, details })}>Send report</Button></>}>
        <div className="space-y-4"><Field label="Reason" error={rep.errors.reason}>{(p) => <Select {...p} value={reason} onChange={(e) => setReason(e.target.value)}>{['Spam or advertising', 'Harassment or abuse', 'Misinformation', 'Sharing personal data', 'Off topic', 'Other'].map((r) => <option key={r}>{r}</option>)}</Select>}</Field>
          <Field label="Details" optional>{(p) => <Textarea {...p} rows={3} value={details} onChange={(e) => setDetails(e.target.value)} />}</Field>
          <p className="text-sm text-muted">Only moderators see who reported a post.</p></div>
      </Modal>
      <Confirm open={!!rm} onClose={() => setRm(null)} title="Remove this post?" body="The post is hidden and replaced with a notice. The author is told, and the action is recorded in the audit trail." confirmLabel="Remove post" danger busy={remove.busy} onConfirm={() => remove.run(rm!, rmReason || 'Breaks community rules')}>
        <div className="mt-4"><Field label="Reason">{(p) => <Input {...p} value={rmReason} onChange={(e) => setRmReason(e.target.value)} placeholder="Breaks community rules" />}</Field></div>
      </Confirm>
    </>
  );
}

export function Mentorship() {
  useDocTitle('Mentorship');
  const { user } = useSession();
  const m = user?.mentorship;
  const [f, setF] = useState({ role: m?.role ?? 'mentee', topics: m?.topics ?? [], note: m?.note ?? '' } as { role: 'mentor' | 'mentee' | 'both'; topics: string[]; note: string });
  const save = useAction(api.setMentorship, { success: (_r) => 'Mentorship preferences saved' });
  const withdraw = useAction(() => api.setMentorship(null), { success: 'You have withdrawn from mentorship matching' });
  return (
    <>
      <PageHeader title="Mentorship" intro="Tell the network whether you would like to mentor or be mentored. Matching staff see your interest only while you are registered." />
      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <form className="card p-5 space-y-5" onSubmit={(e) => { e.preventDefault(); save.run({ ...f, updatedAt: '' }); }}>
          {m && <Alert tone="success" icon={<HandHeart size={18} />} title={`Registered as ${m.role === 'both' ? 'mentor and mentee' : m.role}`}>Last updated {fmtDate(m.updatedAt)}.</Alert>}
          <fieldset><legend className="label">I would like to</legend><div className="grid sm:grid-cols-3 gap-2">{([['mentee', 'Find a mentor'], ['mentor', 'Mentor someone'], ['both', 'Both']] as const).map(([k, l]) => (
            <label key={k} className={cn('card p-3 cursor-pointer font-semibold text-center', f.role === k && 'border-primary bg-primary-soft text-primary-strong')}><input type="radio" className="sr-only" name="role" checked={f.role === k} onChange={() => setF({ ...f, role: k })} />{l}</label>))}</div></fieldset>
          <fieldset><legend className="label">Topics</legend><ChipSelect label="Mentorship topics" options={TAXONOMY.topics} value={f.topics} onChange={(v) => setF({ ...f, topics: v })} />{save.errors.topics && <p className="field-error">Choose at least one topic.</p>}</fieldset>
          <Field label="A note for matching staff" optional hint="What would you like help with, or what can you offer?">{(p) => <Textarea {...p} rows={3} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />}</Field>
          <div className="flex gap-2 justify-between flex-wrap">{m ? <Button variant="ghost" busy={withdraw.busy} onClick={() => withdraw.run()}>Withdraw</Button> : <span />}<Button type="submit" busy={save.busy}>{m ? 'Update' : 'Register interest'}</Button></div>
        </form>
        <aside className="panel p-5 text-[15px] space-y-3 self-start"><h2 className="text-base">How matching works</h2><p className="text-muted">Matching staff review registrations and suggest pairs by topic and goals. Registering does not guarantee a placement.</p><p className="text-muted">Withdrawing removes you from future matching straight away.</p></aside>
      </div>
    </>
  );
}

export function Workspaces() {
  useDocTitle('Workspaces');
  const q = useQuery({ queryKey: ['workspaces'], queryFn: api.workspaces });
  const [open, setOpen] = useState(false); const [f, setF] = useState({ name: '', description: '' }); const nav = useNavigate();
  const create = useAction(api.createWorkspace, { success: 'Workspace created', onSuccess: (id) => { setOpen(false); nav(`/workspaces/${id}`); } });
  const act = useAction(api.workspaceAction, { success: 'Updated' });
  return (
    <>
      <PageHeader title="Workspaces" intro="Private spaces for co-creation: invite collaborators, collect resources and keep shared notes." actions={<Button icon={<Plus size={18} />} onClick={() => setOpen(true)}>New workspace</Button>} />
      {q.isLoading ? <RowsSkeleton /> : !q.data?.length ? <Empty icon={<Briefcase size={22} />} title="No workspaces yet" body="Create one for a project and invite members to join." action={<Button onClick={() => setOpen(true)}>Create a workspace</Button>} /> : (
        <ul className="grid gap-4 md:grid-cols-2">{q.data.map((w) => (
          <li key={w.id} className="card p-5 flex flex-col gap-2">
            <div className="flex items-start justify-between gap-2"><h2 className="text-lg">{w.invited ? w.name : <Link to={`/workspaces/${w.id}`} className="no-underline hover:text-primary">{w.name}</Link>}</h2>{w.invited && <Badge tone="gold">Invitation</Badge>}</div>
            <p className="text-muted text-[15px]">{w.description}</p><p className="text-sm text-faint">Owner: {w.ownerName} · {w.members.length} members · {w.resources.length} resources</p>
            {w.invited ? <div className="flex gap-2 mt-2"><Button size="sm" icon={<Check size={14} />} onClick={() => act.run(w.id, 'accept')}>Accept</Button><Button size="sm" variant="ghost" onClick={() => act.run(w.id, 'decline')}>Decline</Button></div> : <Button size="sm" variant="secondary" to={`/workspaces/${w.id}`} className="self-start mt-2">Open</Button>}
          </li>))}</ul>)}
      <Modal open={open} onClose={() => setOpen(false)} title="New workspace" footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button busy={create.busy} onClick={() => create.run(f.name, f.description)}>Create</Button></>}>
        <div className="space-y-4"><Field label="Name" error={create.errors.name}>{(p) => <Input {...p} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />}</Field>
          <Field label="Purpose" optional>{(p) => <Textarea {...p} rows={3} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />}</Field></div>
      </Modal>
    </>
  );
}

export function WorkspacePage() {
  const { id = '' } = useParams(); const nav = useNavigate();
  const q = useQuery({ queryKey: ['workspace', id], queryFn: () => api.workspace(id), retry: false });
  const act = useAction(api.workspaceAction, { success: 'Workspace updated' });
  const dir = useQuery({ queryKey: ['directory', 'ws'], queryFn: () => api.directory({}) });
  const res = useQuery({ queryKey: ['search', 'ws'], queryFn: () => api.search({ pageSize: 50 }) });
  const [invite, setInvite] = useState(''); const [addRes, setAddRes] = useState(''); const [note, setNote] = useState('');
  const [transfer, setTransfer] = useState(false); const [to, setTo] = useState('');
  const leave = useAction((wid: string) => api.workspaceAction(wid, 'leave'), { success: 'You left the workspace', onSuccess: () => nav('/workspaces') });
  useDocTitle(q.data?.name ?? 'Workspace');
  if (q.isError) return <ErrorState error={q.error} />;
  if (!q.data) return <RowsSkeleton />;
  const w = q.data;
  return (
    <>
      <Link to="/workspaces" className="link inline-flex items-center gap-1 mb-5"><ArrowLeft size={16} />All workspaces</Link>
      <PageHeader title={w.name} intro={w.description} actions={w.isOwner ? <Button variant="secondary" icon={<Crown size={16} />} onClick={() => setTransfer(true)}>Transfer ownership</Button> : <Button variant="ghost" icon={<LogOut size={16} />} onClick={() => leave.run(w.id)}>Leave</Button>} />
      <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
        <div className="space-y-8 min-w-0">
          <section><h2 className="text-lg mb-3 flex items-center gap-2"><FileText size={18} />Shared resources</h2>
            <form className="flex gap-2 mb-4" onSubmit={(e) => { e.preventDefault(); if (addRes) act.run(w.id, 'addResource', addRes); setAddRes(''); }}>
              <Select aria-label="Add a resource" value={addRes} onChange={(e) => setAddRes(e.target.value)}><option value="">Add a resource from the hub…</option>{res.data?.results.filter((r) => !w.resources.includes(r.slug)).map((r) => <option key={r.slug} value={r.slug}>{r.v.title}</option>)}</Select><Button type="submit" variant="secondary">Add</Button></form>
            {w.resourceViews.length === 0 ? <p className="text-muted">No resources yet.</p> : <div className="grid gap-3 sm:grid-cols-2">{w.resourceViews.map((r) => <div key={r.id} className="relative"><ResourceCard r={r} compact /><button className="absolute top-3 right-3 btn-icon !min-h-[32px] !min-w-[32px] bg-surface" aria-label={`Remove ${r.v.title}`} onClick={() => act.run(w.id, 'removeResource', r.slug)}><X size={15} /></button></div>)}</div>}
          </section>
          <section><h2 className="text-lg mb-3 flex items-center gap-2"><StickyNote size={18} />Notes</h2>
            <ul className="space-y-3 mb-4">{w.notesView.map((n) => <li key={n.id} className="panel p-3"><p className="text-[15px]">{n.body}</p><p className="text-xs text-faint mt-1">{n.authorName} · {timeAgo(n.at)}</p></li>)}</ul>
            <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); act.run(w.id, 'note', note); setNote(''); }}><Input aria-label="New note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note for the group" /><Button type="submit">Add</Button></form>
          </section>
        </div>
        <aside className="space-y-4">
          <section className="card p-4"><h2 className="text-base mb-3">Members</h2>
            <ul className="space-y-2">{w.memberCards.map((m) => <li key={m.id} className="flex items-center gap-2"><Avatar name={m.name} hue={m.avatarHue} size={32} /><span className="flex-1 text-[15px] truncate">{m.name}</span>{m.id === w.ownerId ? <Badge tone="gold" icon={<Crown size={11} />}>Owner</Badge> : w.isOwner && <button className="btn-icon !min-h-[32px] !min-w-[32px] text-muted" aria-label={`Remove ${m.name}`} onClick={() => act.run(w.id, 'remove', m.id)}><X size={15} /></button>}</li>)}</ul>
            {w.inviteCards.length > 0 && <><p className="text-sm text-muted mt-4 mb-1">Invited</p><ul className="space-y-1">{w.inviteCards.map((m) => <li key={m.id} className="text-[15px] flex items-center justify-between gap-2">{m.name}<StatusBadge status="pending" /></li>)}</ul></>}
            {w.isOwner && <form className="mt-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (invite) act.run(w.id, 'invite', invite); setInvite(''); }}>
              <Select aria-label="Invite a member" value={invite} onChange={(e) => setInvite(e.target.value)}><option value="">Invite a member…</option>{dir.data?.filter((m) => !w.members.includes(m.id) && !w.invites.includes(m.id)).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</Select><Button type="submit" variant="secondary" aria-label="Invite" icon={<UserPlus size={16} />} /></form>}
          </section>
          <p className="text-xs text-faint">Only members of this workspace can see it. Removing someone ends their access straight away.</p>
        </aside>
      </div>
      <Modal open={transfer} onClose={() => setTransfer(false)} title="Transfer ownership" footer={<><Button variant="secondary" onClick={() => setTransfer(false)}>Cancel</Button><Button disabled={!to} onClick={() => { act.run(w.id, 'transfer', to); setTransfer(false); }}>Transfer</Button></>}>
        <p className="text-muted mb-4">The new owner can invite and remove members. You stay a member.</p>
        <Field label="New owner">{(p) => <Select {...p} value={to} onChange={(e) => setTo(e.target.value)}><option value="">Choose a member…</option>{w.memberCards.filter((m) => m.id !== w.ownerId).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</Select>}</Field>
      </Modal>
    </>
  );
}
