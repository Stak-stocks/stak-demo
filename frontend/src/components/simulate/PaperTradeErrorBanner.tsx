import { dismissPaperError, usePaperError } from "@/lib/paperErrors";
import { DISC, cu } from "@/components/discover/discoverTheme";
import { PHONE_MAX_WIDTH, useFigmaUnit, useShellInset } from "@/components/discover/useFigmaUnit";
import { f } from "@/components/phone/phone";

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
					onClick={dismissPaperError}
					className="pointer-events-auto flex cursor-pointer items-center justify-between"
					style={{ gap: cu(12), borderRadius: cu(10), background: DISC.sheet, padding: `${cu(12)} ${cu(14)}` }}
				>
					<span className="flex-1" style={{ font: f(400, 12), color: "#FF5A6A" }}>{message}</span>
					<button type="button" onClick={dismissPaperError} style={{ font: f(500, 11), color: DISC.muted }}>Dismiss</button>
				</div>
			</div>
		</div>
	);
}
