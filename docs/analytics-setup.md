# STAK Analytics Setup

## Overview

We use two analytics tools in parallel:

| Tool | What it tracks | Where to view |
|------|---------------|---------------|
| **Vercel Analytics** | Page views, Web Vitals (load speed, performance) | [vercel.com](https://vercel.com) → stak-demo → Analytics tab |
| **Firebase Analytics (GA4)** | Users (DAU/WAU/MAU), custom events (sign ups, swipes, adds to Stak) | [Firebase Console](https://console.firebase.google.com) → stak-c21a3 → Analytics |

---

## What Gets Tracked Automatically (no extra code)

### Vercel Analytics
- Every page view and which route was visited
- Core Web Vitals (LCP, FID, CLS) — tells us if the app is fast

### Firebase Analytics
- Daily / Weekly / Monthly Active Users
- New vs returning users
- User retention curves
- Device type, OS, country
- First opens / app installs (PWA)

---

## Custom Events We Track (coded in)

| Event | Triggered when |
|-------|---------------|
| `sign_up` | User completes email or Google sign up |
| `login` | User logs in |
| `onboarding_complete` | User finishes onboarding |
| `add_to_stak` | User swipes right or adds a brand |
| `remove_from_stak` | User removes a brand from their Stak |

---

## Setup Checklist

### Step 1 — Get Firebase Measurement ID
1. Go to [Firebase Console](https://console.firebase.google.com) → Project `stak-c21a3`
2. Click the **gear icon** → **Project Settings**
3. Scroll to **Your apps** → click the web app (`</> stak`)
4. Copy the `measurementId` — it looks like `G-XXXXXXXXXX`

### Step 2 — Add to Vercel Environment Variables
1. Go to [Vercel](https://vercel.com) → stak-demo → **Settings** → **Environment Variables**
2. Add: `VITE_FIREBASE_MEASUREMENT_ID` = `G-XXXXXXXXXX` (for Production + Preview)
3. Redeploy for it to take effect

### Step 3 — Install Vercel Analytics package
```bash
cd frontend
npm install @vercel/analytics
```

### Step 4 — Code changes (handled by dev)
Two files to update:
- `frontend/src/lib/firebase.ts` — initialize Firebase Analytics
- `frontend/src/main.tsx` — add `<Analytics />` from Vercel

### Step 5 — Exclude internal traffic (founders)
To stop our own usage from inflating numbers:

**IP Filter (desktop/WiFi):**
1. Open [GA4 dashboard](https://analytics.google.com) linked to Firebase
2. Admin (gear icon) → Data Streams → your web stream
3. Configure tag settings → Define internal traffic → Create rule
4. Name: "STAK Founders" — add each founder's IP (`google.com/search?q=what+is+my+ip`)
5. Admin → Data Settings → Data Filters → set "Internal Traffic" to **Active**

> **Note:** Home IPs can change. Re-check every few months or if data looks inflated.

**Email exclusion (mobile/4G):**
Dev can add a check so analytics events are skipped when a founder email is signed in.

---

## Where to View Data

### Vercel Analytics
- URL: [vercel.com](https://vercel.com) → stak-demo → **Analytics** tab
- Shows: page views by route, unique visitors, Web Vitals
- Refresh: real-time / near real-time

### Firebase Analytics
- URL: [console.firebase.google.com](https://console.firebase.google.com) → stak-c21a3 → **Analytics**
- Key reports:
  - **Dashboard** — DAU/WAU/MAU at a glance
  - **Events** — custom event counts (sign_up, add_to_stak, etc.)
  - **Audiences** — segment users (e.g. users who added 5+ stocks)
  - **Funnels** — e.g. sign_up → onboarding_complete → add_to_stak
  - **Retention** — % of users who come back after day 1, 7, 30
- Refresh: 24–48 hour delay (GA4 processes data in batches — not real-time)

---

## Access

| Person | Vercel | Firebase |
|--------|--------|----------|
| Invite via Vercel team | Settings → Members → Invite | Firebase Console → Project Settings → Users and permissions → Add member |

---

## Notes
- Firebase Analytics data takes **24–48 hours** to appear after first setup — this is normal
- Vercel Analytics data appears within minutes
- Both tools are **free** at our current scale
