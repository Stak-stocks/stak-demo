# STAK AI — end-to-end test log

Running list for the STAK AI testing session. Status: ✅ passed · ❌ failed (see Open) · 🔧 fixed, needs retest · ⬜ not tested yet.

## Open

| # | Found | Issue | Status |
|---|-------|-------|--------|
| 1 | 2026-10-09, tester feedback | Hallucinations — see "Fixed" #1–#6. Deployed as rev 00361, follow-up fixes in 00363. All accuracy tests pass on web desktop. | ✅ |
| 2 | 2026-10-09 | Earnings-date questions have no data source in the chat, so the AI now says it doesn't know. Wiring in the stock page's earnings date would need the grounded consensus lookup (cost), so that's your call. | decision needed |
| 3 | 2026-10-09 | Old answers in history still contain the earlier made-up figures. Nothing to fix; just don't mistake them for new failures. | info |

## Fixed

1. **Answer repeats the previous answer** ("What is a P/E ratio?" → the ARM answer again). A question and its answer are saved in one statement with the same timestamp, so history came back in random order within a turn; Gemini sometimes saw the old question as unanswered. History is now ordered by timestamp then id.
2. **Company not recognised → no live data → invented figures.** "Applovin", "app lovin", "avgo", "Avgo", "Msft" weren't detected (catalog name is "AppLovin Corp"; lowercase tickers were ignored). Now detected; words like "app", "arm", "usb", "mrna" stay words.
3. **Follow-ups lost the company's news** ("Any negative catalyst", "lawsuit?" after asking about APP — the "Kids Ads Lawsuit" headline was in turn 1 but not passed to turn 2). News-type follow-ups now keep the conversation's company.
4. **Prompt allowed made-up facts.** New rules: no prices, moves, earnings dates, deals, lawsuits or ratings unless they're in the data the chat was given; no claims of browsing or "checking the stock page"; when told it's wrong, check the data instead of agreeing, and never adopt the user's number; one short apology; ignore insults. A quote or headlines that couldn't be fetched are now stated as missing.
5. **"What does this mean for me?" on an article was declined as advice.** It now explains what the news means for the companies involved.
6. **Review-round fixes:** temperature 0.5 → 0.3; "you're wrong" and insults never get a clarifying question; names reuse the news-tagging helper (adds Delta, Ford, Sony); everyday words ("trade war", "southern california", "oh snap", "ally") don't count as companies; "at&t", "tsmc" and curly "McDonald’s" do; market-wide or SEC/CEO follow-ups don't pull the wrong company's data; after switching companies the original page isn't re-noted; a news timeout says "couldn't be loaded" instead of "no news"; empty news is cached so quiet stocks don't burn API calls.

## Test checklist

Mark each cell as you go. W-D = web desktop, W-P = web phone (<768px), A = Android, I = iOS.

