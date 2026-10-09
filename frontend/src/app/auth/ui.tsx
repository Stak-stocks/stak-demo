import { Link, useNavigate } from "@tanstack/react-router";
import type { ButtonHTMLAttributes, CSSProperties, InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { fillHeight } from "@/app/FitCanvas";
import { AU } from "./assets";

/** Button canon (00 References): r6, h52, Geist Medium, hairline + glow, gradient fill. */
export const PRIMARY_GRADIENT =
	"linear-gradient(180deg, rgb(166, 228, 247) 8.8889%, rgb(93, 168, 191) 39.189%, rgb(60, 152, 180) 72.549%), linear-gradient(90deg, rgb(44, 157, 188) 0%, rgb(44, 157, 188) 100%)";

export const PRIMARY_SHADOW =
	"shadow-[0px_77.322px_21.679px_0px_rgba(82,170,199,0),0px_49.862px_19.511px_0px_rgba(82,170,199,0.01),0px_28.183px_16.621px_0px_rgba(82,170,199,0.03)]";

export function PrimaryButton({ className, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
	return (
		<button
			type="button"
			{...props}
			className={cn(
				"stak-press flex h-[52px] w-full cursor-pointer items-center justify-center overflow-clip rounded-[6px] border-[0.361px] border-solid border-[rgba(101,158,173,0.63)] disabled:cursor-not-allowed",
				PRIMARY_SHADOW,
				className,
			)}
			style={{ backgroundImage: PRIMARY_GRADIENT }}
		>
			<span className="whitespace-nowrap font-geist text-[14px] font-medium leading-[20.69px] text-white">{children}</span>
		</button>
	);
}

export function SocialButton({ icon, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { icon: string }) {
	return (
		<button
			type="button"
			{...props}
			className="stak-press flex h-[48px] w-full cursor-pointer items-center justify-center overflow-clip rounded-[12px] bg-[#181f30] disabled:cursor-not-allowed"
		>
			<span className="flex items-center gap-[10px]">
				<img alt="" src={icon} className="size-[18px] object-contain" width={18} height={18} />
				<span className="whitespace-nowrap font-geist text-[14px] font-medium leading-[18px] text-white">{children}</span>
			</span>
		</button>
	);
}

export function OrDivider() {
	return (
		<div className="flex h-[16px] w-full items-center gap-[12px] overflow-clip">
			<div className="h-px w-[190px] shrink-0 bg-[rgba(255,255,255,0.1)]" />
			<span className="whitespace-nowrap font-geist text-[11px] leading-[14px] text-[#819abb]">or</span>
			<div className="h-px w-[190px] shrink-0 bg-[rgba(255,255,255,0.1)]" />
		</div>
	);
}

type AuthInputProps = InputHTMLAttributes<HTMLInputElement> & { right?: ReactNode; invalid?: boolean };

/** "Input · …": 48h r12 #181f30, Geist 13 placeholder #819abb, optional trailing control; a red hairline when invalid. */
export function AuthInput({ right, className, invalid, ...props }: AuthInputProps) {
	return (
		<label
			className={cn(
				"flex h-[48px] w-full items-center justify-between overflow-clip rounded-[12px] bg-[#181f30] px-[16px]",
				invalid && "shadow-[inset_0_0_0_1px_#e5484d]",
				className,
			)}
		>
			<input
				{...props}
				aria-invalid={invalid || undefined}
				className="min-w-0 flex-1 bg-transparent font-geist text-[13px] leading-[17px] text-[#f2f6fc] outline-none placeholder:text-[#819abb]"
			/>
			{right}
		</label>
	);
}

/** The line under a field that explains what to fix (Geist 12, the product's red). */
export function FieldError({ children }: { children: ReactNode }) {
	if (!children) return null;
	return (
		<p role="alert" className="w-full font-geist text-[12px] leading-[16px] text-[#e5484d]">
			{children}
		</p>
	);
}

export function ShowToggle({ shown, onToggle }: { shown: boolean; onToggle: () => void }) {
	return (
		<button
			type="button"
			onClick={onToggle}
			aria-pressed={shown}
			className="stak-press ml-[12px] shrink-0 cursor-pointer whitespace-nowrap rounded-[4px] font-geist text-[11px] font-medium leading-[14px] text-[#a6e4f7]"
		>
			{shown ? "Hide" : "Show"}
		</button>
	);
}

/** "Remembered it?  Sign in": 12px row, muted copy + accent link. */
export function FootRow({ text, linkLabel, to, onClick }: { text: string; linkLabel: string; to?: string; onClick?: () => void }) {
	const linkClass = "stak-press cursor-pointer whitespace-nowrap rounded-[4px] font-geist text-[12px] font-medium leading-[16px] text-[#a6e4f7]";
	return (
		<div className="flex items-start gap-[6px] overflow-clip whitespace-nowrap">
			<span className="font-geist text-[12px] leading-[16px] text-[#819abb]">{text}</span>
			{to ? (
				<Link to={to} className={linkClass}>
					{linkLabel}
				</Link>
			) : (
				<button type="button" onClick={onClick} className={linkClass}>
					{linkLabel}
				</button>
			)}
		</div>
	);
}

/** 40px round back control (#192238) with the 22px chevron. */
export function BackButton({
	className,
	style,
	fallbackTo = "/splash",
}: { className?: string; style?: CSSProperties; fallbackTo?: string }) {
	const navigate = useNavigate();
	return (
		<button
			type="button"
			aria-label="Back"
			style={style}
			onClick={() => {
				if (window.history.length > 1) window.history.back();
				else navigate({ to: fallbackTo });
			}}
			className={cn("stak-press flex size-[40px] cursor-pointer items-center justify-center overflow-clip rounded-[20px] bg-[#192238]", className)}
		>
			<img alt="" src={AU.back} className="size-[22px]" width={22} height={22} />
		</button>
	);
}

export function Spinner() {
	return (
		<div className="flex min-h-screen items-center justify-center bg-[#0a1020]">
			<div className="size-8 animate-spin rounded-full border-2 border-[#69b3ca] border-t-transparent" />
		</div>
	);
}

// ── Validation and error copy shared by the auth forms ────────────────────────────────────────

export const PASSWORD_MIN = 8;

export const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.trim());

/** The rule the reset frame states: "At least 8 characters, with a number." */
export function passwordProblem(p: string): string | null {
	if (p.length < PASSWORD_MIN) return `Use at least ${PASSWORD_MIN} characters`;
	if (!/\d/.test(p)) return "Add at least one number";
	return null;
}

/** Firebase error codes in plain words; the fallback is the form's own sentence. */
export function authErrorMessage(error: unknown, fallback: string): string {
	const code = ((error as { code?: string })?.code ?? (error instanceof Error ? error.message : "")) as string;
	if (code.includes("invalid-credential") || code.includes("user-not-found") || code.includes("wrong-password")) return "Wrong email or password";
	if (code.includes("email-already-in-use")) return "That email is already registered";
	if (code.includes("invalid-email")) return "That email address does not look right";
	if (code.includes("weak-password")) return `Use at least ${PASSWORD_MIN} characters`;
	if (code.includes("too-many-requests")) return "Too many attempts. Try again in a few minutes";
	if (code.includes("network-request-failed")) return "No connection. Check your network and try again";
	if (code.includes("user-disabled")) return "This account has been disabled";
	if (code.includes("expired-action-code") || code.includes("invalid-action-code")) return "This link has expired. Request a new one";
	return fallback;
}

/**
 * Two-panel auth frame (1440x1024): brand panel 600 wide (#060c1d) with the tilted glass icon and
 * tagline, back control at 627/63, and the 440-wide form column at left 790 (10px padding) whose
 * top is the frame's own value.
 */
export function AuthLayout({ formTop, backTo, children }: { formTop: number; backTo?: string; children: ReactNode }) {
	// Frame 1440x1024: brand panel 600 wide, form column 840 wide with the 460 form block centred (x 790).
	// On a bigger window both panels stretch; their content stays inside a 1024 band centred vertically.
	const panel = "max(600px, 41.6667%)";
	const BAND = "var(--stak-band, 0px)";
	return (
		<div className="relative w-full overflow-clip bg-[#0a1020] font-geist antialiased" style={{ minHeight: fillHeight }}>
			<aside className="absolute inset-y-0 left-0 overflow-clip bg-[#060c1d]" style={{ width: panel }}>
				<div className="absolute left-0 h-[1024px] w-full" style={{ top: BAND }}>
					<div className="absolute left-[191.13px] top-[105.13px] flex size-[992.254px] -translate-x-1/2 -translate-y-1/2 items-center justify-center">
						<div className="flex-none rotate-[48.43deg]">
							<div className="relative size-[702.892px] opacity-40">
								<div className="pointer-events-none absolute inset-0 overflow-hidden">
									<img alt="" src={AU.glass} className="absolute left-[0.55%] top-[0.49%] size-full max-w-none" fetchPriority="high" />
								</div>
							</div>
						</div>
					</div>
					<div className="absolute left-[82px] top-[calc(50%+0.5px)] flex -translate-y-1/2 flex-col items-start gap-[12px] overflow-clip whitespace-nowrap">
						<p className="font-geist text-[30px] font-medium leading-[39px] text-white">Before you buy it, STAK it.</p>
						<p className="font-geist text-[18px] leading-[23px] text-[#cbcccc]">Discover stocks you actually vibe with.</p>
					</div>
				</div>
			</aside>
			<div className="absolute inset-y-0 right-0" style={{ left: panel }}>
				<div className="absolute left-0 h-[1024px] w-full" style={{ top: BAND }}>
					<BackButton className="absolute left-[27px]" style={{ top: `calc(63px - ${BAND})` }} fallbackTo={backTo} />
					<div className="absolute left-1/2 flex -translate-x-1/2 items-center p-[10px]" style={{ top: formTop }}>
						<div className="flex w-[440px] flex-col items-center justify-center gap-[26px] overflow-clip">{children}</div>
					</div>
				</div>
			</div>
		</div>
	);
}

export function AuthHeading({ title, subtitle }: { title: string; subtitle: string }) {
	return (
		<div className="flex flex-col items-start gap-[6px] overflow-clip whitespace-nowrap">
			<h1 className="font-sora text-[28px] font-semibold leading-[35px] text-[#f2f6fc]">{title}</h1>
			<p className="font-geist text-[13px] leading-[17px] text-[#819abb]">{subtitle}</p>
		</div>
	);
}
