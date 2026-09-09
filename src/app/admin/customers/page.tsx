'use client';

import { AdminLayout } from '@/components/admin-layout';

export default function AdminCustomersPage() {
  const customers = [
    {
      name: 'Vikramaditya Rao',
      email: 'vikram.rao@enterprise.com',
      tier: 'Aero-Priority Titanium',
      trips: 142,
      spend: '₹482,000',
      status: 'ACTIVE',
    },
    {
      name: 'Shreya Mukherjee',
      email: 'shreya.m@corp.org',
      tier: 'Corporate Executive Pass',
      trips: 88,
      spend: '₹294,000',
      status: 'ACTIVE',
    },
    {
      name: 'Anandita Khurana',
      email: 'anandita@khurana.co',
      tier: 'Private Chauffeur Daily',
      trips: 64,
      spend: '₹186,000',
      status: 'ACTIVE',
    },
  ];

  return (
    <AdminLayout activePath="customers">
      <div className="flex flex-col gap-6 w-full">
        <div className="flex items-center justify-between bg-[#0a0e16] p-4 rounded-xl border border-[#262a33]">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-[#68dba9]">
              <span className="material-symbols-outlined text-[16px]">groups</span>
              <span>VIP &amp; CORPORATE PASSENGER REGISTRY</span>
            </div>
            <h1 className="text-xl font-bold text-[#dfe2ee] font-['Space_Grotesk'] mt-1">
              Customer Accounts &amp; Profiles
            </h1>
          </div>
        </div>

        <div className="bg-[#0a0e16] rounded-xl border border-[#262a33] p-5 shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left font-sans text-xs border-collapse">
              <thead>
                <tr className="bg-[#181c24] text-[#87948b] font-['Space_Grotesk'] uppercase border-b border-[#262a33]">
                  <th className="py-3 px-4">Customer Name</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Membership Tier</th>
                  <th className="py-3 px-4">Completed Trips</th>
                  <th className="py-3 px-4">Total Spend</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262a33] font-mono">
                {customers.map((c, i) => (
                  <tr key={i} className="hover:bg-[#181c24]/80">
                    <td className="py-3 px-4 font-bold text-[#dfe2ee]">{c.name}</td>
                    <td className="py-3 px-4 text-[#bccac0]">{c.email}</td>
                    <td className="py-3 px-4 text-[#b4c5ff]">{c.tier}</td>
                    <td className="py-3 px-4 text-[#dfe2ee]">{c.trips}</td>
                    <td className="py-3 px-4 font-bold text-[#68dba9]">{c.spend}</td>
                    <td className="py-3 px-4 text-right">
                      <span className="px-2 py-0.5 rounded bg-[#25a475]/20 text-[#68dba9] text-[10px] font-bold border border-[#25a475]">
                        {c.status}
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
