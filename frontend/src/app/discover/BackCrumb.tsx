import { cn } from "@/lib/utils";
import { D } from "./assets";

/** The breadcrumb's separator: Figma's two spaces around the slash (2:3572 "Discover  /  AAPL"). */
export const CRUMB_SEPARATOR = "  /  ";

/**
 * "Frame 1618869185": 40px round Back button, 31px gap, breadcrumb in Geist Medium 16 #819abb (two spaces around the slash).
 * The button is the same round #192238 control as the deck's "Nav · Previous" / "Nav · Next" (2:3078 / 2:3081): a plain
 * frame with no hover or pressed state in Figma, so it draws none (the canvas's focus outline stays).
 */
export function BackCrumb({ crumb, onBack, className }: { crumb: string; onBack: () => void; className?: string }) {
	return (
		<div className={cn("flex flex-col items-start gap-[31px]", className)}>
			<button
				type="button"
				aria-label="Back"
				onClick={onBack}
				className="flex size-[40px] cursor-pointer items-center justify-center overflow-clip rounded-[20px] bg-[#192238]"
			>
				<img alt="" src={D.chevron} className="size-[22px]" />
			</button>
			<p className="whitespace-pre font-geist text-[16px] font-medium leading-[21px] text-[#819abb]">{crumb}</p>
		</div>
	);
}
