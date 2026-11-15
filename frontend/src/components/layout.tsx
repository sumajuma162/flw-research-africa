import { Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, ChevronDown, LayoutDashboard, LogOut, Menu, Search, Settings, User as UserIcon, BookOpen, CalendarDays, MessagesSquare, Home, Users, Send, FolderKanban, FileStack, Mail, ShieldCheck, Inbox, Newspaper, Tags, BarChart3, ScrollText, UserCog, Building2, HandHeart, WifiOff, FlaskConical, RotateCcw, LogIn, X, Clock, Moon, Sun, Monitor, Lightbulb, GraduationCap, Map as MapIcon, LifeBuoy, Briefcase } from 'lucide-react';
import { api } from '@/api';
import { DEMO_MFA_CODE, DEMO_PASSWORD } from '@/api/seed';
import { useSession } from '@/lib/session';
import { usePrefs } from '@/lib/prefs';
import { useAction, useOnline } from '@/lib/hooks';
import { timeAgo } from '@/lib/format';
import { cn } from '@/lib/cn';
import { Avatar, Button, Modal, Sheet, Textarea } from './ui';
import { Logo } from './domain';

const PUBLIC_NAV = [
  { to: '/about', label: 'About' }, { to: '/knowledge', label: 'Knowledge hub' }, { to: '/datasets', label: 'Datasets' },
  { to: '/events', label: 'Events' }, { to: '/opportunities', label: 'Opportunities' }, { to: '/learn', label: 'Learn' },
];
const MORE_NAV = [
  { to: '/news', label: 'News', icon: Newspaper }, { to: '/leadership', label: 'Leadership', icon: Users }, { to: '/organisations', label: 'Organisations', icon: Building2 },
  { to: '/map', label: 'Network map', icon: MapIcon }, { to: '/help', label: 'Help centre', icon: LifeBuoy }, { to: '/contact', label: 'Contact', icon: Mail },
];
export const MEMBER_NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }, { to: '/directory', label: 'Directory', icon: Users }, { to: '/community', label: 'Community', icon: MessagesSquare },
  { to: '/messages', label: 'Messages', icon: Send }, { to: '/submit', label: 'Submit a resource', icon: FileStack }, { to: '/my-submissions', label: 'My submissions', icon: FolderKanban },
  { to: '/workspaces', label: 'Workspaces', icon: Briefcase }, { to: '/mentorship', label: 'Mentorship', icon: HandHeart }, { to: '/notifications', label: 'Notifications', icon: Bell },
  { to: '/profile', label: 'Profile', icon: UserIcon }, { to: '/settings', label: 'Settings', icon: Settings }, { to: '/privacy-requests', label: 'Privacy requests', icon: ShieldCheck },
];
const CONSOLE_NAV = [
  { to: '/console', label: 'Queue', icon: Inbox, roles: ['reviewer', 'moderator', 'editor', 'admin'], end: true }, { to: '/console/content', label: 'Content', icon: Newspaper, roles: ['editor', 'admin'] },
  { to: '/console/newsletters', label: 'Newsletters', icon: Mail, roles: ['editor', 'admin'] }, { to: '/console/users', label: 'Users and roles', icon: UserCog, roles: ['admin'] },
  { to: '/console/organisations', label: 'Organisations', icon: Building2, roles: ['admin'] }, { to: '/console/taxonomy', label: 'Taxonomy', icon: Tags, roles: ['admin'] },
  { to: '/console/mentorship', label: 'Mentorship pool', icon: HandHeart, roles: ['admin', 'editor', 'reviewer'] }, { to: '/console/reports', label: 'Reports', icon: BarChart3, roles: ['admin', 'editor'] },
  { to: '/console/audit', label: 'Audit trail', icon: ScrollText, roles: ['admin'] },
] as const;

function useUnread() {
  const { user } = useSession();
  return useQuery({ queryKey: ['unread', user?.id], queryFn: api.unreadCount, enabled: !!user, refetchInterval: 30_000 }).data ?? 0;
}

function ThemeMenu() {
  const { theme, setTheme } = usePrefs();
  const next = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
  const I = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor;
  return <button className="btn-icon" aria-label={`Colour theme: ${theme}. Switch to ${next}`} title={`Theme: ${theme}`} onClick={() => setTheme(next)}><I size={19} /></button>;
}

