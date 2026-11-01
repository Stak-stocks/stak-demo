import { useState, type ReactNode } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { Eye, Info, Newspaper, Search, ShieldCheck, TrendingUp, type LucideIcon } from "lucide-react";
import {
	getAnalystActions, getAnalystData, getCompanyNews, getDailyMove, getEarnings, getPeerMetrics, getRiskWatch, getStockData,
	type LiveMetrics, type StockUpdateDto,
} from "@/lib/api";
import { beatsPeers, lessonFor, newsCloseLine, parsePct } from "@/lib/stockPage";
import { newsAge } from "@/lib/newsText";
import { DISC, cu } from "@/components/discover/discoverTheme";
import { IconTile, PRESS, f, focusRing, sheetCard } from "@/components/phone/phone";

const INK = "#F2F6FC";
const GREEN = DISC.green;
const RED = "#FF5A6A";

function Card({ children, gap = 12, onClick, label }: { children: ReactNode; gap?: number; onClick?: () => void; label?: string }) {
	const style = { display: "flex", flexDirection: "column", gap: cu(gap), ...sheetCard(16), padding: `${cu(14)} ${cu(16)}`, textAlign: "left" } as const;
	return onClick ? (
		<button type="button" onClick={onClick} aria-label={label} className={`w-full ${PRESS}`} style={{ ...style, ...focusRing }}>{children}</button>
	) : (
		<section style={style} aria-label={label}>{children}</section>
	);
}

function CardTitle({ icon, tint, title, size = 28, glyph = 16 }: { icon: LucideIcon; tint: string; title: string; size?: number; glyph?: number }) {
	return (
		<div className="flex items-center" style={{ gap: cu(10) }}>
			<IconTile icon={icon} tint={tint} glyphColor={DISC.muted} size={size} glyph={glyph} />
			<h2 style={{ font: f(600, 15, undefined, "heading"), color: INK }}>{title}</h2>
		</div>
	);
}

const Muted = ({ children, size = 11, lh }: { children: ReactNode; size?: number; lh?: number }) => <p style={{ font: f(400, size, lh), color: DISC.muted }}>{children}</p>;
const Kicker = ({ children, spacing = 0.8, weight = 500 }: { children: ReactNode; spacing?: number; weight?: number }) => (
	<p style={{ font: f(weight, 10), letterSpacing: cu(spacing), color: DISC.muted }}>{children}</p>
);

// ── Since you saved ──────────────────────────────────────────────────────────────────────────────
function updateSourceLine(update: StockUpdateDto): string | null {
	const names = [...new Set(update.sources.map((s) => s.source).filter(Boolean))];
	if (names.length === 0) return null;
	const extra = update.sources.length - 1;
	if (names.length === 1 && extra > 0) return `From ${names[0]} and ${extra} more ${extra === 1 ? "headline" : "headlines"}`;
	if (names.length === 1) return `From ${names[0]}`;
	return `From ${names[0]} and ${names.length - 1} more`;
}

