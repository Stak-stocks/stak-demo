import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import { QuizStepShell } from "@/components/onboarding/QuizStepShell";
import stakMark from "@/assets/stak-logo-icon.svg";
import { DISC, cu, sessionWord } from "@/components/discover/discoverTheme";
import { PRESS, f } from "@/components/phone/phone";
import { useFigmaUnit } from "@/components/discover/useFigmaUnit";

export const Route = createFileRoute("/onboarding_/swipe-tutorial")({
	component: SwipeTutorialPage,
});

/** The tutorial deck is drawn at 305.75/350 of the Discover card's size (Android's `u2`). */
const K = 305.75 / 350;
const s = (n: number) => cu(n * K);
const COMMIT = 110;

interface Card { ticker: string; headline: string; price: string; change: string; tip: string; top: string; artBg: string; art: string }
const DECK: Card[] = [
	{ ticker: "NVDA · NVIDIA Corp", headline: "Chip demand is outrunning supply, and NVIDIA sets the prices.", price: "$122.10", change: "▲ 2.4%", tip: "Chip stocks swing hard. Small stakes, long views.", top: "#152A47", artBg: "#142844", art: "nvda" },
	{ ticker: "AAPL · Apple Inc", headline: "Two billion devices, and every one of them keeps paying Apple.", price: "$229.35", change: "▲ 1.2%", tip: "Steady giants move slower. Stable stocks often do.", top: "#283E5D", artBg: "#253A59", art: "aapl" },
	{ ticker: "GOOGL · Alphabet Inc", headline: "Search pays for everything, and nine billion-user products ride behind it.", price: "$178.90", change: "▲ 0.8%", tip: "Ad money tracks the economy. Some quarters drift.", top: "#263D5D", artBg: "#2F486E", art: "googl" },
];

function TutorialCard({ card }: { card: Card }) {
	return (
		<div className="flex flex-col items-center" style={{ width: s(350), borderRadius: s(22), padding: `${s(4)} 0`, gap: s(25), background: `linear-gradient(to bottom, ${card.top} 0%, #0C1526 90%, rgba(12,21,38,0) 100%)`, boxShadow: `0 0 ${s(6)} rgba(6,11,22,0.5)` }}>
			<div className="overflow-hidden" style={{ width: s(340), height: s(229), borderRadius: s(18), background: card.artBg }}>
				<img src={`/app/disc_card_${card.art}.webp`} alt="" draggable={false} className="h-full w-full select-none object-cover" />
			</div>
			<div className="flex w-full flex-col" style={{ padding: `0 ${s(18)} ${s(16)}`, gap: s(19) }}>
				<div>
					<p style={{ font: `400 ${s(10)}/${s(13)} var(--font-body)`, color: DISC.muted }}>{card.ticker}</p>
					<p style={{ marginTop: s(8), font: `400 ${s(16)}/${s(23)} var(--font-body)`, color: "#fff" }}>{card.headline}</p>
				</div>
				<div className="flex items-end" style={{ gap: s(9) }}>
					<span style={{ font: `600 ${s(20)}/${s(25)} var(--font-heading)`, color: "#fff" }}>{card.price}</span>
					<span style={{ paddingBottom: s(2), font: `500 ${s(11)}/${s(14)} var(--font-body)`, color: DISC.green }}>{card.change} {sessionWord()}</span>
				</div>
				<div className="flex items-center" style={{ background: "rgba(105,179,202,0.10)", borderRadius: s(10), padding: `${s(9)} ${s(12)}`, gap: s(8) }}>
					<span style={{ font: `500 ${s(10)}/${s(15)} var(--font-body)`, letterSpacing: s(0.9), color: DISC.teal }}>TIP</span>
					<span style={{ font: `400 ${s(11)}/${s(15)} var(--font-body)`, color: DISC.body }}>{card.tip}</span>
				</div>
			</div>
		</div>
	);
}

