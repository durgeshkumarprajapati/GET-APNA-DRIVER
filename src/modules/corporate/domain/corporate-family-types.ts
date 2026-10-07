export interface SavedFamilyRecipientDTO {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  relationship?: string;
  notes?: string;
  isActive: boolean;
}

export interface CreateFamilyRecipientInput {
  fullName: string;
  phone: string;
  email?: string;
  relationship?: string;
  notes?: string;
}

export interface DepartmentSpend {
  departmentName: string;
  amount: number;
  rideCount: number;
}

export interface CorporateExpenseSummaryDTO {
  organizationId: string;
  organizationName: string;
  billingCycleMonth: string;
  totalSpend: number;
  totalRides: number;
  activeEmployeesCount: number;
  spendByDepartment: DepartmentSpend[];
}

export interface EvaluateCorporatePolicyInput {
  organizationId: string;
  employeeUserId: string;
  estimatedFare: number;
  estimatedDistanceKm?: number;
  vehicleCategory: string;
  bookingTime?: string;
  monthlySpentSoFar?: number;
}

export interface PolicyEvaluationResultDTO {
  isAllowed: boolean;
  approvalRequired: boolean;
  maxFareLimit?: number;
  allowedVehicleCategories: string[];
  violationReason?: string;
  autoApproved: boolean;
}

export interface ConsolidatedBillingReportDTO {
  organizationId: string;
  billingMonth: string;
  totalAmount: number;
  taxAmount: number;
  netAmount: number;
  totalBookings: number;
  reportDownloadUrl: string;
  generatedAt: string;
  status: 'GENERATED';
}
