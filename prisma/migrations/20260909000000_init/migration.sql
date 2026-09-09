-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "citext";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "postgis";

-- CreateEnum
CREATE TYPE "account_status" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED', 'DELETED');

-- CreateEnum
CREATE TYPE "identity_provider_type" AS ENUM ('EMAIL', 'PHONE', 'OAUTH');

-- CreateEnum
CREATE TYPE "outbox_event_status" AS ENUM ('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED');

-- CreateEnum
CREATE TYPE "config_value_type" AS ENUM ('STRING', 'INTEGER', 'DECIMAL', 'BOOLEAN', 'JSON');

-- CreateEnum
CREATE TYPE "theme_preference" AS ENUM ('SYSTEM', 'LIGHT', 'DARK');

-- CreateEnum
CREATE TYPE "driver_onboarding_status" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'UNDER_REVIEW', 'CHANGES_REQUESTED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "driver_verification_status" AS ENUM ('NOT_VERIFIED', 'PENDING_VERIFICATION', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "driver_approval_status" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "driver_availability_status" AS ENUM ('OFFLINE', 'AVAILABLE', 'BUSY', 'UNAVAILABLE');

-- CreateEnum
CREATE TYPE "driver_document_type" AS ENUM ('DRIVING_LICENSE', 'AADHAAR_CARD', 'PROFILE_PHOTO', 'BACKGROUND_VERIFICATION', 'POLICE_VERIFICATION', 'ADDRESS_PROOF');

