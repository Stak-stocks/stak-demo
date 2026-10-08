import { createContext, useContext, useId, useState, type ReactNode } from "react";
import { DISC, cu } from "@/components/discover/discoverTheme";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { GradientCta, PRESS, PhonePage, f, focusRing, sheetCard } from "@/components/phone/phone";
import { useIsMobile } from "@/hooks/use-mobile";

/** True inside the desktop (split-screen) auth frame, where a few pieces take the desktop design's look. */
const AuthDesktop = createContext(false);

/** Android enables Verify from six digits and never fixes the length (this project's Supabase codes are 8), so neither does the web. */
export const OTP_LENGTH = 6;

const SUBTITLE = "#ACAFB1";
export const AUTH_ERROR = "#E5484D";
const BORDER = "linear-gradient(to bottom, rgba(101,158,173,0.631), rgba(22,54,63,0.431))";

/** Android's AuthCta: a 52u gradient button, 20u in from each side, with a faint teal glow beneath. */
export function AuthCta({ label, onClick, disabled, type = "button" }: { label: string; onClick?: () => void; disabled?: boolean; type?: "button" | "submit" }) {
	const desk = useContext(AuthDesktop);
	return (
		<div style={{ margin: desk ? 0 : `0 ${cu(20)}` }}>
			<GradientCta
				type={type}
				onClick={onClick}
				disabled={disabled}
				rim={BORDER}
				shadow={`0 ${cu(28.18)} ${cu(16.6)} 0 rgba(105,179,202,0.03), 0 ${cu(49.86)} ${cu(19.5)} 0 rgba(105,179,202,0.01)`}
			>
				{label}
			</GradientCta>
		</div>
	);
}

/** "Back" / "Not now": the same box with no fill. */
export function AuthSecondary({ label, onClick }: { label: string; onClick: () => void }) {
	const desk = useContext(AuthDesktop);
	return (
		<div style={{ margin: desk ? 0 : `0 ${cu(20)}` }}>
			<button
				type="button"
				onClick={onClick}
				className="w-full transition-[filter] active:brightness-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
				style={{ height: cu(52), borderRadius: cu(6), border: `${cu(0.36)} solid rgba(52,59,79,0.33)`, font: f(400, 14, undefined, "heading"), color: DISC.muted, outlineColor: DISC.teal }}
			>
				{label}
			</button>
		</div>
	);
}

/** Android's AuthInput: a 14u-radius field with the placeholder as its only label; an error draws a red ring and a caption. */
export function AuthInput({ value, onChange, placeholder, label, type = "text", error, trailing, inputMode, maxLength, autoComplete, autoFocus, onEnter }: {
	value: string;
	onChange: (v: string) => void;
	placeholder: string;
	/** The field's spoken name when the placeholder isn't one (a date's "MM/DD/YYYY" is "Date of birth"). */
	label?: string;
	type?: string;
	error?: string | null;
	trailing?: ReactNode;
	inputMode?: "numeric" | "email" | "text";
	maxLength?: number;
	autoComplete?: string;
	autoFocus?: boolean;
	onEnter?: () => void;
}) {
	const errorId = useId();
	const desk = useContext(AuthDesktop);
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: cu(6) }}>
			<div className="flex items-center" style={{ gap: cu(8), borderRadius: cu(desk ? 10 : 14), background: DISC.sheet, padding: cu(16), boxShadow: error ? `inset 0 0 0 ${cu(1)} ${AUTH_ERROR}` : undefined }}>
				<input
					type={type}
					value={value}
					onChange={(e) => onChange(e.target.value)}
					onKeyDown={(e) => { if (e.key === "Enter" && onEnter) onEnter(); }}
					placeholder={placeholder}
					aria-label={label ?? placeholder}
					aria-invalid={!!error}
					aria-describedby={error ? errorId : undefined}
					inputMode={inputMode}
					maxLength={maxLength}
					autoComplete={autoComplete}
					autoFocus={autoFocus}
					className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-[#819ABB]"
					style={{ font: f(400, 13), color: "#fff", caretColor: "#69B3CA" }}
				/>
				{trailing}
			</div>
			{error && <p id={errorId} style={{ paddingLeft: cu(4), font: f(400, 11), color: AUTH_ERROR }}>{error}</p>}
		</div>
	);
}

/** The Show / Hide text inside the first password field. */
export function ShowHide({ shown, onToggle }: { shown: boolean; onToggle: () => void }) {
	return (
		<button type="button" onClick={onToggle} aria-pressed={shown} className={PRESS} style={{ font: f(500, 11), color: DISC.teal, ...focusRing }}>
			{shown ? "Hide" : "Show"}
		</button>
	);
}

