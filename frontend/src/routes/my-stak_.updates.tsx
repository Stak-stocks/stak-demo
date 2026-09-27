import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, type KeyboardEvent } from "react";
import { getBrandLogoUrl } from "@stak/shared";
import { useUpdates } from "@/hooks/useUpdates";
import { useIsMobile } from "@/hooks/use-mobile";
import { UpdatesDesktop } from "@/components/mystak/desktop/UpdatesDesktop";
import { useMyStakData } from "@/hooks/useMyStakData";
import type { StockUpdateDto } from "@/lib/api";
import { ageOf, groupByCompany, kindLabel, subtitleFor, updateSourceLine } from "@/lib/updatesText";
import { DISC, cu } from "@/components/discover/discoverTheme";
import { PRESS, PhonePage, SubPageBar, f, focusRing } from "@/components/phone/phone";

export const Route = createFileRoute("/my-stak_/updates")({
	component: UpdatesRoute,
});

/** Desktop: the two-pane page; the phone keeps Android's list of cards. */
function UpdatesRoute() {
	return useIsMobile() ? <UpdatesPage /> : <UpdatesDesktop />;
}

const MAX_CHANGES_PER_CARD = 3;

function LogoTile({ ticker, company, logo }: { ticker: string; company: string; logo: string | null }) {
	const [failed, setFailed] = useState(false);
	return (
		<div className="grid shrink-0 place-items-center overflow-hidden" style={{ width: cu(34), height: cu(34), borderRadius: cu(9), background: DISC.avatar }} aria-hidden="true" data-ticker={ticker}>
			{logo && !failed ? (
				<img src={logo} alt="" onError={() => setFailed(true)} style={{ width: cu(26), height: cu(26), objectFit: "contain" }} />
			) : (
				<span style={{ font: f(600, 14, undefined, "heading"), color: DISC.muted }}>{company.slice(0, 1).toUpperCase()}</span>
			)}
		</div>
	);
}

/** One company's changes. The whole card is the tap target (it opens the stock and marks the company read);
 *  "+N more" only expands in place. */
function CompanyUpdateCard({ updates, logo, onOpen }: { updates: StockUpdateDto[]; logo: string | null; onOpen: (ticker: string) => void }) {
	const [expanded, setExpanded] = useState(false);
	const first = updates[0]!;
	const unread = updates.some((u) => !u.read);
	const shown = expanded ? updates : updates.slice(0, MAX_CHANGES_PER_CARD);
	const age = ageOf(first);
	const open = () => onOpen(first.ticker);
	const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
		if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); open(); }
	};

	return (
		<div
			role="button"
			tabIndex={0}
			aria-label={`${first.company}: ${first.title}`}
			onClick={open}
			onKeyDown={onKey}
			className={`cursor-pointer text-left ${PRESS}`}
			style={{ display: "flex", flexDirection: "column", gap: cu(8), borderRadius: cu(16), background: DISC.sheet, padding: cu(16), ...focusRing }}
		>
			<div className="flex items-start" style={{ gap: cu(10) }}>
				<LogoTile ticker={first.ticker} company={first.company} logo={logo} />
				<div className="min-w-0 flex-1" style={{ display: "flex", flexDirection: "column", gap: cu(2) }}>
					<p style={{ font: f(600, 14, 18, "heading"), color: "#fff" }}>{first.company}</p>
					<p style={{ font: f(400, 11, 14), color: DISC.muted }}>{first.ticker} · {kindLabel(first.kind)}{age ? ` · ${age}` : ""}</p>
				</div>
				{unread && <span className="shrink-0 rounded-full" style={{ width: cu(8), height: cu(8), background: DISC.teal }} aria-label="Unread" />}
			</div>

			{shown.map((change, i) => {
				const meta = [ageOf(change), updateSourceLine(change)].filter(Boolean).join(" · ");
				return (
					<div key={change.id} style={{ display: "flex", flexDirection: "column", gap: cu(8), marginTop: i > 0 ? cu(4) : 0 }}>
						<p style={{ font: f(600, 16, 21, "heading"), color: "#fff" }}>{change.title}</p>
						<p style={{ font: f(400, 13, 19), color: DISC.body }}>{change.body}</p>
						{change.watch && <p style={{ font: f(400, 12, 16), color: DISC.muted }}>{change.watch}</p>}
						{meta && <p style={{ font: f(400, 11, 14), color: DISC.faint }}>{meta}</p>}
					</div>
				);
			})}

			{!expanded && updates.length > MAX_CHANGES_PER_CARD && (
				<button
					type="button"
					onClick={(e) => { e.stopPropagation(); setExpanded(true); }}
					className={`w-fit ${PRESS}`}
					style={{ font: f(500, 12, 16), color: DISC.teal, ...focusRing }}
				>
					+{updates.length - MAX_CHANGES_PER_CARD} more this week
				</button>
			)}

			<span style={{ marginTop: cu(2), font: f(500, 13, 17), color: DISC.teal }}>Understand this change ›</span>
		</div>
	);
}

