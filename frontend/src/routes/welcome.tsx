import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "../context/AuthContext";
import { useEffect, useState, useRef, useCallback, type CSSProperties } from "react";

export const Route = createFileRoute("/welcome")({
	component: LandingPage,
});

/* ─── ASSETS (downloaded from Figma to /public/images/landing-v2/) ──── */
const A = {
	// Hero
	box3d: "/images/landing-v2/hero-box-3d.png",
	gif: "/images/landing-v2/hero-gif.gif",
	gifAlpha: "/images/landing-v2/hero-gif-alpha.png",
	boxBeamComposite: "/images/landing-v2/hero-beam-composite-2xb.png",
	boxFlareComposite: "/images/landing-v2/hero-flare-composite-2xb.png",
	boxM390: "/images/landing-v2/hero-box-frame124-m390-2x.png",
	boxT810: "/images/landing-v2/hero-box-frame124-t810-2x.png",
	boxFlap1: "/images/landing-v2/hero-box-flap-1.svg",
	boxFlap2: "/images/landing-v2/hero-box-flap-2.svg",
	boxFlap3: "/images/landing-v2/hero-box-flap-3.svg",
	boxFlap4: "/images/landing-v2/hero-box-flap-4.svg",
	boxFlap5: "/images/landing-v2/hero-box-flap-5.svg",
	boxGlow: "/images/landing-v2/hero-box-glow.svg",
	inner111: "/images/landing-v2/hero-inner-111.svg",
	innerVec7: "/images/landing-v2/hero-inner-vec7.svg",
	inner113: "/images/landing-v2/hero-inner-113.svg",
	inner114: "/images/landing-v2/hero-inner-114.svg",
	brandAmazon: "/images/landing-v2/hero-brand-amazon.png",
	brandNvidia: "/images/landing-v2/hero-brand-nvidia.png",
	brandTwitch: "/images/landing-v2/hero-brand-twitch.png",
	brandShopify: "/images/landing-v2/hero-brand-shopify.png",
	brandGoogle: "/images/landing-v2/hero-brand-google.png",
	brandApple: "/images/landing-v2/hero-brand-apple.png",
	ellipse108: "/images/landing-v2/hero-ellipse-108.svg",
	ellipse109: "/images/landing-v2/hero-ellipse-109.svg",
	pillDot: "/images/landing-v2/hero-pill-dot.svg",
	pillArrow: "/images/landing-v2/hero-pill-arrow.svg",
	ctaArrow: "/images/landing-v2/hero-cta-arrow.svg",
	logo1: "/images/landing-v2/hero-logo-1.svg",
	logo2: "/images/landing-v2/hero-logo-2.svg",
	// Social proof
	proofAmplitude: "/images/landing-v2/proof-amplitude.svg",
	proofSpotify: "/images/landing-v2/proof-spotify.svg",
	proofBlockWallet1: "/images/landing-v2/proof-blockwallet-1.svg",
	proofBlockWallet2: "/images/landing-v2/proof-blockwallet-2.svg",
	proofBrex1: "/images/landing-v2/proof-brex-1.svg",
	proofBrex2: "/images/landing-v2/proof-brex-2.svg",
	proofBwIcon: "/images/landing-v2/proof-bw-icon.svg",
	proofBwWord: "/images/landing-v2/proof-bw-word.svg",
	proofBrexMain: "/images/landing-v2/proof-brex-main.svg",
	proofBrexDetail: "/images/landing-v2/proof-brex-detail.svg",
	proofBetterStack: "/images/landing-v2/proof-betterstack.png",
	proofDeel: "/images/landing-v2/proof-deel.png",
	ctaMqMask: "/images/landing-v2/cta-mq-mask.svg",
	ctaMqA8: "/images/landing-v2/cta-mq-a8.jpg",
	ctaMq9e: "/images/landing-v2/cta-mq-9e.jpg",
	ctaMqF7: "/images/landing-v2/cta-mq-f7.jpg",
	ctaMq85: "/images/landing-v2/cta-mq-85.jpg",
	ctaMqC5: "/images/landing-v2/cta-mq-c5.jpg",
	ctaMq4a: "/images/landing-v2/cta-mq-4a.jpg",
	ctaMq02: "/images/landing-v2/cta-mq-02.jpg",
	ctaMqE0: "/images/landing-v2/cta-mq-e0.jpg",
	ctaMqBb: "/images/landing-v2/cta-mq-bb.jpg",
	navMenu: "/images/landing-v2/nav-button.svg",
	// Problem
	problemScreenshot: "/images/landing-v2/problem-screenshot.png",
	problemEllipse: "/images/landing-v2/problem-ellipse.svg",
	// How It Works
	hiwEllipse1: "/images/landing-v2/hiw-ellipse-1.svg",
	hiwEllipse2: "/images/landing-v2/hiw-ellipse-2.svg",
	// Features (phone mockup parts)
	featPhoneScreen: "/images/landing-v2/feat-phone-screen.svg",
	featG1506: "/images/landing-v2/feat-iphone-g1506.svg",
	featG1507: "/images/landing-v2/feat-iphone-g1507.svg",
	featR2415499: "/images/landing-v2/feat-iphone-rect2415499.svg",
	featR241549: "/images/landing-v2/feat-iphone-rect241549.svg",
	featR2415496: "/images/landing-v2/feat-iphone-rect2415496.svg",
	featR24154: "/images/landing-v2/feat-iphone-rect24154.svg",
	featR2163: "/images/landing-v2/feat-iphone-rect2163.svg",
	featR21631: "/images/landing-v2/feat-iphone-rect21631.svg",
	featR2172: "/images/landing-v2/feat-iphone-rect2172.svg",
	featR1093: "/images/landing-v2/feat-iphone-rect1093.svg",
	featR3540: "/images/landing-v2/feat-iphone-rect3540.svg",
	featR1030: "/images/landing-v2/feat-iphone-rect1030.svg",
	featG2819: "/images/landing-v2/feat-iphone-g2819.svg",
	featG2820: "/images/landing-v2/feat-iphone-g2820.svg",
	featSubtract: "/images/landing-v2/feat-iphone-subtract.svg",
	featVec: "/images/landing-v2/feat-iphone-vec.svg",
	featG2170: "/images/landing-v2/feat-iphone-g2170.svg",
	featG2171: "/images/landing-v2/feat-iphone-g2171.svg",
	// Early Momentum
	emAvatar: "/images/landing-v2/em-avatar.jpg",
	emStatArrow: "/images/landing-v2/em-stat-arrow.svg",
	// FAQ
	faqPlus: "/images/landing-v2/faq-plus.svg",
	faqMinus: "/images/landing-v2/faq-minus.svg",
	faqDivider: "/images/landing-v2/faq-divider.svg",
	// Final CTA marquee
	ctaMask: "/images/landing-v2/cta-mask.svg",
	ctaTile1: "/images/landing-v2/cta-tile-1.jpg",
	ctaTile2: "/images/landing-v2/cta-tile-2.jpg",
	ctaTile3: "/images/landing-v2/cta-tile-3.jpg",
	ctaTile4: "/images/landing-v2/cta-tile-4.jpg",
	ctaTile5: "/images/landing-v2/cta-tile-5.jpg",
	ctaTile6: "/images/landing-v2/cta-tile-6.jpg",
	ctaTile7: "/images/landing-v2/cta-tile-7.jpg",
	ctaTile8: "/images/landing-v2/cta-tile-8.jpg",
	ctaTile9: "/images/landing-v2/cta-tile-9.jpg",
	// Footer
	footerWatermark: "/images/landing-v2/footer-stak-watermark.png",
	footerLogoIcon: "/images/landing-v2/footer-logo-icon.svg",
	footerLogoWord: "/images/landing-v2/footer-logo-wordmark.svg",
	footerPlay: "/images/landing-v2/footer-playstore.svg",
	footerPlayText: "/images/landing-v2/footer-playstore-text.svg",
	footerApple: "/images/landing-v2/footer-apple.svg",
	footerDivider: "/images/landing-v2/footer-divider.svg",
};

/* ─── FONTS ─────────────────────────────────────────────────────────── */
const SQ = "'Squarish Sans CT SC', 'Squarish Sans CT', 'Chakra Petch', sans-serif";
const SR = "'Sora', sans-serif";

/* ─── COMMON STYLES (exact Figma values) ────────────────────────────── */
const PILL_BG = "rgba(23,32,56,0.73)";
const SECTION_BG = "#0a1020";
const CARD_BG = "#10172a";
const BODY_DIM = "rgba(255,255,255,0.62)";

const CTA_GRADIENT =
	"linear-gradient(180deg, rgba(169,219,234,0.82) 8.8889%, rgb(60,152,180) 44.444%), linear-gradient(90deg, rgb(44,157,188) 0%, rgb(44,157,188) 100%)";
const CTA_BORDER = "0.361px solid rgba(101,158,173,0.63)";
const CTA_SHADOW =
	"drop-shadow(0px 77.322px 10.839px rgba(82,170,199,0)) drop-shadow(0px 49.862px 9.756px rgba(82,170,199,0.01)) drop-shadow(0px 28.183px 8.31px rgba(82,170,199,0.05)) drop-shadow(0px 12.285px 6.142px rgba(82,170,199,0.09)) drop-shadow(0px 2.891px 3.252px rgba(82,170,199,0.10))";

/* ─── SECTION VERTICAL ANCHORS (px from page top) ───────────────────── */
const SEC = {
	hero: 0,
	problem: 1154,
	howItWorks: 2417,
	features: 3479,
	earlyMomentum: 5267,
	faq: 6257,
	finalCta: 7476,
	footer: 8906,
};
const TOTAL_HEIGHT = 9589;
const CANVAS_WIDTH = 1400;
/* On screens wider than 1400 the canvas scales UP to fill the viewport —
   uncapped, so the page keeps Figma proportions edge-to-edge at any width. */

const btnReset: CSSProperties = {
	background: "none",
	border: 0,
	padding: 0,
	margin: 0,
	color: "inherit",
	font: "inherit",
	cursor: "pointer",
	whiteSpace: "nowrap",
};

/* ─── REUSABLE: Pill badge ──────────────────────────────────────────── */
/* Pill — the small "section label" chip used at the top of every section
   (e.g. "The Problem", "Features", "STAK FAQ").

   - `size="default"` matches Figma's 1:927 spec exactly (used by every section
     except the Final CTA): padding 6/10, radius 10, gap 12, 12px dot,
     14px Sora-Light text. Figma cap-trims its 45px leading (text-box-trim),
     so the chip renders 24px tall — the 12px CSS line-height reproduces that box.
   - `size="lg"` is a slightly chunkier variant: padding 14/22, radius 14,
     gap 14, 16px dot, 16px text with a tight 1.4 line-height. Used ONLY for
     the "Our growing community" pill at the top of the Final CTA section,
     where the spec needed the pill to read as more prominent against the
     wide marquee below it. */
function Pill({ label, style, size = "default" }: { label: string; style?: CSSProperties; size?: "default" | "lg" }) {
	const isLg = size === "lg";
	const gap = isLg ? 14 : 12;
	const padding = isLg ? "14px 22px" : "6px 10px";
	const radius = isLg ? 14 : 10;
	const dotSize = isLg ? 16 : 12;
	const fontSize = isLg ? 16 : 14;
	const lineHeight: string | number = isLg ? 1.4 : "12px";
	return (
		<div
			style={{
				background: PILL_BG,
				display: "flex",
				alignItems: "center",
				gap,
				padding,
				borderRadius: radius,
				...style,
			}}
		>
			<div style={{ width: dotSize, height: dotSize, flexShrink: 0 }}>
				<img src={A.pillDot} alt="" style={{ width: "100%", height: "100%" }} />
			</div>
			<p
				style={{
					fontFamily: SR,
					fontWeight: 300,
					fontSize,
					lineHeight,
					color: "#fff",
					textAlign: "center",
					margin: 0,
					whiteSpace: "nowrap",
				}}
			>
				{label}
			</p>
		</div>
	);
}

/* ─── REUSABLE: Section headline ──────────────────────────────────── */
function Headline({ lines, style }: { lines: string[]; style?: CSSProperties }) {
	return (
		<div
			style={{
				fontFamily: SQ,
				fontSize: 40,
				lineHeight: "45px",
				color: "#fff",
				textAlign: "center",
				width: "100%",
				...style,
			}}
		>
			{lines.map((l, i) => (
				<p key={i} style={{ margin: 0, lineHeight: "45px" }}>
					{l}
				</p>
			))}
		</div>
	);
}

/* ─── REUSABLE: Subheadline ─────────────────────────────────────────── */
function Subhead({ lines, width = 720, style }: { lines: string[]; width?: number; style?: CSSProperties }) {
	return (
		<div
			style={{
				fontFamily: SR,
				fontWeight: 300,
				fontSize: 20,
				lineHeight: "25px",
				color: "#fff",
				textAlign: "center",
				width,
				...style,
			}}
		>
			{lines.map((l, i) => (
				<p key={i} style={{ margin: 0, lineHeight: "25px" }}>
					{l}
				</p>
			))}
		</div>
	);
}

/* ─── REUSABLE: Gradient CTA button ─────────────────────────────────── */
function CtaButton({
	label,
	onClick,
	withArrow = true,
	fontSize = 18,
	arrowSize = { w: 19.006, h: 15.839 },
	style,
}: {
	label: string;
	onClick?: () => void;
	withArrow?: boolean;
	fontSize?: number;
	arrowSize?: { w: number; h: number };
	style?: CSSProperties;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			style={{
				background: CTA_GRADIENT,
				border: CTA_BORDER,
				borderRadius: 5.781,
				padding: "7.226px 14.453px",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				gap: 7.226,
				filter: CTA_SHADOW,
				cursor: "pointer",
				...style,
			}}
		>
			<span
				style={{
					fontFamily: SR,
					fontWeight: 400,
					fontSize,
					lineHeight: "normal",
					color: "#fff",
					whiteSpace: "nowrap",
				}}
			>
				{label}
			</span>
			{withArrow && (
				<div style={{ width: arrowSize.w, height: arrowSize.h, flexShrink: 0 }}>
					<img src={A.ctaArrow} alt="" style={{ width: "100%", height: "100%" }} />
				</div>
			)}
		</button>
	);
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  NAVIGATION BAR                                                      */
/* ═══════════════════════════════════════════════════════════════════ */
function NavBar({ onSignup, onScrollTo }: { onLogin: () => void; onSignup: () => void; onScrollTo: (k: keyof typeof SEC) => void }) {
	return (
		<div
			style={{
				position: "absolute",
				left: "50%",
				top: 17,
				transform: "translateX(-50%)",
				background: "#1a1d31",
				width: 1232,
				padding: "8px 9px 8px 11px",
				borderRadius: 13,
				boxSizing: "border-box",
				display: "flex",
				alignItems: "center",
				gap: 338,
				zIndex: 10,
			}}
		>
			<div style={{ position: "relative", width: 109.131, height: 26.478, overflow: "hidden", flexShrink: 0 }}>
				<div style={{ position: "absolute", inset: 0, width: "24.26%" }}>
					<img src={A.logo1} alt="STAK" style={{ width: "100%", height: "100%", display: "block" }} />
				</div>
				<div style={{ position: "absolute", left: "28.38%", top: "21.77%", right: 0, bottom: "21.64%" }}>
					<img src={A.logo2} alt="" style={{ width: "100%", height: "100%", display: "block" }} />
				</div>
			</div>

			<div style={{ display: "flex", alignItems: "center", flex: 1, justifyContent: "space-between" }}>
				<div style={{ display: "flex", alignItems: "center", gap: 35.168, fontFamily: SR, fontWeight: 400, fontSize: 16, color: "#fff" }}>
					<button type="button" onClick={() => onScrollTo("hero")} style={btnReset}>Home</button>
					<button type="button" onClick={() => onScrollTo("features")} style={btnReset}>Features</button>
					<button type="button" onClick={() => onScrollTo("howItWorks")} style={btnReset}>How It Works</button>
					<button type="button" onClick={() => onScrollTo("faq")} style={{ ...btnReset, marginLeft: 12 }}>FAQ</button>
				</div>
				{/* Figma navbar (node 1:315 / Frame 52) has NO Login button — */}
				<CtaButton label="Get started" withArrow={false} fontSize={14.453} onClick={onSignup} />
			</div>
		</div>
	);
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  SECTION 1: HERO                                                     */
/* ═══════════════════════════════════════════════════════════════════ */
function Hero({ onLogin, onSignup, onScrollTo }: { onLogin: () => void; onSignup: () => void; onScrollTo: (k: keyof typeof SEC) => void }) {
	return (
		<section style={{ position: "absolute", left: 0, top: SEC.hero, width: CANVAS_WIDTH, height: 1154, background: SECTION_BG, overflow: "hidden" }}>
			{/* Gradient 3 (Figma node 1:258) net effect — a SUBTLE glow strictly
			    behind the box (Ellipse 103, #34B4BE) that grounds it, fading to
			    #0a1020 well before the headline above and before the box base below,
			    so it never washes the text or bleeds under the box. */}
			<div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(40% 21% at 50% 52%, rgba(70,118,162,0.12) 0%, rgba(45,86,130,0.045) 46%, rgba(10,16,32,0) 72%)" }} />
			<div style={{ position: "absolute", left: 18, top: 193, width: 470, height: 231, overflow: "visible", pointerEvents: "none" }}>
				<img src={A.ellipse108} alt="" style={{ position: "absolute", top: "-199.08%", left: "-97.85%", right: "-97.85%", bottom: "-199.08%", width: "auto", height: "auto", maxWidth: "none" }} />
			</div>
			<div style={{ position: "absolute", left: 879, top: 589, width: 359, height: 217, overflow: "visible", pointerEvents: "none" }}>
				<img src={A.ellipse109} alt="" style={{ position: "absolute", top: "-179.01%", left: "-108.2%", right: "-108.2%", bottom: "-179.01%", width: "auto", height: "auto", maxWidth: "none" }} />
			</div>

			<NavBar onLogin={onLogin} onSignup={onSignup} onScrollTo={onScrollTo} />

			{/* Hero text */}
			<div style={{ position: "absolute", left: "50%", top: 110, transform: "translateX(-50%)", width: 926, display: "flex", flexDirection: "column", alignItems: "center", gap: 30 }}>
				<div style={{ background: "rgba(36,43,61,0.79)", display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 36 }}>
					<div style={{ width: 12, height: 12, flexShrink: 0 }}>
						<img src={A.pillDot} alt="" style={{ width: "100%", height: "100%" }} />
					</div>
					{/* line-height 12px (not Figma's literal 45px): Figma TRIMS the text
					    box, rendering this pill at 24px tall (Frame 62 = h24). Using 45px
					    raw makes the pill 57px and shoves the whole text block 33px down
					    into the box/beam. 12px keeps the pill at Figma's 24px. */}
					<p style={{ fontFamily: SR, fontWeight: 300, fontSize: 14, lineHeight: "12px", color: "#fff", margin: 0, whiteSpace: "nowrap" }}>
						Get early access
					</p>
					<div style={{ width: 13.199, height: 10.999, flexShrink: 0 }}>
						<img src={A.pillArrow} alt="" style={{ width: "100%", height: "100%" }} />
					</div>
				</div>

				<div style={{ display: "flex", flexDirection: "column", gap: 20, alignItems: "center", width: "100%" }}>
					<Headline lines={["The Stock Market,", "Finally Speaks Your Language."]} style={{ fontSize: 50 }} />
					<div style={{ fontFamily: SR, fontWeight: 300, fontSize: 20, color: "#fff", textAlign: "center" }}>
						<p style={{ margin: 0, lineHeight: "25px", whiteSpace: "pre" }}>{`STAK matches you with stocks you'll actually understand —through swipes, smart insights, `}</p>
						<p style={{ margin: 0, lineHeight: "25px", whiteSpace: "pre" }}>and zero pressure. Before you buy anything, STAK it.</p>
					</div>
				</div>
			</div>

			{/* Frame 124 (1:343) — the design now uses the tight-beam composition on the desktop
			    too (identical geometry to the tablet frame), rendered from the same flattened 2x
			    export. left 406 = frame x; top 314 = frame y 325.77 minus 11.77px render spill. */}
			<div style={{ position: "absolute", left: 406, top: 314, width: 587.309, height: 563.5, pointerEvents: "none" }}>
				<img src={A.boxT810} alt="" style={{ width: "100%", height: "100%", display: "block" }} />
			</div>

			<div style={{ position: "absolute", left: "calc(50% - 0.43px)", top: 895, transform: "translateX(-50%)" }}>
				<CtaButton label="Get started" onClick={onSignup} />
			</div>

			{/* Proof logos row — Figma node 1:380 "Frame 136", x=207, width=986.99,
			    a single horizontal row of 6 partner logos with 79px gaps. Width is
			    set explicitly to 986.99 so the row does NOT wrap: with only `left`
			    + translateX(-50%) and no width, the browser caps an absolutely-
			    positioned element's width at (containing-block − left ≈ 699px),
			    which was forcing the 6 logos (987px total) onto two rows. */}
			<div style={{ position: "absolute", left: "calc(50% + 0.5px)", top: 1024, transform: "translateX(-50%)", width: 986.99, display: "flex", flexWrap: "nowrap", justifyContent: "space-between", alignItems: "center", columnGap: 79 }}>
				{/* Block Wallet (Figma node 1:381) — icon (left ~14%) + wordmark
				    (right ~81%) positioned side-by-side per Figma. The old generic
				    overlay stretched BOTH to full size atop each other → garbled blob. */}
				<div style={{ width: 150, height: 21, position: "relative", flexShrink: 0 }} aria-label="Block Wallet">
					<div style={{ position: "absolute", inset: "0 85.94% 0 0" }}>
						<img src={A.proofBwIcon} alt="Block Wallet" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
					</div>
					<div style={{ position: "absolute", inset: "9.07% 0 11.2% 18.72%" }}>
						<img src={A.proofBwWord} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
					</div>
				</div>
				<div style={{ width: 100, height: 21.834, position: "relative", overflow: "hidden" }}>
					<img src={A.proofAmplitude} alt="Amplitude" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
				</div>
				<div style={{ width: 135, height: 21.344, position: "relative", overflow: "hidden", display: "flex", alignItems: "center" }}>
					<img src={A.proofBetterStack} alt="Better Stack" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "left top" }} />
				</div>
				{/* Brex (Figma node 1:384) — main logo (full width) + small detail
				    mark, positioned per Figma rather than stretched/overlapped. */}
				<div style={{ width: 81.9, height: 21, position: "relative", flexShrink: 0 }} aria-label="Brex">
					<div style={{ position: "absolute", inset: "0 1.42% 0 1.12%" }}>
						<img src={A.proofBrexMain} alt="Brex" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
					</div>
					<div style={{ position: "absolute", inset: "20.67% 16.9% 15.5% 68.18%" }}>
						<img src={A.proofBrexDetail} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
					</div>
				</div>
				<div style={{ width: 56.1, height: 19.513, position: "relative", overflow: "hidden", display: "flex", alignItems: "center" }}>
					<img src={A.proofDeel} alt="Deel" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
				</div>
				<div style={{ width: 69, height: 21.923, position: "relative", overflow: "hidden" }}>
					<div style={{ position: "absolute", inset: "1.52% 3.8% 4.37% 0.15%" }}><img src={A.proofSpotify} alt="Spotify" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} /></div>
				</div>
			</div>
		</section>
	);
}

