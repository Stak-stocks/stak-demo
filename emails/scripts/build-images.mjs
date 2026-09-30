// Renders the email images to PNG (mail apps don't show SVG) into frontend/public/email, which the website
// serves at https://thestak.org/email/. Run from the repo root: `node emails/scripts/build-images.mjs`.
import { readFileSync, mkdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const out = join(root, "frontend/public/email");
mkdirSync(out, { recursive: true });

const TEAL = "#69B3CA";
const CIRCLE = "#171D2C";

/** An SVG's inner markup, with Figma's `var(--fill-0, x)` fills resolved to x. */
function inner(file) {
	const svg = readFileSync(join(root, "frontend/public/images/landing-v2", file), "utf8");
	return svg.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "").replace(/var\(--fill-0,\s*([^)]+)\)/g, "$1");
}

// The app's colour mark (frontend/src/assets/stak-logo-color.svg), inlined for the lockup below.
const colorMark = readFileSync(join(root, "frontend/src/assets/stak-logo-color.svg"), "utf8").replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");

// The landing footer's lockup: the colour mark, then the white wordmark, at the same offsets as the site (109.131 x 26.479).
const logo = `<svg xmlns="http://www.w3.org/2000/svg" width="109.131" height="26.479" viewBox="0 0 109.131 26.479">
	<svg x="0" y="0" width="26.478" height="26.479" viewBox="0 0 778.22 778.22">${colorMark}</svg>
	<svg x="30.97" y="5.76" width="78.163" height="14.983" viewBox="0 0 78.163 14.983">${inner("footer-logo-wordmark.svg")}</svg>
</svg>`;

// Lucide line icons (ISC licence), teal on a navy circle.
const ICONS = {
	"icon-beta": `<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>`,
	"icon-updates": `<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/><path d="M4 17v2"/><path d="M5 18H3"/>`,
	"icon-feedback": `<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>`,
};
const circled = (paths) => `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
	<circle cx="24" cy="24" r="24" fill="${CIRCLE}"/>
	<g transform="translate(12 12)" fill="none" stroke="${TEAL}" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${paths}</g>
</svg>`;

// Instagram's own glyph: white outline on its brand gradient.
const instagram = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
	<defs><radialGradient id="ig" cx="0.3" cy="1.07" r="1.2">
		<stop offset="0" stop-color="#FDF497"/><stop offset="0.05" stop-color="#FDF497"/><stop offset="0.45" stop-color="#FD5949"/><stop offset="0.6" stop-color="#D6249F"/><stop offset="0.9" stop-color="#285AEB"/>
	</radialGradient></defs>
	<rect width="24" height="24" rx="6" fill="url(#ig)"/>
	<g fill="none" stroke="#fff" stroke-width="1.8"><rect x="5" y="5" width="14" height="14" rx="4"/><circle cx="12" cy="12" r="3.3"/></g>
	<circle cx="16.1" cy="7.9" r="1" fill="#fff"/>
</svg>`;

// Rendered at 3x their display size so they stay sharp on phones.
const jobs = [
	["logo.png", logo, 3 * 132 / 109.131],
	...Object.entries(ICONS).map(([name, paths]) => [`${name}.png`, circled(paths), 3]),
	["instagram.png", instagram, 3],
];
// The hero banner: the glass STAK mark (emails/assets/glass-mark.png, ~40% opaque) bleeding off the right of a
// card-navy strip, the logo on the left. Flat navy, so it's a small JPEG that blends into the card.
{
	const [W, H] = [1140, 420]; // 2x the 570 x 210 display size
	const glassH = 820;
	// The source is ~40% opaque; double its alpha so the glass reads on navy.
	const { data, info } = await sharp(join(root, "emails/assets/glass-mark.png")).resize({ height: glassH }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
	for (let i = 3; i < data.length; i += 4) data[i] = Math.min(255, data[i] * 2);
	// The mark's content starts ~41% across the source and is ~545px tall at this size: crop it centred in the strip.
	const top = 62;
	const glass = await sharp(data, { raw: info }).extract({ left: 0, top, width: info.width, height: H }).png().toBuffer();
	const logoW = 300;
	const logoPng = await sharp(Buffer.from(logo), { density: (72 * logoW) / 109.131 }).png().toBuffer();
	const logoH = (await sharp(logoPng).metadata()).height;
	await sharp({ create: { width: W, height: H, channels: 3, background: "#10182B" } })
		.composite([
			{ input: glass, left: W - info.width, top: 0 },
			{ input: logoPng, left: 72, top: Math.round((H - logoH) / 2) },
		])
		.jpeg({ quality: 82, mozjpeg: true })
		.toFile(join(out, "hero.jpg"));
	console.log(`hero.jpg: ${W}x${H}, ${(statSync(join(out, "hero.jpg")).size / 1024).toFixed(1)} KB`);
}

for (const [name, svg, scale] of jobs) {
	await sharp(Buffer.from(svg), { density: 72 * scale }).png({ compressionLevel: 9 }).toFile(join(out, name));
	const { width, height, size } = await sharp(join(out, name)).metadata().then(async (m) => ({ ...m, size: (await sharp(join(out, name)).toBuffer()).length }));
	console.log(`${name}: ${width}x${height}, ${(size / 1024).toFixed(1)} KB`);
}
