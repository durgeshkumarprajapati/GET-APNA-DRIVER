-- Prevents more than one PENDING/PROCESSING DriverSettlement per driver at
-- the database level.
--
-- This exact SQL is captured in migration history as
-- prisma/migrations/20260909000007_phase_19_settlement_one_active_constraint/migration.sql —
-- `prisma migrate deploy`/`dev` applies it automatically, in order. Use
-- THIS copy only as a manual fallback when pointing at a database that
-- already has the Phase 1-18 tables but is missing this specific migration
-- from its `_prisma_migrations` history:
--
--   npx prisma migrate resolve --applied 20260909000007_phase_19_settlement_one_active_constraint
--   psql "$DATABASE_URL" -f prisma/sql/002_settlement_one_active_constraint.sql
--
-- See the migration file's own header for why a partial unique index
-- (rather than an application-level check alone) is required.
CREATE UNIQUE INDEX "driver_settlements_one_active_per_driver"
  ON "driver_settlements" ("driver_profile_id")
  WHERE "status" IN ('PENDING', 'PROCESSING');
