'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';

interface Message {
  id: string;
  authorUserId: string;
  authorRole: string;
  isInternalNote: boolean;
  body: string;
  createdAt: string;
  authorUser?: {
    id: string;
    customerProfile?: { firstName: string | null; lastName: string | null } | null;
    identities?: Array<{ email: string | null }>;
  };
}

interface AuditLog {
  id: string;
  action: string;
  actorUserId: string | null;
  beforeState: unknown;
  afterState: unknown;
  createdAt: string;
}

interface TicketDetail {
  id: string;
  ticketNumber: string;
  category: string;
  status: string;
  priority: string;
  subject: string;
  description: string;
  assignedAdminId: string | null;
  createdAt: string;
  updatedAt: string;
  customer?: {
    id: string;
    customerProfile?: { firstName: string | null; lastName: string | null } | null;
    identities?: Array<{ email: string | null; phoneNumber: string | null }>;
  };
  assignedAdmin?: {
    id: string;
    identities?: Array<{ email: string | null }>;
  } | null;
  booking?: {
    id: string;
    status: string;
    bookingType: string;
    pickupAddress: string;
    dropoffAddress: string;
    createdAt: string;
  } | null;
  messages: Message[];
}

export default function AdminTicketDetailPage({
  params,
}: {
  params: Promise<{ ticketId: string }>;
}) {
  const { ticketId } = use(params);

  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [activeTab, setActiveTab] = useState<'PUBLIC' | 'INTERNAL' | 'AUDIT'>('PUBLIC');
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const fetchDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/admin/support/tickets/${ticketId}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to load ticket');
      }
      setTicket(data.data.ticket);
      setAuditLogs(data.data.auditLogs || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error loading ticket detail');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const res = await fetch(`/api/admin/support/tickets/${ticketId}`);
        const data = await res.json();
        if (isMounted) {
          if (res.ok && data.success) {
            setTicket(data.data.ticket);
            setAuditLogs(data.data.auditLogs || []);
          } else {
            setError(data.message || 'Failed to load ticket');
          }
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Error loading ticket detail');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, [ticketId]);

  const handlePostMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket || !replyText.trim()) return;

    const isInternal = activeTab === 'INTERNAL';

    try {
      setSubmittingReply(true);
      const res = await fetch(`/api/admin/support/tickets/${ticket.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body: replyText.trim(),
          isInternalNote: isInternal,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to submit response');
      }

      showToast(isInternal ? 'Internal note saved.' : 'Public response sent to customer.');
      setReplyText('');
      fetchDetail();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error posting response');
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!ticket || newStatus === ticket.status) return;

    try {
      setUpdatingStatus(true);
      const res = await fetch(`/api/admin/support/tickets/${ticket.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to update ticket status');
      }

      showToast(`Status updated to ${newStatus}.`);
      fetchDetail();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error changing status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-xs font-mono text-outline">Loading ticket detail...</div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="p-4 rounded-xl bg-error-container/30 border border-error/40 text-on-error-container text-sm">
          {error || 'Ticket not found.'}
        </div>
        <Link
          href="/admin/support"
          className="mt-4 inline-block text-xs font-mono text-primary hover:underline"
        >
          ← Back to Support Queue
        </Link>
      </div>
    );
  }

  const cp = ticket.customer?.customerProfile;
  const customerName = cp
    ? `${cp.firstName || ''} ${cp.lastName || ''}`.trim() || 'Customer'
    : 'Customer';
  const customerEmail =
    ticket.customer?.identities?.[0]?.email ||
    ticket.customer?.identities?.[0]?.phoneNumber ||
    'N/A';
  const publicMessages = ticket.messages.filter((m) => !m.isInternalNote);
  const internalNotes = ticket.messages.filter((m) => m.isInternalNote);

  return (
    <div className="flex flex-col w-full gap-6 max-w-[1440px] mx-auto p-4 md:p-6">
      {/* Toast Alert */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-primary text-surface-container-lowest font-bold px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 border border-primary">
          <span className="text-sm font-['Space_Grotesk']">{toast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-surface-container-high pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-on-surface-variant font-mono mb-1">
            <Link href="/admin/support" className="hover:text-primary transition-colors">
              SUPPORT QUEUE
            </Link>
            <span>/</span>
            <span className="text-primary">#{ticket.ticketNumber}</span>
          </div>
          <h1 className="text-2xl font-bold text-on-surface font-['Space_Grotesk']">
            {ticket.subject}
          </h1>
          <span className="text-xs font-mono text-on-surface-variant">
            Category: <strong className="text-on-surface">{ticket.category}</strong> • Created{' '}
            {new Date(ticket.createdAt).toLocaleString()}
          </span>
        </div>

        {/* Status Transition Control */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-on-surface-variant">Status:</span>
          <select
            value={ticket.status}
            disabled={updatingStatus}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="bg-surface-container-low border border-border text-on-surface text-xs font-mono font-bold px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="OPEN">OPEN</option>
            <option value="IN_PROGRESS">IN_PROGRESS</option>
            <option value="WAITING_FOR_CUSTOMER">WAITING_FOR_CUSTOMER</option>
            <option value="RESOLVED">RESOLVED</option>
            <option value="CLOSED">CLOSED</option>
            <option value="REOPENED">REOPENED</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Messages & Form (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-5">
          {/* Tabs */}
          <div className="flex items-center gap-2 border-b border-surface-container-high pb-2 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('PUBLIC')}
              className={`shrink-0 px-4 py-2 rounded-lg text-xs font-bold font-['Space_Grotesk'] transition-colors ${
                activeTab === 'PUBLIC'
                  ? 'bg-primary/20 text-primary border border-primary/40'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Public Conversation ({publicMessages.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('INTERNAL')}
              className={`shrink-0 px-4 py-2 rounded-lg text-xs font-bold font-['Space_Grotesk'] transition-colors ${
                activeTab === 'INTERNAL'
                  ? 'bg-suspend/20 text-on-suspend-container border border-suspend/40'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              🔒 Private Internal Notes ({internalNotes.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('AUDIT')}
              className={`shrink-0 px-4 py-2 rounded-lg text-xs font-bold font-['Space_Grotesk'] transition-colors ${
                activeTab === 'AUDIT'
                  ? 'bg-info/20 text-on-info-container border border-info/40'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Audit Log ({auditLogs.length})
            </button>
          </div>

          {/* Tab 1: Public Messages */}
          {activeTab === 'PUBLIC' && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-1">
                {publicMessages.map((m) => {
                  const isCustomer = m.authorRole === 'CUSTOMER';
                  return (
                    <div
                      key={m.id}
                      className={`p-4 rounded-xl border max-w-[90%] text-xs flex flex-col gap-1.5 ${
                        isCustomer
                          ? 'bg-surface-container-low border-surface-container-high self-start text-left'
                          : 'bg-on-primary-container/30 border-primary-container/40 self-end text-right'
                      }`}
                    >
                      <div className="flex items-center gap-2 text-[10px] font-mono text-on-surface-variant justify-between">
                        <span className="font-bold text-primary">
                          {isCustomer ? customerName : 'Support Operator'}
                        </span>
                        <span>{new Date(m.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="text-on-surface whitespace-pre-wrap leading-relaxed">
                        {m.body}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Reply Box */}
              <form
                onSubmit={handlePostMessage}
                className="flex flex-col gap-2 pt-4 border-t border-surface-container-high"
              >
                <textarea
                  rows={3}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type official response to customer (will update status to WAITING_FOR_CUSTOMER)..."
                  className="w-full bg-surface-container-lowest border border-surface-container-high text-on-surface text-xs p-3 rounded-lg placeholder:text-outline focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={submittingReply || !replyText.trim()}
                    className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-surface-container-lowest font-bold text-xs uppercase tracking-wider font-['Space_Grotesk'] disabled:opacity-50 transition-colors"
                  >
                    {submittingReply ? 'Sending...' : 'Send Customer Response'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Tab 2: Internal Notes */}
          {activeTab === 'INTERNAL' && (
            <div className="flex flex-col gap-4">
              <div className="p-3 rounded-lg bg-suspend-container/20 border border-suspend/30 text-xs text-on-suspend-container">
                ⚠️ Internal notes are private to authorized support admins and are{' '}
                <strong>never</strong> exposed to customers or customer API endpoints.
              </div>

              <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-1">
                {internalNotes.length === 0 ? (
                  <div className="p-8 text-center text-xs text-outline font-mono">
                    No internal notes created yet for this ticket.
                  </div>
                ) : (
                  internalNotes.map((m) => (
                    <div
                      key={m.id}
                      className="p-4 rounded-xl bg-suspend-container/20 border border-suspend/40 text-xs flex flex-col gap-1.5"
                    >
                      <div className="flex items-center gap-2 text-[10px] font-mono text-on-suspend-container justify-between">
                        <span className="font-bold">
                          {m.authorUser?.identities?.[0]?.email || 'Support Admin'} (Internal Note)
                        </span>
                        <span>{new Date(m.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="text-on-surface whitespace-pre-wrap leading-relaxed">
                        {m.body}
                      </p>
                    </div>
                  ))
                )}
              </div>

              <form
                onSubmit={handlePostMessage}
                className="flex flex-col gap-2 pt-4 border-t border-surface-container-high"
              >
                <textarea
                  rows={3}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Write confidential internal note (fraud checks, operator observations, escalation details)..."
                  className="w-full bg-surface-container-lowest border border-suspend/40 text-on-suspend-container text-xs p-3 rounded-lg placeholder:text-outline focus:outline-none focus:ring-1 focus:ring-suspend resize-none"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={submittingReply || !replyText.trim()}
                    className="px-4 py-2 rounded-lg bg-suspend hover:bg-suspend-hover text-white font-bold text-xs uppercase tracking-wider font-['Space_Grotesk'] disabled:opacity-50 transition-colors"
                  >
                    {submittingReply ? 'Saving...' : 'Save Private Note'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Tab 3: Audit Log */}
          {activeTab === 'AUDIT' && (
            <div className="flex flex-col gap-3">
              <div className="space-y-3 font-mono text-xs">
                {auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3.5 rounded-lg bg-surface-container-low border border-surface-container-high flex flex-col gap-1"
                  >
                    <div className="flex items-center justify-between text-primary">
                      <span className="font-bold">{log.action}</span>
                      <span className="text-[10px] text-outline">
                        {new Date(log.createdAt).toLocaleString()}
                      </span>
                    </div>
                    {log.afterState ? (
                      <pre className="text-[10px] text-on-surface-variant bg-surface-container-lowest p-2 rounded overflow-x-auto mt-1">
                        {JSON.stringify(log.afterState, null, 2)}
                      </pre>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Customer & Context Snapshot (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          {/* Customer Snapshot */}
          <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high flex flex-col gap-2">
            <span className="text-[10px] font-bold uppercase text-on-surface-variant font-['Space_Grotesk']">
              Customer Identity
            </span>
            <div className="text-sm font-semibold text-on-surface">{customerName}</div>
            <div className="text-xs font-mono text-on-surface-variant">{customerEmail}</div>
          </div>

          {/* Booking Context */}
          {ticket.booking && (
            <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high flex flex-col gap-2">
              <span className="text-[10px] font-bold uppercase text-on-surface-variant font-['Space_Grotesk']">
                Linked Booking
              </span>
              <div className="flex justify-between text-xs text-on-surface font-semibold">
                <span>{ticket.booking.bookingType}</span>
                <span className="font-mono text-primary">{ticket.booking.status}</span>
              </div>
              <div className="text-xs text-on-surface-variant space-y-1 mt-1">
                <p>
                  <strong className="text-on-surface-variant">Pickup:</strong>{' '}
                  {ticket.booking.pickupAddress}
                </p>
                <p>
                  <strong className="text-on-surface-variant">Dropoff:</strong>{' '}
                  {ticket.booking.dropoffAddress}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