function ProofLogo({ width, height, label, multi }: { width: number; height: number; label: string; multi: string[] }) {
	return (
		<div style={{ width, height, position: "relative", overflow: "hidden" }} aria-label={label}>
			{multi.map((src, i) => (
				<img key={i} src={src} alt={i === 0 ? label : ""} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain" }} />
			))}
		</div>
	);
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  SECTION 2: PROBLEM                                                  */
/* ═══════════════════════════════════════════════════════════════════ */
function Problem({ onSignup }: { onSignup: () => void }) {
	return (
		<section style={{ position: "absolute", left: 0, top: SEC.problem, width: CANVAS_WIDTH, height: 1263, background: SECTION_BG, overflow: "hidden" }}>
			<div style={{ position: "absolute", left: "50%", top: 70, transform: "translateX(-50%)", width: 926, display: "flex", flexDirection: "column", alignItems: "center", gap: 77 }}>
				<Pill label="The Problem" />
				<div style={{ display: "flex", flexDirection: "column", gap: 20, alignItems: "center", width: "100%" }}>
					<Headline lines={["The Market Isn't Hard.", "It's Just Been Made That Way."]} />
					<Subhead lines={[`You've heard the advice — "invest early, invest often."`, "But nobody tells you how. Here’s how"]} />
				</div>
			</div>

			<div style={{ position: "absolute", left: "calc(50% - 0.02px)", top: 311, transform: "translateX(-50%)", width: 1237.95, height: 767, overflow: "hidden" }}>
				{/* Phone screenshot — Figma node 1:440. Figma applies a `blur-[3.285px]`
				    filter to the image, but we render it crisp (no blur) per design
				    intent — the blur in Figma was a stylization that obscured the
				    actual screenshot content. */}
				<div style={{ position: "absolute", left: "calc(50% + 1.48px)", top: 128.09, transform: "translateX(-50%)", width: 621.781, height: 639.024 }}>
					<img src={A.problemScreenshot} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", maskImage: "linear-gradient(to bottom, black 94%, transparent 96.5%)", WebkitMaskImage: "linear-gradient(to bottom, black 94%, transparent 96.5%)" }} />
				</div>
				{/* Bottom fade — Figma node 1:441, EXACT values. A `to top`
				    gradient: solid #0a1020 up to 30.374%, fading to transparent
				    rgba(10,16,32,0) by 96.262%. Positioned bottom:-19 / left:-84,
				    1400×214, with Figma's 12.798px layer blur to soften the
				    transition. The solid lower portion cleanly covers the hard
				    bottom edge of the hands, then fades up smoothly into the phone. */}
				<div style={{ position: "absolute", bottom: -19, left: -84, width: 1400, height: 214, background: "linear-gradient(to top, #0a1020 30.374%, rgba(10,16,32,0) 96.262%)", filter: "blur(12.798px)", pointerEvents: "none" }} />
			</div>

			{/* Removed: Ellipse 109 (Figma node 1:445) — a decorative blue
			    radial-glow halo behind the phone. The user explicitly asked for
			    it to be removed since the glow was visible as a faint oval on
			    the left side of the section at typical viewport widths. */}

			<div style={{ position: "absolute", left: "calc(50% - 0.43px)", top: 1130, transform: "translateX(-50%)" }}>
				<CtaButton label="Get started" onClick={onSignup} />
			</div>
		</section>
	);
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  SECTION 3: HOW IT WORKS                                             */
/* ═══════════════════════════════════════════════════════════════════ */
function HowItWorks({ onScrollTo }: { onScrollTo: (k: keyof typeof SEC) => void }) {
	const cards = [
		{ n: "01/", title: "Tell Us Who You Are", body: ["Take a quick risk quiz. STAK learns your personality, your goals, and your vibe. ", "No spreadsheets. No jargon."] },
		{ n: "02/", title: "Swipe Through Stocks", body: ["Like a stock? Swipe right. Not feeling it? Swipe left. Want to know more? Swipe up. ", "It's that simple."] },
		{ n: "03/", title: "STAK Before You Spend", body: ["Practice with real market data and zero real money. Build confidence before you commit a single dollar."] },
	];

	return (
		<section style={{ position: "absolute", left: 0, top: SEC.howItWorks, width: CANVAS_WIDTH, height: 1062, background: SECTION_BG, overflow: "hidden" }}>
			{/* Removed: hiwEllipse1 + hiwEllipse2 — two decorative radial-glow
			    ovals in this section (one at left:839 top:529, one at left:329
			    top:368). Both were producing faint "lights" at the left and
			    right of the section that the user explicitly asked to remove. */}

			<div style={{ position: "absolute", left: 100, top: 70, width: 1201, display: "flex", flexDirection: "column", alignItems: "center", gap: 159 }}>
				<div style={{ width: 926, display: "flex", flexDirection: "column", gap: 77, alignItems: "center" }}>
					<Pill label="How It Works" />
					<Headline lines={["Three Swipes to Smarter ", "Investing."]} />
				</div>

				<div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 110 }}>
					<div style={{ display: "flex", gap: 17 }}>
						{cards.map((c, i) => (
							<div key={i} style={{ background: CARD_BG, width: 389, height: 391, borderRadius: 12, overflow: "hidden", position: "relative" }}>
								<div style={{ position: "absolute", bottom: i === 0 ? 37 : 32, left: "calc(50% + 0.5px)", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: i === 2 ? 13 : 17, width: 330 }}>
									<p style={{ fontFamily: SQ, fontSize: 30, color: "#fff", margin: 0, lineHeight: "normal" }}>{c.n}</p>
									<div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 8, width: "100%" }}>
										<p style={{ fontFamily: SR, fontWeight: 600, fontSize: 20, color: "#fff", margin: 0, lineHeight: "normal", whiteSpace: i === 0 ? "nowrap" : "normal", height: i === 2 ? 30 : undefined }}>{c.title}</p>
										<div style={{ fontFamily: SR, fontWeight: 300, fontSize: 14, color: BODY_DIM, width: 330, height: 54, whiteSpace: "pre-wrap" }}>
											{c.body.map((line, k) => (
												<p key={k} style={{ margin: 0, lineHeight: "normal" }}>{line}</p>
											))}
										</div>
									</div>
								</div>
							</div>
						))}
					</div>
					<CtaButton label="Explore STAK" onClick={() => onScrollTo("features")} />
				</div>
			</div>
		</section>
	);
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  SECTION 4: FEATURES                                                 */
/* ═══════════════════════════════════════════════════════════════════ */
function PhoneMockup({ variant }: { variant: 1 | 2 }) {
	const g1506 = variant === 1 ? A.featG1506 : A.featG1507;
	const g2819 = variant === 1 ? A.featG2819 : A.featG2820;
	const g2170 = variant === 1 ? A.featG2170 : A.featG2171;
	return (
		<div style={{ position: "absolute", left: "calc(50% - 0.39px)", top: "calc(50% - 28.76px)", transform: "translate(-50%, -50%)", width: 515.477, height: 490.504 }}>
			<div style={{ position: "absolute", left: 140.03, top: 46.95, width: 219.369, height: 443.558 }}>
				<div style={{ position: "absolute", top: "20.09%", bottom: "55.66%", left: 0, right: 0 }}><img src={g1506} alt="" style={{ width: "100%", height: "100%" }} /></div>
				<div style={{ position: "absolute", top: "29.92%", bottom: "58.54%", left: "97.2%", right: 0 }}><img src={A.featR2415499} alt="" style={{ width: "100%", height: "100%" }} /></div>
				<div style={{ position: "absolute", top: "27.52%", bottom: "65.36%", left: "0.02%", right: "97.18%" }}><img src={A.featR241549} alt="" style={{ width: "100%", height: "100%" }} /></div>
				<div style={{ position: "absolute", top: "37.13%", bottom: "55.76%", left: 0, right: "97.2%" }}><img src={A.featR2415496} alt="" style={{ width: "100%", height: "100%" }} /></div>
				<div style={{ position: "absolute", top: "20.23%", bottom: "76.19%", left: 0, right: "97.2%" }}><img src={A.featR24154} alt="" style={{ width: "100%", height: "100%" }} /></div>
				<div style={{ position: "absolute", top: "0.07%", bottom: "0.07%", left: "0.72%", right: "0.69%" }}>
					<div style={{ position: "absolute", inset: "0 -0.14%" }}><img src={A.featR2163} alt="" style={{ width: "100%", height: "100%" }} /></div>
				</div>
				<div style={{ position: "absolute", top: "0.34%", bottom: "0.34%", left: "1.26%", right: "1.23%" }}>
					<div style={{ position: "absolute", inset: "-0.27% -0.55%" }}><img src={A.featR21631} alt="" style={{ width: "100%", height: "100%" }} /></div>
				</div>
				<div style={{ position: "absolute", top: 0, bottom: 0, left: "0.58%", right: "0.55%" }}><img src={A.featR2172} alt="" style={{ width: "100%", height: "100%" }} /></div>
				<div style={{ position: "absolute", top: "0.66%", bottom: "98.65%", left: "41.51%", right: "40.95%" }}><img src={A.featR1093} alt="" style={{ width: "100%", height: "100%" }} /></div>
				<div style={{ position: "absolute", top: "0.7%", bottom: "0.7%", left: "1.86%", right: "1.84%" }}><img src={A.featR3540} alt="" style={{ width: "100%", height: "100%" }} /></div>
				<div style={{ position: "absolute", top: "0.7%", bottom: "98.33%", left: "42.15%", right: "41.59%" }}>
					<div style={{ position: "absolute", inset: "-3.53% -0.43%" }}><img src={A.featR1030} alt="" style={{ width: "100%", height: "100%" }} /></div>
				</div>
				<div style={{ position: "absolute", top: "0.9%", bottom: "98.53%", left: "42.59%", right: "42.03%" }}>
					<div style={{ position: "absolute", inset: "-50.03% -6.33% -49.48% -6.33%" }}><img src={g2819} alt="" style={{ width: "100%", height: "100%" }} /></div>
				</div>
				<div style={{ position: "absolute", top: "2.33%", bottom: "2.23%", left: "5.54%", right: "5.34%", background: "#fff", overflow: "hidden", borderRadius: 23 }}>
					<img src={A.featPhoneScreen} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
				</div>
				<div style={{ position: "absolute", top: "2.33%", bottom: "94.04%", left: "29.66%", right: "29.43%" }}><img src={A.featSubtract} alt="" style={{ width: "100%", height: "100%" }} /></div>
				<div style={{ position: "absolute", top: "2.82%", bottom: "95.61%", left: "35.68%", right: "61.14%" }}><img src={g2170} alt="" style={{ width: "100%", height: "100%" }} /></div>
			</div>
			<div style={{ position: "absolute", inset: "0 0 -1px", background: "linear-gradient(to bottom, rgba(16,23,42,0) 40.429%, #10172a 73.762%)", borderRadius: 10.647, pointerEvents: "none" }} />
		</div>
	);
}

function SwipeDeckIllustration() {
	return (
		<div style={{ position: "absolute", left: "calc(50% + 0.07px)", top: 122.09, transform: "translateX(-50%)", width: 331.895, height: 184.655 }}>
			<div style={{ position: "absolute", left: 180.19, top: 15.18, width: 151.696, height: 169.472, display: "flex", alignItems: "center", justifyContent: "center" }}>
				<div style={{ transform: "rotate(12.75deg)", width: 122.486, height: 146.041, background: "#b4b4b4", borderRadius: 9.422 }} />
			</div>
			<div style={{ position: "absolute", left: 93.36, top: 0, width: 145.182, height: 173.101, background: "#d9d9d9", borderRadius: 11.168 }} />
			<div style={{ position: "absolute", left: 0, top: 14, width: 151.696, height: 169.472, display: "flex", alignItems: "center", justifyContent: "center" }}>
				<div style={{ transform: "rotate(-12.75deg)", width: 122.486, height: 146.041, background: "rgba(217,217,217,0.8)", borderRadius: 9.422 }} />
			</div>
		</div>
	);
}

function Features({ onScrollTo }: { onScrollTo: (k: keyof typeof SEC) => void }) {
	return (
		<section style={{ position: "absolute", left: 0, top: SEC.features, width: CANVAS_WIDTH, height: 1788, background: SECTION_BG, overflow: "hidden" }}>
			<div style={{ position: "absolute", left: 111, top: 70, width: 1179, display: "flex", flexDirection: "column", alignItems: "center", gap: 110 }}>
				<div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 159 }}>
					<div style={{ width: 926, display: "flex", flexDirection: "column", gap: 77, alignItems: "center" }}>
						<Pill label="Features" />
						<Headline lines={["Everything You Need.", "Nothing You Don't."]} />
					</div>

					<div style={{ display: "flex", flexDirection: "column", gap: 27.13, width: "100%" }}>
						<div style={{ display: "flex", gap: 27.13 }}>
							<div style={{ position: "relative", width: 575.935, height: 548.033, background: CARD_BG, borderRadius: 11.895, overflow: "hidden" }}>
								<PhoneMockup variant={1} />
								<div style={{ position: "absolute", left: "calc(50% + 0.07px)", top: "calc(50% + 150.73px)", transform: "translate(-50%, -50%)", width: 342.747, display: "flex", flexDirection: "column", gap: 18.087 }}>
									<p style={{ fontFamily: SR, fontWeight: 600, fontSize: 20, color: "#fff", margin: 0 }}>Trends</p>
									<div style={{ fontFamily: SR, fontWeight: 300, fontSize: 14, color: BODY_DIM, whiteSpace: "pre-wrap" }}>
										<p style={{ margin: 0, lineHeight: "normal" }}>{"See what's moving, what's hot, and what the market is actually doing — in plain English. "}</p>
										<p style={{ margin: 0, lineHeight: "normal" }}>Stay in the loop without the noise</p>
									</div>
								</div>
							</div>
							<div style={{ position: "relative", width: 575.935, height: 548.033, background: CARD_BG, borderRadius: 11.895, overflow: "hidden" }}>
								<SwipeDeckIllustration />
								<div style={{ position: "absolute", left: "calc(50% + 0.06px)", top: 376.2, transform: "translateX(-50%)", width: 342.747, display: "flex", flexDirection: "column", gap: 18.087 }}>
									<p style={{ fontFamily: SR, fontWeight: 600, fontSize: 20, color: "#fff", margin: 0 }}>Swipe Deck</p>
									<p style={{ fontFamily: SR, fontWeight: 300, fontSize: 14, color: BODY_DIM, margin: 0 }}>Discover stocks the way you discover everything else by swiping. Right to STAK it. Left to pass. Up to go deeper. Your feed, your pace.</p>
								</div>
							</div>
						</div>
						<div style={{ display: "flex", gap: 27.13 }}>
							<div style={{ position: "relative", width: 575.935, height: 548.033, background: CARD_BG, borderRadius: 11.895, overflow: "hidden" }}>
								<SwipeDeckIllustration />
								<div style={{ position: "absolute", left: "calc(50% + 0.06px)", top: 376.2, transform: "translateX(-50%)", width: 342.747, display: "flex", flexDirection: "column", gap: 18.087 }}>
									<p style={{ fontFamily: SR, fontWeight: 600, fontSize: 20, color: "#fff", margin: 0 }}>Simulated STAK</p>
									<p style={{ fontFamily: SR, fontWeight: 300, fontSize: 14, color: BODY_DIM, margin: 0 }}>Buy. Sell. Watch. Learn. All with fake money, real market data. Zero risk, full experience. Build your portfolio before it counts.</p>
								</div>
							</div>
							<div style={{ position: "relative", width: 575.935, height: 548.033, background: CARD_BG, borderRadius: 11.895, overflow: "hidden" }}>
								<PhoneMockup variant={2} />
								<div style={{ position: "absolute", left: "calc(50% + 0.07px)", top: "calc(50% + 159.73px)", transform: "translate(-50%, -50%)", width: 342.747, display: "flex", flexDirection: "column", gap: 18.087 }}>
									<p style={{ fontFamily: SR, fontWeight: 600, fontSize: 20, color: "#fff", margin: 0 }}>Intel Injections</p>
									<div style={{ fontFamily: SR, fontWeight: 300, fontSize: 14, color: BODY_DIM, whiteSpace: "pre-wrap" }}>
										<p style={{ margin: 0, lineHeight: "normal" }}>{"Bite-sized lessons delivered in-app, right when you need them. No textbooks. No boring lectures. Just context that makes you smarter "}</p>
										<p style={{ margin: 0, lineHeight: "normal" }}>on the spot.</p>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
				<CtaButton label="Explore STAK" onClick={() => onScrollTo("earlyMomentum")} />
			</div>
		</section>
	);
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  SECTION 5: EARLY MOMENTUM                                           */
/* ═══════════════════════════════════════════════════════════════════ */
/* Per Figma section 5 (node 1:680) — three staggered rows of chat bubbles.
   Row 1 (top, node 1:750):  STAK / Time / Woooo / STAK / STAK
   Row 2 (middle, 1:792):    Buzz / Tsla / STAK / STAK / STAK
   Row 3 (bottom, 1:771):    Bullish / printing / Gold / STAK / STAK */
const CHAT_BUBBLES_R1 = [
	{ t: "Just STAKed Amazon!", dark: false },
	{ t: "Time to save more!", dark: true },
	{ t: "Woooo!!", dark: false },
	{ t: "Portfolio up this week!", dark: false },
	{ t: "New to STAK, loving it!", dark: false },
];
const CHAT_BUBBLES_R2 = [
	{ t: "What's the Buzz About?", dark: true },
	{ t: "Is $Tsla a good buy?", dark: false },
	{ t: "Bullish on tech stocks!", dark: true },
	{ t: "STAKed Apple today!", dark: false },
	{ t: "Up 12% this month!", dark: false },
];
const CHAT_BUBBLES_R3 = [
	{ t: "Bullish! on S&P 500", dark: false },
	{ t: "My portfolio is growing!", dark: true },
	{ t: "Gold, Google", dark: false },
	{ t: "Big gains incoming!", dark: false },
	{ t: "This app is different!", dark: false },
];

function ChatBubble({ text, dark }: { text: string; dark: boolean }) {
	return (
		<div style={{ background: dark ? "rgba(169,191,254,0.37)" : "#fff", width: 249.91, height: 70.682, borderRadius: 53.011, overflow: "hidden", position: "relative", flexShrink: 0 }}>
			<div style={{ position: "absolute", left: 15.15, top: 11.36, display: "flex", alignItems: "center", gap: 25.243 }}>
				<div style={{ width: 47.963, height: 47.963, borderRadius: 63.109, overflow: "hidden", flexShrink: 0 }}>
					<img src={A.emAvatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 63.109 }} />
				</div>
				<p style={{ fontFamily: SR, fontWeight: 400, fontSize: 10.351, color: dark ? "#fff" : "#323232", whiteSpace: "nowrap", margin: 0 }}>{text}</p>
			</div>
		</div>
	);
}

function EarlyMomentum({ onSignup }: { onSignup: () => void }) {
	return (
		<section style={{ position: "absolute", left: 0, top: SEC.earlyMomentum, width: CANVAS_WIDTH, height: 990, background: SECTION_BG, overflow: "visible" }}>
			{/* Inner wrapper — Figma node 1:728 "Frame 190" at section x=96. */}
			<div style={{ position: "absolute", left: 96, top: 70, width: 1747.269, height: 615.698 }}>
				<div style={{ position: "absolute", left: "calc(50% - 269.63px)", top: 0, transform: "translateX(-50%)", width: 926, display: "flex", flexDirection: "column", gap: 77, alignItems: "center" }}>
					<Pill label="Early Momentum" />
					<Headline lines={["Real People.", "Real Momentum."]} />
				</div>

				{/* Stats column (50M / 30M) + bubble grid — Figma 1:734 "Frame 185" at x=0
			    within the wrapper, so the stats column left edge lands at canvas x=96. */}
				<div style={{ position: "absolute", left: 0, top: 350, display: "flex", gap: 85, alignItems: "center", justifyContent: "flex-start" }}>
					<div style={{ width: 252.275, display: "flex", flexDirection: "column", gap: 48 }}>
						<StatBlock value="50M+" label="Millennials & Gen Z investing today" />
						<StatBlock value="30M+" label="Investors seeking better tools" />
					</div>

					<div style={{ position: "relative" }}>
						{/* Three rows of chat bubbles — staggered horizontally per Figma:
						    R1 (STAK row, top):     Figma x=377.938 → marginLeft 8.13 from row baseline
						    R2 (Buzz row, middle):  Figma x=444.481 → marginLeft 74.68 (+66.54 vs R1)
						    R3 (Bullish row, bot):  Figma x=369.805 → marginLeft 0 (baseline)
						    Vertical: each row is 70.682 tall; the gap between rows is 26.178
						    (= 96.858 Figma-spec inter-row spacing − 70.682 bubble height). */}
						<div style={{ marginLeft: 32.53 }}>
							<div style={{ marginLeft: 8.13, display: "flex", gap: 13.309, alignItems: "center" }}>
								{CHAT_BUBBLES_R1.map((b, i) => <ChatBubble key={i} text={b.t} dark={b.dark} />)}
							</div>
							<div style={{ marginLeft: 74.68, marginTop: 26.178, display: "flex", gap: 13.309, alignItems: "center" }}>
								{CHAT_BUBBLES_R2.map((b, i) => <ChatBubble key={i} text={b.t} dark={b.dark} />)}
							</div>
							<div style={{ marginLeft: 0, marginTop: 26.178, display: "flex", gap: 13.309, alignItems: "center" }}>
								{CHAT_BUBBLES_R3.map((b, i) => <ChatBubble key={i} text={b.t} dark={b.dark} />)}
							</div>
						</div>
						{/* Figma node 1:813 — LEFT-side fade overlay (the dark gradient
						    that fades the leftmost bubble of each row into the dark navy
						    section background). Exact Figma spec:
						        width: 232.165, height: 264.698
						        bg-gradient-to-l from-[#0a1020] to-[rgba(42,67,134,0)]
						        wrapped in `-scale-y-100 rotate-180` (= horizontal flip)
						    Net CSS: `linear-gradient(to right, #0a1020, rgba(42,67,134,0))`
						    — solid dark navy on LEFT, fading linearly to fully transparent
						    on RIGHT. */}
						<div
							style={{
								position: "absolute",
								left: 0,
								top: 0,
								width: 232.165,
								height: 264.698,
								background: "linear-gradient(to right, #0a1020, rgba(42,67,134,0))",
								pointerEvents: "none",
								zIndex: 2,
							}}
						/>
						{/* Radial blue glow — the soft ambient backlight visible in the
						    Figma reference. An elliptical blue-purple glow centered on
						    the left side of the bubble grid creates a luminous halo
						    behind the leftmost bubbles, making them appear to be
						    catching light from a soft source.
						    Properties:
						      - radial-gradient ellipse 450px wide × 240px tall
						      - center at (220px, 130px) — to the left of the bubble grid,
						        vertical middle of the row stack
						      - color rgba(90,130,210, …) — desaturated blue matching the
						        section / bubble palette
						      - three opacity stops: 0.22 at center → 0.08 mid → 0 outer
						      - mix-blend-mode: screen so the glow only brightens, never
						        darkens, the dark navy section background or any bubble
						      - zIndex 3, above the dark left fade (zIndex 2) and bubbles */}
						<div
							style={{
								position: "absolute",
								left: 0,
								top: 0,
								width: 700,
								height: 264.698,
								background:
									"radial-gradient(ellipse 450px 240px at 220px 130px, rgba(90,130,210,0.22) 0%, rgba(90,130,210,0.08) 45%, rgba(90,130,210,0) 80%)",
								mixBlendMode: "screen",
								pointerEvents: "none",
								zIndex: 3,
							}}
						/>
					</div>
				</div>
			</div>

			<div style={{ position: "absolute", left: "calc(50% - 0.5px)", top: 795.7, transform: "translateX(-50%)" }}>
				<CtaButton label="Join our Community" onClick={onSignup} />
			</div>
		</section>
	);
}

function StatBlock({ value, label }: { value: string; label: string }) {
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 23.9, alignItems: "center", justifyContent: "center", width: "100%" }}>
			<div style={{ display: "flex", alignItems: "center" }}>
				<div style={{ width: 30.002, height: 36.001, flexShrink: 0 }}>
					<img src={A.emStatArrow} alt="" style={{ width: "100%", height: "100%" }} />
				</div>
				<p style={{ fontFamily: SQ, fontSize: 80, color: "#fff", margin: 0, lineHeight: "43px", height: 43, whiteSpace: "nowrap" }}>{value}</p>
			</div>
			<p style={{ fontFamily: SR, fontWeight: 600, fontSize: 11.852, color: "#f5f1f1", textAlign: "center", margin: 0, whiteSpace: "nowrap" }}>{label}</p>
		</div>
	);
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  SECTION 6: FAQ                                                      */
/* ═══════════════════════════════════════════════════════════════════ */
const FAQS = [
	{
		q: "What is STAK",
		a: "STAK is a platform built to help people understand the stock market more clearly and act with more confidence. It combines investing, market insight, and a social experience in one place, making it easier to discover opportunities, follow ideas, and stay connected to what moves markets.",
	},
	{
		q: "How does STAK know what stocks to show me?",
		a: "STAK starts by learning about your interests, goals, and risk profile when you sign up. It uses that information to personalize the stocks and market ideas you see, so your experience feels more relevant from the start.",
	},
	{
		q: 'What is "STAKing" a stock?',
		a: "When you swipe right on a stock, you STAK it. That saves it to your personal list so you can track it, practice with it, or come back to it when you're ready to invest.",
	},
	{
		q: "Do I need investing experience to use STAK?",
		a: "Not at all. STAK is designed to make investing easier to understand, whether you’re just getting started or still building confidence. Everything is explained clearly, so you can learn as you go.",
	},
];

