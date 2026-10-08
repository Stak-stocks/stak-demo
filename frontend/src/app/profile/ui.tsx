import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Button canon (00 References): r6, h52, Geist Medium, hairline + glow. Used by "Add to STAK" and "Save changes". */
export const GRADIENT_BUTTON_STYLE: CSSProperties = {
	backgroundImage:
		"linear-gradient(180deg, rgb(166, 228, 247) 8.8889%, rgb(93, 168, 191) 39.189%, rgb(60, 152, 180) 72.549%), linear-gradient(90deg, rgb(44, 157, 188) 0%, rgb(44, 157, 188) 100%)",
	boxShadow:
		"0px 77.322px 21.679px 0px rgba(82,170,199,0), 0px 49.862px 19.511px 0px rgba(82,170,199,0.01), 0px 28.183px 16.621px 0px rgba(82,170,199,0.03)",
};

export const CHEVRON = "›";

export function GradientButton({ children, className, onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"flex h-[52px] w-full items-center justify-center gap-[8px] overflow-clip rounded-[6px] border-[0.361px] border-[rgba(101,158,173,0.63)]",
				className,
			)}
			style={GRADIENT_BUTTON_STYLE}
		>
			{children}
		</button>
	);
}

/** "Settings card" (Figma 2:2516): #10182b, r16, 4px vertical padding, 48px rows. */
export function SettingsCard({ children, className }: { children: ReactNode; className?: string }) {
	return <div className={cn("flex w-full flex-col items-start overflow-clip rounded-[16px] bg-[#10182b] py-[4px]", className)}>{children}</div>;
}

export function SettingsRow({ left, right, href, onClick }: { left: ReactNode; right: ReactNode; href?: string; onClick?: () => void }) {
	const cls = "flex h-[48px] w-full items-center justify-between overflow-clip px-[14px]";
	if (href) {
		return (
			<a href={href} className={cls}>
				{left}
				{right}
			</a>
		);
	}
	return (
		<button type="button" onClick={onClick} className={cls}>
			{left}
			{right}
		</button>
	);
}

export function RowLabel({ children }: { children: ReactNode }) {
	return <span className="whitespace-nowrap font-geist text-[13px] font-medium leading-[17px] text-white">{children}</span>;
}

/** Right-hand value; Figma keeps two spaces before the chevron ("$10,240  ›"), rendered with whitespace-pre. */
export function RowValue({ children, accent }: { children: ReactNode; accent?: boolean }) {
	return <span className={cn("whitespace-pre font-geist text-[14px] leading-[18px]", accent ? "text-[#66b7da]" : "text-[#819abb]")}>{children}</span>;
}

export function SectionLabel({ children }: { children: ReactNode }) {
	return <p className="w-full font-geist text-[11px] font-medium leading-[14px] text-[#819abb]">{children}</p>;
}
