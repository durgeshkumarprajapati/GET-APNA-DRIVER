# Phase 47 — Production SRE Observability Architecture

## Overview
GET APNA DRIVER Phase 47 establishes a production-grade SRE observability framework, deterministic platform health scoring (0-100), and operational control plane.

## Key Design Principles
1. **Read-Only Observability**: Telemetry collectors, diagnostic runners, and health services are strictly read-only with respect to domain business state. They measure, aggregate, detect degradation, emit events, and display diagnostics, but NEVER directly mutate `Booking`, `Payment`, `Wallet`, `DriverProfile`, `CustomerProfile`, `SafetyIncident`, or `ScheduledRide` state.
2. **Deterministic Health Score (0-100)**: Calculated as a weighted sum of component health scores:
   - Application Availability (15%)
   - Database Health (15%)
   - Redis Health (10%)
   - Worker/Outbox Health (10%)
   - Dispatch Health (15%)
   - Booking Health (10%)
   - Payment Health (10%)
   - Notification & Location Health (10%)
   - Scheduled Rides & Trip Reliability Health (5%)
3. **Zero Business Logic Bypass**: Operates in parallel with domain engines without altering existing transactional boundaries.

## Metrics & Snapshot Schema
- `PlatformHealthSnapshot`: Idempotent snapshot persisted on each evaluation interval.
- `OperationalMetricBucket`: 1-minute time bucket for query latency, error counts, and request throughput.
- `PlatformAlert`: Rule-based idempotent firing & recovery tracking by metric fingerprint.

## API Endpoints
- `GET /api/admin/platform-health`
- `GET /api/admin/platform-health/dependencies`
- `GET /api/admin/platform-health/workers`
- `GET /api/admin/platform-health/performance`
- `GET /api/admin/platform-health/reliability`
- `GET /api/admin/platform-health/diagnostics`
- `POST /api/admin/platform-health/diagnostics/database`
- `POST /api/admin/platform-health/diagnostics/redis`
- `POST /api/admin/platform-health/diagnostics/workers`

## Access Control & RBAC
- `ADMIN_PLATFORM_HEALTH_READ`: Access to HUD overview, dependencies, workers, and reliability.
- `ADMIN_PLATFORM_METRICS_READ`: Access to performance throughput and latency distribution metrics.
- `ADMIN_PLATFORM_DIAGNOSTICS_READ`: Access to interactive diagnostic trigger endpoints.
