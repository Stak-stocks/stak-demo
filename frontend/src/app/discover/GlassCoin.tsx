import { CompanyLogo } from "@/app/ui/CompanyLogo";
import { D } from "./assets";

/**
 * The deck illustration (Figma group 2:3044) for a catalog company: the authored open box and
 * light beam at their frame positions, and a glass coin with the company's logo where the
 * frames' three companies carry a hand-made coin. Geometry as the loading frame draws it:
 * art frame 212.22 × 287.046 at top 35.8, centred in the 360.774 × 242.992 image frame.
 */
export function GlassCoin({ ticker, opacity = 1 }: { ticker: string; opacity?: number }) {
	return (
		<div className="absolute left-1/2 top-[35.8px] h-[287.046px] w-[212.22px] -translate-x-1/2" style={{ opacity }} aria-hidden="true">
			<img alt="" src={D.deckBox} className="absolute left-[-26.51px] top-[78.6px] block h-[248.508px] w-[272.152px] max-w-none" />
			<img alt="" src={D.deckBeam} className="absolute left-[37.15px] top-[-5.31px] block h-[153.393px] w-[142.687px] max-w-none" />
			<div
				className="absolute left-[31.83px] top-[18.32px] flex size-[147.493px] items-center justify-center overflow-clip rounded-[36px]"
				style={{
					background: "linear-gradient(148deg, #eef8fc 0%, #cbe8f3 30%, #97cce0 64%, #5fa8c6 100%)",
					boxShadow:
						"inset 0 0 0 1.5px rgba(255,255,255,0.62), inset 10px 12px 20px rgba(255,255,255,0.5), inset -12px -16px 28px rgba(36,98,136,0.4), 0 16px 28px rgba(8,13,26,0.45)",
				}}
			>
				<div
					className="pointer-events-none absolute inset-0 rounded-[36px]"
					style={{ background: "radial-gradient(ellipse at 28% 20%, rgba(255,255,255,0.78) 0%, rgba(255,255,255,0) 50%)" }}
				/>
				<div className="relative flex size-[84px] items-center justify-center" style={{ filter: "drop-shadow(0 6px 10px rgba(10,40,70,0.35))" }}>
					<CompanyLogo ticker={ticker} size={84} rounded={18} />
				</div>
			</div>
		</div>
	);
}
