import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useOnboarding } from "@/context/OnboardingContext";
import { QuizStepShell } from "@/components/onboarding/QuizStepShell";
import { MatrixGrid } from "@/components/onboarding/MatrixQuizOption";
import { RISK_OPTIONS } from "@/components/onboarding/quizOptions";

export const Route = createFileRoute("/onboarding_/risk")({
	component: RiskPage,
});

function RiskPage() {
	const navigate = useNavigate();
	const { risk, setRisk } = useOnboarding();
	const back = () => navigate({ to: "/onboarding/goal" });

	return (
		<QuizStepShell
			stepLabel="STEP 5 OF 6"
			title="A stock you’re watching drops 10% overnight."
			subtitle="No wrong answer. This helps STAK understand your risk style."
			gap={16}
			contentWidth={780}
			continueDisabled={risk == null}
			onBack={back}
			secondary={{ label: "Back", onClick: back }}
			onContinue={() => navigate({ to: "/onboarding/preparing" })}
		>
			<MatrixGrid options={RISK_OPTIONS} selected={risk} onSelect={setRisk} />
		</QuizStepShell>
	);
}
