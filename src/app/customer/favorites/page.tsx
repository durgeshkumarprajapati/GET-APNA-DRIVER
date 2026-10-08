'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { CustomerLayout } from '@/components/customer-layout';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingState } from '@/components/ui/loading-state';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useTranslation } from '@/i18n/context';

interface FavoriteDriver {
  favoriteId: string;
  driverProfileId: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  profileImageUrl: string | null;
  drivingExperienceYears: number;
  primaryServiceArea: string | null;
  ratingAverage: number;
  reviewCount: number;
  addedAt: string;
}

export default function CustomerFavoritesPage() {
  const { t } = useTranslation();
  const [favorites, setFavorites] = useState<FavoriteDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [driverToRemove, setDriverToRemove] = useState<FavoriteDriver | null>(null);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const res = await fetch('/api/customer/favorites');
        if (!res.ok) throw new Error('Failed to fetch favorite drivers.');
        const data = await res.json();
        if (isMounted) {
          setFavorites(data.favorites || []);
          setError(null);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Error loading favorites.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    void load();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleConfirmRemove = async () => {
    if (!driverToRemove) return;
    try {
      const res = await fetch(`/api/customer/favorites/${driverToRemove.driverProfileId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setFavorites((prev) =>
          prev.filter((f) => f.driverProfileId !== driverToRemove.driverProfileId),
        );
      }
    } catch {
      // Ignore
    } finally {
      setDriverToRemove(null);
    }
  };

  return (
    <CustomerLayout>
      <div className="flex flex-col w-full gap-6">
        <PageHeader
          eyebrow={t('customer.favorites.eyebrow')}
          title={t('customer.favorites.title')}
          subtitle={t('customer.favorites.subtitle')}
        />

        {/* LOADING STATE */}
        {loading && <LoadingState message="Loading favorite chauffeurs..." />}

        {/* ERROR STATE */}
        {error && !loading && (
          <div className="p-4 bg-red-950/40 border border-red-500/30 rounded-xl text-xs text-red-300 font-mono flex items-center justify-between">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                setFavorites([]);
              }}
              className="min-h-[40px] px-3 py-1 bg-red-900/60 rounded text-red-100 font-bold hover:bg-red-800 active:bg-red-950 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400"
            >
              Retry
            </button>
          </div>
        )}

        {/* EMPTY STATE */}
        {!loading && !error && favorites.length === 0 && (
          <EmptyState icon="star" message={t('customer.favorites.emptyMessage')} />
        )}

        {/* FAVORITE DRIVERS GRID */}
        {!loading && !error && favorites.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in-up">
            {favorites.map((fav) => {
              const driverName =
                fav.displayName ||
                (fav.firstName
                  ? `${fav.firstName} ${fav.lastName || ''}`.trim()
                  : 'Chauffeur Partner');

              return (
                <div
                  key={fav.favoriteId}
                  className="bg-surface-container p-5 rounded-2xl border border-border flex flex-col justify-between space-y-4 hover:border-primary/40 transition-all shadow-sm"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/20 border border-primary flex items-center justify-center font-bold text-base text-primary shrink-0 font-['Space_Grotesk']">
                      {driverName.charAt(0).toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-sm text-on-surface font-['Space_Grotesk'] truncate">
                          {driverName}
                        </h3>
                        <button
                          type="button"
                          onClick={() => setDriverToRemove(fav)}
                          className="min-w-[40px] min-h-[40px] flex items-center justify-center text-amber-500 hover:text-amber-600 rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500"
                          title={t('customer.favorites.removeFavorite')}
                        >
                          <span className="material-symbols-outlined text-lg">star</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-2 text-xs font-mono text-on-surface-variant mt-1">
                        <span className="text-amber-500 font-bold">
                          ★ {fav.ratingAverage.toFixed(1)}
                        </span>
                        <span>•</span>
                        <span>
                          {t('customer.favorites.experienceYears', {
                            years: fav.drivingExperienceYears,
                          })}
                        </span>
                      </div>

                      <div className="text-[11px] font-mono text-on-surface-variant mt-1 truncate">
                        Zone: {fav.primaryServiceArea || 'Delhi NCR'}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border flex items-center justify-between gap-2">
                    <Link
                      href={`/customer/find-driver?driverId=${fav.driverProfileId}`}
                      className="min-h-[44px] w-full py-2 bg-primary hover:bg-primary-hover active:bg-primary text-on-primary font-bold text-xs font-['Space_Grotesk'] rounded-xl text-center transition-colors flex items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                      {t('customer.favorites.bookDriver')}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* REMOVE CONFIRMATION DIALOG */}
        {driverToRemove && (
          <ConfirmDialog
            isOpen={!!driverToRemove}
            title={t('customer.favorites.confirmRemoveTitle')}
            message={t('customer.favorites.confirmRemoveMessage', {
              name: driverToRemove.displayName || driverToRemove.firstName || 'Driver',
            })}
            confirmLabel="Remove"
            cancelLabel="Cancel"
            danger={true}
            onConfirm={handleConfirmRemove}
            onCancel={() => setDriverToRemove(null)}
          />
        )}
      </div>
    </CustomerLayout>
  );
}
