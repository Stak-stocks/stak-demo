import { AlignLeft, ArrowLeft, BarChart3, Eye, Star } from "lucide-react";
import type { DailyBriefResponse } from "@/lib/api";
import { moodColor, moodStatus } from "@/lib/marketMood";
import { watchIcon } from "@/lib/dailyBriefWatch";
import { DESK, Kicker, Panel, PanelHeader, deskFocus, deskPageBg } from "@/components/desktop/deskKit";
import { AskStakAi } from "./AskStakAi";

/**
 * The full Daily Brief on desktop: the headline read with its mood, then the gist and what actually happened beside why
 * it matters to your STAK, what to watch next and Ask STAK AI (which answers here, rather than only posing the question).
 * Same brief and fallbacks as the phone page.
 */
export function DailyBriefDesktop({ brief, dayPart, happened, watch, tickers, onBack, onStock }: {
	brief: DailyBriefResponse;
	dayPart: string;
	happened: Array<{ title: string; body: string }>;
	watch: Array<{ label: string; body: string }>;
	tickers: string[];
	onBack: () => void;
	onStock: (ticker: string) => void;
}) {
	const explanation = brief.moodExplanation?.trim() ?? "";
	const mood = brief.mood?.trim();
	const status = mood ? moodStatus(mood, "settled") : null;
	const suggestions = [brief.contextQuestion?.trim(), "What does today mean for my STAK?", "Which sectors could benefit?"].filter((s): s is string => !!s).slice(0, 3);

	return (
		<div className="min-h-full" style={{ background: deskPageBg() }}>
			<div className="mx-auto flex max-w-[1440px] flex-col gap-5 px-8 pb-12 pt-5">
				<button type="button" onClick={onBack} className={`flex items-center gap-1 self-start rounded-md text-[12.5px] hover:text-white ${deskFocus}`} style={{ color: DESK.muted }}>
					<ArrowLeft className="h-[14px] w-[14px]" aria-hidden="true" /> News
				</button>

				<header className="flex max-w-[900px] flex-col gap-3">
					<div className="flex flex-wrap items-center gap-3">
						<Kicker>Today's brief</Kicker>
						{status && (
							<span className="flex items-center gap-2 rounded-full px-3 py-[3px] text-[12px]" style={{ background: DESK.panel, border: `1px solid ${DESK.border}`, color: DESK.body }}>
								<span className="h-[8px] w-[8px] rounded-full" style={{ background: moodColor(mood) }} aria-hidden="true" /> {status.lead}
							</span>
						)}
					</div>
					{explanation && <h1 className="font-heading text-[30px] font-semibold leading-[40px] text-white">{explanation}</h1>}
					<p className="text-[13px]" style={{ color: DESK.muted }}>STAK AI · {dayPart}</p>
				</header>

				<div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
					<div className="flex min-w-0 flex-col gap-5">
						{brief.plainEnglish?.trim() && (
							<Panel label="The gist" className="gap-3 p-6">
								<PanelHeader icon={AlignLeft} title="The gist" />
								<p className="text-[15.5px] leading-[26px]" style={{ color: DESK.body }}>{brief.plainEnglish}</p>
							</Panel>
						)}
						{happened.length > 0 && (
							<Panel label="What actually happened" className="gap-4 p-6">
								<PanelHeader icon={BarChart3} title="What actually happened" />
								<ol className="flex flex-col gap-4">
									{happened.map((item, i) => (
										<li key={i} className="flex items-start gap-4">
											<span className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full text-[13px] font-bold" style={{ background: DESK.cyanSoft, color: DESK.cyan }}>{i + 1}</span>
											<div className="flex flex-col gap-1">
												{item.title && <p className="font-heading text-[15px] font-semibold text-white">{item.title}</p>}
												<p className="text-[14px] leading-[22px]" style={{ color: DESK.body }}>{item.body}</p>
											</div>
										</li>
									))}
								</ol>
							</Panel>
						)}
					</div>

					<aside className="flex min-w-0 flex-col gap-5" aria-label="What it means for you">
						{brief.personalizedImpact?.trim() && (
							<Panel label="Why this matters to your STAK" className="gap-3 p-5">
								<PanelHeader icon={Star} title="Why this matters to your STAK" />
								<p className="text-[13.5px] leading-[21px]" style={{ color: DESK.body }}>{brief.personalizedImpact}</p>
								{tickers.length > 0 && (
									<div className="flex flex-wrap gap-2">
										{tickers.map((t) => (
											<button key={t} type="button" onClick={() => onStock(t)} className={`rounded-full px-3 py-[4px] text-[12px] font-medium transition-opacity hover:opacity-80 ${deskFocus}`} style={{ background: DESK.cyanSoft, color: DESK.cyan, border: `1px solid ${DESK.borderStrong}` }}>{t}</button>
										))}
									</div>
								)}
							</Panel>
						)}
						<Panel label="What to watch next" className="gap-2 p-5">
							<PanelHeader icon={Eye} title="What to watch next" />
							<ul className="flex flex-col">
								{watch.map((w, i) => {
									const Icon = watchIcon(w.label, w.body);
									return (
										<li key={i} className={`flex items-start gap-3 py-3 ${i > 0 ? "border-t" : ""}`} style={{ borderColor: DESK.border }}>
											<span className="grid h-[32px] w-[32px] shrink-0 place-items-center rounded-[8px]" style={{ background: DESK.cyanSoft }}><Icon className="h-[16px] w-[16px]" style={{ color: DESK.cyan }} aria-hidden="true" /></span>
											<span>
												<span className="block text-[13.5px] font-semibold text-white">{w.label}</span>
												<span className="block text-[12.5px] leading-[18px]" style={{ color: DESK.muted }}>{w.body}</span>
											</span>
										</li>
									);
								})}
							</ul>
						</Panel>
						<AskStakAi suggestions={suggestions} />
					</aside>
				</div>
			</div>
		</div>
	);
}
