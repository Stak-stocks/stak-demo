/** The sandbox setup options -- single source of truth for backend validation and web,
 *  mirrored by hand in Android's SETUP_BALANCES (ui/simulate/PortfolioSetupCard.kt) and
 *  iOS's setupBalances (Simulate/PortfolioSetupCard.swift); Kotlin and Swift can't import this.
 *  One money system (2026-10-07): every portfolio starts on the amount its owner picks,
 *  framed as what they'd really invest - realistic amounts, no XP cash top-ups. */
export const SANDBOX_STARTING_BALANCES = [500, 1000, 5000, 10000] as const;
export type SandboxStartingBalance = (typeof SANDBOX_STARTING_BALANCES)[number];
/** The amount the setup form starts on, a portfolio set up for the user (a trade before the form)
 *  starts with, and a reset falls back to. Mirrored by hand in Android and iOS like the list. */
export const SANDBOX_DEFAULT_STARTING_BALANCE: SandboxStartingBalance = 1000;

export const SANDBOX_STRATEGIES = [
	{ id: "cautious", label: "Cautious", description: "Small stakes, steady names. Aim to beat a savings account." },
	{ id: "balanced", label: "Balanced", description: "A mix of steady and growth picks. The default most people start on." },
	{ id: "bold", label: "Bold", description: "Bigger swings on high-growth picks. Expect bumps." },
] as const;
export type SandboxStrategy = (typeof SANDBOX_STRATEGIES)[number]["id"];

export const SANDBOX_MAX_OPEN_ORDERS = 20;

/** The smallest paper position: shares are kept to 3 decimals, so anything less rounds to nothing. */
export const SANDBOX_MIN_SHARES = 0.001;
export const SANDBOX_NAME_MAX_LENGTH = 40;
