import { Link } from "@tanstack/react-router";
import { A } from "./assets";
import { fillHeight } from "./FitCanvas";
import { GradientButton } from "./simulate/ui";

/** The empty-state block of section 10 (empty box, Sora 26 title, 460-wide body, 240 button), for a path that does not exist. */
export function NotFound() {
	return (
		<main className="flex w-full flex-col items-center justify-center bg-[#0a1020] font-geist text-[#f2f6fc] antialiased" style={{ minHeight: fillHeight }}>
			<div className="flex flex-col items-center overflow-clip">
				<div className="relative h-[151px] w-[121.143px]">
					<img alt="" src={A.emptyBox} className="absolute left-[-5.26px] top-0 block h-[165.355px] w-[135.091px] max-w-none" />
				</div>
				<div className="h-[28px] w-[10px]" />
				<h1 className="whitespace-nowrap text-center font-sora text-[26px] font-semibold leading-[33px] text-white">Nothing here</h1>
				<div className="size-[10px]" />
				<p className="w-[460px] text-center font-geist text-[15px] leading-[22px] text-[#819abb]">
					That page does not exist, or it moved. Your saves and your paper portfolio are where you left them.
				</p>
				<div className="h-[28px] w-[10px]" />
				<Link to="/home" className="block w-[240px]">
					<GradientButton>Go home</GradientButton>
				</Link>
			</div>
		</main>
	);
}
