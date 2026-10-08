import { createFileRoute, Link } from "@tanstack/react-router";
import { AU } from "@/app/auth/assets";

export const Route = createFileRoute("/splash")({
	component: SplashPage,
});

/** Figma 2:5601 "Desktop · Splash". The whole screen advances to sign in. */
function SplashPage() {
	return (
		<Link
			to="/login"
			aria-label="Welcome to STAK, continue"
			className="relative block min-h-[1024px] w-full overflow-clip bg-[#0a1020] font-geist antialiased"
		>
			<div className="absolute left-[463px] top-[-702px] flex size-[1770.774px] items-center justify-center">
				<div className="flex-none rotate-[48.43deg]">
					<div className="relative size-[1254.379px] opacity-40">
						<div className="pointer-events-none absolute inset-0 overflow-hidden">
							<img alt="" src={AU.glass} className="absolute left-[0.55%] top-[0.49%] size-full max-w-none" />
						</div>
					</div>
				</div>
			</div>
			<div className="absolute left-[547px] top-[374px] flex flex-col items-center overflow-clip">
				<img alt="" src={AU.splashLogo} className="size-[64px] shrink-0" />
				<div className="h-[46px] w-[10px] shrink-0" />
				<p className="whitespace-nowrap font-sora text-[38px] font-semibold leading-[48px] text-white">Welcome to STAK</p>
				<div className="h-[14px] w-[10px] shrink-0" />
				<div className="whitespace-pre text-center font-geist text-[16px] leading-[21px] text-[rgba(255,255,255,0.7)]">
					<p>The stock market finally speaks</p>
					<p>{" your language"}</p>
				</div>
			</div>
		</Link>
	);
}
