import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, FileUp, Link2, Wand2, X, Save, Sprout, Database, Trash2, BarChart3, Eye, Info } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { api, type ResourceType, type Visib } from '@/api';
import { TAXONOMY } from '@/api/seed';
import { RIGHTS, TYPE_HELP, TYPE_LABEL, country, language, topic } from '@/lib/labels';
import { fmtDate, fmtSize, newKey, timeAgo } from '@/lib/format';
import { useAction, useDocTitle } from '@/lib/hooks';
import { Alert, Button, ChipSelect, Empty, ErrorSummary, Field, Input, PageHeader, RowsSkeleton, Select, StatusBadge, Tabs, Textarea, Confirm } from '@/components/ui';
import { TYPE_ICON, TypeBadge, VisBadge } from '@/components/domain';
import { cn } from '@/lib/cn';

type Form = {
  type: ResourceType | ''; title: string; summary: string; authors: string; year: string; language: string; countries: string[]; topics: string[]; keywords: string;
  source: 'link' | 'file'; url: string; fileName: string; fileSize: number; rights: string; visibility: Visib; doi: string;
  dataset: { custodian: string; period: string; coverage: string; method: string; access: string; pid: string }; ik: { community: string; authority: string; restrictions: string };
};
const EMPTY: Form = { type: '', title: '', summary: '', authors: '', year: String(new Date().getFullYear()), language: 'en', countries: [], topics: [], keywords: '', source: 'link', url: '', fileName: '', fileSize: 0, rights: '', visibility: 'public', doi: '',
  dataset: { custodian: '', period: '', coverage: '', method: '', access: '', pid: '' }, ik: { community: '', authority: '', restrictions: '' } };
const STEPS = ['Type', 'Details', 'Source and rights', 'Review'];
const ALLOWED = ['pdf', 'docx', 'xlsx', 'csv', 'pptx', 'zip', 'txt', 'odt', 'ods'];
const STEP_OF: Record<string, number> = { title: 1, summary: 1, authors: 1, countries: 1, topics: 1, year: 1, source: 2, url: 2, file: 2, rights: 2, 'dataset.custodian': 2, 'dataset.period': 2, 'dataset.access': 2, 'ik.authority': 2, 'ik.restrictions': 2, 'ik.community': 2 };