function UserMenu() {
  const { user, isStaff } = useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const nav = useNavigate();
  const out = useAction(api.logout, { success: 'You are signed out', onSuccess: () => nav('/') });
  useEffect(() => { const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); }; document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h); }, []);
  if (!user) return null;
  const approved = user.status === 'approved' || user.status === 'closure_pending';
  return (
    <div className="relative" ref={ref}>
      <button className="flex items-center gap-1.5 rounded-full p-1 pr-2 hover:bg-surface-2" aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen(!open)}>
        <Avatar name={user.name} hue={user.avatarHue} size={34} /><ChevronDown size={16} className="text-muted hidden sm:block" /><span className="sr-only">Account menu</span>
      </button>
      {open && (
        <div role="menu" className="absolute right-0 mt-2 w-64 card shadow-xl p-2 z-50" onClick={() => setOpen(false)}>
          <div className="px-3 py-2 border-b border-line mb-1"><p className="font-semibold truncate">{user.name}</p><p className="text-sm text-muted truncate">{user.email}</p></div>
          {approved ? <>
            <MenuLink to="/dashboard" icon={LayoutDashboard}>Dashboard</MenuLink>
            <MenuLink to="/profile" icon={UserIcon}>Profile</MenuLink>
            <MenuLink to="/settings" icon={Settings}>Settings</MenuLink>
            {isStaff && <MenuLink to="/console" icon={ShieldCheck}>Staff console</MenuLink>}
          </> : <MenuLink to="/application-status" icon={Clock}>Application status</MenuLink>}
          <button role="menuitem" className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-surface-2 text-left" onClick={() => out.run()}><LogOut size={18} className="text-muted" />Sign out</button>
        </div>
      )}
    </div>
  );
}
function MenuLink({ to, icon: I, children }: { to: string; icon: typeof Home; children: ReactNode }) {
  return <Link role="menuitem" to={to} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-surface-2 no-underline"><I size={18} className="text-muted" />{children}</Link>;
}

