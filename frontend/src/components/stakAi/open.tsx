import { useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";
import { Sparkles } from "lucide-react";
import { DISC, cu } from "@/components/discover/discoverTheme";
import { PRESS, focusRing } from "@/components/phone/phone";
import type { DailyBriefResponse, StakAiContext } from "@/lib/api";
import type { StoredArticle } from "@/lib/openedArticle";
import { resetStakAiLauncher, stakAiLauncher } from "./useStakAiChat";

/**
 * Opens /stak-ai: fresh, or about a page (its context goes with the first question). [draft] leaves a question in
 * the box for the person to send - every answer costs one of their questions, so a tap never spends one for them.
 */
export function useOpenStakAi() {
	const navigate = useNavigate();
	return useCallback((context?: StakAiContext | null, draft?: string) => {
		resetStakAiLauncher();
		stakAiLauncher.context = context ?? null;
		stakAiLauncher.draft = draft ?? null;
		void navigate({ to: "/stak-ai" });
	}, [navigate]);
}

export const stockContext = (ticker: string): StakAiContext => ({ type: "stock", ticker: ticker.toUpperCase() });

export function articleContext(a: StoredArticle): StakAiContext {
	return {
		type: "article",
		headline: a.headline,
		summary: (a.summary || a.explanation || "").trim() || undefined,
		source: a.source || undefined,
		url: a.url || undefined,
		tickers: a.ticker ? [a.ticker.toUpperCase()] : undefined,
	};
}

export function briefContext(b: DailyBriefResponse): StakAiContext {
	const points = [b.plainEnglish, b.personalizedImpact, ...(b.whatHappened ?? []).map((w) => `${w.title}: ${w.body}`)]
		.map((p) => (p ?? "").trim()).filter(Boolean).slice(0, 8);
	return { type: "brief", title: b.dayLabel || undefined, points };
}

/** The phone's header sparkle (Home beside the bell, News beside search): a round button like its neighbours. */
export function AskAiHeaderButton({ size, background }: { size: number; background: string }) {
	const open = useOpenStakAi();
	return (
		<button
			type="button"
			onClick={() => open()}
			aria-label="Ask STAK AI"
			className={`grid shrink-0 place-items-center rounded-full ${PRESS}`}
			style={{ width: cu(size), height: cu(size), background, ...focusRing }}
		>
			<Sparkles style={{ width: cu(size / 2), height: cu(size / 2), color: DISC.teal }} aria-hidden="true" />
		</button>
	);
}
