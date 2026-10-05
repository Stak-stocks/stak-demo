import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useAccount } from "@/context/AccountContext";
import { supabase } from "@/lib/supabase";
import { updateProfile } from "@/lib/api";
import { startFirstRun } from "@/lib/firstRun";
import { useOnboarding } from "@/context/OnboardingContext";
import { riskStyle, toSharedPickNames } from "@/lib/tasteModel";
import { capitalizeWords } from "@/lib/utils";
import { QuizStepShell } from "@/components/onboarding/QuizStepShell";
import { useIsMobile } from "@/hooks/use-mobile";
import { DISC, cu } from "@/components/discover/discoverTheme";
import { f } from "@/components/phone/phone";

export const Route = createFileRoute("/onboarding_/profile-setup")({
	component: ProfileSetupPage,
});

const MAX_NAME_LENGTH = 20;

/**
 * "STEP · LAST ONE" - the exact moment onboardingCompleted flips true, matching Android. There is no photo pipeline on
 * web (only the name is stored), so the avatar shows the photo the sign-in provided or the name's first letter.
 */
function ProfileSetupPage() {
	const navigate = useNavigate();
	const { appUser } = useAuth();
	const { refreshAccount } = useAccount();
	const { hasQuizAnswers, goal, risk, brandPicks, reset } = useOnboarding();
	const [name, setName] = useState(appUser?.displayName ?? "");
	const [submitting, setSubmitting] = useState(false);
	const desk = !useIsMobile();

	async function handleSubmit() {
		const trimmed = capitalizeWords(name.trim());
		if (!trimmed || submitting) return;
		setSubmitting(true);
		try {
			await supabase.auth.updateUser({ data: { full_name: trimmed } });
			// Like Android, the quiz's taste, the name and "onboarded" are saved together, here at the very end.
			await updateProfile({
				displayName: trimmed,
				onboardingCompleted: true,
				...(hasQuizAnswers ? { taste: { goal: goal!, risk: risk!, riskStyle: riskStyle(risk!), picks: toSharedPickNames(brandPicks) } } : {}),
			});
			reset();
			// Read the flag back before leaving: Root sends any signed-in user whose account still says
			// "not onboarded" to the quiz, and the Realtime refetch that would flip it can lag the navigation.
			await refreshAccount();
			// A brand-new account: Home opens on its first run ("See Today's Pick"), like Android.
			if (appUser?.uid) startFirstRun(appUser.uid);
			navigate({ to: "/" });
		} catch {
			toast.error("Couldn't save your profile. Try again.");
			setSubmitting(false);
		}
	}

	return (
		<QuizStepShell
			onBack={() => navigate({ to: "/onboarding/permissions" })}
			kicker="STEP · LAST ONE"
			title="Make it yours"
			titleSize={26}
			titleLine={33}
			subtitle="Pick a name and photo. This is how you’ll show up on leaderboards."
			subtitleWidth={276}
			continueLabel={submitting ? "Saving…" : "Proceed to home"}
			continueDisabled={submitting || !name.trim()}
			onContinue={handleSubmit}
			contentWidth={440}
		>
			<div className="flex flex-col items-center" style={{ gap: cu(10), padding: `${cu(6)} 0` }}>
				<div className="grid place-items-center overflow-hidden rounded-full" style={{ width: cu(desk ? 120 : 96), height: cu(desk ? 120 : 96), background: DISC.avatar, boxShadow: desk ? undefined : `inset 0 0 0 ${cu(2)} ${DISC.teal}` }}>
					{appUser?.photoURL ? (
						<img src={appUser.photoURL} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
					) : (
						<span style={{ font: f(600, desk ? 48 : 36, undefined, "heading"), color: desk ? "#fff" : DISC.badgeInk }}>{name.trim().slice(0, 1).toUpperCase()}</span>
					)}
				</div>
			</div>
			<label style={{ display: "flex", flexDirection: "column", gap: cu(desk ? 10 : 18), marginTop: desk ? cu(40) : 0 }}>
				<span style={{ font: f(500, 10), letterSpacing: cu(1.2), color: DISC.faint }}>DISPLAY NAME</span>
				<span className="flex items-center" style={{ gap: cu(8), borderRadius: cu(14), background: DISC.sheet, padding: cu(16) }}>
					<input
						value={name}
						onChange={(e) => setName(e.target.value.slice(0, MAX_NAME_LENGTH))}
						placeholder="Your name"
						autoComplete="nickname"
						autoCapitalize="words"
						aria-label="Display name"
						className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-[#819ABB]"
						style={{ font: f(400, 14), color: "#fff", caretColor: "#69B3CA" }}
					/>
					<span style={{ font: f(400, 11), color: DISC.faint }}>{name.length} / {MAX_NAME_LENGTH}</span>
				</span>
			</label>
			<p className={desk ? "text-center" : undefined} style={{ marginTop: desk ? cu(18) : 0, font: f(400, desk ? 12 : 11), color: desk ? DISC.muted : DISC.faint }}>You can change this anytime in Profile.</p>
		</QuizStepShell>
	);
}
