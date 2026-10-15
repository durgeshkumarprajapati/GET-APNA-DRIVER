'use client';

import { useEffect, useState } from 'react';
import { EmptyState } from '@/components/ui/empty-state';

interface RoleCatalogEntry {
  code: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions: { code: string; description: string | null }[];
}

interface RbacCatalog {
  roles: RoleCatalogEntry[];
  permissions: { code: string; description: string | null }[];
}

interface UserWithRolesRow {
  id: string;
  accountStatus: string;
  email: string | null;
  phoneNumber: string | null;
  roles: { code: string; name: string }[];
  createdAt: string;
}

interface UsersResponse {
  users: UserWithRolesRow[];
  total: number;
  page: number;
  pageSize: number;
}

const PAGE_SIZE = 20;

export default function AdminAccessAndRBACPage() {
  const [catalog, setCatalog] = useState<RbacCatalog | null>(null);
  const [expandedRole, setExpandedRole] = useState<string | null>(null);

  const [users, setUsers] = useState<UsersResponse | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [selectedRole, setSelectedRole] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    fetch('/api/admin/rbac/catalog')
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data: RbacCatalog) => setCatalog(data))
      .catch(() => setCatalog(null));
  }, []);

  useEffect(() => {
    let isMounted = true;
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (search.trim()) params.set('search', search.trim());

    fetch(`/api/admin/rbac/users?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data: UsersResponse) => {
        if (isMounted) setUsers(data);
      })
      .catch(() => {
        if (isMounted) setUsers(null);
      })
      .finally(() => {
        if (isMounted) setLoadingUsers(false);
      });

    return () => {
      isMounted = false;
    };
  }, [search, page, refreshKey]);

  const assignRole = async (userId: string) => {
    const roleCode = selectedRole[userId];
    if (!roleCode) return;
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/rbac/users/${userId}/roles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleCode }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: `Assigned ${roleCode}.` });
        setRefreshKey((k) => k + 1);
      } else {
        setMessage({ type: 'error', text: data.message ?? 'Failed to assign role.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error connecting to server.' });
    }
  };

  const revokeRole = async (userId: string, roleCode: string) => {
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/rbac/users/${userId}/roles/${roleCode}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: `Revoked ${roleCode}.` });
        setRefreshKey((k) => k + 1);
      } else {
        setMessage({ type: 'error', text: data.message ?? 'Failed to revoke role.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error connecting to server.' });
    }
  };

  const totalPages = users ? Math.max(1, Math.ceil(users.total / users.pageSize)) : 1;

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="bg-surface-container-lowest p-4 rounded-xl border border-surface-container-high">
        <div className="flex items-center gap-2 text-xs font-mono text-primary">
          <span className="material-symbols-outlined text-[16px]">admin_panel_settings</span>
          <span>ROLE-BASED ACCESS CONTROL</span>
        </div>
        <h1 className="text-xl font-bold text-on-surface font-['Space_Grotesk'] mt-1">
          Admin Access &amp; RBAC
        </h1>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl border ${message.type === 'success' ? 'bg-on-primary-container/50 border-primary-container text-primary' : 'bg-error-container/20 border-error-container text-error'}`}
        >
          <p className="text-sm font-medium">{message.text}</p>
        </div>
      )}

      {/* Role Catalog */}
      <section className="bg-surface-container-lowest rounded-xl border border-surface-container-high p-5 shadow-xl">
        <h2 className="text-base font-bold text-on-surface font-['Space_Grotesk'] mb-1">
          Role Catalog
        </h2>
        <p className="text-xs text-outline mb-4">
          Read-only. Which permissions each role grants is fixed at seed time, not editable through
          this screen.
        </p>
        {!catalog ? (
          <p className="text-outline text-sm">Loading roles…</p>
        ) : (
          <div className="space-y-2">
            {catalog.roles.map((role) => (
              <div
                key={role.code}
                className="rounded-lg border border-surface-container-high bg-surface-container-low overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setExpandedRole(expandedRole === role.code ? null : role.code)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-surface-container transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-on-surface text-sm">{role.name}</span>
                    <span className="text-[10px] font-mono text-outline">{role.code}</span>
                    {role.isSystem && (
                      <span className="px-1.5 py-0.5 rounded bg-surface-container-high text-primary text-[9px] font-bold">
                        SYSTEM
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-mono text-outline">
                    {role.permissions.length} permission{role.permissions.length === 1 ? '' : 's'}
                  </span>
                </button>
                {expandedRole === role.code && (
                  <div className="px-4 py-3 border-t border-surface-container-high bg-surface-container-lowest flex flex-wrap gap-1.5">
                    {role.permissions.map((permission) => (
                      <span
                        key={permission.code}
                        title={permission.description ?? undefined}
                        className="px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant font-mono text-[10px]"
                      >
                        {permission.code}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* User Role Assignment */}
      <section className="bg-surface-container-lowest rounded-xl border border-surface-container-high p-5 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <h2 className="text-base font-bold text-on-surface font-['Space_Grotesk']">
            User Role Assignment
          </h2>
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by email or phone..."
            className="h-9 px-3 rounded-lg bg-surface-container-low border border-surface-container-high text-xs text-on-surface placeholder:text-outline focus:outline-none focus:border-primary"
          />
        </div>

        {loadingUsers ? (
          <p className="text-outline text-sm py-8 text-center">Loading users…</p>
        ) : !users || users.users.length === 0 ? (
          <EmptyState icon="group" message="No users found." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-sans text-xs border-collapse">
              <thead>
                <tr className="bg-surface-container-low text-outline font-['Space_Grotesk'] uppercase border-b border-surface-container-high">
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Account</th>
                  <th className="py-3 px-4">Roles</th>
                  <th className="py-3 px-4 text-right">Assign</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-high font-mono">
                {users.users.map((user) => (
                  <tr key={user.id} className="hover:bg-surface-container-low/60 transition-colors">
                    <td className="py-3 px-4">
                      <span className="text-on-surface">{user.email ?? '—'}</span>
                      {user.phoneNumber && (
                        <span className="block text-[10px] text-outline">{user.phoneNumber}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-outline">{user.accountStatus}</td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1.5">
                        {user.roles.length === 0 ? (
                          <span className="text-outline">—</span>
                        ) : (
                          user.roles.map((role) => (
                            <span
                              key={role.code}
                              className="flex items-center gap-1 px-2 py-0.5 rounded bg-surface-container-high text-primary text-[10px] font-bold"
                            >
                              {role.name}
                              <button
                                type="button"
                                onClick={() => revokeRole(user.id, role.code)}
                                title={`Revoke ${role.name}`}
                                className="text-error hover:text-on-error-container"
                              >
                                ×
                              </button>
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <select
                          value={selectedRole[user.id] ?? ''}
                          onChange={(e) =>
                            setSelectedRole((prev) => ({ ...prev, [user.id]: e.target.value }))
                          }
                          className="h-8 px-2 rounded-lg bg-surface-container-low border border-surface-container-high text-on-surface text-xs focus:outline-none focus:border-primary"
                        >
                          <option value="">Select role…</option>
                          {catalog?.roles.map((role) => (
                            <option key={role.code} value={role.code}>
                              {role.name}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          disabled={!selectedRole[user.id]}
                          onClick={() => assignRole(user.id)}
                          className="px-3 py-1.5 bg-primary-container hover:bg-primary disabled:opacity-40 text-on-primary-container font-bold rounded-lg text-[11px]"
                        >
                          Assign
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {users && users.total > 0 && (
          <div className="flex items-center justify-between mt-4 text-xs text-outline">
            <span>
              Page {users.page} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg bg-surface-container-low border border-surface-container-high text-on-surface disabled:opacity-40 hover:bg-surface-container-high transition-colors"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-lg bg-surface-container-low border border-surface-container-high text-on-surface disabled:opacity-40 hover:bg-surface-container-high transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
