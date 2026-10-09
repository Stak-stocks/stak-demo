import type { ComponentProps } from "react";
import { GHOST_FILTER, GLOW, HAIRLINE_COLOR, hairline } from "@/app/ui/Button";
import { cn } from "@/lib/utils";

/**
 * The frames beside the canon primary (`@/app/ui/Button`): Ghost is the primary's box without a fill
 * ("Learn more", "Unsave"), SheetBackButton is the sheets' "Back" row.
 */
export function GhostButton({ className, style, ...rest }: ComponentProps<"button">) {
	return (
		<button
			type="button"
			className={cn(
				"stak-press flex h-[52px] w-full cursor-pointer items-center justify-center overflow-clip whitespace-nowrap rounded-[6px] px-[14px] py-[7px] font-geist text-[14px] font-medium leading-[20.69px] text-white",
				className,
			)}
			style={{ boxShadow: `${hairline(0.361, HAIRLINE_COLOR)}, ${GLOW}`, ...style }}
			{...rest}
		/>
	);
}

/** The sheet's "Back" row: h51 · r5.781 · hairline rgba(52,59,79,.33) · Sora 14.453 #819abb. */
export function SheetBackButton({ className, style, ...rest }: ComponentProps<"button">) {
	return (
		<button
			type="button"
			className={cn(
				"stak-press flex h-[51px] w-full cursor-pointer items-center justify-center whitespace-nowrap rounded-[5.781px] px-[14px] py-[7px] font-sora text-[14.453px] text-[#819abb]",
				className,
			)}
			style={{ boxShadow: hairline(0.361, "rgba(52,59,79,0.33)"), filter: GHOST_FILTER, ...style }}
			{...rest}
		/>
	);
}
