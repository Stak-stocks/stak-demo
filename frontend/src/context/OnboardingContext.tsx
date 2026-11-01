import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { fromSharedPickNames } from "@/lib/tasteModel";

const STORAGE_KEY = "stak:onboarding-quiz";

/** Which part of the quiz Taste & risk is redoing (useQuizRetake): all of it, or just the goal or risk question. */
export type QuizRetakeMode = "all" | "goal" | "risk";

interface OnboardingState {
	brandPicks: string[];
	goal: number | null;
	risk: number | null;
	/** Set while the quiz pages run as a retake from Profile -> Taste & risk; null in onboarding. */
	retake: QuizRetakeMode | null;
}

const EMPTY_STATE: OnboardingState = { brandPicks: [], goal: null, risk: null, retake: null };

function readStored(): OnboardingState {
	try {
		const raw = sessionStorage.getItem(STORAGE_KEY);
		if (!raw) return EMPTY_STATE;
		return { ...EMPTY_STATE, ...JSON.parse(raw) };
	} catch {
		return EMPTY_STATE;
	}
}

interface OnboardingContextType extends OnboardingState {
	/** True once picks, goal and risk are all answered - the full taste payload exists. */
	hasQuizAnswers: boolean;
	setBrandPicks: (picks: string[]) => void;
	setGoal: (goal: number) => void;
	setRisk: (risk: number) => void;
	reset: () => void;
	/** Opens a retake starting from the account's saved answers. */
	startRetake: (mode: QuizRetakeMode, answers: { picks: string[]; goal: number; risk: number }) => void;
	/** Ends a retake (saved or left), leaving the quiz empty again. */
	endRetake: () => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

/**
 * Holds the onboarding quiz's answers (brand picks, goal, risk)
 * across its multi-route flow, in sessionStorage rather than localStorage
 * since this is a single-session flow that shouldn't survive indefinitely on
 * a shared machine. Cleared once the taste payload is persisted to the
 * backend (onboarding_.profile-setup.tsx, the last step, which saves it with the name),
 * and on sign-out so one user's answers can't pre-fill the next user's quiz.
 */
export function OnboardingProvider({ children }: { children: React.ReactNode }) {
	const [state, setState] = useState<OnboardingState>(() => readStored());

	useEffect(() => {
		try {
			sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
		} catch {
			// best-effort persistence only
		}
	}, [state]);

	const reset = useCallback(() => {
		setState(EMPTY_STATE);
		try {
			sessionStorage.removeItem(STORAGE_KEY);
		} catch {
			// best-effort only
		}
	}, []);

	const value = useMemo<OnboardingContextType>(() => ({
		...state,
		hasQuizAnswers: state.brandPicks.length > 0 && state.goal != null && state.risk != null,
		setBrandPicks: (picks) => setState((s) => ({ ...s, brandPicks: picks })),
		setGoal: (goal) => setState((s) => ({ ...s, goal })),
		setRisk: (risk) => setState((s) => ({ ...s, risk })),
		reset,
		startRetake: (mode, answers) => setState({
			// The server keeps the apps' names; the quiz grid shows "Sony Group Corp" for PlayStation.
			brandPicks: fromSharedPickNames(answers.picks),
			goal: answers.goal >= 0 ? answers.goal : null,
			risk: answers.risk >= 0 ? answers.risk : null,
			retake: mode,
		}),
		endRetake: reset,
	}), [state, reset]);

	return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding() {
	const context = useContext(OnboardingContext);
	if (!context) {
		throw new Error("useOnboarding must be used within OnboardingProvider");
	}
	return context;
}
