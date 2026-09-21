import { useMemo, useState } from 'react';
import {
  PageHeader,
  DataTable,
  Drawer,
  Field,
  FieldGrid,
  Badge,
  type BadgeTone,
  Select,
  TextInput,
  Toolbar,
  Tabs,
  Button,
  type Column,
} from '@era/ui';
import type { Capability } from '@era/contracts';
import { useAuth, useCan } from '../store/auth';
import {
  useCreateRole,
  useCreateUser,
  useDeleteRole,
  useDeleteUser,
  useRemoveUserPhoto,
  useResetPassword,
  useRoles,
  useSetUserPhoto,
  useTeams,
  useUpdateRole,
  useUpdateUser,
  useUsers,
} from '../data/identity';
import { titleCase } from '../lib/format';
import { ImageGallery } from '../app/components/ImageGallery';

type UserRow = NonNullable<ReturnType<typeof useUsers>['data']>[number];
type RoleRow = NonNullable<ReturnType<typeof useRoles>['data']>[number];

const CAPABILITY_GROUPS: { label: string; caps: Capability[] }[] = [
  { label: 'CRM', caps: ['crm:read', 'crm:write'] },
  { label: 'Inventory', caps: ['inventory:read', 'inventory:write'] },
  { label: 'Sales', caps: ['sales:read', 'sales:write', 'sales:sign'] },
  { label: 'Finance', caps: ['finance:read', 'finance:write', 'commission:approve'] },
  { label: 'Approvals', caps: ['approvals:decide'] },
  { label: 'Marketing', caps: ['marketing:read'] },
  { label: 'Reports & Docs', caps: ['reports:read', 'documents:read'] },
  { label: 'Settings', caps: ['settings:write'] },
];

const AVATAR_PALETTE = ['#001F5B', '#8B0A1C', '#0E7C61', '#B8720B', '#5B21B6', '#0369A1'];

function capLabel(cap: Capability) {
  return titleCase(cap.replace(':', ' '));
}

function initials(name: string) {
  return (
    name
      .split(' ')
      .map((p) => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || '?'
  );
}

function avatarColorFor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

function Avatar({ id, name, color }: { id: string; name: string; color?: string | null }) {
  return (
    <span
      className="inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
      style={{ backgroundColor: color ?? avatarColorFor(id) }}
    >
      {initials(name)}
    </span>
  );
}

/** Shown exactly once, right after the server generates a credential — it is never retrievable again. */
function CredentialReveal({ password, onDone }: { password: string; onDone: () => void }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable — the value is still visible to select and copy by hand */
    }
  };

  return (
    <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
      <div>
        <p className="text-sm font-semibold text-amber-900">Temporary password generated</p>
        <p className="mt-0.5 text-xs text-amber-700">Share this with them now — it won't be shown again.</p>
      </div>
      <div className="flex items-center gap-2">
        <code className="flex-1 rounded-md border border-amber-300 bg-white px-3 py-2 font-mono text-sm text-gray-800">
          {password}
        </code>
        <Button type="button" size="sm" variant="outline" onClick={copy}>
          {copied ? 'Copied!' : 'Copy'}
        </Button>
      </div>
      <Button type="button" size="sm" onClick={onDone}>
        Done
      </Button>
    </div>
  );
}

/** Elevated/write-capable roles read as louder badges than plain read-only ones. */
function roleTone(capabilities: string[]): BadgeTone {
  if (capabilities.includes('settings:write')) return 'red';
  if (capabilities.some((c) => c.endsWith(':write') || c.endsWith(':decide') || c.endsWith(':sign') || c.endsWith(':approve')))
    return 'amber';
  return 'blue';
}

