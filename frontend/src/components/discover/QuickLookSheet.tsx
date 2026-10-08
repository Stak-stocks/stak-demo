import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Layers, ShieldAlert, TrendingUp, type LucideIcon } from "lucide-react";
import type { BrandSummary } from "@stak/shared";
import { getQuickLook } from "@/lib/api";
import { useBrandDetail } from "@/hooks/useBrandDetail";
import { DISC, cu } from "./discoverTheme";
import { PHONE_MAX_WIDTH, useFigmaUnit, useShellInset } from "./useFigmaUnit";

const DISMISS_DRAG_PX = 150;

function IconRow({ Icon, label, body }: { Icon: LucideIcon; label: string; body: string }) {
	return (
		<div className="flex" style={{ gap: cu(10) }}>
			<div className="grid shrink-0 place-items-center" style={{ width: cu(28), height: cu(28), borderRadius: cu(6), background: DISC.tile }}>
				<Icon style={{ width: cu(14), height: cu(14) }} color={DISC.teal} aria-hidden="true" />
			</div>
			<div className="min-w-0" style={{ display: "flex", flexDirection: "column", gap: cu(3) }}>
				<p style={{ font: `600 ${cu(12)}/${cu(16)} var(--font-body)`, color: DISC.ink }}>{label}</p>
				<p style={{ font: `400 ${cu(12)}/${cu(17)} var(--font-body)`, color: DISC.body }}>{body}</p>
			</div>
		</div>
	);
}

function Themes({ themes }: { themes: string[] }) {
	if (themes.length === 0) return null;
	return (
		<ul className="flex flex-wrap" style={{ marginTop: cu(16), gap: cu(6) }} aria-label="Key themes">
			{themes.map((t) => (
				<li
					key={t}
					style={{ background: DISC.tile, border: `1px solid ${DISC.tileBorder}`, borderRadius: 999, padding: `${cu(4)} ${cu(9)}`, font: `400 ${cu(10)} var(--font-body)`, color: DISC.body }}
				>
					{t}
				</li>
			))}
		</ul>
	);
}

const titleCase = (id: string) => id.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" & ");

/**
 * A brand's Quick Look: the Gemini overview (24h server cache), or - as on Android - the profile's own written sections
 * when there's no generated one. Shared by the phone's bottom sheet and the desktop Discover panel.
 */
export function useQuickLook(brand: BrandSummary) {
	const { data, isLoading } = useQuery({
		queryKey: ["quick-look", brand.id],
		queryFn: () => getQuickLook(brand.id),
		staleTime: 24 * 60 * 60 * 1000,
		gcTime: 24 * 60 * 60 * 1000,
		retry: 1,
	});
	const ql = data?.quickLook ?? null;
	const { data: profile } = useBrandDetail(!isLoading && !ql ? brand.id : null);
	const sections = profile?.culturalContext?.sections ?? [];
	return {
		ql,
		sections,
		isLoading,
		summary: ql?.in10Seconds || sections[0]?.content || brand.bio,
		themes: ql ? ql.keyThemes : (brand.interestCategories ?? []).map(titleCase),
	};
}

