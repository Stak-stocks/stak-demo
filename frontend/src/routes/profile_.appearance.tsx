import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { getAppearance, setAppearance, type Appearance } from "@/lib/appearance";
import { Caption, SettingsCard } from "@/components/profile/ProfileKit";
import { SettingsScaffold } from "@/components/profile/ProfileKit";
import { DISC, cu } from "@/components/discover/discoverTheme";
import { PRESS, f, focusRing } from "@/components/phone/phone";

export const Route = createFileRoute("/profile_/appearance")({
	component: AppearancePage,
});

const OPTIONS: ReadonlyArray<readonly [Appearance, string]> = [["dark", "Dark"], ["system", "Match system"]];

/** Android's Appearance: two rows with a check on the chosen one. Only remembered; the theme stays dark. */
function AppearancePage() {
	const [value, setValue] = useState<Appearance>(getAppearance());
	return (
		<SettingsScaffold title="Appearance">
			<SettingsCard>
				<div role="radiogroup" aria-label="Appearance">
					{OPTIONS.map(([key, label]) => (
						<button
							key={key}
							type="button"
							role="radio"
							aria-checked={value === key}
							onClick={() => { setValue(key); setAppearance(key); }}
							className={`flex w-full items-center text-left ${PRESS}`}
							style={{ height: cu(48), padding: `0 ${cu(14)}`, ...focusRing }}
						>
							<span className="flex-1" style={{ font: f(500, 13, 17), color: "#fff" }}>{label}</span>
							{value === key && <span style={{ font: f(500, 14), color: DISC.teal }} aria-hidden="true">✓</span>}
						</button>
					))}
				</div>
			</SettingsCard>
			<Caption>STAK is designed for dark mode. Match system keeps it dark for now and follows your device once a light theme ships.</Caption>
		</SettingsScaffold>
	);
}