export function GooglePill({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
	// Desktop design: a dark field-coloured button with white text; the phone keeps Android's white pill.
	const desk = useContext(AuthDesktop);
	if (desk) {
		return (
			<button
				type="button"
				onClick={onClick}
				disabled={disabled}
				className="flex w-full items-center justify-center transition-[filter] hover:brightness-110 active:brightness-90 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
				style={{ gap: cu(10), padding: `${cu(14.5)} 0`, ...sheetCard(10), font: f(500, 14), color: "#fff", outlineColor: DISC.teal }}
			>
				<img src="/app/ic_google_g.png" alt="" draggable={false} style={{ width: cu(18), height: cu(18) }} />
				Continue with Google
			</button>
		);
	}
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			className="flex w-full items-center justify-center transition-[filter] active:brightness-90 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
			style={{ gap: cu(10), padding: `${cu(13)} 0`, borderRadius: cu(24), background: "#fff", font: f(500, 14), color: "#0E162B", outlineColor: DISC.teal }}
		>
			<img src="/app/ic_google_g.png" alt="" draggable={false} style={{ width: cu(18), height: cu(18) }} />
			Continue with Google
		</button>
	);
}

export function OrDivider() {
	return (
		<div className="flex items-center" style={{ gap: cu(10) }} role="separator">
			<div className="flex-1" style={{ height: cu(1), background: DISC.divider }} />
			<span style={{ font: f(400, 11), color: DISC.muted }}>or</span>
			<div className="flex-1" style={{ height: cu(1), background: DISC.divider }} />
		</div>
	);
}

export function SwitchRow({ prefix, link, onClick }: { prefix: string; link: string; onClick: () => void }) {
	return (
		<div className="flex items-center justify-center" style={{ gap: cu(5) }}>
			<span style={{ font: f(400, 12), color: DISC.muted }}>{prefix}</span>
			<button type="button" onClick={onClick} className={PRESS} style={{ font: f(500, 12), color: DISC.teal, ...focusRing }}>{link}</button>
		</div>
	);
}

export const ErrorText = ({ children }: { children: ReactNode }) => (
	<p role="alert" className="text-center" style={{ padding: `0 ${cu(20)}`, font: f(400, 11), color: AUTH_ERROR }}>{children}</p>
);

export function AuthSpinner({ size = 24 }: { size?: number }) {
	return <div className="mx-auto animate-spin rounded-full" role="status" aria-label="Loading" style={{ width: cu(size), height: cu(size), border: `${cu(size / 8)} solid ${DISC.teal}33`, borderTopColor: DISC.teal }} />;
}

/** "← Back to home": the auth pages' way out, a teal text link rather than a round back button. */
export function AuthBackLink({ label, onClick }: { label: string; onClick: () => void }) {
	return (
		<button type="button" onClick={onClick} className={`inline-flex items-center hover:opacity-80 ${PRESS}`} style={{ gap: cu(6), minHeight: cu(40), font: f(500, 13), color: DISC.teal, ...focusRing }}>
			<ArrowLeft style={{ width: cu(15), height: cu(15) }} aria-hidden="true" /> {label}
		</button>
	);
}

/** The sign-in / create-account / forgot-password frame: a faint tilted brand mark behind a 342u column on the
 *  phone; on desktop, the design's split screen (brand panel left, the same form in a centred column right).
 *  Auth pages share one frame. With no `nav` of its own, a page gets a back circle to the landing page, so
 *  someone who lands on sign-in or sign-up can always get back to what STAK is. */
export function AuthScreen({ children, nav, bottom }: { children: ReactNode; nav?: ReactNode; bottom: ReactNode }) {
	const navigate = useNavigate();
	nav ??= <AuthBackLink label="Back to home" onClick={() => navigate({ to: "/welcome" })} />;
	if (!useIsMobile()) return <AuthDesktopFrame nav={nav} bottom={bottom}>{children}</AuthDesktopFrame>;
	return (
		<PhonePage>
			<div className="relative" style={{ minHeight: `min(${cu(800)}, 100dvh)`, display: "flex", flexDirection: "column" }}>
				<img src="/app/auth_watermark.png" alt="" draggable={false} className="pointer-events-none absolute select-none" style={{ left: "50%", marginLeft: cu(-182 - 9.37), top: cu(400.16), width: cu(364), height: cu(364), maxWidth: "none" }} />
				<div className="relative flex flex-1 flex-col">
					<div style={{ padding: `${cu(10)} ${cu(20)} ${cu(4)}` }}>{nav}</div>
					<div style={{ display: "flex", flexDirection: "column", gap: cu(14), padding: `${cu(14)} ${cu(24)} 0` }}>{children}</div>
					<div className="flex-1" />
					<div style={{ display: "flex", flexDirection: "column", gap: cu(12), padding: `${cu(8)} 0 ${cu(26)}` }}>{bottom}</div>
				</div>
			</div>
		</PhonePage>
	);
}

