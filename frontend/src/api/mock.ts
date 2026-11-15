/* Simulated Django REST API.
 * Every function behaves like an /api/v1 endpoint: it checks the session and permissions on the
 * "server" side, validates input, records audit events and returns copies of data, never live objects.
 * Data persists in the browser (localStorage) so testers can follow multi-step workflows. */
import type * as T from './types';
import { makeSeed, DEMO_MFA_CODE, CONSENT_VERSION } from './seed';

const KEY = 'flw-demo-db-v4';
const IDLE_MS = 30 * 60 * 1000;
const ABS_MS = 12 * 60 * 60 * 1000;
const SUPPRESS = 3;
const MAX_UPLOAD = 20 * 1024 * 1024;
const ALLOWED_EXT = ['pdf', 'docx', 'xlsx', 'csv', 'pptx', 'zip', 'txt', 'odt', 'ods'];
const STAFF: T.Role[] = ['reviewer', 'moderator', 'editor', 'admin'];

export class ApiError extends Error {
  status: number; title: string; errors?: Record<string, string>; code?: string;
  constructor(status: number, title: string, errors?: Record<string, string>, code?: string) {
    super(title); this.status = status; this.title = title; this.errors = errors; this.code = code;
  }
}

// ------------------------------------------------------------------ storage
let db: T.DB;
function load(): T.DB {
  try { const raw = localStorage.getItem(KEY); if (raw) { const d = JSON.parse(raw) as T.DB; if (d.version === 4) return d; } } catch { /* storage unavailable */ }
  return makeSeed();
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { /* storage unavailable: keep in memory */ } }
db = load();

const listeners = new Set<() => void>();
export const onSessionChange = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };

// ------------------------------------------------------------------ helpers
const clone = <X,>(x: X): X => JSON.parse(JSON.stringify(x));
const nowIso = () => new Date().toISOString();
const id = (p: string) => `${p}${(++db.seq).toString(36)}`;
const ref = (p: string) => `${p}-${String(++db.seq).slice(-4)}`;
const corr = () => `c-${Math.random().toString(16).slice(2, 6)}`;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
function need(cond: unknown, status: number, title: string, errors?: Record<string, string>, code?: string): asserts cond {
  if (!cond) throw new ApiError(status, title, errors, code);
}
const slugify = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'item';
const userById = (uid?: string) => db.users.find((u) => u.id === uid);
const nameOf = (uid?: string) => userById(uid)?.name ?? 'Unknown';
const isStaff = (u?: T.User | null) => !!u && u.roles.some((r) => STAFF.includes(r));
const has = (u: T.User | null | undefined, ...roles: T.Role[]) => !!u && u.status === 'approved' && roles.some((r) => u.roles.includes(r));

async function endpoint<R>(fn: () => R, ms = 160): Promise<R> {
  await sleep(ms + Math.random() * 180);
  try { const out = fn(); save(); return clone(out); } catch (e) { save(); throw e; }
}

function audit(action: string, object: string, result: T.AuditEvent['result'] = 'success', actor?: T.User | null) {
  const a = actor === undefined ? current() : actor;
  db.audit.unshift({ id: id('au'), at: nowIso(), actorId: a?.id, actorName: a?.name ?? 'Visitor', action, object, result, correlationId: corr() });
}
function notify(userId: string, kind: T.Notification['kind'], title: string, body: string, link?: string) {
  db.notifications.unshift({ id: id('nt'), userId, kind, title, body, link, createdAt: nowIso(), read: false });
}
function email(to: string, subject: string, body: string, action?: T.Email['action']) {
  db.emails.unshift({ id: id('em'), to, subject, body, createdAt: nowIso(), action });
}

// ------------------------------------------------------------------ session
function current(): T.User | null {
  const s = db.session; if (!s) return null;
  const u = userById(s.userId);
  const t = Date.now();
  const expired = t - Date.parse(s.lastSeen) > IDLE_MS || t - Date.parse(s.startedAt) > ABS_MS;
  if (!u || expired || !['approved', 'pending', 'closure_pending'].includes(u.status)) { db.session = null; save(); listeners.forEach((l) => l()); return null; }
  return u;
}
function touch() { if (db.session) db.session.lastSeen = nowIso(); }
function requireUser(): T.User { const u = current(); need(u, 401, 'Please sign in to continue.', undefined, 'not_authenticated'); touch(); return u; }
function requireMember(): T.User { const u = requireUser(); need(u.status === 'approved' || u.status === 'closure_pending', 403, 'This is available to approved members only.'); return u; }
function requireRole(...roles: T.Role[]): T.User {
  const u = requireMember();
  if (!roles.some((r) => u.roles.includes(r))) { audit('permission.denied', roles.join('|'), 'denied', u); save(); throw new ApiError(403, 'You do not have permission to do this.'); }
  return u;
}
const publicUser = (u: T.User): T.PublicUser => { const { password: _p, ...rest } = u; return rest; };
function startSession(u: T.User) { db.session = { userId: u.id, startedAt: nowIso(), lastSeen: nowIso() }; db.mfaChallenge = null; listeners.forEach((l) => l()); }

// ------------------------------------------------------------------ resources
function canSeeResource(r: T.Resource, viewer: T.User | null): boolean {
  if (viewer && (r.ownerId === viewer.id || has(viewer, 'reviewer', 'admin'))) return true;
  if (r.status !== 'published' && r.status !== 'withdrawn') return false;
  if (r.visibility === 'public') return true;
  if (r.visibility === 'members') return !!viewer && viewer.status === 'approved';
  return false; // restricted
}
function viewOf(r: T.Resource, viewer: T.User | null, latest = false): T.ResourceView {
  const privileged = !!viewer && (r.ownerId === viewer.id || has(viewer, 'reviewer', 'admin'));
  const pub = r.versions.find((v) => v.no === r.publishedNo);
  const v = (latest && privileged) || !pub ? r.versions[r.versions.length - 1] : pub;
  const { versions, ...rest } = r;
  return { ...rest, v, versionCount: versions.length, ownerName: nameOf(r.ownerId),
    history: versions.map((x) => ({ no: x.no, status: x.status, submittedAt: x.submittedAt, reviewedAt: x.reviewedAt, reviewNote: privileged ? x.reviewNote : undefined, title: x.title })) };
}

type SubmitInput = Omit<T.ResourceVersion, 'no' | 'submittedBy' | 'submittedAt' | 'status'> & { type: T.ResourceType; visibility: T.Visib };
function validateSubmission(p: SubmitInput, finalSubmit: boolean): Record<string, string> {
  const e: Record<string, string> = {};
  if (!p.title || p.title.trim().length < 8) e.title = 'Enter a title of at least 8 characters.';
  if (!finalSubmit) return e;
  if (!p.summary || p.summary.trim().length < 40) e.summary = 'Write a summary of at least 40 characters so others can judge relevance.';
  if (!p.authors?.length) e.authors = 'Add at least one author or custodian.';
  if (!p.countries?.length) e.countries = 'Select at least one country or region.';
  if (!p.topics?.length) e.topics = 'Select at least one topic.';
  if (!p.rights) e.rights = 'Choose a rights statement before submitting.';
  if (!p.year || p.year < 1950 || p.year > new Date().getFullYear() + 1) e.year = 'Enter a valid year.';
  if (!p.url && !p.fileName) e.source = 'Add a link or attach a file.';
  if (p.url && !/^https?:\/\/[^\s]+\.[^\s]+/i.test(p.url)) e.url = 'Links must start with http:// or https://.';
  if (p.fileName) {
    const ext = p.fileName.split('.').pop()?.toLowerCase() ?? '';
    if (!ALLOWED_EXT.includes(ext)) e.file = `Files of type .${ext} are not accepted. Use PDF, Word, Excel, CSV, PowerPoint, ZIP or text.`;
    if ((p.fileSize ?? 0) > MAX_UPLOAD) e.file = 'Files must be 20 MB or smaller.';
  }
  if (p.type === 'dataset') {
    if (!p.dataset?.custodian) e['dataset.custodian'] = 'Name the data custodian.';
    if (!p.dataset?.period) e['dataset.period'] = 'Give the collection period.';
    if (!p.dataset?.access) e['dataset.access'] = 'Describe the licence or access conditions.';
  }
  if (p.type === 'indigenous_knowledge') {
    if (!p.ik?.authority) e['ik.authority'] = 'Name who gave permission to share this knowledge.';
    if (!p.ik?.restrictions) e['ik.restrictions'] = 'State any limits on sharing, or “No limits”.';
    if (!p.ik?.community) e['ik.community'] = 'Name the community or place this knowledge comes from.';
  }
  return e;
}
function notifyReviewers(title: string, body: string, link: string) {
  db.users.filter((u) => u.status === 'approved' && u.roles.some((r) => r === 'reviewer' || r === 'admin')).forEach((u) => notify(u.id, 'system', title, body, link));
}

