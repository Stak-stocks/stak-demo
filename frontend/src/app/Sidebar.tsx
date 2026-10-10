import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { A } from "./assets";
import { viewportHeight } from "./FitCanvas";
import { useAccountDisplay } from "./useAccountDisplay";

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
			className="sticky top-0 shrink-0 overflow-clip bg-[#080d1a] transition-[width] duration-[280ms] ease-in-out"
			style={{ width, height: viewportHeight() }}
			data-nav={open ? "open" : "closed"}
		>
			{open ? (
				<div className="absolute left-[28px] top-[33px] flex w-[159px] items-center gap-[46px]">
					<Link to="/home" aria-label="STAK home" className="stak-press relative block h-[21.117px] w-[87.037px] shrink-0 cursor-pointer rounded-[4px]">
						<img alt="" src={A.logoIcon} className="absolute left-0 top-0 size-[21.117px]" />
						<img alt="" src={A.logoWord} className="absolute left-[24.7px] top-[4.6px] h-[11.949px] w-[62.337px]" />
					</Link>
					<button type="button" aria-label="Hide navigation" onClick={onToggle} className="stak-press relative size-[28px] shrink-0 cursor-pointer rounded-[6px]">
						<img alt="" src={A.navHide} className="absolute inset-0 size-full" />
					</button>
				</div>
			) : (
				<button
					type="button"
					aria-label="Show navigation"
					onClick={onToggle}
					className="stak-press absolute left-[22px] top-[33px] size-[28px] cursor-pointer rounded-[6px]"
				>
					<img alt="" src={A.navShow} className="absolute inset-0 size-full" />
				</button>
			)}

			{ITEMS.map((item, i) => {
				const isActive = item.key === active;
				// Profile pages (2:2476 et al.): the Home row keeps a 24px icon and a SemiBold 13 label, no highlight
				const onProfile = active === "profile" && item.key === "home";
				const icon = isActive ? A.nav[item.key].on : onProfile ? A.nav.home.profile : A.nav[item.key].off;
				return (
					<Link
						key={item.key}
						to={item.to}
						aria-current={isActive ? "page" : undefined}
						className={cn(
							"stak-press absolute left-[16px] flex h-[40px] cursor-pointer items-center overflow-clip rounded-[10px]",
							open ? "w-[184px] gap-[12px] px-[12px]" : "w-[40px] justify-center px-[8px]",
							isActive ? "bg-[rgba(255,255,255,0.06)]" : "hover:bg-[rgba(255,255,255,0.04)]",
						)}
						style={{ top: 92 + i * 48 }}
					>
						<img alt="" src={icon} className={cn("shrink-0", isActive || onProfile ? "size-[24px]" : "size-[20px]")} />
						{open && (
							<span
								className={cn(
									"whitespace-nowrap font-geist",
									isActive
										? "text-[16px] font-semibold leading-[21px] text-[#d9d9d9]"
										: onProfile
											? "text-[13px] font-semibold leading-[17px] text-[#aeaeae]"
											: "text-[13px] font-medium leading-[17px] text-[#aeaeae]",
								)}
							>
								{item.label}
							</span>
						)}
					</Link>
				);
			})}

			<div className="absolute bottom-[27px] left-0 flex flex-col items-center gap-[24px]" style={{ width }}>
				{/* Vector 87: a 0.5px #5F6471 @54% stroke centred on y 924; Figma paints it as two rows at a quarter coverage each */}
				<div className="h-[2px] w-full bg-[rgba(95,100,113,0.135)]" />
				<AccountRow open={open} active={active === "profile"} />
			</div>
		</aside>
	);
}

function AccountRow({ open, active }: { open: boolean; active: boolean }) {
	const account = useAccountDisplay();
	return (
		<Link
			to="/profile"
			aria-label="Profile"
			className={cn(
				"stak-press flex h-[48px] cursor-pointer items-center gap-[12px] overflow-clip rounded-[10px] bg-[#141b2c]",
				open ? "w-[184px] pl-[12px] pr-[11px]" : "w-[40px] justify-center px-[6px]",
				active && "border border-[#242f4b]",
			)}
		>
			{/* the 0.778px #242F4B stroke sits OUTSIDE the 28px circle in Figma: a ring, not a border */}
			<div className="flex size-[28px] shrink-0 items-center justify-center rounded-[14px] bg-[#242b3d] shadow-[0_0_0_0.778px_#242f4b]">
				<span className="whitespace-nowrap font-sora text-[9.625px] font-semibold leading-[12px] text-[#9eadc7]">{account.initial}</span>
			</div>
			{open && (
				<>
					{/* the column fills up to the settings icon (92px for the persona's address, as in Figma); long names truncate */}
					<div className="flex min-w-0 flex-1 flex-col items-start gap-px overflow-clip whitespace-nowrap">
						<span className="max-w-full truncate font-geist text-[13px] font-semibold leading-[17px] text-[#d9d9d9]">{account.name}</span>
						<span className="max-w-full truncate font-geist text-[8.5px] leading-[11px] text-[#819abb]">{account.sidebarLine}</span>
					</div>
					<img alt="" src={A.settings} className="size-[17px] shrink-0" />
				</>
			)}
		</Link>
	);
}
