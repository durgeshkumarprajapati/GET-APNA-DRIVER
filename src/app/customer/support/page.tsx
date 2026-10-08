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
  const [newCategory, setNewCategory] = useState<SupportTicketCategory>(
    SupportTicketCategory.BOOKING_ISSUE,
  );
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
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30';
      case 'IN_PROGRESS':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30';
      case 'WAITING_FOR_CUSTOMER':
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30';
      case 'RESOLVED':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
      case 'CLOSED':
        return 'bg-surface-container-high text-on-surface-variant border-border';
      case 'REOPENED':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30';
      default:
        return 'bg-surface-container-high text-on-surface border-border';
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
          <div className="fixed bottom-6 right-6 z-50 bg-primary text-on-primary font-bold px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 border border-primary/40">
            <span className="material-symbols-outlined text-xl">check_circle</span>
            <span className="text-sm font-['Space_Grotesk']">{toastMessage}</span>
          </div>
        )}

        {/* Page Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-on-surface-variant mb-1 font-mono">
              <span>CUSTOMER PORTAL</span>
              <span>/</span>
              <span className="text-primary font-bold">SUPPORT & ARBITRATION</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-on-surface font-['Space_Grotesk']">
              Customer Support Center
            </h1>
            <p className="text-xs md:text-sm text-on-surface-variant mt-1">
              Track issues, contact operations concierge, and view resolution logs for your
              bookings.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={callingSupport}
              onClick={handleCallSupport}
              className="min-h-[48px] px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-md font-['Space_Grotesk'] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            >
              <span className="material-symbols-outlined text-lg">call</span>
              <span>{callingSupport ? 'Connecting…' : 'Call Customer Care'}</span>
            </button>
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="min-h-[48px] px-4 py-2.5 rounded-xl bg-primary hover:opacity-90 active:opacity-100 text-on-primary font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-md font-['Space_Grotesk'] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <span className="material-symbols-outlined text-lg">add_comment</span>
              <span>Create New Request</span>
            </button>
          </div>
        </div>

        {/* Active Call Banner */}
        {callData && (
          <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-2xl animate-pulse">
                phone_in_talk
              </span>
              <div>
                <span className="text-sm font-bold text-on-surface block font-['Space_Grotesk']">
                  Customer Care Call Connected (Session ID: {callData.callSessionId.substring(0, 8)}
                  )
                </span>
                <span className="text-xs text-blue-600 dark:text-blue-400">
                  Dial Helpline:{' '}
                  <strong className="text-on-surface font-mono">{callData.dialNumber}</strong> •{' '}
                  {callData.instructions}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setCallData(null)}
              className="min-h-[40px] px-2 text-xs text-on-surface-variant hover:text-on-surface transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Safety SOS Escalation Banner */}
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-destructive text-2xl animate-pulse">
              e911_emergency
            </span>
            <div>
              <span className="text-sm font-bold text-on-surface block font-['Space_Grotesk']">
                Immediate Physical Emergency or Safety Danger?
              </span>
              <span className="text-xs text-on-surface-variant">
                Do not use general support ticketing. Trigger the live SOS emergency button for
                immediate response.
              </span>
            </div>
          </div>
          <a
            href="/customer/safety-sos"
            className="min-h-[40px] px-3.5 py-2 rounded-lg bg-destructive hover:opacity-90 active:opacity-100 text-destructive-foreground font-bold text-xs font-['Space_Grotesk'] flex items-center gap-1.5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destructive"
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
              <h2 className="text-sm font-bold uppercase tracking-wider text-on-surface-variant font-['Space_Grotesk']">
                My Support Requests ({tickets.length})
              </h2>
              <button
                type="button"
                onClick={fetchTickets}
                className="min-h-[40px] px-2 text-xs text-primary font-bold hover:underline font-mono focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Refresh
              </button>
            </div>

            {loading ? (
              <div className="p-8 rounded-xl bg-surface-container border border-border text-center text-on-surface-variant font-mono text-xs shadow-sm">
                Loading support tickets...
              </div>
            ) : error ? (
              <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-xs text-destructive">
                {error}
              </div>
            ) : tickets.length === 0 ? (
              <div className="p-8 rounded-xl bg-surface-container border border-border text-center flex flex-col items-center gap-3 shadow-sm">
                <span className="material-symbols-outlined text-4xl text-on-surface-variant">
                  support_agent
                </span>
                <p className="text-sm text-on-surface font-medium font-['Space_Grotesk']">
                  No support requests yet
                </p>
                <p className="text-xs text-on-surface-variant max-w-xs">
                  If you need help with a booking, payment, account, or service discrepancy, open a
                  request.
                </p>
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(true)}
                  className="min-h-[40px] mt-2 px-3 py-1.5 rounded-lg bg-surface-container-high text-primary border border-border text-xs font-bold font-['Space_Grotesk'] hover:bg-surface-container-highest transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  Create Support Request
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3 animate-fade-in-up">
                {tickets.map((t) => (
                  <div
                    key={t.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => loadTicketDetail(t.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        loadTicketDetail(t.id);
                      }
                    }}
                    className={`card-interactive p-4 rounded-xl border cursor-pointer flex flex-col gap-2 shadow-sm ${
                      selectedTicket?.id === t.id
                        ? 'bg-surface-container-high border-primary'
                        : 'bg-surface-container border-border'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-primary">
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

                    <h3 className="text-sm font-semibold text-on-surface font-['Space_Grotesk'] line-clamp-1">
                      {t.subject}
                    </h3>

                    <div className="flex items-center justify-between text-xs text-on-surface-variant pt-2 border-t border-border/60 font-mono">
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
              <div className="p-12 rounded-xl bg-surface-container border border-border text-center text-on-surface-variant flex flex-col items-center justify-center min-h-[350px] shadow-sm">
                <span className="material-symbols-outlined text-4xl mb-2 text-on-surface-variant">
                  forum
                </span>
                <p className="text-sm font-['Space_Grotesk'] text-on-surface-variant">
                  Select a support ticket from the list to view its full conversation and status
                  history.
                </p>
              </div>
            ) : detailLoading ? (
              <div className="p-12 rounded-xl bg-surface-container border border-border text-center font-mono text-xs text-on-surface-variant shadow-sm">
                Loading conversation detail...
              </div>
            ) : (
              <div className="p-6 rounded-xl bg-surface-container border border-border shadow-sm flex flex-col gap-5">
                {/* Header */}
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-primary">
                        #{selectedTicket.ticketNumber}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border font-mono uppercase ${getStatusBadgeClass(
                          selectedTicket.status,
                        )}`}
                      >
                        {selectedTicket.status.replace(/_/g, ' ')}
                      </span>
                      <span className="text-xs text-on-surface-variant font-mono">
                        {categoryLabels[selectedTicket.category]}
                      </span>
                    </div>
                    <h2 className="text-xl font-bold text-on-surface font-['Space_Grotesk'] mt-1">
                      {selectedTicket.subject}
                    </h2>
                    <span className="text-xs text-on-surface-variant font-mono">
                      Created on {new Date(selectedTicket.createdAt).toLocaleString()}
                    </span>
                  </div>

                  {selectedTicket.status !== 'CLOSED' && (
                    <button
                      type="button"
                      onClick={handleCloseTicket}
                      disabled={closing}
                      className="min-h-[40px] px-3 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest border border-border text-destructive text-xs font-mono transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destructive"
                    >
                      {closing ? 'Closing...' : 'Close Ticket'}
                    </button>
                  )}
                </div>

                {/* Booking Reference Card if associated */}
                {selectedTicket.booking && (
                  <div className="p-3 rounded-lg bg-surface-container-high border border-border text-xs flex flex-col gap-1">
                    <span className="font-bold text-primary font-['Space_Grotesk'] uppercase text-[10px]">
                      Associated Booking
                    </span>
                    <div className="flex justify-between text-on-surface">
                      <span>{selectedTicket.booking.bookingType} Booking</span>
                      <span className="font-mono">{selectedTicket.booking.status}</span>
                    </div>
                    <p className="text-on-surface-variant truncate">
                      {selectedTicket.booking.pickupAddress} →{' '}
                      {selectedTicket.booking.dropoffAddress}
                    </p>
                  </div>
                )}

                {/* Conversation Thread */}
                <div className="flex flex-col gap-3 max-h-[420px] overflow-y-auto pr-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant font-['Space_Grotesk']">
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
                              ? 'bg-surface-container-high border-border self-end text-right'
                              : 'bg-primary/10 border-primary/30 self-start text-left'
                          }`}
                        >
                          <div className="flex items-center gap-2 text-[10px] font-mono text-on-surface-variant justify-between">
                            <span className="font-bold text-primary">
                              {isCustomer ? 'You (Customer)' : 'Customer Support Agent'}
                            </span>
                            <span>
                              {new Date(m.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <p className="text-on-surface leading-relaxed whitespace-pre-wrap">
                            {m.body}
                          </p>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-4 rounded-lg bg-surface-container-high border border-border text-xs text-on-surface-variant">
                      {selectedTicket.description}
                    </div>
                  )}
                </div>

                {/* Reply Form */}
                {selectedTicket.status !== 'CLOSED' ? (
                  <form
                    onSubmit={handleSendReply}
                    className="flex flex-col gap-2 pt-3 border-t border-border"
                  >
                    <textarea
                      rows={3}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Type your reply here..."
                      className="w-full bg-surface-container-high border border-border text-on-surface text-xs p-3 rounded-lg placeholder:text-on-surface-variant focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                    />
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={replying || !replyText.trim()}
                        className="min-h-[44px] px-4 py-2 rounded-lg bg-primary hover:opacity-90 text-on-primary font-bold text-xs uppercase tracking-wider font-['Space_Grotesk'] disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                      >
                        {replying ? 'Sending...' : 'Send Reply'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="p-3 rounded-lg bg-surface-container-high border border-border text-center text-xs text-on-surface-variant">
                    This support request has been closed. Create a new request if you still need
                    assistance.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Create Support Request Modal */}
        {isCreateOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="w-full max-w-lg rounded-2xl bg-surface-container border border-border p-6 shadow-2xl flex flex-col gap-4 animate-scale-in">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="text-lg font-bold text-on-surface font-['Space_Grotesk']">
                  Create Support Request
                </h3>
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  aria-label="Close"
                  className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors font-bold text-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleCreateTicket} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant font-['Space_Grotesk']">
                    Category
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as SupportTicketCategory)}
                    className="w-full bg-surface-container-high border border-border text-on-surface text-xs p-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {Object.entries(categoryLabels).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant font-['Space_Grotesk']">
                    Link Booking (Optional)
                  </label>
                  <select
                    value={newBookingId}
                    onChange={(e) => setNewBookingId(e.target.value)}
                    className="w-full bg-surface-container-high border border-border text-on-surface text-xs p-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">No specific booking</option>
                    {eligibleBookings.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.bookingType} - {b.pickupAddress?.substring(0, 20)}... (
                        {new Date(b.createdAt).toLocaleDateString()})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant font-['Space_Grotesk']">
                    Subject
                  </label>
                  <input
                    type="text"
                    required
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    placeholder="Brief summary of your issue"
                    className="w-full bg-surface-container-high border border-border text-on-surface text-xs p-3 rounded-lg placeholder:text-on-surface-variant focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant font-['Space_Grotesk']">
                    Description
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Provide full details regarding your issue..."
                    className="w-full bg-surface-container-high border border-border text-on-surface text-xs p-3 rounded-lg placeholder:text-on-surface-variant focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCreateOpen(false)}
                    className="min-h-[48px] px-4 py-2 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-bold font-['Space_Grotesk'] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="min-h-[48px] px-4 py-2 rounded-lg bg-primary hover:opacity-90 text-on-primary font-bold text-xs uppercase tracking-wider font-['Space_Grotesk'] disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
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
