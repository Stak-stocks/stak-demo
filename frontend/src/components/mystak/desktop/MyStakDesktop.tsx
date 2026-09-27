import { toast } from "sonner";
import { useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Bookmark } from "lucide-react";
import { useAccount } from "@/context/AccountContext";
import { useMyStakData } from "@/hooks/useMyStakData";
import { useCollections } from "@/hooks/useCollections";
import { useTaste } from "@/hooks/useTaste";
import { useUpdates } from "@/hooks/useUpdates";
import { useMarketIndices } from "@/hooks/useMarketIndices";
import { DesktopTopBar } from "@/components/desktop/DesktopTopBar";
import { DESK, Kicker, deskPageBg } from "@/components/desktop/deskKit";
import { IndexStrip } from "@/components/home/desktop/MarketPanels";
import { SavedCompaniesPanel } from "@/components/home/desktop/StakPanels";
import { ActivityPanel, CollectionsPanel, TasteWhyPanel, UpdatesPanel, buildActivity } from "./MyStakPanels";

/** The index strip with its own data, so its 5-minute refresh redraws only the strip, not the whole page. */
function HeaderIndexStrip() {
	return <IndexStrip indices={useMarketIndices()} />;
}

/**
 * My STAK above the mobile breakpoint, from the user's desktop design: header with the index strip, the collections row,
 * updates beside the investing taste (with why), then saved companies beside recent activity. Same data as the phone
 * overview; the phone keeps Android's layout.
 */
export function MyStakDesktop() {
	const navigate = useNavigate();
	const { removeFromStak } = useAccount();
	const { swipedBrands, batchQuotes, account, allBrandsLoading, allBrandsError, retryBrands, accountLoading } = useMyStakData();
	const { holdings, groups } = useCollections(swipedBrands, batchQuotes);
	const { taste, isError: tasteFailed, refetch: retryTaste } = useTaste();
	const { updates, unread, isLoading: updatesLoading, isError: updatesFailed } = useUpdates();

	const loading = accountLoading || allBrandsLoading;
	// Saves exist but the brand list they resolve against didn't load: empty panels would pass for "nothing saved".
	const brandsFailed = allBrandsError && (account?.stakBrandIds?.length ?? 0) > 0;
	const brandById = useMemo(() => new Map(swipedBrands.map((b) => [b.id, b])), [swipedBrands]);
	const brandByTicker = useMemo(() => new Map(swipedBrands.map((b) => [b.ticker.toUpperCase(), b])), [swipedBrands]);
	// The same collection names the chips show (uncategorised companies are "Other").
	const collectionByTicker = useMemo(() => new Map(holdings.map((h) => [h.ticker.toUpperCase(), h.groupName])), [holdings]);
	const activity = useMemo(
		() => buildActivity(account?.stakSavedAt, account?.searchHistory, brandById, (t) => collectionByTicker.get(t.toUpperCase()) ?? "Other"),
		[account?.stakSavedAt, account?.searchHistory, brandById, collectionByTicker],
	);

	const openStock = (ticker: string) => navigate({ to: "/stock/$symbol", params: { symbol: ticker } });
	const discover = () => navigate({ to: "/discover" });

	return (
		<div className="min-h-full" style={{ background: deskPageBg() }}>
			<div className="mx-auto flex max-w-[1440px] flex-col gap-5 px-8 pb-10 pt-5">
				<DesktopTopBar />

				<div className="flex flex-col gap-4 min-[1360px]:flex-row min-[1360px]:items-start min-[1360px]:justify-between">
					<div className="shrink-0">
						<Kicker icon={Bookmark}>My STAK</Kicker>
						<h1 className="mt-1 font-heading text-[28px] font-semibold leading-[36px] text-white">Your saved collections and interests</h1>
						<p className="text-[14px]" style={{ color: DESK.muted }}>Track the companies and themes you're watching, all in one place.</p>
					</div>
					<div className="min-w-0 min-[1360px]:w-[640px]"><HeaderIndexStrip /></div>
				</div>

				<CollectionsPanel
					groups={groups}
					brandById={brandById}
					loading={loading}
					failed={brandsFailed}
					onRetry={() => { void retryBrands(); }}
					onOpen={(id) => navigate({ to: "/my-stak/collection/$id", params: { id } })}
					onViewAll={() => navigate({ to: "/my-stak/collections" })}
					onDiscover={discover}
				/>

				<div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
					<UpdatesPanel updates={updates} unread={unread} brandByTicker={brandByTicker} loading={updatesLoading} failed={updatesFailed} onOpen={() => navigate({ to: "/my-stak/updates" })} />
					<TasteWhyPanel taste={taste} failed={tasteFailed} searches={account?.searchHistory?.length ?? 0} onOpen={() => navigate({ to: "/my-stak/taste" })} onRetry={() => { void retryTaste(); }} />
				</div>

				<div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
					<SavedCompaniesPanel
						holdings={holdings}
						brands={swipedBrands}
						loading={loading}
						showCollection
						compact
						subtitle="The companies you're following across all collections."
						onOpenStock={openStock}
						onPractice={(ticker) => navigate({ to: "/simulate", search: { buy: ticker } })}
						onRemove={(brandId) => { removeFromStak(brandId).catch(() => toast.error("Couldn't remove it. Try again.")); }}
						onViewAll={() => navigate({ to: "/my-stak/collections" })}
						onDiscover={discover}
					/>
					<ActivityPanel items={activity} loading={loading} onOpenStock={openStock} />
				</div>
			</div>
		</div>
	);
}
