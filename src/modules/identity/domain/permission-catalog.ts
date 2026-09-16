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
  RECOMMENDATIONS_READ: 'recommendations.read',

  // Customers (admin)
  ADMIN_CUSTOMER_READ: 'admin.customer.read',
  ADMIN_CUSTOMER_APPROVE: 'admin.customer.approve',

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

  // Promotions & Growth (Phase 20 domain)
  PROMOTIONS_READ: 'promotions.read',
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

  // Support Ticketing (Phase 27 domain & admin)
  SUPPORT_TICKET_CREATE: 'support.ticket.create',
  SUPPORT_TICKET_READ: 'support.ticket.read',
  ADMIN_SUPPORT_MANAGE: 'admin.support.manage',
  ADMIN_SUPPORT_RESPOND: 'admin.support.respond',

  // Calling & Communication (Phase 28 domain & admin)
  CALL_DRIVER_INITIATE: 'calling.driver.initiate',
  CALL_CUSTOMER_INITIATE: 'calling.customer.initiate',
  CALL_SUPPORT_INITIATE: 'calling.support.initiate',
  ADMIN_CALLS_READ: 'admin.calls.read',

  // Driver Schedule & Availability (Phase 29 domain & admin)
  DRIVER_SCHEDULE_READ: 'driver.schedule.read',
  DRIVER_SCHEDULE_MANAGE: 'driver.schedule.manage',
  ADMIN_DRIVER_SCHEDULE_READ: 'admin.driver.schedule.read',
  ADMIN_DRIVER_SCHEDULE_MANAGE: 'admin.driver.schedule.manage',

  // Driver Incentives & Earnings (Phase 34 domain & admin)
  DRIVER_INCENTIVES_READ: 'driver.incentives.read',
  DRIVER_GOALS_MANAGE: 'driver.goals.manage',
  ADMIN_INCENTIVES_MANAGE: 'admin.incentives.manage',

  // Driver Engagement & Gamification (Phase 38 domain & admin)
  DRIVER_ENGAGEMENT_READ: 'driver.engagement.read',
  ADMIN_DRIVER_ACHIEVEMENTS_READ: 'admin.driver_achievements.read',
  ADMIN_DRIVER_ACHIEVEMENTS_MANAGE: 'admin.driver_achievements.manage',

  // Scheduled & Recurring Rides (Phase 36 domain & admin)
  SCHEDULED_RIDES_READ: 'scheduled_rides.read',
  SCHEDULED_RIDES_CREATE: 'scheduled_rides.create',
  SCHEDULED_RIDES_MANAGE: 'scheduled_rides.manage',
  ADMIN_SCHEDULED_RIDES_READ: 'admin.scheduled_rides.read',
  ADMIN_SCHEDULED_RIDES_MANAGE: 'admin.scheduled_rides.manage',

  // Customer Loyalty & Rewards (Phase 35 domain & admin)
  CUSTOMER_LOYALTY_READ: 'customer.loyalty.read',
  CUSTOMER_REWARDS_REDEEM: 'customer.rewards.redeem',
  ADMIN_LOYALTY_READ: 'admin.loyalty.read',
  ADMIN_LOYALTY_MANAGE: 'admin.loyalty.manage',
  ADMIN_LOYALTY_ADJUST: 'admin.loyalty.adjust',

  // Referral 2.0 & Growth Engine (Phase 39 domain & admin)
  REFERRAL_READ: 'referral.read',
  ADMIN_REFERRAL_READ: 'admin.referral.read',
  ADMIN_REFERRAL_MANAGE: 'admin.referral.manage',

  // Corporate / Business Accounts (Phase 41 domain & admin)
  CORPORATE_ORGANIZATION_READ: 'corporate.organization.read',
  CORPORATE_ORGANIZATION_MANAGE: 'corporate.organization.manage',
  CORPORATE_MEMBERS_READ: 'corporate.members.read',
  CORPORATE_MEMBERS_MANAGE: 'corporate.members.manage',
  CORPORATE_POLICIES_READ: 'corporate.policies.read',
  CORPORATE_POLICIES_MANAGE: 'corporate.policies.manage',
  CORPORATE_APPROVALS_READ: 'corporate.approvals.read',
  CORPORATE_APPROVALS_MANAGE: 'corporate.approvals.manage',
  CORPORATE_BOOKINGS_READ: 'corporate.bookings.read',
  CORPORATE_BOOKINGS_CREATE: 'corporate.bookings.create',
  CORPORATE_REPORTS_READ: 'corporate.reports.read',
  ADMIN_CORPORATE_MANAGE: 'admin.corporate.manage',

  // Marketplace Intelligence & Demand Forecasting (Phase 42 domain & admin)
  ADMIN_MARKETPLACE_INTELLIGENCE_READ: 'admin.marketplace.intelligence.read',
  ADMIN_MARKETPLACE_INTELLIGENCE_MANAGE: 'admin.marketplace.intelligence.manage',

  // Smart Trip Reliability & Incident Management (Phase 46)
  ADMIN_INCIDENT_READ: 'admin.incident.read',
  ADMIN_INCIDENT_MANAGE: 'admin.incident.manage',
  ADMIN_INCIDENT_RECOVER: 'admin.incident.recover',
  ADMIN_INCIDENT_ESCALATE: 'admin.incident.escalate',

  // SRE Observability & Platform Health (Phase 47)
  ADMIN_PLATFORM_HEALTH_READ: 'admin.platform_health.read',
  ADMIN_PLATFORM_DIAGNOSTICS_READ: 'admin.platform_diagnostics.read',
  ADMIN_PLATFORM_METRICS_READ: 'admin.platform_metrics.read',

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
  {
    code: PERMISSIONS.RECOMMENDATIONS_READ,
    description: 'Read personalized customer recommendations.',
  },

  { code: PERMISSIONS.ADMIN_CUSTOMER_READ, description: 'View customer accounts and history.' },
  { code: PERMISSIONS.ADMIN_CUSTOMER_APPROVE, description: 'Approve pending customer accounts.' },

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
    code: PERMISSIONS.PROMOTIONS_READ,
    description: 'View available promotions and offers (self-service).',
  },
  {
    code: PERMISSIONS.PROMOTIONS_MANAGE,
    description: 'Create, update, and manage coupons, offers, and referral rewards (admin).',
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

  { code: PERMISSIONS.SUPPORT_TICKET_CREATE, description: 'Create support tickets.' },
  { code: PERMISSIONS.SUPPORT_TICKET_READ, description: 'View support tickets.' },
  {
    code: PERMISSIONS.ADMIN_SUPPORT_MANAGE,
    description: 'Manage, assign, and update support tickets (admin).',
  },
  {
    code: PERMISSIONS.ADMIN_SUPPORT_RESPOND,
    description: 'Respond to customer support tickets and add internal notes (admin).',
  },

  {
    code: PERMISSIONS.CALL_DRIVER_INITIATE,
    description: 'Initiate masked phone call to assigned driver.',
  },
  {
    code: PERMISSIONS.CALL_CUSTOMER_INITIATE,
    description: 'Initiate masked phone call to assigned customer.',
  },
  { code: PERMISSIONS.CALL_SUPPORT_INITIATE, description: 'Initiate voice call to Customer Care.' },
  {
    code: PERMISSIONS.ADMIN_CALLS_READ,
    description: 'View platform call sessions and telephony logs (admin).',
  },

  {
    code: PERMISSIONS.DRIVER_SCHEDULE_READ,
    description: 'View driver weekly schedule and shift roster.',
  },
  {
    code: PERMISSIONS.DRIVER_SCHEDULE_MANAGE,
    description: 'Manage own weekly schedule and shift exceptions.',
  },
  {
    code: PERMISSIONS.ADMIN_DRIVER_SCHEDULE_READ,
    description: 'View any driver weekly schedule and shift roster (admin).',
  },
  {
    code: PERMISSIONS.ADMIN_DRIVER_SCHEDULE_MANAGE,
    description: 'Manage driver weekly schedules and shift rosters (admin).',
  },

  {
    code: PERMISSIONS.DRIVER_ENGAGEMENT_READ,
    description: 'View own gamification achievements, streaks, and engagement metrics.',
  },
  {
    code: PERMISSIONS.ADMIN_DRIVER_ACHIEVEMENTS_READ,
    description: 'View driver achievement catalog and participation metrics (admin).',
  },
  {
    code: PERMISSIONS.ADMIN_DRIVER_ACHIEVEMENTS_MANAGE,
    description: 'Create and configure achievement definitions (admin).',
  },

  {
    code: PERMISSIONS.SCHEDULED_RIDES_READ,
    description: 'View own scheduled and recurring rides.',
  },
  {
    code: PERMISSIONS.SCHEDULED_RIDES_CREATE,
    description: 'Create one-time or recurring scheduled rides.',
  },
  {
    code: PERMISSIONS.SCHEDULED_RIDES_MANAGE,
    description: 'Pause, resume, or cancel own scheduled rides.',
  },
  {
    code: PERMISSIONS.ADMIN_SCHEDULED_RIDES_READ,
    description: 'View fleet-wide scheduled rides (admin).',
  },
  {
    code: PERMISSIONS.ADMIN_SCHEDULED_RIDES_MANAGE,
    description: 'Manage and cancel customer scheduled rides (admin).',
  },

  { code: PERMISSIONS.SYSTEM_CONFIGURATION_MANAGE, description: 'Manage system configuration.' },
  {
    code: PERMISSIONS.SYSTEM_OUTBOX_MANAGE,
    description: 'View outbox health metrics and requeue dead-lettered events.',
  },

  {
    code: PERMISSIONS.DRIVER_INCENTIVES_READ,
    description: 'View driver active incentive challenges and campaign progress.',
  },
  {
    code: PERMISSIONS.DRIVER_GOALS_MANAGE,
    description: 'Manage own daily and weekly goal targets.',
  },
  {
    code: PERMISSIONS.ADMIN_INCENTIVES_MANAGE,
    description: 'Create and manage driver incentive campaigns (admin).',
  },

  {
    code: PERMISSIONS.CUSTOMER_LOYALTY_READ,
    description: 'View customer loyalty tier, points, and rewards.',
  },
  {
    code: PERMISSIONS.CUSTOMER_REWARDS_REDEEM,
    description: 'Redeem loyalty points for coupons or wallet rewards.',
  },
  {
    code: PERMISSIONS.ADMIN_LOYALTY_READ,
    description: 'View fleet-wide customer loyalty stats (admin).',
  },
  {
    code: PERMISSIONS.ADMIN_LOYALTY_MANAGE,
    description: 'Configure customer loyalty tiers and reward catalog (admin).',
  },
  {
    code: PERMISSIONS.ADMIN_LOYALTY_ADJUST,
    description: 'Manually adjust customer loyalty points balance (admin).',
  },

  { code: PERMISSIONS.AUDIT_LOG_READ, description: 'View the platform audit log (read-only).' },
  {
    code: PERMISSIONS.REFERRAL_READ,
    description: 'View own referral codes, links, and referral history.',
  },
  {
    code: PERMISSIONS.ADMIN_REFERRAL_READ,
    description: 'View referral growth analytics and campaign performance (admin).',
  },
  {
    code: PERMISSIONS.ADMIN_REFERRAL_MANAGE,
    description: 'Create and configure referral growth campaigns and rules (admin).',
  },
  {
    code: PERMISSIONS.CORPORATE_ORGANIZATION_READ,
    description: 'View corporate organization details and profile.',
  },
  {
    code: PERMISSIONS.CORPORATE_ORGANIZATION_MANAGE,
    description: 'Manage corporate organization profile and settings.',
  },
  {
    code: PERMISSIONS.CORPORATE_MEMBERS_READ,
    description: 'View corporate members, departments, and cost centers.',
  },
  {
    code: PERMISSIONS.CORPORATE_MEMBERS_MANAGE,
    description: 'Invite, update, or remove corporate organization members.',
  },
  {
    code: PERMISSIONS.CORPORATE_POLICIES_READ,
    description: 'View corporate travel policies.',
  },
  {
    code: PERMISSIONS.CORPORATE_POLICIES_MANAGE,
    description: 'Create and update corporate travel rules and spend limits.',
  },
  {
    code: PERMISSIONS.CORPORATE_APPROVALS_READ,
    description: 'View corporate ride approval requests.',
  },
  {
    code: PERMISSIONS.CORPORATE_APPROVALS_MANAGE,
    description: 'Approve or reject employee corporate ride requests.',
  },
  {
    code: PERMISSIONS.CORPORATE_BOOKINGS_READ,
    description: 'View corporate rides and travel history.',
  },
  {
    code: PERMISSIONS.CORPORATE_BOOKINGS_CREATE,
    description: 'Book rides under a corporate business account profile.',
  },
  {
    code: PERMISSIONS.CORPORATE_REPORTS_READ,
    description: 'View corporate travel spend, department analytics, and export reports.',
  },
  {
    code: PERMISSIONS.ADMIN_CORPORATE_MANAGE,
    description: 'Platform-wide corporate account administration and verification (admin).',
  },
  {
    code: PERMISSIONS.ADMIN_MARKETPLACE_INTELLIGENCE_READ,
    description: 'View marketplace health, demand forecasting, supply intelligence, and campaign signals.',
  },
  {
    code: PERMISSIONS.ADMIN_MARKETPLACE_INTELLIGENCE_MANAGE,
    description: 'Acknowledge or dismiss operational recommendations and manage marketplace zones.',
  },
  {
    code: PERMISSIONS.ADMIN_INCIDENT_READ,
    description: 'View trip reliability incidents, evidence, and resolution timeline.',
  },
  {
    code: PERMISSIONS.ADMIN_INCIDENT_MANAGE,
    description: 'Manage trip reliability incidents and transition incident status.',
  },
  {
    code: PERMISSIONS.ADMIN_INCIDENT_RECOVER,
    description: 'Trigger automated or manual recovery actions for operational trip incidents.',
  },
  {
    code: PERMISSIONS.ADMIN_INCIDENT_ESCALATE,
    description: 'Escalate trip incidents to emergency or operational support teams.',
  },
];
