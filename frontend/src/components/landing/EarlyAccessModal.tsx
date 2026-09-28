import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, CircleCheck, Instagram, Mail, X } from "lucide-react";
import { joinWaitlist } from "@/lib/api";
import { DISC } from "@/components/discover/discoverTheme";

const INSTAGRAM_URL = "https://www.instagram.com/just_stak";
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;
const FOCUS = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#69B3CA]";

/**
 * "Get early access": asks for an email (no long form), saves it to the early-access list, then says you're on it
 * with a link to follow STAK on Instagram. Portalled to <body> - the landing page is a scaled canvas, and a fixed
 * overlay inside a transformed parent would be scaled and positioned with it.
 */
export function EarlyAccessModal({ open, onClose }: { open: boolean; onClose: () => void }) {
	const [email, setEmail] = useState("");
	const [state, setState] = useState<"form" | "sending" | "done">("form");
	const [error, setError] = useState<string | null>(null);
	// A repeat sign-up is told so, rather than thanked as if new (a deliberate choice over hiding who has joined).
	const [already, setAlready] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);
	const dialogRef = useRef<HTMLDivElement>(null);
	const titleId = useId();
	const errorId = useId();

	// Opening starts fresh with the cursor in the email field; closing hands focus back to what opened it.
	useEffect(() => {
		if (!open) return;
		const opener = document.activeElement as HTMLElement | null;
		setState("form");
		setError(null);
		setAlready(false);
		requestAnimationFrame(() => inputRef.current?.focus());
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
			// Keep Tab inside the dialog while it's open.
			if (e.key === "Tab" && dialogRef.current) {
				const items = [...dialogRef.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), input:not([disabled])")];
				if (items.length === 0) return;
				const first = items[0]!, last = items[items.length - 1]!;
				if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
				else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
			}
		};
		document.addEventListener("keydown", onKey);
		const overflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		return () => {
			document.removeEventListener("keydown", onKey);
			document.body.style.overflow = overflow;
			opener?.focus?.();
		};
	}, [open, onClose]);

	if (!open) return null;

	async function submit(e: FormEvent) {
		e.preventDefault();
		if (state === "sending") return;
		const value = email.trim();
		if (!EMAIL_RE.test(value)) { setError("Enter a valid email address."); return; }
		setError(null);
		setState("sending");
		try {
			const result = await joinWaitlist(value);
			setAlready(result.already);
			setState("done");
		} catch (err) {
			setError(err instanceof Error && err.message && !err.message.startsWith("API error") ? err.message : "Couldn't add you just now. Try again.");
			setState("form");
		}
	}

	return createPortal(
		<div className="fixed inset-0 z-[200] grid place-items-center p-4" style={{ background: "rgba(4,8,18,0.72)", backdropFilter: "blur(6px)" }} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
			<div
				ref={dialogRef}
				role="dialog"
				aria-modal="true"
				aria-labelledby={titleId}
				className="relative w-full max-w-[440px] rounded-[20px] p-7 sm:p-8"
				style={{ background: "#0E1626", border: "1px solid rgba(105,179,202,0.28)", boxShadow: "0 30px 80px rgba(0,0,0,0.55)", fontFamily: "'Sora', sans-serif" }}
			>
				<div className="flex items-center justify-between">
					<img src="/images/landing-v2/nav-logo-word.svg" alt="STAK" style={{ width: 70, height: 13.4 }} />
					<button type="button" onClick={onClose} aria-label="Close" className={`grid h-[32px] w-[32px] place-items-center rounded-full transition-colors hover:bg-white/[0.06] ${FOCUS}`}>
						<X className="h-[18px] w-[18px]" style={{ color: DISC.muted }} aria-hidden="true" />
					</button>
				</div>

				{state === "done" ? (
					<div className="flex flex-col items-center pt-6 text-center">
						<span className="grid h-[64px] w-[64px] place-items-center rounded-full" style={{ background: "rgba(105,179,202,0.12)", boxShadow: "0 0 0 1px rgba(105,179,202,0.4)" }}>
							<CircleCheck className="h-[34px] w-[34px]" style={{ color: DISC.teal }} aria-hidden="true" />
						</span>
						<h2 id={titleId} className="mt-5 text-[24px] font-semibold leading-[30px] text-white">{already ? "You're already on the list!" : "You're on the list!"}</h2>
						<p role="status" className="mt-2 text-[14px] leading-[21px]" style={{ color: DISC.body }}>
							{already ? "This email already has early access saved." : "Thanks for joining early access."}<br />We'll be in touch soon with next steps.
						</p>
						<a
							href={INSTAGRAM_URL}
							target="_blank"
							rel="noopener noreferrer"
							className={`mt-6 flex h-[48px] w-full items-center justify-center gap-2 rounded-full text-[14px] font-medium text-white transition-colors hover:bg-white/[0.05] ${FOCUS}`}
							style={{ border: "1px solid rgba(105,179,202,0.5)" }}
						>
							<Instagram className="h-[18px] w-[18px]" aria-hidden="true" /> Follow us on Instagram
						</a>
						<button type="button" onClick={onClose} className={`mt-4 rounded-md text-[13px] font-medium underline underline-offset-4 hover:opacity-80 ${FOCUS}`} style={{ color: DISC.teal }}>Close</button>
					</div>
				) : (
					<form onSubmit={submit} noValidate className="pt-6">
						<h2 id={titleId} className="text-[26px] font-semibold leading-[33px] text-white">Be the first to experience STAK.</h2>
						<p className="mt-3 text-[14px] leading-[21px]" style={{ color: DISC.body }}>Get early access to the app and join our first community of beta testers.</p>
						<label className="mt-6 flex h-[50px] items-center gap-3 rounded-[12px] px-4 focus-within:ring-1 focus-within:ring-[#69B3CA]" style={{ background: "#0A1020", border: `1px solid ${error ? "#E5484D" : "rgba(255,255,255,0.1)"}` }}>
							<Mail className="h-[17px] w-[17px] shrink-0" style={{ color: DISC.muted }} aria-hidden="true" />
							<input
								ref={inputRef}
								type="email"
								inputMode="email"
								autoComplete="email"
								value={email}
								onChange={(e) => { setEmail(e.target.value); if (error) setError(null); }}
								placeholder="Enter your email"
								aria-label="Email address"
								aria-invalid={!!error}
								aria-describedby={error ? errorId : undefined}
								className="min-w-0 flex-1 bg-transparent text-[14px] text-white outline-none placeholder:text-[#819ABB]"
								style={{ caretColor: DISC.teal }}
							/>
						</label>
						{error && <p id={errorId} role="alert" className="mt-2 text-[12.5px]" style={{ color: "#E5484D" }}>{error}</p>}
						<button
							type="submit"
							disabled={state === "sending"}
							className={`mt-4 flex h-[50px] w-full items-center justify-center gap-2 rounded-[12px] text-[15px] font-semibold text-white transition-[filter,opacity] hover:brightness-110 disabled:opacity-60 ${FOCUS}`}
							style={{ background: DISC.cta }}
						>
							{state === "sending" ? "Joining…" : <>Join early access <ArrowRight className="h-[17px] w-[17px]" aria-hidden="true" /></>}
						</button>
						<p className="mt-4 text-center text-[12px] leading-[18px]" style={{ color: DISC.muted }}>No spam. Just early access, product updates, and the chance to help shape STAK.</p>
					</form>
				)}
			</div>
		</div>,
		document.body,
	);
}