export function SinceYouSavedCard({ value, tone, body, changes, unreadOnEntry }: {
	value: string;
	tone: "up" | "down" | "muted";
	body: string;
	changes: StockUpdateDto[];
	/** Update ids that were unread when the page opened: their dots keep the unread colour for this visit. */
	unreadOnEntry: Set<number>;
}) {
	const color = tone === "up" ? GREEN : tone === "down" ? RED : DISC.muted;
	return (
		<Card label="Since you saved">
			<div className="flex items-center" style={{ gap: cu(8) }}>
				<svg viewBox="0 0 11 11" style={{ width: cu(12), height: cu(12) }} fill={DISC.muted} aria-hidden="true"><path d="M2 1h7v9L5.5 7.6 2 10z" /></svg>
				<span style={{ font: f(500, 10), letterSpacing: cu(0.8), color: DISC.muted }}>SINCE YOU SAVED</span>
				<span style={{ font: f(500, 12), color }}>{value}</span>
			</div>
			<Muted lh={14}>{body}</Muted>
			{changes.length > 0 && (
				<>
					<div style={{ height: cu(1), background: "#232B3D" }} />
					<Kicker>RECENT CHANGES</Kicker>
					{changes.slice(0, 2).map((c) => {
						const source = updateSourceLine(c);
						return (
							<div key={c.id} className="flex items-start" style={{ gap: cu(8) }}>
								<span className="shrink-0 rounded-full" style={{ width: cu(6), height: cu(6), marginTop: cu(5), background: unreadOnEntry.has(c.id) ? DISC.blue : DISC.muted }} aria-hidden="true" />
								<div style={{ display: "flex", flexDirection: "column", gap: cu(2) }}>
									<p style={{ font: f(500, 12, 16), color: "#fff" }}>{c.title}</p>
									<p style={{ font: f(400, 11, 15), color: DISC.muted }}>{c.body}</p>
									{c.watch && <p style={{ font: f(400, 11, 15), color: DISC.muted }}>{c.watch}</p>}
									{source && <p style={{ font: f(400, 10, 14), color: DISC.muted }}>{source}</p>}
								</div>
							</div>
						);
					})}
				</>
			)}
		</Card>
	);
}

// ── Risk snapshot + What to watch ────────────────────────────────────────────────────────────────
const CHIP: Record<string, { bg: string; ink: string }> = {
	Elevated: { bg: "rgba(232,184,109,0.2)", ink: "#E8C08A" },
	Lower: { bg: "rgba(42,51,70,0.08)", ink: DISC.muted },
};

export function RiskAndWatch({ symbol }: { symbol: string }) {
	const { data, isPending, isError } = useQuery({ queryKey: ["risk-watch", symbol], queryFn: () => getRiskWatch(symbol), staleTime: 60 * 60 * 1000, retry: 0 });
	const risks = data?.risks ?? [];
	const watch = data?.watch ?? [];
	return (
		<>
			<Card gap={risks.length ? 12 : 10} label="Risk snapshot">
				<CardTitle icon={ShieldCheck} tint="#E8B86D" title="Risk snapshot" />
				{isPending && <p role="status" style={{ font: f(400, 12), color: DISC.muted }}>Reading this company's risks…</p>}
				{isError && <p style={{ font: f(400, 12, 16), color: DISC.muted }}>STAK couldn't load this company's risks right now - that doesn't mean it has none.</p>}
				{risks.length > 0 && <Muted>What could go wrong at this company</Muted>}
				{risks.map((r) => {
					const chip = r.level ? CHIP[r.level] ?? { bg: "rgba(58,70,94,0.12)", ink: DISC.body } : null;
					return (
						<div key={r.label} style={{ display: "flex", flexDirection: "column", gap: cu(4) }}>
							<div className="flex items-center">
								<span style={{ font: f(500, 13), color: "#fff" }}>{r.label}</span>
								<span className="flex-1" />
								{chip && r.level && <span style={{ borderRadius: 999, padding: `${cu(3)} ${cu(10)}`, background: chip.bg, color: chip.ink, font: f(500, 11) }}>{r.level}</span>}
							</div>
							<p style={{ font: f(400, 11, 15), color: DISC.muted }}>{r.note}</p>
						</div>
					);
				})}
			</Card>
			{/* Hidden when the read failed or came back empty; nothing to say beats a made-up line. */}
			{(isPending || watch.length > 0) && (
				<Card label="What to watch next">
					<CardTitle icon={Eye} tint="#69B3CA" title="What to watch next" />
					{isPending ? <p style={{ font: f(400, 12), color: DISC.muted }}>Working out what matters next…</p> : (
						<>
							<Muted>Key questions to follow</Muted>
							{watch.map((w, i) => (
								<div key={w.title} className="flex items-start" style={{ gap: cu(10) }}>
									<span className="grid shrink-0 place-items-center" style={{ width: cu(24), height: cu(24), borderRadius: cu(8), background: "rgba(105,179,202,0.12)", font: f(500, 10), color: "#69B3CA" }}>{String(i + 1).padStart(2, "0")}</span>
									<div style={{ display: "flex", flexDirection: "column", gap: cu(2) }}>
										<p style={{ font: f(500, 13), color: "#fff" }}>{w.title}</p>
										<p style={{ font: f(400, 11, 15), color: DISC.muted }}>{w.note}</p>
									</div>
								</div>
							))}
						</>
					)}
				</Card>
			)}
		</>
	);
}

// ── News signal ──────────────────────────────────────────────────────────────────────────────────
const isoDayLabel = (iso: string) => new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });

