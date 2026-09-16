# GET APNA DRIVER — Production SRE Runbook

## Incident Triage & Remediation Procedures

### 1. Low Platform Health Score (< 75)
- **Symptom**: Platform Health HUD displays WARNING or CRITICAL status badge.
- **Triage Steps**:
  1. Open `/admin/platform-health` and check Component Matrix for degraded components.
  2. If Database is degraded:
     - Run Database Diagnostic at `/admin/platform-health/diagnostics`.
     - Check connection pool saturation and query latency.
  3. If Redis is degraded:
     - Run Redis Diagnostic at `/admin/platform-health/diagnostics`.
     - Verify memory usage percentage and ping latency.
  4. If Worker/Outbox is degraded:
     - Check `/admin/platform-health/workers` for pending outbox lag.

### 2. High Outbox Event Processing Lag (> 100 pending / > 120s lag)
- **Symptom**: Alert `rule-outbox-lag` firing.
- **Remediation**:
  1. Verify background worker process state using `POST /api/admin/platform-health/diagnostics/workers`.
  2. Inspect PostgreSQL outbox table for deadlocked or failing events.

### 3. SLO Breach (API Latency or Availability)
- **Symptom**: `/admin/platform-health/reliability` flags SLO breach.
- **Remediation**:
  1. Check Incident Correlation panel on Reliability HUD.
  2. Review primary alert and recommended root cause actions.