function FaqRow({ q, a, open, onToggle }: { q: string; a: string; open: boolean; onToggle: () => void }) {
	/* Netflix-style accordion row (user-directed redesign, modeled on netflix.com's
	   FAQ): solid card rows, ONLY the question bar lightens on hover, a drawn "+"
	   icon that rotates into an "x" when open, and the answer in its own panel
	   below with a thin seam. No focus ring, no divider hairlines. */
	const [hover, setHover] = useState(false);
	return (
		<div style={{ width: 586, display: "flex", flexDirection: "column" }}>
			<button
				type="button"
				aria-expanded={open}
				onClick={onToggle}
				onMouseEnter={() => setHover(true)}
				onMouseLeave={() => setHover(false)}
				style={{
					...btnReset,
					width: "100%",
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					gap: 16,
					padding: "18px 24px",
					background: hover ? "#2a3552" : "#1a2237",
					transition: "background-color 0.2s ease",
					cursor: "pointer",
					outline: "none",
					WebkitTapHighlightColor: "transparent",
					textAlign: "left",
				}}
			>
				<p style={{ fontFamily: SR, fontWeight: 500, fontSize: 20, lineHeight: "26px", color: "#fff", margin: 0, whiteSpace: "normal", wordBreak: "break-word", flex: 1 }}>{q}</p>
				<svg
					width={26}
					height={26}
					viewBox="0 0 24 24"
					aria-hidden="true"
					style={{ flexShrink: 0, transform: open ? "rotate(45deg)" : "rotate(0deg)", transition: "transform 0.25s ease" }}
				>
					<path d="M12 4.5v15M4.5 12h15" stroke="#fff" strokeWidth={2} strokeLinecap="round" fill="none" />
				</svg>
			</button>
			{open && a && (
				<div style={{ marginTop: 2, background: "#1a2237", padding: "20px 24px" }}>
					<p style={{ fontFamily: SR, fontWeight: 300, fontSize: 16, lineHeight: "25px", color: "rgba(255,255,255,0.85)", margin: 0, textAlign: "left", whiteSpace: "normal", wordBreak: "break-word" }}>
						{a}
					</p>
				</div>
			)}
		</div>
	);
}

function Faq({ onEmail }: { onEmail: () => void }) {
	/* Netflix-style accordion: AT MOST ONE FAQ open at a time. On initial
	   page load / refresh, NO FAQ is open — every row starts collapsed with
	   a plus icon. Clicking any closed row opens it AND automatically closes
	   the previously-open one. Clicking the currently-open row collapses it
	   (returning to the all-closed state). */
	const [openIdx, setOpenIdx] = useState<number | null>(null);
	const toggle = (i: number) => {
		setOpenIdx((prev) => (prev === i ? null : i));
	};
	return (
		<section style={{ position: "absolute", left: 0, top: SEC.faq, width: CANVAS_WIDTH, height: 1219, background: SECTION_BG, overflow: "hidden", display: "flex", flexDirection: "column", alignItems: "flex-start", padding: "70px 237px", boxSizing: "border-box", gap: 10 }}>
			<div style={{ width: 926, display: "flex", flexDirection: "column", gap: 125, alignItems: "center" }}>
				<div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 183, alignItems: "center" }}>
					<div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 77, alignItems: "center" }}>
						<Pill label="STAK FAQ" />
						<div style={{ display: "flex", flexDirection: "column", gap: 20, alignItems: "center", width: "100%" }}>
							<Headline lines={["We’re here to answer", "all your questions."]} />
							<Subhead lines={["If you are new to world of stocks and financial ", "discipline, STAK is built for you."]} />
						</div>
					</div>
					<div style={{ width: 586, display: "flex", flexDirection: "column", alignItems: "center" }}>
						{/* Netflix-style card stack: tight 8px gaps between solid rows. */}
						<div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 8 }}>
							{FAQS.map((f, i) => (
								<FaqRow key={i} q={f.q} a={f.a} open={openIdx === i} onToggle={() => toggle(i)} />
							))}
						</div>
					</div>
				</div>
				<div style={{ display: "flex", flexDirection: "column", gap: 30, alignItems: "center", justifyContent: "center" }}>
					<p style={{ fontFamily: SR, fontWeight: 300, fontSize: 18, lineHeight: "25px", color: "#fff", margin: 0, whiteSpace: "nowrap" }}>Have more questions?</p>
					<CtaButton label="Email Us" onClick={onEmail} fontSize={14.453} arrowSize={{ w: 13.775, h: 11.48 }} />
				</div>
			</div>
		</section>
	);
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  SECTION 7: FINAL CTA / STAK IT UP MARQUEE                           */
/* ═══════════════════════════════════════════════════════════════════ */
/* Each tile is 347×186 with rounded-12 corners. The image INSIDE each
   tile has a specific size and offset per Figma — we don't use object-fit
   (which would center+crop) because each cell shows a deliberate slice
   of the source image. Masked tiles use a mask-image shape from
   cta-mask.svg on top of the image. */
const TILE_W = 347;
const TILE_H = 186;
const TILE_BG = "#172037";

/* Per-image object-position map. Each photo's face/subject sits at a different
   vertical spot, so this lets us tune the crop INDIVIDUALLY without affecting
   the other tiles. Tweak any value here and ONLY that image's crop changes. */
/* TileFrame — a frame holder for ONE image. Frame is fixed at 347×186 with
   rounded corners. You control EXACTLY how the image sits inside the frame:
     - imgW / imgH:  the rendered dimensions of the image inside the frame
     - imgX / imgY:  the offset from frame top-left (negative = shift up/left)
   When you adjust ONE tile's framing, it only touches that tile. */
function TileFrame({
	src,
	imgW,
	imgH,
	imgX = 0,
	imgY = 0,
	bg = TILE_BG,
	scale = 1,
}: {
	src: string;
	imgW: number;
	imgH: number;
	imgX?: number;
	imgY?: number;
	bg?: string;
	/* Optional uniform scale factor. When >1, both the frame (TILE_W × TILE_H)
	   and the image (imgW/H/X/Y) are multiplied by `scale`, so the visible crop
	   stays identical but the whole tile renders larger. Used by Row 1 to make
	   its tiles fill the viewport edge-to-edge at wide breakpoints. */
	scale?: number;
}) {
	return (
		<div
			style={{
				width: TILE_W * scale,
				height: TILE_H * scale,
				borderRadius: 12,
				background: bg,
				overflow: "hidden",
				position: "relative",
				flexShrink: 0,
			}}
		>
			<img
				src={src}
				alt=""
				style={{
					position: "absolute",
					left: imgX * scale,
					top: imgY * scale,
					width: imgW * scale,
					height: imgH * scale,
					maxWidth: "none",   /* override Tailwind Preflight: img { max-width: 100% } */
					maxHeight: "none",  /* same — Preflight would otherwise clamp to frame */
					objectFit: "cover",
					display: "block",
					pointerEvents: "none",
				}}
			/>
		</div>
	);
}

/* Per-tile frame config — using the EXACT values from Figma's TSX export.
   Each tile has its own image dimensions + offset within the 347×186 frame.
   Tweak ONE entry here and only that tile is affected. */
const TILE_FRAMES: Record<string, { imgW: number; imgH: number; imgX: number; imgY: number }> = {
	// Row 1 Cell 0 — orange-shirt man w/ rico card (Figma: 360.967×541.45 centered at calc(50%+1.02, 50%+85.73))
	[A.ctaTile1]: { imgW: 360.967, imgH: 541.45, imgX: -5.96, imgY: -91.99 },
	// Row 1 Cell 2 — winking blonde tongue out (Figma: 352.735×528 at -3, -111)
	[A.ctaTile2]: { imgW: 352.735, imgH: 528, imgX: -3, imgY: -111 },
	// Row 1 Cell 3 — blue 3D arrows (Figma: 452.13×451 centered at calc(50%-0.43, 50%+69.5))
	[A.ctaTile3]: { imgW: 452.13, imgH: 451, imgX: -52.99, imgY: -63 },
	// Row 2 Cells 0 & 2 — THINK BIGGER sign (Figma hash 85ba8b96, dimensions 375.333×563
	//                     centered at calc(50%+0.17, 50%+25.5) → top-left -14, -163)
	[A.ctaTile4]: { imgW: 375.333, imgH: 563, imgX: -14, imgY: -163 },
	// Row 2 Cell 1 + Row 3 Cell 4 — green sweater airpods woman (Figma hash c5f4fee4,
	//                                dimensions 375.895×498.789 at -11.89, -35)
	[A.ctaTile5]: { imgW: 375.895, imgH: 498.789, imgX: -11.89, imgY: -35 },
	// Row 2 Cell 4 — finger w/ phone case (Figma: 503.93×939 at -44, -470)
	[A.ctaTile6]: { imgW: 503.93, imgH: 939, imgX: -44, imgY: -470 },
	// Row 3 Cell 0 — pink + man w/ red bg (Figma: 454×454 at -70, -24)
	[A.ctaTile7]: { imgW: 454, imgH: 454, imgX: -70, imgY: -24 },
	// Row 3 Cell 2 — hands w/ money (Figma: 414×414 centered at calc(50%+0.5, 50%-11))
	[A.ctaTile8]: { imgW: 414, imgH: 414, imgX: -33.5, imgY: -125 },
	// Row 3 Cell 3 — hooded girl on phone (Figma: 392×559.239 at -23, -130)
	[A.ctaTile9]: { imgW: 392, imgH: 559.239, imgX: -23, imgY: -130 },
};

/* Convenience: looks up the per-tile config and renders a TileFrame.
   You can also use <TileFrame> directly for full control. */
function ImageTile({ src, bg = TILE_BG, scale = 1 }: { src: string; bg?: string; scale?: number }) {
	const cfg = TILE_FRAMES[src] ?? { imgW: TILE_W, imgH: TILE_H, imgX: 0, imgY: 0 };
	return <TileFrame src={src} imgW={cfg.imgW} imgH={cfg.imgH} imgX={cfg.imgX} imgY={cfg.imgY} bg={bg} scale={scale} />;
}

function LetterTile({ text, scale = 1 }: { text: string; scale?: number }) {
	/* Figma node 1:939 / 1:955 / 1:964 — STAK / IT / UP letter cell.
	   - frame: 347×186, rounded-12, no background fill (transparent over section bg)
	   - text: font-family "Squarish_Sans_CT:RegularSC", font-size 80px, line-height 45px,
	           color white, centered horizontally, vertical baseline at top:calc(50%-22px)
	   The 45px line-height (much smaller than the 80px font-size) is what gives the
	   letters their tall, tight display feel.
	   When `scale` > 1 (e.g. Row 1), everything (frame, font, line-height,
	   vertical baseline) multiplies uniformly so the letter visually fills
	   the larger tile. */
	return (
		<div style={{ width: TILE_W * scale, height: TILE_H * scale, borderRadius: 12, overflow: "hidden", position: "relative", flexShrink: 0 }}>
			<p
				style={{
					position: "absolute",
					left: "50%",
					top: `calc(50% - ${22 * scale}px)`,
					transform: "translateX(-50%)",
					fontFamily: SQ,
					fontSize: 80 * scale,
					lineHeight: `${45 * scale}px`,
					color: "#fff",
					textAlign: "center",
					margin: 0,
					whiteSpace: "nowrap",
				}}
			>
				{text}
			</p>
		</div>
	);
}

function EmptyTile({ scale = 1 }: { scale?: number }) {
	/* Spacer tile from the Figma spec — same dimensions but transparent so it's
	   invisible against the section background, while still taking up its slot in
	   the marquee row so the row width matches Figma. */
	return <div style={{ width: TILE_W * scale, height: TILE_H * scale, flexShrink: 0 }} />;
}

function FinalCta() {
	/* Row 1 scale is responsive to viewport width so the row ALWAYS fits the
	   viewport exactly (no empty space on the right, no overflow that hides
	   tile-3). The math: with 4 tiles of width 347·scale and 3 × 20px gaps,
	   total row width = 4·347·scale + 60. For the row to equal viewport width:
	     scale = (vpW - 60) / 1388
	   We clamp [1.0, 1.34] so tiles never shrink below Figma size and never
	   exceed the natural 1920px-viewport size. Other rows (Row 2, Row 3)
	   stay at scale 1 (Figma exact). Row 2 and Row 3 top positions also
	   adapt because Row 1's height changes with scale. */
	const row2Top = 704; // 490 + Row-1 height (186) + 28 inter-row gap
	const row3Top = 918; // 704 + 186 + 28

	return (
		<section style={{ position: "absolute", left: 0, top: SEC.finalCta, width: CANVAS_WIDTH, height: 1430, background: SECTION_BG, overflow: "visible" }}>
			<div style={{ position: "absolute", left: "50%", top: 70, transform: "translateX(-50%)", width: 926, display: "flex", flexDirection: "column", alignItems: "center", gap: 77 }}>
				<Pill label="Our growing community" />
				<div style={{ display: "flex", flexDirection: "column", gap: 20, alignItems: "center", width: "100%" }}>
					<Headline lines={["Our community of fast rising ", "young investors"]} />
					<Subhead lines={["Join a generation that invests with confidence.", "Sign up free and start STAKing today."]} />
				</div>
			</div>

			{/* Marquee rows — EXACT contents and positions per Figma node 1:933
			    (Group 8246). Each row's tile sequence and section-relative x offset
			    matches Figma 1:1; the rows overflow the 1400-canvas on purpose so
			    they read as a continuous marquee on wider viewports. */}

			{/* Row 1 — Figma 1:934, tile sequence [tile-1, STAK, tile-2, tile-3]
			    at Figma-native 347×186 tiles, x=-20 relative to the section. */}
			<div style={{ position: "absolute", left: -20, top: 490, display: "flex", gap: 20, alignItems: "center" }}>
				<ImageTile src={A.ctaTile1} />
				<LetterTile text="STAK" />
				<ImageTile src={A.ctaTile2} />
				<ImageTile src={A.ctaTile3} />
			</div>

			{/* Row 2 — Figma 1:946 (x=-285.5, w=2182) — 6 cells:
			    [THINK_BIGGER, green-sweater, THINK_BIGGER, IT, finger-phone, EMPTY].
			    Cells 0 and 2 share the tile-4 image with the same standard crop.
			    Cell 5 is intentionally blank (Figma node 1:959 has no image child). */}
			<div style={{ position: "absolute", left: -285.5, top: row2Top, display: "flex", gap: 20, alignItems: "center" }}>
				<ImageTile src={A.ctaTile4} />
				<ImageTile src={A.ctaTile5} />
				<ImageTile src={A.ctaTile4} />
				<LetterTile text="IT" />
				<ImageTile src={A.ctaTile6} />
				<EmptyTile />
			</div>

			{/* Row 3 (Figma 1:960), 5 cells: [tile-7, UP, tile-8, tile-9, tile-5].
			    Cell 4 reuses ctaTile5 with the standard crop (matches Figma = Row 2 cell 1).
			    top tracks row2Top so the ~28px inter-row gap is preserved. */}
			<div style={{ position: "absolute", left: -179.5, top: row3Top, display: "flex", gap: 20, alignItems: "center" }}>
				<ImageTile src={A.ctaTile7} />
				<LetterTile text="UP" />
				<ImageTile src={A.ctaTile8} />
				<ImageTile src={A.ctaTile9} />
				<ImageTile src={A.ctaTile5} />
			</div>

		</section>
	);
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  SECTION 8: FOOTER                                                   */
/* ═══════════════════════════════════════════════════════════════════ */
function Footer({ onSubscribe, onScrollTo }: { onSubscribe: (email: string) => void; onScrollTo: (k: keyof typeof SEC) => void }) {
	const [email, setEmail] = useState("");
	return (
		<section style={{ position: "absolute", left: 0, top: SEC.footer, width: CANVAS_WIDTH, height: 683, background: SECTION_BG, overflow: "visible", display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
			<div style={{ width: "100%", height: 335, background: SECTION_BG, overflow: "visible", position: "relative" }}>
				<div
					style={{
						position: "absolute",
						left: 87,
						right: 87,
						top: "50%",
						transform: "translateY(-50%)",
						display: "flex",
						alignItems: "flex-start",
						justifyContent: "space-between",
					}}
				>
					<div style={{ display: "flex", gap: 58, alignItems: "flex-start" }}>
						<FooterBrandColumn />
						<FooterUsefulLinks onScrollTo={onScrollTo} />
						<FooterSocialLinks />
					</div>

					<FooterNewsletterCol email={email} setEmail={setEmail} onSubscribe={onSubscribe} />
				</div>
			</div>

			<FooterBottomBand />
		</section>
	);
}

/* Footer logo icon (Figma node 1:1020) — circular STAK mark, 26.478 × 26.479 at (0, 0).
   SVG inlined as JSX so each <path> maps 1-1 to a Figma vector node
   (nodes 1:1021 through 1:1029), individually styleable/animatable. */
function FooterLogoIcon() {
	return (
		<div
			style={{ position: "absolute", left: 0, top: 0, width: 26.478, height: 26.479 }}
			role="img"
			aria-label="STAK"
		>
			<svg
				width="100%"
				height="100%"
				viewBox="0 0 26.4782 26.4784"
				preserveAspectRatio="none"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
				style={{ display: "block" }}
			>
				<g data-node-id="1:1020">
					<path
						data-node-id="1:1021"
						d="M26.4782 13.2391C26.4782 16.0298 25.6152 18.6179 24.1412 20.7523L23.8336 20.7563L19.2379 23.7933L15.4575 26.2925C15.4575 26.2925 15.4567 26.2925 15.4558 26.2925C14.735 26.4144 13.9939 26.4774 13.2383 26.4774C11.8288 26.4774 10.4718 26.257 9.19795 25.8494L9.89058 25.4724L23.7731 17.9035L20.7717 17.6799V17.6815L5.4797 23.9676C5.4797 23.9676 5.47728 23.966 5.47728 23.9652C4.35034 23.1483 3.3566 22.1586 2.53642 21.0348H2.53561L17.9519 15.7594L18.6074 15.535L20.7257 14.81L17.3739 14.6922V14.6938L1.02684 18.3676C0.571543 17.2843 0.255904 16.1283 0.103331 14.9214L17.3408 11.7917L8.04599 12.2478L1.37358e-06 12.9461C0.155803 5.76951 6.02299 0 13.2375 0C20.452 0 26.4782 5.92773 26.4782 13.2391Z"
						fill="#ffffff"
					/>
					<path
						data-node-id="1:1022"
						d="M17.372 14.693V14.6946L1.02658 18.3677C0.571285 17.2843 0.255645 16.1283 0.103072 14.9215L17.347 11.7917L17.3728 14.6938L17.372 14.693Z"
						fill="#efefef"
					/>
					<path
						data-node-id="1:1023"
						d="M17.3728 14.6945L1.02733 18.3676V18.3668L17.3712 14.6929H17.3728V14.6945Z"
						fill="#ffffff"
					/>
					<path
						data-node-id="1:1024"
						d="M17.9508 15.7604L2.53534 21.0358L2.53453 21.0342L17.9508 15.7604Z"
						fill="#ffffff"
					/>
					<path
						data-node-id="1:1025"
						d="M20.7707 17.6814L5.4787 23.9676C5.4787 23.9676 5.47628 23.966 5.47628 23.9652L20.7658 17.679H20.7707V17.6806V17.6814Z"
						fill="#ffffff"
					/>
					<path
						data-node-id="1:1026"
						d="M23.7755 17.9044L9.88975 25.4733L23.7722 17.9044H23.7731H23.7755Z"
						fill="#ffffff"
					/>
					<path
						data-node-id="1:1027"
						d="M19.2376 23.7942L15.4572 26.2935C15.4572 26.2935 15.4564 26.2935 15.4556 26.2935L19.2376 23.7942Z"
						fill="#ffffff"
					/>
					<path
						data-node-id="1:1028"
						d="M20.7706 17.6806V17.6822L5.47862 23.9683C5.47862 23.9683 5.4762 23.9667 5.4762 23.9659C4.34926 23.149 3.35552 22.1593 2.53534 21.0356H2.53453L17.9508 15.7601L18.6063 15.5357L20.7254 14.8108L20.7706 17.6798V17.6806Z"
						fill="#efefef"
					/>
					<path
						data-node-id="1:1029"
						d="M23.8326 20.7565L19.2369 23.7942L15.4565 26.2935C15.4565 26.2935 15.4557 26.2935 15.4549 26.2935C14.734 26.4154 13.9929 26.4784 13.2373 26.4784C11.8278 26.4784 10.4708 26.258 9.19698 25.8503L9.88961 25.4733L23.7721 17.9044L23.7939 17.8923L23.8326 20.7565Z"
						fill="#efefef"
					/>
				</g>
			</svg>
		</div>
	);
}

/* Footer logo wordmark (Figma node 1:1030) — "STAK" letters as 4 inline paths.
   Each letter is an individually addressable Figma node: S=1:1031, T=1:1032, A=1:1033, K=1:1034.
   Positioned at (30.97, 5.76) inside the parent logo container, size 78.163 × 14.983. */
function FooterLogoWordmark() {
	return (
		<div style={{ position: "absolute", left: 30.97, top: 5.76, width: 78.163, height: 14.983 }} aria-hidden="true">
			<svg
				width="100%"
				height="100%"
				viewBox="0 0 78.163 14.983"
				preserveAspectRatio="none"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
				style={{ display: "block" }}
			>
				<g data-node-id="1:1030">
					<path
						data-node-id="1:1031"
						d="M0 2.92879C0 1.89388 0.276892 1.14716 0.830674 0.688633C1.38446 0.230108 2.33299 0.000844844 3.67708 0.000844844H11.9854C13.3295 0.000844844 14.278 0.230108 14.8318 0.688633C15.3856 1.14716 15.6625 1.89388 15.6625 2.92879V3.61012L12.3253 4.15502V2.58893H3.33641V5.92615H11.9854C13.3295 5.92615 14.278 6.15541 14.8318 6.61394C15.3856 7.07246 15.6625 7.81918 15.6625 8.85409V11.9185C15.6625 13.0171 15.3905 13.8026 14.8456 14.2749C14.3007 14.7471 13.3473 14.9828 11.9854 14.9828H3.67708C2.31523 14.9828 1.36185 14.7471 0.816949 14.2749C0.272047 13.8026 0 13.0171 0 11.9185V10.7608L3.33722 10.2159V12.2591H12.3261V8.37781H3.67708C2.31523 8.37781 1.36185 8.14209 0.816949 7.66984C0.272047 7.19759 0 6.41212 0 5.31344V2.92959V2.92879Z"
						fill="#ffffff"
					/>
					<path
						data-node-id="1:1032"
						d="M30.1824 14.982H26.8451V2.58808H20.1715V0H36.856V2.58808H30.1824V14.982Z"
						fill="#ffffff"
					/>
					<path
						data-node-id="1:1033"
						d="M47.9177 0L56.2261 14.982H52.6443L50.8328 11.7134H41.2715L39.46 14.982H36.1914L44.4998 0H47.9185H47.9177ZM42.6334 9.26172H49.4709L46.0521 3.09181L42.6334 9.26172Z"
						fill="#ffffff"
					/>
					<path
						data-node-id="1:1034"
						d="M61.3137 14.982V0H64.651V6.11501L71.9107 0H76.4055L67.9341 7.0143L78.1629 14.982H73.0691L64.6518 8.34871V14.982H61.3145H61.3137Z"
						fill="#ffffff"
					/>
				</g>
			</svg>
		</div>
	);
}

/* Footer logo (Figma node 1:1019) — icon + wordmark, 109.131 × 26.479 */
function FooterLogo() {
	return (
		<div style={{ position: "relative", width: 109.131, height: 26.479 }}>
			<FooterLogoIcon />
			<FooterLogoWordmark />
		</div>
	);
}

/* Footer tagline (Figma node 1:1035) — 4 lines, Sora Light 14/25, width 529 */
function FooterTagline() {
	return (
		<div style={{ fontFamily: SR, fontWeight: 300, fontSize: 14, color: "#fff", width: 529 }} data-node-id="1:1035">
			<p style={{ margin: 0, lineHeight: "25px" }}>{'You’ve heard the advice — "invest early, invest often."'}</p>
			<p style={{ margin: 0, lineHeight: "25px" }}>But nobody tells you how. Every platform you open</p>
			<p style={{ margin: 0, lineHeight: "25px" }}>hits you with charts, tickers, and jargon that feels</p>
			<p style={{ margin: 0, lineHeight: "25px" }}>designed to make you feel dumb</p>
		</div>
	);
}

/* Footer logo + tagline group (Figma node 1:1018) — width 530, gap 40 */
function FooterLogoTagline() {
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 40, alignItems: "flex-start", width: 530 }}>
			<FooterLogo />
			<FooterTagline />
		</div>
	);
}

