'use client';

import { useState } from 'react';
import { DriverLayout } from '@/components/driver-layout';

export default function DriverSettingsPage() {
  const [name, setName] = useState('Vikram Singh');
  const [phone, setPhone] = useState('+91 98110 44290');
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    alert('Console settings saved successfully!');
  };

  return (
    <DriverLayout activePath="settings">
      <div className="flex flex-col w-full px-6 py-6 gap-6">
        <div className="flex items-center justify-between p-6 rounded-xl bg-[#181c24] border border-[#262a33]">
          <div>
            <span className="text-[10px] font-bold text-[#68dba9] uppercase tracking-wider font-['Space_Grotesk'] block">
              COCKPIT HARDWARE &amp; ACCOUNT CONFIGURATION
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#dfe2ee] font-['Space_Grotesk']">
              Console Settings
            </h1>
            <p className="text-xs text-[#bccac0] mt-1">
              Configure dispatch radar radius, audio navigation prompts, and IMPS bank details.
            </p>
          </div>
        </div>

        <div className="p-6 rounded-xl bg-[#181c24] border border-[#262a33] max-w-xl flex flex-col gap-4">
          {saved && (
            <div className="p-3 rounded-lg bg-[#25a475]/20 border border-[#68dba9] text-[#68dba9] font-mono text-xs">
              Settings updated successfully!
            </div>
          )}

          <form onSubmit={handleSave} className="flex flex-col gap-4 text-xs">
            <div>
              <label className="text-[10px] font-bold uppercase text-[#87948b] block font-['Space_Grotesk']">
                Chauffeur Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full mt-1 bg-[#0a0e16] border border-[#262a33] rounded-lg px-3 py-2 text-[#dfe2ee] focus:outline-none focus:ring-1 focus:ring-[#68dba9]"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-[#87948b] block font-['Space_Grotesk']">
                Registered Mobile Number
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full mt-1 bg-[#0a0e16] border border-[#262a33] rounded-lg px-3 py-2 text-[#dfe2ee] focus:outline-none focus:ring-1 focus:ring-[#68dba9]"
              />
            </div>

            <button
              type="submit"
              className="py-3 rounded-lg bg-[#68dba9] hover:bg-[#85f8c4] text-[#003825] font-bold font-['Space_Grotesk'] text-xs shadow transition-all mt-2"
            >
              Save Console Settings
            </button>
          </form>
        </div>
      </div>
    </DriverLayout>
  );
}