// ------------------------------------------------------------------ API
export const api = {
  // ---------------- auth
  me: () => endpoint(() => { const u = current(); if (u) touch(); return u ? publicUser(u) : null; }, 40),

  login: (emailAddr: string, password: string) => endpoint(() => {
    const em = emailAddr.trim().toLowerCase();
    const recent = (db.loginFailures[em] ?? []).filter((t) => Date.now() - Date.parse(t) < 10 * 60 * 1000);
    need(recent.length < 5, 429, 'Too many sign-in attempts. Wait 10 minutes or reset your password.', undefined, 'throttled');
    const u = db.users.find((x) => x.email === em);
    if (!u || u.password !== password || u.status === 'closed') {
      db.loginFailures[em] = [...recent, nowIso()]; audit('auth.login', em, 'failure', null);
      throw new ApiError(400, 'Email or password is incorrect.', undefined, 'invalid_credentials');
    }
    db.loginFailures[em] = [];
    need(u.status !== 'unverified', 403, 'Please verify your email address first. We can send a new link.', undefined, 'unverified');
    need(u.status !== 'rejected', 403, 'Your membership application was not approved. Contact the network if you would like to appeal.', undefined, 'rejected');
    need(u.status !== 'suspended', 403, 'This account is suspended. Contact the network administrator.', undefined, 'suspended');
    if (u.mfaEnabled) { db.mfaChallenge = u.id; return { mfaRequired: true as const }; }
    startSession(u); audit('auth.login', u.email, 'success', u);
    return { mfaRequired: false as const };
  }, 350),

  verifyMfa: (code: string) => endpoint(() => {
    const u = userById(db.mfaChallenge ?? undefined);
    need(u, 400, 'Your sign-in has expired. Start again.');
    if (code.replace(/\s/g, '') !== DEMO_MFA_CODE) { audit('auth.mfa', u.email, 'failure', u); throw new ApiError(400, 'That code is not correct. Check your authenticator app and try again.', { code: 'Incorrect code.' }); }
    startSession(u); audit('auth.login_mfa', u.email, 'success', u);
    return true;
  }, 300),

  logout: () => endpoint(() => { const u = current(); if (u) audit('auth.logout', u.email, 'success', u); db.session = null; listeners.forEach((l) => l()); return true; }, 80),

  register: (p: { name: string; email: string; password: string; country: string; category: string; affiliation: string; interests: string[]; motivation: string; consent: boolean; directory: boolean }, key: string) => endpoint(() => {
    if (db.idempotency[key]) return { ref: db.idempotency[key] };
    const e: Record<string, string> = {};
    if (!p.name || p.name.trim().length < 2) e.name = 'Enter your full name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email)) e.email = 'Enter a valid email address, like name@example.org.';
    if (!p.password || p.password.length < 12) e.password = 'Use at least 12 characters.';
    else if (/^(password|123456|qwerty)/i.test(p.password)) e.password = 'This password is too common. Choose another.';
    if (!p.country) e.country = 'Select your country.';
    if (!p.category) e.category = 'Select the group that describes you best.';
    if (!p.consent) e.consent = 'You must agree to the membership terms and privacy notice to apply.';
    need(!Object.keys(e).length, 400, 'Some fields need attention.', e);
    const em = p.email.trim().toLowerCase();
    const r = ref('APP');
    db.idempotency[key] = r;
    const existing = db.users.find((u) => u.email === em);
    if (existing) {
      // Same response as a new application, so account existence is not revealed (FR005).
      email(em, 'Someone tried to apply with your email', 'An application was started with this email address, which already has an account. If this was you, sign in or reset your password.', { label: 'Reset password', path: '/reset-password' });
      return { ref: r };
    }
    const uid = id('u');
    db.users.push({ id: uid, email: em, password: p.password, name: p.name.trim(), status: 'unverified', roles: ['member'], mfaEnabled: false, country: p.country, category: p.category,
      affiliation: p.affiliation, biography: '', interests: p.interests, visibility: { affiliation: p.directory, biography: false, interests: p.directory, email: false, country: true },
      joinedAt: nowIso(), avatarHue: Math.floor(Math.random() * 360), acceptsRequests: false, blocked: [],
      prefs: { theme: 'system', language: 'en', notif: { events: false, community: false, newsletter: false, opportunities: false }, channels: { phone: '', verified: false, sms: false, whatsapp: false } },
      consents: [{ scope: 'membership', version: CONSENT_VERSION, at: nowIso() }, ...(p.directory ? [{ scope: 'directory', version: CONSENT_VERSION, at: nowIso() }] : [])], learnProgress: [] });
    db.applications.push({ id: id('a'), ref: r, userId: uid, category: p.category, country: p.country, affiliation: p.affiliation, interests: p.interests, motivation: p.motivation, status: 'unverified', createdAt: nowIso(), consentVersion: CONSENT_VERSION });
    const token = Math.random().toString(36).slice(2, 10);
    db.tokens.push({ token, userId: uid, kind: 'verify', expiresAt: new Date(Date.now() + 24 * 3600e3).toISOString(), used: false });
    email(em, 'Verify your email address', `Welcome, ${p.name}. Confirm your email to send your application (${r}) to our reviewers. This link works once and expires in 24 hours.`, { label: 'Verify email', path: `/verify-email?token=${token}` });
    audit('application.create', r, 'success', null);
    return { ref: r };
  }, 500),

  verifyEmail: (token: string) => endpoint(() => {
    const t = db.tokens.find((x) => x.token === token && x.kind === 'verify');
    need(t && !t.used && Date.parse(t.expiresAt) > Date.now(), 400, 'This link has expired or was already used. Request a new one from the sign-in page.', undefined, 'bad_token');
    t.used = true;
    const u = userById(t.userId)!; u.status = 'pending';
    const a = db.applications.find((x) => x.userId === u.id); if (a) a.status = 'pending';
    notifyReviewers('New membership application', `${u.name} applied to join (${a?.ref}).`, '/console?tab=applications');
    audit('auth.verify_email', u.email, 'success', u);
    return { ref: a?.ref };
  }),

  resendVerification: (em: string) => endpoint(() => {
    const u = db.users.find((x) => x.email === em.trim().toLowerCase() && x.status === 'unverified');
    if (u) {
      const token = Math.random().toString(36).slice(2, 10);
      db.tokens.push({ token, userId: u.id, kind: 'verify', expiresAt: new Date(Date.now() + 24 * 3600e3).toISOString(), used: false });
      email(u.email, 'Verify your email address', 'Here is a new verification link. It works once and expires in 24 hours.', { label: 'Verify email', path: `/verify-email?token=${token}` });
    }
    return true;
  }),

  requestPasswordReset: (em: string) => endpoint(() => {
    const u = db.users.find((x) => x.email === em.trim().toLowerCase() && x.status !== 'closed');
    if (u) {
      const token = Math.random().toString(36).slice(2, 10);
      db.tokens.push({ token, userId: u.id, kind: 'reset', expiresAt: new Date(Date.now() + 3600e3).toISOString(), used: false });
      email(u.email, 'Reset your password', 'Use this link to choose a new password. It works once and expires in one hour. If you did not ask for this, you can ignore this email.', { label: 'Choose a new password', path: `/reset-password?token=${token}` });
    }
    audit('auth.password_reset_request', em, 'success', null);
    return true; // Same response whether or not the account exists.
  }, 400),

  resetPassword: (token: string, password: string) => endpoint(() => {
    const t = db.tokens.find((x) => x.token === token && x.kind === 'reset');
    need(t && !t.used && Date.parse(t.expiresAt) > Date.now(), 400, 'This reset link has expired or was already used. Request a new one.', undefined, 'bad_token');
    need(password.length >= 12, 400, 'Use at least 12 characters.', { password: 'Use at least 12 characters.' });
    t.used = true; const u = userById(t.userId)!; u.password = password;
    if (db.session?.userId === u.id) db.session = null; // sign out everywhere
    email(u.email, 'Your password was changed', 'Your password was changed and you were signed out on all devices. If this was not you, contact the network immediately.');
    audit('auth.password_reset', u.email, 'success', u); listeners.forEach((l) => l());
    return true;
  }),

  changePassword: (oldPw: string, newPw: string) => endpoint(() => {
    const u = requireUser();
    need(u.password === oldPw, 400, 'Your current password is not correct.', { current: 'Incorrect password.' });
    need(newPw.length >= 12, 400, 'Use at least 12 characters.', { next: 'Use at least 12 characters.' });
    u.password = newPw; audit('auth.password_change', u.email); return true;
  }),
  setMfa: (enable: boolean, code?: string) => endpoint(() => {
    const u = requireUser();
    if (enable) need(code === DEMO_MFA_CODE, 400, 'That code is not correct.', { code: 'Incorrect code.' });
    else need(!isStaff(u), 400, 'Staff accounts must keep two-step sign-in turned on.');
    u.mfaEnabled = enable; audit(enable ? 'auth.mfa_enable' : 'auth.mfa_disable', u.email); return true;
  }),

  // ---------------- application status
  myApplication: () => endpoint(() => { const u = requireUser(); return db.applications.find((a) => a.userId === u.id) ?? null; }),

  // ---------------- profile and preferences
  updateProfile: (p: Partial<Pick<T.User, 'name' | 'affiliation' | 'biography' | 'interests' | 'country' | 'category' | 'visibility' | 'acceptsRequests'>>) => endpoint(() => {
    const u = requireUser();
    need(!p.name || p.name.trim().length >= 2, 400, 'Enter your full name.', { name: 'Enter your full name.' });
    need(!p.biography || p.biography.length <= 800, 400, 'Keep your biography under 800 characters.', { biography: 'Too long.' });
    Object.assign(u, p);
    if (p.visibility) {
      const anyShown = p.visibility.affiliation || p.visibility.biography || p.visibility.interests || p.visibility.email;
      const c = u.consents.find((x) => x.scope === 'directory' && !x.withdrawnAt);
      if (anyShown && !c) u.consents.push({ scope: 'directory', version: CONSENT_VERSION, at: nowIso() });
      if (!anyShown && c) c.withdrawnAt = nowIso();
    }
    audit('profile.update', u.email); return publicUser(u);
  }),
  updatePrefs: (p: Partial<T.User['prefs']>) => endpoint(() => {
    const u = current(); if (!u) return null;
    if (p.notif) {
      (['events', 'community', 'newsletter', 'opportunities'] as const).forEach((k) => {
        if (p.notif![k] !== u.prefs.notif[k]) {
          const c = u.consents.find((x) => x.scope === `subscription:${k}` && !x.withdrawnAt);
          if (p.notif![k] && !c) u.consents.push({ scope: `subscription:${k}`, version: CONSENT_VERSION, at: nowIso() });
          if (!p.notif![k] && c) c.withdrawnAt = nowIso();
        }
      });
    }
    u.prefs = { ...u.prefs, ...p, notif: { ...u.prefs.notif, ...(p.notif ?? {}) }, channels: { ...u.prefs.channels, ...(p.channels ?? {}) } };
    return publicUser(u);
  }, 60),
  sendPhoneCode: (phone: string) => endpoint(() => {
    const u = requireMember();
    need(/^\+\d{9,15}$/.test(phone.replace(/\s/g, '')), 400, 'Enter your number in international format, like +255 712 345 678.', { phone: 'Use international format.' });
    u.prefs.channels.phone = phone.replace(/\s/g, ''); u.prefs.channels.verified = false;
    email(`SMS to ${u.prefs.channels.phone}`, 'Your verification code', 'FLW Research Africa code: 135790. It expires in 10 minutes.');
    return true;
  }),
  verifyPhone: (code: string) => endpoint(() => {
    const u = requireMember(); need(code === '135790', 400, 'That code is not correct.', { code: 'Incorrect code.' });
    u.prefs.channels.verified = true; u.consents.push({ scope: 'channel:phone', version: CONSENT_VERSION, at: nowIso() }); return true;
  }),
  removePhone: () => endpoint(() => { const u = requireMember(); u.prefs.channels = { phone: '', verified: false, sms: false, whatsapp: false }; const c = u.consents.find((x) => x.scope === 'channel:phone' && !x.withdrawnAt); if (c) c.withdrawnAt = nowIso(); return true; }),
  linkOrcid: (orcid: string) => endpoint(() => {
    const u = requireMember();
    need(/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/.test(orcid), 400, 'Enter an ORCID iD like 0000-0002-1825-0097.', { orcid: 'Invalid format.' });
    u.orcid = orcid; u.orcidVerified = true; audit('profile.orcid_link', orcid); return true;
  }, 900),
  unlinkOrcid: () => endpoint(() => { const u = requireMember(); u.orcid = undefined; u.orcidVerified = false; return true; }),
  requestClosure: (reason: string) => endpoint(() => {
    const u = requireMember(); need(!u.roles.includes('admin') || db.users.filter((x) => x.roles.includes('admin') && x.status === 'approved').length > 1, 400, 'You are the last administrator. Assign another administrator first.');
    u.status = 'closure_pending'; u.closureReason = reason; notifyReviewers('Account closure request', `${u.name} asked to close their account.`, '/console?tab=closures');
    audit('account.closure_request', u.email); return true;
  }),
  cancelClosure: () => endpoint(() => { const u = requireUser(); need(u.status === 'closure_pending', 400, 'There is no closure request.'); u.status = 'approved'; u.closureReason = undefined; return true; }),

  // ---------------- dashboard and notifications
  dashboard: () => endpoint(() => {
    const u = requireMember();
    const mine = db.resources.filter((r) => r.ownerId === u.id).map((r) => viewOf(r, u, true));
    const notes = db.notifications.filter((n) => n.userId === u.id);
    const upcoming = db.events.filter((e) => e.status === 'published' && !e.cancelled && Date.parse(e.endsAt) > Date.now()).sort((a, b) => a.startsAt.localeCompare(b.startsAt)).slice(0, 3);
    return { submissions: mine, unread: notes.filter((n) => !n.read).length, notifications: notes.slice(0, 5), upcoming,
      pendingRequests: db.connections.filter((c) => c.toId === u.id && c.status === 'pending').length,
      workspaces: db.workspaces.filter((w) => w.members.includes(u.id)).length,
      application: db.applications.find((a) => a.userId === u.id) ?? null,
      learning: db.collections.map((c) => ({ slug: c.slug, title: c.title, done: c.items.filter((i) => u.learnProgress.includes(i.id)).length, total: c.items.length })).filter((c) => c.done > 0 && c.done < c.total) };
  }),
  notifications: () => endpoint(() => { const u = requireUser(); return db.notifications.filter((n) => n.userId === u.id); }),
  unreadCount: () => endpoint(() => { const u = current(); return u ? db.notifications.filter((n) => n.userId === u.id && !n.read).length : 0; }, 30),
  markRead: (nid?: string) => endpoint(() => { const u = requireUser(); db.notifications.filter((n) => n.userId === u.id && (!nid || n.id === nid)).forEach((n) => (n.read = true)); return true; }, 60),

  // ---------------- members, directory, organisations
  directory: (f: { q?: string; country?: string; category?: string; topic?: string }) => endpoint(() => {
    const viewer = requireMember();
    const q = (f.q ?? '').toLowerCase();
    return db.users.filter((u) => u.status === 'approved' && !viewer.blocked.includes(u.id) && !u.blocked.includes(viewer.id))
      .map((u) => card(u, viewer))
      .filter((c) => (!q || [c.name, c.affiliation ?? '', c.biography ?? ''].join(' ').toLowerCase().includes(q)) && (!f.country || c.country === f.country) && (!f.category || c.category === f.category) && (!f.topic || c.interests?.includes(f.topic)))
      .sort((a, b) => a.name.localeCompare(b.name));
  }),
  member: (uid: string) => endpoint(() => {
    const viewer = requireMember(); const u = userById(uid);
    need(u && u.status === 'approved' && !u.blocked.includes(viewer.id), 404, 'This member could not be found.');
    const conn = db.connections.find((c) => (c.fromId === viewer.id && c.toId === uid) || (c.toId === viewer.id && c.fromId === uid));
    const resources = db.resources.filter((r) => r.ownerId === uid && r.status === 'published' && canSeeResource(r, viewer)).map((r) => viewOf(r, viewer));
    return { card: card(u, viewer), connection: conn ?? null, resources, isSelf: viewer.id === uid };
  }),
  previewCard: () => endpoint(() => { const u = requireMember(); return card(u, { ...u, id: '__other__' } as T.User); }),
  organisations: () => endpoint(() => db.organisations.filter((o) => o.status === 'approved').map((o) => ({ ...o, memberCount: db.users.filter((u) => u.orgId === o.id && u.orgConfirmed && u.status === 'approved').length }))),
  organisation: (slug: string) => endpoint(() => {
    const viewer = current(); const o = db.organisations.find((x) => x.slug === slug);
    need(o && (o.status === 'approved' || has(viewer, 'admin')), 404, 'This organisation could not be found.');
    const members = db.users.filter((u) => u.orgId === o.id && u.orgConfirmed && u.status === 'approved' && u.visibility.affiliation).map((u) => ({ id: u.id, name: u.name, avatarHue: u.avatarHue, category: u.category }));
    const pendingClaims = viewer && o.repUserId === viewer.id ? db.users.filter((u) => u.orgId === o.id && !u.orgConfirmed && u.status === 'approved').map((u) => ({ id: u.id, name: u.name })) : [];
    return { org: o, members: viewer?.status === 'approved' ? members : members.length, isRep: !!viewer && o.repUserId === viewer.id, pendingClaims,
      myClaim: viewer ? (viewer.orgId === o.id ? (viewer.orgConfirmed ? 'confirmed' : 'pending') : null) : null };
  }),
  claimAffiliation: (orgId: string) => endpoint(() => {
    const u = requireMember(); const o = db.organisations.find((x) => x.id === orgId && x.status === 'approved'); need(o, 404, 'Organisation not found.');
    u.orgId = orgId; u.orgConfirmed = false; u.affiliation = o.name;
    if (o.repUserId) notify(o.repUserId, 'account', 'Affiliation to confirm', `${u.name} says they work with ${o.name}.`, `/organisations/${o.slug}`);
    return true;
  }),
  decideAffiliation: (userId: string, confirm: boolean) => endpoint(() => {
    const rep = requireMember(); const u = userById(userId); need(u && u.orgId, 404, 'Request not found.');
    const o = db.organisations.find((x) => x.id === u.orgId)!; need(o.repUserId === rep.id || has(rep, 'admin'), 403, 'Only the organisation’s representative can confirm affiliations.');
    if (confirm) u.orgConfirmed = true; else { u.orgId = undefined; u.orgConfirmed = false; }
    notify(u.id, 'decision', confirm ? 'Affiliation confirmed' : 'Affiliation not confirmed', `${o.name} ${confirm ? 'confirmed' : 'did not confirm'} your affiliation.`, `/organisations/${o.slug}`);
    audit(confirm ? 'org.affiliation_confirm' : 'org.affiliation_decline', `${o.slug}:${u.email}`); return true;
  }),
  proposeOrganisation: (p: { name: string; type: string; country: string; description: string; website: string }) => endpoint(() => {
    const u = requireMember(); need(p.name.length > 2 && p.country && p.type, 400, 'Some fields need attention.', { name: 'Enter the organisation’s name.' });
    need(!p.website || /^https?:\/\//.test(p.website), 400, 'Website must start with http:// or https://.', { website: 'Invalid link.' });
    db.organisations.push({ id: id('o'), slug: slugify(p.name), ...p, status: 'pending', repUserId: u.id, createdAt: nowIso() });
    notifyReviewers('Organisation to approve', `${u.name} proposed ${p.name}.`, '/console/organisations'); return true;
  }),
  adminOrganisations: () => endpoint(() => { requireRole('admin'); return db.organisations.map((o) => ({ ...o, repName: nameOf(o.repUserId) })); }),
  decideOrganisation: (oid: string, approve: boolean) => endpoint(() => {
    requireRole('admin'); const o = db.organisations.find((x) => x.id === oid); need(o, 404, 'Not found.');
    if (approve) { o.status = 'approved'; if (o.repUserId) { const rep = userById(o.repUserId); if (rep) { rep.orgId = o.id; rep.orgConfirmed = true; } } }
    else db.organisations = db.organisations.filter((x) => x.id !== oid);
    if (o.repUserId) notify(o.repUserId, 'decision', approve ? 'Organisation approved' : 'Organisation not approved', o.name, approve ? `/organisations/${o.slug}` : undefined);
    audit(approve ? 'org.approve' : 'org.reject', o.slug); return true;
  }),

  // ---------------- knowledge catalogue
  search: (f: { q?: string; type?: string; country?: string; topic?: string; language?: string; year?: string; sort?: string; page?: number; pageSize?: number }) => endpoint(() => {
    const viewer = current();
    const terms = (f.q ?? '').toLowerCase().split(/\s+/).filter(Boolean);
    const visible = db.resources.filter((r) => r.status === 'published' && canSeeResource(r, viewer) && (r.visibility !== 'restricted' || has(viewer, 'reviewer', 'admin') || r.ownerId === viewer?.id));
    const textMatch = (r: T.Resource) => {
      const v = r.versions.find((x) => x.no === r.publishedNo)!;
      const hay = [v.title, v.summary, v.keywords.join(' '), v.authors.join(' ')].join(' ').toLowerCase();
      return terms.every((t) => hay.includes(t));
    };
    const pv = (r: T.Resource) => r.versions.find((x) => x.no === r.publishedNo)!;
    const base = visible.filter(textMatch);
    const filtered = base.filter((r) => { const v = pv(r);
      return (!f.type || r.type === f.type) && (!f.country || v.countries.includes(f.country)) && (!f.topic || v.topics.includes(f.topic)) && (!f.language || v.language === f.language) && (!f.year || String(v.year) === f.year); });
    const score = (r: T.Resource) => { const v = pv(r); return terms.reduce((s, t) => s + (v.title.toLowerCase().includes(t) ? 3 : 0) + (v.keywords.join(' ').toLowerCase().includes(t) ? 2 : 0) + 1, 0); };
    const sorted = [...filtered].sort((a, b) => {
      if (f.sort === 'oldest') return pv(a).year - pv(b).year;
      if (f.sort === 'title') return pv(a).title.localeCompare(pv(b).title);
      if (f.sort === 'popular') return b.stats.views - a.stats.views;
      if (terms.length && f.sort !== 'newest') return score(b) - score(a);
      return pv(b).year - pv(a).year || (b.publishedAt ?? '').localeCompare(a.publishedAt ?? '');
    });
    const page = f.page ?? 1, size = f.pageSize ?? 9;
    const facets: Record<string, number> = {};
    base.forEach((r) => (facets[r.type] = (facets[r.type] ?? 0) + 1));
    const hiddenMembers = !viewer || viewer.status !== 'approved' ? db.resources.filter((r) => r.status === 'published' && r.visibility === 'members').length : 0;
    return { count: sorted.length, page, pageSize: size, results: sorted.slice((page - 1) * size, page * size).map((r) => viewOf(r, viewer)), facets, hiddenMembers,
      years: [...new Set(visible.map((r) => pv(r).year))].sort((a, b) => b - a) };
  }),
  resource: (slug: string) => endpoint(() => {
    const viewer = current(); const r = db.resources.find((x) => x.slug === slug);
    need(r, 404, 'This resource could not be found. It may have been removed or the link may be wrong.');
    if (!canSeeResource(r, viewer)) {
      if (r.status === 'published' && r.visibility === 'members') throw new ApiError(403, 'This resource is for network members. Sign in or apply to join to read it.', undefined, 'members_only');
      throw new ApiError(404, 'This resource could not be found. It may have been removed or the link may be wrong.');
    }
    const view = viewOf(r, viewer);
    const related = db.resources.filter((x) => x.id !== r.id && x.status === 'published' && canSeeResource(x, viewer) && x.visibility !== 'restricted' && pv(x).topics.some((t) => view.v.topics.includes(t))).slice(0, 3).map((x) => viewOf(x, viewer));
    const canEdit = !!viewer && r.ownerId === viewer.id;
    const canWithdraw = !!viewer && (r.ownerId === viewer.id || has(viewer, 'admin', 'editor')) && r.status === 'published';
    const pendingVersion = r.versions.some((x) => x.status === 'pending' && x.no !== r.publishedNo);
    return { ...view, related, canEdit, canWithdraw, pendingVersion };
    function pv(x: T.Resource) { return x.versions.find((v) => v.no === x.publishedNo) ?? x.versions[x.versions.length - 1]; }
  }),
  recordView: (slug: string) => endpoint(() => { const r = db.resources.find((x) => x.slug === slug); if (r && r.status === 'published') bump(r, 'views'); return true; }, 0),
  recordCitation: (slug: string) => endpoint(() => { const r = db.resources.find((x) => x.slug === slug); if (r) bump(r, 'citations'); return true; }, 0),
  download: (slug: string) => endpoint(() => {
    const viewer = current(); const r = db.resources.find((x) => x.slug === slug);
    need(r && r.status === 'published' && canSeeResource(r, viewer), 403, 'You do not have access to this file.');
    const v = r.versions.find((x) => x.no === r.publishedNo)!; need(v.fileName, 404, 'This resource has no file.');
    bump(r, 'downloads'); audit('resource.download', `${slug} v${v.no}`, 'success', viewer);
    return { fileName: v.fileName, fileSize: v.fileSize ?? 0, expiresInMinutes: 5 };
  }, 400),
  lookupDoi: (doi: string) => endpoint(() => {
    const d = doi.trim().replace(/^https?:\/\/(dx\.)?doi\.org\//, '');
    need(/^10\.\d{4,9}\/\S+$/.test(d), 400, 'A DOI starts with 10. followed by a prefix and suffix, like 10.5555/flw.2026.001.', { doi: 'Invalid DOI.' });
    need(d !== '10.5555/timeout', 503, 'The DOI registry is not responding. Enter the details yourself or try again later.');
    const known: Record<string, Partial<T.ResourceVersion>> = {
      '10.5555/flw.2026.001': { title: 'Post-harvest losses of leafy vegetables in peri-urban Nairobi', authors: ['W. Njeri', 'P. Mutua'], year: 2026, summary: 'Measures daily losses of kale and amaranth between harvest and sale in peri-urban markets, with interventions tested over one season.', countries: ['KE'], topics: ['post_harvest'] },
      '10.5555/flw.2025.014': { title: 'Evaporative cooling chambers for smallholder tomato storage', authors: ['B. Sow', 'M. Diop'], year: 2025, summary: 'Field evaluation of brick-and-sand evaporative coolers on tomato shelf life in Senegal.', countries: ['SN'], topics: ['cold_chain', 'post_harvest'] },
    };
    need(known[d], 404, 'We could not find that DOI. Check it, or enter the details yourself.');
    return { ...known[d], doi: d, url: `https://doi.org/${d}` };
  }, 700),

  mySubmissions: () => endpoint(() => { const u = requireMember(); return db.resources.filter((r) => r.ownerId === u.id).map((r) => viewOf(r, u, true)).sort((a, b) => b.v.submittedAt.localeCompare(a.v.submittedAt)); }),
  submission: (rid: string) => endpoint(() => { const u = requireMember(); const r = db.resources.find((x) => x.id === rid); need(r && (r.ownerId === u.id), 404, 'Submission not found.'); return { ...viewOf(r, u, true), versions: r.versions }; }),

  saveResource: (p: SubmitInput & { id?: string; action: 'draft' | 'submit' }, key: string) => endpoint(() => {
    const u = requireMember();
    if (db.idempotency[key]) { const ex = db.resources.find((r) => r.id === db.idempotency[key]); if (ex) return viewOf(ex, u, true); }
    const errors = validateSubmission(p, p.action === 'submit');
    need(!Object.keys(errors).length, 400, 'Some fields need attention.', errors);
    const { id: rid, action, type, visibility, ...fields } = p;
    const status = action === 'submit' ? 'pending' : 'draft';
    let r = rid ? db.resources.find((x) => x.id === rid) : undefined;
    if (rid) need(r && r.ownerId === u.id, 404, 'Submission not found.');
    if (!r) {
      let slug = slugify(p.title); while (db.resources.some((x) => x.slug === slug)) slug += '-' + Math.floor(Math.random() * 90 + 10);
      r = { id: id('r'), slug, type, visibility, status, ownerId: u.id, versions: [], createdAt: nowIso(), stats: { views: 0, downloads: 0, citations: 0, byCountry: {}, monthly: {} } };
      db.resources.push(r);
    }
    const last = r.versions[r.versions.length - 1];
    const editable = last && ['draft', 'returned', 'pending'].includes(last.status);
    const v: T.ResourceVersion = { ...fields, no: editable ? last.no : (last?.no ?? 0) + 1, submittedBy: u.id, submittedAt: nowIso(), status };
    if (editable) r.versions[r.versions.length - 1] = v; else r.versions.push(v);
    r.type = type; r.visibility = visibility;
    if (r.status !== 'published') r.status = status;
    db.idempotency[key] = r.id;
    if (action === 'submit') {
      notifyReviewers('Submission awaiting review', `${u.name} submitted “${p.title}”.`, `/console/review/${r.id}`);
      audit('resource.submit', `${r.slug} v${v.no}`, 'success', u);
    }
    return viewOf(r, u, true);
  }, 450),
  deleteDraft: (rid: string) => endpoint(() => { const u = requireMember(); const r = db.resources.find((x) => x.id === rid); need(r && r.ownerId === u.id && r.status === 'draft', 400, 'Only your own drafts can be deleted.'); db.resources = db.resources.filter((x) => x !== r); return true; }),
  withdrawResource: (slug: string, reason: string) => endpoint(() => {
    const u = requireMember(); const r = db.resources.find((x) => x.slug === slug); need(r, 404, 'Not found.');
    need(r.ownerId === u.id || has(u, 'admin', 'editor'), 403, 'You cannot withdraw this resource.');
    need(reason.trim().length >= 5, 400, 'Give a reason for withdrawal.', { reason: 'Required.' });
    r.status = 'withdrawn'; r.withdrawnReason = reason; audit('resource.withdraw', r.slug, 'success', u);
    if (r.ownerId !== u.id) notify(r.ownerId, 'decision', 'Resource withdrawn', `“${r.versions[r.versions.length - 1].title}” was withdrawn: ${reason}`, `/knowledge/${r.slug}`);
    return true;
  }),
  reviewItem: (rid: string) => endpoint(() => {
    const u = requireRole('reviewer', 'admin'); const r = db.resources.find((x) => x.id === rid); need(r, 404, 'Not found.');
    const v = r.versions[r.versions.length - 1];
    const prev = r.publishedNo && r.publishedNo !== v.no ? r.versions.find((x) => x.no === r.publishedNo) : undefined;
    return { ...viewOf(r, u, true), submitterName: nameOf(v.submittedBy), isOwn: v.submittedBy === u.id, previous: prev ?? null, reviewerName: nameOf(v.reviewedBy) };
  }),
  decideReview: (rid: string, decision: 'accept' | 'return' | 'reject', note: string, checks: { provenance: boolean; rights: boolean; visibility: boolean; ik?: boolean }) => endpoint(() => {
    const u = requireRole('reviewer', 'admin'); const r = db.resources.find((x) => x.id === rid); need(r, 404, 'Not found.');
    const v = r.versions[r.versions.length - 1];
    need(v.status === 'pending', 409, 'This submission has already been decided by another reviewer.');
    if (v.submittedBy === u.id) { audit('resource.review', r.slug, 'denied', u); save(); throw new ApiError(403, 'You cannot review your own submission. Another reviewer must decide.'); }
    if (decision !== 'accept') need(note.trim().length >= 10, 400, 'Explain your decision so the contributor knows what to do.', { note: 'Write at least 10 characters.' });
    if (decision === 'accept') {
      need(checks.provenance && checks.rights && checks.visibility, 400, 'Complete the provenance, rights and visibility checks before accepting.');
      if (r.type === 'indigenous_knowledge') need(checks.ik, 400, 'Confirm the community’s permission before publishing community knowledge.');
      r.versions.forEach((x) => { if (x.status === 'published') x.status = 'superseded'; });
      v.status = 'published'; r.publishedNo = v.no; r.status = 'published'; r.publishedAt = nowIso();
      if (v.ik) v.ik.confirmedBy = u.id;
    } else {
      v.status = decision === 'return' ? 'returned' : 'rejected';
      if (!r.publishedNo) r.status = v.status as T.ResStatus;
    }
    v.reviewedBy = u.id; v.reviewedAt = nowIso(); v.reviewNote = note || undefined; r.assigneeId = undefined;
    const owner = userById(r.ownerId)!;
    const label = { accept: 'published', return: 'returned for changes', reject: 'not accepted' }[decision];
    notify(owner.id, 'decision', `Submission ${label}`, `“${v.title}” was ${label}.${note ? ' Note: ' + note : ''}`, decision === 'accept' ? `/knowledge/${r.slug}` : '/my-submissions');
    email(owner.email, `Your submission was ${label}`, `“${v.title}” was ${label} by a network reviewer.${note ? '\n\nReviewer’s note: ' + note : ''}`, { label: decision === 'accept' ? 'View resource' : 'Open My submissions', path: decision === 'accept' ? `/knowledge/${r.slug}` : '/my-submissions' });
    audit(`resource.${decision}`, `${r.slug} v${v.no}`, 'success', u);
    return true;
  }, 400),

  // ---------------- content: pages, events, news, opportunities
  pages: () => endpoint(() => db.pages.map((p) => ({ ...p, draft: has(current(), 'editor', 'admin') ? p.draft : undefined }))),
  savePageDraft: (slug: string, body: string) => endpoint(() => { const u = requireRole('editor', 'admin'); const p = db.pages.find((x) => x.slug === slug)!; need(body.trim().length > 10, 400, 'The page cannot be empty.'); p.draft = { body, savedBy: u.id, savedAt: nowIso() }; audit('page.save_draft', slug, 'success', u); return true; }),
  publishPage: (slug: string) => endpoint(() => {
    const u = requireRole('editor', 'admin'); const p = db.pages.find((x) => x.slug === slug)!; need(p.draft, 400, 'There is no draft to publish.');
    p.body = p.draft.body; p.version += 1; p.publishedAt = nowIso(); p.publishedBy = u.id; p.history.unshift({ version: p.version, publishedAt: p.publishedAt, publishedBy: u.id }); p.draft = undefined;
    audit('page.publish', `${slug} v${p.version}`, 'success', u); return true;
  }),
  discardPageDraft: (slug: string) => endpoint(() => { requireRole('editor', 'admin'); const p = db.pages.find((x) => x.slug === slug)!; p.draft = undefined; return true; }),

  events: (f: { scope?: 'upcoming' | 'past' | 'all'; topic?: string; includeDrafts?: boolean }) => endpoint(() => {
    const viewer = current(); const staff = has(viewer, 'editor', 'admin') && f.includeDrafts;
    const t = Date.now();
    return db.events.filter((e) => (staff || e.status === 'published') && (staff || !e.membersOnly || viewer?.status === 'approved') && (!f.topic || e.topic === f.topic)
      && (f.scope === 'all' || (f.scope === 'past' ? Date.parse(e.endsAt) < t : Date.parse(e.endsAt) >= t)))
      .sort((a, b) => (f.scope === 'past' ? b.startsAt.localeCompare(a.startsAt) : a.startsAt.localeCompare(b.startsAt)));
  }),
  event: (eid: string) => endpoint(() => {
    const viewer = current(); const e = db.events.find((x) => x.id === eid);
    need(e && (e.status === 'published' || has(viewer, 'editor', 'admin')), 404, 'This event could not be found.');
    need(!e.membersOnly || viewer?.status === 'approved' || has(viewer, 'editor', 'admin'), 403, 'This event is for network members. Sign in to see details.', undefined, 'members_only');
    return e;
  }),
  saveEvent: (e: Partial<T.EventItem>) => endpoint(() => {
    const u = requireRole('editor', 'admin'); const errors: Record<string, string> = {};
    if (!e.title || e.title.length < 5) errors.title = 'Enter a title.';
    if (!e.startsAt) errors.startsAt = 'Choose a start time.';
    if (!e.endsAt) errors.endsAt = 'Choose an end time.';
    if (e.startsAt && e.endsAt && Date.parse(e.endsAt) < Date.parse(e.startsAt)) errors.endsAt = 'The event cannot end before it starts.';
    if (!e.timezone) errors.timezone = 'Choose a time zone.';
    if (e.link && !/^https?:\/\//.test(e.link)) errors.link = 'Links must start with http:// or https://.';
    need(!Object.keys(errors).length, 400, 'Some fields need attention.', errors);
    if (e.id) { const ex = db.events.find((x) => x.id === e.id)!; Object.assign(ex, e); }
    else db.events.push({ id: id('e'), title: '', summary: '', body: '', startsAt: '', endsAt: '', timezone: 'Africa/Nairobi', location: '', online: false, status: 'draft', membersOnly: false, topic: 'policy', ...e } as T.EventItem);
    audit(e.id ? 'event.update' : 'event.create', e.title!, 'success', u); return true;
  }),
  deleteEvent: (eid: string) => endpoint(() => { requireRole('editor', 'admin'); db.events = db.events.filter((x) => x.id !== eid); audit('event.delete', eid); return true; }),

  news: (includeDrafts = false) => endpoint(() => db.news.filter((n) => n.status === 'published' || (includeDrafts && has(current(), 'editor', 'admin'))).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))),
  newsItem: (nid: string) => endpoint(() => { const n = db.news.find((x) => x.id === nid && (x.status === 'published' || has(current(), 'editor', 'admin'))); need(n, 404, 'This article could not be found.'); return n; }),
  saveNews: (n: Partial<T.NewsItem>) => endpoint(() => {
    const u = requireRole('editor', 'admin'); need(n.title && n.title.length > 4 && n.summary, 400, 'Some fields need attention.', { title: !n.title ? 'Enter a title.' : '', summary: !n.summary ? 'Enter a summary.' : '' });
    if (n.id) Object.assign(db.news.find((x) => x.id === n.id)!, n);
    else db.news.push({ id: id('n'), title: '', summary: '', body: '', publishedAt: nowIso(), status: 'draft', image: 'market', author: u.name, ...n } as T.NewsItem);
    audit(n.id ? 'news.update' : 'news.create', n.title!, 'success', u); return true;
  }),
  deleteNews: (nid: string) => endpoint(() => { requireRole('editor', 'admin'); db.news = db.news.filter((x) => x.id !== nid); audit('news.delete', nid); return true; }),

  opportunities: (includeDrafts = false) => endpoint(() => db.opportunities.filter((o) => o.status === 'published' || (includeDrafts && has(current(), 'editor', 'admin')))),
  opportunity: (oid: string) => endpoint(() => { const o = db.opportunities.find((x) => x.id === oid && (x.status === 'published' || has(current(), 'editor', 'admin'))); need(o, 404, 'This opportunity could not be found.'); return o; }),
  saveOpportunity: (o: Partial<T.Opportunity>) => endpoint(() => {
    const u = requireRole('editor', 'admin'); const e: Record<string, string> = {};
    if (!o.title || o.title.length < 5) e.title = 'Enter a title.'; if (!o.owner) e.owner = 'Name the owner.'; if (!o.contact) e.contact = 'Give a contact route.';
    if (o.deadline && !o.timezone) e.timezone = 'Choose a time zone for the deadline.';
    need(!Object.keys(e).length, 400, 'Some fields need attention.', e);
    if (o.id) Object.assign(db.opportunities.find((x) => x.id === o.id)!, o);
    else db.opportunities.push({ id: id('op'), title: '', kind: 'collaboration', owner: '', summary: '', eligibility: '', timezone: 'Africa/Nairobi', contact: '', status: 'draft', countries: [], ...o } as T.Opportunity);
    audit(o.id ? 'opportunity.update' : 'opportunity.create', o.title!, 'success', u); return true;
  }),
  deleteOpportunity: (oid: string) => endpoint(() => { requireRole('editor', 'admin'); db.opportunities = db.opportunities.filter((x) => x.id !== oid); return true; }),

  contact: (p: { name: string; email: string; subject: string; message: string; website?: string }, key: string) => endpoint(() => {
    if (db.idempotency[key]) return { ref: db.idempotency[key] };
    const e: Record<string, string> = {};
    if (!p.name.trim()) e.name = 'Enter your name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email)) e.email = 'Enter a valid email address so we can reply.';
    if (!p.subject.trim()) e.subject = 'Enter a subject.';
    if (p.message.trim().length < 20) e.message = 'Write at least 20 characters so we can help.';
    need(!Object.keys(e).length, 400, 'Some fields need attention.', e);
    const r = ref('CON'); db.idempotency[key] = r;
    if (p.website) return { ref: r }; // honeypot: silently drop bots
    db.contacts.unshift({ id: id('ct'), ref: r, name: p.name, email: p.email, subject: p.subject, message: p.message, createdAt: nowIso(), status: 'open' });
    email(p.email, `We received your message (${r})`, `Thank you, ${p.name}. We will reply to “${p.subject}” as soon as we can.`);
    return { ref: r };
  }, 500),

  // ---------------- community
  threads: (f: { topic?: string; q?: string }) => endpoint(() => {
    requireMember(); const q = (f.q ?? '').toLowerCase();
    return db.threads.filter((t) => t.status !== 'removed' && (!f.topic || t.topic === f.topic) && (!q || t.title.toLowerCase().includes(q)))
      .map((t) => { const vis = t.posts.filter((p) => p.status === 'visible'); const last = t.posts[t.posts.length - 1];
        return { id: t.id, title: t.title, topic: t.topic, status: t.status, authorName: nameOf(t.authorId), authorHue: userById(t.authorId)?.avatarHue ?? 0, replies: Math.max(0, vis.length - 1), lastAt: last?.createdAt ?? t.createdAt, createdAt: t.createdAt }; })
      .sort((a, b) => b.lastAt.localeCompare(a.lastAt));
  }),
  thread: (tid: string) => endpoint(() => {
    const u = requireMember(); const t = db.threads.find((x) => x.id === tid && x.status !== 'removed'); need(t, 404, 'This discussion could not be found.');
    const mod = has(u, 'moderator', 'admin');
    return { ...t, posts: t.posts.map((p) => ({ ...p, body: p.status === 'removed' ? '' : p.body, authorName: nameOf(p.authorId), authorHue: userById(p.authorId)?.avatarHue ?? 0,
      reported: db.reports.some((r) => r.targetId === p.id && r.reporterId === u.id), mine: p.authorId === u.id })), canModerate: mod };
  }),
  createThread: (p: { title: string; topic: string; body: string }) => endpoint(() => {
    const u = requireMember(); const e: Record<string, string> = {};
    if (p.title.trim().length < 10) e.title = 'Write a title of at least 10 characters.'; if (!p.topic) e.topic = 'Choose a topic.'; if (p.body.trim().length < 20) e.body = 'Write at least 20 characters.';
    need(!Object.keys(e).length, 400, 'Some fields need attention.', e);
    const t: T.Thread = { id: id('t'), title: p.title.trim(), topic: p.topic, authorId: u.id, createdAt: nowIso(), status: 'open', posts: [{ id: id('p'), authorId: u.id, body: p.body.trim(), createdAt: nowIso(), status: 'visible' }] };
    db.threads.unshift(t); audit('thread.create', t.title, 'success', u); return t.id;
  }),
  reply: (tid: string, body: string) => endpoint(() => {
    const u = requireMember(); const t = db.threads.find((x) => x.id === tid); need(t, 404, 'Not found.');
    need(t.status === 'open', 409, 'This discussion is closed to new replies.');
    need(body.trim().length >= 2, 400, 'Write a reply first.', { body: 'Write a reply first.' });
    t.posts.push({ id: id('p'), authorId: u.id, body: body.trim(), createdAt: nowIso(), status: 'visible' });
    const participants = new Set(t.posts.map((p) => p.authorId)); participants.delete(u.id);
    participants.forEach((pid) => { const p = userById(pid); if (p?.prefs.notif.community) notify(pid, 'community', 'New reply', `${u.name} replied to “${t.title}”.`, `/community/${t.id}`); });
    return true;
  }),
  report: (p: { targetType: 'post' | 'message'; targetId: string; threadId?: string; reason: string; details: string }) => endpoint(() => {
    const u = requireMember(); need(p.reason, 400, 'Choose a reason.', { reason: 'Choose a reason.' });
    need(!db.reports.some((r) => r.targetId === p.targetId && r.reporterId === u.id), 409, 'You have already reported this. A moderator will review it.');
    db.reports.unshift({ id: id('rep'), ...p, reporterId: u.id, createdAt: nowIso(), status: 'open' });
    db.users.filter((x) => has(x, 'moderator')).forEach((m) => notify(m.id, 'system', 'New report to review', `A ${p.targetType} was reported: ${p.reason}.`, '/console?tab=reports'));
    audit('report.create', `${p.targetType}:${p.targetId}`, 'success', u); return true;
  }),
  moderateThread: (tid: string, action: 'lock' | 'unlock' | 'remove') => endpoint(() => {
    const u = requireRole('moderator', 'admin'); const t = db.threads.find((x) => x.id === tid)!;
    t.status = action === 'lock' ? 'locked' : action === 'unlock' ? 'open' : 'removed'; audit(`thread.${action}`, t.title, 'success', u); return true;
  }),
  removePost: (postId: string, reason: string) => endpoint(() => {
    const u = requireRole('moderator', 'admin');
    for (const t of db.threads) { const p = t.posts.find((x) => x.id === postId); if (p) { p.status = 'removed'; audit('post.remove', `${postId}: ${reason}`, 'success', u); return true; } }
    throw new ApiError(404, 'Post not found.');
  }),

  // ---------------- staff queue
  queue: () => endpoint(() => {
    const u = requireRole('reviewer', 'moderator', 'editor', 'admin');
    type Item = { kind: string; id: string; title: string; subtitle: string; createdAt: string; assigneeId?: string; assigneeName?: string; flag?: string; link?: string };
    const items: Item[] = [];
    const as = (x: { assigneeId?: string }) => ({ assigneeId: x.assigneeId, assigneeName: x.assigneeId ? nameOf(x.assigneeId) : undefined });
    if (has(u, 'reviewer', 'admin')) {
      db.applications.filter((a) => a.status === 'pending').forEach((a) => items.push({ kind: 'applications', id: a.id, title: nameOf(a.userId), subtitle: `${a.ref} · ${db.taxonomy.categories.find((c) => c.id === a.category)?.label ?? a.category} · ${a.country}`, createdAt: a.createdAt, ...as(a) }));
      db.resources.forEach((r) => { const v = r.versions[r.versions.length - 1]; if (v.status === 'pending') items.push({ kind: 'submissions', id: r.id, title: v.title, subtitle: `${r.type.replace('_', ' ')} · v${v.no} · by ${nameOf(v.submittedBy)}`, createdAt: v.submittedAt, flag: v.submittedBy === u.id ? 'Your own — another reviewer must decide' : r.type === 'indigenous_knowledge' ? 'Community permission check' : undefined, link: `/console/review/${r.id}`, ...as(r) }); });
    }
    if (has(u, 'moderator', 'admin')) db.reports.filter((r) => r.status === 'open').forEach((r) => items.push({ kind: 'reports', id: r.id, title: r.reason, subtitle: `${r.targetType} reported by ${nameOf(r.reporterId)}`, createdAt: r.createdAt, ...as(r) }));
    if (has(u, 'editor', 'admin')) {
      db.contacts.filter((c) => c.status === 'open').forEach((c) => items.push({ kind: 'contact', id: c.id, title: c.subject, subtitle: `${c.ref} · ${c.name}`, createdAt: c.createdAt, ...as(c) }));
      db.feedback.filter((f) => f.status === 'open').forEach((f) => items.push({ kind: 'feedback', id: f.id, title: f.message.slice(0, 70), subtitle: `${f.ref} · page ${f.page}`, createdAt: f.createdAt }));
    }
    if (has(u, 'admin')) {
      db.dataRequests.filter((d) => d.status === 'open').forEach((d) => items.push({ kind: 'privacy', id: d.id, title: `${d.kind[0].toUpperCase() + d.kind.slice(1)} request`, subtitle: `${d.ref} · ${nameOf(d.userId)}`, createdAt: d.createdAt, ...as(d) }));
      db.users.filter((x) => x.status === 'closure_pending').forEach((x) => items.push({ kind: 'closures', id: x.id, title: x.name, subtitle: x.closureReason || 'No reason given', createdAt: x.joinedAt }));
    }
    return { items: items.sort((a, b) => b.createdAt.localeCompare(a.createdAt)), staff: db.users.filter((x) => isStaff(x) && x.status === 'approved').map((x) => ({ id: x.id, name: x.name })) };
  }),
  assign: (kind: string, itemId: string, assigneeId: string | null) => endpoint(() => {
    const u = requireRole('reviewer', 'moderator', 'editor', 'admin');
    const coll: Record<string, { id: string; assigneeId?: string }[]> = { applications: db.applications, submissions: db.resources, reports: db.reports, contact: db.contacts, privacy: db.dataRequests };
    const x = coll[kind]?.find((i) => i.id === itemId); need(x, 404, 'Item not found.');
    x.assigneeId = assigneeId ?? undefined; audit('queue.assign', `${kind}:${itemId} → ${assigneeId ? nameOf(assigneeId) : 'nobody'}`, 'success', u); return true;
  }),
  applicationDetail: (aid: string) => endpoint(() => { requireRole('reviewer', 'admin'); const a = db.applications.find((x) => x.id === aid); need(a, 404, 'Not found.'); const x = userById(a.userId)!; return { app: a, applicant: { name: x.name, email: x.email, affiliation: x.affiliation } }; }),
  decideApplication: (aid: string, approve: boolean, reason: string) => endpoint(() => {
    const u = requireRole('reviewer', 'admin'); const a = db.applications.find((x) => x.id === aid); need(a, 404, 'Not found.');
    need(a.status === 'pending', 409, 'This application was already decided by another reviewer.');
    need(reason.trim().length >= 5, 400, 'Record a reason for the decision.', { reason: 'Required.' });
    const x = userById(a.userId)!;
    a.status = approve ? 'approved' : 'rejected'; a.decidedBy = u.id; a.decidedAt = nowIso(); a.reason = reason; a.assigneeId = undefined;
    x.status = approve ? 'approved' : 'rejected';
    if (approve) { x.acceptsRequests = true; notify(x.id, 'decision', 'Welcome to the network', 'Your membership was approved. Complete your profile to connect with others.', '/dashboard'); }
    email(x.email, approve ? 'Your membership was approved' : 'Your membership application', approve ? 'Welcome to the FLW Research Network in Africa. You can now sign in to your member dashboard.' : `Thank you for applying. Your application was not approved at this time.\n\nReason: ${reason}\n\nYou may appeal by contacting the network coordinator.`, approve ? { label: 'Sign in', path: '/login' } : undefined);
    audit(approve ? 'application.approve' : 'application.reject', a.ref, 'success', u); return true;
  }),
  reportDetail: (rid: string) => endpoint(() => {
    requireRole('moderator', 'admin'); const r = db.reports.find((x) => x.id === rid); need(r, 404, 'Not found.');
    let content = ''; let authorId = ''; let threadTitle = '';
    if (r.targetType === 'post') for (const t of db.threads) { const p = t.posts.find((x) => x.id === r.targetId); if (p) { content = p.body; authorId = p.authorId; threadTitle = t.title; } }
    else { const m = db.messages.find((x) => x.id === r.targetId); if (m) { content = m.body; authorId = m.fromId; } }
    return { report: r, content, authorId, authorName: nameOf(authorId), threadTitle, reporterName: 'Restricted', authorStatus: userById(authorId)?.status };
  }),
  resolveReport: (rid: string, action: 'remove' | 'dismiss' | 'remove_suspend', note: string) => endpoint(() => {
    const u = requireRole('moderator', 'admin'); const r = db.reports.find((x) => x.id === rid); need(r && r.status === 'open', 409, 'This report was already resolved.');
    need(note.trim().length >= 5, 400, 'Record what you decided and why.', { note: 'Required.' });
    let authorId = '';
    if (r.targetType === 'post') for (const t of db.threads) { const p = t.posts.find((x) => x.id === r.targetId); if (p) { authorId = p.authorId; if (action !== 'dismiss') p.status = 'removed'; } }
    else { const m = db.messages.find((x) => x.id === r.targetId); if (m) { authorId = m.fromId; if (action !== 'dismiss') m.body = '[Removed by a moderator]'; } }
    if (action === 'remove_suspend') { need(has(u, 'admin'), 403, 'Only administrators can suspend accounts.'); const a = userById(authorId); if (a) { a.status = 'suspended'; a.suspendedReason = note; if (db.session?.userId === a.id) db.session = null; } }
    r.status = 'resolved'; r.resolution = `${action}: ${note}`; r.resolvedBy = u.id;
    if (authorId && action !== 'dismiss') notify(authorId, 'decision', 'Your contribution was removed', `A moderator removed content you posted. Reason: ${note}`);
    notify(r.reporterId, 'decision', 'Your report was reviewed', 'A moderator has reviewed the content you reported. Thank you.');
    audit(`moderation.${action}`, `${r.targetType}:${r.targetId}`, 'success', u); return true;
  }),
  contactDetail: (cid: string) => endpoint(() => { requireRole('editor', 'admin'); const c = db.contacts.find((x) => x.id === cid); need(c, 404, 'Not found.'); return c; }),
  resolveContact: (cid: string, resolution: string) => endpoint(() => { const u = requireRole('editor', 'admin'); const c = db.contacts.find((x) => x.id === cid)!; need(resolution.trim().length >= 5, 400, 'Describe how you resolved it.', { resolution: 'Required.' }); c.status = 'resolved'; c.resolution = resolution; audit('contact.resolve', c.ref, 'success', u); return true; }),
  feedbackList: () => endpoint(() => { requireRole('editor', 'admin'); return db.feedback; }),
  resolveFeedback: (fid: string, resolution: string) => endpoint(() => { const u = requireRole('editor', 'admin'); const f = db.feedback.find((x) => x.id === fid)!; f.status = 'resolved'; f.resolution = resolution || 'Noted'; if (f.userId) notify(f.userId, 'system', 'Thanks for your feedback', `We reviewed your feedback (${f.ref}): ${f.resolution}`); audit('feedback.resolve', f.ref, 'success', u); return true; }),
  decideClosure: (uid: string, approve: boolean) => endpoint(() => {
    const a = requireRole('admin'); const x = userById(uid); need(x && x.status === 'closure_pending', 409, 'There is no pending closure for this account.');
    if (approve) { x.status = 'closed'; x.name = 'Former member'; x.biography = ''; x.affiliation = ''; x.visibility = { affiliation: false, biography: false, interests: false, email: false, country: false }; email(x.email, 'Your account was closed', 'Your account has been closed. Records we must keep are retained under the network’s retention schedule; your public attribution is anonymised.'); }
    else { x.status = 'approved'; notify(x.id, 'decision', 'Closure request declined', 'Contact the network administrator for details.'); }
    audit(approve ? 'account.close' : 'account.closure_decline', x.email, 'success', a); return true;
  }),

  // ---------------- users and roles
  users: (f: { q?: string; status?: string; role?: string }) => endpoint(() => {
    requireRole('admin'); const q = (f.q ?? '').toLowerCase();
    return db.users.filter((u) => (!q || (u.name + u.email).toLowerCase().includes(q)) && (!f.status || u.status === f.status) && (!f.role || u.roles.includes(f.role as T.Role))).map(publicUser);
  }),
  setRoles: (uid: string, roles: T.Role[], reason: string) => endpoint(() => {
    const a = requireRole('admin'); const x = userById(uid); need(x, 404, 'Not found.');
    need(reason.trim().length >= 5, 400, 'Record why you are changing roles.', { reason: 'Required.' });
    const admins = db.users.filter((u) => u.roles.includes('admin') && u.status === 'approved');
    need(roles.includes('admin') || !x.roles.includes('admin') || admins.length > 1, 400, 'You cannot remove the last active administrator.');
    const prior = x.roles.join(', ');
    x.roles = Array.from(new Set(['member', ...roles])) as T.Role[];
    if (isStaff(x) && !x.mfaEnabled) notify(x.id, 'account', 'Turn on two-step sign-in', 'Your new role requires two-step sign-in. Turn it on in Settings, Security.', '/settings?tab=security');
    audit('user.roles', `${x.email}: [${prior}] → [${x.roles.join(', ')}] (${reason})`, 'success', a); return true;
  }),
  setUserStatus: (uid: string, status: 'suspended' | 'approved', reason: string) => endpoint(() => {
    const a = requireRole('admin'); const x = userById(uid); need(x, 404, 'Not found.'); need(x.id !== a.id, 400, 'You cannot suspend your own account.');
    need(reason.trim().length >= 5, 400, 'Record a reason.', { reason: 'Required.' });
    if (status === 'suspended' && x.roles.includes('admin')) need(db.users.filter((u) => u.roles.includes('admin') && u.status === 'approved').length > 1, 400, 'You cannot suspend the last active administrator.');
    x.status = status; x.suspendedReason = status === 'suspended' ? reason : undefined;
    if (status === 'suspended' && db.session?.userId === x.id) db.session = null;
    email(x.email, status === 'suspended' ? 'Your account was suspended' : 'Your account was reactivated', status === 'suspended' ? `Reason: ${reason}` : 'You can sign in again.');
    audit(status === 'suspended' ? 'user.suspend' : 'user.reactivate', `${x.email} (${reason})`, 'success', a); return true;
  }),

  // ---------------- taxonomy
  taxonomy: () => endpoint(() => db.taxonomy, 30),
  addTerm: (vocab: keyof T.Taxonomy, label: string) => endpoint(() => {
    requireRole('admin'); need(label.trim().length >= 2, 400, 'Enter a label.', { label: 'Required.' });
    need(!db.taxonomy[vocab].some((t) => t.label.toLowerCase() === label.trim().toLowerCase()), 400, 'That term already exists.', { label: 'Duplicate.' });
    db.taxonomy[vocab].push({ id: slugify(label).replace(/-/g, '_'), label: label.trim() }); audit('taxonomy.add', `${vocab}:${label}`); return true;
  }),
  renameTerm: (vocab: keyof T.Taxonomy, tid: string, label: string) => endpoint(() => { requireRole('admin'); const t = db.taxonomy[vocab].find((x) => x.id === tid)!; need(label.trim().length >= 2, 400, 'Enter a label.'); audit('taxonomy.rename', `${vocab}:${t.label} → ${label}`); t.label = label.trim(); return true; }),
  toggleTerm: (vocab: keyof T.Taxonomy, tid: string) => endpoint(() => { requireRole('admin'); const t = db.taxonomy[vocab].find((x) => x.id === tid)!; t.deprecated = !t.deprecated; audit(t.deprecated ? 'taxonomy.deprecate' : 'taxonomy.restore', `${vocab}:${t.label}`); return true; }),
  termUsage: (vocab: keyof T.Taxonomy) => endpoint(() => {
    requireRole('admin'); const c: Record<string, number> = {};
    db.resources.forEach((r) => r.versions.forEach((v) => { const list = vocab === 'countries' ? v.countries : vocab === 'topics' ? v.topics : vocab === 'languages' ? [v.language] : []; list.forEach((k) => (c[k] = (c[k] ?? 0) + 1)); }));
    db.users.forEach((u) => { if (vocab === 'countries') c[u.country] = (c[u.country] ?? 0) + 1; if (vocab === 'categories') c[u.category] = (c[u.category] ?? 0) + 1; });
    return c;
  }),

  // ---------------- reporting, audit
  reportSummary: (days: number) => endpoint(() => {
    requireRole('admin', 'editor'); const since = Date.now() - days * 864e5;
    const active = db.users.filter((u) => u.status === 'approved');
    const group = (arr: string[]) => { const m: Record<string, number> = {}; arr.forEach((k) => (m[k] = (m[k] ?? 0) + 1)); return m; };
    const sup = (m: Record<string, number>) => Object.entries(m).map(([k, v]) => ({ key: k, value: v < SUPPRESS ? null : v })).sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
    const months: string[] = []; for (let i = 5; i >= 0; i--) { const d = new Date(); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() - i); months.push(d.toISOString().slice(0, 7)); }
    const posts = db.threads.flatMap((t) => t.posts);
    return {
      period: days, generatedAt: nowIso(), threshold: SUPPRESS, timezone: 'UTC',
      totals: { activeMembers: active.length, publishedResources: db.resources.filter((r) => r.status === 'published').length,
        newResources: db.resources.filter((r) => r.publishedAt && Date.parse(r.publishedAt) > since).length,
        events: db.events.filter((e) => e.status === 'published' && Date.parse(e.startsAt) > since).length,
        posts: posts.filter((p) => Date.parse(p.createdAt) > since).length,
        applications: db.applications.filter((a) => Date.parse(a.createdAt) > since).length },
      byCountry: sup(group(active.map((u) => u.country))), byCategory: sup(group(active.map((u) => u.category))),
      byType: sup(group(db.resources.filter((r) => r.status === 'published').map((r) => r.type))),
      monthly: months.map((m) => ({ month: m, posts: posts.filter((p) => p.createdAt.startsWith(m)).length, resources: db.resources.filter((r) => r.publishedAt?.startsWith(m)).length, members: db.applications.filter((a) => a.status === 'approved' && a.decidedAt?.startsWith(m)).length })),
    };
  }),
  audit: (f: { q?: string; result?: string }) => endpoint(() => {
    requireRole('admin'); const q = (f.q ?? '').toLowerCase();
    return db.audit.filter((a) => (!q || (a.action + a.object + a.actorName).toLowerCase().includes(q)) && (!f.result || a.result === f.result)).slice(0, 300);
  }),

  // ---------------- privacy
  myDataRequests: () => endpoint(() => { const u = requireUser(); return db.dataRequests.filter((d) => d.userId === u.id); }),
  createDataRequest: (kind: T.DataRequest['kind'], details: string) => endpoint(() => {
    const u = requireUser(); need(details.trim().length >= 10, 400, 'Describe your request in at least 10 characters.', { details: 'Too short.' });
    const r = ref('PRV'); db.dataRequests.unshift({ id: id('dr'), ref: r, userId: u.id, kind, details, status: 'open', createdAt: nowIso() });
    db.users.filter((x) => has(x, 'admin')).forEach((a) => notify(a.id, 'system', 'New privacy request', `${u.name}: ${kind} request ${r}.`, '/console?tab=privacy'));
    audit('privacy.request', r, 'success', u); return r;
  }),
  dataRequestDetail: (did: string) => endpoint(() => { requireRole('admin'); const d = db.dataRequests.find((x) => x.id === did); need(d, 404, 'Not found.'); const x = userById(d.userId)!; return { req: d, user: { name: x.name, email: x.email, joinedAt: x.joinedAt } }; }),
  resolveDataRequest: (did: string, resolution: string) => endpoint(() => {
    const u = requireRole('admin'); const d = db.dataRequests.find((x) => x.id === did)!; need(resolution.trim().length >= 10, 400, 'Describe the outcome, including any data kept and why.', { resolution: 'Required.' });
    d.status = 'resolved'; d.resolution = resolution; d.resolvedAt = nowIso();
    notify(d.userId, 'decision', `Privacy request ${d.ref} resolved`, resolution, '/privacy-requests');
    audit('privacy.resolve', d.ref, 'success', u); return true;
  }),
  exportMyData: () => endpoint(() => {
    const u = requireUser();
    return { exportedAt: nowIso(), account: publicUser(u), application: db.applications.find((a) => a.userId === u.id) ?? null,
      submissions: db.resources.filter((r) => r.ownerId === u.id).map((r) => ({ slug: r.slug, status: r.status, versions: r.versions.map((v) => ({ no: v.no, title: v.title, status: v.status, submittedAt: v.submittedAt })) })),
      posts: db.threads.flatMap((t) => t.posts.filter((p) => p.authorId === u.id).map((p) => ({ thread: t.title, body: p.body, createdAt: p.createdAt }))),
      messagesSent: db.messages.filter((m) => m.fromId === u.id).length, notifications: db.notifications.filter((n) => n.userId === u.id).length, privacyRequests: db.dataRequests.filter((d) => d.userId === u.id) };
  }, 600),

  // ---------------- mentorship
  setMentorship: (m: T.Mentorship | null) => endpoint(() => {
    const u = requireMember();
    if (m) { need(m.topics.length > 0, 400, 'Choose at least one topic.', { topics: 'Required.' }); u.mentorship = { ...m, updatedAt: nowIso() }; u.consents.push({ scope: 'mentorship', version: CONSENT_VERSION, at: nowIso() }); }
    else { u.mentorship = undefined; const c = u.consents.find((x) => x.scope === 'mentorship' && !x.withdrawnAt); if (c) c.withdrawnAt = nowIso(); }
    audit(m ? 'mentorship.register' : 'mentorship.withdraw', u.email); return true;
  }),
  mentorshipPool: () => endpoint(() => { requireRole('admin', 'editor', 'reviewer'); return db.users.filter((u) => u.status === 'approved' && u.mentorship).map((u) => ({ id: u.id, name: u.name, country: u.country, category: u.category, ...u.mentorship! })); }),

  // ---------------- messaging
  connections: () => endpoint(() => {
    const u = requireMember();
    return db.connections.filter((c) => (c.fromId === u.id || c.toId === u.id) && c.status !== 'declined')
      .map((c) => { const otherId = c.fromId === u.id ? c.toId : c.fromId; const o = userById(otherId)!; const msgs = db.messages.filter((m) => m.connectionId === c.id); const last = msgs[msgs.length - 1];
        return { ...c, other: { id: o.id, name: o.name, avatarHue: o.avatarHue, category: o.category }, incoming: c.toId === u.id, last: last ? { body: last.body, at: last.createdAt, mine: last.fromId === u.id } : null, blocked: u.blocked.includes(otherId) }; })
      .sort((a, b) => (b.last?.at ?? b.createdAt).localeCompare(a.last?.at ?? a.createdAt));
  }),
  requestConnection: (toId: string, message: string) => endpoint(() => {
    const u = requireMember(); const t = userById(toId); need(t && t.status === 'approved', 404, 'Member not found.');
    need(t.id !== u.id, 400, 'You cannot connect with yourself.');
    need(t.acceptsRequests && !t.blocked.includes(u.id), 403, 'This member is not accepting connection requests.');
    need(!db.connections.some((c) => ((c.fromId === u.id && c.toId === toId) || (c.toId === u.id && c.fromId === toId)) && c.status !== 'declined'), 409, 'You already have a connection or pending request with this member.');
    const today = db.connections.filter((c) => c.fromId === u.id && Date.now() - Date.parse(c.createdAt) < 864e5).length;
    need(today < 10, 429, 'You can send up to 10 requests a day. Try again tomorrow.');
    need(message.trim().length >= 10 && message.length <= 400, 400, 'Write a short introduction (10–400 characters).', { message: 'Required.' });
    db.connections.push({ id: id('cn'), fromId: u.id, toId, message: message.trim(), status: 'pending', createdAt: nowIso() });
    notify(toId, 'community', 'Connection request', `${u.name} would like to connect.`, '/messages'); return true;
  }),
  respondConnection: (cid: string, accept: boolean) => endpoint(() => {
    const u = requireMember(); const c = db.connections.find((x) => x.id === cid && x.toId === u.id && x.status === 'pending'); need(c, 404, 'Request not found.');
    c.status = accept ? 'accepted' : 'declined';
    if (accept) notify(c.fromId, 'community', 'Connection accepted', `${u.name} accepted your request.`, `/messages/${c.id}`);
    return true;
  }),
  messages: (cid: string) => endpoint(() => {
    const u = requireMember(); const c = db.connections.find((x) => x.id === cid && (x.fromId === u.id || x.toId === u.id)); need(c, 404, 'Conversation not found.');
    const otherId = c.fromId === u.id ? c.toId : c.fromId; const o = userById(otherId)!;
    return { connection: c, other: { id: o.id, name: o.name, avatarHue: o.avatarHue }, blocked: u.blocked.includes(otherId), blockedBy: o.blocked.includes(u.id),
      messages: db.messages.filter((m) => m.connectionId === cid).map((m) => ({ ...m, mine: m.fromId === u.id, reported: db.reports.some((r) => r.targetId === m.id && r.reporterId === u.id) })) };
  }, 100),
  sendMessage: (cid: string, body: string) => endpoint(() => {
    const u = requireMember(); const c = db.connections.find((x) => x.id === cid && (x.fromId === u.id || x.toId === u.id)); need(c && c.status === 'accepted', 403, 'You can message only accepted connections.');
    const otherId = c.fromId === u.id ? c.toId : c.fromId; need(!u.blocked.includes(otherId) && !userById(otherId)!.blocked.includes(u.id), 403, 'You cannot message this member.');
    need(body.trim().length > 0 && body.length <= 2000, 400, 'Write a message (up to 2,000 characters).');
    db.messages.push({ id: id('m'), connectionId: cid, fromId: u.id, body: body.trim(), createdAt: nowIso() }); return true;
  }, 120),
  setBlock: (uid: string, block: boolean) => endpoint(() => { const u = requireMember(); u.blocked = block ? [...new Set([...u.blocked, uid])] : u.blocked.filter((x) => x !== uid); audit(block ? 'member.block' : 'member.unblock', nameOf(uid), 'success', u); return true; }),

  // ---------------- workspaces
  workspaces: () => endpoint(() => { const u = requireMember(); return db.workspaces.filter((w) => w.members.includes(u.id) || w.invites.includes(u.id)).map((w) => ({ ...w, invited: w.invites.includes(u.id) && !w.members.includes(u.id), ownerName: nameOf(w.ownerId) })); }),
  workspace: (wid: string) => endpoint(() => {
    const u = requireMember(); const w = db.workspaces.find((x) => x.id === wid); need(w && w.members.includes(u.id), 404, 'This workspace could not be found, or you are not a member.');
    return { ...w, isOwner: w.ownerId === u.id, memberCards: w.members.map((m) => ({ id: m, name: nameOf(m), avatarHue: userById(m)?.avatarHue ?? 0 })), inviteCards: w.invites.map((m) => ({ id: m, name: nameOf(m) })),
      resourceViews: w.resources.map((s) => db.resources.find((r) => r.slug === s)).filter((r): r is T.Resource => !!r && canSeeResource(r, u)).map((r) => viewOf(r, u)),
      notesView: w.notes.map((n) => ({ ...n, authorName: nameOf(n.authorId) })) };
  }),
  createWorkspace: (name: string, description: string) => endpoint(() => { const u = requireMember(); need(name.trim().length >= 3, 400, 'Name the workspace.', { name: 'Required.' }); const w = { id: id('w'), name: name.trim(), description, ownerId: u.id, members: [u.id], invites: [], resources: [], notes: [], createdAt: nowIso() }; db.workspaces.push(w); audit('workspace.create', w.name, 'success', u); return w.id; }),
  workspaceAction: (wid: string, action: 'invite' | 'accept' | 'decline' | 'remove' | 'leave' | 'addResource' | 'removeResource' | 'note' | 'transfer', arg = '') => endpoint(() => {
    const u = requireMember(); const w = db.workspaces.find((x) => x.id === wid); need(w, 404, 'Workspace not found.');
    const owner = w.ownerId === u.id;
    switch (action) {
      case 'invite': { need(owner, 403, 'Only the owner can invite members.'); const t = userById(arg); need(t && t.status === 'approved', 404, 'Member not found.'); need(!w.members.includes(arg) && !w.invites.includes(arg), 409, 'Already a member or invited.'); w.invites.push(arg); notify(arg, 'community', 'Workspace invitation', `${u.name} invited you to “${w.name}”.`, '/workspaces'); break; }
      case 'accept': need(w.invites.includes(u.id), 404, 'No invitation.'); w.invites = w.invites.filter((x) => x !== u.id); w.members.push(u.id); break;
      case 'decline': w.invites = w.invites.filter((x) => x !== u.id); break;
      case 'remove': need(owner && arg !== u.id, 403, 'Only the owner can remove members.'); w.members = w.members.filter((x) => x !== arg); w.invites = w.invites.filter((x) => x !== arg); break;
      case 'leave': need(!owner, 400, 'Transfer ownership before leaving.'); w.members = w.members.filter((x) => x !== u.id); break;
      case 'addResource': need(w.members.includes(u.id), 403, 'Members only.'); need(db.resources.some((r) => r.slug === arg), 404, 'Resource not found.'); if (!w.resources.includes(arg)) w.resources.push(arg); break;
      case 'removeResource': need(w.members.includes(u.id), 403, 'Members only.'); w.resources = w.resources.filter((x) => x !== arg); break;
      case 'note': need(w.members.includes(u.id), 403, 'Members only.'); need(arg.trim().length > 1, 400, 'Write a note first.'); w.notes.push({ id: id('wn'), authorId: u.id, body: arg.trim(), at: nowIso() }); break;
      case 'transfer': need(owner && w.members.includes(arg), 403, 'Choose a current member.'); w.ownerId = arg; notify(arg, 'community', 'You now own a workspace', `${u.name} transferred “${w.name}” to you.`, `/workspaces/${w.id}`); break;
    }
    audit(`workspace.${action}`, `${w.name}${arg ? ': ' + (nameOf(arg) !== 'Unknown' ? nameOf(arg) : arg.slice(0, 40)) : ''}`, 'success', u); return true;
  }),

  // ---------------- learning, help, feedback
  collections: () => endpoint(() => { const u = current(); return db.collections.map((c) => ({ ...c, done: u ? c.items.filter((i) => u.learnProgress.includes(i.id)).length : 0 })); }),
  collection: (slug: string) => endpoint(() => { const u = current(); const c = db.collections.find((x) => x.slug === slug); need(c, 404, 'Collection not found.'); return { ...c, progress: u?.status === 'approved' ? u.learnProgress : null }; }),
  toggleProgress: (itemId: string) => endpoint(() => { const u = requireMember(); u.learnProgress = u.learnProgress.includes(itemId) ? u.learnProgress.filter((x) => x !== itemId) : [...u.learnProgress, itemId]; return true; }, 60),
  help: (q?: string) => endpoint(() => { const t = (q ?? '').toLowerCase().split(/\s+/).filter(Boolean); return db.help.filter((h) => t.every((w) => (h.title + ' ' + h.body).toLowerCase().includes(w))); }),
  helpArticle: (slug: string) => endpoint(() => { const h = db.help.find((x) => x.slug === slug); need(h, 404, 'Article not found.'); return h; }),
  saveHelp: (h: Partial<T.HelpArticle>) => endpoint(() => {
    requireRole('editor', 'admin'); need(h.title && h.body && h.category, 400, 'Some fields need attention.', { title: h.title ? '' : 'Required.' });
    if (h.id) Object.assign(db.help.find((x) => x.id === h.id)!, h, { updatedAt: nowIso() });
    else { const slug = slugify(h.title!); db.help.push({ id: slug, slug, title: h.title!, category: h.category!, body: h.body!, updatedAt: nowIso() }); }
    audit('help.save', h.title!); return true;
  }),
  feedback: (page: string, message: string) => endpoint(() => {
    need(message.trim().length >= 5, 400, 'Tell us a little more.', { message: 'Too short.' });
    const r = ref('FB'); db.feedback.unshift({ id: id('fb'), ref: r, userId: current()?.id, page, message: message.trim(), status: 'open', createdAt: nowIso() }); return r;
  }),

  // ---------------- newsletters, map, contributor stats
  newsletters: () => endpoint(() => { requireRole('editor', 'admin'); return db.newsletters.map((n) => ({ ...n, sentByName: nameOf(n.sentBy) })); }),
  segmentCount: (s: T.Newsletter['segment']) => endpoint(() => recipients(s).length, 80),
  sendNewsletter: (subject: string, body: string, s: T.Newsletter['segment']) => endpoint(() => {
    const u = requireRole('editor', 'admin'); need(subject.trim().length >= 5 && body.trim().length >= 20, 400, 'Add a subject and at least 20 characters of content.', { subject: subject ? '' : 'Required.' });
    const list = recipients(s); need(list.length > 0, 400, 'No subscribers match this segment.');
    list.forEach((r) => email(r.email, subject, `${body}\n\n—\nYou receive this because you subscribed to the network newsletter. Unsubscribe in one click from your settings.`, { label: 'Unsubscribe', path: '/settings?tab=notifications' }));
    db.newsletters.unshift({ id: id('nl'), subject, body, segment: s, sentAt: nowIso(), recipients: list.length, sentBy: u.id });
    audit('newsletter.send', `${subject} (${list.length} recipients)`, 'success', u); return list.length;
  }, 600),
  mapStats: () => endpoint(() => {
    const c: Record<string, { members: number; organisations: number; resources: number }> = {};
    const get = (k: string) => (c[k] ??= { members: 0, organisations: 0, resources: 0 });
    db.users.filter((u) => u.status === 'approved' && u.visibility.country).forEach((u) => get(u.country).members++);
    db.organisations.filter((o) => o.status === 'approved').forEach((o) => get(o.country).organisations++);
    db.resources.filter((r) => r.status === 'published' && r.visibility === 'public').forEach((r) => r.versions.find((v) => v.no === r.publishedNo)!.countries.forEach((k) => get(k).resources++));
    return Object.entries(c).map(([country, v]) => ({ country, members: v.members < SUPPRESS ? null : v.members, organisations: v.organisations, resources: v.resources, rawMembers: v.members > 0 }));
  }),
  myStats: () => endpoint(() => {
    const u = requireMember();
    return db.resources.filter((r) => r.ownerId === u.id && r.publishedNo).map((r) => ({ slug: r.slug, title: r.versions.find((v) => v.no === r.publishedNo)!.title, views: r.stats.views, downloads: r.stats.downloads, citations: r.stats.citations,
      monthly: r.stats.monthly, byCountry: Object.entries(r.stats.byCountry).map(([k, v]) => ({ country: k, value: v < SUPPRESS ? null : v })).sort((a, b) => (b.value ?? 0) - (a.value ?? 0)) }));
  }),
  homeStats: () => endpoint(() => ({ members: db.users.filter((u) => u.status === 'approved').length, countries: new Set(db.users.filter((u) => u.status === 'approved').map((u) => u.country)).size,
    resources: db.resources.filter((r) => r.status === 'published').length, events: db.events.filter((e) => e.status === 'published' && new Date(e.startsAt).getFullYear() === new Date().getFullYear()).length }), 60),

  // ---------------- demo tools
  demoInbox: () => endpoint(() => db.emails, 30),
  demoClearInbox: () => endpoint(() => { db.emails = []; return true; }, 30),
  demoQuickLogin: (em: string) => endpoint(() => { const u = db.users.find((x) => x.email === em); need(u, 404, 'Demo account not found.'); need(['approved', 'pending', 'closure_pending'].includes(u.status), 403, `This account is ${u.status}. Reset the demo data to restore it.`); startSession(u); audit('auth.login_demo', u.email, 'success', u); return true; }, 150),
  demoReset: () => endpoint(() => { db = makeSeed(); listeners.forEach((l) => l()); return true; }, 200),
  demoExpireSession: () => endpoint(() => { if (db.session) db.session.lastSeen = new Date(Date.now() - IDLE_MS - 1000).toISOString(); return true; }, 30),
};

