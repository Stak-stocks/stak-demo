/**
 * One display name per company on Discover and the stock pages (coordinator ruling N30.8f; the hunt's C-10: the stock
 * page read "GOOGL · Google" where the deck card and My STAK say Alphabet, and "AMD · AMD"; NVIDIA was written four ways
 * between a card, its ticket and its receipt). Past the showcase every name on these pages comes from here: the deck
 * card's ticker line, the stock page's header, the Practice buy ticket, Order filled and the failed-order sheet. The
 * frames' own strings ("NVDA · NVIDIA Corp", "NVIDIA Corp." in the ticket 2:3239, "Apple Inc") stay verbatim while the
 * page is the design itself (the untouched showcase, a frame preview): the callers' rule.
 *
 * The name is the catalog's (live/catalog.ts `companyName`, the one source the ruling names). Since 2026-11-09 19:18
 * the catalog itself answers "Alphabet" for GOOGL / GOOG (its entry says "Google", the best-known brand) and "Advanced
 * Micro Devices" for AMD (its entry repeats the ticker), and its `tickerLine` prints a ticker once where the name IS the
 * ticker (follow-up F3, FOUNDATION-LEDGER): the table this file carried for those two companies is gone, and the three
 * helpers are plain pass-throughs, kept so these pages name one place for their names.
 */
import { companyInitial, companyName, tickerLine } from "@/app/live";

/** The company's name as these pages print it: "NVIDIA", "Alphabet", "Advanced Micro Devices". */
export const displayName = (ticker: string): string => companyName(ticker);

/** "NVDA · NVIDIA": the ticker line of a deck card and of the stock page's header; the ticker alone when no name is known. */
export const displayTickerLine = (ticker: string): string => tickerLine(ticker);

/** The letter on the company's coin in a ticket or a receipt (the catalog's rule, live/catalog.ts). */
export const displayInitial = (ticker: string): string => companyInitial(ticker);
