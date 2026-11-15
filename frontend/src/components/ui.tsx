import { useEffect, useId, useRef, type ReactNode, type ButtonHTMLAttributes, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { AlertCircle, Loader2, X, Inbox, RefreshCw, ChevronLeft, ChevronRight, Lock } from 'lucide-react';
import { cn } from '@/lib/cn';
import { initials } from '@/lib/format';
import { ApiError } from '@/api';

type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent';
type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: 'sm' | 'md'; busy?: boolean; to?: string; icon?: ReactNode };
export function Button({ variant = 'primary', size = 'md', busy, to, icon, className, children, disabled, ...rest }: BtnProps) {
  const cls = cn('btn', `btn-${variant}`, size === 'sm' && 'btn-sm', className);
  const inner = <>{busy ? <Loader2 size={18} className="animate-spin" aria-hidden /> : icon}{children}</>;
  if (to) return <Link to={to} className={cls}>{inner}</Link>;
  return <button type="button" className={cls} disabled={disabled || busy} aria-busy={busy || undefined} {...rest}>{inner}</button>;
}

export function Field({ label, hint, error, children, id, required, optional }: { label: ReactNode; hint?: ReactNode; error?: string; children: (p: { id: string; 'aria-invalid'?: boolean; 'aria-describedby'?: string }) => ReactNode; id?: string; required?: boolean; optional?: boolean }) {
  const auto = useId(); const fid = id ?? auto;
  const desc = [hint && `${fid}-hint`, error && `${fid}-err`].filter(Boolean).join(' ') || undefined;
  return (
    <div>
      <label htmlFor={fid} className="label">{label}{required && <span className="text-danger" aria-hidden> *</span>}{optional && <span className="font-normal text-muted text-sm"> (optional)</span>}</label>
      {children({ id: fid, 'aria-invalid': error ? true : undefined, 'aria-describedby': desc })}
      {hint && !error && <p id={`${fid}-hint`} className="hint">{hint}</p>}
      {error && <p id={`${fid}-err`} className="field-error"><AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden />{error}</p>}
    </div>
  );
}
export const Input = (p: InputHTMLAttributes<HTMLInputElement>) => <input {...p} className={cn('input', p.className)} />;
export const Textarea = (p: TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...p} className={cn('input', p.className)} />;
export const Select = ({ children, ...p }: SelectHTMLAttributes<HTMLSelectElement>) => <select {...p} className={cn('input', p.className)}>{children}</select>;

export function Check({ label, hint, checked, onChange, id, disabled }: { label: ReactNode; hint?: ReactNode; checked: boolean; onChange: (v: boolean) => void; id?: string; disabled?: boolean }) {
  const auto = useId();
  return (
    <label htmlFor={id ?? auto} className={cn('flex gap-3 items-start py-1', disabled ? 'opacity-60' : 'cursor-pointer')}>
      <input id={id ?? auto} type="checkbox" className="check" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span><span className="font-medium">{label}</span>{hint && <span className="block text-sm text-muted">{hint}</span>}</span>
    </label>
  );
}

export function Switch({ checked, onChange, label, hint, disabled, id }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; hint?: ReactNode; disabled?: boolean; id?: string }) {
  const auto = useId(); const fid = id ?? auto;
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <label htmlFor={fid} className="min-w-0 cursor-pointer"><span className="font-medium block">{label}</span>{hint && <span className="text-sm text-muted block">{hint}</span>}</label>
      <button id={fid} type="button" role="switch" aria-checked={checked} disabled={disabled} onClick={() => onChange(!checked)}
        className={cn('relative shrink-0 w-12 h-7 rounded-full transition-colors mt-0.5', checked ? 'bg-primary' : 'bg-line-strong', disabled && 'opacity-50')}>
        <span className={cn('absolute top-1 left-1 w-5 h-5 rounded-full bg-surface shadow transition-transform', checked && 'translate-x-5')} />
      </button>
    </div>
  );
}

