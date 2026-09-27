import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { QuizStepShell } from "@/components/onboarding/QuizStepShell";
import { cu } from "@/components/discover/discoverTheme";

export const Route = createFileRoute("/onboarding")({
	component: IntroPage,
});

/** Android's Intro screen — the first onboarding step, reached right after the account is created (or on sign-in before onboarding is done). */
function IntroPage() {
	const navigate = useNavigate();

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
			onContinue={() => navigate({ to: "/onboarding/brand-picks" })}
		>
			<div className="flex flex-1 justify-center" style={{ paddingTop: cu(18.95) }}>
				<img src="/app/intro_hero_box.webp" alt="" draggable={false} className="select-none object-contain" style={{ width: cu(342), height: cu(488) }} />
			</div>
		</QuizStepShell>
	);
}
