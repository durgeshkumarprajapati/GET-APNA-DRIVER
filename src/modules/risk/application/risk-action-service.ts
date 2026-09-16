import { RedisLockService } from '@/shared/infrastructure/redis-lock-service';
import { RiskDecisionService } from './risk-decision-service';
import { prisma } from '@/shared/database/prisma';

export interface ExecuteRiskActionRequest {
  riskId: string;
  actionId: string;
  operatorId: string;
  notes?: string;
}

export interface ExecuteRiskActionResponse {
  success: boolean;
  actionId: string;
  riskId: string;
  executedAt: string;
  executedBy: string;
  message: string;
}

export class RiskActionService {
  /**
   * Execute an authorized risk action with distributed lock idempotency.
   */
  static async executeAction(req: ExecuteRiskActionRequest): Promise<ExecuteRiskActionResponse> {
    const lockKey = `lock:risk-action:${req.actionId}`;
    const acquired = await RedisLockService.acquireLock(lockKey, 15000);

    if (!acquired) {
      throw new Error(
        'Action execution in progress by another worker or session. Duplicate execution prevented.',
      );
    }

    try {
      const decision = RiskDecisionService.getDecisionById(req.riskId);
      if (!decision) {
        throw new Error(`Risk decision ${req.riskId} not found.`);
      }

      const action = decision.recommendedActions.find((a) => a.actionId === req.actionId);
      if (!action) {
        throw new Error(`Action ${req.actionId} not found on risk decision ${req.riskId}.`);
      }

      if (action.executed) {
        return {
          success: true,
          actionId: req.actionId,
          riskId: req.riskId,
          executedAt: action.executedAt || new Date().toISOString(),
          executedBy: action.executedBy || req.operatorId,
          message: 'Action was already executed previously (Idempotent call).',
        };
      }

      const nowIso = new Date().toISOString();
      action.executed = true;
      action.executedBy = req.operatorId;
      action.executedAt = nowIso;
      action.resultSummary = `Action '${action.title}' executed successfully by operator ${req.operatorId}.`;

      decision.status = 'ACTION_IN_PROGRESS';
      decision.updatedAt = nowIso;

      // Log audit trail entry
      try {
        await prisma.auditLog
          .create({
            data: {
              action: 'RISK_ACTION_EXECUTED',
              entityType: 'RiskAction',
              entityId: req.actionId,
              userId: req.operatorId,
              details: JSON.stringify({
                riskId: req.riskId,
                actionType: action.actionType,
                operatorId: req.operatorId,
                notes: req.notes || '',
                executedAt: nowIso,
              }),
            },
          })
          .catch(() => {
            // Fallback if schema variations
          });
      } catch {
        // Non-blocking
      }

      return {
        success: true,
        actionId: req.actionId,
        riskId: req.riskId,
        executedAt: nowIso,
        executedBy: req.operatorId,
        message: action.resultSummary,
      };
    } finally {
      await RedisLockService.releaseLock(lockKey);
    }
  }
}
