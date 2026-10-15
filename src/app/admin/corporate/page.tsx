'use client';

import { useEffect, useState } from 'react';
import { EmptyState } from '@/components/ui/empty-state';

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
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <span className="text-[10px] font-mono font-bold tracking-widest text-primary uppercase">
          ENTERPRISE ADMINISTRATION
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold text-on-surface font-['Space_Grotesk'] mt-1">
          Corporate Accounts & Fleet Governance
        </h1>
        <p className="text-xs sm:text-sm text-on-surface-variant mt-1">
          Platform-wide administration for business accounts, credit line allocations, and
          verification status controls.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-error-container/50 border border-error/50 text-on-error-container text-xs">
          {error}
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-on-surface-variant text-sm font-mono animate-pulse">
          Loading corporate accounts...
        </div>
      ) : (
        <div className="bg-surface-container-lowest border border-surface-container-high rounded-2xl overflow-hidden shadow-xl">
          {organizations.length === 0 ? (
            <div className="p-12">
              <EmptyState
                icon="domain"
                message="No corporate business accounts registered on platform yet."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-surface-container-high bg-surface-container-lowest/60 text-[11px] font-mono text-on-surface-variant uppercase tracking-wider">
                    <th className="p-3.5">Organization</th>
                    <th className="p-3.5">GSTIN / Tax ID</th>
                    <th className="p-3.5">Members & Bookings</th>
                    <th className="p-3.5">Credit Line</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-high text-xs font-mono">
                  {organizations.map((org) => (
                    <tr key={org.id} className="hover:bg-surface-container transition-colors">
                      <td className="p-3.5">
                        <div className="font-bold text-on-surface">{org.name}</div>
                        <div className="text-[10px] text-outline">{org.billingEmail}</div>
                      </td>
                      <td className="p-3.5 font-bold text-on-surface">
                        {org.gstin || 'NOT_PROVIDED'}
                      </td>
                      <td className="p-3.5 text-on-surface-variant">
                        {org._count.members} Members / {org._count.bookings} Bookings
                      </td>
                      <td className="p-3.5 font-bold text-primary">
                        ₹{Number(org.creditLimit).toLocaleString()}
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${
                            org.status === 'ACTIVE'
                              ? 'bg-on-primary-container text-primary border-primary-container'
                              : 'bg-error-container/60 text-on-error-container border-error/40'
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
                            className="px-2.5 py-1 bg-error-container/40 hover:bg-error-container/60 border border-error/30 text-on-error-container rounded text-[10px] font-bold"
                          >
                            Suspend Account
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={actionId === org.id}
                            onClick={() => void handleUpdateStatus(org.id, 'ACTIVE')}
                            className="px-2.5 py-1 bg-primary-container hover:bg-primary-container text-on-primary-container rounded text-[10px] font-bold"
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
  );
}
