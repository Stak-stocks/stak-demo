# Web handoff — bring the web app to app parity, on the same live data

Written 2026-09-25, for a new session picking up web UI work. Read this top to
bottom before touching `frontend/`. It covers: what already exists, what has
to change, and every recent backend/Android decision the web work needs to
stay consistent with.

## 0. The one-line goal

Redesign `frontend/` (the web app) so its UI/UX matches the Android app —
just laid out for a browser, not a phone — while reading/writing the exact
same account data. **This is not a new backend or a new data layer.** The
web app already calls the same Cloud Run backend the Android app calls, and
identity is already shared (see §1). The work here is almost entirely
frontend: re-theme, rebuild screens to match the app's current design and
behavior, and fill in whatever API calls a screen needs that `frontend/`
doesn't already make.

## 1. Why data is already shared (don't rebuild this)

- Backend: single Express app in `backend/`, deployed to Cloud Run
  (`https://stak-backend-889057229494.us-central1.run.app`). Both Android
  and web hit this same instance — there is no separate web backend.
- Data: Postgres via Supabase. One `uid` per user, one set of rows
  (`stak_brands`, `stock_updates`, `update_reads`, `taste_*`, swipes, etc.)
  regardless of which client wrote them.
- Auth: **Supabase Auth**, not Firebase, despite Firebase still existing in
  this project (legacy — see `auth_identity_map` in
  `backend/src/authMiddleware.ts`, which maps old Firebase UIDs to
  Supabase UIDs so pre-migration accounts keep working). A request is
  authenticated by a `Bearer <supabase access token>` header;
  `authMiddleware` verifies it against Supabase's `/auth/v1/user` and
  resolves it to the canonical `uid` used everywhere in Postgres.
- `frontend/src/lib/api.ts` **already** does this correctly: it pulls the
  token from `supabase.auth.getSession()` and attaches it as `Authorization:
  Bearer …` on every call (see `getAuthToken()` / `apiRequest()`,
  `frontend/src/lib/api.ts:1-38`). `frontend/src/lib/supabase.ts`,
  `frontend/src/context/AuthContext.tsx`, and
  `frontend/src/context/AccountContext.tsx` already exist and are wired up.
- **Conclusion:** if a user logs into the web app with the same account
  they use on the phone, they already see the same `uid`'s data through
  the same endpoints. Log in with the real test account and verify this
  before assuming anything is broken — it most likely already works for
  any screen that's already calling the backend correctly.

`API_BASE_URL` in `frontend/src/lib/api.ts` reads
`import.meta.env.VITE_API_BASE_URL`, falling back to
`http://localhost:3001` — set that env var to the Cloud Run URL above for
anything that needs to talk to prod instead of a local `backend/` process.

## 2. Current state of `frontend/`

Vite + React + TanStack Router (file-based routes) + Tailwind v4 +
shadcn/Radix components (`components.json`, `frontend/src/components/`).
Route files live in `frontend/src/routes/`:

```
welcome.tsx  login.tsx  signup.tsx  forgot-password.tsx  reset-password.tsx
onboarding.tsx
index.tsx  feed.tsx  my-stak.tsx
profile.tsx  profile_.personal-details.tsx  profile_.security.tsx
profile_.help-support.tsx
playground.tsx
```

`my-stak.tsx` (1,476 lines) and `feed.tsx` (344 lines) are the two big
existing screens — they're real, not stubs, but they predate this
session's Android redesign work (see §4) and will be behind it in both
visuals and behavior. Expect to substantially rework `my-stak.tsx`
specifically.

**Theming is currently the generic shadcn scaffold, not STAK's.**
`frontend/src/styles.css` has the default light `oklch(...)` shadcn palette
(package.json even still says `"name": "basic_template"`). None of the
app's dark theme has been ported. This is the first thing to fix — see §5
for the exact color/font tokens to port over.

## 3. Full backend API surface

Mounted in `backend/src/index.ts`. `authMiddleware` = requires
`Authorization: Bearer <token>`; routes without it are public/rate-limited
only.

| Mount | Router file | Auth |
|---|---|---|
| `/api/brands` | `routes/brands.ts` | public |
| `/api/swipe` | `routes/swipe.ts` | auth |
| `/api/me/taste` | `routes/taste.ts` | auth |
| `/api/me/updates` | `routes/updates.ts` | auth |
| `/api/me` | `routes/me.ts` | auth |
| `/api/news` | `routes/news.ts` | public |
| `/api/stock` | `routes/stock.ts` | mostly public, one admin route |
| `/api/intel-cards` | `routes/intelCards.ts` | public |
| `/api/stocks` | `routes/ipos.ts` | public |
| `/api/admin/analytics` | `routes/analytics.ts` | public (rate-limited) |
| `/api/admin/brands` | `routes/brandAdmin.ts` | own secret check |
| `/api/recommendations` | `routes/recommendations.ts` | auth |
| `/api/daily-brief` | `routes/dailyBrief.ts` | auth |
| `/api/playground` | `routes/playground.ts` | auth |
| `/api/stak-ai` | `routes/stakAi.ts` | auth |
| `/api/sandbox` | `routes/sandbox.ts` | auth |