/* Footer store buttons row (Figma node 1:1036) — Play + Apple, gap 15 */
function FooterStoreButtons() {
	return (
		<div style={{ display: "flex", gap: 15, alignItems: "center" }} data-node-id="1:1036">
			<FooterPlayStoreButton />
			<FooterAppleStoreButton />
		</div>
	);
}

/* Footer Apple Store button (Figma node 1:1046)
   ├── Apple icon (1:1047) — inline SVG with 2 paths:
   │     1:1048 apple body, 1:1049 stem/leaf (both black)
   └── Content (1:1050)
         ├── "Download on the" (1:1051)
         └── "App Store" (1:1052) */
function FooterAppleStoreButton() {
	return (
		<button
			type="button"
			aria-label="Download on the App Store"
			data-node-id="1:1046"
			style={{ background: "#fff", border: "1px solid #000", width: 120, height: 40, borderRadius: 6, overflow: "hidden", position: "relative", padding: 0, cursor: "pointer" }}
		>
			{/* Apple icon (1:1047) — inline SVG */}
			<div style={{ position: "absolute", left: 7, top: 7, width: 20, height: 24 }} data-node-id="1:1047" aria-hidden="true">
				<svg
					width="100%"
					height="100%"
					viewBox="0 0 20 24"
					preserveAspectRatio="none"
					fill="none"
					xmlns="http://www.w3.org/2000/svg"
					style={{ display: "block" }}
				>
					<g data-name="Apple">
						<path
							data-node-id="1:1048"
							d="M16.7045 12.7631C16.7166 11.8432 16.9669 10.9413 17.4321 10.1412C17.8972 9.34108 18.5621 8.66885 19.3648 8.18702C18.8548 7.47597 18.1821 6.89081 17.4 6.478C16.6178 6.0652 15.7479 5.83613 14.8592 5.80898C12.9635 5.61471 11.1258 6.91644 10.1598 6.91644C9.17506 6.91644 7.68776 5.82827 6.08616 5.86044C5.05021 5.89311 4.04059 6.18722 3.15568 6.7141C2.27077 7.24099 1.54075 7.98268 1.03674 8.86691C-1.14648 12.5573 0.482005 17.9809 2.57338 20.964C3.61975 22.4247 4.84264 24.0564 6.44279 23.9985C8.00863 23.9351 8.59344 23.0237 10.4835 23.0237C12.3561 23.0237 12.9048 23.9985 14.5374 23.9617C16.2176 23.9351 17.2762 22.4945 18.2859 21.02C19.0377 19.9792 19.6162 18.8288 20 17.6116C19.0238 17.2085 18.1908 16.5338 17.6048 15.6716C17.0187 14.8094 16.7056 13.7979 16.7045 12.7631Z"
							fill="#000000"
						/>
						<path
							data-node-id="1:1049"
							d="M13.6208 3.84713C14.5369 2.77343 14.9883 1.39335 14.879 0C13.4794 0.143519 12.1865 0.796596 11.258 1.82911C10.804 2.33351 10.4563 2.92033 10.2348 3.55601C10.0132 4.19168 9.92221 4.86375 9.96687 5.5338C10.6669 5.54084 11.3595 5.3927 11.9924 5.10054C12.6254 4.80838 13.1821 4.37982 13.6208 3.84713Z"
							fill="#000000"
						/>
					</g>
				</svg>
			</div>

			{/* Content (1:1050) — "Download on the" + "App Store" */}
			<div
				style={{ position: "absolute", left: 35, top: "50%", transform: "translateY(-50%)", width: 78, display: "flex", flexDirection: "column", alignItems: "flex-start", color: "#000" }}
				data-node-id="1:1050"
			>
				<p
					style={{ fontFamily: "'SF Compact Text', -apple-system, sans-serif", fontWeight: 500, fontSize: 9, lineHeight: "9px", margin: 0, textAlign: "left" }}
					data-node-id="1:1051"
				>
					Download on the
				</p>
				<p
					style={{ fontFamily: "'SF Compact Display', -apple-system, sans-serif", fontWeight: 500, fontSize: 18, lineHeight: "1", letterSpacing: -0.47, margin: 0, textAlign: "left" }}
					data-node-id="1:1052"
				>
					App Store
				</p>
			</div>
		</button>
	);
}

/* Footer Play Store button (Figma node 1:1037)
   ├── Playstore icon (1:1038) — inline SVG with 4 colored paths:
   │     1:1039 red (#EA4335), 1:1040 yellow (#FBBC04),
   │     1:1041 blue (#4285F4), 1:1042 green (#34A853)
   └── Content (1:1043)
         ├── "GET IT ON" label (1:1044)
         └── Google Play wordmark (1:1045) */
function FooterPlayStoreButton() {
	return (
		<button
			type="button"
			aria-label="Get it on Google Play"
			data-node-id="1:1037"
			style={{ background: "#fff", border: "1px solid #000", width: 120, height: 40, borderRadius: 6, overflow: "hidden", position: "relative", padding: 0, cursor: "pointer" }}
		>
			{/* Icon (1:1038) — inline SVG with 4 colored quadrants */}
			<div style={{ position: "absolute", left: 7, top: 7, width: 21, height: 24 }} data-node-id="1:1038" aria-hidden="true">
				<svg
					width="100%"
					height="100%"
					viewBox="0 0 21 24"
					preserveAspectRatio="none"
					fill="none"
					xmlns="http://www.w3.org/2000/svg"
					style={{ display: "block" }}
				>
					<g data-name="Playstore">
						<path
							data-node-id="1:1039"
							d="M9.80482 11.4617L0.0896003 22.0059C0.0905128 22.0078 0.0905127 22.0106 0.0914252 22.0125C0.389807 23.1574 1.41179 24 2.62539 24C3.11083 24 3.56616 23.8656 3.95671 23.6305L3.98773 23.6118L14.9229 17.1593L9.80482 11.4617Z"
							fill="#EA4335"
						/>
						<path
							data-node-id="1:1040"
							d="M19.6331 9.66619L19.624 9.65966L14.9028 6.86123L9.58391 11.7013L14.9219 17.1582L19.6176 14.3878C20.4406 13.9324 21 13.045 21 12.0223C21 11.0052 20.4489 10.1225 19.6331 9.66619Z"
							fill="#FBBC04"
						/>
						<path
							data-node-id="1:1041"
							d="M0.0894234 1.99332C0.0310244 2.21353 0 2.44495 0 2.68382V21.3164C0 21.5552 0.0310245 21.7866 0.0903359 22.0059L10.1386 11.7313L0.0894234 1.99332Z"
							fill="#4285F4"
						/>
						<path
							data-node-id="1:1042"
							d="M9.87657 11.9999L14.9044 6.85936L3.98192 0.383511C3.58499 0.139967 3.12145 1.42739e-07 2.62597 1.42739e-07C1.41237 1.42739e-07 0.38856 0.844472 0.0901781 1.99034C0.0901781 1.99128 0.0892662 1.99221 0.0892662 1.99314L9.87657 11.9999Z"
							fill="#34A853"
						/>
					</g>
				</svg>
			</div>

			{/* Content (1:1043) — "GET IT ON" + Google Play wordmark */}
			<div
				style={{ position: "absolute", left: 35, top: 4, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 3 }}
				data-node-id="1:1043"
			>
				<p
					style={{ fontFamily: "'Product Sans', Arial, sans-serif", fontSize: 10, color: "#000", margin: 0, textTransform: "uppercase", lineHeight: "normal", textAlign: "left" }}
					data-node-id="1:1044"
				>
					GET IT ON
				</p>
				<div style={{ width: 74, height: 15, transform: "scaleY(-1)" }} data-node-id="1:1045">
					<img src={A.footerPlayText} alt="Google Play" style={{ width: "100%", height: "100%" }} />
				</div>
			</div>
		</button>
	);
}

/* Footer brand column (Figma node 1:1017) — logo + tagline + store buttons */
function FooterBrandColumn() {
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 59, alignItems: "flex-start", justifyContent: "center" }} data-node-id="1:1017">
			<FooterLogoTagline />
			<FooterStoreButtons />
		</div>
	);
}

/* Footer newsletter block (Figma node 1:1070) — heading + pill input + Subscribe button
   ├── Heading "Subsribe to our  newsletter" (1:1071)
   └── Pill container (1:1072) — bg rgba(255,255,255,0.07), rounded 13, gap 14
         ├── Email input placeholder (1:1074)
         └── Subscribe button (1:1075)
               └── "Subscribe" label (1:1076) */
function FooterNewsletter({ email, setEmail, onSubscribe }: { email: string; setEmail: (v: string) => void; onSubscribe: (email: string) => void }) {
	return (
		<div
			style={{ display: "flex", flexDirection: "column", gap: 48, alignItems: "flex-start" }}
			data-node-id="1:1070"
		>
			<p
				style={{ fontFamily: SR, fontWeight: 400, fontSize: 18, lineHeight: "25px", color: "#fff", margin: 0, whiteSpace: "pre" }}
				data-node-id="1:1071"
			>
				{"Subscribe to our newsletter"}
			</p>
			<div
				style={{ background: "rgba(255,255,255,0.07)", padding: "8px 9px 8px 11px", borderRadius: 13, display: "flex", flexDirection: "column", alignItems: "flex-end", justifyContent: "center" }}
				data-node-id="1:1072"
			>
				<div
					style={{ display: "flex", gap: 14, alignItems: "center", justifyContent: "center" }}
					data-node-id="1:1073"
				>
					<input
						type="email"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						placeholder="Your email address"
						style={{ fontFamily: SR, fontWeight: 300, fontSize: 12, lineHeight: "25px", color: "rgba(255,255,255,0.53)", background: "transparent", border: 0, outline: "none", textAlign: "left", width: 114 }}
						data-node-id="1:1074"
					/>
					{/* Subscribe button (1:1075) — inlined (instead of <CtaButton>) so the
					    button and its label can each carry their own data-node-id. */}
					<button
						type="button"
						onClick={() => onSubscribe(email)}
						data-node-id="1:1075"
						style={{
							background: CTA_GRADIENT,
							border: CTA_BORDER,
							borderRadius: 5.781,
							padding: "7.226px 14.453px",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							filter: CTA_SHADOW,
							cursor: "pointer",
						}}
					>
						<span
							style={{ fontFamily: SR, fontWeight: 400, fontSize: 14.453, lineHeight: "normal", color: "#fff", whiteSpace: "nowrap" }}
							data-node-id="1:1076"
						>
							Subscribe
						</span>
					</button>
				</div>
			</div>
		</div>
	);
}

/* Footer bottom band (Figma node 1:1079) — 348px tall dark band with the giant
   STAK watermark and a hairline divider at the top.
   ├── Background fill #0a1020 (1:1080 — paint layer, applied to container)
   ├── STAK watermark text (1:1121) — 450px font, gradient fill via SVG textLength
   └── Divider line (1:1122) — 1402px wide hairline at top */
function FooterBottomBand() {
	return (
		<div
			style={{ width: "100%", height: 348, background: SECTION_BG, overflow: "visible", position: "relative" }}
			data-node-id="1:1079"
		>
			{/* Hairline divider at top (1:1122) — spans full viewport width */}
			<div
				style={{ position: "absolute", left: 0, top: 5.5, width: "100%", height: 0.5, background: "rgba(255,255,255,0.47)" }}
				data-node-id="1:1122"
				aria-hidden="true"
			/>

			{/* STAK watermark (1:1121) — fills the entire viewport width edge-to-edge.
			    SVG width = 100vw (responsive to viewport), positioned so its left edge
			    sits at viewport left (offset by canvas centering math).
			    preserveAspectRatio="none" lets content stretch horizontally to fill SVG
			    width regardless of viewport size, while keeping the 348px band height.
			    text textLength = 1900 (close to viewBox width) so STAK spans full width. */}
			<svg
				height={348}
				viewBox="0 0 1400 348"
				preserveAspectRatio="none"
				style={{ position: "absolute", left: 0, top: 0, width: "100%", height: 348, overflow: "hidden", pointerEvents: "none" }}
				aria-hidden="true"
			>
				<defs>
					<linearGradient
						id="stakWatermarkGradient"
						gradientUnits="userSpaceOnUse"
						x1={0}
						y1={0}
						x2={0}
						y2={348}
					>
						<stop offset="0%" stopColor="#e6eef8" stopOpacity="1" />
						<stop offset="15%" stopColor="#bccad8" stopOpacity="1" />
						<stop offset="30%" stopColor="#7e92ad" stopOpacity="0.9" />
						<stop offset="46%" stopColor="#384a66" stopOpacity="0.55" />
						<stop offset="64%" stopColor="#1a263e" stopOpacity="0.25" />
						<stop offset="80%" stopColor="#0e1626" stopOpacity="0.07" />
						<stop offset="100%" stopColor="#0a1020" stopOpacity="0" />
					</linearGradient>
				</defs>
				<text
					data-node-id="1:1121"
					x={700.5}
					y={284}
					textAnchor="middle"
					fontFamily="'Squarish Sans CT', 'Orbitron', 'Chakra Petch', sans-serif"
					fontWeight={400}
					fontSize={450}
					fill="url(#stakWatermarkGradient)"
					lengthAdjust="spacingAndGlyphs"
					textLength={1368}
				>
					STAK
				</text>
			</svg>
		</div>
	);
}

/* Footer copyright (Figma node 1:1077) — wrapper containing the copyright text
   └── "2026 All right reserved" (1:1078) — Sora Light 12/25, white */
function FooterCopyright() {
	return (
		<div
			style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}
			data-node-id="1:1077"
		>
			<p
				style={{ fontFamily: SR, fontWeight: 300, fontSize: 12, lineHeight: "9px", height: 9, color: "#fff", margin: 0, whiteSpace: "nowrap", textAlign: "center" }}
				data-node-id="1:1078"
			>
				© 2026 All rights reserved
			</p>
		</div>
	);
}

/* Footer newsletter + copyright column (Figma node 1:1069) — gap 135 */
function FooterNewsletterCol({ email, setEmail, onSubscribe }: { email: string; setEmail: (v: string) => void; onSubscribe: (email: string) => void }) {
	return (
		<div
			style={{ display: "flex", flexDirection: "column", gap: 135, alignItems: "flex-start", justifyContent: "center" }}
			data-node-id="1:1069"
		>
			<FooterNewsletter email={email} setEmail={setEmail} onSubscribe={onSubscribe} />
			<FooterCopyright />
		</div>
	);
}

/* Footer "Social Links" column (Figma node 1:1061) — 135 wide, gap 49
   ├── Heading "Social Links" (1:1062)
   └── Items wrapper (1:1063)
         ├── Facebook (1:1064)
         ├── Instagram (1:1065)
         ├── X (1:1066)
         ├── Tiktok (1:1067)
         └── Discord (1:1068) */
function FooterSocialLinks() {
	return (
		<div
			style={{ display: "flex", flexDirection: "column", gap: 49, alignItems: "flex-start", width: 135, color: "#fff" }}
			data-node-id="1:1061"
		>
			<p
				style={{ fontFamily: SR, fontWeight: 400, fontSize: 18, lineHeight: "25px", margin: 0, textAlign: "center", whiteSpace: "nowrap" }}
				data-node-id="1:1062"
			>
				Social Links
			</p>
			<div
				style={{ display: "flex", flexDirection: "column", gap: 18, alignItems: "flex-start", justifyContent: "center", width: "100%", fontFamily: SR, fontWeight: 300, fontSize: 16, lineHeight: "25px" }}
				data-node-id="1:1063"
			>
				<a href="#" style={{ color: "#fff", textDecoration: "none", whiteSpace: "nowrap" }} data-node-id="1:1064">Facebook</a>
				<a href="#" style={{ color: "#fff", textDecoration: "none", whiteSpace: "nowrap" }} data-node-id="1:1065">Instagram</a>
				<a href="#" style={{ color: "#fff", textDecoration: "none", whiteSpace: "nowrap" }} data-node-id="1:1066">X</a>
				<a href="#" style={{ color: "#fff", textDecoration: "none", whiteSpace: "nowrap" }} data-node-id="1:1067">Tiktok</a>
				<a href="#" style={{ color: "#fff", textDecoration: "none", whiteSpace: "nowrap" }} data-node-id="1:1068">Discord</a>
			</div>
		</div>
	);
}

/* Footer "Useful Links" column (Figma node 1:1053) — 135 wide, gap 49
   ├── Heading "Useful Links" (1:1054)
   └── Items wrapper (1:1055)
         ├── Home (1:1056)
         ├── How it works (1:1057)
         ├── Features (1:1058)
         ├── Blog (1:1059)
         └── Privacy terms (1:1060) */
function FooterUsefulLinks({ onScrollTo }: { onScrollTo: (k: keyof typeof SEC) => void }) {
	const linkStyle: CSSProperties = { ...btnReset, margin: 0, whiteSpace: "nowrap", fontFamily: SR, fontWeight: 300, fontSize: 16, lineHeight: "25px", color: "#fff" };
	return (
		<div
			style={{ display: "flex", flexDirection: "column", gap: 49, alignItems: "flex-start", width: 135, color: "#fff" }}
			data-node-id="1:1053"
		>
			<p style={{ fontFamily: SR, fontWeight: 400, fontSize: 18, lineHeight: "25px", margin: 0, whiteSpace: "nowrap" }} data-node-id="1:1054">Useful Links</p>
			<div
				style={{ display: "flex", flexDirection: "column", gap: 18, alignItems: "flex-start", justifyContent: "center", width: "100%" }}
				data-node-id="1:1055"
			>
				<button type="button" onClick={() => onScrollTo("hero")} style={linkStyle}>Home</button>
				<button type="button" onClick={() => onScrollTo("howItWorks")} style={linkStyle}>How it works</button>
				<button type="button" onClick={() => onScrollTo("features")} style={linkStyle}>Features</button>
				<button type="button" onClick={() => onScrollTo("faq")} style={linkStyle}>FAQ</button>
				<p style={{ margin: 0, whiteSpace: "nowrap", fontFamily: SR, fontWeight: 300, fontSize: 16, lineHeight: "25px" }} data-node-id="1:1060">Privacy terms</p>
			</div>
		</div>
	);
}


/* === MOBILE LAYOUT (Figma node 1:1123 / Frame 220, 810px wide) === */
const MOBILE_WIDTH = 810;
const MOBILE390_WIDTH = 390;

function MobileNavBar({ width = 650, left = 80.367, padX = 16.4, onScrollTo, onSignup }: { width?: number; left?: number; padX?: number; onScrollTo?: (k: keyof typeof SEC) => void; onSignup?: () => void } = {}) {
	/* Desktop-parity nav: the hamburger opens a real menu (Home / Features /
	   How It Works / FAQ wired to onScrollTo) and the bar carries the same
	   "Get started" CTA the desktop NavBar has. */
	const [menuOpen, setMenuOpen] = useState(false);
	const go = (k: keyof typeof SEC) => {
		setMenuOpen(false);
		if (onScrollTo) onScrollTo(k);
	};
	return (
		<div style={{ position: "absolute", left, top: 26, width, zIndex: 20 }}>
			<div style={{ width: "100%", height: 45.899, background: "#1a1d31", borderRadius: 10.752, display: "flex", alignItems: "center", justifyContent: "space-between", padding: `12px ${padX}px`, boxSizing: "border-box" }}>
				<div style={{ position: "relative", width: 90.259, height: 21.899, overflow: "hidden", flexShrink: 0 }}>
					<div style={{ position: "absolute", inset: 0, width: "24.26%" }}>
						<img src={A.logo1} alt="STAK" style={{ width: "100%", height: "100%", display: "block" }} />
					</div>
					<div style={{ position: "absolute", left: "28.38%", top: "21.77%", right: 0, bottom: "21.64%" }}>
						<img src={A.logo2} alt="" style={{ width: "100%", height: "100%", display: "block" }} />
					</div>
				</div>
				<div style={{ display: "flex", alignItems: "center", gap: 12 }}>
					{onSignup && (
						<CtaButton label="Get started" withArrow={false} fontSize={12} onClick={onSignup} style={{ padding: "5px 10px", borderRadius: 5 }} />
					)}
					<button type="button" aria-label="Menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((o) => !o)} style={{ ...btnReset, width: 31.922, height: 14.188, flexShrink: 0, cursor: "pointer" }}>
						<img src={A.navMenu} alt="" style={{ width: "100%", height: "100%", display: "block" }} />
					</button>
				</div>
			</div>
			{menuOpen && (
				<div style={{ marginTop: 8, background: "#1a1d31", borderRadius: 10.752, padding: "8px 0", display: "flex", flexDirection: "column", boxShadow: "0 12px 32px rgba(0,0,0,0.45)" }}>
					{([["Home", "hero"], ["Features", "features"], ["How It Works", "howItWorks"], ["FAQ", "faq"]] as [string, keyof typeof SEC][]).map(([label, k]) => (
						<button key={k} type="button" onClick={() => go(k)} style={{ ...btnReset, textAlign: "left", padding: "10px 18px", fontFamily: SR, fontWeight: 400, fontSize: 15, color: "#fff", cursor: "pointer" }}>
							{label}
						</button>
					))}
				</div>
			)}
		</div>
	);
}

function MobileHero({ onSignup, onScrollTo }: { onSignup: () => void; onScrollTo: (k: keyof typeof SEC) => void }) {
	return (
		<section style={{ position: "absolute", left: 0, top: 0, width: MOBILE_WIDTH, height: 924, background: SECTION_BG, overflow: "hidden" }}>
			<div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(46% 20% at 50% 55%, rgba(70,118,162,0.12) 0%, rgba(45,86,130,0.045) 46%, rgba(10,16,32,0) 72%)" }} />
			<div style={{ position: "absolute", left: -80, top: 206, width: 470, height: 231, overflow: "visible", pointerEvents: "none" }}>
				<img src={A.ellipse108} alt="" style={{ position: "absolute", top: "-199.08%", left: "-97.85%", width: "295.7%", height: "498.16%", maxWidth: "none" }} />
			</div>
			<div style={{ position: "absolute", left: 531, top: 301, width: 359, height: 217, overflow: "visible", pointerEvents: "none" }}>
				<img src={A.ellipse109} alt="" style={{ position: "absolute", top: "-179.01%", left: "-108.2%", width: "316.4%", height: "458.02%", maxWidth: "none" }} />
			</div>

			<MobileNavBar onScrollTo={onScrollTo} />

			<div style={{ position: "absolute", left: "50%", top: 110, transform: "translateX(-50%)", width: 601, display: "flex", flexDirection: "column", alignItems: "center", gap: 30 }}>
				<div style={{ background: "rgba(36,43,61,0.79)", display: "flex", alignItems: "center", justifyContent: "center", gap: 6.266, padding: "4.699px 7.832px", borderRadius: 28.196 }}>
					<div style={{ width: 9.399, height: 9.399, flexShrink: 0 }}>
						<img src={A.pillDot} alt="" style={{ width: "100%", height: "100%" }} />
					</div>
					<p style={{ fontFamily: SR, fontWeight: 300, fontSize: 12, lineHeight: "10px", color: "#fff", margin: 0, whiteSpace: "nowrap" }}>Get early access</p>
					<div style={{ width: 10.338, height: 8.615, flexShrink: 0 }}>
						<img src={A.pillArrow} alt="" style={{ width: "100%", height: "100%" }} />
					</div>
				</div>
				<div style={{ display: "flex", flexDirection: "column", gap: 15, alignItems: "center", width: "100%" }}>
					<div style={{ fontFamily: SQ, fontSize: 32, color: "#fff", textAlign: "center", width: "100%" }}>
						<p style={{ margin: 0, lineHeight: "37px" }}>The Stock Market</p>
						<p style={{ margin: 0, lineHeight: "37px" }}>Finally Speaks Your Language.</p>
					</div>
					<div style={{ fontFamily: SR, fontWeight: 300, fontSize: 16, color: "rgba(255,255,255,0.8)", textAlign: "center" }}>
						<p style={{ margin: 0, lineHeight: "25px", whiteSpace: "pre" }}>{`STAK matches you with stocks you'll actually understand —through swipes, `}</p>
						<p style={{ margin: 0, lineHeight: "25px", whiteSpace: "pre" }}>smart insights, and zero pressure. Before you buy anything, STAK it.</p>
					</div>
				</div>
			</div>

			{/* Tablet Frame 124 (1:1135) is the tight-beam mobile composition (208x299 beam, no
			    desktop flare) — rendered from a flattened 2x export of the node, alpha
			    un-premultiplied vs the baked page bg. left 111 = frame x (verified by edge
			    correlation); top 284 = frame y 295.77 minus 11.8px effect spill in the render. */}
			<div style={{ position: "absolute", left: 111, top: 284, width: 587.309, height: 563.5, pointerEvents: "none" }}>
				<img src={A.boxT810} alt="" style={{ width: "100%", height: "100%", display: "block" }} />
			</div>

			<div style={{ position: "absolute", left: "50%", bottom: 39.55, transform: "translateX(-50%)" }}>
				<CtaButton label="Get started" onClick={onSignup} withArrow={false} fontSize={14.453} style={{ filter: "drop-shadow(0px 12.285px 6.142px rgba(82,170,199,0.09)) drop-shadow(0px 2.891px 3.252px rgba(82,170,199,0.10))" }} />
			</div>
		</section>
	);
}

