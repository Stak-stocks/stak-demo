import type { NewsArticle } from "@stak/shared";
import { ArrowRight, ChevronRight, Eye, Newspaper, Sparkles, TrendingUp, type LucideIcon } from "lucide-react";
import type { DailyBriefResponse } from "@/lib/api";
import type { IndexReading } from "@/hooks/useMarketIndices";
import { moodColor, moodStatus } from "@/lib/marketMood";
import { deckStories } from "@/lib/newsText";
import { sourceBriefs } from "@/components/news/NewsParts";
import { Sparkline } from "@/components/desktop/Sparkline";
import { DESK, DeskButton, Kicker, Panel, SkeletonBar, changeColor, deskFocus, panelStyle, signedPctLabel, themeIcon } from "@/components/desktop/deskKit";

const level = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ── Index strip ─────────────────────────────────────────────────────────────────────────────────
export function IndexStrip({ indices }: { indices: IndexReading[] }) {
	return (
		<section aria-label="Market indices" className="flex min-w-0 divide-x divide-[rgba(255,255,255,0.07)] overflow-hidden" style={panelStyle}>
			{indices.map((idx) => {
				const color = changeColor(idx.changePct);
				return (
					<div key={idx.symbol} className="flex min-w-0 flex-1 flex-col gap-[2px] px-4 py-3">
						<span className="truncate text-[11.5px] font-medium" style={{ color: DESK.muted }}>{idx.name}</span>
						{idx.loading ? (
							<div className="flex flex-col gap-2 py-1"><SkeletonBar width="70%" height={14} /><SkeletonBar width="90%" height={22} /></div>
						) : idx.value === null ? (
							<span className="py-1 text-[12px]" style={{ color: DESK.muted }}>Unavailable</span>
						) : (
							<>
								{/* Level and move sit side by side, and stack when the tile is narrow. */}
								<div className="flex flex-wrap items-baseline gap-x-2">
									<span className="text-[14.5px] font-semibold text-white tabular-nums">{level(idx.value)}</span>
									<span className="text-[11.5px] font-medium tabular-nums" style={{ color }}>{signedPctLabel(idx.changePct, 2)}</span>
								</div>
								<Sparkline values={idx.line} color={color} className="mt-1 h-[26px] w-full" />
							</>
						)}
					</div>
				);
			})}
		</section>
	);
}

// ── Today's Brief hero ──────────────────────────────────────────────────────────────────────────
// Android's Home news deck (HomeScreen.kt NewsDeck), in the desktop mockup's corner: same-size tall cards with the
// headline at the top, each drawn ON TOP of the one before and shifted down just enough to leave that one's headline
// showing - the blank lower part of every card is simply covered. As in the mockup, all three lean down to the right
// at one shared angle, so their edges stay parallel and each headline keeps ~20px clear of the card over it. Each
// card also starts 20px right of the one behind, so every card's left edge stays in view (a cascade).
const CARD_W = 260;
/** Each card stays solid (nothing behind shows through) and disappears by shading into the hero's own background
 *  colour, starting just below the headline (3 lines end ~34% down the 230px card) so the text keeps its contrast. */
const fadeFrom = (color: string) => `linear-gradient(to bottom, ${color} 38%, ${DESK.panel} 100%)`;
const CARD_H = 230;
const TILT = 5;
const CARD_POSES = [
	// A muted teal: the accent itself was the brightest thing on the page.
	{ bg: fadeFrom("#4F95AB"), ink: "#061C25", x: 0, y: 0 },
	{ bg: fadeFrom("#F4F6FA"), ink: "#0E162B", x: 20, y: 100 },
	{ bg: fadeFrom("#1F3052"), ink: "rgba(220,230,245,0.8)", x: 40, y: 200 },
] as const;

/**
 * Three headline cards stacked on the right of the brief hero (the Home deck, for a wide screen); the panel clips the
 * stack at its bottom edge. Sized by the hero's own width (container queries): hidden under 600px, drawn at 82% up to
 * 820px, full size beyond. The stack is laid out at full size and scaled as one from the top-right corner.
 */
