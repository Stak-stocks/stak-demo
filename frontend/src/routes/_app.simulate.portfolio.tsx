import { createFileRoute } from "@tanstack/react-router";
import { Portfolio, type PortfolioSearch } from "@/app/simulate/Portfolio";

export const Route = createFileRoute("/_app/simulate/portfolio")({
	validateSearch: (s: Record<string, unknown>): PortfolioSearch => ({
		variant: s.variant === "alt" ? "alt" : undefined,
		modal: s.modal === "sell-confirm" || s.modal === "sell-failed" ? s.modal : undefined,
		symbol: typeof s.symbol === "string" && s.symbol ? s.symbol : undefined,
		// the share of the position the Sell sheet had chosen: Try again after a failed sale reopens it there
		portion: typeof s.portion === "number" ? s.portion : typeof s.portion === "string" && s.portion ? Number(s.portion) : undefined,
	}),
	component: () => <Portfolio search={Route.useSearch()} />,
});
