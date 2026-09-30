/** Free-choice sandbox setup options -- single source of truth for backend validation
 *  and web, mirroring Android's SETUP_BALANCES / SetupStrategy list
 *  (android/.../ui/simulate/PortfolioSetupCard.kt). Keep both lists in sync by hand;
 *  Kotlin can't import this file. */
export const SANDBOX_STARTING_BALANCES = [1000, 10000, 100000] as const;
export type SandboxStartingBalance = (typeof SANDBOX_STARTING_BALANCES)[number];

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