/** Toggle chips for multi-select vocabularies (topics, countries). */
export function ChipSelect({ options, value, onChange, max, label }: { options: { id: string; label: string; deprecated?: boolean }[]; value: string[]; onChange: (v: string[]) => void; max?: number; label: string }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {options.filter((o) => !o.deprecated || value.includes(o.id)).map((o) => {
        const on = value.includes(o.id);
        return <button key={o.id} type="button" className="chip" aria-pressed={on} onClick={() => onChange(on ? value.filter((x) => x !== o.id) : max && value.length >= max ? value : [...value, o.id])}>{o.label}</button>;
      })}
    </div>
  );
}

const TONES = {
  green: 'bg-primary-soft text-primary-strong', terracotta: 'bg-secondary-soft text-secondary', gold: 'bg-accent-soft text-warning', grey: 'bg-surface-3 text-muted',
  blue: 'bg-info-soft text-info', red: 'bg-danger-soft text-danger', solidGreen: 'bg-primary text-on-primary', solidTerracotta: 'bg-secondary text-white dark:text-[#1C2421]', solidGold: 'bg-accent text-on-accent',
};
export function Badge({ tone = 'grey', children, icon }: { tone?: keyof typeof TONES; children: ReactNode; icon?: ReactNode }) {
  return <span className={cn('pill', TONES[tone])}>{icon}{children}</span>;
}
export function StatusBadge({ status }: { status: string }) {
  const m: Record<string, [keyof typeof TONES, string]> = {
    draft: ['grey', 'Draft'], pending: ['gold', 'In review'], returned: ['terracotta', 'Changes requested'], rejected: ['red', 'Not accepted'], published: ['green', 'Published'],
    withdrawn: ['grey', 'Withdrawn'], superseded: ['grey', 'Superseded'], approved: ['green', 'Approved'], unverified: ['grey', 'Email not verified'], suspended: ['red', 'Suspended'],
    closure_pending: ['terracotta', 'Closure requested'], closed: ['grey', 'Closed'], open: ['gold', 'Open'], resolved: ['green', 'Resolved'], accepted: ['green', 'Connected'], declined: ['grey', 'Declined'], locked: ['grey', 'Closed to replies'],
  };
  const [tone, label] = m[status] ?? ['grey', status];
  return <Badge tone={tone}>{label}</Badge>;
}

export function Avatar({ name, hue = 150, size = 40 }: { name: string; hue?: number; size?: number }) {
  return (
    <span aria-hidden className="inline-flex items-center justify-center rounded-full font-semibold shrink-0 select-none"
      style={{ width: size, height: size, fontSize: size * 0.38, background: `hsl(${hue} 42% 88%)`, color: `hsl(${hue} 50% 24%)` }}>
      {initials(name) || '?'}
    </span>
  );
}

function useLockScroll(open: boolean) {
  useEffect(() => { if (!open) return; const o = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = o; }; }, [open]);
}
function useFocusTrap(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const el = ref.current;
    const focusables = () => Array.from(el?.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])') ?? []);
    setTimeout(() => { const f = el?.querySelector<HTMLElement>('[data-autofocus]') ?? focusables()[1] ?? focusables()[0]; f?.focus(); }, 30);
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
      if (e.key === 'Tab') { const f = focusables(); if (!f.length) return; const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); } }
    };
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('keydown', key); prev?.focus?.(); };
  }, [open, onClose]);
  return ref;
}

