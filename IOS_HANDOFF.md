# iOS handoff — start here on the Mac

Written 2026-10-05 for a Claude Code session on the Mac. Paste this to start:

> Read `IOS_HANDOFF.md` in the repo root and follow it. Start with "1. Set up", then show me the gap list
> (section 5) before writing any code.

---

## 0. The goal in one paragraph

Build the STAK iOS app as a **twin of the Android app**: same screens, same flow, same copy, same data, same
behavior, same look (Android's Figma-exact layouts, fonts and colors). Android is the source of truth — when in
doubt, open the matching Android file and do what it does. The only differences are **iOS conventions an iPhone
user expects** (section 3). It must talk to the same live backend as Android and the web; no demo data in the
shipped app.

## 1. Set up

```sh
git fetch origin
git switch feat/web-redesign && git pull          # the current base: Android, web and backend all live here
git switch -c feat/ios                              # all iOS work goes on this branch
git checkout origin/pr/167 -- ios                   # bring in the SwiftUI app from PR #167 (it only touches ios/)
brew install xcodegen
cd ios && xcodegen generate && open StakDemo.xcodeproj
```

- PR #167 is **Emmanuel's** (author of the SwiftUI app, last commit 2026-09-06). Its branch is based on July's
  `main` and only changes `ios/`, so checking its `ios/` folder onto `feat/ios` above is conflict-free. Tell
  Emmanuel we're continuing it on `feat/ios`; close #167 in favor of the new PR when it's opened.
- Read `ios/README.md` first (project layout, Android↔iOS file map, asset naming: iOS asset = PascalCase of the
  Android res name, fonts, and its "Backend handoff" section listing every local store that a backend replaces).
- No third-party dependencies today. Adding the Supabase Swift SDK (Swift Package Manager) is expected — Android
  uses Supabase for auth.
- Build and run in the simulator after every change. Don't stack up uncompiled Swift.

### Secrets (never commit them)

The app needs the same values Android reads from `android/local.properties`:
`supabase.url`, `supabase.anon_key`, and a Google client ID (iOS needs its own **iOS** OAuth client ID from the
Google Cloud console, project `stak-c21a3`, plus the reversed client ID as a URL scheme). Put them in an
`ios/Secrets.xcconfig` that is git-ignored (add it to `ios/.gitignore`), reference it from `project.yml`, and read
them through Info.plist. Ask the user for the values; never print them in the chat.

## 2. Where things stand

- **iOS (PR #167):** 58 Swift files mirroring Android **as of 2026-09-06** — onboarding (splash → sign up/in → the
  quiz → permissions → profile), Home, Discover + stock detail, News + article (with video), My STAK + collections,
  Simulate (portfolio, pick detail, leaderboard), Profile/settings, Inbox. **Everything is local state or
  hand-written demo data; nothing calls the backend.** Android's file names and stores are mirrored one-to-one.
- **Android since then (~120 commits):** real Supabase auth (in-app numeric code for sign-up and password reset —
  no email links), the live API for every screen, server paper trading, the taste graph, updates, push, the
  engagement log, STAK AI (chat, history, streaming, follow-ups, thumbs, 5 questions / 6 hours), biometric lock,
  typed-DELETE account deletion, and many UI fixes.
- **Backend:** live on Cloud Run, `https://stak-backend-889057229494.us-central1.run.app`. Every call sends the
  Supabase access token as `Authorization: Bearer <token>`. Shared request/response shapes live in `shared/src/`
  (TypeScript; Android mirrors them by hand in Kotlin — iOS mirrors them in Swift `Codable`s the same way). STAK AI's
  contract is `shared/src/stakAi.ts`.

## 3. iOS conventions (the only intended differences from Android)

Use the native iOS behavior wherever an iPhone user expects it. Everything else stays exactly like Android.

- **Back = swipe from the left edge.** Every inner page (stock, article, collection, settings sub-pages, STAK AI
  chat/history, pick detail…) closes by swiping from the **left edge of the screen to the right**, following the
  finger, same as the back button. Use `NavigationStack` pushes so the system gesture works; if a screen hides the
  system navigation bar for the custom Figma top bar, keep the gesture working (don't break
  `interactivePopGestureRecognizer`).
- **Sheets** (buy/sell ticket, Quick Look, share, rename) are native sheets: drag down to dismiss, with detents
  where the Android sheet is partial height.
- **Sign in with Apple** next to Google. Required by App Store Review Guideline 4.8 whenever a third-party sign-in
  is offered. Supabase supports Apple as a provider (needs the Apple Developer setup + the provider enabled in the
  Supabase dashboard — a user task).
- **Face ID / Touch ID** for Android's biometric lock (`ui/onboarding/BiometricGate.kt`), via LocalAuthentication.
- **Push** for Android's FCM push (`StakMessagingService.kt`, `data/PushRegistration.kt`,
  `PUT api/me/push-device`): built, dormant (`Core/PushRegistration.swift`). The backend sends through FCM, so the
  app hands its APNs token to FirebaseMessaging and uploads Firebase's token. It turns on with no code change once
  `GoogleService-Info.plist` is in `StakDemo/` (gitignored), the APNs `.p8` key is in the Firebase console, and the
  entitlements are restored on the paid developer account: `aps-environment` = `development` in
  `StakDemo-Dev.entitlements` (Debug) and `production` in `StakDemo.entitlements` (Release).
- **Haptics** on the moments Android gives feedback (saves, swipes, a completed buy).
- **System share sheet**, **safe areas / Dynamic Island**, the **keyboard** pushing content up, **pull-to-refresh**
  only where Android has refresh, and the iOS **Dynamic Type**-safe layout where it doesn't fight the Figma sizes.
