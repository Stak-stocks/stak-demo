import { useEffect } from "react";
import { toast } from "sonner";

/**
 * A share picture: STAK's mark, what's being shared, its figure, the selected range's change and chart - 1080x1350 (a
 * 4:5 post), in the app's colours. The apps draw the same card (android ShareCard, iOS ShareCardView).
 */
export interface ShareCardSpec {
	/** "MY PICK" / "MY PORTFOLIO". */
	kicker: string;
	/** "NVDA" / "My STAK portfolio". */
	title: string;
	/** The company's name, or what the portfolio is ("Paper portfolio"). */
	subtitle?: string;
	/** The price, or the portfolio's value: "$188.42". */
	figure: string;
	/** The range's change: "▲ +$12.30 (+6.9%) past month". */
	line: string;
	up: boolean;
	/** One more line under it ("Picked Sep 4 · ▲ +6.2% since"). */
	note?: string;
	/** The chart's values, oldest first (nothing drawn under two). */
	values: number[];
}

const W = 1080;
const H = 1350;
const PAD = 88;
const BG = "#0A1020";
const WHITE = "#FFFFFF";
const MUTED = "#819ABB";
const TEAL = "#69B3CA";
const GREEN = "#2FD08A";
const RED = "#FF6B6B";

function loadImage(src: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = () => resolve(img);
		img.onerror = reject;
		img.src = src;
	});
}

/** The longest start of [text] that fits [max] px wide, with "…" when cut. */
function fit(ctx: CanvasRenderingContext2D, text: string, max: number): string {
	if (ctx.measureText(text).width <= max) return text;
	let s = text;
	while (s.length > 1 && ctx.measureText(`${s}…`).width > max) s = s.slice(0, -1);
	return `${s}…`;
}

/** The largest size up to [base] at which [text] fits [max] px wide. */
function shrunk(ctx: CanvasRenderingContext2D, text: string, base: number, weight: string, family: string, max: number): number {
	ctx.font = `${weight} ${base}px ${family}, sans-serif`;
	const w = ctx.measureText(text).width;
	return w <= max ? base : Math.floor((base * max) / w);
}

/** Draws the card and returns it as a PNG. */
export async function renderShareCard(spec: ShareCardSpec): Promise<Blob> {
	const canvas = document.createElement("canvas");
	canvas.width = W;
	canvas.height = H;
	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("No canvas");
	// The page's own fonts, loaded before the first word is drawn.
	await Promise.all(["600 96px Sora", "500 40px Geist", "400 30px Geist"].map((f) => document.fonts?.load(f).catch(() => null)));

	ctx.fillStyle = BG;
	ctx.fillRect(0, 0, W, H);
	const glow = ctx.createRadialGradient(W * 0.85, 0, 0, W * 0.85, 0, W * 0.9);
	glow.addColorStop(0, "rgba(105,179,202,0.22)");
	glow.addColorStop(1, "rgba(105,179,202,0)");
	ctx.fillStyle = glow;
	ctx.fillRect(0, 0, W, H);

	// The mark and wordmark (the site's white lockup).
	try {
		const [icon, word] = await Promise.all([loadImage("/images/landing-v2/nav-logo-icon.svg"), loadImage("/images/landing-v2/nav-logo-word.svg")]);
		ctx.drawImage(icon, PAD, PAD, 64, 64);
		ctx.drawImage(word, PAD + 78, PAD + 15, 170, 33);
	} catch { /* the words still say STAK below */ }

	const color = spec.up ? GREEN : RED;
	const maxW = W - PAD * 2;
	ctx.textBaseline = "alphabetic";
	ctx.fillStyle = MUTED;
	ctx.font = "500 30px Geist, sans-serif";
	ctx.fillText(spec.kicker.split("").join(String.fromCharCode(8202)), PAD, 280);

	ctx.fillStyle = WHITE;
	ctx.font = `600 ${spec.title.length > 10 ? 72 : 96}px Sora, sans-serif`;
	ctx.fillText(fit(ctx, spec.title, maxW), PAD, 380);
	let y = 380;
	if (spec.subtitle) {
		ctx.fillStyle = MUTED;
		ctx.font = "400 36px Geist, sans-serif";
		y += 60;
		ctx.fillText(fit(ctx, spec.subtitle, maxW), PAD, y);
	}

	// The figure and its line shrink to fit rather than lose digits ("$1,234,5…").
	ctx.fillStyle = WHITE;
	y += 160;
	ctx.font = `600 ${shrunk(ctx, spec.figure, 120, "600", "Sora", maxW)}px Sora, sans-serif`;
	ctx.fillText(spec.figure, PAD, y);

	ctx.fillStyle = color;
	y += 70;
	ctx.font = `500 ${shrunk(ctx, spec.line, 40, "500", "Geist", maxW)}px Geist, sans-serif`;
	ctx.fillText(spec.line, PAD, y);
	if (spec.note) {
		ctx.fillStyle = MUTED;
		ctx.font = "400 32px Geist, sans-serif";
		y += 54;
		ctx.fillText(fit(ctx, spec.note, maxW), PAD, y);
	}

	// The chart: the range's line with a soft fill under it.
	const top = Math.max(y + 70, 820);
	const bottom = 1150;
	if (spec.values.length >= 2) {
		const min = Math.min(...spec.values);
		const max = Math.max(...spec.values);
		const span = max - min || 1;
		const pts = spec.values.map((v, i) => [PAD + (maxW * i) / (spec.values.length - 1), bottom - ((v - min) / span) * (bottom - top)] as const);
		const fill = ctx.createLinearGradient(0, top, 0, bottom);
		fill.addColorStop(0, spec.up ? "rgba(47,208,138,0.28)" : "rgba(255,107,107,0.28)");
		fill.addColorStop(1, "rgba(10,16,32,0)");
		ctx.beginPath();
		ctx.moveTo(pts[0]![0], bottom);
		for (const [x, py] of pts) ctx.lineTo(x, py);
		ctx.lineTo(pts[pts.length - 1]![0], bottom);
		ctx.closePath();
		ctx.fillStyle = fill;
		ctx.fill();
		ctx.beginPath();
		pts.forEach(([x, py], i) => (i === 0 ? ctx.moveTo(x, py) : ctx.lineTo(x, py)));
		ctx.strokeStyle = color;
		ctx.lineWidth = 6;
		ctx.lineJoin = "round";
		ctx.lineCap = "round";
		ctx.stroke();
	}

	// It's practice money - said on the picture itself, since it travels without the app around it.
	ctx.fillStyle = MUTED;
	ctx.font = "400 28px Geist, sans-serif";
	ctx.fillText("Paper trading on STAK · not real money", PAD, H - PAD);
	ctx.fillStyle = TEAL;
	ctx.font = "500 30px Geist, sans-serif";
	ctx.textAlign = "right";
	ctx.fillText("thestak.org", W - PAD, H - PAD);

	return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("No picture"))), "image/png"));
}

