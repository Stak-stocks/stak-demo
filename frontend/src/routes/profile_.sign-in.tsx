import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import type { UserIdentity } from "@supabase/supabase-js";
import { useAuth } from "@/context/AuthContext";
import { isHiddenAppleEmail, supabase } from "@/lib/supabase";
import { Caption, SettingsCard, SettingsLinkRow, SettingsScaffold } from "@/components/profile/ProfileKit";
import { DISC, cu } from "@/components/discover/discoverTheme";
import { f } from "@/components/phone/phone";

export const Route = createFileRoute("/profile_/sign-in")({
	component: SignInPage,
});

/** The names the page shows, in its order. */
const NAMES: Record<string, string> = { email: "Email and password", google: "Google", apple: "Apple" };
/** What this website can link: Google (Apple once its web sign-in is set up in Supabase). */
const LINKABLE = ["google"];
/** The ways in this website can sign in with: Unlink is offered only while one of these is left. */
const WEB_SIGN_IN = ["email", "google"];

/** Why a link failed, from Supabase's error code. */
function linkProblem(code: string | null | undefined): string {
	if (code === "identity_already_exists") return "That account already has its own STAK account. To link it here, sign in with it, delete that STAK account in Profile, then try again.";
	if (code === "manual_linking_disabled") return "Linking isn't available yet. Try again later.";
	return "Couldn't link that account. Try again.";
}

/**
 * The account's ways to sign in (Supabase identities): each linked one, with Unlink while another is left, and Link for
 * Google. Linking goes through Google's page and comes back here. Needs "Allow manual linking" on in Supabase. Mirrors
 * the apps' Sign-in page.
 */
function SignInPage() {
	const { appUser } = useAuth();
	const [identities, setIdentities] = useState<UserIdentity[] | null>(null);
	const [busy, setBusy] = useState<string | null>(null);
	const [problem, setProblem] = useState<string | null>(null);
	const [confirm, setConfirm] = useState<UserIdentity | null>(null);
	const confirmRef = useRef<HTMLButtonElement>(null);

	const reload = useCallback(async () => {
		const { data, error } = await supabase.auth.getUserIdentities();
		if (error) {
			setIdentities((cur) => cur ?? []);
			setProblem("Couldn't load your sign-in methods. Check your connection.");
			return;
		}
		setIdentities(data.identities);
	}, []);
	useEffect(() => { void reload(); }, [reload]);
	// A failed link comes back here from Google with the reason in the address: show it, then tidy the address.
	useEffect(() => {
		const query = new URLSearchParams(window.location.search);
		const hash = new URLSearchParams(window.location.hash.slice(1));
		const error = query.get("error") ?? hash.get("error");
		if (!error) return;
		setProblem(linkProblem(query.get("error_code") ?? hash.get("error_code")));
		window.history.replaceState(null, "", window.location.pathname);
	}, []);
	// The confirm card takes focus when it opens, so keyboard and screen-reader users land on it.
	useEffect(() => { if (confirm) confirmRef.current?.focus(); }, [confirm]);

	async function link(provider: string) {
		setProblem(null);
		setBusy(provider);
		// Leaves for the provider's page; Supabase brings the browser back here with it linked.
		const { error } = await supabase.auth.linkIdentity({
			provider: provider as "google",
			options: { redirectTo: `${window.location.origin}/profile/sign-in` },
		});
		if (error) {
			setBusy(null);
			setProblem(linkProblem(error.code));
		}
	}

	async function unlink(identity: UserIdentity) {
		setConfirm(null);
		setProblem(null);
		setBusy(identity.provider);
		const { error } = await supabase.auth.unlinkIdentity(identity);
		if (error) setProblem("Couldn't unlink that. Try again.");
		await reload();
		setBusy(null);
	}

	const list = identities ?? [];
	return (
		<SettingsScaffold title="Sign-in">
			<SettingsCard>
				{identities === null ? (
					<p style={{ padding: cu(16), font: f(400, 12), color: DISC.muted }}>Loading…</p>
				) : (
					Object.entries(NAMES).map(([provider, name]) => {
						const identity = list.find((i) => i.provider === provider);
						// Email and Apple show once they're a way in; Google can always be linked here.
						if (!identity && !LINKABLE.includes(provider)) return null;
						// Unlink only while a way in this website can use is left (Apple alone would lock it out here).
						const keepsWayIn = list.some((i) => i !== identity && WEB_SIGN_IN.includes(i.provider));
						const action = !identity ? () => void link(provider) : keepsWayIn ? () => setConfirm(identity) : undefined;
						return <MethodRow key={provider} name={name} linked={!!identity} busy={busy === provider} onAction={action} />;
					})
				)}
				{appUser?.email && !isHiddenAppleEmail(appUser.email) && (
					<SettingsLinkRow label="Email" value={appUser.email} chevron={false} />
				)}
				{problem && <p role="alert" style={{ padding: `${cu(10)} ${cu(14)}`, font: f(400, 12), color: "#FF6B6B" }}>{problem}</p>}
			</SettingsCard>
			{confirm && (
				<SettingsCard padding="14u 14u">
					<p style={{ font: f(500, 13, 18), color: "#fff" }}>Unlink {NAMES[confirm.provider] ?? confirm.provider}?</p>
					<p style={{ marginTop: cu(4), font: f(400, 12, 17), color: DISC.muted }}>You won't be able to sign in with it anymore. Your STAK stays the same.</p>
					<div className="flex" style={{ gap: cu(16), marginTop: cu(12) }}>
						<button ref={confirmRef} type="button" onClick={() => void unlink(confirm)} style={{ font: f(500, 13), color: "#FF6B6B", minHeight: 44 }}>Unlink</button>
						<button type="button" onClick={() => setConfirm(null)} style={{ font: f(500, 13), color: DISC.teal, minHeight: 44 }}>Cancel</button>
					</div>
				</SettingsCard>
			)}
			<Caption>Link another way to sign in to this same account, on this device or a new one. You can unlink one as long as another is left.</Caption>
		</SettingsScaffold>
	);
}

/** One way to sign in: linked or not, and its one action (none for the last one left). */
function MethodRow({ name, linked, busy, onAction }: { name: string; linked: boolean; busy: boolean; onAction?: () => void }) {
	return (
		<div className="flex items-center" style={{ height: cu(48), padding: `0 ${cu(14)}` }}>
			<span style={{ font: f(500, 13, 17), color: "#fff" }}>{name}</span>
			<span className="flex-1" />
			<span style={{ paddingRight: onAction || busy ? cu(12) : 0, font: f(400, 12), color: linked ? DISC.teal : DISC.muted }}>{linked ? "Linked" : "Not linked"}</span>
			{busy ? (
				<span role="status" aria-label={`${linked ? "Unlinking" : "Linking"} ${name}`} className="animate-spin rounded-full" style={{ width: cu(16), height: cu(16), border: `2px solid ${DISC.teal}33`, borderTopColor: DISC.teal }} />
			) : onAction ? (
				<button type="button" onClick={onAction} aria-label={`${linked ? "Unlink" : "Link"} ${name}`} className="transition-opacity active:opacity-70" style={{ font: f(500, 13), color: DISC.teal, minHeight: 44 }}>
					{linked ? "Unlink" : "Link"}
				</button>
			) : null}
		</div>
	);
}