function UpdateSection({ title, updates, logoOf, onOpen }: {
	title: string;
	updates: StockUpdateDto[];
	logoOf: (ticker: string) => string | null;
	onOpen: (ticker: string) => void;
}) {
	// Grouped by company, in the server's order (newest first).
	const byTicker = useMemo(() => groupByCompany(updates), [updates]);

	return (
		<>
			<h2 style={{ paddingTop: cu(4), font: f(500, 11, 14), letterSpacing: cu(0.8), color: DISC.faint }}>{title}</h2>
			{byTicker.map((group) => (
				<CompanyUpdateCard key={group[0]!.ticker} updates={group} logo={logoOf(group[0]!.ticker)} onOpen={onOpen} />
			))}
		</>
	);
}

function UpdatesPage() {
	const navigate = useNavigate();
	const { updates, markCompanyRead } = useUpdates();
	const { allBrands } = useMyStakData();

	const fresh = updates.filter((u) => !u.read);
	const earlier = updates.filter((u) => u.read);
	const logoOf = (ticker: string) => {
		const brand = allBrands.find((b) => b.ticker.toUpperCase() === ticker.toUpperCase());
		return brand ? getBrandLogoUrl(brand) : null;
	};

	function handleOpen(ticker: string) {
		markCompanyRead(ticker);
		navigate({ to: "/stock/$symbol", params: { symbol: ticker } });
	}

	// Android has no loading, empty or error card here: with nothing to show, only the title and subtitle appear
	// (the overview's Updates card is what reports a failed load).
	return (
		<PhonePage>
			<SubPageBar onBack={() => navigate({ to: "/my-stak" })} />
			<div style={{ display: "flex", flexDirection: "column", gap: cu(12), padding: `${cu(8)} ${cu(20)} ${cu(32)}` }}>
				<div style={{ display: "flex", flexDirection: "column", gap: cu(4) }}>
					<h1 style={{ font: f(600, 24, 30, "heading"), color: "#fff" }}>What changed</h1>
					<p style={{ font: f(400, 13, 17), color: DISC.muted }}>{subtitleFor(fresh)}</p>
				</div>

				{fresh.length > 0 && <UpdateSection title="New" updates={fresh} logoOf={logoOf} onOpen={handleOpen} />}

				{updates.length > 0 && (
					<div className="flex items-center" style={{ gap: cu(8), paddingTop: cu(4) }}>
						<span style={{ font: f(400, 13), color: DISC.faint }} aria-hidden="true">✓</span>
						<span style={{ font: f(400, 12, 16), color: DISC.faint }}>
							{fresh.length === 0 ? "You're up to date on your saved companies." : "That's all the new updates."}
						</span>
					</div>
				)}

				{earlier.length > 0 && <UpdateSection title="Earlier · already opened" updates={earlier} logoOf={logoOf} onOpen={handleOpen} />}
			</div>

		</PhonePage>
	);
}
