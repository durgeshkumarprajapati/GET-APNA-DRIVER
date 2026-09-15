'use client';

import { useEffect, useState } from 'react';
import { CustomerLayout } from '@/components/customer-layout';
import { PageHeader } from '@/components/ui/page-header';
import { LoadingState } from '@/components/ui/loading-state';
import { EmptyState } from '@/components/ui/empty-state';
import { PromotionStatusBadge } from '@/components/ui/transaction-status-badge';
import { DiscountLabel } from '@/components/ui/discount-label';
import { useTranslation } from '@/i18n/context';

interface CustomerOffer {
  id: string;
  code: string | null;
  name: string;
  description: string | null;
  discountType: string;
  discountValue: string;
  maxDiscountAmount: string | null;
  minBookingValue: string | null;
  firstRideOnly: boolean;
  status: string;
  isExpired: boolean;
  endsAt: string | null;
  usedByCustomerCount: number;
}

interface OffersResponse {
  available: CustomerOffer[];
  used: CustomerOffer[];
  expired: CustomerOffer[];
}

function OfferCard({ offer }: { offer: CustomerOffer }) {
  const { t, formatCurrency, formatDate } = useTranslation();
  const [copied, setCopied] = useState(false);

  return (
    <div className="p-5 rounded-xl bg-[#181c24] border border-[#262a33] flex flex-col justify-between gap-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        {offer.code ? (
          <span className="font-mono text-sm px-3 py-1 rounded bg-[#25a475] text-[#00311f] font-bold">
            {offer.code}
          </span>
        ) : (
          <span className="font-mono text-xs px-3 py-1 rounded bg-[#262a33] text-[#68dba9] font-bold uppercase">
            {t('customer.offers.autoApplied')}
          </span>
        )}
        <PromotionStatusBadge status={offer.status} isExpired={offer.isExpired} />
      </div>

      <div>
        <h3 className="font-bold text-base text-[#dfe2ee] font-['Space_Grotesk']">{offer.name}</h3>
        {offer.description && <p className="text-xs text-[#bccac0] mt-1">{offer.description}</p>}
        <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-wider">
          <span className="px-2 py-0.5 rounded bg-[#262a33] text-[#68dba9]">
            <DiscountLabel
              discountType={offer.discountType}
              discountValue={offer.discountValue}
              maxDiscountAmount={offer.maxDiscountAmount}
            />
          </span>
          {offer.minBookingValue && (
            <span className="px-2 py-0.5 rounded bg-[#262a33] text-[#87948b]">
              {t('customer.offers.minFare', {
                amount: formatCurrency(Number(offer.minBookingValue)),
              })}
            </span>
          )}
          {offer.firstRideOnly && (
            <span className="px-2 py-0.5 rounded bg-[#262a33] text-[#87948b]">
              {t('customer.offers.firstRideOnly')}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-[#262a33]">
        <span className="font-mono text-[10px] text-[#87948b]">
          {offer.endsAt
            ? t('customer.offers.validTill', { date: formatDate(offer.endsAt) })
            : t('customer.offers.noExpiry')}
        </span>
        {offer.code ? (
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard?.writeText(offer.code as string);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className="px-3 py-1.5 rounded-lg bg-[#262a33] hover:bg-[#31353e] text-[#dfe2ee] font-mono text-xs font-bold transition-all"
          >
            {copied ? t('customer.offers.copied') : t('customer.offers.copyCode')}
          </button>
        ) : (
          <span className="text-[10px] text-[#87948b]">
            {t('customer.offers.autoAppliedAtCheckout')}
          </span>
        )}
      </div>
    </div>
  );
}

export default function CustomerOffersPage() {
  const { t } = useTranslation();
  const [offers, setOffers] = useState<OffersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const res = await fetch('/api/customer/offers');
        if (!isMounted) return;
        if (res.ok) {
          setOffers(await res.json());
          setError(null);
        } else {
          setError(t('customer.offers.loadFailed'));
        }
      } catch (err) {
        if (isMounted)
          setError(err instanceof Error ? err.message : t('customer.offers.loadFailed'));
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    void load();
    return () => {
      isMounted = false;
    };
  }, [t]);

  return (
    <CustomerLayout>
      <div className="flex flex-col w-full gap-6">
        <PageHeader
          eyebrow={t('customer.offers.eyebrow')}
          title={t('customer.offers.title')}
          subtitle={t('customer.offers.subtitle')}
        />

        {error && (
          <div className="p-4 rounded-xl border border-[#93000a] bg-[#93000a]/20 text-[#ffb4ab] text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <LoadingState message={t('customer.offers.loadingMessage')} />
        ) : (
          offers && (
            <>
              <section className="flex flex-col gap-3">
                <h2 className="text-base font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                  {t('customer.offers.availableOffers')}
                </h2>
                {offers.available.length === 0 ? (
                  <EmptyState icon="confirmation_number" message={t('customer.offers.noOffers')} />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {offers.available.map((o) => (
                      <OfferCard key={o.id} offer={o} />
                    ))}
                  </div>
                )}
              </section>

              {offers.used.length > 0 && (
                <section className="flex flex-col gap-3">
                  <h2 className="text-base font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                    {t('customer.offers.usedOffers')}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {offers.used.map((o) => (
                      <OfferCard key={o.id} offer={o} />
                    ))}
                  </div>
                </section>
              )}

              {offers.expired.length > 0 && (
                <section className="flex flex-col gap-3">
                  <h2 className="text-base font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                    {t('customer.offers.expiredOffers')}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {offers.expired.map((o) => (
                      <OfferCard key={o.id} offer={o} />
                    ))}
                  </div>
                </section>
              )}
            </>
          )
        )}
      </div>
    </CustomerLayout>
  );
}
