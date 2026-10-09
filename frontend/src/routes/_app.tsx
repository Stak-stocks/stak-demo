import { createFileRoute, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { AppShell } from "@/app/AppShell";
import { DeckSkeleton } from "@/app/discover/DeckSkeleton";
import { HomeSkeleton } from "@/app/home/HomeSkeleton";
import { useLive } from "@/app/live/store";
import { StockDetailSkeleton } from "@/app/stocks/StockDetailSkeleton";

export const Route = createFileRoute("/_app")({
	component: AppLayout,
});

/**
 * While Firebase is still restoring a session the screens would paint the guest persona; the route's
 * loading state shows instead. A session that ends while the app is open (inactivity sign-out, revoked
 * token) goes back to login rather than silently becoming the guest.
 */
function AppLayout() {
	const live = useLive();
	const { pathname } = useLocation();
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

	return <AppShell>{live.ready ? <Outlet /> : <RouteSkeleton pathname={pathname} />}</AppShell>;
}

/** The authored loading frames (Home 2:8317 group, deck, stock detail); other routes stay blank for the moment auth takes. */
function RouteSkeleton({ pathname }: { pathname: string }) {
	if (pathname.startsWith("/discover")) return <DeckSkeleton />;
	if (pathname.startsWith("/stocks/")) return <StockDetailSkeleton />;
	if (pathname.startsWith("/home")) return <HomeSkeleton />;
	return null;
}
