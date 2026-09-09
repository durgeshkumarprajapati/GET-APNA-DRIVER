/**
 * Server-enforceable permission catalog, named `domain.resource.action`.
 * This is the initial set required by the current and near-future domains —
 * not an exhaustive catalog. Extend deliberately; do not generate a
 * permission per hypothetical future feature.
 */
export const PERMISSIONS = {
  // Identity / administration (needed by this phase)
  IDENTITY_USERS_READ: 'identity.users.read',
  IDENTITY_USERS_STATUS_MANAGE: 'identity.users.status.manage',
  IDENTITY_USERS_ROLES_MANAGE: 'identity.users.roles.manage',
  IDENTITY_ROLES_READ: 'identity.roles.read',

  // Users (self-service profile, shared by every role)
  USERS_PROFILE_READ: 'users.profile.read',
  USERS_PROFILE_UPDATE: 'users.profile.update',

  // Customers (admin)
  ADMIN_CUSTOMER_READ: 'admin.customer.read',

  // Drivers (Phase 4 domain & admin)
  DRIVER_PROFILE_MANAGE: 'driver.profile.manage',
  DRIVER_DOCUMENT_UPLOAD: 'driver.document.upload',
  DRIVER_DOCUMENT_READ_OWN: 'driver.document.read.own',
  DRIVER_AVAILABILITY_MANAGE: 'driver.availability.manage',
  ADMIN_DRIVER_READ: 'admin.driver.read',
  ADMIN_DRIVER_REVIEW: 'admin.driver.review',
  ADMIN_DRIVER_APPROVE: 'admin.driver.approve',
  ADMIN_DRIVER_SUSPEND: 'admin.driver.suspend',
  ADMIN_DRIVER_DOCUMENT_READ: 'admin.driver_document.read',
  ADMIN_DRIVER_DOCUMENT_VERIFY: 'admin.driver_document.verify',
  ADMIN_DASHBOARD_READ: 'admin.dashboard.read',

  // Bookings (near-future domain)
  BOOKINGS_READ: 'bookings.read',
  BOOKINGS_CREATE: 'bookings.create',
  BOOKINGS_CANCEL: 'bookings.cancel',
  BOOKINGS_MANAGE: 'bookings.manage',
  DRIVER_ASSIGNMENT_RESPOND: 'driver.assignment.respond',
  DRIVER_JOURNEY_MANAGE: 'driver.journey.manage',
  BOOKINGS_TRACK_LOCATION: 'bookings.track_location',

  // Dispatch operations (admin)
  DISPATCH_BOOKING_READ: 'dispatch.booking.read',
  DISPATCH_BOOKING_OVERRIDE: 'dispatch.booking.override',
  DISPATCH_ASSIGNMENT_REASSIGN: 'dispatch.assignment.reassign',
  DISPATCH_ASSIGNMENT_FORCE: 'dispatch.assignment.force',
  DISPATCH_ASSIGNMENT_FORCE_ELIGIBILITY_BYPASS: 'dispatch.assignment.force_eligibility_bypass',

  // Payments & finance (Phase 8 domain)
  PAYMENTS_READ: 'payments.read',
  PAYMENTS_CREATE: 'payments.create',
  PAYMENTS_REFUND: 'payments.refund',
  FINANCE_READ: 'finance.read',
  FINANCE_WALLET_READ: 'finance.wallet.read',
  FINANCE_SETTLEMENT_MANAGE: 'finance.settlement.manage',
  FINANCE_COMMISSION_MANAGE: 'finance.commission.manage',

  // Promotions (near-future domain)
  PROMOTIONS_MANAGE: 'promotions.manage',

  // Location (Phase 5 domain)
  LOCATION_DRIVER_UPDATE: 'location.driver.update',
  LOCATION_NEARBY_READ: 'location.nearby.read',

  // Notifications (Phase 9 domain & admin)
  NOTIFICATIONS_READ: 'notifications.read',
  NOTIFICATIONS_MANAGE: 'notifications.manage',
  NOTIFICATIONS_CAMPAIGN_CREATE: 'notifications.campaign.create',
  NOTIFICATIONS_CAMPAIGN_SEND: 'notifications.campaign.send',
  NOTIFICATIONS_CAMPAIGN_CANCEL: 'notifications.campaign.cancel',

  // Safety & Emergency (Phase 12 domain & admin)
  SAFETY_INCIDENT_CREATE: 'safety.incident.create',
  SAFETY_INCIDENT_READ: 'safety.incident.read',
  SAFETY_INCIDENT_MANAGE: 'safety.incident.manage',
  SAFETY_INCIDENT_ESCALATE: 'safety.incident.escalate',

  // Dispute Resolution (Phase 12 domain & admin)
  DISPUTE_CREATE: 'dispute.create',
  DISPUTE_READ: 'dispute.read',
  DISPUTE_MANAGE: 'dispute.manage',
  DISPUTE_RESOLVE: 'dispute.resolve',

  // Reviews, Ratings & Driver Performance (Phase 16 domain & admin)
  REVIEWS_CREATE: 'reviews.create',
  REVIEWS_READ: 'reviews.read',
  REVIEWS_MANAGE: 'reviews.manage',
  DRIVER_PERFORMANCE_READ: 'driver.performance.read',

  // System
  SYSTEM_CONFIGURATION_MANAGE: 'system.configuration.manage',
  SYSTEM_OUTBOX_MANAGE: 'system.outbox.manage',

  // Governance
  AUDIT_LOG_READ: 'audit.log.read',
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export interface PermissionSeedDefinition {
  code: PermissionCode;
  description: string;
}

export const PERMISSION_CATALOG: readonly PermissionSeedDefinition[] = [
  { code: PERMISSIONS.IDENTITY_USERS_READ, description: 'View any user account.' },
  {
    code: PERMISSIONS.IDENTITY_USERS_STATUS_MANAGE,
    description: 'Suspend, activate, deactivate, or delete any user account.',
  },
  {
    code: PERMISSIONS.IDENTITY_USERS_ROLES_MANAGE,
    description: 'Assign or revoke roles for any user.',
  },
  {
    code: PERMISSIONS.IDENTITY_ROLES_READ,
    description: 'View the role/permission catalog and which users hold which roles.',
  },

  { code: PERMISSIONS.USERS_PROFILE_READ, description: 'View own user profile.' },
  { code: PERMISSIONS.USERS_PROFILE_UPDATE, description: 'Update own user profile.' },

  { code: PERMISSIONS.ADMIN_CUSTOMER_READ, description: 'View customer accounts and history.' },

  { code: PERMISSIONS.DRIVER_PROFILE_MANAGE, description: 'Manage own driver profile.' },
  { code: PERMISSIONS.DRIVER_DOCUMENT_UPLOAD, description: 'Upload driver documents.' },
  {
    code: PERMISSIONS.DRIVER_DOCUMENT_READ_OWN,
    description: 'Read own uploaded driver documents.',
  },
  {
    code: PERMISSIONS.DRIVER_AVAILABILITY_MANAGE,
    description: 'Manage driver availability state.',
  },
  { code: PERMISSIONS.ADMIN_DRIVER_READ, description: 'View driver applications and profiles.' },
  { code: PERMISSIONS.ADMIN_DRIVER_REVIEW, description: 'Review driver onboarding submissions.' },
  { code: PERMISSIONS.ADMIN_DRIVER_APPROVE, description: 'Approve or reject driver applications.' },
  { code: PERMISSIONS.ADMIN_DRIVER_SUSPEND, description: 'Suspend driver approval.' },
  { code: PERMISSIONS.ADMIN_DRIVER_DOCUMENT_READ, description: 'View uploaded driver documents.' },
  {
    code: PERMISSIONS.ADMIN_DRIVER_DOCUMENT_VERIFY,
    description: 'Verify or reject driver documents.',
  },
  {
    code: PERMISSIONS.ADMIN_DASHBOARD_READ,
    description: 'View admin operations dashboard metrics.',
  },

  { code: PERMISSIONS.BOOKINGS_READ, description: 'View bookings.' },
  { code: PERMISSIONS.BOOKINGS_CREATE, description: 'Create a booking.' },
  { code: PERMISSIONS.BOOKINGS_CANCEL, description: 'Cancel own booking.' },
  { code: PERMISSIONS.BOOKINGS_MANAGE, description: 'Manage any booking (admin).' },
  {
    code: PERMISSIONS.DRIVER_ASSIGNMENT_RESPOND,
    description: 'Accept or reject booking assignment offers.',
  },
  {
    code: PERMISSIONS.DRIVER_JOURNEY_MANAGE,
    description:
      'Execute driver journey lifecycle actions (en route, arrive, start trip, complete).',
  },
  {
    code: PERMISSIONS.BOOKINGS_TRACK_LOCATION,
    description: 'Access live driver location tracking during active trip lifecycle.',
  },

  {
    code: PERMISSIONS.DISPATCH_BOOKING_READ,
    description: 'View live bookings and assignment attempt history (admin).',
  },
  {
    code: PERMISSIONS.DISPATCH_BOOKING_OVERRIDE,
    description: 'Restart driver search on an expired booking (admin).',
  },
  {
    code: PERMISSIONS.DISPATCH_ASSIGNMENT_REASSIGN,
    description: 'Release the assigned driver and reopen matching for a booking (admin).',
  },
  {
    code: PERMISSIONS.DISPATCH_ASSIGNMENT_FORCE,
    description: 'Directly assign a specific eligible driver to a booking (admin).',
  },
  {
    code: PERMISSIONS.DISPATCH_ASSIGNMENT_FORCE_ELIGIBILITY_BYPASS,
    description:
      'Force-assign a driver even when they fail eligibility checks (admin, high severity).',
  },

  { code: PERMISSIONS.PAYMENTS_READ, description: 'View own payment records.' },
  { code: PERMISSIONS.PAYMENTS_CREATE, description: 'Create a payment for own booking.' },
  { code: PERMISSIONS.PAYMENTS_REFUND, description: 'Issue a payment refund.' },
  {
    code: PERMISSIONS.FINANCE_READ,
    description: 'View financial transactions and ledger data (admin).',
  },
  {
    code: PERMISSIONS.FINANCE_WALLET_READ,
    description: 'View own driver wallet and settlement history.',
  },
  {
    code: PERMISSIONS.FINANCE_SETTLEMENT_MANAGE,
    description: 'Create and process driver settlements (admin).',
  },
  {
    code: PERMISSIONS.FINANCE_COMMISSION_MANAGE,
    description: 'View and update the platform commission rate (admin).',
  },

  {
    code: PERMISSIONS.PROMOTIONS_MANAGE,
    description: 'Manage coupons, offers, and referral rewards.',
  },

  { code: PERMISSIONS.LOCATION_DRIVER_UPDATE, description: 'Update driver live location.' },
  { code: PERMISSIONS.LOCATION_NEARBY_READ, description: 'Search nearby available drivers.' },

  { code: PERMISSIONS.NOTIFICATIONS_READ, description: 'View own notifications and preferences.' },
  { code: PERMISSIONS.NOTIFICATIONS_MANAGE, description: 'Manage notification system (admin).' },
  {
    code: PERMISSIONS.NOTIFICATIONS_CAMPAIGN_CREATE,
    description: 'Create notification campaigns.',
  },
  { code: PERMISSIONS.NOTIFICATIONS_CAMPAIGN_SEND, description: 'Send notification campaigns.' },
  {
    code: PERMISSIONS.NOTIFICATIONS_CAMPAIGN_CANCEL,
    description: 'Cancel notification campaigns.',
  },

  {
    code: PERMISSIONS.SAFETY_INCIDENT_CREATE,
    description: 'Trigger SOS and create safety incident.',
  },
  { code: PERMISSIONS.SAFETY_INCIDENT_READ, description: 'Read safety incidents and history.' },
  {
    code: PERMISSIONS.SAFETY_INCIDENT_MANAGE,
    description: 'Acknowledge, assign, and manage safety incidents.',
  },
  {
    code: PERMISSIONS.SAFETY_INCIDENT_ESCALATE,
    description: 'Escalate safety emergency incidents.',
  },

  { code: PERMISSIONS.DISPUTE_CREATE, description: 'Create booking dispute.' },
  { code: PERMISSIONS.DISPUTE_READ, description: 'Read booking disputes.' },
  { code: PERMISSIONS.DISPUTE_MANAGE, description: 'Review and assign booking disputes.' },
  { code: PERMISSIONS.DISPUTE_RESOLVE, description: 'Resolve dispute with financial actions.' },

  {
    code: PERMISSIONS.REVIEWS_CREATE,
    description: 'Submit a review for a completed own booking.',
  },
  {
    code: PERMISSIONS.REVIEWS_READ,
    description: 'View own submitted reviews (customer) or own received reviews (driver).',
  },
  {
    code: PERMISSIONS.REVIEWS_MANAGE,
    description: 'View and moderate any review (admin).',
  },
  {
    code: PERMISSIONS.DRIVER_PERFORMANCE_READ,
    description: 'View own driver performance metrics.',
  },

  { code: PERMISSIONS.SYSTEM_CONFIGURATION_MANAGE, description: 'Manage system configuration.' },
  {
    code: PERMISSIONS.SYSTEM_OUTBOX_MANAGE,
    description: 'View outbox health metrics and requeue dead-lettered events.',
  },

  { code: PERMISSIONS.AUDIT_LOG_READ, description: 'View the platform audit log (read-only).' },
];