export function Header() {
  const { user, isMember, isStaff } = useSession();
  const unread = useUnread();
  const [drawer, setDrawer] = useState(false);
  const loc = useLocation();
  useEffect(() => setDrawer(false), [loc.pathname]);
  return (
    <header className="sticky z-40 bg-surface/95 backdrop-blur border-b border-line" style={{ top: 'env(safe-area-inset-top, 0px)' }}>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 btn btn-accent z-50">Skip to content</a>
      <div className="wrap flex items-center gap-3 h-16">
        <button className="btn-icon xl:hidden -ml-2" aria-label="Open menu" onClick={() => setDrawer(true)}><Menu size={22} /></button>
        <Link to="/" className="no-underline shrink-0" aria-label="FLW Research Network in Africa, home"><Logo /></Link>
        <nav aria-label="Main" className="hidden lg:flex items-center gap-0.5 ml-4 xl:ml-6 min-w-0">
          {PUBLIC_NAV.map((n) => <NavLink key={n.to} to={n.to} className={({ isActive }) => cn('px-2.5 py-2 rounded-lg text-[15px] font-semibold no-underline whitespace-nowrap hover:bg-surface-2', ['/datasets', '/opportunities', '/learn'].includes(n.to) && 'hidden xl:inline-block', isActive ? 'text-primary' : 'text-fg')}>{n.label}</NavLink>)}
          {isMember && <NavLink to="/community" className={({ isActive }) => cn('px-2.5 py-2 rounded-lg text-[15px] font-semibold no-underline whitespace-nowrap hover:bg-surface-2', isActive ? 'text-primary' : 'text-fg')}>Community</NavLink>}
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <Link to="/knowledge" className="btn-icon" aria-label="Search the knowledge hub"><Search size={19} /></Link>
          <span className="hidden sm:inline-flex"><ThemeMenu /></span>
          {user ? <>
            {isMember && <Link to="/notifications" className="btn-icon relative" aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}><Bell size={19} />{unread > 0 && <span className="absolute top-2 right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-secondary text-white text-[11px] font-bold flex items-center justify-center">{unread}</span>}</Link>}
            {isStaff && <Link to="/console" className="hidden md:inline-flex btn btn-secondary btn-sm ml-1" aria-label="Staff console"><ShieldCheck size={16} /><span className="hidden 2xl:inline">Console</span></Link>}
            <UserMenu />
          </> : <>
            <Link to="/login" className="hidden sm:inline-flex btn btn-ghost btn-sm text-primary">Sign in</Link>
            <Link to="/join" className="btn btn-primary btn-sm"><span>Join<span className="hidden sm:inline"> the network</span></span></Link>
          </>}
        </div>
      </div>
      <Sheet open={drawer} onClose={() => setDrawer(false)} title="Menu" side="left">
        <nav aria-label="Mobile" className="flex flex-col gap-1 -mx-2">
          <DrawerLink to="/" icon={Home}>Home</DrawerLink>
          {PUBLIC_NAV.map((n) => <DrawerLink key={n.to} to={n.to} icon={n.to === '/knowledge' ? BookOpen : n.to === '/events' ? CalendarDays : n.to === '/learn' ? GraduationCap : n.to === '/opportunities' ? Lightbulb : n.to === '/datasets' ? FileStack : Users}>{n.label}</DrawerLink>)}
          {MORE_NAV.map((n) => <DrawerLink key={n.to} to={n.to} icon={n.icon}>{n.label}</DrawerLink>)}
          {isMember && <><p className="eyebrow px-3 pt-4 pb-1">Members</p>{MEMBER_NAV.slice(0, 9).map((n) => <DrawerLink key={n.to} to={n.to} icon={n.icon}>{n.label}</DrawerLink>)}</>}
          {isStaff && <DrawerLink to="/console" icon={ShieldCheck}>Staff console</DrawerLink>}
          {!user && <div className="flex gap-2 px-2 pt-4"><Button to="/login" variant="secondary" className="flex-1">Sign in</Button><Button to="/join" className="flex-1">Join</Button></div>}
          <div className="px-3 pt-4 flex items-center gap-2 text-sm text-muted">Theme <ThemeMenu /></div>
        </nav>
      </Sheet>
    </header>
  );
}
function DrawerLink({ to, icon: I, children }: { to: string; icon: typeof Home; children: ReactNode }) {
  return <NavLink to={to} end={to === '/'} className={({ isActive }) => cn('flex items-center gap-3 px-3 py-2.5 rounded-lg font-semibold no-underline', isActive ? 'bg-primary-soft text-primary-strong' : 'hover:bg-surface-2')}><I size={19} />{children}</NavLink>;
}

export function Footer() {
  const [fb, setFb] = useState(false);
  return (
    <footer className="bg-primary-strong text-white mt-16 dark:bg-surface-2" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div className="wrap py-12 grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="space-y-3">
          <Logo inverse />
          <p className="text-white/80 dark:text-muted text-[15px] max-w-sm">Connecting researchers, practitioners, policymakers and communities to reduce food loss and waste across Africa.</p>
          <p className="text-xs text-white/60 dark:text-faint">Demonstration build. All people, organisations and records shown are fictional sample data.</p>
        </div>
        <FooterCol title="Explore" links={[['/knowledge', 'Knowledge hub'], ['/datasets', 'Datasets'], ['/learn', 'Learning'], ['/map', 'Network map'], ['/news', 'News']]} />
        <FooterCol title="Network" links={[['/about', 'About'], ['/leadership', 'Leadership'], ['/organisations', 'Organisations'], ['/events', 'Events'], ['/opportunities', 'Opportunities']]} />
        <div>
          <h3 className="text-white dark:text-fg text-sm uppercase tracking-wider mb-3">Support</h3>
          <ul className="space-y-2 text-[15px]">
            {[['/help', 'Help centre'], ['/contact', 'Contact us'], ['/policies', 'Privacy and terms']].map(([to, l]) => <li key={to}><Link to={to} className="text-white/85 dark:text-muted hover:text-white no-underline">{l}</Link></li>)}
            <li><button className="text-white/85 dark:text-muted hover:text-white underline underline-offset-4" onClick={() => setFb(true)}>Send feedback about this page</button></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/15 dark:border-line"><div className="wrap py-4 text-sm text-white/70 dark:text-faint flex flex-wrap justify-between gap-2"><span>© {new Date().getFullYear()} FLW Research Network in Africa</span><span>Platform figures show network activity, not measured reductions in food loss.</span></div></div>
      <FeedbackModal open={fb} onClose={() => setFb(false)} />
    </footer>
  );
}
function FooterCol({ title, links }: { title: string; links: string[][] }) {
  return <div><h3 className="text-white dark:text-fg text-sm uppercase tracking-wider mb-3">{title}</h3><ul className="space-y-2 text-[15px]">{links.map(([to, l]) => <li key={to}><Link to={to} className="text-white/85 dark:text-muted hover:text-white no-underline">{l}</Link></li>)}</ul></div>;
}
export function FeedbackModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [msg, setMsg] = useState(''); const loc = useLocation();
  const a = useAction(api.feedback, { success: (r) => `Thanks. Your feedback reference is ${r}.`, onSuccess: () => { setMsg(''); onClose(); } });
  return (
    <Modal open={open} onClose={onClose} title="Send feedback" footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button busy={a.busy} onClick={() => a.run(loc.pathname, msg)}>Send feedback</Button></>}>
      <p className="text-muted text-sm mb-3">Tell us what worked, what didn’t, or what is missing on <strong className="text-fg">{loc.pathname}</strong>. The team reviews every message.</p>
      <Textarea aria-label="Your feedback" value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="For example: I could not find the language filter on my phone." />
      {a.errors.message && <p className="field-error">{a.errors.message}</p>}
    </Modal>
  );
}

