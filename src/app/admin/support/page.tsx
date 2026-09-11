'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface TicketItem {
  id: string;
  ticketNumber: string;
  category: string;
  status: string;
  priority: string;
  subject: string;
  createdAt: string;
  customer?: {
    id: string;
    customerProfile?: { firstName: string | null; lastName: string | null } | null;
    identities?: Array<{ email: string | null; phoneNumber: string | null }>;
  };
  assignedAdmin?: {
    id: string;
    identities?: Array<{ email: string | null }>;
  } | null;
}

interface OperationalMetrics {
  open: number;
  inProgress: number;
  waiting: number;
  urgent: number;
  resolved: number;
}

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [metrics, setMetrics] = useState<OperationalMetrics>({
    open: 0,
    inProgress: 0,
    waiting: 0,
    urgent: 0,
    resolved: 0,
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchAdminTickets = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    if (priorityFilter) params.set('priority', priorityFilter);
    if (categoryFilter) params.set('category', categoryFilter);
    if (searchTerm.trim()) params.set('search', searchTerm.trim());
    params.set('page', page.toString());
    params.set('pageSize', '20');

    try {
      const res = await fetch(`/api/admin/support/tickets?${params.toString()}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setTickets(data.data.tickets || []);
        if (data.data.metrics) setMetrics(data.data.metrics);
        setTotalPages(data.data.totalPages || 1);
      }
    } catch {
      // Non-blocking
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (priorityFilter) params.set('priority', priorityFilter);
      if (categoryFilter) params.set('category', categoryFilter);
      if (searchTerm.trim()) params.set('search', searchTerm.trim());
      params.set('page', page.toString());
      params.set('pageSize', '20');

      try {
        const res = await fetch(`/api/admin/support/tickets?${params.toString()}`);
        const data = await res.json();
        if (isMounted && res.ok && data.success) {
          setTickets(data.data.tickets || []);
          if (data.data.metrics) setMetrics(data.data.metrics);
          setTotalPages(data.data.totalPages || 1);
        }
      } catch {
        // Non-blocking
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, [statusFilter, priorityFilter, categoryFilter, searchTerm, page]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/40';
      case 'IN_PROGRESS':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
      case 'WAITING_FOR_CUSTOMER':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/40';
      case 'RESOLVED':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
      case 'CLOSED':
        return 'bg-gray-800 text-gray-400 border-gray-700';
      case 'REOPENED':
        return 'bg-rose-500/20 text-rose-400 border-rose-500/40';
      default:
        return 'bg-gray-800 text-gray-300 border-gray-700';
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return 'bg-red-500/20 text-red-400 border-red-500/40 font-bold';
      case 'HIGH':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/40';
      case 'NORMAL':
        return 'bg-blue-500/10 text-blue-300 border-blue-500/20';
      case 'LOW':
        return 'bg-gray-800 text-gray-400 border-gray-700';
      default:
        return 'bg-gray-800 text-gray-300';
    }
  };

  return (
    <div className="flex flex-col w-full gap-6 max-w-[1440px] mx-auto p-4 md:p-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-800 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-400 font-mono mb-1">
            <span>ADMINISTRATOR CONSOLE</span>
            <span>/</span>
            <span className="text-emerald-400">SUPPORT OPERATIONS</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-100 font-['Space_Grotesk']">
            Customer Support Queue & Triage
          </h1>
          <p className="text-xs md:text-sm text-gray-400 mt-1">
            Server-authoritative customer tickets, SLA metrics, operator assignments, and internal audit notes.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchAdminTickets}
          className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 font-bold text-xs font-mono border border-gray-700 transition-colors"
        >
          Refresh Queue
        </button>
      </div>

      {/* Operational Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="p-4 rounded-xl bg-gray-900 border border-gray-800 flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase text-gray-400 font-['Space_Grotesk']">
            Open Requests
          </span>
          <div className="text-2xl font-bold text-blue-400 mt-2 font-mono">{metrics.open}</div>
        </div>

        <div className="p-4 rounded-xl bg-gray-900 border border-gray-800 flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase text-gray-400 font-['Space_Grotesk']">
            In Progress
          </span>
          <div className="text-2xl font-bold text-amber-400 mt-2 font-mono">{metrics.inProgress}</div>
        </div>

        <div className="p-4 rounded-xl bg-gray-900 border border-gray-800 flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase text-gray-400 font-['Space_Grotesk']">
            Waiting Customer
          </span>
          <div className="text-2xl font-bold text-purple-400 mt-2 font-mono">{metrics.waiting}</div>
        </div>

        <div className="p-4 rounded-xl bg-gray-900 border border-gray-800 flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase text-gray-400 font-['Space_Grotesk']">
            Urgent Triage
          </span>
          <div className="text-2xl font-bold text-rose-400 mt-2 font-mono">{metrics.urgent}</div>
        </div>

        <div className="p-4 rounded-xl bg-gray-900 border border-gray-800 flex flex-col justify-between col-span-2 md:col-span-1">
          <span className="text-[10px] font-bold uppercase text-gray-400 font-['Space_Grotesk']">
            Resolved
          </span>
          <div className="text-2xl font-bold text-emerald-400 mt-2 font-mono">{metrics.resolved}</div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-xl bg-gray-900 border border-gray-800 flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Search by ticket #, subject, email, or phone..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setPage(1);
          }}
          className="flex-1 min-w-[240px] bg-gray-950 border border-gray-800 text-gray-200 text-xs px-3.5 py-2 rounded-lg placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="bg-gray-950 border border-gray-800 text-gray-300 text-xs px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
        >
          <option value="">All Statuses</option>
          <option value="OPEN">OPEN</option>
          <option value="IN_PROGRESS">IN_PROGRESS</option>
          <option value="WAITING_FOR_CUSTOMER">WAITING_FOR_CUSTOMER</option>
          <option value="RESOLVED">RESOLVED</option>
          <option value="CLOSED">CLOSED</option>
          <option value="REOPENED">REOPENED</option>
        </select>

        <select
          value={priorityFilter}
          onChange={(e) => {
            setPriorityFilter(e.target.value);
            setPage(1);
          }}
          className="bg-gray-950 border border-gray-800 text-gray-300 text-xs px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
        >
          <option value="">All Priorities</option>
          <option value="URGENT">URGENT</option>
          <option value="HIGH">HIGH</option>
          <option value="NORMAL">NORMAL</option>
          <option value="LOW">LOW</option>
        </select>

        <select
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value);
            setPage(1);
          }}
          className="bg-gray-950 border border-gray-800 text-gray-300 text-xs px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
        >
          <option value="">All Categories</option>
          <option value="BOOKING_ISSUE">BOOKING_ISSUE</option>
          <option value="DRIVER_CONDUCT">DRIVER_CONDUCT</option>
          <option value="PAYMENT_FARE">PAYMENT_FARE</option>
          <option value="REFUND_REQUEST">REFUND_REQUEST</option>
          <option value="PROMOTION_CODE">PROMOTION_CODE</option>
          <option value="ACCOUNT_PROFILE">ACCOUNT_PROFILE</option>
          <option value="APP_TECHNICAL">APP_TECHNICAL</option>
          <option value="SAFETY_CONCERN">SAFETY_CONCERN</option>
          <option value="OTHER">OTHER</option>
        </select>
      </div>

      {/* Tickets Table */}
      <div className="rounded-xl bg-gray-900 border border-gray-800 overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-8 text-center text-xs font-mono text-gray-500">
            Loading support queue...
          </div>
        ) : tickets.length === 0 ? (
          <div className="p-12 text-center text-gray-400 font-['Space_Grotesk'] text-sm">
            No support tickets match the current search & filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-950/60 text-gray-400 font-mono uppercase text-[10px]">
                  <th className="p-3.5">Ticket #</th>
                  <th className="p-3.5">Customer</th>
                  <th className="p-3.5">Category & Subject</th>
                  <th className="p-3.5">Priority</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Assigned To</th>
                  <th className="p-3.5">Created</th>
                  <th className="p-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60 text-gray-300">
                {tickets.map((t) => {
                  const p = t.customer?.customerProfile;
                  const customerName = p ? `${p.firstName || ''} ${p.lastName || ''}`.trim() || 'Customer' : 'Customer';
                  const customerEmail = t.customer?.identities?.[0]?.email || t.customer?.identities?.[0]?.phoneNumber || '';
                  return (
                    <tr key={t.id} className="hover:bg-gray-800/40 transition-colors">
                      <td className="p-3.5 font-mono text-emerald-400 font-bold">
                        #{t.ticketNumber}
                      </td>
                      <td className="p-3.5">
                        <span className="font-semibold text-gray-200 block">{customerName}</span>
                        <span className="font-mono text-[10px] text-gray-500">{customerEmail}</span>
                      </td>
                      <td className="p-3.5 max-w-xs">
                        <span className="font-mono text-[10px] text-gray-400 block uppercase">
                          {t.category}
                        </span>
                        <span className="font-semibold text-gray-200 truncate block">
                          {t.subject}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] border font-mono ${getPriorityBadge(
                            t.priority,
                          )}`}
                        >
                          {t.priority}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] border font-mono ${getStatusBadge(
                            t.status,
                          )}`}
                        >
                          {t.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono text-[11px] text-gray-400">
                        {t.assignedAdmin?.identities?.[0]?.email || 'Unassigned'}
                      </td>
                      <td className="p-3.5 font-mono text-gray-500">
                        {new Date(t.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-3.5 text-right">
                        <Link
                          href={`/admin/support/${t.id}`}
                          className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-mono font-bold transition-colors"
                        >
                          Manage →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-800 flex items-center justify-between text-xs font-mono text-gray-400">
            <span>
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1 rounded bg-gray-800 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 rounded bg-gray-800 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
