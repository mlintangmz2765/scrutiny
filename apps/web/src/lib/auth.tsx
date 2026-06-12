import { useQuery } from '@tanstack/react-query';
import { createContext, useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import type { UserPublic } from '@scrutiny/shared';
import { Spinner } from '../components/ui';
import { apiFetch } from './api';

const AuthContext = createContext<UserPublic | null>(null);

/** Current user — only usable inside the RequireAuth tree. */
export function useAuth(): UserPublic {
  const user = useContext(AuthContext);
  if (!user) throw new Error('useAuth must be used inside RequireAuth');
  return user;
}

/** Gate: resolves /auth/me once; unauthenticated users land on /login. */
export function RequireAuth() {
  const { data, isPending, isError } = useQuery({
    queryKey: ['me'],
    queryFn: () => apiFetch<UserPublic>('/auth/me'),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }
  if (isError || !data) return <Navigate to="/login" replace />;

  return (
    <AuthContext.Provider value={data}>
      <Outlet />
    </AuthContext.Provider>
  );
}
