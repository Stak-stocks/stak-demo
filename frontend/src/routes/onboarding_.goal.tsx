import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useOnboarding } from "@/context/OnboardingContext";
import { QuizStepShell } from "@/components/onboarding/QuizStepShell";
import { MatrixGrid, type QuizOption } from "@/components/onboarding/MatrixQuizOption";
import { GOAL_LEARN, GOAL_GROW, GOAL_FIRST_STOCKS, GOAL_EXPLORE } from "@/lib/tasteModel";

export const Route = createFileRoute("/onboarding_/goal")({
	component: GoalPage,
});

const OPTIONS: QuizOption[] = [
	{ index: GOAL_LEARN, title: "Learn how investing works", subtitle: "Start from the basics, no shame", icon: "learn", iconSize: 21.06, circle: 37.9, iconDy: 0 },
	{ index: GOAL_GROW, title: "Grow my money long-term", subtitle: "Slow and steady wealth", icon: "grow", iconSize: 21.06, circle: 37.9, iconDy: 0 },
	{ index: GOAL_FIRST_STOCKS, title: "Find my first stocks", subtitle: "I want to understand what to watch", icon: "search", iconSize: 26.49, circle: 37.9, iconDy: 9 },
	{ index: GOAL_EXPLORE, title: "Just exploring", subtitle: "Curious, no plan yet", icon: "explore", iconSize: 21.06, circle: 37.9, iconDy: 9 },
];

function GoalPage() {
	const navigate = useNavigate();
	const { goal, setGoal } = useOnboarding();
	const back = () => navigate({ to: "/onboarding/swipe-tutorial" });

	return (
		<QuizStepShell
			stepLabel="STEP 4 OF 6"
			title="What brings you here?"
			subtitle="Pick one. You can change it any time."
			gap={16}
			contentWidth={780}
			continueDisabled={goal == null}
			onBack={back}
			secondary={{ label: "Back", onClick: back }}
			onContinue={() => navigate({ to: "/onboarding/risk" })}
		>
			<MatrixGrid options={OPTIONS} selected={goal} onSelect={setGoal} />
		</QuizStepShell>
	);
}