/* Mobile partner-logos strip — Figma node 1:1170 (Frame 219), 810×115 */
function MobileProofStrip() {
	return (
		<section style={{ position: "absolute", left: 0, top: 924, width: MOBILE_WIDTH, height: 115, background: SECTION_BG, overflow: "hidden" }}>
			<div style={{ position: "absolute", left: "calc(50% + 5.5px)", top: 47, transform: "translateX(-50%)", display: "flex", alignItems: "center", gap: 50 }}>
				<div style={{ width: 150, height: 21, position: "relative", flexShrink: 0 }} aria-label="Block Wallet">
					<div style={{ position: "absolute", inset: "0 85.94% 0 0" }}><img src={A.proofBwIcon} alt="Block Wallet" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} /></div>
					<div style={{ position: "absolute", inset: "9.07% 0 11.2% 18.72%" }}><img src={A.proofBwWord} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} /></div>
				</div>
				<div style={{ width: 100, height: 21.834, position: "relative", overflow: "hidden", flexShrink: 0 }}><img src={A.proofAmplitude} alt="Amplitude" style={{ width: "100%", height: "100%", objectFit: "contain" }} /></div>
				<div style={{ width: 135, height: 21.344, position: "relative", overflow: "hidden", flexShrink: 0 }}><img src={A.proofBetterStack} alt="Better Stack" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "left top" }} /></div>
				<div style={{ width: 81.9, height: 21, position: "relative", flexShrink: 0 }} aria-label="Brex">
					<div style={{ position: "absolute", inset: "0 1.42% 0 1.12%" }}><img src={A.proofBrexMain} alt="Brex" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} /></div>
					<div style={{ position: "absolute", inset: "20.67% 16.9% 15.5% 68.18%" }}><img src={A.proofBrexDetail} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} /></div>
				</div>
				<div style={{ width: 56.1, height: 19.513, position: "relative", overflow: "hidden", flexShrink: 0 }}><img src={A.proofDeel} alt="Deel" style={{ width: "100%", height: "100%", objectFit: "contain" }} /></div>
				<div style={{ width: 69, height: 21.923, position: "relative", overflow: "hidden", flexShrink: 0 }}><div style={{ position: "absolute", inset: "1.52% 3.8% 4.37% 0.15%" }}><img src={A.proofSpotify} alt="Spotify" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} /></div></div>
			</div>
			<div style={{ position: "absolute", left: 0, top: 0, width: 64, height: 115, background: "linear-gradient(to right, rgba(10,16,32,0.99) 41.41%, rgba(10,16,32,0.12) 74.22%)", pointerEvents: "none" }} />
			<div style={{ position: "absolute", right: 0, top: 0, width: 64, height: 115, background: "linear-gradient(to left, rgb(10,16,32) 27.344%, rgba(10,16,32,0.79) 133.59%)", pointerEvents: "none" }} />
		</section>
	);
}

/* Mobile Problem — Figma node 1:1180 (Frame 221), 810×1041 */
function MobileProblem({ onSignup }: { onSignup: () => void }) {
	return (
		<section style={{ position: "absolute", left: 0, top: 1039, width: MOBILE_WIDTH, height: 1041, background: SECTION_BG, overflow: "hidden" }}>
			<div style={{ position: "absolute", left: 231, top: 201, width: 359, height: 148, overflow: "visible", pointerEvents: "none" }}><img src={A.ellipse109} alt="" style={{ position: "absolute", top: "-262.47%", left: "-108.2%", width: "316.4%", height: "624.94%", maxWidth: "none" }} /></div>
			<div style={{ position: "absolute", left: 226, top: 512, width: 359, height: 217, overflow: "visible", pointerEvents: "none" }}><img src={A.ellipse109} alt="" style={{ position: "absolute", top: "-179.01%", left: "-108.2%", width: "316.4%", height: "458.02%", maxWidth: "none" }} /></div>
			<div style={{ position: "absolute", left: "50%", top: 110, transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 60 }}>
				<div style={{ background: "rgba(36,43,61,0.79)", display: "flex", alignItems: "center", justifyContent: "center", gap: 6.266, padding: "4.699px 7.832px", borderRadius: 28.196 }}>
					<div style={{ width: 9.399, height: 9.399, flexShrink: 0 }}><img src={A.pillDot} alt="" style={{ width: "100%", height: "100%" }} /></div>
					<p style={{ fontFamily: SR, fontWeight: 300, fontSize: 12, lineHeight: "10px", color: "#fff", margin: 0, whiteSpace: "nowrap" }}>The problem</p>
					<div style={{ width: 10.338, height: 8.615, flexShrink: 0 }}><img src={A.pillArrow} alt="" style={{ width: "100%", height: "100%" }} /></div>
				</div>
				<div style={{ display: "flex", flexDirection: "column", gap: 15, alignItems: "center", width: "100%" }}>
					<div style={{ fontFamily: SQ, fontSize: 32, color: "#fff", textAlign: "center", width: "100%" }}>
						<p style={{ margin: 0, lineHeight: "45px" }}>The Market Isn't Hard.</p>
						<p style={{ margin: 0, lineHeight: "45px" }}>It's Just Been Made That Way.</p>
					</div>
					<div style={{ fontFamily: SR, fontWeight: 300, fontSize: 16, color: "rgba(255,255,255,0.8)", textAlign: "center", width: 601 }}>
						<p style={{ margin: 0, lineHeight: "25px" }}>{`You've heard the advice — "invest early, invest often."`}</p>
						<p style={{ margin: 0, lineHeight: "25px" }}>But nobody tells you how. Here’s how:</p>
					</div>
				</div>
			</div>
			{/* Phone — centered 611px window onto the 1238px mockup frame (Figma 1:1191) */}
			<div style={{ position: "absolute", left: "calc(50% + 0.5px)", top: 642, transform: "translate(-50%, -50%)", width: 611, height: 598, overflow: "hidden" }}>
				<div style={{ position: "absolute", left: "calc(50% + 0.5px)", top: "calc(50% - 10px)", transform: "translate(-50%, -50%)", width: 1238, height: 746 }}>
					<div style={{ position: "absolute", left: "calc(50% + 1.46px)", top: 128.09, transform: "translateX(-50%)", width: 621.781, height: 639.024 }}>
						{/* mask rows sit entirely under the fade's solid zone (container y 574-590 < clip 598):
						    visually invisible, but zeroes the photo at the clip row so no per-layer rounding
						    hairline can leak — same treatment as the 390 mockup */}
						<img src={A.problemScreenshot} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", maskImage: "linear-gradient(to bottom, black 83%, transparent 85.5%)", WebkitMaskImage: "linear-gradient(to bottom, black 83%, transparent 85.5%)" }} />
					</div>
					<div style={{ position: "absolute", bottom: 31, left: -84, width: 1400, height: 214, background: "linear-gradient(to top, #0a1020 30.374%, rgba(10,16,32,0) 96.262%)", filter: "blur(12.798px)", pointerEvents: "none" }} />
				</div>
			</div>
			<div style={{ position: "absolute", left: "calc(50% + 0.45px)", bottom: 44.55, transform: "translateX(-50%)" }}>
				<CtaButton label="Get started" onClick={onSignup} withArrow={false} fontSize={14.453} />
			</div>
		</section>
	);
}

/* Mobile How It Works — Figma node 1:1199 (Frame 220), 810×1218 */
function MobileHowItWorks({ onSignup }: { onSignup: () => void }) {
	const cardBg: CSSProperties = { background: "#10172a", height: 297.889, borderRadius: 9.142, overflow: "hidden", position: "relative", flexShrink: 0 };
	const numS: CSSProperties = { fontFamily: SQ, fontSize: 22.856, color: "#fff", margin: 0, lineHeight: "normal", whiteSpace: "nowrap" };
	const titleS: CSSProperties = { fontFamily: SR, fontWeight: 400, fontSize: 16, color: "#fff", margin: 0, lineHeight: "normal" };
	const bodyS: CSSProperties = { fontFamily: SR, fontWeight: 300, fontSize: 12, color: "rgba(255,255,255,0.62)", lineHeight: "normal", margin: 0 };
	return (
		<section style={{ position: "absolute", left: 0, top: 2080, width: MOBILE_WIDTH, height: 1218, background: SECTION_BG, overflow: "hidden" }}>
			<div style={{ position: "absolute", left: 231, top: 201, width: 359, height: 148, overflow: "visible", pointerEvents: "none" }}><img src={A.ellipse109} alt="" style={{ position: "absolute", top: "-262.47%", left: "-108.2%", width: "316.4%", height: "624.94%", maxWidth: "none" }} /></div>
			<div style={{ position: "absolute", left: "50%", top: 110, transform: "translateX(-50%)", width: 601, display: "flex", flexDirection: "column", alignItems: "center", gap: 60 }}>
				<div style={{ background: "rgba(36,43,61,0.79)", display: "flex", alignItems: "center", justifyContent: "center", gap: 6.266, padding: "4.699px 7.832px", borderRadius: 28.196 }}>
					<div style={{ width: 9.399, height: 9.399, flexShrink: 0 }}><img src={A.pillDot} alt="" style={{ width: "100%", height: "100%" }} /></div>
					<p style={{ fontFamily: SR, fontWeight: 300, fontSize: 12, lineHeight: "10px", color: "#fff", margin: 0, whiteSpace: "nowrap" }}>How it works</p>
					<div style={{ width: 10.338, height: 8.615, flexShrink: 0 }}><img src={A.pillArrow} alt="" style={{ width: "100%", height: "100%" }} /></div>
				</div>
				<div style={{ fontFamily: SQ, fontSize: 32, color: "#fff", textAlign: "center", width: "100%" }}>
					<p style={{ margin: 0, lineHeight: "45px", whiteSpace: "pre" }}>{"Three Swipes to Smarter "}</p>
					<p style={{ margin: 0, lineHeight: "45px" }}>Investing.</p>
				</div>
			</div>
			<div style={{ position: "absolute", left: "calc(50% + 0.5px)", top: 387, transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 83.805 }}>
				<div style={{ display: "flex", flexDirection: "column", gap: 12.952 }}>
					<div style={{ display: "flex", gap: 12.952 }}>
						<div style={{ ...cardBg, width: 296.366 }}>
							<div style={{ position: "absolute", bottom: 28.19, left: "calc(50% + 0.38px)", transform: "translateX(-50%)", display: "flex", flexDirection: "column", gap: 10.666, alignItems: "flex-start", width: 251.415 }}>
								<p style={numS}>01/</p>
								<div style={{ display: "flex", flexDirection: "column", gap: 6.095, alignItems: "flex-start" }}>
									<p style={titleS}>Tell Us Who You Are</p>
									<div style={{ ...bodyS, width: 251.415, height: 41.141 }}>
										<p style={{ margin: 0 }}>Take a quick risk quiz. STAK learns your personality, your goals, and your vibe. </p>
										<p style={{ margin: 0 }}>No spreadsheets. No jargon.</p>
									</div>
								</div>
							</div>
						</div>
						<div style={{ ...cardBg, width: 296.366 }}>
							<div style={{ position: "absolute", bottom: 24.38, left: "calc(50% + 0.38px)", transform: "translateX(-50%)", display: "flex", flexDirection: "column", gap: 10.666, alignItems: "flex-start", width: 251.415 }}>
								<p style={numS}>02/</p>
								<div style={{ display: "flex", flexDirection: "column", gap: 6.095, alignItems: "flex-start", width: "100%" }}>
									<p style={titleS}>Swipe Through Stocks</p>
									<div style={{ ...bodyS, width: 251.415, height: 41.141 }}>
										<p style={{ margin: 0 }}>Like a stock? Swipe right. Not feeling it? Swipe left. Want to know more? Swipe up. </p>
										<p style={{ margin: 0 }}>It's that simple.</p>
									</div>
								</div>
							</div>
						</div>
					</div>
					<div style={{ ...cardBg, width: 605.683 }}>
						<div style={{ position: "absolute", bottom: 47.24, left: "calc(50% - 148.18px)", transform: "translateX(-50%)", display: "flex", flexDirection: "column", gap: 7.619, alignItems: "flex-start", width: 251.415 }}>
							<p style={numS}>03/</p>
							<div style={{ display: "flex", flexDirection: "column", gap: 6.095, alignItems: "flex-start", width: "100%" }}>
								<p style={titleS}>STAK Before You Spend</p>
								<p style={{ ...bodyS, width: 204.942, height: 41.141 }}>Practice with real market data and zero real money. Build confidence before you commit a single dollar.</p>
							</div>
						</div>
					</div>
				</div>
				<button type="button" onClick={onSignup} style={{ background: CTA_GRADIENT, border: "0.275px solid rgba(101,158,173,0.63)", borderRadius: 4.404, padding: "5.505px 11.011px", display: "flex", alignItems: "center", justifyContent: "center", gap: 5.505, filter: "drop-shadow(0px 21.471px 6.331px rgba(82,170,199,0.05)) drop-shadow(0px 9.359px 4.68px rgba(82,170,199,0.09)) drop-shadow(0px 2.202px 2.477px rgba(82,170,199,0.10))", cursor: "pointer" }}>
					<span style={{ fontFamily: SR, fontWeight: 400, fontSize: 13.714, lineHeight: "17px", color: "#fff", whiteSpace: "nowrap" }}>Explore STAK</span>
					<div style={{ width: 14.48, height: 12.067, flexShrink: 0 }}><img src={A.ctaArrow} alt="" style={{ width: "100%", height: "100%" }} /></div>
				</button>
			</div>
		</section>
	);
}

/* Mobile Features — Figma node 1:1232 (Frame 222), 810×1185 */
function MobileFeatures({ onSignup }: { onSignup: () => void }) {
	const card: CSSProperties = { background: "#10172a", width: 295.539, height: 281.221, borderRadius: 6.104, overflow: "hidden", position: "relative", flexShrink: 0 };
	const titleS: CSSProperties = { fontFamily: SR, fontWeight: 600, fontSize: 10.263, color: "#fff", margin: 0, lineHeight: "normal", whiteSpace: "nowrap" };
	const bodyS: CSSProperties = { fontFamily: SR, fontWeight: 300, color: "rgba(255,255,255,0.62)", lineHeight: "normal", textAlign: "center", margin: 0 };
	const renderPhone = (variant: 1 | 2) => (
		<div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
			<div style={{ position: "absolute", left: 0, top: 0, width: 575.935, height: 548.033, transform: "scale(0.5131)", transformOrigin: "top left" }}>
				<div style={{ position: "relative", width: "100%", height: "100%" }}>
					<PhoneMockup variant={variant} />
				</div>
			</div>
		</div>
	);
	const renderStack = () => (
		<div style={{ position: "absolute", left: "calc(50% + 0.04px)", top: 62.65, transform: "translateX(-50%)", width: 170.311, height: 94.755 }}>
			<div style={{ position: "absolute", left: 92.47, top: 7.79, width: 77.843, height: 86.964, display: "flex", alignItems: "center", justifyContent: "center" }}>
				<div style={{ transform: "rotate(12.75deg)", width: 62.853, height: 74.94, background: "#b4b4b4", borderRadius: 4.835 }} />
			</div>
			<div style={{ position: "absolute", left: 47.91, top: 0, width: 74.499, height: 88.826, background: "#d9d9d9", borderRadius: 5.731 }} />
			<div style={{ position: "absolute", left: 0, top: 7.18, width: 77.842, height: 86.964, display: "flex", alignItems: "center", justifyContent: "center" }}>
				<div style={{ transform: "rotate(-12.75deg)", width: 62.853, height: 74.94, background: "rgba(217,217,217,0.8)", borderRadius: 4.835 }} />
			</div>
		</div>
	);
	return (
		<section style={{ position: "absolute", left: 0, top: 3298, width: MOBILE_WIDTH, height: 1185, background: SECTION_BG, overflow: "hidden" }}>
			<div style={{ position: "absolute", left: 102.66, top: 110, width: 605.683, display: "flex", flexDirection: "column", alignItems: "center", gap: 60 }}>
				<div style={{ background: "rgba(36,43,61,0.79)", display: "flex", alignItems: "center", justifyContent: "center", gap: 6.266, padding: "4.699px 7.832px", borderRadius: 28.196 }}>
					<div style={{ width: 9.399, height: 9.399, flexShrink: 0 }}><img src={A.pillDot} alt="" style={{ width: "100%", height: "100%" }} /></div>
					<p style={{ fontFamily: SR, fontWeight: 300, fontSize: 12, lineHeight: "10px", color: "#fff", margin: 0, whiteSpace: "nowrap" }}>Features</p>
					<div style={{ width: 10.338, height: 8.615, flexShrink: 0 }}><img src={A.pillArrow} alt="" style={{ width: "100%", height: "100%" }} /></div>
				</div>
				<div style={{ fontFamily: SQ, fontSize: 32, color: "#fff", textAlign: "center", width: "100%" }}>
					<p style={{ margin: 0, lineHeight: "45px" }}>Everything You Need.</p>
					<p style={{ margin: 0, lineHeight: "45px" }}>Nothing You Don't.</p>
				</div>
			</div>
			<div style={{ position: "absolute", left: 102.66, top: 387, width: 605.683, display: "flex", flexDirection: "column", alignItems: "center", gap: 83.805 }}>
				<div style={{ display: "flex", flexDirection: "column", gap: 13.922 }}>
					<div style={{ display: "flex", gap: 13.922 }}>
						<div style={card}>
							{renderPhone(1)}
							<div style={{ position: "absolute", left: "50%", top: 218, transform: "translate(-50%, -50%)", display: "flex", flexDirection: "column", gap: 9.281, alignItems: "center", width: 230 }}>
								<p style={titleS}>Trends</p>
								<div style={{ ...bodyS, fontSize: 10, width: 230 }}>
									<p style={{ margin: 0 }}>See what's moving, what's hot, and what the market is actually doing — in plain English. </p>
									<p style={{ margin: 0 }}>Stay in the loop without the noise</p>
								</div>
							</div>
						</div>
						<div style={card}>
							{renderStack()}
							<div style={{ position: "absolute", left: "50%", top: 193.05, transform: "translateX(-50%)", display: "flex", flexDirection: "column", gap: 9.281, alignItems: "center", width: 175.879 }}>
								<p style={titleS}>Swipe Deck</p>
								<p style={{ ...bodyS, fontSize: 7.184, width: "100%" }}>Discover stocks the way you discover everything else by swiping. Right to STAK it. Left to pass. Up to go deeper. Your feed, your pace.</p>
							</div>
						</div>
					</div>
					<div style={{ display: "flex", gap: 13.922 }}>
						<div style={card}>
							{renderStack()}
							<div style={{ position: "absolute", left: "50%", top: 193.05, transform: "translateX(-50%)", display: "flex", flexDirection: "column", gap: 9.281, alignItems: "center", width: 175.879 }}>
								<p style={titleS}>Simulated STAK</p>
								<p style={{ ...bodyS, fontSize: 7.184, width: "100%" }}>Buy. Sell. Watch. Learn. All with fake money, real market data. Zero risk, full experience. Build your portfolio before it counts.</p>
							</div>
						</div>
						<div style={card}>
							{renderPhone(2)}
							<div style={{ position: "absolute", left: "50%", top: 222, transform: "translate(-50%, -50%)", display: "flex", flexDirection: "column", gap: 9.281, alignItems: "center", width: 175.879 }}>
								<p style={titleS}>Intel Injections</p>
								<div style={{ ...bodyS, fontSize: 7.184, width: "100%" }}>
									<p style={{ margin: 0 }}>Bite-sized lessons delivered in-app, right when you need them. No textbooks. No boring lectures. Just context that makes you smarter </p>
									<p style={{ margin: 0 }}>on the spot.</p>
								</div>
							</div>
						</div>
					</div>
				</div>
				<button type="button" onClick={onSignup} style={{ background: CTA_GRADIENT, border: "0.275px solid rgba(101,158,173,0.63)", borderRadius: 4.404, padding: "5.505px 11.011px", display: "flex", alignItems: "center", justifyContent: "center", gap: 5.505, filter: "drop-shadow(0px 9.359px 4.68px rgba(82,170,199,0.09)) drop-shadow(0px 2.891px 3.252px rgba(82,170,199,0.10))", cursor: "pointer" }}>
					<span style={{ fontFamily: SR, fontWeight: 400, fontSize: 13.714, lineHeight: "17px", color: "#fff", whiteSpace: "nowrap" }}>Explore STAK</span>
					<div style={{ width: 14.48, height: 12.067, flexShrink: 0 }}><img src={A.ctaArrow} alt="" style={{ width: "100%", height: "100%" }} /></div>
				</button>
			</div>
		</section>
	);
}