const mix = (from: string, to: string, t: number) => {
	const a = [1, 3, 5].map((i) => parseInt(from.slice(i, i + 2), 16));
	const b = [1, 3, 5].map((i) => parseInt(to.slice(i, i + 2), 16));
	return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(",")})`;
};

interface Ghost { key: number; card: Card; fromX: number; toX: number }

function FlyingGhost({ ghost, onDone }: { ghost: Ghost; onDone: (key: number) => void }) {
	const ref = useRef<HTMLDivElement>(null);
	useEffect(() => {
		const el = ref.current;
		if (!el || typeof el.animate !== "function") { onDone(ghost.key); return; }
		const anim = el.animate(
			[{ transform: `translateX(${ghost.fromX}px)`, opacity: 1, offset: 0 }, { opacity: 1, offset: 200 / 380 }, { transform: `translateX(${ghost.toX}px)`, opacity: 0, offset: 1 }],
			{ duration: 380, easing: "cubic-bezier(0,0,0.58,1)", fill: "forwards" },
		);
		anim.onfinish = () => onDone(ghost.key);
		return () => anim.cancel();
	}, [ghost, onDone]);
	return <div ref={ref} className="pointer-events-none absolute inset-x-0 flex justify-center" style={{ top: cu(47.5), zIndex: 2 }} aria-hidden="true"><TutorialCard card={ghost.card} /></div>;
}

/**
 * Android's swipe tutorial: a real deck of three sample cards you can drag, or use the Pass / STAK buttons on.
 * Purely illustrative: nothing is saved and Continue is always available.
 */
function SwipeTutorialPage() {
	const navigate = useNavigate();
	const unit = useFigmaUnit();
	const [swiped, setSwiped] = useState(0);
	const [drag, setDrag] = useState(0);
	const [returning, setReturning] = useState(false);
	const [ghosts, setGhosts] = useState<Ghost[]>([]);
	const start = useRef<{ id: number; x: number } | null>(null);
	const key = useRef(0);
	const commitPx = COMMIT * unit * K;
	const ratio = Math.max(-1, Math.min(1, drag / commitPx));

	const advance = useCallback((dir: 1 | -1, fromX: number) => {
		const card = DECK[swiped % DECK.length];
		setGhosts((g) => [...g, { key: ++key.current, card, fromX, toX: dir * 1.6 * 306 * unit }]);
		setSwiped((n) => n + 1);
		start.current = null;
		setReturning(false);
		setDrag(0);
	}, [swiped, unit]);
	const removeGhost = useCallback((k: number) => setGhosts((g) => g.filter((x) => x.key !== k)), []);

	const down = (e: PointerEvent<HTMLDivElement>) => { if (start.current) return; start.current = { id: e.pointerId, x: e.clientX }; setReturning(false); e.currentTarget.setPointerCapture?.(e.pointerId); };
	const move = (e: PointerEvent<HTMLDivElement>) => { if (start.current?.id === e.pointerId) setDrag(e.clientX - start.current.x); };
	const up = (e: PointerEvent<HTMLDivElement>) => {
		if (start.current?.id !== e.pointerId) return;
		const dx = e.clientX - start.current.x;
		if (Math.abs(dx) > commitPx) advance(dx > 0 ? 1 : -1, dx);
		else { start.current = null; setReturning(true); setDrag(0); }
	};

	const back = () => navigate({ to: "/onboarding/brand-picks" });
	const passBg = mix("#1C202E", "#FFFFFF", Math.max(0, -ratio));
	const passInk = mix("#B0B8CC", "#1C202E", Math.max(0, -ratio));
	const stakBg = mix("#1C202E", "#69B3CA", Math.max(0, ratio));

	return (
		<QuizStepShell
			stepLabel="STEP 3 OF 6"
			title="Now try a few swipes."
			subtitle="Swipe right to STAK, left to pass."
			onBack={back}
			secondary={{ label: "Back", onClick: back }}
			onContinue={() => navigate({ to: "/onboarding/goal" })}
		>
			<div className="flex flex-1 flex-col items-center" style={{ paddingTop: cu(10) }}>
				<div className="relative" style={{ width: cu(306), height: cu(423.07), zIndex: 1 }}>
					<img src="/app/tutorial_card_googl.webp" alt="" draggable={false} className="absolute select-none" style={{ left: cu(33.5), top: 0, width: cu(238.75), height: cu(290.75) }} />
					<img src="/app/tutorial_card_aapl.webp" alt="" draggable={false} className="absolute select-none" style={{ left: cu(15.5), top: cu(21), width: cu(273.5), height: cu(309.5) }} />
					<div
						className="absolute inset-x-0 flex cursor-grab justify-center select-none active:cursor-grabbing"
						style={{ top: cu(47.5), touchAction: "pan-y" }}
						role="group"
						aria-label={`${DECK[swiped % DECK.length].ticker}. Drag right to STAK, left to pass.`}
					>
						<div
							onPointerDown={down}
							onPointerMove={move}
							onPointerUp={up}
							onPointerCancel={() => { start.current = null; setReturning(true); setDrag(0); }}
							style={{ transform: `translateX(${drag}px) rotate(${(drag / commitPx) * 8}deg)`, transition: returning ? "transform 260ms cubic-bezier(0,0,0.58,1)" : "none" }}
						>
							<TutorialCard card={DECK[swiped % DECK.length]} />
						</div>
					</div>
					{ghosts.map((g) => <FlyingGhost key={g.key} ghost={g} onDone={removeGhost} />)}
				</div>

				<div style={{ height: cu(16) }} />
				<div className="flex justify-center" style={{ gap: s(48), zIndex: 2, position: "relative" }}>
					<div className="flex flex-col items-center" style={{ gap: s(6) }}>
						<button type="button" onClick={() => advance(-1, 0)} aria-label="Pass" className={`grid place-items-center rounded-full ${PRESS}`} style={{ width: s(56), height: s(56), background: passBg }}>
							<svg viewBox="0 0 20 20" style={{ width: s(20), height: s(20) }} fill="none" aria-hidden="true"><path d="M2 2 L18 18 M18 2 L2 18" stroke={passInk} strokeWidth="2.4" strokeLinecap="round" /></svg>
						</button>
						<span style={{ font: `400 ${s(12)} var(--font-body)`, color: "#ACAFB1" }}>Pass</span>
					</div>
					<div className="flex flex-col items-center" style={{ gap: s(6) }}>
						<button type="button" onClick={() => advance(1, 0)} aria-label="STAK" className={`grid place-items-center rounded-full ${PRESS}`} style={{ width: s(56), height: s(56), background: stakBg }}>
							<img src={stakMark} alt="" style={{ width: s(28), height: s(28) }} draggable={false} />
						</button>
						<span style={{ font: `400 ${s(12)} var(--font-body)`, color: "#ACAFB1" }}>STAK</span>
					</div>
				</div>
			</div>
		</QuizStepShell>
	);
}