// The picture is drawn ahead of the tap (useShareCardPrep): Safari opens a share sheet only straight from a tap, and
// waiting for a picture to be drawn first can lose it.
let prepared: { key: string; ready?: Blob } | null = null;
let sharing = false;

/** Draws [spec]'s picture now and keeps it, so a tap can share it at once. Redrawn only when what it shows changes. */
export function prepareShareCard(spec: ShareCardSpec): void {
	const key = JSON.stringify(spec);
	if (prepared?.key === key) return;
	const entry: { key: string; ready?: Blob } = { key };
	prepared = entry;
	renderShareCard(spec).then((b) => { if (prepared === entry) entry.ready = b; }).catch(() => {});
}

/** Keeps [spec]'s share picture drawn while the page shows it (null: nothing to picture). */
export function useShareCardPrep(spec: ShareCardSpec | null): void {
	const key = spec ? JSON.stringify(spec) : "";
	useEffect(() => { if (spec) prepareShareCard(spec); }, [key]);
}

/** The same, for a page that can't call it at its top (one that returns early): render it where the picture is shown. */
export function ShareCardPrep({ spec }: { spec: ShareCardSpec | null }): null {
	useShareCardPrep(spec);
	return null;
}

/**
 * Shares the picture with [text] where the browser can share files (phones); elsewhere (a desktop browser) saves the
 * picture and copies the text. One at a time - a second tap while the sheet is up does nothing. Dismissing the sheet
 * isn't an error.
 */
export async function sharePicture(spec: ShareCardSpec, text: string, fileName: string): Promise<void> {
	if (sharing) return;
	sharing = true;
	try { await shareNow(spec, text, fileName); } finally { sharing = false; }
}

async function shareNow(spec: ShareCardSpec, text: string, fileName: string): Promise<void> {
	let blob = prepared?.key === JSON.stringify(spec) ? prepared.ready : undefined;
	if (!blob) {
		try { blob = await renderShareCard(spec); } catch {
			// No picture (an old browser): the words alone, as before.
			try { if (navigator.share) await navigator.share({ title: "STAK", text }); } catch { /* cancelled */ }
			return;
		}
	}
	const file = new File([blob], fileName, { type: "image/png" });
	if (navigator.canShare?.({ files: [file] })) {
		// A refusal or a cancel ends it here - the download below is only for a browser that can't share files.
		try { await navigator.share({ files: [file], text, title: "STAK" }); } catch { /* cancelled or refused */ }
		return;
	}
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = fileName;
	a.click();
	window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
	try { await navigator.clipboard.writeText(text); toast.success("Picture saved · caption copied"); } catch { toast.success("Picture saved"); }
}