/* Mobile Early Momentum — Figma node 1:1350 (Frame 223), 810×873 */
function MobileEarlyMomentum({ onSignup }: { onSignup: () => void }) {
	const bubble = (text: string, dark: boolean, key: number) => (
		<div key={key} style={{ background: dark ? "rgba(169,191,254,0.37)" : "#fff", width: 197.542, height: 55.871, borderRadius: 41.903, overflow: "hidden", position: "relative", flexShrink: 0 }}>
			<div style={{ position: "absolute", left: 11.97, top: 8.98, display: "flex", alignItems: "center", gap: 19.954 }}>
				<div style={{ width: 37.912, height: 37.912, borderRadius: 49.884, overflow: "hidden", flexShrink: 0 }}>
					<img src={A.emAvatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 49.884 }} />
				</div>
				<p style={{ fontFamily: SR, fontWeight: 400, fontSize: 8.182, color: dark ? "#fff" : "#323232", whiteSpace: "nowrap", margin: 0 }}>{text}</p>
			</div>
		</div>
	);
	const r1: [string, boolean][] = [["Lets fvking STAK i!", false], ["Time to save more!", true], ["Woooo!!", false], ["Lets fvking STAK i!", false], ["Lets fvking STAK i!", false]];
	const r2: [string, boolean][] = [["Bullish! on S&P 500", false], ["I love printing money", true], ["Gold, Google", false], ["Lets fvking STAK i!", false], ["Lets fvking STAK i!", false]];
	const r3: [string, boolean][] = [["Whats the Buzz About?", true], ["Is $Tsla a good buy?", false], ["Lets fvking STAK i!", true], ["Lets fvking STAK i!", false], ["Lets fvking STAK i!", false]];
	const stat = (arrow: string, num: string, label: string) => (
		<div style={{ display: "flex", flexDirection: "column", gap: 20.075, alignItems: "center", width: "100%" }}>
			<div style={{ display: "flex", alignItems: "center" }}>
				<div style={{ width: 23.715, height: 28.457, flexShrink: 0 }}><img src={arrow} alt="" style={{ width: "100%", height: "100%" }} /></div>
				<p style={{ fontFamily: SQ, fontSize: 63.236, color: "#fff", margin: 0, lineHeight: "33px", whiteSpace: "nowrap" }}>{num}</p>
			</div>
			<p style={{ fontFamily: SR, fontWeight: 600, fontSize: 9.368, color: "#f5f1f1", margin: 0, whiteSpace: "nowrap" }}>{label}</p>
		</div>
	);
	return (
		<section style={{ position: "absolute", left: 0, top: 4483, width: MOBILE_WIDTH, height: 873, background: SECTION_BG, overflow: "hidden" }}>
			<div style={{ position: "absolute", left: 102.66, top: 110, width: 605.683, display: "flex", flexDirection: "column", alignItems: "center", gap: 60 }}>
				<div style={{ background: "rgba(36,43,61,0.79)", display: "flex", alignItems: "center", justifyContent: "center", gap: 6.266, padding: "4.699px 7.832px", borderRadius: 28.196 }}>
					<div style={{ width: 9.399, height: 9.399, flexShrink: 0 }}><img src={A.pillDot} alt="" style={{ width: "100%", height: "100%" }} /></div>
					<p style={{ fontFamily: SR, fontWeight: 300, fontSize: 12, lineHeight: "10px", color: "#fff", margin: 0, whiteSpace: "nowrap" }}>Early Momentum</p>
					<div style={{ width: 10.338, height: 8.615, flexShrink: 0 }}><img src={A.pillArrow} alt="" style={{ width: "100%", height: "100%" }} /></div>
				</div>
				<div style={{ fontFamily: SQ, fontSize: 32, color: "#fff", textAlign: "center", whiteSpace: "nowrap" }}>
					<p style={{ margin: 0, lineHeight: "45px" }}>Real People.</p>
					<p style={{ margin: 0, lineHeight: "45px" }}>Real Momentum.</p>
				</div>
			</div>
			{/* stats */}
			<div style={{ position: "absolute", left: 49, top: 421, width: 199.412, display: "flex", flexDirection: "column", gap: 39.523, alignItems: "center" }}>
				{stat(A.emStatArrow, "50M+", "Millennials & Gen Z investing today")}
				{stat(A.emStatArrow, "30M+", "Investors seeking better tools")}
			</div>
			{/* chat bubbles (3 staggered rows, overflow right with fade) */}
			<div style={{ position: "absolute", left: 315.6, top: 402, width: 494.4, height: 209.231, overflow: "hidden" }}>
				<div style={{ position: "absolute", left: 32.15, top: 0, display: "flex", gap: 10.52 }}>{r1.map(([t, d], i) => bubble(t, d, i))}</div>
				<div style={{ position: "absolute", left: 84.75, top: 76.56, display: "flex", gap: 10.52 }}>{r3.map(([t, d], i) => bubble(t, d, i))}</div>
				<div style={{ position: "absolute", left: 25.72, top: 153.12, display: "flex", gap: 10.52 }}>{r2.map(([t, d], i) => bubble(t, d, i))}</div>
				<div style={{ position: "absolute", left: 0, top: 0, width: 183.516, height: 209.231, background: "linear-gradient(to right, rgba(10,16,32,1) 0%, rgba(18,29,58,0.75) 25%, rgba(26,42,83,0.5) 50%, rgba(34,54,108,0.25) 75%, rgba(42,67,134,0) 100%)", pointerEvents: "none" }} />
			</div>
			<div style={{ position: "absolute", left: "50%", top: 735.3, transform: "translateX(-50%)" }}>
				<button type="button" onClick={onSignup} style={{ background: CTA_GRADIENT, border: "0.275px solid rgba(101,158,173,0.63)", borderRadius: 4.404, padding: "5.505px 11.011px", display: "flex", alignItems: "center", justifyContent: "center", gap: 5.505, filter: "drop-shadow(0px 9.359px 4.68px rgba(82,170,199,0.09)) drop-shadow(0px 2.891px 3.252px rgba(82,170,199,0.10))", cursor: "pointer" }}>
					<span style={{ fontFamily: SR, fontWeight: 400, fontSize: 13.714, lineHeight: "17px", color: "#fff", whiteSpace: "nowrap" }}>Join our Community</span>
					<div style={{ width: 14.48, height: 12.067, flexShrink: 0 }}><img src={A.ctaArrow} alt="" style={{ width: "100%", height: "100%" }} /></div>
				</button>
			</div>
		</section>
	);
}

/* Mobile FAQ — Figma node 1:1441 (Frame 225), 810×1236 */
function MobileFaqRow({ q, a, open, onToggle, width = 586, qSize = 20, aSize = 14 }: { q: string; a: string; open: boolean; onToggle: () => void; width?: number; qSize?: number; aSize?: number }) {
	/* Netflix-style accordion row — mirror of the desktop FaqRow: solid card,
	   question bar lightens on hover, drawn "+" rotates into an "x" when open,
	   answer in its own seamed panel, no focus ring. */
	const [hover, setHover] = useState(false);
	return (
		<div style={{ width, display: "flex", flexDirection: "column" }}>
			<button
				type="button"
				aria-expanded={open}
				onClick={onToggle}
				onMouseEnter={() => setHover(true)}
				onMouseLeave={() => setHover(false)}
				style={{ ...btnReset, width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "16px 20px", background: hover ? "#2a3552" : "#1a2237", transition: "background-color 0.2s ease", cursor: "pointer", outline: "none", WebkitTapHighlightColor: "transparent", textAlign: "left", boxSizing: "border-box" }}
			>
				<p style={{ fontFamily: SR, fontWeight: 500, fontSize: qSize, lineHeight: 1.3, color: "#fff", margin: 0, whiteSpace: "normal", wordBreak: "break-word", flex: 1 }}>{q}</p>
				<svg width={24} height={24} viewBox="0 0 24 24" aria-hidden="true" style={{ flexShrink: 0, transform: open ? "rotate(45deg)" : "rotate(0deg)", transition: "transform 0.25s ease" }}>
					<path d="M12 4.5v15M4.5 12h15" stroke="#fff" strokeWidth={2} strokeLinecap="round" fill="none" />
				</svg>
			</button>
			{open && a && (
				<div style={{ marginTop: 2, background: "#1a2237", padding: "16px 20px" }}>
					<p style={{ fontFamily: SR, fontWeight: 300, fontSize: aSize, lineHeight: 1.6, color: "rgba(255,255,255,0.85)", margin: 0, textAlign: "left", whiteSpace: "normal", wordBreak: "break-word" }}>{a}</p>
				</div>
			)}
		</div>
	);
}

function MobileFaq({ onEmail }: { onEmail: () => void }) {
	const [openIdx, setOpenIdx] = useState<number | null>(null);
	return (
		<section style={{ position: "absolute", left: 0, top: 5356, width: MOBILE_WIDTH, height: 1236, background: SECTION_BG, overflow: "hidden" }}>
			<div style={{ position: "absolute", left: 102.66, top: 110, width: 605.683, display: "flex", flexDirection: "column", alignItems: "center", gap: 183 }}>
				<div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 60 }}>
					<div style={{ background: "rgba(36,43,61,0.79)", display: "flex", alignItems: "center", justifyContent: "center", gap: 6.266, padding: "4.699px 7.832px", borderRadius: 28.196 }}>
						<div style={{ width: 9.399, height: 9.399, flexShrink: 0 }}><img src={A.pillDot} alt="" style={{ width: "100%", height: "100%" }} /></div>
						<p style={{ fontFamily: SR, fontWeight: 300, fontSize: 12, lineHeight: "10px", color: "#fff", margin: 0, whiteSpace: "nowrap" }}>STAK FAQ</p>
						<div style={{ width: 10.338, height: 8.615, flexShrink: 0 }}><img src={A.pillArrow} alt="" style={{ width: "100%", height: "100%" }} /></div>
					</div>
					<div style={{ display: "flex", flexDirection: "column", gap: 20, alignItems: "center", textAlign: "center", color: "#fff", width: "100%" }}>
						<div style={{ fontFamily: SQ, fontSize: 32, width: "100%" }}>
							<p style={{ margin: 0, lineHeight: "45px" }}>We’re here to answer</p>
							<p style={{ margin: 0, lineHeight: "45px" }}>all your questions.</p>
						</div>
						<div style={{ fontFamily: SR, fontWeight: 300, fontSize: 16 }}>
							<p style={{ margin: 0, lineHeight: "25px" }}>If you are new to world of stocks and financial</p>
							<p style={{ margin: 0, lineHeight: "25px" }}>discipline, STAK is built for you.</p>
						</div>
					</div>
				</div>
				<div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 83.805 }}>
					<div style={{ width: 586, display: "flex", flexDirection: "column", gap: 8 }}>
						{FAQS.map((f, i) => (
							<MobileFaqRow key={i} q={f.q} a={f.a} open={openIdx === i} onToggle={() => setOpenIdx((p) => (p === i ? null : i))} />
						))}
					</div>
					<div style={{ display: "flex", flexDirection: "column", gap: 30, alignItems: "center" }}>
						<p style={{ fontFamily: SR, fontWeight: 300, fontSize: 18, lineHeight: "25px", color: "#fff", margin: 0, whiteSpace: "nowrap" }}>Have more questions?</p>
						<button type="button" onClick={onEmail} style={{ background: CTA_GRADIENT, border: CTA_BORDER, borderRadius: 5.781, padding: "7.226px 14.453px", display: "flex", alignItems: "center", justifyContent: "center", gap: 7.226, filter: CTA_SHADOW, cursor: "pointer" }}>
							<span style={{ fontFamily: SR, fontWeight: 400, fontSize: 14.453, color: "#fff", whiteSpace: "nowrap" }}>Email Us</span>
							<div style={{ width: 13.775, height: 11.48, flexShrink: 0 }}><img src={A.ctaArrow} alt="" style={{ width: "100%", height: "100%" }} /></div>
						</button>
					</div>
				</div>
			</div>
		</section>
	);
}

/* Mobile Final CTA — Figma node 1:1465 (Frame 226), 810×1236 */
function MobileFinalCta() {
	const tb: CSSProperties = { width: 240.752, height: 129.049, borderRadius: 8.326, overflow: "hidden", position: "relative", flexShrink: 0 };
	const imgTile = (src: string, st: CSSProperties, key: number) => <div key={key} style={{ ...tb, background: "#172037" }}><img src={src} alt="" style={{ position: "absolute", objectFit: "cover", maxWidth: "none", ...st }} /></div>;
	const maskTile = (src: string, st: CSSProperties, mpos: string, key: number) => (
		<div key={key} style={tb}>
			<div style={{ position: "absolute", WebkitMaskImage: `url(${A.ctaMqMask})`, maskImage: `url(${A.ctaMqMask})`, WebkitMaskSize: "240.752px 129.049px", maskSize: "240.752px 129.049px", WebkitMaskPosition: mpos, maskPosition: mpos, WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat", ...st }}>
				<img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
			</div>
		</div>
	);
	const txt = (t: string, key: number) => <div key={key} style={tb}><p style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", fontFamily: SQ, fontSize: 55.505, color: "#fff", margin: 0, whiteSpace: "nowrap", lineHeight: "31.221px" }}>{t}</p></div>;
	const emptyTile = (key: number) => <div key={key} style={{ ...tb, background: "#172037" }} />;
	const row = (tiles: React.ReactNode[], left: string, top: number, w: number) => (
		<div style={{ position: "absolute", left, top, transform: "translateX(-50%)", width: w, display: "flex", gap: 13.876, alignItems: "center" }}>{tiles}</div>
	);
	return (
		<section style={{ position: "absolute", left: 0, top: 6592, width: MOBILE_WIDTH, height: 1236, background: SECTION_BG, overflow: "hidden" }}>
			<div style={{ position: "absolute", left: 102.66, top: 110, width: 605.683, display: "flex", flexDirection: "column", alignItems: "center", gap: 60, zIndex: 2 }}>
				<div style={{ background: "rgba(36,43,61,0.79)", display: "flex", alignItems: "center", justifyContent: "center", gap: 6.266, padding: "4.699px 7.832px", borderRadius: 28.196 }}>
					<div style={{ width: 9.399, height: 9.399, flexShrink: 0 }}><img src={A.pillDot} alt="" style={{ width: "100%", height: "100%" }} /></div>
					<p style={{ fontFamily: SR, fontWeight: 300, fontSize: 14, lineHeight: "12px", color: "#fff", margin: 0, whiteSpace: "nowrap" }}>Our growing community</p>
					<div style={{ width: 10.338, height: 8.615, flexShrink: 0 }}><img src={A.pillArrow} alt="" style={{ width: "100%", height: "100%" }} /></div>
				</div>
				<div style={{ display: "flex", flexDirection: "column", gap: 20, alignItems: "center", textAlign: "center", color: "#fff", width: "100%" }}>
					<div style={{ fontFamily: SQ, fontSize: 32, width: "100%" }}>
						<p style={{ margin: 0, lineHeight: "35px", whiteSpace: "pre" }}>{"Our community of fast rising "}</p>
						<p style={{ margin: 0, lineHeight: "35px" }}>young investors</p>
					</div>
					<div style={{ fontFamily: SR, fontWeight: 300, fontSize: 16 }}>
						<p style={{ margin: 0, lineHeight: "25px" }}>Join a generation that invests with confidence.</p>
						<p style={{ margin: 0, lineHeight: "25px" }}>Sign up free and start STAKing today.</p>
					</div>
				</div>
			</div>
			{row([
				maskTile(A.ctaMqA8, { left: "calc(50% + 0.7px)", top: "calc(50% + 59.47px)", transform: "translate(-50%,-50%)", width: 250.442, height: 375.663 }, "4.139px 63.838px", 0),
				txt("STAK", 1),
				maskTile(A.ctaMq9e, { left: -2.08, top: -77.01, width: 244.731, height: 366.332 }, "2.082px 77.013px", 2),
				imgTile(A.ctaMqF7, { left: "calc(50% - 0.3px)", top: "calc(50% + 48.22px)", transform: "translate(-50%,-50%)", width: 313.692, height: 312.908 }, 3),
			], "calc(50% - 70.48px)", 473, 1004.637)}
			{row([
				imgTile(A.ctaMq85, { left: "calc(50% + 0.12px)", top: "calc(50% + 17.69px)", transform: "translate(-50%,-50%)", width: 260.41, height: 390.615 }, 0),
				maskTile(A.ctaMqC5, { left: -8.25, top: -24.29, width: 260.799, height: 346.065 }, "8.252px 24.286px", 1),
				imgTile(A.ctaMq85, { left: "calc(50% + 0.12px)", top: "calc(50% + 17.69px)", transform: "translate(-50%,-50%)", width: 260.41, height: 390.615 }, 2),
				txt("IT", 3),
				imgTile(A.ctaMq4a, { left: -30.53, top: -326.1, width: 349.632, height: 651.487 }, 4),
				emptyTile(5),
			], "calc(50% - 0.05px)", 621.48, 1513.893)}
			{row([
				imgTile(A.ctaMq02, { left: -48.57, top: -16.66, width: 314.99, height: 314.99 }, 0),
				txt("UP", 1),
				imgTile(A.ctaMqE0, { left: "calc(50% + 0.34px)", top: "calc(50% - 7.63px)", transform: "translate(-50%,-50%)", width: 287.237, height: 287.237 }, 2),
				imgTile(A.ctaMqBb, { left: -15.96, top: -90.19, width: 271.973, height: 388.006 }, 3),
				maskTile(A.ctaMqC5, { left: -8.24, top: -24.29, width: 260.799, height: 346.065 }, "8.243px 24.286px", 4),
			], "calc(50% - 53.83px)", 769.95, 1259.265)}
		</section>
	);
}

/* Mobile Footer — Figma node 1:1520 (Frame 238), 810×589 */
function MobileFooter({ onSubscribe, onScrollTo }: { onSubscribe: (email: string) => void; onScrollTo: (k: keyof typeof SEC) => void }) {
	const [email, setEmail] = useState("");
	const itemStyle: CSSProperties = { margin: 0, whiteSpace: "nowrap", fontFamily: SR, fontWeight: 300, fontSize: 16, lineHeight: "25px", color: "#fff", textAlign: "left" };
	const linkCol = (title: string, items: { label: string; onClick?: () => void }[]) => (
		<div style={{ display: "flex", flexDirection: "column", gap: 30, alignItems: "flex-start", width: 135 }}>
			<p style={{ fontFamily: SR, fontWeight: 600, fontSize: 16, margin: 0, lineHeight: "25px", whiteSpace: "nowrap" }}>{title}</p>
			<div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
				{items.map((it, i) => it.onClick
					? <button key={i} type="button" onClick={it.onClick} style={{ ...btnReset, ...itemStyle, ...(it.label === "Home" ? { fontSize: 14 } : {}) }}>{it.label}</button>
					: <p key={i} style={itemStyle}>{it.label}</p>
				)}
			</div>
		</div>
	);
	return (
		<section style={{ position: "absolute", left: 0, top: 7828, width: MOBILE_WIDTH, height: 589, background: SECTION_BG, overflow: "hidden", display: "flex", flexDirection: "column", alignItems: "center", paddingLeft: 24, paddingRight: 24, boxSizing: "border-box" }}>
			<div style={{ display: "flex", flexDirection: "column", gap: 58, padding: "40px 0", width: "100%" }}>
				<div style={{ display: "flex", flexDirection: "column", gap: 59, width: 686 }}>
					<div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
						<div style={{ position: "relative", width: 109.131, height: 26.478 }}>
							<div style={{ position: "absolute", left: 0, top: 0, width: 26.478, height: 26.478 }}><img src={A.footerLogoIcon} alt="STAK" style={{ width: "100%", height: "100%" }} /></div>
							<div style={{ position: "absolute", left: 30.97, top: 5.76, width: 78.163, height: 14.983 }}><img src={A.footerLogoWord} alt="" style={{ width: "100%", height: "100%" }} /></div>
						</div>
						<p style={{ fontFamily: SR, fontWeight: 300, fontSize: 14, lineHeight: "25px", color: "#fff", margin: 0, width: "100%" }}>{`You've heard the advice — "invest early, invest often." But nobody tells you how. Every platform you open hits you with charts, tickers, and jargon that feels designed to make you feel dumb`}</p>
					</div>
					<div style={{ display: "flex", gap: 15, alignItems: "center" }}>
						<div style={{ background: "#fff", border: "1px solid #000", height: 40, width: 120, borderRadius: 6, overflow: "hidden", position: "relative", flexShrink: 0 }}>
							<div style={{ position: "absolute", left: 7, top: 7, width: 21, height: 24 }}><img src={A.footerPlay} alt="" style={{ width: "100%", height: "100%" }} /></div>
							<div style={{ position: "absolute", left: 35, top: 4, display: "flex", flexDirection: "column", gap: 3, alignItems: "flex-start" }}>
								<p style={{ fontFamily: "'Product Sans', Arial, sans-serif", fontSize: 10, color: "#000", margin: 0, textTransform: "uppercase", lineHeight: "normal" }}>GET IT ON</p>
								<div style={{ width: 74, height: 15, transform: "scaleY(-1)" }}><img src={A.footerPlayText} alt="Google Play" style={{ width: "100%", height: "100%" }} /></div>
							</div>
						</div>
						<div style={{ background: "#fff", border: "1px solid #000", height: 40, width: 120, borderRadius: 6, overflow: "hidden", position: "relative", flexShrink: 0 }}>
							<div style={{ position: "absolute", left: 7, top: 7, width: 20, height: 24 }}><img src={A.footerApple} alt="" style={{ width: "100%", height: "100%" }} /></div>
							<div style={{ position: "absolute", left: 35, top: "50%", transform: "translateY(-50%)", display: "flex", flexDirection: "column", alignItems: "flex-start", color: "#000", width: 78 }}>
								<p style={{ fontFamily: "'SF Compact Text', -apple-system, sans-serif", fontWeight: 500, fontSize: 9, margin: 0, lineHeight: "9px" }}>Download on the</p>
								<p style={{ fontFamily: "'SF Compact Display', -apple-system, sans-serif", fontWeight: 500, fontSize: 18, margin: 0, lineHeight: "1", letterSpacing: -0.47 }}>App Store</p>
							</div>
						</div>
					</div>
				</div>
				<div style={{ display: "flex", gap: 134, alignItems: "flex-start" }}>
					<div style={{ display: "flex", gap: 58, alignItems: "flex-start", color: "#fff" }}>
						{linkCol("Useful Links", [
							{ label: "Home", onClick: () => onScrollTo("hero") },
							{ label: "How it works", onClick: () => onScrollTo("howItWorks") },
							{ label: "Features", onClick: () => onScrollTo("features") },
							{ label: "FAQ", onClick: () => onScrollTo("faq") },
							{ label: "Privacy terms" },
						])}
						{linkCol("Social Links", [
							{ label: "Facebook" },
							{ label: "Instagram" },
							{ label: "X" },
							{ label: "Tiktok" },
							{ label: "Discord" },
						])}
					</div>
					<div style={{ display: "flex", flexDirection: "column", gap: 127, alignItems: "flex-start" }}>
						<div style={{ display: "flex", flexDirection: "column", gap: 24, alignItems: "flex-start" }}>
							<p style={{ fontFamily: SR, fontWeight: 400, fontSize: 16, lineHeight: "25px", color: "#fff", margin: 0 }}>{"Subscribe to our newsletter"}</p>
							<div style={{ background: "rgba(255,255,255,0.07)", display: "flex", alignItems: "center", padding: "8px 9px 8px 11px", borderRadius: 13 }}>
								<div style={{ display: "flex", gap: 14, alignItems: "center" }}>
									<input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Your email address" style={{ background: "transparent", border: "none", outline: "none", fontFamily: SR, fontWeight: 300, fontSize: 12, lineHeight: "25px", color: "#fff", width: 114 }} />
									<button type="button" onClick={() => onSubscribe(email)} style={{ background: CTA_GRADIENT, border: CTA_BORDER, borderRadius: 5.781, padding: "7.226px 14.453px", filter: CTA_SHADOW, cursor: "pointer", flexShrink: 0 }}>
										<span style={{ fontFamily: SR, fontWeight: 400, fontSize: 14.453, lineHeight: "18px", color: "#fff", whiteSpace: "nowrap" }}>Subscribe</span>
									</button>
								</div>
							</div>
						</div>
						<p style={{ fontFamily: SR, fontWeight: 300, fontSize: 12, lineHeight: "12px", color: "#fff", margin: 0, whiteSpace: "nowrap" }}>© 2026 All rights reserved</p>
					</div>
				</div>
			</div>
		</section>
	);
}

function MobileLanding({ scale, onSignup, onEmail, onSubscribe, onScrollTo }: { scale: number; onSignup: () => void; onEmail: () => void; onSubscribe: (email: string) => void; onScrollTo: (k: keyof typeof SEC) => void }) {
	// full mobile canvas height (Figma node 1:1123 / Frame 220)
	const H = 8417.48;
	return (
		<div className="landing-wrapper" style={{ width: "100%", height: H * scale, overflow: "hidden", display: "flex", justifyContent: "center", alignItems: "flex-start" }}>
			<div className="landing-canvas" style={{ width: MOBILE_WIDTH, height: H, position: "relative", flexShrink: 0, background: SECTION_BG, transform: `scale(${scale})`, transformOrigin: "top center" }}>
				<MobileHero onSignup={onSignup} onScrollTo={onScrollTo} />
				<MobileProofStrip />
				<MobileProblem onSignup={onSignup} />
				<MobileHowItWorks onSignup={onSignup} />
				<MobileFeatures onSignup={onSignup} />
				<MobileEarlyMomentum onSignup={onSignup} />
				<MobileFaq onEmail={onEmail} />
				<MobileFinalCta />
				<MobileFooter onSubscribe={onSubscribe} onScrollTo={onScrollTo} />
			</div>
		</div>
	);
}

/* === 390px PHONE LAYOUT (Figma node 1:1586 / Frame 222, 390px wide) === */
function MobileHero390({ onSignup, onScrollTo }: { onSignup: () => void; onScrollTo: (k: keyof typeof SEC) => void }) {
	return (
		<section style={{ position: "absolute", left: 0, top: 0, width: MOBILE390_WIDTH, height: 925, background: SECTION_BG, overflow: "hidden" }}>
			<div style={{ position: "absolute", left: -216, top: 180, width: 470, height: 231, overflow: "visible", pointerEvents: "none" }}>
				<img src={A.ellipse108} alt="" style={{ position: "absolute", top: "-199.08%", left: "-97.85%", width: "295.7%", height: "498.16%", maxWidth: "none" }} />
			</div>
			<div style={{ position: "absolute", left: 191, top: 441, width: 359, height: 217, overflow: "visible", pointerEvents: "none" }}>
				<img src={A.ellipse109} alt="" style={{ position: "absolute", top: "-179.01%", left: "-108.2%", width: "316.4%", height: "458.02%", maxWidth: "none" }} />
			</div>
			<MobileNavBar width={330.2} left={29.8} padX={10} onScrollTo={onScrollTo} />
			<div style={{ position: "absolute", left: 38, top: 110, width: 315, display: "flex", flexDirection: "column", alignItems: "center", gap: 30 }}>
				<div style={{ background: "rgba(36,43,61,0.79)", display: "flex", alignItems: "center", justifyContent: "center", gap: 6.266, padding: "4.699px 7.832px", borderRadius: 28.196 }}>
					<div style={{ width: 9.399, height: 9.399, flexShrink: 0 }}><img src={A.pillDot} alt="" style={{ width: "100%", height: "100%" }} /></div>
					<p style={{ fontFamily: SR, fontWeight: 300, fontSize: 12, lineHeight: "12px", color: "#fff", margin: 0, whiteSpace: "nowrap" }}>Get early access</p>
					<div style={{ width: 10.338, height: 8.615, flexShrink: 0 }}><img src={A.pillArrow} alt="" style={{ width: "100%", height: "100%" }} /></div>
				</div>
				<div style={{ display: "flex", flexDirection: "column", gap: 15, alignItems: "center", textAlign: "center", width: "100%" }}>
					<div style={{ fontFamily: SQ, fontSize: 30, color: "#fff", width: "100%" }}>
						<p style={{ margin: 0, lineHeight: "35px", whiteSpace: "nowrap" }}>The Stock Market</p>
						<p style={{ margin: 0, lineHeight: "35px", whiteSpace: "nowrap" }}>Finally Speaks</p>
						<p style={{ margin: 0, lineHeight: "35px", whiteSpace: "nowrap" }}>Your Language.</p>
					</div>
					<div style={{ fontFamily: SR, fontWeight: 300, fontSize: 16, color: "rgba(255,255,255,0.8)" }}>
						<p style={{ margin: 0, lineHeight: "25px" }}>{`STAK matches you with stocks you'll `}</p>
						<p style={{ margin: 0, lineHeight: "25px" }}>{`actually understand —through swipes, `}</p>
						<p style={{ margin: 0, lineHeight: "25px" }}>smart insights, and zero pressure.</p>
						<p style={{ margin: 0, lineHeight: "25px" }}>Before you buy anything, STAK it.</p>
					</div>
				</div>
			</div>
			{/* Frame 124 (mobile) is its own composition — narrower beam frame (156x224 at x142.5),
			    no desktop flare layer — so it renders from a flattened 2x export of the node itself
			    (alpha un-premultiplied against the baked page bg; coins/box/glows baked at mobile
			    truth). Placement (top 375: bounds include ~9px blur spill above the frame) measured
			    by edge-correlation against Figma's own hero render. */}
			<div style={{ position: "absolute", left: 0, top: 375, width: 390, height: 422.5, pointerEvents: "none" }}>
				<img src={A.boxM390} alt="" style={{ width: "100%", height: "100%", display: "block" }} />
			</div>
			<button type="button" onClick={onSignup} style={{ ...btnReset, position: "absolute", left: 138.6, top: 849, width: 112.905, height: 32.453, background: CTA_GRADIENT, border: CTA_BORDER, borderRadius: 5.781, display: "flex", alignItems: "center", justifyContent: "center", filter: CTA_SHADOW, cursor: "pointer", boxSizing: "border-box" }}>
				<span style={{ fontFamily: SR, fontWeight: 400, fontSize: 14.453, color: "#fff", whiteSpace: "nowrap" }}>Get started</span>
			</button>
		</section>
	);
}

function MobileProofStrip390() {
	return (
		<section style={{ position: "absolute", left: 0, top: 925, width: MOBILE390_WIDTH, height: 115, background: "#0a1020", overflow: "hidden" }}>
			<div style={{ position: "absolute", left: "calc(50% + 168.5px)", top: 47, transform: "translateX(-50%)", display: "flex", gap: 34, alignItems: "center" }}>
				<div style={{ width: 150, height: 21, position: "relative", flexShrink: 0 }} aria-label="Block Wallet">
					<div style={{ position: "absolute", inset: "0 85.94% 0 0" }}><img src={A.proofBwIcon} alt="Block Wallet" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} /></div>
					<div style={{ position: "absolute", inset: "9.07% 0 11.2% 18.72%" }}><img src={A.proofBwWord} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} /></div>
				</div>
				<div style={{ width: 100, height: 21.834, position: "relative", overflow: "hidden", flexShrink: 0 }}><img src={A.proofAmplitude} alt="Amplitude" style={{ width: "100%", height: "100%", objectFit: "contain" }} /></div>
				<div style={{ width: 135, height: 21.344, position: "relative", overflow: "hidden", flexShrink: 0 }}><img src={A.proofBetterStack} alt="Better Stack" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "left top" }} /></div>
				<div style={{ width: 81.9, height: 21, position: "relative", flexShrink: 0 }} aria-label="Brex">
					<div style={{ position: "absolute", inset: "0 1.42% 0 1.12%" }}><img src={A.proofBrexMain} alt="Brex" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} /></div>
					<div style={{ position: "absolute", inset: "20.67% 16.9% 15.5% 68.18%" }}><img src={A.proofBrexDetail} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} /></div>
				</div>
				<div style={{ width: 56.1, height: 19.513, position: "relative", overflow: "hidden", flexShrink: 0 }}><img src={A.proofDeel} alt="Deel" style={{ width: "100%", height: "100%", objectFit: "contain" }} /></div>
				<div style={{ width: 69, height: 21.923, position: "relative", overflow: "hidden", flexShrink: 0 }}><div style={{ position: "absolute", inset: "1.52% 3.8% 4.37% 0.15%" }}><img src={A.proofSpotify} alt="Spotify" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} /></div></div>
			</div>
			<div style={{ position: "absolute", left: 0, top: 0, width: 64, height: 115, background: "linear-gradient(to right, rgba(10,16,32,0.99) 41.41%, rgba(10,16,32,0.12) 74.22%)", pointerEvents: "none" }} />
			<div style={{ position: "absolute", right: 0, top: 0, width: 64, height: 115, background: "linear-gradient(to left, rgb(10,16,32) 27.344%, rgba(10,16,32,0.79) 133.59%)", pointerEvents: "none" }} />
		</section>
	);
}

