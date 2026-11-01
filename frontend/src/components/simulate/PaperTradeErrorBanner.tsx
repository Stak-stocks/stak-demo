import { dismissPaperError, usePaperError } from "@/lib/paperErrors";
import { DISC, cu } from "@/components/discover/discoverTheme";
import { PHONE_MAX_WIDTH, useFigmaUnit, useShellInset } from "@/components/discover/useFigmaUnit";
import { PRESS, f, focusRing, sheetCard } from "@/components/phone/phone";

/** Android's PaperTradeErrorBanner: top-centre, red message + Dismiss, gone after 7 seconds. Mounted once at the app root. */
export function PaperTradeErrorBanner() {
	const message = usePaperError();
	const unit = useFigmaUnit();
	const inset = useShellInset();
	if (!message) return null;
	return (
		<div className="pointer-events-none fixed inset-x-0 top-0 z-[80] flex justify-center" style={{ ["--u" as string]: `${unit}px`, paddingLeft: inset }}>
			<div className="w-full" style={{ maxWidth: PHONE_MAX_WIDTH, padding: `${cu(8)} ${cu(20)}` }}>
				<div
					role="alert"
					className="pointer-events-auto flex items-center justify-between"
					style={{ gap: cu(12), ...sheetCard(10), padding: `${cu(12)} ${cu(14)}` }}
				>
					<span className="flex-1" style={{ font: f(400, 12), color: "#FF5A6A" }}>{message}</span>
					<button type="button" onClick={dismissPaperError} className={PRESS} style={{ font: f(500, 11), color: DISC.muted, padding: `${cu(6)} ${cu(8)}`, ...focusRing }}>Dismiss</button>
				</div>
			</div>
		</div>
	);
}