- **Not** iOS-ified: the tab bar, icons, fonts, colors and screen layouts stay Android's Figma design (no SF
  Symbols swapped in, no stock iOS list styling).

## 4. Product rules that apply to iOS too

- **Colors:** Android's teal `#69B3CA` and CTA gradient (`#A6E4F7 → #5DA8BF → #3C98B4`), page `#0A1020`, cards
  `#171D2C`. No bright cyan, indigo or violet.
- **American English** in all copy (practicing, color, center…).
- **STAK AI:** educational, never advice (no buy/sell/hold, no predictions, no picking a winner); a fixed
  "Educational, not financial advice." line on the chat screen; 5 questions per 6 hours (some accounts are
  unlimited — the server says so with `unlimited: true` in usage; hide the count then); declines and clarifying
  questions don't count; page entry points put a suggested question in the box, never auto-send. Mirror
  `android/app/src/main/java/com/stak/demo/ui/ai/` and `data/StakAiRepository.kt` (streamed answers via
  `POST api/stak-ai/chat/stream`, server-sent events `delta` / `done` / `error`).
- **Early access:** the web is closed to new sign-ups; Android sign-up is still open to the team. **Ask the user**
  whether iOS sign-up should be open before shipping to TestFlight.
- **Delete account** needs "DELETE" typed (any case), like Android's App settings.
- **"Before we get started"** (2026-10-08): date of birth, U.S. residence and Terms / Privacy, over the whole app while
  GET /api/me says `needsEligibility` - `Core/Eligibility.swift` (EligibilityGate) + `Onboarding/EligibilityView.swift`,
  shown from `RootFlowView`'s overlay (not over the splash or the Face ID lock). POST /api/me/eligibility: 403 = not
  eligible (the server deleted the account), 400 = the date or a box. Mirrors android `data/Eligibility.kt`.

## 5. Gap list to build (in this order)

Before coding, compare each iOS file with its Android twin and write the real gap list into the PR description.
Rough order:

1. **Foundation:** Supabase auth (sign up → numeric code → onboarding; sign in; Google; Apple; forgot password with
   a code) mirroring `ui/onboarding/AuthViewModel.kt`, `CreateAccountScreen.kt`, `SignInScreen.kt`,
   `ForgotPasswordScreen.kt`; a session store like `data/Session.kt`; an API client like `data/StockApiService.kt`
   + `StockRepository.kt` + `core/network/NetworkModule.kt` (45s read timeout, auth header, error handling like
   `data/HttpErrors.kt`). Onboarding answers saved with `PUT api/me` (`onboardingCompleted`, taste).
2. **Live data, screen by screen** (replace each demo store): Home (`ui/home/`), Discover deck + Quick Look + stock
   detail (`ui/discover/`), News + Daily Brief + articles + For You (`ui/news/`), My STAK + collections + taste
   graph + updates (`ui/mystak/`), Inbox (`ui/inbox/`), Profile/settings (`ui/profile/`).
3. **Paper trading** on the server (`ui/simulate/`, `api/sandbox/*`).
4. **STAK AI** (`ui/ai/`), entry points on Home/News headers, articles, stocks and the Daily Brief.
5. **Push (FCM → APNs; built, dormant until configured), biometric lock, engagement log** (`data/StakEvents.kt` → `POST api/swipe/event`).
6. **Polish + parity audit** against Android screen by screen; then TestFlight (needs the user's Apple Developer
   account).

### Endpoints Android uses (mirror these)

```
GET  api/me                     PUT api/me (via profile)        GET api/me/taste        GET api/me/updates
POST api/me/updates/{id}/read   GET api/me/daily-swipes         GET api/me/passed       PUT api/me/push-device
GET  api/me/android-state       GET api/me/android-stocks       PATCH api/me/stak/{brandId}/price
GET  api/brands                 GET api/brands/{id}             GET api/brands/{id}/quick-look   GET api/brands/{id}/tip
GET  api/recommendations        POST api/swipe                  POST api/swipe/event
GET  api/daily-brief            GET api/news/market             GET api/news/company/{symbol}    POST api/news/for-you
GET  api/stock/{symbol}         GET .../chart  .../daily-move  .../earnings  .../analyst  .../analyst-actions  .../risk-watch
GET  api/stock/batch-quotes     GET api/stock/trending          GET api/stock/peer-metrics/{ticker}  GET api/stock/portfolio-chart
POST api/sandbox/setup|buy|sell|orders|orders/{id}/cancel       GET api/sandbox/portfolio|trades
GET  api/stak-ai/usage|conversations|conversations/{id}/messages  POST api/stak-ai/chat/stream
PATCH api/stak-ai/conversations/{id}   POST api/stak-ai/messages/{id}/feedback
```

`android/*-state` and `android-stocks` are Android's device-state sync; check with the user whether iOS should use
the same rows (likely yes, renamed later) or skip them.

## 6. How we work (the user's standing rules)

- After every implementation phase: run **4 review agents in parallel** (code patterns, bugs, UX/accessibility,
  performance), then fix what they find, then re-run the build and tests.
- Commit messages: **no `Co-Authored-By` lines.** Commit when a phase is done; **never push unless the user asks.**
- Backend changes (if any): deploy with `npm run deploy:backend` from the repo root (canary, health check, then
  traffic moves automatically only if healthy).
- Never print secrets (Supabase keys, Cloud Run env values) — names and existence only.
- Plain-language updates to the user; they review on the device/simulator.
- Timezones: market data uses US Eastern; personal habits use local time.