function MobileProblem390({ onSignup }: { onSignup: () => void }) {
	return (
		<section style={{ position: "absolute", left: 0, top: 1040, width: MOBILE390_WIDTH, height: 924, background: SECTION_BG, overflow: "hidden" }}>
			<div style={{ position: "absolute", left: "calc(50% + 0.5px)", top: 267, transform: "translateX(-50%) scaleY(-1)", width: 359, height: 115, overflow: "visible", pointerEvents: "none" }}>
				<img src={A.ellipse109} alt="" style={{ position: "absolute", top: "-337.79%", left: "-108.2%", width: "316.4%", height: "775.58%", maxWidth: "none" }} />
			</div>
			<div style={{ position: "absolute", left: "calc(50% - 0.21px)", top: "calc(50% + 128.5px)", transform: "translate(-50%, -50%)", width: 403.587, height: 395, overflow: "hidden" }}>
				{/* Figma 1:1659/1:1660 geometry, but the photo stays SHARP — the user rejected the
				    design's layer blur (re-confirmed 2026-07-01). The bottom mask rows sit entirely
				    under the solid overlay (kills a compositing hairline, invisible otherwise). */}
				<img src={A.problemScreenshot} alt="" style={{ position: "absolute", left: "calc(50% + 1.29px)", top: 29.12, transform: "translateX(-50%)", width: 410.708, height: 422.098, objectFit: "cover", maskImage: "linear-gradient(to bottom, black 84%, transparent 86.5%)", WebkitMaskImage: "linear-gradient(to bottom, black 84%, transparent 86.5%)" }} />
				<div style={{ position: "absolute", left: "calc(50% + 1.21px)", bottom: -22, transform: "translateX(-50%)", width: 410, height: 142, background: "linear-gradient(to top, #0a1020 30.374%, rgba(10,16,32,0) 96.262%)", filter: "blur(8.453px)" }} />
			</div>
			<div style={{ position: "absolute", left: "calc(50% + 0.5px)", top: 70, transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 60 }}>
				<div style={{ background: "rgba(36,43,61,0.79)", display: "flex", alignItems: "center", justifyContent: "center", gap: 6.266, padding: "4.699px 7.832px", borderRadius: 28.196 }}>
					<div style={{ width: 9.399, height: 9.399, flexShrink: 0 }}><img src={A.pillDot} alt="" style={{ width: "100%", height: "100%" }} /></div>
					<p style={{ fontFamily: SR, fontWeight: 300, fontSize: 12, lineHeight: "12px", color: "#fff", margin: 0, whiteSpace: "nowrap" }}>The problem</p>
					<div style={{ width: 10.338, height: 8.615, flexShrink: 0 }}><img src={A.pillArrow} alt="" style={{ width: "100%", height: "100%" }} /></div>
				</div>
				<div style={{ display: "flex", flexDirection: "column", gap: 15, alignItems: "center", textAlign: "center", color: "#fff", width: "100%" }}>
					<div style={{ fontFamily: SQ, fontSize: 30, width: "100%" }}>
						<p style={{ margin: 0, lineHeight: "35px" }}>{`The Market Isn't `}</p>
						<p style={{ margin: 0, lineHeight: "35px" }}>Hard. </p>
						<p style={{ margin: 0, lineHeight: "35px" }}>{`It's Just Been `}</p>
						<p style={{ margin: 0, lineHeight: "35px" }}>Made That Way.</p>
					</div>
					<div style={{ fontFamily: SR, fontWeight: 300, fontSize: 16, color: "#fff", width: 308 }}>
						<p style={{ margin: 0, lineHeight: "25px" }}>{`You've heard the advice — "invest early, invest often."`}</p>
						<p style={{ margin: 0, lineHeight: "25px" }}>But nobody tells you how. </p>
						<p style={{ margin: 0, lineHeight: "25px" }}>Here’s how:</p>
					</div>
				</div>
			</div>
			<button type="button" onClick={onSignup} style={{ ...btnReset, position: "absolute", left: 138.63, bottom: 51.55, background: CTA_GRADIENT, border: CTA_BORDER, borderRadius: 5.781, padding: "7.226px 14.453px", display: "flex", alignItems: "center", justifyContent: "center", filter: CTA_SHADOW, cursor: "pointer" }}>
				<span style={{ fontFamily: SR, fontWeight: 400, fontSize: 14.453, color: "#fff", whiteSpace: "nowrap" }}>Get started</span>
			</button>
		</section>
	);
}

function MobileHowCard390({ num, title, body, bottom }: { num: string; title: string; body: string; bottom: number }) {
	return (
		<div style={{ background: "#10172a", height: 297.889, width: 296.366, borderRadius: 9.142, overflow: "hidden", position: "relative", flexShrink: 0 }}>
			<div style={{ position: "absolute", bottom, left: "calc(50% + 0.38px)", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 10.666, width: 251.415 }}>
				<p style={{ fontFamily: SQ, fontSize: 22.856, color: "#fff", margin: 0, whiteSpace: "nowrap" }}>{num}</p>
				<div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6.095, width: "100%" }}>
					<p style={{ fontFamily: SR, fontWeight: 600, fontSize: 16, color: "#fff", margin: 0 }}>{title}</p>
					<p style={{ fontFamily: SR, fontWeight: 300, fontSize: 12, lineHeight: "normal", whiteSpace: "pre-line", color: "rgba(255,255,255,0.62)", width: 251.415, margin: 0 }}>{body}</p>
				</div>
			</div>
		</div>
	);
}

function MobileHowItWorks390({ onSignup }: { onSignup: () => void }) {
	return (
		<section style={{ position: "absolute", left: 0, top: 1964, width: MOBILE390_WIDTH, height: 1575, background: SECTION_BG, overflow: "hidden" }}>
			<div style={{ position: "absolute", left: 41.5, top: 70, width: 308, display: "flex", flexDirection: "column", alignItems: "center", gap: 70 }}>
				<div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 60, width: "100%" }}>
					<div style={{ background: "rgba(36,43,61,0.79)", display: "flex", alignItems: "center", justifyContent: "center", gap: 6.266, padding: "4.699px 7.832px", borderRadius: 28.196 }}>
						<div style={{ width: 9.399, height: 9.399, flexShrink: 0 }}><img src={A.pillDot} alt="" style={{ width: "100%", height: "100%" }} /></div>
						<p style={{ fontFamily: SR, fontWeight: 300, fontSize: 12, lineHeight: "12px", color: "#fff", margin: 0, whiteSpace: "nowrap" }}>How it works</p>
						<div style={{ width: 10.338, height: 8.615, flexShrink: 0 }}><img src={A.pillArrow} alt="" style={{ width: "100%", height: "100%" }} /></div>
					</div>
					<div style={{ fontFamily: SQ, fontSize: 30, textAlign: "center", width: "100%" }}>
						<p style={{ margin: 0, lineHeight: "35px", whiteSpace: "nowrap" }}>Three Swipes to</p>
						<p style={{ margin: 0, lineHeight: "35px", whiteSpace: "nowrap" }}>Smarter Investing.</p>
					</div>
				</div>
				<div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 83.805 }}>
					<div style={{ display: "flex", flexDirection: "column", gap: 12.952, alignItems: "flex-start" }}>
						<MobileHowCard390 num="01/" title="Tell Us Who You Are" body={"Take a quick risk quiz. STAK learns your personality, your goals, and your vibe.\nNo spreadsheets. No jargon."} bottom={28.19} />
						<MobileHowCard390 num="02/" title="Swipe Through Stocks" body="Like a stock? Swipe right. Not feeling it? Swipe left. Want to know more? Swipe up. It's that simple." bottom={24.38} />
						<MobileHowCard390 num="03/" title="STAK Before You Spend" body="Practice with real market data and zero real money. Build confidence before you commit a single dollar." bottom={24.38} />
					</div>
					<button type="button" onClick={onSignup} style={{ ...btnReset, border: CTA_BORDER, background: CTA_GRADIENT, borderRadius: 4.404, padding: "5.505px 11.011px", display: "flex", alignItems: "center", justifyContent: "center", gap: 5.505, filter: CTA_SHADOW, cursor: "pointer" }}>
						<span style={{ fontFamily: SR, fontWeight: 400, fontSize: 13.714, color: "#fff", whiteSpace: "nowrap" }}>Explore STAK</span>
						<div style={{ width: 14.48, height: 12.067, flexShrink: 0 }}><img src={A.ctaArrow} alt="" style={{ width: "100%", height: "100%" }} /></div>
					</button>
				</div>
			</div>
		</section>
	);
}

function MobileFeatures390({ onSignup }: { onSignup: () => void }) {
	const card: CSSProperties = { background: "#10172a", width: 295, height: 338, borderRadius: 6.104, overflow: "hidden", position: "relative", flexShrink: 0 };
	const titleS: CSSProperties = { fontFamily: SR, fontWeight: 600, fontSize: 16, color: "#fff", margin: 0, lineHeight: "normal" };
	const bodyS: CSSProperties = { fontFamily: SR, fontWeight: 300, fontSize: 11, color: "rgba(255,255,255,0.62)", lineHeight: "normal", whiteSpace: "pre-line", margin: 0 };
	const renderPhone = (variant: 1 | 2) => (
		<div style={{ position: "absolute", left: 20.3, top: 24.2, width: 515.477, height: 490.504, transform: "scale(0.4928)", transformOrigin: "top left" }}>
			<div style={{ position: "relative", width: "100%", height: "100%" }}><PhoneMockup variant={variant} /></div>
		</div>
	);
	const renderStack = () => (
		<div style={{ position: "absolute", left: "50%", top: "calc(50% - 33.65px)", transform: "translate(-50%, -50%)", width: 205.149, height: 114.138 }}>
			<div style={{ position: "absolute", left: 111.38, top: 9.38, width: 93.766, height: 104.753, display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ transform: "rotate(12.75deg)", width: 75.71, height: 90.27, background: "#b4b4b4", borderRadius: 5.824 }} /></div>
			<div style={{ position: "absolute", left: 57.72, top: 0, width: 89.739, height: 106.996, background: "#d9d9d9", borderRadius: 6.903 }} />
			<div style={{ position: "absolute", left: 0, top: 8.65, width: 93.765, height: 104.753, display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ transform: "rotate(-12.75deg)", width: 75.71, height: 90.27, background: "rgba(217,217,217,0.8)", borderRadius: 5.824 }} /></div>
		</div>
	);
	const phoneCard = (variant: 1 | 2, title: string, body: string) => (
		<div style={card}>
			{renderPhone(variant)}
			<div style={{ position: "absolute", left: "50%", top: "calc(50% + 101.7px)", transform: "translate(-50%, -50%)", display: "flex", flexDirection: "column", gap: 9.281, alignItems: "flex-start", width: 259 }}>
				<p style={titleS}>{title}</p>
				<p style={{ ...bodyS, width: 231 }}>{body}</p>
			</div>
		</div>
	);
	const stackCard = (title: string, body: string) => (
		<div style={card}>
			{renderStack()}
			<div style={{ position: "absolute", left: "50%", top: "calc(50% + 101.7px)", transform: "translate(-50%, -50%)", display: "flex", flexDirection: "column", gap: 9.281, alignItems: "flex-start", width: 259 }}>
				<p style={titleS}>{title}</p>
				<p style={{ ...bodyS, width: 259 }}>{body}</p>
			</div>
		</div>
	);
	return (
		<section style={{ position: "absolute", left: 0, top: 3539, width: MOBILE390_WIDTH, height: 1934, background: SECTION_BG, overflow: "hidden" }}>
			<div style={{ position: "absolute", left: 41.5, top: 70, width: 308, display: "flex", flexDirection: "column", alignItems: "center", gap: 70 }}>
				<div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 60, width: "100%" }}>
					<div style={{ background: "rgba(36,43,61,0.79)", display: "flex", alignItems: "center", justifyContent: "center", gap: 6.266, padding: "4.699px 7.832px", borderRadius: 28.196 }}>
						<div style={{ width: 9.399, height: 9.399, flexShrink: 0 }}><img src={A.pillDot} alt="" style={{ width: "100%", height: "100%" }} /></div>
						<p style={{ fontFamily: SR, fontWeight: 300, fontSize: 12, lineHeight: "12px", color: "#fff", margin: 0, whiteSpace: "nowrap" }}>Features</p>
						<div style={{ width: 10.338, height: 8.615, flexShrink: 0 }}><img src={A.pillArrow} alt="" style={{ width: "100%", height: "100%" }} /></div>
					</div>
					<div style={{ fontFamily: SQ, fontSize: 30, color: "#fff", textAlign: "center", width: "100%", lineHeight: "35px" }}>
						<p style={{ margin: 0 }}>Everything You Need.</p>
						<p style={{ margin: 0 }}>Nothing You Don't.</p>
					</div>
				</div>
				<div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 83.805 }}>
					<div style={{ display: "flex", flexDirection: "column", gap: 13.922 }}>
						{phoneCard(1, "Trends", "See what's moving, what's hot, and what the market is actually doing — in plain English. Stay in the loop without the noise")}
						{stackCard("Swipe Deck", "Discover stocks the way you discover everything else by swiping. Right to STAK it. Left to pass. Up to go deeper. Your feed,\nyour pace.")}
						{phoneCard(2, "Intel Injections", "Bite-sized lessons delivered in-app, right when you need them. No textbooks. No boring lectures. Just context that makes you smarter on the spot.")}
						{stackCard("Simulated STAK", "Buy. Sell. Watch. Learn. All with fake money, real market data. Zero risk, full experience. Build your portfolio before it counts.")}
					</div>
					<button type="button" onClick={onSignup} style={{ ...btnReset, border: CTA_BORDER, background: CTA_GRADIENT, borderRadius: 4.404, padding: "5.505px 11.011px", display: "flex", alignItems: "center", justifyContent: "center", gap: 5.505, filter: CTA_SHADOW, cursor: "pointer" }}>
						<span style={{ fontFamily: SR, fontWeight: 400, fontSize: 13.714, color: "#fff", whiteSpace: "nowrap" }}>Explore STAK</span>
						<div style={{ width: 14.48, height: 12.067, flexShrink: 0 }}><img src={A.ctaArrow} alt="" style={{ width: "100%", height: "100%" }} /></div>
					</button>
				</div>
			</div>
		</section>
	);
}

function MobileEarlyMomentum390({ onSignup }: { onSignup: () => void }) {
	const bubble = (text: string, dark: boolean, key: number) => (
		<div key={key} style={{ background: dark ? "rgba(169,191,254,0.37)" : "#fff", width: 197.542, height: 55.871, borderRadius: 41.903, overflow: "hidden", position: "relative", flexShrink: 0 }}>
			<div style={{ position: "absolute", left: 11.97, top: 8.98, display: "flex", alignItems: "center", gap: 19.954 }}>
				<div style={{ width: 37.912, height: 37.912, borderRadius: 49.884, overflow: "hidden", flexShrink: 0 }}>
					<img src={A.emAvatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 49.884 }} />
				</div>
				<p style={{ fontFamily: SR, fontWeight: 300, fontSize: 8.182, color: dark ? "#fff" : "#323232", whiteSpace: "nowrap", margin: 0 }}>{text}</p>
			</div>
		</div>
	);
	const r1: [string, boolean][] = [["Lets fvking STAK i!", false], ["Time to save more!", true], ["Woooo!!", false], ["Lets fvking STAK i!", false], ["Lets fvking STAK i!", false]];
	const r2: [string, boolean][] = [["Bullish! on S&P 500", false], ["I love printing money", true], ["Gold, Google", false], ["Lets fvking STAK i!", false], ["Lets fvking STAK i!", false]];
	const r3: [string, boolean][] = [["Whats the Buzz About?", true], ["Is $Tsla a good buy?", false], ["Lets fvking STAK i!", true], ["Lets fvking STAK i!", false], ["Lets fvking STAK i!", false]];
	const stat = (num: string, label: string) => (
		<div style={{ display: "flex", flexDirection: "column", gap: 0.838, alignItems: "center", justifyContent: "center" }}>
			<div style={{ display: "flex", alignItems: "center" }}>
				<div style={{ width: 16.347, height: 19.616, flexShrink: 0 }}><img src={A.emStatArrow} alt="" style={{ width: "100%", height: "100%" }} /></div>
				<p style={{ fontFamily: SQ, fontSize: 43.589, color: "#fff", margin: 0, lineHeight: "normal", whiteSpace: "nowrap" }}>{num}</p>
			</div>
			<p style={{ fontFamily: SR, fontWeight: 400, fontSize: 11, color: "#f5f1f1", margin: 0, textAlign: "center", width: 155 }}>{label}</p>
		</div>
	);
	return (
		<section style={{ position: "absolute", left: 0, top: 5473, width: MOBILE390_WIDTH, height: 883, background: SECTION_BG, overflow: "hidden" }}>
			<div style={{ position: "absolute", left: 41.5, top: 70, width: 308, display: "flex", flexDirection: "column", alignItems: "center", gap: 60 }}>
				<div style={{ background: "rgba(36,43,61,0.79)", display: "flex", alignItems: "center", justifyContent: "center", gap: 6.266, padding: "4.699px 7.832px", borderRadius: 28.196 }}>
					<div style={{ width: 9.399, height: 9.399, flexShrink: 0 }}><img src={A.pillDot} alt="" style={{ width: "100%", height: "100%" }} /></div>
					<p style={{ fontFamily: SR, fontWeight: 300, fontSize: 12, lineHeight: "12px", color: "#fff", margin: 0, whiteSpace: "nowrap" }}>Early Momentum</p>
					<div style={{ width: 10.338, height: 8.615, flexShrink: 0 }}><img src={A.pillArrow} alt="" style={{ width: "100%", height: "100%" }} /></div>
				</div>
				<div style={{ fontFamily: SQ, fontSize: 30, color: "#fff", textAlign: "center", width: 298 }}>
					<p style={{ margin: 0, lineHeight: "35px" }}>Real People.</p>
					<p style={{ margin: 0, lineHeight: "35px" }}>Real Momentum.</p>
				</div>
			</div>
			<div style={{ position: "absolute", left: 30.37, top: 358.8, display: "flex", gap: 10.52 }}>{r1.map(([t, d], i) => bubble(t, d, i))}</div>
			<div style={{ position: "absolute", left: 82.97, top: 435.36, display: "flex", gap: 10.52 }}>{r3.map(([t, d], i) => bubble(t, d, i))}</div>
			<div style={{ position: "absolute", left: 23.94, top: 511.92, display: "flex", gap: 10.52 }}>{r2.map(([t, d], i) => bubble(t, d, i))}</div>
			<div style={{ position: "absolute", left: -1.78, top: 358.8, width: 183.516, height: 209.231, background: "linear-gradient(to right, rgba(10,16,32,1) 0%, rgba(18,29,58,0.75) 25%, rgba(26,42,83,0.5) 50%, rgba(34,54,108,0.25) 75%, rgba(42,67,134,0) 100%)", pointerEvents: "none" }} />
			<div style={{ position: "absolute", left: "calc(50% - 0.03px)", top: 623.22, transform: "translateX(-50%)", display: "flex", gap: 27.243, alignItems: "flex-start" }}>
				{stat("50M+", "Millennials & Gen Z investing today")}
				{stat("30M+", "Investors seeking better tools")}
			</div>
			<button type="button" onClick={onSignup} style={{ ...btnReset, position: "absolute", left: "50%", top: 785.1, transform: "translateX(-50%)", background: CTA_GRADIENT, border: "0.275px solid rgba(101,158,173,0.63)", borderRadius: 4.404, padding: "5.505px 11.011px", display: "flex", alignItems: "center", justifyContent: "center", gap: 5.505, filter: CTA_SHADOW, cursor: "pointer" }}>
				<span style={{ fontFamily: SR, fontWeight: 400, fontSize: 13.714, color: "#fff", whiteSpace: "nowrap" }}>Join our Community</span>
				<div style={{ width: 14.48, height: 12.067, flexShrink: 0 }}><img src={A.ctaArrow} alt="" style={{ width: "100%", height: "100%" }} /></div>
			</button>
		</section>
	);
}

