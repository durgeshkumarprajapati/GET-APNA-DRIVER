'use client';

import Link from 'next/link';

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
 * Off-canvas mobile navigation shared by AdminLayout, CustomerLayout, and
 * DriverLayout — all three previously had only a fixed, always-visible
 * desktop sidebar with no fallback below `md`, making the app unusable on
 * phones. Reused rather than reimplemented per-layout since the three nav
 * shapes (label + items[{href,label,icon,badge?}]) are already identical.
 * Desktop (`md:` and up) behavior in each layout is untouched — this only
 * renders below `md` alongside a hamburger button in each layout's header.
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
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] md:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Navigation menu"
    >
      <button
        type="button"
        aria-label="Close navigation menu"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="absolute left-0 top-0 h-full w-72 max-w-[85vw] bg-[#0a0e16] border-r border-[#262a33] shadow-2xl flex flex-col overflow-y-auto">
        <div className="h-16 px-4 flex items-center justify-between gap-2 border-b border-[#262a33] shrink-0">
          <Link href={brandHref} onClick={onClose} className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded bg-[#25a475] flex items-center justify-center text-[#00311f] font-bold shrink-0">
              <span className="material-symbols-outlined text-xl">local_taxi</span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-sm text-[#dfe2ee] tracking-tight leading-none font-['Space_Grotesk'] truncate">
                {brandLabel}
              </span>
              {brandSubLabel && (
                <span className="text-[9px] font-bold text-[#68dba9] tracking-widest mt-0.5 uppercase font-['Space_Grotesk'] truncate">
                  {brandSubLabel}
                </span>
              )}
            </div>
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="p-2 rounded-lg text-[#bccac0] hover:text-[#dfe2ee] hover:bg-[#181c24] shrink-0"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-4">
          {navGroups.map((group) => (
            <div key={group.label} className="space-y-1">
              <span className="px-3 text-[10px] font-bold text-[#87948b] uppercase tracking-wider block font-['Space_Grotesk']">
                {group.label}
              </span>
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-lg transition-colors text-sm ${
                    isActive(item.href)
                      ? 'bg-[#25a475] text-[#00311f] font-bold'
                      : 'text-[#bccac0] hover:bg-[#262a33] hover:text-[#dfe2ee]'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                    <span>{item.label}</span>
                  </span>
                  {!!item.badge && (
                    <span className="px-1.5 py-0.5 rounded bg-[#93000a] text-[#ffdad6] font-mono text-[10px] font-bold">
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
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Open navigation menu"
      className="md:hidden p-2 -ml-2 rounded-lg text-[#bccac0] hover:text-[#dfe2ee] hover:bg-[#181c24] transition-colors"
    >
      <span className="material-symbols-outlined text-2xl">menu</span>
    </button>
  );
}
