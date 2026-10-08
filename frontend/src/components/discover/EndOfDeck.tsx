import { countWord } from "@/lib/simFormat";
import { sheetCard } from "@/components/phone/phone";
import { DISC, cu, nextDeckNote } from "./discoverTheme";

function Tile({ label, value }: { label: string; value: number }) {
	return (
		<div style={{ width: cu(110), ...sheetCard(12), padding: `${cu(14)} ${cu(10)}`, display: "flex", flexDirection: "column", alignItems: "center", gap: cu(4) }}>
			<span style={{ font: `400 ${cu(10)} var(--font-body)`, color: DISC.muted }}>{label}</span>
			<span style={{ font: `600 ${cu(20)} var(--font-heading)`, color: "#fff" }}>{value}</span>
		</div>
	);
}

/** Android's "Deck complete" receipt: how many cards were seen, saved and passed, and where the saves went. */
export function EndOfDeck({ seen, saved, passed, onReview }: { seen: number; saved: number; passed: number; onReview: () => void }) {
	const word = countWord(seen).toLowerCase();
	const subtitle = seen === 0
		? "No new stocks to show today."
		: `${word.charAt(0).toUpperCase()}${word.slice(1)} ${seen === 1 ? "card" : "cards"}, ${word} ${seen === 1 ? "signal" : "signals"}. Your taste graph got smarter.`;
	return (
		<section aria-label="Deck complete" className="flex flex-col items-center text-center" style={{ padding: `${cu(34)} ${cu(20)} ${cu(24)}` }}>
			<h2 style={{ font: `600 ${cu(22)}/${cu(28)} var(--font-heading)`, color: DISC.ink }}>Deck complete</h2>
			<p style={{ marginTop: cu(8), font: `400 ${cu(12)}/${cu(16)} var(--font-body)`, color: DISC.muted }}>{subtitle}</p>
			<div className="flex justify-center" style={{ marginTop: cu(32), gap: cu(10) }}>
				<Tile label="Seen" value={seen} />
				<Tile label="Saved" value={saved} />
				<Tile label="Passed" value={passed} />
			</div>
			<button
				type="button"
				onClick={onReview}
				className="w-full transition-opacity hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
				style={{ marginTop: cu(52), height: cu(52), borderRadius: cu(6), border: `${cu(0.36)} solid rgba(52,59,79,0.33)`, font: `400 ${cu(13)} var(--font-heading)`, color: DISC.muted, outlineColor: DISC.teal }}
			>
				Review saves in My STAK
			</button>
			<p style={{ marginTop: cu(14), font: `400 ${cu(10)} var(--font-body)`, color: DISC.muted }}>{nextDeckNote()}</p>
		</section>
	);
}
