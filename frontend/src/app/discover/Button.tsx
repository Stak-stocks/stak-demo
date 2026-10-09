import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/**
 * The button canon from the Figma references: r6 · h52 · Geist Medium 14/20.69 · hairline
 * rgba(101,158,173,.63) · the faint (82,170,199) glow. Primary carries the cyan gradient,
 * Ghost is the same frame without a fill.
 */
const base =
	"stak-press flex h-[52px] w-full cursor-pointer items-center justify-center overflow-clip rounded-[6px] border-[0.361px] border-solid border-[rgba(101,158,173,0.63)] font-geist text-[14px] font-medium leading-[20.69px] text-white";

const primaryBg =
	"linear-gradient(180deg, rgb(166, 228, 247) 8.8889%, rgb(93, 168, 191) 39.189%, rgb(60, 152, 180) 72.549%), linear-gradient(90deg, rgb(44, 157, 188) 0%, rgb(44, 157, 188) 100%)";
const primaryShadow =
	"0px 77.322px 21.679px 0px rgba(82,170,199,0), 0px 49.862px 19.511px 0px rgba(82,170,199,0.01), 0px 28.183px 16.621px 0px rgba(82,170,199,0.03)";
const ghostFilter =
	"drop-shadow(0px 77.322px 10.839px rgba(82,170,199,0)) drop-shadow(0px 49.862px 9.756px rgba(82,170,199,0.01)) drop-shadow(0px 28.183px 8.31px rgba(82,170,199,0.03))";

export function PrimaryButton({ className, style, ...rest }: ComponentProps<"button">) {
	return (
		<button
			type="button"
			className={cn(base, className)}
			style={{ backgroundImage: primaryBg, boxShadow: primaryShadow, ...style }}
			{...rest}
		/>
	);
}

export function GhostButton({ className, style, ...rest }: ComponentProps<"button">) {
	return <button type="button" className={cn(base, className)} style={{ filter: ghostFilter, ...style }} {...rest} />;
}

/** The sheet's "Back" row: h51 · r5.781 · border rgba(52,59,79,.33) · Sora 14.453 #819abb. */
export function SheetBackButton({ className, ...rest }: ComponentProps<"button">) {
	return (
		<button
			type="button"
			className={cn(
				"stak-press flex h-[51px] w-full cursor-pointer items-center justify-center rounded-[5.781px] border-[0.361px] border-solid border-[rgba(52,59,79,0.33)] px-[14px] py-[7px] font-sora text-[14.453px] text-[#819abb]",
				className,
			)}
			style={{
				filter:
					"drop-shadow(0px 77.322px 10.839px rgba(82,170,199,0)) drop-shadow(0px 49.862px 9.756px rgba(82,170,199,0.01)) drop-shadow(0px 28.183px 8.31px rgba(82,170,199,0.05)) drop-shadow(0px 12.285px 6.142px rgba(82,170,199,0.09)) drop-shadow(0px 2.891px 3.252px rgba(82,170,199,0.1))",
			}}
			{...rest}
		/>
	);
}