function HeadlineFan({ news }: { news: NewsArticle[] | undefined }) {
	// No fan without stories: a failed or empty feed already reads as such in the hero text.
	if (news && news.length === 0) return null;
	const stories = deckStories(news, false);
	return (
		<div
			className="pointer-events-none absolute right-[-6px] top-[24px] hidden h-[300px] w-[330px] origin-top-right [--k:0.82] @[600px]:block @[820px]:[--k:1]"
			style={{ transform: "scale(var(--k))" }}
			aria-hidden="true"
		>
			{CARD_POSES.map((pose, i) => {
				const story = stories[i]!;
				if (!story.loading && !story.title) return null;
				return (
					<div
						key={i}
						className="absolute rounded-[12px] px-[18px] py-4 shadow-[0_-6px_24px_rgba(0,0,0,0.35)]"
						style={{
							left: pose.x, top: pose.y, width: CARD_W, height: CARD_H, background: pose.bg, transform: `rotate(${TILT}deg)`,
						}}
					>
						{story.loading ? (
							<div className="flex flex-col gap-2 py-1">
								<span className="block h-[11px] w-[180px] animate-pulse rounded" style={{ background: pose.ink, opacity: 0.25 }} />
								<span className="block h-[11px] w-[130px] animate-pulse rounded" style={{ background: pose.ink, opacity: 0.25 }} />
							</div>
						) : (
							<p className="line-clamp-3 font-heading text-[16.5px] font-semibold leading-[21px]" style={{ color: pose.ink }}>{story.title}</p>
						)}
					</div>
				);
			})}
		</div>
	);
}

export function BriefHero({ brief, briefLoading, news, newsFailed, onReadBrief }: {
	brief: DailyBriefResponse | undefined;
	briefLoading: boolean;
	news: NewsArticle[] | undefined;
	newsFailed: boolean;
	onReadBrief: () => void;
}) {
	const lead = sourceBriefs(brief, news ?? [])[0];
	const mood = brief?.mood?.trim();
	const status = mood ? moodStatus(mood, "settled") : null;
	const waiting = briefLoading || (!lead && !news && !newsFailed);
	// When there's no AI brief the hero leads with the first story, so the fan starts from the second.
	const fanNews = newsFailed ? [] : lead?.url ? news?.slice(1) : news;

	return (
		<Panel label="Today's brief" className="@container relative overflow-hidden p-6" style={{ background: DESK.panel }}>
			{/* The text keeps clear of the card stack, which sits absolutely in the top-right corner. */}
			<div className="relative z-[1] flex min-w-0 flex-col gap-3 @[600px]:pr-[260px] @[820px]:pr-[316px]">
				<div className="flex flex-wrap items-center gap-x-4 gap-y-1">
					<Kicker icon={Newspaper}>Today's brief</Kicker>
					{status && (
						<span className="flex items-center gap-[6px] text-[11.5px]" style={{ color: DESK.muted }}>
							<span className="h-[7px] w-[7px] rounded-full" style={{ background: moodColor(mood) }} aria-hidden="true" />
							Market mood: <span className="text-white">{status.lead}</span>
						</span>
					)}
				</div>
				{waiting ? (
					<div className="flex flex-col gap-3 py-1"><SkeletonBar width="85%" height={26} /><SkeletonBar width="60%" height={26} /><SkeletonBar width="90%" /><SkeletonBar width="75%" /></div>
				) : lead ? (
					<>
						<h2 className="line-clamp-4 font-heading text-[22px] font-semibold leading-[29px] text-white @[820px]:line-clamp-3 @[820px]:text-[26px] @[820px]:leading-[33px]">{lead.title}</h2>
						{lead.body && <p className="line-clamp-4 max-w-[520px] text-[13.5px] leading-[21px]" style={{ color: DESK.body }}>{lead.body}</p>}
					</>
				) : (
					<>
						<h2 className="font-heading text-[22px] font-semibold leading-[29px] text-white">Today's brief isn't ready yet</h2>
						<p className="text-[13.5px] leading-[21px]" style={{ color: DESK.body }}>{newsFailed ? "Market news isn't loading right now. Try again in a moment." : "Check back shortly for today's market read."}</p>
					</>
				)}
				<div className="pt-2">
					<DeskButton onClick={onReadBrief}>
						Read full brief <ArrowRight className="h-[15px] w-[15px]" aria-hidden="true" />
					</DeskButton>
				</div>
			</div>
			<HeadlineFan news={fanNews} />
		</Panel>
	);
}

