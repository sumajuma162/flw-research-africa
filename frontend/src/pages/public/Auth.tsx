import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff, KeyRound, Mail, ShieldCheck, Clock, XCircle, Inbox, FlaskConical } from 'lucide-react';
import { api, ApiError } from '@/api';
import { TAXONOMY } from '@/api/seed';
import { IMAGES } from '@/lib/media';
import { category, country, topic } from '@/lib/labels';
import { fmtDate, newKey } from '@/lib/format';
import { useAction, useDocTitle, useDraft } from '@/lib/hooks';
import { useSession } from '@/lib/session';
import { useToast } from '@/lib/toast';
import { Alert, Button, Check, ChipSelect, ErrorSummary, Field, Input, Select, Skeleton, StatusBadge, Textarea } from '@/components/ui';
import { Logo } from '@/components/domain';
import { cn } from '@/lib/cn';

function AuthFrame({ children, image = 'market', caption }: { children: React.ReactNode; image?: keyof typeof IMAGES; caption?: string }) {
  return (
    <div className="wrap py-8 md:py-12">
      <div className="grid lg:grid-cols-[1fr_1fr] gap-10 items-start max-w-6xl mx-auto">
        <div className="min-w-0 max-w-xl w-full mx-auto lg:mx-0">{children}</div>
        <div className="hidden lg:block sticky top-24">
          <div className="relative rounded-3xl overflow-hidden"><img src={IMAGES[image].src} alt={IMAGES[image].alt} className="w-full aspect-[4/5] object-cover" />
            <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/70 to-transparent text-white"><Logo inverse /><p className="mt-3 text-white/90 text-[15px]">{caption ?? 'Researchers, practitioners, policymakers and communities working together on food loss and waste.'}</p></div></div>
        </div>
      </div>
    </div>
  );
}

function PasswordInput(p: React.InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false);
  return <div className="relative"><Input {...p} type={show ? 'text' : 'password'} className="pr-12" /><button type="button" className="btn-icon absolute right-0.5 top-1/2 -translate-y-1/2 !min-h-[40px] !min-w-[40px] text-muted" aria-label={show ? 'Hide password' : 'Show password'} onClick={() => setShow(!show)}>{show ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>;
}
function strength(pw: string) {
  let s = 0; if (pw.length >= 12) s++; if (pw.length >= 16) s++; if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++; if (/\d/.test(pw)) s++; if (/[^A-Za-z0-9]/.test(pw)) s++;
  return pw.length < 12 ? { n: 1, label: 'Too short' } : s <= 2 ? { n: 2, label: 'Fair' } : s <= 3 ? { n: 3, label: 'Good' } : { n: 4, label: 'Strong' };
}

const STEPS = ['Account', 'About you', 'Interests', 'Review and consent'];
const step1 = z.object({ name: z.string().trim().min(2, 'Enter your full name.'), email: z.string().trim().email('Enter a valid email address, like name@example.org.'), password: z.string().min(12, 'Use at least 12 characters.') });
const step2 = z.object({ country: z.string().min(1, 'Select your country.'), category: z.string().min(1, 'Select the group that describes you best.') });
const step3 = z.object({ interests: z.array(z.string()).min(1, 'Choose at least one interest.') });

