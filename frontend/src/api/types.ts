// Domain types. They mirror the Django models described in SRS Sections 5 and 16,
// so the mock API can later be replaced by real /api/v1 calls without touching screens.

export type Role = 'member' | 'reviewer' | 'moderator' | 'editor' | 'admin';
export type UserStatus = 'unverified' | 'pending' | 'approved' | 'rejected' | 'suspended' | 'closure_pending' | 'closed';
export type ThemePref = 'light' | 'dark' | 'system';

export interface Visibility { affiliation: boolean; biography: boolean; interests: boolean; email: boolean; country: boolean }
export interface NotifPrefs { events: boolean; community: boolean; newsletter: boolean; opportunities: boolean }
export interface ChannelPrefs { phone: string; verified: boolean; sms: boolean; whatsapp: boolean }
export interface Consent { scope: string; version: string; at: string; withdrawnAt?: string }
export interface Mentorship { role: 'mentor' | 'mentee' | 'both'; topics: string[]; note: string; updatedAt: string }

export interface User {
  id: string; email: string; password: string; name: string; status: UserStatus; roles: Role[];
  mfaEnabled: boolean; country: string; category: string; affiliation: string; biography: string;
  interests: string[]; visibility: Visibility; joinedAt: string; avatarHue: number;
  orcid?: string; orcidVerified?: boolean; orgId?: string; orgConfirmed?: boolean;
  acceptsRequests: boolean; blocked: string[];
  prefs: { theme: ThemePref; language: string; notif: NotifPrefs; channels: ChannelPrefs };
  consents: Consent[]; mentorship?: Mentorship; learnProgress: string[];
  suspendedReason?: string; closureReason?: string;
}
export type PublicUser = Omit<User, 'password'>;

export interface MemberCard {
  id: string; name: string; avatarHue: number; category: string;
  country?: string; affiliation?: string; biography?: string; interests?: string[]; email?: string;
  orcid?: string; organisation?: { slug: string; name: string }; acceptsRequests: boolean; joinedAt: string;
}

export interface Application {
  id: string; ref: string; userId: string; category: string; country: string; affiliation: string;
  interests: string[]; motivation: string; status: 'unverified' | 'pending' | 'approved' | 'rejected';
  createdAt: string; decidedBy?: string; decidedAt?: string; reason?: string; consentVersion: string; assigneeId?: string;
}

export type ResourceType = 'publication' | 'dataset' | 'tool' | 'methodology' | 'best_practice' | 'indigenous_knowledge' | 'policy_brief';
export type Visib = 'public' | 'members' | 'restricted';
export type ResStatus = 'draft' | 'pending' | 'returned' | 'rejected' | 'published' | 'withdrawn';

export interface DatasetMeta { custodian: string; period: string; coverage: string; method: string; access: string; pid?: string }
export interface IKMeta { authority: string; restrictions: string; community: string; confirmedBy?: string }

export interface ResourceVersion {
  no: number; title: string; summary: string; authors: string[]; countries: string[]; topics: string[];
  language: string; year: number; url?: string; fileName?: string; fileSize?: number; rights: string;
  keywords: string[]; doi?: string; submittedBy: string; submittedAt: string;
  status: 'draft' | 'pending' | 'returned' | 'rejected' | 'published' | 'superseded';
  reviewedBy?: string; reviewedAt?: string; reviewNote?: string;
  dataset?: DatasetMeta; ik?: IKMeta;
}
export interface Resource {
  id: string; slug: string; type: ResourceType; visibility: Visib; status: ResStatus; ownerId: string;
  versions: ResourceVersion[]; publishedNo?: number; createdAt: string; publishedAt?: string;
  withdrawnReason?: string; assigneeId?: string;
  stats: { views: number; downloads: number; citations: number; byCountry: Record<string, number>; monthly: Record<string, number> };
}
/** Flattened view returned by the API: resource + the version the requester may see. */
export interface ResourceView extends Omit<Resource, 'versions'> { v: ResourceVersion; versionCount: number; history: Pick<ResourceVersion, 'no' | 'status' | 'submittedAt' | 'reviewedAt' | 'reviewNote' | 'title'>[]; ownerName: string }

