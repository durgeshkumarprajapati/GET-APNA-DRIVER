'use client';

import { useState } from 'react';
import { CustomerLayout } from '@/components/customer-layout';

export default function CustomerSettingsPage() {
  const [name, setName] = useState('Vikramaditya Singh');
  const [email, setEmail] = useState('vikramaditya@enterprise-holdings.in');
  const [phone, setPhone] = useState('+91 98100 99882');
  const [gstin, setGstin] = useState('07AABCG1204K1ZV');
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    alert('Customer Profile & Enterprise Settings updated!');
  };

  return (
    <CustomerLayout>
      <div className="flex flex-col w-full gap-6">
        <div className="flex items-center justify-between p-6 rounded-xl bg-[#181c24] border border-[#262a33]">
          <div>
            <span className="text-[10px] font-bold text-[#68dba9] uppercase tracking-wider font-['Space_Grotesk'] block">
              ACCOUNT &amp; IDENTITY MANAGEMENT
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#dfe2ee] font-['Space_Grotesk']">
              Profile &amp; Settings
            </h1>
            <p className="text-xs text-[#bccac0] mt-1">
              Manage your executive client profile, Aadhaar KYC verification status, and corporate
              GST billing credentials.
            </p>
          </div>
        </div>

        <div className="p-6 rounded-xl bg-[#181c24] border border-[#262a33] shadow-sm max-w-2xl flex flex-col gap-5">
          {saved && (
            <div className="p-3 rounded-lg bg-[#25a475]/20 border border-[#68dba9] text-[#68dba9] font-mono text-xs">
              Settings saved successfully!
            </div>
          )}

          <form onSubmit={handleSave} className="flex flex-col gap-4 text-xs">
            <div>
              <label className="text-[10px] font-bold uppercase text-[#87948b] block font-['Space_Grotesk']">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full mt-1 bg-[#0a0e16] border border-[#262a33] rounded-lg px-3 py-2 text-[#dfe2ee] focus:outline-none focus:ring-1 focus:ring-[#68dba9]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold uppercase text-[#87948b] block font-['Space_Grotesk']">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full mt-1 bg-[#0a0e16] border border-[#262a33] rounded-lg px-3 py-2 text-[#dfe2ee] focus:outline-none focus:ring-1 focus:ring-[#68dba9]"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-[#87948b] block font-['Space_Grotesk']">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full mt-1 bg-[#0a0e16] border border-[#262a33] rounded-lg px-3 py-2 text-[#dfe2ee] focus:outline-none focus:ring-1 focus:ring-[#68dba9]"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-[#87948b] block font-['Space_Grotesk']">
                Registered GSTIN (For 18% B2B Tax Credit)
              </label>
              <input
                type="text"
                value={gstin}
                onChange={(e) => setGstin(e.target.value)}
                className="w-full mt-1 bg-[#0a0e16] border border-[#262a33] rounded-lg px-3 py-2 text-[#dfe2ee] font-mono focus:outline-none focus:ring-1 focus:ring-[#68dba9]"
              />
            </div>

            <div className="p-3 rounded-lg bg-[#0a0e16] border border-[#262a33] flex items-center justify-between font-mono text-xs">
              <span className="text-[#bccac0]">Aadhaar e-KYC Verification:</span>
              <span className="text-[#68dba9] font-bold flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">verified</span> VERIFIED
              </span>
            </div>

            <button
              type="submit"
              className="py-3 rounded-lg bg-[#68dba9] hover:bg-[#85f8c4] text-[#003825] font-bold font-['Space_Grotesk'] text-xs shadow transition-all mt-2"
            >
              Save Profile Settings
            </button>
          </form>
        </div>
      </div>
    </CustomerLayout>
  );
}
