'use client';

import { useEffect, useState } from 'react';
import { CorporateLayout } from '@/components/corporate-layout';

interface Member {
  id: string;
  role: string;
  status: string;
  employeeCode: string | null;
  designation: string | null;
  joinedAt: string | null;
  user: {
    id: string;
    customerProfile?: { fullName?: string | null } | null;
  };
  department?: { name: string; code: string } | null;
  costCenter?: { name: string; code: string } | null;
}

export default function CorporateMembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Invite Modal State
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('MEMBER');
  const [inviting, setInviting] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    async function loadData() {
      try {
        const res = await fetch('/api/corporate/members');
        if (!res.ok) {
          throw new Error('Failed to load employee roster');
        }
        const data = await res.json();
        if (!ignore) {
          setMembers(data.members || []);
        }
      } catch (err: unknown) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Error loading members');
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

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);
    setError(null);
    setGeneratedLink(null);

    try {
      const res = await fetch('/api/corporate/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send invitation');
      }

      setGeneratedLink(`${window.location.origin}${data.inviteUrl}`);
      setInviteEmail('');
      const updatedRes = await fetch('/api/corporate/members');
      if (updatedRes.ok) {
        const updatedData = await updatedRes.json();
        setMembers(updatedData.members || []);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error creating invitation');
    } finally {
      setInviting(false);
    }
  };

  return (
    <CorporateLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-mono font-bold tracking-widest text-[#68dba9] uppercase">
              EMPLOYEE DIRECTORY
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#dfe2ee] font-['Space_Grotesk'] mt-1">
              Employees & Roster
            </h1>
            <p className="text-xs sm:text-sm text-[#bccac0] mt-1">
              Manage corporate membership, role-based access, department assignments, and pending invitations.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setInviteModalOpen(true);
              setGeneratedLink(null);
            }}
            className="px-4 py-2.5 bg-[#25a475] hover:bg-[#208e65] text-[#00311f] font-bold rounded-xl text-xs flex items-center gap-2 transition-colors shadow-lg shadow-[#25a475]/20"
          >
            <span className="material-symbols-outlined text-base">person_add</span>
            <span>Invite Employee</span>
          </button>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-950/50 border border-red-500/50 text-red-300 text-xs">
            {error}
          </div>
        )}

        {loading ? (
          <div className="p-12 text-center text-[#bccac0] text-sm font-mono animate-pulse">
            Loading employee roster...
          </div>
        ) : (
          <div className="bg-[#141822] border border-[#262a33] rounded-2xl overflow-hidden shadow-xl">
            {members.length === 0 ? (
              <div className="p-12 text-center text-[#bccac0] text-xs font-mono">
                No active employee members found. Click &quot;Invite Employee&quot; to invite team members.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#262a33] bg-[#0a0e16]/60 text-[11px] font-mono text-[#bccac0] uppercase tracking-wider">
                      <th className="p-3.5">Employee Name</th>
                      <th className="p-3.5">Role</th>
                      <th className="p-3.5">Department</th>
                      <th className="p-3.5">Cost Center</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5">Joined Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#262a33] text-xs font-mono">
                    {members.map((m) => (
                      <tr key={m.id} className="hover:bg-[#1c2028] transition-colors">
                        <td className="p-3.5">
                          <div className="font-bold text-[#dfe2ee]">{m.user.customerProfile?.fullName || 'Employee Member'}</div>
                        </td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded bg-[#1e2330] border border-[#262a33] text-[10px] font-bold text-[#68dba9]">
                            {m.role}
                          </span>
                        </td>
                        <td className="p-3.5 text-[#dfe2ee]">
                          {m.department?.name || 'Unassigned'}
                        </td>
                        <td className="p-3.5 text-[#bccac0]">
                          {m.costCenter?.code || 'Default'}
                        </td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded bg-[#00311f] text-[#68dba9] border border-[#25a475] text-[10px] uppercase font-bold">
                            {m.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-[#87948b]">
                          {m.joinedAt ? new Date(m.joinedAt).toLocaleDateString() : 'Pending'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* INVITE MODAL */}
        {inviteModalOpen && (
          <div className="fixed inset-0 bg-[#0a0e16]/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-[#1c2028] border border-[#3d4a42] rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-[#262a33] pb-3">
                <h3 className="text-lg font-bold text-[#dfe2ee] font-['Space_Grotesk'] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#68dba9]">person_add</span>
                  Invite Corporate Employee
                </h3>
                <button
                  type="button"
                  onClick={() => setInviteModalOpen(false)}
                  className="text-[#bccac0] hover:text-[#dfe2ee]"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              {generatedLink ? (
                <div className="space-y-4 text-xs font-mono">
                  <div className="p-3 bg-[#00311f] border border-[#25a475] rounded-xl text-emerald-300">
                    Invitation created successfully! Share the secure link below with the employee:
                  </div>
                  <div className="p-3 bg-[#0a0e16] border border-[#262a33] rounded-xl text-[#68dba9] select-all break-all">
                    {generatedLink}
                  </div>
                  <button
                    type="button"
                    onClick={() => setInviteModalOpen(false)}
                    className="w-full py-2.5 bg-[#25a475] text-[#00311f] font-bold rounded-xl"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSendInvite} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-mono text-[#bccac0] uppercase font-bold">Employee Email</label>
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="employee@company.com"
                      className="w-full bg-[#0a0e16] border border-[#262a33] rounded-xl px-3.5 py-2.5 text-xs text-[#dfe2ee] focus:outline-none focus:ring-2 focus:ring-[#68dba9]"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-mono text-[#bccac0] uppercase font-bold">Organization Role</label>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value)}
                      className="w-full bg-[#0a0e16] border border-[#262a33] rounded-xl px-3 py-2.5 text-xs text-[#dfe2ee] focus:outline-none focus:ring-2 focus:ring-[#68dba9]"
                    >
                      <option value="MEMBER">MEMBER (Standard Travel Profile)</option>
                      <option value="TRAVEL_MANAGER">TRAVEL_MANAGER (Roster & Policy Admin)</option>
                      <option value="APPROVER">APPROVER (Ride Approval Officer)</option>
                      <option value="FINANCE">FINANCE (Billing & GST Statements)</option>
                      <option value="ADMIN">ADMIN (Full Corporate Admin)</option>
                    </select>
                  </div>

                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setInviteModalOpen(false)}
                      className="px-4 py-2 rounded-xl text-xs font-mono text-[#bccac0]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={inviting}
                      className="px-4 py-2 bg-[#25a475] text-[#00311f] font-bold rounded-xl text-xs flex items-center gap-1"
                    >
                      {inviting ? 'Generating...' : 'Generate Invitation'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </CorporateLayout>
  );
}