export function NewsSignalCard({ symbol, name, changePct }: { symbol: string; name: string; changePct: number | null }) {
	const direction = changePct == null ? null : changePct > 0.15 ? "up" : changePct < -0.15 ? "down" : "flat";
	const move = useQuery({
		queryKey: ["daily-move", symbol, direction],
		queryFn: () => getDailyMove(symbol, changePct ?? undefined, name),
		enabled: direction !== null,
		staleTime: 30 * 60 * 1000,
		retry: 0,
	});
	const earnings = useQuery({ queryKey: ["earnings", symbol], queryFn: () => getEarnings(symbol, name), staleTime: 60 * 60 * 1000, retry: 0 });
	const news = useQuery({ queryKey: ["company-news", symbol, name], queryFn: () => getCompanyNews(symbol, name), staleTime: 10 * 60 * 1000, retry: 0 });
	const stories = (news.data?.articles ?? []).slice(0, 2);
	const e = earnings.data;
	const earningsLine = !e || !e.date || e.status === "none" ? null
		: e.status === "upcoming" ? `Next earnings land ${isoDayLabel(e.date)}`
		: `Earnings reported ${isoDayLabel(e.date)} — ${e.status === "beat" ? "beat" : "missed"} estimates`;
	return (
		<Card label="News signal">
			<CardTitle icon={Newspaper} tint="#69B3CA" title="News signal" />
			{changePct != null && <p style={{ font: f(500, 11), color: changePct >= 0 ? GREEN : RED }}>{newsCloseLine(changePct)}</p>}
			{move.data?.explanation && <Muted>{move.data.explanation}</Muted>}
			{earningsLine && <Muted>{earningsLine}</Muted>}
			{stories.length > 0 && (
				<div className="flex overflow-x-auto" style={{ gap: cu(12), scrollbarWidth: "none" }}>
					{stories.map((a) => (
						<div key={a.url} className="shrink-0" style={{ width: cu(205), ...sheetCard(12), padding: cu(12), display: "flex", flexDirection: "column", gap: cu(8) }}>
							<div className="flex items-center">
								<span style={{ font: f(400, 10), color: DISC.muted }}>{a.source} · {newsAge(a.datetime)} ago</span>
								<span className="flex-1" />
								<span style={{ borderRadius: 999, background: "rgba(255,255,255,0.08)", padding: `${cu(3)} ${cu(8)}`, font: f(500, 10), color: DISC.muted }}>{a.sentiment.charAt(0).toUpperCase() + a.sentiment.slice(1)}</span>
							</div>
							<p style={{ width: cu(173), font: f(400, 12), color: INK }}>{a.headline}</p>
						</div>
					))}
				</div>
			)}
		</Card>
	);
}

