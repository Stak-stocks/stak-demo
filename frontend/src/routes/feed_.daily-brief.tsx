import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, type ReactNode } from "react";
import { Eye } from "lucide-react";
import { defaultWatch, watchIcon } from "@/lib/dailyBriefWatch";
import { getDailyBrief } from "@/lib/api";
import { marketSessionBucket, getEasternDateKey } from "@/lib/utils";
import { useMyStakData } from "@/hooks/useMyStakData";
import { DISC, cu } from "@/components/discover/discoverTheme";
import { BackCircle, PRESS, PhonePage, f, focusRing } from "@/components/phone/phone";
import { Sparkle } from "@/components/mystak/TasteCard";
import { DailyBriefDesktop } from "@/components/news/DailyBriefDesktop";
import { useIsMobile } from "@/hooks/use-mobile";
import { AskAiCard } from "@/components/stakAi/StakAiThread";
import { briefContext, useOpenStakAi } from "@/components/stakAi/open";

export const Route = createFileRoute("/feed_/daily-brief")({
	component: DailyBriefPage,
});

const GLYPH = "#8B9AB8";

function Card({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
	return (
		<section style={{ display: "flex", flexDirection: "column", gap: cu(12), borderRadius: cu(16), background: DISC.sheet, padding: cu(18) }}>
			<div className="flex items-center" style={{ gap: cu(9) }}>
				<div className="grid place-items-center" style={{ width: cu(28), height: cu(28), borderRadius: cu(8), background: "#1A2235" }} aria-hidden="true">{icon}</div>
				<h2 style={{ font: f(600, 14, 18, "heading"), color: "#fff" }}>{label}</h2>
			</div>
			{children}
		</section>
	);
}

const Body = ({ children }: { children: ReactNode }) => <p style={{ font: f(400, 13, 20), color: DISC.body }}>{children}</p>;

function DailyBriefPage() {
	const navigate = useNavigate();
	const openStakAi = useOpenStakAi();
	const isMobile = useIsMobile();
	const { swipedBrands } = useMyStakData();
	const { data: brief, isPending } = useQuery({
		queryKey: ["daily-brief", getEasternDateKey(), marketSessionBucket()],
		queryFn: getDailyBrief,
		staleTime: 30 * 60 * 1000,
		retry: 0,
	});
	// Like Android, the page only exists for a brief that's been loaded; without one it goes back to News.
	useEffect(() => { if (!isPending && !brief) navigate({ to: "/feed", replace: true }); }, [isPending, brief, navigate]);
	if (!brief) return <PhonePage><div /></PhonePage>;

	const dayPart = brief.dayLabel === "Today's" ? "Today's Brief" : `${brief.dayLabel} Brief`;
	const explanation = brief.moodExplanation?.trim() ?? "";
	// Older briefs have no structured list: pull up to three sentences out of the mood explanation instead.
	const happened = brief.whatHappened?.length
		? brief.whatHappened.slice(0, 3)
		: (() => {
			const sentences = explanation.split(/(?<=[.!?])\s+/).filter(Boolean);
			return (sentences.length >= 2 ? sentences.slice(0, 3) : explanation ? [explanation] : []).map((body) => ({ title: "", body }));
		})();
	const watch = (brief.watchItems?.length ? brief.watchItems : defaultWatch(brief.mood ?? "")).slice(0, 3);
	const tickers = swipedBrands.slice(0, 5).map((b) => b.ticker);

	if (!isMobile) {
		return (
			<DailyBriefDesktop
				brief={brief}
				dayPart={dayPart}
				happened={happened}
				watch={watch}
				tickers={tickers}
				onBack={() => navigate({ to: "/feed" })}
				onStock={(t) => navigate({ to: "/stock/$symbol", params: { symbol: t } })}
			/>
		);
	}

	return (
		<PhonePage>
			<div style={{ padding: `${cu(10)} ${cu(18)} ${cu(10)} ${cu(16)}` }}>
				<BackCircle onClick={() => navigate({ to: "/feed" })} label="Back to News" />
			</div>
			<div style={{ display: "flex", flexDirection: "column", gap: cu(14), padding: `${cu(6)} ${cu(20)} ${cu(36)}` }}>
				<header style={{ display: "flex", flexDirection: "column", gap: cu(10) }}>
					<p style={{ font: f(600, 10), letterSpacing: cu(1.1), color: DISC.teal }}>TODAY'S BRIEF</p>
					{explanation && <h1 style={{ font: f(600, 20, 27, "heading"), color: "#fff" }}>{explanation}</h1>}
					<p style={{ font: f(400, 12), color: DISC.muted }}>STAK AI · {dayPart}</p>
				</header>

				{brief.plainEnglish?.trim() && (
					<Card
						label="The gist"
						icon={
							<svg viewBox="0 0 14 12" style={{ width: cu(14), height: cu(12) }} aria-hidden="true">
								<rect x="0" y="0" width="14" height="1.68" fill={GLYPH} /><rect x="0" y="4.8" width="14" height="1.68" fill={GLYPH} /><rect x="0" y="9.6" width="8.4" height="1.68" fill={GLYPH} />
							</svg>
						}
					>
						<Body>{brief.plainEnglish}</Body>
					</Card>
				)}

				{happened.length > 0 && (
					<Card
						label="What actually happened"
						icon={
							<svg viewBox="0 0 14 12" style={{ width: cu(14), height: cu(12) }} aria-hidden="true">
								<rect x="0" y="6.6" width="3.36" height="5.4" fill={GLYPH} /><rect x="5.02" y="3.6" width="3.36" height="8.4" fill={GLYPH} /><rect x="10.04" y="0" width="3.36" height="12" fill={GLYPH} />
							</svg>
						}
					>
						<div style={{ display: "flex", flexDirection: "column", gap: cu(12) }}>
							{happened.map((item, i) => (
								<div key={i} className="flex items-start" style={{ gap: cu(12) }}>
									<span className="grid shrink-0 place-items-center rounded-full" style={{ width: cu(26), height: cu(26), background: "rgba(105,179,202,0.15)", font: f(700, 12), color: DISC.teal }}>{i + 1}</span>
									<div style={{ display: "flex", flexDirection: "column", gap: cu(3) }}>
										<p style={{ minHeight: cu(18), font: f(600, 13, 18, "heading"), color: "#fff" }}>{item.title}</p>
										<p style={{ font: f(400, 12, 18), color: DISC.body }}>{item.body}</p>
									</div>
								</div>
							))}
						</div>
					</Card>
				)}

				{brief.personalizedImpact?.trim() && (
					<Card
						label="Why this matters to your STAK"
						icon={
							<svg viewBox="0 0 24 24" style={{ width: cu(13), height: cu(13) }} aria-hidden="true">
								<path d="M12 1.5l2.9 6.6 7.1.6-5.4 4.7 1.6 7-6.2-3.7-6.2 3.7 1.6-7L2 8.7l7.1-.6z" fill={GLYPH} transform="translate(0 1)" />
							</svg>
						}
					>
						<Body>{brief.personalizedImpact}</Body>
						{tickers.length > 0 && (
							<div className="flex flex-wrap" style={{ gap: cu(8), paddingTop: cu(2) }}>
								{tickers.map((t) => (
									<span key={t} style={{ borderRadius: 20, background: "rgba(105,179,202,0.12)", border: "0.5px solid rgba(105,179,202,0.35)", padding: `${cu(6)} ${cu(11)}`, font: f(600, 12), color: DISC.teal }}>{t}</span>
								))}
							</div>
						)}
					</Card>
				)}

				<Card label="What to watch next" icon={<Eye style={{ width: cu(15), height: cu(15) }} color={GLYPH} />}>
					<div style={{ display: "flex", flexDirection: "column" }}>
						{watch.map((w, i) => {
							const Icon = watchIcon(w.label, w.body);
							return (
								<div key={i}>
									{i > 0 && <div style={{ margin: `${cu(6)} 0` }}><div style={{ height: cu(1), background: DISC.divider }} /></div>}
									<div className="flex items-center" style={{ gap: cu(12) }}>
										<Icon style={{ width: cu(26), height: cu(26), flexShrink: 0 }} strokeWidth={1.5} color={DISC.muted} aria-hidden="true" />
										<div style={{ display: "flex", flexDirection: "column", gap: cu(2) }}>
											<p style={{ font: f(600, 13, 17, "heading"), color: "#fff" }}>{w.label}</p>
											<p style={{ font: f(400, 12, 18), color: DISC.muted }}>{w.body}</p>
										</div>
									</div>
								</div>
							);
						})}
					</div>
				</Card>

				{/* STAK AI (2026-10-01): the suggested question asks itself, with today's brief as context. */}
				{brief.contextQuestion?.trim() && (
					<button type="button" onClick={() => openStakAi(briefContext(brief), brief.contextQuestion)} className={`flex w-full items-center text-left ${PRESS}`} style={{ gap: cu(12), borderRadius: cu(16), background: DISC.sheet, padding: cu(18), ...focusRing }}>
						<div className="flex-1" style={{ display: "flex", flexDirection: "column", gap: cu(8) }}>
							<div className="flex items-center" style={{ gap: cu(9) }}>
								<div className="grid place-items-center" style={{ width: cu(28), height: cu(28), borderRadius: cu(8), background: "#1A2235" }} aria-hidden="true"><Sparkle size={14} /></div>
								<h2 style={{ font: f(600, 14, 18, "heading"), color: "#fff" }}>Ask STAK AI</h2>
							</div>
							<Body>{brief.contextQuestion}</Body>
						</div>
						<svg viewBox="0 0 16 16" style={{ width: cu(16), height: cu(16) }} fill="none" aria-hidden="true">
							<path d="M3.33333 8H12.6667M8 12.6667L12.6667 8L8 3.33333" stroke={DISC.muted} strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
						</svg>
					</button>
				)}
				<AskAiCard variant="phone" title="Ask a follow-up" subtitle="STAK AI answers questions about today's brief in plain English." onOpen={() => openStakAi(briefContext(brief))} />
			</div>
		</PhonePage>
	);
}
