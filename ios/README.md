# STAK iOS (SwiftUI)

Native SwiftUI sibling of the `android/` Kotlin/Compose app — same Figma
frames, same flow, equal design fidelity. Written from the CHINEDU Figma
file (`vB8TOvR1WyyXEKVZ8frstU`, section "01 · Onboarding & Auth", node
1:178) with the Android build as the reference implementation
(1 Figma px = 1 pt; screens are stateless views + callbacks wired in
`RootFlowView`).

## Opening the project (on the Mac)

The Swift sources, asset catalog, fonts and Info.plist are all committed;
only the `.xcodeproj` needs generating. Two options:

**Option A — XcodeGen (recommended):**

```sh
brew install xcodegen
cd ios
xcodegen generate
open StakDemo.xcodeproj
```

**Option B — manual:** create a new iOS App project in Xcode named
`StakDemo` inside `ios/` (SwiftUI, iOS 17), delete its template
`ContentView.swift`/`Assets.xcassets`, then drag the `StakDemo/` folder in
(create groups), and point the target's Info.plist setting at
`StakDemo/Info.plist`.

Then build & run — no third-party dependencies.

## Project layout

Mirrors the `android/` package layout one-to-one so engineers can hop
between the two codebases:

| ios/StakDemo/ | android/ …/com/stak/demo/ | Contents |
|---|---|---|
| `StakDemoApp.swift` | `StakApp.kt` / `MainActivity.kt` | App entry |
| `RootFlowView.swift` | `navigation/StakNavHost.kt` + `StakRoutes.kt` | Flow routing |
| `MainTabsView.swift` | `MainTabsShell` (in `StakNavHost.kt`) | Tab shell placeholder |
| `Theme/` | `ui/theme/` | Color + font tokens |
| `Components/` | `ui/components/` | Shared chrome (tab bar) |
| `Onboarding/` | `ui/onboarding/` | The 12 flow screens + `AuthKit` |
| `Assets.xcassets` / `Resources/Fonts` | `res/drawable*` / `res/font` | Exports + fonts |

Asset naming convention: an iOS asset is the PascalCase of its Android
res name (`brand_apple` ↔ `BrandApple`, `ic_google_g` ↔ `IcGoogleG`,
`splash_glass_ball` ↔ `SplashGlassBall`), so any export lives under the
same words on both platforms.

## Screen inventory (CHINEDU node IDs)

| Screen | View | Node |
|---|---|---|
| 00 Splash | `SplashView` | 1:926 |
| 01 Welcome | `IntroView` | 1:179 |
| 02 Brand picks | `BrandPicksView` | 1:232 |
| 03 Swipe tutorial | `SwipeTutorialView` | 1:344 |
| 04 Goal matrix | `GoalView` (`MatrixQuizView`) | 1:498 |
| 05 Risk matrix | `RiskView` (`MatrixQuizView`) | 1:569 |
| 06 Preparing deck | `PreparingDeckView` | 1:634 |
| 07 Taste reveal | `TasteRevealView` | 1:687 |
| 08 Permissions | `PermissionsView` | 1:749 |
| 09 Profile setup | `ProfileSetupView` | 1:793 |
| Auth · Sign up | `CreateAccountView` | 1:830 |
| Auth · Sign in | `SignInView` | 1:879 |

Flow: splash → sign up (⇄ sign in) → 01 → … → 07 → 08 → 09 → tab shell
(sign-in goes straight to the shell). The splash auto-advances to sign
up after 1200ms with a 350ms ease-out dissolve, per the file's
prototype wiring. `MainTabsView` is the phase-3 placeholder with the
real Figma tab bar (`StakTabBar`).

## Fonts

`Resources/Fonts/` carries static instances (Light/Regular/Medium/
SemiBold/Bold) cut from the same Sora and Geist variable TTFs the Android
app bundles — Sora's variable file has no per-instance PostScript names,
which iOS needs, hence the static cuts. PostScript names are
`Sora-SemiBold`, `Geist-Medium`, etc. (see `Theme/StakFonts.swift`), all
registered in Info.plist `UIAppFonts`. Squarish Sans CT ships as-is —
`SquarishSansCT.ttf` / `SquarishSansCT-SC.ttf` (PostScript names
`SquarishSansCTRegular` / `SquarishSansCTRegularSC`).

