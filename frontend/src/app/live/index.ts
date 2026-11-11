/**
 * The live layer: catalog + quotes + account/guest state + derived decks, notifications and taste.
 * Screens import from here; nothing in here knows about frames or pixels.
 * The FOUNDATION modules (2026-11-07, .claude/tools/make-it-real-2026-11-06/FOUNDATION-API.md): history (price
 * history for any symbol and range), portfolioHistory (the account's value over a range), rank (one board, one rank),
 * ledger (the persona's off-book picks that keep the frames' ledger continuous).
 */
export * from "./catalog";
export * from "./clock";
export * from "./deck";
export * from "./format";
export type { DeckProgress, Lot, Position, Preferences, SaveEntry, SoldEntry } from "./guest";
export * from "./history";
export * from "./ledger";
export * from "./notifications";
export * from "./orders";
export * from "./portfolio";
export * from "./portfolioHistory";
export * from "./prices";
export * from "./quotes";
export * from "./rank";
export * from "./showcase";
export * from "./store";
export * from "./taste";
