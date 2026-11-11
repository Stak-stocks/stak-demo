/**
 * The controls of the two pages behind the hub's ACCOUNT rows (Notifications, Help & support). Figma's desktop file has
 * no frame for either page (the phones built them in the hub's language: android ui/profile/SettingsScreens.kt:56-62),
 * so each control is the phones' one drawn with the desktop frames' own pieces:
 * - SettingCard: the desktop's "Permission · Notifications" card (Notifications panel 2:2735: #181F30, r14, padding 16,
 *   12 between the text and its end; Geist Medium 14/18 white over Geist 11/14 #ACAFB1, 4 apart), which is the phones'
 *   PermissionCard value for value (android onboarding/PermissionsScreen.kt:150-174);
 * - Switch: the phones' StakToggle (PermissionsScreen.kt:176-206, ios PermissionsView.swift:116-141): 42 x 24, r12,
 *   #2C9DBC on / #242B3D off, an 18 px white thumb 3 px from the edge, 150 ms;
 * - ThresholdChips: the phones' SettingsChip as a radio group (SettingsScreens.kt:236-251: r14, 12 / 6 padding, Geist
 *   Medium 12/16; selected #39C5CB at 15 % with a 1 px #2C9DBC edge and #69B3CA ink, else #10182B with #819ABB ink);
 * - FaqRow: the hub's 48 px settings row (2:2517) as a disclosure, its end the desktop's own CaretDown (2:3559, the stock
 *   page's analyst caret), turned up while open as the analyst view's is (D8); the answer in the desktop's Geist 12/16
 *   #C8D2E0 body ink (2:2802).
 * Below 1024 every piece keeps its size; texts wrap (SPEC R1 / R7). A card's body and an answer wrap with text-wrap:
 * pretty at every size (no word alone on a last line: "real." under the money answer at 1024+): Figma draws no frame
 * for these pages, so no approved pixels depend on their line breaks. No hover or pressed look (no Figma variant): the
 * cursor and the app's focus ring only.
 */
