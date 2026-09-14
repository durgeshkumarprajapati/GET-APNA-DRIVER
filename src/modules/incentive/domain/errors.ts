import { AppError } from '@/shared/errors/app-error';
import type { IncentiveCampaignStatus } from '@prisma/client';

export class IncentiveCampaignNotFoundError extends AppError {
  constructor(identifier: string) {
    super(`Incentive campaign not found: ${identifier}`, 404, 'INCENTIVE_CAMPAIGN_NOT_FOUND');
  }
}

export class InvalidIncentiveCampaignStatusTransitionError extends AppError {
  constructor(from: IncentiveCampaignStatus, to: IncentiveCampaignStatus) {
    super(
      `Invalid incentive campaign status transition from ${from} to ${to}`,
      409,
      'INCENTIVE_CAMPAIGN_INVALID_STATUS_TRANSITION',
    );
  }
}

export class InvalidIncentiveDatesError extends AppError {
  constructor(message: string = 'Campaign end date must be after start date') {
    super(message, 400, 'INCENTIVE_INVALID_DATES');
  }
}

export class IncentiveAlreadyQualifiedError extends AppError {
  constructor(campaignId: string, driverProfileId: string) {
    super(
      `Driver ${driverProfileId} has already qualified for campaign ${campaignId}`,
      409,
      'INCENTIVE_ALREADY_QUALIFIED',
    );
  }
}
