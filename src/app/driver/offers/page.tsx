'use client';

import { useState } from 'react';
import { DriverLayout } from '@/components/driver-layout';
import { PageHeader } from '@/components/ui/page-header';
import { EnhancedOfferCard } from '@/components/ui/enhanced-offer-card';
import { DRIVER_OFFERS_CATALOG } from '@/modules/promotion/domain/offers-catalog';
import { useTranslation } from '@/i18n/context';

export default function DriverOffersPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<
    'ALL' | 'DISCOUNT' | 'GIFT_BOX' | 'SCRATCH_CARD' | 'LOCKED'
  >('ALL');

  const filteredOffers = DRIVER_OFFERS_CATALOG.filter((offer) => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'LOCKED') return offer.isLocked;
    return offer.category === activeTab;
  });

  return (
    <DriverLayout>
      <div className="flex flex-col w-full gap-3.5 text-[#dfe2ee]">
        <PageHeader
          eyebrow={t('driver.offers.eyebrow', { defaultValue: 'PARTNER INCENTIVES & PERKS' })}
          title={t('driver.offers.title', {
            defaultValue: 'Driver Offers, Bonus Vouchers & Rewards',
          })}
          subtitle={t('driver.offers.subtitle', {
            defaultValue:
              'Earn shift bonuses, unlock monthly milestone gift boxes, and scratch weekly reliability cards.',
          })}
        />

        {/* Category Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-[#181c24] border border-[#262a33]">
          <button
            type="button"
            onClick={() => setActiveTab('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'ALL'
                ? 'bg-[#25a475] text-[#00311f] shadow-md'
                : 'text-[#bccac0] hover:bg-[#262a33] hover:text-[#dfe2ee]'
            }`}
          >
            All Driver Offers ({DRIVER_OFFERS_CATALOG.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('DISCOUNT')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'DISCOUNT'
                ? 'bg-[#25a475] text-[#00311f] shadow-md'
                : 'text-[#bccac0] hover:bg-[#262a33] hover:text-[#dfe2ee]'
            }`}
          >
            Shift & Fuel Subsidies
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('SCRATCH_CARD')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'SCRATCH_CARD'
                ? 'bg-[#25a475] text-[#00311f] shadow-md'
                : 'text-[#bccac0] hover:bg-[#262a33] hover:text-[#dfe2ee]'
            }`}
          >
            Reliability Scratch Cards
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('GIFT_BOX')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'GIFT_BOX'
                ? 'bg-[#25a475] text-[#00311f] shadow-md'
                : 'text-[#bccac0] hover:bg-[#262a33] hover:text-[#dfe2ee]'
            }`}
          >
            Milestone Gift Boxes
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('LOCKED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'LOCKED'
                ? 'bg-rose-950 text-rose-300 border border-rose-800'
                : 'text-[#bccac0] hover:bg-[#262a33] hover:text-[#dfe2ee]'
            }`}
          >
            🔒 Locked Perks ({DRIVER_OFFERS_CATALOG.filter((o) => o.isLocked).length})
          </button>
        </div>

        {/* Offers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredOffers.map((offer) => (
            <EnhancedOfferCard key={offer.id} offer={offer} />
          ))}
        </div>
      </div>
    </DriverLayout>
  );
}
