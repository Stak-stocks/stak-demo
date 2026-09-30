import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { QuizStepShell } from "@/components/onboarding/QuizStepShell";
import { useIsMobile } from "@/hooks/use-mobile";
import { DISC } from "@/components/discover/discoverTheme";
import { f } from "@/components/phone/phone";
import { cu } from "@/components/discover/discoverTheme";

export const Route = createFileRoute("/onboarding")({
	component: IntroPage,
});

/** Android's Intro screen — the first onboarding step, reached right after the account is created (or on sign-in before onboarding is done). */
function IntroPage() {
	const navigate = useNavigate();
	const start = () => navigate({ to: "/onboarding/brand-picks" });

	// Desktop, from the design: the box art above a centred headline, then the button.
	if (!useIsMobile()) {
		return (
			<QuizStepShell noNav caption="Takes about a minute" continueLabel="Get started" onContinue={start} contentWidth={760}>
				<div className="flex flex-col items-center text-center">
					<img src="/app/intro_hero_box.webp" alt="" draggable={false} className="select-none object-contain" style={{ width: cu(360), height: cu(514) }} />
					<h1 style={{ marginTop: cu(12), font: f(600, 36, 44, "heading"), color: "#fff" }}>Find stocks you actually understand.</h1>
					<p style={{ marginTop: cu(14), maxWidth: cu(620), font: f(400, 16, 24), color: DISC.muted }}>STAK turns brands you already know into simple, clear stock ideas, so you can invest with confidence.</p>
				</div>
			</QuizStepShell>
		);
	}

	return (
		<QuizStepShell
			noNav
			title="Find stocks you actually understand."
			titleSize={26}
			subtitle={<>STAK turns brands you already know into simple,<br />clear stock ideas, so you can invest with confidence.</>}
			subtitleSize={14}
			subtitleWidth={342}
			gap={16}
			caption="Takes about a minute"
			continueLabel="Get started"
			onContinue={start}
		>
			<div className="flex flex-1 justify-center" style={{ paddingTop: cu(18.95) }}>
				<img src="/app/intro_hero_box.webp" alt="" draggable={false} className="select-none object-contain" style={{ width: cu(342), height: cu(488) }} />
			</div>
		</QuizStepShell>
	);
}
