import 'server-only';
import { prisma, type Db } from '@/shared/database/prisma';
import type { OperationsDecision as PrismaOperationsDecision, Prisma } from '@prisma/client';
import { logger } from '@/shared/logging/logger';
import { recordAuditLog } from '@/shared/audit/audit-service';
import { collectOperationsSignals } from './operations-signal-service';
import { getCapacityForecastSummary } from './capacity-forecast-service';
import type {
  OperationsDecision,
  OperationsDecisionStatus,
  OperationsExecutionStatus,
  OperationsEvidenceItem,
  OperationsActionDefinition,
} from '../domain/operations-types';

const TERMINAL_STATUSES: OperationsDecisionStatus[] = ['RESOLVED', 'DISMISSED'];

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

function toDomain(
  row: PrismaOperationsDecision & {
    executions?: Array<{
      id: string;
      decisionId: string;
      actionId: string;
      actionType: string;
      status: string;
      attemptNumber: number;
      idempotencyKey: string;
      actorUserId: string;
      reason: string | null;
      resultMessage: string | null;
      failureCode: string | null;
      failureSummary: string | null;
      details: Prisma.JsonValue;
      startedAt: Date;
      completedAt: Date | null;
    }>;
  },
): OperationsDecision {
  return {
    id: row.id,
    fingerprint: row.fingerprint,
    decisionType: row.decisionType,
    severity: row.severity,
    confidence: row.confidence,
    status: row.status,
    title: row.title,
    summary: row.summary,
    why: row.why,
    zoneId: row.zoneId,
    bookingId: row.bookingId,
    incidentId: row.incidentId,
    evidence: (row.evidence as unknown as OperationsEvidenceItem[]) ?? [],
    recommendedActions: (row.recommendedActions as unknown as OperationsActionDefinition[]) ?? [],
    expectedImpact: row.expectedImpact,
    createdAt: row.createdAt,
    evaluatedAt: row.evaluatedAt,
    acknowledgedBy: row.acknowledgedBy,
    acknowledgedAt: row.acknowledgedAt,
    resolvedAt: row.resolvedAt,
    dismissedBy: row.dismissedBy,
    dismissedAt: row.dismissedAt,
    dismissalReason: row.dismissalReason,
    escalatedAt: row.escalatedAt,
    expiresAt: row.expiresAt,
    metadata: (row.metadata as unknown as Record<string, unknown> | null) ?? undefined,
    executions: row.executions?.map((e) => ({
      id: e.id,
      decisionId: e.decisionId,
      actionId: e.actionId,
      actionType: e.actionType,
      status: e.status as OperationsExecutionStatus,
      attemptNumber: e.attemptNumber,
      idempotencyKey: e.idempotencyKey,
      actorUserId: e.actorUserId,
      reason: e.reason,
      resultMessage: e.resultMessage,
      failureCode: e.failureCode,
      failureSummary: e.failureSummary,
      details: (e.details as unknown as Record<string, unknown> | null) ?? undefined,
      startedAt: e.startedAt,
      completedAt: e.completedAt,
    })),
  };
}

/**
 * Candidate decisions are built with the same shape as a persisted row's
 * "content" fields — this is what the rule engine below produces before
 * it's upserted; lifecycle/audit fields (status history, timestamps) are
 * owned by the database from that point on, never by the rule engine.
 */
interface DecisionCandidate {
  fingerprint: string;
  decisionType: OperationsDecision['decisionType'];
  severity: OperationsDecision['severity'];
  confidence: OperationsDecision['confidence'];
  title: string;
  summary: string;
  why: string;
  zoneId?: string;
  bookingId?: string;
  incidentId?: string;
  evidence: OperationsEvidenceItem[];
  recommendedActions: OperationsActionDefinition[];
  expectedImpact: string;
  metadata?: Record<string, unknown>;
}

/**
 * Upserts one candidate by its deterministic fingerprint. A brand new
 * fingerprint creates a fresh DETECTED row. An existing, still-open
 * (non-terminal) row has its display fields (evidence/summary/why/
 * severity/confidence) refreshed in place, since the underlying counts
 * legitimately change between evaluations — but its lifecycle fields
 * (status, acknowledgedBy, etc.) are left untouched here; only
 * updateOperationsDecisionStatus ever changes those. A row that's already
 * RESOLVED or DISMISSED is left alone entirely: an operator already closed
 * out that specific instance, and re-evaluation must not resurrect it just
 * because the same condition is still (or newly) true — a genuinely new
 * occurrence gets its own fingerprint once the 5-minute time bucket rolls
 * over.
 *
 * Concurrent evaluators racing to create the same brand-new fingerprint is
 * handled by catching the fingerprint's unique-constraint violation on the
 * loser and re-reading the winner's row — the same pattern already proven
 * for TripReliabilityIncident (Phase 82).
 */
