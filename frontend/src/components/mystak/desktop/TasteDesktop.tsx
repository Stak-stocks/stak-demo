import { useMemo, useState, type KeyboardEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, Bookmark, ChevronLeft, ChevronRight, Compass, FileSearch, Lightbulb, MoreHorizontal, Newspaper, PieChart, Sparkles } from "lucide-react";
import type { BrandSummary } from "@stak/shared";
import { useTaste } from "@/hooks/useTaste";
import { useMyStakData } from "@/hooks/useMyStakData";
import { STRENGTH_LABEL, evidenceForTheme, isEmptyGraph, scenarioOf, subtitleOf, summaryOf, themeColor, type Strength, type Theme } from "@/lib/tasteGraph";
import { DonutRing } from "@/components/DonutRing";
import { BrandLogo } from "@/components/BrandLogo";
import { DesktopTopBar } from "@/components/desktop/DesktopTopBar";
import { DESK, DeskButton, Panel, PanelHeader, SkeletonBar, deskFocus, deskPageBg, themeIcon } from "@/components/desktop/deskKit";

const STRENGTH_STYLE: Record<Strength, { background: string; color: string }> = {
	strong: { background: DESK.cyan, color: DESK.bg },
	moderate: { background: "rgba(105,179,202,0.16)", color: DESK.cyan },
	emerging: { background: DESK.track, color: DESK.body },
};

function StrengthChip({ strength }: { strength: Strength }) {
	return <span className="shrink-0 rounded-full px-[10px] py-[2px] text-[11px] font-medium" style={STRENGTH_STYLE[strength]}>{STRENGTH_LABEL[strength]}</span>;
}

const pct = (share: number) => (share < 0.005 ? "<1%" : `${Math.round(share * 100)}%`);

/** One interest in the list: icon (in its ring colour), name, strength, and a bar for its share of your activity. */
function ThemeListRow({ theme, selected, onSelect }: { theme: Theme; selected: boolean; onSelect: () => void }) {
	const Icon = themeIcon(theme.label);
	const color = themeColor(theme.colorKey);
	return (
		<button
			type="button"
			onClick={onSelect}
			aria-current={selected ? "true" : undefined}
			data-theme={theme.category}
			className={`flex w-full flex-col gap-[6px] rounded-[10px] px-3 py-2 text-left transition-colors ${selected ? "" : "hover:bg-white/[0.04]"} ${deskFocus}`}
			style={selected ? { background: DESK.cyanSoft, boxShadow: `inset 0 0 0 1px ${DESK.borderStrong}` } : undefined}
		>
			<span className="flex w-full items-center gap-3">
				<span className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-[7px]" style={{ background: `${color}2E` }}>
					<Icon className="h-[13px] w-[13px]" style={{ color }} aria-hidden="true" />
				</span>
				<span className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-white">{theme.label}</span>
				<StrengthChip strength={theme.strength} />
			</span>
			<span className="flex w-full items-center gap-3 pl-[38px]">
				<span className="h-[5px] flex-1 overflow-hidden rounded-full" style={{ background: DESK.track }} aria-hidden="true">
					<span className="block h-full rounded-full" style={{ width: `${theme.share * 100}%`, background: color }} />
				</span>
				<span className="w-[36px] text-right text-[12px] tabular-nums" style={{ color: DESK.body }}>{pct(theme.share)}</span>
			</span>
		</button>
	);
}

function Count({ icon: Icon, value, label }: { icon: typeof Bookmark; value: number; label: string }) {
	return (
		<div className="flex flex-col gap-1 rounded-[12px] p-4" style={{ background: DESK.panelRaised, border: `1px solid ${DESK.border}` }}>
			<span className="flex items-center gap-2 text-[12px]" style={{ color: DESK.muted }}><Icon className="h-[14px] w-[14px]" aria-hidden="true" />{label}</span>
			<span className="font-heading text-[22px] font-semibold tabular-nums text-white">{value}</span>
		</div>
	);
}

const OTHER = "__other";

