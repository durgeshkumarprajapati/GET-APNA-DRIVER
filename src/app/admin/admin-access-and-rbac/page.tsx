'use client';

import { AdminLayout } from '@/components/admin-layout';

export default function AdminAccessAndRBACPage() {
  const roles = [
    {
      user: 'Vikramaditya S.',
      email: 'vikram.admin@getapnadriver.com',
      role: 'Super Admin - Level 4',
      clearance: 'FULL SYSTEM WRITE + DISBURSAL SIGN-OFF',
      status: 'ACTIVE',
    },
    {
      user: 'Rajiv Saxena',
      email: 'rajiv.cfo@getapnadriver.com',
      role: 'Chief Financial Officer',
      clearance: 'TREASURY ESCROW + COMMISSION MATRIX',
      status: 'ACTIVE',
    },
    {
      user: 'Neha Sharma',
      email: 'neha.noc@getapnadriver.com',
      role: 'NOC Lead Controller',
      clearance: 'DISPATCH OVERRIDE + EMERGENCY SOS 112',
      status: 'ACTIVE',
    },
  ];

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6 w-full">
        <div className="flex items-center justify-between bg-[#0a0e16] p-4 rounded-xl border border-[#262a33]">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-[#68dba9]">
              <span className="material-symbols-outlined text-[16px]">admin_panel_settings</span>
              <span>ROLE-BASED ACCESS CONTROL &amp; AUDIT TRAIL</span>
            </div>
            <h1 className="text-xl font-bold text-[#dfe2ee] font-['Space_Grotesk'] mt-1">
              Admin Access Governance &amp; RBAC Matrix
            </h1>
          </div>
        </div>

        <div className="bg-[#0a0e16] rounded-xl border border-[#262a33] p-5 shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left font-sans text-xs border-collapse">
              <thead>
                <tr className="bg-[#181c24] text-[#87948b] font-['Space_Grotesk'] uppercase border-b border-[#262a33]">
                  <th className="py-3 px-4">Operator Name</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Assigned Role</th>
                  <th className="py-3 px-4">Security Clearance</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262a33] font-mono">
                {roles.map((r, i) => (
                  <tr key={i} className="hover:bg-[#181c24]/80">
                    <td className="py-3 px-4 font-bold text-[#dfe2ee]">{r.user}</td>
                    <td className="py-3 px-4 text-[#87948b]">{r.email}</td>
                    <td className="py-3 px-4 text-[#68dba9] font-bold">{r.role}</td>
                    <td className="py-3 px-4 text-[#bccac0]">{r.clearance}</td>
                    <td className="py-3 px-4 text-right">
                      <span className="px-2 py-0.5 rounded bg-[#25a475]/20 text-[#68dba9] text-[10px] font-bold border border-[#25a475]">
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
