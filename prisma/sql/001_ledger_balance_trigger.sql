-- Deferred ledger-balance validation + append-only enforcement.
--
-- Prisma's schema DSL cannot express triggers or deferred constraints, so
-- this is a hand-written raw-SQL migration (per the project rule: "use raw
-- SQL migrations where Prisma cannot express PostgreSQL requirements
-- correctly"). Apply it AFTER the Prisma-generated migration that creates
-- the Phase 8 tables, e.g.:
--
--   npx prisma migrate dev --name phase_8_finance
--   psql "$DATABASE_URL" -f prisma/sql/001_ledger_balance_trigger.sql
--
-- (or paste this file's contents at the end of that migration's
-- migration.sql before applying it, so it becomes part of the same
-- migration and is captured in migration history).
--
-- Why a DEFERRED trigger and not a plain CHECK constraint: LedgerEntry rows
-- for one FinancialTransaction are inserted one at a time (one INSERT per
-- debit/credit line) within a single application-level transaction. An
-- immediate constraint would reject every insert except the last one, since
-- the set of entries for a financial_transaction_id is only balanced once
-- all of them exist. DEFERRABLE INITIALLY DEFERRED defers the check to
-- COMMIT time, by which point the whole transaction's rows are all present.

-- Row-level shape: exactly one of debit_amount/credit_amount is positive,
-- the other is exactly zero. This is a single-row invariant, so a plain
-- (non-deferred) CHECK constraint is correct and sufficient here.
ALTER TABLE ledger_entries
  ADD CONSTRAINT ledger_entries_single_sided_check
  CHECK (
    (debit_amount > 0 AND credit_amount = 0)
    OR (credit_amount > 0 AND debit_amount = 0)
  );

-- Transaction-level shape: SUM(debit_amount) = SUM(credit_amount) for every
-- financial_transaction_id, checked once at commit (or at an explicit
-- SET CONSTRAINTS ledger_entries_balance_check IMMEDIATE).
CREATE OR REPLACE FUNCTION check_ledger_transaction_balance()
RETURNS trigger AS $$
DECLARE
  affected_transaction_id uuid := NEW.financial_transaction_id;
  total_debits numeric(19,4);
  total_credits numeric(19,4);
BEGIN
  SELECT COALESCE(SUM(debit_amount), 0), COALESCE(SUM(credit_amount), 0)
    INTO total_debits, total_credits
    FROM ledger_entries
   WHERE financial_transaction_id = affected_transaction_id;

  IF total_debits <> total_credits THEN
    RAISE EXCEPTION
      'Unbalanced financial_transaction %: total debits % <> total credits %',
      affected_transaction_id, total_debits, total_credits
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Ledger entries are append-only (never updated/deleted after posting), so
-- this only needs to fire on INSERT — UPDATE/DELETE are independently
-- forbidden by the trigger below.
CREATE CONSTRAINT TRIGGER ledger_entries_balance_check
  AFTER INSERT ON ledger_entries
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW
  EXECUTE FUNCTION check_ledger_transaction_balance();

-- Append-only enforcement at the database level, as defense in depth beyond
-- "application code never issues UPDATE/DELETE against these tables":
-- financial records must be append-only; corrections are compensating
-- entries, never edits to what was already posted.
CREATE OR REPLACE FUNCTION forbid_financial_record_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION '% rows are append-only and cannot be updated or deleted', TG_TABLE_NAME
    USING ERRCODE = 'check_violation';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ledger_entries_forbid_mutation
  BEFORE UPDATE OR DELETE ON ledger_entries
  FOR EACH ROW
  EXECUTE FUNCTION forbid_financial_record_mutation();

CREATE TRIGGER financial_transactions_forbid_mutation
  BEFORE UPDATE OR DELETE ON financial_transactions
  FOR EACH ROW
  EXECUTE FUNCTION forbid_financial_record_mutation();