export function Join() {
  useDocTitle('Join the network');
  const { user } = useSession();
  const [draft, setDraft, savedAt, clearDraft] = useDraft('flw-join-draft', { step: 0, name: '', email: '', country: '', category: '', affiliation: '', interests: [] as string[], motivation: '', directory: false });
  const [password, setPassword] = useState('');
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [key] = useState(newKey);
  const [done, setDone] = useState<{ ref: string; email: string } | null>(null);
  const a = useAction(api.register, { onSuccess: (r) => { setDone({ ref: r.ref, email: draft.email }); clearDraft(); } });
  const set = (p: Partial<typeof draft>) => setDraft({ ...draft, ...p });
  useEffect(() => { if (Object.keys(a.errors).length) { setErrors(a.errors); const s = ['name', 'email', 'password'].some((k) => a.errors[k]) ? 0 : ['country', 'category'].some((k) => a.errors[k]) ? 1 : 3; set({ step: s }); } /* eslint-disable-next-line */ }, [a.errors]);

  const validate = (s: number) => {
    const schema = [step1, step2, step3][s];
    if (!schema) { if (!consent) { setErrors({ consent: 'You must agree to the membership terms and privacy notice to apply.' }); return false; } return true; }
    const r = schema.safeParse({ ...draft, password });
    if (r.success) { setErrors({}); return true; }
    setErrors(Object.fromEntries(r.error.issues.map((i) => [String(i.path[0]), i.message]))); return false;
  };
  const next = (e?: FormEvent) => { e?.preventDefault(); if (!validate(draft.step)) return; if (draft.step < 3) { set({ step: draft.step + 1 }); window.scrollTo(0, 0); } else a.run({ ...draft, password, consent }, key); };
  const st = strength(password);

  if (user) return <div className="wrap py-16 max-w-lg"><Alert tone="info" title="You are already signed in">Sign out first if you want to apply with a different email.</Alert><Button className="mt-4" to={user.status === 'approved' ? '/dashboard' : '/application-status'}>Continue</Button></div>;
  if (done) return (
    <AuthFrame image="research">
      <div className="card p-8"><span className="w-14 h-14 rounded-full bg-primary-soft text-primary flex items-center justify-center mb-4"><Mail size={26} /></span>
        <h1 className="text-[28px]">Check your email</h1>
        <p className="text-muted mt-2 text-[17px]">We sent a verification link to <strong className="text-fg">{done.email}</strong>. Your application <strong className="text-fg font-mono">{done.ref}</strong> goes to our reviewers once you confirm your email.</p>
        <Alert tone="info" icon={<FlaskConical size={18} />} title="Testing this demo?">Open <strong>Demo</strong> (bottom left), choose <strong>Email and SMS inbox</strong>, then select <strong>Verify email</strong>.</Alert>
        <div className="mt-6 flex gap-3 flex-wrap"><Button variant="secondary" onClick={() => api.resendVerification(done.email)}>Resend the email</Button><Button variant="ghost" to="/">Back to home page</Button></div>
      </div>
    </AuthFrame>
  );

  return (
    <AuthFrame image={(['market', 'cold-chain', 'storage', 'heritage'] as const)[draft.step]} caption="Membership is free and reviewed. Your profile stays private until you choose what to show.">
      <p className="eyebrow mb-2">Join the network</p>
      <h1 className="text-[28px] md:text-[34px]">Apply for membership</h1>
      <ol className="flex gap-2 my-6" aria-label="Progress">
        {STEPS.map((s, i) => <li key={s} className="flex-1"><div className={cn('h-1.5 rounded-full', i <= draft.step ? 'bg-primary' : 'bg-surface-3')} /><span className={cn('hidden sm:block text-xs mt-1.5 font-semibold', i === draft.step ? 'text-primary' : 'text-muted')}>{i + 1}. {s}</span></li>)}
      </ol>
      <p className="sm:hidden text-sm font-semibold text-primary -mt-3 mb-4">Step {draft.step + 1} of 4: {STEPS[draft.step]}</p>
      <form onSubmit={next} noValidate className="space-y-5">
        <ErrorSummary errors={errors} />
        {draft.step === 0 && <>
          <Field id="f-name" label="Full name" error={errors.name} required>{(p) => <Input {...p} autoComplete="name" value={draft.name} onChange={(e) => set({ name: e.target.value })} />}</Field>
          <Field id="f-email" label="Email" hint="We send a verification link here." error={errors.email} required>{(p) => <Input {...p} type="email" autoComplete="email" inputMode="email" value={draft.email} onChange={(e) => set({ email: e.target.value })} />}</Field>
          <Field id="f-password" label="Password" hint="At least 12 characters. A short phrase is easy to remember." error={errors.password} required>{(p) => <PasswordInput {...p} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />}</Field>
          {password && <div aria-live="polite"><div className="flex gap-1">{[1, 2, 3, 4].map((i) => <span key={i} className={cn('h-1.5 flex-1 rounded-full', i <= st.n ? (st.n <= 1 ? 'bg-danger' : st.n === 2 ? 'bg-warning' : 'bg-success') : 'bg-surface-3')} />)}</div><p className="text-sm text-muted mt-1">Strength: {st.label}</p></div>}
        </>}
        {draft.step === 1 && <>
          <Field id="f-country" label="Country where you mainly work" error={errors.country} required>{(p) => <Select {...p} value={draft.country} onChange={(e) => set({ country: e.target.value })}><option value="">Choose a country…</option>{TAXONOMY.countries.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</Select>}</Field>
          <fieldset><legend className="label">Which group describes you best? <span className="text-danger">*</span></legend>
            <div id="f-category" tabIndex={-1} className="grid sm:grid-cols-2 gap-2 mt-1">{TAXONOMY.categories.map((c) => (
              <label key={c.id} className={cn('card p-3 flex gap-3 items-start cursor-pointer', draft.category === c.id && 'border-primary bg-primary-soft')}><input type="radio" name="cat" className="check" checked={draft.category === c.id} onChange={() => set({ category: c.id })} /><span className="text-[15px] font-medium">{c.label}</span></label>))}</div>
            {errors.category && <p className="field-error">{errors.category}</p>}</fieldset>
          <Field id="f-affiliation" label="Organisation or affiliation" optional hint="University, institute, ministry, company, cooperative or community group.">{(p) => <Input {...p} autoComplete="organization" value={draft.affiliation} onChange={(e) => set({ affiliation: e.target.value })} />}</Field>
        </>}
        {draft.step === 2 && <>
          <fieldset><legend className="label">Topics you work on <span className="text-danger">*</span></legend><p className="hint mb-3">Choose all that apply. Reviewers use this to welcome you to the right groups.</p>
            <div id="f-interests" tabIndex={-1}><ChipSelect label="Topics" options={TAXONOMY.topics} value={draft.interests} onChange={(v) => set({ interests: v })} /></div>
            {errors.interests && <p className="field-error">{errors.interests}</p>}</fieldset>
          <Field id="f-motivation" label="Why do you want to join?" optional hint="Two or three sentences help reviewers.">{(p) => <Textarea {...p} rows={4} value={draft.motivation} onChange={(e) => set({ motivation: e.target.value })} />}</Field>
        </>}
        {draft.step === 3 && <>
          <div className="panel p-4 space-y-2 text-[15px]">
            {[['Name', draft.name, 0], ['Email', draft.email, 0], ['Country', country(draft.country), 1], ['Group', category(draft.category), 1], ['Affiliation', draft.affiliation || 'Not given', 1], ['Interests', draft.interests.map(topic).join(', '), 2]].map(([k, v, s]) => (
              <div key={k as string} className="flex justify-between gap-4"><span className="text-muted shrink-0">{k}</span><span className="text-right min-w-0 break-words">{v} <button type="button" className="link text-sm ml-1" onClick={() => set({ step: s as number })}>Edit</button></span></div>))}
          </div>
          <div className="card p-4 space-y-2">
            <Check label="Show my affiliation and interests in the member directory once I am approved" hint="Optional. Your email is never shown unless you choose to show it later. You can change this at any time." checked={draft.directory} onChange={(v) => set({ directory: v })} />
            <div id="f-consent" tabIndex={-1}><Check label={<>I agree to the <Link to="/policies" className="link" target="_blank">membership terms and privacy notice</Link> (version privacy-2026.1)</>} checked={consent} onChange={setConsent} /></div>
            {errors.consent && <p className="field-error">{errors.consent}</p>}
          </div>
        </>}
        <div className="flex items-center justify-between gap-3 pt-2">
          {draft.step > 0 ? <Button variant="ghost" icon={<ArrowLeft size={18} />} onClick={() => { setErrors({}); set({ step: draft.step - 1 }); }}>Back</Button> : <span />}
          <Button type="submit" busy={a.busy}>{draft.step < 3 ? <>Continue<ArrowRight size={18} /></> : 'Send application'}</Button>
        </div>
        <p className="text-xs text-faint text-right">{savedAt ? `Progress saved on this device at ${savedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Your password is not saved.` : 'Your progress is saved on this device as you go.'}</p>
      </form>
      <p className="mt-8 text-muted">Already a member? <Link to="/login" className="link">Sign in</Link></p>
    </AuthFrame>
  );
}

export function VerifyEmail() {
  const [sp] = useSearchParams(); const token = sp.get('token') ?? '';
  const [state, setState] = useState<'working' | 'ok' | 'bad'>('working'); const [ref, setRef] = useState<string | undefined>(); const [msg, setMsg] = useState('');
  useDocTitle('Verify email');
  useEffect(() => { api.verifyEmail(token).then((r) => { setRef(r.ref); setState('ok'); }).catch((e: ApiError) => { setMsg(e.title); setState('bad'); }); }, [token]);
  return (
    <div className="wrap py-16 max-w-lg text-center">
      {state === 'working' ? <><Skeleton className="h-14 w-14 rounded-full mx-auto" /><p className="mt-4 text-muted">Checking your link…</p></>
        : state === 'ok' ? <><CheckCircle2 size={56} className="text-success mx-auto" /><h1 className="text-[28px] mt-4">Email confirmed</h1><p className="text-muted mt-2">Application <strong className="font-mono text-fg">{ref}</strong> is now with our membership reviewers. We will email you with the decision. You can sign in to follow its status.</p><Button className="mt-6" to="/login">Sign in</Button></>
        : <><XCircle size={56} className="text-danger mx-auto" /><h1 className="text-[28px] mt-4">This link did not work</h1><p className="text-muted mt-2">{msg}</p><Button className="mt-6" to="/login">Go to sign in</Button></>}
    </div>
  );
}

export function Login() {
  useDocTitle('Sign in');
  const [sp] = useSearchParams(); const nav = useNavigate(); const qc = useQueryClient(); const toast = useToast();
  const [email, setEmail] = useState(''); const [pw, setPw] = useState(''); const [code, setCode] = useState('');
  const [mfa, setMfa] = useState(false); const [errCode, setErrCode] = useState<string | undefined>();
  const next = sp.get('next') || '/dashboard';
  const finish = async () => { await qc.invalidateQueries(); const me = await api.me(); nav(me && me.status !== 'approved' && me.status !== 'closure_pending' ? '/application-status' : next, { replace: true }); };
  const login = useAction(api.login, { silentError: true, onSuccess: (r) => { if (r.mfaRequired) setMfa(true); else finish(); } });
  const verify = useAction(api.verifyMfa, { onSuccess: () => finish() });
  useEffect(() => { setErrCode(login.error?.code); }, [login.error]);
  const { user } = useSession();
  useEffect(() => { if (user && !mfa && !login.busy && !verify.busy) nav(user.status === 'approved' || user.status === 'closure_pending' ? next : '/application-status', { replace: true }); }, [user, mfa, login.busy, verify.busy, next, nav]);
  return (
    <AuthFrame image="storage">
      {!mfa ? <>
        <h1 className="text-[28px] md:text-[34px]">Sign in</h1><p className="text-muted mt-1 mb-6">Welcome back to the network.</p>
        {login.error && <div className="mb-5"><Alert tone="danger" title={login.error.title}>{errCode === 'unverified' && <button className="link" onClick={() => { api.resendVerification(email); toast({ kind: 'success', text: 'If the account needs verifying, we sent a new link.' }); }}>Send a new verification link</button>}{errCode === 'invalid_credentials' && <Link to="/reset-password" className="link">Forgot your password?</Link>}</Alert></div>}
        <form onSubmit={(e) => { e.preventDefault(); login.run(email, pw); }} className="space-y-5" noValidate>
          <Field label="Email">{(p) => <Input {...p} type="email" autoComplete="username" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} required />}</Field>
          <Field label={<span className="flex justify-between w-full">Password</span>}>{(p) => <PasswordInput {...p} autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} required />}</Field>
          <div className="flex items-center justify-between gap-3 flex-wrap"><Link to="/reset-password" className="link text-[15px]">Forgot password?</Link><Button type="submit" busy={login.busy}>Sign in</Button></div>
        </form>
        <div className="panel p-4 mt-8 text-sm"><p className="font-semibold flex items-center gap-2"><FlaskConical size={16} className="text-secondary" />Demo accounts</p><p className="text-muted mt-1">Use <strong className="text-fg">amina@demo.flw</strong> (member), <strong className="text-fg">joseph@demo.flw</strong> (moderator) or <strong className="text-fg">grace@demo.flw</strong> (admin) with password <code className="font-mono text-fg">harvest-2026</code>. Staff code: <code className="font-mono text-fg">246810</code>. Or open <strong>Demo</strong> at the bottom left.</p></div>
        <p className="mt-6 text-muted">New here? <Link to="/join" className="link">Apply to join the network</Link></p>
      </> : <>
        <span className="w-14 h-14 rounded-full bg-primary-soft text-primary flex items-center justify-center mb-4"><ShieldCheck size={26} /></span>
        <h1 className="text-[28px]">Two-step sign-in</h1><p className="text-muted mt-1 mb-6">Enter the six-digit code from your authenticator app.</p>
        <form onSubmit={(e) => { e.preventDefault(); verify.run(code); }} className="space-y-5">
          <Field label="Code" error={verify.errors.code} hint="In this demo the code is 246810.">{(p) => <Input {...p} data-autofocus autoFocus inputMode="numeric" autoComplete="one-time-code" maxLength={7} className="tracking-[.4em] font-mono text-xl text-center" value={code} onChange={(e) => setCode(e.target.value)} />}</Field>
          <div className="flex justify-between gap-3"><Button variant="ghost" icon={<ArrowLeft size={18} />} onClick={() => { setMfa(false); setCode(''); }}>Back</Button><Button type="submit" busy={verify.busy}>Verify and sign in</Button></div>
        </form>
      </>}
    </AuthFrame>
  );
}

