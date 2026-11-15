import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Pause, Play, Search, Database, Users, Sprout, Globe2, CalendarDays } from 'lucide-react';
import { api } from '@/api';
import { TAXONOMY } from '@/api/seed';
import { HERO, IMAGES } from '@/lib/media';
import { usePrefs } from '@/lib/prefs';
import { useSession } from '@/lib/session';
import { useDocTitle } from '@/lib/hooks';
import { fmtDate } from '@/lib/format';
import { Button, CardsSkeleton, Skeleton, Stat } from '@/components/ui';
import { EventCard, ResourceCard } from '@/components/domain';

const QUICK = [['post_harvest', 'Post-harvest'], ['cold_chain', 'Cold chain'], ['indigenous', 'Indigenous knowledge'], ['policy', 'Policy'], ['storage', 'Storage']];

function HeroMedia() {
  const { dataSaver } = usePrefs();
  const ref = useRef<HTMLVideoElement>(null);
  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const [playing, setPlaying] = useState(!reduced && !dataSaver);
  useEffect(() => { const v = ref.current; if (!v) return; if (playing) v.play().catch(() => setPlaying(false)); else v.pause(); }, [playing]);
  if (dataSaver) return <img src={HERO.poster} alt="" className="absolute inset-0 w-full h-full object-cover object-[70%_center]" />;
  return (
    <>
      <video ref={ref} className="absolute inset-0 w-full h-full object-cover object-[64%_center]" src={HERO.video} poster={HERO.poster} muted loop playsInline autoPlay={!reduced} preload="metadata" aria-hidden="true" />
      <button onClick={() => setPlaying(!playing)} className="absolute z-20 bottom-4 right-4 btn btn-sm bg-black/45 text-white hover:bg-black/60 border border-white/25" style={{ marginRight: 'env(safe-area-inset-right, 0px)' }} aria-label={playing ? 'Pause background animation' : 'Play background animation'}>
        {playing ? <Pause size={14} /> : <Play size={14} />}{playing ? 'Pause' : 'Play'}
      </button>
    </>
  );
}