// ── Numbers that matter ──────────────────────────────────────────────────────────────────────────
export function NumbersCard({ symbol, metrics }: { symbol: string; metrics: LiveMetrics | undefined }) {
	const { data: peers } = useQuery({ queryKey: ["peer-metrics", symbol], queryFn: () => getPeerMetrics(symbol), staleTime: 24 * 60 * 60 * 1000, retry: 0 });
	const cell = (label: string, value: string, verdict: string | null, good: boolean) => (
		<div className="min-w-0 flex-1" style={{ ...sheetCard(12), padding: cu(10), display: "flex", flexDirection: "column", gap: cu(4) }}>
			<span style={{ font: f(400, 10), color: DISC.muted }}>{label}</span>
			<span style={{ font: f(600, 17, undefined, "heading"), color: INK }}>{value}</span>
			<span style={{ font: f(500, 10), color: good ? GREEN : DISC.muted }}>{verdict ?? " "}</span>
		</div>
	);
	const rev = parsePct(metrics?.revenueGrowth);
	const margin = parsePct(metrics?.profitMargin);
	return (
		<Card label="Numbers that matter">
			<CardTitle icon={Info} tint="#69B3CA" title="Numbers that matter" />
			<div className="flex" style={{ gap: cu(8) }}>
				{cell("P/E ratio", metrics?.peRatio != null ? metrics.peRatio.toFixed(1) : "—", peers?.pe != null ? `Peers ${peers.pe.toFixed(1)}x` : null, false)}
				{cell("Revenue growth", metrics?.revenueGrowth ?? "—", peers?.revenueGrowth != null ? `Peers ${peers.revenueGrowth.toFixed(1)}%` : null, beatsPeers(rev, peers?.revenueGrowth ?? null))}
				{cell("Profit margin", metrics?.profitMargin ?? "—", peers?.profitMargin != null ? `Peers ${peers.profitMargin.toFixed(1)}%` : null, beatsPeers(margin, peers?.profitMargin ?? null))}
			</div>
		</Card>
	);
}

// ── Analyst view ─────────────────────────────────────────────────────────────────────────────────
const POSITIVE = new Set(["Buy", "Strong Buy", "Outperform", "Overweight", "Market Outperform"]);
const dollars = (n: number | null | undefined) => (n == null ? "—" : `$${Math.trunc(n).toLocaleString("en-US")}`);
const Caret = ({ open }: { open: boolean }) => (
	<svg viewBox="0 0 20 20" style={{ width: cu(20), height: cu(20), transform: open ? "rotate(180deg)" : undefined }} fill={DISC.muted} aria-hidden="true"><path d="M5.5 8l4.5 4.5L14.5 8z" /></svg>
);

