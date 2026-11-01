import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useOnboarding } from "@/context/OnboardingContext";
import { QuizStepShell, useQuizDesktop } from "@/components/onboarding/QuizStepShell";
import { BRAND_PICK_NAMES } from "@/lib/tasteModel";
import { DISC, cu } from "@/components/discover/discoverTheme";
import { PRESS, f, focusRing, sheetCard } from "@/components/phone/phone";

export const Route = createFileRoute("/onboarding_/brand-picks")({
	component: BrandPicksPage,
});

const MIN_PICKS = 3;

// What a tile is called and which bundled logo it wears; picks are stored under the catalogue's own names.
const ART: Record<string, { label: string; file: string }> = {
	Apple: { label: "Apple", file: "apple" }, Tesla: { label: "Tesla", file: "tesla" }, Nike: { label: "Nike", file: "nike" },
	Spotify: { label: "Spotify", file: "spotify" }, Netflix: { label: "Netflix", file: "netflix" }, Amazon: { label: "Amazon", file: "amazon" },
	Disney: { label: "Disney", file: "disney" }, Microsoft: { label: "Microsoft", file: "microsoft" }, NVIDIA: { label: "NVIDIA", file: "nvidia" },
	"Sony Group Corp": { label: "PlayStation", file: "playstation" }, Coinbase: { label: "Coinbase", file: "coinbase" }, Uber: { label: "Uber", file: "uber" },
};

/** Android's Brand picks: twelve familiar brands in a 3-wide grid; three or more unlock Continue. */
function BrandPicksPage() {
	const navigate = useNavigate();
	const { brandPicks, setBrandPicks } = useOnboarding();

	function toggle(name: string) {
		setBrandPicks(brandPicks.includes(name) ? brandPicks.filter((n) => n !== name) : [...brandPicks, name]);
	}

	return (
		<QuizStepShell
			stepLabel="STEP 2 OF 6"
			title="Which brands do you know or use?"
			subtitle="Pick a few. STAK uses this to learn what feels familiar to you."
			subtitleWidth={303}
			gap={18}
			caption="You can change this later"
			continueLabel={brandPicks.length > 0 ? `Continue · ${brandPicks.length} picked` : "Continue"}
			continueDisabled={brandPicks.length < MIN_PICKS}
			onBack={() => navigate({ to: "/onboarding" })}
			secondary={{ label: "Back", onClick: () => navigate({ to: "/onboarding" }) }}
			onContinue={() => navigate({ to: "/onboarding/swipe-tutorial" })}
			contentWidth={960}
		>
			<BrandGrid picks={brandPicks} onToggle={toggle} />
		</QuizStepShell>
	);
}

/** The twelve brands: three to a row with the logo above the name on the phone, four to a row side by side on desktop. */
function BrandGrid({ picks, onToggle }: { picks: string[]; onToggle: (name: string) => void }) {
	const desk = useQuizDesktop();
	const brandPicks = picks;
	const toggle = onToggle;
	if (desk) {
		return (
			<div className="grid grid-cols-4" style={{ gap: cu(20) }} role="group" aria-label="Brands">
				{BRAND_PICK_NAMES.map((name) => {
					const art = ART[name] ?? { label: name, file: name.toLowerCase() };
					const selected = brandPicks.includes(name);
					return (
						<button
							key={name}
							type="button"
							onClick={() => toggle(name)}
							aria-pressed={selected}
							className={`flex items-center justify-center transition-colors hover:brightness-110 ${PRESS}`}
							style={{ gap: cu(12), height: cu(76), ...sheetCard(12), border: `1px solid ${selected ? "rgba(105,179,202,0.55)" : "transparent"}`, ...focusRing }}
						>
							<img src={`/app/brands/brand_${art.file}.png`} alt="" draggable={false} style={{ width: cu(26), height: cu(26) }} />
							<span style={{ font: f(500, 15), color: selected ? DISC.teal : "#fff" }}>{art.label}</span>
						</button>
					);
				})}
			</div>
		);
	}
	return (
			<div className="grid grid-cols-3" style={{ gap: cu(10), paddingTop: cu(6) }} role="group" aria-label="Brands">
				{BRAND_PICK_NAMES.map((name) => {
					const art = ART[name] ?? { label: name, file: name.toLowerCase() };
					const selected = brandPicks.includes(name);
					return (
						<button
							key={name}
							type="button"
							onClick={() => toggle(name)}
							aria-pressed={selected}
							className={`relative flex flex-col items-center ${PRESS}`}
							style={{ gap: cu(7), ...sheetCard(14), padding: `${cu(13)} ${cu(4)} ${cu(11)}`, ...focusRing }}
						>
							<img src={`/app/brands/brand_${art.file}.png`} alt="" draggable={false} style={{ width: cu(34), height: cu(34) }} />
							<span style={{ font: f(400, 11, 14), color: selected ? "#fff" : DISC.muted }}>{art.label}</span>
							{selected && <span className="pointer-events-none absolute inset-0" style={{ borderRadius: cu(14), boxShadow: `inset 0 0 0 ${cu(1.5)} rgba(105,179,202,0.5)` }} />}
						</button>
					);
				})}
			</div>
	);
}
