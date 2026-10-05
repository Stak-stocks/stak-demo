import { DISC, cu } from "@/components/discover/discoverTheme";
import { PRESS, f, focusRing, sheetCard } from "@/components/phone/phone";

/** "N saved companies have something new." - companies counted, never rounded up (Android's UpdatesCard). */
function updatesLine(unreadCompanies: number): string {
	if (unreadCompanies === 1) return "1 saved company has something new.";
	if (unreadCompanies > 1) return `${unreadCompanies} saved companies have something new.`;
	return "You're up to date. Past updates are still here if you want them.";
}

/** Updates in your STAK: the companies with something new, and the way into them. */
export function UpdatesCard({ unreadCompanies, unread, onOpen }: { unreadCompanies: number; unread: number; onOpen: () => void }) {
	return (
		<button
			type="button"
			onClick={onOpen}
			className={`flex w-full flex-col text-left ${PRESS}`}
			style={{ gap: cu(12), ...sheetCard(16), border: `${cu(1)} solid rgba(105,179,202,0.27)`, padding: cu(16), ...focusRing }}
		>
			<div className="flex items-center" style={{ gap: cu(8) }}>
				<span style={{ font: f(400, 15) }} aria-hidden="true">🔔</span>
				<p style={{ font: f(600, 15, 19, "heading"), color: "#fff" }}>Updates in your STAK</p>
				{unread > 0 && (
					<span className="ml-auto grid shrink-0 place-items-center rounded-full" style={{ width: cu(24), height: cu(24), background: DISC.blue, font: f(500, 12), color: "#fff" }}>
						{unread}
					</span>
				)}
			</div>
			<p style={{ font: f(400, 13, 19), color: DISC.body }}>{updatesLine(unreadCompanies)}</p>
			<div className="grid w-full place-items-center" style={{ height: cu(44), borderRadius: cu(10), background: "#69B3CA" }}>
				<span style={{ font: f(500, 14), color: DISC.pageBg, whiteSpace: "pre" }}>{unread > 0 ? "See what changed  →" : "Read them again  →"}</span>
			</div>
		</button>
	);
}