Endpoints most relevant to matching the Android My STAK / Home / News
experience:

- `GET /api/me/taste` — Investing Taste graph (themes, signals, learning
  flag). Drives the scenario logic in §4.1.
- `GET /api/me/updates` — "What Changed" feed. Returns up to 50 rows across
  all saved companies, from the last 7 days (`WINDOW_DAYS = 7` in
  `backend/src/routes/updates.ts`), newest first, each row carrying
  `read`/`occurredAt`/`sources` etc. See §4.2 for how Android buckets and
  caps these — the web should reuse this same payload the same way, not
  invent a different cap.
- `POST /api/me/updates/:id/read` — mark one update read.
- `GET /api/stock/:symbol` — quote + profile.
- `GET /api/stock/:symbol/risk-watch` — cached AI risk snapshot (see §4.3
  for the level/note consistency fix — this is already server-side, the
  web just needs to render `label`/`level` as given, not recompute either).
- `GET /api/stock/:symbol/chart`, `/earnings`, `/analyst`,
  `/analyst-actions`, `/daily-move`, `/key-risk`, `/peer-metrics/:ticker` —
  stock detail page data.
- `GET /api/daily-brief` — Home's Daily Brief content (mood, session state,
  "what happened", "why it matters to you").
- `GET /api/daily-brief/market-status` — session/open-closed state, public.
- `GET /api/news/market`, `/company/:symbol`, `/search`.
- `GET /api/me` / `PUT /api/me` — profile.
- `GET /api/me/stak` / `PUT /api/me/stak` — My STAK holdings list.
- `POST /api/swipe`, `GET /api/swipe` — Discover deck swipes.
- `GET /api/recommendations` — Discover deck candidates.

Full request/response shapes: read the route file directly rather than
trusting a paraphrase here — several of these (`stock.ts` especially) are
2,000+ lines and have grown organically.

## 4. Recent Android redesign work the web needs to match

This is the substance of "make the web UI like the app." Everything below
shipped to Android this session/branch (`feat/android-backend`) and is live
in production via the backend changes; the web UI simply doesn't reflect
any of it yet.

### 4.1 Investing Taste — six scenarios, not one generic state

`android/app/src/main/java/com/stak/demo/data/TasteGraph.kt` computes a
`Scenario` enum from the taste graph, and the UI branches its copy/CTA on
it instead of showing one generic "not enough data" message:

- `NO_SIGNAL` — no themes at all. Copy differs depending on whether the
  user has *any* signals that just haven't coalesced into a theme yet
  (`activeButUnfocused`) vs. truly nothing saved/explored.
- `PAUSED` — every theme's most recent save is >14 days old
  (`PAUSED_AFTER_MS`). Distinct copy + a banner explaining the taste graph
  is stale, not wrong.
- `EARLY_SIGNAL` — themes exist but the graph is still in its "learning"
  window.
- `ONE_DOMINANT` — exactly one theme.
- `TWO_STRONG` — exactly two themes.
- `BROAD_MIX` — three or more themes.

Each scenario has its own `summary`/`subtitle`/`ctaLabel`. The card also
has a working **Retry** action on a failed load
(`android/.../ui/mystak/MyStakScreen.kt`, `TasteCard`/`FailedCard`) that
re-fetches with `force = true` — don't let a failed taste-graph fetch on
web be a dead end either.

Port this scenario logic to the web's My STAK page rather than re-deriving
it independently — the rules (paused threshold, learning flag, theme count
buckets) live in `TasteGraph.kt` and should be the single source of truth
conceptually, even though the web will need its own TS implementation
(there's no shared taste-scenario code between platforms yet — this is a
gap worth closing later, not now).

### 4.2 "What Changed" — per-company cap, not a global cap

The single biggest structural decision this session: **no company is ever
excluded from the list.** An earlier design capped the total number of
companies/rows shown, which meant a company with many changes could crowd
out a company with just one. That was reversed. Current rule
(`android/.../ui/mystak/UpdatesScreen.kt`):

- All of a user's saved companies with changes in the last 7 days are
  shown — full stop, no top-level cap.
