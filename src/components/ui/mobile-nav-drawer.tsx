'use client';

import Link from 'next/link';
import { useTranslation } from '@/i18n/context';

export interface MobileNavItem {
  href: string;
  label: string;
  icon: string;
  badge?: number;
}

export interface MobileNavGroup {
  label: string;
  items: MobileNavItem[];
}

interface MobileNavDrawerProps {
  open: boolean;
  onClose: () => void;
  navGroups: MobileNavGroup[];
  isActive: (href: string) => boolean;
  brandLabel: string;
  brandHref: string;
  brandSubLabel?: string;
}

/**
 * Off-canvas mobile navigation shared by layouts below `md`.
 */
export function MobileNavDrawer({
  open,
  onClose,
  navGroups,
  isActive,
  brandLabel,
  brandHref,
  brandSubLabel,
}: MobileNavDrawerProps) {
  const { t } = useTranslation();

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] md:hidden"
      role="dialog"
      aria-modal="true"
      aria-label={t('common.labels.navigationMenu')}
    >
      <button
        type="button"
        aria-label={t('common.labels.closeNavigationMenu')}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div className="absolute left-0 top-0 h-full w-72 max-w-[85vw] bg-surface-container-lowest border-r border-border shadow-2xl flex flex-col overflow-y-auto animate-drawer-slide-in">
        <div className="h-16 px-4 flex items-center justify-between gap-2 border-b border-border shrink-0">
          <Link href={brandHref} onClick={onClose} className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-on-primary font-bold shrink-0">
              <span className="material-symbols-outlined text-xl">local_taxi</span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-sm text-on-surface tracking-tight leading-none font-['Space_Grotesk'] truncate">
                {brandLabel}
              </span>
              {brandSubLabel && (
                <span className="text-[9px] font-bold text-primary tracking-widest mt-0.5 uppercase font-['Space_Grotesk'] truncate">
                  {brandSubLabel}
                </span>
              )}
            </div>
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.labels.closeNavigationMenu')}
            className="p-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high shrink-0"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-4">
          {navGroups.map((group) => (
            <div key={group.label} className="space-y-1">
              <span className="px-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block font-['Space_Grotesk']">
                {group.label}
              </span>
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-lg transition-colors text-sm ${
                    isActive(item.href)
                      ? 'bg-primary text-on-primary font-bold'
                      : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                    <span>{item.label}</span>
                  </span>
                  {!!item.badge && (
                    <span className="px-1.5 py-0.5 rounded bg-red-600 text-white font-mono text-[10px] font-bold">
                      {item.badge}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          ))}
        </nav>
      </div>
    </div>
  );
}

/** Shared hamburger trigger button — only rendered below `md` in each layout's header. */
export function MobileNavTrigger({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={t('common.labels.openNavigationMenu')}
      className="md:hidden p-2 -ml-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
    >
      <span className="material-symbols-outlined text-2xl">menu</span>
    </button>
  );
}

