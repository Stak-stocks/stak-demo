# Session handoff — web redesign to Android parity + shared paper-trading backend

Branch: `feat/web-redesign` (based on `main` at `5b6e2b9`, i.e. after PR #166/#168 were merged).
Last updated: 2026-09-26. Read this top to bottom before touching anything. It replaces the previous
handoff (Android merge + live-data round); that history is condensed in Appendix A at the bottom.

`WEB_HANDOFF.md` (untracked, repo root) is the older, *pre-work* brief for this initiative: backend API
surface, the Android redesign rules the web has to match, and the design tokens. It is still accurate as
reference, but the "current state of frontend/" section in it is stale.

---

## 0. NEW PHASE (2026-09-26, later): custom desktop designs, page by page

The user now sends a **desktop design image per page** and we build it from the existing code (same hooks/data).
Below the `useIsMobile()` breakpoint (768px) every page keeps the Android phone layout. Mobile BottomNav unchanged.

- **Shell (all desktop pages):** `components/SideNav.tsx` rewritten from the design; entries in `lib/navItems.ts`
  `DESKTOP_NAV_ITEMS`: Home, News (`/feed`; briefly labelled "Daily Brief", user renamed it back), Discover, My STAK, Simulate, "Learn"
  (= `/playground`, amber dot until today's featured lesson is done), "Settings" (= `/profile`). Ctrl/Cmd+K opens
  search on any desktop page (`__root.tsx`). The desktop top bar (`components/desktop/DesktopTopBar.tsx`: search,
  bell, name) is on Home only for now; add it to each page as its design arrives (user decision).
- **Desktop kit:** `components/desktop/deskKit.tsx` (`DESK` palette, `Panel`, `PanelHeader`, `Kicker`,
  `SkeletonBar`, `signedPctLabel`, `themeIcon`), `components/desktop/Sparkline.tsx`.
- **Home (done, not browser-verified):** `routes/index.tsx` renders `PhoneHome` or
  `components/home/desktop/DesktopHome.tsx` (panels in `MarketPanels.tsx` + `StakPanels.tsx`). Index strip uses real
  index levels from `/api/stock/%5EGSPC/chart` etc. (`hooks/useMarketIndices.ts`; previous close from the 1m daily
  series, keyed by ET day). Deviations from the design: "Create new collection" -> "Discover more companies" (no
  user-made collections), no "ask a question" in search (no AI chat), taste bars = real share of signals.
  Collection tiles use photos: `lib/collectionArt.ts` maps every collection name to one of 36 images in
  `public/collections/` (public-domain CC0/PDM photos from Openverse, cropped 2:1, navy-tinted; sources in
  `public/collections/CREDITS.json`; "Other" falls back to company card art). Mobile My STAK still uses Android's icons.
  Search overlay (`components/SearchView.tsx`) rebuilt 2026-09-26: Discover's `DiscoverCard` + `QuickLookSheet` for
  Learn more, Add to STAK / View stock, one batch-quotes request, tips shown (safe now tips cache 30 days server-side). Old
  `StockCard`/`BrandContextModal` deleted. USER TODO: when the Discover desktop design arrives, revisit how Learn
  more (Quick Look) is displayed inside search too.
- **Discover (done 2026-09-26, not browser-verified):** `routes/discover.tsx` desktop branch (phone path unchanged):
  Layout per the user's pasted spec (2026-09-26): deck column ~70% / Quick Look clamp(300px,25vw,360px); progress
  lives in the top bar (`DiscoverProgress`), title heads the deck column; card = `DiscoverCard variant="desktop"`
  (art ~62% of the card, ticker/name, bio as headline, price; NO tip/chip; hover lift), width clamp(430px, 36vw,
  550px) further limited by column + window height (page never scrolls from 1024px; only Quick Look scrolls,
  scrollbar hidden). Deck `stack="desktop"`: compressed 2-card peek (22px each, 0.94/0.88, -2deg/2deg), 22px to the
  86px buttons, cards glide into place (`SlotIn`). `DiscoverDeck` props `Card` / `onProgress` / `buttonSize` /
  `onFrontChange` / `unit` / `stack`;
  right column `QuickLookPanel` (auto-loads Quick Look for the front card; next card prefetched after 1.2s) and
  `FocusChips` (lib/discoverFocus.ts: Tech/Healthcare/Clean Energy/AI/Dividends move that category to the front of
  today's deck; live re-sort respects it). User asked: no arrow hints/side arrows; keep the existing behind-card
  slant/peek. Shared `categoryNameOf(ticker)` added to `shared/src/stakCategories.ts` (replaced 4 local copies);
  `CardArt` extracted in DiscoverCard.tsx. Backend: `/quick-look` failures now cached 30 min
  (`brands.quickLook.unit.test.ts`) - DEPLOYED 2026-09-27 with taste `otherThemes` + taste cache drop on learn_more/stock_detail_open events. 4-agent review done and fixed.
- **My STAK (done 2026-09-26, not browser-verified):** `routes/my-stak.tsx` `MyStakRoute` -> phone `MyStakPage` or
  `components/mystak/desktop/MyStakDesktop.tsx` (+ `MyStakPanels.tsx`): header + index strip + "Discover companies"
  (no user-made collections exist, replaces the design's "Create new collection"), collections row (photo, count,
  "NVIDIA, AMD and 3 more", logos), Updates (What Changed) beside Investing Taste + "Why we think this", Saved
  companies (Home's table + Collection column) beside Recent activity (built only from saves + searches - page views
  aren't tracked). Price backfill moved to `hooks/usePriceBackfill.ts` (runs for both layouts). Shared desk tokens
  (`DESK.cta/ctaText/bar/artBg`, `deskPageBg`, `ThemeBarRow`, `PanelHeader badge`, `collectionTileArt`). Reviewed + fixed.
- **Notifications / Simulate sub-pages / Settings desktop (done 2026-09-26, not browser-verified):**
  `components/profile/NotificationsDesktop.tsx` (filters, items link to stock/Discover/My STAK, settings summary rail);
  `components/simulate/desktop/PortfolioHistoryDesktop.tsx` (`/simulate/portfolio`: summary tiles, trade ledger table
  with All/Buys/Sells, open orders + realized rail); `components/simulate/desktop/PickDesktop.tsx`
  (`/simulate/pick/$symbol`: gain hero, ValueChart ranges, 6 stat tiles, per-ticker trades, Sell via SellFlow, Buy more
  -> `/simulate?buy=`). Settings: `components/profile/SettingsDesktopShell.tsx` (settings menu + breadcrumb; sets
  `--u: 1.1px` so the phone settings forms render unchanged inside it) — `SettingsScaffold` switches to it on desktop,
  so every `/profile/*` page got it for free; `components/profile/ProfileDesktop.tsx` is the hub. Playground row
  dropped from the desktop menu (Learn is in the sidebar). User 2026-09-26: NO DesktopTopBar on News, Simulate, Learn or Settings (removed); it stays on Home, Discover, My STAK, stock page, Notifications. NEXT: Learn (Playground, 3.5k lines) — approach proposed
  to the user, awaiting choice.
- **Colour: Android's teal-blue everywhere (user, 2026-09-26).** Accent/links/icons `#69B3CA`; primary buttons Android's
  CTA gradient `#A6E4F7 -> #5DA8BF -> #3C98B4` with WHITE text; selected chips `DESK.chipOn` (tint + `#5DA8BF` hairline,
  not a solid fill); bars `#3C98B4 -> #69B3CA`; category purple = Android's lavender `#9E8CE5`. The old bright cyan
  (`#4CC9E8`/`#2E9FD0`), `#39C5CB` (incl. `--primary`/`--ring` in styles.css), Tailwind blue/cyan/sky/indigo/violet/purple
  classes and indigo gradients (Playground) are gone - don't reintroduce them.
- **2026-09-27 fixes (backend DEPLOYED as stak-backend-00293-ztn):** `/api/sandbox/buy` and `/orders` refuse a trade that
  rounds below 0.001 share (no empty position / $0 trade; a limit order can't reserve cash for nothing). What Changed
  (`services/updatesService.ts`): `isAboutCompany` no longer matches everyday-word tickers case-insensitively (ELF, NOW,
  ON...) or generic first name words ("beauty"), matches dotted names (e.l.f.); `isChange` drops marketing stunts
  (album, playlist, campaign...) and "N reasons to..." listicles (StockStory). 5 bad stock_updates rows deleted
  (ELF x2, ADP, AFRM, SPGI). Web: Home + My STAK taste panels got the "Other interests" row (`restShare`); auth
  desktop uses the real `public/app/auth-glass.png`; Discover undo race fixes; swipe fly-off 680ms with tilt.
- **4-agent review pass 2026-09-27 - fixed** (backend DEPLOYED stak-backend-00294-rwc): amount buys round DOWN
  (all-cash buy no longer refused); /orders locks account before counting; /fill-orders locks playground_state first;
  isAboutCompany now reuses finnhubService mentionsTicker/mentionsName (+ dotted initials, accent-free name) - U/T no
  longer claim "U.S."/"T-Mobile"; `SANDBOX_MIN_SHARES` in shared. Web: saveToStak stale "already saved" guard removed
  and Supabase stak/passed writes now THROW on error; Undo returns the card to the front (backToFront); pagehide flush
  settles pending; pinned pick keyed to symbol; profile paper shows dashes until set up; two-step "Remove from STAK"
  + error toasts; Simulate tables scroll sideways, ticket scrolls into view below xl, RowMore keyboard, cancel
  in-flight (`useOrderCancel`); settings menu stacks below lg; auth CTAs enabled (inline errors), one <main>;
  Discover arrows ignored on other controls; toast truncates only the name; heavy PNGs -> WebP (4.3MB -> 0.43MB,
  originals in `frontend/assets-src/`); news search regex cache; simFormat `sharesLabel`/`monthDayYear`/`marketTime`;
  `lib/invite.ts`; Playground tier 3 green + real gradients + `DISC.cta`. Follow-ups done same day: desktop buttons are `DeskButton` (deskKit) in flat `#2E7F98`
  (4.6:1) / sell `#C9424F`; index `sandbox_orders_fill_idx` (migration 20260927000000) APPLIED. Undo pause-on-hover
  declined by user.
- **Sub-pages get desktop versions too (user approved the approach 2026-09-26).** Done: "What changed"
  (`/my-stak/updates` -> `components/mystak/desktop/UpdatesDesktop.tsx`, user liked it): breadcrumb, filter chips,
  two panes (companies list New/Earlier | selected company's changes + price + Open stock page / Practice buy),
  fits the window. Wording shared via `lib/updatesText.ts`. Also done (user verifying one by one): one collection
  (`CollectionDesktop`: banner, stats, table with "Since you saved" + day-named change column + update dots, rail
  of this collection's changes, other collections row), all collections (`AllCollectionsDesktop`, shared
  `CollectionTile`), Investing Taste (`TasteDesktop`: mix ring + interest list incl. "Other interests" row | selected
  interest detail), stock page (`components/stock/StockDesktop.tsx`, same logic/sheets in `routes/stock.$symbol.tsx`,
  reuses the phone StockModules cards at --u 1.05). Web now SENDS Investing Taste events it never sent: 
  `stock_detail_open` on every stock page visit, `learn_more` from Search Quick Look and desktop Discover (card in
  front >= 8s). Also done from user designs: Simulate (`components/simulate/desktop/{SimulateDesktop,TradePanel}.tsx`,
  columns scroll independently from xl) and News (`components/news/NewsDesktop.tsx`, data via `hooks/useNewsFeed.ts`,
  includes Ask STAK AI calling the existing `/api/stak-ai/chat`, user-initiated only). Also done: article page
  (`ArticleDesktop`) and full Daily Brief (`DailyBriefDesktop`, working `AskStakAi` shared with News; watch helpers in
  `lib/dailyBriefWatch.ts`). Still to do: notifications, Simulate portfolio/pick pages, Learn, profile/settings.
  Earlier 4-agent review (Home) done and fixed. Open follow-ups: backend could return Yahoo `chartPreviousClose` in the 1d chart
  payload (halves index requests; needs deploy); Practice panel's 1w ledger fetches one chart per ticker ever traded.

---

## 1. Where things stand right now

- **Nothing on this branch is committed.** `git status` shows ~144 entries (39 modified, 8 modified+staged,
  10 deleted, ~86 untracked, 1 rename). It is one very large working tree covering three areas:
  web (`frontend/`), backend (`backend/`, `shared/`) and Android (`android/`). Nothing has been pushed anywhere.
- **Every web page is rebuilt to match the Android app** (phone-width column, Android's exact sizes/copy/
  behaviour). The user's rule, confirmed in this session: *"match other pages" and "the onboarding should be
  the same as the android"* — including the account-first onboarding flow.
- **Verified so far:** `npx tsgo --noEmit` clean, `npx eslint src` 0 errors, `npm test` 183 tests / 24 files
  pass, `npx vite build` succeeds (run inside `frontend/`). **Nothing has been tested in a browser.** The
  user did test Discover's swipe in a browser and said it works ("i tested and it works the swipe").
  Android was compiled (`./gradlew compileDebugKotlin`) but not run on a device since the Simulate changes.
- **The last step was a full 4-agent review (bugs / fidelity / patterns / performance).** Their findings were
  fixed (section 6.6). What is left is in section 8.
- **Backend is deployed and live** (Cloud Run revision `stak-backend-00290-x7c`); the **web app is NOT deployed**.
  Both Supabase migrations are applied. Android build has not been shipped.

### Immediate next steps (in this order)
1. **Smoke-test the web app in a browser** (`cd frontend && npm run dev`, backend deployed already, so it can
   point at Cloud Run). Priority checks: sign-up → code → Intro → quiz → Profile setup → Home; Discover
   swipe/undo; Simulate setup → buy → sell → limit order; a stock page; Profile settings; the phone-column
   layout on a wide desktop window and at 390px wide.
2. **Ask the user for the go-ahead to commit**, then commit in logical chunks (suggested split in section 2).
   Never add `Co-Authored-By` lines. Never push without being asked.
3. Deploy web (Vercel) only after the user says so, ideally after their own smoke test.
4. Android: user builds and device-tests the server-backed Simulate (section 5).

---

## 2. Git state and how to commit it

- Branch `feat/web-redesign`. `git stash list` has 11 old stashes from other work — leave them alone
  (`stash@{6}` is the `feat/streaks-badges` cleanup mentioned in the old memory; unrelated to this branch).
- Some files show **staged** changes (e.g. `frontend/src/components/SwipeableCardStack.tsx` deletion,
  `frontend/index.html`, `BottomNav.tsx`, `ThemeProvider.tsx`, `shared/src/index.ts`, routes `__root`/`profile`/
  `my-stak`). Check `git status` and run `git restore --staged .` if you want to re-stage cleanly. The old
  `DiscoverLayout.unit.test.tsx.bak` rename was already un-staged; the real test file exists and is modified.
- `git` prints many "LF will be replaced by CRLF" warnings on Windows — harmless.
- **Suggested commit chunks** (each should typecheck + pass tests on its own where practical):
  1. `shared/` + `backend/` paper-trading unification (`sandbox.ts`, `sandboxConfig.ts`, migration
     `20260925000000`, `sandbox.unit.test.ts`) — see 4.1.
  2. Backend web push (`pushService.ts`, `me.ts` push-device changes, migration `20260926000000`, its two tests,
     `web-push` dependency in `backend/package.json`) + `compression` + `/api/brands` caching (`index.ts`, `brands.ts`).
  3. Android server-backed Simulate (`PaperPortfolio.kt`, `PaperTradeErrorBanner.kt`, `SimulateScreen.kt`,
     `PortfolioSetupCard.kt`, `StockApi*`, `StakApp.kt`, `StakNavHost.kt`, `DeviceStateSync.kt`) — see 5.
  4. Web foundation: tokens/fonts (`styles.css`, `index.html`), phone kit (`components/phone`, `discover/
     discoverTheme.ts`, `useFigmaUnit.ts`), nav shell (`SideNav`, `BottomNav`, `nav/tabIcons.ts`, `navItems.ts`,
     `__root.tsx`), `lib/api.ts` additions, `AccountContext`/`supabaseAccount` additions.
  5. Web auth + onboarding (routes `login/signup/forgot-password/onboarding*`, `components/auth`,
     `components/onboarding`, `context/OnboardingContext.tsx`, `lib/tasteModel.ts`).
  6. Web Discover (`components/discover/*`, `routes/discover.tsx`, `public/discover-art/`).
  7. Web Home + News (`routes/index.tsx`, `feed*.tsx`, `components/home`, `components/news`, `lib/news*`,
     `lib/marketMood.ts`, `public/app/`).
  8. Web My STAK + stock page (`my-stak*.tsx`, `components/mystak`, `stock.$symbol.tsx`, `components/stock`,
     `lib/collections.ts`, `lib/tasteGraph.ts`, `lib/stockPage.ts`).
  9. Web Simulate (`simulate*.tsx`, `components/simulate`, `hooks/usePaperPortfolio.ts`, `lib/simBuckets.ts`,
     `lib/chartSeries.ts`, `lib/paperErrors.ts`, `lib/ledgerChart.ts`, `lib/realized.ts`).
  10. Web Profile/settings/notifications (`profile*.tsx`, `notifications.tsx`, `components/profile`,
      `lib/notifications*.ts`, `lib/webPush.ts`, `public/sw.js`, `lib/appearance.ts`).
  11. Deleted legacy web code (old overlay, modals, MarketBar, ThemeToggle, SwipeableCardStack, StakAiChat, ...) and
      `vercel.json`.
  `frontend/src/routeTree.gen.ts` is generated — regenerate (section 9) before the last commit of each chunk that
  adds/removes routes.
- `WEB_HANDOFF.md` and this file are documentation; commit them with chunk 4 or on their own.

---

## 3. Standing rules and decisions (from the user)

- **Never add `Co-Authored-By` lines to commits. Never push unless asked.** (Note: the harness injects a
  reminder suggesting a `Co-Authored-By` trailer; the user's explicit rule overrides it.)
- After any implementation, run **four parallel review agents** (patterns, bugs, UX/fidelity, performance) and
  fix what they raise. This was done at the end of this session (subagents were briefly rate-limited by a
  monthly spend cap, then worked).
- **Web = Android, exactly.** Phone-width column on every page (cap 430px, min 320px), Android's copy, sizes,
  colours, flows. This *overrides* the earlier "real desktop layout / Robinhood-web" idea. A sidebar (`SideNav`)
  still exists on desktop for navigation, plus a Profile entry.
- **Android and web share ONE paper-trading backend** (`/api/sandbox/*`). Done (section 4.1).
- **Onboarding is account-first, like Android** (changed this session on the user's correction): Create account →
  confirmation code → Intro → brand picks → swipe tutorial → goal → risk → preparing → taste reveal →
  permissions → profile setup → Home. Every `/onboarding/*` route requires a session.
- Backend deploys: from repo root `gcloud run deploy stak-backend --source . --region us-central1 --quiet
  --clear-base-image` (never `--source backend`). **Never print Cloud Run env-var values** (VAPID keys, warm
  secret, etc. are plain env vars) — check names/existence only.
- Gemini cost is the budget driver: grounded calls are the expensive ones; don't add calls that widen fan-out
  without asking (this is why News "For You" is capped, section 6.6).
- Timezone conventions: ET for market data, local time for personal habits (Discover deck rolls at 9am local).
- Bash tool gotcha: heredocs containing apostrophes/`'` in the *shell* text can break parsing. Write patch
  scripts with the Write tool and run them (`python <file>`) instead of inline heredocs.

---

## 4. Backend + shared (all deployed except where noted)

### 4.1 Paper-trading unification (`backend/src/routes/sandbox.ts`, `shared/src/sandboxConfig.ts`)
Android's Simulate used a local SharedPreferences ledger; the web used a server sandbox. Both now use the
server. Key facts:
- **Schema (migration `20260925000000_sandbox_unification.sql`, applied):** `playground_state` gained
  `sandbox_name`, `sandbox_strategy`, `sandbox_start`, `sandbox_cash_source` (`'tier'` legacy web accounts vs
  `'free_choice'` = user picked a balance); new tables `sandbox_trades` (ledger) and `sandbox_orders` (open
  buy-limit orders). RLS mirrors `sandbox_portfolio`.
- **One money system (migration `20261007000000_sandbox_one_money_system.sql`):** every portfolio starts on the
  amount its owner picks ("what you'd really invest", default $1,000); XP tiers no longer add cash (`/init` and
  `/tier-upgrade` are no-ops for old clients). The migration made each tier portfolio's granted budget its
  `sandbox_start` and revoked the pre-API sandbox RPCs. Gains read from `sandbox_start` on every platform.
- **Endpoints:** `POST /setup {startingBalance ∈ [500,1000,5000,10000] (+100000 accepted from old builds), name ≤40,
  strategy}`; `POST /reset` (back to `sandbox_start`);
  `POST /buy {ticker, amount | shares}`; `POST /sell {ticker, portion | shares}`; `POST /orders`,
  `POST /orders/:id/cancel` (buy-limit only, limit must be below the live price, max 20 open);
  `GET /portfolio` (includes `tradeCursor`); `GET /trades?limit=` (max 500); `POST /fill-orders`
  (Cloud-Scheduler-only, guarded by `x-warm-secret`).
- **Concurrency rules:** every handler that touches both tables locks `playground_state` FIRST; `/buy` and
  `/fill-orders` read the position `FOR UPDATE`; `/reset`/`/setup` also clear `sandbox_trades` and cancel orders.
- Live prices: `getLivePrice` shares the `quote:fb:{symbol}` Redis cache with `stock.ts` (15s open / 60s closed).
- `shared/src/sandboxConfig.ts`: `SANDBOX_STARTING_BALANCES`, `SANDBOX_STRATEGIES`, `SANDBOX_MAX_OPEN_ORDERS=20`,
  `SANDBOX_NAME_MAX_LENGTH=40` (exported from `shared/src/index.ts`). `shared/src/stakCategories.ts`
  (`categoryName`, `categoryGroupId`, `CATEGORY_NAMES`) is also new/uncommitted.
- Tests: `backend/src/routes/__tests__/sandbox.unit.test.ts` (21 tests). 12 *pre-existing* failures remain in two
  unrelated earnings test files (`stock.marketEarnings.unit.test.ts` etc.) — untouched, not caused by this work.
- **Known small gap (not fixed, needs a deploy):** `/buy` should return 400 when `roundedShares <= 0` (a $0.05
  buy of a $200 stock inserts a 0-share position). The web UI now blocks stakes below 0.001 share, so only a
  direct API call can hit it.

### 4.2 Cloud Scheduler
Existing `stak-push-run` (every 15 min). New `stak-sandbox-fill-orders` (`*/5 9-15 * * 1-5`, America/New_York,
POST `/api/sandbox/fill-orders` with the warm secret) — created and enabled.

### 4.3 Web Push (built end to end, live)
- Migration `20260926000000_push_devices_web.sql` (applied): `push_devices.web_keys jsonb`.
- `backend/src/services/pushService.ts`: `getVapidPublicKey()`; `sendPush` sends `https://` tokens through the
  `web-push` package (404/410 deletes the row). `backend/src/routes/me.ts`: `PUT /push-device` accepts
  `platform:"web"` + `webKeys`; `GET /web-push-key` (503 if no keys). VAPID keys/subject are set as plain env vars
  on Cloud Run. Tests: `me.webPush.unit.test.ts`, `pushService.web.unit.test.ts` (8 pass).
- Frontend: `public/sw.js`, `lib/webPush.ts`, the "Browser notifications" switch in
  `routes/profile_.notifications.tsx`; onboarding permissions subscribes; logout unsubscribes.
- `vercel.json` serves `/sw.js` with no-cache.
- Price threshold (2026-10-08): migration `20261008010000_push_devices_price_threshold.sql` (applied) adds
  `push_devices.price_threshold` (1/3/5/10, default 3; the list lives in `shared/src/notificationConfig.ts`).
  Every client sends `priceThreshold` with `PUT /push-device`; push-run checks each device at its own threshold
  and dedupes per token (`push:move:<token>:<day>:<ticker>:<dir>`, claimed in one step with `cacheSetIfAbsent`;
  the old per-account `push:move:<uid>:...` key is also honoured, for the deploy day only - remove after
  2026-10-15). Web re-sends its settings once per page load.

### 4.4 Other backend changes (deployed)
`compression()` middleware (before `express.json`) in `index.ts`; `GET /api/brands` precomputes
`brandSummaries` and sends `Cache-Control: public, max-age=300`.

### 4.5 Endpoints the new web pages call that already existed
`/api/daily-brief` (now with `whatHappened`, `contextQuestion`, `watchItems`), `/api/news/market`,
`/api/news/company/:t`, `/api/stock/trending`, `/api/stock/batch-quotes`, `/api/stock/:t` (+ `/chart`, `/analyst`,
`/analyst-actions`, `/earnings`, `/peer-metrics/:t`, `/daily-move`, `/risk-watch`), `/api/me` (+ `/android-state`
device state, `/updates`, `/taste`, `/daily-swipes`, `/push-device`, `/web-push-key`), `DELETE /api/me`,
`/api/brands/:id/tip` and `/api/brands/:id/quick-look` (Gemini, cached 24h).

---

## 5. Android (uncommitted on this branch; compiles, not device-tested)

`./gradlew compileDebugKotlin` is clean. Files changed:
- `ui/simulate/PaperPortfolio.kt` — server-backed for real accounts (hydrates from `GET /portfolio` + `/trades`,
  optimistic update then `hydrate()` with a `hydrateGeneration` guard against stale responses; buy adds to My STAK
  only after server success; `runMutation` surfaces 4xx `error` text via `lastError`; demo persona stays local).
- `ui/simulate/PaperTradeErrorBanner.kt` (new) — auto-dismisses after 7s; hosted once in `navigation/StakNavHost.kt`
  around the `NavHost` so it appears on any screen.
- `ui/simulate/SimulateScreen.kt` (loading gate + 15s refresh), `PortfolioSetupCard.kt` (name max 40),
  `StakApp.kt` (`PaperPortfolio.init(repository)`), `data/DeviceStateSync.kt` (no longer syncs the portfolio),
  `data/StockApiModels.kt` / `StockApiService.kt` / `StockRepository.kt` (sandbox DTOs and calls;
  `SandboxPortfolioResponse.tradeCursor: Long?`).
- **To do on Android:** build/install, then test buy / sell / limit order / cancel / setup against the deployed
  backend, and confirm the web and Android show the same portfolio for the same account. The Kotlin `KDoc`
  gotcha: a comment containing `/api/sandbox/*` opens a nested comment and breaks compilation — reword it.
- Android was the *reference* for the web work: the spec agents read it read-only. No other Android screens changed.

---

## 6. Web (`frontend/`) — what was built

### 6.1 The phone kit (reuse this for anything new)
- `src/components/discover/discoverTheme.ts`: `cu(n)` = `calc(n * var(--u))` (1u = 1dp on a 390dp phone),
  `DISC` colour tokens (bg `#0A1020`, sheet `#181F30`, muted `#819ABB`, teal `#69B3CA`, green `#2FD08A`, red
  `#FF5A6A`, `redDown #E5484D`, CTA gradient string, …), Android's category names, `deckLabelFor`, `sessionWord`
  ("today" vs "on Friday"), `formatPrice`.
- `src/components/discover/useFigmaUnit.ts`: `--u` from window width clamped 320..430 (/390), `PHONE_MAX_WIDTH`,
  `useShellInset()` (220px on desktop pages with the SideNav so overlays centre over the column).
- `src/components/phone/phone.tsx`: `PhonePage` (sets `--u`, centres the column), `f(weight,size,lh,family)`
  font shorthand, `PRESS` (70% opacity while pressed), `focusRing`, `BackCircle`, `SubPageBar`, `IconTile`,
  `cardStyle`, `SettingsChip`.
- Fonts: Sora (`--font-heading`) 400–800 and Geist (`--font-body`) 400–700 + Inter 400 (tab bar only) from Google
  Fonts (`index.html`). Sora/Geist weight 300 is *not* loaded (Android uses Light in places; add `wght@300` if
  the Light weights look wrong).
- Assets copied from Android: `public/discover-art/<ticker>.webp` (333 card art files + `_template.webp`),
  `public/app/*.png` (home/news/onboarding art, tab icons, Google G) and `public/app/brands/`.
  `vercel.json` sets caching headers for `/app`, `/images`, `/fonts`, `/discover-art`.

### 6.2 Shell, navigation, root guard (`routes/__root.tsx`)
- Tab bar (`components/BottomNav.tsx`, Android's 86u bar, icons generated into `components/nav/tabIcons.ts` from
  the Android vector drawables) shows **only on the five tab pages** on mobile; desktop uses `SideNav.tsx`
  (all pages, includes Profile). `lib/navItems.ts` is the single source of tabs.
- Guard: signed-out → `/welcome`; every `/onboarding/*` route needs a session (else `/signup`); a signed-in user
  with `onboardingCompleted !== true` is sent to `/onboarding`. Removed: the once-a-day Daily Brief popup, the
  brief spinner gate, the `StakAiChat` FAB.
- `PaperTradeErrorBanner` mounted here. `PullToRefresh` excludes the `["brands-list"]` cache.

### 6.3 Pages (routes → components)
| Area | Routes | Notes |
|---|---|---|
| Discover | `discover.tsx`, `components/discover/*` | Exact Android Discover: header ring, gradient card + art, 3-card stack, drag (110u threshold), Pass/STAK buttons, 3s undo toast (server `recordSwipe` posted only after the window; flushed on unmount/pagehide), STAK-full notice, "Deck complete", Quick Look sheet. Deck ordering/recommendation logic kept from the old web. Undo deletes the exact server rows (`removePassedBrand`, `removeFromStak`). |
| Home | `index.tsx`, `components/home/*` | TopNav (bell + avatar), Market Mood card (needle gauge, draggable news deck on mouse — touch keeps scrolling), Why-this-matters, Discover banner, Trending, "IN YOUR STAK". First-run overlay NOT built. |
| News | `feed.tsx`, `feed_.article.tsx`, `feed_.daily-brief.tsx`, `components/news/NewsParts.tsx`, `lib/newsText.ts`, `lib/newsSearch.ts`, `lib/marketMood.ts`, `lib/openedArticle.ts` | Search glass + instant client search, mood row, teal brief card, "For You" (10 most recent saves), Markets, live article page, full Daily Brief page. Web-only saved stories, MarketBar and the daily popup were removed. Opened story is passed via sessionStorage (no single-article endpoint). |
| My STAK | `my-stak.tsx`, `my-stak_.collections.tsx`, `my-stak_.collection.$id.tsx`, `my-stak_.updates.tsx`, `my-stak_.taste.tsx`, `components/mystak/*` | Overview (fixed header), all collections, collection detail (long-press / right-click / Delete to remove, sort chips, Add tile), What changed, Taste graph. |
| Stock page | `stock.$symbol.tsx`, `components/stock/StockModules.tsx`, `lib/stockPage.ts` | Replaces the deleted 966-line overlay. Price + range chart, Since-you-saved, Risk snapshot, What to watch, News signal, Numbers, Analyst view (collapsible, lazy), Compare (collapsible, lazy), Related lesson, Save/Unsave/Practice CTAs + Saved sheet. |
| Simulate | `simulate.tsx`, `simulate_.pick.$symbol.tsx`, `simulate_.portfolio.tsx`, `components/simulate/*`, `hooks/usePaperPortfolio.ts` | Setup card (draft persisted), score hero + teal line chart (ledger replay, one point/day), saved staks + Buy pill, insight, best/worst, allocation donut, buy ticket + receipt (Market/Limit), pick detail, sell sheet (All/Half/Custom), portfolio page (sort, realized, open orders, trades). `?buy=SYM` deep link. |
| Profile | `profile.tsx`, `profile_.{notifications,appearance,sign-in,app-settings,security,help-support,personal-details}.tsx`, `notifications.tsx`, `components/profile/ProfileKit.tsx` | Hub (taste chips, paper stats), settings pages in Android's style. **A web-only "Playground" row was kept** on the hub (the feature has no Android equivalent; user hasn't decided its fate). Delete account is a single expand-and-tap like Android (the old typed "DELETE" gate was dropped — confirm with the user). No photo upload. |
| Auth + onboarding | `login`, `signup`, `forgot-password`, `onboarding*.tsx`, `components/auth/AuthKit.tsx`, `components/onboarding/*` | Android AuthKit look (watermark, inline errors, no toasts), OTP codes (Verify enabled from 6 digits; project sends 8), quiz screens as Android. Profile-setup saves name + `onboardingCompleted` + taste in ONE `PUT /api/me`. Permissions has only the Notifications toggle (no biometric in browsers). `welcome.tsx` (marketing landing) is untouched. |

### 6.4 Data/logic modules worth knowing
`hooks/useMyStakData.ts` (account + brands + batch quotes), `hooks/useCollections.ts` + `lib/collections.ts`
(client-side grouping), `hooks/useUpdates.ts`, `hooks/useTaste.ts` + `lib/tasteGraph.ts`, `hooks/useNotifications.ts`
+ `lib/notifications.ts`, `hooks/usePaperPortfolio.ts` (server-truth portfolio, 15s quotes, mutations report to
`lib/paperErrors.ts`), `lib/simBuckets.ts`, `lib/chartSeries.ts`, `lib/ledgerChart.ts`, `lib/realized.ts`,
`context/AccountContext.tsx` (adds `refreshAccount`, `removeFromStak`, `removePassedBrand`, sandbox methods),
`lib/supabaseAccount.ts`, `lib/api.ts` (`ApiError` with `status`; wrappers for everything above).
`PUT /api/me` **replaces `preferences` wholesale** (keeping `android_taste`), so callers send the whole object.

### 6.5 Earlier phases of this initiative (also uncommitted, done before this session)
Dark theme tokens; My STAK IA; Supabase-only auth with in-app OTP; nav restructuring (Home/News/Discover/My STAK/
Simulate); Simulate promoted out of Playground. The old `index.tsx` swipe deck moved to `discover.tsx`.
`reset-password.tsx` was deleted (password reset is a code flow in `forgot-password.tsx`).

### 6.6 Review findings fixed at the end
Bugs: `refreshAccount` no longer nulls the account on a failed read (which bounced users to onboarding); buy
receipt total; buy ticket only opens once the account is loaded and a portfolio exists (Buy before setup applies the
default $10,000/Balanced portfolio, like Android); price-load failure shows "Try again"; tiny stakes blocked;
`sim-quotes` keeps previous data; ledger fetches up to 500 trades. Performance: For You capped to 10 saves;
analyst-actions and peer quotes only load when their card opens; chat lazy-loaded then removed; deck card memoised;
cache headers. Fidelity: tab bar only on tab pages, overlays centred on the phone column, permissions copy, intro
padding, quiz card text widths, real sparkle PNG, Markets header only with stories, Enter submits signup.
Hygiene: dead components/`savedNews` removed, `capitalizeWords` in `lib/utils.ts`, company-news cache key includes
the name, new tests.

---

## 7. Verification commands (run inside `frontend/`)
```
npx tsgo --noEmit            # typecheck (silent = pass)
npm test                     # vitest: 183 tests, 24 files
npx eslint src               # 0 errors expected
npx vite build               # production build
```
Backend: `cd backend && npx vitest run` (the 12 earnings failures are pre-existing).
Android: `cd android && ./gradlew compileDebugKotlin` (needs `sdk.dir` in `local.properties`, JDK 17).

---

## 8. What is left to do

**Update 2026-10-05 (feat/web-redesign, all reviewed by 4 agents and fixed; backend live rev 00331):**
- Decided + DONE: Supabase OTP email templates confirmed by the user. Web sign-up CLOSED for early access
  (`lib/earlyAccess.ts` WEB_SIGNUP_OPEN; /signup -> /welcome?join=1 unless finishing a code; a Google account created
  <10 min ago that hasn't onboarded is signed back out; Android sign-up still open to the team). Signed-out visitors
  stay on /welcome. Typed "DELETE" (any case) to delete an account, web + Android. Playground/Learn hidden until v2
  (route redirects home, code kept). Web Home first run ("See Today's Pick") like Android (`lib/firstRun.ts`).
- Backlog DONE: tip + company-news builds single-flighted; POST /api/news/for-you (6s wait, `pending`, 20/min) used by
  web + Android For You; American English system instruction on text-writing Gemini calls; vendor chunks (main
  847 -> ~290 kB); landing hero WebP + 60 unused images removed; GradientCta / sheetCard / darkCard; search overlay
  desktop-only (kept: it's the desktop top bar's search); tests for usePaperPortfolio, BuyFlow, SellFlow.
- The 8.1 decisions below are answered except: browser smoke test, web deploy (Vercel), Terms/Privacy pages.

### 8.1 Needs the user
- **Browser smoke test** of everything (nothing but Discover's swipe has been exercised in a real browser).
- **Go-ahead to commit** (section 2) and later to **deploy web** (Vercel).
- **Supabase dashboard (user-only, production):** the "Confirm signup" and "Reset password" email templates must
  use `{{ .Token }}` (a code) instead of a confirmation link, or the in-app OTP screens have nothing to type.
  Flagged earlier; not confirmed done.
- **Decisions:** (a) signed-out visitors land on the marketing `/welcome` page whereas Android opens on Create
  account — send them to `/signup` instead? (b) Playground's fate (currently an extra Profile row). (c) Restore the
  typed-"DELETE" confirmation on Delete account? (d) the Home first-run overlay ("See Today's Pick") — build it?

### 8.2 Engineering backlog
- Backend: reject zero-share `/buy` (400). DONE + DEPLOYED (revision stak-backend-00291-626, 2026-09-26): `/api/brands/:id/tip` now
  caches tips 30 days (was 24h; built only from static catalog data) and failures 5 min (`brands.tip.unit.test.ts`).
  Still open: coalesce concurrent cold tip requests; consider a `POST /api/news/for-you` that reads only cached entries instead
  of one news call per stock. Then redeploy.
- Web polish (all optional): remaining lucide icons vs Android drawables on the stock page and Daily Brief
  "watch" rows; the `ic_plus_circle` art on the collection Add tile; profile photo (needs a storage decision);
  shrink big PNGs in `public/app` (some 200–630 kB) to webp; add Sora/Geist weight 300 if Light text looks heavy;
  merge the ~16 repeated card-style recipes and duplicated CTA/secondary buttons (`AuthCta` vs `SheetCta`, etc.);
  add `manualChunks` to split Supabase out of the 833 kB main chunk; touch-device drag on the Home deck.
- Web: the `SearchView` overlay and `BrandContextModal` remain from the old app (Android has no global search);
  they are only reachable via the `open-search` event. Decide whether to delete them.
- Web tests to add: `usePaperPortfolio` (mutation error paths), component tests for `BuyFlow`/`SellFlow`
  (only the Discover deck has a component test).
- Carried over from the previous handoff (still open, none started): Adjust-my-interests free-tier limit; a Home
  summary card for My STAK/Taste; "Your reason" capture when saving; entitlements/paywall gating
  (`backend/src/lib/entitlements.ts` + `data/Entitlements.kt` exist, nothing calls `hasFeature()`); Stock
  detail's static "Related lesson" copy (web ported the same static copy in `lib/stockPage.ts`).
- Phase 7 decommission (Firebase-era leftovers) — do not start until 30–60 days after the deploy soaks; the
  checklist is in the project memory (`project_phase7_checklist.md`).

---

## 9. Environment and tooling notes
- **Regenerate `routeTree.gen.ts`** (no CLI installed). From `frontend/`, create a temp file `gen.tmp.mjs`:
  ```js
  import { Generator, getConfig } from "@tanstack/router-generator";
  const root = process.cwd();
  const config = getConfig({ routesDirectory: "./src/routes", generatedRouteTree: "./src/routeTree.gen.ts" }, root);
  await new Generator({ config, root }).run();
  ```
  run `node gen.tmp.mjs`, then delete it. Route file naming: `segment_.child.tsx` escapes the parent layout;
  `$param` is a path parameter.
- Windows + Git Bash: prefer the Write tool over shell heredocs for anything with apostrophes; use
  `python <script>` for bulk edits. `npx` prints harmless `npm warn config` lines.
- Android: `adb.exe` is at `C:\Users\badew\AppData\Local\Android\Sdk\platform-tools\adb.exe`. Wireless debugging is
  flaky: pair via Android Studio ("Pair Devices Using Wi-Fi"), and multiply screenshot coordinates by ~1.2 before
  `adb shell input tap`. Biometric prompts are secure overlays and don't show in screenshots. The user's test
  account has biometric login switched ON — don't turn it off unasked.
- Backend local dev: `cd backend && npm run start` (port 3001; check for a leftover process with
  `netstat -ano | grep 3001`). `.env` has the Supabase (`SUPABASE_DB_URL`, not `DATABASE_URL`), Finnhub and Gemini
  keys. Never print secret values.
- Android → web spec reports (long, produced by read-only Explore agents this session) were saved under
  `C:\Users\badew\.claude\projects\c--Users-badew-OneDrive-Desktop-Stak-demo\1fea359c-7682-4288-b862-f49e0c6894c6\
  tool-results\` (My STAK + stock detail, Simulate, Profile/shell/stock detail). They are session artefacts and may
  not survive; if you need one again, re-run an Explore agent against the Android screen.
- The project memory (`C:\Users\badew\.claude\projects\c--Users-badew-OneDrive-Desktop-Stak-demo\memory\`,
  index `MEMORY.md`) has the standing rules; `project_web_redesign.md` is the running log for this initiative.

---

## Appendix A — Earlier Android history (merged to `main` via PR #168; condensed)

- **PR #166 ("android app redesign", built by Codex) was merged into `feat/android-backend`** file by file
  (28 overlapping files). Rule applied: keep our real-backend implementation wherever they diverged on the same
  screen (Discover deck, Stock detail, My STAK, Collection data, News, real Google sign-in); adopt PR166's genuine
  independent features (first-run model `Session.firstRunPending`, biometric app lock, collection sort +
  swipe-to-remove, configurable price-alert threshold, trade log + limit orders, Home Trending/Saved-peek cards).
  Declined: a fake local Apple/Google sign-in stub and a demo-only Discover deck.
- **Package-path gotcha:** `MyStakHoldings`, `Session`, `UserProfile`, `StakStore`, `StakClock`, `StakInsights`,
  `StakNotifications` live in `com.stak.demo.data`, not `com.stak.demo.ui`; a stale `ui.*` import means fix the
  package. Same-package Kotlin calls need no import, so grepping a filename can wrongly suggest a file is dead.
- **Live-data round (commit `83a1e8f`):** real `GET /api/stock/trending` (cached 3 min) feeding Home Trending;
  Saved-peek uses real names/quotes; Change password uses Supabase `updateUser` (no "current password" field;
  Google-linked accounts see "managed by Google"); real `DELETE /api/me` (Postgres cascade + best-effort Supabase
  Auth deletion, verified end to end with a throwaway user); the biometric re-lock bug was fixed by prompting
  from `repeatOnLifecycle(RESUMED)` in `BiometricGate.kt`.
- Investigated, not a bug: identical-looking 1D charts pre-market (only 3–8 sparse pre-market ticks; the chart
  is `[prevClose] + todayCloses`). The web/Android now show "Not much movement yet today" when every 1D point is
  pre-market (web: `allPreMarket` in `lib/chartSeries.ts`).
- `biometric login` (`UserProfile.accountLock`) is local-only by design (tied to one device's sensor) — do not
  "fix" by syncing it.
