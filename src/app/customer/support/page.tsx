'use client';

import { useState } from 'react';
import { CustomerLayout } from '@/components/customer-layout';

export default function CustomerSupportPage() {
  const [ticketCreated, setTicketCreated] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (subject && message) {
      setTicketCreated(true);
      alert('Support ticket created successfully! Incident Desk SLA: < 15 mins.');
    }
  };

  return (
    <CustomerLayout activePath="customer-support">
      <div className="flex flex-col w-full gap-6">
        <div className="flex items-center justify-between p-6 rounded-xl bg-[#181c24] border border-[#262a33]">
          <div>
            <span className="text-[10px] font-bold text-[#68dba9] uppercase tracking-wider font-['Space_Grotesk'] block">
              24x7 INCIDENT &amp; CUSTOMER HELP DESK
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#dfe2ee] font-['Space_Grotesk']">
              Priority Support &amp; Concierge
            </h1>
            <p className="text-xs text-[#bccac0] mt-1">
              Direct escalation channel for trip disputes, lost items, fare inquiries, and VIP
              concierge assistance.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 p-6 rounded-xl bg-[#181c24] border border-[#262a33] shadow-sm flex flex-col gap-4">
            <h3 className="text-base font-bold text-[#dfe2ee] font-['Space_Grotesk']">
              Submit Priority Incident Ticket
            </h3>

            {ticketCreated ? (
              <div className="p-4 rounded-lg bg-[#25a475]/20 border border-[#68dba9] text-[#68dba9] font-mono text-xs">
                Ticket #SUP-9081 created successfully! Priority dispatch officer assigned. Response
                ETA: 8 minutes.
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-3 text-xs">
                <div>
                  <label className="text-[10px] font-bold uppercase text-[#87948b] block font-['Space_Grotesk']">
                    Subject / Category
                  </label>
                  <input
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Fare recalculation for Booking #BK-9482"
                    className="w-full mt-1 bg-[#0a0e16] border border-[#262a33] rounded-lg px-3 py-2 text-[#dfe2ee] focus:outline-none focus:ring-1 focus:ring-[#68dba9]"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-[#87948b] block font-['Space_Grotesk']">
                    Incident Details / Note
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Describe your issue or feedback in detail..."
                    className="w-full mt-1 bg-[#0a0e16] border border-[#262a33] rounded-lg px-3 py-2 text-[#dfe2ee] focus:outline-none focus:ring-1 focus:ring-[#68dba9]"
                  />
                </div>

                <button
                  type="submit"
                  className="py-3 rounded-lg bg-[#68dba9] hover:bg-[#85f8c4] text-[#003825] font-bold font-['Space_Grotesk'] text-xs shadow transition-all mt-2"
                >
                  Submit Priority Ticket
                </button>
              </form>
            )}
          </div>

          <div className="lg:col-span-5 p-6 rounded-xl bg-[#181c24] border border-[#262a33] shadow-sm flex flex-col gap-4">
            <h3 className="text-base font-bold text-[#dfe2ee] font-['Space_Grotesk']">
              Direct Hotline Channels
            </h3>

            <div className="space-y-3 font-mono text-xs text-[#bccac0]">
              <div className="p-3 rounded-lg bg-[#0a0e16] border border-[#262a33] flex items-center justify-between">
                <div>
                  <strong className="text-[#dfe2ee] block">24x7 SOS Desk</strong>
                  <span className="text-[10px] text-[#ffb4ab]">+91 11 4099 2200</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-[#93000a] text-[#ffdad6] text-[9px] font-bold">
                  EMERGENCY
                </span>
              </div>

              <div className="p-3 rounded-lg bg-[#0a0e16] border border-[#262a33] flex items-center justify-between">
                <div>
                  <strong className="text-[#dfe2ee] block">Corporate Claims Email</strong>
                  <span className="text-[10px] text-[#68dba9]">claims@apnadriver.com</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-[#262a33] text-[#bccac0] text-[9px]">
                  24 HOUR SLA
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
}
