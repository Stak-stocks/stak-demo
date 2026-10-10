import { memo, useEffect, useRef, useState, type PointerEvent } from "react";
import type { NewsArticle } from "@stak/shared";
import { moodScore, moodStatus } from "@/lib/marketMood";
import { deckStories, type DeckStory } from "@/lib/newsText";
import { cu } from "@/components/discover/discoverTheme";
import { f } from "@/components/phone/phone";
import { useFigmaUnit } from "@/components/discover/useFigmaUnit";

export const HOME = {
	cardBg: "#171D2C",
	teal: "#69B3CA",
	ink: "#0E162B",
	paper: "#F9F9F9",
} as const;

const PIVOT = "27.8686px 26.7203px";
const PIVOT_STYLE = { transformOrigin: PIVOT, transformBox: "view-box" } as const;

/** Android's MarketMoodGauge: green on the left to red on the right, a white needle swept to the mood's score. */
function MarketMoodGauge({ mood, settled }: { mood: string | undefined; settled: boolean }) {
	const score = moodScore(mood);
	const reading = score !== null;
	const angle = reading ? (score / 100) * 180 : 0;
	// The first reading snaps into place; later ones sweep over 900ms.
	const [sweep, setSweep] = useState(false);
	useEffect(() => {
		if (!reading) { setSweep(false); return; }
		const raf = requestAnimationFrame(() => setSweep(true));
		return () => cancelAnimationFrame(raf);
	}, [reading]);

	const arcs = reading ? { opacity: 1 } : settled ? { opacity: 0.35 } : undefined;
	return (
		<svg viewBox="0 0 56.9018 28.8371" style={{ width: cu(56.9018), height: cu(28.8371), flexShrink: 0 }} fill="none" role="img" aria-label={reading ? `Market mood gauge: ${mood}` : "Market mood gauge"}>
			<g
				className={reading || settled ? undefined : "mood-pulse"}
				style={reading || settled ? arcs : { animation: "mood-pulse 800ms cubic-bezier(0.4,0,0.2,1) infinite alternate" }}
			>
				<path d="M3.5563 28.4509A24.8946 24.8946 0 0 1 16.0036 6.8912" stroke="#61A57F" strokeWidth="7.1127" />
				<path d="M16.0036 6.8912A24.8946 24.8946 0 0 1 40.8982 6.8912" stroke="#D8CFCF" strokeWidth="7.1127" />
				<path d="M40.8982 6.8912A24.8946 24.8946 0 0 1 53.3455 28.4509" stroke="#DE4E71" strokeWidth="7.1127" />
			</g>
			{reading && (
				<g className="mood-wobble" style={{ ...PIVOT_STYLE, animation: "mood-wobble 2400ms ease-in-out infinite alternate" }}>
					<g style={{ ...PIVOT_STYLE, transform: `rotate(${26.27 - angle}deg)`, transition: sweep ? "transform 900ms cubic-bezier(0,0,0.58,1)" : "none" }}>
						<polygon points="48.8472,16.37 28.0396,28.2577 26.7526,25.6491" fill="#fff" />
						<circle cx="27.8686" cy="26.7203" r="1.5806" fill="#fff" />
					</g>
				</g>
			)}
		</svg>
	);
}

interface Slot {
	bg: string;
	weight: number;
	size: number;
	gap: number;
	dx: number;
	dy: number;
	rot: number;
	maxUp: number;
}

// Authored poses (HomeScreen.kt): the front card straight, the two behind tilted; dx/dy are from the card's centre.
const SLOTS: Slot[] = [
	{ bg: HOME.paper, weight: 300, size: 12, gap: 12, dx: 6.2, dy: 34.73, rot: 0, maxUp: 0 },
	{ bg: HOME.teal, weight: 400, size: 11.89, gap: 17, dx: 8.33, dy: 139.44, rot: -3.72, maxUp: 80.2 },
	{ bg: HOME.paper, weight: 300, size: 12, gap: 12, dx: -0.02, dy: 214.57, rot: -7.68, maxUp: 155.7 },
];
const DECK_W = 236.86;
const DECK_H = 278.45;

const DeckCard = memo(function DeckCard({ slot, story, drag, dragging }: { slot: Slot; story: DeckStory; drag: number; dragging: boolean }) {
	return (
		<div
			className="absolute overflow-hidden"
			style={{
				left: "50%", top: "50%", width: cu(DECK_W), height: cu(DECK_H), borderRadius: cu(6.79), background: slot.bg,
				padding: `${cu(23.77)} 0 0 ${cu(14.43)}`, display: "flex", flexDirection: "column", gap: cu(slot.gap),
				// Centre it, move it to its pose, then tilt it about its own centre; a dragged card also rides up by `drag`.
				transform: `translate(-50%, -50%) translate(${cu(slot.dx)}, calc(${cu(slot.dy)} + ${drag}px)) rotate(${slot.rot}deg)`,
				transition: dragging ? "none" : "transform 300ms cubic-bezier(0,0,0.58,1)",
				zIndex: drag !== 0 ? 1 : 0,
			}}
		>
			{story.loading ? (
				<>
					{[[170, 14], [120, 14], [180, 10]].map(([w, h], i) => (
						<div key={i} className="bar-pulse-deck" style={{ width: cu(w), height: cu(h), borderRadius: cu(4), background: HOME.ink, animation: "bar-pulse-deck 800ms cubic-bezier(0.4,0,0.2,1) infinite alternate" }} />
					))}
				</>
			) : (
				<>
					<p style={{ width: cu(202.9), font: `500 ${cu(16)}/${cu(20)} var(--font-heading)`, color: HOME.ink }}>{story.title}</p>
					<p style={{ width: cu(189.31), font: `${slot.weight} ${cu(slot.size)}/${cu(slot.size * 1.3)} var(--font-body)`, color: HOME.ink }}>{story.body}</p>
				</>
			)}
		</div>
	);
});

