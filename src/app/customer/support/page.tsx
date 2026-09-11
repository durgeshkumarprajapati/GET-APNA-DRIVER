'use client';

import { useState, useEffect } from 'react';
import { CustomerLayout } from '@/components/customer-layout';
import { SupportTicketCategory, SupportTicketStatus } from '@prisma/client';
import { DirectCallResponse } from '@/modules/calling/domain/types';

interface SupportMessage {
  id: string;
  authorUserId: string;
  authorRole: 'CUSTOMER' | 'SUPPORT_AGENT' | 'SYSTEM';
  body: string;
  createdAt: string;
}

interface BookingSnapshot {
  id: string;
  status: string;
  bookingType: string;
  pickupAddress: string;
  dropoffAddress: string;
  createdAt: string;
}

interface SupportTicket {
  id: string;
  ticketNumber: string;
  category: SupportTicketCategory;
  status: SupportTicketStatus;
  priority: string;
  subject: string;
  description: string;
  bookingId: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  messages?: SupportMessage[];
  booking?: BookingSnapshot | null;
}

interface EligibleBooking {
  id: string;
  bookingType: string;
  status: string;
  pickupAddress: string;
  dropoffAddress: string;
  createdAt: string;
}

export default function CustomerSupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active selected ticket for detail view
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // New Ticket Modal Form state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newCategory, setNewCategory] = useState<SupportTicketCategory>(SupportTicketCategory.BOOKING_ISSUE);
  const [newSubject, setNewSubject] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newBookingId, setNewBookingId] = useState<string>('');
  const [eligibleBookings, setEligibleBookings] = useState<EligibleBooking[]>([]);
  const [creating, setCreating] = useState(false);

  // Reply form state
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);
  const [closing, setClosing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Call Customer Care state
  const [callingSupport, setCallingSupport] = useState(false);
  const [callData, setCallData] = useState<DirectCallResponse | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleCallSupport = async () => {
    try {
      setCallingSupport(true);
      const res = await fetch('/api/customer/support/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supportTicketId: selectedTicket?.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to initiate support call');
      }
      setCallData(data.data);
      showToast('Call initiated! Connecting to Customer Care.');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error initiating support call');
    } finally {
      setCallingSupport(false);
    }
  };

  const fetchTickets = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/customer/support/tickets');
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to load support tickets');
      }
      setTickets(data.data.tickets || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error fetching support tickets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const [tRes, bRes] = await Promise.all([
          fetch('/api/customer/support/tickets'),
          fetch('/api/bookings?pageSize=20'),
        ]);

        if (isMounted) {
          if (tRes.ok) {
            const tData = await tRes.json();
            setTickets(tData.data?.tickets || []);
          } else {
            const tData = await tRes.json();
            setError(tData.message || 'Failed to load support tickets');
          }

          if (bRes.ok) {
            const bData = await bRes.json();
            setEligibleBookings(bData.data?.bookings || bData.bookings || []);
          }
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Error fetching support data');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, []);

  const loadTicketDetail = async (ticketId: string) => {
    try {
      setDetailLoading(true);
      const res = await fetch(`/api/customer/support/tickets/${ticketId}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to load ticket detail');
      }
      setSelectedTicket(data.data);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Could not fetch ticket detail');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim() || !newDescription.trim()) {
      showToast('Please fill in both subject and description.');
      return;
    }

    try {
      setCreating(true);
      const res = await fetch('/api/customer/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: newCategory,
          subject: newSubject.trim(),
          description: newDescription.trim(),
          bookingId: newBookingId ? newBookingId : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to submit support ticket');
      }

      showToast(`Support request ${data.data.ticketNumber} created successfully.`);
      setIsCreateOpen(false);
      setNewSubject('');
      setNewDescription('');
      setNewBookingId('');
      fetchTickets();
      setSelectedTicket(data.data);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error creating ticket');
    } finally {
      setCreating(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyText.trim()) return;

    try {
      setReplying(true);
      const res = await fetch(`/api/customer/support/tickets/${selectedTicket.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: replyText.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to send reply');
      }

      showToast('Reply submitted.');
      setReplyText('');
      loadTicketDetail(selectedTicket.id);
      fetchTickets();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error sending reply');
    } finally {
      setReplying(false);
    }
  };

  const handleCloseTicket = async () => {
    if (!selectedTicket) return;

    try {
      setClosing(true);
      const res = await fetch(`/api/customer/support/tickets/${selectedTicket.id}/close`, {
        method: 'POST',
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to close ticket');
      }

      showToast(`Ticket ${selectedTicket.ticketNumber} closed.`);
      loadTicketDetail(selectedTicket.id);
      fetchTickets();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error closing ticket');
    } finally {
      setClosing(false);
    }
  };

  const getStatusBadgeClass = (status: SupportTicketStatus) => {
    switch (status) {
      case 'OPEN':
        return 'bg-[#0053db]/20 text-[#70a1ff] border-[#0053db]/40';
      case 'IN_PROGRESS':
        return 'bg-[#f39c12]/20 text-[#f1c40f] border-[#f39c12]/40';
      case 'WAITING_FOR_CUSTOMER':
        return 'bg-[#9b59b6]/20 text-[#e056fd] border-[#9b59b6]/40';
      case 'RESOLVED':
        return 'bg-[#25a475]/20 text-[#68dba9] border-[#25a475]/40';
      case 'CLOSED':
        return 'bg-[#262a33] text-[#87948b] border-[#31353e]';
      case 'REOPENED':
        return 'bg-[#e74c3c]/20 text-[#ff7675] border-[#e74c3c]/40';
      default:
        return 'bg-[#262a33] text-[#dfe2ee] border-[#31353e]';
    }
  };

  const categoryLabels: Record<SupportTicketCategory, string> = {
    BOOKING_ISSUE: 'Booking Issue',
    DRIVER_CONDUCT: 'Driver Conduct',
    PAYMENT_FARE: 'Payment & Fare',
    REFUND_REQUEST: 'Refund Request',
    PROMOTION_CODE: 'Promotion Code',
    ACCOUNT_PROFILE: 'Account & Profile',
    APP_TECHNICAL: 'Technical App Problem',
    SAFETY_CONCERN: 'Safety Concern',
    OTHER: 'General Support',
  };

  return (
    <CustomerLayout>
      <div className="flex flex-col w-full gap-6 max-w-[1440px] mx-auto p-4 md:p-6">
        {/* Toast Alert */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 bg-[#25a475] text-[#00311f] font-bold px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 border border-[#68dba9]">
            <span className="material-symbols-outlined text-xl">check_circle</span>
            <span className="text-sm font-['Space_Grotesk']">{toastMessage}</span>
          </div>
        )}

        {/* Page Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#262a33] pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-[#87948b] mb-1 font-mono">
              <span>CUSTOMER PORTAL</span>
              <span>/</span>
              <span className="text-[#68dba9]">SUPPORT & ARBITRATION</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-[#dfe2ee] font-['Space_Grotesk']">
              Customer Support Center
            </h1>
            <p className="text-xs md:text-sm text-[#bccac0] mt-1">
              Track issues, contact operations concierge, and view resolution logs for your rides.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={callingSupport}
              onClick={handleCallSupport}
              className="px-4 py-2.5 rounded-xl bg-[#0053db] hover:bg-[#2b75ff] disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-md font-['Space_Grotesk']"
            >
              <span className="material-symbols-outlined text-lg">call</span>
              <span>{callingSupport ? 'Connecting…' : 'Call Customer Care'}</span>
            </button>
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-[#68dba9] hover:bg-[#85f8c4] text-[#003825] font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-md font-['Space_Grotesk']"
            >
              <span className="material-symbols-outlined text-lg">add_comment</span>
              <span>Create New Request</span>
            </button>
          </div>
        </div>

        {/* Active Call Banner */}
        {callData && (
          <div className="p-4 rounded-xl bg-[#0053db]/20 border border-[#70a1ff]/40 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[#70a1ff] text-2xl animate-pulse">
                phone_in_talk
              </span>
              <div>
                <span className="text-sm font-bold text-[#dfe2ee] block font-['Space_Grotesk']">
                  Customer Care Call Connected (Session ID: {callData.callSessionId.substring(0, 8)})
                </span>
                <span className="text-xs text-[#70a1ff]">
                  Dial Helpline: <strong className="text-white font-mono">{callData.dialNumber}</strong> • {callData.instructions}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setCallData(null)}
              className="text-xs text-[#87948b] hover:text-[#dfe2ee]"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Safety SOS Escalation Banner */}
        <div className="p-4 rounded-xl bg-[#93000a]/20 border border-[#ffb4ab]/30 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[#ffb4ab] text-2xl animate-pulse">
              e911_emergency
            </span>
            <div>
              <span className="text-sm font-bold text-[#ffdad6] block font-['Space_Grotesk']">
                Immediate Physical Emergency or Safety Danger?
              </span>
              <span className="text-xs text-[#ffb4ab]/80">
                Do not use general support ticketing. Trigger the live SOS emergency button for immediate response.
              </span>
            </div>
          </div>
          <a
            href="/customer/sos"
            className="px-3.5 py-2 rounded-lg bg-[#93000a] hover:bg-[#ba1a1a] text-[#ffdad6] font-bold text-xs font-['Space_Grotesk'] flex items-center gap-1.5 transition-colors"
          >
            <span className="material-symbols-outlined text-base">warning</span>
            <span>Go to Emergency SOS</span>
          </a>
        </div>

        {/* Main Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Tickets List (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#87948b] font-['Space_Grotesk']">
                My Support Requests ({tickets.length})
              </h2>
              <button
                type="button"
                onClick={fetchTickets}
                className="text-xs text-[#68dba9] hover:underline font-mono"
              >
                Refresh
              </button>
            </div>

            {loading ? (
              <div className="p-8 rounded-xl bg-[#181c24] border border-[#262a33] text-center text-[#87948b] font-mono text-xs">
                Loading support tickets...
              </div>
            ) : error ? (
              <div className="p-4 rounded-xl bg-[#93000a]/20 border border-[#ffb4ab]/30 text-xs text-[#ffdad6]">
                {error}
              </div>
            ) : tickets.length === 0 ? (
              <div className="p-8 rounded-xl bg-[#181c24] border border-[#262a33] text-center flex flex-col items-center gap-3">
                <span className="material-symbols-outlined text-4xl text-[#87948b]">
                  support_agent
                </span>
                <p className="text-sm text-[#dfe2ee] font-medium font-['Space_Grotesk']">
                  No support requests yet
                </p>
                <p className="text-xs text-[#bccac0] max-w-xs">
                  If you need help with a booking, payment, account, or ride discrepancy, open a request.
                </p>
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(true)}
                  className="mt-2 px-3 py-1.5 rounded-lg bg-[#262a33] text-[#68dba9] border border-[#3d4a42] text-xs font-bold font-['Space_Grotesk'] hover:bg-[#31353e] transition-colors"
                >
                  Create Support Request
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {tickets.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => loadTicketDetail(t.id)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col gap-2 ${
                      selectedTicket?.id === t.id
                        ? 'bg-[#1c2028] border-[#68dba9] shadow-lg'
                        : 'bg-[#181c24] border-[#262a33] hover:border-[#3d4a42]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-[#68dba9]">
                        #{t.ticketNumber}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border font-mono uppercase ${getStatusBadgeClass(
                          t.status,
                        )}`}
                      >
                        {t.status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <h3 className="text-sm font-semibold text-[#dfe2ee] font-['Space_Grotesk'] line-clamp-1">
                      {t.subject}
                    </h3>

                    <div className="flex items-center justify-between text-xs text-[#87948b] pt-2 border-t border-[#262a33]/60 font-mono">
                      <span>{categoryLabels[t.category] || t.category}</span>
                      <span>{new Date(t.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Ticket Detail Workspace (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            {!selectedTicket ? (
              <div className="p-12 rounded-xl bg-[#181c24] border border-[#262a33] text-center text-[#87948b] flex flex-col items-center justify-center min-h-[350px]">
                <span className="material-symbols-outlined text-4xl mb-2 text-[#31353e]">
                  forum
                </span>
                <p className="text-sm font-['Space_Grotesk'] text-[#bccac0]">
                  Select a support ticket from the list to view its full conversation and status history.
                </p>
              </div>
            ) : detailLoading ? (
              <div className="p-12 rounded-xl bg-[#181c24] border border-[#262a33] text-center font-mono text-xs text-[#87948b]">
                Loading conversation detail...
              </div>
            ) : (
              <div className="p-6 rounded-xl bg-[#181c24] border border-[#262a33] shadow-xl flex flex-col gap-5">
                {/* Header */}
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#262a33] pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-[#68dba9]">
                        #{selectedTicket.ticketNumber}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border font-mono uppercase ${getStatusBadgeClass(
                          selectedTicket.status,
                        )}`}
                      >
                        {selectedTicket.status.replace(/_/g, ' ')}
                      </span>
                      <span className="text-xs text-[#87948b] font-mono">
                        {categoryLabels[selectedTicket.category]}
                      </span>
                    </div>
                    <h2 className="text-xl font-bold text-[#dfe2ee] font-['Space_Grotesk'] mt-1">
                      {selectedTicket.subject}
                    </h2>
                    <span className="text-xs text-[#87948b] font-mono">
                      Created on {new Date(selectedTicket.createdAt).toLocaleString()}
                    </span>
                  </div>

                  {selectedTicket.status !== 'CLOSED' && (
                    <button
                      type="button"
                      onClick={handleCloseTicket}
                      disabled={closing}
                      className="px-3 py-1.5 rounded-lg bg-[#262a33] hover:bg-[#31353e] border border-[#3d4a42] text-[#ffb4ab] text-xs font-mono transition-colors disabled:opacity-50"
                    >
                      {closing ? 'Closing...' : 'Close Ticket'}
                    </button>
                  )}
                </div>

                {/* Booking Reference Card if associated */}
                {selectedTicket.booking && (
                  <div className="p-3 rounded-lg bg-[#1c2028] border border-[#262a33] text-xs flex flex-col gap-1">
                    <span className="font-bold text-[#68dba9] font-['Space_Grotesk'] uppercase text-[10px]">
                      Associated Booking
                    </span>
                    <div className="flex justify-between text-[#dfe2ee]">
                      <span>{selectedTicket.booking.bookingType} Ride</span>
                      <span className="font-mono">{selectedTicket.booking.status}</span>
                    </div>
                    <p className="text-[#87948b] truncate">
                      {selectedTicket.booking.pickupAddress} → {selectedTicket.booking.dropoffAddress}
                    </p>
                  </div>
                )}

                {/* Conversation Thread */}
                <div className="flex flex-col gap-3 max-h-[420px] overflow-y-auto pr-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#87948b] font-['Space_Grotesk']">
                    Conversation History
                  </span>

                  {selectedTicket.messages && selectedTicket.messages.length > 0 ? (
                    selectedTicket.messages.map((m) => {
                      const isCustomer = m.authorRole === 'CUSTOMER';
                      return (
                        <div
                          key={m.id}
                          className={`p-4 rounded-xl border max-w-[85%] flex flex-col gap-1 text-xs ${
                            isCustomer
                              ? 'bg-[#1c2028] border-[#262a33] self-end text-right'
                              : 'bg-[#262a33] border-[#3d4a42] self-start text-left'
                          }`}
                        >
                          <div className="flex items-center gap-2 text-[10px] font-mono text-[#87948b] justify-between">
                            <span className="font-bold text-[#68dba9]">
                              {isCustomer ? 'You (Customer)' : 'Customer Support Agent'}
                            </span>
                            <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <p className="text-[#dfe2ee] leading-relaxed whitespace-pre-wrap">{m.body}</p>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-4 rounded-lg bg-[#1c2028] text-xs text-[#87948b]">
                      {selectedTicket.description}
                    </div>
                  )}
                </div>

                {/* Reply Form */}
                {selectedTicket.status !== 'CLOSED' ? (
                  <form onSubmit={handleSendReply} className="flex flex-col gap-2 pt-3 border-t border-[#262a33]">
                    <textarea
                      rows={3}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Type your reply here..."
                      className="w-full bg-[#0a0e16] border border-[#262a33] text-[#dfe2ee] text-xs p-3 rounded-lg placeholder:text-[#87948b] focus:outline-none focus:ring-1 focus:ring-[#68dba9] resize-none"
                    />
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={replying || !replyText.trim()}
                        className="px-4 py-2 rounded-lg bg-[#68dba9] hover:bg-[#85f8c4] text-[#003825] font-bold text-xs uppercase tracking-wider font-['Space_Grotesk'] disabled:opacity-50 transition-colors"
                      >
                        {replying ? 'Sending...' : 'Send Reply'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="p-3 rounded-lg bg-[#1c2028] border border-[#262a33] text-center text-xs text-[#87948b]">
                    This support request has been closed. Create a new request if you still need assistance.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Create Support Request Modal */}
        {isCreateOpen && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-lg rounded-2xl bg-[#181c24] border border-[#262a33] p-6 shadow-2xl flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-[#262a33] pb-3">
                <h3 className="text-lg font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                  Create Support Request
                </h3>
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="text-[#87948b] hover:text-[#dfe2ee] font-bold text-xl"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleCreateTicket} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#87948b] font-['Space_Grotesk']">
                    Category
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as SupportTicketCategory)}
                    className="w-full bg-[#0a0e16] border border-[#262a33] text-[#dfe2ee] text-xs p-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#68dba9]"
                  >
                    {Object.entries(categoryLabels).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#87948b] font-['Space_Grotesk']">
                    Link Booking (Optional)
                  </label>
                  <select
                    value={newBookingId}
                    onChange={(e) => setNewBookingId(e.target.value)}
                    className="w-full bg-[#0a0e16] border border-[#262a33] text-[#dfe2ee] text-xs p-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#68dba9]"
                  >
                    <option value="">No specific booking</option>
                    {eligibleBookings.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.bookingType} - {b.pickupAddress?.substring(0, 20)}... ({new Date(b.createdAt).toLocaleDateString()})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#87948b] font-['Space_Grotesk']">
                    Subject
                  </label>
                  <input
                    type="text"
                    required
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    placeholder="Brief summary of your issue"
                    className="w-full bg-[#0a0e16] border border-[#262a33] text-[#dfe2ee] text-xs p-3 rounded-lg placeholder:text-[#87948b] focus:outline-none focus:ring-1 focus:ring-[#68dba9]"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#87948b] font-['Space_Grotesk']">
                    Description
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Provide full details regarding your issue..."
                    className="w-full bg-[#0a0e16] border border-[#262a33] text-[#dfe2ee] text-xs p-3 rounded-lg placeholder:text-[#87948b] focus:outline-none focus:ring-1 focus:ring-[#68dba9] resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCreateOpen(false)}
                    className="px-4 py-2 rounded-lg bg-[#262a33] text-[#dfe2ee] text-xs font-bold font-['Space_Grotesk']"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="px-4 py-2 rounded-lg bg-[#68dba9] hover:bg-[#85f8c4] text-[#003825] font-bold text-xs uppercase tracking-wider font-['Space_Grotesk'] disabled:opacity-50 transition-colors"
                  >
                    {creating ? 'Submitting...' : 'Submit Ticket'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </CustomerLayout>
  );
}