import { type KeyboardEvent, type ReactNode, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { P } from "./assets";
import { ROW_FOCUS, RowLabel } from "./ui";

/** The phones' StakToggle as an ARIA switch, named by its card's title and described by its body. */
export function Switch({ on, onChange, labelledBy, describedBy }: { on: boolean; onChange: (on: boolean) => void; labelledBy: string; describedBy?: string }) {
	return (
		<button
			type="button"
			role="switch"
			aria-checked={on}
			aria-labelledby={labelledBy}
			aria-describedby={describedBy}
			onClick={() => onChange(!on)}
			className="relative h-[24px] w-[42px] shrink-0 cursor-pointer rounded-[12px] transition-colors duration-150 ease-in-out motion-reduce:transition-none"
			style={{ backgroundColor: on ? "#2c9dbc" : "#242b3d" }}
		>
			<span
				aria-hidden="true"
				className="absolute left-[3px] top-[3px] size-[18px] rounded-full bg-white transition-transform duration-150 ease-in-out motion-reduce:transition-none"
				style={{ transform: on ? "translateX(18px)" : "none" }}
			/>
		</button>
	);
}

/** The "Permission · Notifications" card: title and body on the left, `end` (a Switch) on the right; `children` under the text. */
export function SettingCard({ title, body, end, children, titleId, bodyId }: { title: string; body: string; end?: ReactNode; children?: ReactNode; titleId: string; bodyId: string }) {
	return (
		<div className="flex w-full flex-col items-start gap-[10px] rounded-[14px] bg-[#181f30] p-[16px]">
			<div className="flex w-full items-center gap-[12px]">
				<div className="flex min-w-px flex-1 flex-col items-start gap-[4px]">
					<span id={titleId} className="font-geist text-[14px] font-medium leading-[18px] text-white">
						{title}
					</span>
					<span id={bodyId} className="font-geist text-[11px] leading-[14px] text-pretty text-[#acafb1]">
						{body}
					</span>
				</div>
				{end}
			</div>
			{children}
		</div>
	);
}

/** A settings card with its switch (Price moves on your picks, Daily deck, Market news). */
export function ToggleCard({ title, body, on, onChange }: { title: string; body: string; on: boolean; onChange: (on: boolean) => void }) {
	const titleId = useId();
	const bodyId = useId();
	return <SettingCard title={title} body={body} titleId={titleId} bodyId={bodyId} end={<Switch on={on} onChange={onChange} labelledBy={titleId} describedBy={bodyId} />} />;
}

/**
 * The threshold chips: a radio group (the phones' chips are radio buttons for TalkBack, SettingsScreens.kt:245-246) with
 * the WAI-ARIA keyboard: Tab reaches the chosen chip, the arrow keys move the choice (wrapping), Home / End jump.
 */
export function ThresholdChips({ values, value, onChange, labelledBy, describedBy }: { values: readonly number[]; value: number; onChange: (v: number) => void; labelledBy: string; describedBy?: string }) {
	const refs = useRef<(HTMLButtonElement | null)[]>([]);
	const choose = (i: number) => {
		const next = values[(i + values.length) % values.length]!;
		onChange(next);
		refs.current[(i + values.length) % values.length]?.focus();
	};
	const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
		const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
		if (step) {
			e.preventDefault();
			choose(i + step);
		} else if (e.key === "Home" || e.key === "End") {
			e.preventDefault();
			choose(e.key === "Home" ? 0 : values.length - 1);
		}
	};
	return (
		<div role="radiogroup" aria-labelledby={labelledBy} aria-describedby={describedBy} className="flex w-full flex-wrap items-start gap-[8px]">
			{values.map((v, i) => {
				const selected = v === value;
				return (
					<button
						key={v}
						ref={(el) => {
							refs.current[i] = el;
						}}
						type="button"
						role="radio"
						aria-checked={selected}
						tabIndex={selected ? 0 : -1}
						onClick={() => onChange(v)}
						onKeyDown={(e) => onKey(e, i)}
						className={cn(
							"flex h-[28px] shrink-0 cursor-pointer items-center rounded-[14px] px-[12px] font-geist text-[12px] font-medium leading-[16px]",
							selected ? "bg-[rgba(57,197,203,0.15)] text-[#69b3ca] shadow-[inset_0_0_0_1px_#2c9dbc]" : "bg-[#10182b] text-[#819abb]",
						)}
					>
						{`${v}%`}
					</button>
				);
			})}
		</div>
	);
}

/** A question that opens its answer in place (the phones' FaqRow, SettingsScreens.kt:209-230: closed at first). */
export function FaqRow({ question, answer }: { question: string; answer: string }) {
	const [open, setOpen] = useState(false);
	const panelId = useId();
	return (
		<div className="flex w-full flex-col items-start">
			<button
				type="button"
				aria-expanded={open}
				aria-controls={panelId}
				onClick={() => setOpen((o) => !o)}
				className={cn(
					"flex h-[48px] w-full cursor-pointer items-center justify-between gap-[12px] overflow-clip px-[14px] text-left max-lg:h-auto max-lg:min-h-[48px] max-lg:py-[14px]",
					ROW_FOCUS,
				)}
			>
				<RowLabel>{question}</RowLabel>
				<img alt="" src={P.caret} width={20} height={20} className={cn("size-[20px] shrink-0", open && "rotate-180")} />
			</button>
			<div id={panelId} hidden={!open} className="w-full px-[14px] pb-[12px]">
				<p className="font-geist text-[12px] leading-[16px] text-pretty text-[#c8d2e0]">{answer}</p>
			</div>
		</div>
	);
}

/** A row that only shows a value (Help & support's Version): the settings row's layout, nothing to open. */
export function ValueRow({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex h-[48px] w-full items-center justify-between gap-[12px] overflow-clip px-[14px]">
			<RowLabel>{label}</RowLabel>
			<span className="whitespace-nowrap font-geist text-[14px] leading-[18px] text-[#819abb]">{value}</span>
		</div>
	);
}
