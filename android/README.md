# STAK Android (Kotlin / Jetpack Compose)

Native Kotlin/Compose sibling of the `ios/` SwiftUI app — same Figma
frames, same flow, equal design fidelity. Built from the CHINEDU Figma
file (`vB8TOvR1WyyXEKVZ8frstU`, section "01 · Onboarding & Auth", node
1:178). 1 Figma px = 1 dp/sp; screens are stateless composables +
callbacks wired in `StakNavHost`.

## Building

Standard Gradle: open `android/` in Android Studio, or

```sh
cd android
./gradlew assembleDebug
```

Gradle wrapper is pinned to 8.14.5 and the Android Gradle Plugin to
8.13.2 (the 8.x line is incompatible with Gradle 9.x — don't regenerate
the wrapper to a newer major).

`app/google-services.json` (the Firebase config) is git-ignored: copy
`app/google-services.json.example`, fill in your Firebase project, or
build without it — the Google Services plugin only applies when the
file is present, and the app runs without Firebase.

## Project layout

Mirrors the `ios/StakDemo/` group layout one-to-one so engineers can hop
between the two codebases:

| android/ …/com/stak/demo/ | ios/StakDemo/ | Contents |
|---|---|---|
| `StakApp.kt` / `MainActivity.kt` | `StakDemoApp.swift` | App entry |
| `navigation/StakNavHost.kt` + `StakRoutes.kt` | `RootFlowView.swift` | Flow routing |
| `MainTabsShell` (in `StakNavHost.kt`) | `MainTabsView.swift` | Tab shell placeholder |
| `ui/theme/` | `Theme/` | Color + font tokens |
| `ui/components/` | `Components/` | Shared chrome (tab bar) |
| `ui/onboarding/` | `Onboarding/` | The 12 flow screens + `AuthKit` |
| `res/drawable*` / `res/font` | `Assets.xcassets` / `Resources/Fonts` | Exports + fonts |
| `core/firebase/` | — | Firebase DI (wiring is a later phase) |

Asset naming convention: an Android res name is the snake_case of its
iOS asset (`brand_apple` ↔ `BrandApple`, `ic_google_g` ↔ `IcGoogleG`,
`splash_glass_ball` ↔ `SplashGlassBall`), so any export lives under the
same words on both platforms. Android res names are lowercase by
platform rule; iOS uses PascalCase.

## Screen inventory (CHINEDU node IDs)

| Screen | Composable | Node |
|---|---|---|
| 00 Splash | `SplashScreen` | 1:926 |
| 01 Welcome | `IntroScreen` | 1:179 |
| 02 Brand picks | `BrandPicksScreen` | 1:232 |
| 03 Swipe tutorial | `SwipeTutorialScreen` | 1:344 |
| 04 Goal matrix | `GoalScreen` (`MatrixQuizScreen`) | 1:498 |
| 05 Risk matrix | `RiskScreen` (`MatrixQuizScreen`) | 1:569 |
| 06 Preparing deck | `PreparingDeckScreen` | 1:634 |
| 07 Taste reveal | `TasteRevealScreen` | 1:687 |
| 08 Permissions | `PermissionsScreen` | 1:749 |
| 09 Profile setup | `ProfileSetupScreen` | 1:793 |
| Auth · Sign up | `CreateAccountScreen` | 1:830 |
| Auth · Sign in | `SignInScreen` | 1:879 |
| 02 · Home first run | `HomeScreen` (firstRun) | 1:958 |
| 02 · Home Main | `HomeScreen` | 1:1097 |
| 03 · News listing | `NewsScreen` | 1:1228 |
| 03 · News detail | `NewsDetailScreen` | 1:1495 |
| 03 · News save success | `NewsDetailScreen` (sheet) | 101:1005 |
| 03 · News detail saved | `NewsDetailScreen` (saved) | 1:1359 |
| 04 · Discover deck | `DiscoverScreen` | 1:1627 |
| 04 · Practice buy / filled | `PracticeBuySheet` / `OrderFilledSheet` | 1:1970, 85:1205 |
| 04 · Deck complete | `DiscoverScreen` (EndOfDeck) | 1:2330 |
| 04 · Stock Detail | `StockDetailScreen` | 1:2382, 1:2579 |
| 06 · My STAK overview | `MyStakScreen` | 1:3155 |
| 06 · Collection | `CollectionScreen` | 1:3333 |
| 06 · Saved detail | `StockDetailScreen` (fromMyStak) | 16:1012 |
| 05 · Profile hub | `ProfileScreen` | 171:995 |
| 07 · Simulate home | `SimulateScreen` | 1:3898 |
| 07 · Buy PLTR / filled | `PracticeBuySheet` (PLTR_BUY) | 1:4232, 85:895 |
| 07 · Portfolio | `SimPortfolioScreen` | 1:4496 |
| 07 · Pick detail | `PickDetailScreen` | 1:4631 |
| 07 · Sell confirm / closed | `SellConfirmSheet` / `PositionClosedSheet` | 1:4698, 73:855 |
| 07 · Leaderboard | `LeaderboardScreen` | 1:4124 |

