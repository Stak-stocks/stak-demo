import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { DISC, cu } from "@/components/discover/discoverTheme";
import { PhonePage, f } from "@/components/phone/phone";

export const Route = createFileRoute("/onboarding_/preparing")({
	component: PreparingDeckPage,
});

const AUTO_ADVANCE_MS = 1800;

/** Android's Preparing screen: pure loader, no input - the hero, a headline and a spinner, then on to Taste-reveal. */
function PreparingDeckPage() {
	const navigate = useNavigate();

	const isMobile = useIsMobile();
	const [filled, setFilled] = useState(false);

	useEffect(() => {
		const t = setTimeout(() => navigate({ to: "/onboarding/taste-reveal", replace: true }), AUTO_ADVANCE_MS);
		// Starts the desktop bar's fill on the next frame, so it animates from empty.
		const raf = requestAnimationFrame(() => setFilled(true));
		return () => { clearTimeout(t); cancelAnimationFrame(raf); };
	}, [navigate]);

	// Desktop, from the design: the box art, the headline, what it's doing, and a bar that fills over the wait.
	if (!isMobile) {
		return (
			<div className="grid min-h-dvh place-items-center" style={{ background: DISC.pageBg, ["--u" as string]: "clamp(1px, calc(100vw / 1440), 1.25px)" }} role="status" aria-label="Building your first deck">
				<div className="flex flex-col items-center text-center">
					<img src="/app/intro_hero_box.webp" alt="" draggable={false} className="select-none object-contain" style={{ width: cu(360), height: cu(514) }} />
					<h1 style={{ marginTop: cu(8), font: f(600, 32, 40, "heading"), color: "#fff" }}>Building your first deck...</h1>
					<p style={{ marginTop: cu(12), font: f(400, 14, 20), color: DISC.muted }}>Reading your brand picks</p>
					<div style={{ marginTop: cu(48), width: cu(420), height: cu(5), borderRadius: cu(3), background: DISC.divider, overflow: "hidden" }}>
						<div style={{ width: filled ? "100%" : "0%", height: "100%", borderRadius: cu(3), background: DISC.teal, transition: `width ${AUTO_ADVANCE_MS}ms linear` }} />
					</div>
				</div>
			</div>
		);
	}

	return (
		<PhonePage>
			<div className="relative" style={{ height: `min(${cu(800)}, 100dvh)`, minHeight: cu(690), padding: `0 ${cu(24)}` }} role="status" aria-label="Building your first deck">
				<img src="/app/intro_hero_box.webp" alt="" draggable={false} className="absolute select-none object-contain" style={{ left: "50%", marginLeft: cu(-171), top: cu(135), width: cu(342), height: cu(488) }} />
				<h1 className="absolute inset-x-0 text-center" style={{ top: cu(604), padding: `0 ${cu(24)}`, font: f(600, 22, 28, "heading"), color: "#fff" }}>Building your first deck...</h1>
				<div className="absolute inset-x-0 flex items-center justify-center" style={{ top: cu(650), gap: cu(5) }}>
					<svg className="animate-spin" viewBox="0 0 14 14" style={{ width: cu(14), height: cu(14), animationDuration: "900ms", animationTimingFunction: "linear" }} fill="none" aria-hidden="true">
						<circle cx="7" cy="7" r="5.53" stroke={DISC.faint} strokeWidth="2.94" strokeDasharray="26.1 34.7" transform="rotate(-90 7 7)" />
					</svg>
					<span style={{ font: f(400, 12, 15), color: DISC.faint }}>Getting everything ready</span>
				</div>
			</div>
		</PhonePage>
	);
}