## Assets

`Assets.xcassets` mirrors the Android `res/` exports: flattened Figma
renders (glass ball, hero box, tutorial cards, 12 brand circles,
Google/Apple marks) plus the icon SVGs (back chevron, goal/risk glyphs,
STAK logo mark) with vector data preserved. Tab-bar icons, chevrons,
spinner and the 42x24 toggle are drawn in code from the Figma geometry,
same as the Android Canvas ports.

## Beyond the prototype (intentional)

Behavior that is not wired in the CHINEDU prototype but is deliberate
in both apps (the authored frames themselves are untouched):

- Swipe between stories on the article screen — the fixed top bar stays
  put while the article pages ride a horizontal pager (user, 2026-08-31).
- Every news card, brief page and list row opens its article; the feed is
  holdings-driven (user, 2026-09-01).
- READ NEXT chains articles — each row pushes the next story's article.
- Native hero video players (AVKit) on the article hero.
- The Discover save toast auto-dismisses after 2.2s.
- Collection, stock and pick detail pages serve the tapped item's data
  into the authored template, the way the Discover deck's "Learn more"
  already serves the tapped stock (Codex parity audit 2026-09-04).
- Portrait lock: the design is a fixed 390x844 portrait artboard (2026-09-04).
- The My STAK holdings store drives the collection chips' counts, the collection pages, Unsave and the stock page's saved state (Codex audit 2026-09-04); the Overview's summary copy ('Across 14 stocks', 'Six of your fourteen picks', the allocation donut and bars) stays the authored frame (user, 2026-09-04: the exact design wins). The seeded demo holds the three deck stocks, so the deck's Learn more pages open already saved; Unsave one from AI & Tech to demo the authored Save flow.

## Backend handoff

Everything the app shows today is local state or hand-written demo data.
The seams below are where a backend plugs in. Android mirrors every store
and file name (see `android/README.md`), so one API shape serves both apps.

**Local state a backend would own** (all under `StakDemo/`):

- `Session.swift` — sign-in state, which account this is (`demoAccount`:
  Sign in = the authored demo persona, Create account = an empty account),
  the persisted profile.
- `StakStore.swift` — the per-account key-value store (UserDefaults,
  `demo.` / `new.` key prefixes) every store below persists through.
- `Simulate/PaperPortfolio.swift` — the paper ledger: cash, positions,
  realized sales, buy/sell (`canBuy` guards every order).
- `MyStakHoldings.swift` — saved stocks and when each was saved.
- `Discover/DiscoverView.swift` (`DeckSession`) — the day's deck and what
  was swiped or saved.
- `StakNotifications.swift` — inbox items and read state.
- `News/NewsSaves.swift` — bookmarked stories.
- `UserProfile.swift` — display name, photo, onboarding answers (brand
  picks, goal, risk), notification settings. The device's IANA timezone is
  sent with the session so deliveries can be scheduled in the user's local
  time (contract of 2026-08-22).

**Demo data a backend would replace:**

- `News/NewsArticleFeed.swift` — stories (headline, body, media, related
  tickers) and the per-stock facts on the article card.
- `MyStak/Collections.swift` — the six collections and their stocks
  (price, weekly change).
- `Discover/StockDetailView.swift` — per-stock detail facts (stats,
  analyst view, news signal, next earnings date).
- `Simulate/PickDetailView.swift` — pick specs (price then / now,
  shares); `Simulate/LeaderboardView.swift` — the board rows.
- `StakInsights.swift` — derives a NEW account's reads (My STAK read,
  allocation, insights) from the stores above; the demo persona keeps its
  authored copy.

**Firebase:** not wired on iOS yet (Android carries a Hilt module for
Auth and Firestore); add the Firebase iOS SDK through Swift Package
Manager in `project.yml` when the backend lands.
