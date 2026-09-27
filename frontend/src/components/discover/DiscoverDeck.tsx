import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ComponentType, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import type { BrandSummary } from "@stak/shared";
import { recordSwipe } from "@/lib/api";
import stakMark from "@/assets/stak-logo-icon.svg";
import { DiscoverCard } from "./DiscoverCard";
import { DiscoverHeader } from "./DiscoverHeader";
import { EndOfDeck } from "./EndOfDeck";
import { UndoToast, InfoToast, type UndoToastState } from "./Toasts";
import { CARD_WIDTH, DEFAULT_DECK_LABEL, DISC, SWIPE_THRESHOLD, UNDO_MS, cu, deckLabelFor } from "./discoverTheme";
import { useFigmaUnit } from "./useFigmaUnit";

const MemoCard = memo(DiscoverCard);

const STAK_FULL_MESSAGE = "Your STAK is full — remove a stock to save another";
/** A press that moves less than this is a tap, not a drag (Compose's touch slop is about 8dp). */
const DRAG_SLOP_PX = 8;

/** A save returns "full" (refused: no slot) or how to take it back; a pass returns how to take it back. */
export type Undo = () => void;

interface DiscoverDeckProps {
	/** The cards still to decide, in deck order (a card decided this session has already left it). */
	brands: BrandSummary[];
	paletteOf: (brand: BrandSummary) => number;
	limit: number;
	/** Swipes the server (or the optimistic bump) has counted today. */
	swipeCount: number;
	stakSize: number;
	initialSaved: number;
	initialPassed: number;
	onSave: (brand: BrandSummary) => "full" | Undo;
	onPass: (brand: BrandSummary) => Undo;
	onLearnMore: (brand: BrandSummary) => void;
	onReview: () => void;
	/** useSwipeLimit's instant local bump and its reconcile against the server's answer. */
	bumpOptimistic: () => void;
	reportSwipeResult: (accepted: boolean, count: number, limit: number) => void;
	/** The card to draw (front, the two behind and the one flying off); Android's phone card by default. */
	Card?: ComponentType<DeckCardProps>;
	/**
	 * Given, the deck draws no header of its own and reports today's `count` instead, for a page that places its own
	 * header (desktop's spans the Quick Look column too). Reported before paint, so there is no flash of a stale count.
	 */
	onProgress?: (count: number, atEnd: boolean) => void;
	/** Pass / STAK button diameter, in figma units (Android: 56). */
	buttonSize?: number;
	/** Pixels per figma unit, when the page sizes the deck itself (desktop fits it to the window); else the phone's. */
	unit?: number;
	/** Android's stack of peeking cards, or desktop's compressed one (with cards gliding into place). */
	stack?: "phone" | "desktop";
	/** Told, before paint, whenever the front card changes (null at the end) and which card is next. */
	onFrontChange?: (front: BrandSummary | null, next: BrandSummary | null) => void;
}

export interface DeckCardProps {
	brand: BrandSummary;
	paletteIndex: number;
	onLearnMore?: (brand: BrandSummary) => void;
	live?: boolean;
}

interface Decision {
	brand: BrandSummary;
	direction: "left" | "right";
	timeOnCardMs: number;
	timer: ReturnType<typeof setTimeout>;
	undo: Undo;
}

interface Ghost {
	key: number;
	brand: BrandSummary;
	palette: number;
	fromX: number;
	toX: number;
	/** Tilt when released (the drag's own tilt; 0 from a button) and where it ends up. */
	fromRot: number;
	toRot: number;
}

/** The decision is sent a moment after the Undo toast starts leaving, so any Undo still on screen can always undo. */
const UNDO_GRACE_MS = 400;

/** How long a swiped card takes to leave: slow enough to watch it go, not so slow the next card waits on it. */
const FLY_MS = 680;

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const prefersReducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

