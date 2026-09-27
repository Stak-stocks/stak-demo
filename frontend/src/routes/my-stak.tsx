import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useMyStakData } from "@/hooks/useMyStakData";
import { useCollections } from "@/hooks/useCollections";
import { useTaste } from "@/hooks/useTaste";
import { useUpdates } from "@/hooks/useUpdates";
import { useSwipeLimit } from "@/hooks/useSwipeLimit";
import { useStockDetailOverlay } from "@/hooks/useStockDetailOverlay";
import { getStockData, patchStakBrandPrice } from "@/lib/api";
import { CollectionGrid } from "@/components/mystak/CollectionGrid";
import { EmptyStak } from "@/components/mystak/EmptyStak";
import { UpdatesCard } from "@/components/mystak/UpdatesCard";
import { TasteCard } from "@/components/mystak/TasteCard";
import { DiscoverHandoff } from "@/components/mystak/DiscoverHandoff";
import { EarningsCalendarButton } from "@/components/EarningsCalendar";

export const Route = createFileRoute("/my-stak")({
	component: MyStakPage,
});

const COLLECTIONS_SHOWN = 6;

function MyStakPage() {
	const { appUser } = useAuth();
	const navigate = useNavigate();
	const { allBrands, allBrandsLoading, swipedBrands, batchQuotes, account, accountLoading } = useMyStakData();
	const { groups } = useCollections(swipedBrands, batchQuotes);
	const { taste, isError: tasteFailed, refetch: retryTaste } = useTaste();
	const { updates, unread } = useUpdates();
	const { remaining: cardsLeft } = useSwipeLimit(appUser?.uid ?? "guest", !!appUser);
	const { open: openStock, overlay: stockOverlay, loadingOverlay: stockLoadingOverlay } = useStockDetailOverlay(allBrands);

	// One-time backfill: for saved stocks missing priceAtSave, fetch current price and patch Supabase
	const BACKFILL_SS_KEY = "stak:price-backfill:done";
	const backfilledRef = useRef(sessionStorage.getItem(BACKFILL_SS_KEY) === "1");
	useEffect(() => {
		if (backfilledRef.current || !account?.stakSavedAt || allBrands.length === 0) return;
		const nullEntries = Object.entries(account.stakSavedAt).filter(([, e]) => e.priceAtSave === null);
		if (nullEntries.length === 0) { backfilledRef.current = true; sessionStorage.setItem(BACKFILL_SS_KEY, "1"); return; }
		backfilledRef.current = true;
		sessionStorage.setItem(BACKFILL_SS_KEY, "1");
		for (const [brandId] of nullEntries) {
			const brand = allBrands.find(b => b.id === brandId);
			if (!brand?.ticker) continue;
			getStockData(brand.ticker)
				.then(data => { if (data?.quote?.price) patchStakBrandPrice(brandId, data.quote.price); })
				.catch(() => {});
		}
	}, [account?.stakSavedAt, allBrands]);

	const unreadTickers = new Set(updates.filter((u) => !u.read).map((u) => u.ticker));
	const unreadCompanies = new Set(updates.filter((u) => !u.read).map((u) => u.ticker)).size;

	const loading = accountLoading || allBrandsLoading;
	const startSwiping = () => navigate({ to: "/" });

	return (
		<div className="min-h-full bg-background text-foreground">
			<div className="flex items-start justify-between px-5 pt-5">
				<div>
					<h1 className="font-heading text-[26px] font-semibold leading-[33px] text-white">My STAK</h1>
					<p className="mt-[4px] text-[13px] leading-[17px] text-mystak-muted">Companies you've STAK'd, all in one place.</p>
				</div>
				<EarningsCalendarButton onSelectBrand={(brand) => openStock(brand.id)} />
			</div>

			<div className="mx-auto flex max-w-lg flex-col gap-[16px] px-5 pt-5 pb-8">
				{loading ? (
					<div className="grid grid-cols-2 gap-[10px] md:grid-cols-3 lg:grid-cols-4">
						{[...Array(4)].map((_, i) => (
							<div key={i} className="h-[62px] animate-pulse rounded-[12px] bg-mystak-card" />
						))}
					</div>
				) : groups.length > 0 ? (
					<div className="flex flex-col gap-[8px]">
						<div className="flex items-center">
							<p className="font-heading text-[16px] font-semibold leading-[20px] text-mystak-header-gray">Collections</p>
							{groups.length > COLLECTIONS_SHOWN && (
								<button
									type="button"
									onClick={() => navigate({ to: "/my-stak/collections" })}
									className="ml-auto text-[12px] font-medium leading-[16px] text-mystak-teal"
								>
									View all {groups.length} ›
								</button>
							)}
						</div>
						<CollectionGrid
							groups={groups.slice(0, COLLECTIONS_SHOWN)}
							unreadTickers={unreadTickers}
							onOpen={(id) => navigate({ to: "/my-stak/collection/$id", params: { id } })}
						/>
					</div>
				) : (
					<EmptyStak onStartSwiping={startSwiping} />
				)}

				{updates.length > 0 && (
					<UpdatesCard
						unreadCompanies={unreadCompanies}
						unread={unread}
						total={updates.length}
						onOpen={() => navigate({ to: "/my-stak/updates" })}
					/>
				)}

				<TasteCard
					taste={taste}
					failed={tasteFailed}
					onOpen={() => navigate({ to: "/my-stak/taste" })}
					onRetry={() => retryTaste()}
				/>

				<DiscoverHandoff cardsLeft={cardsLeft} onStartSwiping={startSwiping} />
			</div>

			{stockOverlay}
			{stockLoadingOverlay}
		</div>
	);
}