/** The glass STAK mark, already cropped into the brand panel's top-left corner (Figma export of the panel, 2x). */
const AUTH_GLASS = "/app/auth-glass.webp";

/** Desktop auth: a darker brand panel (glass mark + tagline) beside the form, centred in its own column. 1u tracks
 *  the window from 1440px wide (the design's frame), so the form keeps the design's proportions on bigger screens. */
function AuthDesktopFrame({ children, nav, bottom }: { children: ReactNode; nav: ReactNode; bottom: ReactNode }) {
	return (
		<AuthDesktop.Provider value>
			<div className="grid min-h-dvh grid-cols-[41.6%_minmax(0,1fr)]" style={{ background: "#0A1020" }}>
				<aside className="relative overflow-hidden" style={{ background: "#050B1C" }} aria-label="STAK">
					<img
						src={AUTH_GLASS}
						alt=""
						draggable={false}
						className="pointer-events-none absolute select-none"
						style={{ left: 0, top: 0, width: "100%", maxWidth: "none" }}
					/>
					<div className="absolute" style={{ left: "13.8%", right: "8%", top: "47%" }}>
						<p className="font-heading font-semibold text-white" style={{ fontSize: "clamp(26px, 2.2vw, 36px)", lineHeight: 1.25 }}>Before you buy it, STAK it.</p>
						<p style={{ marginTop: "0.9em", fontSize: "clamp(15px, 1.3vw, 20px)", color: DISC.body }}>Discover stocks you actually vibe with.</p>
					</div>
				</aside>
				<div className="relative flex min-h-dvh min-w-0 flex-col" style={{ ["--u" as string]: "clamp(1px, calc(100vw / 1440), 1.25px)" }}>
					<div className="absolute" style={{ right: cu(40), top: cu(40) }}>{nav}</div>
					<div className="m-auto flex w-full flex-col" style={{ maxWidth: cu(440), gap: cu(14), padding: `${cu(96)} 0 ${cu(48)}` }}>
						{children}
						<div style={{ height: cu(2) }} />
						<div style={{ display: "flex", flexDirection: "column", gap: cu(14) }}>{bottom}</div>
					</div>
				</div>
			</div>
		</AuthDesktop.Provider>
	);
}

export function AuthHeader({ title, subtitle }: { title: string; subtitle: ReactNode }) {
	const desk = useContext(AuthDesktop);
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: cu(desk ? 8 : 12), marginBottom: desk ? cu(30) : 0 }}>
			<h1 style={{ font: desk ? f(600, 32, 40, "heading") : f(600, 26, 33, "heading"), color: "#fff" }}>{title}</h1>
			<p style={{ font: desk ? f(400, 13.5, 19) : f(400, 12, 16), color: desk ? DISC.muted : SUBTITLE }}>{subtitle}</p>
		</div>
	);
}

/** Android's friendlyError: Supabase failures in plain words. */
export function friendlyAuthError(err: unknown): string {
	const message = err instanceof Error ? err.message : "";
	const m = message.toLowerCase();
	if (m.includes("invalid_credentials") || m.includes("invalid login credentials")) return "Wrong email or password";
	if (m.includes("already registered") || m.includes("already been registered")) return "An account with this email already exists";
	if (m.includes("network") || m.includes("unable to resolve host") || m.includes("failed to fetch")) return "Network error — check your connection";
	if (m.includes("weak_password") || m.includes("weak password")) return "Password is too weak — use at least 8 characters";
	if (m.includes("email not confirmed")) return "Confirm your email first — check your inbox for the link we sent.";
	if (m.includes("user not found")) return "No account found for that email";
	if (m.includes("security purposes")) return "Give it a moment before trying again.";
	if (m.includes("token has expired or is invalid") || m.includes("invalid otp") || m.includes("otp_expired")) return "That code's wrong or expired — check the email again, or tap Resend.";
	return message || "Something went wrong. Try again.";
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;
export const emailError = (email: string) => {
	const t = email.trim();
	if (!t) return "Enter your email address";
	return EMAIL_RE.test(t) ? null : "That doesn’t look like an email address";
};
export const passwordError = (p: string) => (!p ? "Enter your password" : p.length < 8 ? "Use at least 8 characters" : null);
export const confirmError = (p: string, c: string) => (!c ? "Confirm your password" : c !== p ? "Passwords don’t match" : null);

/** One hidden/shown state for a pair of password fields. */
export function usePasswordVisibility() {
	const [shown, setShown] = useState(false);
	return { shown, toggle: () => setShown((s) => !s) };
}