export interface EventItem {
  id: string; title: string; summary: string; body: string; startsAt: string; endsAt: string; timezone: string;
  location: string; online: boolean; link?: string; status: 'draft' | 'published'; membersOnly: boolean; topic: string; cancelled?: boolean;
}
export interface NewsItem { id: string; title: string; summary: string; body: string; publishedAt: string; status: 'draft' | 'published'; image: string; author: string }
export interface Opportunity {
  id: string; title: string; kind: 'collaboration' | 'funding' | 'partnership' | 'fellowship'; owner: string; summary: string;
  eligibility: string; deadline?: string; timezone: string; contact: string; status: 'draft' | 'published'; countries: string[];
}
export interface Page { slug: string; title: string; body: string; version: number; publishedAt: string; publishedBy: string; draft?: { body: string; savedBy: string; savedAt: string }; history: { version: number; publishedAt: string; publishedBy: string }[] }

export interface Post { id: string; authorId: string; body: string; createdAt: string; status: 'visible' | 'removed' }
export interface Thread { id: string; title: string; topic: string; authorId: string; createdAt: string; status: 'open' | 'locked' | 'removed'; posts: Post[] }
export interface Report {
  id: string; targetType: 'post' | 'message'; targetId: string; threadId?: string; reporterId: string; reason: string; details: string;
  createdAt: string; status: 'open' | 'resolved'; assigneeId?: string; resolution?: string; resolvedBy?: string;
}
export interface ContactRequest { id: string; ref: string; name: string; email: string; subject: string; message: string; createdAt: string; status: 'open' | 'resolved'; assigneeId?: string; resolution?: string }
export interface Notification { id: string; userId: string; kind: 'account' | 'decision' | 'community' | 'event' | 'system'; title: string; body: string; link?: string; createdAt: string; read: boolean }
export interface Email { id: string; to: string; subject: string; body: string; createdAt: string; action?: { label: string; path: string } }
export interface AuditEvent { id: string; at: string; actorId?: string; actorName: string; action: string; object: string; result: 'success' | 'denied' | 'failure'; correlationId: string }
export interface DataRequest { id: string; ref: string; userId: string; kind: 'access' | 'correction' | 'deletion'; details: string; status: 'open' | 'resolved'; createdAt: string; resolution?: string; resolvedAt?: string; assigneeId?: string }
export interface Organisation { id: string; slug: string; name: string; type: string; country: string; description: string; website: string; status: 'approved' | 'pending'; repUserId?: string; createdAt: string }
export interface LearnItem { id: string; title: string; kind: 'guide' | 'webinar' | 'resource'; minutes: number; language: string; captions?: boolean; resourceSlug?: string; summary: string }
export interface Collection { id: string; slug: string; title: string; level: 'Introductory' | 'Intermediate' | 'Advanced'; summary: string; objectives: string[]; topic: string; items: LearnItem[]; image: string }
export interface HelpArticle { id: string; slug: string; title: string; category: string; body: string; updatedAt: string }
export interface Feedback { id: string; ref: string; userId?: string; page: string; message: string; status: 'open' | 'resolved'; createdAt: string; resolution?: string }
export interface Connection { id: string; fromId: string; toId: string; message: string; status: 'pending' | 'accepted' | 'declined'; createdAt: string }
export interface Message { id: string; connectionId: string; fromId: string; body: string; createdAt: string }
export interface Workspace { id: string; name: string; description: string; ownerId: string; members: string[]; invites: string[]; resources: string[]; notes: { id: string; authorId: string; body: string; at: string }[]; createdAt: string }
export interface Newsletter { id: string; subject: string; body: string; segment: { topics: string[]; countries: string[]; categories: string[] }; sentAt: string; recipients: number; sentBy: string }
export interface Term { id: string; label: string; deprecated?: boolean }
export interface Taxonomy { countries: Term[]; categories: Term[]; topics: Term[]; languages: Term[] }

export interface Session { userId: string; startedAt: string; lastSeen: string }
export interface Token { token: string; userId: string; kind: 'verify' | 'reset'; expiresAt: string; used: boolean }

export interface DB {
  version: number;
  users: User[]; applications: Application[]; resources: Resource[]; events: EventItem[]; news: NewsItem[];
  opportunities: Opportunity[]; pages: Page[]; threads: Thread[]; reports: Report[]; contacts: ContactRequest[];
  notifications: Notification[]; emails: Email[]; audit: AuditEvent[]; dataRequests: DataRequest[];
  organisations: Organisation[]; collections: Collection[]; help: HelpArticle[]; feedback: Feedback[];
  connections: Connection[]; messages: Message[]; workspaces: Workspace[]; newsletters: Newsletter[];
  taxonomy: Taxonomy; session: Session | null; mfaChallenge: string | null; tokens: Token[];
  loginFailures: Record<string, string[]>; idempotency: Record<string, string>; seq: number;
}

export interface Page_<T> { count: number; page: number; pageSize: number; results: T[] }
