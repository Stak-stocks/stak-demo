import { createFileRoute, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { AppShell, loadingFrameFor } from "@/app/AppShell";
import { DeckSkeleton } from "@/app/discover/DeckSkeleton";
import { HomeSkeleton } from "@/app/home/HomeSkeleton";
import { type CatalogFailure, catalogFailure, useCatalog } from "@/app/live/catalog";
import { useLive } from "@/app/live/store";
import { StockDetailSkeleton } from "@/app/stocks/StockDetailSkeleton";
import { PrimaryButton } from "@/app/ui/Button";

export const Route = createFileRoute("/_app")({
	component: AppLayout,
});

/**
 * While Firebase is still restoring a session, or the company catalog chunk is still on its way, the
 * screens would paint the guest persona or an empty deck; the route's loading state shows instead.
 * A session that ends while the app is open (inactivity sign-out, revoked token) goes back to login
 * rather than silently becoming the guest.
 */
function AppLayout() {
	const live = useLive();
	const catalog = useCatalog();
	const { pathname, search } = useLocation();
	const example = (pathname.startsWith("/stocks/") || /^\/discover\/?$/.test(pathname)) && (search as Record<string, unknown>).variant === "example";
	const navigate = useNavigate();
	const wasSignedIn = useRef(false);

	useEffect(() => {
		if (!live.ready) return;
		if (live.signedIn) wasSignedIn.current = true;
		else if (wasSignedIn.current) {
			wasSignedIn.current = false;
			navigate({ to: "/login" });
		}
	}, [live.ready, live.signedIn, navigate]);

	const ready = live.ready && catalog === "ready";
	return (
		<AppShell loading={!ready && catalog !== "failed"}>
			{ready ? (
				<Outlet />
			) : catalog === "failed" ? (
				<CatalogFailed reason={catalogFailure()} />
			) : (
				<>
					<p role="status" className="sr-only">
						Loading the company catalog
					</p>
					<RouteSkeleton pathname={pathname} example={example} />
				</>
			)}
		</AppShell>
	);
}

/**
 * The authored loading frames (10 States: Home 2:1991, Deck 2:2305, Stock detail 2:2113), skeleton rail included
 * (AppShell); other routes (End of deck 2:3422 and the EXAMPLE layouts, the deck and the stock pages, which have no
 * loading frame) stay blank for the moment auth takes.
 */
function RouteSkeleton({ pathname, example }: { pathname: string; example: boolean }) {
	const frame = loadingFrameFor(pathname, example);
	if (frame === "discover") return <DeckSkeleton />;
	if (frame === "stock") return <StockDetailSkeleton />;
	if (frame === "home") return <HomeSkeleton />;
	return null;
}

/**
 * The catalog chunk did not arrive (offline, a blocked CDN, a stale deploy). The browser keeps a failed
 * module fetch for the life of the page, so the way back is a reload, not another import.
 */
function CatalogFailed({ reason }: { reason: CatalogFailure | null }) {
	return (
		// below 1024 the 360 block is the column's width, at most 360 (SPEC R3): a phone column is 288-358 wide
		<div role="alert" className="flex w-[360px] flex-col items-start gap-[16px] pt-[8px] max-lg:w-full max-lg:max-w-[360px]">
			<p className="font-sora text-[18px] font-semibold leading-[23px] text-white">
				{reason === "timeout" ? "The company catalog is taking too long to load" : "Could not load the company catalog"}
			</p>
			<p className="font-geist text-[13px] leading-[19px] text-[#c8d2e0]">Check your connection, then reload the page.</p>
			<PrimaryButton width={200} onClick={() => window.location.reload()}>
				Reload
			</PrimaryButton>
		</div>
	);
}
