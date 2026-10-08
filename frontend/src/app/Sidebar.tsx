import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { A } from "./assets";
import { account } from "./data/account";

/** Figma "Desktop Sidebar · Nav (locked)" — 6 sections × open (216) / closed (72). */
export type NavKey = "home" | "news" | "discover" | "mystak" | "simulate" | "profile";

const ITEMS: { key: Exclude<NavKey, "profile">; label: string; to: string }[] = [
	{ key: "home", label: "Home", to: "/home" },
	{ key: "news", label: "News", to: "/news" },
	{ key: "discover", label: "Discover", to: "/discover" },
	{ key: "mystak", label: "My STAK", to: "/my-stak" },
	{ key: "simulate", label: "Simulate", to: "/simulate" },
];

type Props = { open: boolean; active: NavKey; onToggle: () => void };

export function Sidebar({ open, active, onToggle }: Props) {
	const width = open ? 216 : 72;
	return (
		<aside
			className="sticky top-0 h-screen shrink-0 overflow-clip bg-[#080d1a]"
			style={{ width }}
			data-nav={open ? "open" : "closed"}
		>
			{open ? (
				<div className="absolute left-[28px] top-[33px] flex w-[159px] items-center gap-[46px]">
					<Link to="/home" aria-label="STAK home" className="relative block h-[21.117px] w-[87.037px] shrink-0">
						<img alt="" src={A.logoIcon} className="absolute left-0 top-0 size-[21.117px]" />
						<img alt="" src={A.logoWord} className="absolute left-[24.7px] top-[4.6px] h-[11.949px] w-[62.337px]" />
					</Link>
					<button type="button" aria-label="Hide navigation" onClick={onToggle} className="relative size-[28px] shrink-0">
						<img alt="" src={A.navHide} className="absolute inset-0 size-full" />
					</button>
				</div>
			) : (
				<button
					type="button"
					aria-label="Show navigation"
					onClick={onToggle}
					className="absolute left-[22px] top-[33px] size-[28px]"
				>
					<img alt="" src={A.navShow} className="absolute inset-0 size-full" />
				</button>
			)}

			{ITEMS.map((item, i) => {
				const isActive = item.key === active;
				const icon = isActive ? A.nav[item.key].on : A.nav[item.key].off;
				return (
					<Link
						key={item.key}
						to={item.to}
						aria-current={isActive ? "page" : undefined}
						className={cn(
							"absolute left-[16px] flex h-[40px] items-center overflow-clip rounded-[10px]",
							open ? "w-[184px] gap-[12px] px-[12px]" : "w-[40px] justify-center px-[8px]",
							isActive && "bg-[rgba(255,255,255,0.06)]",
						)}
						style={{ top: 92 + i * 48 }}
					>
						<img alt="" src={icon} className={cn("shrink-0", isActive ? "size-[24px]" : "size-[20px]")} />
						{open && (
							<span
								className={cn(
									"whitespace-nowrap font-geist",
									isActive ? "text-[16px] font-semibold text-[#d9d9d9]" : "text-[13px] font-medium text-[#aeaeae]",
								)}
							>
								{item.label}
							</span>
						)}
					</Link>
				);
			})}

			<div className="absolute bottom-[27px] left-0 flex flex-col items-center gap-[25px]" style={{ width }}>
				{/* Vector 87: 0.5px #5F6471 @54% — drawn as a 1px line at the equivalent coverage */}
				<div className="h-px w-full bg-[rgba(95,100,113,0.27)]" />
				<AccountRow open={open} active={active === "profile"} />
			</div>
		</aside>
	);
}

function AccountRow({ open, active }: { open: boolean; active: boolean }) {
	return (
		<Link
			to="/profile"
			aria-label="Profile"
			className={cn(
				"flex h-[48px] items-center gap-[12px] overflow-clip rounded-[10px] bg-[#141b2c]",
				open ? "w-[184px] px-[12px]" : "w-[40px] justify-center px-[6px]",
				active && "border border-[#242f4b]",
			)}
		>
			<div className="flex size-[28px] shrink-0 items-center justify-center overflow-clip rounded-[14px] border-[0.778px] border-[#242f4b] bg-[#242b3d]">
				<span className="whitespace-nowrap font-sora text-[9.625px] font-semibold text-[#9eadc7]">{account.initial}</span>
			</div>
			{open && (
				<>
					<div className="flex flex-col items-start gap-px overflow-clip whitespace-nowrap">
						<span className="font-geist text-[13px] font-semibold text-[#d9d9d9]">{account.name}</span>
						<span className="font-geist text-[8.5px] text-[#819abb]">{account.handle}</span>
					</div>
					<img alt="" src={A.settings} className="size-[17px] shrink-0" />
				</>
			)}
		</Link>
	);
}
