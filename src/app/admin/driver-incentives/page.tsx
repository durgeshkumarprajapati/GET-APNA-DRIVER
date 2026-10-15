'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from '@/i18n/context';

interface IncentiveCampaign {
  id: string;
  name: string;
  description: string | null;
  incentiveType: string;
  targetValue: string;
  rewardAmount: string;
  startAt: string;
  endAt: string;
  timezone: string;
  status: string;
  createdAt: string;
  _count?: { progresses: number };
}

export default function AdminDriverIncentivesPage() {
  const { t } = useTranslation();
  const [campaigns, setCampaigns] = useState<IncentiveCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState(() => ({
    name: '',
    description: '',
    incentiveType: 'TRIP_COUNT',
    targetValue: '10',
    rewardAmount: '500',
    startAt: new Date().toISOString().slice(0, 16),
    endAt: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16),
  }));

  const loadCampaigns = async () => {
    try {
      const url = filterStatus
        ? `/api/admin/incentives?status=${filterStatus}`
        : '/api/admin/incentives';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data.data ?? []);
      }
    } catch {
      // Quiet error fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const fetchCampaigns = async () => {
      try {
        const url = filterStatus
          ? `/api/admin/incentives?status=${filterStatus}`
          : '/api/admin/incentives';
        const res = await fetch(url);
        if (res.ok && isMounted) {
          const data = await res.json();
          setCampaigns(data.data ?? []);
        }
      } catch {
        // Quiet error fallback
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    void fetchCampaigns();
    return () => {
      isMounted = false;
    };
  }, [filterStatus]);

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);
      const res = await fetch('/api/admin/incentives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to create campaign');
      }

      setShowCreateModal(false);
      setFormData({
        name: '',
        description: '',
        incentiveType: 'TRIP_COUNT',
        targetValue: '10',
        rewardAmount: '500',
        startAt: new Date().toISOString().slice(0, 16),
        endAt: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16),
      });
      await loadCampaigns();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creating campaign');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (campaignId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/admin/incentives/${campaignId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        await loadCampaigns();
      }
    } catch {
      // Error handling
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-on-primary-container text-primary border-primary-container';
      case 'DRAFT':
        return 'bg-surface-container-high text-on-surface-variant border-border';
      case 'PAUSED':
        return 'bg-warning-container text-on-warning-container border-warning';
      case 'EXPIRED':
        return 'bg-error-container/30 text-error border-error-container';
      case 'ARCHIVED':
        return 'bg-surface-container-lowest text-outline border-surface-container-low';
      default:
        return 'bg-surface-container-high text-on-surface-variant border-border';
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-surface-container-low border border-surface-container-high rounded-2xl p-6 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-xs font-bold text-on-warning-container tracking-widest uppercase">
            {t('admin.incentives.eyebrow')}
          </span>
          <h1 className="text-2xl font-bold text-white mt-1">{t('admin.incentives.title')}</h1>
          <p className="text-on-surface-variant text-sm mt-0.5">{t('admin.incentives.subtitle')}</p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 bg-warning hover:bg-on-warning-container text-surface-container-lowest font-bold text-xs rounded-xl shadow-lg transition"
        >
          + {t('admin.incentives.createCampaign')}
        </button>
      </div>

      {/* Filter Controls */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {['', 'DRAFT', 'ACTIVE', 'PAUSED', 'EXPIRED', 'ARCHIVED'].map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition ${
              filterStatus === status
                ? 'bg-warning text-surface-container-lowest border-on-warning-container'
                : 'bg-surface-container-low text-on-surface-variant border-surface-container-high hover:border-border hover:text-white'
            }`}
          >
            {status === '' ? 'All Statuses' : status}
          </button>
        ))}
      </div>

      {/* Campaign List */}
      {loading ? (
        <div className="py-16 text-center text-outline text-sm">Loading campaigns...</div>
      ) : campaigns.length === 0 ? (
        <div className="p-12 text-center bg-surface-container-low border border-dashed border-surface-container-high rounded-2xl text-outline text-sm">
          {t('admin.incentives.noCampaigns')}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaigns.map((c) => (
            <div
              key={c.id}
              className="bg-surface-container-low border border-surface-container-high rounded-2xl p-5 shadow-lg flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start mb-3">
                  <span
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${getStatusBadgeClass(c.status)}`}
                  >
                    {c.status}
                  </span>
                  <span className="text-xs font-bold text-on-warning-container bg-warning-container/60 px-2.5 py-1 rounded-lg border border-warning/40">
                    +₹{parseFloat(c.rewardAmount).toFixed(0)} Reward
                  </span>
                </div>

                <h3 className="text-base font-bold text-white mb-1">{c.name}</h3>
                {c.description && (
                  <p className="text-xs text-on-surface-variant mb-4">{c.description}</p>
                )}

                <div className="space-y-2 bg-surface-container-lowest p-3.5 rounded-xl border border-surface-container-high/60 text-xs">
                  <div className="flex justify-between text-on-surface-variant">
                    <span className="text-outline">Incentive Type:</span>
                    <span className="font-semibold text-white">{c.incentiveType}</span>
                  </div>
                  <div className="flex justify-between text-on-surface-variant">
                    <span className="text-outline">Target Value:</span>
                    <span className="font-semibold text-white">{c.targetValue}</span>
                  </div>
                  <div className="flex justify-between text-on-surface-variant">
                    <span className="text-outline">Participants:</span>
                    <span className="font-semibold text-primary">
                      {c._count?.progresses ?? 0} drivers
                    </span>
                  </div>
                  <div className="flex justify-between text-on-surface-variant pt-1 border-t border-surface-container-low">
                    <span className="text-outline">Validity:</span>
                    <span className="font-mono text-[11px] text-on-surface-variant">
                      {new Date(c.startAt).toLocaleDateString()} -{' '}
                      {new Date(c.endAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status Action Buttons */}
              <div className="mt-5 pt-4 border-t border-surface-container-high flex items-center justify-end gap-2">
                {c.status === 'DRAFT' && (
                  <button
                    onClick={() => handleStatusChange(c.id, 'ACTIVE')}
                    className="px-3 py-1.5 bg-primary-container hover:bg-primary text-white text-xs font-bold rounded-lg transition"
                  >
                    {t('admin.incentives.activate')}
                  </button>
                )}
                {c.status === 'ACTIVE' && (
                  <button
                    onClick={() => handleStatusChange(c.id, 'PAUSED')}
                    className="px-3 py-1.5 bg-warning hover:bg-warning-hover text-white text-xs font-bold rounded-lg transition"
                  >
                    {t('admin.incentives.pause')}
                  </button>
                )}
                {c.status === 'PAUSED' && (
                  <button
                    onClick={() => handleStatusChange(c.id, 'ACTIVE')}
                    className="px-3 py-1.5 bg-primary-container hover:bg-primary text-white text-xs font-bold rounded-lg transition"
                  >
                    {t('admin.incentives.activate')}
                  </button>
                )}
                {c.status !== 'ARCHIVED' && (
                  <button
                    onClick={() => handleStatusChange(c.id, 'ARCHIVED')}
                    className="px-3 py-1.5 bg-surface-container-high hover:bg-border text-on-surface-variant text-xs font-bold rounded-lg transition"
                  >
                    {t('admin.incentives.archive')}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal for Creating Campaign */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-surface-container-lowest/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-low border border-surface-container-high rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-surface-container-high">
              <h2 className="text-lg font-bold text-white">Create Incentive Campaign</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-on-surface-variant hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="p-3 bg-error-container/50 border border-error text-on-error-container text-xs rounded-xl">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateCampaign} className="space-y-4 text-xs">
              <div>
                <label className="block text-on-surface-variant font-medium mb-1">
                  Campaign Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Weekend Rush Bonus"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-surface-container-lowest border border-surface-container-high text-white rounded-lg px-3 py-2 focus:outline-none focus:border-warning"
                />
              </div>

              <div>
                <label className="block text-on-surface-variant font-medium mb-1">
                  Description (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Complete 10 bookings over the weekend for ₹500 bonus"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-surface-container-lowest border border-surface-container-high text-white rounded-lg px-3 py-2 focus:outline-none focus:border-warning"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-on-surface-variant font-medium mb-1">
                    Incentive Type
                  </label>
                  <select
                    value={formData.incentiveType}
                    onChange={(e) => setFormData({ ...formData, incentiveType: e.target.value })}
                    className="w-full bg-surface-container-lowest border border-surface-container-high text-white rounded-lg px-3 py-2 focus:outline-none focus:border-warning"
                  >
                    <option value="TRIP_COUNT">TRIP_COUNT</option>
                    <option value="EARNINGS_THRESHOLD">EARNINGS_THRESHOLD</option>
                    <option value="TIME_WINDOW">TIME_WINDOW</option>
                  </select>
                </div>

                <div>
                  <label className="block text-on-surface-variant font-medium mb-1">
                    Target Value
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.targetValue}
                    onChange={(e) => setFormData({ ...formData, targetValue: e.target.value })}
                    className="w-full bg-surface-container-lowest border border-surface-container-high text-white rounded-lg px-3 py-2 focus:outline-none focus:border-warning"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-on-surface-variant font-medium mb-1">
                    Reward Amount (₹)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.rewardAmount}
                    onChange={(e) => setFormData({ ...formData, rewardAmount: e.target.value })}
                    className="w-full bg-surface-container-lowest border border-surface-container-high text-white rounded-lg px-3 py-2 focus:outline-none focus:border-warning"
                  />
                </div>

                <div>
                  <label className="block text-on-surface-variant font-medium mb-1">
                    Start Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.startAt}
                    onChange={(e) => setFormData({ ...formData, startAt: e.target.value })}
                    className="w-full bg-surface-container-lowest border border-surface-container-high text-white rounded-lg px-3 py-2 focus:outline-none focus:border-warning"
                  />
                </div>
              </div>

              <div>
                <label className="block text-on-surface-variant font-medium mb-1">
                  End Date & Time
                </label>
                <input
                  type="datetime-local"
                  required
                  value={formData.endAt}
                  onChange={(e) => setFormData({ ...formData, endAt: e.target.value })}
                  className="w-full bg-surface-container-lowest border border-surface-container-high text-white rounded-lg px-3 py-2 focus:outline-none focus:border-warning"
                />
              </div>

              <div className="pt-3 flex justify-end gap-3 border-t border-surface-container-high">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-surface-container-high text-on-surface-variant rounded-lg hover:bg-border font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-warning hover:bg-on-warning-container text-surface-container-lowest rounded-lg font-bold"
                >
                  {submitting ? 'Creating...' : 'Create Campaign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
