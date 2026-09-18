import 'server-only';
import { NotificationType, NotificationPriority } from '@prisma/client';
import { NotificationCategory } from './notification-preference-service';

export interface NotificationMetaTemplate {
  category: NotificationCategory;
  priority: NotificationPriority;
  defaultActionUrl: string;
  imageAsset?: string;
  iconName: string;
}

export const NOTIFICATION_TEMPLATE_MAP: Record<NotificationType, NotificationMetaTemplate> = {
  // Booking Events
  BOOKING_CREATED: {
    category: 'BOOKING',
    priority: NotificationPriority.NORMAL,
    defaultActionUrl: '/customer/bookings',
    iconName: 'local_taxi',
  },
  BOOKING_DRIVER_OFFERED: {
    category: 'BOOKING',
    priority: NotificationPriority.HIGH,
    defaultActionUrl: '/driver/incoming-bookings',
    iconName: 'near_me',
  },
  BOOKING_DRIVER_ASSIGNED: {
    category: 'BOOKING',
    priority: NotificationPriority.HIGH,
    defaultActionUrl: '/customer/bookings',
    iconName: 'person_pin_circle',
  },
  BOOKING_DRIVER_EN_ROUTE: {
    category: 'BOOKING',
    priority: NotificationPriority.HIGH,
    defaultActionUrl: '/customer/bookings',
    iconName: 'directions_car',
  },
  BOOKING_DRIVER_ARRIVED: {
    category: 'BOOKING',
    priority: NotificationPriority.URGENT,
    defaultActionUrl: '/customer/bookings',
    iconName: 'where_to_vote',
  },
  BOOKING_TRIP_STARTED: {
    category: 'BOOKING',
    priority: NotificationPriority.HIGH,
    defaultActionUrl: '/customer/bookings',
    iconName: 'route',
  },
  BOOKING_TRIP_COMPLETED: {
    category: 'BOOKING',
    priority: NotificationPriority.NORMAL,
    defaultActionUrl: '/customer/bookings',
    iconName: 'task_alt',
  },
  BOOKING_CANCELLED: {
    category: 'BOOKING',
    priority: NotificationPriority.HIGH,
    defaultActionUrl: '/customer/bookings',
    iconName: 'cancel',
  },
  BOOKING_EXPIRED: {
    category: 'BOOKING',
    priority: NotificationPriority.NORMAL,
    defaultActionUrl: '/customer/bookings',
    iconName: 'timer_off',
  },
  BOOKING_MESSAGE_RECEIVED: {
    category: 'BOOKING',
    priority: NotificationPriority.NORMAL,
    // Overridden per-notification with the recipient-appropriate booking
    // detail URL (customer vs. driver) — see notification-event-handlers.ts.
    defaultActionUrl: '/bookings',
    iconName: 'chat',
  },

  // Payment & Finance
  PAYMENT_CREATED: {
    category: 'PAYMENT',
    priority: NotificationPriority.NORMAL,
    defaultActionUrl: '/customer/wallet',
    iconName: 'payments',
  },
  PAYMENT_PROCESSING: {
    category: 'PAYMENT',
    priority: NotificationPriority.NORMAL,
    defaultActionUrl: '/customer/wallet',
    iconName: 'hourglass_empty',
  },
  PAYMENT_CAPTURED: {
    category: 'PAYMENT',
    priority: NotificationPriority.NORMAL,
    defaultActionUrl: '/customer/wallet',
    iconName: 'check_circle',
  },
  PAYMENT_FAILED: {
    category: 'PAYMENT',
    priority: NotificationPriority.HIGH,
    defaultActionUrl: '/customer/wallet',
    iconName: 'error_outline',
  },
  PAYMENT_REFUNDED: {
    category: 'PAYMENT',
    priority: NotificationPriority.NORMAL,
    defaultActionUrl: '/customer/wallet',
    iconName: 'currency_rupee',
  },
  DRIVER_EARNINGS_RECOGNIZED: {
    category: 'PAYMENT',
    priority: NotificationPriority.NORMAL,
    defaultActionUrl: '/driver/earnings',
    iconName: 'account_balance_wallet',
  },
  SETTLEMENT_CREATED: {
    category: 'PAYMENT',
    priority: NotificationPriority.NORMAL,
    defaultActionUrl: '/driver/settlements',
    iconName: 'account_balance',
  },
  SETTLEMENT_COMPLETED: {
    category: 'PAYMENT',
    priority: NotificationPriority.NORMAL,
    defaultActionUrl: '/driver/settlements',
    iconName: 'verified',
  },
  SETTLEMENT_FAILED: {
    category: 'PAYMENT',
    priority: NotificationPriority.HIGH,
    defaultActionUrl: '/driver/settlements',
    iconName: 'warning',
  },
  INVOICE_READY: {
    category: 'INVOICE',
    priority: NotificationPriority.NORMAL,
    defaultActionUrl: '/customer/invoices',
    iconName: 'receipt_long',
  },

  // Referral 2.0
  REFERRAL_INVITED: {
    category: 'REFERRAL',
    priority: NotificationPriority.NORMAL,
    defaultActionUrl: '/customer/referral',
    imageAsset: '/GiftBox.png',
    iconName: 'group_add',
  },
  REFERRAL_QUALIFIED: {
    category: 'REFERRAL',
    priority: NotificationPriority.HIGH,
    defaultActionUrl: '/customer/referral',
    imageAsset: '/GiftBox1.png',
    iconName: 'card_giftcard',
  },
  REFERRAL_REWARDED: {
    category: 'REFERRAL',
    priority: NotificationPriority.HIGH,
    defaultActionUrl: '/customer/referral',
    imageAsset: '/GiftBox.png',
    iconName: 'redeem',
  },
  REFERRAL_CAMPAIGN_ACTIVATED: {
    category: 'REFERRAL',
    priority: NotificationPriority.NORMAL,
    defaultActionUrl: '/customer/referral',
    imageAsset: '/GiftBox1.png',
    iconName: 'campaign',
  },

  // Loyalty & Rewards
  LOYALTY_POINTS_EARNED: {
    category: 'LOYALTY',
    priority: NotificationPriority.NORMAL,
    defaultActionUrl: '/customer/rewards',
    imageAsset: '/GiftBox1.png',
    iconName: 'stars',
  },
  LOYALTY_TIER_UPGRADED: {
    category: 'LOYALTY',
    priority: NotificationPriority.HIGH,
    defaultActionUrl: '/customer/rewards',
    imageAsset: '/GiftBox.png',
    iconName: 'military_tech',
  },
  REWARD_UNLOCKED: {
    category: 'REWARD',
    priority: NotificationPriority.HIGH,
    defaultActionUrl: '/customer/rewards',
    imageAsset: '/GiftBox1.png',
    iconName: 'card_membership',
  },
  REWARD_REDEEMED: {
    category: 'REWARD',
    priority: NotificationPriority.NORMAL,
    defaultActionUrl: '/customer/rewards',
    iconName: 'shopping_bag',
  },
  SCRATCH_CARD_AVAILABLE: {
    category: 'SCRATCH',
    priority: NotificationPriority.HIGH,
    defaultActionUrl: '/customer/rewards',
    imageAsset: '/scratchCard.png',
    iconName: 'style',
  },
  SCRATCH_REWARD_REVEALED: {
    category: 'SCRATCH',
    priority: NotificationPriority.HIGH,
    defaultActionUrl: '/customer/rewards',
    imageAsset: '/ScratchCard1.png',
    iconName: 'auto_awesome',
  },

  // Promotions & Coupons
  PROMOTION_AVAILABLE: {
    category: 'PROMOTION',
    priority: NotificationPriority.LOW,
    defaultActionUrl: '/customer/offers',
    imageAsset: '/DiscountImg.png',
    iconName: 'local_offer',
  },
  COUPON_AVAILABLE: {
    category: 'COUPON',
    priority: NotificationPriority.LOW,
    defaultActionUrl: '/customer/offers',
    imageAsset: '/DiscountImg1.png',
    iconName: 'confirmation_number',
  },
  COUPON_EXPIRING_SOON: {
    category: 'COUPON',
    priority: NotificationPriority.NORMAL,
    defaultActionUrl: '/customer/offers',
    imageAsset: '/DiscountImg.png',
    iconName: 'alarm',
  },

  // Driver Engagement
  INCENTIVE_PROGRESS: {
    category: 'INCENTIVE',
    priority: NotificationPriority.NORMAL,
    defaultActionUrl: '/driver/earnings',
    iconName: 'trending_up',
  },
  INCENTIVE_REWARDED: {
    category: 'INCENTIVE',
    priority: NotificationPriority.HIGH,
    defaultActionUrl: '/driver/earnings',
    iconName: 'workspace_premium',
  },
  GOAL_PROGRESS: {
    category: 'GOAL',
    priority: NotificationPriority.NORMAL,
    defaultActionUrl: '/driver/earnings',
    iconName: 'flag',
  },
  GOAL_COMPLETED: {
    category: 'GOAL',
    priority: NotificationPriority.HIGH,
    defaultActionUrl: '/driver/earnings',
    iconName: 'emoji_events',
  },
  ACHIEVEMENT_UNLOCKED: {
    category: 'ACHIEVEMENT',
    priority: NotificationPriority.HIGH,
    defaultActionUrl: '/driver/achievements',
    iconName: 'military_tech',
  },
  STREAK_MILESTONE: {
    category: 'STREAK',
    priority: NotificationPriority.NORMAL,
    defaultActionUrl: '/driver/earnings',
    iconName: 'local_fire_department',
  },

  // Scheduled Rides
  SCHEDULED_RIDE_CREATED: {
    category: 'SCHEDULED_RIDE',
    priority: NotificationPriority.NORMAL,
    defaultActionUrl: '/customer/scheduled-rides',
    iconName: 'event',
  },
  SCHEDULED_RIDE_REMINDER: {
    category: 'SCHEDULED_RIDE',
    priority: NotificationPriority.HIGH,
    defaultActionUrl: '/customer/scheduled-rides',
    iconName: 'edit_calendar',
  },
  SCHEDULED_RIDE_GENERATED: {
    category: 'SCHEDULED_RIDE',
    priority: NotificationPriority.HIGH,
    defaultActionUrl: '/customer/scheduled-rides',
    iconName: 'schedule_send',
  },
  SCHEDULED_RIDE_CANCELLED: {
    category: 'SCHEDULED_RIDE',
    priority: NotificationPriority.NORMAL,
    defaultActionUrl: '/customer/scheduled-rides',
    iconName: 'event_busy',
  },

  // Driver Compliance & Onboarding
  DRIVER_APPLICATION_APPROVED: {
    category: 'DOCUMENT',
    priority: NotificationPriority.HIGH,
    defaultActionUrl: '/driver/profile',
    iconName: 'verified_user',
  },
  DRIVER_APPLICATION_REJECTED: {
    category: 'DOCUMENT',
    priority: NotificationPriority.HIGH,
    defaultActionUrl: '/driver/documents',
    iconName: 'gpp_bad',
  },
  DRIVER_APPLICATION_CHANGES_REQUESTED: {
    category: 'DOCUMENT',
    priority: NotificationPriority.HIGH,
    defaultActionUrl: '/driver/documents',
    iconName: 'published_with_changes',
  },
  DRIVER_DOCUMENT_VERIFIED: {
    category: 'DOCUMENT',
    priority: NotificationPriority.NORMAL,
    defaultActionUrl: '/driver/documents',
    iconName: 'assignment_turned_in',
  },
  DRIVER_DOCUMENT_REJECTED: {
    category: 'DOCUMENT',
    priority: NotificationPriority.HIGH,
    defaultActionUrl: '/driver/documents',
    iconName: 'assignment_late',
  },

  // Support & Safety
  SUPPORT_TICKET_CREATED: {
    category: 'SUPPORT',
    priority: NotificationPriority.NORMAL,
    defaultActionUrl: '/customer/support',
    iconName: 'contact_support',
  },
  SUPPORT_TICKET_UPDATED: {
    category: 'SUPPORT',
    priority: NotificationPriority.NORMAL,
    defaultActionUrl: '/customer/support',
    iconName: 'support_agent',
  },
  SUPPORT_MESSAGE_RECEIVED: {
    category: 'SUPPORT',
    priority: NotificationPriority.NORMAL,
    defaultActionUrl: '/customer/support',
    iconName: 'chat',
  },
  SAFETY_SOS_TRIGGERED: {
    category: 'SAFETY',
    priority: NotificationPriority.URGENT,
    defaultActionUrl: '/customer/safety-sos',
    iconName: 'sos',
  },
  SAFETY_INCIDENT_UPDATED: {
    category: 'SAFETY',
    priority: NotificationPriority.HIGH,
    defaultActionUrl: '/customer/safety-sos',
    iconName: 'health_and_safety',
  },
  DISPUTE_CREATED: {
    category: 'SAFETY',
    priority: NotificationPriority.HIGH,
    defaultActionUrl: '/customer/support',
    iconName: 'gavel',
  },
  DISPUTE_UPDATED: {
    category: 'SAFETY',
    priority: NotificationPriority.NORMAL,
    defaultActionUrl: '/customer/support',
    iconName: 'balance',
  },
  DISPUTE_RESOLVED: {
    category: 'SAFETY',
    priority: NotificationPriority.NORMAL,
    defaultActionUrl: '/customer/support',
    iconName: 'fact_check',
  },
  FAVORITE_DRIVER_AVAILABLE: {
    category: 'FAVORITE_DRIVER',
    priority: NotificationPriority.NORMAL,
    defaultActionUrl: '/customer/favorites',
    iconName: 'favorite',
  },
  ACCOUNT_SECURITY_UPDATE: {
    category: 'ACCOUNT',
    priority: NotificationPriority.HIGH,
    defaultActionUrl: '/customer/settings',
    iconName: 'security',
  },

  // System & Reviews
  SYSTEM_ANNOUNCEMENT: {
    category: 'SYSTEM',
    priority: NotificationPriority.NORMAL,
    defaultActionUrl: '/notifications',
    iconName: 'campaign',
  },
  SYSTEM_OFFER: {
    category: 'PROMOTION',
    priority: NotificationPriority.LOW,
    defaultActionUrl: '/customer/offers',
    imageAsset: '/DiscountImg.png',
    iconName: 'local_offer',
  },
  SYSTEM_COUPON: {
    category: 'COUPON',
    priority: NotificationPriority.LOW,
    defaultActionUrl: '/customer/offers',
    imageAsset: '/DiscountImg1.png',
    iconName: 'confirmation_number',
  },
  DRIVER_RATING_RECEIVED: {
    category: 'REVIEW',
    priority: NotificationPriority.LOW,
    defaultActionUrl: '/driver/ratings-and-reviews',
    iconName: 'star',
  },
  REVIEW_MODERATED: {
    category: 'REVIEW',
    priority: NotificationPriority.LOW,
    defaultActionUrl: '/customer/reviews',
    iconName: 'rate_review',
  },

  // Admin Operations
  ADMIN_SOS_ALERT: {
    category: 'SAFETY',
    priority: NotificationPriority.URGENT,
    defaultActionUrl: '/admin/live-ops-console',
    iconName: 'e911_emergency',
  },
  ADMIN_SUPPORT_ESCALATION: {
    category: 'SUPPORT',
    priority: NotificationPriority.HIGH,
    defaultActionUrl: '/admin/support/tickets',
    iconName: 'support',
  },
  ADMIN_SETTLEMENT_FAILURE: {
    category: 'FINANCE',
    priority: NotificationPriority.HIGH,
    defaultActionUrl: '/admin/settlements',
    iconName: 'report_problem',
  },
  ADMIN_DRIVER_DOCUMENT_PENDING: {
    category: 'DRIVER_COMPLIANCE',
    priority: NotificationPriority.NORMAL,
    defaultActionUrl: '/admin/drivers',
    iconName: 'pending_actions',
  },
  ADMIN_CAMPAIGN_LIMIT_REACHED: {
    category: 'REFERRAL',
    priority: NotificationPriority.NORMAL,
    defaultActionUrl: '/admin/referral-growth',
    iconName: 'notifications_off',
  },
};

export function getTemplateForNotificationType(type: NotificationType): NotificationMetaTemplate {
  return (
    NOTIFICATION_TEMPLATE_MAP[type] ?? {
      category: 'SYSTEM',
      priority: NotificationPriority.NORMAL,
      defaultActionUrl: '/notifications',
      iconName: 'notifications',
    }
  );
}