/** "Other interests" opened: the smaller interests behind that share, each one opening in full. */
function OtherDetail({ share, others, onSelect }: { share: number; others: Theme[]; onSelect: (category: string) => void }) {
	return (
		<div className="flex flex-col gap-4">
			<div>
				<h2 className="font-heading text-[22px] font-semibold text-white">Other interests</h2>
				<p className="text-[13px]" style={{ color: DESK.muted }}>{pct(share)} of your interest signals, spread across {others.length > 0 ? `${others.length} smaller interests` : "smaller interests"}.</p>
			</div>
			{others.length === 0 ? (
				<p className="text-[13px]" style={{ color: DESK.body }}>The breakdown of these smaller interests isn't available yet.</p>
			) : (
				<ul className="flex flex-col gap-1">
					{others.map((t) => {
						const Icon = themeIcon(t.label);
						return (
							<li key={t.category}>
								<button type="button" onClick={() => onSelect(t.category)} className={`flex w-full items-center gap-3 rounded-[10px] px-3 py-2 text-left transition-colors hover:bg-white/[0.04] ${deskFocus}`}>
									<span className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-[7px]" style={{ background: DESK.track }}>
										<Icon className="h-[13px] w-[13px]" style={{ color: DESK.body }} aria-hidden="true" />
									</span>
									<span className="w-[34%] truncate text-[13px] text-white">{t.label}</span>
									<span className="h-[5px] flex-1 overflow-hidden rounded-full" style={{ background: DESK.track }} aria-hidden="true">
										<span className="block h-full rounded-full" style={{ width: `${(t.share / Math.max(share, 0.0001)) * 100}%`, background: DESK.faint }} />
									</span>
									<span className="w-[40px] text-right text-[12px] tabular-nums" style={{ color: DESK.body }}>{pct(t.share)}</span>
									<StrengthChip strength={t.strength} />
									<ChevronRight className="h-[14px] w-[14px] shrink-0" style={{ color: DESK.faint }} aria-hidden="true" />
								</button>
							</li>
						);
					})}
				</ul>
			)}
		</div>
	);
}

