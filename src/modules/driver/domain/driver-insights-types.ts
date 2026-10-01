export interface DriverShiftSummary {
  driverProfileId: string;
  isOnDuty: boolean;
  availabilityStatus: 'AVAILABLE' | 'ON_TRIP' | 'OFF_DUTY' | 'ON_BREAK';
  activeShiftDurationMinutes: number;
  todaysTripsCompleted: number;
  nextScheduledShift: string;
}

export interface DriverEarningsBreakdown {
  driverProfileId: string;
  todayNetEarnings: string;
  tripFaresTotal: string;
  incentivesEarned: string;
  tipsTotal: string;
  commissionDeducted: string;
  pendingSettlementAmount: string;
  settlementCycleStatus: 'PENDING' | 'PROCESSING' | 'SETTLED';
  settlementCycleRange: string;
}

export interface DriverPerformanceInsights {
  driverProfileId: string;
  averageRating: number;
  totalReviews: number;
  completionRatePercentage: number;
  cancellationRatePercentage: number;
  acceptanceRatePercentage: number;
  onTimeArrivalPercentage: number;
  reliabilityScore: number;
  actionableTips: string[];
}

export type DriverIssueCategory =
  | 'FARE_DISPUTE'
  | 'CUSTOMER_NO_SHOW'
  | 'VEHICLE_TROUBLE'
  | 'APP_GLITCH'
  | 'ROUTE_PROBLEM'
  | 'OTHER';

export interface DriverIssueReportInput {
  bookingId?: string;
  issueCategory: DriverIssueCategory;
  description: string;
}

export interface DriverIssueReportResult {
  ticketId: string;
  driverProfileId: string;
  issueCategory: DriverIssueCategory;
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED';
  createdAt: string;
}

export interface ConsolidatedDriverInsightsDTO {
  shiftSummary: DriverShiftSummary;
  earningsBreakdown: DriverEarningsBreakdown;
  performanceInsights: DriverPerformanceInsights;
}
