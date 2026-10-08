import { useEffect, useRef, useState, type PointerEvent } from "react";
import type { BrandSummary } from "@stak/shared";
import stakMark from "@/assets/stak-logo-icon.svg";
import { DISC, UNDO_MS, cu } from "./discoverTheme";

export interface UndoToastState {
	id: number;
	brand: BrandSummary;
	saved: boolean;
}

const DISMISS_DRAG_UNITS = 24;
const ENTER_MS = 280;
const EXIT_MS = 220;

const reducedMotion = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Plays a Web Animation on `el` unless the user asked for less motion; resolves when it ends. */
function play(el: HTMLElement | null, keyframes: Keyframe[], options: KeyframeAnimationOptions): Promise<void> {
	if (!el || typeof el.animate !== "function" || reducedMotion()) return Promise.resolve();
	return el.animate(keyframes, options).finished.then(() => undefined, () => undefined);
}

const pill = (accent: string) => ({
	background: "rgba(18,26,43,0.95)",
	border: `${cu(1)} solid ${accent}73`,
	borderRadius: 999,
});

/**
 * "<Name> added to your STAK" / "Passed on <Name>" with an Undo pill, centred under the header. `state` is
 * null once it should go. It stays for 3 seconds; only Undo reverts, and dragging the pill up dismisses it
 * but keeps the decision. A new swipe swaps the words in place rather than sliding a second toast in.
 */
