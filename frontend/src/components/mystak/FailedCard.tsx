import { DISC, cu } from "@/components/discover/discoverTheme";
import { PRESS, cardStyle, f, focusRing } from "@/components/phone/phone";

// A read that failed — said plainly, so an empty screen never passes for a
// quiet day. Mirrors Android's MyStakScreen.kt FailedCard composable.
export function FailedCard({ title, body, onRetry }: { title: string; body: string; onRetry?: () => void }) {
	return (
		<div role="alert" style={cardStyle(6)}>
			<p style={{ font: f(600, 15, 19, "heading"), color: "#fff" }}>{title}</p>
			<p style={{ font: f(400, 13, 19), color: DISC.body }}>{body}</p>
			{onRetry && (
				<button type="button" onClick={onRetry} className={`w-fit ${PRESS}`} style={{ marginTop: cu(2), font: f(500, 12, 16), color: DISC.teal, ...focusRing }}>
					Retry ›
				</button>
			)}
		</div>
	);
}
