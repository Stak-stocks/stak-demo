import { useState, type CSSProperties, type ReactNode } from "react";
import { ChevronRight, FileText, Lock, type LucideIcon } from "lucide-react";
import { PRIVACY_URL, TERMS_URL } from "@stak/shared";
import { confirmEligibility } from "@/lib/api";
import { DISC, cu } from "@/components/discover/discoverTheme";
import { PRESS, f, focusRing } from "@/components/phone/phone";
import { AuthBackLink, AuthCta, AuthHeader, AuthInset, AuthScreen, ErrorText } from "@/components/auth/AuthKit";

/** The app's glass STAK mark (the splash art, small). */
const GLASS_MARK = "/app/stak_glass_mark.webp";

const ROW: CSSProperties = { display: "flex", alignItems: "center", gap: cu(12), minHeight: cu(54), padding: `${cu(10)} ${cu(16)}` };

/** One line of the card: a teal icon and a document's name. */
function RowBody({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
	return (
		<>
			<span aria-hidden="true" className="grid shrink-0 place-items-center rounded-full" style={{ width: cu(32), height: cu(32), background: "rgba(105,179,202,0.14)" }}>
				<Icon style={{ width: cu(17), height: cu(17), color: DISC.teal }} strokeWidth={2.2} />
			</span>
			<span className="min-w-0 flex-1 text-left" style={{ font: f(500, 14, 19), color: DISC.teal }}>
				{label}
				<span className="sr-only"> (opens in a new tab)</span>
			</span>
			<ChevronRight aria-hidden="true" style={{ width: cu(18), height: cu(18), color: DISC.muted }} />
		</>
	);
}

/** A row of the card's list; every row after the first has a hairline above it, inset past the icon. */
function Item({ first = false, children }: { first?: boolean; children: ReactNode }) {
	return (
		<li style={{ listStyle: "none" }}>
			{!first && <div aria-hidden="true" style={{ height: 1, marginLeft: cu(60), background: "var(--divider)" }} />}
			{children}
		</li>
	);
}

/** A document row: opens it in a new tab, so this screen (and the answer it's waiting for) stays where it is. */
function DocRow({ href, icon, label }: { href: string; icon: LucideIcon; label: string }) {
	return (
		<a href={href} target="_blank" rel="noopener noreferrer" className={PRESS} style={{ ...ROW, ...focusRing, textDecoration: "none" }}>
			<RowBody icon={icon} label={label} />
		</a>
	);
}

/**
 * "Before we get started", as apps' "review and agree" steps do it (and as Android / iOS): the STAK mark, the heading
 * and a card with the two documents (each opens in a new tab), centred in the space; then one sentence - 18 or older,
 * living in the United States, and agreeing to both - and "Agree and continue", which confirms it (Terms §2). Shown
 * over the whole app while the account hasn't confirmed. No date of birth. [onConfirmed] runs once the server has
 * recorded it; [onSignOut] leaves without answering.
 */
export function EligibilityGate({ onConfirmed, onSignOut }: { onConfirmed: () => void; onSignOut: () => void }) {
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const submit = async () => {
		if (busy) return;
		setBusy(true);
		setError(null);
		let confirmed = false;
		try {
			await confirmEligibility({ ageConfirmed: true, inUS: true, acceptTerms: true });
			confirmed = true;
		} catch {
			setError("Something went wrong. Try again.");
		} finally {
			setBusy(false);
		}
		if (confirmed) onConfirmed();
	};

	return (
		<AuthScreen
			watermark={false}
			centered
			nav={<AuthBackLink label="Sign out" onClick={onSignOut} />}
			bottom={<>
				{/* Right above the button it describes, so what selecting it means is in view when it's selected. */}
				<AuthInset>
					<p style={{ font: f(400, 13, 19), color: DISC.body, margin: 0 }}>
						By selecting Agree and continue, I confirm that I’m 18 or older and live in the United States, and I agree to
						the Terms of Service and Privacy Policy.
					</p>
				</AuthInset>
				{error && <AuthInset><ErrorText>{error}</ErrorText></AuthInset>}
				<AuthCta label={busy ? "Saving…" : "Agree and continue"} onClick={() => { void submit(); }} disabled={busy} />
			</>}
		>
			{/* The other auth pages' heading (their sizes on desktop too), centred under the mark. */}
			<div className="flex flex-col items-center text-center" style={{ gap: cu(18) }}>
				<img src={GLASS_MARK} alt="" width={104} height={104} style={{ width: cu(104), height: cu(104) }} />
				<AuthHeader title="Before we get started" subtitle="STAK’s beta is open to adults in the United States. Please review our terms before you continue." />
			</div>
			{/* role="list": Safari drops a list's role once its bullets are styled away. */}
			<ul role="list" aria-label="Our terms" style={{ margin: `${cu(10)} 0 0`, padding: 0, borderRadius: cu(16), background: "var(--surface-1)", boxShadow: `inset 0 0 0 1px ${DISC.cardBorder}` }}>
				<Item first><DocRow href={TERMS_URL} icon={FileText} label="Terms of Service" /></Item>
				<Item><DocRow href={PRIVACY_URL} icon={Lock} label="Privacy Policy" /></Item>
			</ul>
		</AuthScreen>
	);
}
