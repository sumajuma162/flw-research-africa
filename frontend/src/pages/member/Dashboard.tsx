import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Bell, FilePlus2, FolderKanban, Search, Send, Users, Briefcase, CheckCheck, GraduationCap, CalendarDays, Info } from 'lucide-react';
import { api } from '@/api';
import { useSession } from '@/lib/session';
import { useAction, useDocTitle } from '@/lib/hooks';
import { timeAgo } from '@/lib/format';
import { Alert, Button, Empty, ErrorState, PageHeader, RowsSkeleton, Skeleton, StatusBadge } from '@/components/ui';
import { EventCard, TypeBadge } from '@/components/domain';
import { cn } from '@/lib/cn';

export function Dashboard() {
  useDocTitle('Dashboard');
  const { user } = useSession();
  const q = useQuery({ queryKey: ['dashboard'], queryFn: api.dashboard });
  const cancel = useAction(api.cancelClosure, { success: 'Closure request cancelled' });
  if (q.isError) return <ErrorState error={q.error} retry={() => q.refetch()} />;
  const d = q.data;
  const first = user?.name.split(' ')[0];
  const completeness = user ? [user.affiliation, user.biography, user.interests.length, user.visibility.affiliation || user.visibility.biography].filter(Boolean).length * 25 : 0;
  const inReview = d?.submissions.filter((s) => s.v.status === 'pending').length ?? 0;
  const returned = d?.submissions.filter((s) => s.v.status === 'returned') ?? [];
  return (
    <>
      <PageHeader eyebrow="Your dashboard" title={`Hello, ${first}`} intro="Here is what is happening with your work in the network." actions={<Button to="/submit" icon={<FilePlus2 size={18} />}>Submit a resource</Button>} />
      {user?.status === 'closure_pending' && <div className="mb-5"><Alert tone="warning" title="You asked to close your account">An administrator will process the request. <button className="link" onClick={() => cancel.run()}>Cancel the request</button></Alert></div>}
      {returned.length > 0 && <div className="mb-5"><Alert tone="warning" title={`${returned.length} submission${returned.length > 1 ? 's need' : ' needs'} changes`}>A reviewer returned <strong>{returned[0].v.title}</strong> with notes. <Link to={`/submit?edit=${returned[0].id}`} className="link">Revise it now</Link></Alert></div>}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {[
          { to: '/notifications', icon: Bell, label: 'Unread notifications', value: d?.unread },
          { to: '/my-submissions', icon: FolderKanban, label: 'Submissions in review', value: inReview },
          { to: '/messages', icon: Send, label: 'Connection requests', value: d?.pendingRequests },
          { to: '/workspaces', icon: Briefcase, label: 'Workspaces', value: d?.workspaces },
        ].map((c) => (
          <Link key={c.to} to={c.to} className="card card-hover p-4 no-underline">
            <c.icon size={20} className="text-secondary" /><div className="font-display font-bold text-[28px] mt-2 tabular leading-none">{d ? c.value : <Skeleton className="h-7 w-8" />}</div><div className="text-sm text-muted mt-1">{c.label}</div>
          </Link>
        ))}
      </div>
      <div className="grid gap-8 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-8 min-w-0">
          <section><div className="flex items-end justify-between mb-3"><h2 className="text-xl">My submissions</h2><Link to="/my-submissions" className="link text-[15px] inline-flex items-center gap-1">All<ArrowRight size={14} /></Link></div>
            {!d ? <RowsSkeleton n={3} /> : d.submissions.length === 0 ? <Empty title="You have not shared anything yet" body="Share a publication, dataset, tool or community practice with the network." action={<Button to="/submit">Submit your first resource</Button>} /> :
              <ul className="card divide-y divide-line">{d.submissions.slice(0, 4).map((s) => (
                <li key={s.id}><Link to={s.v.status === 'published' ? `/knowledge/${s.slug}` : `/submit?edit=${s.id}`} className="flex items-center gap-3 p-4 no-underline hover:bg-surface-2">
                  <div className="min-w-0 flex-1"><p className="font-semibold truncate">{s.v.title}</p><div className="flex gap-2 mt-1 items-center flex-wrap"><TypeBadge type={s.type} /><span className="text-sm text-muted">v{s.v.no} · {timeAgo(s.v.submittedAt)}</span></div></div>
                  <StatusBadge status={s.status === 'published' && s.v.status === 'pending' ? 'pending' : s.v.status === 'superseded' ? 'published' : s.v.status} />
                </Link></li>))}</ul>}
          </section>
          <section><h2 className="text-xl mb-3">Quick actions</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {[{ to: '/knowledge', icon: Search, t: 'Search the knowledge hub' }, { to: '/directory', icon: Users, t: 'Find members by country or topic' }, { to: '/community', icon: Send, t: 'Ask the community a question' }, { to: '/learn', icon: GraduationCap, t: 'Continue learning' }].map((x) => (
                <Link key={x.to} to={x.to} className="card card-hover p-4 flex items-center gap-3 no-underline"><span className="w-10 h-10 rounded-xl bg-primary-soft text-primary flex items-center justify-center shrink-0"><x.icon size={19} /></span><span className="font-semibold">{x.t}</span></Link>))}
            </div>
          </section>
        </div>
        <div className="space-y-8 min-w-0">
          {completeness < 100 && <section className="card p-5"><div className="flex justify-between items-baseline"><h2 className="text-lg">Complete your profile</h2><span className="text-sm font-semibold text-primary tabular">{completeness}%</span></div>
            <div className="h-2 rounded-full bg-surface-3 my-3 overflow-hidden"><div className="h-full bg-primary" style={{ width: `${completeness}%` }} /></div>
            <p className="text-sm text-muted mb-3">A short biography and visible interests help others find you. You control what is shown.</p><Button size="sm" variant="secondary" to="/profile">Edit profile</Button></section>}
          <section><div className="flex items-end justify-between mb-3"><h2 className="text-xl">Notifications</h2><Link to="/notifications" className="link text-[15px]">All</Link></div>
            {!d ? <RowsSkeleton n={3} /> : d.notifications.length === 0 ? <p className="text-muted">You are all caught up.</p> :
              <ul className="space-y-2">{d.notifications.map((n) => <li key={n.id}><Link to={n.link ?? '/notifications'} onClick={() => api.markRead(n.id)} className={cn('block p-3 rounded-xl no-underline hover:bg-surface-2', !n.read && 'bg-primary-soft/60')}><p className="font-semibold text-[15px] flex items-center gap-2">{!n.read && <span className="w-2 h-2 rounded-full bg-secondary shrink-0" />}{n.title}</p><p className="text-sm text-muted line-clamp-2">{n.body}</p><p className="text-xs text-faint mt-1">{timeAgo(n.createdAt)}</p></Link></li>)}</ul>}
          </section>
          {!!d?.learning.length && <section><h2 className="text-xl mb-3">In progress</h2>{d.learning.map((l) => <Link key={l.slug} to={`/learn/${l.slug}`} className="card card-hover p-4 block no-underline"><p className="font-semibold">{l.title}</p><div className="h-1.5 rounded-full bg-surface-3 mt-2 overflow-hidden"><div className="h-full bg-primary" style={{ width: `${(l.done / l.total) * 100}%` }} /></div><p className="text-sm text-muted mt-1 tabular">{l.done} of {l.total} done</p></Link>)}</section>}
          <section><div className="flex items-end justify-between mb-3"><h2 className="text-xl flex items-center gap-2"><CalendarDays size={20} />Coming up</h2><Link to="/events" className="link text-[15px]">All events</Link></div>
            <div className="space-y-3">{d?.upcoming.map((e) => <EventCard key={e.id} e={e} />)}{d && !d.upcoming.length && <p className="text-muted">No upcoming events.</p>}</div></section>
        </div>
      </div>
    </>
  );
}

