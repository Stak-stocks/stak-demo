import { Link, useNavigate } from "@tanstack/react-router";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";
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
				"flex h-[52px] w-full items-center justify-center overflow-clip rounded-[6px] border-[0.361px] border-solid border-[rgba(101,158,173,0.63)] disabled:cursor-not-allowed",
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
			className="flex h-[48px] w-full items-center justify-center overflow-clip rounded-[12px] bg-[#181f30]"
		>
			<span className="flex items-center gap-[10px]">
				<img alt="" src={icon} className="size-[18px] object-contain" />
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

type AuthInputProps = InputHTMLAttributes<HTMLInputElement> & { right?: ReactNode };

/** "Input · …": 48h r12 #181f30, Geist 13 placeholder #819abb, optional trailing control. */
export function AuthInput({ right, className, ...props }: AuthInputProps) {
	return (
		<label className={cn("flex h-[48px] w-full items-center justify-between overflow-clip rounded-[12px] bg-[#181f30] px-[16px]", className)}>
			<input
				{...props}
				className="min-w-0 flex-1 bg-transparent font-geist text-[13px] leading-[17px] text-[#f2f6fc] outline-none placeholder:text-[#819abb]"
			/>
			{right}
		</label>
	);
}

export function ShowToggle({ shown, onToggle }: { shown: boolean; onToggle: () => void }) {
	return (
		<button
			type="button"
			onClick={onToggle}
			className="ml-[12px] shrink-0 whitespace-nowrap font-geist text-[11px] font-medium leading-[14px] text-[#a6e4f7]"
		>
			{shown ? "Hide" : "Show"}
		</button>
	);
}

/** "Remembered it?  Sign in": 12px row, muted copy + accent link. */
export function FootRow({ text, linkLabel, to, onClick }: { text: string; linkLabel: string; to?: string; onClick?: () => void }) {
	const linkClass = "whitespace-nowrap font-geist text-[12px] font-medium leading-[16px] text-[#a6e4f7]";
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
export function BackButton({ className, fallbackTo = "/splash" }: { className?: string; fallbackTo?: string }) {
	const navigate = useNavigate();
	return (
		<button
			type="button"
			aria-label="Back"
			onClick={() => {
				if (window.history.length > 1) window.history.back();
				else navigate({ to: fallbackTo });
			}}
			className={cn("flex size-[40px] items-center justify-center overflow-clip rounded-[20px] bg-[#192238]", className)}
		>
			<img alt="" src={AU.back} className="size-[22px]" />
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

/**
 * Two-panel auth frame (1440x1024): brand panel 600 wide (#060c1d) with the tilted glass icon and
 * tagline, back control at 627/63, and the 440-wide form column at left 790 (10px padding) whose
 * top is the frame's own value.
 */
export function AuthLayout({ formTop, backTo, children }: { formTop: number; backTo?: string; children: ReactNode }) {
	return (
		<div className="relative min-h-[1024px] w-full overflow-clip bg-[#0a1020] font-geist antialiased">
			<aside className="absolute inset-y-0 left-0 w-[600px] overflow-clip bg-[#060c1d]">
				<div className="absolute left-[calc(50%-108.87px)] top-[calc(50%-406.87px)] flex size-[992.254px] -translate-x-1/2 -translate-y-1/2 items-center justify-center">
					<div className="flex-none rotate-[48.43deg]">
						<div className="relative size-[702.892px] opacity-40">
							<div className="pointer-events-none absolute inset-0 overflow-hidden">
								<img alt="" src={AU.glass} className="absolute left-[0.55%] top-[0.49%] size-full max-w-none" />
							</div>
						</div>
					</div>
				</div>
				<div className="absolute left-[82px] top-[calc(50%+0.5px)] flex -translate-y-1/2 flex-col items-start gap-[12px] overflow-clip whitespace-nowrap">
					<p className="font-geist text-[30px] font-medium leading-[39px] text-white">Before you buy it, STAK it.</p>
					<p className="font-geist text-[18px] leading-[23px] text-[#cbcccc]">Discover stocks you actually vibe with.</p>
				</div>
			</aside>
			<BackButton className="absolute left-[627px] top-[63px]" fallbackTo={backTo} />
			<div className="absolute left-[790px] flex items-center p-[10px]" style={{ top: formTop }}>
				<div className="flex w-[440px] flex-col items-center justify-center gap-[26px] overflow-clip">{children}</div>
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
