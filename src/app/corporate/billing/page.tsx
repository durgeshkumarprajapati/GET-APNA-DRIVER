'use client';

import { useEffect, useState } from 'react';
import { CorporateLayout } from '@/components/corporate-layout';

export default function CorporateBillingPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [legalName, setLegalName] = useState('Acme Mobility Private Limited');
  const [billingAddress, setBillingAddress] = useState(
    'Plot 42, Bandra Kurla Complex, Mumbai, Maharashtra 400051',
  );
  const [gstin, setGstin] = useState('27AAACA12341Z5');
  const [billingEmail, setBillingEmail] = useState('finance@acme.com');

  useEffect(() => {
    async function loadOrg() {
      try {
        const res = await fetch('/api/corporate/organization');
        if (res.ok) {
          const data = await res.json();
          if (data.membership?.organization) {
            const org = data.membership.organization;
            setLegalName(org.legalName || org.name);
            setGstin(org.gstin || '27AAACA12341Z5');
            setBillingEmail(org.billingEmail || 'finance@company.com');
          }
        }
      } catch (err) {
        console.error('Error loading billing profile:', err);
      } finally {
        setLoading(false);
      }
    }
    void loadOrg();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch('/api/corporate/organization', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          legalName,
          gstin,
          billingEmail,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to update billing profile');
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error updating billing profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <CorporateLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <span className="text-[10px] font-mono font-bold tracking-widest text-[#68dba9] uppercase">
            FINANCE & TAX
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#dfe2ee] font-['Space_Grotesk'] mt-1">
            Billing Profile & GSTIN
          </h1>
          <p className="text-xs sm:text-sm text-[#bccac0] mt-1">
            Configure GST registration details, monthly consolidated invoicing address, and finance
            contact email.
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-950/50 border border-red-500/50 text-red-300 text-xs">
            {error}
          </div>
        )}

        {success && (
          <div className="p-4 rounded-xl bg-emerald-950/50 border border-emerald-500/50 text-emerald-300 text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-base">check_circle</span>
            <span>
              Billing profile updated cleanly! Tax invoices will reflect these legal GST details.
            </span>
          </div>
        )}

        {loading ? (
          <div className="p-12 text-center text-[#bccac0] text-sm font-mono animate-pulse">
            Loading billing details...
          </div>
        ) : (
          <div className="space-y-6">
            {/* CREDIT LINE CARD */}
            <div className="bg-[#141822] border border-[#262a33] rounded-2xl p-6 shadow-xl grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-[#bccac0] uppercase">
                  Approved Corporate Line
                </span>
                <div className="text-2xl font-bold text-[#68dba9] font-['Space_Grotesk']">
                  ₹50,000
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-[#bccac0] uppercase">
                  Current Billed Balance
                </span>
                <div className="text-2xl font-bold text-[#dfe2ee] font-['Space_Grotesk']">₹0</div>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-[#bccac0] uppercase">
                  Payment Terms
                </span>
                <div className="text-2xl font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                  Net 30 Days
                </div>
              </div>
            </div>

            <form
              onSubmit={handleSave}
              className="bg-[#141822] border border-[#262a33] rounded-2xl p-6 shadow-xl space-y-5"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-mono text-[#bccac0] uppercase font-bold">
                    Legal Entity Name
                  </label>
                  <input
                    type="text"
                    value={legalName}
                    onChange={(e) => setLegalName(e.target.value)}
                    className="w-full bg-[#0a0e16] border border-[#262a33] rounded-xl px-3.5 py-2.5 text-xs text-[#dfe2ee] focus:outline-none focus:ring-2 focus:ring-[#68dba9]"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-mono text-[#bccac0] uppercase font-bold">
                    GSTIN Number
                  </label>
                  <input
                    type="text"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value)}
                    className="w-full bg-[#0a0e16] border border-[#262a33] rounded-xl px-3.5 py-2.5 text-xs text-[#dfe2ee] focus:outline-none focus:ring-2 focus:ring-[#68dba9]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono text-[#bccac0] uppercase font-bold">
                  Billing Email (Invoices Sent Here)
                </label>
                <input
                  type="email"
                  value={billingEmail}
                  onChange={(e) => setBillingEmail(e.target.value)}
                  className="w-full bg-[#0a0e16] border border-[#262a33] rounded-xl px-3.5 py-2.5 text-xs text-[#dfe2ee] focus:outline-none focus:ring-2 focus:ring-[#68dba9]"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono text-[#bccac0] uppercase font-bold">
                  Registered Billing Address
                </label>
                <textarea
                  value={billingAddress}
                  onChange={(e) => setBillingAddress(e.target.value)}
                  rows={3}
                  className="w-full bg-[#0a0e16] border border-[#262a33] rounded-xl px-3.5 py-2.5 text-xs text-[#dfe2ee] focus:outline-none focus:ring-2 focus:ring-[#68dba9]"
                  required
                />
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-gradient-to-r from-[#25a475] to-[#68dba9] text-[#00311f] font-bold rounded-xl text-xs flex items-center gap-2 hover:brightness-110 shadow-lg shadow-[#25a475]/20 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-base">save</span>
                  <span>{saving ? 'Saving...' : 'Update Billing Profile'}</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </CorporateLayout>
  );
}
