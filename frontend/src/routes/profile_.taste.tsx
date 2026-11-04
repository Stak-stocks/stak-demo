import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getProfile } from "@/lib/api";
import { useMyStakData } from "@/hooks/useMyStakData";
import { useOnboarding, type QuizRetakeMode } from "@/context/OnboardingContext";
import { goalLabel, profileTasteChips, riskBlurb, riskStyle } from "@/lib/tasteModel";
import { Caption, SettingsCard, SettingsLinkRow, SettingsScaffold, TasteChips } from "@/components/profile/ProfileKit";
import { DISC, cu } from "@/components/discover/discoverTheme";
import { PRESS, f, focusRing } from "@/components/phone/phone";

export const Route = createFileRoute("/profile_/taste")({
	component: TasteRiskPage,
});

const sectionLabel = { font: f(500, 11, 14), color: DISC.muted, textTransform: "uppercase", padding: `${cu(4)} 0 0 ${cu(4)}` } as const;

/**
 * Taste & risk (Chinedu_Mobile 1:5732, on the live answers): the taste chips with "Retake the taste quiz", and the risk
 * style and goal, each with Change - all three re-enter the onboarding quiz pages, which save and come back here
 * (useQuizRetake). Nothing can be changed until the saved answers have loaded, so a retake never starts from blanks.
 * Mirrors the apps' Taste & risk page.
 */
function TasteRiskPage() {
	const navigate = useNavigate();
	const { swipedBrands } = useMyStakData();
	const { retake: openRetake, startRetake, endRetake } = useOnboarding();
	// Back here with a retake still open (left by the browser's Back, say): it was left unfinished - nothing was saved.
	useEffect(() => { if (openRetake) endRetake(); }, []); // once, on arrival
	const { data: me, isError, refetch, isFetching } = useQuery({ queryKey: ["profile"], queryFn: getProfile, staleTime: 5 * 60 * 1000, retry: 0 });

	if (!me) {
		return (
			<SettingsScaffold title="Taste & risk">
				<SettingsCard padding="14u 14u">
					{isError ? (
						<div role="alert" className="flex items-center justify-between" style={{ gap: cu(12) }}>
							<p style={{ font: f(400, 13, 18), color: DISC.body }}>Couldn't load your answers.</p>
							<button type="button" onClick={() => void refetch()} disabled={isFetching} className={PRESS} style={{ minHeight: 44, font: f(500, 13), color: DISC.teal, ...focusRing }}>Try again</button>
						</div>
					) : (
						<p role="status" style={{ font: f(400, 12), color: DISC.muted }}>Loading…</p>
					)}
				</SettingsCard>
			</SettingsScaffold>
		);
	}

	const taste = me.taste ?? null;
	const risk = taste && taste.risk >= 0 ? riskStyle(taste.risk) : null;
	const goal = taste ? goalLabel(taste.goal) : null;

	function retake(mode: QuizRetakeMode) {
		startRetake(mode, { picks: taste?.picks ?? [], goal: taste?.goal ?? -1, risk: taste?.risk ?? -1 });
		navigate({ to: mode === "all" ? "/onboarding/brand-picks" : mode === "goal" ? "/onboarding/goal" : "/onboarding/risk" });
	}

	return (
		<SettingsScaffold title="Taste & risk">
			<h2 style={sectionLabel}>Your taste</h2>
			<SettingsCard padding="14u 0">
				<div style={{ padding: `0 ${cu(14)}` }}>
					<TasteChips labels={profileTasteChips(taste, swipedBrands.map((b) => b.name))} />
				</div>
				<p style={{ padding: `${cu(12)} ${cu(14)} 0`, font: f(400, 12, 16), color: DISC.body }}>Your taste updates as you save stocks.</p>
				<SettingsLinkRow label="Retake the taste quiz" onClick={() => retake("all")} />
			</SettingsCard>
			<h2 style={sectionLabel}>Risk style</h2>
			<SettingsCard>
				<AnswerRow question="risk style" answer={risk} onChange={() => retake("risk")} />
			</SettingsCard>
			<Caption>{riskBlurb(taste?.risk ?? -1)} STAK uses it to show how each stock fits you.</Caption>
			<h2 style={sectionLabel}>Goal</h2>
			<SettingsCard>
				<AnswerRow question="goal" answer={goal} onChange={() => retake("goal")} />
			</SettingsCard>
			{/* What the answers really do: the server builds the deck from what you save and swipe, not from the quiz. */}
			<Caption>Your answers set your taste chips and how each stock fits you, and your goal shapes how STAK AI and your brief explain things. Your saves and paper portfolio stay as they are.</Caption>
		</SettingsScaffold>
	);
}

/** One answer with its Change (Answer, before it was answered), named with what it answers ("Change your risk style, currently Balanced"). */
function AnswerRow({ question, answer, onChange }: { question: string; answer: string | null; onChange: () => void }) {
	return (
		<SettingsLinkRow
			label={answer ?? "Not answered yet"}
			value={answer == null ? "Answer" : "Change"}
			ariaLabel={answer == null ? `Answer your ${question}, not answered yet` : `Change your ${question}, currently ${answer}`}
			onClick={onChange}
		/>
	);
}
