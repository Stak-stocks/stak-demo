import type { ReactNode } from "react";
import { AlertTriangle, BarChart3, ChevronRight, Eye, FileText, Star, TrendingUp, type LucideIcon } from "lucide-react";
import type { BrandSummary } from "@stak/shared";
import { DISCOVER_FOCUS } from "@/lib/discoverFocus";
import { DESK, Panel, PanelHeader, SkeletonBar, deskFocus } from "@/components/desktop/deskKit";
import { useQuickLook } from "./QuickLookSheet";

function Section({ icon: Icon, tint = DESK.cyan, tintSoft = DESK.cyanSoft, title, children }: {
	icon: LucideIcon;
	tint?: string;
	tintSoft?: string;
	title: string;
	children: ReactNode;
}) {
	return (
		<section className="flex gap-3 rounded-[14px] p-4" style={{ background: DESK.panelRaised, border: `1px solid ${DESK.border}` }}>
			<span className="grid h-[32px] w-[32px] shrink-0 place-items-center rounded-[9px]" style={{ background: tintSoft }}>
				<Icon className="h-[16px] w-[16px]" style={{ color: tint }} aria-hidden="true" />
			</span>
			<div className="flex min-w-0 flex-1 flex-col gap-2">
				<h3 className="text-[14px] font-semibold text-white">{title}</h3>
				{children}
			</div>
		</section>
	);
}

const Body = ({ children }: { children: ReactNode }) => <p className="text-[13px] leading-[20px]" style={{ color: DESK.body }}>{children}</p>;

const CHIP = "rounded-full px-3 py-[4px] text-[11.5px]";
const CHIP_THEME = { color: DESK.cyan, background: DESK.cyanSoft, border: `1px solid ${DESK.borderStrong}` };
const CHIP_PLAIN = { color: DESK.body, background: "rgba(255,255,255,0.03)", border: `1px solid ${DESK.border}` };

/** Related tickers, each opening its stock page. */
function Peers({ tickers, onOpenStock }: { tickers: string[]; onOpenStock: (ticker: string) => void }) {
	if (tickers.length === 0) return null;
	return (
		<>
			<p className="text-[12px]" style={{ color: DESK.muted }}>Related companies to keep an eye on:</p>
			<div className="flex flex-wrap gap-[6px]">
				{tickers.map((t) => (
					<button key={t} type="button" onClick={() => onOpenStock(t)} className={`${CHIP} transition-opacity hover:opacity-80 ${deskFocus}`} style={CHIP_PLAIN}>
						{t} <ChevronRight className="inline h-[11px] w-[11px] align-[-1px]" aria-hidden="true" />
					</button>
				))}
			</div>
		</>
	);
}

/**
 * Desktop Discover's Quick Look, open beside the deck for whichever card is in front: why investors are watching,
 * business strength, the main risk and what to watch next - the same overview the phone's Learn more sheet shows.
 */
export function QuickLookPanel({ brand, onOpenStock }: { brand: BrandSummary; onOpenStock: (ticker: string) => void }) {
	const { ql, sections, isLoading, themes } = useQuickLook(brand);
	const peers = (brand.peerTickers ?? []).slice(0, 4);
	const fallbackIcons = [TrendingUp, BarChart3, AlertTriangle, Eye];

	if (ql) {
		return (
			<div className="flex flex-col gap-3">
				<Section icon={Star} title="Why investors are watching"><Body>{ql.whyNow}</Body></Section>
				<Section icon={BarChart3} title="Business strength">
					{themes.length > 0 && <div className="flex flex-wrap gap-[6px]">{themes.map((t) => <span key={t} className={CHIP} style={CHIP_THEME}>{t}</span>)}</div>}
					<Body>{ql.setup}</Body>
				</Section>
				<Section icon={AlertTriangle} tint={DESK.red} tintSoft="rgba(255,90,106,0.12)" title="Main risk"><Body>{ql.catch}</Body></Section>
				<Section icon={Eye} title="Watch next">
					<Body>{ql.whatToWatch}</Body>
					<Peers tickers={peers} onOpenStock={onOpenStock} />
				</Section>
			</div>
		);
	}
	// Same fallback as Android: without a generated overview, the profile's own written sections.
	if (sections.length > 1) {
		return (
			<div className="flex flex-col gap-3">
				{sections.slice(1, 5).map((s, i) => <Section key={s.heading} icon={fallbackIcons[i % fallbackIcons.length]!} title={s.heading}><Body>{s.content}</Body></Section>)}
				{peers.length > 0 && <Section icon={Eye} title="Watch next"><Peers tickers={peers} onOpenStock={onOpenStock} /></Section>}
			</div>
		);
	}
	if (isLoading) {
		return (
			<div className="flex flex-col gap-3" role="status" aria-label="Loading Quick Look">
				{[0, 1, 2, 3].map((i) => <SkeletonBar key={i} width="100%" height={92} className="rounded-[14px]" />)}
			</div>
		);
	}
	return <p className="text-[13px]" style={{ color: DESK.muted }}>Couldn't load insights for {brand.name} right now.</p>;
}

/** The Quick Look panel's title row. */
export function QuickLookTitle() {
	return <PanelHeader icon={FileText} title="Quick look" subtitle="Key insights to help you decide." />;
}

/** "Not sure? Try a different category." - puts the chosen category's companies at the front of today's deck. */
export function FocusChips({ focus, onFocus }: { focus: string | null; onFocus: (id: string | null) => void }) {
	return (
		<Panel label="Try a different category" className="gap-3 p-4">
			<PanelHeader icon={TrendingUp} title="Not sure?" subtitle="Try a different category." />
			<div className="flex flex-wrap gap-2">
				{DISCOVER_FOCUS.map((f) => {
					const on = focus === f.id;
					return (
						<button
							key={f.id}
							type="button"
							aria-pressed={on}
							onClick={() => onFocus(on ? null : f.id)}
							className={`rounded-full px-3 py-[6px] text-[12px] transition-colors ${deskFocus}`}
							style={on ? DESK.chipOn : CHIP_PLAIN}
						>
							{f.label}
						</button>
					);
				})}
			</div>
		</Panel>
	);
}
