import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { TRPCClientError } from '@era/api-client';
import { can, type Capability } from '@era/contracts';
import { api } from '../lib/api';

/**
 * Real auth: `auth.me` reads the session cookie (httpOnly, set by `auth.login`)
 * via a query so the app boots knowing whether a session already exists —
 * `isLoading` covers that first round trip, guarded by <RequireAuth> so no
 * page renders (and no redirect fires) before it settles.
 */

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: { id: string; key: string; name: string };
  capabilities: Capability[];
}

interface AuthValue {
  user: AuthUser | null;
  isLoading: boolean;
  /** resolves to an error message, or null on success */
  login: (email: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
  can: (cap: Capability) => boolean;
}

const AuthContext = createContext<AuthValue | null>(null);
const ME_KEY = ['auth', 'me'] as const;

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery({
    queryKey: ME_KEY,
    queryFn: () => api.auth.me.query(),
    // Short, so permission changes (an admin editing a role) reach open tabs when they're next
    // focused — with 5 minutes a newly granted capability stayed hidden until a manual reload.
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    retry: false,
  });

  const login = useCallback(
    async (email: string, password: string) => {
      try {
        const loggedInUser = await api.auth.login.mutate({ email, password });
        queryClient.setQueryData(ME_KEY, loggedInUser);
        return null;
      } catch (e) {
        return e instanceof TRPCClientError ? e.message : 'Sign-in failed';
      }
    },
    [queryClient],
  );

  const logout = useCallback(async () => {
    await api.auth.logout.mutate();
    queryClient.setQueryData(ME_KEY, null);
    queryClient.clear();
  }, [queryClient]);

  const value = useMemo<AuthValue>(
    () => ({
      user: user ?? null,
      isLoading,
      login,
      logout,
      can: (cap) => can(user?.capabilities, cap),
    }),
    [user, isLoading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}

export function useCan(cap: Capability): boolean {
  return useAuth().can(cap);
}