/** The selected interest: its numbers, why STAK reads it that way, and the companies you've saved in it. */
function ThemeDetail({ theme, savedBrands, onOpenStock, onDiscover, onBackToOther }: {
	theme: Theme;
	savedBrands: BrandSummary[];
	onOpenStock: (ticker: string) => void;
	onDiscover: () => void;
	/** Set when this interest was opened from "Other interests". */
	onBackToOther?: () => void;
}) {
	const Icon = themeIcon(theme.label);
	const color = themeColor(theme.colorKey);
	const evidence = evidenceForTheme(theme);
	return (
		<div className="flex flex-col gap-5">
			{onBackToOther && (
				<button type="button" onClick={onBackToOther} className={`flex items-center gap-1 self-start rounded-md text-[12.5px] hover:text-white ${deskFocus}`} style={{ color: DESK.muted }}>
					<ChevronLeft className="h-[14px] w-[14px]" aria-hidden="true" /> Other interests
				</button>
			)}
			<div className="flex flex-wrap items-center gap-4">
				<span className="grid h-[48px] w-[48px] shrink-0 place-items-center rounded-[12px]" style={{ background: `${color}2E` }}>
					<Icon className="h-[24px] w-[24px]" style={{ color }} aria-hidden="true" />
				</span>
				<div className="min-w-0 flex-1">
					<h2 className="font-heading text-[22px] font-semibold text-white">{theme.label}</h2>
					<p className="text-[13px]" style={{ color: DESK.muted }}>{pct(theme.share)} of your interest signals</p>
				</div>
				<StrengthChip strength={theme.strength} />
			</div>

			<div className="flex flex-col gap-2">
				<div className="grid grid-cols-3 gap-3">
					<Count icon={Bookmark} value={theme.saves} label="Saved" />
					<Count icon={Sparkles} value={theme.learnMores} label="Quick Looks read" />
					<Count icon={FileSearch} value={theme.opens} label="Company pages opened" />
				</div>
				<p className="text-[11.5px] leading-[17px]" style={{ color: DESK.muted }}>
					Over the last 90 days (saves count for as long as you keep them). A Quick Look is counted when you open Learn more in
					Discover or Search, or read a card for a few seconds on desktop Discover; a page open, when you visit the company's page.
				</p>
			</div>

			<section className="flex flex-col gap-2" aria-label="Why STAK thinks this">
				<h3 className="flex items-center gap-2 text-[14px] font-semibold text-white"><Lightbulb className="h-[15px] w-[15px]" style={{ color: DESK.cyan }} aria-hidden="true" /> Why STAK thinks this</h3>
				{evidence.length === 0 ? (
					<p className="text-[13px]" style={{ color: DESK.muted }}>Not much activity here yet.</p>
				) : (
					<ul className="flex flex-col gap-2">
						{evidence.map((e, i) => (
							<li key={i} className="flex items-start gap-3 rounded-[10px] px-4 py-3 text-[13px] leading-[19px]" style={{ background: DESK.panelRaised, border: `1px solid ${DESK.border}`, color: DESK.body }}>
								<span className="mt-[7px] h-[6px] w-[6px] shrink-0 rounded-full" style={{ background: color }} aria-hidden="true" />{e.text}
							</li>
						))}
					</ul>
				)}
			</section>

			<section className="flex flex-col gap-2" aria-label={`Your ${theme.label} companies`}>
				<h3 className="text-[14px] font-semibold text-white">Companies you've saved here</h3>
				{savedBrands.length === 0 ? (
					<p className="text-[13px]" style={{ color: DESK.muted }}>{theme.savedNames.length ? theme.savedNames.join(", ") : "None saved yet - your interest here comes from what you've explored."}</p>
				) : (
					<div className="flex flex-wrap gap-2">
						{savedBrands.map((b) => (
							<button key={b.id} type="button" onClick={() => onOpenStock(b.ticker)} className={`flex items-center gap-2 rounded-[10px] py-[6px] pl-[6px] pr-3 text-[13px] text-white transition-colors hover:bg-white/[0.06] ${deskFocus}`} style={{ border: `1px solid ${DESK.border}` }}>
								<BrandLogo brand={b} className="h-[24px] w-[24px] rounded-[6px]" alt="" />
								{b.name} <span className="text-[11.5px]" style={{ color: DESK.muted }}>{b.ticker}</span>
							</button>
						))}
					</div>
				)}
				<button type="button" onClick={onDiscover} className={`mt-1 flex items-center gap-1 self-start rounded-md text-[13px] font-medium hover:opacity-80 ${deskFocus}`} style={{ color: DESK.cyan }}>
					Find more in Discover <ArrowRight className="h-[14px] w-[14px]" aria-hidden="true" />
				</button>
			</section>
		</div>
	);
}

/**
 * Investing Taste on desktop: your mix as a ring and every interest in a list on the left; the selected interest in
 * full on the right (its numbers, why STAK thinks it, the companies behind it), then how it shapes your STAK.
 * Same measurement and copy as the phone page.
 */
