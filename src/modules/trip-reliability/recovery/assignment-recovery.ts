import { DispatchAdapter } from '../adapters/dispatch-adapter';
import type { RecoveryResult } from '../trip-reliability-types';

export class AssignmentRecoveryHandler {
  private dispatchAdapter = new DispatchAdapter();

  async recoverAssignmentTimeout(bookingId: string): Promise<RecoveryResult> {
    const success = await this.dispatchAdapter.restartDispatchSearch(bookingId);

    return {
      success,
      actionTaken: success ? 'REBOOT_ASSIGNMENT_SEARCH' : 'ASSIGNMENT_RECOVER_FAILED',
      notes: success
        ? 'Assignment search restarted cleanly.'
        : 'Failed to restart assignment search.',
      escalated: !success,
    };
  }

  async recoverDriverCancellation(bookingId: string): Promise<RecoveryResult> {
    const success = await this.dispatchAdapter.restartDispatchSearch(bookingId);

    return {
      success,
      actionTaken: success ? 'REDISPATCH_AFTER_CANCELLATION' : 'REDISPATCH_FAILED',
      notes: success
        ? 'Driver cancellation handled; re-dispatch search initiated for customer.'
        : 'Re-dispatch after driver cancellation failed.',
      escalated: !success,
    };
  }
}
