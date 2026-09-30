import 'server-only';
import { prisma, type Db } from '@/shared/database/prisma';
import { logger } from '@/shared/logging/logger';
import { recordAuditLog } from '@/shared/audit/audit-service';
import { collectOperationsSignals } from './operations-signal-service';
import { getCapacityForecastSummary } from './capacity-forecast-service';
import type { OperationsDecision, OperationsDecisionStatus } from '../domain/operations-types';

// In-memory decision cache & deduplication store for high-performance decision lookup
const memoryDecisionStore = new Map<string, OperationsDecision>();

/**
 * Generates a deterministic fingerprint for decision deduplication.
 */
export function generateDecisionFingerprint(
  type: string,
  zoneId?: string,
  timeBucket = Math.floor(Date.now() / (5 * 60 * 1000)), // 5-minute time bucket
): string {
  return `${zoneId || 'GLOBAL'}:${type}:${timeBucket}`;
}

/**
 * OperationsDecisionService evaluates deterministic operational rules against aggregated signals,
 * generating actionable, explainable decision records with evidence and recommended actions.
 */
export async function evaluateOperationsDecisions(db: Db = prisma): Promise<OperationsDecision[]> {
  const signals = await collectOperationsSignals(db);
  const now = new Date();
  const timeBucket = Math.floor(now.getTime() / (5 * 60 * 1000));
  const decisions: OperationsDecision[] = [];

  // 1. SAFETY_PRESSURE (CRITICAL Priority)
  if (signals.activeSafetyIncidentsCount > 0) {
    const fingerprint = generateDecisionFingerprint('SAFETY_PRESSURE', undefined, timeBucket);
    decisions.push({
      id: `dec-safety-${now.getTime()}`,
      fingerprint,
      decisionType: 'SAFETY_PRESSURE',
      severity: 'CRITICAL',
      confidence: 'HIGH',
      status: 'DETECTED',
      title: 'Active Safety & Emergency Telemetry Alert',
      summary: `${signals.activeSafetyIncidentsCount} active safety or SOS incidents require immediate operational response.`,
      why: 'Active emergency or safety incidents take highest operational precedence to guarantee passenger & driver security.',
      evidence: [
        {
          key: 'activeSafetyIncidents',
          label: 'Active SOS Incidents',
          value: signals.activeSafetyIncidentsCount,
          expected: 0,
        },
      ],
      recommendedActions: [
        {
          id: 'act-safety-view',
          type: 'VIEW_INCIDENT',
          label: 'Inspect Safety Incidents',
          category: 'OBSERVE_ONLY',
          href: '/admin/sos-and-disputes',
          requiresConfirmation: false,
          impactSummary: 'Opens the emergency safety command desk.',
        },
        {
          id: 'act-safety-contact',
          type: 'CONTACT_SUPPORT',
          label: 'Contact Emergency Desk',
          category: 'MANUAL_CONFIRMATION',
          requiresConfirmation: true,
          impactSummary: 'Alerts duty ops manager for escalation.',
        },
      ],
      expectedImpact:
        'Prevents passenger/driver harm and ensures emergency protocol execution within SLO.',
      createdAt: now,
      evaluatedAt: now,
    });
  }

  // 2. DRIVER_SHORTAGE / DISPATCH_PRESSURE
  if (
    signals.searchingBookingsCount > 0 &&
    signals.searchingBookingsCount >= signals.availableDriversCount
  ) {
    const isSevere =
      signals.searchingBookingsCount >= signals.availableDriversCount * 2 ||
      signals.availableDriversCount === 0;
    const fingerprint = generateDecisionFingerprint('DRIVER_SHORTAGE', undefined, timeBucket);
    decisions.push({
      id: `dec-shortage-${now.getTime()}`,
      fingerprint,
      decisionType: 'DRIVER_SHORTAGE',
      severity: isSevere ? 'HIGH' : 'MEDIUM',
      confidence: 'HIGH',
      status: 'DETECTED',
      title: 'Driver Supply Deficit vs Search Demand',
      summary: `Active booking searches (${signals.searchingBookingsCount}) exceed available dispatch-eligible drivers (${signals.availableDriversCount}).`,
      why: 'Dispatch matching queue is experiencing driver supply pressure, which will increase customer pickup wait times.',
      evidence: [
        {
          key: 'searchingBookings',
          label: 'Active Searching Rides',
          value: signals.searchingBookingsCount,
          expected: 0,
        },
        {
          key: 'availableDrivers',
          label: 'Available Eligible Drivers',
          value: signals.availableDriversCount,
          expected: '> ' + signals.searchingBookingsCount,
        },
      ],
      recommendedActions: [
        {
          id: 'act-shortage-drivers',
          type: 'VIEW_DRIVERS',
          label: 'Review Driver Directory',
          category: 'OBSERVE_ONLY',
          href: '/admin/drivers',
          requiresConfirmation: false,
          impactSummary: 'Opens driver directory to audit off-shift or standby partners.',
        },
        {
          id: 'act-shortage-bookings',
          type: 'VIEW_BOOKINGS',
          label: 'Inspect Live Bookings',
          category: 'OBSERVE_ONLY',
          href: '/admin/live-bookings',
          requiresConfirmation: false,
          impactSummary: 'Inspect unassigned booking queue.',
        },
      ],
      expectedImpact:
        'Identifies supply bottlenecks and enables partner incentive or dispatch adjustments.',
      createdAt: now,
      evaluatedAt: now,
    });
  }

  // 3. TRIP_RELIABILITY_PRESSURE
  if (signals.activeReliabilityIncidentsCount > 0) {
    const fingerprint = generateDecisionFingerprint(
      'TRIP_RELIABILITY_PRESSURE',
      undefined,
      timeBucket,
    );
    decisions.push({
      id: `dec-reliability-${now.getTime()}`,
      fingerprint,
      decisionType: 'TRIP_RELIABILITY_PRESSURE',
      severity: signals.criticalReliabilityIncidentsCount > 0 ? 'HIGH' : 'MEDIUM',
      confidence: 'HIGH',
      status: 'DETECTED',
      title: 'Active Trip Reliability Anomalies',
      summary: `${signals.activeReliabilityIncidentsCount} active reliability incidents detected (assignment timeouts, stuck trips, stale telemetry).`,
      why: 'Reliability Engine detected automated operational exceptions requiring monitoring or recovery intervention.',
      evidence: [
        {
          key: 'activeIncidents',
          label: 'Active Incidents',
          value: signals.activeReliabilityIncidentsCount,
          expected: 0,
        },
        {
          key: 'criticalIncidents',
          label: 'Critical Incidents',
          value: signals.criticalReliabilityIncidentsCount,
          expected: 0,
        },
      ],
      recommendedActions: [
        {
          id: 'act-rel-view',
          type: 'VIEW_INCIDENT',
          label: 'Open Reliability Incident Vault',
          category: 'OBSERVE_ONLY',
          href: '/admin/incidents',
          requiresConfirmation: false,
          impactSummary: 'View active trip incidents and evidence timelines.',
        },
      ],
      expectedImpact: 'Restores stuck trips and reduces booking drop-off rates.',
      createdAt: now,
      evaluatedAt: now,
    });
  }

  // 4. SCHEDULED_RIDE_RISK
  if (signals.upcomingUnassignedScheduledRidesCount > 0) {
    const fingerprint = generateDecisionFingerprint('SCHEDULED_RIDE_RISK', undefined, timeBucket);
    decisions.push({
      id: `dec-scheduled-${now.getTime()}`,
      fingerprint,
      decisionType: 'SCHEDULED_RIDE_RISK',
      severity: 'HIGH',
      confidence: 'HIGH',
      status: 'DETECTED',
      title: 'Upcoming Scheduled Rides Unassigned Risk',
      summary: `${signals.upcomingUnassignedScheduledRidesCount} scheduled rides in the next 60 minutes have no assigned driver partner.`,
      why: 'Unassigned upcoming scheduled rides carry high risk of execution failure and customer dissatisfaction.',
      evidence: [
        {
          key: 'unassignedRides',
          label: 'Unassigned Scheduled Rides (60m)',
          value: signals.upcomingUnassignedScheduledRidesCount,
          expected: 0,
        },
      ],
      recommendedActions: [
        {
          id: 'act-sched-view',
          type: 'VIEW_SCHEDULED_RIDE',
          label: 'Inspect Scheduled Rides',
          category: 'OBSERVE_ONLY',
          href: '/admin/scheduled-rides',
          requiresConfirmation: false,
          impactSummary: 'Review upcoming scheduled ride calendar and manual assignment queue.',
        },
      ],
      expectedImpact: 'Guarantees on-time chauffeur arrival for pre-booked trips.',
      createdAt: now,
      evaluatedAt: now,
    });
  }

  // 5. SUPPORT_BACKLOG
  if (signals.openSupportTicketsCount >= 10 || signals.highPrioritySupportTicketsCount > 0) {
    const fingerprint = generateDecisionFingerprint('SUPPORT_BACKLOG', undefined, timeBucket);
    decisions.push({
      id: `dec-support-${now.getTime()}`,
      fingerprint,
      decisionType: 'SUPPORT_BACKLOG',
      severity: signals.highPrioritySupportTicketsCount > 0 ? 'HIGH' : 'LOW',
      confidence: 'MEDIUM',
      status: 'DETECTED',
      title: 'Customer & Driver Support Backlog Pressure',
      summary: `${signals.openSupportTicketsCount} open support tickets (${signals.highPrioritySupportTicketsCount} high priority).`,
      why: 'Support queue buildup increases customer & partner resolution latency.',
      evidence: [
        {
          key: 'openTickets',
          label: 'Open Support Tickets',
          value: signals.openSupportTicketsCount,
        },
        {
          key: 'highPriority',
          label: 'High Priority Tickets',
          value: signals.highPrioritySupportTicketsCount,
          expected: 0,
        },
      ],
      recommendedActions: [
        {
          id: 'act-supp-view',
          type: 'VIEW_SUPPORT_BACKLOG',
          label: 'Open Support Desk',
          category: 'OBSERVE_ONLY',
          href: '/admin/support/tickets',
          requiresConfirmation: false,
          impactSummary: 'Filter open support tickets by priority.',
        },
      ],
      expectedImpact: 'Improves support response latency and ticket resolution time.',
      createdAt: now,
      evaluatedAt: now,
    });
  }

  // 6. PLATFORM_DEGRADATION
  if (signals.platformHealthScore < 85) {
    const fingerprint = generateDecisionFingerprint('PLATFORM_DEGRADATION', undefined, timeBucket);
    decisions.push({
      id: `dec-platform-${now.getTime()}`,
      fingerprint,
      decisionType: 'PLATFORM_DEGRADATION',
      severity: signals.platformHealthScore < 60 ? 'CRITICAL' : 'HIGH',
      confidence: 'HIGH',
      status: 'DETECTED',
      title: 'Platform Health Degradation Score Warning',
      summary: `Composite platform health score is ${signals.platformHealthScore}/100.`,
      why: 'Subsystem performance or incident buildup is degrading operational service levels.',
      evidence: [
        {
          key: 'healthScore',
          label: 'Platform Health Score',
          value: signals.platformHealthScore,
          expected: '>= 85',
        },
      ],
      recommendedActions: [
        {
          id: 'act-plat-view',
          type: 'VIEW_PLATFORM_HEALTH',
          label: 'Inspect Platform Health & SLO',
          category: 'OBSERVE_ONLY',
          href: '/admin/platform-health',
          requiresConfirmation: false,
          impactSummary: 'Opens SRE observability and subsystem diagnostics dashboard.',
        },
      ],
      expectedImpact: 'Prevents system-wide dispatch outages and maintains SLA availability.',
      createdAt: now,
      evaluatedAt: now,
    });
  }

  // 7. CAPACITY_FORECAST_RISK — a forward-looking signal, distinct from
  // DRIVER_SHORTAGE above (which only compares searching-vs-available RIGHT
  // NOW): this compares FORECASTED near-term demand per zone against
  // expected eligible supply, surfacing a shortage before it materializes.
  try {
    const capacityForecast = await getCapacityForecastSummary('1h', db);
    const zonesAtRisk = capacityForecast.zones.filter(
      (z) => z.status === 'SHORTAGE' || z.status === 'CRITICAL_SHORTAGE',
    );
    if (zonesAtRisk.length > 0 && capacityForecast.worstZone) {
      const worst = capacityForecast.worstZone;
      const isCritical = worst.status === 'CRITICAL_SHORTAGE';
      const fingerprint = generateDecisionFingerprint(
        'CAPACITY_FORECAST_RISK',
        worst.zoneId,
        timeBucket,
      );
      decisions.push({
        id: `dec-capacity-${now.getTime()}`,
        fingerprint,
        decisionType: 'CAPACITY_FORECAST_RISK',
        severity: isCritical ? 'CRITICAL' : 'HIGH',
        confidence: worst.confidence === 'INSUFFICIENT_DATA' ? 'LOW' : worst.confidence,
        status: 'DETECTED',
        title: 'Predicted Capacity Shortfall in Upcoming Window',
        summary: `${zonesAtRisk.length} zone(s) forecasted to face a driver capacity shortage in the next hour; most severe: ${worst.zoneName} (${worst.forecastedDemand} forecasted requests vs ${worst.expectedEligibleSupply} eligible drivers).`,
        why: 'Forecasted near-term demand is projected to exceed expected dispatch-eligible driver supply, which will increase pickup wait times if left unaddressed.',
        zoneId: worst.zoneId,
        evidence: [
          {
            key: 'forecastedDemand',
            label: 'Forecasted Demand (1h)',
            value: worst.forecastedDemand,
          },
          {
            key: 'expectedSupply',
            label: 'Expected Eligible Supply',
            value: worst.expectedEligibleSupply,
            expected: `>= ${worst.forecastedDemand}`,
          },
          { key: 'gapRatio', label: 'Capacity Gap Ratio', value: worst.gapRatio },
          { key: 'zonesAtRisk', label: 'Zones At Risk', value: zonesAtRisk.length },
        ],
        recommendedActions: [
          {
            id: 'act-capacity-zone',
            type: 'VIEW_ZONE',
            label: 'Review Zone Capacity',
            category: 'OBSERVE_ONLY',
            href: '/admin/marketplace-intelligence/forecast',
            params: worst.zoneId ? { zoneId: worst.zoneId } : undefined,
            requiresConfirmation: false,
            impactSummary: 'Opens the demand forecast dashboard for detailed zone-level review.',
          },
          {
            id: 'act-capacity-drivers',
            type: 'VIEW_DRIVERS',
            label: 'Review Driver Directory',
            category: 'OBSERVE_ONLY',
            href: '/admin/drivers',
            requiresConfirmation: false,
            impactSummary:
              'Identify off-shift drivers who could be encouraged online ahead of the predicted demand window.',
          },
        ],
        expectedImpact:
          'Enables proactive driver activation or incentive targeting before the shortage materializes, rather than reacting after pickup wait times rise.',
        createdAt: now,
        evaluatedAt: now,
        metadata: {
          zonesAtRisk: zonesAtRisk.map((z) => ({
            zoneId: z.zoneId,
            zoneName: z.zoneName,
            gapRatio: z.gapRatio,
            status: z.status,
          })),
        },
      });
    }
  } catch (err) {
    // Forecast computation spans two modules and several tables; a failure
    // here must not take down the rest of the decision engine, which the
    // purely-reactive rules above still depend on.
    logger.error({ err }, 'Failed to evaluate CAPACITY_FORECAST_RISK; skipping this cycle');
  }

  // Store decisions in memory store
  decisions.forEach((d) => memoryDecisionStore.set(d.id, d));

  return decisions;
}

