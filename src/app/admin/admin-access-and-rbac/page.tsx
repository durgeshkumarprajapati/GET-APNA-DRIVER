'use client';

import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin-layout';

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
    <AdminLayout>
      <div className="flex flex-col gap-6 w-full">
        <div className="bg-[#0a0e16] p-4 rounded-xl border border-[#262a33]">
          <div className="flex items-center gap-2 text-xs font-mono text-[#68dba9]">
            <span className="material-symbols-outlined text-[16px]">admin_panel_settings</span>
            <span>ROLE-BASED ACCESS CONTROL</span>
          </div>
          <h1 className="text-xl font-bold text-[#dfe2ee] font-['Space_Grotesk'] mt-1">
            Admin Access &amp; RBAC
          </h1>
        </div>

        {message && (
          <div
            className={`p-4 rounded-xl border ${message.type === 'success' ? 'bg-[#00311f]/50 border-[#25a475] text-[#68dba9]' : 'bg-[#93000a]/20 border-[#93000a] text-[#ffb4ab]'}`}
          >
            <p className="text-sm font-medium">{message.text}</p>
          </div>
        )}

        {/* Role Catalog */}
        <section className="bg-[#0a0e16] rounded-xl border border-[#262a33] p-5 shadow-xl">
          <h2 className="text-base font-bold text-[#dfe2ee] font-['Space_Grotesk'] mb-1">
            Role Catalog
          </h2>
          <p className="text-xs text-[#87948b] mb-4">
            Read-only. Which permissions each role grants is fixed at seed time, not editable
            through this screen.
          </p>
          {!catalog ? (
            <p className="text-[#87948b] text-sm">Loading roles…</p>
          ) : (
            <div className="space-y-2">
              {catalog.roles.map((role) => (
                <div
                  key={role.code}
                  className="rounded-lg border border-[#262a33] bg-[#181c24] overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedRole(expandedRole === role.code ? null : role.code)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[#1c2028] transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#dfe2ee] text-sm">{role.name}</span>
                      <span className="text-[10px] font-mono text-[#87948b]">{role.code}</span>
                      {role.isSystem && (
                        <span className="px-1.5 py-0.5 rounded bg-[#262a33] text-[#68dba9] text-[9px] font-bold">
                          SYSTEM
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-mono text-[#87948b]">
                      {role.permissions.length} permission{role.permissions.length === 1 ? '' : 's'}
                    </span>
                  </button>
                  {expandedRole === role.code && (
                    <div className="px-4 py-3 border-t border-[#262a33] bg-[#0a0e16] flex flex-wrap gap-1.5">
                      {role.permissions.map((permission) => (
                        <span
                          key={permission.code}
                          title={permission.description ?? undefined}
                          className="px-2 py-0.5 rounded bg-[#262a33] text-[#bccac0] font-mono text-[10px]"
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
        <section className="bg-[#0a0e16] rounded-xl border border-[#262a33] p-5 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <h2 className="text-base font-bold text-[#dfe2ee] font-['Space_Grotesk']">
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
              className="h-9 px-3 rounded-lg bg-[#181c24] border border-[#262a33] text-xs text-[#dfe2ee] placeholder:text-[#87948b] focus:outline-none focus:border-[#68dba9]"
            />
          </div>

          {loadingUsers ? (
            <p className="text-[#87948b] text-sm py-8 text-center">Loading users…</p>
          ) : !users || users.users.length === 0 ? (
            <p className="text-[#87948b] text-sm py-8 text-center">No users found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left font-sans text-xs border-collapse">
                <thead>
                  <tr className="bg-[#181c24] text-[#87948b] font-['Space_Grotesk'] uppercase border-b border-[#262a33]">
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Account</th>
                    <th className="py-3 px-4">Roles</th>
                    <th className="py-3 px-4 text-right">Assign</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#262a33] font-mono">
                  {users.users.map((user) => (
                    <tr key={user.id} className="hover:bg-[#181c24]/60 transition-colors">
                      <td className="py-3 px-4">
                        <span className="text-[#dfe2ee]">{user.email ?? '—'}</span>
                        {user.phoneNumber && (
                          <span className="block text-[10px] text-[#87948b]">
                            {user.phoneNumber}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-[#87948b]">{user.accountStatus}</td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1.5">
                          {user.roles.length === 0 ? (
                            <span className="text-[#87948b]">—</span>
                          ) : (
                            user.roles.map((role) => (
                              <span
                                key={role.code}
                                className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#262a33] text-[#68dba9] text-[10px] font-bold"
                              >
                                {role.name}
                                <button
                                  type="button"
                                  onClick={() => revokeRole(user.id, role.code)}
                                  title={`Revoke ${role.name}`}
                                  className="text-[#ffb4ab] hover:text-[#ffdad6]"
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
                            className="h-8 px-2 rounded-lg bg-[#181c24] border border-[#262a33] text-[#dfe2ee] text-xs focus:outline-none focus:border-[#68dba9]"
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
                            className="px-3 py-1.5 bg-[#25a475] hover:bg-[#68dba9] disabled:opacity-40 text-[#00311f] font-bold rounded-lg text-[11px]"
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
            <div className="flex items-center justify-between mt-4 text-xs text-[#87948b]">
              <span>
                Page {users.page} of {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-lg bg-[#181c24] border border-[#262a33] text-[#dfe2ee] disabled:opacity-40 hover:bg-[#262a33] transition-colors"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 rounded-lg bg-[#181c24] border border-[#262a33] text-[#dfe2ee] disabled:opacity-40 hover:bg-[#262a33] transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </AdminLayout>
  );
}
