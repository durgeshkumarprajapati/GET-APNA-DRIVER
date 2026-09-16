# Phase 50 — Production Operations Command & Decision Engine

## 1. Overview

Phase 50 implements a production-grade **Operations Command & Decision Engine** (`/admin/operations-command-center`) for **GET APNA DRIVER**.

It provides an real-time orchestration & decision-support layer across core network domains:
- Booking & Dispatch
- Driver Supply & Schedules
- Trip Reliability & Incidents
- Safety & SOS Emergency Desk
- Customer Support & Ticket Backlog
- Scheduled Rides
- Platform Health & SRE Telemetry

Crucially, it reuses existing domain state and services without creating duplicate domain engines or directly mutating domain DB tables.

---

## 2. Key Components

### 2.1 Domain & Signal Layer
- **Signal Aggregator** (`src/modules/operations/application/operations-signal-service.ts`):
  Aggregates real-time domain signals in parallel (searching bookings, assigned awaiting pickup, active trips, online vs available drivers, safety pressure, open support tickets, unassigned scheduled rides, and platform health score).
- **Decision Engine** (`src/modules/operations/application/operations-decision-service.ts`):
  Runs deterministic, explainable rule evaluation logic generating decision records with severity (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`), confidence level, metric evidence, and recommended executable actions.
- **Action Dispatch Service** (`src/modules/operations/application/operations-action-service.ts`):
  Executes operational actions guarded by distributed Redis locks (`RedisLockService`) to prevent race conditions during high-concurrency operator dispatches.

### 2.2 Permissions & Access Control
- Added permissions in `permission-catalog.ts`:
  - `ADMIN_OPERATIONS_READ`
  - `ADMIN_OPERATIONS_MANAGE`
  - `ADMIN_OPERATIONS_ACTION`
  - `ADMIN_OPERATIONS_OVERRIDE`

### 2.3 API Endpoints
- `GET /api/admin/operations`: Returns system summary, top KPIs, and system health status.
- `GET /api/admin/operations/decisions`: Returns filterable decision feed.
- `GET /api/admin/operations/decisions/[decisionId]`: Returns single decision detail record with evidence trail.
- `POST /api/admin/operations/decisions/[decisionId]/acknowledge`: Acknowledges an active decision.
- `POST /api/admin/operations/decisions/[decisionId]/dismiss`: Dismisses a decision.
- `POST /api/admin/operations/actions/[actionId]/execute`: Dispatches an operational action safely under Redis lock.

### 2.4 User Interface
- Main Operations Command Center: `/admin/operations-command-center`
- Decision Detail & Evidence Inspector: `/admin/operations-command-center/decisions/[decisionId]`
- Centralized `UserAvatar` (`src/components/ui/user-avatar.tsx`) integrated into `AdminLayout` enforcing mandatory default fallback to `/profile.png`.

---

## 3. Quality Verification & Test Results

- **Unit Tests**:
  - `UserAvatar` fallback policy spec: `PASS`
  - Operations Command Engine spec: `PASS`
  - 10-Locale i18n structure parity spec: `PASS`
- **TypeScript**: `npx tsc --noEmit` — 0 errors.
- **Prisma Schema & Migrations**: Verified clean.
