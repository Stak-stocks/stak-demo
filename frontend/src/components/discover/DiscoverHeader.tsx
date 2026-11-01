import { DISC, cu } from "./discoverTheme";

/** 44u ring: the teal arc grows clockwise from 12 o'clock as the day's cards are used up. */
function ProgressRing({ progress }: { progress: number }) {
	const r = 18;
	const circumference = 2 * Math.PI * r;
	return (
		<svg viewBox="0 0 44 44" className="absolute inset-0 h-full w-full" fill="none" aria-hidden="true">
			<circle cx="22" cy="22" r={r} stroke={DISC.divider} strokeWidth="4" />
			<circle
				cx="22" cy="22" r={r}
				stroke={DISC.teal}
				strokeWidth="4"
				strokeLinecap="round"
				strokeDasharray={`${circumference * Math.min(1, Math.max(0, progress))} ${circumference}`}
				transform="rotate(-90 22 22)"
			/>
		</svg>
	);
}

/** Android's Discover header: the title, a `count/limit` ring, and the deck's label beneath. */
export function DiscoverHeader({ count, limit, label, atEnd = false }: { count: number; limit: number; label: string; atEnd?: boolean }) {
	return (
		<header style={{ padding: `${cu(atEnd ? 20 : 10)} ${cu(20)} 0`, display: "flex", flexDirection: "column", gap: cu(atEnd ? 8 : 5) }}>
			<div className="flex items-center justify-between">
				<h1
					style={{
						font: `600 ${cu(26)}/${cu(33)} var(--font-heading)`,
						color: atEnd ? DISC.ink : "#fff",
						transform: atEnd ? `translateY(${cu(-7.5)})` : undefined,
					}}
				>
					Discover
				</h1>
				<div
					className="relative grid shrink-0 place-items-center"
					style={{ width: cu(44), height: cu(44) }}
					role="img"
					aria-label={`${count} of ${limit} cards today`}
				>
					<ProgressRing progress={count / Math.max(1, limit)} />
					<span style={{ font: `400 ${cu(11)}/${cu(14)} var(--font-heading)`, color: "#fff" }}>{count}/{limit}</span>
				</div>
			</div>
			<p
				className="truncate"
				style={{
					font: `500 ${cu(10)}/${cu(13)} var(--font-body)`,
					letterSpacing: cu(atEnd ? 0.8 : 0.9),
					color: atEnd ? DISC.muted : DISC.faint,
					paddingLeft: cu(atEnd ? 0 : 2),
				}}
			>
				{label}
			</p>
		</header>
	);
}
