import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BadgeCheck, Eye, Download, ShieldCheck, Smartphone, Copy, Palette, Bell, Lock, UserX, Building2 } from 'lucide-react';
import { api, type Visibility, type DataRequest } from '@/api';
import { TAXONOMY } from '@/api/seed';
import { useSession } from '@/lib/session';
import { usePrefs } from '@/lib/prefs';
import { useAction, useDocTitle } from '@/lib/hooks';
import { useToast } from '@/lib/toast';
import { fmtDate } from '@/lib/format';
import { category, country, topic } from '@/lib/labels';
import { Alert, Avatar, Badge, Button, ChipSelect, Empty, ErrorSummary, Field, Input, Modal, PageHeader, RowsSkeleton, Select, StatusBadge, Switch, Tabs, Textarea, Confirm } from '@/components/ui';
import { cn } from '@/lib/cn';

export function MemberCardView({ c }: { c: Awaited<ReturnType<typeof api.previewCard>> }) {
  return (
    <div className="card p-5">
      <div className="flex gap-4 items-start"><Avatar name={c.name} hue={c.avatarHue} size={56} />
        <div className="min-w-0"><p className="font-display font-semibold text-lg flex items-center gap-1.5">{c.name}{c.orcid && <BadgeCheck size={18} className="text-success" aria-label="Verified ORCID iD" />}</p>
          <p className="text-sm text-muted">{category(c.category)}{c.country ? ` · ${country(c.country)}` : ''}</p>
          {c.organisation ? <Link to={`/organisations/${c.organisation.slug}`} className="text-sm link inline-flex items-center gap-1"><Building2 size={13} />{c.organisation.name}</Link> : c.affiliation && <p className="text-sm">{c.affiliation}</p>}</div></div>
      {c.biography && <p className="mt-4 text-[15px]">{c.biography}</p>}
      {c.interests && c.interests.length > 0 && <div className="flex flex-wrap gap-1.5 mt-4">{c.interests.map((i) => <span key={i} className="pill bg-primary-soft text-primary-strong">{topic(i)}</span>)}</div>}
      {c.email && <p className="text-sm text-muted mt-4">Email: <span className="text-fg select-all">{c.email}</span></p>}
      {c.orcid && <p className="text-sm text-muted mt-1">ORCID iD: <span className="font-mono text-fg">{c.orcid}</span></p>}
    </div>
  );
}

