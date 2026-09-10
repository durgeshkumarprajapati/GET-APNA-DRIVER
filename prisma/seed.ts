// Must run before any import that transitively reaches `env.ts` — this
// script is also invoked directly (`tsx prisma/seed.ts`), not only through
// the Prisma CLI (which loads `.env` itself via prisma.config.ts), so it
// cannot assume its caller already populated process.env.
import 'dotenv/config';
import { prisma } from '../src/shared/database/prisma';
import { SYSTEM_ROLES, SYSTEM_ROLE_CODES } from '../src/modules/identity/domain/role-catalog';
import { PERMISSION_CATALOG } from '../src/modules/identity/domain/permission-catalog';
import { ROLE_PERMISSION_MAP } from '../src/modules/identity/domain/rbac-seed-data';
import { LEDGER_ACCOUNT_CATALOG } from '../src/modules/finance/domain/ledger-accounts';
import {
  createUserWithIdentity,
  findIdentityByEmail,
  markIdentityVerified,
  updateAccountStatus,
} from '../src/modules/identity/infrastructure/user-repository';
import { updateUserCredentialPassword } from '../src/modules/identity/infrastructure/credential-repository';
import { upsertRoleAssignment } from '../src/modules/identity/infrastructure/rbac-repository';
import { hashPassword } from '../src/modules/identity/security/password';
import { normalizeEmail } from '../src/modules/identity/validation/email';

interface DevUserSeed {
  label: string;
  email: string;
  password: string;
  roleCode: string;
}

/**
 * Local-development login accounts, one per role, so `npm run dev` has
 * something to sign in as immediately after seeding. Deliberately excluded
 * from anything resembling a production dataset — see the NODE_ENV guard
 * around the call site. Passwords are read from env vars with a documented
 * dev-only fallback (never a real secret) so a fresh clone works with zero
 * configuration; override them via .env if you want different credentials.
 */
const DEV_USERS: DevUserSeed[] = [
  {
    label: 'Administrator',
    email: 'admin@getapnadriver.local',
    password: process.env.SEED_ADMIN_PASSWORD || 'DevAdmin!2026',
    roleCode: SYSTEM_ROLE_CODES.ADMINISTRATOR,
  },
  {
    label: 'Customer',
    email: 'customer@getapnadriver.local',
    password: process.env.SEED_CUSTOMER_PASSWORD || 'DevCustomer!2026',
    roleCode: SYSTEM_ROLE_CODES.CUSTOMER,
  },
  {
    label: 'Driver',
    email: 'driver@getapnadriver.local',
    password: process.env.SEED_DRIVER_PASSWORD || 'DevDriver!2026',
    roleCode: SYSTEM_ROLE_CODES.DRIVER,
  },
];

/**
 * Creates (or updates) one ACTIVE, email-verified login account with the
 * given role — mirrors what `registerWithEmailPassword` +
 * email-verification + admin role-assignment produce together, minus the
 * verification-token round trip, since this is a local dev shortcut, not a
 * public flow. Idempotent: re-running resets the password and role
 * assignment for an already-seeded email instead of erroring.
 */
async function seedDevUser(seed: DevUserSeed): Promise<void> {
  const email = normalizeEmail(seed.email);
  const existing = await findIdentityByEmail(prisma, email);

  let userId: string;
  if (existing) {
    userId = existing.userId;
  } else {
    const { user, identity } = await createUserWithIdentity(prisma, {
      providerType: 'EMAIL',
      providerName: 'email',
      providerSubject: email,
      email,
      phoneNumber: null,
    });
    userId = user.id;
    await markIdentityVerified(prisma, identity.id);
  }

  await updateAccountStatus(prisma, userId, { accountStatus: 'ACTIVE' });
  await updateUserCredentialPassword(prisma, userId, await hashPassword(seed.password));

  const role = await prisma.role.findUniqueOrThrow({ where: { code: seed.roleCode } });
  await upsertRoleAssignment(prisma, { userId, roleId: role.id, assignedBy: null });

  const refCode = `REF-${seed.label.substring(0, 3).toUpperCase()}${userId.substring(0, 4).toUpperCase()}`;
  await prisma.userReferralCode.upsert({
    where: { userId },
    create: { userId, code: refCode },
    update: {},
  });

  console.log(`  ${seed.label}: ${email} / ${seed.password} (Referral Code: ${refCode})`);
}

