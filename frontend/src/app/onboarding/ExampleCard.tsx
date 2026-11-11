import { type KeyboardEvent, useId } from "react";
import { FIGMA_BASELINE, PrimaryButton } from "@/app/ui/Button";
import { cn } from "@/lib/utils";
import { OB } from "./assets";
import { STEP_TITLE_FOCUS } from "./Chrome";

/**
 * 00 References 2:6664 "EXAMPLE · Desktop · Onboarding (centered card)": the risk question as a
 * 480-wide card centred in the 1440 frame, three appetite options, the canon Continue, a text Back,
 * and the nine-dot pager under it (Figma's export of "Frame" 2:6682). Reached through
 * `/onboarding?step=5&variant=example`; the product frame of the same step (2:6095, the 2x2 matrix)
 * stays the default. The options and Back are plain layers in Figma (no variant, no hover or pressed
 * look, no reaction): they answer with the selected look, the pointer cursor and the focus ring only.
 */
export type ExampleRiskId = "steady" | "drama" | "storm";

/** The three appetites of the example, each folded onto one of the product's reactions (what the flow stores). */
export const EXAMPLE_RISKS: { id: ExampleRiskId; title: string; subtitle: string; risk: string }[] = [
	{ id: "steady", title: "Steady only", subtitle: "Slow and boring is beautiful.", risk: "sell" },
	{ id: "drama", title: "A little drama", subtitle: "Some swings, nothing wild.", risk: "hold" },
	{ id: "storm", title: "Bring the storm", subtitle: "High volatility, high learning.", risk: "buy" },
];

/** The product's four reactions read back as three appetites: both low-appetite reactions are "Steady only". */
export const exampleRiskOf = (risk: string): ExampleRiskId | null =>
	risk === "buy" ? "storm" : risk === "hold" ? "drama" : risk === "sell" || risk === "step" ? "steady" : null;

/** The frame shows "A little drama" selected. */
export const EXAMPLE_DEFAULT_RISK = "hold";

export function ExampleStepCard({
	risk,
	onSelect,
	onContinue,
	onBack,
}: { risk: string; onSelect: (risk: string) => void; onContinue: () => void; onBack: () => void }) {
	const selected = exampleRiskOf(risk);
	const titleId = useId();
	const hasSelected = selected !== null;
	const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
		const radios = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>("button[data-option]"));
		const at = radios.indexOf(document.activeElement as HTMLButtonElement);
		if (at === -1) return;
		const delta = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 0;
		if (!delta) return;
		const next = radios[(at + delta + radios.length) % radios.length];
		e.preventDefault();
		next.focus();
		if (next.dataset.option) onSelect(next.dataset.option);
	};
	return (
		<>
			{/* "STAK" 2:6665 at 60 / 44 (Sora SemiBold 20 / auto 25): placed by its wrapper so the text is plain text the app's
			    baseline rule puts on Figma's row at every zoom (a positioned text is skipped by it) */}
			<div className="onboarding-example-logo absolute left-[60px]" style={{ top: "calc(44px - var(--stak-band, 0px))" }}>
				<p className="whitespace-nowrap font-sora text-[20px] font-semibold leading-[25px] text-[#f2f6fc]">STAK</p>
			</div>
			<div className="onboarding-example-card absolute left-[calc(50%-240px)] top-[257px] flex w-[480px] flex-col items-start gap-[16px] overflow-clip rounded-[20px] bg-[#0e1a36] p-[32px]">
				<p className="whitespace-nowrap font-geist text-[11px] font-medium leading-[14px] tracking-[0.88px] text-[#819abb]">STEP 5 OF 9</p>
				{/* 2:6668 (Sora SemiBold 22 / auto 28, two lines) on Figma's own baseline: Figma rounds it to a whole pixel in the
				    box (21, not 21.48); aimed at the unrounded value, both lines painted 0.9px low on the zoomed canvas (1280x800),
				    where the card's box top falls on a fraction. At 1440 the two agree. */}
				<h1
					id={titleId}
					{...STEP_TITLE_FOCUS}
					className={cn("w-[416px] font-sora text-[22px] font-semibold leading-[28px] text-[#f2f6fc] outline-none", FIGMA_BASELINE)}
				>
					How much drama can your money handle?
				</h1>
				<p className="w-[416px] font-geist text-[13px] leading-[17px] text-[#819abb]">This shapes your Risk fit on every stock you meet.</p>
				<div role="radiogroup" aria-labelledby={titleId} className="flex w-full flex-col items-start gap-[16px]" onKeyDown={onKeyDown}>
					{EXAMPLE_RISKS.map((o, i) => {
						const isSelected = o.id === selected;
						return (
							<button
								type="button"
								key={o.id}
								data-option={o.risk}
								role="radio"
								aria-checked={isSelected}
								// roving tabindex: the selected option is the group's Tab stop, the first while nothing is picked
								tabIndex={(hasSelected ? isSelected : i === 0) ? 0 : -1}
								onClick={() => onSelect(o.risk)}
								className={cn(
									"flex h-[60px] w-full cursor-pointer flex-col items-start gap-[3px] overflow-clip rounded-[12px] px-[16px] py-[12px] text-left",
									isSelected ? "bg-[#0f2a38] shadow-[inset_0_0_0_1px_#5da8bf]" : "bg-[#12203e]",
								)}
							>
								<span className={cn("whitespace-nowrap font-geist text-[14px] font-medium leading-[18px]", isSelected ? "text-[#a6e4f7]" : "text-[#f2f6fc]")}>
									{o.title}
								</span>
								<span className="whitespace-nowrap font-geist text-[11px] leading-[14px] text-[#819abb]">{o.subtitle}</span>
							</button>
						);
					})}
				</div>
				<PrimaryButton onClick={onContinue}>Continue</PrimaryButton>
				{/* "Back" 2:6681: a text layer (Geist Medium 12 / auto 16, 29 x 16); the step's Back, with no hover or pressed look in Figma.
				    Below 1024 responsive.css gives it an invisible touch area (the R8 ruling of 2026-10-31 for a target under 24 px):
				    the text itself stays 29 x 16 */}
				<button
					type="button"
					data-onboarding-example-back=""
					onClick={onBack}
					className="cursor-pointer whitespace-nowrap rounded-[4px] font-geist text-[12px] font-medium leading-[16px] text-[#819abb]"
				>
					Back
				</button>
			</div>
			{/* the authored pager: nine 6px dots 14 apart, the fifth lit */}
			<img alt="Step 5 of 9" src={OB.examplePager} className="onboarding-example-pager absolute left-[calc(50%-59px)] top-[791px] h-[6px] w-[118px]" />
		</>
	);
}
