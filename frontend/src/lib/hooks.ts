import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { ApiError } from '@/api';
import { useToast } from './toast';

/** Wraps an API call: shows success or error toasts, refreshes all cached data and exposes field errors. */
export function useAction<A extends unknown[], R>(fn: (...a: A) => Promise<R>, opts: { success?: string | ((r: R) => string); onSuccess?: (r: R) => void; silentError?: boolean } = {}) {
  const qc = useQueryClient();
  const toast = useToast();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const m = useMutation({
    mutationFn: (a: A) => fn(...a),
    onMutate: () => setErrors({}),
    onSuccess: (r) => {
      qc.invalidateQueries();
      if (opts.success) toast({ kind: 'success', text: typeof opts.success === 'function' ? opts.success(r) : opts.success });
      opts.onSuccess?.(r);
    },
    onError: (e) => {
      if (e instanceof ApiError) {
        setErrors(Object.fromEntries(Object.entries(e.errors ?? {}).filter(([, v]) => v)));
        if (!opts.silentError) toast({ kind: 'error', text: e.title });
        if (e.status === 401) qc.invalidateQueries({ queryKey: ['me'] });
      } else toast({ kind: 'error', text: 'Something went wrong. Check your connection and try again.' });
    },
  });
  return { run: (...a: A) => m.mutate(a), runAsync: (...a: A) => m.mutateAsync(a), busy: m.isPending, errors, setErrors, error: m.error as ApiError | null, reset: m.reset };
}

export function useDebounced<T>(value: T, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}

export function useOnline() {
  const [on, setOn] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  useEffect(() => { const a = () => setOn(true), b = () => setOn(false); window.addEventListener('online', a); window.addEventListener('offline', b); return () => { window.removeEventListener('online', a); window.removeEventListener('offline', b); }; }, []);
  return on;
}

export function useDocTitle(t: string) { useEffect(() => { document.title = t ? `${t} · FLW Research Africa` : 'FLW Research Africa'; }, [t]); }

/** Autosave a draft to browser storage (per-browser convenience only). */
export function useDraft<T>(key: string, initial: T) {
  const first = useRef(true);
  const [v, setV] = useState<T>(() => { try { const s = localStorage.getItem(key); return s ? { ...initial, ...JSON.parse(s) } : initial; } catch { return initial; } });
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const t = setTimeout(() => { try { localStorage.setItem(key, JSON.stringify(v)); setSavedAt(new Date()); } catch { /* ignore */ } }, 600);
    return () => clearTimeout(t);
  }, [key, v]);
  const clear = () => { try { localStorage.removeItem(key); } catch { /* ignore */ } };
  return [v, setV, savedAt, clear] as const;
}
