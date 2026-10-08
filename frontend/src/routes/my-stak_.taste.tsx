import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { Compass, Newspaper } from "lucide-react";
import { useTaste } from "@/hooks/useTaste";
import { useIsMobile } from "@/hooks/use-mobile";
import { TasteDesktop } from "@/components/mystak/desktop/TasteDesktop";
import { scenarioOf, evidenceForTheme, allEvidence, themeColor, STRENGTH_LABEL, type Theme, type Strength } from "@/lib/tasteGraph";
import { categoryIcon } from "@/lib/categoryIcons";
import { FailedCard } from "@/components/mystak/FailedCard";
import { DISC, cu } from "@/components/discover/discoverTheme";
import { IconTile, PRESS, PhonePage, SubPageBar, cardStyle, f, focusRing } from "@/components/phone/phone";

export const Route = createFileRoute("/my-stak_/taste")({
	component: TasteRoute,
});

/** Desktop: mix + interest list beside the selected interest in full; the phone keeps Android's cards. */
function TasteRoute() {
	return useIsMobile() ? <TasteGraphPage /> : <TasteDesktop />;
}

function TasteCardShell({ title, children }: { title: string; children: ReactNode }) {
	return (
		<section style={cardStyle(12)}>
			<h2 style={{ font: f(600, 15, 19, "heading"), color: "#fff" }}>{title}</h2>
			{children}
		</section>
	);
}

const STRENGTH_CHIP: Record<Strength, { bg: string; ink: string }> = {
	strong: { bg: DISC.blue, ink: DISC.pageBg }, // navy on teal: white was 2.4:1
	moderate: { bg: "#3A465E", ink: DISC.body },
	emerging: { bg: DISC.divider, ink: DISC.body },
};

function StrengthChip({ strength }: { strength: Strength }) {
	const { bg, ink } = STRENGTH_CHIP[strength];
	return (
		<span className="shrink-0" style={{ borderRadius: 999, padding: `${cu(3)} ${cu(10)}`, background: bg, color: ink, font: f(500, 11, 14) }}>
			{STRENGTH_LABEL[strength]}
		</span>
	);
}

function ThemeRow({ theme }: { theme: Theme }) {
	const [open, setOpen] = useState(false);
	const evidence = evidenceForTheme(theme);
	const sharePct = theme.share < 0.005 ? "<1" : String(Math.round(theme.share * 100));

	return (
		<button
			type="button"
			onClick={() => setOpen((v) => !v)}
			aria-expanded={open}
			className={`flex w-full flex-col text-left ${PRESS}`}
			style={{ gap: cu(8), ...focusRing }}
		>
			<div className="flex w-full items-center" style={{ gap: cu(10) }}>
				<IconTile icon={categoryIcon(theme.label)} tint={themeColor(theme.colorKey)} glyphColor={DISC.teal} size={28} glyph={16} radius={8} />
				<span className="flex-1" style={{ font: f(500, 13, 17), color: "#fff" }}>{theme.label}</span>
				<StrengthChip strength={theme.strength} />
			</div>
			{open && (
				<div style={{ display: "flex", flexDirection: "column", gap: cu(4), paddingLeft: cu(20) }}>
					{evidence.length === 0 ? (
						<p style={{ font: f(400, 12, 16), color: DISC.muted }}>Not much activity here yet.</p>
					) : (
						evidence.map((e, i) => <p key={i} style={{ font: f(400, 12, 16), color: DISC.body }}>{e.text}</p>)
					)}
					<p style={{ font: f(400, 11, 14), color: DISC.faint }}>{sharePct}% of your interest signals</p>
				</div>
			)}
		</button>
	);
}

function ShapesRow({ icon: Icon, title, body }: { icon: typeof Compass; title: string; body: string }) {
	return (
		<div className="flex items-center" style={{ gap: cu(12) }}>
			<Icon style={{ width: cu(20), height: cu(20) }} color={DISC.teal} aria-hidden="true" />
			<div style={{ display: "flex", flexDirection: "column", gap: cu(2) }}>
				<p style={{ font: f(600, 13, 17), color: "#fff" }}>{title}</p>
				<p style={{ font: f(400, 12, 16), color: DISC.muted }}>{body}</p>
			</div>
		</div>
	);
}

