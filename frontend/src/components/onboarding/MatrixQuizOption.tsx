import type { ReactNode } from "react";
import { DISC, cu } from "@/components/discover/discoverTheme";
import { PRESS, f, focusRing } from "@/components/phone/phone";
import { useQuizDesktop } from "./QuizStepShell";

const S = "#819ABB";
const stroke = { stroke: S, strokeWidth: 1.5, fill: "none" } as const;

/** Android's goal and risk glyphs (res/drawable ic_goal_* / ic_risk_*), each drawn in its own native viewBox. */
export const QUIZ_ICONS: Record<string, { view: number; node: ReactNode }> = {
	learn: { view: 21.0559, node: <><path d="M10.5271 4.09406C8.18756 2.45638 4.9122 2.45638 3.04056 3.39219V16.4936C4.9122 15.5578 8.18756 15.5578 10.5271 17.3125C12.8666 15.5578 16.142 15.5578 18.0136 16.4936V3.39219C16.142 2.45638 12.8666 2.45638 10.5271 4.09406Z" {...stroke} strokeLinejoin="round" /><path d="M10.5273 4.32803V17.0785" {...stroke} /></> },
	grow: { view: 21.0559, node: <><path d="M10.5277 18.1313V9.592" {...stroke} strokeLinecap="round" /><path d="M10.5277 9.59195C10.5277 5.96565 13.3351 3.97704 16.8445 4.32797C16.3766 7.72031 13.8031 9.70892 10.5277 9.59195Z" {...stroke} strokeLinejoin="round" /><path d="M10.5272 12.1656C10.5272 9.82607 8.6556 8.42234 6.0821 8.6563C6.43304 11.1128 8.30467 12.3996 10.5272 12.1656Z" {...stroke} strokeLinejoin="round" /></> },
	search: { view: 26.4937, node: <><path d="M15.6217 15.6217L19.5798 19.5798" {...stroke} /><path d="M11.6636 6.91387C14.0385 6.91387 16.4133 9.28874 16.4133 11.6636C16.4133 14.0385 14.0385 16.4133 11.6636 16.4133C9.28874 16.4133 6.91387 14.0385 6.91387 11.6636C6.91387 9.28874 9.28874 6.91387 11.6636 6.91387Z" {...stroke} /></> },
	explore: { view: 21.0559, node: <><path d="M10.5275 18.0146C14.6622 18.0146 18.014 14.6628 18.014 10.5281C18.014 6.39336 14.6622 3.04152 10.5275 3.04152C6.39276 3.04152 3.04092 6.39336 3.04092 10.5281C3.04092 14.6628 6.39276 18.0146 10.5275 18.0146Z" {...stroke} /><path d="M10.5275 6.31685L12.75 10.528L10.5275 14.7392L8.3049 10.528L10.5275 6.31685Z" {...stroke} strokeLinejoin="round" /></> },
	plus: { view: 37.9006, node: <><path d="M19.261 11.7065V25.7065" {...stroke} /><path d="M12.261 18.7065H26.261" {...stroke} /></> },
	eye: { view: 37.9006, node: <><path d="M11.0779 19.2065C15.0779 13.2065 23.0779 13.2065 27.0779 19.2065C23.0779 25.2065 15.0779 25.2065 11.0779 19.2065Z" {...stroke} /><circle cx="19.0779" cy="19.2065" r="2" {...stroke} /></> },
	pause: { view: 36, node: <><path d="M14.261 11.9658V23.9658" {...stroke} /><path d="M22.261 11.9658V23.9658" {...stroke} /></> },
	shield: { view: 20, node: <><path d="M10 2.22222L16.6667 4.88889V9.55556C16.6667 13.7778 14 16.5556 10 17.7778C6 16.5556 3.33333 13.7778 3.33333 9.55556V4.88889L10 2.22222Z" {...stroke} strokeLinejoin="round" /><path d="M7.11111 10L9.22222 12.1111L13.1111 8" {...stroke} strokeLinecap="round" strokeLinejoin="round" /></> },
};

export interface QuizOption {
	index: number;
	title: string;
	subtitle: string;
	icon: keyof typeof QUIZ_ICONS;
	/** The glyph's own size, its circle, and how far the circle sits below the card's top padding (all in u). */
	iconSize: number;
	circle: number;
	iconDy: number;
}