export function ResetPassword() {
  useDocTitle('Reset password');
  const [sp] = useSearchParams(); const token = sp.get('token'); const nav = useNavigate();
  const [email, setEmail] = useState(''); const [pw, setPw] = useState(''); const [pw2, setPw2] = useState(''); const [sent, setSent] = useState(false); const [mismatch, setMismatch] = useState('');
  const req = useAction(api.requestPasswordReset, { onSuccess: () => setSent(true) });
  const reset = useAction(api.resetPassword, { success: 'Password changed. Sign in with your new password.', onSuccess: () => nav('/login') });
  return (
    <AuthFrame image="cold-chain">
      <span className="w-14 h-14 rounded-full bg-primary-soft text-primary flex items-center justify-center mb-4"><KeyRound size={26} /></span>
      {token ? <>
        <h1 className="text-[28px]">Choose a new password</h1><p className="text-muted mt-1 mb-6">You will be signed out on all devices.</p>
        <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); if (pw !== pw2) { setMismatch('The passwords do not match.'); return; } setMismatch(''); reset.run(token, pw); }}>
          <Field label="New password" hint="At least 12 characters." error={reset.errors.password}>{(p) => <PasswordInput {...p} autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />}</Field>
          <Field label="Confirm new password" error={mismatch}>{(p) => <PasswordInput {...p} autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} />}</Field>
          {reset.error?.code === 'bad_token' && <Alert tone="danger" title={reset.error.title}><Link to="/reset-password" className="link">Request a new link</Link></Alert>}
          <Button type="submit" busy={reset.busy}>Save new password</Button>
        </form>
      </> : sent ? <>
        <h1 className="text-[28px]">Check your email</h1>
        <p className="text-muted mt-2">If an account exists for <strong className="text-fg">{email}</strong>, we sent a link to reset the password. It works once and expires in one hour.</p>
        <Alert tone="info" icon={<Inbox size={18} />}>In this demo, open <strong>Demo</strong> → <strong>Email and SMS inbox</strong> to find the link.</Alert>
        <Button className="mt-6" variant="secondary" to="/login">Back to sign in</Button>
      </> : <>
        <h1 className="text-[28px]">Reset your password</h1><p className="text-muted mt-1 mb-6">Enter the email you joined with. We will send you a link.</p>
        <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); req.run(email); }}>
          <Field label="Email">{(p) => <Input {...p} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />}</Field>
          <div className="flex justify-between gap-3"><Button variant="ghost" to="/login" icon={<ArrowLeft size={18} />}>Back</Button><Button type="submit" busy={req.busy}>Send reset link</Button></div>
        </form>
      </>}
    </AuthFrame>
  );
}

