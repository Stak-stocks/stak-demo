import { Link, useRouterState } from "@tanstack/react-router";
import { A } from "./assets";
import { fillHeight, type SizeClass, useSizeClass } from "./FitCanvas";
import { PrimaryButton } from "./ui/Button";

/** The app shell's layout route (src/routes/_app.tsx): its AppShell draws the page's <main> around every page inside it. */
const SHELL_ROUTE = "/_app";

/** The standalone block's classes (the approved 404: G1 label notfound). */
const STANDALONE =
	"flex w-full flex-col items-center justify-center bg-[#0a1020] font-geist text-[#f2f6fc] antialiased max-lg:min-h-svh! max-lg:px-[24px] max-sm:px-[16px]";
/** Inside the shell the same block, its height set by the column it sits in (shellFill) instead of the window's. */
const IN_SHELL = "flex w-full flex-col items-center justify-center bg-[#0a1020] font-geist text-[#f2f6fc] antialiased max-lg:px-[24px] max-sm:px-[16px]";

/**
 * The height the shell's content column has left below its top padding and above its bottom gutter, so the 404 drawn
 * inside the shell centres in what is visible and the page does not scroll into blank space (review r2's low 6: it
 * scrolled 112 px at 390x844, 120 at 820x1180, 63 at 1024x768, 88 at 1440x1024). AppShell.tsx's geometry: 1024 and wider,
 * the shell is fillHeight tall and the column starts 88 down (no bottom gutter); tablets, at least the window and 448,
 * 88 down and a 32 gutter below; phones, the window, under the 64 top bar (plus a notch's inset), 16 down and 32 below.
 */
export function shellFill(size: SizeClass): string {
	if (size === "phone") return "calc(100svh - 112px - env(safe-area-inset-top, 0px))";
	if (size === "tablet") return "calc(max(448px, 100svh) - 120px)";
	return `calc(${fillHeight} - 88px)`;
}

/**
 * The empty-state block of section 10 (empty box, Sora 26 title, 460-wide body, 240 button), for a path that does not exist.
 * Below 1024 it reflows (SPEC R3): the body is the column's width up to its 460, inside the 24 (tablet) / 16 (phone)
 * gutters, and the block centres in the window rather than in a 1024-tall frame.
 *
 * One main landmark per page (coordinator ruling N11c). Standalone (the router matched no route: the root draws this in
 * place of the page, src/routes/__root.tsx) this block is the page's <main>, and the root's error boundary around it is
 * a plain div. Drawn by a page of the app shell for a name it does not have (an unknown story, an unknown symbol:
 * _app.news_.$id.tsx, _app.stocks.$symbol.tsx) it sits inside AppShell's own <main>, so it is a plain div there: two
 * mains, one inside the other, were exposed before. Same box, same classes: nothing moves either way, except the height
 * inside the shell (shellFill).
 */
export function NotFound() {
	// Inside the shell: the shell's layout matched and the router itself reports nothing missing. The router's own
	// not-found (a path no route matches) is never drawn inside the shell: src/main.tsx sets notFoundMode "root", so it is
	// the root's whatever part of the path matched, and the root draws it standalone (outside the shell and the canvas).
	const inShell = useRouterState({
		select: (s) => s.matches.some((m) => m.routeId === SHELL_ROUTE) && !s.matches.some((m) => m.globalNotFound || m.status === "notFound"),
	});
	const size = useSizeClass();
	const Block = inShell ? "div" : "main";
	return (
		<Block className={inShell ? IN_SHELL : STANDALONE} style={{ minHeight: inShell ? shellFill(size) : fillHeight }}>
			<div className="flex flex-col items-center overflow-clip max-lg:w-full">
				<div className="relative h-[151px] w-[121.143px]">
					<img alt="" src={A.emptyBox} className="absolute left-[-5.26px] top-0 block h-[165.355px] w-[135.091px] max-w-none" />
				</div>
				<div className="h-[28px] w-[10px]" />
				<h1 className="whitespace-nowrap text-center font-sora text-[26px] font-semibold leading-[33px] text-white">Nothing here</h1>
				<div className="size-[10px]" />
				<p className="w-[460px] text-center font-geist text-[15px] leading-[22px] text-[#819abb] max-lg:w-full max-lg:max-w-[460px]">
					That page does not exist, or it moved. Your saves and your paper portfolio are where you left them.
				</p>
				<div className="h-[28px] w-[10px]" />
				<Link to="/home" className="block w-[240px]">
					<PrimaryButton as="span">Go home</PrimaryButton>
				</Link>
			</div>
		</Block>
	);
}
