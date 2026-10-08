import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { OB } from "./assets";

type ChromeProps = {
	/** Right-aligned step label, e.g. "STEP 2 OF 6" or "STEP · LAST ONE". */
	label: string;
	/** Which "STAK" wordmark export this frame uses. */
	logoText: keyof typeof OB.logoText;
	/** Filled progress segments out of six; omit to hide the bar (last step). */
	progress?: number;
	onBack: () => void;
};

/**
 * Shared onboarding chrome: logo at 60/44, step label at right 60 / top 50, six 56x4 progress
 * segments at 537/100, and the 40px back control at 60/96.
 */
export function OnboardingChrome({ label, logoText, progress, onBack }: ChromeProps) {
	return (
		<>
			<img alt="" src={OB.logoIcon} className="absolute left-[60.05px] size-[26.478px]" style={{ top: "calc(44.03px - var(--stak-band, 0px))" }} />
			<img alt="STAK" src={OB.logoText[logoText]} className="absolute left-[91.01px] h-[14.983px] w-[78.163px]" style={{ top: "calc(49.77px - var(--stak-band, 0px))" }} />
			<p style={{ top: "calc(50px - var(--stak-band, 0px))" }} className="absolute right-[60px] whitespace-nowrap font-geist text-[11px] font-medium leading-[14px] tracking-[0.88px] text-[#819abb]">
				{label}
			</p>
			{progress !== undefined && (
				<div style={{ top: "calc(100px - var(--stak-band, 0px))" }} className="absolute left-1/2 flex -translate-x-1/2 items-start gap-[6px] overflow-clip">
					{[1, 2, 3, 4, 5, 6].map((i) => (
						<div key={i} className={cn("h-[4px] w-[56px] rounded-[2px]", i <= progress ? "bg-[#a6e4f7]" : "bg-[rgba(255,255,255,0.14)]")} />
					))}
				</div>
			)}
			<BackControl className="absolute left-[60px]" style={{ top: "calc(96px - var(--stak-band, 0px))" }} onClick={onBack} />
		</>
	);
}

export function BackControl({
	className,
	style,
	onClick,
	flipped,
}: { className?: string; style?: CSSProperties; onClick: () => void; flipped?: boolean }) {
	return (
		<button
			type="button"
			aria-label={flipped ? "Next" : "Back"}
			style={style}
			onClick={onClick}
			className={cn("flex size-[40px] items-center justify-center overflow-clip rounded-[20px] bg-[#192238]", flipped && "rotate-180", className)}
		>
			<img alt="" src={OB.back} className="size-[22px]" />
		</button>
	);
}

/** Step title + subtitle block (Sora 30 / Geist 14), centered. */
export function StepHeading({ title, subtitle, className }: { title: string; subtitle: string; className?: string }) {
	return (
		<div className={cn("flex flex-col items-center gap-[10px] overflow-clip whitespace-nowrap", className)}>
			<h1 className="font-sora text-[30px] font-semibold leading-[38px] text-[#f2f6fc]">{title}</h1>
			<p className="font-geist text-[14px] leading-[18px] text-[#819abb]">{subtitle}</p>
		</div>
	);
}

/** "Hero · box and crystal stocks" (2:5712): the open box, its shadow and six crystal coins, from the Figma vectors. */
export function HeroBox() {
	const H = OB.hero;
	const v = "absolute inset-0 block size-full max-w-none";
	return (
		<div className="relative h-[492.2px] w-[363.896px] shrink-0">
			<div className="absolute left-[24.03px] top-[390.08px] h-[102.123px] w-[326.133px]">
				<img alt="" className={v} src={H.v67} />
			</div>
			<div className="absolute left-[40.5px] top-[406.55px] h-[72.474px] w-[293.19px]">
				<img alt="" className={v} src={H.v56} />
			</div>
			<div className="absolute left-[40.5px] top-[406.55px] h-[72.474px] w-[293.19px]">
				<div className="absolute inset-[-77.68%_-19.2%]">
					<img alt="" className="block size-full max-w-none" src={H.v68} />
				</div>
			</div>
			<div className="absolute left-[3.43px] top-[164.78px] h-[82.392px] w-[181.948px]">
				<img alt="" className={v} src={H.v57} />
			</div>
			<div className="absolute left-[185.38px] top-[164.78px] h-[85.825px] w-[171.649px]">
				<img alt="" className={v} src={H.v58} />
			</div>
			<div className="absolute left-[185.38px] top-[250.61px] h-[216.278px] w-[137.319px]">
				<img alt="" className={v} src={H.v60} />
			</div>
			<div className="absolute left-[48.06px] top-[247.17px] flex h-[219.712px] w-[137.319px] items-center justify-center">
				<div className="flex-none -scale-y-100 rotate-180">
					<div className="relative h-[219.712px] w-[137.319px]">
						<img alt="" className={v} src={H.v61} />
					</div>
				</div>
			</div>
			<div className="absolute left-[48.06px] top-[199.11px] h-[99.556px] w-[137.319px]">
				<img alt="" className={v} src={H.v64} />
			</div>
			<div className="absolute left-[185.38px] top-[199.11px] flex h-[99.556px] w-[137.319px] items-center justify-center">
				<div className="flex-none -scale-y-100 rotate-180">
					<div className="relative h-[99.556px] w-[137.319px]">
						<img alt="" className={v} src={H.v65} />
					</div>
				</div>
			</div>
			<div className="absolute left-[127.02px] top-[298.67px] h-[48.062px] w-[58.361px]">
				<img alt="" className={v} src={H.v66} />
			</div>
			<div className="absolute left-[205.98px] top-[240.31px] size-[64.876px]">
				<img alt="" className="pointer-events-none absolute inset-0 size-full max-w-none object-cover" src={H.amazon} />
			</div>
			<div className="absolute left-0 top-[247.17px] h-[99.556px] w-[185.381px]">
				<img alt="" className={v} src={H.v62} />
			</div>
			<div className="absolute left-[185.38px] top-[250.61px] h-[96.123px] w-[178.515px]">
				<img alt="" className={v} src={H.v63} />
			</div>
			<div className="absolute left-[51.27px] top-[-25.88px] h-[284.755px] w-[266.888px]">
				<div className="absolute inset-[0_0.39%_0_0.37%]">
					<img alt="" className="block size-full max-w-none" src={H.shadow} />
				</div>
			</div>
			<div className="absolute left-[156.57px] top-[100.49px] flex size-[155.516px] items-center justify-center">
				<div className="flex-none rotate-[-49.53deg]">
					<div className="relative size-[110.311px]">
						<img alt="" className="pointer-events-none absolute inset-0 size-full max-w-none object-cover" src={H.google} />
					</div>
				</div>
			</div>
			<div className="absolute left-[171.65px] top-[192.25px] size-[65.08px]">
				<img alt="" className="pointer-events-none absolute inset-0 size-full max-w-none object-cover" src={H.shopify} />
			</div>
			<div className="absolute left-[145.2px] top-[39.81px] size-[93.093px]">
				<img alt="" className="pointer-events-none absolute inset-0 size-full max-w-none object-cover" src={H.twitch} />
			</div>
			<div className="absolute left-[75px] top-[116.72px] size-[113.499px]">
				<img alt="" className="pointer-events-none absolute inset-0 size-full max-w-none object-cover" src={H.nvidia} />
			</div>
			<div className="absolute left-[102.99px] top-[212.84px] size-[72.186px]">
				<img alt="" className="pointer-events-none absolute inset-0 size-full max-w-none object-cover" src={H.apple} />
			</div>
		</div>
	);
}