function card(u: T.User, viewer: T.User): T.MemberCard {
  const self = viewer.id === u.id; const v = u.visibility;
  const org = u.orgId && u.orgConfirmed ? db.organisations.find((o) => o.id === u.orgId) : undefined;
  return { id: u.id, name: u.name, avatarHue: u.avatarHue, category: u.category, joinedAt: u.joinedAt, acceptsRequests: u.acceptsRequests,
    country: self || v.country ? u.country : undefined, affiliation: self || v.affiliation ? u.affiliation : undefined, biography: self || v.biography ? u.biography : undefined,
    interests: self || v.interests ? u.interests : undefined, email: self || v.email ? u.email : undefined, orcid: u.orcidVerified ? u.orcid : undefined,
    organisation: org && (self || v.affiliation) ? { slug: org.slug, name: org.name } : undefined };
}
function bump(r: T.Resource, k: 'views' | 'downloads' | 'citations') {
  r.stats[k]++; const m = nowIso().slice(0, 7); r.stats.monthly[m] = (r.stats.monthly[m] ?? 0) + (k === 'views' ? 1 : 0);
  const c = current()?.country ?? 'TZ'; if (k === 'views') r.stats.byCountry[c] = (r.stats.byCountry[c] ?? 0) + 1;
}
function recipients(s: T.Newsletter['segment']) {
  return db.users.filter((u) => u.status === 'approved' && u.prefs.notif.newsletter && (!s.countries.length || s.countries.includes(u.country)) && (!s.categories.length || s.categories.includes(u.category)) && (!s.topics.length || u.interests.some((i) => s.topics.includes(i))));
}

export type Api = typeof api;