function mix(from: string, to: string, t: number): string {
	const a = [1, 3, 5].map((i) => parseInt(from.slice(i, i + 2), 16));
	const b = [1, 3, 5].map((i) => parseInt(to.slice(i, i + 2), 16));
	return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(",")})`;
}

/** Where the stack's cards sit: the front card's top, and each card behind (top edge, scale, tilt). */
interface StackGeometry {
	/** Room above the stack for a tilted back card's raised corner. */
	headroom: string;
	frontTop: string;
	back: ReadonlyArray<{ top: string; scale: number; rot: number }>;
	sidePad: string;
	/** Between the card and the Pass / STAK buttons. */
	buttonsGap: string;
	/** Cards glide into their new place when the front one leaves. */
	animate: boolean;
}

const STACKS: Record<"phone" | "desktop", StackGeometry> = {
	// Android's: 54.65u of peeks, the two behind scaled 0.82 / 0.72 and tilted -3° / 5°.
	phone: {
		headroom: cu(14), frontTop: cu(54.65), sidePad: cu(20), buttonsGap: cu(16), animate: false,
		back: [{ top: cu(28), scale: 0.82, rot: -3 }, { top: cu(4), scale: 0.72, rot: 5 }],
	},
	// Desktop: a compressed stack - 22px of each card behind shows above the next, with a lighter tilt.
	desktop: {
		headroom: "10px", frontTop: "44px", sidePad: "0px", buttonsGap: "22px", animate: true,
		back: [{ top: "22px", scale: 0.94, rot: -2 }, { top: "0px", scale: 0.88, rot: 2 }],
	},
};

/**
 * A stack card that glides in from the pose one slot further back when it mounts (the front card leaving moves every
 * card up a slot, and each is keyed by brand, so it mounts in its new slot). Off for reduced motion.
 */
function SlotIn({ from, enabled, children }: { from: string; enabled: boolean; children: ReactNode }) {
	const ref = useRef<HTMLDivElement>(null);
	useLayoutEffect(() => {
		const el = ref.current;
		if (!enabled || !el || prefersReducedMotion() || typeof el.animate !== "function") return;
		const anim = el.animate([{ transform: from, opacity: 0.6 }, { transform: "none", opacity: 1 }], { duration: 260, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" });
		return () => anim.cancel();
	}, [enabled, from]);
	return <div ref={ref} style={{ transformOrigin: "top center" }}>{children}</div>;
}

/** The card that just left: carries on from where it was let go, tilting further as it travels off the side, and
 *  only fades over its last stretch (so it reads as thrown away, not vanishing). */
function FlyingCard({ ghost, onDone, Card, top }: { ghost: Ghost; onDone: (key: number) => void; Card: ComponentType<DeckCardProps>; top: string }) {
	const ref = useRef<HTMLDivElement>(null);
	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		if (prefersReducedMotion() || typeof el.animate !== "function") { onDone(ghost.key); return; }
		const anim = el.animate(
			[
				{ transform: `translateX(${ghost.fromX}px) rotate(${ghost.fromRot}deg)`, opacity: 1, offset: 0 },
				{ opacity: 1, offset: 0.72 },
				{ transform: `translateX(${ghost.toX}px) rotate(${ghost.toRot}deg)`, opacity: 0, offset: 1 },
			],
			{ duration: FLY_MS, easing: "cubic-bezier(0.3, 0.45, 0.35, 1)", fill: "forwards" },
		);
		anim.onfinish = () => onDone(ghost.key);
		return () => anim.cancel();
	}, [ghost, onDone]);
	return (
		<div className="absolute inset-x-0 flex justify-center" style={{ top }}>
			<div ref={ref}>
				<Card brand={ghost.brand} paletteIndex={ghost.palette} live={false} />
			</div>
		</div>
	);
}

function PassButton({ ratio, onClick, label, size }: { ratio: number; onClick: () => void; label: string; size: number }) {
	const ink = mix(DISC.passInk, DISC.buttonIdle, ratio);
	return (
		<div className="flex flex-col items-center" style={{ gap: cu(6) }}>
			<button
				type="button"
				onClick={onClick}
				aria-label={label}
				data-deck-button
				className="grid place-items-center rounded-full transition-[opacity] active:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
				style={{ width: cu(size), height: cu(size), background: mix(DISC.buttonIdle, "#FFFFFF", ratio), outlineColor: DISC.teal }}
			>
				<svg viewBox="0 0 20 20" style={{ width: cu(size * 20 / 56), height: cu(size * 20 / 56) }} fill="none" aria-hidden="true">
					<path d="M2 2 L18 18 M18 2 L2 18" stroke={ink} strokeWidth="2.4" strokeLinecap="round" />
				</svg>
			</button>
			<span style={{ font: `400 ${cu(12)} var(--font-body)`, color: DISC.muted }}>Pass</span>
		</div>
	);
}

function StakButton({ ratio, onClick, label, size }: { ratio: number; onClick: () => void; label: string; size: number }) {
	return (
		<div className="flex flex-col items-center" style={{ gap: cu(6) }}>
			<button
				type="button"
				onClick={onClick}
				aria-label={label}
				data-deck-button
				className="grid place-items-center rounded-full transition-[opacity] active:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
				style={{ width: cu(size), height: cu(size), background: mix(DISC.buttonIdle, DISC.saveAccent, ratio), outlineColor: DISC.teal }}
			>
				<img src={stakMark} alt="" style={{ width: cu(size / 2), height: cu(size / 2) }} draggable={false} />
			</button>
			<span style={{ font: `400 ${cu(12)} var(--font-body)`, color: DISC.muted }}>STAK</span>
		</div>
	);
}

/**
 * Android's Discover body: the header, the three-card stack, the Pass / STAK buttons, the undo toast
 * and the end-of-deck receipt. A decision is applied at once (and can be taken back for 3 seconds);
 * the server only hears about it once that window closes, exactly as on Android.
 */
export function DiscoverDeck({
	brands, paletteOf, limit, swipeCount, stakSize, initialSaved, initialPassed,
	onSave, onPass, onLearnMore, onReview, bumpOptimistic, reportSwipeResult,
	Card = MemoCard, onProgress, buttonSize = 56, onFrontChange, unit: unitOverride, stack = "phone",
}: DiscoverDeckProps) {
	const phoneUnit = useFigmaUnit();
	const unit = unitOverride ?? phoneUnit;
	const geo = STACKS[stack];
	const [drag, setDrag] = useState(0);
	const [returning, setReturning] = useState(false);
	const [ghosts, setGhosts] = useState<Ghost[]>([]);
	const [pending, setPending] = useState(0);
	const [saved, setSaved] = useState(initialSaved);
	const [passed, setPassed] = useState(initialPassed);
	const [undoToast, setUndoToast] = useState<UndoToastState | null>(null);
	const [fullNotice, setFullNotice] = useState(0);
	// The tallest the front card has been: its height changes as its TIP loads, and the buttons below must not jump with it.
	const [tallest, setTallest] = useState(0);

	const dragPointer = useRef<{ id: number; startX: number; active: boolean } | null>(null);
	const ghostKey = useRef(0);
	// The card a decision was just made on: a second tap before the next render sees the same front card and must not
	// decide it again (two ghosts, a double count, and an undo that only takes back one).
	const decidedId = useRef<string | null>(null);
	const decisions = useRef(new Map<number, Decision>());
	const cardShownAt = useRef(Date.now());
	const frontRef = useRef<HTMLDivElement>(null);
	// The latest callbacks/values, for timers that outlive the render that started them.
	const latest = useRef({ bumpOptimistic, reportSwipeResult, stakSize });
	useEffect(() => { latest.current = { bumpOptimistic, reportSwipeResult, stakSize }; });

	const seen = swipeCount + pending;
	const visible = useMemo(() => brands.slice(0, Math.max(0, limit - seen)), [brands, limit, seen]);
	const front = visible[0];
	const atEnd = visible.length === 0;
	// The deck's label describes the cards it opened with, so it's pinned once there are any (it stays on the receipt too).
	const labelRef = useRef(DEFAULT_DECK_LABEL);
	if (labelRef.current === DEFAULT_DECK_LABEL && visible.length > 0) labelRef.current = deckLabelFor(visible.map((b) => b.ticker));
	const label = labelRef.current;
	const threshold = SWIPE_THRESHOLD * unit;

	const next = visible[1];
	useLayoutEffect(() => { onFrontChange?.(front ?? null, next ?? null); }, [front, next, onFrontChange]);

	useEffect(() => {
		cardShownAt.current = Date.now();
		decidedId.current = null;
		// A different card can arrive mid-drag (the server re-sorted the deck); the drag belonged to the old one.
		dragPointer.current = null;
		setDrag(0);
		setReturning(false);
	}, [front?.id]);

	useEffect(() => {
		const el = frontRef.current;
		if (!el || typeof ResizeObserver === "undefined") return;
		const observer = new ResizeObserver(() => setTallest((t) => Math.max(t, el.offsetHeight)));
		observer.observe(el);
		// A narrower window makes the card taller; a wider one again must not leave that height behind as a gap.
		const onResize = () => setTallest(el.offsetHeight);
		window.addEventListener("resize", onResize);
		return () => { observer.disconnect(); window.removeEventListener("resize", onResize); };
	}, [atEnd]);
	// A new scale (desktop fits the deck to the window) resizes the card: the remembered height must follow it down too,
	// or a smaller card would keep the old height's gap - and the page, measuring that, would shrink it again.
	useLayoutEffect(() => {
		if (frontRef.current) setTallest(frontRef.current.offsetHeight);
	}, [unit]);

	const send = useCallback((d: Decision, keepalive = false) => {
		return recordSwipe(d.brand.id, d.direction, {
			ticker: d.brand.ticker,
			categories: d.brand.interestCategories,
			stakSize: latest.current.stakSize,
			timeOnCardMs: d.timeOnCardMs,
		}, { keepalive });
	}, []);

	const post = useCallback((id: number) => {
		const d = decisions.current.get(id);
		if (!d) return;
		decisions.current.delete(id);
		send(d).then((res) => latest.current.reportSwipeResult(res.success, res.dailySwipeCount, res.dailySwipeLimit)).catch(() => {});
		latest.current.bumpOptimistic();
		setPending((p) => Math.max(0, p - 1));
	}, [send]);

	// Leaving Discover (or closing the tab) inside the undo window keeps the decision: send it now rather than lose it.
	useEffect(() => {
		const open = decisions.current;
		const flush = () => {
			if (open.size === 0) return;
			for (const d of open.values()) {
				clearTimeout(d.timer);
				send(d, true).catch(() => {});
				// Settled as post() settles one, so a page restored from the back/forward cache doesn't count it twice.
				latest.current.bumpOptimistic();
			}
			open.clear();
			setPending(0);
		};
		window.addEventListener("pagehide", flush);
		return () => { window.removeEventListener("pagehide", flush); flush(); };
	}, [send]);

	const snapBack = useCallback(() => {
		dragPointer.current = null;
		setReturning(true);
		setDrag(0);
	}, []);

	const commit = useCallback((direction: "left" | "right", fromX = 0) => {
		if (!front || decidedId.current === front.id) return;
		decidedId.current = front.id;
		const undo = direction === "right" ? onSave(front) : onPass(front);
		if (undo === "full") {
			decidedId.current = null;
			snapBack();
			setFullNotice((n) => n + 1);
			return;
		}
		const id = ++ghostKey.current;
		// Far enough to clear the deck's side of the screen; capped so a wide desktop window doesn't turn it into a blur.
		const flyDistance = Math.min(window.innerWidth, 1100) * 0.75 + CARD_WIDTH * unit;
		const sign = direction === "right" ? 1 : -1;
		setGhosts((g) => [...g, { key: id, brand: front, palette: paletteOf(front), fromX, toX: sign * flyDistance, fromRot: (fromX / threshold) * 8, toRot: sign * 20 }]);
		decisions.current.set(id, {
			brand: front,
			direction,
			timeOnCardMs: Date.now() - cardShownAt.current,
			undo,
			timer: setTimeout(() => post(id), UNDO_MS + UNDO_GRACE_MS),
		});
		dragPointer.current = null;
		setReturning(false);
		setDrag(0);
		setPending((p) => p + 1);
		if (direction === "right") setSaved((n) => n + 1); else setPassed((n) => n + 1);
		setUndoToast({ id, brand: front, saved: direction === "right" });
	}, [front, onSave, onPass, paletteOf, post, snapBack, unit, threshold]);

	const removeGhost = useCallback((key: number) => setGhosts((g) => g.filter((x) => x.key !== key)), []);

	const undoLast = useCallback(() => {
		if (!undoToast) return;
		const d = decisions.current.get(undoToast.id);
		setUndoToast(null);
		if (!d) return;
		clearTimeout(d.timer);
		decisions.current.delete(undoToast.id);
		removeGhost(undoToast.id);
		d.undo();
		// The card comes back to the front; it can be decided again.
		decidedId.current = null;
		setPending((p) => Math.max(0, p - 1));
		if (d.direction === "right") setSaved((n) => Math.max(0, n - 1)); else setPassed((n) => Math.max(0, n - 1));
	}, [undoToast, removeGhost]);

	const dismissToast = useCallback(() => setUndoToast(null), []);

	// ── gestures: horizontal only, commit past 110u either way; one pointer at a time ──
	const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
		if (e.button !== 0 || dragPointer.current) return;
		dragPointer.current = { id: e.pointerId, startX: e.clientX, active: false };
		e.currentTarget.setPointerCapture?.(e.pointerId);
	};
	const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
		const p = dragPointer.current;
		if (!p || p.id !== e.pointerId) return;
		const dx = e.clientX - p.startX;
		if (!p.active) {
			if (Math.abs(dx) < DRAG_SLOP_PX) return;
			p.active = true;
			setReturning(false);
		}
		setDrag(dx);
	};
	const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
		const p = dragPointer.current;
		if (!p || p.id !== e.pointerId) return;
		const dx = e.clientX - p.startX;
		if (!p.active) { dragPointer.current = null; return; }
		if (Math.abs(dx) > threshold) commit(dx > 0 ? "right" : "left", dx);
		else snapBack();
	};
	const onPointerCancel = (e: PointerEvent<HTMLDivElement>) => {
		if (dragPointer.current?.id === e.pointerId) snapBack();
	};
	const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
		// A held arrow key auto-repeats: one press, one decision.
		if (atEnd || e.repeat) return;
		// Arrows on another control (Undo, Learn more, a link) belong to that control, not to the next card.
		const target = e.target as HTMLElement;
		if (target.closest("button, a, input, textarea, select, [role=button]") && !target.closest("[data-deck-button]")) return;
		if (e.key === "ArrowRight") { e.preventDefault(); commit("right"); }
		else if (e.key === "ArrowLeft") { e.preventDefault(); commit("left"); }
	};

	const ratio = clamp(drag / threshold, -1, 1);
	const shownSeen = Math.min(seen, limit);
	const ringCount = atEnd ? shownSeen : Math.min(seen + 1, limit);
	useLayoutEffect(() => { onProgress?.(ringCount, atEnd); }, [onProgress, ringCount, atEnd]);

	return (
		<div className="relative" style={{ ["--u" as string]: `${unit}px`, color: "#fff" }} onKeyDown={onKeyDown}>
			{!onProgress && <DiscoverHeader count={ringCount} limit={limit} label={label} atEnd={atEnd} />}
			{/* Headroom for the back card: its tilt lifts one corner above the stack. */}
			<div style={{ height: geo.headroom }} />

			{/* A card that has just left flies over everything below, even when it was the last one. */}
			<div className="pointer-events-none relative" style={{ height: 0, zIndex: 3 }} aria-hidden="true">
				{ghosts.map((g) => <FlyingCard key={g.key} ghost={g} onDone={removeGhost} Card={Card} top={geo.frontTop} />)}
			</div>

			{atEnd ? (
				<EndOfDeck seen={shownSeen} saved={saved} passed={passed} onReview={onReview} />
			) : (
				<>
					<div className="relative" style={{ padding: `0 ${geo.sidePad}`, zIndex: 1 }}>
						<div className="relative" style={{ paddingTop: geo.frontTop, minHeight: tallest ? `calc(${geo.frontTop} + ${tallest}px)` : undefined }}>
							{[visible[2], visible[1]].map((brand, k) => {
								if (!brand) return null;
								const slot = geo.back[1 - k]!;
								const further = geo.back[2 - k];
								return (
									<div
										key={brand.id}
										className="pointer-events-none absolute inset-x-0 flex justify-center"
										style={{ top: slot.top, transformOrigin: "top center", transform: `scale(${slot.scale}) rotate(${slot.rot}deg)` }}
										aria-hidden="true"
									>
										<SlotIn enabled={geo.animate} from={further ? `translateY(calc(${further.top} - ${slot.top})) scale(${further.scale / slot.scale}) rotate(${further.rot - slot.rot}deg)` : "translateY(-12px) scale(0.96)"}>
											<Card brand={brand} paletteIndex={paletteOf(brand)} />
										</SlotIn>
									</div>
								);
							})}
							<div className="relative flex justify-center" style={{ zIndex: 1 }}>
								<div
									ref={frontRef}
									role="group"
									aria-roledescription="card"
									aria-label={`${front.name}. Swipe right or press the right arrow to add it to your STAK; swipe left or press the left arrow to pass.`}
									tabIndex={0}
									className="cursor-grab select-none outline-none focus-visible:ring-2 active:cursor-grabbing"
									style={{
										borderRadius: cu(22),
										touchAction: "pan-y",
										transform: `translateX(${drag}px) rotate(${(drag / threshold) * 8}deg)`,
										transition: returning ? "transform 240ms ease-out" : "none",
										["--tw-ring-color" as string]: DISC.teal,
									}}
									onPointerDown={onPointerDown}
									onPointerMove={onPointerMove}
									onPointerUp={onPointerUp}
									onPointerCancel={onPointerCancel}
									onTransitionEnd={(e) => { if (e.target === e.currentTarget) setReturning(false); }}
								>
									<SlotIn
										key={front.id}
										enabled={geo.animate}
										from={`translateY(calc(${geo.back[0]!.top} - ${geo.frontTop})) scale(${geo.back[0]!.scale}) rotate(${geo.back[0]!.rot}deg)`}
									>
										<Card brand={front} paletteIndex={paletteOf(front)} onLearnMore={onLearnMore} />
									</SlotIn>
								</div>
							</div>
						</div>
					</div>

					<div style={{ height: geo.buttonsGap }} />
					<div className="relative flex justify-center" style={{ gap: cu(48), zIndex: 2 }}>
						<PassButton ratio={Math.max(0, -ratio)} onClick={() => commit("left")} label={`Pass on ${front.name}`} size={buttonSize} />
						<StakButton ratio={Math.max(0, ratio)} onClick={() => commit("right")} label={`Add ${front.name} to your STAK`} size={buttonSize} />
					</div>
					<div style={{ height: cu(8) }} />
				</>
			)}

			<UndoToast state={undoToast} onUndo={undoLast} onDismiss={dismissToast} />
			{fullNotice > 0 && <InfoToast key={fullNotice} text={STAK_FULL_MESSAGE} below={!!undoToast} />}
		</div>
	);
}
