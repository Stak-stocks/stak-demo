import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useOnboarding } from "@/context/OnboardingContext";
import { QuizStepShell } from "@/components/onboarding/QuizStepShell";
import { RISK_OPTIONS } from "@/components/onboarding/quizOptions";
import { SheetScaffold } from "@/components/simulate/simKit";
import { bars, riskStyle } from "@/lib/tasteModel";
import { DISC, cu } from "@/components/discover/discoverTheme";
import { PRESS, f, focusRing } from "@/components/phone/phone";

export const Route = createFileRoute("/onboarding_/taste-reveal")({
	component: TasteRevealPage,
});

const STRENGTH_INK: Record<string, string> = { Strong: DISC.teal, Medium: DISC.muted, Light: DISC.faint };

/** Android's Taste reveal: four bars built from your picks, your risk style (tap to change it), then on. */
function TasteRevealPage() {
	const navigate = useNavigate();
	const { brandPicks, goal, risk, setRisk } = useOnboarding();
	const [pickingRisk, setPickingRisk] = useState(false);

	const revealBars = bars(new Set(brandPicks), goal ?? 0, risk ?? 0);
	const style = risk != null ? riskStyle(risk) : null;
	const back = () => navigate({ to: "/onboarding/risk" });

	return (
		<QuizStepShell
			stepLabel="STEP 6 OF 6"
			gap={16}
			continueLabel="Let's go!"
			onBack={back}
			secondary={{ label: "Back", onClick: back }}
			onContinue={() => navigate({ to: "/onboarding/permissions" })}
		>
			<p style={{ font: f(500, 10), letterSpacing: cu(0.9), color: DISC.teal }}>YOUR STARTING STAK TASTE</p>
			<div style={{ display: "flex", flexDirection: "column", gap: cu(12) }}>
				<h1 style={{ font: f(600, 26, 33, "heading"), color: "#fff" }}>Here’s what you’re into.</h1>
				<p style={{ font: f(400, 12), color: "#ACAFB1" }}>Built from your picks. It gets smarter with every swipe.</p>
			</div>

			<section style={{ display: "flex", flexDirection: "column", gap: cu(14), borderRadius: cu(16), background: DISC.sheet, padding: cu(16) }} aria-label="Your taste">
				{revealBars.map((bar) => (
					<div key={bar.label} style={{ display: "flex", flexDirection: "column", gap: cu(6) }}>
						<div className="flex items-center justify-between">
							<span style={{ font: f(400, 12, 16), color: "#fff" }}>{bar.label}</span>
							<span style={{ font: f(500, 10, 16), color: STRENGTH_INK[bar.strength] ?? DISC.muted }}>{bar.strength}</span>
						</div>
						<div style={{ height: cu(5), borderRadius: cu(2.5), background: DISC.divider }}>
							<div style={{ width: `${bar.fraction * 100}%`, height: "100%", borderRadius: cu(2.5), background: DISC.teal }} />
						</div>
					</div>
				))}
			</section>

			<button
				type="button"
				onClick={() => setPickingRisk(true)}
				className={`flex items-center text-left ${PRESS}`}
				style={{ gap: cu(10), borderRadius: cu(14), background: DISC.sheet, padding: `${cu(13)} ${cu(14)} ${cu(13)} ${cu(16)}`, ...focusRing }}
			>
				<span className="flex-1" style={{ display: "flex", flexDirection: "column", gap: cu(2) }}>
					<span style={{ font: f(400, 11), color: DISC.muted }}>Risk style</span>
					<span style={{ font: f(500, 14), color: "#fff" }}>{style ?? "Not set yet"}</span>
				</span>
				<span style={{ font: f(500, 15), color: DISC.teal }} aria-hidden="true">›</span>
			</button>

			<p className="text-center" style={{ font: f(400, 11), color: DISC.faint }}>Your deck adjusts as you swipe.</p>

			{pickingRisk && (
				<SheetScaffold label="Risk style" onDismiss={() => setPickingRisk(false)} scrim="rgba(0,0,0,0.5)" draggable={false}>
					<div style={{ display: "flex", flexDirection: "column", gap: cu(8), padding: `${cu(8)} 0 ${cu(18)}` }}>
						<h2 style={{ font: f(600, 17, undefined, "heading"), color: "#fff" }}>Risk style</h2>
						<p style={{ paddingBottom: cu(6), font: f(400, 12), color: "#ACAFB1" }}>How you’d react to a 10% overnight drop. Change it any time.</p>
						{RISK_OPTIONS.map((o) => {
							const selected = risk === o.index;
							return (
								<button
									key={o.index}
									type="button"
									onClick={() => { setRisk(o.index); setPickingRisk(false); }}
									aria-pressed={selected}
									className={`flex items-center text-left ${PRESS}`}
									style={{ gap: cu(8), borderRadius: cu(12), background: DISC.pageBg, padding: `${cu(12)} ${cu(14)}`, border: `${cu(1)} solid ${selected ? "rgba(105,179,202,0.5)" : "rgba(255,255,255,0.10)"}`, ...focusRing }}
								>
									<span className="flex-1" style={{ display: "flex", flexDirection: "column", gap: cu(2) }}>
										<span style={{ font: f(500, 13), color: "#fff" }}>{riskStyle(o.index)} · {o.title}</span>
										<span style={{ font: f(400, 11), color: "#ACAFB1" }}>{o.subtitle}</span>
									</span>
									{selected && <span style={{ font: f(500, 14), color: DISC.teal }} aria-hidden="true">✓</span>}
								</button>
							);
						})}
					</div>
				</SheetScaffold>
			)}
		</QuizStepShell>
	);
}
