import { DonutRing } from "@/components/DonutRing";
import { DISC, cu } from "@/components/discover/discoverTheme";
import { PRESS, cardStyle, f, focusRing } from "@/components/phone/phone";
import { useFigmaUnit } from "@/components/discover/useFigmaUnit";
import { summaryOf, subtitleOf, ctaLabelOf, isEmptyGraph, themeColor, type Graph } from "@/lib/tasteGraph";
import { FailedCard } from "./FailedCard";

/** Android's ic_gist_sparkle: the star that marks anything the app worked out for you. */
export function Sparkle({ size }: { size: number }) {
	return <img src="/app/ic_gist_sparkle.png" alt="" draggable={false} style={{ width: cu(size), height: cu(size) }} />;
}

/** Your Investing Taste: the mix of what draws attention, as a share of interest signals - never money.
 *  Android's TasteCard: a 92u donut with a 28u stroke, 5 degree gaps and a "Taste mix" centre label. */
export function TasteCard({ taste, failed, onOpen, onRetry }: {
	taste: Graph | null;
	failed: boolean;
	onOpen: () => void;
	onRetry: () => void;
}) {
	const unit = useFigmaUnit();
	if (!taste) {
		if (failed) return <FailedCard title="Your Taste is unavailable" body="We couldn't load your interests. Try again later." onRetry={onRetry} />;
		// Still loading: no card rather than an empty ring.
		return null;
	}

	const empty = isEmptyGraph(taste);
	const showOther = taste.otherShare > 0.01;
	const shares = empty ? [] : [...taste.themes.map((t) => t.share), ...(showOther ? [taste.otherShare] : [])];
	const colors = empty ? [] : [...taste.themes.map((t) => themeColor(t.colorKey)), ...(showOther ? [DISC.faint] : [])];

	return (
		<button type="button" onClick={onOpen} className={`w-full text-left ${PRESS}`} style={{ ...cardStyle(12), ...focusRing }}>
			<div className="flex items-center" style={{ gap: cu(8) }}>
				<Sparkle size={20} />
				<p style={{ font: f(600, 15, 19, "heading"), color: "#fff" }}>Your Investing Taste</p>
				<span className="ml-auto" style={{ font: f(400, 16), color: DISC.faint }} aria-hidden="true">›</span>
			</div>
			<div className="flex items-center" style={{ gap: cu(16) }}>
				<div className="relative grid shrink-0 place-items-center" style={{ width: cu(92), height: cu(92) }}>
					{empty ? (
						<div className="rounded-full" style={{ width: cu(92), height: cu(92), background: "#212A3D" }} />
					) : (
						<DonutRing shares={shares} colors={colors} size={92 * unit} strokeWidth={28 * unit} gapDegrees={5} />
					)}
					<span className="absolute text-center" style={{ font: f(500, 10, 13), color: DISC.muted }}>Taste<br />mix</span>
				</div>
				<div className="flex min-w-0 flex-1 flex-col" style={{ gap: cu(6) }}>
					<p style={{ font: f(600, 14, 19, "heading"), color: "#fff" }}>{summaryOf(taste)}</p>
					<p style={{ font: f(400, 12, 16), color: DISC.body }}>{subtitleOf(taste)}</p>
					<span style={{ font: f(500, 12, 16), color: DISC.teal }}>{ctaLabelOf(taste)} ›</span>
				</div>
			</div>
		</button>
	);
}
