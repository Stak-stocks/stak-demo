import { useNavigate } from "@tanstack/react-router";
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

export function GradientButton({
	children,
	className,
	onClick,
	disabled,
}: { children: ReactNode; className?: string; onClick?: () => void; disabled?: boolean }) {
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			className={cn(
				"stak-press flex h-[52px] w-full cursor-pointer items-center justify-center gap-[8px] overflow-clip rounded-[6px] border-[0.361px] border-[rgba(101,158,173,0.63)]",
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

/** Splits "/home?notifications=1" into the router's `to` + `search`. */
function parseHref(href: string): { to: string; search: Record<string, string> } {
	const [to = "/", query = ""] = href.split("?");
	const search: Record<string, string> = {};
	for (const [k, v] of new URLSearchParams(query)) search[k] = v;
	return { to, search };
}

/**
 * A 48px settings row. Internal hrefs navigate client-side (query strings included), mail and web
 * links open as anchors (external ones in a new tab), otherwise the row is a plain button.
 */
export function SettingsRow({
	left,
	right,
	href,
	external,
	onClick,
}: { left: ReactNode; right: ReactNode; href?: string; external?: boolean; onClick?: () => void }) {
	const navigate = useNavigate();
	const cls = "stak-press flex h-[48px] w-full cursor-pointer items-center justify-between overflow-clip px-[14px]";
	if (href && (external || /^(https?:|mailto:)/.test(href))) {
		return (
			<a href={href} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined} className={cls}>
				{left}
				{right}
			</a>
		);
	}
	const go = () => {
		if (onClick) onClick();
		else if (href) {
			const { to, search } = parseHref(href);
			navigate({ to: to as "/", search: search as never });
		}
	};
	return (
		<button type="button" onClick={go} className={cls}>
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
