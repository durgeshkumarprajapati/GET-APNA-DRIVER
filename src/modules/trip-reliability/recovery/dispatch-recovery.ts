import { DispatchAdapter } from '../adapters/dispatch-adapter';
import type { RecoveryResult } from '../trip-reliability-types';

export class DispatchRecoveryHandler {
  private dispatchAdapter = new DispatchAdapter();

  async recoverDispatchFailure(bookingId: string): Promise<RecoveryResult> {
    const success = await this.dispatchAdapter.restartDispatchSearch(bookingId);

    if (success) {
      return {
        success: true,
        actionTaken: 'RESTART_DISPATCH_SEARCH',
        notes: 'Automated recovery successfully restarted dispatch driver search.',
      };
    }

    return {
      success: false,
      actionTaken: 'RESTART_DISPATCH_SEARCH_FAILED',
      notes: 'Dispatch search restart failed or booking state was invalid.',
      escalated: true,
    };
  }
}