- Within one company's card, **at most 3 changes** show
  (`MAX_CHANGES_PER_CARD = 3`), ordered newest-first (relies on the
  server's `order by occurred_at desc` — no client re-sort). If there are
  more than 3, the newest 3 win and older ones are the ones hidden behind
  "+N more" (recency bias, not FIFO).
- **"+N more this week" expands the same card in place** when tapped
  (just fixed today — it used to route to the stock detail page's "Since
  you saved" section, which shows even fewer items (2) than the update
  card already does, so the extra changes had no viewable destination
  anywhere in the app. Don't repeat that mistake on web: either make "+N
  more" expand in place, or make sure wherever it points can actually show
  more items than the summary card already does).
- Each individual change now shows **its own age**, not just the card
  header's age (which reflects only the most recent change and made older
  changes on the same card look equally fresh — fixed today, same file).
- Cards split into two sections: unread ("New") and read ("Earlier ·
  already opened").
- Retention window is 7 days (`WINDOW_DAYS`, both
  `backend/src/routes/updates.ts` and `backend/src/routes/dailyBrief.ts` —
  was 14, shortened this session).

### 4.3 Risk Snapshot — level and note must never contradict

`backend/src/services/riskWatchService.ts`: the computed risk **level**
(High/Elevated/Lower/etc.) and the AI-written **note** justifying it used
to be able to drift apart, because the level was recomputed live on every
read while the note stayed cached for 24h — a fast valuation move could
leave a stale note contradicting a fresh level (e.g. "Lower" valuation next
to "high P/E ratio suggests growth priced in"). Fixed by caching the levels
*alongside* the note (`CachedRiskWatch.levels`) and invalidating the whole
cache entry (`isStale()`) when live levels no longer match what was cached
— not just recomputing the level in isolation. Cache key: `risk-watch:v4:
{symbol}`.

**This is already server-side and fixed for every client.** The only web
implication: render the risk-watch response's `label`/`level` fields
exactly as given, don't recompute or reinterpret them client-side, or
you'll reintroduce the same class of bug on web specifically.

Also fixed in the same service: redundant severity labels (e.g. "High
Volatility" chip sitting next to a "High" level badge, saying the same
thing twice) via `stripSeverity()` — the API now returns de-duplicated
labels, so again, just render what's given.

### 4.4 Daily Brief — cache keys must include every state variable the prompt sees

`backend/src/routes/dailyBrief.ts`: three separate Gemini-cached text
blocks (`generateMarketText`, `generateWhatHappenedAndContext`, and the
per-user impact text) each had their own hand-rolled cache key; two of the
three didn't include `mood` even though the prompt was told the mood,
meaning a mood change could serve stale cached text that referenced a
different mood than what's currently shown. Fixed with one shared helper:

```ts
function briefStateKey(mood: Mood, session: Session, marketClosed: boolean, dayLabel: string): string {
	const safeDay = dayLabel.replace(/[^a-z]/gi, "");
	return `${mood}:${session}:${marketClosed ? "closed" : "open"}:${safeDay}`;
}
```

**Principle to carry forward for any new web-specific caching:** a cached
AI-written string's cache key must include every variable the prompt was
told about, or a fresher piece of state elsewhere on the page can end up
contradicting stale cached text. This bit us three times this session
(risk-watch, daily-brief ×2) before becoming a standing rule — don't
reintroduce it for a web-only cache.

Also fixed: `generateWhatHappenedAndContext`'s prompt now gets an explicit
`sessionStateLine` (open/closed/midday) so its "what happened" bullets
can't mix past-tense and present-tense framing depending on when the cron
ran vs. when a user reads it.

### 4.5 Market Mood gauge — one canonical source, not two hand-rolled copies

`android/.../ui/home/MarketMoodFeed.kt` now has `colorFor(mood)` and
`fractionFor(mood)` as the single source of truth for the mood gauge's
color and needle position. `NewsScreen.kt`'s mood gauge used to hand-roll
its own `when` blocks for the same thing and had drifted from Home's
version. Now both call the same functions.

For web: if the web has (or will have) a mood gauge on both a Home-like
page and a News-like page, write **one** color/position function and have
both call it — don't let a second hand-rolled copy exist, that's exactly
how this bug happened on Android.

### 4.6 Category icons — every category has a distinct, correctly-sized icon

Not really portable 1:1 (Android vector drawables vs. web SVG/icon font),
but the *decisions* are worth keeping consistent:

- "Big Tech" and "Tech" used to share one icon and one confusing name.
  Split into **"Big Tech"** and **"General Tech"** (renamed from "Tech"),
  each with its own icon; "Software" also split out with its own icon.
- "Telecom" and "Meme Stocks" used to silently fall through to a generic
  default icon — both now have dedicated icons.
- Every custom category/quick-look icon got a size-consistency pass (some
  were visibly smaller than siblings — undersized ones were scaled up
  ~1.15–1.5x about their own center to reach a consistent visual
  footprint).

If the web needs its own icon set, at minimum match the **names** (General
Tech, not "Tech" or "Tech Sector") and make sure no category falls through
to a generic/default icon silently — audit for that the same way this was
audited on Android (`categoryIcon()` in
`android/.../data/StakCategories.kt` has the full category→icon mapping to
use as the reference list).

## 5. Design tokens to port (currently missing from `frontend/`)

Source of truth: `android/app/src/main/java/com/stak/demo/ui/theme/Color.kt`
(`StakColors`, app-wide) and
`android/app/src/main/java/com/stak/demo/ui/mystak/MyStakShared.kt`
(`Stak`, My STAK pages specifically — slightly different token set, same
palette family). The app is dark-themed; `frontend/`'s current shadcn
scaffold is light and completely unrelated. Key values:

```
Background        #0A1020
Surface (cards)    #10172A   /  My STAK card bg: #181F30
Surface alt        #172037
Teal accent        #39C5CB   /  My STAK teal: #69B3CA
Accent blue        #2C9DBC
Muted blue-gray    #819ABB   (also the stroke color for every custom icon)
Faint              #5C6B85
Body text (dim)    #C8D2E0 on cards / rgba(255,255,255,0.62) elsewhere
Text primary       #FFFFFF
Positive (gains)   #2FD08A
Divider hairline   rgba(255,255,255,0.08) / My STAK: #2A3346
CTA gradient       #A9DBEA → #3C98B4 (44% mid stop)
```

Fonts: **Sora** (headings/titles, SemiBold) and **Geist** (body/labels) —
find the actual font files/CDN links under `android/app/src/main/res/font/`
or source them from Google Fonts/Vercel's Geist if not already available
as web fonts.

These are "exact values from the Figma app design" per the comment in
`Color.kt` — treat them as the real brand palette, not a placeholder.

## 6. Full screen inventory (Android, for parity reference)

From `android/.../navigation/StakRoutes.kt` — not all of these need a web
equivalent (e.g. biometric `LOCK`, mobile permissions), but this is the
complete list of what "the app" currently covers:

```
Onboarding: intro, brand-picks, swipe-tutorial, goal, risk,
            preparing-deck, taste-reveal, create-account, verify-email,
            permissions, profile-setup
Auth:       sign-in, forgot-password
Main shell: Home / News / Discover / My STAK / Simulate (bottom tabs)
News:       article detail, live detail, daily-brief detail
My STAK:    collection detail, all collections, updates ("What Changed"),
            taste graph, stock detail
Profile:    profile, edit profile, notifications, settings/{kind}
Simulate:   portfolio, pick/{symbol}, trade ticket, order confirmation,
            add cash
Other:      search
```

`frontend/` currently covers roughly: welcome/login/signup/forgot-reset,
onboarding, a Home-like `index.tsx`, `feed.tsx` (News-ish), `my-stak.tsx`,
and profile pages. Discover, Simulate, and the My STAK sub-pages (updates,
taste graph, stock detail) don't appear to exist yet as web routes — worth
confirming with the user which of these are actually in scope before
building all of them, rather than assuming full parity is wanted
day one.

## 7. Standing principles from this session (apply on web too)

- **Permanent fixes over patches, always.** When you find one instance of
  a consistency bug (a label contradicting a value, a cache serving stale
  text next to fresh state, a cap that silently excludes something),
  audit for the same *pattern* elsewhere before calling it fixed.
- **Never invent a UI promise the app can't fulfill** (the "+N more" bug
  in §4.2 is the canonical example — a "see more" affordance must lead
  somewhere that actually shows more).
- **Render server-computed labels/levels as given** — don't recompute
  anything the backend already reconciled (risk level/note, mood
  color/position) independently on a new client; that's how the same bug
  comes back a third time on a third platform.
- **Verify by reading code, not by assuming a memory or a doc is still
  accurate** — several things above (routes, file line numbers) will move;
  grep for the current definition before trusting a paraphrase, including
  this document's.
- Never add `Co-Authored-By` lines to commits (standing user preference).
- Backend deploys: `gcloud run deploy stak-backend --source . --region
  us-central1 --quiet --clear-base-image`, run from the repo root, always
  verified after with `curl <backend-url>/api/health`.
