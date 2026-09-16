# Phase 51 — Production Trust, Fraud & Risk Intelligence Engine + Navigation State & Sidebar Scroll Hardening

## 1. Overview
Phase 51 delivers two major production capabilities to GET APNA DRIVER:
1. **Trust, Fraud & Risk Intelligence Engine**: A real-time detection and decision-support layer (`src/modules/risk/`) operating over core network domains without duplicating domain logic or mutating core tables.
2. **Application-Wide Navigation State & Sidebar Scroll Hardening**: Standardization of navigation scroll persistence and active-item visibility checking across Admin, Customer, Driver, and Control Station portals using role-isolated `sessionStorage` keys.

---

## 2. Architecture

```text
               DOMAINS & TELEMETRY
    (Auth, Payment, Booking, Referral, Driver, Location)
                         │
                         ▼
               RISK SIGNAL SERVICE
                         │
                         ▼
              RISK EVALUATION ENGINE
       (10 Deterministic Rules: 0–100 Score)
                         │
        ┌────────────────┴────────────────┐
        ▼                                 ▼
   RISK LEVEL                       CONFIDENCE
 (LOW, MED, HIGH, CRITICAL)      (LOW, MED, HIGH)
        │                                 │
        └────────────────┬────────────────┘
                         ▼
               RISK DECISION SERVICE
        (Fingerprint Deduplication: subjectId:riskType:hourBucket)
                         │
        ┌────────────────┴────────────────┐
        ▼                                 ▼
 RISK & TRUST CONSOLE           OPERATIONS COMMAND CENTER
(/admin/risk-and-trust)         (/admin/operations-command-center)
        │
        ▼
   RISK ACTION SERVICE (Guarded by RedisLockService)
```

---

## 3. Risk Engine Rules & Scoring Policy

- **Score Range**: Deterministic 0–100.
- **Severity Levels**:
  - `0–24`: **LOW**
  - `25–49`: **MEDIUM**
  - `50–74`: **HIGH**
  - `75–100`: **CRITICAL**
- **10 Evaluated Deterministic Rules**:
  1. `account-abuse-rule.ts`: Rapid OTP failures, brute login attempts, concurrent device fingerprints.
  2. `referral-abuse-rule.ts`: Self-referral, circular referral loops, rapid referral redemptions.
  3. `promotion-abuse-rule.ts`: Coupon brute-forcing, high usage velocity, cross-account stacking.
  4. `payment-anomaly-rule.ts`: Payment gateway failures, high-frequency retries, refund anomalies.
  5. `cancellation-abuse-rule.ts`: High cancellation ratios (>50%) over short time windows.
  6. `booking-anomaly-rule.ts`: Excessive booking creation velocity, unfulfilled assignment spikes.
  7. `location-anomaly-rule.ts`: Physically impossible movement (>200 km/h), GPS jumps, stale telemetry on active rides.
  8. `driver-behavior-rule.ts`: Repeated assignment rejections, off-route deviations, rating spikes.
  9. `wallet-anomaly-rule.ts`: Abnormal reward credit velocity, transaction frequency spikes.
  10. `support-abuse-rule.ts`: Excessive refund ticket submissions and dispute frequency.

---

## 4. Navigation State & Sidebar Scroll Architecture

```text
                    PORTAL LAYOUT
                         │
              ┌──────────┼──────────┐
              ↓          ↓          ↓
            Admin     Customer     Driver
              │          │          │
              ↓          ↓          ↓
        Navigation   Navigation  Navigation
              │          │          │
              └──────────┼──────────┘
                         ↓
                Portal Scroll State
                         │
                    sessionStorage
                         │
      ┌──────────────────┼──────────────────┐
      ↓                  ↓                  ↓
    Admin             Customer            Driver
(gad-admin-scroll) (gad-customer-scroll) (gad-driver-scroll)
      │                  │                  │
      └──────────────────┼──────────────────┘
                         ↓
                  Restore Position
                         │
                         ▼
            Active Item Visibility Check
             ┌───────────┴───────────┐
             ↓                       ↓
          Visible                 Outside
             │                       │
             ▼                       ▼
         No scroll             Bounded scroll
```

- **Keys Used**:
  - `gad-admin-sidebar-scroll`
  - `gad-customer-sidebar-scroll`
  - `gad-driver-sidebar-scroll`
  - `gad-control-station-sidebar-scroll`
- **Role Isolation**: Scroll keys are scoped strictly per portal to avoid state pollution between roles.

---

## 5. Security, RBAC & Idempotency
- **Permissions**:
  - `ADMIN_RISK_READ` (`admin.risk.read`)
  - `ADMIN_RISK_MANAGE` (`admin.risk.manage`)
  - `ADMIN_RISK_REVIEW` (`admin.risk.review`)
  - `ADMIN_RISK_ACTION` (`admin.risk.action`)
- **Concurrency**: Action execution is guarded by `RedisLockService` using lock key `lock:risk-action:${actionId}`.
- **Avatar Fallback**: `UserAvatar` standard fallback to `/profile.png` enforced across all layouts.
