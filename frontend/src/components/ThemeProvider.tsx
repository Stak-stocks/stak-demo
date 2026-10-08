import { useEffect } from "react";

/**
 * STAK is dark-only, matching the Android app. This used to be a full
 * light/dark/system theme switcher; that toggle is gone (2026-09-25), but
 * the `.dark` class still has to land on <html> because a lot of existing
 * component code gates on literal `dark:` Tailwind variants rather than the
 * CSS custom properties in styles.css.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
	useEffect(() => {
		document.documentElement.classList.add("dark");
	}, []);

	return <>{children}</>;
}
