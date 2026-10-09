import { useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const CHEVRON = "›";

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
