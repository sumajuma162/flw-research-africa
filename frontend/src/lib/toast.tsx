import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

type Toast = { id: number; kind: 'success' | 'error' | 'info'; text: string; action?: { label: string; onClick: () => void } };
const Ctx = createContext<(t: Omit<Toast, 'id'>) => void>(() => {});
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((t: Omit<Toast, 'id'>) => {
    const id = Date.now() + Math.random();
    setToasts((x) => [...x.slice(-2), { ...t, id }]);
    setTimeout(() => setToasts((x) => x.filter((y) => y.id !== id)), t.kind === 'error' ? 7000 : 4500);
  }, []);
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="toast-region" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.kind}`}>
            {t.kind === 'success' ? <CheckCircle2 size={18} /> : t.kind === 'error' ? <AlertTriangle size={18} /> : <Info size={18} />}
            <span className="flex-1">{t.text}</span>
            {t.action && <button className="toast-action" onClick={() => { t.action!.onClick(); setToasts((x) => x.filter((y) => y.id !== t.id)); }}>{t.action.label}</button>}
            <button aria-label="Dismiss" className="opacity-70 hover:opacity-100" onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))}><X size={16} /></button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