export function Modal({ open, onClose, title, children, footer, size = 'md' }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode; size?: 'sm' | 'md' | 'lg' }) {
  useLockScroll(open); const ref = useFocusTrap(open, onClose); const tid = useId();
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center sm:p-4" style={{ animation: 'fade-in .15s' }}>
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={tid}
        className={cn('relative bg-surface w-full rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh]', size === 'sm' ? 'sm:max-w-md' : size === 'lg' ? 'sm:max-w-3xl' : 'sm:max-w-xl')}
        style={{ animation: 'sheet-in .22s ease-out', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-3">
          <h2 id={tid} className="text-xl">{title}</h2>
          <button className="btn-icon -mr-2 -mt-2" aria-label="Close" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="px-5 pb-5 overflow-y-auto">{children}</div>
        {footer && <div className="px-5 py-4 border-t border-line flex flex-wrap gap-2 justify-end">{footer}</div>}
      </div>
    </div>, document.body);
}

export function Sheet({ open, onClose, title, children, side = 'right', footer }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; side?: 'left' | 'right' | 'bottom'; footer?: ReactNode }) {
  useLockScroll(open); const ref = useFocusTrap(open, onClose); const tid = useId();
  if (!open) return null;
  const pos = side === 'bottom' ? 'inset-x-0 bottom-0 max-h-[90vh] rounded-t-2xl' : side === 'left' ? 'inset-y-0 left-0 w-[min(340px,88vw)]' : 'inset-y-0 right-0 w-[min(420px,92vw)]';
  return createPortal(
    <div className="fixed inset-0 z-[70]" style={{ animation: 'fade-in .15s' }}>
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={tid} className={cn('absolute bg-surface shadow-2xl flex flex-col', pos)}
        style={{ animation: `${side === 'bottom' ? 'sheet-in' : side === 'left' ? 'drawer-in' : 'drawer-in-right'} .22s ease-out`, paddingTop: side === 'bottom' ? 0 : 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-line">
          <h2 id={tid} className="text-lg">{title}</h2>
          <button className="btn-icon -mr-2" aria-label="Close" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="px-5 py-4 border-t border-line flex gap-2">{footer}</div>}
      </div>
    </div>, document.body);
}

export function Confirm({ open, onClose, title, body, confirmLabel, onConfirm, busy, danger, children }: { open: boolean; onClose: () => void; title: string; body: ReactNode; confirmLabel: string; onConfirm: () => void; busy?: boolean; danger?: boolean; children?: ReactNode }) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm" footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant={danger ? 'danger' : 'primary'} busy={busy} onClick={onConfirm}>{confirmLabel}</Button></>}>
      <div className="text-muted">{body}</div>{children}
    </Modal>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange, label }: { tabs: { id: T; label: ReactNode; count?: number }[]; value: T; onChange: (t: T) => void; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="tabs scrollbar-none">
      {tabs.map((t) => (
        <button key={t.id} role="tab" type="button" aria-selected={value === t.id} className="tab" onClick={() => onChange(t.id)}>
          {t.label}{t.count !== undefined && <span className={cn('pill !py-0 !px-2 text-[11px]', value === t.id ? 'bg-primary text-on-primary' : 'bg-surface-3 text-muted')}>{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Empty({ title, body, action, icon }: { title: string; body?: ReactNode; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="text-center py-12 px-4 panel">
      <div className="mx-auto mb-3 w-12 h-12 rounded-full bg-surface flex items-center justify-center text-muted">{icon ?? <Inbox size={22} />}</div>
      <h3 className="text-lg mb-1">{title}</h3>
      {body && <p className="text-muted max-w-md mx-auto">{body}</p>}
      {action && <div className="mt-4 flex justify-center gap-2 flex-wrap">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, retry }: { error: unknown; retry?: () => void }) {
  const e = error instanceof ApiError ? error : null;
  const membersOnly = e?.code === 'members_only' || e?.status === 401;
  return (
    <div className="text-center py-12 px-4 panel" role="alert">
      <div className="mx-auto mb-3 w-12 h-12 rounded-full bg-surface flex items-center justify-center text-secondary">{membersOnly ? <Lock size={22} /> : <AlertCircle size={22} />}</div>
      <h3 className="text-lg mb-1">{membersOnly ? 'Members only' : e?.status === 404 ? 'Not found' : 'We could not load this'}</h3>
      <p className="text-muted max-w-md mx-auto">{e?.title ?? 'Check your connection and try again.'}</p>
      <div className="mt-4 flex justify-center gap-2 flex-wrap">
        {membersOnly ? <><Button to="/login">Sign in</Button><Button variant="secondary" to="/join">Apply to join</Button></> : retry && e?.status !== 404 ? <Button variant="secondary" icon={<RefreshCw size={16} />} onClick={retry}>Try again</Button> : <Button variant="secondary" to="/">Go to home page</Button>}
      </div>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) { return <div className={cn('skel', className)} aria-hidden />; }
export function CardsSkeleton({ n = 6 }: { n?: number }) {
  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Loading">{Array.from({ length: n }).map((_, i) => <div key={i} className="card p-5 space-y-3"><Skeleton className="h-5 w-24" /><Skeleton className="h-5 w-full" /><Skeleton className="h-5 w-3/4" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-2/3" /></div>)}</div>;
}
export function RowsSkeleton({ n = 5 }: { n?: number }) {
  return <div className="space-y-3" aria-busy="true" aria-label="Loading">{Array.from({ length: n }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>;
}

export function Pagination({ page, count, pageSize, onPage }: { page: number; count: number; pageSize: number; onPage: (p: number) => void }) {
  const pages = Math.ceil(count / pageSize); if (pages <= 1) return null;
  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-2 mt-8">
      <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => onPage(page - 1)}><ChevronLeft size={16} />Previous</button>
      <span className="text-sm text-muted px-2 tabular">Page {page} of {pages}</span>
      <button className="btn btn-secondary btn-sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next<ChevronRight size={16} /></button>
    </nav>
  );
}

export function PageHeader({ eyebrow, title, intro, actions, children }: { eyebrow?: string; title: ReactNode; intro?: ReactNode; actions?: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-6">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h1 className="text-[28px] md:text-[34px]">{title}</h1>
        {intro && <p className="text-muted mt-2 max-w-2xl text-[17px]">{intro}</p>}
        {children}
      </div>
      {actions && <div className="flex flex-wrap gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

export function Alert({ tone = 'info', title, children, icon }: { tone?: 'info' | 'success' | 'warning' | 'danger'; title?: ReactNode; children?: ReactNode; icon?: ReactNode }) {
  const t = { info: 'bg-info-soft text-info', success: 'bg-success-soft text-success', warning: 'bg-warning-soft text-warning', danger: 'bg-danger-soft text-danger' }[tone];
  return (
    <div className={cn('rounded-xl p-4 flex gap-3', t)} role={tone === 'danger' ? 'alert' : 'note'}>
      <span className="shrink-0 mt-0.5">{icon ?? <AlertCircle size={20} />}</span>
      <div className="min-w-0 text-fg">{title && <p className="font-semibold">{title}</p>}{children && <div className="text-[15px] text-fg/90">{children}</div>}</div>
    </div>
  );
}

export function ErrorSummary({ errors }: { errors: Record<string, string> }) {
  const list = Object.entries(errors).filter(([, v]) => v);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (list.length) ref.current?.focus(); }, [list.length]);
  if (!list.length) return null;
  return (
    <div ref={ref} tabIndex={-1} className="rounded-xl p-4 bg-danger-soft border border-danger/30 mb-5" role="alert">
      <p className="font-semibold text-danger mb-1">Please fix {list.length === 1 ? 'this' : `these ${list.length}`} before continuing:</p>
      <ul className="list-disc pl-5 text-[15px]">{list.map(([k, v]) => <li key={k}><a className="underline" href={`#f-${k.replace('.', '-')}`} onClick={(e) => { e.preventDefault(); document.getElementById(`f-${k.replace('.', '-')}`)?.focus(); }}>{v}</a></li>)}</ul>
    </div>
  );
}

export function Stat({ value, label, hint }: { value: ReactNode; label: string; hint?: string }) {
  return <div><div className="font-display font-bold text-[26px] md:text-[30px] text-primary tabular leading-tight">{value}</div><div className="text-sm text-muted">{label}</div>{hint && <div className="text-xs text-faint">{hint}</div>}</div>;
}