export function TasteDesktop() {
	const navigate = useNavigate();
	const { taste, isLoading, isError, refetch } = useTaste();
	const { swipedBrands } = useMyStakData();
	const [selected, setSelected] = useState<string | null>(null);

	const themes = taste && !isEmptyGraph(taste) ? taste.themes : [];
	const scenario = taste ? scenarioOf(taste) : null;
	const others = taste?.others ?? [];
	const otherOpen = selected === OTHER;
	const fromOther = others.find((t) => t.category === selected);
	const current = otherOpen ? undefined : fromOther ?? themes.find((t) => t.category === selected) ?? themes[0];
	const brandByName = useMemo(() => new Map(swipedBrands.map((b) => [b.name, b])), [swipedBrands]);
	const savedBrands = (current?.savedNames ?? []).map((n) => brandByName.get(n)).filter((b): b is BrandSummary => !!b);
	const showOther = (taste?.otherShare ?? 0) > 0.01;

	const onListKey = (e: KeyboardEvent<HTMLDivElement>) => {
		if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
		e.preventDefault();
		const at = themes.findIndex((t) => t.category === current?.category);
		const next = themes[Math.min(themes.length - 1, Math.max(0, at + (e.key === "ArrowDown" ? 1 : -1)))];
		if (!next) return;
		setSelected(next.category);
		e.currentTarget.querySelector<HTMLButtonElement>(`[data-theme="${next.category}"]`)?.focus();
	};

	return (
		<div className="min-h-full" style={{ background: deskPageBg() }}>
			<div className="mx-auto flex max-w-[1440px] flex-col gap-5 px-8 pb-10 pt-5">
				<DesktopTopBar />

				<header>
					<nav aria-label="Breadcrumb" className="flex items-center gap-1 text-[12.5px]" style={{ color: DESK.muted }}>
						<button type="button" onClick={() => navigate({ to: "/my-stak" })} className={`rounded-md hover:text-white ${deskFocus}`}>My STAK</button>
						<ChevronRight className="h-[13px] w-[13px]" aria-hidden="true" />
						<span aria-current="page" className="text-white">Investing Taste</span>
					</nav>
					<h1 className="mt-1 font-heading text-[28px] font-semibold leading-[36px] text-white">Your Investing Taste</h1>
					<p className="text-[14px]" style={{ color: DESK.muted }}>Built from what you save and explore.</p>
					{scenario === "paused" && (
						<p className="mt-2 max-w-[720px] text-[13px]" style={{ color: DESK.body }}>Quiet for a while - this is built from saves and activity from before, not today. Save or explore a company in Discover to freshen it up.</p>
					)}
				</header>

				{isLoading ? (
					<div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]"><SkeletonBar width="100%" height={420} className="rounded-[16px]" /><SkeletonBar width="100%" height={420} className="rounded-[16px]" /></div>
				) : !taste ? (
					<Panel className="gap-3 p-6">
						<p className="text-[15px] text-white">Your Taste is unavailable</p>
						<p className="text-[13px]" style={{ color: DESK.muted }}>{isError ? "We couldn't load your interests." : "Reading your activity…"}</p>
						{isError && <button type="button" onClick={() => { void refetch(); }} className={`self-start rounded-md text-[13px] font-medium ${deskFocus}`} style={{ color: DESK.cyan }}>Try again</button>}
					</Panel>
				) : themes.length === 0 ? (
					<Panel className="gap-3 p-6">
						<p className="text-[15px] font-semibold text-white">{summaryOf(taste)}</p>
						<p className="text-[13px]" style={{ color: DESK.muted }}>
							{taste.totalSignals > 0 ? "Nothing you've saved or explored has stood out yet. Save a company you like in Discover." : "Still learning your taste. Save a few companies in Discover and this fills in."}
						</p>
						<DeskButton size="sm" onClick={() => navigate({ to: "/discover" })} className="self-start">Go to Discover</DeskButton>
					</Panel>
				) : (
					<div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)] xl:items-start">
						<div className="flex flex-col gap-5">
							<Panel label="Your mix" className="gap-4 p-5">
								<PanelHeader icon={PieChart} title="Your mix" subtitle={subtitleOf(taste)} />
								<div className="flex items-center gap-5">
									<div className="relative grid shrink-0 place-items-center">
										<DonutRing
											shares={[...themes.map((t) => t.share), ...(showOther ? [taste.otherShare] : [])]}
											colors={[...themes.map((t) => themeColor(t.colorKey)), ...(showOther ? [DESK.faint] : [])]}
											size={132}
											strokeWidth={26}
											gapDegrees={4}
										/>
										<span className="absolute text-center text-[11px] leading-[14px]" style={{ color: DESK.muted }}>Taste<br />mix</span>
									</div>
									<div className="min-w-0">
										<p className="font-heading text-[16px] font-semibold leading-[22px] text-white">{summaryOf(taste)}</p>
										<p className="mt-1 text-[12px]" style={{ color: DESK.muted }}>{taste.totalSaves} saved {taste.totalSaves === 1 ? "company" : "companies"} · shares of your interest signals, never money</p>
									</div>
								</div>
							</Panel>

							<Panel label="What draws your attention" className="gap-1 p-3">
								<div className="px-2 pb-1 pt-1"><PanelHeader icon={Sparkles} title="What draws your attention" subtitle={showOther ? `Your top ${themes.length}, and the rest combined` : undefined} /></div>
								<div className="flex flex-col" onKeyDown={onListKey}>
									{themes.map((t) => <ThemeListRow key={t.category} theme={t} selected={t.category === current?.category} onSelect={() => setSelected(t.category)} />)}
									{/* The server sends the top six; everything smaller is summed into otherShare - shown so the list adds up. */}
									{showOther && (
										<button
											type="button"
											onClick={() => setSelected(OTHER)}
											aria-current={otherOpen || fromOther ? "true" : undefined}
											className={`flex w-full flex-col gap-[6px] rounded-[10px] px-3 py-2 text-left transition-colors ${otherOpen || fromOther ? "" : "hover:bg-white/[0.04]"} ${deskFocus}`}
											style={otherOpen || fromOther ? { background: DESK.cyanSoft, boxShadow: `inset 0 0 0 1px ${DESK.borderStrong}` } : undefined}
										>
											<span className="flex w-full items-center gap-3">
												<span className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-[7px]" style={{ background: DESK.track }}>
													<MoreHorizontal className="h-[13px] w-[13px]" style={{ color: DESK.muted }} aria-hidden="true" />
												</span>
												<span className="min-w-0 flex-1 truncate text-[13.5px] font-medium" style={{ color: DESK.body }}>Other interests</span>
												<span className="shrink-0 text-[11px]" style={{ color: DESK.muted }}>Smaller ones combined</span>
											</span>
											<span className="flex w-full items-center gap-3 pl-[38px]">
												<span className="h-[5px] flex-1 overflow-hidden rounded-full" style={{ background: DESK.track }} aria-hidden="true">
													<span className="block h-full rounded-full" style={{ width: `${taste.otherShare * 100}%`, background: DESK.faint }} />
												</span>
												<span className="w-[36px] text-right text-[12px] tabular-nums" style={{ color: DESK.body }}>{pct(taste.otherShare)}</span>
											</span>
										</button>
									)}
								</div>
								{taste.learning && <p className="px-3 pb-2 text-[12px]" style={{ color: DESK.muted }}>Still learning your taste — these grow firmer as you save and explore more.</p>}
							</Panel>
						</div>

						<div className="flex flex-col gap-5">
							<Panel label={otherOpen ? "Other interests" : current ? `${current.label} in detail` : "Interest detail"} className="p-6">
								{otherOpen ? (
									<OtherDetail share={taste.otherShare} others={others} onSelect={setSelected} />
								) : current && (
									<ThemeDetail
										theme={current}
										savedBrands={savedBrands}
										onOpenStock={(ticker) => navigate({ to: "/stock/$symbol", params: { symbol: ticker } })}
										onDiscover={() => navigate({ to: "/discover" })}
										onBackToOther={fromOther ? () => setSelected(OTHER) : undefined}
									/>
								)}
							</Panel>

							<Panel label="How this shapes your STAK" className="gap-4 p-5">
								<PanelHeader icon={Compass} title="How this shapes your STAK" subtitle="Your taste evolves as you explore." />
								<div className="grid gap-3 md:grid-cols-2">
									<button type="button" onClick={() => navigate({ to: "/discover" })} className={`flex items-start gap-3 rounded-[12px] p-4 text-left transition-colors hover:bg-white/[0.04] ${deskFocus}`} style={{ border: `1px solid ${DESK.border}` }}>
										<Compass className="mt-[2px] h-[18px] w-[18px] shrink-0" style={{ color: DESK.cyan }} aria-hidden="true" />
										<span><span className="block text-[13.5px] font-semibold text-white">Discover</span><span className="block text-[12.5px]" style={{ color: DESK.muted }}>Companies related to your interests.</span></span>
									</button>
									<button type="button" onClick={() => navigate({ to: "/feed" })} className={`flex items-start gap-3 rounded-[12px] p-4 text-left transition-colors hover:bg-white/[0.04] ${deskFocus}`} style={{ border: `1px solid ${DESK.border}` }}>
										<Newspaper className="mt-[2px] h-[18px] w-[18px] shrink-0" style={{ color: DESK.cyan }} aria-hidden="true" />
										<span><span className="block text-[13.5px] font-semibold text-white">Daily Brief</span><span className="block text-[12.5px]" style={{ color: DESK.muted }}>More context on the themes you follow.</span></span>
									</button>
								</div>
							</Panel>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