export function AnalystCard({ symbol, name, price }: { symbol: string; name: string; price: number | null }) {
	const [open, setOpen] = useState(false);
	const { data } = useQuery({ queryKey: ["analyst", symbol], queryFn: () => getAnalystData(symbol, name), staleTime: 60 * 60 * 1000, retry: 0 });
	// The recent-actions list is a grounded (search-backed) call, and only the open card shows it.
	const actions = useQuery({ queryKey: ["analyst-actions", symbol], queryFn: () => getAnalystActions(symbol, name), enabled: open, staleTime: 60 * 60 * 1000, retry: 0 });
	const target = data?.priceTarget;
	const avg = target?.avg ?? null;
	const upside = avg != null && price ? ((avg - price) / price) * 100 : null;
	const rec = data?.recommendation;
	const buy = (rec?.strongBuy ?? 0) + (rec?.buy ?? 0);
	const sell = (rec?.sell ?? 0) + (rec?.strongSell ?? 0);
	const total = buy + (rec?.hold ?? 0) + sell;
	const markerX = target?.low != null && target.high != null && avg != null && target.high > target.low ? Math.min(166, Math.max(0, ((avg - target.low) / (target.high - target.low)) * 166)) : 83;
	const upsideText = upside == null ? null : `${upside >= 0 ? "↑" : "↓"} ${Math.abs(upside).toFixed(1)}% ${open ? "upside" : upside >= 0 ? "upside" : "downside"}`;
	return (
		<Card onClick={() => setOpen((v) => !v)} label={`Analyst view, ${open ? "expanded" : "collapsed"}`} gap={12}>
			<div className="flex items-center" style={{ gap: cu(10), minHeight: cu(22) }}>
				<IconTile icon={Search} tint="#69B3CA" glyphColor={DISC.muted} size={22} glyph={13} />
				<h2 className="flex-1" style={{ font: f(600, 15, undefined, "heading"), color: INK }}>Analyst view</h2>
				<Caret open={open} />
			</div>
			{!open && upsideText && <p style={{ font: f(500, 11), color: GREEN }}>{upsideText}</p>}
			{open && (
				<>
					<Kicker>PRICE TARGET RANGE</Kicker>
					<div className="relative" style={{ height: cu(8), borderRadius: cu(4), background: "rgba(105,179,202,0.55)" }}>
						<span className="absolute" style={{ top: 0, width: cu(14), height: cu(8), borderRadius: cu(4), background: "#69B3CA", left: `calc((100% - ${cu(14)}) * ${markerX / 166})` }} />
					</div>
					<div className="flex justify-between">
						{[["Low", target?.low, "left"], ["Avg", avg, "center"], ["High", target?.high, "right"]].map(([label, v, align]) => (
							<div key={String(label)} style={{ display: "flex", flexDirection: "column", gap: cu(1), textAlign: align as "left" | "center" | "right" }}>
								<span style={{ font: f(400, 10), color: DISC.muted }}>{label as string}</span>
								<span style={{ font: f(500, 12), color: INK }}>{dollars(v as number | null)}</span>
							</div>
						))}
					</div>
					{upsideText && <p style={{ font: f(500, 11), color: GREEN }}>{upsideText}</p>}
					{total > 0 && (
						<>
							<Kicker>WALL ST. CONSENSUS · {total} ANALYSTS</Kicker>
							<div style={{ height: cu(8), borderRadius: cu(4), background: DISC.divider }}>
								<div style={{ width: `${(buy / total) * 100}%`, height: "100%", borderRadius: cu(4), background: GREEN }} />
							</div>
							<div className="flex justify-between" style={{ font: f(500, 11) }}>
								<span style={{ color: GREEN }}>● Buy {buy}</span>
								<span style={{ color: DISC.muted }}>Hold {rec?.hold ?? 0}</span>
								<span style={{ color: DISC.muted }}>Sell {sell}</span>
							</div>
						</>
					)}
					{(actions.data?.length ?? 0) > 0 && (
						<>
							<Kicker>RECENT ACTIONS</Kicker>
							{actions.data!.slice(0, 5).map((a, i) => (
								<div key={`${a.firm}-${i}`} className="flex items-center" style={{ height: cu(38), ...sheetCard(10), padding: `0 ${cu(12)}`, gap: cu(10) }}>
									<span className="min-w-0 flex-1 truncate" style={{ font: f(500, 12), color: INK }}>{a.firm}</span>
									<span className="text-right" style={{ width: cu(64), font: f(500, 11), color: POSITIVE.has(a.action) ? GREEN : DISC.muted }}>{a.action}</span>
									<span className="text-right" style={{ width: cu(52), font: f(500, 12), color: INK }}>{dollars(a.priceTarget)}</span>
								</div>
							))}
						</>
					)}
				</>
			)}
		</Card>
	);
}