/** Android's goal / risk card: an icon circle over a title and a one-line reason, two to a row. */
export function MatrixQuizOption({ option, selected, onClick }: { option: QuizOption; selected: boolean; onClick: () => void }) {
	const icon = QUIZ_ICONS[option.icon];
	return (
		<button
			type="button"
			onClick={onClick}
			aria-pressed={selected}
			className={`relative flex h-full flex-col items-start text-left ${PRESS}`}
			style={{ minHeight: cu(155.81), borderRadius: cu(16.85), background: DISC.sheet, padding: `${cu(15.27)} ${cu(14.74)}`, ...focusRing }}
		>
			<span style={{ height: cu(option.iconDy) }} aria-hidden="true" />
			<span className="grid shrink-0 place-items-center rounded-full" style={{ width: cu(option.circle), height: cu(option.circle), background: DISC.avatar }} aria-hidden="true">
				<svg viewBox={`0 0 ${icon.view} ${icon.view}`} style={{ width: cu(option.iconSize), height: cu(option.iconSize) }}>{icon.node}</svg>
			</span>
			<span style={{ height: cu(21) }} aria-hidden="true" />
			<span style={{ display: "flex", flexDirection: "column", gap: cu(5) }}>
				<span style={{ maxWidth: cu(142.13), font: f(500, 12, 16.85), color: "#fff" }}>{option.title}</span>
				<span style={{ maxWidth: cu(121.07), font: f(400, 10, 13.69), color: DISC.faint }}>{option.subtitle}</span>
			</span>
			{selected && <span className="pointer-events-none absolute inset-0" style={{ borderRadius: cu(16.85), boxShadow: `inset 0 0 0 ${cu(0.53)} ${DISC.teal}` }} />}
		</button>
	);
}

/** Desktop: the icon beside the title and reason, in a wider card. */
function DesktopQuizOption({ option, selected, onClick }: { option: QuizOption; selected: boolean; onClick: () => void }) {
	const icon = QUIZ_ICONS[option.icon];
	// Each glyph is drawn to its own circle on the phone; keep that proportion in the 56u desktop circle.
	const glyph = (option.iconSize / option.circle) * 56;
	return (
		<button
			type="button"
			onClick={onClick}
			aria-pressed={selected}
			className={`flex items-center text-left transition-colors hover:brightness-110 ${PRESS}`}
			style={{ gap: cu(24), minHeight: cu(140), borderRadius: cu(16), background: DISC.sheet, padding: `${cu(24)} ${cu(40)}`, border: `1px solid ${selected ? "rgba(105,179,202,0.55)" : "transparent"}`, ...focusRing }}
		>
			<span className="grid shrink-0 place-items-center rounded-full" style={{ width: cu(56), height: cu(56), background: DISC.avatar }} aria-hidden="true">
				<svg viewBox={`0 0 ${icon.view} ${icon.view}`} style={{ width: cu(glyph), height: cu(glyph) }}>{icon.node}</svg>
			</span>
			<span style={{ display: "flex", flexDirection: "column", gap: cu(6) }}>
				<span style={{ font: f(500, 16, 22), color: "#fff" }}>{option.title}</span>
				<span style={{ font: f(400, 13, 18), color: DISC.muted }}>{option.subtitle}</span>
			</span>
		</button>
	);
}

/** Two equal columns, each row as tall as its taller card. */
export function MatrixGrid({ options, selected, onSelect }: { options: QuizOption[]; selected: number | null; onSelect: (index: number) => void }) {
	const desk = useQuizDesktop();
	if (desk) {
		return (
			<div className="grid grid-cols-2" style={{ gap: cu(20) }} role="radiogroup">
				{options.map((o) => <DesktopQuizOption key={o.index} option={o} selected={selected === o.index} onClick={() => onSelect(o.index)} />)}
			</div>
		);
	}
	return (
		<div className="grid grid-cols-2" style={{ gap: `${cu(12)} ${cu(13)}`, paddingTop: cu(4) }} role="radiogroup">
			{options.map((o) => <MatrixQuizOption key={o.index} option={o} selected={selected === o.index} onClick={() => onSelect(o.index)} />)}
		</div>
	);
}
