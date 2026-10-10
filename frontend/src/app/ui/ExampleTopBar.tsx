import { type ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { EXAMPLE_TOPBAR_ID } from "@/app/AppShell";

/**
 * "Top bar" of the EXAMPLE desktop frames (00 References 2:6311 / 2:6451 / 2:6486): a 64px strip across
 * the content area with a breadcrumb at (40, 24) in Geist 13 #819abb, and an optional right-aligned
 * figure (the deck's "1 / 12", Geist Medium 13 at x 1340 of the 1440 frame, 68px from its right edge).
 * It renders into the shell's slot at the top of <main> (a portal), so a page's own positioned
 * wrappers and the 88px top padding never move it; it appears once the slot is known after mount.
 */
export function ExampleTopBar({ crumb, right }: { crumb: ReactNode; right?: ReactNode }) {
	const bar = (
		<div className="pointer-events-none absolute left-0 top-0 h-[64px] w-full overflow-clip" aria-hidden="true">
			<p className="absolute left-[40px] top-[24px] whitespace-pre font-geist text-[13px] leading-[17px] text-[#819abb]">{crumb}</p>
			{right !== undefined && (
				<p className="absolute right-[68px] top-[26px] whitespace-nowrap font-geist text-[13px] font-medium leading-[17px] text-[#819abb]">{right}</p>
			)}
		</div>
	);
	const [slot, setSlot] = useState<HTMLElement | null>(null);
	useEffect(() => {
		setSlot(document.getElementById(EXAMPLE_TOPBAR_ID));
	}, []);
	return slot ? createPortal(bar, slot) : null;
}
