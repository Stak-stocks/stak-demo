import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import type { UseQueryResult } from "@tanstack/react-query";
import type { NewsArticle } from "@stak/shared";
import type { DailyBriefResponse } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useAccount } from "@/context/AccountContext";
import { useMyStakData } from "@/hooks/useMyStakData";
import { useCollections } from "@/hooks/useCollections";
import { useTaste } from "@/hooks/useTaste";
import { useMarketIndices } from "@/hooks/useMarketIndices";
import { useGreeting } from "@/components/home/HomeHeader";
import { DesktopTopBar } from "@/components/desktop/DesktopTopBar";
import { DESK, deskPageBg } from "@/components/desktop/deskKit";
import { BriefHero, IndexStrip, WhyPanel } from "./MarketPanels";
import { MyStakPanel, PracticePanel, SavedCompaniesPanel, TastePanel } from "./StakPanels";

/** "Good Afternoon" -> "Good afternoon", as the desktop design writes it. */
const sentenceCase = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

/**
 * Home above the mobile breakpoint, from the user's desktop design: greeting + index strip, Today's Brief and
 * why it matters, My STAK collections and Investing Taste, saved companies and the paper portfolio. Everything
 * reads the same data the phone Home and the other tabs use.
 */
export function DesktopHome({ brief, news }: {
	brief: UseQueryResult<DailyBriefResponse>;
	news: UseQueryResult<{ articles: NewsArticle[] }>;
}) {
	const navigate = useNavigate();
	const { appUser } = useAuth();
	const { removeFromStak } = useAccount();
	const { swipedBrands, batchQuotes, allBrandsLoading, accountLoading } = useMyStakData();
	const { holdings, groups } = useCollections(swipedBrands, batchQuotes);
	const { taste, isError: tasteFailed, refetch: retryTaste } = useTaste();
	const indices = useMarketIndices();

	const { greeting, name } = useGreeting();

	const stakLoading = allBrandsLoading || accountLoading;
	const hasSaves = swipedBrands.length > 0;
	const themeLabels = (taste?.themes.length ? taste.themes.map((t) => t.label) : groups.map((g) => g.name)).slice(0, 3);
	const briefLoading = !!appUser && brief.isPending;
	const aiBrief = !!(brief.data?.moodExplanation?.trim() || brief.data?.plainEnglish?.trim());

	const openStock = (ticker: string) => navigate({ to: "/stock/$symbol", params: { symbol: ticker } });
	const openBrief = () => navigate({ to: aiBrief ? "/feed/daily-brief" : "/feed" });
	const discover = () => navigate({ to: "/discover" });

	return (
		<div className="min-h-full" style={{ background: deskPageBg() }}>
			<div className="mx-auto flex max-w-[1440px] flex-col gap-5 px-8 pb-10 pt-5">
				<DesktopTopBar />

				<div className="flex flex-col gap-4 min-[1360px]:flex-row min-[1360px]:items-center min-[1360px]:justify-between">
					<div className="shrink-0">
						<h1 className="font-heading text-[30px] font-semibold leading-[38px] text-white">{sentenceCase(greeting)}{name ? `, ${name}` : ""}</h1>
						<p className="text-[14px]" style={{ color: DESK.muted }}>Here's what's moving the market today.</p>
					</div>
					<div className="min-w-0 min-[1360px]:w-[680px]"><IndexStrip indices={indices} /></div>
				</div>

				<div className="grid gap-5 xl:grid-cols-[1.35fr_1fr]">
					<BriefHero brief={brief.data} briefLoading={briefLoading} news={news.data?.articles} newsFailed={news.isError} onReadBrief={openBrief} />
					<WhyPanel
						themes={themeLabels}
						impact={brief.data?.personalizedImpact?.trim() || undefined}
						watchItems={brief.data?.watchItems ?? []}
						loading={briefLoading}
						hasSaves={hasSaves}
						onOpenBrief={openBrief}
						onOpenTaste={() => navigate({ to: "/my-stak/taste" })}
						onDiscover={discover}
					/>
				</div>

				{/* My STAK's tile row sets this row's height; Investing Taste is compact enough to fit and spreads its rows to match. */}
				<div className="grid gap-5 xl:grid-cols-[1.35fr_1fr]">
					<MyStakPanel
						groups={groups}
						loading={stakLoading}
						onOpenCollection={(id) => navigate({ to: "/my-stak/collection/$id", params: { id } })}
						onViewAll={() => navigate({ to: "/my-stak/collections" })}
						onDiscover={discover}
					/>
					<TastePanel taste={taste} failed={tasteFailed} onOpen={() => navigate({ to: "/my-stak/taste" })} onRetry={() => { void retryTaste(); }} />
				</div>

				<div className="grid gap-5 xl:grid-cols-[1.35fr_1fr]">
					<SavedCompaniesPanel
						fill
						holdings={holdings}
						brands={swipedBrands}
						loading={stakLoading}
						onOpenStock={openStock}
						onPractice={(ticker) => navigate({ to: "/simulate", search: { buy: ticker } })}
						onRemove={(brandId) => { removeFromStak(brandId).catch(() => toast.error("Couldn't remove it. Try again.")); }}
						onViewAll={() => navigate({ to: "/my-stak" })}
						onDiscover={discover}
					/>
					<PracticePanel onOpen={() => navigate({ to: "/simulate" })} />
				</div>
			</div>
		</div>
	);
}