/**
 * Retrieves a single operational decision by ID.
 */
export async function getOperationsDecisionById(
  decisionId: string,
  db: Db = prisma,
): Promise<OperationsDecision | null> {
  const cached = memoryDecisionStore.get(decisionId);
  if (cached) return cached;

  const all = await evaluateOperationsDecisions(db);
  return all.find((d) => d.id === decisionId) || null;
}

/**
 * Updates decision status (ACKNOWLEDGED, DISMISSED, RESOLVED, ESCALATED).
 */
export async function updateOperationsDecisionStatus(
  decisionId: string,
  status: OperationsDecisionStatus,
  adminUserId: string,
  db: Db = prisma,
): Promise<OperationsDecision | null> {
  const decision = memoryDecisionStore.get(decisionId);
  if (!decision) return null;

  const fromStatus = decision.status;
  decision.status = status;
  decision.evaluatedAt = new Date();
  if (status === 'ACKNOWLEDGED') {
    decision.acknowledgedBy = adminUserId;
    decision.acknowledgedAt = new Date();
  } else if (status === 'RESOLVED') {
    decision.resolvedAt = new Date();
  } else if (status === 'DISMISSED') {
    decision.dismissedAt = new Date();
  }

  memoryDecisionStore.set(decisionId, decision);

  // Operator actions on operational decisions were not previously audited —
  // every other admin-facing mutation in this codebase (incident
  // escalation, configuration changes, support responses) writes an audit
  // log entry, and this one should too.
  await recordAuditLog(db, {
    actorUserId: adminUserId,
    action: 'operations.decision.status_changed',
    entityType: 'OperationsDecision',
    entityId: decisionId,
    beforeState: { status: fromStatus },
    afterState: { status, decisionType: decision.decisionType, zoneId: decision.zoneId },
  });

  return decision;
}
