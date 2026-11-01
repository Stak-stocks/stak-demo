import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useOnboarding } from "@/context/OnboardingContext";
import { useQuizRetake } from "@/hooks/useQuizRetake";
import { QuizStepShell } from "@/components/onboarding/QuizStepShell";
import { MatrixGrid } from "@/components/onboarding/MatrixQuizOption";
import { RISK_OPTIONS } from "@/components/onboarding/quizOptions";

export const Route = createFileRoute("/onboarding_/risk")({
	component: RiskPage,
});

function RiskPage() {
	const navigate = useNavigate();
	const { risk, setRisk } = useOnboarding();
	const { retake, isRetake, finish, cancel, saving, failed } = useQuizRetake();
	const back = () => (retake === "risk" ? cancel() : navigate({ to: "/onboarding/goal" }));
	const only = retake === "risk";

	return (
		<QuizStepShell
			stepLabel={isRetake ? "YOUR TASTE" : "STEP 5 OF 6"}
			{...(isRetake ? { kicker: "RETAKING YOUR TASTE QUIZ · NOTHING CHANGES UNTIL YOU SAVE" } : {})}
			title="A stock you’re watching drops 10% overnight."
			subtitle="No wrong answer. This helps STAK understand your risk style."
			gap={16}
			contentWidth={780}
			continueDisabled={risk == null || saving}
			{...(only ? { continueLabel: saving ? "Saving…" : "Save" } : {})}
			caption={only && failed ? "Couldn't save that. Check your connection and try again." : undefined}
			onBack={back}
			secondary={{ label: "Back", onClick: back }}
			onContinue={() => (only ? void finish() : navigate({ to: "/onboarding/preparing" }))}
		>
			<MatrixGrid options={RISK_OPTIONS} selected={risk} onSelect={setRisk} />
		</QuizStepShell>
	);
}