export function Submit() {
  const [sp] = useSearchParams(); const editId = sp.get('edit'); const nav = useNavigate();
  useDocTitle(editId ? 'Edit submission' : 'Submit a resource');
  const storeKey = `flw-submit-${editId ?? 'new'}`;
  const [f, setF] = useState<Form>(() => { try { const s = localStorage.getItem(storeKey); return s ? { ...EMPTY, ...JSON.parse(s) } : EMPTY; } catch { return EMPTY; } });
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [key, setKey] = useState(newKey);
  const existing = useQuery({ queryKey: ['submission', editId], queryFn: () => api.submission(editId!), enabled: !!editId, retry: false });
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (!existing.data || loaded) return;
    const v = existing.data.versions[existing.data.versions.length - 1];
    setF({ ...EMPTY, type: existing.data.type, visibility: existing.data.visibility, title: v.title, summary: v.summary, authors: v.authors.join(', '), year: String(v.year), language: v.language, countries: v.countries, topics: v.topics,
      keywords: v.keywords.join(', '), source: v.fileName ? 'file' : 'link', url: v.url ?? '', fileName: v.fileName ?? '', fileSize: v.fileSize ?? 0, rights: v.rights, doi: v.doi ?? '',
      dataset: { ...EMPTY.dataset, ...(v.dataset ?? {}), pid: v.dataset?.pid ?? '' }, ik: { ...EMPTY.ik, ...(v.ik ?? {}) } });
    setStep(1); setLoaded(true);
  }, [existing.data, loaded]);
  useEffect(() => { const t = setTimeout(() => { try { localStorage.setItem(storeKey, JSON.stringify(f)); setSavedAt(new Date()); } catch { /* ignore */ } }, 700); return () => clearTimeout(t); }, [f, storeKey]);
  const set = (p: Partial<Form>) => setF((x) => ({ ...x, ...p }));
  const clear = () => { try { localStorage.removeItem(storeKey); } catch { /* ignore */ } };

  const payload = (action: 'draft' | 'submit') => ({
    id: editId ?? undefined, action, type: f.type as ResourceType, visibility: f.visibility, title: f.title.trim(), summary: f.summary.trim(),
    authors: f.authors.split(',').map((s) => s.trim()).filter(Boolean), year: Number(f.year), language: f.language, countries: f.countries, topics: f.topics,
    keywords: f.keywords.split(',').map((s) => s.trim()).filter(Boolean), url: f.source === 'link' ? f.url.trim() || undefined : undefined,
    fileName: f.source === 'file' ? f.fileName || undefined : undefined, fileSize: f.source === 'file' ? f.fileSize || undefined : undefined, rights: f.rights, doi: f.doi || undefined,
    dataset: f.type === 'dataset' ? { ...f.dataset, pid: f.dataset.pid || undefined } : undefined, ik: f.type === 'indigenous_knowledge' ? f.ik : undefined,
  });
  const save = useAction(api.saveResource, {
    success: (r) => (r.status === 'draft' || r.v.status === 'draft' ? 'Draft saved' : 'Submitted for review. A reviewer will check it soon.'),
    onSuccess: (r) => { if (r.v.status !== 'draft') { clear(); nav('/my-submissions'); } else { setKey(newKey()); if (!editId) { clear(); setLoaded(true); nav(`/submit?edit=${r.id}`, { replace: true }); } } },
  });
  useEffect(() => { if (Object.keys(save.errors).length) { setErrors(save.errors); const s = Math.min(...Object.keys(save.errors).map((k) => STEP_OF[k] ?? 3)); setStep(s); } }, [save.errors]);

  const lookup = useAction(api.lookupDoi, { success: 'Details filled from the DOI. Check them before continuing.', onSuccess: (m) => set({ title: m.title ?? f.title, summary: m.summary ?? f.summary, authors: (m.authors ?? []).join(', '), year: String(m.year ?? f.year), countries: m.countries ?? f.countries, topics: m.topics ?? f.topics, url: m.url ?? f.url, doi: m.doi ?? '', source: 'link' }) });

  const check = (s: number) => {
    const e: Record<string, string> = {};
    if (s === 0 && !f.type) e.type = 'Choose the type of resource.';
    if (s === 1) {
      if (f.title.trim().length < 8) e.title = 'Enter a title of at least 8 characters.';
      if (f.summary.trim().length < 40) e.summary = 'Write a summary of at least 40 characters.';
      if (!f.authors.trim()) e.authors = 'Add at least one author or custodian.';
      if (!f.countries.length) e.countries = 'Select at least one country or region.';
      if (!f.topics.length) e.topics = 'Select at least one topic.';
    }
    if (s === 2) {
      if (f.source === 'link' && !/^https?:\/\/\S+\.\S+/.test(f.url)) e.url = 'Enter a link that starts with http:// or https://.';
      if (f.source === 'file' && !f.fileName) e.file = 'Choose a file to upload.';
      if (!f.rights) e.rights = 'Choose a rights statement.';
      if (f.type === 'dataset') { if (!f.dataset.custodian) e['dataset.custodian'] = 'Name the data custodian.'; if (!f.dataset.period) e['dataset.period'] = 'Give the collection period.'; if (!f.dataset.access) e['dataset.access'] = 'Describe the access conditions.'; }
      if (f.type === 'indigenous_knowledge') { if (!f.ik.community) e['ik.community'] = 'Name the community or place.'; if (!f.ik.authority) e['ik.authority'] = 'Name who gave permission.'; if (!f.ik.restrictions) e['ik.restrictions'] = 'State any limits, or “No limits”.'; }
    }
    setErrors(e); return !Object.keys(e).length;
  };
  const go = (n: number) => { if (n > step && !check(step)) return; setErrors({}); setStep(n); window.scrollTo(0, 0); };
  const onFile = (file?: File) => {
    if (!file) return; const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!ALLOWED.includes(ext)) { setErrors({ file: `Files of type .${ext} are not accepted. Use PDF, Word, Excel, CSV, PowerPoint, ZIP or text.` }); return; }
    if (file.size > 20 * 1024 * 1024) { setErrors({ file: `This file is ${fmtSize(file.size)}. Files must be 20 MB or smaller.` }); return; }
    setErrors({}); set({ fileName: file.name, fileSize: file.size });
  };
  const returnedNote = existing.data?.versions[existing.data.versions.length - 1]?.status === 'returned' ? existing.data.versions[existing.data.versions.length - 1].reviewNote : undefined;
  const isNewVersion = existing.data?.status === 'published';

  if (editId && existing.isLoading) return <RowsSkeleton />;
  return (
    <>
      <PageHeader title={isNewVersion ? 'Submit a new version' : editId ? 'Edit submission' : 'Submit a resource'} intro="A reviewer who is not an author checks provenance, rights and visibility before anything is published." />
      {returnedNote && <div className="mb-5"><Alert tone="warning" title="The reviewer asked for changes">{returnedNote}</Alert></div>}
      {isNewVersion && <div className="mb-5"><Alert tone="info">Readers keep seeing the current published version until a reviewer accepts this new one.</Alert></div>}
      <ol className="flex gap-2 mb-6" aria-label="Progress">{STEPS.map((s, i) => <li key={s} className="flex-1"><button type="button" disabled={i > step} onClick={() => go(i)} className="w-full text-left disabled:cursor-default"><div className={cn('h-1.5 rounded-full', i <= step ? 'bg-primary' : 'bg-surface-3')} /><span className={cn('hidden sm:block text-xs mt-1.5 font-semibold', i === step ? 'text-primary' : 'text-muted')}>{i + 1}. {s}</span></button></li>)}</ol>
      <p className="sm:hidden text-sm font-semibold text-primary -mt-3 mb-4">Step {step + 1} of 4: {STEPS[step]}</p>
      <form className="max-w-3xl space-y-6" onSubmit={(e) => { e.preventDefault(); if (step < 3) go(step + 1); else save.run(payload('submit'), key); }} noValidate>
        <ErrorSummary errors={errors} />
        {step === 0 && <fieldset><legend className="label mb-3">What are you sharing?</legend>
          <div id="f-type" tabIndex={-1} className="grid sm:grid-cols-2 gap-3">{(Object.keys(TYPE_LABEL) as ResourceType[]).map((t) => { const I = TYPE_ICON[t]; return (
            <label key={t} className={cn('card card-hover p-4 flex gap-3 cursor-pointer', f.type === t && 'border-primary bg-primary-soft')}>
              <input type="radio" name="type" className="sr-only" checked={f.type === t} onChange={() => set({ type: t, visibility: t === 'indigenous_knowledge' ? 'members' : f.visibility })} />
              <span className="w-10 h-10 rounded-xl bg-surface text-primary flex items-center justify-center shrink-0"><I size={20} /></span><span><span className="font-semibold block">{TYPE_LABEL[t]}</span><span className="text-sm text-muted">{TYPE_HELP[t]}</span></span>
            </label>); })}</div>
          {f.type === 'indigenous_knowledge' && <div className="mt-4"><Alert tone="warning" icon={<Sprout size={18} />} title="Community knowledge needs permission">You will be asked who gave permission to share it and any limits. A reviewer confirms this before anything is published, and the community can ask for withdrawal at any time.</Alert></div>}
        </fieldset>}

        {step === 1 && <>
          {(f.type === 'publication' || f.type === 'policy_brief') && <div className="panel p-4"><p className="font-semibold flex items-center gap-2"><Wand2 size={18} className="text-secondary" />Have a DOI? Fill in the details automatically</p>
            <div className="flex gap-2 mt-3 flex-wrap"><input aria-label="DOI" className="input flex-1 min-w-[220px] font-mono" placeholder="10.5555/flw.2026.001" value={f.doi} onChange={(e) => set({ doi: e.target.value })} /><Button variant="secondary" busy={lookup.busy} onClick={() => lookup.run(f.doi)}>Look up</Button></div>
            <p className="hint">Try 10.5555/flw.2026.001, 10.5555/flw.2025.014, an unknown DOI, or 10.5555/timeout to see each response.</p>{lookup.errors.doi && <p className="field-error">{lookup.errors.doi}</p>}</div>}
          <Field id="f-title" label="Title" error={errors.title} required>{(p) => <Input {...p} value={f.title} onChange={(e) => set({ title: e.target.value })} />}</Field>
          <Field id="f-summary" label="Summary" error={errors.summary} hint={`${f.summary.length} characters. Explain what it covers and why it is useful.`} required>{(p) => <Textarea {...p} rows={5} value={f.summary} onChange={(e) => set({ summary: e.target.value })} />}</Field>
          <Field id="f-authors" label={f.type === 'dataset' ? 'Authors or data creators' : f.type === 'indigenous_knowledge' ? 'Knowledge holders and recorders' : 'Authors'} hint="Separate names with commas. Credit communities by name." error={errors.authors} required>{(p) => <Input {...p} value={f.authors} onChange={(e) => set({ authors: e.target.value })} placeholder="A. Mwakyusa, J. Otieno" />}</Field>
          <div className="grid sm:grid-cols-2 gap-5">
            <Field id="f-year" label="Year" error={errors.year} required>{(p) => <Input {...p} type="number" inputMode="numeric" min={1950} max={new Date().getFullYear() + 1} value={f.year} onChange={(e) => set({ year: e.target.value })} />}</Field>
            <Field label="Language">{(p) => <Select {...p} value={f.language} onChange={(e) => set({ language: e.target.value })}>{TAXONOMY.languages.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}</Select>}</Field>
          </div>
          <div id="f-countries" tabIndex={-1}><Field label="Countries or regions covered" error={errors.countries} required>{(p) => <Select {...p} value="" onChange={(e) => e.target.value && set({ countries: [...new Set([...f.countries, e.target.value])] })}><option value="">Add a country…</option>{TAXONOMY.countries.filter((c) => !f.countries.includes(c.id)).map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</Select>}</Field>
            {f.countries.length > 0 && <div className="flex flex-wrap gap-2 mt-2">{f.countries.map((c) => <button key={c} type="button" className="chip" aria-pressed="true" onClick={() => set({ countries: f.countries.filter((x) => x !== c) })}>{country(c)}<X size={14} aria-label="Remove" /></button>)}</div>}</div>
          <fieldset id="f-topics" tabIndex={-1}><legend className="label">Topics <span className="text-danger">*</span></legend><ChipSelect label="Topics" options={TAXONOMY.topics} value={f.topics} onChange={(v) => set({ topics: v })} />{errors.topics && <p className="field-error">{errors.topics}</p>}</fieldset>
          <Field label="Keywords" optional hint="Separate with commas. They help people find your resource.">{(p) => <Input {...p} value={f.keywords} onChange={(e) => set({ keywords: e.target.value })} />}</Field>
        </>}

        {step === 2 && <>
          <fieldset><legend className="label">Where is it?</legend><div className="grid grid-cols-2 gap-2">
            {([['link', 'A link', Link2], ['file', 'Upload a file', FileUp]] as const).map(([k, l, I]) => <label key={k} className={cn('card p-3 flex gap-2 items-center cursor-pointer font-semibold', f.source === k && 'border-primary bg-primary-soft')}><input type="radio" className="sr-only" name="src" checked={f.source === k} onChange={() => set({ source: k })} /><I size={18} />{l}</label>)}</div></fieldset>
          {f.source === 'link' ? <Field id="f-url" label="Link" error={errors.url} hint="Must start with http:// or https://." required>{(p) => <Input {...p} type="url" value={f.url} onChange={(e) => set({ url: e.target.value })} placeholder="https://" />}</Field> : (
            <div id="f-file" tabIndex={-1}><p className="label">File</p>
              <label onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); onFile(e.dataTransfer.files[0]); }} className={cn('flex flex-col items-center justify-center gap-2 p-8 rounded-2xl border-2 border-dashed cursor-pointer text-center', errors.file ? 'border-danger bg-danger-soft' : 'border-line-strong hover:border-primary bg-surface-2')}>
                <FileUp size={28} className="text-primary" /><span className="font-semibold">{f.fileName ? f.fileName : 'Drag a file here or choose one'}</span><span className="text-sm text-muted">{f.fileName ? fmtSize(f.fileSize) : 'PDF, Word, Excel, CSV, PowerPoint, ZIP or text · up to 20 MB'}</span>
                <input type="file" className="sr-only" accept={ALLOWED.map((x) => '.' + x).join(',')} onChange={(e) => onFile(e.target.files?.[0])} /></label>
              {errors.file && <p className="field-error">{errors.file}</p>}
              <p className="hint">Files are scanned for malware before reviewers can open them. Do not upload identifiable participant data.</p></div>)}
          <Field id="f-rights" label="Rights statement" error={errors.rights} required hint="Uploading does not transfer ownership. Choose how others may use this.">{(p) => <Select {...p} value={f.rights} onChange={(e) => set({ rights: e.target.value })}><option value="">Choose…</option>{RIGHTS.map((r) => <option key={r}>{r}</option>)}</Select>}</Field>
          <fieldset><legend className="label">Who can see it once published?</legend><div className="grid sm:grid-cols-3 gap-2">
            {([['public', 'Everyone', 'Anyone can read it'], ['members', 'Members only', 'Signed-in approved members'], ['restricted', 'Restricted', 'Only reviewers and you, e.g. by community decision']] as const).map(([k, l, h]) => (
              <label key={k} className={cn('card p-3 cursor-pointer', f.visibility === k && 'border-primary bg-primary-soft')}><input type="radio" className="sr-only" name="vis" checked={f.visibility === k} onChange={() => set({ visibility: k })} /><span className="font-semibold block">{l}</span><span className="text-sm text-muted">{h}</span></label>))}</div></fieldset>
          {f.type === 'dataset' && <section className="card p-5 space-y-4"><h2 className="text-lg flex items-center gap-2"><Database size={18} className="text-secondary" />Dataset details</h2>
            <p className="text-sm text-muted">The network lists datasets; it does not store raw or participant-level data.</p>
            <Field id="f-dataset-custodian" label="Data custodian" error={errors['dataset.custodian']} required>{(p) => <Input {...p} value={f.dataset.custodian} onChange={(e) => set({ dataset: { ...f.dataset, custodian: e.target.value } })} />}</Field>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field id="f-dataset-period" label="Collection period" error={errors['dataset.period']} required hint="For example: Mar 2021 – Dec 2024">{(p) => <Input {...p} value={f.dataset.period} onChange={(e) => set({ dataset: { ...f.dataset, period: e.target.value } })} />}</Field>
              <Field label="Coverage" optional>{(p) => <Input {...p} value={f.dataset.coverage} onChange={(e) => set({ dataset: { ...f.dataset, coverage: e.target.value } })} />}</Field>
            </div>
            <Field label="Method" optional>{(p) => <Textarea {...p} rows={2} value={f.dataset.method} onChange={(e) => set({ dataset: { ...f.dataset, method: e.target.value } })} />}</Field>
            <Field id="f-dataset-access" label="Licence or access conditions" error={errors['dataset.access']} required>{(p) => <Input {...p} value={f.dataset.access} onChange={(e) => set({ dataset: { ...f.dataset, access: e.target.value } })} />}</Field>
            <Field label="Persistent identifier" optional hint="DOI, handle or similar. Leave blank if there is none; we will show “Not available”.">{(p) => <Input {...p} value={f.dataset.pid} onChange={(e) => set({ dataset: { ...f.dataset, pid: e.target.value } })} />}</Field>
          </section>}
          {f.type === 'indigenous_knowledge' && <section className="rounded-2xl p-5 bg-secondary-soft space-y-4"><h2 className="text-lg flex items-center gap-2"><Sprout size={18} className="text-secondary" />Permission to share</h2>
            <Field id="f-ik-community" label="Community or place the knowledge comes from" error={errors['ik.community']} required>{(p) => <Input {...p} value={f.ik.community} onChange={(e) => set({ ik: { ...f.ik, community: e.target.value } })} />}</Field>
            <Field id="f-ik-authority" label="Who gave permission to share it?" error={errors['ik.authority']} required hint="Name the person or body with authority, for example a group chairperson or elders’ council.">{(p) => <Input {...p} value={f.ik.authority} onChange={(e) => set({ ik: { ...f.ik, authority: e.target.value } })} />}</Field>
            <Field id="f-ik-restrictions" label="Limits on sharing" error={errors['ik.restrictions']} required hint="For example: no commercial use; credit the community; members only.">{(p) => <Textarea {...p} rows={2} value={f.ik.restrictions} onChange={(e) => set({ ik: { ...f.ik, restrictions: e.target.value } })} />}</Field>
          </section>}
        </>}

        {step === 3 && <section className="card p-5 space-y-4">
          <div className="flex gap-2 flex-wrap">{f.type && <TypeBadge type={f.type} />}<VisBadge v={f.visibility} /></div>
          <h2 className="text-xl">{f.title || 'Untitled'}</h2><p className="text-muted">{f.authors}</p><p className="text-[15px]">{f.summary}</p>
          <dl className="grid sm:grid-cols-[150px_1fr] gap-x-4 gap-y-2 text-[15px] border-t border-line pt-4">
            {[['Year', f.year, 1], ['Language', language(f.language), 1], ['Countries', f.countries.map(country).join(', '), 1], ['Topics', f.topics.map(topic).join(', '), 1], ['Source', f.source === 'link' ? f.url : `${f.fileName} (${fmtSize(f.fileSize)})`, 2], ['Rights', f.rights, 2],
              ...(f.type === 'dataset' ? [['Custodian', f.dataset.custodian, 2], ['Access', f.dataset.access, 2]] : []), ...(f.type === 'indigenous_knowledge' ? [['Permission from', f.ik.authority, 2], ['Limits', f.ik.restrictions, 2]] : [])].map(([k, v, s]) => (
              <div key={k as string} className="contents"><dt className="text-muted">{k}</dt><dd className="break-words">{v || <span className="text-danger">Missing</span>} <button type="button" className="link text-sm ml-1" onClick={() => setStep(s as number)}>Edit</button></dd></div>))}
          </dl>
          <Alert tone="info" icon={<Info size={18} />}>After you submit, you cannot approve your own resource. You will get a notification and an email with the reviewer’s decision.</Alert>
        </section>}

        <div className="flex items-center justify-between gap-3 flex-wrap border-t border-line pt-5">
          <div className="flex gap-2">{step > 0 && <Button variant="ghost" icon={<ArrowLeft size={18} />} onClick={() => go(step - 1)}>Back</Button>}
            {f.type && f.title.length >= 8 && <Button variant="secondary" icon={<Save size={16} />} onClick={() => save.run(payload('draft'), key)}>Save draft</Button>}</div>
          <Button type="submit" busy={save.busy}>{step < 3 ? <>Continue<ArrowRight size={18} /></> : 'Submit for review'}</Button>
        </div>
        <p className="text-xs text-faint text-right">{savedAt ? `Saved on this device ${timeAgo(savedAt.toISOString())}` : ''}</p>
      </form>
    </>
  );
}

