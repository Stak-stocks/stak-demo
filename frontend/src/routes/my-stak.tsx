import { FailedCard } from "@/components/mystak/FailedCard";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useMyStakData } from "@/hooks/useMyStakData";
import { useCollections } from "@/hooks/useCollections";
import { useTaste } from "@/hooks/useTaste";
import { useUpdates } from "@/hooks/useUpdates";
import { useSwipeLimit } from "@/hooks/useSwipeLimit";
import { CollectionGrid } from "@/components/mystak/CollectionGrid";
import { EmptyStak } from "@/components/mystak/EmptyStak";
import { UpdatesCard } from "@/components/mystak/UpdatesCard";
import { TasteCard } from "@/components/mystak/TasteCard";
import { DiscoverHandoff } from "@/components/mystak/DiscoverHandoff";
import { DISC, cu } from "@/components/discover/discoverTheme";
import { PhonePage, f } from "@/components/phone/phone";
import { MyStakDesktop } from "@/components/mystak/desktop/MyStakDesktop";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePriceBackfill } from "@/hooks/usePriceBackfill";

export const Route = createFileRoute("/my-stak")({
	component: MyStakRoute,
});

/** The user's desktop design above the mobile breakpoint; Android's overview below it. */
function MyStakRoute() {
	const { account, allBrands } = useMyStakData();
	usePriceBackfill(account?.stakSavedAt, allBrands);
	return useIsMobile() ? <MyStakPage /> : <MyStakDesktop />;
}

/** Android shows six collections on the overview; "View all N ›" opens the rest. */
const COLLECTIONS_SHOWN = 6;

function MyStakPage() {
	const { appUser } = useAuth();
	const navigate = useNavigate();
	const { allBrandsLoading, allBrandsError, retryBrands, swipedBrands, batchQuotes, account, accountLoading } = useMyStakData();
	const { groups } = useCollections(swipedBrands, batchQuotes);
	const { taste, isError: tasteFailed, refetch: retryTaste } = useTaste();
	const { updates, unread, isError: updatesError } = useUpdates();
	const { remaining: cardsLeft } = useSwipeLimit(appUser?.uid ?? "guest", !!appUser);


	const unreadTickers = useMemo(() => new Set(updates.filter((u) => !u.read).map((u) => u.ticker)), [updates]);

	const loading = accountLoading || allBrandsLoading;
	// Saves exist but the brand list they resolve against didn't load: an empty grid here would pass for "you have nothing saved".
	const brandsFailed = allBrandsError && (account?.stakBrandIds?.length ?? 0) > 0;
	const startSwiping = () => navigate({ to: "/discover" });

	return (
		<PhonePage>
			{/* Android's header is fixed; only the body scrolls. */}
			<header className="sticky top-0 z-10 bg-background" style={{ padding: `${cu(20)} ${cu(20)} 0`, display: "flex", flexDirection: "column", gap: cu(4) }}>
				<h1 style={{ font: f(600, 26, 33, "heading"), color: "#fff" }}>My STAK</h1>
				<p style={{ font: f(400, 13, 17), color: DISC.muted }}>Companies you've STAK'd, all in one place.</p>
			</header>

			<div style={{ display: "flex", flexDirection: "column", gap: cu(16), padding: `${cu(20)} ${cu(20)} ${cu(24)}` }}>
				{loading ? (
					<div style={{ display: "flex", flexDirection: "column", gap: cu(10) }} aria-busy="true" aria-label="Loading your collections">
						{[0, 1].map((row) => (
							<div key={row} className="flex" style={{ gap: cu(10) }}>
								{[0, 1].map((i) => <div key={i} className="flex-1 animate-pulse" style={{ height: cu(58), borderRadius: cu(12), background: DISC.sheet }} />)}
							</div>
						))}
					</div>
				) : brandsFailed ? (
					<FailedCard title="Your collections" body="Couldn't load the company list right now, so your saved stocks can't be shown." onRetry={() => retryBrands()} />
				) : groups.length > 0 ? (
					<>
						<div className="flex items-center">
							<h2 style={{ font: f(600, 16, 20, "heading"), color: DISC.headerGray }}>Collections</h2>
							{groups.length > COLLECTIONS_SHOWN && (
								<button
									type="button"
									onClick={() => navigate({ to: "/my-stak/collections" })}
									className="ml-auto transition-opacity active:opacity-70"
									style={{ font: f(500, 12, 16), color: DISC.teal }}
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
					</>
				) : (
					<EmptyStak onStartSwiping={startSwiping} />
				)}

				{updates.length > 0 && (
					<UpdatesCard
						unreadCompanies={unreadTickers.size}
						unread={unread}
						onOpen={() => navigate({ to: "/my-stak/updates" })}
					/>
				)}

				<TasteCard
					taste={taste}
					failed={tasteFailed}
					onOpen={() => navigate({ to: "/my-stak/taste" })}
					onRetry={() => retryTaste()}
				/>

				{updatesError && updates.length === 0 && (
					<FailedCard title="Updates in your STAK" body="Couldn't check your saved companies right now." />
				)}

				<DiscoverHandoff cardsLeft={cardsLeft} onStartSwiping={startSwiping} />
			</div>
		</PhonePage>
	);
}
