# Session handoff — Android redesign merge + live-data follow-up

Branch: `feat/android-backend`. Read this top to bottom before touching anything —
it covers a large merge and a follow-up round of backend wiring, in order.

## 1. Where things stand right now (read this first)

- **The working tree is clean.** Three commits are **in** on
  `feat/android-backend`, unpushed:
  - `50ccca2` — the PR #166 ("android app redesign" branch) merge, fully
    conflict-resolved file by file.
  - `f2ab396` — restored a stashed AGP/Gradle/Kotlin toolchain bump (AGP
    8.13.2→9.4.0, Gradle 8.14.5→9.6.0, Kotlin 2.1.20→2.2.10) that predated the
    merge and was set aside during it.
  - `83a1e8f` — the "live data" round in section 3 below (Trending Today,
    Saved Peek, Change password, Delete account, the biometric re-lock fix).
    This is now committed, not uncommitted — the file list under section 3
    reflects what landed in this commit.
- Nothing on this branch has been pushed to any remote.
- **Simulate is the next task** — the user is opening a new session
  specifically to start it. Nothing on Simulate has been touched yet beyond
  what PR166's merge already brought in (trade log, limit orders — see
  section 2). Go through it the same way Home/News/Notifications/Profile/
  Discover were done: find what's still fake/static and decide with the user
  whether/how to make it real.
- Local backend (`backend/`) may have a leftover `npm run start` process from
  testing — check `netstat -ano | grep 3001` / kill it if you find one before
  starting your own.
- **Biometric login is currently switched ON** on the user's real test
  account (turned on deliberately during testing in section 3e). The app will
  keep asking for a fingerprint on launch/resume until the user turns it off
  themselves in Profile → App settings — don't be surprised by it, and don't
  turn it off without being asked.

## 2. The PR #166 merge (commit `50ccca2`)

