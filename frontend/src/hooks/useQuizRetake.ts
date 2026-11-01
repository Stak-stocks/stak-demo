import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useOnboarding, type QuizRetakeMode } from "@/context/OnboardingContext";
import { updateProfile } from "@/lib/api";
import { riskStyle, toSharedPickNames } from "@/lib/tasteModel";

export interface QuizRetake {
	/** Which part is being redone; null in onboarding. */
	retake: QuizRetakeMode | null;
	isRetake: boolean;
	/** Saves the answers and goes back to Taste & risk. */
	finish: () => Promise<void>;
	/** Leaves without saving. */
	cancel: () => void;
	saving: boolean;
	failed: boolean;
}

/**
 * Taste & risk's retake of the onboarding quiz (the apps' QuizRetake): the quiz pages read `retake` to finish back on
 * /profile/taste instead of going on through onboarding. The answers live in the quiz's own state until `finish`
 * saves them, so leaving (`cancel`, or just navigating away) changes nothing. Both replace the quiz page in history, so
 * the browser's Back from Taste & risk doesn't land in onboarding.
 */
export function useQuizRetake(): QuizRetake {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { retake, brandPicks, goal, risk, endRetake } = useOnboarding();
	const [saving, setSaving] = useState(false);
	const [failed, setFailed] = useState(false);

	async function finish() {
		if (saving) return;
		setSaving(true);
		setFailed(false);
		try {
			// An answer never given stays unanswered (-1), as the apps send it.
			await updateProfile({ taste: { goal: goal ?? -1, risk: risk ?? -1, riskStyle: risk != null ? riskStyle(risk) : "", picks: toSharedPickNames(brandPicks) } });
			await queryClient.invalidateQueries({ queryKey: ["profile"] });
			navigate({ to: "/profile/taste", replace: true });
			endRetake();
			toast("Taste updated");
		} catch {
			setFailed(true);
			setSaving(false);
		}
	}

	function cancel() {
		navigate({ to: "/profile/taste", replace: true });
		endRetake();
	}

	return { retake, isRetake: retake != null, finish, cancel, saving, failed };
}
