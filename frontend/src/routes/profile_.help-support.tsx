import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SettingsCard, SettingsLinkRow, SettingsScaffold } from "@/components/profile/ProfileKit";
import { DISC, cu } from "@/components/discover/discoverTheme";
import { PRESS, f, focusRing } from "@/components/phone/phone";

export const Route = createFileRoute("/profile_/help-support")({
	component: HelpSupportPage,
});

const FAQS = [
	{ q: "Is this real money?", a: "No. In Simulate you practice with pretend money, starting with what you’d really invest. Nothing is bought or sold for real." },
	{ q: "Where do the prices come from?", a: "Real prices from the US stock market. They update on their own while the market is open (9:30am to 4pm ET, weekdays). When it's closed, you see the last closing price." },
	{ q: "Is my data private?", a: "Your saved stocks, taste answers and paper portfolio are stored with your STAK account, so they follow you to a new device. STAK never sells your data." },
];

const SUPPORT_EMAIL = "support@thestak.org";
const APP_VERSION = "web";
const enc = encodeURIComponent;

function FaqRow({ q, a }: { q: string; a: string }) {
	const [open, setOpen] = useState(false);
	return (
		<div>
			<button
				type="button"
				onClick={() => setOpen((v) => !v)}
				aria-expanded={open}
				className={`flex w-full items-center text-left ${PRESS}`}
				style={{ height: cu(48), padding: `0 ${cu(14)}`, ...focusRing }}
			>
				<span className="flex-1" style={{ font: f(500, 13), color: "#fff" }}>{q}</span>
				<span style={{ font: f(400, 14), color: DISC.muted }} aria-hidden="true">{open ? "⌃" : "⌄"}</span>
			</button>
			{open && <p style={{ padding: `0 ${cu(14)} ${cu(12)}`, font: f(400, 12, 17), color: DISC.body }}>{a}</p>}
		</div>
	);
}

/** Android's Help & support: one card - three questions, then support links and the version. */
function HelpSupportPage() {
	const open = (href: string) => { window.location.href = href; };
	return (
		<SettingsScaffold title="Help & support">
			<SettingsCard>
				{FAQS.map((item) => <FaqRow key={item.q} q={item.q} a={item.a} />)}
				<SettingsLinkRow label="Email support" onClick={() => open(`mailto:${SUPPORT_EMAIL}?subject=${enc("STAK support")}`)} />
				<SettingsLinkRow label="Report a problem" onClick={() => open(`mailto:${SUPPORT_EMAIL}?subject=${enc("STAK problem report")}&body=${enc(`What happened:\n\nWhere in the app:\n\nApp version ${APP_VERSION}`)}`)} />
				<SettingsLinkRow label="Terms of service" onClick={() => window.open("https://thestak.org/terms", "_blank", "noopener,noreferrer")} />
				<SettingsLinkRow label="Privacy policy" onClick={() => window.open("https://thestak.org/privacy", "_blank", "noopener,noreferrer")} />
				<SettingsLinkRow label="Version" value={APP_VERSION} chevron={false} />
			</SettingsCard>
		</SettingsScaffold>
	);
}
