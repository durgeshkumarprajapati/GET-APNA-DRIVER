export const bookingEn = {
  status: {
    DRAFT: 'Draft',
    SEARCHING_DRIVER: 'Searching Chauffeur',
    DRIVER_ASSIGNED: 'Chauffeur Assigned',
    DRIVER_EN_ROUTE: 'En Route to Pickup',
    DRIVER_ARRIVED: 'Arrived at Pickup',
    TRIP_IN_PROGRESS: 'Trip in Progress',
    TRIP_COMPLETED: 'Trip Completed',
    CANCELLED: 'Cancelled',
    EXPIRED: 'Offer Expired',
  },
  types: {
    ONE_WAY: 'One Way',
    ROUND_TRIP: 'Round Trip',
    HOURLY: 'Hourly Rental',
    FULL_DAY: 'Full Day Chauffeur',
    MULTI_DAY: 'Outstation Multi-Day',
  },
  cancelModal: {
    title: 'Cancel Booking',
    description:
      'Are you sure you want to cancel this booking? Cancellation fees may apply if driver is en route.',
    reasonLabel: 'Cancellation Reason',
    confirmBtn: 'Confirm Cancellation',
  },
  pinModal: {
    title: 'Enter Ride Verification PIN',
    subtitle: 'Ask customer for 6-digit PIN before starting trip',
    submit: 'Verify PIN',
  },
  noActiveDriverNearby: 'No active driver found near you.',
  searchingNearbyDrivers: 'Searching for nearby drivers…',
};
