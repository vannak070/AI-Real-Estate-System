import type { ReactNode } from 'react';
import { Navigate } from 'react-router';
import { useAuth } from '../store/auth';
import { AdminLayout } from './layouts/AdminLayout';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

/** Router element for the `/` branch. */
export function AdminShell() {
  return (
    <RequireAuth>
      <AdminLayout />
    </RequireAuth>
  );
}

export function NoAccess() {
  return (
    <div className="rounded-xl border border-dashed border-gray-200 bg-white py-16 text-center">
      <div className="text-lg font-bold text-[var(--era-navy)]">No access</div>
      <p className="mt-1 text-sm text-gray-500">Your role doesn’t have permission to view this page.</p>
    </div>
  );
}
