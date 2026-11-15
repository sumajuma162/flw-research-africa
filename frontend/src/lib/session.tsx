import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, onSessionChange, type PublicUser, type Role } from '@/api';

type S = { user: PublicUser | null; loading: boolean; isMember: boolean; isStaff: boolean; hasRole: (...r: Role[]) => boolean };
const Ctx = createContext<S>({ user: null, loading: true, isMember: false, isStaff: false, hasRole: () => false });
export const useSession = () => useContext(Ctx);

export function SessionProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['me'], queryFn: api.me, staleTime: 15_000, refetchInterval: 60_000 });
  useEffect(() => onSessionChange(() => qc.invalidateQueries()), [qc]);
  const user = q.data ?? null;
  const approved = user?.status === 'approved' || user?.status === 'closure_pending';
  const hasRole = (...r: Role[]) => !!user && approved && r.some((x) => user.roles.includes(x));
  return <Ctx.Provider value={{ user, loading: q.isLoading, isMember: approved, isStaff: hasRole('reviewer', 'moderator', 'editor', 'admin'), hasRole }}>{children}</Ctx.Provider>;
}
