'use client';

import { Fragment, useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin-layout';

interface AuditLogEntry {
  id: string;
  actorUserId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  beforeState: Record<string, unknown> | null;
  afterState: Record<string, unknown> | null;
  requestMetadata: Record<string, unknown> | null;
  createdAt: string;
}

interface AuditLogResponse {
  entries: AuditLogEntry[];
  total: number;
  page: number;
  pageSize: number;
}

const PAGE_SIZE = 25;

export default function AuditLogsPage() {
  const [data, setData] = useState<AuditLogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [entityType, setEntityType] = useState('');
  const [action, setAction] = useState('');
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (entityType.trim()) params.set('entityType', entityType.trim());
    if (action.trim()) params.set('action', action.trim());

    fetch(`/api/admin/audit-logs?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((json: AuditLogResponse) => {
        if (isMounted) setData(json);
      })
      .catch(() => {
        if (isMounted) setError('Failed to load audit log.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [entityType, action, page]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6 w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0a0e16] p-4 rounded-xl border border-[#262a33]">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-[#68dba9]">
              <span className="material-symbols-outlined text-[16px]">history_edu</span>
              <span>IMMUTABLE SYSTEM AUDIT TRAIL</span>
            </div>
            <h1 className="text-xl font-bold text-[#dfe2ee] font-['Space_Grotesk'] mt-1">
              Audit Logs
            </h1>
            <p className="text-xs text-[#87948b] mt-0.5">
              {data ? `${data.total} record${data.total === 1 ? '' : 's'}` : '—'} · append-only,
              read-only
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={entityType}
              onChange={(e) => {
                setEntityType(e.target.value);
                setPage(1);
              }}
              placeholder="Entity type (e.g. DriverProfile)"
              className="h-9 px-3 rounded-lg bg-[#181c24] border border-[#262a33] text-xs text-[#dfe2ee] placeholder:text-[#87948b] focus:outline-none focus:border-[#68dba9]"
            />
            <input
              type="text"
              value={action}
              onChange={(e) => {
                setAction(e.target.value);
                setPage(1);
              }}
              placeholder="Action (e.g. driver.profile.updated)"
              className="h-9 px-3 rounded-lg bg-[#181c24] border border-[#262a33] text-xs text-[#dfe2ee] placeholder:text-[#87948b] focus:outline-none focus:border-[#68dba9]"
            />
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl border border-[#93000a] bg-[#93000a]/20 text-[#ffb4ab] text-sm">
            {error}
          </div>
        )}

        <div className="bg-[#0a0e16] rounded-xl border border-[#262a33] p-5 shadow-xl">
          {loading ? (
            <div className="py-16 text-center text-[#87948b] text-sm">Loading audit log…</div>
          ) : !data || data.entries.length === 0 ? (
            <div className="py-16 text-center text-[#87948b] text-sm">
              No audit records match the current filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left font-sans text-xs border-collapse">
                <thead>
                  <tr className="bg-[#181c24] text-[#87948b] font-['Space_Grotesk'] uppercase border-b border-[#262a33]">
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Entity</th>
                    <th className="py-3 px-4">Actor</th>
                    <th className="py-3 px-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#262a33] font-mono">
                  {data.entries.map((entry) => (
                    <Fragment key={entry.id}>
                      <tr className="hover:bg-[#181c24]/60 transition-colors">
                        <td className="py-3 px-4 text-[#bccac0]">
                          {new Date(entry.createdAt).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-[#dfe2ee] font-bold">{entry.action}</td>
                        <td className="py-3 px-4 text-[#bccac0]">
                          {entry.entityType}
                          <span className="block text-[10px] text-[#87948b]">{entry.entityId}</span>
                        </td>
                        <td className="py-3 px-4 text-[#87948b]">
                          {entry.actorUserId ?? 'system'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                            className="px-2.5 py-1 bg-[#262a33] hover:bg-[#353942] text-[#dfe2ee] rounded text-[11px]"
                          >
                            {expandedId === entry.id ? 'Hide' : 'Details'}
                          </button>
                        </td>
                      </tr>
                      {expandedId === entry.id && (
                        <tr>
                          <td colSpan={5} className="bg-[#181c24] p-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px]">
                              <div>
                                <span className="text-[#87948b] uppercase font-bold block mb-1">
                                  Before
                                </span>
                                <pre className="whitespace-pre-wrap text-[#bccac0] bg-[#0a0e16] rounded-lg p-3 border border-[#262a33] max-h-64 overflow-auto">
                                  {entry.beforeState
                                    ? JSON.stringify(entry.beforeState, null, 2)
                                    : '—'}
                                </pre>
                              </div>
                              <div>
                                <span className="text-[#87948b] uppercase font-bold block mb-1">
                                  After
                                </span>
                                <pre className="whitespace-pre-wrap text-[#bccac0] bg-[#0a0e16] rounded-lg p-3 border border-[#262a33] max-h-64 overflow-auto">
                                  {entry.afterState
                                    ? JSON.stringify(entry.afterState, null, 2)
                                    : '—'}
                                </pre>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {data && data.total > 0 && (
            <div className="flex items-center justify-between mt-4 text-xs text-[#87948b]">
              <span>
                Page {data.page} of {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-lg bg-[#181c24] border border-[#262a33] text-[#dfe2ee] disabled:opacity-40 hover:bg-[#262a33] transition-colors"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 rounded-lg bg-[#181c24] border border-[#262a33] text-[#dfe2ee] disabled:opacity-40 hover:bg-[#262a33] transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