### Why this happened
A separate "android app redesign" branch (GitHub PR #166) had been developed in
parallel by a different tool (Codex), independently of this session's
real-backend integration work on `feat/android-backend`. The user asked to pull
its latest commits in, explicitly warning **"don't just accept the change"** —
i.e. review every conflict, don't blindly take either side.

### How it was done
- Fetched PR #166's live head directly via
  `git fetch origin refs/pull/166/head:refs/remotes/pr/166-latest` (no `gh`
  auth available in this environment — don't rely on the `gh` CLI here).
- Merge-base analysis: our branch had 63 commits / 467 files changed since the
  common ancestor; PR #166 had 25 commits / 46 files; **28 files overlapped**.
- Went through all 28 overlapping files individually. Three files
  (`MyStakHoldings.kt`, `StakClock.kt`, `StakNotifications.kt`) showed as
  modify/delete conflicts because our branch had moved them from `ui/` to
  `data/` early on — resolved as renames, porting PR166's small additions into
  the `data/` versions.

### Rule of thumb applied throughout
**Kept our real-backend implementation** wherever the two branches diverged on
the same screen (Discover deck, Stock Detail, My STAK overview, Collection
data, News feed, Google sign-in — real Supabase auth, not a local-only stub).
**Adopted PR166's work** where it was a genuine, independent feature or fix
that didn't regress real-data behavior:
- First-time vs returning-user model (`Session.firstRunPending` +
  `completeFirstRun()`), replacing a daily-reshow heuristic that didn't
  actually match "first-time user" semantics.
- Biometric app lock (`BiometricGate.kt`, `StakRoutes.LOCK`, re-locks on
  `ON_STOP`) and a real `Session.deleteAccount()` (local-only at merge time —
  see section 3 for the real backend delete added afterward).
- Collection page sort (Newest / A–Z / Top movers) and swipe-to-remove,
  rewired onto the real ViewModel-backed holdings instead of the static
  catalogue it shipped with.
- Configurable price-move notification threshold — the merge also caught that
  `StakNotifications` had the threshold **hardcoded to 3%** even though the
  settings UI let you pick 1/3/5/10%; fixed to actually read
  `UserProfile.priceThreshold`.
- Trade log + limit orders in `PaperPortfolio.kt` / `SimulateScreen.kt`
  (`placeLimit`, `cancelOrder`, `openOrders`, `TradeHistory.kt`,
  `PortfolioSetupCard.kt`) — a whole feature PR166 had built that our branch
  didn't; the buy-sheet's Market/Limit toggle actually calls `placeLimit()`.
- Home's Trending strip and Saved-peek cards (`HomeExtras.kt`) — required
  threading a new `onOpenStock` nav param through `MainShell`/`StakNavHost`,
  and making the stock-detail route compute `fromMyStak` from actual holdings
  (`symbol in MyStakHoldings.tickers`) instead of hardcoding `true`, so an
  unsaved trending stock doesn't show fake "since you saved" copy.
- Misc small fixes: unsaving a stock now also clears its saved news stories
  (`NewsSaves.removeStories`), a paper buy now actually adds the stock to My
  STAK (`PaperPortfolio.buy` was missing the `MyStakHoldings.add` call
  entirely), practice-buy respects the Stak-at-capacity check, a renamed demo
  persona reaches the leaderboard with their own initial.

**Declined / reverted back to our side:**
- A fake local-only Apple/Google sign-in stub (PR166's `CreateAccountScreen`/
  `SignInScreen` just set a `linkedGoogle` flag and navigated — no real auth).
  Kept our real `AuthViewModel.signInWithGoogle()`.
- A duplicate, demo-only Discover deck implementation (`deckCards()`,
  `deckCardAt()`, `DECK_SIZE = 12` cycling three designed cards) with no
  backend behind it. Kept our `DiscoverViewModel`-backed real deck.
- Blanket overwrites of fields our branch already computes correctly from live
  data (e.g. PR166 unconditionally set `UserProfile.joined` on every sign-in;
  ours only sets it once, from the server, and leaves room for `ProfileSync`).

### Two accidental regressions caught during the merge (fixed before committing)
1. A first attempt at a bulk "take our side" resolution on `DiscoverScreen.kt`
   used a regex that mishandled empty-HEAD-side conflict blocks and left stray
   `<<<<<<<`/`>>>>>>>` markers plus a corrupted file. Recovered with
   `git checkout -m -- <path>` (regenerates conflict markers) and redid it with
   a corrected script.
2. A second bulk resolution silently dropped the buy-sheet's Market/Limit
   branch in `onConfirm` (the code that actually calls `PaperPortfolio.placeLimit()`
   vs `.buy()`) even though the surrounding UI toggle was intact — caught by
   diffing the final file against pre-merge HEAD and grepping for every
   PR166-introduced symbol (`placedLimit`, `limitPrice`, etc.) to confirm each
   one was actually *wired*, not just present.
3. Two files (`HomeExtras.kt`, `StockCatalogue.kt`) were deleted as "dead code"
   early on because a same-package call site (`HomeScreen.kt` calling
   `TrendingStrip`/`SavedPeekCard`) doesn't need an import in Kotlin, so a
   plain grep for the file name found nothing. The build caught this
   (`Unresolved reference 'TrendingStrip'`) — restored both files from PR166
   and fixed their stale `com.stak.demo.ui.*` package refs (see below).

### The recurring package-path gotcha
This session's branch moved several singletons from `com.stak.demo.ui` to
`com.stak.demo.data` package **before** the merge (`MyStakHoldings`, `Session`,
`UserProfile`, `StakStore`, `StakClock`, `StakInsights`, `StakNotifications`).
PR166 was built against the old `ui.*` paths. Git's 3-way merge silently
merged in a lot of PR166's *non-conflicting* additions with the stale package
path (because the surrounding lines weren't touched by our side, so there was
no marked conflict to review) — this bit multiple times, always surfacing as
`Unresolved reference` at compile time, e.g. `com.stak.demo.ui.MyStakHoldings`,
`com.stak.demo.ui.Session`, `com.stak.demo.ui.StakInsights`. **If you see one
of these six names under `com.stak.demo.ui.*` anywhere, it's stale — fix the
package to `com.stak.demo.data.*`.**

### Verification done for the merge
- `./gradlew :app:compileDebugKotlin` and `:app:assembleDebug` both clean.
- Installed on-device (real, non-demo account): Home, My STAK (new
  Collections/Updates/Investing-Taste layout), Discover all confirmed
  rendering against live data with no regressions.

## 3. Live-data follow-up round (commit `83a1e8f`)

After the merge, the user asked to replace remaining fake/stubbed data that
PR166 had introduced with real backend behavior. Four items, all now real:

### 3a. Trending Today (Home)
- **Backend**: new `GET /api/stock/trending` in `backend/src/routes/stock.ts`.
  Runs quotes (same `quote:fb:{symbol}` Redis cache + `finnhubGet` as
  `batch-quotes`) over `recommendations.ts`'s `WATCH_TICKERS` list (exported
  for this purpose — it wasn't exported before), sorts by `|changePercent|`
  descending, takes top 8, joins with the `brands` catalogue for company name.
  Result cached under `trending:v1` for 3 minutes (only cached if at least half
  the watchlist yielded a quote, so a bad batch isn't cached over a better one
  next request).
- **Android**: `TrendingResponse`/`TrendingStock` in `StockApiModels.kt`,
  `getTrending()` in `StockApiService.kt` + `StockRepository.kt`, new
  `TrendingStocks` object (`android/app/src/main/java/com/stak/demo/data/TrendingStocks.kt`,
  mirrors the existing `LiveQuotes` singleton pattern — `init(repo)` called
  from `StakApp.kt`). `HomeExtras.kt`'s `TrendingStrip` now fetches on
  `LaunchedEffect(Unit)` + refreshes every 3 min while visible
  (`RefreshWhileVisible`), and **renders nothing at all** if the list is empty
  or the request fails — no placeholder/fake tiles.
- Verified live: hit both localhost and the deployed Cloud Run URL directly,
  got real Finnhub-backed data (e.g. `INTC +7.67%`, `AMD +6.36%`); confirmed
  on-device the strip shows exactly that data with correct ▲/▼ coloring.

### 3b. Saved Peek card (Home)
- Was reading from the static 20-stock `StockCatalogue.all` (built from the
  six My STAK collections) for company name — real accounts holding a stock
  outside that static list would just fail the name lookup, and it never
  showed a live price/move at all (used the catalogue's fixed numbers).
- Now: company name via `MyStakHoldings.nameOf(ticker)` (the account's own
  real saved-stock record) falling back to the static catalogue **only** for
  the demo persona's pre-record seeded tickers (which predate the save-log).
  Live price/move via the existing `LiveQuotes.quote(ticker)` per held ticker
  (capped at the first 3 shown, matching the card's own "peek" cap).
- `StockCatalogue.trending()` was deleted (dead after 3a); `StockCatalogue.all`
  is kept only for that one demo fallback.
- Verified on-device: real account's peek showed AMZN/Amazon, DIS/Disney,
  GOOGL/Google with correct live percentages and correct red/green coloring
  (Disney was down, correctly red).

### 3c. Change password (real Supabase call)
- Was a pure UI mock: validated a "current password" field client-side against
  nothing, then just flipped to a fake "Password updated" success state — no
  network call at all.
- Checked how the **web app** does this (`frontend/src/routes/profile_.security.tsx`)
  and mirrored it exactly, since it's the known-working real pattern:
  - **No "current password" field** — Supabase's `auth.updateUser()` uses the
    active session, no re-auth needed. (Dropping this field is a deliberate
    simplification, not an oversight — matches the web app 1:1.)
  - **Google-linked accounts get a "Password managed by Google" message**
    instead of the form (`UserProfile.linkedGoogle` guard), also matching the
    web app.
- Added `AuthViewModel.changePassword(newPassword): String?` (null = success,
  else a friendly error message via the existing `friendlyError()` helper),
  calling `supabase.auth.updateUser { password = newPassword }`. Rewired
  `ChangePasswordScreen` in `SettingsScreens.kt` around it.
- Verified on-device with the user's real (Google-linked) account: correctly
  shows the "managed by Google" message instead of a form. The actual
  email/password update path is compiled and type-correct against the real
  Supabase SDK method signature but **not yet run against a real
  email/password account** — worth a follow-up test if you can get/create one.

### 3d. Delete account (real backend endpoint)
- Was local-only: `Session.deleteAccount()` just wiped `StakStore` and signed
  out. No server-side deletion existed at all — the account and all its data
  would still exist in Postgres and in Supabase Auth.
- **Backend**: new `DELETE /api/me` in `backend/src/routes/me.ts`. Every
  user-scoped table already has `ON DELETE CASCADE` back to `users(uid)` (set
  up from the very first Supabase migration specifically for this), so
  `delete from users where uid = $1` removes saves, swipes, events, taste
  snapshots, push devices, stock-update reads, the `auth_identity_map` row —
  everything, in one statement. Then, best-effort, looks up the account's
  `supabase_uid` from `auth_identity_map` and calls
  `getSupabaseAdmin().auth.admin.deleteUser(supabaseUid)` (the existing
  `backend/src/lib/supabaseAdmin.ts` service-role client — it already existed,
  unused, "retained for future admin/script use"; this is that use). A failure
  on the Supabase Auth deletion is logged but doesn't fail the request — the
  promise ("your data is gone") is already kept via the Postgres cascade; a
  leftover empty auth shell is harmless and can be cleaned up separately.
- **Android**: `deleteMe()` added to `StockApiService.kt` (`@DELETE("api/me")`)
  and `StockRepository.kt`. `AuthViewModel.deleteAccount(): String?` (same
  null-or-error-message shape as `changePassword`). `AppSettingsScreen` in
  `SettingsScreens.kt` now: for the **demo** account, still just does the old
  local-only wipe (nothing real to delete server-side); for a **real**
  account, calls the network delete first and only proceeds to
  `Session.deleteAccount()` + `onAccountDeleted()` **on confirmed success** —
  a failed request leaves the account and local data untouched rather than
  wiping the phone while the server-side account still exists.
- **Verified end-to-end for real**, not just compiled: wrote a throwaway
  script (`node` + `@supabase/supabase-js` admin client) that created a real
  disposable Supabase user, signed in as it, hit `GET /api/me` to force the
  `users`/`auth_identity_map` rows into existence, confirmed both rows
  present, called `DELETE /api/me`, and confirmed: the `users` row was gone,
  and `admin.getUserById()` on the original Supabase auth id returned "User
  not found". Script and the throwaway account are both cleaned up — nothing
  left behind from that test.
- **Not** tested by tapping the real button in the UI, deliberately — the only
  device available was signed into the user's real account, and a live
  "Delete my account" tap is irreversible. If you want UI-level confirmation,
  do it with a disposable test account, not the main one.

### 3e. Biometric re-lock bug found and fixed (not part of the original ask, found during on-device testing of 3d)
- User toggled "Biometric login" on in App settings, backgrounded the app, and
  on return got stuck on a plain splash screen with **no way to unlock and no
  prompt visible at all**.
- Root cause: the re-lock (an `ON_STOP` lifecycle observer in `StakNavHost.kt`)
  navigates to the `LOCK` route **the instant the app starts backgrounding**,
  before it's actually gone to the background. `BiometricGate.kt`'s original
  code fired `BiometricPrompt.authenticate()` from a plain
  `LaunchedEffect(Unit)` the moment the composable entered composition — i.e.
  while the activity was still mid-transition to `STOPPED`, not actually
  visible. Android silently drops/fails to show a biometric prompt requested
  in that state, and since the effect only runs once (`Unit` key never
  changes), returning to the foreground never re-asked.
- Fix: `BiometricGate.kt` now uses the same
  `lifecycleOwner.lifecycle.repeatOnLifecycle(Lifecycle.State.RESUMED) { prompt() }`
  idiom already established elsewhere in this codebase
  (`ui/components/RefreshWhileVisible.kt`) — the prompt is only requested once
  the activity is genuinely back in the foreground, and re-requested every
  time it re-enters `RESUMED` (so backgrounding a cancelled prompt and
  returning asks again, matching the "Tap to unlock" retry affordance already
  in the file).
- **Verified fixed on-device by the user**: reproduced the original stuck
  state with the pre-fix build, installed the fixed build, backgrounded and
  returned to the app, and successfully unlocked with a real fingerprint both
  from cold start and from the background→foreground path that was broken.

## 4. Investigated, not a bug: "every chart looks the same"

User noticed Stock Detail's 1D price chart looked visually identical across
different stocks (e.g. INTC and AMD both showed the same "steep jump then
flat" silhouette). Traced end to end (not just theorized):
- `GET /api/stock/{symbol}/chart?range=1d` returns real, symbol-specific data
  — confirmed by curling it directly for several tickers.
- The client's `chartFractions()` normalization and `StockDetailViewModel`'s
  per-symbol fetch/cache keying (`"$symbol:$range"`) are both correct — no
  state leaking between stocks.
- The actual cause: it was pre-market hours when this was tested. Each
  stock's real 1D data was only 3–8 sparse pre-market ticks, all clustered
  within a few cents of each other (e.g. DIS: `[105.52, 105.52, 105.50]`,
  all tagged `"session": "pre"`). The chart is built as
  `[prevClose] + todayCloses`, so with real prevClose far from a tight
  cluster of pre-market ticks, *any* stock reduces to the same "one diagonal
  segment, then flat" shape — not because data is fake or shared, but because
  there simply isn't much real intraday data yet before the regular session
  opens. Confirmed by checking `marketState: "PRE"` on the live quote.
- **Not fixed, left as an open question for the user**: should a chart built
  from only a couple of real, tightly-clustered points show something more
  honest (e.g. "not much movement yet today") instead of a dramatic-looking
  two-segment line that reads as generic/fake even though it's technically
  accurate? This would extend the same principle the app already applies
  elsewhere (`RangeChart`'s demo-vs-real branching in `SimulateScreen.kt` /
  `PickDetailScreen.kt` — "a shape invented to fill the box would read as its
  real history"). Re-test after the regular session has been open a while
  before deciding this is worth doing — the sparse-data condition may not
  reproduce during market hours.

## 5. What's explicitly still outstanding

Asked and confirmed with the user as of this session — nothing below has been
started:

1. **Simulate section** — the original task ordering was "Home, News,
   Notifications, Profile, Discover, then Simulate last." Simulate itself
   (beyond what PR166's trade-log/limit-order merge already brought in) has
   not been gone through for fake-vs-real data the way the other tabs were.
   This is the next thing to pick up.
2. **Adjust-my-interests free-tier limit** — deferred earlier in the broader
   session (before this handoff's scope), not started.
3. **Home summary card** — a My STAK / Taste Graph summary card on Home
   itself, deferred, not started.
4. **"Your reason" capture UX** — capturing why someone saved a stock,
   deferred, not started.
5. **Entitlements/paywall gating** — `backend/src/lib/entitlements.ts`
   (`Plan`, `Feature` — `updates_history`, `taste_evolution`, `hasFeature()`,
   `getPlan()`) and its Android mirror `data/Entitlements.kt` exist and are
   deployed, but **nothing in the app actually calls `hasFeature()` to gate
   anything**. Free vs. premium isn't enforced anywhere yet — this is
   scaffolding waiting on a decision about what's actually gated.
6. **Stock detail's "Related lesson" card** (`StockLessons.kt`, kept from the
   PR166 merge) — still static, hand-authored per-collection educational
   copy, explicitly self-documented in its own doc comment as a placeholder
   ("the backend serves real lessons in production"). Low priority, flagged
   for awareness only.
7. **Biometric login setting sync** — deliberately NOT flagged as a gap:
   `UserProfile.accountLock` is local-only by design (biometrics are tied to
   one device's enrolled sensor, so there's nothing meaningful to sync). Don't
   "fix" this later without re-checking this reasoning.

## 6. Environment notes for the next session

- **adb / wireless debugging**: the direct `adb pair`/`adb connect` path kept
  dying (device shows `offline`, pairing port rotates on reconnect/network
  change). What actually worked: pair through **Android Studio**'s device
  dropdown → "Pair Devices Using Wi-Fi..." → the phone then shows up under
  a device id like `adb-R58T33NWFCR-eJLTco (2)._adb-tls-connect._tcp` in
  `adb devices` from any terminal (same shared adb daemon). If adb shows the
  device offline again, that's the fastest fix — ask the user to re-pair via
  Android Studio rather than fighting `adb pair` directly.
- The wireless connection is **flaky even after pairing successfully** —
  it dropped mid-session multiple times (`error: closed`, then `adb devices`
  showing nothing at all), with no clear trigger (screen lock / Wi-Fi power
  save, most likely). Expect this and don't over-diagnose it: just ask the
  user to check the device, and re-run `adb devices` — it often reconnects on
  its own within a few seconds, sometimes registering as a second/duplicate
  device id for the same phone (both work, either one is fine to target with
  `-s`).
- `adb.exe` lives at
  `C:\Users\badew\AppData\Local\Android\Sdk\platform-tools\adb.exe` (not on
  PATH in the bash tool).
- adb screenshot coordinates: `Read`'s image tool shows a *displayed* size
  (e.g. 900×2000) that is **not** the device's real pixel size (e.g.
  1080×2400) — multiply displayed coordinates by ~1.2 before passing to
  `adb shell input tap`. Getting this wrong silently taps the wrong row (this
  bit twice this session — check the "original WxH" note the image tool
  reports before computing tap coordinates).
- A real device's system biometric prompt is a secure overlay: `adb exec-out
  screencap` either shows the screen *behind* it or comes back completely
  empty while it's up — neither means the prompt isn't showing. Don't
  conclude "no prompt" purely from a screenshot; ask the user to check the
  physical device.
- Backend local dev: `cd backend && npm run start` (or `npm run dev` for
  watch mode), port 3001. `.env` in `backend/` has `SUPABASE_URL`,
  `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL` (not
  `DATABASE_URL`), Finnhub/Gemini keys already configured.
- Backend deploy: from repo root,
  `gcloud run deploy stak-backend --source . --region us-central1 --quiet --clear-base-image`
  (memory rule — `--source backend` breaks the build context, don't use it).
- Standing rule: never add `Co-Authored-By` lines to commits (explicit user
  preference). Never push this branch without being asked.
