import { type CSSProperties, type KeyboardEvent, type ReactNode, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { OB } from "./assets";
import type { MatrixOption } from "./data";
import { FigmaImg, FracFill } from "./subpixel";

/**
 * 2x2 option matrix (776x300): 378x140 cards, 20px gutters, selected = Figma's 0.5px #69b3ca INSIDE stroke (2:6073,
 * 2:6150): a #69b3ca layer under the card's #181f30 fill inset 0.5px (radius 15.5), so the stroke keeps Figma's
 * half-pixel weight and the card its layout (a 0.5px CSS border snaps to a whole pixel at full strength).
 * A radiogroup with one Tab stop: the arrow keys move between the cards (left/right across a row,
 * up/down across rows) and select as they move, like native radios. The cards are plain frames in Figma (no variant,
 * no hover or pressed look, no "change to" reaction), so they answer only with the selected stroke, the pointer cursor
 * and the canvas's keyboard focus ring.
 * The frames put the matrix on a half pixel (2:6053 / 2:6125 at y 376.5, its cards at 376.5 and 536.5): `fy` draws each
 * card's fill and stroke there with Figma's anti-aliased edges (FracFill), while the card's texts and its disc, on
 * whole pixels in the frame (2:6056 at 418, 2:6075 at 578 …), keep their rows.
 */
/** Figma's INSIDE stroke weight on the selected option. */
const SELECTED_STROKE = 0.5;
export function OptionMatrix({
	options,
	icons,
	selected,
	onSelect,
	wideFirst,
	label,
	fy = 0,
}: {
	options: MatrixOption[];
	icons: Record<string, ReactNode>;
	selected: string | null;
	onSelect: (id: string) => void;
	/** The first goal card in Figma has a 34px gap and no fixed row width. */
	wideFirst?: boolean;
	/** Accessible name of the group; without it, the step heading above the matrix (its question) names the group. */
	label?: string;
	/** The fraction of a pixel the frame puts the matrix's top on (0.5 on 04 and 05). */
	fy?: number;
}) {
	const rootRef = useRef<HTMLDivElement>(null);
	const [headingLabel, setHeadingLabel] = useState<string>();
	useEffect(() => {
		if (label) return;
		// The question is the step's heading, rendered by the step above this matrix, not by it.
		let scope = rootRef.current?.parentElement ?? null;
		let heading: HTMLElement | null = null;
		while (scope && !(heading = scope.querySelector<HTMLElement>("h1, h2, h3"))) scope = scope.parentElement;
		setHeadingLabel(heading?.textContent?.trim() || undefined);
	}, [label]);
	const hasSelected = options.some((o) => o.id === selected);
	const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
		const cards = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>("button[data-option]"));
		const at = cards.indexOf(document.activeElement as HTMLButtonElement);
		if (at === -1) return;
		// Compact layouts can have a single column; vertical keys follow the visible rows.
		const layout = getComputedStyle(e.currentTarget);
		const columns = layout.display === "grid" ? layout.gridTemplateColumns.split(" ").length : 2;
		const step: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: columns, ArrowUp: -columns };
		const delta = step[e.key];
		if (delta === undefined) return;
		const next = cards[at + delta];
		if (next) {
			e.preventDefault();
			next.focus();
			if (next.dataset.option) onSelect(next.dataset.option);
		}
	};
	return (
		// clips like Figma's 776x300 frame; while a card shows the focus ring (2px, 2px out) the clip reaches 4px further,
		// so the ring of a card on the matrix's edge stays whole
		<div
			ref={rootRef}
			className="onboarding-matrix relative h-[300px] w-full overflow-clip has-[:focus-visible]:[overflow-clip-margin:4px]"
			role="radiogroup"
			aria-label={label ?? headingLabel}
			onKeyDown={onKeyDown}
		>
			{options.map((o, i) => {
				const isSelected = o.id === selected;
				const first = wideFirst && i === 0;
				return (
					<button
						type="button"
						key={o.id}
						data-option={o.id}
						role="radio"
						aria-checked={isSelected}
						// roving tabindex: the selected card is the group's Tab stop, the first card while nothing is picked
						tabIndex={(hasSelected ? isSelected : i === 0) ? 0 : -1}
						onClick={() => onSelect(o.id)}
						className="onboarding-option absolute isolate flex h-[140px] w-[378px] cursor-pointer flex-col items-center justify-center rounded-[16px] py-[20px] pl-[24px] pr-[40px] text-left"
						style={{ left: i % 2 ? 398 : 0, top: i < 2 ? 0 : 160 }}
					>
						{/* the card's #181f30 fill and its selected stroke, on Figma's fraction; nothing in the card reaches its edges */}
						{isSelected ? (
							<>
								<FracFill x={0} y={fy} className="rounded-[16px] bg-[#69b3ca]" />
								<FracFill x={0} y={fy} inset={SELECTED_STROKE} className="rounded-[15.5px] bg-[#181f30]" />
							</>
						) : (
							<FracFill x={0} y={fy} className="rounded-[16px] bg-[#181f30]" />
						)}
						{/* the copy block is one width per card: 57 disc + 30 + 187 = 274 (278 on the first goal card: its gap is 34), so every
						    disc sits on the same line inside its card (2:6056 at 42 from the card's left, 2:6065 / 2:6075 / 2:6083 at 44). Below
						    1024 responsive.css keeps that width (min(--onb-copy-w, 100%)) instead of letting a short copy pull its disc right */}
						<div
							className={cn("onboarding-option-copy flex h-[57px] items-center", first ? "justify-center gap-[34px]" : "w-[274px] gap-[30px]")}
							style={{ "--onb-copy-w": first ? "278px" : "274px" } as CSSProperties}
						>
							{icons[o.id]}
							<div className="flex w-[187px] flex-col items-start gap-[6px]">
								<p className="w-full font-geist text-[15px] font-medium leading-[20px] text-[#f2f6fc]">{o.title}</p>
								<p className="w-full font-geist text-[12px] leading-[16px] text-[#819abb]">{o.subtitle}</p>
							</div>
						</div>
					</button>
				);
			})}
		</div>
	);
}