/**
 * Deterministic, idempotent RBAC seed: system roles, the permission catalog,
 * and the least-privilege role -> permission mapping. Safe to run repeatedly
 * (upsert by unique `code`).
 */
async function main(): Promise<void> {
  for (const role of SYSTEM_ROLES) {
    await prisma.role.upsert({
      where: { code: role.code },
      create: { code: role.code, name: role.name, description: role.description, isSystem: true },
      update: { name: role.name, description: role.description, isSystem: true },
    });
  }

  for (const permission of PERMISSION_CATALOG) {
    await prisma.permission.upsert({
      where: { code: permission.code },
      create: { code: permission.code, description: permission.description },
      update: { description: permission.description },
    });
  }

  for (const [roleCode, permissionCodes] of Object.entries(ROLE_PERMISSION_MAP)) {
    const role = await prisma.role.findUniqueOrThrow({ where: { code: roleCode } });

    for (const permissionCode of permissionCodes) {
      const permission = await prisma.permission.findUniqueOrThrow({
        where: { code: permissionCode },
      });

      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        create: { roleId: role.id, permissionId: permission.id },
        update: {},
      });
    }
  }

  const defaultConfigs = [
    {
      key: 'identity.otp.ttl_seconds',
      value: '180',
      valueType: 'INTEGER' as const,
      category: 'identity',
      description: 'OTP Time to Live in seconds',
      isPublic: false,
    },
    {
      key: 'identity.otp.resend_cooldown_seconds',
      value: '60',
      valueType: 'INTEGER' as const,
      category: 'identity',
      description: 'Cooldown period between OTP resends in seconds',
      isPublic: false,
    },
    {
      key: 'identity.otp.max_attempts',
      value: '5',
      valueType: 'INTEGER' as const,
      category: 'identity',
      description: 'Maximum allowed failed OTP verification attempts',
      isPublic: false,
    },
    {
      key: 'system.app_name',
      value: 'Get Apna Driver',
      valueType: 'STRING' as const,
      category: 'system',
      description: 'Application public display name',
      isPublic: true,
    },
    {
      key: 'system.support_email',
      value: 'support@getapnadriver.com',
      valueType: 'STRING' as const,
      category: 'system',
      description: 'Public support contact email',
      isPublic: true,
    },
    {
      key: 'driver.document.max_file_size_bytes',
      value: '10485760',
      valueType: 'INTEGER' as const,
      category: 'driver',
      description: 'Maximum allowed driver document upload size in bytes (10MB)',
      isPublic: false,
    },
    {
      key: 'driver.onboarding.minimum_age',
      value: '18',
      valueType: 'INTEGER' as const,
      category: 'driver',
      description: 'Minimum required age in years for driver onboarding',
      isPublic: false,
    },
    {
      key: 'driver.onboarding.required_documents',
      value: '["DRIVING_LICENSE","AADHAAR_CARD"]',
      valueType: 'JSON' as const,
      category: 'driver',
      description: 'Required document types for driver onboarding approval',
      isPublic: false,
    },
    {
      key: 'driver.document.allowed_content_types',
      value: '["image/jpeg","image/png","application/pdf"]',
      valueType: 'JSON' as const,
      category: 'driver',
      description: 'Allowed MIME content types for driver document uploads',
      isPublic: false,
    },
    {
      key: 'location.driver.update_min_interval_seconds',
      value: '5',
      valueType: 'INTEGER' as const,
      category: 'location',
      description: 'Minimum allowed interval between driver GPS updates in seconds',
      isPublic: false,
    },
    {
      key: 'location.driver.stale_after_seconds',
      value: '60',
      valueType: 'INTEGER' as const,
      category: 'location',
      description: 'Duration in seconds after which a driver location is considered stale',
      isPublic: false,
    },
    {
      key: 'location.driver.max_accuracy_meters',
      value: '100',
      valueType: 'INTEGER' as const,
      category: 'location',
      description: 'Maximum accepted GPS accuracy radius in meters',
      isPublic: false,
    },
    {
      key: 'location.driver.default_search_radius_meters',
      value: '5000',
      valueType: 'INTEGER' as const,
      category: 'location',
      description: 'Default nearby driver search radius in meters (5km)',
      isPublic: true,
    },
    {
      key: 'location.driver.maximum_search_radius_meters',
      value: '20000',
      valueType: 'INTEGER' as const,
      category: 'location',
      description: 'Maximum allowable nearby driver search radius in meters (20km)',
      isPublic: true,
    },
    {
      key: 'location.history.sample_min_interval_seconds',
      value: '60',
      valueType: 'INTEGER' as const,
      category: 'location',
      description: 'Minimum interval in seconds between saving driver location history samples',
      isPublic: false,
    },
    {
      key: 'booking.matching.initial_radius_meters',
      value: '5000',
      valueType: 'INTEGER' as const,
      category: 'booking',
      description: 'Initial search radius in meters for driver matching (5km)',
      isPublic: false,
    },
    {
      key: 'booking.matching.radius_increment_meters',
      value: '2500',
      valueType: 'INTEGER' as const,
      category: 'booking',
      description: 'Search radius expansion increment in meters (2.5km)',
      isPublic: false,
    },
    {
      key: 'booking.matching.maximum_radius_meters',
      value: '20000',
      valueType: 'INTEGER' as const,
      category: 'booking',
      description: 'Maximum search radius in meters for driver matching (20km)',
      isPublic: false,
    },
    {
      key: 'booking.matching.driver_response_timeout_seconds',
      value: '30',
      valueType: 'INTEGER' as const,
      category: 'booking',
      description: 'Time in seconds a driver has to accept or reject an assignment offer',
      isPublic: false,
    },
    {
      key: 'booking.matching.maximum_candidate_attempts',
      value: '5',
      valueType: 'INTEGER' as const,
      category: 'booking',
      description: 'Maximum number of driver candidate assignment attempts per booking',
      isPublic: false,
    },
    {
      key: 'booking.matching.search_timeout_seconds',
      value: '300',
      valueType: 'INTEGER' as const,
      category: 'booking',
      description: 'Overall timeout in seconds for searching a driver before booking expires',
      isPublic: false,
    },
    {
      key: 'booking.lifecycle.allow_customer_cancellation_after_assignment',
      value: 'true',
      valueType: 'BOOLEAN' as const,
      category: 'booking',
      description: 'Allows customer to cancel booking after a driver has been assigned',
      isPublic: false,
    },
    {
      key: 'booking.lifecycle.allow_customer_cancellation_en_route',
      value: 'true',
      valueType: 'BOOLEAN' as const,
      category: 'booking',
      description: 'Allows customer to cancel booking while driver is en route',
      isPublic: false,
    },
    {
      key: 'booking.lifecycle.allow_customer_cancellation_after_arrival',
      value: 'false',
      valueType: 'BOOLEAN' as const,
      category: 'booking',
      description: 'Allows customer to cancel booking after driver has arrived at pickup',
      isPublic: false,
    },
    {
      key: 'booking.lifecycle.driver_location_visibility_enabled',
      value: 'true',
      valueType: 'BOOLEAN' as const,
      category: 'booking',
      description: 'Enables customer live driver location tracking during active trip lifecycle',
      isPublic: true,
    },
    {
      key: 'finance.currency',
      value: 'INR',
      valueType: 'STRING' as const,
      category: 'finance',
      description: 'Default currency for payments, ledger entries, and wallets',
      isPublic: true,
    },
    {
      key: 'finance.platform_commission_percentage',
      value: '20.0000',
      valueType: 'DECIMAL' as const,
      category: 'finance',
      description: 'Platform commission percentage taken from each captured booking payment',
      isPublic: false,
    },
    {
      key: 'finance.pricing.base_fare_amount',
      value: '299.0000',
      valueType: 'DECIMAL' as const,
      category: 'finance',
      description: 'Default base fare amount for one-way driver bookings in INR',
      isPublic: true,
    },
    {
      key: 'referral.customer_reward_amount',
      value: '200.0000',
      valueType: 'DECIMAL' as const,
      category: 'referral',
      description:
        'Reward amount in INR credited when a referred customer completes their first trip',
      isPublic: true,
    },
    {
      key: 'referral.driver_reward_amount',
      value: '500.0000',
      valueType: 'DECIMAL' as const,
      category: 'referral',
      description:
        'Reward amount in INR credited when a referred driver partner completes approved onboarding',
      isPublic: true,
    },
    {
      key: 'finance.pricing.per_minute_rate',
      value: '3.0000',
      valueType: 'DECIMAL' as const,
      category: 'finance',
      description:
        'Per-minute rate (against estimatedDurationMinutes) used by the placeholder pricing calculation',
      isPublic: true,
    },
    {
      key: 'finance.pricing.minimum_fare_amount',
      value: '100.0000',
      valueType: 'DECIMAL' as const,
      category: 'finance',
      description: 'Minimum amount charged for any booking',
      isPublic: true,
    },
    {
      key: 'finance.payment.order_expiration_seconds',
      value: '900',
      valueType: 'INTEGER' as const,
      category: 'finance',
      description:
        'How long a created Razorpay order remains valid before it should be considered expired',
      isPublic: false,
    },
    {
      key: 'finance.settlement.enabled',
      value: 'true',
      valueType: 'BOOLEAN' as const,
      category: 'finance',
      description: 'Master switch for creating new driver settlements',
      isPublic: false,
    },
    {
      key: 'finance.settlement.minimum_amount',
      value: '500.0000',
      valueType: 'DECIMAL' as const,
      category: 'finance',
      description: 'Minimum amount a driver settlement may be created for',
      isPublic: true,
    },
    {
      key: 'finance.refund.enabled',
      value: 'true',
      valueType: 'BOOLEAN' as const,
      category: 'finance',
      description: 'Master switch for initiating new refunds',
      isPublic: false,
    },
    {
      key: 'finance.refund.max_refund_window_days',
      value: '30',
      valueType: 'INTEGER' as const,
      category: 'finance',
      description: 'Number of days after capture during which a payment remains refundable',
      isPublic: false,
    },
    {
      key: 'notification.outbox.batch_size',
      value: '50',
      valueType: 'INTEGER' as const,
      category: 'notification',
      description: 'Maximum number of outbox events claimed in one polling batch',
      isPublic: false,
    },
    {
      key: 'notification.outbox.poll_interval_seconds',
      value: '5',
      valueType: 'INTEGER' as const,
      category: 'notification',
      description: 'Polling interval in seconds for the outbox dispatcher worker',
      isPublic: false,
    },
    {
      key: 'notification.outbox.lock_ttl_seconds',
      value: '300',
      valueType: 'INTEGER' as const,
      category: 'notification',
      description:
        'Seconds a claimed (PROCESSING) outbox event is considered stale and eligible for re-claim by another worker after a crash',
      isPublic: false,
    },
    {
      key: 'notification.outbox.max_attempts',
      value: '5',
      valueType: 'INTEGER' as const,
      category: 'notification',
      description: 'Maximum retry attempts for processing an outbox event before marking FAILED',
      isPublic: false,
    },
    {
      key: 'notification.outbox.initial_retry_delay_seconds',
      value: '10',
      valueType: 'INTEGER' as const,
      category: 'notification',
      description: 'Initial retry delay in seconds for exponential backoff',
      isPublic: false,
    },
    {
      key: 'notification.outbox.maximum_retry_delay_seconds',
      value: '3600',
      valueType: 'INTEGER' as const,
      category: 'notification',
      description: 'Maximum retry delay cap in seconds for exponential backoff',
      isPublic: false,
    },
    {
      key: 'notification.push.enabled',
      value: 'true',
      valueType: 'BOOLEAN' as const,
      category: 'notification',
      description: 'Master switch for web push notification delivery',
      isPublic: false,
    },
    {
      key: 'notification.email.enabled',
      value: 'true',
      valueType: 'BOOLEAN' as const,
      category: 'notification',
      description: 'Master switch for email notification delivery',
      isPublic: false,
    },
    {
      key: 'notification.sms.enabled',
      value: 'true',
      valueType: 'BOOLEAN' as const,
      category: 'notification',
      description: 'Master switch for SMS notification delivery',
      isPublic: false,
    },
    {
      key: 'notification.retention_days',
      value: '90',
      valueType: 'INTEGER' as const,
      category: 'notification',
      description: 'Number of days to retain delivered notifications before cleanup',
      isPublic: false,
    },
    {
      key: 'pricing.base_fare',
      value: '100.0000',
      valueType: 'DECIMAL' as const,
      category: 'finance',
      description: 'Base starting fare in INR for all driver bookings',
      isPublic: true,
    },
    {
      key: 'pricing.per_kilometer_rate',
      value: '15.0000',
      valueType: 'DECIMAL' as const,
      category: 'finance',
      description: 'Per-kilometer distance rate in INR',
      isPublic: true,
    },
    {
      key: 'pricing.per_minute_rate',
      value: '2.0000',
      valueType: 'DECIMAL' as const,
      category: 'finance',
      description: 'Per-minute duration rate in INR',
      isPublic: true,
    },
    {
      key: 'pricing.minimum_fare',
      value: '150.0000',
      valueType: 'DECIMAL' as const,
      category: 'finance',
      description: 'Minimum total booking fare in INR',
      isPublic: true,
    },
    {
      key: 'pricing.platform_fee',
      value: '25.0000',
      valueType: 'DECIMAL' as const,
      category: 'finance',
      description: 'Fixed platform operational fee in INR per booking',
      isPublic: true,
    },
    {
      key: 'pricing.hourly_rate',
      value: '250.0000',
      valueType: 'DECIMAL' as const,
      category: 'finance',
      description: 'Base hourly package rate in INR for HOURLY booking type',
      isPublic: true,
    },
    {
      key: 'pricing.daily_rate',
      value: '1800.0000',
      valueType: 'DECIMAL' as const,
      category: 'finance',
      description: 'Base daily package rate in INR for FULL_DAY and MULTI_DAY booking types',
      isPublic: true,
    },
  ];

  for (const config of defaultConfigs) {
    await prisma.systemConfiguration.upsert({
      where: { key: config.key },
      create: config,
      update: {
        valueType: config.valueType,
        category: config.category,
        description: config.description,
        isPublic: config.isPublic,
      },
    });
  }

  for (const account of LEDGER_ACCOUNT_CATALOG) {
    await prisma.ledgerAccount.upsert({
      where: { code: account.code },
      create: {
        code: account.code,
        name: account.name,
        description: account.description,
        normalBalance: account.normalBalance,
        isSystem: true,
      },
      update: {
        name: account.name,
        description: account.description,
        normalBalance: account.normalBalance,
        isSystem: true,
      },
    });
  }

  console.log(
    'Seed complete: roles, permissions, role-permission mappings, system configurations, and the ledger chart of accounts are up to date.',
  );

  // Dev login accounts — never seeded against a production database, even
  // if this script is accidentally pointed at one.
  if (process.env.NODE_ENV !== 'production') {
    console.log('\nSeeding local dev login accounts:');
    for (const seed of DEV_USERS) {
      await seedDevUser(seed);
    }
    console.log(
      '\nUse these to test the login/logout flow at /login. Override via SEED_ADMIN_PASSWORD / SEED_CUSTOMER_PASSWORD / SEED_DRIVER_PASSWORD in .env if you want different credentials.',
    );
  }
}

main()
  .catch((error: unknown) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
