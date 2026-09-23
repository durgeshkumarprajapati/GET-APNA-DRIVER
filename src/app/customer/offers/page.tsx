'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CustomerLayout } from '@/components/customer-layout';
import { PageHeader } from '@/components/ui/page-header';
import { EnhancedOfferCard } from '@/components/ui/enhanced-offer-card';
import { CUSTOMER_OFFERS_CATALOG } from '@/modules/promotion/domain/offers-catalog';
import { useTranslation } from '@/i18n/context';

interface LiveOffer {
  id: string;
  code: string | null;
  name: string;
  description: string | null;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: string;
  maxDiscountAmount: string | null;
  minBookingValue: string | null;
  firstRideOnly: boolean;
  status: string;
  isExpired: boolean;
  startsAt: string;
  endsAt: string | null;
  usedByCustomerCount: number;
  remainingUsesForCustomer: number | null;
}

interface OffersApiResponse {
  available: LiveOffer[];
  used: LiveOffer[];
  expired: LiveOffer[];
}

export default function CustomerOffersPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<
    'LIVE' | 'DISCOUNT' | 'GIFT_BOX' | 'SCRATCH_CARD' | 'USED' | 'EXPIRED'
  >('LIVE');
  const [liveOffers, setLiveOffers] = useState<OffersApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [claimedIds, setClaimedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let isMounted = true;
    fetch('/api/customer/offers')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: OffersApiResponse | null) => {
        if (!isMounted) return;
        if (data) {
          setLiveOffers(data);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleClaimOffer = async (promotionId: string) => {
    try {
      const res = await fetch(`/api/customer/offers/${promotionId}/claim`, { method: 'POST' });
      if (res.ok) {
        setClaimedIds((prev) => new Set(prev).add(promotionId));
      }
    } catch {
      // Ignore
    }
  };

  const filteredCatalogOffers = CUSTOMER_OFFERS_CATALOG.filter((offer) => {
    if (activeTab === 'LIVE') return true;
    if (activeTab === 'DISCOUNT') return offer.category === 'DISCOUNT';
    if (activeTab === 'SCRATCH_CARD') return offer.category === 'SCRATCH_CARD';
    if (activeTab === 'GIFT_BOX') return offer.category === 'GIFT_BOX';
    return false;
  });

  return (
    <CustomerLayout>
      <div className="flex flex-col w-full gap-5 text-[#dfe2ee]">
        <PageHeader
          eyebrow={t('customer.offers.eyebrow', { defaultValue: 'REWARDS & SAVINGS' })}
          title={t('customer.offers.title', {
            defaultValue: 'Exclusive Customer Offers & Coupons',
          })}
          subtitle={t('customer.offers.subtitle', {
            defaultValue:
              'Claim booking discounts, reveal lucky scratch cards, and unlock festive surprise gift boxes.',
          })}
        />

        {/* Category Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-xl bg-[#181c24] border border-[#262a33]">
          <button
            type="button"
            onClick={() => setActiveTab('LIVE')}
            className={`min-h-[40px] px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#68dba9] ${
              activeTab === 'LIVE'
                ? 'bg-[#25a475] active:bg-[#1f8a63] text-[#00311f] shadow-md'
                : 'text-[#bccac0] hover:bg-[#262a33] active:bg-[#31353e] hover:text-[#dfe2ee]'
            }`}
          >
            🔥 Active Coupons ({liveOffers?.available.length ?? 0})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('DISCOUNT')}
            className={`min-h-[40px] px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#68dba9] ${
              activeTab === 'DISCOUNT'
                ? 'bg-[#25a475] active:bg-[#1f8a63] text-[#00311f] shadow-md'
                : 'text-[#bccac0] hover:bg-[#262a33] active:bg-[#31353e] hover:text-[#dfe2ee]'
            }`}
          >
            Discount Catalog
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('USED')}
            className={`min-h-[40px] px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#68dba9] ${
              activeTab === 'USED'
                ? 'bg-[#25a475] active:bg-[#1f8a63] text-[#00311f] shadow-md'
                : 'text-[#bccac0] hover:bg-[#262a33] active:bg-[#31353e] hover:text-[#dfe2ee]'
            }`}
          >
            Redeemed ({liveOffers?.used.length ?? 0})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('EXPIRED')}
            className={`min-h-[40px] px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-400 ${
              activeTab === 'EXPIRED'
                ? 'bg-rose-950 active:bg-rose-900 text-rose-300 border border-rose-800'
                : 'text-[#bccac0] hover:bg-[#262a33] active:bg-[#31353e] hover:text-[#dfe2ee]'
            }`}
          >
            Expired ({liveOffers?.expired.length ?? 0})
          </button>
        </div>

        {loading && <p className="text-xs text-[#87948b] py-4">Loading active offers & coupons…</p>}

        {/* Live Active Database Promotions Section */}
        {activeTab === 'LIVE' && liveOffers && liveOffers.available.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-bold text-[#dfe2ee] font-['Space_Grotesk'] flex items-center gap-2">
              <span className="material-symbols-outlined text-[#68dba9] text-base">
                local_offer
              </span>
              <span>Available Booking Coupons</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in-up">
              {liveOffers.available.map((promo) => (
                <div
                  key={promo.id}
                  className="p-5 rounded-2xl bg-[#181c24] border border-[#25a475]/40 flex flex-col justify-between gap-4 shadow-lg"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="font-mono text-xs font-extrabold px-3 py-1 rounded bg-[#25a475] text-[#00311f]">
                        {promo.code ?? 'AUTOMATIC'}
                      </span>
                      {promo.firstRideOnly && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          First Booking Only
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-[#dfe2ee]">{promo.name}</h3>
                    {promo.description && (
                      <p className="text-xs text-[#a2abb3] mt-1">{promo.description}</p>
                    )}
                    <div className="mt-3 p-3 rounded-xl bg-[#11141a] border border-[#262a33] space-y-1 text-xs">
                      <div className="flex justify-between text-[#a2abb3]">
                        <span>Discount:</span>
                        <strong className="text-[#68dba9]">
                          {promo.discountType === 'PERCENTAGE'
                            ? `${Number(promo.discountValue)}% OFF`
                            : `₹${Number(promo.discountValue)} OFF`}
                        </strong>
                      </div>
                      {promo.minBookingValue && (
                        <div className="flex justify-between text-[#a2abb3]">
                          <span>Min. Fare:</span>
                          <span>₹{Number(promo.minBookingValue)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-[#262a33]">
                    {promo.code && (
                      <button
                        type="button"
                        onClick={() => handleCopyCode(promo.code!)}
                        className="min-h-[40px] flex-1 py-2 rounded-lg bg-[#262a33] hover:bg-[#323742] active:bg-[#3d4a42] text-xs font-bold text-[#68dba9] border border-[#68dba9]/40 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#68dba9]"
                      >
                        {copiedCode === promo.code ? '✓ Copied!' : 'Copy Code'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleClaimOffer(promo.id)}
                      disabled={claimedIds.has(promo.id)}
                      className="min-h-[40px] flex-1 py-2 rounded-lg bg-[#25a475] hover:bg-[#68dba9] active:bg-[#1f8a63] text-[#00311f] text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#68dba9]"
                    >
                      {claimedIds.has(promo.id) ? '✓ Claimed' : 'Claim Offer'}
                    </button>
                    <Link
                      href="/bookings/new"
                      className="min-h-[40px] px-3 py-2 rounded-lg bg-[#11141a] hover:bg-[#262a33] active:bg-[#31353e] text-xs font-bold text-[#c0c7d4] border border-[#262a33] transition-colors flex items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#68dba9]"
                    >
                      Book →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Used / Redeemed Section */}
        {activeTab === 'USED' && liveOffers && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {liveOffers.used.length === 0 ? (
              <p className="text-xs text-[#87948b]">No redeemed coupons yet.</p>
            ) : (
              liveOffers.used.map((promo) => (
                <div
                  key={promo.id}
                  className="p-4 rounded-xl bg-[#181c24] border border-[#262a33] text-xs"
                >
                  <span className="font-mono text-xs font-bold text-[#87948b]">{promo.code}</span>
                  <h4 className="font-bold text-[#dfe2ee] mt-1">{promo.name}</h4>
                  <p className="text-[11px] text-[#68dba9] mt-0.5">Used by you</p>
                </div>
              ))
            )}
          </div>
        )}

        {/* Catalog Offers Grid */}
        {(activeTab === 'DISCOUNT' || activeTab === 'SCRATCH_CARD' || activeTab === 'GIFT_BOX') && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredCatalogOffers.map((offer) => (
              <EnhancedOfferCard key={offer.id} offer={offer} />
            ))}
          </div>
        )}
      </div>
    </CustomerLayout>
  );
}
