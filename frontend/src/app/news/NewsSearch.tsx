import { type CSSProperties, type KeyboardEvent, type Ref, useEffect, useRef, useState } from "react";
import { N } from "./assets";

/** The field's id: the Search button's aria-controls. */
export const NEWS_SEARCH_FIELD_ID = "news-search-field";

/**
 * "Search" 2:4366: the 40px #181f30 circle, radius 20, its 20px magnifier (2:4367) centred, exactly as the frame draws
 * it (Figma gives it no other state: no hover, pressed or open look; cursor and the canvas's focus ring only). It works
 * as the mobile apps' search glass does (NewsScreen.kt / NewsView.swift, the designer's call of 2026-08-22): it opens
 * the search field under the header row, and pressed again it closes the field and clears the query.
 */
export function NewsSearchButton({ open, onToggle, ref }: { open: boolean; onToggle: () => void; ref?: Ref<HTMLButtonElement> }) {
	return (
		<button
			ref={ref}
			type="button"
			aria-label="Search"
			aria-expanded={open}
			aria-controls={NEWS_SEARCH_FIELD_ID}
			onClick={onToggle}
			className="mr-[3px] flex size-[40px] shrink-0 cursor-pointer items-center justify-center overflow-clip rounded-[20px] bg-[#181f30] max-lg:mr-0"
		>
			<img alt="" src={N.search} width={20} height={20} className="size-[20px]" />
		</button>
	);
}

/**
 * The mobile apps' search field (Figma draws none: NewsScreen.kt lines 150-176, NewsView.swift lines 92-104): the
 * header row's width, from the title's left edge to the magnifier's right edge (the route sets it, `style`), the Search
 * button's own #181f30 fill, radius 12, 16 x 13 padding, Geist Regular 13 in white,
 * the teal (#69b3ca) caret, "Search news" in the apps' faint #5c6b85 while empty. The mobile line is Geist's own
 * (1.3 em: 16.9 at 13), the website's Geist 13 line is 17 (the date line beside it), so the field is 13 + 17 + 13 = 43
 * tall. A plain field as on the phones: the browser's own clear button and search decorations are hidden, no
 * autocomplete, autocorrection, capitalisation or spellcheck (NewsView.swift `.autocorrectionDisabled()`,
 * `.textInputAutocapitalization(.never)`). Focus shows the canvas's ring for fields (2px #69b3ca, offset 0).
 * Escape closes the search, as the Search button does (the web's back gesture for the field).
 *
 * The fill sits on a box of its own under a transparent field: Chrome draws the text of a focused field that paints
 * its own opaque fill with coloured sub-pixel (LCD) edges, past the app's grayscale rule (styles.css); over a fill
 * painted by another box the typed text stays grayscale like every other text of the app. Same box, same pixels.
 */
export function NewsSearchField({
	value,
	onChange,
	onEscape,
	style,
	ref,
}: {
	value: string;
	onChange: (value: string) => void;
	onEscape: () => void;
	style?: CSSProperties;
	ref?: Ref<HTMLInputElement>;
}) {
	const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
		// an Escape that ends an IME composition only ends the composition
		if (e.key !== "Escape" || e.nativeEvent.isComposing) return;
		e.preventDefault();
		onEscape();
	};
	return (
		<div className="h-[43px] shrink-0 rounded-[12px] bg-[#181f30]" style={style}>
			<input
				ref={ref}
				id={NEWS_SEARCH_FIELD_ID}
				type="search"
				value={value}
				onChange={(e) => onChange(e.target.value)}
				onKeyDown={onKeyDown}
				aria-label="Search news"
				placeholder="Search news"
				autoComplete="off"
				autoCorrect="off"
				autoCapitalize="none"
				spellCheck={false}
				className="block size-full appearance-none rounded-[12px] bg-transparent px-[16px] py-[13px] font-geist text-[13px] font-normal leading-[17px] text-white caret-[#69b3ca] placeholder:text-[#5c6b85] [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none [&::-webkit-search-results-button]:hidden [&::-webkit-search-results-decoration]:hidden"
			/>
		</div>
	);
}

/** How long the typing has to rest before the result count is read out (no line per keystroke). */
export const ANNOUNCE_DELAY_MS = 600;

/** A new query whose count reads as the last one's: the region is emptied, and the count set again this much later. */
export const REANNOUNCE_GAP_MS = 100;

/**
 * The result count for screen readers: a polite live region that is never drawn ("3 stories", "No stories match"). The
 * mobile apps show no count, so nothing is added to the page; the line follows the typing once it rests, and an empty
 * query says nothing. Each query the typing rests on is answered, also when its count reads as the last one's ("tesla",
 * then "jpm": "1 story" both times): a region whose text does not change says nothing, so the region is emptied first
 * and the count set again REANNOUNCE_GAP_MS later. A query the typing only passed through, or came back to, is not
 * answered again. A search the page opens with (Back to `?q=chips`) holds its count from the start: only a change the
 * person makes is read out.
 */
export function NewsSearchStatus({ query, message }: { query: string; message: string }) {
	const [spoken, setSpoken] = useState(message);
	// the query the region answers and the text it holds
	const said = useRef({ query, message });
	useEffect(() => {
		if (!query) {
			said.current = { query: "", message: "" };
			setSpoken("");
			return;
		}
		if (query === said.current.query && message === said.current.message) return;
		let gap: number | undefined;
		const t = window.setTimeout(() => {
			const again = message === said.current.message;
			said.current = { query, message };
			if (!again) {
				setSpoken(message);
				return;
			}
			setSpoken("");
			gap = window.setTimeout(() => {
				gap = undefined;
				setSpoken(message);
			}, REANNOUNCE_GAP_MS);
		}, ANNOUNCE_DELAY_MS);
		return () => {
			window.clearTimeout(t);
			if (gap === undefined) return;
			// typing went on while the region was empty: it holds nothing, so the next query it rests on is answered
			window.clearTimeout(gap);
			said.current = { query: "", message: "" };
		};
	}, [query, message]);
	return (
		<div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
			{spoken}
		</div>
	);
}
