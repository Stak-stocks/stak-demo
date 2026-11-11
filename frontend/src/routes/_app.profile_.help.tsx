import { createFileRoute } from "@tanstack/react-router";
import { col } from "@/app/FitCanvas";
import { wholeMoney } from "@/app/live/format";
import { useApiHealth } from "@/app/live/quotes";
import { useLive } from "@/app/live/store";
import { PageHeader } from "@/app/PageHeader";
import { FaqRow, ValueRow } from "@/app/profile/controls";
import { APP_VERSION, helpSupport as copy, mailto, SUPPORT_EMAIL } from "@/app/profile/data";
import { useNotificationsPanel } from "@/app/profile/notifications";
import { CHEVRON, RowLabel, RowValue, rowName, SettingsCard, SettingsRow } from "@/app/profile/ui";

export const Route = createFileRoute("/_app/profile_/help")({
	component: HelpSupportPage,
});

/**
 * Profile › Help & support: the page both phones open from the hub's Contact support row (android ui/profile/
 * SettingsScreens.kt:180-207 HelpSupportScreen, 209-230 FaqRow; ios Profile/SettingsViews.swift:181-243). Figma's desktop
 * file draws no frame for it, so it is the Profile pages' layout (the page header, the 640 column) holding the phones'
 * one card, in the hub's Settings card language (2:2516: #10182B, r16, 48 px rows): the three questions open their
 * answers in place, Email support and Report a problem write to support (the report prefilled: what happened, where,
 * the version), Terms of service and Privacy policy open the site's pages in a new tab as the hub's rows do, and
 * Version is a value with nothing behind it (no chevron, not a control).
 *
 * The answers say what this website does: the paper budget is the person's own (live.budget: the persona's $10,000, an
 * account's tier budget), prices are demo ones signed out or while the market feed is unreachable, data lives in the
 * account or this browser.
 *
 * Wiring: the hub's Contact support row pushes it like Edit profile; the browser's Back and the rail's account row
 * return to the hub, as from the other Profile pages. The root names the tab ("Help & support · STAK", titles.ts).
 */
function HelpSupportPage() {
	const notifications = useNotificationsPanel();
	const live = useLive();
	const healthy = useApiHealth();
	const { faq } = copy;
	const prices = !live.signedIn ? faq.prices.signedOut : healthy ? faq.prices.live : faq.prices.offline;

	const rows = [
		{ label: copy.email.label, href: mailto(SUPPORT_EMAIL, copy.email.subject) },
		{ label: copy.report.label, href: mailto(SUPPORT_EMAIL, copy.report.subject, copy.report.body(APP_VERSION)) },
		{ label: copy.terms.label, href: copy.terms.href, external: true },
		{ label: copy.privacy.label, href: copy.privacy.href, external: true },
	];

	return (
		<div className="relative flex w-full flex-col items-start gap-[29px]">
			<PageHeader title={copy.title} onBell={notifications.toggle} />
			{notifications.panel}
			<div className="flex flex-col items-start gap-[16px]" style={{ width: col(640) }}>
				<SettingsCard>
					<FaqRow question={faq.money.question} answer={faq.money.answer(wholeMoney(live.budget))} />
					<FaqRow question={faq.prices.question} answer={prices} />
					<FaqRow question={faq.data.question} answer={live.signedIn ? faq.data.signedIn : faq.data.signedOut} />
					{rows.map((row) => (
						<SettingsRow
							key={row.label}
							href={row.href}
							external={row.external}
							name={rowName(row.label)}
							left={<RowLabel>{row.label}</RowLabel>}
							right={<RowValue>{CHEVRON}</RowValue>}
						/>
					))}
					<ValueRow label={copy.version} value={APP_VERSION} />
				</SettingsCard>
			</div>
		</div>
	);
}