Flow: splash → sign up (⇄ sign in) → 01 → … → 07 → 08 → 09 → Home
first run → (See Todays Pick) → Home Main; sign-in goes straight to
Home first run. The splash auto-advances to sign
up after 1200ms with a 350ms ease-out dissolve, per the file's
prototype wiring. `MainTabsShell` is the phase-3 placeholder with the
real Figma tab bar (`StakTabBar`).

## Beyond the prototype (intentional)

The Figma prototype authors every screen and transition; the build adds
a few interactions on top of it. Each is deliberate, with its source:

- Swipe between stories on the article screen — `NewsDetailScreen` is a
  `HorizontalPager` over the feed's canonical order, opened on the
  tapped story (user, 2026-08-31).
- Every news card, brief page and list row opens its own article — the
  feed is holdings-driven, so the authored Apple page is the template
  each story is served into (user, 2026-09-01).
- READ NEXT chains articles: each row opens its own article, which has
  its own READ NEXT.
- Native hero video players (ExoPlayer, in-app PiP, fullscreen) where
  the frame shows a poster + play glyph.
- The Discover save toast auto-dismisses after 2.2s.
- Collection, stock and pick detail pages serve the tapped item's data
  into the authored template — the same thing the Discover deck's
  "Learn more" already does (Codex parity audit, 2026-09-04).
- Portrait lock (2026-09-04).
- The My STAK holdings store drives the collection chips' counts, the collection pages, Unsave and the stock page's saved state (Codex audit 2026-09-04); the Overview's summary copy ('Across 14 stocks', 'Six of your fourteen picks', the allocation donut and bars) stays the authored frame (user, 2026-09-04: the exact design wins). The seeded demo holds the three deck stocks, so the deck's Learn more pages open already saved; Unsave one from AI & Tech to demo the authored Save flow.

## Fonts & assets

`res/font/` carries the Sora and Geist variable TTFs (weights
instantiated per style in `ui/theme/Type.kt`) plus Squarish Sans CT.
`res/drawable-nodpi/` holds flattened Figma renders (glass ball, hero
box, tutorial cards, 12 brand circles, Google/Apple marks);
`res/drawable/` holds icon vector drawables converted from the Figma
SVGs. Tab-bar icons, chevrons and the spinner are drawn with Canvas
from the Figma vector geometry.

## Backend handoff

Everything the app shows today is local state or hand-written demo data.
The seams below are where a backend plugs in. iOS mirrors every store and
file name (see `ios/README.md`), so one API shape serves both apps.

**Local state a backend would own** (all under `app/src/main/java/com/stak/demo/`):

- `ui/Session.kt` — sign-in state, which account this is (`demoAccount`:
  Sign in = the authored demo persona, Create account = an empty account),
  the persisted profile.
- `ui/StakStore.kt` — the per-account key-value store (SharedPreferences,
  `demo.` / `new.` key prefixes) every store below persists through.
- `ui/simulate/PaperPortfolio.kt` — the paper ledger: cash, positions,
  realized sales, buy/sell (`canBuy` guards every order).
- `ui/MyStakHoldings.kt` — saved stocks and when each was saved.
- `ui/discover/DiscoverScreen.kt` (`DeckSession`) — the day's deck and
  what was swiped or saved.
- `ui/StakNotifications.kt` — inbox items and read state.
- `ui/news/NewsSaves.kt` — bookmarked stories.
- `ui/UserProfile.kt` — display name, photo, onboarding answers (brand
  picks, goal, risk), notification settings. `timeZoneId` is the device's
  IANA timezone the app sends with the session so deliveries can be
  scheduled in the user's local time (contract of 2026-08-22).

**Demo data a backend would replace:**

- `ui/news/NewsArticleFeed.kt` — stories (headline, body, media, related
  tickers) and the per-stock facts on the article card.
- `ui/mystak/Collections.kt` — the six collections and their stocks
  (price, weekly change).
- `ui/discover/StockDetailScreen.kt` — per-stock detail facts (stats,
  analyst view, news signal, next earnings date).
- `ui/simulate/PickDetailScreen.kt` — pick specs (price then / now,
  shares); `ui/simulate/LeaderboardScreen.kt` — the board rows.
- `ui/StakInsights.kt` — derives a NEW account's reads (My STAK read,
  allocation, insights) from the stores above; the demo persona keeps its
  authored copy.

**Firebase:** `core/firebase/FirebaseModule.kt` provides `FirebaseAuth`
and `FirebaseFirestore` through Hilt, but nothing injects them yet.
`app/google-services.json` is git-ignored — use your own project's file
(template in `app/google-services.json.example`); the app builds and runs
without it.
