import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { col } from "@/app/FitCanvas";
import { useTaste } from "@/app/live/taste";
import { PageHeader } from "@/app/PageHeader";
import { tasteRisk } from "@/app/profile/data";
import { useNotificationsPanel } from "@/app/profile/notifications";
import { takeReturnFocus } from "@/app/profile/returnFocus";
import { CHEVRON, HUG, ROW_FOCUS, RowLabel, RowValue, rowName, SectionLabel, SettingsCard, SettingsRow } from "@/app/profile/ui";
import { hairline } from "@/app/ui/Button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/profile_/taste-risk")({
	component: TasteRiskPage,
});

/**
 * A taste chip (Figma 2:2796): hugs its label with 6 / 12 padding, fill #1a2333 at 55%, a 0.5 INSIDE stroke #2c9dbc
 * at 14% (an inset hairline keeps the half pixel; a CSS 0.5px border paints a whole one), r14, Geist Medium 12 #7fd4e8.
 * The label box hugs like Figma's, so the frame's chips are its 97 / 94 / 125.
 */
function TasteChip({ children }: { children: string }) {
	return (
		<span
			className="flex h-[28px] shrink-0 items-center justify-center overflow-clip rounded-[14px] bg-[rgba(26,35,51,0.55)] px-[12px]"
			style={{ boxShadow: hairline(0.5, "rgba(44,157,188,0.14)") }}
		>
			<span className="whitespace-nowrap font-geist text-[12px] font-medium leading-[16px] text-[#7fd4e8]" style={HUG}>
				{children}
			</span>
		</span>
	);
}

/**
 * Where each control takes the person: the onboarding screens that ask the questions, opened on their own answers
 * (`edit`). "Retake the taste quiz" walks the whole quiz as both phones do (android StakNavHost.kt:729-735 QuizRetake,
 * ios Profile/QuizRetakeFlow.swift:56-80): 02 Brand picks 2:5752 -> 03 Swipe tutorial -> 04 Goal 2:6023 -> 05 Risk
 * 2:6095 -> 06 Preparing -> 07 Taste reveal, whose Lets go saves every answer and returns here (Back on 02 leaves
 * without saving). The Change rows keep their one-question edits (04 Goal, 05 Risk), saved on Continue. The chips and
 * the hub's summary follow the saved answers (live/taste.ts). The edit flag lets an existing account or the guest answer
 * without restarting first-run onboarding.
 */
const EDIT = {
	taste: "/onboarding?step=2&edit=taste",
	goal: "/onboarding?step=4&edit=goal",
	risk: "/onboarding?step=5&edit=risk",
} as const;

/**
 * Figma 2:2760 "Desktop · Taste & risk": the chips from the onboarding answers (the phones' TasteModel) blended with the
 * swipe-learned taste graph, risk style and goal from the onboarding answers (live/taste.ts).
 *
 * Wiring: the frame carries no reactions and the phone's Taste & risk (1:5732) wires only Back, so each control goes
 * where its label says (above), instantly because no forward motion is specified. The taste
 * chips are wired nowhere and stay static. The bell opens the notifications panel (2:2611) in place.
 */
function TasteRiskPage() {
	const navigate = useNavigate();
	const notifications = useNotificationsPanel();
	const { chips, risk, goal } = useTaste();
	const { taste } = tasteRisk;
	const edit = (to: keyof typeof EDIT) => navigate({ href: EDIT[to], state: (previous) => ({ ...previous, onboardingEditFromProfile: true }), viewTransition: false });
	// back from the quiz (a history pop, onboarding.tsx returnToProfile): focus returns to the row the quiz was opened from,
	// where the keyboard was; a plain visit remembers nothing and focuses nothing (profile/returnFocus.ts)
	const retakeRow = useRef<HTMLButtonElement>(null);
	const riskRow = useRef<HTMLButtonElement>(null);
	const goalRow = useRef<HTMLButtonElement>(null);
	useEffect(() => {
		const row = takeReturnFocus();
		if (!row) return;
		(row === "taste" ? retakeRow : row === "risk" ? riskRow : goalRow).current?.focus({ preventScroll: true });
	}, []);

	return (
		<div className="relative flex w-full flex-col items-start gap-[29px]">
			<PageHeader title={tasteRisk.title} onBell={notifications.toggle} />
			{notifications.panel}
			<div className="flex flex-col items-start gap-[16px]" style={{ width: col(640) }}>
				<SectionLabel>{taste.label}</SectionLabel>
				{/* "Taste card" 2:2792: #10182b, r16, 14 / 14 / 4 / 14 padding, 17 gaps */}
				<div className="flex w-full flex-col items-start gap-[17px] overflow-clip rounded-[16px] bg-[#10182b] px-[14px] pb-[4px] pt-[14px]">
					{/* the chip frame 2:2793 wraps with 8px gaps both ways (its 332px inner row is exactly the three chips and their gaps) */}
					<ul aria-label="Your taste" className="flex w-full flex-wrap content-start items-start gap-[8px] overflow-clip">
						{chips.map((chip) => (
							<li key={chip} className="flex">
								<TasteChip>{chip}</TasteChip>
							</li>
						))}
					</ul>
					<p className="whitespace-nowrap font-geist text-[12px] leading-[16px] text-[#c8d2e0] max-lg:whitespace-normal max-lg:text-pretty">{taste.caption}</p>
					{/* 2:2803: the card's last row, 48 tall, its label and chevron at the card's 14px insets. The button spans the
					    card edge to edge (the insets become its padding), so its focus ring sits inside the card like a settings row's.
					    A plain frame in Figma (no variant, no hover or pressed state): cursor and focus ring only (SPEC section 5). */}
					<button
						ref={retakeRow}
						type="button"
						onClick={() => edit("taste")}
						aria-label={rowName(taste.retake)}
						className={cn(
							"-mx-[14px] flex h-[48px] w-[calc(100%+28px)] cursor-pointer items-center justify-between overflow-clip whitespace-nowrap px-[14px] text-left",
							ROW_FOCUS,
						)}
					>
						<RowLabel>{taste.retake}</RowLabel>
						<RowValue>{CHEVRON}</RowValue>
					</button>
				</div>

				{/* the notes are one line each at 1024+; below, they wrap without leaving a word alone on their last line */}
				<SectionLabel>{tasteRisk.risk.label}</SectionLabel>
				<SettingsCard>
					<SettingsRow
						name={rowName(risk.value, tasteRisk.risk.change)}
						left={<RowLabel>{risk.value}</RowLabel>}
						right={<RowValue accent>{tasteRisk.risk.change}</RowValue>}
						onClick={() => edit("risk")}
						rowRef={riskRow}
					/>
				</SettingsCard>
				<p className="w-full font-geist text-[12px] leading-[16px] text-[#819abb] max-lg:text-pretty">{risk.description}</p>

				<SectionLabel>{tasteRisk.goal.label}</SectionLabel>
				<SettingsCard>
					<SettingsRow
						name={rowName(goal.value, tasteRisk.goal.change)}
						left={<RowLabel>{goal.value}</RowLabel>}
						right={<RowValue accent>{tasteRisk.goal.change}</RowValue>}
						onClick={() => edit("goal")}
						rowRef={goalRow}
					/>
				</SettingsCard>
				<p className="w-full font-geist text-[12px] leading-[16px] text-[#819abb] max-lg:text-pretty">{goal.description}</p>
				<p className="w-full font-geist text-[12px] leading-[16px] text-[#819abb] max-lg:text-pretty">{tasteRisk.footnote}</p>
			</div>
		</div>
	);
}
