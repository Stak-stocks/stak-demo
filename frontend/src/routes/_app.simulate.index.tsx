import { createFileRoute } from "@tanstack/react-router";
import { SimulateHome, type SimulateHomeSearch } from "@/app/simulate/SimulateHome";

export const Route = createFileRoute("/_app/simulate/")({
	validateSearch: (s: Record<string, unknown>): SimulateHomeSearch => ({
		variant: s.variant === "alt" ? "alt" : undefined,
		modal: s.modal === "add-confirm" || s.modal === "add-success" ? s.modal : undefined,
		symbol: typeof s.symbol === "string" && s.symbol ? s.symbol : undefined,
		amount: typeof s.amount === "number" ? s.amount : typeof s.amount === "string" && s.amount ? Number(s.amount) : undefined,
	}),
	component: () => <SimulateHome search={Route.useSearch()} />,
});
