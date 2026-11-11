import { FigmaFile } from "@/app/Sidebar";
import { HOME } from "./assets";

/**
 * "Illustration" 2:487 of the deck card 2:480 (identical in the first-run frame, 2:605), drawn layer by layer with
 * Figma's own files, each at Figma's position in the card (x / y relative to the card, 4 decimals) and in Figma's
 * stacking order (first = bottom): the "Box" group 2:488 (twelve "Shape" vectors and one "Image"), the "Coins" group
 * 2:502 (five company "Image" fills and the empty "Frame 117"), then the "Shadow" beam 2:514 over everything. The group
 * runs from y -4.39 to 172.23, so the card (119 tall, clipped) cuts its top and bottom, as in Figma.
 *
 * Vectors are drawn inline (FigmaFile) so their fractional positions are painted as vectors, not resampled bitmaps;
 * the coins are the original uploaded PNGs, placed in one SVG so they keep their fractional offsets too. Every file was
 * re-downloaded from Figma on 2026-10-11 and compared byte for byte with the saved ones: the six images and eleven of
 * the thirteen SVGs are identical; shape-2-489.svg and shadow-2-514.svg differ only in the id Figma generates for their
 * filter / gradient on each export (paint0_linear_0_75 vs _0_4), which FigmaFile namespaces by file name anyway.
 */

type Vector = { node: string; src: string; left: number; top: number; width: number; height: number; flip?: boolean };

/** "Box" 2:488, bottom to top. 2:489 carries a layer blur (22.05): its file is the blurred shape, 22.05 wider on every side. */
const BOX: Vector[] = [
	{ node: "2:489", src: HOME.deck.shape489, left: 51.7254 - 22.0515, top: 143.8422 - 22.0516, width: 158.938, height: 72.4893 },
	{ node: "2:490", src: HOME.deck.shape490, left: 45.2739, top: 126.6345, width: 127.7378, height: 39.9987 },
	{ node: "2:491", src: HOME.deck.shape491, left: 51.7254, top: 133.0857, width: 114.835, height: 28.3862 },
	{ node: "2:492", src: HOME.deck.shape492, left: 37.2069, top: 38.3924, width: 71.2643, height: 32.2706 },
	{ node: "2:493", src: HOME.deck.shape493, left: 108.4711, top: 38.3924, width: 67.2304, height: 33.6152 },
	{ node: "2:494", src: HOME.deck.shape494, left: 108.4711, top: 72.0078, width: 53.7843, height: 84.7103 },
	// 2:495 and 2:497 are mirrored in Figma (rotation 180 with a vertical flip = a horizontal flip)
	{ node: "2:495", src: HOME.deck.shape495, left: 54.6867, top: 70.6634, width: 53.7843, height: 86.0556, flip: true },
	{ node: "2:496", src: HOME.deck.shape496, left: 54.6867, top: 51.8386, width: 53.7843, height: 38.9936 },
	{ node: "2:497", src: HOME.deck.shape497, left: 108.4711, top: 51.8386, width: 53.7843, height: 38.9936, flip: true },
	{ node: "2:498", src: HOME.deck.shape498, left: 85.6128, top: 90.8325, width: 22.8583, height: 18.8245 },
	{ node: "2:499", src: HOME.deck.shape499, left: 35.8622, top: 70.6634, width: 72.6089, height: 38.9936 },
];
/** "Shape" 2:501, the front panel: the top layer of the Box, above its "Image" 2:500. */
const BOX_FRONT: Vector = { node: "2:501", src: HOME.deck.shape501, left: 108.4711, top: 72.0078, width: 69.9196, height: 37.649 };
/** "Shadow" 2:514: 78.1 x 83.33 at 69.16 / -4.39; its path is 77.512 wide, 0.289 in from the layer's left edge. */
const SHADOW: Vector = { node: "2:514", src: HOME.deck.shadow514, left: 69.1617 + 0.289, top: -4.3888, width: 77.512, height: 83.3282 };

/** "Image" 2:500 inside the Box (25.41 at 121.92 / 65.28), between 2:499 and 2:501. */
const BOX_IMAGE = { node: "2:500", src: HOME.deck.image500, left: 121.9179, top: 65.2846, size: 25.4102 };

/** "Coins" 2:502, bottom to top. 2:505 is a 25.564 square turned 49.53° (its 36.04 box at 106.53 / 26). */
const COINS = [
	{ node: "2:505", src: HOME.deck.image505, left: 106.5306, top: 26, size: 36.0403, inner: 25.564, rotate: -49.53 },
	{ node: "2:508", src: HOME.deck.image508, left: 101.476, top: 48.7463, size: 23.9576 },
	{ node: "2:510", src: HOME.deck.image510, left: 96.4212, top: 5.7775, size: 24.9105 },
	{ node: "2:511", src: HOME.deck.image511, left: 81.2552, top: 31.0532, size: 28.2553 },
	// "Frame 117" 2:512 (23.88 at 106.36 / 67.61) has no fill and no children: nothing to paint
	{ node: "2:513", src: HOME.deck.image513, left: 76.2003, top: 56.3284, size: 26.5734 },
] as const;

function Vec({ node, src, left, top, width, height, flip }: Vector) {
	const x = left - Math.floor(left);
	const y = top - Math.floor(top);
	if (flip)
		return (
			<span
				data-node-id={node}
				className="pointer-events-none absolute block"
				style={{ left, top, width, height, transform: "scaleX(-1)" }}
			>
				<FigmaFile src={src} width={width} height={height} className="absolute left-0 top-0" />
			</span>
		);
	return (
		<span data-node-id={node} className="pointer-events-none absolute block" style={{ left: Math.floor(left), top: Math.floor(top) }}>
			<FigmaFile src={src} width={width} height={height} x={x} y={y} className="absolute left-0 top-0" />
		</span>
	);
}

export function DeckIllustration() {
	return (
		<div aria-hidden="true" data-node-id="2:487" className="pointer-events-none absolute left-0 top-0 h-0 w-0">
			{BOX.map((v) => (
				<Vec key={v.node} {...v} />
			))}
			<svg aria-hidden="true" focusable="false" width={1} height={1} className="pointer-events-none absolute left-0 top-0 overflow-visible">
				<image data-node-id={BOX_IMAGE.node} href={BOX_IMAGE.src} x={BOX_IMAGE.left} y={BOX_IMAGE.top} width={BOX_IMAGE.size} height={BOX_IMAGE.size} />
			</svg>
			<Vec {...BOX_FRONT} />
			<svg aria-hidden="true" focusable="false" width={1} height={1} className="pointer-events-none absolute left-0 top-0 overflow-visible" data-node-id="2:502">
				{COINS.map((c) => {
					const inner = "inner" in c ? c.inner : c.size;
					const pad = (c.size - inner) / 2;
					const cx = c.left + c.size / 2;
					const cy = c.top + c.size / 2;
					return (
						<image
							key={c.node}
							data-node-id={c.node}
							href={c.src}
							x={c.left + pad}
							y={c.top + pad}
							width={inner}
							height={inner}
							transform={"rotate" in c ? `rotate(${c.rotate} ${cx} ${cy})` : undefined}
						/>
					);
				})}
			</svg>
			<Vec {...SHADOW} />
		</div>
	);
}
