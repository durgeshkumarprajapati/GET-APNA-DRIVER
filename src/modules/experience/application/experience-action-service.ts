import type { ExperienceActionPayload } from '../domain/experience-types';

export interface ActionValidationResult {
  isValid: boolean;
  targetUrl: string;
  payload: Record<string, unknown>;
  reason?: string;
}

export function validateAndProcessExperienceAction(
  action: ExperienceActionPayload,
): ActionValidationResult {
  switch (action.type) {
    case 'OPEN_BOOKING_PREFILLED':
      return {
        isValid: true,
        targetUrl: action.targetUrl || '/bookings/new',
        payload: action.payload || {},
      };
    case 'NAVIGATE_PAGE':
      return {
        isValid: true,
        targetUrl: action.targetUrl || '/',
        payload: action.payload || {},
      };
    case 'TRIGGER_SUPPORT':
      return {
        isValid: true,
        targetUrl: action.targetUrl || '/customer/support',
        payload: action.payload || {},
      };
    case 'VIEW_SCHEDULED_RIDE':
      return {
        isValid: true,
        targetUrl: action.targetUrl || '/customer/scheduled-rides',
        payload: action.payload || {},
      };
    case 'REDEEM_REWARD':
      return {
        isValid: true,
        targetUrl: action.targetUrl || '/customer/rewards',
        payload: action.payload || {},
      };
    case 'COPY_REFERRAL':
      return {
        isValid: true,
        targetUrl: action.targetUrl || '/customer/referral',
        payload: action.payload || {},
      };
    case 'GO_ONLINE':
      return {
        isValid: true,
        targetUrl: action.targetUrl || '/driver',
        payload: action.payload || {},
      };
    case 'VIEW_INCENTIVE':
      return {
        isValid: true,
        targetUrl: action.targetUrl || '/driver/offers',
        payload: action.payload || {},
      };
    default:
      return {
        isValid: false,
        targetUrl: '/',
        payload: {},
        reason: 'Unsupported experience action type',
      };
  }
}
