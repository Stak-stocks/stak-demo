import { cn } from "@/lib/utils";
import { S } from "./assets";
import type { CompareTable } from "./data";

/**
 * "Compare and learn" (coordinator decision D8): the teaser (Figma 2:3562, 2:6446) is a disclosure that opens in place
 * into the phones' peer table (the open card 1:2804, android ui/discover/StockDetailScreen.kt CompareCard 780-889, ios
 * Discover/StockDetailView.swift 569-664), drawn in the desktop card's style. Figma has no open desktop frame, so the
 * folded card is exactly the teaser (pixel for pixel), and the open card keeps the teaser as its header (it stays put,
 * title and "vs A · B" where they were) and adds the table below it:
 * - the header row names the stock and its two peers, then P/E ratio, Rev growth, Profit margin and Market cap, as the
 *   phones' rows (20 tall, 12 apart: the 148-tall table of 1:2809); labels Geist 11 #819abb on the left, figures Geist 11
 *   #f2f6fc centred in their column (the stock's Medium, the header Medium, the peers' Regular), a growth figure green
 *   for a rise, the frames' red (#e5484d) for a fall, the label grey #819abb at zero (coordinator rulings N14b and N28c);
 *   every figure is the one accessor's (fundamentals.ts, N23j), so a peer's column repeats that peer's own page;
 * - the stock's column is tinted (1:2806 "AAPL column tint": #5da8bf at 7 %, r8, its column plus 3.75 a side, from 12
 *   above the table to 10 below it), a 0.5 hairline #272f40 between the two peers (1:2807, from 6 above the table);
 * - the footnote "Cultural context only, not financial advice." 21 under the table (1:2835: Geist Medium 10 #819abb),
 *   the card's 14 bottom padding under it.
 * The caret stays on the open card, turned up, so the card says it folds back (the user's ruling for the phones,
 * 2026-09-06: "no drop up when a user is on it"; android 790-794). The whole folded card toggles, as the phones' card
 * does; on the open card its header does (the table stays selectable text). A real <button> with aria-expanded /
 * aria-controls, and a real <table> for assistive tech.
 */

/** The folded card (2:3562 / 2:6446): 52 tall, the title and "vs A · B" centred against the caret. */
export const COMPARE_FOLDED =
	"relative flex h-[52px] w-full items-center justify-between whitespace-nowrap px-[16px] py-[14px] max-lg:h-auto max-lg:min-h-[52px] max-lg:gap-[12px] max-lg:whitespace-normal";
/**
 * The open card: the header exactly where the folded card draws it (the 34-tall title block sits 9 from the card's top in
 * the 52 card), then the table and the footnote, 14 above the card's bottom edge (the phones' 14).
 */
export const COMPARE_OPEN = "relative flex w-full flex-col items-stretch whitespace-nowrap px-[16px] pb-[14px] pt-[9px] max-lg:whitespace-normal";

type Props = {
	title: string;
	sub: string;
	table: CompareTable | null;
	open: boolean;
	onToggle: () => void;
	panelId: string;
	/** the folded card's glyph: Figma's "›" where its frame draws one (2:3573 with Analyst view open, the EXAMPLE 2:6446), else the caret */
	chevron?: boolean;
	/** the EXAMPLE page names its cards with headings (h2), as its other cards do */
	heading?: boolean;
	/** the chevron's own box (the EXAMPLE's 5-wide auto-width box, 2:6450) */
	chevronClassName?: string;
};

