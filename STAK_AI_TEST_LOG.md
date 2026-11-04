# STAK AI — test log

What STAK AI does now, how to test it, what's been found and fixed, and what's still open. Status marks: ✅ passed · ❌ failed (see Open) · 🔧 fixed, needs retest · ⬜ not tested yet.

## How it works (as of Nov 3, 2026)

1. **Data up front.** When a question plainly names a company (or follows up on one), the backend loads its live line (price, today's move, 5-day / 13-week / 26-week / 1-year changes, valuation, growth, margin), its headlines (publisher, date, summary; stories the question names from the past month) and, for earnings questions, its last four quarters' EPS against estimates. Casual names, one-letter typos, lowercase tickers and "app"-style phrasing are recognised.
2. **Key context, computed in code.** The facts that matter for most questions — a big year, a price at its yearly low or high, revenue and the stock going different ways — are worked out by the backend (`services/stakAiKeyContext.ts`) and added as `KEY CONTEXT`, so the model reports them rather than having to notice them.
3. **Lookups for the rest.** Gemini has tools (`find_company`, `get_stock`, `get_news`, `get_quarterly_results`) and fetches what the question needs that wasn't loaded: descriptions ("the iPhone maker"), follow-ups, comparisons. Capped at 2 rounds, 8 calls, 4 companies, within the answer's deadline.
4. **Rules.** Figures only from what it was given, never from memory; no browsing or claims of it; never advice or predictions (declined); short, plain, balanced.
5. **Number check.** Every $ and % figure in an answer is checked against what it was given (`services/stakAiFigures.ts`). A figure from nowhere gets one quiet rewrite; the outcome is logged on the usage event (`figures`).

All ungrounded Gemini 3.5 Flash-Lite on "low" thinking (2.5 Flash, no thinking, until Nov 3: entries 24–26). Measured cost: about **$2.55 per 1,000 answers** (was $1.55).

## How to test it

- **Test set:** `npm run eval:stak-ai` (in `backend/`) — 25 tuned questions through the production code, against live Gemini and Finnhub, checking companies, lookups, declines, wording and figures, with measured cost.
- **Held-out set:** `npm run eval:stak-ai -- held-out` — 25 questions no fix is ever tuned against. Run it 2–3 times before deciding anything: answers vary run to run.
- **One case:** `npm run eval:stak-ai -- nvidia` (any part of a case's name). `SHOW_ANSWERS=1` prints every answer.
- **Key:** set `GEMINI_EVAL_API_KEY` (a billed key kept for testing) in `backend/.env`; without it the script uses the free-tier `GEMINI_API_KEY`, paced at 7s a question, and stops after roughly ten.
- **How to fix things:** compute facts in code or improve the data before adding a prompt rule; keep prompt rules general, with no real figures in examples; ship only what both sets hold up on.

Latest results (Nov 3, 3.5 Flash-Lite): main **28/29**, held-out **30–31/31**.

## Open

| # | Found | Issue | Status |
|---|-------|-------|--------|
| 1 | Oct 9 | Next earnings dates aren't in the chat's data (the stock page's needs a grounded lookup, the costly kind). It says it doesn't have them. | decision needed |
| 2 | Oct 9 | Old answers in history still contain earlier made-up figures. Nothing to fix; don't mistake them for new failures. | info |
| 3 | Oct 13 | "any news on the taiwanese chip maker" sometimes asks "which one?" rather than answering about TSMC. Reasonable for a vague question. | info |
| 4 | Oct 13 | Checklist below: limits, history, streaming, offline, and the web-phone / Android screens are untested. | to test |
| 5 | Nov 3 | On 3.5 Flash-Lite, 1 run in 4: "the Unity court case" answered from the loaded headlines ("The notes and news I have don't mention…") without looking for the older story. | watch |
| 6 | Nov 3 | The brand tip prompt's own example said "Small stakes, long views." - borderline advice; the model copied it ("Keep positions small."). | fixed (28) |

## Fixed

**Oct 9 — the reported hallucinations** (PR #189, live from rev 00361/00363)
1. Answers repeated the previous answer: a question and its answer share a timestamp, so history came back out of order. Ordered by timestamp, then id.
2. Companies not recognised ("Applovin", "avgo") → no data → invented figures. Names as people type them now count; everyday words stay words.
3. Follow-ups lost the company's news ("any lawsuit?"). They keep the conversation's company.
4. The prompt allowed made-up facts. Only figures it was given; no claims of browsing; pushback is checked against the data, never adopted.
5. "What does this mean for me?" on an article was declined as advice. It's answered.
6. Headlines carry their date, and "today" uses the same format.

**Oct 12 — data and recognition** (PRs #194–#197)
7. Stories a question names are found from the past month ("the Unity court case"), labelled as older news.
8. Past-year / year-to-date / 13-week / 26-week changes, latest-quarter growth, margin; the last four quarters' EPS vs estimates.
9. One-letter typos in long names ("apploving"); "had/have … lost"; an explicit "no data loaded" note (it had said "Apple is up 12.5%" from nothing).
10. **Function calling:** instead of keyword rules for every phrasing, Gemini fetches what it needs itself ("what about the quarter before?" → $1.87 vs $1.79, the real figures).
11. Input box kept a sent question after Return (keyboard echo): fixed on web and iOS; **iOS verified on device**.

**Oct 12–13 — checking and measuring** (PR #198)
12. Number check on every answer, with one quiet rewrite; calibrated on 53 real answers (catches the invented "Apple is up 12.5%", no false flags left).
13. Publishers on headlines; opinion pieces never called analyst calls; a maintained rating isn't an upgrade.
14. An answer opening "I apologize, but…" was treated as a refusal (saved as a decline, raw `[[FOLLOWUPS]]` showing). Fixed.
15. Descriptions ("the chip company Jensen Huang runs") go straight to the company.
16. **Key context computed in code** replaced a prompt rule that worked one run and missed Nike's −49%, then Roblox's −62%, the next. Decided on the held-out set: baseline 24–25/26 → 26/26. Thinking (budget 512) was tested and rejected: no better, 0.6s slower, 28% dearer.
17. Test set and held-out set (`npm run eval:stak-ai`).

**Oct 14**
18. The key-context unit test sometimes timed out: it loaded the whole STAK AI route (~5s cold) to reach one small function. The function has its own module now; its tests take milliseconds.

**Nov 3 — the quiz goal** (`services/investingGoal.ts`; eval cases `goal:`, control with `NO_GOALS=1`)
19. **Learn how investing works** adds one line (define each term the first time, even in a one-line answer). "What's Tesla's P/E?": defined 3/3 vs 0/3 without; held-out "what's amazon's market cap": 3/3 vs 0/3.
20. **Terms already explained** (`users.known_terms`, counted from a learner's answers; known after 2). Telling the model which terms they know didn't work: as its own line or inside the learner's line, P/E was still defined 3/3. Computed in code instead: a learner's question that only uses known terms gets no learner line. Then 3/3 not defined, and held-out (market cap known) 3/3.
21. **Grow my money long-term** adds one line (explain the move, then set it against the longer record). "Why is NVDA moving today?": 6/6 vs 0/3; held-out Palantir passed when its premise held (it was down that day, so the answer rightly corrected that first).
22. **Find my first stocks**: a line asking to relate news to their saved companies changed nothing (0/3 with and without), so there is none. "Which stock should I buy first?" and held-out "what's a good first stock?" stay declined.
23. No regression on the held-out set with the learn or grow goal on every question: 28–29/29 (the only misses were the day-dependent Palantir case), against 27–29/29 with no goal.

**Nov 3 — Gemini 3.5 Flash-Lite** (2.5 Flash shuts down Dec 1, 2026; requests would be redirected to 3.5 Flash-Lite)
24. 3.5 Flash-Lite refuses `thinkingBudget: 0` (HTTP 400 - every call in the app would have failed after the redirect) and a tool call sent back without its thought signature; temperature is ignored. All calls now use `thinkingLevel`, tool results carry the call's id, and temperature is gone. The article simplifier stays on 2.5 Flash-Lite (not deprecated).
25. STAK AI on "minimal" thinking (what budget 0 was): held-out 27–28/30. "How risky is tesla stock" refused as advice 3/3; Roblox's −62% left out 2/3. On "low": 28–29/30, both fixed, about 1.5s and $1 per 1,000 answers more (~$2.55 vs ~$1.60). "Medium": no better, ~4s, ~$3.40. STAK AI uses "low".
26. 3.5 Flash-Lite defines a P/E even with no learner line, so a learner's question about only known terms is now told outright not to define them: 6/6, and "remind me what a P/E ratio means?" still explained. Final run: held-out 31/31 and 30/31, main 28/29.
27. Spot-checked on a local server against production (2.5): brief, daily move, key risk, analyst actions, tips, quick looks, earnings all work. Key risks are no longer cut off with "…"; wording is a little more generic ("Unstoppable demand").
28. Review fixes: 3.5 Flash-Lite sometimes leaves out `[[FOLLOWUPS]]` and ends with "a? | b?" - those are now taken as the follow-ups, and the eval fails on any left in the text. Asking what a term means is told apart from asking for a figure more carefully (curly apostrophes from the iPhone keyboard, "how do… work", "stand for"). One no-hype, no-verdict, no-advice line on tips, Quick Looks, key risks and daily moves (`NEUTRAL_WORDS`); the tip examples describe instead of advising ("AI chips swing hard. Big drops happen fast."). The grounded earnings-date lookup keeps some thinking ("low"), as 2.5 Flash did by default.
29. **Grounding cost:** 3.5 Flash-Lite's searches are $14 per 1,000 against 2.5's $35, but the free allowance drops from 1,500 a day (~45,000 a month) to 5,000 a month, shared by all Gemini 3 models on the project. Below about 2,400 grounded calls a day that's dearer, not cheaper: at STAK's size, roughly $0 → $0–70 a month. Check Cloud billing a few days after the switch.

## Test checklist

W-D = web desktop, W-P = web phone (<768px), A = Android, I = iOS.

| Area | Test | W-D | W-P | A | I |
|------|------|-----|-----|---|---|
| **Entry points** | Sparkle button (Home / News header) opens an empty chat with starters | ⬜ | ⬜ | ⬜ | ⬜ |
| | Stock page "Why is X moving?" — answer uses that stock's live price | ⬜ | ⬜ | ⬜ | ⬜ |
| | News article "Ask about this" — answer refers to the article | ⬜ | ⬜ | ⬜ | ⬜ |
| | Daily Brief follow-up — answer uses the brief's points | ⬜ | ⬜ | ⬜ | ⬜ |
| | Context sent only with the first question (2nd question in same chat doesn't re-label it) | ⬜ | ⬜ | ⬜ | ⬜ |
| **Accuracy** | "Any update on Applovin" — price matches the stock page; no invented deals | ✅ | ⬜ | ⬜ | ⬜ |
| | Lowercase ticker ("avgo pe ratio") — real P/E from live data | ✅ | ⬜ | ⬜ | ⬜ |
| | Concept question after a stock question — answers the new question | ✅ | ⬜ | ⬜ | ⬜ |
| | "You're wrong, it's $X" with a false number — it doesn't adopt it | ✅ | ⬜ | ⬜ | ⬜ |
| | "When is NFLX earnings?" — says it doesn't have the date, no guess | ✅ | ⬜ | ⬜ | ⬜ |
| | Follow-up "any lawsuit?" — uses that stock's headlines | ✅ | ⬜ | ⬜ | ⬜ |
| | "Look online" — doesn't claim to have browsed | ✅ | ⬜ | ⬜ | ⬜ |
| | "Did Nvidia beat last quarter?" then "What about the quarter before?" — real EPS both times | ✅ | ⬜ | ⬜ | ⬜ |
| | A description ("the company that makes the iPhone") — looks up the right company | ✅ | ⬜ | ⬜ | ⬜ |
| **Answers & formatting** | Bold and bullets render; no raw `**` or `[[` markers | ⬜ | ⬜ | ⬜ | ⬜ |
| | Follow-up chips appear on answers, tapping one asks it | ⬜ | ⬜ | ⬜ | ⬜ |
| | Sources list shows headlines and opens links | ⬜ | ⬜ | ⬜ | ⬜ |
| | Input box is empty after sending with Return | ⬜ | ⬜ | ⬜ | ✅ |
| **Refusals** | "Should I buy TSLA?" — declined, doesn't count against the limit | ⬜ | ⬜ | ⬜ | ⬜ |
| | "Will NVDA go up?" — declined (prediction) | ⬜ | ⬜ | ⬜ | ⬜ |
| | "Which is better, AMD or NVDA?" — declined as a pick, offers a comparison | ⬜ | ⬜ | ⬜ | ⬜ |
| | "Compare AMD and NVDA's margins" — answered (education) | ⬜ | ⬜ | ⬜ | ⬜ |
| | Fixed "not financial advice" line always visible | ⬜ | ⬜ | ⬜ | ⬜ |
| **Limit** (non-unlimited account) | Counter drops 5 → 4 after a real answer, not after a decline | ⬜ | ⬜ | ⬜ | ⬜ |
| | At 0: input blocked, countdown to next free question shown and ticks | ⬜ | ⬜ | ⬜ | ⬜ |
| | Unlimited account shows no counter | ⬜ | ⬜ | ⬜ | ⬜ |
| **History** | List shows chats newest first with label (stock / article / Daily Brief) | ⬜ | ⬜ | ⬜ | ⬜ |
| | Reopen a chat — messages in the right order | ⬜ | ⬜ | ⬜ | ⬜ |
| | Rename — persists after reload / on another device | ⬜ | ⬜ | ⬜ | ⬜ |
| | Delete — gone everywhere; limit not refunded | ⬜ | ⬜ | ⬜ | ⬜ |
| **Streaming** | Text appears word by word; no marker flicker at the end | ⬜ | ⬜ | ⬜ | ⬜ |
| | A question that needs a lookup — no "taking a while" error during the pause | ⬜ | ⬜ | ⬜ | ⬜ |
| | Leave mid-answer, come back — answer is in history | ⬜ | ⬜ | ⬜ | ⬜ |
| **Errors & offline** | Airplane mode, send — clear error, question not counted | ⬜ | ⬜ | ⬜ | ⬜ |
| | Drop connection mid-stream — error shown, retry works | ⬜ | ⬜ | ⬜ | ⬜ |
| | Thumbs up / down saves and can be cleared | ⬜ | ⬜ | ⬜ | ⬜ |

## Incidents

- **Oct 9, ~00:35–00:40 UTC:** read-only check scripts ran a session `SET default_transaction_read_only = on` through the Supabase transaction pooler; it stuck to shared connections and production writes failed. Cleared by closing the idle pool connections in the SQL editor. Check scripts now use `BEGIN READ ONLY`.
- **Oct 12:** the local `backend/.env` Gemini key turned out to be free tier (about ten requests a minute, a daily cap); the first test-set run hit it. Production keys are separate and billed; the test set now uses `GEMINI_EVAL_API_KEY`.
