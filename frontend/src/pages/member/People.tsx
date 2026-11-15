import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Ban, Flag, Search, Send, UserPlus, Users, Check, X, MessageSquare, ShieldOff } from 'lucide-react';
import { api } from '@/api';
import { TAXONOMY } from '@/api/seed';
import { category, country, topic } from '@/lib/labels';
import { timeAgo } from '@/lib/format';
import { useAction, useDebounced, useDocTitle } from '@/lib/hooks';
import { Alert, Avatar, Button, Empty, ErrorState, Field, Modal, PageHeader, RowsSkeleton, Select, StatusBadge, Textarea, Confirm, CardsSkeleton } from '@/components/ui';
import { ResourceCard } from '@/components/domain';
import { MemberCardView } from './Profile';
import { cn } from '@/lib/cn';

export function Directory() {
  useDocTitle('Member directory');
  const [sp, setSp] = useSearchParams();
  const [q, setQ] = useState(sp.get('q') ?? ''); const dq = useDebounced(q, 300);
  const f = { country: sp.get('country') ?? '', category: sp.get('category') ?? '', topic: sp.get('topic') ?? '' };
  const set = (k: string, v: string) => { const n = new URLSearchParams(sp); if (v) n.set(k, v); else n.delete(k); setSp(n, { replace: true }); };
  const r = useQuery({ queryKey: ['directory', dq, f], queryFn: () => api.directory({ q: dq, ...f }), placeholderData: (p) => p });
  return (
    <>
      <PageHeader title="Member directory" intro="Find people by country, group and research interest. Members only see the details each person chose to show." />
      <div className="grid gap-3 md:grid-cols-4 mb-5">
        <div className="relative md:col-span-1"><Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" /><label htmlFor="dq" className="sr-only">Search members</label><input id="dq" className="input !pl-10" placeholder="Name or affiliation" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <Select aria-label="Country" value={f.country} onChange={(e) => set('country', e.target.value)}><option value="">All countries</option>{TAXONOMY.countries.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</Select>
        <Select aria-label="Group" value={f.category} onChange={(e) => set('category', e.target.value)}><option value="">All groups</option>{TAXONOMY.categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</Select>
        <Select aria-label="Interest" value={f.topic} onChange={(e) => set('topic', e.target.value)}><option value="">All interests</option>{TAXONOMY.topics.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</Select>
      </div>
      <p className="text-sm text-muted mb-4" aria-live="polite">{r.data ? `${r.data.length} ${r.data.length === 1 ? 'member' : 'members'}` : 'Loading…'}</p>
      {r.isError ? <ErrorState error={r.error} retry={() => r.refetch()} /> : !r.data ? <CardsSkeleton /> : r.data.length === 0 ? <Empty icon={<Users size={22} />} title="No members match" body="Members appear in a filter only if they chose to show that detail. Try fewer filters." /> : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{r.data.map((m) => (
          <li key={m.id}><Link to={`/members/${m.id}`} className="card card-hover p-4 flex gap-3 no-underline h-full">
            <Avatar name={m.name} hue={m.avatarHue} size={48} />
            <div className="min-w-0"><p className="font-semibold">{m.name}</p><p className="text-sm text-muted">{category(m.category)}{m.country ? ` · ${country(m.country)}` : ''}</p>
              {m.affiliation && <p className="text-sm truncate">{m.affiliation}</p>}
              {m.interests && m.interests.length > 0 && <p className="text-xs text-faint mt-1 truncate">{m.interests.map(topic).join(' · ')}</p>}</div>
          </Link></li>))}</ul>
      )}
    </>
  );
}

export function MemberPage() {
  const { id = '' } = useParams(); const nav = useNavigate();
  const q = useQuery({ queryKey: ['member', id], queryFn: () => api.member(id), retry: false });
  const [req, setReq] = useState(false); const [msg, setMsg] = useState('');
  const send = useAction(api.requestConnection, { success: 'Request sent', onSuccess: () => { setReq(false); setMsg(''); } });
  const [blockOpen, setBlockOpen] = useState(false);
  const block = useAction(api.setBlock, { success: 'Member blocked. They can no longer contact you.', onSuccess: () => nav('/directory') });
  useDocTitle(q.data?.card.name ?? 'Member');
  if (q.isError) return <ErrorState error={q.error} />;
  if (!q.data) return <RowsSkeleton />;
  const { card, connection, resources, isSelf } = q.data;
  return (
    <>
      <Link to="/directory" className="link inline-flex items-center gap-1 mb-5"><ArrowLeft size={16} />Directory</Link>
      <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
        <div className="min-w-0 space-y-8"><MemberCardView c={card} />
          <section><h2 className="text-lg mb-3">Shared resources</h2>{resources.length ? <div className="grid gap-3 sm:grid-cols-2">{resources.map((r) => <ResourceCard key={r.id} r={r} compact />)}</div> : <p className="text-muted">No published resources yet.</p>}</section></div>
        <aside className="space-y-3">
          {isSelf ? <Button variant="secondary" to="/profile" className="w-full">Edit your profile</Button>
            : connection?.status === 'accepted' ? <Button className="w-full" icon={<MessageSquare size={18} />} to={`/messages/${connection.id}`}>Send a message</Button>
            : connection?.status === 'pending' ? <div className="panel p-4 text-sm">{connection.toId === id ? 'Your request is waiting for a reply.' : <>This member sent you a request. <Link to="/messages" className="link">Respond</Link></>}</div>
            : card.acceptsRequests ? <Button className="w-full" icon={<UserPlus size={18} />} onClick={() => setReq(true)}>Request to connect</Button>
            : <p className="panel p-4 text-sm text-muted">This member is not accepting connection requests.</p>}
          {!isSelf && <Button variant="ghost" className="w-full text-muted" icon={<Ban size={16} />} onClick={() => setBlockOpen(true)}>Block</Button>}
        </aside>
      </div>
      <Modal open={req} onClose={() => setReq(false)} title={`Connect with ${card.name}`} footer={<><Button variant="secondary" onClick={() => setReq(false)}>Cancel</Button><Button busy={send.busy} icon={<Send size={16} />} onClick={() => send.run(id, msg)}>Send request</Button></>}>
        <p className="text-sm text-muted mb-3">Introduce yourself and say why you would like to connect. If they accept, you can message each other here. You can send up to 10 requests a day.</p>
        <Field label="Introduction" error={send.errors.message} hint={`${msg.length}/400`}>{(p) => <Textarea {...p} rows={4} maxLength={400} value={msg} onChange={(e) => setMsg(e.target.value)} />}</Field>
      </Modal>
      <Confirm open={blockOpen} onClose={() => setBlockOpen(false)} title={`Block ${card.name}?`} body="They will not be able to message you or see you in the directory. They are not told. You can unblock them later from Messages." confirmLabel="Block" danger busy={block.busy} onConfirm={() => block.run(id, true)} />
    </>
  );
}

export function Messages() {
  useDocTitle('Messages');
  const q = useQuery({ queryKey: ['connections'], queryFn: api.connections });
  const respond = useAction(api.respondConnection, { success: 'Request updated' });
  const incoming = q.data?.filter((c) => c.status === 'pending' && c.incoming) ?? [];
  const outgoing = q.data?.filter((c) => c.status === 'pending' && !c.incoming) ?? [];
  const accepted = q.data?.filter((c) => c.status === 'accepted') ?? [];
  return (
    <>
      <PageHeader title="Messages" intro="Private conversations with members you are connected to." actions={<Button variant="secondary" to="/directory" icon={<UserPlus size={18} />}>Find people</Button>} />
      {q.isLoading ? <RowsSkeleton /> : <div className="space-y-8">
        {incoming.length > 0 && <section><h2 className="text-lg mb-3">Requests for you</h2><ul className="space-y-3">{incoming.map((c) => (
          <li key={c.id} className="card p-4"><div className="flex gap-3"><Avatar name={c.other.name} hue={c.other.avatarHue} /><div className="min-w-0 flex-1"><Link to={`/members/${c.other.id}`} className="font-semibold link">{c.other.name}</Link><p className="text-sm text-muted">{category(c.other.category)} · {timeAgo(c.createdAt)}</p><p className="mt-2 text-[15px] panel p-3">{c.message}</p></div></div>
            <div className="flex gap-2 justify-end mt-3"><Button size="sm" variant="ghost" icon={<X size={14} />} onClick={() => respond.run(c.id, false)}>Decline</Button><Button size="sm" icon={<Check size={14} />} onClick={() => respond.run(c.id, true)}>Accept</Button></div></li>))}</ul></section>}
        <section><h2 className="text-lg mb-3">Conversations</h2>{accepted.length === 0 ? <Empty icon={<MessageSquare size={22} />} title="No conversations yet" body="Find someone in the directory and send a connection request." action={<Button to="/directory">Open the directory</Button>} /> : (
          <ul className="card divide-y divide-line">{accepted.map((c) => (
            <li key={c.id}><Link to={`/messages/${c.id}`} className="flex items-center gap-3 p-4 no-underline hover:bg-surface-2"><Avatar name={c.other.name} hue={c.other.avatarHue} />
              <div className="min-w-0 flex-1"><div className="flex justify-between gap-2"><p className="font-semibold truncate">{c.other.name}</p><span className="text-xs text-faint shrink-0">{timeAgo(c.last?.at ?? c.createdAt)}</span></div>
                <p className="text-sm text-muted truncate">{c.blocked ? 'Blocked' : c.last ? `${c.last.mine ? 'You: ' : ''}${c.last.body}` : 'Say hello'}</p></div></Link></li>))}</ul>)}</section>
        {outgoing.length > 0 && <section><h2 className="text-lg mb-3">Requests you sent</h2><ul className="space-y-2">{outgoing.map((c) => <li key={c.id} className="flex items-center gap-3 panel p-3"><Avatar name={c.other.name} hue={c.other.avatarHue} size={34} /><span className="flex-1 font-medium">{c.other.name}</span><StatusBadge status="pending" /></li>)}</ul></section>}
      </div>}
    </>
  );
}

export function Conversation() {
  const { id = '' } = useParams();
  const q = useQuery({ queryKey: ['messages', id], queryFn: () => api.messages(id), retry: false, refetchInterval: 8000 });
  const [body, setBody] = useState('');
  const send = useAction(api.sendMessage, { onSuccess: () => setBody('') });
  const block = useAction(api.setBlock, { success: 'Updated' });
  const [report, setReport] = useState<string | null>(null); const [reason, setReason] = useState('Harassment or abuse'); const [details, setDetails] = useState('');
  const rep = useAction(api.report, { success: 'Reported. A moderator will review it.', onSuccess: () => setReport(null) });
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [q.data?.messages.length]);
  useDocTitle(q.data ? `Messages with ${q.data.other.name}` : 'Messages');
  if (q.isError) return <ErrorState error={q.error} />;
  if (!q.data) return <RowsSkeleton />;
  const d = q.data; const cannot = d.blocked || d.blockedBy;
  return (
    <div className="flex flex-col h-[calc(100dvh-220px)] min-h-[440px] card overflow-hidden">
      <div className="flex items-center gap-3 p-3 border-b border-line">
        <Link to="/messages" className="btn-icon" aria-label="Back to messages"><ArrowLeft size={20} /></Link>
        <Avatar name={d.other.name} hue={d.other.avatarHue} size={36} /><Link to={`/members/${d.other.id}`} className="font-semibold flex-1 truncate no-underline">{d.other.name}</Link>
        <Button size="sm" variant="ghost" icon={d.blocked ? <ShieldOff size={14} /> : <Ban size={14} />} onClick={() => block.run(d.other.id, !d.blocked)}>{d.blocked ? 'Unblock' : 'Block'}</Button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-surface-2" aria-live="polite">
        <p className="text-center text-xs text-faint">Messages are private between you two. Moderators see a message only if one of you reports it.</p>
        {d.messages.map((m) => (
          <div key={m.id} className={cn('flex group', m.mine ? 'justify-end' : 'justify-start')}>
            <div className={cn('max-w-[80%] rounded-2xl px-4 py-2.5 text-[15px]', m.mine ? 'bg-primary text-on-primary rounded-br-md' : 'bg-surface border border-line rounded-bl-md')}>
              <p className="whitespace-pre-wrap break-words">{m.body}</p>
              <p className={cn('text-[11px] mt-1 flex gap-2 items-center', m.mine ? 'text-on-primary/75' : 'text-faint')}>{timeAgo(m.createdAt)}{!m.mine && (m.reported ? <span>· Reported</span> : <button className="underline opacity-70 hover:opacity-100 inline-flex items-center gap-1" onClick={() => setReport(m.id)}><Flag size={11} />Report</button>)}</p>
            </div>
          </div>))}
        <div ref={end} />
      </div>
      {cannot ? <div className="p-4 text-center text-muted text-sm border-t border-line">{d.blocked ? 'You blocked this member. Unblock them to send messages.' : 'You cannot message this member.'}</div> : (
        <form className="p-3 border-t border-line flex gap-2 items-end" onSubmit={(e) => { e.preventDefault(); if (body.trim()) send.run(id, body); }}>
          <label htmlFor="msg" className="sr-only">Message</label>
          <textarea id="msg" rows={1} className="input !min-h-[46px] max-h-32 resize-none flex-1" placeholder="Write a message" value={body} onChange={(e) => setBody(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (body.trim()) send.run(id, body); } }} />
          <Button type="submit" busy={send.busy} aria-label="Send" icon={<Send size={18} />} className="!px-4"><span className="hidden sm:inline">Send</span></Button>
        </form>)}
      <Modal open={!!report} onClose={() => setReport(null)} title="Report this message" footer={<><Button variant="secondary" onClick={() => setReport(null)}>Cancel</Button><Button busy={rep.busy} onClick={() => rep.run({ targetType: 'message', targetId: report!, reason, details })}>Send report</Button></>}>
        <Field label="Reason">{(p) => <Select {...p} value={reason} onChange={(e) => setReason(e.target.value)}>{['Harassment or abuse', 'Spam or advertising', 'Sharing personal data', 'Other'].map((r) => <option key={r}>{r}</option>)}</Select>}</Field>
        <div className="mt-4"><Field label="Details" optional>{(p) => <Textarea {...p} rows={3} value={details} onChange={(e) => setDetails(e.target.value)} />}</Field></div>
        <div className="mt-4"><Alert tone="info">Your identity is shared only with moderators. You can also block this member.</Alert></div>
      </Modal>
    </div>
  );
}
