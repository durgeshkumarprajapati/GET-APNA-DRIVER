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
      <div className="p-8 text-center text-xs font-mono text-gray-500">
        Loading ticket detail...
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="p-4 rounded-xl bg-red-950/30 border border-red-800/40 text-red-200 text-sm">
          {error || 'Ticket not found.'}
        </div>
        <Link href="/admin/support" className="mt-4 inline-block text-xs font-mono text-emerald-400 hover:underline">
          ← Back to Support Queue
        </Link>
      </div>
    );
  }

  const cp = ticket.customer?.customerProfile;
  const customerName = cp ? `${cp.firstName || ''} ${cp.lastName || ''}`.trim() || 'Customer' : 'Customer';
  const customerEmail = ticket.customer?.identities?.[0]?.email || ticket.customer?.identities?.[0]?.phoneNumber || 'N/A';
  const publicMessages = ticket.messages.filter((m) => !m.isInternalNote);
  const internalNotes = ticket.messages.filter((m) => m.isInternalNote);

  return (
    <div className="flex flex-col w-full gap-6 max-w-[1440px] mx-auto p-4 md:p-6">
      {/* Toast Alert */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-500 text-gray-950 font-bold px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 border border-emerald-400">
          <span className="text-sm font-['Space_Grotesk']">{toast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-800 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-400 font-mono mb-1">
            <Link href="/admin/support" className="hover:text-emerald-400 transition-colors">
              SUPPORT QUEUE
            </Link>
            <span>/</span>
            <span className="text-emerald-400">#{ticket.ticketNumber}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-100 font-['Space_Grotesk']">
            {ticket.subject}
          </h1>
          <span className="text-xs font-mono text-gray-400">
            Category: <strong className="text-gray-200">{ticket.category}</strong> • Created {new Date(ticket.createdAt).toLocaleString()}
          </span>
        </div>

        {/* Status Transition Control */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-gray-400">Status:</span>
          <select
            value={ticket.status}
            disabled={updatingStatus}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="bg-gray-900 border border-gray-700 text-gray-200 text-xs font-mono font-bold px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
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
          <div className="flex items-center gap-2 border-b border-gray-800 pb-2">
            <button
              type="button"
              onClick={() => setActiveTab('PUBLIC')}
              className={`px-4 py-2 rounded-lg text-xs font-bold font-['Space_Grotesk'] transition-colors ${
                activeTab === 'PUBLIC'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Public Conversation ({publicMessages.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('INTERNAL')}
              className={`px-4 py-2 rounded-lg text-xs font-bold font-['Space_Grotesk'] transition-colors ${
                activeTab === 'INTERNAL'
                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              🔒 Private Internal Notes ({internalNotes.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('AUDIT')}
              className={`px-4 py-2 rounded-lg text-xs font-bold font-['Space_Grotesk'] transition-colors ${
                activeTab === 'AUDIT'
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                  : 'text-gray-400 hover:text-gray-200'
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
                          ? 'bg-gray-900 border-gray-800 self-start text-left'
                          : 'bg-emerald-950/30 border-emerald-800/40 self-end text-right'
                      }`}
                    >
                      <div className="flex items-center gap-2 text-[10px] font-mono text-gray-400 justify-between">
                        <span className="font-bold text-emerald-400">
                          {isCustomer ? customerName : 'Support Operator'}
                        </span>
                        <span>{new Date(m.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="text-gray-200 whitespace-pre-wrap leading-relaxed">{m.body}</p>
                    </div>
                  );
                })}
              </div>

              {/* Reply Box */}
              <form onSubmit={handlePostMessage} className="flex flex-col gap-2 pt-4 border-t border-gray-800">
                <textarea
                  rows={3}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type official response to customer (will update status to WAITING_FOR_CUSTOMER)..."
                  className="w-full bg-gray-950 border border-gray-800 text-gray-200 text-xs p-3 rounded-lg placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={submittingReply || !replyText.trim()}
                    className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-bold text-xs uppercase tracking-wider font-['Space_Grotesk'] disabled:opacity-50 transition-colors"
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
              <div className="p-3 rounded-lg bg-purple-950/20 border border-purple-800/30 text-xs text-purple-300">
                ⚠️ Internal notes are private to authorized support admins and are <strong>never</strong> exposed to customers or customer API endpoints.
              </div>

              <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-1">
                {internalNotes.length === 0 ? (
                  <div className="p-8 text-center text-xs text-gray-500 font-mono">
                    No internal notes created yet for this ticket.
                  </div>
                ) : (
                  internalNotes.map((m) => (
                    <div
                      key={m.id}
                      className="p-4 rounded-xl bg-purple-950/20 border border-purple-800/40 text-xs flex flex-col gap-1.5"
                    >
                      <div className="flex items-center gap-2 text-[10px] font-mono text-purple-400 justify-between">
                        <span className="font-bold">
                          {m.authorUser?.identities?.[0]?.email || 'Support Admin'} (Internal Note)
                        </span>
                        <span>{new Date(m.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="text-gray-200 whitespace-pre-wrap leading-relaxed">{m.body}</p>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handlePostMessage} className="flex flex-col gap-2 pt-4 border-t border-gray-800">
                <textarea
                  rows={3}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Write confidential internal note (fraud checks, operator observations, escalation details)..."
                  className="w-full bg-gray-950 border border-purple-800/40 text-purple-200 text-xs p-3 rounded-lg placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-purple-500 resize-none"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={submittingReply || !replyText.trim()}
                    className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase tracking-wider font-['Space_Grotesk'] disabled:opacity-50 transition-colors"
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
                  <div key={log.id} className="p-3.5 rounded-lg bg-gray-900 border border-gray-800 flex flex-col gap-1">
                    <div className="flex items-center justify-between text-[#68dba9]">
                      <span className="font-bold">{log.action}</span>
                      <span className="text-[10px] text-gray-500">{new Date(log.createdAt).toLocaleString()}</span>
                    </div>
                    {log.afterState ? (
                      <pre className="text-[10px] text-gray-400 bg-gray-950 p-2 rounded overflow-x-auto mt-1">
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
          <div className="p-4 rounded-xl bg-gray-900 border border-gray-800 flex flex-col gap-2">
            <span className="text-[10px] font-bold uppercase text-gray-400 font-['Space_Grotesk']">
              Customer Identity
            </span>
            <div className="text-sm font-semibold text-gray-200">{customerName}</div>
            <div className="text-xs font-mono text-gray-400">{customerEmail}</div>
          </div>

          {/* Booking Context */}
          {ticket.booking && (
            <div className="p-4 rounded-xl bg-gray-900 border border-gray-800 flex flex-col gap-2">
              <span className="text-[10px] font-bold uppercase text-gray-400 font-['Space_Grotesk']">
                Linked Booking
              </span>
              <div className="flex justify-between text-xs text-gray-200 font-semibold">
                <span>{ticket.booking.bookingType}</span>
                <span className="font-mono text-emerald-400">{ticket.booking.status}</span>
              </div>
              <div className="text-xs text-gray-400 space-y-1 mt-1">
                <p><strong className="text-gray-300">Pickup:</strong> {ticket.booking.pickupAddress}</p>
                <p><strong className="text-gray-300">Dropoff:</strong> {ticket.booking.dropoffAddress}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
