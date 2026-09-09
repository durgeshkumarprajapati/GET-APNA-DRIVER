'use client';

import { useEffect, useMemo, useState } from 'react';
import { AdminLayout } from '@/components/admin-layout';

type ConfigValueType = 'STRING' | 'INTEGER' | 'DECIMAL' | 'BOOLEAN' | 'JSON';

const VALUE_TYPES: ConfigValueType[] = ['STRING', 'INTEGER', 'DECIMAL', 'BOOLEAN', 'JSON'];

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

interface ConfigFormState {
  key: string;
  value: string;
  valueType: ConfigValueType;
  category: string;
  description: string;
  isPublic: boolean;
}

const EMPTY_FORM: ConfigFormState = {
  key: '',
  value: '',
  valueType: 'STRING',
  category: 'system',
  description: '',
  isPublic: false,
};

function ValueEditor({
  valueType,
  value,
  onChange,
}: {
  valueType: ConfigValueType;
  value: string;
  onChange: (next: string) => void;
}) {
  const inputClass =
    'w-full rounded-lg bg-surface-container-lowest border border-surface-variant/50 px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary';

  if (valueType === 'BOOLEAN') {
    return (
      <select value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>
        <option value="true">true</option>
        <option value="false">false</option>
      </select>
    );
  }
  if (valueType === 'JSON') {
    return (
      <textarea
        rows={3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputClass} font-mono`}
        placeholder='["EXAMPLE_A","EXAMPLE_B"]'
      />
    );
  }
  if (valueType === 'INTEGER' || valueType === 'DECIMAL') {
    return (
      <input
        type="number"
        step={valueType === 'DECIMAL' ? '0.0001' : '1'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      />
    );
  }
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={inputClass}
    />
  );
}

function valueTypeBadgeClass(valueType: ConfigValueType): string {
  switch (valueType) {
    case 'BOOLEAN':
      return 'bg-tertiary/15 text-tertiary';
    case 'INTEGER':
    case 'DECIMAL':
      return 'bg-secondary/15 text-secondary';
    case 'JSON':
      return 'bg-primary/15 text-primary';
    default:
      return 'bg-surface-container-high text-on-surface-variant';
  }
}

export default function SystemConfigPage() {
  const [configs, setConfigs] = useState<SystemConfigEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState<ConfigFormState>(EMPTY_FORM);
  const [creating, setCreating] = useState(false);

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
    () => Array.from(new Set(configs.map((c) => c.category))).sort(),
    [configs],
  );

  const groupedConfigs = useMemo(() => {
    const filtered = configs
      .filter((c) => category === 'ALL' || c.category === category)
      .filter(
        (c) =>
          !search.trim() ||
          c.key.toLowerCase().includes(search.trim().toLowerCase()) ||
          c.description?.toLowerCase().includes(search.trim().toLowerCase()),
      )
      .sort((a, b) => a.key.localeCompare(b.key));

    const groups = new Map<string, SystemConfigEntry[]>();
    for (const entry of filtered) {
      const bucket = groups.get(entry.category) ?? [];
      bucket.push(entry);
      groups.set(entry.category, bucket);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [configs, category, search]);

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

  const createConfig = async () => {
    if (!addForm.key.trim()) {
      setMessage({ type: 'error', text: 'A key is required.' });
      return;
    }
    setCreating(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/configuration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: addForm.key.trim(),
          value: addForm.value,
          valueType: addForm.valueType,
          category: addForm.category.trim() || 'system',
          description: addForm.description.trim() || null,
          isPublic: addForm.isPublic,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: `Created ${addForm.key.trim()}.` });
        setAddForm(EMPTY_FORM);
        setShowAddForm(false);
        setRefreshKey((k) => k + 1);
      } else {
        setMessage({ type: 'error', text: data.message ?? 'Failed to create configuration.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error connecting to server.' });
    } finally {
      setCreating(false);
    }
  };

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6 w-full max-w-5xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-container-lowest p-4 rounded-xl border border-surface-variant/40">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-primary">
              <span className="material-symbols-outlined text-[16px]">tune</span>
              <span>GLOBAL SYSTEM PARAMETERS</span>
            </div>
            <h1 className="text-xl font-bold text-on-surface font-['Space_Grotesk'] mt-1">
              System Configuration
            </h1>
            <p className="text-xs text-on-surface-variant mt-0.5 max-w-lg">
              Runtime policy values read by the application at request time. Secrets and API keys
              are never stored here — those remain in environment variables.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setShowAddForm((v) => !v);
              setMessage(null);
            }}
            className="h-9 px-4 rounded-lg bg-primary text-on-primary text-xs font-bold hover:bg-primary-hover transition-colors flex items-center gap-1.5 shrink-0"
          >
            <span className="material-symbols-outlined text-[16px]">
              {showAddForm ? 'close' : 'add'}
            </span>
            <span>{showAddForm ? 'Cancel' : 'Add Configuration'}</span>
          </button>
        </div>

        {message && (
          <div
            className={`p-4 rounded-xl border ${message.type === 'success' ? 'bg-primary/10 border-primary text-primary' : 'bg-error-container/20 border-error-container text-error'}`}
          >
            <p className="text-sm font-medium">{message.text}</p>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl border border-error-container bg-error-container/20 text-error text-sm">
            {error}
          </div>
        )}

        {showAddForm && (
          <div className="bg-surface-container-lowest rounded-xl border border-primary/40 p-5 shadow-xl space-y-4">
            <h2 className="text-sm font-bold text-on-surface font-['Space_Grotesk']">
              New Configuration Entry
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase text-on-surface-variant mb-1">
                  Key (e.g. booking.matching.initial_radius_meters)
                </label>
                <input
                  type="text"
                  value={addForm.key}
                  onChange={(e) => setAddForm((f) => ({ ...f, key: e.target.value }))}
                  className="w-full rounded-lg bg-surface-container-lowest border border-surface-variant/50 px-3 py-2 text-sm text-on-surface font-mono focus:outline-none focus:border-primary"
                  placeholder="domain.resource.setting"
                />
              </div>
              <div>
                <label className="block text-xs uppercase text-on-surface-variant mb-1">
                  Value Type
                </label>
                <select
                  value={addForm.valueType}
                  onChange={(e) =>
                    setAddForm((f) => ({ ...f, valueType: e.target.value as ConfigValueType }))
                  }
                  className="w-full rounded-lg bg-surface-container-lowest border border-surface-variant/50 px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary"
                >
                  {VALUE_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs uppercase text-on-surface-variant mb-1">
                  Value
                </label>
                <ValueEditor
                  valueType={addForm.valueType}
                  value={addForm.value}
                  onChange={(v) => setAddForm((f) => ({ ...f, value: v }))}
                />
              </div>
              <div>
                <label className="block text-xs uppercase text-on-surface-variant mb-1">
                  Category
                </label>
                <input
                  type="text"
                  value={addForm.category}
                  onChange={(e) => setAddForm((f) => ({ ...f, category: e.target.value }))}
                  className="w-full rounded-lg bg-surface-container-lowest border border-surface-variant/50 px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary"
                  placeholder="system"
                />
              </div>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 text-xs text-on-surface-variant">
                  <input
                    type="checkbox"
                    checked={addForm.isPublic}
                    onChange={(e) => setAddForm((f) => ({ ...f, isPublic: e.target.checked }))}
                  />
                  Public (readable by unauthenticated clients)
                </label>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs uppercase text-on-surface-variant mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={addForm.description}
                  onChange={(e) => setAddForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full rounded-lg bg-surface-container-lowest border border-surface-variant/50 px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary"
                  placeholder="What this value controls"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setAddForm(EMPTY_FORM);
                }}
                className="px-4 py-2 rounded-lg bg-surface-container-high text-on-surface-variant text-xs font-bold hover:text-on-surface transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={creating}
                onClick={createConfig}
                className="px-4 py-2 rounded-lg bg-primary text-on-primary text-xs font-bold hover:bg-primary-hover disabled:opacity-50 transition-colors"
              >
                {creating ? 'Creating…' : 'Create Configuration'}
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by key or description..."
            className="h-9 flex-1 px-3 rounded-lg bg-surface-container-lowest border border-surface-variant/40 text-xs text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-9 px-3 rounded-lg bg-surface-container-lowest border border-surface-variant/40 text-xs text-on-surface focus:outline-none focus:border-primary"
          >
            <option value="ALL">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="py-16 text-center text-on-surface-variant text-sm">
            Loading configuration…
          </div>
        ) : groupedConfigs.length === 0 ? (
          <div className="py-16 text-center text-on-surface-variant text-sm bg-surface-container-lowest rounded-xl border border-surface-variant/40">
            No configuration entries match the current filters.
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {groupedConfigs.map(([groupCategory, entries]) => (
              <section key={groupCategory} className="flex flex-col gap-3">
                <h2 className="text-xs uppercase tracking-wider text-primary font-bold px-1">
                  {groupCategory} · {entries.length}
                </h2>
                <div className="flex flex-col gap-2">
                  {entries.map((entry) => (
                    <div
                      key={entry.key}
                      className="bg-surface-container-lowest rounded-xl border border-surface-variant/40 p-4"
                    >
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-sm text-on-surface break-all">
                              {entry.key}
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${valueTypeBadgeClass(entry.valueType)}`}
                            >
                              {entry.valueType}
                            </span>
                            {entry.isPublic && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-secondary/15 text-secondary">
                                PUBLIC
                              </span>
                            )}
                          </div>
                          {entry.description && (
                            <p className="text-xs text-on-surface-variant mt-1.5">
                              {entry.description}
                            </p>
                          )}
                          <p className="text-[10px] text-on-surface-variant/70 mt-1.5 font-mono">
                            Updated {new Date(entry.updatedAt).toLocaleString()}
                          </p>
                        </div>

                        <div className="w-full md:w-64 shrink-0">
                          {editingKey === entry.key ? (
                            <div className="flex flex-col gap-2">
                              <ValueEditor
                                valueType={entry.valueType}
                                value={editValue}
                                onChange={setEditValue}
                              />
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => setEditingKey(null)}
                                  className="px-3 py-1.5 bg-surface-container-high text-on-surface-variant hover:text-on-surface rounded-lg text-[11px] font-bold transition-colors"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  disabled={saving}
                                  onClick={() => saveEdit(entry)}
                                  className="px-3 py-1.5 bg-primary text-on-primary rounded-lg text-[11px] font-bold hover:bg-primary-hover disabled:opacity-50 transition-colors"
                                >
                                  {saving ? 'Saving…' : 'Save'}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between md:justify-end gap-3">
                              <span className="font-mono text-sm text-on-surface bg-surface-container-high px-3 py-1.5 rounded-lg break-all">
                                {entry.value}
                              </span>
                              <button
                                type="button"
                                onClick={() => startEdit(entry)}
                                className="px-3 py-1.5 bg-surface-container-high text-on-surface rounded-lg text-[11px] font-bold hover:bg-surface-container-highest transition-colors shrink-0"
                              >
                                Edit
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