export function Notifications() {
  useDocTitle('Notifications');
  const q = useQuery({ queryKey: ['notifications'], queryFn: api.notifications });
  const all = useAction(() => api.markRead(), { success: 'All notifications marked as read' });
  const one = useAction(api.markRead);
  const unread = q.data?.filter((n) => !n.read).length ?? 0;
  return (
    <>
      <PageHeader title="Notifications" intro="Decisions, replies, requests and reminders." actions={unread > 0 ? <Button variant="secondary" icon={<CheckCheck size={18} />} busy={all.busy} onClick={() => all.run()}>Mark all as read</Button> : undefined} />
      <p className="text-sm text-muted mb-4 flex gap-2"><Info size={16} className="shrink-0 mt-0.5" />Account and security notices always reach you. Choose optional notices in <Link to="/settings?tab=notifications" className="link">Settings</Link>.</p>
      {q.isLoading ? <RowsSkeleton /> : !q.data?.length ? <Empty icon={<Bell size={22} />} title="No notifications yet" body="When reviewers decide on your work or someone replies, you will see it here." /> : (
        <ul className="card divide-y divide-line">{q.data.map((n) => (
          <li key={n.id} className={cn('flex gap-3 p-4', !n.read && 'bg-primary-soft/50')}>
            <span className={cn('mt-2 w-2.5 h-2.5 rounded-full shrink-0', n.read ? 'bg-transparent' : 'bg-secondary')} aria-label={n.read ? undefined : 'Unread'} />
            <div className="min-w-0 flex-1"><p className="font-semibold">{n.title}</p><p className="text-muted text-[15px]">{n.body}</p><p className="text-xs text-faint mt-1">{timeAgo(n.createdAt)} · {n.kind === 'decision' ? 'Decision' : n.kind === 'account' ? 'Account' : n.kind === 'event' ? 'Event' : n.kind === 'community' ? 'Community' : 'System'}</p></div>
            <div className="flex flex-col gap-1 items-end shrink-0">{n.link && <Button size="sm" variant="secondary" to={n.link}>Open</Button>}{!n.read && <button className="link text-sm" onClick={() => one.run(n.id)}>Mark read</button>}</div>
          </li>))}</ul>
      )}
    </>
  );
}
