# Phase 54: Location Intelligence, ETA, Geofencing & Pickup Intelligence Engine

## 1. Architecture Overview

The **Location Intelligence Engine** acts as an authoritative operational layer interpreting raw location telemetry and calculating provider-neutral ETA, distance, geofencing, and proximity signals without mutating authoritative trip or booking state directly.

```
                    AUTHORITATIVE
                  LOCATION TELEMETRY
                         │
                         ▼
              ┌──────────────────────┐
              │ LOCATION INTELLIGENCE│
              └──────────┬───────────┘
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
       DISTANCE          ETA         GEOFENCE
          │              │              │
          └──────────────┼──────────────┘
                         ▼
                LOCATION SIGNALS
                         │
        ┌────────────────┼────────────────┐
        ▼                ▼                ▼
   Trip Intelligence  Reliability    Operations
        │                │                │
        └────────────────┼────────────────┘
                         ▼
                  Customer / Driver
                         UI
```

---

## 2. Independent Provider Architecture

- **Map Rendering Chain** (Presentation):
  - Google Maps (Primary) → Mapbox GL JS (Fallback) → Textual Details (Tertiary Fallback)

- **Routing / ETA Chain** (Advisory Data):
  - Google Directions API (Primary) → Mapbox Directions API (Fallback) → Deterministic Haversine Fallback (Tertiary Fallback)

Neither Google nor Mapbox becomes an authoritative business logic owner or trip state machine executor.

---

## 3. Location Freshness & Confidence Policy

### Freshness States
- **LIVE**: Location telemetry timestamp $\le 30$ seconds.
- **RECENT**: Location telemetry timestamp $31 - 120$ seconds.
- **STALE**: Location telemetry timestamp $121 - 300$ seconds.
- **UNAVAILABLE**: Missing timestamp or age $> 300$ seconds.

### Deterministic Confidence Levels
- **HIGH**: Fresh telemetry ($\le 30$s), high accuracy ($\le 20$m), valid coordinates.
- **MEDIUM**: Telemetry age up to 120s or moderate accuracy ($20 - 50$m).
- **LOW**: Telemetry age $> 120$s or poor accuracy ($> 50$m).
- **UNAVAILABLE**: Invalid coordinates or missing telemetry.

### Anomaly Detection
- **Teleportation**: Speed $> 300$ km/h over observed distance/time window.
- **Impossible Speed**: Speed $> 180$ km/h.
- **Invalid Coordinates**: Latitude outside $[-90, +90]$ or Longitude outside $[-180, +180]$.

---

## 4. Geofencing & Pickup Proximity Rules
- **Near Pickup**: $\le 500$ meters (`DRIVER_NEAR_PICKUP`).
- **At Pickup**: $\le 50$ meters (`DRIVER_AT_PICKUP`).
- **Arrival Candidate**: $\le 150$ meters with `LIVE` freshness and `HIGH`/`MEDIUM` confidence while in valid booking status (`CONFIRMED` / `DRIVER_EN_ROUTE`). State transitions remain authoritative in the booking state machine.

---

## 5. Performance, Caching & Privacy
- **Bounded ETA Caching**: Coordinates bucketed to $\sim 100$m grid precision (`.toFixed(3)`) with 30s TTL.
- **Privacy Minimization**: Coordinates are stripped from telemetry metric labels and logging. Ownership and role-based access checks protect API routes.
