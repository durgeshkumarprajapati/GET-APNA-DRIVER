'use client';

import { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/components/admin-layout';

interface CampaignItem {
  id: string;
  title: string;
  body: string;
  targetAudience: string;
  status: string;
  totalTargeted: number;
  totalSent: number;
  totalFailed: number;
  createdAt: string;
}

export default function AdminNotificationCampaignsPage() {
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [targetAudience, setTargetAudience] = useState<string>('ALL_CUSTOMERS');
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setNotificationMsg(msg);
    setTimeout(() => setNotificationMsg(null), 4000);
  };

  const fetchCampaigns = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/notifications/campaigns');
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data.items ?? []);
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      if (isMounted) {
        await fetchCampaigns();
      }
    };
    void load();
    return () => {
      isMounted = false;
    };
  }, [fetchCampaigns]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !body) {
      showToast('Title and body are required');
      return;
    }

    try {
      const res = await fetch('/api/admin/notifications/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          body,
          targetAudience,
        }),
      });

      if (res.ok) {
        showToast('Campaign created successfully in Draft status!');
        setShowCreateModal(false);
        setTitle('');
        setBody('');
        void fetchCampaigns();
      } else {
        showToast('Failed to create campaign');
      }
    } catch {
      showToast('Network error creating campaign');
    }
  };

  const handleSend = async (campaignId: string) => {
    try {
      const res = await fetch(`/api/admin/notifications/campaigns/${campaignId}/send`, {
        method: 'POST',
      });

      if (res.ok) {
        showToast('Campaign send triggered! Outbox worker processing dispatch...');
        void fetchCampaigns();
      } else {
        showToast('Failed to send campaign');
      }
    } catch {
      showToast('Error sending campaign');
    }
  };

  const handleCancel = async (campaignId: string) => {
    try {
      const res = await fetch(`/api/admin/notifications/campaigns/${campaignId}/cancel`, {
        method: 'POST',
      });

      if (res.ok) {
        showToast('Campaign cancelled');
        fetchCampaigns();
      } else {
        showToast('Failed to cancel campaign');
      }
    } catch {
      showToast('Error canceling campaign');
    }
  };

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6 w-full">
        {notificationMsg && (
          <div className="fixed top-20 right-8 z-50 bg-[#25a475] text-[#00311f] px-4 py-3 rounded-lg shadow-2xl font-semibold text-sm flex items-center gap-2 border border-[#68dba9]">
            <span className="material-symbols-outlined">check_circle</span>
            <span>{notificationMsg}</span>
          </div>
        )}

        {/* HEADER BAR */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#0a0e16] p-4 rounded-xl border border-[#262a33]">
          <div>
            <div className="flex items-center gap-2 font-mono text-xs text-[#68dba9]">
              <span className="material-symbols-outlined text-[16px]">campaign</span>
              <span>ADMIN BROADCAST ENGINE</span>
            </div>
            <h1 className="text-xl font-bold text-[#dfe2ee] font-['Space_Grotesk'] tracking-tight mt-1">
              Notification Campaigns &amp; Broadcast Center
            </h1>
            <p className="text-xs text-[#87948b] mt-0.5">
              Asynchronous broadcast notification campaigns for customers, drivers, and custom
              segments.
            </p>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-[#25a475] hover:bg-[#68dba9] text-[#00311f] font-bold text-xs py-2.5 px-4 rounded-xl shadow-xl flex items-center gap-1.5 transition-all font-['Space_Grotesk']"
          >
            <span className="material-symbols-outlined text-[18px]">add_alert</span> Create Campaign
          </button>
        </div>

        {/* CAMPAIGN LIST TABLE */}
        <div className="bg-[#0a0e16] rounded-xl border border-[#262a33] p-5 shadow-xl flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-[#dfe2ee] font-['Space_Grotesk']">
              Campaign History &amp; Delivery Stats
            </h3>
            <button
              onClick={fetchCampaigns}
              className="text-xs font-mono text-[#68dba9] hover:underline flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[14px]">refresh</span> Refresh
            </button>
          </div>

          <div className="overflow-x-auto w-full border border-[#262a33] rounded-lg">
            <table className="w-full text-left font-sans text-xs border-collapse">
              <thead>
                <tr className="bg-[#181c24] text-[#87948b] font-['Space_Grotesk'] uppercase tracking-wider border-b border-[#262a33]">
                  <th className="py-3 px-4">Campaign Title</th>
                  <th className="py-3 px-4">Target Audience</th>
                  <th className="py-3 px-4">Targeted</th>
                  <th className="py-3 px-4">Sent / Failed</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262a33] font-mono">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[#87948b]">
                      Loading campaigns...
                    </td>
                  </tr>
                ) : campaigns.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[#87948b]">
                      No campaigns created yet. Click &quot;Create Campaign&quot; above to launch a
                      broadcast.
                    </td>
                  </tr>
                ) : (
                  campaigns.map((c) => (
                    <tr key={c.id} className="hover:bg-[#181c24]/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-[#dfe2ee]">{c.title}</div>
                        <div className="text-[10px] text-[#87948b] truncate max-w-xs">{c.body}</div>
                      </td>
                      <td className="py-3 px-4 text-[#b4c5ff]">{c.targetAudience}</td>
                      <td className="py-3 px-4 text-[#dfe2ee]">{c.totalTargeted}</td>
                      <td className="py-3 px-4">
                        <span className="text-[#68dba9]">{c.totalSent}</span> /{' '}
                        <span className="text-[#ffb4ab]">{c.totalFailed}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded font-bold text-[10px] border ${
                            c.status === 'COMPLETED'
                              ? 'bg-[#25a475]/20 text-[#68dba9] border-[#25a475]'
                              : c.status === 'PROCESSING'
                                ? 'bg-[#0053db]/20 text-[#b4c5ff] border-[#0053db]'
                                : c.status === 'CANCELLED'
                                  ? 'bg-[#93000a]/20 text-[#ffb4ab] border-[#93000a]'
                                  : 'bg-[#181c24] text-[#dfe2ee] border-[#262a33]'
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {c.status === 'DRAFT' || c.status === 'SCHEDULED' ? (
                            <>
                              <button
                                onClick={() => handleSend(c.id)}
                                className="px-2.5 py-1 rounded bg-[#25a475] hover:bg-[#68dba9] text-[#00311f] font-bold text-[11px]"
                              >
                                Send
                              </button>
                              <button
                                onClick={() => handleCancel(c.id)}
                                className="px-2.5 py-1 rounded bg-[#93000a]/30 text-[#ffb4ab] hover:bg-[#93000a] text-[11px]"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <span className="text-[10px] text-[#87948b]">--</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* CREATE CAMPAIGN MODAL */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-[#0a0e16] border border-[#262a33] rounded-2xl p-6 w-full max-w-lg shadow-2xl flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-[#262a33] pb-3">
                <h3 className="text-lg font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                  Create Notification Campaign
                </h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-[#87948b] hover:text-[#dfe2ee]"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <form onSubmit={handleCreate} className="flex flex-col gap-4 text-xs font-mono">
                <div>
                  <label className="text-[#87948b] block mb-1">Campaign Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Special Weekend Surge Offer!"
                    className="w-full h-9 px-3 rounded-lg bg-[#181c24] border border-[#262a33] text-[#dfe2ee] placeholder:text-[#87948b]"
                    required
                  />
                </div>

                <div>
                  <label className="text-[#87948b] block mb-1">Notification Body</label>
                  <textarea
                    rows={3}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="e.g. Book your chauffeur ride this weekend and get 15% wallet cashback."
                    className="w-full p-3 rounded-lg bg-[#181c24] border border-[#262a33] text-[#dfe2ee] placeholder:text-[#87948b]"
                    required
                  />
                </div>

                <div>
                  <label className="text-[#87948b] block mb-1">Target Audience</label>
                  <select
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg bg-[#181c24] border border-[#262a33] text-[#dfe2ee]"
                  >
                    <option value="ALL_CUSTOMERS">All Customers</option>
                    <option value="ALL_DRIVERS">All Drivers</option>
                    <option value="ALL_USERS">All Platform Users</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#262a33]">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 rounded-lg bg-[#181c24] text-[#dfe2ee] border border-[#262a33]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-[#25a475] hover:bg-[#68dba9] text-[#00311f] font-bold font-['Space_Grotesk']"
                  >
                    Save Draft
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