export function MySubmissions() {
  useDocTitle('My submissions');
  const [tab, setTab] = useState<'all' | 'pending' | 'returned' | 'published' | 'draft' | 'stats'>('all');
  const q = useQuery({ queryKey: ['my-submissions'], queryFn: api.mySubmissions });
  const stats = useQuery({ queryKey: ['my-stats'], queryFn: api.myStats, enabled: tab === 'stats' });
  const [del, setDel] = useState<string | null>(null);
  const rm = useAction(api.deleteDraft, { success: 'Draft deleted', onSuccess: () => setDel(null) });
  const st = (s: (typeof q.data & {})[number]) => (s.status === 'withdrawn' ? 'withdrawn' : s.v.status === 'superseded' ? 'published' : s.v.status);
  const list = (q.data ?? []).filter((s) => tab === 'all' || st(s) === tab);
  const count = (k: string) => (q.data ?? []).filter((s) => st(s) === k).length;
  const [sel, setSel] = useState<string | null>(null);
  const cur = useMemo(() => stats.data?.find((s) => s.slug === sel) ?? stats.data?.[0], [stats.data, sel]);
  return (
    <>
      <PageHeader title="My submissions" intro="Follow your resources through review and see how they are used." actions={<Button to="/submit">Submit a resource</Button>} />
      <Tabs label="Filter" value={tab} onChange={setTab} tabs={[{ id: 'all', label: 'All', count: q.data?.length }, { id: 'pending', label: 'In review', count: count('pending') }, { id: 'returned', label: 'Changes requested', count: count('returned') }, { id: 'published', label: 'Published', count: count('published') }, { id: 'draft', label: 'Drafts', count: count('draft') }, { id: 'stats', label: <span className="inline-flex items-center gap-1.5"><BarChart3 size={15} />Usage</span> }]} />
      <div className="mt-5">
        {tab === 'stats' ? (!stats.data ? <RowsSkeleton /> : stats.data.length === 0 ? <Empty title="No published resources yet" body="Usage figures appear once a resource is published." /> : (
          <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
            <ul className="space-y-2">{stats.data.map((s) => <li key={s.slug}><button onClick={() => setSel(s.slug)} className={cn('w-full text-left card p-3', cur?.slug === s.slug && 'border-primary bg-primary-soft')}><span className="font-semibold text-[15px] line-clamp-2">{s.title}</span><span className="text-sm text-muted tabular">{s.views} views · {s.downloads} downloads</span></button></li>)}</ul>
            {cur && <div className="card p-5 min-w-0">
              <h2 className="text-lg">{cur.title}</h2>
              <div className="grid grid-cols-3 gap-3 my-4">{[['Views', cur.views], ['Downloads', cur.downloads], ['Citations copied', cur.citations]].map(([k, v]) => <div key={k as string} className="panel p-3"><p className="text-xs text-muted">{k}</p><p className="font-display font-bold text-2xl text-primary tabular">{v}</p></div>)}</div>
              <h3 className="text-base mb-2">Views per month</h3>
              <div className="h-56 -ml-3"><ResponsiveContainer width="100%" height="100%"><BarChart data={Object.entries(cur.monthly).sort().map(([m, v]) => ({ m: m.slice(5) + '/' + m.slice(2, 4), v }))}><CartesianGrid vertical={false} stroke="var(--line)" /><XAxis dataKey="m" tick={{ fill: 'var(--muted)', fontSize: 12 }} axisLine={false} tickLine={false} /><YAxis tick={{ fill: 'var(--muted)', fontSize: 12 }} axisLine={false} tickLine={false} width={36} /><Tooltip cursor={{ fill: 'var(--surface-2)' }} contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10, color: 'var(--fg)' }} /><Bar dataKey="v" name="Views" fill="var(--primary)" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div>
              <h3 className="text-base mt-5 mb-2">Views by country</h3>
              <table className="tbl"><thead><tr><th>Country</th><th>Views</th></tr></thead><tbody>{cur.byCountry.map((c) => <tr key={c.country}><td>{country(c.country)}</td><td className="tabular">{c.value ?? 'Fewer than 3'}</td></tr>)}</tbody></table>
              <p className="text-xs text-faint mt-3">Counts under 3 are hidden so no individual reader can be identified. These are platform activity figures, not research impact or external citations.</p>
            </div>}
          </div>)) : q.isLoading ? <RowsSkeleton /> : list.length === 0 ? <Empty title="Nothing here" body={tab === 'all' ? 'Share your first publication, dataset, tool or practice.' : 'No submissions with this status.'} action={<Button to="/submit">Submit a resource</Button>} /> : (
          <ul className="space-y-3">{list.map((s) => (
            <li key={s.id} className="card p-4">
              <div className="flex gap-3 items-start justify-between flex-wrap"><div className="min-w-0"><div className="flex gap-2 flex-wrap mb-1.5"><TypeBadge type={s.type} /><StatusBadge status={s.status === 'published' && s.v.status === 'pending' ? 'pending' : st(s)} /></div>
                <p className="font-semibold">{s.v.title}</p><p className="text-sm text-muted">Version {s.v.no} · {s.v.status === 'draft' ? 'saved' : 'submitted'} {fmtDate(s.v.submittedAt)}{s.v.reviewedAt ? ` · reviewed ${fmtDate(s.v.reviewedAt)}` : ''}</p></div>
                <div className="flex gap-2 flex-wrap">
                  {(s.status === 'published' || s.status === 'withdrawn') && <Button size="sm" variant="secondary" icon={<Eye size={14} />} to={`/knowledge/${s.slug}`}>View</Button>}
                  {['draft', 'returned', 'rejected'].includes(s.v.status) && <Button size="sm" to={`/submit?edit=${s.id}`}>{s.v.status === 'returned' ? 'Revise' : 'Edit'}</Button>}
                  {s.status === 'draft' && <Button size="sm" variant="ghost" icon={<Trash2 size={14} />} onClick={() => setDel(s.id)}>Delete</Button>}
                </div></div>
              {s.v.reviewNote && (s.v.status === 'returned' || s.v.status === 'rejected') && <p className="text-sm panel p-3 mt-3"><strong>Reviewer’s note:</strong> {s.v.reviewNote}</p>}
            </li>))}</ul>)}
      </div>
      <Confirm open={!!del} onClose={() => setDel(null)} title="Delete this draft?" body="This cannot be undone." confirmLabel="Delete draft" danger busy={rm.busy} onConfirm={() => rm.run(del!)} />
      <p className="text-sm text-muted mt-8">Need help? Read <Link to="/help/submitting-a-resource" className="link">Submitting a resource for review</Link>.</p>
    </>
  );
}
