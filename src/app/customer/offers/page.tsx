'use client';

import { useState } from 'react';
import { CustomerLayout } from '@/components/customer-layout';
import { PageHeader } from '@/components/ui/page-header';
import { EnhancedOfferCard } from '@/components/ui/enhanced-offer-card';
import { CUSTOMER_OFFERS_CATALOG } from '@/modules/promotion/domain/offers-catalog';
import { useTranslation } from '@/i18n/context';

export default function CustomerOffersPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<
    'ALL' | 'DISCOUNT' | 'GIFT_BOX' | 'SCRATCH_CARD' | 'LOCKED'
  >('ALL');

  const filteredOffers = CUSTOMER_OFFERS_CATALOG.filter((offer) => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'LOCKED') return offer.isLocked;
    return offer.category === activeTab;
  });

  return (
    <CustomerLayout>
      <div className="flex flex-col w-full gap-3.5">
        <PageHeader
          eyebrow={t('customer.offers.eyebrow', { defaultValue: 'REWARDS & SAVINGS' })}
          title={t('customer.offers.title', {
            defaultValue: 'Exclusive Customer Offers & Coupons',
          })}
          subtitle={t('customer.offers.subtitle', {
            defaultValue:
              'Claim ride discounts, reveal lucky scratch cards, and unlock festive surprise gift boxes.',
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
            All Offers ({CUSTOMER_OFFERS_CATALOG.length})
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
            Discount Coupons
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
            Scratch Cards
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
            Surprise Gift Boxes
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
            🔒 Locked Offers ({CUSTOMER_OFFERS_CATALOG.filter((o) => o.isLocked).length})
          </button>
        </div>

        {/* Offers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredOffers.map((offer) => (
            <EnhancedOfferCard key={offer.id} offer={offer} />
          ))}
        </div>
      </div>
    </CustomerLayout>
  );
}