export function ApplicationStatus() {
  useDocTitle('Application status');
  const { user } = useSession();
  const q = useQuery({ queryKey: ['my-app'], queryFn: api.myApplication, enabled: !!user });
  const nav = useNavigate();
  useEffect(() => { if (user && (user.status === 'approved' || user.status === 'closure_pending')) nav('/dashboard', { replace: true }); }, [user, nav]);
  if (!user) return <div className="wrap py-16 max-w-lg"><Alert tone="info">Sign in to see your application.</Alert><Button className="mt-4" to="/login">Sign in</Button></div>;
  const a = q.data;
  const steps = [{ label: 'Application sent', done: true, at: a?.createdAt }, { label: 'Email verified', done: a?.status !== 'unverified', at: undefined }, { label: 'Reviewed by the membership team', done: a?.status === 'approved' || a?.status === 'rejected', at: a?.decidedAt }];
  return (
    <div className="wrap py-10 max-w-2xl">
      <p className="eyebrow mb-2">Membership</p><h1 className="text-[30px]">Your application</h1>
      {!a ? <Skeleton className="h-40 mt-6" /> : <>
        <div className="card p-6 mt-6"><div className="flex justify-between items-start gap-3 flex-wrap"><div><p className="text-sm text-muted">Reference</p><p className="font-mono font-semibold text-lg">{a.ref}</p></div><StatusBadge status={a.status === 'pending' ? 'open' : a.status} /></div>
          <ol className="mt-6 space-y-4">{steps.map((s, i) => <li key={i} className="flex gap-3">{s.done ? <CheckCircle2 className="text-success shrink-0" /> : <Clock className="text-muted shrink-0" />}<div><p className={cn('font-medium', !s.done && 'text-muted')}>{s.label}</p>{s.at && <p className="text-sm text-muted">{fmtDate(s.at)}</p>}</div></li>)}</ol></div>
        {a.status === 'pending' && <div className="mt-5"><Alert tone="info" title="What happens next">A reviewer checks every application, usually within a few working days. We will email you and you will see the decision here.</Alert></div>}
        {a.status === 'rejected' && <div className="mt-5"><Alert tone="warning" title="Your application was not approved">{a.reason} You can appeal by <Link to="/contact" className="link">contacting the network coordinator</Link>.</Alert></div>}
        <dl className="panel p-4 mt-5 grid grid-cols-[120px_1fr] gap-2 text-[15px]"><dt className="text-muted">Country</dt><dd>{country(a.country)}</dd><dt className="text-muted">Group</dt><dd>{category(a.category)}</dd><dt className="text-muted">Interests</dt><dd>{a.interests.map(topic).join(', ')}</dd></dl>
      </>}
    </div>
  );
}
export { useMemo };