| Area | Test | W-D | W-P | A | I |
|------|------|-----|-----|---|---|
| **Entry points** | Sparkle button (Home / News header) opens an empty chat with starters | ⬜ | ⬜ | ⬜ | ⬜ |
| | Stock page "Why is X moving?" — answer uses that stock's live price | ⬜ | ⬜ | ⬜ | ⬜ |
| | News article "Ask about this" — answer refers to the article | ⬜ | ⬜ | ⬜ | ⬜ |
| | Daily Brief follow-up — answer uses the brief's points | ⬜ | ⬜ | ⬜ | ⬜ |
| | Context sent only with the first question (2nd question in same chat doesn't re-label it) | ⬜ | ⬜ | ⬜ | ⬜ |
| **Accuracy** (the reported bug) | "Any update on Applovin" — price matches the stock page; no invented deals | ✅ | ⬜ | ⬜ | ⬜ |
| | Lowercase ticker ("avgo pe ratio") — real P/E from live data | ✅ | ⬜ | ⬜ | ⬜ |
| | Ask a concept question after a stock question ("What is a P/E ratio?") — answers the new question, doesn't repeat the last answer | ✅ | ⬜ | ⬜ | ⬜ |
| | Tell it "you're wrong, it's $X" with a false number — it doesn't adopt it | ✅ | ⬜ | ⬜ | ⬜ |
| | "When is NFLX earnings?" — says it doesn't have the date, no guess | ✅ | ⬜ | ⬜ | ⬜ |
| | Follow-up "any lawsuit?" after a stock question — uses that stock's headlines | ✅ | ⬜ | ⬜ | ⬜ |
| | "Look online" — doesn't claim to have browsed | ✅ | ⬜ | ⬜ | ⬜ |
| **Answers & formatting** | Bold and bullets render; no raw `**` or `[[` markers | ⬜ | ⬜ | ⬜ | ⬜ |
| | Follow-up chips appear on answers, tapping one asks it | ⬜ | ⬜ | ⬜ | ⬜ |
| | Sources list shows headlines and opens links | ⬜ | ⬜ | ⬜ | ⬜ |
| **Refusals** | "Should I buy TSLA?" — declined, doesn't count against the limit | ⬜ | ⬜ | ⬜ | ⬜ |
| | "Will NVDA go up?" — declined (prediction) | ⬜ | ⬜ | ⬜ | ⬜ |
| | "Which is better, AMD or NVDA?" — declined as a pick, offers a comparison | ⬜ | ⬜ | ⬜ | ⬜ |
| | "Compare AMD and NVDA's margins" — answered (education) | ⬜ | ⬜ | ⬜ | ⬜ |
| | Fixed "not financial advice" line always visible | ⬜ | ⬜ | ⬜ | ⬜ |
| **Limit** (non-unlimited account) | Counter drops 5 → 4 after a real answer, not after a decline | ⬜ | ⬜ | ⬜ | ⬜ |
| | At 0: input blocked, countdown to next free question shown and ticks | ⬜ | ⬜ | ⬜ | ⬜ |
| | Unlimited account (favour03052005) shows no counter | ⬜ | ⬜ | ⬜ | ⬜ |
| **History** | List shows chats newest first with label (stock / article / Daily Brief) | ⬜ | ⬜ | ⬜ | ⬜ |
| | Reopen a chat — messages in the right order | ⬜ | ⬜ | ⬜ | ⬜ |
| | Rename — persists after reload / on another device | ⬜ | ⬜ | ⬜ | ⬜ |
| | Delete — gone everywhere; limit not refunded | ⬜ | ⬜ | ⬜ | ⬜ |
| **Streaming** | Text appears word by word; no marker flicker at the end | ⬜ | ⬜ | ⬜ | ⬜ |
| | Leave mid-answer, come back — answer is in history | ⬜ | ⬜ | ⬜ | ⬜ |
| **Errors & offline** | Airplane mode, send — clear error, question not counted | ⬜ | ⬜ | ⬜ | ⬜ |
| | Drop connection mid-stream — error shown, retry works | ⬜ | ⬜ | ⬜ | ⬜ |
| | Thumbs up / down saves and can be cleared | ⬜ | ⬜ | ⬜ | ⬜ |

## Checks I ran

- 2026-10-09 — Read every STAK AI chat on the tester account (read-only DB session). All 187 question/answer pairs share one timestamp, which confirmed #1.
- 2026-10-09 — Backend: 277/277 tests pass (STAK AI file 43, 10 new). Typecheck clean. Four review agents run (bugs, prompt/UX, patterns, performance); all findings applied except two rare CamelCase cases ("service now" → NOW) and lowercase unknown companies inheriting the last company's data (accepted limits).
- 2026-10-09 — Ran the new company detector over all ~150 real questions from that account: catches Applovin / app lovin / avgo / Msft / Googl; no new false matches.
- 2026-10-09 — Accuracy test 1 (web desktop, badewolegoodluck55): "Any update on Applovin" → APP detected; $276.61 / −1.10% match the live data it was given; every news claim traces to a headline. Nit: an opinion writer's "I'm Upgrading To Buy" was called an "analyst upgrade".
- 2026-10-09 — Accuracy tests 3–7 + article + insult (web desktop): all pass against the logged data. Two slips fixed in rev 00363: the model called a lawsuit "not new today" without knowing headline dates (headlines now carry "(Thu, Oct 8)" dates, and "today" uses the same format), and it marked "I can't browse" as a decline ([[DECLINED]] now only for advice/predictions). Test 2 (avgo) didn't run: writes were failing then (see incident).
- 2026-10-09 — INCIDENT (~00:35–00:40 UTC): my read-only check scripts ran a session `SET default_transaction_read_only = on` through the Supabase transaction pooler; it stuck to the shared connections and production writes failed. User cleared it by closing the idle pool connections in the SQL editor. Scripts now use `BEGIN READ ONLY`.
- 2026-10-09 — Rerun on rev 00363: test 2 "avgo pe ratio" → 45.2, exactly the live P/E (old answer said 49.88). Test 6 now calls the APP headlines "from today", and Finnhub confirms all four it cited are dated Fri Oct 9 (the earlier "not new today" was wrong, and that is what the date fix corrected).
