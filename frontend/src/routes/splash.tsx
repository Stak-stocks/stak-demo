import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AU } from "@/app/auth/assets";
import { DISSOLVE, SPLASH_DELAY_MS, SPLASH_GLASS_WAIT_MS } from "@/app/auth/motion";
import { AUTH_INK } from "@/app/auth/ui";
import { fillHeight } from "@/app/FitCanvas";
import { cn } from "@/lib/utils";

/** The subtitle's fill (2:5618: white at 70%) for `stak-ink`: the inverse keeps the paint's alpha. */
const INK_SUBTITLE = "stak-ink [--ink:rgba(255,255,255,0.7)]";

// the value stays as written (1 or true), so opening /splash?hold=1 does not rewrite the URL on load
type SplashSearch = { hold?: true | 1 | "1" };

export const Route = createFileRoute("/splash")({
	validateSearch: (s: Record<string, unknown>): SplashSearch => ({
		hold: s.hold === true || s.hold === 1 || s.hold === "1" ? s.hold : undefined,
	}),
	component: SplashPage,
});

/**
 * Figma 2:5601 "Desktop · Splash". The prototype (phone 1:883) has one reaction: AFTER_TIMEOUT 1.2 s -> Sign up, DISSOLVE
 * 0.35 s ease-out (?hold=1 freezes it). Nothing on it is clickable. The 1.2 s count from the moment the whole frame is
 * on screen: the glass is a 2048 px image, so the count waits for it to arrive (at most SPLASH_GLASS_WAIT_MS) instead
 * of dissolving away before it ever shows on a cold load.
 * Bigger windows: the "Splash stack" stays centred in the window, as in the frame (547 + 173 = 720 across, 31 above the
 * middle); the glass bleeds off the frame's top-right corner (art 881-1439 x 0-680), so it stays pinned to the window's
 * top-right corner, bleeding off both edges at every size. Laptops (1024-1439): FitCanvas scales the 1440 frame down.
 * Below 1024 (phones, tablets: src/app/auth/responsive.css) the stack keeps its place (centred, 31 above the middle) at
 * Figma's size and the glass scales as one unit into the same corner, so it stays clear of the text as in the frame.
 * The page is its own compositing layer (`will-change: transform`) so its text is drawn grayscale, as Figma draws it,
 * not with Chrome's coloured sub-pixel (LCD) edges.
 */
function SplashPage() {
	const { hold } = Route.useSearch();
	const navigate = useNavigate();
	const glass = useRef<HTMLImageElement>(null);
	const [glassReady, setGlassReady] = useState(false);
	// an image the browser already has can finish before React listens for it
	useLayoutEffect(() => {
		if (glass.current?.complete) setGlassReady(true);
	}, []);
	useEffect(() => {
		if (glassReady) return;
		const t = setTimeout(() => setGlassReady(true), SPLASH_GLASS_WAIT_MS);
		return () => clearTimeout(t);
	}, [glassReady]);
	useEffect(() => {
		if (hold || !glassReady) return;
		const t = setTimeout(() => navigate({ to: "/signup", replace: true, viewTransition: DISSOLVE }), SPLASH_DELAY_MS);
		return () => clearTimeout(t);
	}, [hold, glassReady, navigate]);
	return (
		<div data-splash-layout="" className="stak-figma relative w-full overflow-clip bg-[#0a1020] font-geist antialiased will-change-transform" style={{ minHeight: fillHeight }}>
			{/* 2:5602 "Glass_icon_with_tilt_2K…": 1254.379 square, 40%, rotated -48.4343° (Figma's counter-clockwise value, so
			    CSS turns it 48.4343° clockwise); its 1770.774 box at 463 / -702 in the frame, i.e. 793.774 past the right
			    edge and 702 above the top: pinned there, so the art keeps bleeding off the window's top-right corner. The
			    image's CROP offset (0.55% / 0.49%) is a translate, not left / top, so Chrome does not snap it to whole pixels
			    before rotating. Chrome resamples this 1254 px rotation half a pixel higher than Figma does: the 0.5 px
			    translate halves the difference with Figma's render (mean 1.13 -> 0.55). */}
			<div data-splash-glass="" className="absolute right-[-793.774px] top-[-702px] flex size-[1770.774px] translate-y-[0.5px] items-center justify-center">
				<div className="flex-none rotate-[48.4343deg]">
					<div className="relative size-[1254.379px] opacity-40">
						<div className="pointer-events-none absolute inset-0 overflow-hidden">
							<img
								ref={glass}
								alt=""
								src={AU.glass}
								onLoad={() => setGlassReady(true)}
								onError={() => setGlassReady(true)}
								className="absolute left-0 top-0 size-full max-w-none translate-x-[0.55%] translate-y-[0.49%]"
								fetchPriority="high"
							/>
						</div>
					</div>
				</div>
			</div>
			{/* 2:5603 "Splash stack": a vertical auto layout (items centred, gap 0) 346 wide (the title's box), at 547 / 374:
			    the 64 logo (2:5604), a 10x46 spacer frame (2:5615), the title (2:5616, Sora SemiBold 38 / auto 48), a 10x14
			    spacer (2:5617) and the two-line subtitle (2:5618, Geist 16 / auto 21, centred, white 70%, 232 x 42: one text
			    layer whose characters hold the line break and the leading space of " your language"). */}
			<div data-splash-stack="" className="absolute left-[calc(50%-173px)] top-[calc(50%-138px)] flex flex-col items-center overflow-clip">
				<img alt="" src={AU.splashLogo} className="size-[64px] shrink-0" width={64} height={64} />
				<div className="h-[46px] w-[10px] shrink-0" />
				<p data-splash-title="" className={cn("w-[346px] whitespace-nowrap font-sora text-[38px] font-semibold leading-[48px] text-white", AUTH_INK.white)}>
					Welcome to STAK
				</p>
				<div className="h-[14px] w-[10px] shrink-0" />
				<p className={cn("w-[232px] whitespace-pre text-center font-geist text-[16px] leading-[21px] text-[rgba(255,255,255,0.7)]", INK_SUBTITLE)}>
					{"The stock market finally speaks\n your language"}
				</p>
			</div>
		</div>
	);
}