const Line = () => <div style={{ height: cu(1), background: DISC.divider }} />;

function TasteGraphPage() {
	const navigate = useNavigate();
	const { taste, isError, refetch } = useTaste();
	const scenario = taste ? scenarioOf(taste) : null;
	const isEmpty = !taste || taste.themes.length === 0;
	const evidence = taste ? allEvidence(taste) : [];

	return (
		<PhonePage>
			<SubPageBar onBack={() => navigate({ to: "/my-stak" })} />
			<div style={{ display: "flex", flexDirection: "column", gap: cu(16), padding: `${cu(8)} ${cu(20)} ${cu(32)}` }}>
				<div style={{ display: "flex", flexDirection: "column", gap: cu(4) }}>
					<h1 style={{ font: f(600, 24, 30, "heading"), color: "#fff" }}>Your Investing Taste</h1>
					<p style={{ font: f(400, 13, 17), color: DISC.muted }}>Built from what you save and explore.</p>
				</div>

				{isError && !taste && (
					<FailedCard title="Your Taste is unavailable" body="We couldn't load your interests. Try again later." onRetry={refetch} />
				)}

				{scenario === "paused" && (
					<p style={{ font: f(400, 12, 16), color: DISC.muted }}>
						Quiet for a while - this is built from saves and activity from before, not today. Save or explore a company in Discover to freshen it up.
					</p>
				)}

				{isEmpty ? (
					<TasteCardShell title="What draws your attention">
						<p style={{ font: f(400, 13, 19), color: DISC.body }}>
							{!taste
								? "Reading your activity…"
								: taste.totalSignals > 0
									? "Nothing you've saved or explored has stood out yet. Save a company you like in Discover."
									: "Still learning your taste. Save a few companies in Discover and this fills in."}
						</p>
					</TasteCardShell>
				) : (
					<>
						<TasteCardShell title="What draws your attention">
							<div style={{ display: "flex", flexDirection: "column", gap: cu(12) }}>
								{taste.themes.map((theme) => <ThemeRow key={theme.category} theme={theme} />)}
							</div>
							{taste.learning && (
								<p style={{ font: f(400, 12, 16), color: DISC.muted }}>
									Still learning your taste — these grow firmer as you save and explore more.
								</p>
							)}
						</TasteCardShell>

						{evidence.length > 0 && (
							<TasteCardShell title="Why STAK thinks this">
								<div style={{ display: "flex", flexDirection: "column" }}>
									{evidence.map((e, i) => (
										<div key={i}>
											{i > 0 && <div style={{ margin: `${cu(6)} 0` }}><Line /></div>}
											<div className="flex items-start" style={{ gap: cu(10) }}>
												<IconTile icon={categoryIcon(e.theme)} size={28} glyph={16} radius={8} />
												<div style={{ display: "flex", flexDirection: "column", gap: cu(2) }}>
													<p style={{ font: f(600, 13, 17), color: "#fff" }}>{e.theme}</p>
													<p style={{ font: f(400, 12, 16), color: DISC.muted }}>{e.text}</p>
												</div>
											</div>
										</div>
									))}
								</div>
							</TasteCardShell>
						)}
					</>
				)}

				<TasteCardShell title="How this shapes your STAK">
					<div style={{ display: "flex", flexDirection: "column" }}>
						<ShapesRow icon={Compass} title="Discover" body="Companies related to your interests." />
						<div style={{ margin: `${cu(10)} 0` }}><Line /></div>
						<ShapesRow icon={Newspaper} title="Daily Brief" body="More context on the themes you follow." />
					</div>
				</TasteCardShell>

				<p style={{ font: f(400, 12, 16), color: DISC.faint }}>Your taste evolves as you explore.</p>
			</div>
		</PhonePage>
	);
}
