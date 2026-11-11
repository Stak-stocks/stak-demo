import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SettingsCard, SettingsLinkRow, SettingsScaffold } from "@/components/profile/ProfileKit";
import { DISC, cu } from "@/components/discover/discoverTheme";
import { PRESS, f, focusRing } from "@/components/phone/phone";
import { REPORT_SUBJECT, SUPPORT_EMAIL, SUPPORT_SUBJECT, SUPPORT_URL, supportEmailBody, supportQuestion, type SupportQuestion } from "@stak/shared";

export const Route = createFileRoute("/profile_/help-support")({
	component: HelpSupportPage,
});

// The three the apps show too; the rest are on the public support page ("More help").
const FAQS = ["real-money", "prices", "data-private"].map(supportQuestion).filter((x): x is SupportQuestion => !!x);
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

/** The browser at the foot of a support email, as the apps add the phone - so a reply needn't ask. */
function deviceLine(): string {
	return `STAK web, ${navigator.userAgent}`;
}

/** Android's Help & support: one card - three questions, then support links and the version. */
function HelpSupportPage() {
	const open = (href: string) => { window.location.href = href; };
	return (
		<SettingsScaffold title="Help & support">
			<SettingsCard>
				{FAQS.map((item) => <FaqRow key={item.q} q={item.q} a={item.a} />)}
				<SettingsLinkRow label="More help" onClick={() => window.open(SUPPORT_URL, "_blank", "noopener,noreferrer")} />
				<SettingsLinkRow label="Email support" onClick={() => open(`mailto:${SUPPORT_EMAIL}?subject=${enc(SUPPORT_SUBJECT)}&body=${enc(supportEmailBody("support", deviceLine()))}`)} />
				<SettingsLinkRow label="Report a problem" onClick={() => open(`mailto:${SUPPORT_EMAIL}?subject=${enc(REPORT_SUBJECT)}&body=${enc(supportEmailBody("report", deviceLine()))}`)} />
				<SettingsLinkRow label="Terms of service" onClick={() => window.open("https://thestak.org/terms", "_blank", "noopener,noreferrer")} />
				<SettingsLinkRow label="Privacy policy" onClick={() => window.open("https://thestak.org/privacy", "_blank", "noopener,noreferrer")} />
				<SettingsLinkRow label="Version" value={APP_VERSION} chevron={false} />
			</SettingsCard>
		</SettingsScaffold>
	);
}