async function upsertDecision(candidate: DecisionCandidate, db: Db): Promise<OperationsDecision> {
  const existing = await db.operationsDecision.findUnique({
    where: { fingerprint: candidate.fingerprint },
  });

  if (!existing) {
    try {
      const created = await db.operationsDecision.create({
        data: {
          fingerprint: candidate.fingerprint,
          decisionType: candidate.decisionType,
          severity: candidate.severity,
          confidence: candidate.confidence,
          title: candidate.title,
          summary: candidate.summary,
          why: candidate.why,
          zoneId: candidate.zoneId,
          bookingId: candidate.bookingId,
          incidentId: candidate.incidentId,
          evidence: candidate.evidence as unknown as Prisma.InputJsonValue,
          recommendedActions: candidate.recommendedActions as unknown as Prisma.InputJsonValue,
          expectedImpact: candidate.expectedImpact,
          metadata: (candidate.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
        },
      });
      return toDomain(created);
    } catch {
      // Lost the create race to a concurrent evaluator — fall through and
      // read whatever they created instead of erroring.
      const winner = await db.operationsDecision.findUnique({
        where: { fingerprint: candidate.fingerprint },
      });
      if (winner) return toDomain(winner);
      throw new Error(`Failed to upsert operations decision ${candidate.fingerprint}`);
    }
  }

  if (TERMINAL_STATUSES.includes(existing.status)) {
    return toDomain(existing);
  }

  const refreshed = await db.operationsDecision.update({
    where: { fingerprint: candidate.fingerprint },
    data: {
      severity: candidate.severity,
      confidence: candidate.confidence,
      summary: candidate.summary,
      why: candidate.why,
      evidence: candidate.evidence as unknown as Prisma.InputJsonValue,
      metadata: (candidate.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      evaluatedAt: new Date(),
    },
  });
  return toDomain(refreshed);
}

/**
 * OperationsDecisionService evaluates deterministic operational rules against aggregated signals,
 * generating actionable, explainable decision records with evidence and recommended actions.
 * Every decision that fires is durably upserted (see upsertDecision) — the array this returns
 * reflects each decision's REAL current lifecycle status, not a freshly re-detected one.
 */
export async function evaluateOperationsDecisions(db: Db = prisma): Promise<OperationsDecision[]> {
  const signals = await collectOperationsSignals(db);
  const now = new Date();
  const timeBucket = Math.floor(now.getTime() / (5 * 60 * 1000));
  const candidates: DecisionCandidate[] = [];

  // 1. SAFETY_PRESSURE (CRITICAL Priority)
  if (signals.activeSafetyIncidentsCount > 0) {
    candidates.push({
      fingerprint: generateDecisionFingerprint('SAFETY_PRESSURE', undefined, timeBucket),
      decisionType: 'SAFETY_PRESSURE',
      severity: 'CRITICAL',
      confidence: 'HIGH',
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
    candidates.push({
      fingerprint: generateDecisionFingerprint('DRIVER_SHORTAGE', undefined, timeBucket),
      decisionType: 'DRIVER_SHORTAGE',
      severity: isSevere ? 'HIGH' : 'MEDIUM',
      confidence: 'HIGH',
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
    });
  }

  // 3. TRIP_RELIABILITY_PRESSURE
  if (signals.activeReliabilityIncidentsCount > 0) {
    candidates.push({
      fingerprint: generateDecisionFingerprint('TRIP_RELIABILITY_PRESSURE', undefined, timeBucket),
      decisionType: 'TRIP_RELIABILITY_PRESSURE',
      severity: signals.criticalReliabilityIncidentsCount > 0 ? 'HIGH' : 'MEDIUM',
      confidence: 'HIGH',
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
    });
  }

  // 4. SCHEDULED_RIDE_RISK
  if (signals.upcomingUnassignedScheduledRidesCount > 0) {
    candidates.push({
      fingerprint: generateDecisionFingerprint('SCHEDULED_RIDE_RISK', undefined, timeBucket),
      decisionType: 'SCHEDULED_RIDE_RISK',
      severity: 'HIGH',
      confidence: 'HIGH',
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
    });
  }

  // 5. SUPPORT_BACKLOG
  if (signals.openSupportTicketsCount >= 10 || signals.highPrioritySupportTicketsCount > 0) {
    candidates.push({
      fingerprint: generateDecisionFingerprint('SUPPORT_BACKLOG', undefined, timeBucket),
      decisionType: 'SUPPORT_BACKLOG',
      severity: signals.highPrioritySupportTicketsCount > 0 ? 'HIGH' : 'LOW',
      confidence: 'MEDIUM',
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
    });
  }

  // 6. PLATFORM_DEGRADATION
  if (signals.platformHealthScore < 85) {
    candidates.push({
      fingerprint: generateDecisionFingerprint('PLATFORM_DEGRADATION', undefined, timeBucket),
      decisionType: 'PLATFORM_DEGRADATION',
      severity: signals.platformHealthScore < 60 ? 'CRITICAL' : 'HIGH',
      confidence: 'HIGH',
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
      candidates.push({
        fingerprint: generateDecisionFingerprint(
          'CAPACITY_FORECAST_RISK',
          worst.zoneId,
          timeBucket,
        ),
        decisionType: 'CAPACITY_FORECAST_RISK',
        severity: isCritical ? 'CRITICAL' : 'HIGH',
        confidence: worst.confidence === 'INSUFFICIENT_DATA' ? 'LOW' : worst.confidence,
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

  const decisions: OperationsDecision[] = [];
  for (const candidate of candidates) {
    try {
      decisions.push(await upsertDecision(candidate, db));
    } catch (err) {
      logger.error(
        { err, fingerprint: candidate.fingerprint },
        'Failed to persist an operations decision; omitting it from this evaluation cycle',
      );
    }
  }

  return decisions;
}

export interface ListOperationsDecisionsFilter {
  status?: OperationsDecisionStatus;
  severity?: OperationsDecision['severity'];
  decisionType?: OperationsDecision['decisionType'];
  page?: number;
  pageSize?: number;
}

export interface ListOperationsDecisionsResult {
  decisions: OperationsDecision[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Queries the full persisted decision history (including RESOLVED/
 * DISMISSED rows) — the piece evaluateOperationsDecisions deliberately does
 * NOT provide, since its own return value is scoped to "conditions
 * currently detected by the rule engine," not "everything that ever
 * happened." This is what makes decision history genuinely persistent
 * (survives restarts, browsable after the fact) rather than only ever
 * showing whatever is active right now.
 */
export async function listOperationsDecisions(
  filter: ListOperationsDecisionsFilter = {},
  db: Db = prisma,
): Promise<ListOperationsDecisionsResult> {
  const page = Math.max(1, filter.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filter.pageSize ?? 50));

  const where: Prisma.OperationsDecisionWhereInput = {};
  if (filter.status) where.status = filter.status;
  if (filter.severity) where.severity = filter.severity;
  if (filter.decisionType) where.decisionType = filter.decisionType;

  const [total, rows] = await Promise.all([
    db.operationsDecision.count({ where }),
    db.operationsDecision.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return { decisions: rows.map(toDomain), total, page, pageSize };
}

/**
 * Retrieves a single operational decision by ID, including its execution
 * history (see OperationsDecisionExecution) for the admin detail view.
 */
export async function getOperationsDecisionById(
  decisionId: string,
  db: Db = prisma,
): Promise<OperationsDecision | null> {
  const decision = await db.operationsDecision.findUnique({
    where: { id: decisionId },
    include: { executions: { orderBy: { attemptNumber: 'asc' } } },
  });
  return decision ? toDomain(decision) : null;
}

/**
 * Updates decision status (ACKNOWLEDGED, DISMISSED, RESOLVED, ESCALATED).
 * Concurrency-safe and idempotent: the conditional updateMany below only
 * transitions a decision that is NOT already RESOLVED/DISMISSED, so a
 * duplicate request, a retried click, or two operators racing on the same
 * decision cannot both "win" — the loser's updateMany matches zero rows
 * and the current (already-terminal) state is simply returned instead of
 * erroring or double-applying a side effect.
 */
export async function updateOperationsDecisionStatus(
  decisionId: string,
  status: OperationsDecisionStatus,
  adminUserId: string,
  db: Db = prisma,
  options?: { dismissalReason?: string },
): Promise<OperationsDecision | null> {
  const existing = await db.operationsDecision.findUnique({ where: { id: decisionId } });
  if (!existing) return null;

  const fromStatus = existing.status;
  const now = new Date();
  const data: Prisma.OperationsDecisionUpdateManyMutationInput = { status, evaluatedAt: now };
  if (status === 'ACKNOWLEDGED') {
    data.acknowledgedBy = adminUserId;
    data.acknowledgedAt = now;
  } else if (status === 'RESOLVED') {
    data.resolvedAt = now;
  } else if (status === 'DISMISSED') {
    data.dismissedBy = adminUserId;
    data.dismissedAt = now;
    if (options?.dismissalReason) data.dismissalReason = options.dismissalReason;
  } else if (status === 'ESCALATED') {
    data.escalatedAt = now;
  }

  const result = await db.operationsDecision.updateMany({
    where: { id: decisionId, status: { notIn: TERMINAL_STATUSES } },
    data,
  });

  const current = await db.operationsDecision.findUnique({ where: { id: decisionId } });
  if (!current) return null;

  if (result.count === 0) {
    // Already terminal — a concurrent request/duplicate retry beat us to
    // it. Idempotent no-op: return the current state, don't error, don't
    // write a second audit entry for a transition that didn't happen.
    return toDomain(current);
  }

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
    afterState: { status, decisionType: current.decisionType, zoneId: current.zoneId },
  });

  return toDomain(current);
}
