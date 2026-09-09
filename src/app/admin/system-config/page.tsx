'use client';

import { useEffect, useMemo, useState } from 'react';
import { AdminLayout } from '@/components/admin-layout';

type ConfigValueType = 'STRING' | 'INTEGER' | 'DECIMAL' | 'BOOLEAN' | 'JSON';

interface SystemConfigEntry {
  id: string;
  key: string;
  value: string;
  valueType: ConfigValueType;
  description: string | null;
  category: string;
  isPublic: boolean;
  updatedAt: string;
}

export default function SystemConfigPage() {
  const [configs, setConfigs] = useState<SystemConfigEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<string>('ALL');
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let isMounted = true;
    fetch('/api/admin/configuration')
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data) => {
        if (isMounted) setConfigs(data.configurations ?? []);
      })
      .catch(() => {
        if (isMounted) setError('Failed to load configuration.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [refreshKey]);

  const categories = useMemo(
    () => ['ALL', ...Array.from(new Set(configs.map((c) => c.category))).sort()],
    [configs],
  );

  const visibleConfigs = useMemo(
    () =>
      (category === 'ALL' ? configs : configs.filter((c) => c.category === category)).sort((a, b) =>
        a.key.localeCompare(b.key),
      ),
    [configs, category],
  );

  const startEdit = (entry: SystemConfigEntry) => {
    setEditingKey(entry.key);
    setEditValue(entry.value);
    setMessage(null);
  };

  const saveEdit = async (entry: SystemConfigEntry) => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/configuration/${encodeURIComponent(entry.key)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: editValue }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: `Updated ${entry.key}.` });
        setEditingKey(null);
        setRefreshKey((k) => k + 1);
      } else {
        setMessage({ type: 'error', text: data.message ?? 'Failed to update configuration.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error connecting to server.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6 w-full max-w-5xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0a0e16] p-4 rounded-xl border border-[#262a33]">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-[#68dba9]">
              <span className="material-symbols-outlined text-[16px]">tune</span>
              <span>GLOBAL SYSTEM PARAMETERS</span>
            </div>
            <h1 className="text-xl font-bold text-[#dfe2ee] font-['Space_Grotesk'] mt-1">
              System Configuration
            </h1>
            <p className="text-xs text-[#87948b] mt-0.5">
              Runtime policy values read by the application at request time. Secrets and API keys
              are never stored here — those remain in environment variables.
            </p>
          </div>

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-9 px-3 rounded-lg bg-[#181c24] border border-[#262a33] text-xs text-[#dfe2ee] focus:outline-none focus:border-[#68dba9]"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat === 'ALL' ? 'All Categories' : cat}
              </option>
            ))}
          </select>
        </div>

        {message && (
          <div
            className={`p-4 rounded-xl border ${message.type === 'success' ? 'bg-[#00311f]/50 border-[#25a475] text-[#68dba9]' : 'bg-[#93000a]/20 border-[#93000a] text-[#ffb4ab]'}`}
          >
            <p className="text-sm font-medium">{message.text}</p>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl border border-[#93000a] bg-[#93000a]/20 text-[#ffb4ab] text-sm">
            {error}
          </div>
        )}

        <div className="bg-[#0a0e16] rounded-xl border border-[#262a33] p-5 shadow-xl">
          {loading ? (
            <div className="py-16 text-center text-[#87948b] text-sm">Loading configuration…</div>
          ) : visibleConfigs.length === 0 ? (
            <div className="py-16 text-center text-[#87948b] text-sm">
              No configuration entries found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left font-sans text-xs border-collapse">
                <thead>
                  <tr className="bg-[#181c24] text-[#87948b] font-['Space_Grotesk'] uppercase border-b border-[#262a33]">
                    <th className="py-3 px-4">Key</th>
                    <th className="py-3 px-4">Value</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Updated</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#262a33] font-mono">
                  {visibleConfigs.map((entry) => (
                    <tr key={entry.key} className="hover:bg-[#181c24]/60 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-bold text-[#dfe2ee]">{entry.key}</span>
                        {entry.description && (
                          <span className="block text-[10px] text-[#87948b] mt-0.5 max-w-xs">
                            {entry.description}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-[#bccac0]">
                        {editingKey === entry.key ? (
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="w-40 rounded-lg bg-[#181c24] border border-[#262a33] px-2 py-1 text-xs text-[#dfe2ee] focus:outline-none focus:border-[#68dba9]"
                          />
                        ) : (
                          entry.value
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-[#262a33] text-[#dfe2ee] text-[10px] font-bold">
                          {entry.valueType}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[#87948b]">{entry.category}</td>
                      <td className="py-3 px-4 text-[#87948b]">
                        {new Date(entry.updatedAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {editingKey === entry.key ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setEditingKey(null)}
                              className="px-2.5 py-1 bg-[#262a33] hover:bg-[#353942] text-[#dfe2ee] rounded text-[11px]"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() => saveEdit(entry)}
                              className="px-2.5 py-1 bg-[#25a475] hover:bg-[#68dba9] disabled:opacity-50 text-[#00311f] font-bold rounded text-[11px]"
                            >
                              {saving ? 'Saving…' : 'Save'}
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => startEdit(entry)}
                            className="px-2.5 py-1 bg-[#262a33] hover:bg-[#353942] text-[#dfe2ee] rounded text-[11px]"
                          >
                            Edit
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
