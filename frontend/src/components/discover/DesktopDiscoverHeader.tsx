import { CalendarDays } from "lucide-react";
import { DESK } from "@/components/desktop/deskKit";

/** Desktop Discover's title and the line under it (the deck column's header). */
export function DesktopDiscoverTitle() {
	return (
		<header>
			<h1 className="font-heading text-[30px] font-semibold leading-[38px] text-white">Discover</h1>
			<p className="text-[14px]" style={{ color: DESK.muted }}>Swipe through companies and sectors. Quick insights. No jargon.</p>
		</header>
	);
}

/** Today's `count / limit` with a progress bar and "New picks daily" - sits in the top bar, freeing the Quick Look's column. */
export function DiscoverProgress({ count, limit }: { count: number; limit: number }) {
	const progress = Math.min(1, Math.max(0, count / Math.max(1, limit)));
	return (
		<div className="flex shrink-0 items-center gap-4 whitespace-nowrap text-[12.5px]" style={{ color: DESK.body }}>
			<div className="flex items-center gap-3" role="img" aria-label={`${count} of ${limit} cards today`}>
				<span className="tabular-nums">{count} / {limit}</span>
				<span className="h-[5px] w-[110px] overflow-hidden rounded-full" style={{ background: DESK.track }} aria-hidden="true">
					<span className="block h-full rounded-full" style={{ width: `${progress * 100}%`, background: DESK.bar }} />
				</span>
			</div>
			<span className="flex items-center gap-[6px]" style={{ color: DESK.muted }}>
				<CalendarDays className="h-[15px] w-[15px]" aria-hidden="true" /> New picks daily
			</span>
		</div>
	);
}
