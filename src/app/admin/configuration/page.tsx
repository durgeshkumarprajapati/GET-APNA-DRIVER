'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface SystemConfig {
  id: string;
  key: string;
  value: string;
  valueType: 'STRING' | 'INTEGER' | 'DECIMAL' | 'BOOLEAN' | 'JSON';
  description: string | null;
  category: string;
  isPublic: boolean;
  updatedAt: string;
}

export default function AdminConfigurationPage() {
  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [editItem, setEditItem] = useState<SystemConfig | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newItem, setNewItem] = useState<{
    key: string;
    value: string;
    valueType: SystemConfig['valueType'];
    description: string;
    category: string;
    isPublic: boolean;
  }>({
    key: '',
    value: '',
    valueType: 'STRING',
    description: '',
    category: 'system',
    isPublic: false,
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const run = async () => {
      const url =
        categoryFilter === 'all'
          ? '/api/admin/configuration'
          : `/api/admin/configuration?category=${categoryFilter}`;
      try {
        const res = await fetch(url);
        if (res.ok && isMounted) {
          const data = (await res.json()) as { configurations?: SystemConfig[] };
          setConfigs(data.configurations || []);
        }
      } catch {
        // Ignore load error
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    void run();
    return () => {
      isMounted = false;
    };
  }, [categoryFilter, refreshTrigger]);

  const handleUpdateConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem) return;
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/admin/configuration/${encodeURIComponent(editItem.key)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          value: editItem.value,
          valueType: editItem.valueType,
          description: editItem.description,
          category: editItem.category,
          isPublic: editItem.isPublic,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error?.message || 'Failed to update configuration');
      }

      setMessage({
        type: 'success',
        text: `Configuration '${editItem.key}' updated successfully!`,
      });
      setEditItem(null);
      setRefreshTrigger((prev) => prev + 1);
    } catch (err: unknown) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Error updating configuration',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/admin/configuration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error?.message || 'Failed to create configuration');
      }

      setMessage({ type: 'success', text: `Configuration '${newItem.key}' created successfully!` });
      setShowCreateModal(false);
      setNewItem({
        key: '',
        value: '',
        valueType: 'STRING',
        description: '',
        category: 'system',
        isPublic: false,
      });
      setRefreshTrigger((prev) => prev + 1);
    } catch (err: unknown) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Error creating configuration',
      });
    } finally {
      setSaving(false);
    }
  };

  const categories = ['all', 'identity', 'system', 'bookings', 'drivers', 'payments'];

  return (
    <div
      style={{ minHeight: '100vh', padding: '2rem 1.5rem', maxWidth: '1200px', margin: '0 auto' }}
    >
      {/* Header */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem',
          paddingBottom: '1rem',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: 700,
              margin: 0,
              color: 'var(--color-text-primary)',
            }}
          >
            System Configuration Management
          </h1>
          <p
            style={{
              margin: '0.25rem 0 0 0',
              fontSize: '0.875rem',
              color: 'var(--color-text-secondary)',
            }}
          >
            Centralized database-backed operational parameters with instant Redis cache
            invalidation.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '0.375rem',
              backgroundColor: 'var(--color-primary)',
              color: '#ffffff',
              border: 'none',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            + Create Parameter
          </button>
          <Link
            href="/"
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '0.375rem',
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-surface)',
              color: 'var(--color-text-primary)',
              textDecoration: 'none',
              fontSize: '0.875rem',
              fontWeight: 500,
            }}
          >
            ← Home
          </Link>
        </div>
      </header>

      {message && (
        <div
          style={{
            padding: '0.75rem 1rem',
            borderRadius: '0.5rem',
            marginBottom: '1.5rem',
            backgroundColor:
              message.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(220, 38, 38, 0.1)',
            border: `1px solid ${message.type === 'success' ? '#22c55e' : 'var(--color-danger)'}`,
            color: message.type === 'success' ? '#22c55e' : 'var(--color-danger)',
            fontSize: '0.875rem',
          }}
        >
          {message.text}
        </div>
      )}

      {/* Category Pills */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategoryFilter(cat)}
            style={{
              padding: '0.375rem 0.875rem',
              borderRadius: '1rem',
              fontSize: '0.875rem',
              fontWeight: 500,
              textTransform: 'capitalize',
              border:
                categoryFilter === cat
                  ? '1px solid var(--color-primary)'
                  : '1px solid var(--color-border)',
              backgroundColor:
                categoryFilter === cat ? 'var(--color-primary)' : 'var(--color-surface)',
              color: categoryFilter === cat ? '#ffffff' : 'var(--color-text-primary)',
              cursor: 'pointer',
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Configurations Table */}
      {loading ? (
        <p style={{ color: 'var(--color-text-secondary)' }}>Loading system configurations...</p>
      ) : configs.length === 0 ? (
        <div
          style={{
            padding: '3rem 1.5rem',
            textAlign: 'center',
            backgroundColor: 'var(--color-surface)',
            borderRadius: '0.75rem',
            border: '1px dashed var(--color-border)',
          }}
        >
          <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>
            No configurations found for category &apos;{categoryFilter}&apos;.
          </p>
        </div>
      ) : (
        <div
          style={{
            overflowX: 'auto',
            backgroundColor: 'var(--color-surface)',
            borderRadius: '0.75rem',
            border: '1px solid var(--color-border)',
          }}
        >
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              textAlign: 'left',
              fontSize: '0.875rem',
            }}
          >
            <thead>
              <tr
                style={{
                  borderBottom: '1px solid var(--color-border)',
                  backgroundColor: 'rgba(0,0,0,0.02)',
                }}
              >
                <th style={{ padding: '0.75rem 1rem' }}>Configuration Key</th>
                <th style={{ padding: '0.75rem 1rem' }}>Value</th>
                <th style={{ padding: '0.75rem 1rem' }}>Type</th>
                <th style={{ padding: '0.75rem 1rem' }}>Category</th>
                <th style={{ padding: '0.75rem 1rem' }}>Visibility</th>
                <th style={{ padding: '0.75rem 1rem' }}>Description</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {configs.map((config) => (
                <tr key={config.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td
                    style={{
                      padding: '0.75rem 1rem',
                      fontWeight: 600,
                      fontFamily: 'monospace',
                      color: 'var(--color-primary)',
                    }}
                  >
                    {config.key}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace' }}>
                    {config.value.length > 40
                      ? `${config.value.substring(0, 40)}...`
                      : config.value}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span
                      style={{
                        padding: '0.2rem 0.5rem',
                        borderRadius: '0.25rem',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        backgroundColor: 'rgba(100, 116, 139, 0.1)',
                        color: 'var(--color-text-secondary)',
                      }}
                    >
                      {config.valueType}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textTransform: 'capitalize' }}>
                    {config.category}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span
                      style={{
                        padding: '0.2rem 0.5rem',
                        borderRadius: '0.25rem',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        backgroundColor: config.isPublic
                          ? 'rgba(34, 197, 94, 0.1)'
                          : 'rgba(234, 179, 8, 0.1)',
                        color: config.isPublic ? '#22c55e' : '#eab308',
                      }}
                    >
                      {config.isPublic ? 'PUBLIC' : 'PRIVATE'}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: 'var(--color-text-secondary)' }}>
                    {config.description || '—'}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                    <button
                      type="button"
                      onClick={() => setEditItem(config)}
                      style={{
                        padding: '0.375rem 0.75rem',
                        borderRadius: '0.25rem',
                        border: '1px solid var(--color-border)',
                        backgroundColor: 'var(--color-background)',
                        color: 'var(--color-primary)',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Configuration Modal */}
      {editItem && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1rem',
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--color-surface-elevated)',
              border: '1px solid var(--color-border)',
              borderRadius: '0.75rem',
              padding: '2rem',
              width: '100%',
              maxWidth: '500px',
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: '1.25rem' }}>Edit System Parameter</h3>
            <p
              style={{
                fontFamily: 'monospace',
                fontWeight: 600,
                color: 'var(--color-primary)',
                margin: '0 0 1rem 0',
              }}
            >
              {editItem.key}
            </p>
            <form onSubmit={handleUpdateConfig} style={{ display: 'grid', gap: '1rem' }}>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    marginBottom: '0.25rem',
                  }}
                >
                  Value
                </label>
                <input
                  type="text"
                  required
                  value={editItem.value}
                  onChange={(e) => setEditItem({ ...editItem, value: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    borderRadius: '0.25rem',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-background)',
                    color: 'var(--color-text-primary)',
                  }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      marginBottom: '0.25rem',
                    }}
                  >
                    Type
                  </label>
                  <select
                    value={editItem.valueType}
                    onChange={(e) =>
                      setEditItem({
                        ...editItem,
                        valueType: e.target.value as SystemConfig['valueType'],
                      })
                    }
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      borderRadius: '0.25rem',
                      border: '1px solid var(--color-border)',
                      backgroundColor: 'var(--color-background)',
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    <option value="STRING">STRING</option>
                    <option value="INTEGER">INTEGER</option>
                    <option value="DECIMAL">DECIMAL</option>
                    <option value="BOOLEAN">BOOLEAN</option>
                    <option value="JSON">JSON</option>
                  </select>
                </div>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      marginBottom: '0.25rem',
                    }}
                  >
                    Category
                  </label>
                  <input
                    type="text"
                    required
                    value={editItem.category}
                    onChange={(e) => setEditItem({ ...editItem, category: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      borderRadius: '0.25rem',
                      border: '1px solid var(--color-border)',
                      backgroundColor: 'var(--color-background)',
                      color: 'var(--color-text-primary)',
                    }}
                  />
                </div>
              </div>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    marginBottom: '0.25rem',
                  }}
                >
                  Description
                </label>
                <input
                  type="text"
                  value={editItem.description || ''}
                  onChange={(e) => setEditItem({ ...editItem, description: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    borderRadius: '0.25rem',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-background)',
                    color: 'var(--color-text-primary)',
                  }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  id="editIsPublic"
                  type="checkbox"
                  checked={editItem.isPublic}
                  onChange={(e) => setEditItem({ ...editItem, isPublic: e.target.checked })}
                />
                <label htmlFor="editIsPublic" style={{ fontSize: '0.875rem' }}>
                  Publicly Visible to Clients
                </label>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '0.75rem',
                  marginTop: '1rem',
                }}
              >
                <button
                  type="button"
                  onClick={() => setEditItem(null)}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '0.25rem',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'transparent',
                    color: 'var(--color-text-primary)',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '0.25rem',
                    border: 'none',
                    backgroundColor: 'var(--color-primary)',
                    color: '#ffffff',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {saving ? 'Updating...' : 'Save & Invalidate Cache'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Configuration Modal */}
      {showCreateModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1rem',
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--color-surface-elevated)',
              border: '1px solid var(--color-border)',
              borderRadius: '0.75rem',
              padding: '2rem',
              width: '100%',
              maxWidth: '500px',
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: '1.25rem' }}>Create System Parameter</h3>
            <form onSubmit={handleCreateConfig} style={{ display: 'grid', gap: '1rem' }}>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    marginBottom: '0.25rem',
                  }}
                >
                  Key (e.g. system.tax_rate)
                </label>
                <input
                  type="text"
                  required
                  placeholder="identity.otp.ttl_seconds"
                  value={newItem.key}
                  onChange={(e) => setNewItem({ ...newItem, key: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    borderRadius: '0.25rem',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-background)',
                    color: 'var(--color-text-primary)',
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    marginBottom: '0.25rem',
                  }}
                >
                  Value
                </label>
                <input
                  type="text"
                  required
                  placeholder="300"
                  value={newItem.value}
                  onChange={(e) => setNewItem({ ...newItem, value: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    borderRadius: '0.25rem',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-background)',
                    color: 'var(--color-text-primary)',
                  }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      marginBottom: '0.25rem',
                    }}
                  >
                    Type
                  </label>
                  <select
                    value={newItem.valueType}
                    onChange={(e) =>
                      setNewItem({
                        ...newItem,
                        valueType: e.target.value as SystemConfig['valueType'],
                      })
                    }
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      borderRadius: '0.25rem',
                      border: '1px solid var(--color-border)',
                      backgroundColor: 'var(--color-background)',
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    <option value="STRING">STRING</option>
                    <option value="INTEGER">INTEGER</option>
                    <option value="DECIMAL">DECIMAL</option>
                    <option value="BOOLEAN">BOOLEAN</option>
                    <option value="JSON">JSON</option>
                  </select>
                </div>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      marginBottom: '0.25rem',
                    }}
                  >
                    Category
                  </label>
                  <input
                    type="text"
                    required
                    value={newItem.category}
                    onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      borderRadius: '0.25rem',
                      border: '1px solid var(--color-border)',
                      backgroundColor: 'var(--color-background)',
                      color: 'var(--color-text-primary)',
                    }}
                  />
                </div>
              </div>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    marginBottom: '0.25rem',
                  }}
                >
                  Description
                </label>
                <input
                  type="text"
                  placeholder="Operational parameter description"
                  value={newItem.description}
                  onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    borderRadius: '0.25rem',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-background)',
                    color: 'var(--color-text-primary)',
                  }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  id="createIsPublic"
                  type="checkbox"
                  checked={newItem.isPublic}
                  onChange={(e) => setNewItem({ ...newItem, isPublic: e.target.checked })}
                />
                <label htmlFor="createIsPublic" style={{ fontSize: '0.875rem' }}>
                  Publicly Visible to Clients
                </label>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '0.75rem',
                  marginTop: '1rem',
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '0.25rem',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'transparent',
                    color: 'var(--color-text-primary)',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '0.25rem',
                    border: 'none',
                    backgroundColor: 'var(--color-primary)',
                    color: '#ffffff',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {saving ? 'Creating...' : 'Create Parameter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
