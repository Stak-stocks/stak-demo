import { useEffect, useRef, useState } from "react";
import { AuthCta, AuthHeader, AuthInset, AuthScreen, ErrorText } from "@/components/auth/AuthKit";
import { DISC, cu } from "@/components/discover/discoverTheme";
import { PRESS, f, focusRing } from "@/components/phone/phone";

/**
 * "Have you used STAK before?" (as iOS's RootFlowView): a first Sign in with Apple where the person hid their email
 * just made a new account, and STAK can't tell from Apple's made-up address whether they already have one under email
 * or Google. A page of its own over everything, with no way past it but the two answers, so it can't leave a half-made
 * account signed in. [onExisting] says how undoing the empty account went; past the server's window it can't be undone
 * any more, and [onSignOut] is offered instead.
 */
export function AppleNewOrExisting({ onNew, onExisting, onSignOut }: {
	onNew: () => void;
	onExisting: () => Promise<"done" | "failed" | "too-late">;
	onSignOut: () => void;
}) {
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [tooLate, setTooLate] = useState(false);
	const heading = useRef<HTMLDivElement>(null);
	const existingButton = useRef<HTMLButtonElement>(null);
	useEffect(() => {
		heading.current?.focus();
		const before = document.title;
		document.title = "Have you used STAK before? · STAK";
		return () => { document.title = before; };
	}, []);

	async function existing() {
		setBusy(true);
		setError(null);
		const outcome = await onExisting();
		if (outcome === "done") return;
		setTooLate(outcome === "too-late");
		setError(outcome === "too-late"
			? "This sign-in is too old to undo here. Choose \"I'm new to STAK\", or sign out and sign in the way you did before."
			: "Couldn't undo that sign-in. Check your connection and try again, or choose \"I'm new to STAK\".");
		setBusy(false);
		// The button was disabled while it worked; focus goes back to it, not to the page.
		requestAnimationFrame(() => existingButton.current?.focus());
	}

	return (
		<AuthScreen
			watermark={false}
			centered
			nav={<span />}
			bottom={<>
				<div role="status" aria-live="polite">
					{error && <AuthInset><ErrorText>{error}</ErrorText></AuthInset>}
					{busy && <span className="sr-only">Undoing that sign-in</span>}
				</div>
				<AuthCta label="I'm new to STAK" onClick={onNew} disabled={busy} />
				<button
					ref={existingButton}
					type="button"
					onClick={tooLate ? onSignOut : () => { void existing(); }}
					disabled={busy}
					aria-busy={busy}
					className={`w-full disabled:opacity-50 ${PRESS}`}
					style={{ minHeight: cu(48), font: f(500, 14), color: DISC.teal, ...focusRing }}
				>
					{tooLate ? "Sign out" : "I already have an account"}
				</button>
			</>}
		>
			<div ref={heading} tabIndex={-1} style={{ outline: "none" }}>
				<AuthHeader
					title="Have you used STAK before?"
					subtitle="You chose to hide your email, so STAK can't tell. If you already have an account, sign in to it and we'll link Apple to it - your saves and history stay together."
				/>
			</div>
		</AuthScreen>
	);
}