/** 57px #242b3d disc (radius 28.351) holding one glyph. */
function Disc({ children }: { children: ReactNode }) {
	return (
		<div className="relative size-[57px] shrink-0 overflow-clip rounded-[28.351px] bg-[#242b3d]">
			{children}
		</div>
	);
}

/**
 * A glyph export in its 57px disc at the layer's box (read with the Plugin API, 2026-10-18), drawn at that fractional
 * box (FigmaImg): Chrome would draw a 27.8184px <img> into 28 whole pixels on the nearest pixel.
 */
function Glyph({ src, x, y, w, h }: { src: string; x: number; y: number; w: number; h: number }) {
	return <FigmaImg src={src} x={x} y={y} w={w} h={h} />;
}

export const GOAL_ICONS: Record<string, ReactNode> = {
	/* 2:6057 "Frame" at 14.830078 / 17.532959 of the disc 2:6056, 27.818371 square */
	learn: (
		<Disc>
			<Glyph src={OB.goal.learn} x={14.830078} y={17.532959} w={27.818371} h={27.818371} />
		</Disc>
	),
	/* 2:6066 at 13 / 12.5, 31.266838 square */
	grow: (
		<Disc>
			<Glyph src={OB.goal.grow} x={13} y={12.5} w={31.266838} h={31.266838} />
		</Disc>
	),
	/* 2:6076 "Frame 1618869227" at 9 / 9.5, 38.319595 square */
	first: (
		<Disc>
			<Glyph src={OB.goal.first} x={9} y={9.5} w={38.319595} h={38.319595} />
		</Disc>
	),
	/* 2:6084 at 12 / 11.5, 33.266838 square */
	explore: (
		<Disc>
			<Glyph src={OB.goal.explore} x={12} y={11.5} w={33.266838} h={33.266838} />
		</Disc>
	),
};

export const RISK_ICONS: Record<string, ReactNode> = {
	/* 2:6129: the disc and its plus are one vector frame */
	buy: <img alt="" src={OB.risk.buy} className="size-[57px] shrink-0" />,
	/* 2:6136: the whole disc with its eye (Figma's 4x render; see OB.risk) */
	hold: <img alt="" src={OB.risk.hold} className="size-[57px] shrink-0" />,
	/* 2:6145 "Group 1000002797" at 25 / 22.5 (8 x 12) of the disc 2:6144; its export runs 0.75 past each side */
	step: (
		<Disc>
			<Glyph src={OB.risk.step} x={25 - 0.75} y={22.5} w={9.5} h={12} />
		</Disc>
	),
	/* 2:6154 "Frame" at 14 / 13.5 of the disc 2:6152, 29 square */
	sell: (
		<Disc>
			<Glyph src={OB.risk.sell} x={14} y={13.5} w={29} h={29} />
		</Disc>
	),
};
