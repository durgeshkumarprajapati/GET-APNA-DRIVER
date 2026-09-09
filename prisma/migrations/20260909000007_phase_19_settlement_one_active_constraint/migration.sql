-- Prevents more than one PENDING/PROCESSING DriverSettlement per driver at
-- the database level.
--
-- Prisma's schema DSL cannot express a partial (WHERE-qualified) unique
-- index, so this is a hand-written raw-SQL migration (per the project rule:
-- "use raw SQL migrations where Prisma cannot express PostgreSQL
-- requirements correctly" — see 20260909000001_ledger_balance_trigger for
-- the precedent). Not reflected as a schema.prisma attribute; tracked here
-- and in the standalone fallback copy at
-- prisma/sql/002_settlement_one_active_constraint.sql.
--
-- Why this is needed: settlement-service.ts's createSettlement() checks
-- (in application code) that a driver's requested amount fits within their
-- current availableBalance, but nothing previously stopped two concurrent
-- requests from each passing that check and creating two overlapping
-- reservations for the same driver — a classic check-then-insert race,
-- since there is no existing row to lock against ("no active settlement
-- yet" has nothing to hold a row lock on). A partial unique index is the
-- correct fix: Postgres itself rejects the second concurrent INSERT,
-- regardless of timing, the same way the ledger balance trigger is the
-- authoritative guarantee behind postFinancialTransaction's application-
-- level pre-check.
CREATE UNIQUE INDEX "driver_settlements_one_active_per_driver"
  ON "driver_settlements" ("driver_profile_id")
  WHERE "status" IN ('PENDING', 'PROCESSING');