export default function Home() {
  useDocTitle('');
  const nav = useNavigate();
  const { isMember } = useSession();
  const [q, setQ] = useState('');
  const stats = useQuery({ queryKey: ['home-stats'], queryFn: api.homeStats });
  const featured = useQuery({ queryKey: ['search', 'home'], queryFn: () => api.search({ sort: 'newest', pageSize: 3 }) });
  const events = useQuery({ queryKey: ['events', 'home'], queryFn: () => api.events({ scope: 'upcoming' }) });
  const news = useQuery({ queryKey: ['news'], queryFn: () => api.news() });
  const submit = (e: FormEvent) => { e.preventDefault(); nav(`/knowledge${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`); };

  return (
    <>
      {/* Hero: looping illustrated video (truck carrying produce past fields and granaries) */}
      <section className="relative overflow-hidden bg-[#134A2F] text-white" aria-labelledby="hero-title">
        <div className="relative aspect-[16/10] md:aspect-auto md:absolute md:inset-0">
          <HeroMedia />
          <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#134A2F] to-transparent md:hidden" aria-hidden />
        </div>
        <div className="absolute inset-0 hero-shade hidden md:block" aria-hidden />
        <div className="relative z-10 wrap pt-1 md:pt-24 pb-14 md:pb-24">
          <div className="max-w-[620px]">
            <p className="rise text-[12.5px] font-semibold tracking-[.14em] uppercase text-[#F1CD78]">Research · Collaboration · Impact</p>
            <h1 id="hero-title" className="rise rise-2 mt-3 text-white text-[34px] leading-[1.08] sm:text-[44px] lg:text-[56px] font-bold">
              Reducing food loss and waste across Africa, <span className="text-[#F1CD78]">together.</span>
            </h1>
            <p className="rise rise-3 mt-5 text-[17px] md:text-[19px] text-white/90 max-w-[540px]">
              A network connecting researchers, practitioners, policymakers and communities to generate data, share knowledge and advance solutions.
            </p>
            <form onSubmit={submit} role="search" className="rise rise-4 mt-7 flex items-center bg-white rounded-full p-1.5 pl-5 shadow-xl max-w-[540px]">
              <Search size={20} className="text-[#5B6662] shrink-0" aria-hidden />
              <label htmlFor="hero-q" className="sr-only">Search the knowledge hub</label>
              <input id="hero-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search publications, datasets, tools…" className="flex-1 min-w-0 bg-transparent px-3 py-2 text-[16px] text-[#1C2421] placeholder:text-[#8A928E] outline-none" />
              <button className="btn bg-[#1E6B45] text-white hover:bg-[#134A2F] shrink-0">Search</button>
            </form>
            <div className="rise rise-4 mt-4 flex flex-wrap gap-2">
              {QUICK.map(([id, l]) => <Link key={id} to={`/knowledge?topic=${id}`} className="chip bg-white/14 text-white border-white/25 hover:border-white no-underline backdrop-blur-sm">{l}</Link>)}
            </div>
            <div className="rise rise-4 mt-8 flex flex-wrap gap-3">
              {isMember ? <Button to="/dashboard" variant="accent" icon={<ArrowRight size={18} />}>Go to your dashboard</Button> : <Button to="/join" variant="accent">Join the network<ArrowRight size={18} /></Button>}
              <Link to="/about" className="btn border border-white/40 text-white hover:bg-white/10 no-underline">About the network</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Activity figures, clearly labelled as platform activity (SRS 2.2) */}
      <section className="border-b border-line bg-surface">
        <div className="wrap py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.data ? <>
              <Stat value={stats.data.members} label="Approved members" />
              <Stat value={stats.data.countries} label="Countries represented" />
              <Stat value={stats.data.resources} label="Published resources" />
              <Stat value={stats.data.events} label="Events this year" />
            </> : Array.from({ length: 4 }).map((_, i) => <div key={i}><Skeleton className="h-8 w-20 mb-2" /><Skeleton className="h-4 w-32" /></div>)}
          </div>
          <p className="text-xs text-faint mt-4">Platform activity in this demo. These figures are not measurements of reduced food loss or waste.</p>
        </div>
      </section>

      {/* What the network does */}
      <section className="wrap py-16 md:py-20">
        <div className="max-w-2xl mb-10"><p className="eyebrow mb-2">What we do</p><h2 className="text-[28px] md:text-[36px]">From the farm gate to the kitchen, evidence that travels</h2>
          <p className="text-muted text-[17px] mt-3">Losses happen at harvest, in storage, on the road and at market. The network helps people who study and tackle them find each other and share what works.</p></div>
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { img: 'market', icon: Database, title: 'Share knowledge and data', body: 'Publications, datasets, tools and methods, reviewed for provenance and rights before they are published.', to: '/knowledge', cta: 'Explore the knowledge hub' },
            { img: 'cold-chain', icon: Users, title: 'Collaborate across borders', body: 'Find researchers, practitioners and policymakers by country and topic, and work together in shared spaces.', to: '/opportunities', cta: 'See opportunities' },
            { img: 'heritage', icon: Sprout, title: 'Respect community knowledge', body: 'Indigenous and community practices are shared only with the permission of the people who hold them.', to: '/knowledge?type=indigenous_knowledge', cta: 'Read community knowledge' },
          ].map((c) => (
            <article key={c.title} className="card overflow-hidden flex flex-col group">
              <div className="aspect-[3/2] overflow-hidden bg-surface-2"><img src={IMAGES[c.img].src} alt={IMAGES[c.img].alt} loading="lazy" width={1200} height={800} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" /></div>
              <div className="p-6 flex flex-col gap-3 flex-1">
                <span className="w-10 h-10 rounded-xl bg-primary-soft text-primary flex items-center justify-center"><c.icon size={20} /></span>
                <h3 className="text-xl">{c.title}</h3><p className="text-muted">{c.body}</p>
                <Link to={c.to} className="link mt-auto inline-flex items-center gap-1.5">{c.cta}<ArrowRight size={16} /></Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Featured knowledge */}
      <section className="bg-surface-2 py-16">
        <div className="wrap">
          <div className="flex items-end justify-between gap-4 mb-8"><div><p className="eyebrow mb-2">Latest from the hub</p><h2 className="text-[26px] md:text-[32px]">Featured knowledge</h2></div><Link to="/knowledge" className="link whitespace-nowrap inline-flex items-center gap-1">View all<ArrowRight size={16} /></Link></div>
          {featured.data ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{featured.data.results.map((r) => <ResourceCard key={r.id} r={r} />)}</div> : <CardsSkeleton n={3} />}
        </div>
      </section>

      {/* Picture band: datasets */}
      <section className="wrap py-16 md:py-20 grid gap-10 md:grid-cols-2 items-center">
        <div className="relative">
          <img src={IMAGES.research.src} alt={IMAGES.research.alt} loading="lazy" width={1200} height={800} className="rounded-2xl w-full aspect-[3/2] object-cover" />
          <div className="absolute -bottom-5 right-4 sm:-right-4 card shadow-xl p-4 max-w-[240px]"><p className="text-xs text-muted">Every dataset record shows</p><p className="font-semibold text-[15px]">Custodian, coverage, method and access terms</p></div>
        </div>
        <div>
          <p className="eyebrow mb-2">Research data</p>
          <h2 className="text-[26px] md:text-[34px]">Find the data behind the findings</h2>
          <p className="text-muted text-[17px] mt-3">The dataset catalogue lists who holds each dataset, what it covers and how to get access, so you can build on existing work instead of starting again.</p>
          <ul className="mt-5 space-y-2.5 text-[16px]">
            {['Search by country, topic and year', 'See access conditions before you request data', 'Cite datasets with a copyable citation'].map((t) => <li key={t} className="flex gap-3"><span className="mt-1.5 w-2 h-2 rounded-full bg-accent shrink-0" />{t}</li>)}
          </ul>
          <div className="mt-7 flex gap-3 flex-wrap"><Button to="/datasets" icon={<Database size={18} />}>Browse datasets</Button><Button to="/map" variant="secondary" icon={<Globe2 size={18} />}>View the network map</Button></div>
        </div>
      </section>

      {/* Events and news */}
      <section className="wrap pb-16 grid gap-10 lg:grid-cols-[1.25fr_1fr]">
        <div>
          <div className="flex items-end justify-between mb-5"><h2 className="text-[24px] md:text-[28px]">Upcoming events</h2><Link to="/events" className="link inline-flex items-center gap-1">All events<ArrowRight size={16} /></Link></div>
          <div className="space-y-3">{events.data ? events.data.slice(0, 3).map((e) => <EventCard key={e.id} e={e} />) : <><Skeleton className="h-24" /><Skeleton className="h-24" /></>}
            {events.data?.length === 0 && <p className="text-muted">No upcoming events yet.</p>}</div>
        </div>
        <div>
          <div className="flex items-end justify-between mb-5"><h2 className="text-[24px] md:text-[28px]">News</h2><Link to="/news" className="link inline-flex items-center gap-1">All news<ArrowRight size={16} /></Link></div>
          <div className="space-y-4">
            {news.data?.slice(0, 3).map((n) => (
              <Link key={n.id} to={`/news/${n.id}`} className="flex gap-4 group no-underline">
                <img src={IMAGES[n.image]?.src ?? IMAGES.market.src} alt="" loading="lazy" className="w-28 h-20 rounded-xl object-cover shrink-0" />
                <div className="min-w-0"><p className="text-xs text-muted flex items-center gap-1"><CalendarDays size={12} />{fmtDate(n.publishedAt)}</p><h3 className="text-[16px] leading-snug group-hover:text-primary">{n.title}</h3><p className="text-sm text-muted line-clamp-2">{n.summary}</p></div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section className="relative overflow-hidden">
        <img src={IMAGES.storage.src} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-[#134A2F]/88" aria-hidden />
        <div className="relative wrap py-16 md:py-20 text-white">
          <div className="max-w-2xl"><p className="text-[12.5px] font-semibold tracking-[.14em] uppercase text-[#F1CD78] mb-2">Who the network is for</p>
            <h2 className="text-white text-[26px] md:text-[36px]">Nine groups, one shared problem</h2>
            <p className="text-white/85 text-[17px] mt-3">Membership is free and reviewed. Your profile stays private until you choose what to show.</p></div>
          <ul className="mt-8 flex flex-wrap gap-2.5">{TAXONOMY.categories.map((c) => <li key={c.id} className="pill bg-white/12 border border-white/25 text-white text-[14px] !py-1.5 !px-3.5">{c.label}</li>)}</ul>
          <div className="mt-9 flex flex-wrap gap-3">{!isMember && <Button to="/join" variant="accent">Apply to join<ArrowRight size={18} /></Button>}<Link to="/help/joining-the-network" className="btn border border-white/40 text-white hover:bg-white/10 no-underline">How joining works</Link></div>
        </div>
      </section>
    </>
  );
}
