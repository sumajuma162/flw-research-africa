import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, type ThemePref } from '@/api';
import { useSession } from './session';

const KEY = 'flw-visitor-prefs';
type P = { theme: ThemePref; dataSaver: boolean; dark: boolean; setTheme: (t: ThemePref) => void; setDataSaver: (b: boolean) => void };
const Ctx = createContext<P>({ theme: 'system', dataSaver: false, dark: false, setTheme: () => {}, setDataSaver: () => {} });
export const usePrefs = () => useContext(Ctx);

function read(): { theme: ThemePref; dataSaver: boolean } {
  try { return { theme: 'system', dataSaver: false, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }; } catch { return { theme: 'system', dataSaver: false }; }
}
function systemDark() {
  const host = document.documentElement.dataset.theme; // set by some embedding hosts
  if (host === 'dark') return true; if (host === 'light') return false;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

export function PrefsProvider({ children }: { children: ReactNode }) {
  const { user } = useSession();
  const qc = useQueryClient();
  const [local, setLocal] = useState(read);
  const [sys, setSys] = useState(systemDark);
  const [override, setOverride] = useState<ThemePref | null>(null);
  useEffect(() => setOverride(null), [user?.id]);
  const theme = override ?? user?.prefs.theme ?? local.theme;
  const dark = theme === 'dark' || (theme === 'system' && sys);

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    const on = () => setSys(systemDark());
    mq?.addEventListener?.('change', on);
    const mo = new MutationObserver(on); mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => { mq?.removeEventListener?.('change', on); mo.disconnect(); };
  }, []);
  useEffect(() => { document.documentElement.classList.toggle('dark', dark); }, [dark]);
  const persist = (n: typeof local) => { setLocal(n); try { localStorage.setItem(KEY, JSON.stringify(n)); } catch { /* ignore */ } };

  return (
    <Ctx.Provider value={{
      theme, dark, dataSaver: local.dataSaver,
      setTheme: (t) => { setOverride(t); persist({ ...local, theme: t }); if (user) api.updatePrefs({ theme: t }).then(() => qc.invalidateQueries({ queryKey: ['me'] })); },
      setDataSaver: (b) => persist({ ...local, dataSaver: b }),
    }}>{children}</Ctx.Provider>
  );
}
