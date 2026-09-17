import { prisma } from '@/shared/database/prisma';
import { RiskSignal, RiskSubjectType } from '../domain/risk-types';

export class RiskSignalService {
  /**
   * Collect raw risk signals for a specific subject from real operational data.
   */
  static async collectSignalsForSubject(
    subjectType: RiskSubjectType,
    subjectId: string,
  ): Promise<RiskSignal[]> {
    const signals: RiskSignal[] = [];
    const now = new Date();
    const nowIso = now.toISOString();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    try {
      if (subjectType === 'CUSTOMER' || subjectType === 'ACCOUNT') {
        // Audit log security checks
        const failedOtps = await prisma.auditLog.count({
          where: {
            userId: subjectId,
            action: { contains: 'OTP_FAILURE' },
            createdAt: { gte: oneDayAgo },
          },
        });

        if (failedOtps > 0) {
          signals.push({
            signalId: `sig_otp_${subjectId}_${Date.now()}`,
            category: 'ACCOUNT',
            subjectType,
            subjectId,
            name: 'REPEATED_OTP_FAILURES',
            description: `${failedOtps} failed OTP attempts recorded in last 24h`,
            weight: Math.min(failedOtps * 10, 40),
            timestamp: nowIso,
          });
        }
      }

      if (subjectType === 'PAYMENT' || subjectType === 'CUSTOMER') {
        const failedPayments = await prisma.paymentAttempt.count({
          where: {
            booking: { customerId: subjectId },
            status: 'FAILED',
            createdAt: { gte: oneDayAgo },
          },
        });

        if (failedPayments > 0) {
          signals.push({
            signalId: `sig_pay_${subjectId}_${Date.now()}`,
            category: 'PAYMENT',
            subjectType,
            subjectId,
            name: 'PAYMENT_FAILURE_SPIKE',
            description: `${failedPayments} failed payment attempts recorded in 24h`,
            weight: Math.min(failedPayments * 15, 45),
            timestamp: nowIso,
          });
        }
      }

      if (subjectType === 'BOOKING' || subjectType === 'CUSTOMER' || subjectType === 'DRIVER') {
        const cancellations = await prisma.booking.count({
          where: {
            ...(subjectType === 'DRIVER' ? { driverId: subjectId } : { customerId: subjectId }),
            status: 'CANCELLED',
            updatedAt: { gte: oneDayAgo },
          },
        });

        if (cancellations >= 3) {
          signals.push({
            signalId: `sig_canc_${subjectId}_${Date.now()}`,
            category: 'CANCELLATION',
            subjectType,
            subjectId,
            name: 'HIGH_CANCELLATION_FREQUENCY',
            description: `${cancellations} ride cancellations recorded in 24h`,
            weight: Math.min(cancellations * 10, 35),
            timestamp: nowIso,
          });
        }
      }
    } catch (error) {
      console.warn('[RiskSignalService] Signal collection fallback:', error);
    }

    return signals;
  }
}
