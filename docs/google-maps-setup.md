# Google Maps Platform Setup & Production Deployment Guide

## Overview
GET APNA DRIVER integrates Google Maps JavaScript API strictly as a **presentation and visual mapping provider**. All authoritative data ownership (bookings, driver assignments, dispatch matching, location tracking, and trip state machines) resides securely within the GET APNA DRIVER backend.

---

## 1. Google Cloud Console Setup

1. **Create or Select a Google Cloud Project**:
   - Navigate to [Google Cloud Console](https://console.cloud.google.com/).
   - Ensure billing is enabled for your project (Google Maps JavaScript API requires a billing account).

2. **Enable Required APIs**:
   - Go to **APIs & Services > Library**.
   - Search for **Maps JavaScript API** and click **Enable**.

3. **Generate Map ID**:
   - Go to **Google Maps > Map Management > Create Map ID**.
   - Set **Map Type** to `JavaScript` and **Map Solution** to `Vector` or `Raster`.
   - Copy the generated **Map ID** (e.g., `8f7b2a1c9e4d5f6a`).

---

## 2. API Key Security & Restrictions

> [!IMPORTANT]
> Client-side browser keys MUST be restricted to prevent unauthorized usage and quota theft.

1. **Create API Key**:
   - Navigate to **APIs & Services > Credentials > Create Credentials > API Key**.

2. **Configure Application Restrictions**:
   - Set **Application Restriction** to **HTTP referrers (web sites)**.
   - Add production domain patterns:
     - `https://your-domain.com/*`
     - `https://*.your-domain.com/*`
   - For local development:
     - `http://localhost:3000/*`
     - `http://127.0.0.1:3000/*`

3. **Configure API Restrictions**:
   - Select **Restrict key**.
   - Select only **Maps JavaScript API**.

---

## 3. Environment Variable Configuration

Add the following variables to `.env`:

```env
# Public client-side Google Maps API Key
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSy...YourKeyHere...

# Google Maps Map ID for AdvancedMarkerElement
NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID=8f7b2a1c9e4d5f6a
```

*Note: In local development, if `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is omitted, GET APNA DRIVER gracefully degrades by rendering coordinate summary cards without crashing.*

---

## 4. Troubleshooting & Fallback Behavior

- **Missing API Key / Configuration Error**: UI renders an inline fallback displaying location coordinates and address details.
- **Quota Exceeded / Billing Error**: The application falls back to text-based location summaries. Booking dispatch and trip tracking continue functioning without interruption.
- **React 19 Hydration Safety**: Maps initialize strictly on the client side inside React Client Components.