-- CreateEnum
CREATE TYPE "driver_document_status" AS ENUM ('UPLOADED', 'PENDING_VERIFICATION', 'VERIFIED', 'REJECTED', 'EXPIRED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "location_source" AS ENUM ('BROWSER_GPS', 'MAP_SELECTION', 'SAVED_LOCATION', 'MOBILE_GPS');

-- CreateEnum
CREATE TYPE "booking_status" AS ENUM ('DRAFT', 'SEARCHING_DRIVER', 'DRIVER_ASSIGNED', 'DRIVER_EN_ROUTE', 'DRIVER_ARRIVED', 'TRIP_IN_PROGRESS', 'TRIP_COMPLETED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "booking_type" AS ENUM ('ONE_WAY', 'ROUND_TRIP', 'HOURLY', 'FULL_DAY', 'MULTI_DAY');

-- CreateEnum
CREATE TYPE "assignment_attempt_status" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "payment_status" AS ENUM ('CREATED', 'PROCESSING', 'CAPTURED', 'FAILED', 'CANCELLED', 'PARTIALLY_REFUNDED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "payment_attempt_status" AS ENUM ('INITIATED', 'SUCCEEDED', 'FAILED');

-- CreateEnum
CREATE TYPE "webhook_processing_status" AS ENUM ('RECEIVED', 'PROCESSED', 'FAILED', 'IGNORED');

-- CreateEnum
CREATE TYPE "ledger_balance_side" AS ENUM ('DEBIT', 'CREDIT');

-- CreateEnum
CREATE TYPE "financial_transaction_type" AS ENUM ('PAYMENT_CAPTURED', 'PAYMENT_REFUNDED', 'SETTLEMENT_CREATED', 'SETTLEMENT_PAID', 'SETTLEMENT_REVERSED');

-- CreateEnum
CREATE TYPE "settlement_status" AS ENUM ('PENDING', 'PROCESSING', 'PAID', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "refund_status" AS ENUM ('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED');

-- CreateEnum
CREATE TYPE "wallet_change_type" AS ENUM ('EARNING_RECOGNIZED', 'EARNING_REVERSED', 'SETTLEMENT_RESERVED', 'SETTLEMENT_RELEASED', 'SETTLEMENT_COMPLETED');

-- CreateEnum
CREATE TYPE "notification_type" AS ENUM ('BOOKING_CREATED', 'BOOKING_DRIVER_OFFERED', 'BOOKING_DRIVER_ASSIGNED', 'BOOKING_DRIVER_EN_ROUTE', 'BOOKING_DRIVER_ARRIVED', 'BOOKING_TRIP_STARTED', 'BOOKING_TRIP_COMPLETED', 'BOOKING_CANCELLED', 'BOOKING_EXPIRED', 'PAYMENT_CREATED', 'PAYMENT_PROCESSING', 'PAYMENT_CAPTURED', 'PAYMENT_FAILED', 'PAYMENT_REFUNDED', 'DRIVER_APPLICATION_APPROVED', 'DRIVER_APPLICATION_REJECTED', 'DRIVER_APPLICATION_CHANGES_REQUESTED', 'DRIVER_DOCUMENT_VERIFIED', 'DRIVER_DOCUMENT_REJECTED', 'DRIVER_EARNINGS_RECOGNIZED', 'SETTLEMENT_CREATED', 'SETTLEMENT_COMPLETED', 'SETTLEMENT_FAILED', 'SYSTEM_ANNOUNCEMENT', 'SYSTEM_OFFER', 'SYSTEM_COUPON');

-- CreateEnum
CREATE TYPE "notification_priority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "notification_status" AS ENUM ('UNREAD', 'READ', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "delivery_channel" AS ENUM ('IN_APP', 'PUSH', 'EMAIL', 'SMS');

-- CreateEnum
CREATE TYPE "delivery_status" AS ENUM ('PENDING', 'QUEUED', 'PROCESSING', 'DELIVERED', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "campaign_target_audience" AS ENUM ('ALL_CUSTOMERS', 'ALL_DRIVERS', 'ALL_USERS', 'SELECTED_USERS');

-- CreateEnum
CREATE TYPE "campaign_status" AS ENUM ('DRAFT', 'SCHEDULED', 'PROCESSING', 'COMPLETED', 'CANCELLED', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "account_status" "account_status" NOT NULL DEFAULT 'PENDING',
    "deleted_at" TIMESTAMPTZ(6),
    "deleted_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_identities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "provider_type" "identity_provider_type" NOT NULL,
    "provider_name" TEXT NOT NULL,
    "provider_subject" TEXT NOT NULL,
    "email" CITEXT,
    "phone_number" TEXT,
    "verified_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "user_identities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "role_id" UUID NOT NULL,
    "permission_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id","permission_id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "assigned_by" UUID,
    "assigned_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_by" UUID,
    "revoked_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "actor_user_id" UUID,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "before_state" JSONB,
    "after_state" JSONB,
    "request_metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbox_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_type" TEXT NOT NULL,
    "aggregate_type" TEXT NOT NULL,
    "aggregate_id" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "outbox_event_status" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "available_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_attempt_at" TIMESTAMPTZ(6),
    "locked_at" TIMESTAMPTZ(6),
    "locked_by" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMPTZ(6),

    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_credentials" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "password_hash" TEXT NOT NULL,
    "algorithm" TEXT NOT NULL DEFAULT 'argon2id',
    "password_version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "user_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "session_token_hash" TEXT NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "revoked_at" TIMESTAMPTZ(6),
    "last_used_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_verification_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "identity_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "used_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_verification_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "used_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_challenges" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "phone_number" TEXT NOT NULL,
    "otp_hash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 5,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "verified_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_configurations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "value_type" "config_value_type" NOT NULL DEFAULT 'STRING',
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'system',
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "updated_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "system_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "first_name" TEXT,
    "last_name" TEXT,
    "display_name" TEXT,
    "avatar_url" TEXT,
    "date_of_birth" TIMESTAMPTZ(6),
    "default_location_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "customer_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_locations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "address_line1" TEXT NOT NULL,
    "address_line2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'India',
    "postal_code" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "saved_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_preferences" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "theme" "theme_preference" NOT NULL DEFAULT 'SYSTEM',
    "language" TEXT NOT NULL DEFAULT 'en',
    "push_notifications_enabled" BOOLEAN NOT NULL DEFAULT true,
    "sms_notifications_enabled" BOOLEAN NOT NULL DEFAULT true,
    "email_notifications_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "customer_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "first_name" TEXT,
    "last_name" TEXT,
    "display_name" TEXT,
    "profile_image_url" TEXT,
    "date_of_birth" TIMESTAMPTZ(6),
    "gender" TEXT,
    "bio" TEXT,
    "driving_experience_years" INTEGER NOT NULL DEFAULT 0,
    "primary_service_area" TEXT,
    "onboarding_status" "driver_onboarding_status" NOT NULL DEFAULT 'NOT_STARTED',
    "verification_status" "driver_verification_status" NOT NULL DEFAULT 'NOT_VERIFIED',
    "approval_status" "driver_approval_status" NOT NULL DEFAULT 'PENDING',
    "availability_status" "driver_availability_status" NOT NULL DEFAULT 'OFFLINE',
    "rejection_reason" TEXT,
    "changes_requested_reason" TEXT,
    "approved_at" TIMESTAMPTZ(6),
    "approved_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "driver_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_documents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "driver_profile_id" UUID NOT NULL,
    "document_type" "driver_document_type" NOT NULL,
    "document_number" TEXT,
    "storage_key" TEXT NOT NULL,
    "original_file_name" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "file_size_bytes" INTEGER NOT NULL,
    "checksum" TEXT,
    "status" "driver_document_status" NOT NULL DEFAULT 'UPLOADED',
    "rejection_reason" TEXT,
    "verified_at" TIMESTAMPTZ(6),
    "verified_by" UUID,
    "expires_at" TIMESTAMPTZ(6),
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_current" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "driver_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_onboarding_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "driver_profile_id" UUID NOT NULL,
    "actor_user_id" UUID,
    "from_status" TEXT NOT NULL,
    "to_status" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "driver_onboarding_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_current_locations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "driver_profile_id" UUID NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "accuracy" DOUBLE PRECISION,
    "heading" DOUBLE PRECISION,
    "speed" DOUBLE PRECISION,
    "source" "location_source" NOT NULL DEFAULT 'BROWSER_GPS',
    "captured_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "driver_current_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_location_histories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "driver_profile_id" UUID NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "accuracy" DOUBLE PRECISION,
    "heading" DOUBLE PRECISION,
    "speed" DOUBLE PRECISION,
    "source" "location_source" NOT NULL DEFAULT 'BROWSER_GPS',
    "captured_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "driver_location_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_current_locations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "accuracy" DOUBLE PRECISION,
    "address" TEXT,
    "source" "location_source" NOT NULL DEFAULT 'BROWSER_GPS',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "customer_current_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "idempotency_key" TEXT,
    "customer_id" UUID NOT NULL,
    "driver_profile_id" UUID,
    "status" "booking_status" NOT NULL DEFAULT 'DRAFT',
    "booking_type" "booking_type" NOT NULL DEFAULT 'ONE_WAY',
    "pickup_latitude" DOUBLE PRECISION NOT NULL,
    "pickup_longitude" DOUBLE PRECISION NOT NULL,
    "pickup_address" TEXT NOT NULL,
    "pickup_label" TEXT,
    "requested_start_time" TIMESTAMPTZ(6),
    "estimated_duration_minutes" INTEGER,
    "customer_notes" TEXT,
    "requested_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "search_started_at" TIMESTAMPTZ(6),
    "assigned_at" TIMESTAMPTZ(6),
    "driver_en_route_at" TIMESTAMPTZ(6),
    "driver_arrived_at" TIMESTAMPTZ(6),
    "trip_started_at" TIMESTAMPTZ(6),
    "trip_completed_at" TIMESTAMPTZ(6),
    "cancelled_at" TIMESTAMPTZ(6),
    "cancelled_by" UUID,
    "cancellation_reason" TEXT,
    "expires_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_assignment_attempts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "booking_id" UUID NOT NULL,
    "driver_profile_id" UUID NOT NULL,
    "attempt_number" INTEGER NOT NULL,
    "status" "assignment_attempt_status" NOT NULL DEFAULT 'PENDING',
    "offered_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responded_at" TIMESTAMPTZ(6),
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "rejection_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "booking_assignment_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "booking_id" UUID NOT NULL,
    "actor_user_id" UUID,
    "from_status" TEXT NOT NULL,
    "to_status" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "booking_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "driver_profile_id" UUID,
    "amount" DECIMAL(19,4) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "payment_status" NOT NULL DEFAULT 'CREATED',
    "provider" TEXT NOT NULL DEFAULT 'razorpay',
    "provider_order_id" TEXT,
    "provider_payment_id" TEXT,
    "idempotency_key" TEXT,
    "commission_percentage_snapshot" DECIMAL(7,4),
    "commission_amount" DECIMAL(19,4),
    "driver_earnings_amount" DECIMAL(19,4),
    "failure_reason" TEXT,
    "captured_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_attempts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "payment_id" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_order_id" TEXT,
    "provider_payment_id" TEXT,
    "status" "payment_attempt_status" NOT NULL DEFAULT 'INITIATED',
    "failure_code" TEXT,
    "failure_reason" TEXT,
    "response_snapshot" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_webhook_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "provider" TEXT NOT NULL DEFAULT 'razorpay',
    "provider_event_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "signature_verified" BOOLEAN NOT NULL,
    "processing_status" "webhook_processing_status" NOT NULL DEFAULT 'RECEIVED',
    "processed_at" TIMESTAMPTZ(6),
    "error_details" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_accounts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "normal_balance" "ledger_balance_side" NOT NULL,
    "is_system" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_transactions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "transaction_type" "financial_transaction_type" NOT NULL,
    "reference_entity_type" TEXT NOT NULL,
    "reference_entity_id" UUID NOT NULL,
    "idempotency_key" TEXT,
    "description" TEXT NOT NULL,
    "reverses_transaction_id" UUID,
    "metadata" JSONB,
    "posted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "financial_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "financial_transaction_id" UUID NOT NULL,
    "ledger_account_id" UUID NOT NULL,
    "debit_amount" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "credit_amount" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_wallets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "driver_profile_id" UUID NOT NULL,
    "available_balance" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "pending_balance" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "reserved_balance" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "total_earned" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "total_settled" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "driver_wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_transactions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "driver_wallet_id" UUID NOT NULL,
    "financial_transaction_id" UUID NOT NULL,
    "change_type" "wallet_change_type" NOT NULL,
    "available_delta" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "pending_delta" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "reserved_delta" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "balance_after_available" DECIMAL(19,4) NOT NULL,
    "balance_after_pending" DECIMAL(19,4) NOT NULL,
    "balance_after_reserved" DECIMAL(19,4) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_settlements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "driver_profile_id" UUID NOT NULL,
    "driver_wallet_id" UUID NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,
    "amount_paid" DECIMAL(19,4),
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "settlement_status" NOT NULL DEFAULT 'PENDING',
    "payout_provider" TEXT,
    "payout_reference" TEXT,
    "requested_by" UUID,
    "processed_by" UUID,
    "financial_transaction_id" UUID,
    "reversal_financial_transaction_id" UUID,
    "failure_reason" TEXT,
    "initiated_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "driver_settlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refunds" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "payment_id" UUID NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "refund_status" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "idempotency_key" TEXT,
    "provider_refund_id" TEXT,
    "initiated_by" UUID NOT NULL,
    "financial_transaction_id" UUID,
    "failure_reason" TEXT,
    "processed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "type" "notification_type" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "data" JSONB,
    "priority" "notification_priority" NOT NULL DEFAULT 'NORMAL',
    "status" "notification_status" NOT NULL DEFAULT 'UNREAD',
    "idempotency_key" TEXT,
    "campaign_id" UUID,
    "read_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_deliveries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "notification_id" UUID NOT NULL,
    "channel" "delivery_channel" NOT NULL,
    "status" "delivery_status" NOT NULL DEFAULT 'PENDING',
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "provider" TEXT,
    "provider_message_id" TEXT,
    "last_attempt_at" TIMESTAMPTZ(6),
    "delivered_at" TIMESTAMPTZ(6),
    "failed_at" TIMESTAMPTZ(6),
    "failure_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "notification_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_subscriptions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh_key" TEXT NOT NULL,
    "auth_key" TEXT NOT NULL,
    "user_agent" TEXT,
    "device_name" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_seen_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "category" TEXT NOT NULL,
    "push" BOOLEAN NOT NULL DEFAULT true,
    "email" BOOLEAN NOT NULL DEFAULT true,
    "sms" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_campaigns" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "target_audience" "campaign_target_audience" NOT NULL,
    "target_user_ids" JSONB,
    "status" "campaign_status" NOT NULL DEFAULT 'DRAFT',
    "created_by" UUID NOT NULL,
    "scheduled_at" TIMESTAMPTZ(6),
    "sent_at" TIMESTAMPTZ(6),
    "total_targeted" INTEGER NOT NULL DEFAULT 0,
    "total_sent" INTEGER NOT NULL DEFAULT 0,
    "total_failed" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "notification_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "users_account_status_idx" ON "users"("account_status");

-- CreateIndex
CREATE INDEX "users_created_at_idx" ON "users"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "user_identities_provider_name_provider_subject_key" ON "user_identities"("provider_name", "provider_subject");

-- CreateIndex
CREATE UNIQUE INDEX "user_identities_email_key" ON "user_identities"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_identities_phone_number_key" ON "user_identities"("phone_number");

-- CreateIndex
CREATE UNIQUE INDEX "roles_code_key" ON "roles"("code");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_code_key" ON "permissions"("code");

-- CreateIndex
CREATE INDEX "role_permissions_permission_id_idx" ON "role_permissions"("permission_id");

-- CreateIndex
CREATE INDEX "user_roles_role_id_idx" ON "user_roles"("role_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_user_id_role_id_key" ON "user_roles"("user_id", "role_id");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_actor_user_id_idx" ON "audit_logs"("actor_user_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "outbox_events_status_available_at_created_at_idx" ON "outbox_events"("status", "available_at", "created_at");

-- CreateIndex
CREATE INDEX "outbox_events_status_created_at_idx" ON "outbox_events"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "user_credentials_user_id_key" ON "user_credentials"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_sessions_session_token_hash_key" ON "user_sessions"("session_token_hash");

-- CreateIndex
CREATE INDEX "user_sessions_user_id_revoked_at_expires_at_idx" ON "user_sessions"("user_id", "revoked_at", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "email_verification_tokens_token_hash_key" ON "email_verification_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "email_verification_tokens_token_hash_idx" ON "email_verification_tokens"("token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_hash_key" ON "password_reset_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "password_reset_tokens_token_hash_idx" ON "password_reset_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "otp_challenges_phone_number_created_at_idx" ON "otp_challenges"("phone_number", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "system_configurations_key_key" ON "system_configurations"("key");

-- CreateIndex
CREATE INDEX "system_configurations_category_idx" ON "system_configurations"("category");

-- CreateIndex
CREATE UNIQUE INDEX "customer_profiles_user_id_key" ON "customer_profiles"("user_id");

-- CreateIndex
CREATE INDEX "saved_locations_user_id_is_default_idx" ON "saved_locations"("user_id", "is_default");

-- CreateIndex
CREATE UNIQUE INDEX "customer_preferences_user_id_key" ON "customer_preferences"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "driver_profiles_user_id_key" ON "driver_profiles"("user_id");

-- CreateIndex
CREATE INDEX "driver_profiles_onboarding_status_idx" ON "driver_profiles"("onboarding_status");

-- CreateIndex
CREATE INDEX "driver_profiles_verification_status_idx" ON "driver_profiles"("verification_status");

-- CreateIndex
CREATE INDEX "driver_profiles_approval_status_idx" ON "driver_profiles"("approval_status");

-- CreateIndex
CREATE INDEX "driver_profiles_availability_status_idx" ON "driver_profiles"("availability_status");

-- CreateIndex
CREATE INDEX "driver_documents_driver_profile_id_document_type_idx" ON "driver_documents"("driver_profile_id", "document_type");

-- CreateIndex
CREATE INDEX "driver_documents_status_idx" ON "driver_documents"("status");

-- CreateIndex
CREATE INDEX "driver_onboarding_logs_driver_profile_id_created_at_idx" ON "driver_onboarding_logs"("driver_profile_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "driver_current_locations_driver_profile_id_key" ON "driver_current_locations"("driver_profile_id");

-- CreateIndex
CREATE INDEX "driver_current_locations_updated_at_idx" ON "driver_current_locations"("updated_at");

-- CreateIndex
CREATE INDEX "driver_location_histories_driver_profile_id_captured_at_idx" ON "driver_location_histories"("driver_profile_id", "captured_at");

-- CreateIndex
CREATE UNIQUE INDEX "customer_current_locations_user_id_key" ON "customer_current_locations"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_idempotency_key_key" ON "bookings"("idempotency_key");

-- CreateIndex
CREATE INDEX "bookings_customer_id_status_idx" ON "bookings"("customer_id", "status");

-- CreateIndex
CREATE INDEX "bookings_driver_profile_id_status_idx" ON "bookings"("driver_profile_id", "status");

-- CreateIndex
CREATE INDEX "bookings_status_created_at_idx" ON "bookings"("status", "created_at");

-- CreateIndex
CREATE INDEX "booking_assignment_attempts_booking_id_attempt_number_idx" ON "booking_assignment_attempts"("booking_id", "attempt_number");

-- CreateIndex
CREATE INDEX "booking_assignment_attempts_driver_profile_id_status_idx" ON "booking_assignment_attempts"("driver_profile_id", "status");

-- CreateIndex
CREATE INDEX "booking_assignment_attempts_status_expires_at_idx" ON "booking_assignment_attempts"("status", "expires_at");

-- CreateIndex
CREATE INDEX "booking_logs_booking_id_created_at_idx" ON "booking_logs"("booking_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "payments_idempotency_key_key" ON "payments"("idempotency_key");

-- CreateIndex
CREATE INDEX "payments_booking_id_idx" ON "payments"("booking_id");

-- CreateIndex
CREATE INDEX "payments_customer_id_status_idx" ON "payments"("customer_id", "status");

-- CreateIndex
CREATE INDEX "payments_status_created_at_idx" ON "payments"("status", "created_at");

-- CreateIndex
CREATE INDEX "payment_attempts_payment_id_created_at_idx" ON "payment_attempts"("payment_id", "created_at");

-- CreateIndex
CREATE INDEX "payment_webhook_events_processing_status_created_at_idx" ON "payment_webhook_events"("processing_status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "payment_webhook_events_provider_provider_event_id_key" ON "payment_webhook_events"("provider", "provider_event_id");

-- CreateIndex
CREATE UNIQUE INDEX "ledger_accounts_code_key" ON "ledger_accounts"("code");

-- CreateIndex
CREATE UNIQUE INDEX "financial_transactions_idempotency_key_key" ON "financial_transactions"("idempotency_key");

-- CreateIndex
CREATE INDEX "financial_transactions_reference_entity_type_reference_enti_idx" ON "financial_transactions"("reference_entity_type", "reference_entity_id");

-- CreateIndex
CREATE INDEX "financial_transactions_transaction_type_posted_at_idx" ON "financial_transactions"("transaction_type", "posted_at");

-- CreateIndex
CREATE INDEX "ledger_entries_financial_transaction_id_idx" ON "ledger_entries"("financial_transaction_id");

-- CreateIndex
CREATE INDEX "ledger_entries_ledger_account_id_idx" ON "ledger_entries"("ledger_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "driver_wallets_driver_profile_id_key" ON "driver_wallets"("driver_profile_id");

-- CreateIndex
CREATE INDEX "wallet_transactions_driver_wallet_id_created_at_idx" ON "wallet_transactions"("driver_wallet_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_transactions_driver_wallet_id_financial_transaction__key" ON "wallet_transactions"("driver_wallet_id", "financial_transaction_id");

-- CreateIndex
CREATE INDEX "driver_settlements_driver_profile_id_status_idx" ON "driver_settlements"("driver_profile_id", "status");

-- CreateIndex
CREATE INDEX "driver_settlements_status_created_at_idx" ON "driver_settlements"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "refunds_idempotency_key_key" ON "refunds"("idempotency_key");

-- CreateIndex
CREATE INDEX "refunds_payment_id_status_idx" ON "refunds"("payment_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "notifications_idempotency_key_key" ON "notifications"("idempotency_key");

-- CreateIndex
CREATE INDEX "notifications_user_id_status_created_at_idx" ON "notifications"("user_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "notifications_type_idx" ON "notifications"("type");

-- CreateIndex
CREATE INDEX "notification_deliveries_notification_id_channel_idx" ON "notification_deliveries"("notification_id", "channel");

-- CreateIndex
CREATE INDEX "notification_deliveries_status_idx" ON "notification_deliveries"("status");

-- CreateIndex
CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "push_subscriptions"("endpoint");

-- CreateIndex
CREATE INDEX "push_subscriptions_user_id_is_active_idx" ON "push_subscriptions"("user_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_user_id_category_key" ON "notification_preferences"("user_id", "category");

-- CreateIndex
CREATE INDEX "notification_campaigns_status_scheduled_at_idx" ON "notification_campaigns"("status", "scheduled_at");

-- AddForeignKey
ALTER TABLE "user_identities" ADD CONSTRAINT "user_identities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_revoked_by_fkey" FOREIGN KEY ("revoked_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_credentials" ADD CONSTRAINT "user_credentials_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_verification_tokens" ADD CONSTRAINT "email_verification_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_verification_tokens" ADD CONSTRAINT "email_verification_tokens_identity_id_fkey" FOREIGN KEY ("identity_id") REFERENCES "user_identities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_profiles" ADD CONSTRAINT "customer_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_locations" ADD CONSTRAINT "saved_locations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_preferences" ADD CONSTRAINT "customer_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_profiles" ADD CONSTRAINT "driver_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_documents" ADD CONSTRAINT "driver_documents_driver_profile_id_fkey" FOREIGN KEY ("driver_profile_id") REFERENCES "driver_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_onboarding_logs" ADD CONSTRAINT "driver_onboarding_logs_driver_profile_id_fkey" FOREIGN KEY ("driver_profile_id") REFERENCES "driver_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_current_locations" ADD CONSTRAINT "driver_current_locations_driver_profile_id_fkey" FOREIGN KEY ("driver_profile_id") REFERENCES "driver_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_location_histories" ADD CONSTRAINT "driver_location_histories_driver_profile_id_fkey" FOREIGN KEY ("driver_profile_id") REFERENCES "driver_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_current_locations" ADD CONSTRAINT "customer_current_locations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_driver_profile_id_fkey" FOREIGN KEY ("driver_profile_id") REFERENCES "driver_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_assignment_attempts" ADD CONSTRAINT "booking_assignment_attempts_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_assignment_attempts" ADD CONSTRAINT "booking_assignment_attempts_driver_profile_id_fkey" FOREIGN KEY ("driver_profile_id") REFERENCES "driver_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_logs" ADD CONSTRAINT "booking_logs_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_attempts" ADD CONSTRAINT "payment_attempts_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_financial_transaction_id_fkey" FOREIGN KEY ("financial_transaction_id") REFERENCES "financial_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_ledger_account_id_fkey" FOREIGN KEY ("ledger_account_id") REFERENCES "ledger_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_wallets" ADD CONSTRAINT "driver_wallets_driver_profile_id_fkey" FOREIGN KEY ("driver_profile_id") REFERENCES "driver_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_driver_wallet_id_fkey" FOREIGN KEY ("driver_wallet_id") REFERENCES "driver_wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_financial_transaction_id_fkey" FOREIGN KEY ("financial_transaction_id") REFERENCES "financial_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_settlements" ADD CONSTRAINT "driver_settlements_driver_profile_id_fkey" FOREIGN KEY ("driver_profile_id") REFERENCES "driver_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_settlements" ADD CONSTRAINT "driver_settlements_driver_wallet_id_fkey" FOREIGN KEY ("driver_wallet_id") REFERENCES "driver_wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "notification_campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