/** The header (the disclosure button) and the panel it opens; the page wraps them in its own card (COMPARE_FOLDED / COMPARE_OPEN). */
export function CompareDisclosure({ title, sub, table, open, onToggle, panelId, chevron = false, heading = false, chevronClassName }: Props) {
	const label = (
		<span className="flex flex-col items-start gap-[2px] overflow-clip">
			<span className="block font-sora text-[14px] font-semibold leading-[18px] text-[#f2f6fc]">{title}</span>
			<span className="block font-geist text-[11px] leading-[14px] text-[#819abb]">{sub}</span>
		</span>
	);
	const glyph = open ? (
		<img alt="" src={S.caret} className="size-[20px] shrink-0 rotate-180" />
	) : chevron ? (
		<span aria-hidden="true" className={cn("block font-geist text-[14px] font-medium leading-[18px] text-[#819abb]", chevronClassName)}>
			›
		</span>
	) : (
		<img alt="" src={S.caret} className="size-[20px] shrink-0" />
	);
	// a company with nobody to compare with (none in the catalog today: every company has a pair, live.ts peersFor) has no
	// table to open, so its card draws no caret: the title and "No peers to compare yet", as the Analyst card without
	// coverage. Nothing that looks like a dropdown stays shut (the user's rule of 2026-11-06)
	if (!table) {
		const Tag = heading ? "h2" : "div";
		return <Tag className="flex w-full min-w-0 items-center justify-between max-lg:gap-[12px]">{label}</Tag>;
	}
	const button = (
		<button
			type="button"
			aria-expanded={open}
			aria-controls={panelId}
			onClick={onToggle}
			className={cn(
				"flex w-full min-w-0 cursor-pointer items-center justify-between text-left max-lg:gap-[12px]",
				// folded, the whole card is the target (the phones' card toggles on any tap): the button's stretched layer covers it
				!open && "after:absolute after:inset-0 after:content-['']",
			)}
		>
			{label}
			{glyph}
		</button>
	);
	return (
		<>
			{heading ? <h2 className="flex w-full min-w-0">{button}</h2> : button}
			{open ? (
				<div id={panelId} className="mt-[23px] flex flex-col items-start gap-[21px]">
					<CompareTableView table={table} title={title} />
					<p className="font-geist text-[10px] font-medium leading-[13px] text-[#819abb]">Cultural context only, not financial advice.</p>
				</div>
			) : (
				// folded (or nothing to compare): present for aria-controls, display: none, so the card's layout ignores it
				<div id={panelId} hidden />
			)}
		</>
	);
}

/** The column share of a figure: four columns 8 apart across the card's inner width (the phones' 73.5 of 318). */
const COL = "((100% - 24px) / 4)";

function CompareTableView({ table, title }: { table: CompareTable; title: string }) {
	const [own, ...peers] = table.columns;
	const cols = table.columns.length;
	return (
		<div className="relative w-full">
			{/* 1:2806: the stock's column tint, behind the table (the phones draw it behind, never laid out) */}
			<div aria-hidden="true" className="absolute top-[-12px] bottom-[-10px] rounded-[8px] bg-[rgba(93,168,191,0.07)]" style={{ left: `calc(${COL} + 8px - 3.75px)`, width: `calc(${COL} + 7.5px)` }} />
			{/* 1:2807: the 0.5 hairline between the two peers' columns */}
			{cols === 3 && (
				<div aria-hidden="true" className="absolute top-[-6px] bottom-[19.5px] w-[0.5px] bg-[#272f40]" style={{ left: `calc(3 * ${COL} + 20px - 0.25px)` }} />
			)}
			{/* a real table (border-spacing lays the 8 / 12 gaps; the outer spacing is taken back by the margins), named by
			    aria-label: a caption, even one laid out of flow, gets its own border-spacing in Chrome */}
			<table
				aria-label={`${title}: ${[own, ...peers].join(", ")}`}
				className="relative -mx-[8px] -my-[12px] w-[calc(100%+16px)] table-fixed border-separate border-spacing-x-[8px] border-spacing-y-[12px] font-geist text-[11px] leading-[14px]"
			>
				<tbody>
					<tr className="h-[20px]">
						<td className="p-0" />
						{table.columns.map((t) => (
							<th key={t} scope="col" className="p-0 text-center align-top font-medium text-[#f2f6fc]">
								{t}
							</th>
						))}
						{Array.from({ length: 3 - cols }, (_, i) => (
							<td key={`pad-${i}`} className="p-0" />
						))}
					</tr>
					{table.rows.map((r) => (
						<tr key={r.label} className="h-[20px]">
							<th scope="row" className="p-0 text-left align-top font-normal text-[#819abb]">
								{r.label}
							</th>
							{r.cells.map((cell, i) => (
								<td
									key={table.columns[i]}
									className={cn(
										"p-0 text-center align-top",
										i === 0 ? "font-medium" : "font-normal",
										// a growth figure by its sign; one that prints as zero is the label grey (N28c)
										cell.tone === "up" ? "text-[#2fd08a]" : cell.tone === "down" ? "text-[#e5484d]" : cell.tone === "flat" ? "text-[#819abb]" : "text-[#f2f6fc]",
									)}
								>
									{cell.text}
								</td>
							))}
							{Array.from({ length: 3 - cols }, (_, i) => (
								<td key={`pad-${i}`} className="p-0" />
							))}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
