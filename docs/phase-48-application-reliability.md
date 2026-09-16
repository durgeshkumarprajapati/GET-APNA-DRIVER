# Phase 48 — Production Application Reliability & Admin Hardening

## Overview
Phase 48 resolves critical production navigation and admin console reliability issues in **GET APNA DRIVER**:
1. Admin Sidebar Scroll Position Reset during navigation
2. Customer Loyalty & Rewards Console API error / 500 and dual-state display bug
3. Commission Matrix Console API error / 500 and unauthoritative fallback rendering

---

## 1. Admin Sidebar Scroll Position Persistence

### Root Cause
The `<aside>` element containing the admin sidebar navigation menu did not persist its `scrollTop` offset when switching routes. Additionally, an unconditional scroll-to-active calculation forced the container to reset `scrollTop` to `0` whenever route transitions occurred.

### Resolution
- Attached `sidebarRef` to the `<aside>` scroll container in `src/components/admin-layout.tsx`.
- Implemented `sessionStorage` persistence (`gad-admin-sidebar-scroll`) capturing `scrollTop` on scroll events and restoring it on mount/route changes.
- Added smart active-item auto-scroll logic (`data-sidebar-active="true"`): auto-scroll triggers only when the active link is outside the visible viewport of the sidebar container, preventing unwanted scroll resets.

---

## 2. Customer Loyalty & Rewards Admin Console Hardening

### Root Cause
- Calling `GET /api/admin/loyalty/rewards` delegated to `listCustomerLoyaltyRewards("")` which invoked `getOrCreateLoyaltyAccount("")`. Passing an empty customer ID string failed database constraint validation, throwing HTTP 500 errors.
- The API response DTO wrapped rewards under `{ rewards: [...] }` whereas the frontend expected `{ data: [...] }`, causing response parsing failures.
- `src/app/admin/customer-loyalty/page.tsx` rendered the empty state table whenever `rewards.length === 0`, even when an API `error` state was active, displaying "Failed to load rewards" and "0 rewards configured" simultaneously.

### Resolution
- Added `listAllLoyaltyRewardsForAdmin()` to `src/modules/loyalty/application/services/loyalty-reward-service.ts` to retrieve catalog rewards directly from Prisma without dummy customer accounts.
- Updated `GET /api/admin/loyalty/rewards` to call `listAllLoyaltyRewardsForAdmin()` and return `{ success: true, rewards, data: rewards }`.
- Hardened manual adjustment handling in `POST /api/admin/loyalty/adjustments` to infer point addition/deduction direction if omitted.
- Refactored `src/app/admin/customer-loyalty/page.tsx` to cleanly isolate `loading`, `error` (with Retry action button), and `empty` states.

---

## 3. Commission Matrix Console Hardening

### Root Cause
- When configuration values were served from Redis JSON cache, date fields like `updatedAt` were parsed as string primitives instead of `Date` instances. Calling `config.updatedAt.toISOString()` threw `TypeError: config.updatedAt.toISOString is not a function`, leading to HTTP 500 errors.
- On API failure, `src/app/admin/commission-matrix/page.tsx` retained a hardcoded fallback value (`20.00%`), presenting unauthoritative business data to administrators while simultaneously displaying error alerts.

### Resolution
- Fixed `getCommissionPolicy()` in `src/modules/finance/application/services/commission-policy-service.ts` to safely convert `updatedAt` and `createdAt` whether returned as `Date` objects or ISO strings.
- Wrapped history fetching in `GET /api/admin/commission` with independent fallback handling.
- Updated `src/app/admin/commission-matrix/page.tsx` to set `policy` state to `null` on fetch error and display a Retry action button without rendering unauthoritative fallback values.

---

## 4. Test Coverage
- `tests/unit/admin/sidebar-scroll.spec.ts`: Validates `sessionStorage` scroll position key persistence and viewport element bounds calculation.
- `tests/unit/loyalty/customer-loyalty-admin.spec.ts`: Validates `listAllLoyaltyRewardsForAdmin` fetching catalog rewards without customer context.
- `tests/unit/finance/commission-matrix-admin.spec.ts`: Validates safe Date/ISO parsing for Redis cached commission policies and error handling.
