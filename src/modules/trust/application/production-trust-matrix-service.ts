import 'server-only';
import { prisma, type Db } from '@/shared/database/prisma';
import { TrustMatrixItem, ProductionTrustMatrixReport } from '../domain/trust-matrix-types';

const AUDITED_AT = '2026-10-07T00:00:00.000Z';

/**
 * Phase 101 — Production Trust Matrix Service
 *
 * This is a manually curated, partial registry of audited features — not
 * an automated scanner. There is no static-analysis or runtime
 * instrumentation anywhere in this codebase that could actually detect
 * "fabricated value" or "silent error swallowing" across the whole
 * platform; building one would be a new feature in its own right. A prior
 * version of this exact function claimed to do that automatically and
 * returned a hardcoded overallIntegrityScore: 100 / fabricatedMockValuesFound:
 * 0 regardless of actual code — which, since this feature's entire purpose
 * is catching fabricated data, was the single most ironic fabrication found
 * in the 2026-10-07 audit of Phases 101-115 (see commit history). It even
 * cited specific UI component names (BookingFormContainer, DriverOfferModal,
 * ReferralHubView, AiConciergeChatDrawer, CorporateBillingDashboard) that
 * don't exist anywhere in this codebase.
 *
 * Every entry below was hand-verified during that audit. Summary counts are
 * derived from the entries actually listed, not asserted independently of
 * them, and are scoped to this registry — they are not a claim about the
 * rest of the platform.
 */
export async function getProductionTrustMatrix(
  _db: Db = prisma,
): Promise<ProductionTrustMatrixReport> {
  const matrix: TrustMatrixItem[] = [
    {
      featureId: 'feat-booking-creation',
      featureName: 'Customer Booking Creation Flow',
      uiComponent: 'src/app/bookings/new/new-booking-client.tsx',
      apiRoute: 'POST /api/customer/bookings',
      serviceModule: 'booking-service.ts',
      dbTables: ['bookings', 'booking_logs', 'payments'],
      realResultStatus: 'VERIFIED_END_TO_END',
      dataIntegrityStatus: 'CANONICAL_VALIDATED',
      lastAuditedAt: AUDITED_AT,
    },
    {
      featureId: 'feat-driver-dispatch',
      featureName: 'Driver Dispatch & Assignment',
      uiComponent: 'src/app/driver/assignment-offers/page.tsx',
      apiRoute: 'POST /api/driver/assignment-offers/[attemptId]/accept',
      serviceModule: 'matching-service.ts',
      dbTables: ['booking_assignment_attempts', 'driver_profiles', 'bookings'],
      realResultStatus: 'VERIFIED_END_TO_END',
      dataIntegrityStatus: 'CANONICAL_VALIDATED',
      lastAuditedAt: AUDITED_AT,
    },
    {
      featureId: 'feat-referral-growth3',
      featureName: 'Referral 3.0 & Milestone Rewards',
      // No UI anywhere calls GET /api/customer/referrals/viral-hub — the
      // backend was fixed to be real this audit (it previously crashed on
      // every call: `referrerId` isn't a real column), but the capability
      // is not actually reachable by a customer yet.
      uiComponent: 'None yet — backend only',
      apiRoute: 'GET /api/customer/referrals/viral-hub',
      serviceModule: 'referral-growth3-service.ts',
      dbTables: ['user_referral_codes', 'referrals', 'customer_loyalty_accounts'],
      realResultStatus: 'UNSUPPORTED_EXPLICIT_NOTICE',
      dataIntegrityStatus: 'NO_MOCK_VALUES',
      lastAuditedAt: AUDITED_AT,
    },
    {
      featureId: 'feat-ai-concierge2',
      featureName: 'AI Booking Concierge 2.0',
      // No UI anywhere calls this route either. The service now explicitly
      // refuses to claim a booking was created (status: 'NOT_AVAILABLE')
      // rather than fabricating a confirmation, which is why this is
      // VERIFIED as honest about its own limits rather than as a complete
      // end-to-end booking capability.
      uiComponent: 'None yet — backend only',
      apiRoute: 'POST /api/customer/ai/concierge2/parse-and-validate',
      serviceModule: 'ai-concierge2-service.ts',
      dbTables: [],
      realResultStatus: 'UNSUPPORTED_EXPLICIT_NOTICE',
      dataIntegrityStatus: 'KNOWN_GAPS_DOCUMENTED',
      lastAuditedAt: AUDITED_AT,
    },
    {
      featureId: 'feat-corporate-billing',
      featureName: 'Corporate Expense & Policy Engine',
      // No UI anywhere calls these corporate analytics/billing/policy
      // routes. The backend had an IDOR (any corporate user could read
      // another org's data) and fabricated expense/billing figures, both
      // fixed this audit.
      uiComponent: 'None yet — backend only',
      apiRoute: 'GET /api/corporate/billing/consolidated-report',
      serviceModule: 'corporate-family-service.ts',
      dbTables: ['organizations', 'organization_travel_policies', 'tax_invoices'],
      realResultStatus: 'UNSUPPORTED_EXPLICIT_NOTICE',
      dataIntegrityStatus: 'NO_MOCK_VALUES',
      lastAuditedAt: AUDITED_AT,
    },
  ];

  const verifiedEndToEndCount = matrix.filter(
    (m) => m.realResultStatus === 'VERIFIED_END_TO_END',
  ).length;
  const unsupportedExplicitNoticeCount = matrix.filter(
    (m) => m.realResultStatus === 'UNSUPPORTED_EXPLICIT_NOTICE',
  ).length;

  return {
    overallIntegrityScore: Math.round((verifiedEndToEndCount / matrix.length) * 100),
    totalFeaturesAudited: matrix.length,
    verifiedEndToEndCount,
    unsupportedExplicitNoticeCount,
    // Scoped to this registry's entries, all of which were hand-verified —
    // not a claim that zero fabrication exists anywhere else in the
    // platform that hasn't been reviewed here.
    fabricatedMockValuesFound: 0,
    silentErrorSwallowingCount: 0,
    matrix,
    auditedAt: AUDITED_AT,
  };
}
