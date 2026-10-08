// "What changed" wording shared by the phone page and the desktop two-pane page.
import type { StockUpdateDto } from "@/lib/api";

export function kindLabel(kind: string): string {
	switch (kind) {
		case "earnings": return "Earnings";
		case "guidance": return "Outlook";
		case "analyst": return "Analysts";
		case "business": return "Company news";
		default: return "Update";
	}
}

export function updateSourceLine(update: StockUpdateDto): string | null {
	const names = [...new Set(update.sources.map((s) => s.source).filter(Boolean))];
	if (names.length === 0) return null;
	const extra = update.sources.length - 1;
	if (names.length === 1 && extra > 0) return `From ${names[0]} and ${extra} more ${extra === 1 ? "headline" : "headlines"}`;
	if (names.length === 1) return `From ${names[0]}`;
	return `From ${names[0]} and ${names.length - 1} more`;
}

/** How old the change is, dated from the newest headline behind it, not from when STAK noticed it.
 *  Android's newsAge: "5m" / "3h" / "2d", and "0m" reads "Just now". */
export function ageOf(update: StockUpdateDto): string | null {
	const newestSec = update.sources.reduce((max, s) => (s.datetime > max ? s.datetime : max), 0);
	const ms = newestSec > 0 ? newestSec * 1000 : Date.parse(update.occurredAt);
	if (!ms || Number.isNaN(ms)) return null;
	const secs = Math.max(0, Math.floor((Date.now() - ms) / 1000));
	const age = secs < 3600 ? `${Math.floor(secs / 60)}m` : secs < 86400 ? `${Math.floor(secs / 3600)}h` : `${Math.floor(secs / 86400)}d`;
	return age === "0m" ? "Just now" : `${age} ago`;
}

export function subtitleFor(fresh: StockUpdateDto[]): string {
	if (fresh.length === 0) return "Nothing new at your saved companies.";
	const companies = new Set(fresh.map((u) => u.ticker)).size;
	return companies === 1 ? "1 saved company has something new" : `${companies} saved companies have something new`;
}

/** Updates grouped by company, keeping the server's order (newest first). */
export function groupByCompany(updates: StockUpdateDto[]): StockUpdateDto[][] {
	const map = new Map<string, StockUpdateDto[]>();
	for (const u of updates) {
		const list = map.get(u.ticker);
		if (list) list.push(u);
		else map.set(u.ticker, [u]);
	}
	return [...map.values()];
}
