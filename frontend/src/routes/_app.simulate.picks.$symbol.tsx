import { createFileRoute } from "@tanstack/react-router";
import { PickDetail, type PickDetailSearch } from "@/app/simulate/PickDetail";

export const Route = createFileRoute("/_app/simulate/picks/$symbol")({
	validateSearch: (s: Record<string, unknown>): PickDetailSearch => ({
		modal: s.modal === "sell-confirm" || s.modal === "sell-success" ? s.modal : undefined,
		portion: typeof s.portion === "number" ? s.portion : typeof s.portion === "string" && s.portion ? Number(s.portion) : undefined,
	}),
	component: Page,
});

function Page() {
	const { symbol } = Route.useParams();
	return <PickDetail symbol={symbol} search={Route.useSearch()} />;
}
