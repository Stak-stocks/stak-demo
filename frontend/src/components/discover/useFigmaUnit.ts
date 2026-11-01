import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useIsMobile } from "@/hooks/use-mobile";

/** The phone-shaped column Android's screens are drawn for: as wide as the window up to 430px. */
export const PHONE_MAX_WIDTH = 430;
const PHONE_MIN_WIDTH = 320;

const currentUnit = () => {
	const width = typeof window === "undefined" ? 390 : window.innerWidth;
	return Math.min(Math.max(width, PHONE_MIN_WIDTH), PHONE_MAX_WIDTH) / 390;
};

/** Pixels per figma unit (1 at 390px wide), tracking the window as it resizes. */
export function useFigmaUnit(): number {
	const [unit, setUnit] = useState(currentUnit);
	useEffect(() => {
		const onResize = () => setUnit(currentUnit());
		window.addEventListener("resize", onResize);
		return () => window.removeEventListener("resize", onResize);
	}, []);
	return unit;
}

const NO_SHELL = ["/welcome", "/login", "/signup", "/forgot-password"];

/** On desktop the SideNav takes 220px (on every page but the sign-in and onboarding ones), so a fixed overlay has to centre in what is left. */
export function useShellInset(): number {
	const mobile = useIsMobile();
	const path = useRouterState({ select: (s) => s.location.pathname });
	const bare = NO_SHELL.includes(path) || path === "/onboarding" || path.startsWith("/onboarding/");
	return mobile || bare ? 0 : 220;
}