export function UsersPage() {
  const canWrite = useCan('settings:write');
  const [tab, setTab] = useState('users');

  const { data: users, isLoading: usersLoading } = useUsers();
  const { data: roles, isLoading: rolesLoading } = useRoles();
  const { data: teams } = useTeams();

  return (
    <div>
      <PageHeader title="Users & Roles" subtitle="Who can sign in, and what they can do" />
      <Tabs
        tabs={[
          { id: 'users', label: `Users (${users?.length ?? 0})` },
          { id: 'roles', label: `Roles (${roles?.length ?? 0})` },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'users' && (
        <UsersTab users={users ?? []} loading={usersLoading} roles={roles ?? []} teams={teams ?? []} canWrite={canWrite} />
      )}
      {tab === 'roles' && <RolesTab roles={roles ?? []} loading={rolesLoading} canWrite={canWrite} />}
    </div>
  );
}

function UsersTab({
  users,
  loading,
  roles,
  teams,
  canWrite,
}: {
  users: UserRow[];
  loading: boolean;
  roles: RoleRow[];
  teams: { id: string; name: string }[];
  canWrite: boolean;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createdCredential, setCreatedCredential] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [teamFilter, setTeamFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'DISABLED'>('ALL');
  const { user: currentUser } = useAuth();
  const updateUser = useUpdateUser();
  const createUser = useCreateUser();

  const filtersActive = q !== '' || roleFilter !== 'ALL' || teamFilter !== 'ALL' || statusFilter !== 'ALL';
  const clearFilters = () => {
    setQ('');
    setRoleFilter('ALL');
    setTeamFilter('ALL');
    setStatusFilter('ALL');
  };

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return users.filter((u) => {
      if (needle && !u.name.toLowerCase().includes(needle) && !u.email.toLowerCase().includes(needle)) return false;
      if (roleFilter !== 'ALL' && u.role.id !== roleFilter) return false;
      if (teamFilter === 'NONE' && u.teamId) return false;
      if (teamFilter !== 'ALL' && teamFilter !== 'NONE' && u.teamId !== teamFilter) return false;
      if (statusFilter === 'ACTIVE' && !u.active) return false;
      if (statusFilter === 'DISABLED' && u.active) return false;
      return true;
    });
  }, [users, q, roleFilter, teamFilter, statusFilter]);

  const open = openId ? users.find((u) => u.id === openId) : null;

  const columns: Column<UserRow>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (u) => (
        <div className="flex items-center gap-2.5">
          <Avatar id={u.id} name={u.name} color={u.avatarColor} />
          <span className="font-semibold text-[var(--era-navy)]">{u.name}</span>
        </div>
      ),
    },
    { key: 'email', header: 'Email', render: (u) => <span className="text-gray-600">{u.email}</span> },
    {
      key: 'role',
      header: 'Role',
      render: (u) => <Badge tone={roleTone(u.role.capabilities)}>{u.role.name}</Badge>,
    },
    { key: 'team', header: 'Team', render: (u) => teams.find((t) => t.id === u.teamId)?.name ?? '—' },
    {
      key: 'active',
      header: 'Status',
      render: (u) => (u.active ? <Badge tone="green">active</Badge> : <Badge tone="red">disabled</Badge>),
    },
  ];

  return (
    <div>
      <Toolbar>
        <TextInput placeholder="Search name or email…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
        <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="ALL">All roles</option>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </Select>
        <Select value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)}>
          <option value="ALL">All teams</option>
          <option value="NONE">No team</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </Select>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}>
          <option value="ALL">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="DISABLED">Disabled</option>
        </Select>
        {filtersActive && (
          <Button size="sm" variant="ghost" onClick={clearFilters}>
            Clear filters
          </Button>
        )}
        <span className="text-sm text-gray-400">
          {loading ? '…' : filtersActive ? `${rows.length} of ${users.length} users` : `${users.length} users`}
        </span>
        {canWrite && (
          <Button size="sm" onClick={() => setCreating(true)} className="ml-auto">
            + New user
          </Button>
        )}
      </Toolbar>

      <DataTable
        columns={columns}
        rows={rows}
        onRowClick={(u) => setOpenId(u.id)}
        empty={filtersActive ? 'No users match these filters.' : 'No users yet.'}
      />

      <Drawer open={!!open} onClose={() => setOpenId(null)} title={open?.name ?? ''}>
        {open && (
          <EditUserPanel
            key={open.id}
            user={open}
            roles={roles}
            teams={teams}
            canWrite={canWrite}
            updateUser={updateUser}
            currentUserId={currentUser?.id}
            onClose={() => setOpenId(null)}
          />
        )}
      </Drawer>

      <Drawer
        open={creating}
        onClose={() => {
          setCreating(false);
          setCreatedCredential(null);
        }}
        title="New user"
      >
        {createdCredential ? (
          <CredentialReveal
            password={createdCredential}
            onDone={() => {
              setCreating(false);
              setCreatedCredential(null);
            }}
          />
        ) : (
          <NewUserForm
            roles={roles}
            teams={teams}
            onCancel={() => setCreating(false)}
            onSubmit={(input) => {
              createUser.mutate(input, {
                onSuccess: (result) => setCreatedCredential(result.temporaryPassword),
              });
            }}
            pending={createUser.isPending}
            error={createUser.error?.message}
          />
        )}
      </Drawer>
    </div>
  );
}

