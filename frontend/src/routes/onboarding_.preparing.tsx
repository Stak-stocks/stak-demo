import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { DISC, cu } from "@/components/discover/discoverTheme";
import { PhonePage, f } from "@/components/phone/phone";

export const Route = createFileRoute("/onboarding_/preparing")({
	component: PreparingDeckPage,
});

const AUTO_ADVANCE_MS = 1800;

/** Android's Preparing screen: pure loader, no input - the hero, a headline and a spinner, then on to Taste-reveal. */
function PreparingDeckPage() {
	const navigate = useNavigate();

	useEffect(() => {
		const t = setTimeout(() => navigate({ to: "/onboarding/taste-reveal", replace: true }), AUTO_ADVANCE_MS);
		return () => clearTimeout(t);
	}, [navigate]);

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
