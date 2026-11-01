import { useEffect, useRef } from "react";
import type { BrandSummary } from "@stak/shared";
import type { StakSaveEntry } from "@/context/AccountContext";
import { getStockData, patchStakBrandPrice } from "@/lib/api";

const BACKFILL_SS_KEY = "stak:price-backfill:done";

/**
 * One-time (per browser session) backfill: saved stocks with no price-at-save get today's price patched in, so "since
 * you saved" has something to measure from. Run by the My STAK route, whichever layout (phone or desktop) it shows.
 */
export function usePriceBackfill(stakSavedAt: Record<string, StakSaveEntry> | undefined, allBrands: BrandSummary[]) {
	const done = useRef(sessionStorage.getItem(BACKFILL_SS_KEY) === "1");
	useEffect(() => {
		if (done.current || !stakSavedAt || allBrands.length === 0) return;
		done.current = true;
		sessionStorage.setItem(BACKFILL_SS_KEY, "1");
		for (const [brandId, entry] of Object.entries(stakSavedAt)) {
			if (entry.priceAtSave !== null) continue;
			const brand = allBrands.find((b) => b.id === brandId);
			if (!brand?.ticker) continue;
			getStockData(brand.ticker)
				.then((data) => { if (data?.quote?.price) patchStakBrandPrice(brandId, data.quote.price); })
				.catch(() => {});
		}
	}, [stakSavedAt, allBrands]);
}