function EditUserPanel({
  user,
  roles,
  teams,
  canWrite,
  updateUser,
  currentUserId,
  onClose,
}: {
  user: UserRow;
  roles: RoleRow[];
  teams: { id: string; name: string }[];
  canWrite: boolean;
  updateUser: ReturnType<typeof useUpdateUser>;
  currentUserId?: string;
  onClose: () => void;
}) {
  const [roleId, setRoleId] = useState(user.role.id);
  const [teamId, setTeamId] = useState(user.teamId ?? '');
  const [nameKhmer, setNameKhmer] = useState(user.nameKhmer ?? '');
  const [licenseNumber, setLicenseNumber] = useState(user.licenseNumber ?? '');
  const [resetPasswordResult, setResetPasswordResult] = useState<string | null>(null);
  const dirty =
    roleId !== user.role.id ||
    teamId !== (user.teamId ?? '') ||
    nameKhmer !== (user.nameKhmer ?? '') ||
    licenseNumber !== (user.licenseNumber ?? '');
  const deleteUser = useDeleteUser();
  const resetPassword = useResetPassword();
  const setUserPhoto = useSetUserPhoto();
  const removeUserPhoto = useRemoveUserPhoto();
  const isSelf = user.id === currentUserId;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Avatar id={user.id} name={user.name} color={user.avatarColor} />
        <div>
          <div className="font-semibold text-[var(--era-navy)]">{user.name}</div>
          <div className="text-sm text-gray-500">{user.email}</div>
        </div>
        {user.active ? <Badge tone="green">active</Badge> : <Badge tone="red">disabled</Badge>}
      </div>

      <FieldGrid>
        <Field label="Phone">{user.phone ?? '—'}</Field>
        <Field label="Since">{new Date(user.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</Field>
      </FieldGrid>

      <div>
        <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-400">
          Photo (for customer-facing documents)
        </label>
        <ImageGallery
          images={user.photoUrl ? [user.photoUrl] : []}
          canWrite={canWrite && !user.photoUrl}
          onUpload={(dataUrl) => setUserPhoto.mutate({ id: user.id, dataUrl })}
          onRemove={() => removeUserPhoto.mutate(user.id)}
          emptyHint="No photo yet."
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Name (Khmer)</span>
          <TextInput className="mt-1" value={nameKhmer} onChange={(e) => setNameKhmer(e.target.value)} disabled={!canWrite} />
        </label>
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wide text-gray-400">ERA Registration No.</span>
          <TextInput
            className="mt-1"
            value={licenseNumber}
            onChange={(e) => setLicenseNumber(e.target.value)}
            disabled={!canWrite}
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Role</span>
          <Select className="mt-1 w-full" value={roleId} onChange={(e) => setRoleId(e.target.value)} disabled={!canWrite}>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </Select>
        </label>
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Team</span>
          <Select className="mt-1 w-full" value={teamId} onChange={(e) => setTeamId(e.target.value)} disabled={!canWrite}>
            <option value="">No team</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        </label>
      </div>

      {updateUser.error && <p className="text-sm text-[var(--era-red)]">{updateUser.error.message}</p>}
      {resetPassword.error && <p className="text-sm text-[var(--era-red)]">{resetPassword.error.message}</p>}
      {deleteUser.error && <p className="text-sm text-[var(--era-red)]">{deleteUser.error.message}</p>}
      {isSelf && <p className="text-sm text-gray-400">This is your own account — sign in as someone else to manage it.</p>}

      {canWrite && (
        <div className="space-y-3 border-t border-gray-100 pt-4">
          <div className="flex items-center justify-between">
            <Button
              onClick={() =>
                updateUser.mutate({
                  id: user.id,
                  roleId,
                  teamId: teamId || null,
                  nameKhmer: nameKhmer || null,
                  licenseNumber: licenseNumber || null,
                })
              }
              disabled={!dirty || updateUser.isPending}
            >
              {updateUser.isPending ? 'Saving…' : 'Save changes'}
            </Button>
            <Button
              variant="outline"
              onClick={() => updateUser.mutate({ id: user.id, active: !user.active })}
              disabled={isSelf || updateUser.isPending}
            >
              {user.active ? 'Disable account' : 'Re-enable account'}
            </Button>
          </div>

          {resetPasswordResult ? (
            <CredentialReveal password={resetPasswordResult} onDone={() => setResetPasswordResult(null)} />
          ) : (
            <Button
              variant="outline"
              className="w-full"
              disabled={resetPassword.isPending}
              onClick={() => {
                if (window.confirm(`Generate a new password for ${user.name}? They'll be signed out everywhere.`)) {
                  resetPassword.mutate(user.id, {
                    onSuccess: (result) => setResetPasswordResult(result.temporaryPassword),
                  });
                }
              }}
            >
              {resetPassword.isPending ? 'Resetting…' : 'Reset password'}
            </Button>
          )}

          <Button
            variant="ghost"
            disabled={isSelf || deleteUser.isPending}
            title={isSelf ? 'You cannot delete your own account' : 'Permanently delete this account'}
            onClick={() => {
              if (window.confirm(`Permanently delete "${user.name}"? This cannot be undone.`)) {
                deleteUser.mutate(user.id, { onSuccess: onClose });
              }
            }}
          >
            {deleteUser.isPending ? 'Deleting…' : 'Delete user'}
          </Button>
        </div>
      )}
    </div>
  );
}

function NewUserForm({
  roles,
  teams,
  onCancel,
  onSubmit,
  pending,
  error,
}: {
  roles: RoleRow[];
  teams: { id: string; name: string }[];
  onCancel: () => void;
  onSubmit: (input: { email: string; name: string; roleId: string; teamId?: string }) => void;
  pending: boolean;
  error?: string;
}) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [roleId, setRoleId] = useState(roles[0]?.id ?? '');
  const [teamId, setTeamId] = useState('');

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ email, name, roleId, teamId: teamId || undefined });
      }}
    >
      <label className="block">
        <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Name</span>
        <TextInput className="mt-1" value={name} onChange={(e) => setName(e.target.value)} required />
      </label>
      <label className="block">
        <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Email</span>
        <TextInput className="mt-1" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <span className="mt-1 block text-xs text-gray-400">
          A temporary password will be generated automatically — you'll see it once, to share with them.
        </span>
      </label>
      <label className="block">
        <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Role</span>
        <Select className="mt-1 w-full" value={roleId} onChange={(e) => setRoleId(e.target.value)}>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </Select>
      </label>
      <label className="block">
        <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Team (optional)</span>
        <Select className="mt-1 w-full" value={teamId} onChange={(e) => setTeamId(e.target.value)}>
          <option value="">No team</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </Select>
      </label>
      {error && <p className="text-sm text-[var(--era-red)]">{error}</p>}
      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? 'Creating…' : 'Create user'}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function RolesTab({ roles, loading, canWrite }: { roles: RoleRow[]; loading: boolean; canWrite: boolean }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [q, setQ] = useState('');
  const [kindFilter, setKindFilter] = useState<'ALL' | 'SYSTEM' | 'CUSTOM'>('ALL');

  const filtersActive = q !== '' || kindFilter !== 'ALL';

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return roles.filter((r) => {
      if (
        needle &&
        !r.name.toLowerCase().includes(needle) &&
        !r.key.toLowerCase().includes(needle) &&
        !(r.description ?? '').toLowerCase().includes(needle)
      )
        return false;
      if (kindFilter === 'SYSTEM' && !r.isSystem) return false;
      if (kindFilter === 'CUSTOM' && r.isSystem) return false;
      return true;
    });
  }, [roles, q, kindFilter]);

  const open = openId ? roles.find((r) => r.id === openId) : null;

  const columns: Column<RoleRow>[] = [
    {
      key: 'name',
      header: 'Role',
      render: (r) => (
        <div className="flex items-center gap-2">
          <span className="font-semibold text-[var(--era-navy)]">{r.name}</span>
          {r.isSystem && <Badge tone="slate">system</Badge>}
        </div>
      ),
    },
    { key: 'key', header: 'Key', render: (r) => <code className="text-xs text-gray-500">{r.key}</code> },
    { key: 'description', header: 'Description', render: (r) => <span className="text-gray-600">{r.description ?? '—'}</span> },
    {
      key: 'caps',
      header: 'Capabilities',
      align: 'right',
      render: (r) => <Badge tone={roleTone(r.capabilities)}>{r.capabilities.length}</Badge>,
    },
    { key: 'users', header: 'Users', align: 'right', render: (r) => r._count.users },
  ];

  return (
    <div>
      <Toolbar>
        <TextInput placeholder="Search roles…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
        <Select value={kindFilter} onChange={(e) => setKindFilter(e.target.value as typeof kindFilter)}>
          <option value="ALL">All roles</option>
          <option value="SYSTEM">System only</option>
          <option value="CUSTOM">Custom only</option>
        </Select>
        {filtersActive && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setQ('');
              setKindFilter('ALL');
            }}
          >
            Clear filters
          </Button>
        )}
        <span className="text-sm text-gray-400">
          {loading ? '…' : filtersActive ? `${rows.length} of ${roles.length} roles` : `${roles.length} roles`}
        </span>
        {canWrite && (
          <Button size="sm" onClick={() => setCreating(true)} className="ml-auto">
            + New role
          </Button>
        )}
      </Toolbar>

      <DataTable
        columns={columns}
        rows={rows}
        onRowClick={(r) => setOpenId(r.id)}
        empty={filtersActive ? 'No roles match these filters.' : 'No roles yet.'}
      />

      <Drawer open={!!open} onClose={() => setOpenId(null)} title={open?.name ?? ''}>
        {open && <EditRoleForm key={open.id} role={open} canWrite={canWrite} onClose={() => setOpenId(null)} />}
      </Drawer>

      <Drawer open={creating} onClose={() => setCreating(false)} title="New role">
        <NewRoleForm onClose={() => setCreating(false)} />
      </Drawer>
    </div>
  );
}

