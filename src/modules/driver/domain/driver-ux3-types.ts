export interface DriverUX3NextActionDTO {
  actionType: 'ACCEPT_OFFER' | 'START_NAVIGATION' | 'CONFIRM_ARRIVAL' | 'START_TRIP' | 'COMPLETE_TRIP' | 'GO_ONLINE';
  title: string;
  subtitle: string;
  targetBookingId?: string;
  pickupAddress?: string;
  customerName?: string;
  customerPhone?: string;
  etaMins?: number;
}

export interface DriverUX3ActiveWorkflowDTO {
  driverId: string;
  isOnline: boolean;
  todaysBookingsCompleted: number;
  todaysEarningsAmount: number;
  todaysOnlineHours: number;
  acceptanceRatePercent: number;
  rating: number;
  nextAction: DriverUX3NextActionDTO;
  activeBookingSummary?: {
    bookingId: string;
    status: string;
    pickupAddress: string;
    dropoffAddress: string;
    fareAmount: number;
    customerNotes?: string;
  };
}