/** Android's Market Mood card: the mood and its gauge over a cascade of three news cards you can drag up. */
export function MarketMoodCard({ mood, briefState, news, newsFailed, onOpen }: {
	mood: string | undefined;
	briefState: "loading" | "settled";
	news: NewsArticle[] | undefined;
	newsFailed: boolean;
	onOpen: () => void;
}) {
	const unit = useFigmaUnit();
	const stories = deckStories(news, newsFailed);
	const status = moodStatus(mood, briefState);
	const [drags, setDrags] = useState([0, 0, 0]);
	const [active, setActive] = useState(-1);
	const gesture = useRef<{ i: number; startY: number; startDrag: number; moved: boolean } | null>(null);
	const suppressClick = useRef(false);

	// The deck picks the card under the pointer itself (topmost first) with a rotation-aware test, because a
	// tilted card's box is not where it looks. Touch keeps scrolling the page instead of dragging a card.
	const onDown = (e: PointerEvent<HTMLDivElement>) => {
		if (e.pointerType === "touch" || e.button !== 0) return;
		const rect = e.currentTarget.getBoundingClientRect();
		const px = e.clientX - rect.left;
		const py = e.clientY - rect.top;
		for (let i = SLOTS.length - 1; i >= 0; i--) {
			const s = SLOTS[i];
			const cx = rect.width / 2 + s.dx * unit;
			const cy = rect.height / 2 + s.dy * unit + drags[i];
			const rad = (-s.rot * Math.PI) / 180;
			const dx = px - cx;
			const dy = py - cy;
			const lx = dx * Math.cos(rad) + dy * Math.sin(rad);
			const ly = -dx * Math.sin(rad) + dy * Math.cos(rad);
			if (Math.abs(lx) <= (DECK_W * unit) / 2 && Math.abs(ly) <= (DECK_H * unit) / 2) {
				gesture.current = { i, startY: e.clientY, startDrag: drags[i], moved: false };
				setActive(i);
				e.currentTarget.setPointerCapture(e.pointerId);
				return;
			}
		}
	};
	const onMove = (e: PointerEvent<HTMLDivElement>) => {
		const g = gesture.current;
		if (!g) return;
		const dy = e.clientY - g.startY;
		if (Math.abs(dy) > 4) g.moved = true;
		const next = Math.min(0, Math.max(-SLOTS[g.i].maxUp * unit, g.startDrag + dy));
		setDrags((d) => d.map((v, i) => (i === g.i ? next : v)));
	};
	const onUp = () => {
		const g = gesture.current;
		if (!g) return;
		suppressClick.current = g.moved;
		gesture.current = null;
		setActive(-1);
		setDrags([0, 0, 0]);
	};

	const deck = (interactive: boolean) => (
		<div className="absolute inset-0" aria-hidden={interactive ? undefined : true}>
			{SLOTS.map((slot, i) => <DeckCard key={i} slot={slot} story={stories[i]} drag={drags[i]} dragging={active === i} />)}
		</div>
	);

	return (
		<div
			role="link"
			tabIndex={0}
			aria-label={`Market Mood: ${status.lead}${status.rest}. Open News.`}
			onClick={() => { if (suppressClick.current) { suppressClick.current = false; return; } onOpen(); }}
			onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(); } }}
			className="relative cursor-pointer overflow-hidden transition-opacity active:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
			style={{ height: cu(397), borderRadius: cu(8), background: HOME.cardBg, outlineColor: HOME.teal }}
		>
			<div className="absolute inset-0" style={{ touchAction: "pan-y" }} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
				{deck(true)}
			</div>
			{/* The bottom 30u frosts the stack: the same deck again, blurred, over an opaque ground. */}
			<div className="pointer-events-none absolute inset-x-0 bottom-0 overflow-hidden" style={{ height: cu(30) }} aria-hidden="true">
				<div className="absolute inset-x-0" style={{ top: cu(-367), height: cu(397), background: HOME.cardBg, filter: `blur(${cu(2.6)})` }}>
					{deck(false)}
				</div>
			</div>
			<div className="pointer-events-none absolute inset-x-0 flex items-center justify-center" style={{ top: cu(25), transform: `translateX(${cu(0.45)})` }}>
				<div style={{ width: cu(180), display: "flex", flexDirection: "column", gap: cu(4) }}>
					<h2 style={{ font: f(500, 20, 25, "heading"), color: "#fff" }}>Market Mood</h2>
					<p style={{ font: f(400, 12, 16), color: "#fff" }}>
						<span style={{ color: HOME.teal }}>{status.lead}</span>{status.rest}
					</p>
				</div>
				<div style={{ width: cu(46) }} />
				<MarketMoodGauge mood={mood} settled={briefState === "settled"} />
			</div>
		</div>
	);
}
