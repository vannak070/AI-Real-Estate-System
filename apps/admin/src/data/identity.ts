import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Capability } from '@era/contracts';
import { api } from '../lib/api';

export interface DirectoryUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  nameKhmer: string | null;
  licenseNumber: string | null;
  photoUrl: string | null;
  role: { id: string; key: string; name: string };
}

const identityKeys = {
  users: () => ['identity', 'users'] as const,
  teams: () => ['identity', 'teams'] as const,
  roles: () => ['identity', 'roles'] as const,
  role: (id: string) => ['identity', 'roles', id] as const,
};

/* ── Users ── */

export function useUsers() {
  return useQuery({
    queryKey: identityKeys.users(),
    queryFn: () => api.identity.users.list.query(),
    staleTime: 60 * 1000,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      email: string;
      name: string;
      roleId: string;
      phone?: string;
      teamId?: string;
      avatarColor?: string;
      target?: number;
      nameKhmer?: string;
      licenseNumber?: string;
    }) => api.identity.users.create.mutate(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: identityKeys.users() }),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (id: string) => api.identity.users.resetPassword.mutate({ id }),
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      id: string;
      name?: string;
      phone?: string | null;
      roleId?: string;
      teamId?: string | null;
      avatarColor?: string | null;
      target?: number | null;
      active?: boolean;
      nameKhmer?: string | null;
      licenseNumber?: string | null;
    }) => api.identity.users.update.mutate(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: identityKeys.users() }),
  });
}

export function useSetUserPhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; dataUrl: string }) => api.identity.users.setPhoto.mutate(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: identityKeys.users() }),
  });
}

export function useRemoveUserPhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.identity.users.removePhoto.mutate({ id }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: identityKeys.users() }),
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.identity.users.delete.mutate({ id }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: identityKeys.users() }),
  });
}

export function useTeams() {
  return useQuery({
    queryKey: identityKeys.teams(),
    queryFn: () => api.identity.teams.list.query(),
    staleTime: 5 * 60 * 1000,
  });
}

export function userLabel(users: DirectoryUser[] | undefined, id: string | null | undefined): string {
  if (!id) return '—';
  return users?.find((u) => u.id === id)?.name ?? id;
}

/* ── Roles ── */

export function useRoles() {
  return useQuery({
    queryKey: identityKeys.roles(),
    queryFn: () => api.identity.roles.list.query(),
    staleTime: 60 * 1000,
  });
}

export function useCreateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { key: string; name: string; description?: string; capabilities: Capability[] }) =>
      api.identity.roles.create.mutate(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: identityKeys.roles() }),
  });
}

export function useUpdateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      id: string;
      name?: string;
      description?: string | null;
      capabilities?: Capability[];
    }) => api.identity.roles.update.mutate(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: identityKeys.roles() });
      queryClient.invalidateQueries({ queryKey: identityKeys.users() });
    },
  });
}

export function useDeleteRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.identity.roles.delete.mutate({ id }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: identityKeys.roles() }),
  });
}

export function roleLabel(roles: { id: string; name: string }[] | undefined, id: string | null | undefined): string {
  if (!id) return '—';
  return roles?.find((r) => r.id === id)?.name ?? id;
}