export function Profile() {
  useDocTitle('Profile');
  const { user } = useSession();
  const [f, setF] = useState(() => user ? { name: user.name, country: user.country, category: user.category, affiliation: user.affiliation, biography: user.biography, interests: user.interests, visibility: user.visibility, acceptsRequests: user.acceptsRequests } : null);
  const [preview, setPreview] = useState(false);
  const [orcidOpen, setOrcidOpen] = useState(false); const [orcid, setOrcid] = useState('');
  const save = useAction(api.updateProfile, { success: 'Profile saved. Changes are visible now.' });
  const pv = useQuery({ queryKey: ['preview-card', user?.id], queryFn: api.previewCard, enabled: preview });
  const link = useAction(api.linkOrcid, { success: 'ORCID iD verified and linked', onSuccess: () => setOrcidOpen(false) });
  const unlink = useAction(api.unlinkOrcid, { success: 'ORCID iD removed' });
  useEffect(() => { if (user && !f) setF({ name: user.name, country: user.country, category: user.category, affiliation: user.affiliation, biography: user.biography, interests: user.interests, visibility: user.visibility, acceptsRequests: user.acceptsRequests }); }, [user, f]);
  if (!user || !f) return <RowsSkeleton />;
  const vis = (k: keyof Visibility, v: boolean) => setF({ ...f, visibility: { ...f.visibility, [k]: v } });
  return (
    <>
      <PageHeader title="Your profile" intro="Your profile is private by default. Switch on each detail you want other members to see." actions={<Button variant="secondary" icon={<Eye size={18} />} onClick={() => setPreview(true)}>Preview as others see me</Button>} />
      <form onSubmit={(e) => { e.preventDefault(); save.run(f); }} className="space-y-8">
        <ErrorSummary errors={save.errors} />
        <section className="card p-5 md:p-6 space-y-5">
          <div className="flex items-center gap-4"><Avatar name={f.name} hue={user.avatarHue} size={64} /><div><p className="font-display font-semibold text-lg">{f.name}</p><p className="text-sm text-muted">Member since {fmtDate(user.joinedAt)}</p></div></div>
          <div className="grid sm:grid-cols-2 gap-5">
            <Field id="f-name" label="Full name" error={save.errors.name} required>{(p) => <Input {...p} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />}</Field>
            <Field label="Stakeholder group">{(p) => <Select {...p} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>{TAXONOMY.categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</Select>}</Field>
          </div>
          <VisRow label="Country" on={f.visibility.country} onChange={(v) => vis('country', v)}><Field label="Country">{(p) => <Select {...p} value={f.country} onChange={(e) => setF({ ...f, country: e.target.value })}>{TAXONOMY.countries.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</Select>}</Field></VisRow>
          <VisRow label="Affiliation" on={f.visibility.affiliation} onChange={(v) => vis('affiliation', v)}>
            <Field label="Organisation or affiliation" hint={<>Want it confirmed? Find your organisation in <Link to="/organisations" className="link">Organisations</Link> and request affiliation.</>}>{(p) => <Input {...p} value={f.affiliation} onChange={(e) => setF({ ...f, affiliation: e.target.value })} />}</Field>
            {user.orgId && <p className="text-sm mt-2">{user.orgConfirmed ? <Badge tone="green" icon={<BadgeCheck size={13} />}>Affiliation confirmed by the organisation</Badge> : <Badge tone="gold">Affiliation awaiting confirmation</Badge>}</p>}
          </VisRow>
          <VisRow label="Biography" on={f.visibility.biography} onChange={(v) => vis('biography', v)}>
            <Field id="f-biography" label="Biography" error={save.errors.biography} hint={`${f.biography.length}/800 characters`}>{(p) => <Textarea {...p} rows={4} maxLength={800} value={f.biography} onChange={(e) => setF({ ...f, biography: e.target.value })} placeholder="What you work on, where, and what you are looking for." />}</Field>
          </VisRow>
          <VisRow label="Interests" on={f.visibility.interests} onChange={(v) => vis('interests', v)}>
            <p className="label">Research interests</p><ChipSelect label="Interests" options={TAXONOMY.topics} value={f.interests} onChange={(v) => setF({ ...f, interests: v })} />
          </VisRow>
          <VisRow label="Email" on={f.visibility.email} onChange={(v) => vis('email', v)}><p className="label">Email</p><p className="text-muted">{user.email}</p></VisRow>
        </section>
        <section className="card p-5 md:p-6">
          <h2 className="text-lg">Contact and identity</h2>
          <Switch label="Accept connection requests" hint="Other members can send you a short introduction. You decide whether to accept." checked={f.acceptsRequests} onChange={(v) => setF({ ...f, acceptsRequests: v })} />
          <div className="border-t border-line pt-4 mt-2 flex items-center justify-between gap-4 flex-wrap">
            <div><p className="font-medium">ORCID iD</p>{user.orcid ? <p className="text-sm text-success flex items-center gap-1.5"><BadgeCheck size={16} />Verified · <span className="font-mono">{user.orcid}</span></p> : <p className="text-sm text-muted">Link your researcher identifier. It shows as verified only after you sign in to ORCID.</p>}</div>
            {user.orcid ? <Button size="sm" variant="ghost" busy={unlink.busy} onClick={() => unlink.run()}>Remove</Button> : <Button size="sm" variant="secondary" onClick={() => setOrcidOpen(true)}>Link ORCID iD</Button>}
          </div>
        </section>
        <div className="flex justify-end gap-2 sticky bottom-[84px] lg:bottom-4 z-10"><Button type="submit" busy={save.busy} className="shadow-lg">Save profile</Button></div>
      </form>
      <Modal open={preview} onClose={() => setPreview(false)} title="How other members see you">
        <p className="text-sm text-muted mb-4">This preview uses your saved profile. Save first to see recent changes.</p>
        {pv.data ? <MemberCardView c={pv.data} /> : <RowsSkeleton n={2} />}
      </Modal>
      <Modal open={orcidOpen} onClose={() => setOrcidOpen(false)} title="Link your ORCID iD" footer={<><Button variant="secondary" onClick={() => setOrcidOpen(false)}>Cancel</Button><Button busy={link.busy} onClick={() => link.run(orcid.trim())}>Sign in to ORCID and link</Button></>}>
        <p className="text-muted text-sm mb-4">In the live system you sign in at orcid.org to prove the iD is yours. This demo simulates that step.</p>
        <Field label="ORCID iD" error={link.errors.orcid} hint="Format: 0000-0002-1825-0097">{(p) => <Input {...p} className="font-mono" value={orcid} onChange={(e) => setOrcid(e.target.value)} placeholder="0000-0000-0000-0000" />}</Field>
      </Modal>
    </>
  );
}
function VisRow({ label, on, onChange, children }: { label: string; on: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <div className="grid sm:grid-cols-[1fr_180px] gap-3 sm:gap-5 items-start border-t border-line pt-5">
      <div className="min-w-0">{children}</div>
      <div className={cn('rounded-xl px-3 py-1', on ? 'bg-primary-soft' : 'bg-surface-2')}>
        <Switch label={on ? 'Visible to members' : 'Hidden'} hint={`${label} in directory`} checked={on} onChange={onChange} />
      </div>
    </div>
  );
}

export function Settings() {
  useDocTitle('Settings');
  const [sp, setSp] = useSearchParams();
  const tab = (sp.get('tab') ?? 'notifications') as 'notifications' | 'channels' | 'appearance' | 'security' | 'account';
  const { user } = useSession(); const prefs = usePrefs(); const toast = useToast();
  const pr = useAction(api.updatePrefs);
  const [phone, setPhone] = useState(''); const [code, setCode] = useState(''); const [sent, setSent] = useState(false);
  const sendCode = useAction(api.sendPhoneCode, { success: 'Code sent by SMS (see Demo → inbox)', onSuccess: () => setSent(true) });
  const verify = useAction(api.verifyPhone, { success: 'Phone number verified', onSuccess: () => { setSent(false); setCode(''); } });
  const removePhone = useAction(api.removePhone, { success: 'Phone number removed' });
  const [mfaOpen, setMfaOpen] = useState(false); const [mfaCode, setMfaCode] = useState('');
  const mfa = useAction(api.setMfa, { success: 'Two-step sign-in updated', onSuccess: () => { setMfaOpen(false); setMfaCode(''); } });
  const [pw, setPw] = useState({ current: '', next: '' });
  const chpw = useAction(api.changePassword, { success: 'Password changed', onSuccess: () => setPw({ current: '', next: '' }) });
  const [closeOpen, setCloseOpen] = useState(false); const [closeReason, setCloseReason] = useState('');
  const closure = useAction(api.requestClosure, { success: 'Closure requested. An administrator will process it.', onSuccess: () => setCloseOpen(false) });
  if (!user) return <RowsSkeleton />;
  const n = user.prefs.notif; const ch = user.prefs.channels;
  const setN = (k: keyof typeof n, v: boolean) => { pr.run({ notif: { ...n, [k]: v } }); toast({ kind: 'success', text: v ? 'Subscribed' : 'Unsubscribed' }); };
  return (
    <>
      <PageHeader title="Settings" />
      <Tabs label="Settings sections" value={tab} onChange={(t) => setSp({ tab: t }, { replace: true })} tabs={[{ id: 'notifications', label: 'Notifications' }, { id: 'channels', label: 'SMS and WhatsApp' }, { id: 'appearance', label: 'Appearance' }, { id: 'security', label: 'Security' }, { id: 'account', label: 'Account' }]} />
      <div className="mt-6 max-w-2xl">
        {tab === 'notifications' && <section className="card p-5 divide-y divide-line">
          <div className="pb-2"><h2 className="text-lg flex items-center gap-2"><Bell size={18} />Email notifications</h2><p className="text-sm text-muted">Optional emails are off until you switch them on. You can unsubscribe at any time without affecting your account.</p></div>
          <Switch label="Account and security notices" hint="Decisions on your application and submissions, password changes and sign-in alerts. Always on." checked onChange={() => {}} disabled />
          <Switch label="Event announcements" hint="New webinars, workshops and reminders." checked={n.events} onChange={(v) => setN('events', v)} />
          <Switch label="Community replies" hint="When someone replies in a discussion you joined." checked={n.community} onChange={(v) => setN('community', v)} />
          <Switch label="Opportunities" hint="New funding, fellowships and collaboration calls." checked={n.opportunities} onChange={(v) => setN('opportunities', v)} />
          <Switch label="Network newsletter" hint="Monthly highlights, sent to your countries and interests." checked={n.newsletter} onChange={(v) => setN('newsletter', v)} />
        </section>}
        {tab === 'channels' && <section className="card p-5 space-y-4">
          <h2 className="text-lg flex items-center gap-2"><Smartphone size={18} />SMS and WhatsApp alerts</h2>
          <p className="text-sm text-muted">Receive short alerts on your phone. Your number is stored only with your consent, is never shown to other members, and you can remove it at any time. Security notices always go by email.</p>
          <Alert tone="info">Candidate feature pending validation with members (FR035). The provider is not yet selected.</Alert>
          {ch.verified ? <>
            <div className="panel p-4 flex items-center justify-between gap-3 flex-wrap"><div><p className="font-medium font-mono">{ch.phone}</p><p className="text-sm text-success flex items-center gap-1"><BadgeCheck size={14} />Verified</p></div><Button size="sm" variant="ghost" busy={removePhone.busy} onClick={() => removePhone.run()}>Remove number</Button></div>
            <Switch label="SMS alerts" hint="Event reminders and decisions." checked={ch.sms} onChange={(v) => pr.run({ channels: { ...ch, sms: v } })} />
            <Switch label="WhatsApp alerts" hint="Same alerts through WhatsApp." checked={ch.whatsapp} onChange={(v) => pr.run({ channels: { ...ch, whatsapp: v } })} />
          </> : !sent ? <div className="flex gap-2 items-end flex-wrap">
            <div className="flex-1 min-w-[220px]"><Field label="Mobile number" error={sendCode.errors.phone} hint="International format, for example +255 712 345 678">{(p) => <Input {...p} type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+255…" />}</Field></div>
            <Button busy={sendCode.busy} onClick={() => sendCode.run(phone)} className="mb-[2px]">Send code</Button></div>
          : <div className="flex gap-2 items-end flex-wrap">
            <div className="flex-1 min-w-[180px]"><Field label="Code from SMS" error={verify.errors.code} hint="Demo code: 135790">{(p) => <Input {...p} inputMode="numeric" className="font-mono tracking-widest" value={code} onChange={(e) => setCode(e.target.value)} />}</Field></div>
            <Button busy={verify.busy} onClick={() => verify.run(code)} className="mb-[2px]">Verify</Button><Button variant="ghost" onClick={() => setSent(false)} className="mb-[2px]">Change number</Button></div>}
        </section>}
        {tab === 'appearance' && <section className="card p-5 space-y-5">
          <h2 className="text-lg flex items-center gap-2"><Palette size={18} />Appearance</h2>
          <fieldset><legend className="label">Colour theme</legend><div className="grid grid-cols-3 gap-2">{(['light', 'dark', 'system'] as const).map((t) => (
            <label key={t} className={cn('card p-3 cursor-pointer text-center font-semibold capitalize', prefs.theme === t && 'border-primary bg-primary-soft text-primary-strong')}><input type="radio" name="theme" className="sr-only" checked={prefs.theme === t} onChange={() => prefs.setTheme(t)} />{t === 'system' ? 'Match device' : t}</label>))}</div></fieldset>
          <Switch label="Reduced data mode" hint="Stops the landing page video and uses a still picture. Saved on this device." checked={prefs.dataSaver} onChange={prefs.setDataSaver} />
          <Field label="Interface language" hint="More languages will be added once the network approves them (decision D04).">{(p) => <Select {...p} value="en" onChange={() => {}}><option value="en">English</option>{TAXONOMY.languages.slice(1).map((l) => <option key={l.id} disabled>{l.label} (coming later)</option>)}</Select>}</Field>
        </section>}
        {tab === 'security' && <section className="space-y-5">
          <div className="card p-5"><h2 className="text-lg flex items-center gap-2"><ShieldCheck size={18} />Two-step sign-in</h2>
            <p className="text-sm text-muted mt-1">Adds a six-digit code from an authenticator app after your password. Required for staff.</p>
            <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">{user.mfaEnabled ? <Badge tone="green" icon={<ShieldCheck size={13} />}>On</Badge> : <Badge>Off</Badge>}{user.mfaEnabled ? <Button variant="ghost" busy={mfa.busy} onClick={() => mfa.run(false)}>Turn off</Button> : <Button onClick={() => setMfaOpen(true)}>Turn on</Button>}</div>
          </div>
          <form className="card p-5 space-y-4" onSubmit={(e) => { e.preventDefault(); chpw.run(pw.current, pw.next); }}><h2 className="text-lg flex items-center gap-2"><Lock size={18} />Change password</h2>
            <Field label="Current password" error={chpw.errors.current}>{(p) => <Input {...p} type="password" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} />}</Field>
            <Field label="New password" hint="At least 12 characters." error={chpw.errors.next}>{(p) => <Input {...p} type="password" autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />}</Field>
            <Button type="submit" busy={chpw.busy}>Change password</Button></form>
          <div className="card p-5"><h2 className="text-lg">Sessions</h2><p className="text-sm text-muted mt-1">You are signed out after 30 minutes without activity, and after 12 hours in any case.</p></div>
        </section>}
        {tab === 'account' && <section className="card p-5 space-y-3">
          <h2 className="text-lg flex items-center gap-2"><UserX size={18} />Close your account</h2>
          <p className="text-muted">An administrator processes closure requests. Your public attribution is anonymised; records we must keep follow the network’s retention schedule. To get a copy of your data first, use <Link to="/privacy-requests" className="link">Privacy requests</Link>.</p>
          {user.status === 'closure_pending' ? <Alert tone="warning">Your closure request is waiting for an administrator.</Alert> : <Button variant="danger" onClick={() => setCloseOpen(true)}>Request account closure</Button>}
        </section>}
      </div>
      <Modal open={mfaOpen} onClose={() => setMfaOpen(false)} title="Turn on two-step sign-in" footer={<><Button variant="secondary" onClick={() => setMfaOpen(false)}>Cancel</Button><Button busy={mfa.busy} onClick={() => mfa.run(true, mfaCode)}>Verify and turn on</Button></>}>
        <ol className="list-decimal pl-5 space-y-2 text-[15px] mb-4"><li>Open an authenticator app on your phone.</li><li>Scan the code your app shows, or enter the setup key <code className="font-mono bg-surface-2 px-1 rounded select-all">FLWR-DEMO-7Q4K-2M8P</code>.</li><li>Enter the six-digit code the app shows.</li></ol>
        <Field label="Six-digit code" error={mfa.errors.code} hint="Demo code: 246810">{(p) => <Input {...p} inputMode="numeric" className="font-mono tracking-[.3em] text-center text-lg" maxLength={6} value={mfaCode} onChange={(e) => setMfaCode(e.target.value)} />}</Field>
      </Modal>
      <Confirm open={closeOpen} onClose={() => setCloseOpen(false)} title="Request account closure?" body="You can keep using the site until an administrator processes the request, and you can cancel it from your dashboard." confirmLabel="Request closure" danger busy={closure.busy} onConfirm={() => closure.run(closeReason)}>
        <div className="mt-4"><Field label="Reason" optional>{(p) => <Textarea {...p} rows={3} value={closeReason} onChange={(e) => setCloseReason(e.target.value)} />}</Field></div>
      </Confirm>
    </>
  );
}

export function PrivacyRequests() {
  useDocTitle('Privacy requests');
  const q = useQuery({ queryKey: ['my-privacy'], queryFn: api.myDataRequests });
  const [kind, setKind] = useState<DataRequest['kind']>('access'); const [details, setDetails] = useState('');
  const create = useAction(api.createDataRequest, { success: (r) => `Request ${r} sent to the privacy contact`, onSuccess: () => setDetails('') });
  const [exp, setExp] = useState<string | null>(null); const toast = useToast();
  const exportA = useAction(api.exportMyData, { onSuccess: (d) => setExp(JSON.stringify(d, null, 2)) });
  return (
    <>
      <PageHeader title="Privacy requests" intro="Ask for a copy of your data, a correction or deletion. The privacy contact checks your identity before releasing anything." actions={<Button variant="secondary" icon={<Download size={18} />} busy={exportA.busy} onClick={() => exportA.run()}>Export my data now</Button>} />
      <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
        <form className="card p-5 space-y-4 self-start" onSubmit={(e) => { e.preventDefault(); create.run(kind, details); }}>
          <h2 className="text-lg">New request</h2>
          <fieldset><legend className="label">Type of request</legend><div className="grid gap-2">{([['access', 'Access', 'Get a copy of the personal data the network holds about you'], ['correction', 'Correction', 'Fix something that is wrong'], ['deletion', 'Deletion', 'Ask us to delete data we no longer need']] as const).map(([k, l, h]) => (
            <label key={k} className={cn('card p-3 flex gap-3 cursor-pointer', kind === k && 'border-primary bg-primary-soft')}><input type="radio" name="kind" className="check" checked={kind === k} onChange={() => setKind(k)} /><span><span className="font-semibold block">{l}</span><span className="text-sm text-muted">{h}</span></span></label>))}</div></fieldset>
          <Field label="Details" error={create.errors.details} required>{(p) => <Textarea {...p} rows={4} value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Describe what you would like us to do." />}</Field>
          <Button type="submit" busy={create.busy}>Send request</Button>
        </form>
        <section><h2 className="text-lg mb-3">Your requests</h2>
          {q.isLoading ? <RowsSkeleton n={2} /> : !q.data?.length ? <Empty title="No requests yet" /> : <ul className="space-y-3">{q.data.map((d) => (
            <li key={d.id} className="card p-4"><div className="flex justify-between gap-2"><p className="font-semibold capitalize">{d.kind} request <span className="font-mono text-sm text-muted">{d.ref}</span></p><StatusBadge status={d.status} /></div>
              <p className="text-sm text-muted mt-1">{d.details}</p><p className="text-xs text-faint mt-2">Sent {fmtDate(d.createdAt)}{d.resolvedAt ? ` · resolved ${fmtDate(d.resolvedAt)}` : ''}</p>
              {d.resolution && <p className="text-sm panel p-2 mt-2">{d.resolution}</p>}</li>))}</ul>}
        </section>
      </div>
      <Modal open={!!exp} onClose={() => setExp(null)} title="Your data" size="lg" footer={<><Button variant="secondary" icon={<Copy size={16} />} onClick={async () => { try { await navigator.clipboard.writeText(exp ?? ''); toast({ kind: 'success', text: 'Copied' }); } catch { toast({ kind: 'info', text: 'Select the text to copy it' }); } }}>Copy</Button><Button onClick={() => setExp(null)}>Done</Button></>}>
        <p className="text-sm text-muted mb-3">This export includes your own records only, never other members’ private data.</p>
        <pre className="panel p-3 text-xs overflow-auto max-h-[50vh] select-all">{exp}</pre>
      </Modal>
    </>
  );
}