// ── Why this matters ────────────────────────────────────────────────────────────────────────────
interface WhyRow { icon: LucideIcon; text: string }

export function WhyPanel({ themes, impact, watchItems, loading, hasSaves, onOpenBrief, onOpenTaste, onDiscover }: {
	/** Up to three interest labels (taste themes or collection names). */
	themes: string[];
	impact: string | undefined;
	watchItems: Array<{ label: string; body: string }>;
	loading: boolean;
	hasSaves: boolean;
	onOpenBrief: () => void;
	onOpenTaste: () => void;
	onDiscover: () => void;
}) {
	const rows: WhyRow[] = [];
	if (impact) rows.push({ icon: TrendingUp, text: impact });
	for (const item of watchItems) {
		if (rows.length >= 3) break;
		rows.push({ icon: Eye, text: item.body ? `${item.label}: ${item.body}` : item.label });
	}

	return (
		<Panel label="Why this matters to your STAK" className="gap-4 p-5">
			<Kicker as="h2" icon={Sparkles}>Why this matters to your STAK</Kicker>
			<p className="text-[13px] leading-[19px]" style={{ color: DESK.body }}>
				{hasSaves
					? "Today's market moves could impact the investments you're following. Here's how it connects to your interests."
					: "Save a few companies and STAK will show how today's news hits them."}
			</p>
			{themes.length > 0 && (
				<div className="flex flex-wrap gap-2">
					{themes.map((label) => {
						const Icon = themeIcon(label);
						return (
							<button key={label} type="button" onClick={onOpenTaste} className={`flex items-center gap-[6px] rounded-[8px] px-3 py-[6px] text-[12px] text-white transition-colors hover:bg-white/[0.06] ${deskFocus}`} style={{ border: `1px solid ${DESK.border}`, background: DESK.panelRaised }}>
								<Icon className="h-[14px] w-[14px]" style={{ color: DESK.cyan }} aria-hidden="true" /> {label}
							</button>
						);
					})}
				</div>
			)}
			{loading ? (
				<div className="flex flex-col gap-3">{[0, 1, 2].map((i) => <SkeletonBar key={i} width="100%" height={34} />)}</div>
			) : rows.length > 0 ? (
				<ul className="flex flex-col">
					{rows.map((row, i) => {
						const Icon = row.icon;
						return (
							<li key={i} className={i > 0 ? "border-t" : ""} style={{ borderColor: DESK.border }}>
								<button type="button" onClick={onOpenBrief} className={`flex w-full items-center gap-3 rounded-md py-3 text-left transition-colors hover:bg-white/[0.03] ${deskFocus}`}>
									<span className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-[8px]" style={{ background: DESK.cyanSoft }}>
										<Icon className="h-[15px] w-[15px]" style={{ color: DESK.cyan }} aria-hidden="true" />
									</span>
									<span className="line-clamp-2 flex-1 text-[12.5px] leading-[18px]" style={{ color: DESK.body }}>{row.text}</span>
									<ChevronRight className="h-[16px] w-[16px] shrink-0" style={{ color: DESK.faint }} aria-hidden="true" />
								</button>
							</li>
						);
					})}
				</ul>
			) : !hasSaves ? (
				<button type="button" onClick={onDiscover} className={`flex items-center gap-1 self-start rounded-md text-[13px] font-medium ${deskFocus}`} style={{ color: DESK.cyan }}>
					Go to Discover <ArrowRight className="h-[14px] w-[14px]" aria-hidden="true" />
				</button>
			) : (
				<p className="text-[12.5px]" style={{ color: DESK.muted }}>Today's read on your STAK isn't available.</p>
			)}
		</Panel>
	);
}