function MobileFaq390({ onEmail }: { onEmail: () => void }) {
	const [openIdx, setOpenIdx] = useState<number | null>(null);
	return (
		<section style={{ position: "absolute", left: 0, top: 6356, width: MOBILE390_WIDTH, height: 1230, background: SECTION_BG, overflow: "hidden" }}>
			<div style={{ position: "absolute", left: 41.5, top: 70, width: 308, display: "flex", flexDirection: "column", alignItems: "center", gap: 160 }}>
				<div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 60, width: "100%" }}>
					<Pill label="STAK FAQ" />
					<div style={{ display: "flex", flexDirection: "column", gap: 15, alignItems: "center", textAlign: "center", color: "#fff", width: "100%" }}>
						<p style={{ fontFamily: SQ, fontSize: 30, lineHeight: "35px", width: 298, margin: 0 }}>We’re here to answer all your questions.</p>
						<div style={{ fontFamily: SR, fontWeight: 300, fontSize: 16, width: 308 }}>
							<p style={{ margin: 0, lineHeight: "25px" }}>If you are new to world of stocks and financial discipline, STAK is built for you.</p>
						</div>
					</div>
				</div>
				<div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 83.805 }}>
					<div style={{ width: 306, display: "flex", flexDirection: "column", gap: 8 }}>
							{FAQS.map((f, i) => (
								<MobileFaqRow key={i} q={f.q} a={f.a} width={306} qSize={16} aSize={12} open={openIdx === i} onToggle={() => setOpenIdx((pv) => (pv === i ? null : i))} />
							))}
						</div>
					<div style={{ display: "flex", flexDirection: "column", gap: 30, alignItems: "center" }}>
						<p style={{ fontFamily: SR, fontWeight: 300, fontSize: 18, lineHeight: "25px", color: "#fff", margin: 0, whiteSpace: "nowrap" }}>Have more questions?</p>
						<button type="button" onClick={onEmail} style={{ ...btnReset, background: CTA_GRADIENT, border: CTA_BORDER, borderRadius: 5.781, padding: "7.226px 14.453px", display: "flex", alignItems: "center", justifyContent: "center", gap: 7.226, filter: CTA_SHADOW, cursor: "pointer" }}>
							<span style={{ fontFamily: SR, fontWeight: 400, fontSize: 14.453, color: "#fff", whiteSpace: "nowrap" }}>Email Us</span>
							<div style={{ width: 13.775, height: 11.48, flexShrink: 0 }}><img src={A.ctaArrow} alt="" style={{ width: "100%", height: "100%" }} /></div>
						</button>
					</div>
				</div>
			</div>
		</section>
	);
}

function MobileFinalCta390() {
	const tb: CSSProperties = { width: 182.724, height: 97.944, borderRadius: 6.319, overflow: "hidden", position: "relative", flexShrink: 0 };
	const imgTile = (src: string, st: CSSProperties, key: number) => <div key={key} style={{ ...tb, background: "#172037" }}><img src={src} alt="" style={{ position: "absolute", objectFit: "cover", maxWidth: "none", ...st }} /></div>;
	const maskTile = (src: string, st: CSSProperties, mpos: string, key: number) => (
		<div key={key} style={tb}>
			<div style={{ position: "absolute", WebkitMaskImage: `url(${A.ctaMqMask})`, maskImage: `url(${A.ctaMqMask})`, WebkitMaskSize: "182.724px 97.944px", maskSize: "182.724px 97.944px", WebkitMaskPosition: mpos, maskPosition: mpos, WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat", ...st }}>
				<img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
			</div>
		</div>
	);
	const txt = (t: string, key: number) => <div key={key} style={tb}><p style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", fontFamily: SQ, fontSize: 42.126, color: "#fff", margin: 0, whiteSpace: "nowrap", lineHeight: "23.696px" }}>{t}</p></div>;
	const emptyTile = (key: number) => <div key={key} style={{ ...tb, background: "#172037" }} />;
	const row = (tiles: React.ReactNode[], left: string, top: number, w: number) => (
		<div style={{ position: "absolute", left, top, transform: "translateX(-50%)", width: w, display: "flex", gap: 10.532, alignItems: "center" }}>{tiles}</div>
	);
	return (
		<section style={{ position: "absolute", left: 0, top: 7586, width: MOBILE390_WIDTH, height: 1067, background: SECTION_BG, overflow: "hidden" }}>
			<div style={{ position: "absolute", left: 41.5, top: 70, width: 308, display: "flex", flexDirection: "column", alignItems: "center", gap: 60, zIndex: 2 }}>
				<div style={{ background: "rgba(36,43,61,0.79)", display: "flex", alignItems: "center", justifyContent: "center", gap: 6.266, padding: "4.699px 7.832px", borderRadius: 28.196 }}>
					<div style={{ width: 9.399, height: 9.399, flexShrink: 0 }}><img src={A.pillDot} alt="" style={{ width: "100%", height: "100%" }} /></div>
					<p style={{ fontFamily: SR, fontWeight: 300, fontSize: 14, lineHeight: "12px", color: "#fff", margin: 0, whiteSpace: "nowrap" }}>Our growing community</p>
					<div style={{ width: 10.338, height: 8.615, flexShrink: 0 }}><img src={A.pillArrow} alt="" style={{ width: "100%", height: "100%" }} /></div>
				</div>
				<div style={{ display: "flex", flexDirection: "column", gap: 15, alignItems: "center", textAlign: "center", color: "#fff", width: "100%" }}>
					<div style={{ fontFamily: SQ, fontSize: 30, width: 298 }}>
						<p style={{ margin: 0, lineHeight: "35px" }}>Our community of fast rising </p>
						<p style={{ margin: 0, lineHeight: "35px" }}>young investors</p>
					</div>
					<div style={{ fontFamily: SR, fontWeight: 300, fontSize: 16, width: 308 }}>
						<p style={{ margin: 0, lineHeight: "25px" }}>Join a generation that invests with confidence. Sign up free and start STAKing today.</p>
					</div>
				</div>
			</div>
			{row([
				maskTile(A.ctaMqA8, { left: "calc(50% + 0.53px)", top: "calc(50% + 45.14px)", transform: "translate(-50%,-50%)", width: 190.078, height: 285.117 }, "3.143px 48.45px", 0),
				txt("STAK", 1),
				maskTile(A.ctaMq9e, { left: -1.58, top: -58.45, width: 185.744, height: 278.035 }, "1.577px 58.453px", 2),
				imgTile(A.ctaMqF7, { left: "calc(50% - 0.23px)", top: "calc(50% + 36.6px)", transform: "translate(-50%,-50%)", width: 238.083, height: 237.488 }, 3),
			], "calc(50% + 147.05px)", 504.4, 762.489)}
			{row([
				imgTile(A.ctaMq85, { left: "calc(50% + 0.09px)", top: "calc(50% + 13.43px)", transform: "translate(-50%,-50%)", width: 197.643, height: 296.465 }, 0),
				maskTile(A.ctaMqC5, { left: -6.26, top: -18.43, width: 197.939, height: 262.653 }, "6.261px 18.429px", 1),
				imgTile(A.ctaMq85, { left: "calc(50% + 0.09px)", top: "calc(50% + 13.43px)", transform: "translate(-50%,-50%)", width: 197.643, height: 296.465 }, 2),
				txt("IT", 3),
				imgTile(A.ctaMq4a, { left: -23.17, top: -247.5, width: 265.36, height: 494.46 }, 4),
				emptyTile(5),
			], "calc(50% + 200.5px)", 617.09, 1149)}
			{row([
				imgTile(A.ctaMq02, { left: -36.86, top: -12.64, width: 239.068, height: 239.068 }, 0),
				txt("UP", 1),
				imgTile(A.ctaMqE0, { left: "calc(50% + 0.26px)", top: "calc(50% - 5.79px)", transform: "translate(-50%,-50%)", width: 218.005, height: 218.005 }, 2),
				imgTile(A.ctaMqBb, { left: -12.11, top: -68.45, width: 206.42, height: 294.485 }, 3),
				maskTile(A.ctaMqC5, { left: -6.26, top: -18.43, width: 197.939, height: 262.653 }, "6.256px 18.435px", 4),
			], "calc(50% + 159.69px)", 729.78, 955.745)}
		</section>
	);
}

function MobileFooter390({ onSubscribe }: { onSubscribe: (email: string) => void }) {
	const [email, setEmail] = useState("");
	const linkCol = (title: string, items: string[]) => (
		<div style={{ display: "flex", flexDirection: "column", gap: 30, alignItems: "flex-start", width: 135 }}>
			<p style={{ fontFamily: SR, fontWeight: 600, fontSize: 16, color: "#fff", margin: 0, lineHeight: "25px", whiteSpace: "nowrap" }}>{title}</p>
			<div style={{ display: "flex", flexDirection: "column", gap: 14, fontFamily: SR, fontWeight: 300, fontSize: 16, color: "#fff", lineHeight: "25px" }}>
				{items.map((it, i) => <p key={i} style={{ margin: 0, whiteSpace: "nowrap", ...(it === "Home" ? { fontSize: 14 } : {}) }}>{it}</p>)}
			</div>
		</div>
	);
	return (
		<section style={{ position: "absolute", left: 0, top: 8653, width: MOBILE390_WIDTH, height: 1173.93, background: SECTION_BG, overflow: "hidden", display: "flex", flexDirection: "column", alignItems: "center", paddingLeft: 24, paddingRight: 24, boxSizing: "border-box" }}>
			<div style={{ display: "flex", flexDirection: "column", gap: 58, alignItems: "flex-start", padding: "40px 0", width: "100%" }}>
				<div style={{ display: "flex", flexDirection: "column", gap: 59, alignItems: "flex-start", justifyContent: "center", width: 310 }}>
					<div style={{ display: "flex", flexDirection: "column", gap: 40, alignItems: "flex-start", width: "100%" }}>
						<div style={{ position: "relative", width: 109.131, height: 26.479 }}>
							<div style={{ position: "absolute", left: 0, top: 0, width: 26.478, height: 26.479 }}><img src={A.footerLogoIcon} alt="STAK" style={{ width: "100%", height: "100%" }} /></div>
							<div style={{ position: "absolute", left: 30.97, top: 5.76, width: 78.163, height: 14.983 }}><img src={A.footerLogoWord} alt="" style={{ width: "100%", height: "100%" }} /></div>
						</div>
						<div style={{ fontFamily: SR, fontWeight: 300, fontSize: 14, color: "#fff", width: "100%" }}>
							<p style={{ margin: 0, lineHeight: "25px" }}>{`You've heard the advice — "invest early, invest often." But nobody tells you how. Every platform you open hits you with charts, tickers, and jargon that feels`}</p>
							<p style={{ margin: 0, lineHeight: "25px" }}>designed to make you feel dumb</p>
						</div>
					</div>
					<div style={{ display: "flex", gap: 15, alignItems: "center" }}>
						<div style={{ background: "#fff", border: "1px solid #000", height: 40, width: 120, borderRadius: 6, overflow: "hidden", position: "relative", flexShrink: 0 }}>
							<div style={{ position: "absolute", left: 7, top: 7, width: 21, height: 24 }}><img src={A.footerPlay} alt="" style={{ width: "100%", height: "100%" }} /></div>
							<div style={{ position: "absolute", left: 35, top: 4, display: "flex", flexDirection: "column", gap: 3, alignItems: "flex-start" }}>
								<p style={{ fontFamily: "'Product Sans', Arial, sans-serif", fontSize: 10, color: "#000", margin: 0, textTransform: "uppercase", lineHeight: "normal" }}>GET IT ON</p>
								<div style={{ width: 74, height: 15, transform: "scaleY(-1)" }}><img src={A.footerPlayText} alt="Google Play" style={{ width: "100%", height: "100%" }} /></div>
							</div>
						</div>
						<div style={{ background: "#fff", border: "1px solid #000", height: 40, width: 120, borderRadius: 6, overflow: "hidden", position: "relative", flexShrink: 0 }}>
							<div style={{ position: "absolute", left: 7, top: 7, width: 20, height: 24 }}><img src={A.footerApple} alt="" style={{ width: "100%", height: "100%" }} /></div>
							<div style={{ position: "absolute", left: 35, top: "50%", transform: "translateY(-50%)", display: "flex", flexDirection: "column", alignItems: "flex-start", color: "#000", width: 78 }}>
								<p style={{ fontFamily: "'SF Compact Text', -apple-system, sans-serif", fontWeight: 500, fontSize: 9, margin: 0, lineHeight: "9px" }}>Download on the</p>
								<p style={{ fontFamily: "'SF Compact Display', -apple-system, sans-serif", fontWeight: 500, fontSize: 18, margin: 0, lineHeight: "1", letterSpacing: -0.47 }}>App Store</p>
							</div>
						</div>
					</div>
				</div>
				{linkCol("Useful Links", ["Home", "How it works", "Features", "FAQ", "Privacy terms"])}
				{linkCol("Social Links", ["Facebook", "Instagram", "X", "Tiktok", "Discord"])}
				<div style={{ display: "flex", flexDirection: "column", gap: 51, alignItems: "flex-start" }}>
					<div style={{ display: "flex", flexDirection: "column", gap: 24, alignItems: "flex-start" }}>
						<p style={{ fontFamily: SR, fontWeight: 400, fontSize: 16, lineHeight: "25px", color: "#fff", margin: 0, whiteSpace: "pre" }}>Subscribe to our newsletter</p>
						<div style={{ background: "rgba(255,255,255,0.07)", display: "flex", alignItems: "center", padding: "8px 9px 8px 11px", borderRadius: 13 }}>
							<div style={{ display: "flex", gap: 14, alignItems: "center" }}>
								<input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Your email address" style={{ background: "transparent", border: "none", outline: "none", fontFamily: SR, fontWeight: 300, fontSize: 12, lineHeight: "25px", color: "#fff", width: 120 }} />
								<button type="button" onClick={() => onSubscribe(email)} style={{ ...btnReset, background: CTA_GRADIENT, border: "0.361px solid rgba(101,158,173,0.63)", borderRadius: 5.781, padding: "7.226px 14.453px", filter: CTA_SHADOW, cursor: "pointer", flexShrink: 0 }}>
									<span style={{ fontFamily: SR, fontWeight: 400, fontSize: 14.453, lineHeight: "normal", color: "#fff", whiteSpace: "nowrap" }}>Subscribe</span>
								</button>
							</div>
						</div>
					</div>
					<p style={{ fontFamily: SR, fontWeight: 300, fontSize: 12, lineHeight: "1", color: "#fff", margin: 0, whiteSpace: "nowrap" }}>© 2026 All rights reserved</p>
				</div>
			</div>
		</section>
	);
}

function MobileLanding390({ scale, onSignup, onEmail, onSubscribe, onScrollTo }: { scale: number; onSignup: () => void; onEmail: () => void; onSubscribe: (email: string) => void; onScrollTo: (k: keyof typeof SEC) => void }) {
	// 390px phone canvas (Figma node 1:1586 / Frame 222). Height grows as sections are added.
	void onEmail; void onSubscribe;
	const H = 9826.93;
	return (
		<div className="landing-wrapper" style={{ width: "100%", height: H * scale, overflow: "hidden", display: "flex", justifyContent: "center", alignItems: "flex-start" }}>
			<div className="landing-canvas" style={{ width: MOBILE390_WIDTH, height: H, position: "relative", flexShrink: 0, background: SECTION_BG, transform: `scale(${scale})`, transformOrigin: "top center" }}>
				<MobileHero390 onSignup={onSignup} onScrollTo={onScrollTo} />
				<MobileProofStrip390 />
				<MobileProblem390 onSignup={onSignup} />
				<MobileHowItWorks390 onSignup={onSignup} />
				<MobileFeatures390 onSignup={onSignup} />
				<MobileEarlyMomentum390 onSignup={onSignup} />
				<MobileFaq390 onEmail={onEmail} />
				<MobileFinalCta390 />
				<MobileFooter390 onSubscribe={onSubscribe} />
			</div>
		</div>
	);
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  ROOT: LandingPage                                                   */
/* ═══════════════════════════════════════════════════════════════════ */
export function LandingPage() {
	const { user, loading, onboardingCompleted } = useAuth();
	const navigate = useNavigate();
	const scrollRef = useRef<HTMLDivElement>(null);
	const [vw, setVw] = useState(() => (typeof window !== "undefined" ? window.innerWidth : CANVAS_WIDTH));

	useEffect(() => {
		if (!loading && user) {
			navigate({ to: onboardingCompleted ? "/" : "/onboarding" });
		}
	}, [user, loading, navigate, onboardingCompleted]);

	useEffect(() => {
		/* Measure the scroll container's clientWidth — NOT window.innerWidth — so the
		   canvas is sized to the area the user actually sees. innerWidth includes the
		   vertical scrollbar (~17px on Windows), which made the canvas ~17px too wide
		   and cropped the right edge. ResizeObserver also catches scrollbar appear/
		   disappear and OS zoom changes, not just window resizes. */
		const compute = () => setVw(scrollRef.current ? scrollRef.current.clientWidth : window.innerWidth);
		compute();
		window.addEventListener("resize", compute);
		const ro = typeof ResizeObserver !== "undefined" && scrollRef.current ? new ResizeObserver(compute) : null;
		if (ro && scrollRef.current) ro.observe(scrollRef.current);
		return () => {
			window.removeEventListener("resize", compute);
			if (ro) ro.disconnect();
		};
	}, []);

	// Below 850px → dedicated mobile layout (Figma node 1:1123, 810px canvas);
	// otherwise the wide desktop canvas (1400px). Each scales to fit its width.
	const isPhone = vw < 600;
	const isMobile = vw <= 1024; // Figma-810 tablet view covers all iPad portraits + standard iPad landscape
	const scale = isPhone ? vw / MOBILE390_WIDTH : isMobile ? vw / MOBILE_WIDTH : vw / CANVAS_WIDTH;

	const scrollTo = useCallback((key: keyof typeof SEC) => {
		const el = scrollRef.current;
		if (!el) return;
		const w = el.clientWidth;
		/* Per-layout section anchors — each breakpoint has its own canvas with its
		   own section tops, so links must scroll against the ACTIVE layout. */
		const PHONE_SEC: Record<keyof typeof SEC, number> = { hero: 0, problem: 1040, howItWorks: 1964, features: 3539, earlyMomentum: 5473, faq: 6356, finalCta: 7586, footer: 8653 };
		const TABLET_SEC: Record<keyof typeof SEC, number> = { hero: 0, problem: 1039, howItWorks: 2080, features: 3298, earlyMomentum: 4483, faq: 5356, finalCta: 6592, footer: 7828 };
		const top = w < 600 ? PHONE_SEC[key] * (w / MOBILE390_WIDTH) : w <= 1024 ? TABLET_SEC[key] * (w / MOBILE_WIDTH) : SEC[key] * (w / CANVAS_WIDTH);
		el.scrollTo({ top, behavior: "smooth" });
	}, []);

	const handleLogin = useCallback(() => navigate({ to: "/login" }), [navigate]);
	const handleSignup = useCallback(() => navigate({ to: "/signup" }), [navigate]);
	const handleEmail = useCallback(() => {
		window.location.href = "mailto:hello@stakstocks.com";
	}, []);
	const handleSubscribe = useCallback((email: string) => {
		if (!email) return;
		window.location.href = `mailto:hello@stakstocks.com?subject=Newsletter%20signup&body=${encodeURIComponent(email)}`;
	}, []);

	return (
		<div ref={scrollRef} style={{ background: SECTION_BG, height: "100vh", overflowY: "auto", overflowX: "hidden" }}>
			<link
				href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@400;500;600;700&family=Sora:wght@300;400;600;700&display=swap"
				rel="stylesheet"
			/>
			<style>{`
				@font-face {
					font-family: "Squarish Sans CT";
					src: url("/fonts/squarish-sans-ct.ttf") format("truetype");
					font-weight: 400 800;
					font-display: swap;
				}
				@font-face {
					font-family: "Squarish Sans CT SC";
					src: url("/fonts/squarish-sans-ct-sc.ttf") format("truetype");
					font-weight: 400 800;
					font-display: swap;
				}
				.landing-canvas input::placeholder {
					color: rgba(255,255,255,0.53);
				}
			`}</style>
			{isPhone ? (
				<MobileLanding390 scale={scale} onSignup={handleSignup} onEmail={handleEmail} onSubscribe={handleSubscribe} onScrollTo={scrollTo} />
			) : isMobile ? (
				<MobileLanding scale={scale} onSignup={handleSignup} onEmail={handleEmail} onSubscribe={handleSubscribe} onScrollTo={scrollTo} />
			) : (
			<div className="landing-wrapper" style={{ width: "100%", height: TOTAL_HEIGHT * scale, overflow: "hidden", display: "flex", justifyContent: "center", alignItems: "flex-start" }}>
				<div
					className="landing-canvas"
					style={{
						width: CANVAS_WIDTH,
						height: TOTAL_HEIGHT,
						position: "relative",
						flexShrink: 0,
						background: SECTION_BG,
						transform: `scale(${scale})`,
						transformOrigin: "top center",
					}}
				>
					<Hero onLogin={handleLogin} onSignup={handleSignup} onScrollTo={scrollTo} />
					<Problem onSignup={handleSignup} />
					<HowItWorks onScrollTo={scrollTo} />
					<Features onScrollTo={scrollTo} />
					<EarlyMomentum onSignup={handleSignup} />
					<Faq onEmail={handleEmail} />
					<FinalCta />
					<Footer onSubscribe={handleSubscribe} onScrollTo={scrollTo} />
				</div>
			</div>
			)}
		</div>
	);
}
