import { createFileRoute } from "@tanstack/react-router";
import { Portfolio, type PortfolioSearch } from "@/app/simulate/Portfolio";

export const Route = createFileRoute("/_app/simulate/portfolio")({
	validateSearch: (s: Record<string, unknown>): PortfolioSearch => ({
		variant: s.variant === "alt" ? "alt" : undefined,
		modal: s.modal === "sell-confirm" ? "sell-confirm" : undefined,
		symbol: typeof s.symbol === "string" && s.symbol ? s.symbol : undefined,
	}),
	component: () => <Portfolio search={Route.useSearch()} />,
});
