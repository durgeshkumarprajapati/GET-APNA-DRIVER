'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { OneTapReviewModal, type OneTapReviewParams } from './OneTapReviewModal';
import { useTranslation } from '@/i18n/context';

interface LocationDetail {
  address: string;
  label?: string | null;
  latitude: number;
  longitude: number;
}

interface SmartDefaults {
  pickupLocation: LocationDetail | null;
  dropoffLocation: LocationDetail | null;
  bookingType: string;
  vehicleCategory: string;
  paymentMethod: string;
  savedPersonId?: string | null;
  savedPersonName?: string | null;
  preferredDriverId?: string | null;
  preferredDriverName?: string | null;
  hasPreviousBookings: boolean;
}

interface QuickRebookCard {
  id: string;
  title: string;
  subtitle: string;
  bookingType: string;
  pickupLocation: LocationDetail;
  dropoffLocation: LocationDetail | null;
  vehicleCategory: string;
  serviceRecipientName?: string | null;
  savedPersonId?: string | null;
  preferredDriverId?: string | null;
  preferredDriverName?: string | null;
  estimatedFare: number;
}

export function SmartRebookingWidget() {
  const router = useRouter();
  const { formatCurrency } = useTranslation();

  const [defaults, setDefaults] = useState<SmartDefaults | null>(null);
  const [cards, setCards] = useState<QuickRebookCard[]>([]);
  const [loading, setLoading] = useState(true);

  // Review Modal State
  const [reviewParams, setReviewParams] = useState<OneTapReviewParams | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadSmartRebooking() {
      try {
        const res = await fetch('/api/customer/smart-rebooking');
        if (!res.ok) return;
        const data = await res.json();
        if (active && data.success) {
          setDefaults(data.defaults);
          setCards(data.quickRebookCards || []);
        }
      } catch {
        // Handled silently
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadSmartRebooking();
    return () => {
      active = false;
    };
  }, []);

  if (loading || (!defaults?.hasPreviousBookings && cards.length === 0)) {
    return null;
  }

  const handleOpenSmartDefaults = () => {
    if (!defaults?.pickupLocation) {
      router.push('/bookings/new');
      return;
    }

    setReviewParams({
      pickupLocation: defaults.pickupLocation,
      dropoffLocation: defaults.dropoffLocation,
      bookingType: defaults.bookingType || 'ONE_WAY',
      vehicleCategory: defaults.vehicleCategory || 'CAR',
      savedPersonId: defaults.savedPersonId,
      savedPersonName: defaults.savedPersonName,
      preferredDriverId: defaults.preferredDriverId,
      preferredDriverName: defaults.preferredDriverName,
      title: 'Smart Rebooking (Defaults)',
    });
    setIsModalOpen(true);
  };

  const handleOpenCard = (card: QuickRebookCard) => {
    setReviewParams({
      pickupLocation: card.pickupLocation,
      dropoffLocation: card.dropoffLocation,
      bookingType: card.bookingType,
      vehicleCategory: card.vehicleCategory,
      savedPersonId: card.savedPersonId,
      savedPersonName: card.serviceRecipientName,
      preferredDriverId: card.preferredDriverId,
      preferredDriverName: card.preferredDriverName,
      title: card.title,
    });
    setIsModalOpen(true);
  };

  return (
    <>
      <section className="bg-surface-container border border-primary/40 rounded-2xl p-5 shadow-xl space-y-4 animate-fade-in-up">
        {/* Widget Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/20 border border-primary flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-lg">bolt</span>
            </div>
            <div>
              <h2 className="text-sm font-bold text-on-surface font-['Space_Grotesk'] leading-tight">
                1-Tap Quick Booking &amp; Smart Rebooking
              </h2>
              <p className="text-[11px] text-on-surface-variant">
                Instant chauffeur booking pre-filled from your history, saved places &amp; people
              </p>
            </div>
          </div>

          {defaults?.pickupLocation && (
            <button
              type="button"
              onClick={handleOpenSmartDefaults}
              className="px-4 py-2 rounded-xl bg-primary hover:opacity-90 text-on-primary font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-md shrink-0 font-['Space_Grotesk']"
            >
              <span className="material-symbols-outlined text-sm">bolt</span>
              <span>1-Tap Rebook (Defaults)</span>
            </button>
          )}
        </div>

        {/* Smart Defaults Quick Summary Chips */}
        {defaults?.pickupLocation && (
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono bg-surface-container-lowest p-3 rounded-xl border border-border">
            <span className="text-on-surface-variant text-[10px] uppercase font-bold">Smart Defaults:</span>

            <span className="px-2.5 py-0.5 rounded bg-surface-container text-on-surface border border-border flex items-center gap-1">
              <span className="material-symbols-outlined text-xs text-primary">location_on</span>
              {defaults.pickupLocation.label || defaults.pickupLocation.address.split(',')[0]}
            </span>

            {defaults.dropoffLocation && (
              <span className="px-2.5 py-0.5 rounded bg-surface-container text-on-surface border border-border flex items-center gap-1">
                <span className="material-symbols-outlined text-xs text-amber-500">flag</span>
                {defaults.dropoffLocation.label || defaults.dropoffLocation.address.split(',')[0]}
              </span>
            )}

            <span className="px-2.5 py-0.5 rounded bg-surface-container text-primary border border-border">
              {defaults.vehicleCategory} ({defaults.bookingType})
            </span>

            {defaults.savedPersonName && (
              <span className="px-2.5 py-0.5 rounded bg-primary/10 text-primary border border-primary">
                For: {defaults.savedPersonName}
              </span>
            )}
          </div>
        )}

        {/* Quick Rebook Template Cards */}
        {cards.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
            {cards.map((card) => (
              <div
                key={card.id}
                className="p-3.5 rounded-xl bg-surface-container-lowest border border-border hover:border-primary/50 transition-all flex flex-col justify-between gap-3 group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase text-primary font-mono">
                      {card.bookingType}
                    </span>
                    <span className="text-[11px] font-bold font-mono text-on-surface">
                      {formatCurrency(card.estimatedFare)}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-on-surface group-hover:text-primary transition-colors truncate mt-1">
                    {card.title}
                  </h4>
                  <p className="text-[11px] text-on-surface-variant truncate mt-0.5">{card.subtitle}</p>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenCard(card)}
                  className="w-full py-1.5 px-3 rounded-lg bg-surface-container group-hover:bg-primary text-on-surface group-hover:text-on-primary text-xs font-bold text-center transition-colors border border-border group-hover:border-primary flex items-center justify-center gap-1 font-['Space_Grotesk']"
                >
                  <span className="material-symbols-outlined text-sm">bolt</span>
                  1-Tap Rebook
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Review Modal */}
      <OneTapReviewModal
        params={reviewParams}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setReviewParams(null);
        }}
      />
    </>
  );
}

