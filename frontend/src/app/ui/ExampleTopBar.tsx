import { type ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { EXAMPLE_TOPBAR_ID } from "@/app/AppShell";
import { navTransition } from "@/app/Sidebar";

/**
 * "Top bar" of the EXAMPLE desktop frames (00 References 2:6313 / 2:6453 / 2:6488): a 1224 × 64 strip across the
 * content area (x 216) holding the breadcrumb at (40, 24), Geist Regular 13 #819abb with the frame's double spaces
 * around its separator (whitespace kept), and an optional figure on the right: the deck's "1 / 12" (2:6455, Geist
 * Medium 13 #819abb, a 32 box at x 1340 / y 26 of the 1440 frame, so its right edge stays 68 from the window's right
 * edge at any width). Both are auto-width text boxes, their glyph run rounded up to a whole pixel and left-aligned,
 * as Figma sizes them.
 * It renders into the shell's slot at the top of <main> (a portal), so a page's own positioned wrappers and the 88px
 * top padding never move it; it appears once the slot is known after mount. The breadcrumb is plain text in Figma (no
 * reaction), read as the page's location; the right figure is announced by the page itself (the deck's status line).
 * The breadcrumb starts where the page's column does (256 = the 216 rail + 40 in the frames); with the rail closed the
 * column starts 24 after it (96), so the breadcrumb follows it there, on the rail's own 0.28 s ease-out.
 * `heading`: the crumb is the page's title for assistive tech (an <h1>, drawn exactly as the text it is), for a page
 * whose content has no title of its own (the deck: "Discover · Today's deck"); the stock page titles itself.
 * Below 1024 the bar keeps its 64 and its type; the crumb starts where the compact column does (tablet: 24 after the
 * closed rail, the rule above; phone: the 16 gutter) and the right figure keeps its 18 inside the column's right edge
 * (68 = 50 + 18 at 1024+; tablet 24 + 18, phone 16 + 18).
 */
export function ExampleTopBar({ crumb, right, heading = false }: { crumb: ReactNode; right?: ReactNode; heading?: boolean }) {
	const Crumb = heading ? "h1" : "p";
	const bar = (
		<div className="pointer-events-none absolute left-0 top-0 h-[64px] w-full overflow-clip">
			<Crumb
				className="absolute left-[40px] top-[24px] w-[calc-size(max-content,round(up,size,1px))] whitespace-pre text-left font-geist text-[13px] leading-[17px] text-[#819abb] max-sm:left-[16px] [.stak-figma:has(>aside[data-nav=closed])_&]:left-[24px]"
				style={{ transition: navTransition("left") }}
			>
				{crumb}
			</Crumb>
			{right !== undefined && (
				<p
					aria-hidden="true"
					className="absolute right-[68px] top-[26px] w-[calc-size(max-content,round(up,size,1px))] whitespace-nowrap text-left font-geist text-[13px] font-medium leading-[17px] text-[#819abb] max-lg:right-[42px] max-sm:right-[34px]"
				>
					{right}
				</p>
			)}
		</div>
	);
	const [slot, setSlot] = useState<HTMLElement | null>(null);
	useEffect(() => {
		setSlot(document.getElementById(EXAMPLE_TOPBAR_ID));
	}, []);
	return slot ? createPortal(bar, slot) : null;
}
