import { type CSSProperties, useCallback, useState } from "react";
import { companyCoin } from "@/app/discover/assets";
import { companyName } from "@/app/live/catalog";
import { cn } from "@/lib/utils";

type Props = { ticker: string; size: number; className?: string; style?: CSSProperties };

/** Resolves once an image can be painted (or failed: a card must never wait for a file forever). */
function painted(img: HTMLImageElement): Promise<void> {
	if (typeof img.decode === "function") return img.decode().catch(() => undefined);
	if (img.complete) return Promise.resolve();
	return new Promise((done) => {
		img.addEventListener("load", () => done(), { once: true });
		img.addEventListener("error", () => done(), { once: true });
	});
}

/**
 * A company's glass coin as Figma draws it, scaled into a `size` square the way an image FILL covers its layer.
 * NVIDIA, Apple, Google, Amazon and Shopify: Figma's own coin image, at Figma's rotation. Every other company: the
 * same coin in Figma's style, two stacked images in the square: Figma's glass with the logo taken off and the
 * company's mark raised on it in frosted glass (its prepared mark, else the lettermark of its name's initial; see
 * src/app/discover/assets.ts). Both are static rasters (500 px, sharp to a zoom of 3.39 at 147.5): a card that moves or
 * scales only recomposites them, nothing is filtered or redrawn per frame. The pair appears together once both files
 * can be painted, so a card that arrives in the stack never shows bare glass with its logo popping in after it.
 */
export function CompanyLogo({ ticker, size, className, style }: Props) {
	const coin = companyCoin(ticker, companyName(ticker));
	const files = coin?.kind === "mark" ? `${coin.glass}|${coin.mark ?? ""}` : "";
	const [shown, setShown] = useState("");
	const watch = useCallback(
		(span: HTMLSpanElement | null) => {
			if (!span) return;
			const imgs = Array.from(span.querySelectorAll("img"));
			// both files already loaded (the deck fetches and decodes the coins of the cards behind its stack ahead): the
			// pair shows in the card's first frame; otherwise once both can be painted
			if (imgs.every((img) => img.complete && img.naturalWidth > 0)) setShown(files);
			else void Promise.all(imgs.map(painted)).then(() => setShown(files));
		},
		[files],
	);
	if (!coin) return null;
	if (coin.kind === "figma") {
		return (
			<img
				alt=""
				src={coin.src}
				width={size}
				height={size}
				decoding="async"
				draggable={false}
				className={cn("block max-w-none select-none object-cover", className)}
				// Figma's rotation is counter-clockwise; CSS turns clockwise
				style={{ width: size, height: size, transform: coin.rotate ? `rotate(${-coin.rotate}deg)` : undefined, ...style }}
			/>
		);
	}
	const layer = "absolute inset-0 block size-full max-w-none";
	return (
		<span
			key={files}
			ref={watch}
			className={cn("relative block shrink-0 select-none", className)}
			style={{ width: size, height: size, visibility: shown === files ? undefined : "hidden", ...style }}
		>
			<img alt="" src={coin.glass} width={size} height={size} decoding="async" draggable={false} className={layer} />
			{coin.mark && <img alt="" src={coin.mark} width={size} height={size} decoding="async" draggable={false} className={layer} />}
		</span>
	);
}
