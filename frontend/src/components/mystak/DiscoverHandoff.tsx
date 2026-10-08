import { DISC, cu } from "@/components/discover/discoverTheme";
import { PRESS, f, focusRing } from "@/components/phone/phone";

function cardsLeftCopy(cardsLeft: number | null): string {
	if (cardsLeft == null) return "Based on your taste, fresh picks are waiting in the deck.";
	if (cardsLeft === 0) return "You've been through today's deck.";
	if (cardsLeft === 1) return "Based on your taste, 1 fresh pick is waiting in the deck.";
	return `Based on your taste, ${cardsLeft} fresh picks are waiting in the deck.`;
}

/** The way back into Discover: solid teal card, dark ink. Android's MyStakScreen DiscoverHandoff. */
export function DiscoverHandoff({ cardsLeft, onStartSwiping }: { cardsLeft: number | null; onStartSwiping: () => void }) {
	return (
		<button
			type="button"
			onClick={onStartSwiping}
			className={`flex w-full flex-col text-left ${PRESS}`}
			style={{ gap: cu(12), borderRadius: cu(16), background: DISC.teal, padding: `${cu(22)} ${cu(20)}`, color: DISC.pageBg, ...focusRing }}
		>
			<span style={{ font: f(500, 11, 14), letterSpacing: cu(0.9) }}>DISCOVER</span>
			<span style={{ font: f(600, 22, 28, "heading") }}>More like your STAK</span>
			<span style={{ font: f(400, 15, 24) }}>{cardsLeftCopy(cardsLeft)}</span>
			<span style={{ font: f(500, 15, 20), opacity: 0.72 }}>Start swiping ›</span>
		</button>
	);
}