// ── Compare and learn ────────────────────────────────────────────────────────────────────────────
export function CompareCard({ symbol, metrics }: { symbol: string; metrics: LiveMetrics | undefined }) {
	const [open, setOpen] = useState(false);
	const { data: peers } = useQuery({ queryKey: ["peer-metrics", symbol], queryFn: () => getPeerMetrics(symbol), staleTime: 24 * 60 * 60 * 1000, retry: 0 });
	const tickers = (peers?.peerTickers ?? []).slice(0, 2);
	// The peers' own quotes are only needed once the table is open.
	const peerData = useQueries({ queries: tickers.map((t) => ({ queryKey: ["stock", t], queryFn: () => getStockData(t), enabled: open, staleTime: 2 * 60 * 1000, retry: 0 })) });
	const cols = [metrics, ...peerData.map((q) => q.data?.metrics)];
	const dash = "—";
	const pct = (s: string | null | undefined) => (s ? (s.startsWith("-") ? s : `+${s}`) : dash);
	const rows: Array<[string, (m: LiveMetrics | undefined) => string, string?]> = [
		["P/E ratio", (m) => (m?.peRatio != null ? m.peRatio.toFixed(1) : dash)],
		["Rev growth", (m) => pct(m?.revenueGrowth), GREEN],
		["Profit margin", (m) => m?.profitMargin ?? dash],
		["Market cap", (m) => m?.marketCap ?? dash],
	];
	return (
		<Card onClick={() => setOpen((v) => !v)} label={`Compare and learn, ${open ? "expanded" : "collapsed"}`} gap={23}>
			<div className="flex items-center" style={{ gap: cu(10), minHeight: cu(22) }}>
				<IconTile icon={TrendingUp} tint="#69B3CA" glyphColor={DISC.muted} size={22} glyph={13} />
				<h2 className="flex-1" style={{ font: f(600, 15, undefined, "heading"), color: INK }}>Compare and learn</h2>
				<Caret open={open} />
			</div>
			{!open && tickers.length > 0 && <p style={{ font: f(400, 11), color: DISC.muted }}>vs {tickers.join(" · ")}</p>}
			{open && (
				<div style={{ display: "flex", flexDirection: "column", gap: cu(21) }}>
					<div className="relative" style={{ display: "flex", flexDirection: "column", gap: cu(12) }}>
						<div className="absolute" style={{ left: cu(78), top: cu(-12), width: cu(81), height: cu(170), borderRadius: cu(8), background: "rgba(105,179,202,0.07)" }} aria-hidden="true" />
						<div className="relative grid" style={{ gridTemplateColumns: "1.2fr 1fr 1fr 1fr", columnGap: cu(8), font: f(500, 11), color: INK, textAlign: "center" }}>
							<span />
							<span>{symbol}</span>
							{tickers.map((t) => <span key={t}>{t}</span>)}
						</div>
						{rows.map(([label, read, tint]) => (
							<div key={label} className="relative grid items-center" style={{ gridTemplateColumns: "1.2fr 1fr 1fr 1fr", columnGap: cu(8), minHeight: cu(20), textAlign: "center" }}>
								<span style={{ font: f(400, 11), color: DISC.muted, textAlign: "left" }}>{label}</span>
								{cols.slice(0, 1 + tickers.length).map((m, i) => (
									<span key={i} style={{ font: f(i === 0 ? 500 : 400, 11), color: tint ?? INK }}>{read(m)}</span>
								))}
							</div>
						))}
					</div>
					<p style={{ font: f(500, 10), color: DISC.muted }}>Cultural context only, not financial advice.</p>
				</div>
			)}
		</Card>
	);
}

// ── Related lesson ───────────────────────────────────────────────────────────────────────────────
export function LessonCard({ symbol }: { symbol: string }) {
	const [open, setOpen] = useState(false);
	const lesson = lessonFor(symbol);
	return (
		<button
			type="button"
			onClick={() => setOpen((v) => !v)}
			aria-expanded={open}
			className={`w-full text-left ${PRESS}`}
			style={{ display: "flex", flexDirection: "column", gap: cu(8), ...sheetCard(12), padding: cu(14), ...focusRing }}
		>
			<span style={{ font: f(500, 11), color: "#5BD7E4" }}>RELATED LESSON</span>
			<span style={{ font: f(600, 15, 19, "heading"), color: "#fff" }}>{lesson.title}</span>
			<span style={{ font: f(400, 12, 17), color: DISC.body }}>{lesson.summary}</span>
			{open && (
				<span style={{ display: "flex", flexDirection: "column", gap: cu(8), paddingTop: cu(4) }}>
					{lesson.body.map((p) => <span key={p} style={{ font: f(400, 12, 17), color: DISC.muted }}>{p}</span>)}
				</span>
			)}
			<span className="flex items-center">
				<span className="flex-1" style={{ font: f(500, 12), color: DISC.teal }}>{open ? "Close lesson" : "Read lesson · 2 min"}</span>
				<span style={{ font: f(400, 14), color: DISC.muted }} aria-hidden="true">{open ? "⌃" : "⌄"}</span>
			</span>
		</button>
	);
}
