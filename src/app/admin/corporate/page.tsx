'use client';

import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin-layout';

interface Organization {
  id: string;
  name: string;
  slug: string;
  legalName: string | null;
  gstin: string | null;
  billingEmail: string;
  status: string;
  creditLimit: string;
  currentBalance: string;
  createdAt: string;
  _count: {
    members: number;
    bookings: number;
  };
}

export default function AdminCorporatePage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    async function loadData() {
      try {
        const res = await fetch('/api/admin/corporate');
        if (!res.ok) {
          throw new Error('Failed to load corporate accounts');
        }
        const data = await res.json();
        if (!ignore) {
          setOrganizations(data.organizations || []);
        }
      } catch (err: unknown) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Error loading corporate accounts');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }
    void loadData();
    return () => {
      ignore = true;
    };
  }, []);

  const handleUpdateStatus = async (organizationId: string, status: string) => {
    try {
      setActionId(organizationId);
      setError(null);
      const res = await fetch('/api/admin/corporate', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId, status }),
      });

      if (!res.ok) {
        throw new Error('Failed to update organization status');
      }

      const updatedRes = await fetch('/api/admin/corporate');
      if (updatedRes.ok) {
        const data = await updatedRes.json();
        setOrganizations(data.organizations || []);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error updating status');
    } finally {
      setActionId(null);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <span className="text-[10px] font-mono font-bold tracking-widest text-[#68dba9] uppercase">
            ENTERPRISE ADMINISTRATION
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#dfe2ee] font-['Space_Grotesk'] mt-1">
            Corporate Accounts & Fleet Governance
          </h1>
          <p className="text-xs sm:text-sm text-[#bccac0] mt-1">
            Platform-wide administration for business accounts, credit line allocations, and verification status controls.
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-950/50 border border-red-500/50 text-red-300 text-xs">
            {error}
          </div>
        )}

        {loading ? (
          <div className="p-12 text-center text-[#bccac0] text-sm font-mono animate-pulse">
            Loading corporate accounts...
          </div>
        ) : (
          <div className="bg-[#141822] border border-[#262a33] rounded-2xl overflow-hidden shadow-xl">
            {organizations.length === 0 ? (
              <div className="p-12 text-center text-[#bccac0] text-xs font-mono">
                No corporate business accounts registered on platform yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#262a33] bg-[#0a0e16]/60 text-[11px] font-mono text-[#bccac0] uppercase tracking-wider">
                      <th className="p-3.5">Organization</th>
                      <th className="p-3.5">GSTIN / Tax ID</th>
                      <th className="p-3.5">Members & Rides</th>
                      <th className="p-3.5">Credit Line</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#262a33] text-xs font-mono">
                    {organizations.map((org) => (
                      <tr key={org.id} className="hover:bg-[#1c2028] transition-colors">
                        <td className="p-3.5">
                          <div className="font-bold text-[#dfe2ee]">{org.name}</div>
                          <div className="text-[10px] text-[#87948b]">{org.billingEmail}</div>
                        </td>
                        <td className="p-3.5 font-bold text-[#dfe2ee]">
                          {org.gstin || 'NOT_PROVIDED'}
                        </td>
                        <td className="p-3.5 text-[#bccac0]">
                          {org._count.members} Members / {org._count.bookings} Rides
                        </td>
                        <td className="p-3.5 font-bold text-[#68dba9]">
                          ₹{Number(org.creditLimit).toLocaleString()}
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${
                              org.status === 'ACTIVE'
                                ? 'bg-[#00311f] text-[#68dba9] border-[#25a475]'
                                : 'bg-rose-950/60 text-rose-300 border-rose-500/40'
                            }`}
                          >
                            {org.status}
                          </span>
                        </td>
                        <td className="p-3.5">
                          {org.status === 'ACTIVE' ? (
                            <button
                              type="button"
                              disabled={actionId === org.id}
                              onClick={() => void handleUpdateStatus(org.id, 'SUSPENDED')}
                              className="px-2.5 py-1 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/30 text-rose-300 rounded text-[10px] font-bold"
                            >
                              Suspend Account
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={actionId === org.id}
                              onClick={() => void handleUpdateStatus(org.id, 'ACTIVE')}
                              className="px-2.5 py-1 bg-[#25a475] hover:bg-[#208e65] text-[#00311f] rounded text-[10px] font-bold"
                            >
                              Activate Account
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