function BottomTabs() {
  const { isMember } = useSession(); const unread = useUnread();
  if (!isMember) return null;
  const tabs = [{ to: '/dashboard', label: 'Home', icon: Home }, { to: '/knowledge', label: 'Knowledge', icon: BookOpen }, { to: '/events', label: 'Events', icon: CalendarDays }, { to: '/community', label: 'Community', icon: MessagesSquare }, { to: '/profile', label: 'Me', icon: UserIcon }];
  return (
    <nav aria-label="Member" className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-surface/95 backdrop-blur border-t border-line" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)', paddingLeft: 'env(safe-area-inset-left, 0px)', paddingRight: 'env(safe-area-inset-right, 0px)' }}>
      <div className="grid grid-cols-5">
        {tabs.map((t) => (
          <NavLink key={t.to} to={t.to} className={({ isActive }) => cn('flex flex-col items-center gap-0.5 py-2 text-[11.5px] font-semibold no-underline min-h-[56px] justify-center relative', isActive ? 'text-primary' : 'text-muted')}>
            <t.icon size={21} />{t.label}{t.to === '/dashboard' && unread > 0 && <span className="absolute top-1.5 left-1/2 ml-2 w-2 h-2 rounded-full bg-secondary" />}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

function OfflineBanner() {
  const online = useOnline();
  if (online) return null;
  return <div className="bg-warning-soft text-fg text-sm py-2"><div className="wrap flex items-center gap-2"><WifiOff size={16} className="text-warning" />You are offline. We will retry when your connection returns; your drafts are saved on this device.</div></div>;
}

export function PublicLayout() {
  const { isMember } = useSession();
  const loc = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [loc.pathname]);
  return (
    <div className={cn('min-h-screen flex flex-col', isMember && 'pb-[72px] lg:pb-0')}>
      <Header /><OfflineBanner />
      <main id="main" className="flex-1" tabIndex={-1}><Suspense fallback={<PageLoading />}><Outlet /></Suspense></main>
      <Footer /><BottomTabs /><DemoPanel />
    </div>
  );
}

export function MemberLayout() {
  return (
    <div className="wrap py-6 md:py-8 grid lg:grid-cols-[230px_1fr] gap-8">
      <aside className="hidden lg:block">
        <nav aria-label="Member area" className="sticky top-24 flex flex-col gap-0.5">
          {MEMBER_NAV.map((n) => <NavLink key={n.to} to={n.to} className={({ isActive }) => cn('flex items-center gap-3 px-3 py-2 rounded-lg text-[15px] font-medium no-underline', isActive ? 'bg-primary-soft text-primary-strong font-semibold' : 'text-muted hover:bg-surface-2 hover:text-fg')}><n.icon size={18} />{n.label}</NavLink>)}
        </nav>
      </aside>
      <div className="min-w-0"><Suspense fallback={<PageLoading inner />}><Outlet /></Suspense></div>
    </div>
  );
}
function PageLoading({ inner }: { inner?: boolean }) {
  return <div className={inner ? '' : 'wrap py-16'} aria-busy="true" aria-label="Loading page"><div className="skel h-8 w-56 mb-4" /><div className="skel h-40 w-full" /></div>;
}

export function ConsoleLayout() {
  const { hasRole } = useSession();
  const items = CONSOLE_NAV.filter((n) => hasRole(...(n.roles as unknown as ('reviewer' | 'moderator' | 'editor' | 'admin')[])));
  return (
    <div className="wrap py-6 md:py-8">
      <div className="flex items-center gap-2 mb-4 text-sm"><ShieldCheck size={16} className="text-secondary" /><span className="font-semibold text-secondary uppercase tracking-wider text-xs">Staff console</span></div>
      <div className="grid lg:grid-cols-[220px_1fr] gap-8">
        <nav aria-label="Console" className="flex lg:flex-col gap-1 overflow-x-auto scrollbar-none -mx-4 px-4 lg:mx-0 lg:px-0 lg:sticky lg:top-24 lg:self-start">
          {items.map((n) => <NavLink key={n.to} to={n.to} end={'end' in n} className={({ isActive }) => cn('flex items-center gap-2.5 px-3 py-2 rounded-lg text-[15px] font-medium no-underline whitespace-nowrap', isActive ? 'bg-secondary-soft text-secondary font-semibold' : 'text-muted hover:bg-surface-2 hover:text-fg')}><n.icon size={18} />{n.label}</NavLink>)}
        </nav>
        <div className="min-w-0"><Suspense fallback={<PageLoading inner />}><Outlet /></Suspense></div>
      </div>
    </div>
  );
}

export function RequireMember({ children }: { children: ReactNode }) {
  const { user, loading, isMember } = useSession(); const loc = useLocation();
  if (loading) return <div className="wrap py-16"><div className="skel h-8 w-48" /></div>;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname + loc.search)}`} replace />;
  if (!isMember) return <Navigate to="/application-status" replace />;
  return <>{children}</>;
}
export function RequireStaff({ children, roles }: { children: ReactNode; roles?: ('reviewer' | 'moderator' | 'editor' | 'admin')[] }) {
  const { user, loading, hasRole, isStaff } = useSession(); const loc = useLocation();
  if (loading) return <div className="wrap py-16"><div className="skel h-8 w-48" /></div>;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname)}`} replace />;
  if (!(roles ? hasRole(...roles) : isStaff)) return (
    <div className="wrap py-16 max-w-xl"><h1 className="text-2xl mb-2">You do not have access to this page</h1><p className="text-muted mb-4">This area is for network staff with the right role. If you need access, ask an administrator.</p><Button to="/dashboard">Go to your dashboard</Button></div>
  );
  return <>{children}</>;
}

// ---------------------------------------------------------------- demo panel
const DEMO_ACCOUNTS = [
  { email: 'amina@demo.flw', who: 'Amina Mwakyusa', role: 'Member · early-career researcher', note: 'Has a returned submission, messages and a workspace' },
  { email: 'neema@demo.flw', who: 'Neema Mollel', role: 'Member · extension officer', note: 'Community knowledge in review' },
  { email: 'kwame@demo.flw', who: 'Kwame Asante', role: 'Member · policy adviser', note: 'Policy brief in review' },
  { email: 'joseph@demo.flw', who: 'Joseph Otieno', role: 'Moderator and reviewer', note: 'Two-step sign-in' },
  { email: 'grace@demo.flw', who: 'Grace Achieng', role: 'Administrator and editor', note: 'Full console access' },
  { email: 'fatou@demo.flw', who: 'Fatou Diallo', role: 'Applicant (pending)', note: 'Sees application status only' },
];

function DemoPanel() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'accounts' | 'inbox'>('accounts');
  const { user } = useSession();
  const nav = useNavigate(); const qc = useQueryClient();
  const inbox = useQuery({ queryKey: ['demo-inbox'], queryFn: api.demoInbox, enabled: open, refetchInterval: open ? 3000 : false });
  const login = useAction(api.demoQuickLogin, { onSuccess: async () => { setOpen(false); await qc.resetQueries(); await qc.fetchQuery({ queryKey: ['me'], queryFn: api.me }); nav('/dashboard'); } });
  const reset = useAction(api.demoReset, { success: 'Demo data restored to its starting state', onSuccess: () => { setOpen(false); nav('/'); } });
  const out = useAction(api.logout, { success: 'Signed out', onSuccess: () => setOpen(false) });
  const expire = useAction(api.demoExpireSession, { success: 'Session idle time set past 30 minutes. Your next action will sign you out.' });
  return (
    <>
      <button onClick={() => setOpen(true)} className="fixed z-30 left-4 lg:left-5 btn btn-accent btn-sm shadow-lg" style={{ bottom: `calc(${user && user.status === 'approved' ? 84 : 20}px + env(safe-area-inset-bottom, 0px))`, marginLeft: 'env(safe-area-inset-left, 0px)' }} aria-label="Open demo tools">
        <FlaskConical size={16} /><span className="hidden sm:inline">Demo</span>
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Demo tools" side="right">
        <p className="text-sm text-muted mb-3">Switch between test accounts and read the emails the system sends. Everything is stored only in this browser.</p>
        <div role="tablist" className="tabs mb-4">
          <button role="tab" aria-selected={tab === 'accounts'} className="tab" onClick={() => setTab('accounts')}>Accounts</button>
          <button role="tab" aria-selected={tab === 'inbox'} className="tab" onClick={() => setTab('inbox')}>Email and SMS inbox {inbox.data?.length ? `(${inbox.data.length})` : ''}</button>
        </div>
        {tab === 'accounts' ? (
          <div className="space-y-3">
            <div className="panel p-3 text-sm"><p>Password for every account: <code className="font-mono font-semibold select-all">{DEMO_PASSWORD}</code></p><p>Two-step sign-in code: <code className="font-mono font-semibold select-all">{DEMO_MFA_CODE}</code></p></div>
            {DEMO_ACCOUNTS.map((a) => (
              <div key={a.email} className={cn('card p-3 flex items-center gap-3', user?.email === a.email && 'border-primary')}>
                <Avatar name={a.who} hue={(a.email.charCodeAt(0) * 47) % 360} size={38} />
                <div className="min-w-0 flex-1"><p className="font-semibold text-[15px]">{a.who}</p><p className="text-xs text-muted">{a.role}</p><p className="text-xs text-faint">{a.note}</p></div>
                {user?.email === a.email ? <span className="text-xs font-semibold text-primary">Signed in</span> : <Button size="sm" variant="secondary" icon={<LogIn size={14} />} busy={login.busy} onClick={() => login.run(a.email)}>Use</Button>}
              </div>
            ))}
            <div className="flex flex-wrap gap-2 pt-2">
              {user && <Button variant="secondary" size="sm" icon={<LogOut size={14} />} onClick={() => out.run()}>Sign out</Button>}
              {user && <Button variant="secondary" size="sm" icon={<Clock size={14} />} onClick={() => expire.run()}>Simulate 30 min idle</Button>}
              <Button variant="danger" size="sm" icon={<RotateCcw size={14} />} busy={reset.busy} onClick={() => reset.run()}>Reset demo data</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {!inbox.data?.length && <p className="text-muted text-sm">No messages yet. Apply to join, reset a password or submit a resource to see emails here.</p>}
            {inbox.data?.map((m) => (
              <div key={m.id} className="card p-3">
                <div className="flex justify-between gap-2 text-xs text-muted"><span className="truncate">To: {m.to}</span><span className="shrink-0">{timeAgo(m.createdAt)}</span></div>
                <p className="font-semibold text-[15px] mt-1">{m.subject}</p>
                <p className="text-sm text-muted whitespace-pre-line mt-1">{m.body}</p>
                {m.action && <Button size="sm" className="mt-2" onClick={() => { setOpen(false); nav(m.action!.path); }}>{m.action.label}</Button>}
              </div>
            ))}
            {!!inbox.data?.length && <Button size="sm" variant="ghost" icon={<X size={14} />} onClick={() => api.demoClearInbox().then(() => inbox.refetch())}>Clear inbox</Button>}
          </div>
        )}
      </Sheet>
    </>
  );
}
