'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { CampaignSignalCard } from '@/components/marketplace/CampaignSignalCard';
import { CampaignSignalCardDTO } from '@/modules/marketplace-intelligence/domain/campaign-signals-service';

interface CampaignSignalsResponse {
  cards: CampaignSignalCardDTO[];
}

export default function AdminCampaignSignalsPage() {
  const [data, setData] = useState<CampaignSignalsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/marketplace-intelligence/campaigns?range=30d');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Campaigns fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/admin/marketplace-intelligence/campaigns?range=30d');
        if (res.ok && active) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        console.error('Campaigns fetch error:', err);
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <Link
          href="/admin/marketplace-intelligence"
          className="inline-flex items-center text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <span className="material-symbols-outlined text-sm mr-1">arrow_back</span> Back to Console
        </Link>
        <button
          onClick={() => void fetchCampaigns()}
          className="p-2 rounded-lg bg-slate-900 text-slate-300 hover:text-white border border-slate-800 flex items-center justify-center"
        >
          <span className={`material-symbols-outlined text-base ${loading ? 'animate-spin' : ''}`}>
            refresh
          </span>
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-6">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-2xl text-purple-400">auto_awesome</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Campaign & Engagement Signals</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Observed demand correlation & usage signals across promotions, referral 2.0, rewards &
              scratch cards
            </p>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Loading campaign signals...</div>
        ) : data ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {data.cards.map((card: CampaignSignalCardDTO) => (
              <CampaignSignalCard key={card.campaignId} signal={card} />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
