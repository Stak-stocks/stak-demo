import { DISC } from "@/components/discover/discoverTheme";
import { PRESS, cardStyle, f, focusRing } from "@/components/phone/phone";

// Nothing saved yet: say what My STAK is for, and open the deck. Mirrors
// Android's MyStakScreen.kt EmptyStak composable.
export function EmptyStak({ onStartSwiping }: { onStartSwiping: () => void }) {
	return (
		<button type="button" onClick={onStartSwiping} className={`w-full text-left ${PRESS}`} style={{ ...cardStyle(8), ...focusRing }}>
			<p style={{ font: f(600, 15, 19, "heading"), color: "#fff" }}>No companies yet</p>
			<p style={{ font: f(400, 13, 19), color: DISC.body }}>
				STAK a company in Discover and it lands here, with what changed since you saved it.
			</p>
			<span style={{ font: f(500, 13, 17), color: DISC.teal }}>Open Discover ›</span>
		</button>
	);
}