export function UndoToast({ state, onUndo, onDismiss }: { state: UndoToastState | null; onUndo: () => void; onDismiss: () => void }) {
	const ref = useRef<HTMLDivElement>(null);
	const start = useRef<number | null>(null);
	const [rendered, setRendered] = useState<UndoToastState | null>(state);
	const [dy, setDy] = useState(0);
	const wasVisible = useRef(false);
	const visible = state !== null;

	useEffect(() => {
		if (state) setRendered(state);
	}, [state]);

	// Slide in from the top (over its own height) and out again; unmount once it has left.
	useEffect(() => {
		if (visible && !wasVisible.current) {
			// A toast that was still leaving keeps its "forwards" fade; clear it before sliding in again.
			ref.current?.getAnimations?.().forEach((a) => a.cancel());
			void play(ref.current, [{ transform: "translateY(-100%)", opacity: 0 }, { transform: "translateY(0)", opacity: 1 }], { duration: ENTER_MS, easing: "ease-out" });
		} else if (!visible && wasVisible.current) {
			void play(ref.current, [{ transform: "translateY(0)", opacity: 1 }, { transform: "translateY(-100%)", opacity: 0 }], { duration: EXIT_MS, easing: "ease-in", fill: "forwards" })
				.then(() => { if (!wasVisible.current) setRendered(null); });
		}
		wasVisible.current = visible;
	}, [visible]);

	const id = state?.id;
	useEffect(() => {
		if (id === undefined) return;
		const t = setTimeout(onDismiss, UNDO_MS);
		return () => clearTimeout(t);
	}, [id, onDismiss]);

	// The words cross-fade when a new decision replaces the shown one.
	const contentRef = useRef<HTMLDivElement>(null);
	const shownId = rendered?.id;
	useEffect(() => {
		if (wasVisible.current) void play(contentRef.current, [{ opacity: 0 }, { opacity: 1 }], { duration: 180 });
	}, [shownId]);

	if (!rendered) return null;
	const accent = rendered.saved ? DISC.saveAccent : DISC.passAccent;
	const tint = rendered.saved ? DISC.saveTint : DISC.body;

	const down = (e: PointerEvent<HTMLDivElement>) => { start.current = e.clientY; e.currentTarget.setPointerCapture(e.pointerId); };
	const move = (e: PointerEvent<HTMLDivElement>) => { if (start.current !== null) setDy(Math.min(0, e.clientY - start.current)); };
	const up = () => {
		const dragged = dy;
		start.current = null;
		setDy(0);
		const px = ref.current ? parseFloat(getComputedStyle(ref.current).getPropertyValue("--u")) || 1 : 1;
		if (dragged < -DISMISS_DRAG_UNITS * px) onDismiss();
	};

	return (
		<div className="pointer-events-none absolute inset-x-0 flex justify-center" style={{ top: cu(74), zIndex: 60 }}>
			<div
				ref={ref}
				role="status"
				aria-live="polite"
				// Leaving, it no longer takes taps: its decision is past undoing by then.
				className={`touch-none ${visible ? "pointer-events-auto" : "pointer-events-none"}`}
				style={{
					...pill(accent),
					padding: cu(6),
					transform: `translateY(${dy}px)`,
					opacity: 1 - Math.min(0.6, -dy / (DISMISS_DRAG_UNITS * 3)),
					transition: start.current === null ? "transform 200ms ease-out, opacity 200ms ease-out" : "none",
				}}
				onPointerDown={down}
				onPointerMove={move}
				onPointerUp={up}
				onPointerCancel={up}
			>
				<div ref={contentRef} className="flex items-center" style={{ gap: cu(10) }}>
					<div className="grid shrink-0 place-items-center rounded-full" style={{ width: cu(28), height: cu(28), background: rendered.saved ? accent : DISC.divider }}>
						{rendered.saved ? (
							<img src={stakMark} alt="" style={{ width: cu(16), height: cu(16) }} draggable={false} />
						) : (
							<svg viewBox="0 0 10 10" style={{ width: cu(10), height: cu(10) }} fill="none" aria-hidden="true">
								<path d="M1 1 L9 9 M9 1 L1 9" stroke={DISC.body} strokeWidth="2" strokeLinecap="round" />
							</svg>
						)}
					</div>
					{/* A long name shortens; what happened to it ("added to your STAK") always shows. */}
					<span data-toast-text className="flex min-w-0 whitespace-nowrap" style={{ maxWidth: cu(190), font: `500 ${cu(12.5)} var(--font-body)`, color: "#fff" }}>
						{!rendered.saved && <span className="shrink-0">Passed on&nbsp;</span>}
						<span className="min-w-0 truncate">{rendered.brand.name}</span>
						{rendered.saved && <span className="shrink-0">&nbsp;added to your STAK</span>}
					</span>
					<button
						type="button"
						onClick={onUndo}
						disabled={!visible}
						tabIndex={visible ? 0 : -1}
						onPointerDown={(e) => e.stopPropagation()}
						className="transition-opacity hover:opacity-80 focus-visible:outline focus-visible:outline-2"
						style={{ padding: `${cu(8)} ${cu(14)}`, borderRadius: 999, background: `${tint}2E`, color: tint, outlineColor: tint, font: `600 ${cu(12)} var(--font-body)` }}
					>
						Undo
					</button>
				</div>
			</div>
		</div>
	);
}

/** A plain notice in the toast's place (a refused save). Sits beneath a live Undo so the Undo stays reachable. */
export function InfoToast({ text, below }: { text: string; below: boolean }) {
	const ref = useRef<HTMLDivElement>(null);
	const [shown, setShown] = useState(true);

	useEffect(() => {
		void play(ref.current, [{ transform: "translateY(-100%)", opacity: 0 }, { transform: "translateY(0)", opacity: 1 }], { duration: ENTER_MS, easing: "ease-out" });
		let cancelled = false;
		const t = setTimeout(() => {
			void play(ref.current, [{ opacity: 1 }, { opacity: 0 }], { duration: EXIT_MS, fill: "forwards" }).then(() => { if (!cancelled) setShown(false); });
		}, UNDO_MS);
		return () => { cancelled = true; clearTimeout(t); };
	}, []);

	if (!shown) return null;
	return (
		<div className="pointer-events-none absolute inset-x-0 flex justify-center" style={{ top: cu(below ? 128 : 74), zIndex: 61 }}>
			<div
				ref={ref}
				role="status"
				aria-live="polite"
				className="text-center"
				style={{ ...pill(DISC.passAccent), padding: `${cu(12)} ${cu(16)}`, font: `500 ${cu(12)}/${cu(16)} var(--font-body)`, color: DISC.noticeInk }}
			>
				{text}
			</div>
		</div>
	);
}