/** Android's Quick Look: a 30-second overview in a bottom sheet. Drag the handle down, tap the scrim, or press Esc to close. */
export function QuickLookSheet({ brand, onClose }: { brand: BrandSummary; onClose: () => void }) {
	const unit = useFigmaUnit();
	const inset = useShellInset();
	const [entered, setEntered] = useState(false);
	const [dragY, setDragY] = useState(0);
	const dragStart = useRef<number | null>(null);
	const sheetRef = useRef<HTMLDivElement>(null);

	const { ql, sections, isLoading, summary, themes } = useQuickLook(brand);

	// The parent may hand over a fresh onClose every render; the listener below must not re-run (and re-focus) for it.
	const onCloseRef = useRef(onClose);
	useEffect(() => { onCloseRef.current = onClose; });

	useEffect(() => {
		const opener = document.activeElement as HTMLElement | null;
		const raf = requestAnimationFrame(() => setEntered(true));
		sheetRef.current?.focus();
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") { onCloseRef.current(); return; }
			if (e.key !== "Tab" || !sheetRef.current) return;
			// Keep Tab inside the sheet: it is modal, so the page behind must not be reachable.
			const focusable = sheetRef.current.querySelectorAll<HTMLElement>("button:not([disabled]), [href], input, textarea, select, [tabindex]:not([tabindex='-1'])");
			if (focusable.length === 0) { e.preventDefault(); return; }
			const first = focusable[0];
			const last = focusable[focusable.length - 1];
			const active = document.activeElement;
			// Focus outside the sheet: Tab brings it back in, never to the page behind.
			if (!sheetRef.current.contains(active)) { e.preventDefault(); first.focus(); return; }
			if (e.shiftKey && (active === first || active === sheetRef.current)) { e.preventDefault(); last.focus(); }
			else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
		};
		window.addEventListener("keydown", onKey);
		return () => {
			cancelAnimationFrame(raf);
			window.removeEventListener("keydown", onKey);
			opener?.focus?.();
		};
	}, []);

	const icons = [TrendingUp, Layers, ShieldAlert, Calendar, ShieldAlert];

	return createPortal(
		<div className="fixed inset-0 z-[100] flex items-end justify-center" style={{ ["--u" as string]: `${unit}px`, paddingLeft: inset }}>
			<div
				className="absolute inset-0 transition-opacity duration-200"
				style={{ background: "rgba(0,0,0,0.6)", opacity: entered ? 1 : 0 }}
				onClick={onClose}
				aria-hidden="true"
			/>
			<div
				ref={sheetRef}
				role="dialog"
				aria-modal="true"
				aria-label={`Quick Look: ${brand.name}`}
				tabIndex={-1}
				className="relative w-full outline-none"
				style={{
					maxWidth: PHONE_MAX_WIDTH,
					background: DISC.sheet,
					borderTopLeftRadius: cu(24),
					borderTopRightRadius: cu(24),
					padding: `${cu(10)} ${cu(20)} ${cu(12)}`,
					transform: `translateY(${entered ? dragY : 600}px)`,
					transition: dragStart.current === null ? "transform 250ms ease-out" : "none",
				}}
			>
				<div
					className="flex cursor-grab touch-none items-center justify-center"
					style={{ height: cu(28) }}
					onPointerDown={(e) => { dragStart.current = e.clientY; e.currentTarget.setPointerCapture(e.pointerId); }}
					onPointerMove={(e) => { if (dragStart.current !== null) setDragY(Math.max(0, e.clientY - dragStart.current)); }}
					onPointerUp={() => {
						const dragged = dragY;
						dragStart.current = null;
						if (dragged > DISMISS_DRAG_PX) onClose(); else setDragY(0);
					}}
					onPointerCancel={() => { dragStart.current = null; setDragY(0); }}
				>
					<div style={{ width: cu(40), height: cu(4), borderRadius: 999, background: DISC.divider }} />
				</div>

				<div className="overflow-y-auto" style={{ maxHeight: "62vh" }}>
					<p style={{ marginBottom: cu(10), font: `500 ${cu(11)} var(--font-body)`, letterSpacing: cu(0.4), color: DISC.muted }}>Quick Look</p>
					<div className="flex items-end" style={{ gap: cu(6) }}>
						<h2 style={{ font: `700 ${cu(22)}/${cu(27)} var(--font-heading)`, color: DISC.ink }}>{brand.name}</h2>
						<span style={{ font: `500 ${cu(14)}/${cu(20)} var(--font-body)`, color: DISC.teal, paddingBottom: cu(1) }}>{brand.ticker}</span>
					</div>
					<p style={{ marginTop: cu(4), marginBottom: cu(16), font: `400 ${cu(13)}/${cu(18)} var(--font-body)`, color: DISC.body }}>{summary}</p>

					{ql ? (
						<div style={{ display: "flex", flexDirection: "column", gap: cu(14) }}>
							<IconRow Icon={TrendingUp} label="Why investors are watching" body={ql.whyNow} />
							<IconRow Icon={Layers} label="Business strength" body={ql.setup} />
							<IconRow Icon={ShieldAlert} label="Main risk" body={ql.catch} />
							<IconRow Icon={Calendar} label="Watch next" body={ql.whatToWatch} />
						</div>
					) : sections.length > 1 ? (
						<div style={{ display: "flex", flexDirection: "column", gap: cu(14) }}>
							{sections.slice(1).map((s, i) => <IconRow key={s.heading} Icon={icons[i % icons.length]} label={s.heading} body={s.content} />)}
						</div>
					) : isLoading ? (
						<p role="status" style={{ font: `400 ${cu(12)} var(--font-body)`, color: DISC.muted }}>Putting together today’s overview…</p>
					) : null}

					<Themes themes={themes} />
					<div style={{ height: cu(8) }} />
				</div>
			</div>
		</div>,
		document.body,
	);
}
