import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "stak:onboarding-quiz";

interface OnboardingState {
	brandPicks: string[];
	goal: number | null;
	risk: number | null;
}

const EMPTY_STATE: OnboardingState = { brandPicks: [], goal: null, risk: null };

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