function CapabilityChecklist({
  selected,
  onChange,
  disabled,
}: {
  selected: Capability[];
  onChange: (caps: Capability[]) => void;
  disabled?: boolean;
}) {
  const toggle = (cap: Capability) => {
    onChange(selected.includes(cap) ? selected.filter((c) => c !== cap) : [...selected, cap]);
  };

  const setGroup = (caps: Capability[], on: boolean) => {
    onChange(on ? Array.from(new Set([...selected, ...caps])) : selected.filter((c) => !caps.includes(c)));
  };

  return (
    <div className="space-y-4">
      {CAPABILITY_GROUPS.map((group) => {
        const allOn = group.caps.every((c) => selected.includes(c));
        return (
          <div key={group.label}>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">{group.label}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => setGroup(group.caps, !allOn)}
                  className="text-xs font-medium text-[var(--era-navy)] hover:underline"
                >
                  {allOn ? 'Clear' : 'Select all'}
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              {group.caps.map((cap) => (
                <label key={cap} className="flex items-center gap-1.5 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={selected.includes(cap)}
                    disabled={disabled}
                    onChange={() => toggle(cap)}
                    className="h-4 w-4 accent-[var(--era-red)] disabled:opacity-40"
                  />
                  {capLabel(cap)}
                </label>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EditRoleForm({ role, canWrite, onClose }: { role: RoleRow; canWrite: boolean; onClose: () => void }) {
  const [name, setName] = useState(role.name);
  const [description, setDescription] = useState(role.description ?? '');
  const [capabilities, setCapabilities] = useState<Capability[]>(role.capabilities as Capability[]);
  const updateRole = useUpdateRole();
  const deleteRole = useDeleteRole();

  const dirty = name !== role.name || description !== (role.description ?? '') || capabilities.length !== role.capabilities.length || capabilities.some((c) => !role.capabilities.includes(c));
  const canDelete = !role.isSystem && role._count.users === 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Badge tone={roleTone(capabilities)}>{capabilities.length} capabilities</Badge>
        {role.isSystem && <Badge tone="slate">system role</Badge>}
        <span className="text-sm text-gray-400">{role._count.users} user(s) assigned</span>
      </div>

      <label className="block">
        <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Name</span>
        <TextInput className="mt-1" value={name} onChange={(e) => setName(e.target.value)} disabled={!canWrite} />
      </label>
      <label className="block">
        <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Description</span>
        <TextInput
          className="mt-1"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={!canWrite}
          placeholder="What is this role for?"
        />
      </label>
      <Field label="Key (permanent)">
        <code className="text-xs">{role.key}</code>
      </Field>

      <div>
        <div className="mb-2 text-sm font-bold text-[var(--era-navy)]">Capabilities</div>
        <CapabilityChecklist selected={capabilities} onChange={setCapabilities} disabled={!canWrite} />
      </div>

      {updateRole.error && <p className="text-sm text-[var(--era-red)]">{updateRole.error.message}</p>}
      {deleteRole.error && <p className="text-sm text-[var(--era-red)]">{deleteRole.error.message}</p>}

      {canWrite && (
        <div className="flex items-center justify-between border-t border-gray-100 pt-4">
          <Button
            onClick={() =>
              updateRole.mutate(
                { id: role.id, name, description: description || null, capabilities },
                { onSuccess: onClose },
              )
            }
            disabled={!dirty || updateRole.isPending}
          >
            {updateRole.isPending ? 'Saving…' : 'Save changes'}
          </Button>
          <Button
            variant="ghost"
            disabled={!canDelete || deleteRole.isPending}
            title={!canDelete ? (role.isSystem ? 'System roles cannot be deleted' : 'Reassign users first') : undefined}
            onClick={() => {
              if (window.confirm(`Delete the "${role.name}" role? This cannot be undone.`)) {
                deleteRole.mutate(role.id, { onSuccess: onClose });
              }
            }}
          >
            Delete role
          </Button>
        </div>
      )}
    </div>
  );
}

function NewRoleForm({ onClose }: { onClose: () => void }) {
  const [key, setKey] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [capabilities, setCapabilities] = useState<Capability[]>([]);
  const createRole = useCreateRole();

  const keyValid = /^[A-Z][A-Z0-9_]*$/.test(key);

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        createRole.mutate(
          { key, name, description: description || undefined, capabilities },
          { onSuccess: onClose },
        );
      }}
    >
      <label className="block">
        <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Name</span>
        <TextInput className="mt-1" value={name} onChange={(e) => setName(e.target.value)} required />
      </label>
      <label className="block">
        <span className="text-xs font-medium uppercase tracking-wide text-gray-400">
          Key (SCREAMING_SNAKE_CASE, permanent)
        </span>
        <TextInput
          className="mt-1"
          value={key}
          onChange={(e) => setKey(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))}
          placeholder="REGIONAL_MANAGER"
          required
        />
        {key && !keyValid && <span className="mt-1 block text-xs text-[var(--era-red)]">Must start with a letter.</span>}
      </label>
      <label className="block">
        <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Description (optional)</span>
        <TextInput
          className="mt-1"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What is this role for?"
        />
      </label>

      <div>
        <div className="mb-2 flex items-center gap-2">
          <span className="text-sm font-bold text-[var(--era-navy)]">Capabilities</span>
          <Badge tone={roleTone(capabilities)}>{capabilities.length} selected</Badge>
        </div>
        <CapabilityChecklist selected={capabilities} onChange={setCapabilities} />
      </div>

      {createRole.error && <p className="text-sm text-[var(--era-red)]">{createRole.error.message}</p>}

      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={createRole.isPending || !keyValid || !name}>
          {createRole.isPending ? 'Creating…' : 'Create role'}
        </Button>
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
