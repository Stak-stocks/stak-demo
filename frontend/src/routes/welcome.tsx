import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useAuth } from "../context/AuthContext";
import { useAccount } from "../context/AccountContext";
import { createContext, useContext, useEffect, useLayoutEffect, useState, useRef, useCallback, type CSSProperties, type ReactNode, type Ref } from "react";
import { EarlyAccessModal, INSTAGRAM_URL } from "../components/landing/EarlyAccessModal";

export const Route = createFileRoute("/welcome")({
	component: LandingPage,
	// ?join=1 (Sign in's "Get early access", or a brand-new account turned away) opens the early-access form.
	validateSearch: (search: Record<string, unknown>): { join?: "1" } => (search.join === "1" || search.join === 1 ? { join: "1" } : {}),
});

/* ─── LAYOUT ────────────────────────────────────────────────────────────
   One page that flows (WCAG 1.4.4 / 1.4.10 / 1.4.12): real text sizes, wrapping lines and no fixed text boxes, so
   browser zoom, larger text and wider spacing all reflow instead of being scaled away. The three Figma frames
   (390 phone, 810 tablet, 1400 desktop) set each width's look; the width in CSS px picks one, so zooming in on a
   desktop moves to the tablet and then the phone layout, as a phone would show it. */
type Layout = "phone" | "tablet" | "desktop";
const layoutFor = (width: number): Layout => (width < 600 ? "phone" : width <= 1024 ? "tablet" : "desktop");
const LayoutContext = createContext<Layout>("desktop");
const useLayout = () => useContext(LayoutContext);

/** Each layout's section rhythm, from its Figma frame. `introW` is the width of a section's pill, heading and lead;
 *  `introGap` the space between those and the section's content. */
const TOKENS = {
	phone: { gutter: 16, padTop: 70, pillGap: 60, hSize: 30, hLine: 35, subSize: 16, subGap: 15, introW: 308, introGap: 70 },
	tablet: { gutter: 24, padTop: 110, pillGap: 60, hSize: 32, hLine: 45, subSize: 16, subGap: 15, introW: 601, introGap: 108 },
	desktop: { gutter: 24, padTop: 70, pillGap: 77, hSize: 40, hLine: 45, subSize: 20, subGap: 20, introW: 926, introGap: 159 },
} as const;

/** The phone frame's full text width (390 less its gutters). */
const PHONE_WIDE = 358;

/** The page's sections, in order; a nav or footer link scrolls to one. */
type SectionKey = "hero" | "problem" | "howItWorks" | "features" | "earlyMomentum" | "faq" | "finalCta";
const sectionId = (k: SectionKey) => `landing-${k}`;

/** Opens the "Get early access" modal; provided once by LandingPage so every layout's hero pill can use it. */
const EarlyAccessContext = createContext<() => void>(() => {});

/* ─── ASSETS (downloaded from Figma to /public/images/landing-v2/) ──── */
const A = {
	// Hero
	boxM390: "/images/landing-v2/hero-box-frame124-m390-2x.webp",
	boxT810: "/images/landing-v2/hero-box-frame124-t810-2x.webp",
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
	proofBwIcon: "/images/landing-v2/proof-bw-icon.svg",
	proofBwWord: "/images/landing-v2/proof-bw-word.svg",
	proofBrexMain: "/images/landing-v2/proof-brex-main.svg",
	proofBrexDetail: "/images/landing-v2/proof-brex-detail.svg",
	proofBetterStack: "/images/landing-v2/proof-betterstack.png",
	proofDeel: "/images/landing-v2/proof-deel.png",
	ctaMqMask: "/images/landing-v2/cta-mq-mask.svg",
	navMenu: "/images/landing-v2/nav-button.svg",
	// Problem
	/** The STAK Home screen in a phone frame (Figma export, 2x, transparent). */
	problemPhone: "/images/landing-v2/problem-phone.webp",
	// How It Works
	/** Card art (Figma exports, 2x, transparent): the brand quiz, the swipe deck, My STAK. */
	how1: "/images/landing-v2/how-1.webp",
	how2: "/images/landing-v2/how-2.webp",
	how3: "/images/landing-v2/how-3.webp",
	// Features: the four app screens in phone frames (Figma exports, 2x, transparent)
	feat1: "/images/landing-v2/feat-1.webp",
	feat2: "/images/landing-v2/feat-2.webp",
	feat3: "/images/landing-v2/feat-3.webp",
	feat4: "/images/landing-v2/feat-4.webp",
	// Early Momentum
	emStatArrow: "/images/landing-v2/em-stat-arrow.svg",
	// The community photo mosaic (one copy of each photo; the tablet and phone crop them their own way)
	ctaTile1: "/images/landing-v2/cta-tile-1.webp",
	ctaTile2: "/images/landing-v2/cta-tile-2.webp",
	ctaTile3: "/images/landing-v2/cta-tile-3.webp",
	ctaTile4: "/images/landing-v2/cta-tile-4.webp",
	ctaTile5: "/images/landing-v2/cta-tile-5.webp",
	ctaTile6: "/images/landing-v2/cta-tile-6.webp",
	ctaTile7: "/images/landing-v2/cta-tile-7.webp",
	ctaTile8: "/images/landing-v2/cta-tile-8.webp",
	ctaTile9: "/images/landing-v2/cta-tile-9.webp",
	// Footer
	footerPlayText: "/images/landing-v2/footer-playstore-text.svg",
};

/* ─── FONTS ─────────────────────────────────────────────────────────── */
const SQ = "'Squarish Sans CT SC', 'Squarish Sans CT', sans-serif";
const SR = "'Sora', sans-serif";

/* ─── COMMON STYLES (exact Figma values) ────────────────────────────── */
const PILL_BG = "rgba(23,32,56,0.73)";
const SECTION_BG = "#0a1020";
const CARD_BG = "#10172a";
const BODY_DIM = "rgba(255,255,255,0.62)";

/** The label colour on the teal CTA gradient: navy, not white - white reads 1.4-3.3:1 on it, navy 5.7-13.6:1 (WCAG AA). */
const CTA_INK = "#0A1020";
const CTA_GRADIENT =
	"linear-gradient(180deg, rgba(169,219,234,0.82) 8.8889%, rgb(60,152,180) 44.444%), linear-gradient(90deg, rgb(44,157,188) 0%, rgb(44,157,188) 100%)";
const CTA_BORDER = "0.361px solid rgba(101,158,173,0.63)";
const CTA_SHADOW =
	"drop-shadow(0px 77.322px 10.839px rgba(105,179,202,0)) drop-shadow(0px 49.862px 9.756px rgba(105,179,202,0.01)) drop-shadow(0px 28.183px 8.31px rgba(105,179,202,0.05)) drop-shadow(0px 12.285px 6.142px rgba(105,179,202,0.09)) drop-shadow(0px 2.891px 3.252px rgba(105,179,202,0.10))";


const btnReset: CSSProperties = {
	background: "none",
	border: 0,
	padding: 0,
	margin: 0,
	color: "inherit",
	font: "inherit",
	cursor: "pointer",
	textAlign: "inherit",
};

/** A centred column `maxWidth` wide (plus the layout's gutters), so nothing touches the screen edge. */
function Column({ maxWidth, children, style }: { maxWidth: number; children: ReactNode; style?: CSSProperties }) {
	const { gutter } = TOKENS[useLayout()];
	return <div style={{ position: "relative", width: "100%", maxWidth: maxWidth + 2 * gutter, paddingInline: gutter, marginInline: "auto", boxSizing: "border-box", ...style }}>{children}</div>;
}

/* ─── REUSABLE: Pill badge ──────────────────────────────────────────── */
/* The small "section label" chip at the top of every section ("The Problem", "Features", "STAK FAQ"). Desktop:
   Figma 1:927 (dot + label). Phone and tablet: the smaller chip with an arrow. Its 12px line box reproduces
   Figma's cap-trimmed text, so the chip keeps the design's height. */
function Pill({ label, large = false }: { label: string; large?: boolean }) {
	const desktop = useLayout() === "desktop";
	if (desktop) {
		return (
			<div style={{ background: PILL_BG, display: "flex", alignItems: "center", gap: 12, padding: "5px 10px", borderRadius: 10 }}>
				<img src={A.pillDot} alt="" style={{ width: 12, height: 12, flexShrink: 0 }} />
				<p style={{ fontFamily: SR, fontWeight: 300, fontSize: 14, lineHeight: 1, color: "#fff", margin: 0, textAlign: "center" }}>{label}</p>
			</div>
		);
	}
	return <div style={CHIP}><ChipBody label={label} size={large ? 14 : 12} /></div>;
}

/** The phone and tablet chip: dot, words, arrow. At least 24px tall, a comfortable target where it's a button. */
const CHIP: CSSProperties = { background: "rgba(36,43,61,0.79)", display: "flex", alignItems: "center", justifyContent: "center", gap: 6.266, padding: "4.699px 7.832px", minHeight: 24, boxSizing: "border-box", borderRadius: 28.196, color: "#fff" };
function ChipBody({ label, size, desktop = false }: { label: string; size: number; desktop?: boolean }) {
	return (
		<>
			<img src={A.pillDot} alt="" style={{ width: desktop ? 12 : 9.399, height: desktop ? 12 : 9.399, flexShrink: 0 }} />
			{/* Figma trims the text box, so the chip is as tall as the letters: a line of 1. */}
			<span style={{ fontFamily: SR, fontWeight: 300, fontSize: size, lineHeight: 1, color: "#fff", textAlign: "center" }}>{label}</span>
			<img src={A.pillArrow} alt="" style={{ width: desktop ? 13.199 : 10.338, height: desktop ? 10.999 : 8.615, flexShrink: 0 }} />
		</>
	);
}

/* ─── REUSABLE: Section headline ──────────────────────────────────── */
/* A real heading (h1 for the hero, h2 for each section). Each design line is its own block, so the breaks hold where
   they fit and wrap where they don't. Focusable from script only: a nav link lands keyboard users here. */
function Headline({ id, lines, level = 2, size, lineHeight }: { id: string; lines: string[]; level?: 1 | 2; size?: number; lineHeight?: number }) {
	const t = TOKENS[useLayout()];
	const Tag = level === 1 ? "h1" : "h2";
	return (
		<Tag id={id} tabIndex={-1} style={{ fontFamily: SQ, fontWeight: 400, fontSize: size ?? t.hSize, lineHeight: (lineHeight ?? t.hLine) / (size ?? t.hSize), color: "#fff", textAlign: "center", margin: 0, width: "100%", outline: "none", overflowWrap: "break-word" }}>
			{lines.map((l, i) => (
				<span key={i} style={{ display: "block" }}>{l}</span>
			))}
		</Tag>
	);
}

/* ─── REUSABLE: Subheadline ─────────────────────────────────────────── */
/* The design's lines stay lines where there's room; the phone lets them run together and wrap. */
function Subhead({ lines, color = "#fff" }: { lines: string[]; color?: string }) {
	const l = useLayout();
	return (
		<p style={{ fontFamily: SR, fontWeight: 300, fontSize: TOKENS[l].subSize, lineHeight: "25px", color, textAlign: "center", margin: 0, maxWidth: l === "phone" ? TOKENS.phone.introW : undefined }}>
			{lines.map((line, i) => (
				<span key={i} style={{ display: l === "phone" ? "inline" : "block" }}>{line}{l === "phone" && i < lines.length - 1 ? " " : ""}</span>
			))}
		</p>
	);
}

/** A section's pill, heading and lead, centred. `phoneLines` replaces the heading's lines where the phone design
 *  breaks them differently; `widePhone` lets those lines use the phone's full width (as the frame's do). */
function SectionIntro({ k, pill, lines, phoneLines, widePhone, sub, subGap, lineHeight, largePill }: { k: SectionKey; pill: string; lines: string[]; phoneLines?: string[]; widePhone?: boolean; sub?: string[]; subGap?: number; lineHeight?: number; largePill?: boolean }) {
	const l = useLayout();
	const t = TOKENS[l];
	return (
		<Column maxWidth={l === "phone" && widePhone ? PHONE_WIDE : t.introW} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: t.pillGap }}>
			<Pill label={pill} large={largePill} />
			<div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: subGap ?? t.subGap, width: "100%" }}>
				<Headline id={`${sectionId(k)}-title`} lines={l === "phone" && phoneLines ? phoneLines : lines} lineHeight={lineHeight} />
				{sub && <Subhead lines={sub} />}
			</div>
		</Column>
	);
}

/** A page section: its own landmark, named by its heading. */
function Section({ k, children, style }: { k: SectionKey; children: ReactNode; style?: CSSProperties }) {
	return (
		<section id={sectionId(k)} aria-labelledby={`${sectionId(k)}-title`} style={{ position: "relative", background: SECTION_BG, ...style }}>
			{children}
		</section>
	);
}

/* ─── REUSABLE: Gradient CTA button ─────────────────────────────────── */
function CtaButton({
	label,
	onClick,
	withArrow = true,
	fontSize = 18,
	arrowSize = { w: 19.006, h: 15.839 },
	type = "button",
	style,
}: {
	label: string;
	onClick?: () => void;
	withArrow?: boolean;
	fontSize?: number;
	arrowSize?: { w: number; h: number };
	type?: "button" | "submit";
	style?: CSSProperties;
}) {
	return (
		<button
			type={type}
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
				flexShrink: 0,
				...style,
			}}
		>
			<span style={{ fontFamily: SR, fontWeight: 400, fontSize, lineHeight: "normal", color: CTA_INK }}>{label}</span>
			{withArrow && <img src={A.ctaArrow} alt="" style={{ width: arrowSize.w, height: arrowSize.h, flexShrink: 0, filter: "brightness(0)" }} />}
		</button>
	);
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  HEADER                                                              */
/* ═══════════════════════════════════════════════════════════════════ */
/** The STAK lockup (icon + wordmark), `width` wide: the nav and the footer. */
function NavLogo({ width }: { width: number }) {
	return (
		<div style={{ position: "relative", width, height: width * 0.24263, overflow: "hidden", flexShrink: 0 }}>
			<div style={{ position: "absolute", inset: 0, width: "24.26%" }}>
				<img src={A.logo1} alt="STAK" style={{ width: "100%", height: "100%", display: "block" }} />
			</div>
			<div style={{ position: "absolute", left: "28.38%", top: "21.77%", right: 0, bottom: "21.64%" }}>
				<img src={A.logo2} alt="" style={{ width: "100%", height: "100%", display: "block" }} />
			</div>
		</div>
	);
}

const NAV_LINKS: [string, SectionKey][] = [["Home", "hero"], ["Features", "features"], ["How It Works", "howItWorks"], ["FAQ", "faq"]];

/** Desktop bar (Figma 1:315): logo, the section links, "Get early access". */
function NavBar({ onScrollTo }: { onScrollTo: (k: SectionKey) => void }) {
	const openEarlyAccess = useContext(EarlyAccessContext);
	return (
		<div style={{ width: "calc(100% - 48px)", maxWidth: 1232, margin: "0 auto", background: "#1a1d31", padding: "8px 9px 8px 11px", borderRadius: 13, boxSizing: "border-box", display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", columnGap: 24 }}>
			<NavLogo width={109.131} />
			<nav aria-label="Primary">
				<ul style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", alignItems: "center", columnGap: 35.168, rowGap: 4, fontFamily: SR, fontWeight: 400, fontSize: 16, color: "#fff", listStyle: "none", margin: 0, padding: 0 }}>
					{NAV_LINKS.map(([label, k]) => (
						<li key={k}><button type="button" onClick={() => onScrollTo(k)} style={btnReset}>{label}</button></li>
					))}
				</ul>
			</nav>
			<CtaButton label="Get early access" withArrow={false} fontSize={14.453} onClick={openEarlyAccess} style={{ justifySelf: "end" }} />
		</div>
	);
}

/* Phone and tablet bar (Figma Frames 220/222): logo + menu button. The menu holds the page's sections plus "Get early
   access". It stays mounted so it can fade/slide out as well as in, and a tap anywhere outside the bar or menu (or
   Escape) closes it. */
function MobileNavBar({ onScrollTo }: { onScrollTo: (k: SectionKey) => void }) {
	const phone = useLayout() === "phone";
	const openEarlyAccess = useContext(EarlyAccessContext);
	const [menuOpen, setMenuOpen] = useState(false);
	const rootRef = useRef<HTMLDivElement>(null);
	const buttonRef = useRef<HTMLButtonElement>(null);
	useEffect(() => {
		if (!menuOpen) return;
		const onPointerDown = (e: PointerEvent) => {
			if (rootRef.current && !rootRef.current.contains(e.target as Node)) setMenuOpen(false);
		};
		const onKey = (e: KeyboardEvent) => {
			if (e.key !== "Escape") return;
			setMenuOpen(false);
			buttonRef.current?.focus();
		};
		document.addEventListener("pointerdown", onPointerDown);
		document.addEventListener("keydown", onKey);
		return () => {
			document.removeEventListener("pointerdown", onPointerDown);
			document.removeEventListener("keydown", onKey);
		};
	}, [menuOpen]);
	const go = (k: SectionKey) => {
		setMenuOpen(false);
		onScrollTo(k);
	};
	return (
		<div
			ref={rootRef}
			onBlur={(e) => { if (menuOpen && !e.currentTarget.contains(e.relatedTarget as Node | null) && e.relatedTarget) setMenuOpen(false); }}
			style={{ position: "relative", width: "calc(100% - 32px)", maxWidth: phone ? 330.2 : 650, margin: "0 auto" }}
		>
			<div style={{ width: "100%", minHeight: 45.899, background: "#1a1d31", borderRadius: 10.752, display: "flex", alignItems: "center", justifyContent: "space-between", padding: `4px ${phone ? 2 : 8.4}px 4px ${phone ? 10 : 16.4}px`, boxSizing: "border-box" }}>
				<NavLogo width={90.259} />
				{/* A 44x36 target around the 32x14 icon. */}
				<button ref={buttonRef} type="button" aria-label="Menu" aria-expanded={menuOpen} aria-controls="landing-menu" onClick={() => setMenuOpen((o) => !o)} style={{ ...btnReset, width: 44, height: 36, display: "grid", placeItems: "center", flexShrink: 0, borderRadius: 8 }}>
					<img src={A.navMenu} alt="" style={{ width: 31.922, height: 14.188, display: "block" }} />
				</button>
			</div>
			{/* Positioned under the bar rather than in flow: while closed it stays mounted (so it can animate out),
			    and in flow it would push the page down. */}
			<nav
				id="landing-menu"
				aria-label="Primary"
				style={{
					position: "absolute",
					top: "calc(100% + 8px)",
					left: 0,
					right: 0,
					background: "#1a1d31",
					borderRadius: 10.752,
					padding: "8px 0 14px",
					display: "flex",
					flexDirection: "column",
					boxShadow: "0 12px 32px rgba(0,0,0,0.45)",
					transformOrigin: "top right",
					opacity: menuOpen ? 1 : 0,
					transform: menuOpen ? "translateY(0) scale(1)" : "translateY(-8px) scale(0.97)",
					visibility: menuOpen ? "visible" : "hidden",
					pointerEvents: menuOpen ? "auto" : "none",
					// Hide only after the fade-out, so closing animates instead of snapping away.
					transition: `opacity 200ms ease, transform 200ms ease, visibility 0s linear ${menuOpen ? "0s" : "200ms"}`,
				}}
			>
				{NAV_LINKS.map(([label, k]) => (
					<button key={k} type="button" onClick={() => go(k)} style={{ ...btnReset, textAlign: "left", padding: "10px 18px", fontFamily: SR, fontWeight: 400, fontSize: 15, color: "#fff" }}>
						{label}
					</button>
				))}
				<div style={{ padding: "8px 18px 0" }}>
					<CtaButton
						label="Get early access"
						withArrow={false}
						fontSize={14.453}
						onClick={() => {
							setMenuOpen(false);
							buttonRef.current?.focus();
							openEarlyAccess();
						}}
						style={{ width: "100%", boxSizing: "border-box", padding: "9px 14.453px" }}
					/>
				</div>
			</nav>
		</div>
	);
}

/** The bar stays at the top while the page scrolls, over a page-coloured band that fades at its foot so content
 *  slides away under it. */
function Header({ onScrollTo, ref }: { onScrollTo: (k: SectionKey) => void; ref: Ref<HTMLElement> }) {
	const desktop = useLayout() === "desktop";
	return (
		<header ref={ref} style={{ position: "sticky", top: 0, zIndex: 30, padding: desktop ? "17px 0" : "26px 0 16px", background: `linear-gradient(to bottom, ${SECTION_BG} 0%, ${SECTION_BG} 80%, rgba(10,16,32,0) 100%)` }}>
			{desktop ? <NavBar onScrollTo={onScrollTo} /> : <MobileNavBar onScrollTo={onScrollTo} />}
		</header>
	);
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  SECTION 1: HERO                                                     */
/* ═══════════════════════════════════════════════════════════════════ */
/** The hero's "Get early access" pill, as a button. */
function EarlyAccessPill() {
	const open = useContext(EarlyAccessContext);
	const desktop = useLayout() === "desktop";
	return (
		<button type="button" onClick={open} style={{ ...btnReset, ...CHIP, ...(desktop ? { gap: 8, padding: "5px 10px", borderRadius: 36 } : {}) }}>
			<ChipBody label="Get early access" size={desktop ? 14 : 12} desktop={desktop} />
		</button>
	);
}

/** Figma's Ellipse 109 glow, `h` tall (the frames crop it three ways), placed from the page centre. */
const E109_CROP = { 217: { top: "-179.01%", height: "458.02%" }, 148: { top: "-262.47%", height: "624.94%" }, 115: { top: "-337.79%", height: "775.58%" } } as const;
function Ellipse109({ dx, top, h, flip = false }: { dx: number; top: number; h: keyof typeof E109_CROP; flip?: boolean }) {
	const crop = E109_CROP[h];
	return (
		<div aria-hidden="true" style={{ position: "absolute", left: `calc(50% + ${dx}px)`, top, width: 359, height: h, pointerEvents: "none", transform: flip ? "scaleY(-1)" : undefined }}>
			<img src={A.ellipse109} alt="" style={{ position: "absolute", left: "-108.2%", top: crop.top, width: "316.4%", height: crop.height, maxWidth: "none" }} />
		</div>
	);
}

/** The soft glows behind the box (Figma Gradient 3 and Ellipses 108/109), placed from the page centre per layout. */
const HERO_GLOW = {
	desktop: { radial: "radial-gradient(40% 21% at 50% 48%, rgba(70,118,162,0.12) 0%, rgba(45,86,130,0.045) 46%, rgba(10,16,32,0) 72%)", e108: { dx: -682, top: 117 }, e109: { dx: 179, top: 513 } },
	tablet: { radial: "radial-gradient(46% 20% at 50% 50%, rgba(70,118,162,0.12) 0%, rgba(45,86,130,0.045) 46%, rgba(10,16,32,0) 72%)", e108: { dx: -485, top: 118 }, e109: { dx: 126, top: 213 } },
	phone: { radial: undefined, e108: { dx: -411, top: 92 }, e109: { dx: -4, top: 353 } },
} as const;

function HeroGlow() {
	const g = HERO_GLOW[useLayout()];
	return (
		<div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
			{g.radial && <div style={{ position: "absolute", inset: 0, background: g.radial }} />}
			<div style={{ position: "absolute", left: `calc(50% + ${g.e108.dx}px)`, top: g.e108.top, width: 470, height: 231 }}>
				<img src={A.ellipse108} alt="" style={{ position: "absolute", top: "-199.08%", left: "-97.85%", width: "295.7%", height: "498.16%", maxWidth: "none" }} />
			</div>
			<Ellipse109 dx={g.e109.dx} top={g.e109.top} h={217} />
		</div>
	);
}

/** The six partner logos (Figma 1:380), each at its design size. */
function ProofLogos() {
	return (
		<>
			{/* Block Wallet: icon and wordmark side by side, as Figma places them. */}
			<div style={{ width: 150, height: 21, position: "relative", flexShrink: 0 }}>
				<div style={{ position: "absolute", inset: "0 85.94% 0 0" }}><img src={A.proofBwIcon} alt="Block Wallet" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} /></div>
				<div style={{ position: "absolute", inset: "9.07% 0 11.2% 18.72%" }}><img src={A.proofBwWord} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} /></div>
			</div>
			<div style={{ width: 100, height: 21.834, position: "relative", overflow: "hidden", flexShrink: 0 }}><img src={A.proofAmplitude} alt="Amplitude" style={{ width: "100%", height: "100%", objectFit: "contain" }} /></div>
			<div style={{ width: 135, height: 21.344, position: "relative", overflow: "hidden", flexShrink: 0 }}><img src={A.proofBetterStack} alt="Better Stack" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "left top" }} /></div>
			{/* Brex: the main mark plus its small detail, placed per Figma. */}
			<div style={{ width: 81.9, height: 21, position: "relative", flexShrink: 0 }}>
				<div style={{ position: "absolute", inset: "0 1.42% 0 1.12%" }}><img src={A.proofBrexMain} alt="Brex" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} /></div>
				<div style={{ position: "absolute", inset: "20.67% 16.9% 15.5% 68.18%" }}><img src={A.proofBrexDetail} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} /></div>
			</div>
			<div style={{ width: 56.1, height: 19.513, position: "relative", overflow: "hidden", flexShrink: 0 }}><img src={A.proofDeel} alt="Deel" style={{ width: "100%", height: "100%", objectFit: "contain" }} /></div>
			<div style={{ width: 69, height: 21.923, position: "relative", overflow: "hidden", flexShrink: 0 }}><div style={{ position: "absolute", inset: "1.52% 3.8% 4.37% 0.15%" }}><img src={A.proofSpotify} alt="Spotify" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} /></div></div>
		</>
	);
}

/** The six partner logos, standing still - nothing moves on its own, so there's nothing to pause (WCAG 2.2.2). Desktop:
 *  one row that fits. Phone and tablet: one row wider than the screen, centred, faded at both edges and swipeable
 *  sideways to bring the rest into view. */
function ProofRow() {
	const l = useLayout();
	const scrollRef = useRef<HTMLDivElement>(null);
	// Centred on arrival, and again when the screen turns or resizes.
	useLayoutEffect(() => {
		const el = scrollRef.current;
		if (!el) return;
		const centre = () => { el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2; };
		centre();
		const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(centre) : null;
		ro?.observe(el);
		return () => ro?.disconnect();
	}, [l]);
	if (l === "desktop") {
		return (
			<div style={{ position: "relative", display: "flex", flexWrap: "wrap", justifyContent: "center", alignItems: "center", gap: "24px 79px", maxWidth: 987 + 48, margin: "53px auto 0", paddingInline: 24, boxSizing: "border-box" }}>
				<ProofLogos />
			</div>
		);
	}
	return (
		<div style={{ position: "relative" }}>
			{/* Focusable, so a keyboard can scroll it in every browser (Chrome does this on its own, Safari doesn't). */}
			<div ref={scrollRef} className="landing-proof-scroll" tabIndex={0} role="region" aria-label="Partner logos" style={{ overflowX: "auto", overflowY: "hidden", scrollbarWidth: "none", padding: "47px 0" }}>
				{/* Centred when it fits (a wide tablet); the auto margins give way once it's wider than the screen. */}
				<div style={{ display: "flex", alignItems: "center", gap: l === "phone" ? 34 : 50, width: "max-content", paddingInline: 64, margin: "0 auto" }}>
					<ProofLogos />
				</div>
			</div>
			<div aria-hidden="true" style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 64, background: "linear-gradient(to right, rgba(10,16,32,0.99) 41.41%, rgba(10,16,32,0.12) 74.22%)", pointerEvents: "none" }} />
			<div aria-hidden="true" style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 64, background: "linear-gradient(to left, rgb(10,16,32) 27.344%, rgba(10,16,32,0.79) 133.59%)", pointerEvents: "none" }} />
		</div>
	);
}

/** The hero's lead, broken where the tablet frame breaks it (the desktop's own break below); the phone runs it on. */
const HERO_LEAD = ["STAK matches you with stocks you'll actually understand —through swipes,", "smart insights, and zero pressure. Before you buy anything, STAK it."];
const HERO_LEAD_DESKTOP = ["STAK matches you with stocks you'll actually understand —through swipes, smart insights,", "and zero pressure. Before you buy anything, STAK it."];

function Hero() {
	const l = useLayout();
	const desktop = l === "desktop";
	const phone = l === "phone";
	return (
		<Section k="hero" style={{ overflow: "hidden", paddingTop: desktop ? 34 : 22, paddingBottom: desktop ? 109 : 0 }}>
			<HeroGlow />
			<Column maxWidth={phone ? PHONE_WIDE : TOKENS[l].introW} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 30 }}>
				<EarlyAccessPill />
				<div style={{ display: "flex", flexDirection: "column", gap: desktop ? 20 : 15, alignItems: "center", width: "100%" }}>
					<Headline id={`${sectionId("hero")}-title`} level={1} lines={phone ? ["The Stock Market,", "Finally Speaks", "Your Language."] : ["The Stock Market,", "Finally Speaks Your Language."]} size={desktop ? 50 : undefined} lineHeight={l === "tablet" ? 37 : undefined} />
					<p style={{ fontFamily: SR, fontWeight: 300, fontSize: desktop ? 20 : 16, lineHeight: "25px", color: desktop ? "#fff" : "rgba(255,255,255,0.8)", textAlign: "center", margin: 0, maxWidth: phone ? 315 : undefined }}>
						{phone ? HERO_LEAD.join(" ") : (desktop ? HERO_LEAD_DESKTOP : HERO_LEAD).map((line) => <span key={line} style={{ display: "block" }}>{line}</span>)}
					</p>
				</div>
			</Column>
			{/* Frame 124: the box with its light beam, a flattened 2x export - the phone has its own narrower composition.
			    Its top edge is blur spill, so it tucks a few px under the text. */}
			<img
				src={phone ? A.boxM390 : A.boxT810}
				alt=""
				fetchPriority="high"
				style={{ position: "relative", display: "block", margin: `${phone ? -6 : desktop ? -10 : -14}px auto ${phone ? 42 : desktop ? 0 : 22}px`, width: phone ? "min(100%, 520px)" : "min(587.309px, 100%)", height: "auto", aspectRatio: phone ? "390 / 422.5" : "587.309 / 563.5", pointerEvents: "none" }}
			/>
			<ProofRow />
		</Section>
	);
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  SECTION 2: PROBLEM                                                  */
/* ═══════════════════════════════════════════════════════════════════ */
const PROBLEM_PHONE_ALT = "The STAK Home screen: Market Mood with today's headlines, and why they matter to you";

/** The Home screen in its phone frame, cut off below its middle and fading into the page. Kept sharp: the design's
 *  layer blur was turned down (re-confirmed 2026-07-01). `shown` is how much of the phone shows before the cut. */
const PROBLEM_PHONE = {
	desktop: { w: 328.5, shown: 0.92, top: 64, bottom: 131 },
	tablet: { w: 300, shown: 0.85, top: 43, bottom: 102 },
	phone: { w: 210, shown: 0.8, top: 41, bottom: 69 },
} as const;

function Problem() {
	const l = useLayout();
	const p = PROBLEM_PHONE[l];
	const h = p.w * (661 / 328.5);
	const shownH = h * p.shown;
	return (
		<Section k="problem" style={{ overflow: "hidden", paddingTop: TOKENS[l].padTop, paddingBottom: p.bottom }}>
			{l === "tablet" && <><Ellipse109 dx={-174} top={201} h={148} /><Ellipse109 dx={-179} top={512} h={217} /></>}
			{l === "phone" && <Ellipse109 dx={-179.5} top={267} h={115} flip />}
			<SectionIntro k="problem" pill="The Problem" lines={["The Market Isn't Hard.", "It's Just Been Made That Way."]} sub={[`You've heard the advice — "invest early, invest often."`, "But nobody tells you how. Here’s how:"]} />
			<div style={{ position: "relative", width: "100%", height: shownH, marginTop: p.top, overflow: "hidden" }}>
				<img src={A.problemPhone} alt={PROBLEM_PHONE_ALT} loading="lazy" style={{ position: "absolute", left: "50%", top: 0, transform: "translateX(-50%)", width: p.w, height: h, maxWidth: "none", display: "block" }} />
				<div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: shownH * 0.3, background: "linear-gradient(to top, #0a1020 12%, rgba(10,16,32,0) 100%)", pointerEvents: "none" }} />
			</div>
		</Section>
	);
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  SECTION 3: HOW IT WORKS                                             */
/* ═══════════════════════════════════════════════════════════════════ */
const HOW_ART = [
	{ src: A.how1, w: 175.5, h: 187.5, alt: "The STAK quiz asking which brands you know or use", fade: true },
	// Cropped to the card stack itself (no margins or "Swipe down" hint) and drawn larger than the phones.
	{ src: A.how2, w: 140, h: 196.6, alt: "A STAK stock card for NVIDIA with its price and a tip", fade: false },
	{ src: A.how3, w: 192, h: 194, alt: "My STAK with saved stocks grouped into collections", fade: false },
] as const;

/** A How it works card's picture, at its 1x size times `scale`: centred near the card's top, or (`side`) at the foot
 *  of its own column. The quiz phone is cropped mid-screen in the export, so it fades out where the card cuts it. */
function HowArt({ step, scale = 1, top, side = false }: { step: 0 | 1 | 2; scale?: number; top?: number; side?: boolean }) {
	const art = HOW_ART[step];
	const mask = art.fade ? "linear-gradient(to bottom, black 78%, transparent 100%)" : undefined;
	return (
		<img
			src={art.src}
			alt={art.alt}
			loading="lazy"
			style={{ position: "absolute", left: "50%", top: side ? undefined : top, bottom: side ? 0 : undefined, transform: "translateX(-50%)", width: art.w * scale, height: art.h * scale, maxWidth: "none", display: "block", maskImage: mask, WebkitMaskImage: mask, pointerEvents: "none" }}
		/>
	);
}

const HOW_CARDS = [
	{ n: "01/", title: "Tell Us Who You Are", body: ["Take a quick risk quiz. STAK learns your personality, your goals, and your vibe.", "No spreadsheets. No jargon."] },
	{ n: "02/", title: "Swipe Through Stocks", body: ["Like a stock? Swipe right. Not feeling it? Swipe left. Want to know more? Swipe up.", "It's that simple."] },
	{ n: "03/", title: "STAK Before You Spend", body: ["Practice with real market data and zero real money. Build confidence before you commit a single dollar."] },
] as const;

/** The number, title and body of one How it works card. */
function HowText({ i, large }: { i: 0 | 1 | 2; large: boolean }) {
	const c = HOW_CARDS[i];
	return (
		<div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: large ? 17 : 10.666 }}>
			<p aria-hidden="true" style={{ fontFamily: SQ, fontSize: large ? 30 : 22.856, color: "#fff", margin: 0, lineHeight: "normal" }}>{c.n}</p>
			<div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: large ? 8 : 6.095 }}>
				<h3 style={{ fontFamily: SR, fontWeight: 600, fontSize: large ? 20 : 16, color: "#fff", margin: 0, lineHeight: "normal" }}>{c.title}</h3>
				<p style={{ fontFamily: SR, fontWeight: 300, fontSize: large ? 14 : 12, color: BODY_DIM, margin: 0, lineHeight: "normal" }}>
					{c.body.map((line, k) => <span key={k} style={{ display: "block" }}>{line}</span>)}
				</p>
			</div>
		</div>
	);
}

function HowItWorks() {
	const l = useLayout();
	const desktop = l === "desktop";
	const card = (i: 0 | 1 | 2): CSSProperties => ({
		position: "relative",
		background: CARD_BG,
		borderRadius: desktop ? 12 : 9.142,
		overflow: "hidden",
		minHeight: desktop ? 391 : 297.889,
		boxSizing: "border-box",
		display: "flex",
		flexDirection: "column",
		justifyContent: "flex-end",
		padding: desktop ? `220px 29.5px ${i === 0 ? 37 : 32}px` : `166px 22.5px ${i === 0 ? 28 : 24}px`,
	});
	return (
		<Section k="howItWorks" style={{ overflow: "hidden", paddingTop: TOKENS[l].padTop, paddingBottom: desktop ? 96 : l === "tablet" ? 119 : 55 }}>
			{l === "tablet" && <Ellipse109 dx={-174} top={201} h={148} />}
			<SectionIntro k="howItWorks" pill="How It Works" lines={["Three Swipes to Smarter", "Investing."]} phoneLines={["Three Swipes to", "Smarter Investing."]} widePhone />
			<Column
				maxWidth={desktop ? 1201 : l === "tablet" ? 606 : 296}
				style={{ display: "grid", gridTemplateColumns: desktop ? "repeat(3, minmax(0, 389px))" : l === "tablet" ? "repeat(2, minmax(0, 1fr))" : "minmax(0, 1fr)", justifyContent: "center", gap: desktop ? 17 : 12.952, marginTop: TOKENS[l].introGap }}
			>
				{([0, 1, 2] as const).map((i) =>
					// Tablet: the third card runs the full width, its words on the left and My STAK on the right.
					l === "tablet" && i === 2 ? (
						<div key={i} style={{ ...card(i), gridColumn: "1 / -1", flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 16, padding: "24px 0 47px 29px" }}>
							<div style={{ flex: "1 1 220px", maxWidth: 252 }}><HowText i={i} large={false} /></div>
							<div style={{ position: "relative", alignSelf: "stretch", flex: "0 0 260px", margin: "-24px 0 -47px" }}>
								<HowArt step={i} scale={1.25} side />
							</div>
						</div>
					) : (
						<div key={i} style={card(i)}>
							<HowArt step={i} top={desktop ? 16 : 12} scale={desktop ? 1 : 0.76} />
							<HowText i={i} large={desktop} />
						</div>
					),
				)}
			</Column>
		</Section>
	);
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  SECTION 4: FEATURES                                                 */
/* ═══════════════════════════════════════════════════════════════════ */
/** Which app screen each Features card shows: 1 Trends (News), 2 Swipe Deck (Discover), 3 Simulated STAK
 *  (Simulate), 4 Intel Injections (Home). */
type Feature = 1 | 2 | 3 | 4;
const FEATURE_ART: Record<Feature, { src: string; alt: string }> = {
	1: { src: A.feat1, alt: "STAK News: Market Mood, today's brief and stories on your stocks" },
	2: { src: A.feat2, alt: "STAK Discover: a swipeable stock card for NVIDIA" },
	3: { src: A.feat3, alt: "STAK Simulate: your practice score, its chart and your saved staks" },
	4: { src: A.feat4, alt: "STAK Home: Market Mood with today's headlines and why they matter to you" },
};

const FEATURES: { f: Feature; title: string; body: string }[] = [
	{ f: 1, title: "Trends", body: "See what's moving, what's hot, and what the market is actually doing — in plain English. Stay in the loop without the noise" },
	{ f: 2, title: "Swipe Deck", body: "Discover stocks the way you discover everything else by swiping. Right to STAK it. Left to pass. Up to go deeper. Your feed, your pace." },
	{ f: 3, title: "Simulated STAK", body: "Buy. Sell. Watch. Learn. All with fake money, real market data. Zero risk, full experience. Build your portfolio before it counts." },
	{ f: 4, title: "Intel Injections", body: "Bite-sized lessons delivered in-app, right when you need them. No textbooks. No boring lectures. Just context that makes you smarter on the spot." },
];

/** Each layout's Features card: the phone's scale and offset in the card (the desktop card's 515x490 art box, scaled),
 *  where the words start, and their sizes. The tablet's words are larger than its frame's (10/7px) so they can be read. */
const FEATURE_CARD = {
	desktop: { s: 1, artTop: 0, minH: 548, textTop: 376, textW: 342.747, title: 20, body: 14, gap: 18.087, center: false, radius: 11.895 },
	tablet: { s: 0.5131, artTop: 0, minH: 281, textTop: 193, textW: 230, title: 16, body: 12, gap: 9.281, center: true, radius: 6.104 },
	phone: { s: 0.4928, artTop: 24.2, minH: 338, textTop: 228, textW: 259, title: 16, body: 12, gap: 9.281, center: false, radius: 6.104 },
} as const;

function FeatureCard({ f, title, body }: { f: Feature; title: string; body: string }) {
	const c = FEATURE_CARD[useLayout()];
	const art = FEATURE_ART[f];
	return (
		<div style={{ position: "relative", background: CARD_BG, borderRadius: c.radius, overflow: "hidden", minHeight: c.minH, boxSizing: "border-box", padding: `${c.textTop}px 16px 32px` }}>
			{/* The phone, clipped to the art box (it runs 3px past it), fading into the card below its middle. */}
			<div style={{ position: "absolute", left: 0, right: 0, top: c.artTop, height: 490.504 * c.s, overflow: "hidden", pointerEvents: "none" }}>
				<img src={art.src} alt={art.alt} loading="lazy" style={{ position: "absolute", left: "50%", top: 44 * c.s, transform: "translateX(-50%)", width: 223 * c.s, height: 449 * c.s, maxWidth: "none", display: "block" }} />
				<div style={{ position: "absolute", inset: "0 0 -1px", background: "linear-gradient(to bottom, rgba(16,23,42,0) 40.429%, #10172a 73.762%)" }} />
			</div>
			<div style={{ position: "relative", maxWidth: c.textW, margin: "0 auto", display: "flex", flexDirection: "column", alignItems: c.center ? "center" : "flex-start", gap: c.gap, textAlign: c.center ? "center" : "left" }}>
				<h3 style={{ fontFamily: SR, fontWeight: 600, fontSize: c.title, color: "#fff", margin: 0, lineHeight: "normal" }}>{title}</h3>
				<p style={{ fontFamily: SR, fontWeight: 300, fontSize: c.body, color: BODY_DIM, margin: 0, lineHeight: "normal" }}>{body}</p>
			</div>
		</div>
	);
}

function Features() {
	const l = useLayout();
	const desktop = l === "desktop";
	return (
		<Section k="features" style={{ overflow: "hidden", paddingTop: TOKENS[l].padTop, paddingBottom: desktop ? 72 : l === "tablet" ? 88 : 123 }}>
			<SectionIntro k="features" pill="Features" lines={["Everything You Need.", "Nothing You Don't."]} />
			<Column
				maxWidth={desktop ? 1179 : l === "tablet" ? 605 : 295}
				style={{ display: "grid", gridTemplateColumns: l === "phone" ? "minmax(0, 1fr)" : desktop ? "repeat(2, minmax(0, 576px))" : "repeat(2, minmax(0, 1fr))", justifyContent: "center", gap: desktop ? 27.13 : 13.922, marginTop: TOKENS[l].introGap }}
			>
				{FEATURES.map((it) => <FeatureCard key={it.f} {...it} />)}
			</Column>
		</Section>
	);
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  SECTION 5: EARLY MOMENTUM                                           */
/* ═══════════════════════════════════════════════════════════════════ */
/* Section 5's three staggered rows of chat bubbles (Figma 1:680): row 1 on top, row 2 in the middle, row 3 at
   the bottom. Every layout reads these, so the copy can't drift between desktop, tablet and phone. `a` picks the
   bubble's avatar (em-avatar-01..15: Open Peeps, CC0, one person per bubble). */
const emAvatar = (a: number) => `/images/landing-v2/em-avatar-${String(a).padStart(2, "0")}.webp`;
const CHAT_BUBBLES_R1 = [
	{ t: "Just STAKed Amazon!", dark: false, a: 1 },
	{ t: "Time to save more!", dark: true, a: 2 },
	{ t: "Woooo!!", dark: false, a: 3 },
	{ t: "Portfolio up this week!", dark: false, a: 4 },
	{ t: "New to STAK, loving it!", dark: false, a: 5 },
];
const CHAT_BUBBLES_R2 = [
	{ t: "What's the Buzz About?", dark: true, a: 6 },
	{ t: "Is $Tsla a good buy?", dark: false, a: 7 },
	{ t: "Bullish on tech stocks!", dark: true, a: 8 },
	{ t: "STAKed Apple today!", dark: false, a: 9 },
	{ t: "Up 12% this month!", dark: false, a: 10 },
];
const CHAT_BUBBLES_R3 = [
	{ t: "Bullish! on S&P 500", dark: false, a: 11 },
	{ t: "My portfolio is growing!", dark: true, a: 12 },
	{ t: "Gold, Google", dark: false, a: 13 },
	{ t: "Big gains incoming!", dark: false, a: 14 },
	{ t: "This app is different!", dark: false, a: 15 },
];

/** One chat bubble: avatar and line. It grows with its words (wider spacing, larger text) rather than clipping them. */
function ChatBubble({ text, dark, avatar }: { text: string; dark: boolean; avatar: number }) {
	const large = useLayout() === "desktop";
	return (
		<div style={{ background: dark ? "rgba(169,191,254,0.37)" : "#fff", minWidth: large ? 249.91 : 197.542, minHeight: large ? 70.682 : 55.871, boxSizing: "border-box", borderRadius: 53.011, display: "flex", alignItems: "center", gap: large ? 25.243 : 19.954, padding: large ? "8px 22px 8px 15.15px" : "6px 18px 6px 11.97px", flexShrink: 0 }}>
			<img src={emAvatar(avatar)} alt="" loading="lazy" decoding="async" style={{ width: large ? 47.963 : 37.912, height: large ? 47.963 : 37.912, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
			<p style={{ fontFamily: SR, fontWeight: 400, fontSize: large ? 12 : 10, color: dark ? "#fff" : "#323232", whiteSpace: "nowrap", margin: 0 }}>{text}</p>
		</div>
	);
}

/** The three staggered rows of bubbles, running off the right edge, faded in from the left. Illustration: made-up
 *  chats, mostly cut off at the edge, so hidden from screen readers. */
function BubbleRows() {
	const l = useLayout();
	const desktop = l === "desktop";
	const offsets = desktop ? [40.66, 107.21, 32.53] : l === "tablet" ? [32.15, 84.75, 25.72] : [30.37, 82.97, 23.94];
	const rowGap = desktop ? 26.178 : 20.69;
	return (
		<div aria-hidden="true" style={{ position: "relative", overflow: "hidden", flex: "1 1 0", minWidth: 0 }}>
			<div style={{ display: "flex", flexDirection: "column", gap: rowGap }}>
				{[CHAT_BUBBLES_R1, CHAT_BUBBLES_R2, CHAT_BUBBLES_R3].map((row, r) => (
					<div key={r} style={{ display: "flex", gap: desktop ? 13.309 : 10.52, marginLeft: offsets[r] }}>
						{row.map((b) => <ChatBubble key={b.a} text={b.t} dark={b.dark} avatar={b.a} />)}
					</div>
				))}
			</div>
			{desktop ? (
				<>
					{/* Figma 1:813: navy on the left, fading out to the right. */}
					<div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 232.165, background: "linear-gradient(to right, #0a1020, rgba(42,67,134,0))", pointerEvents: "none" }} />
					{/* A soft blue backlight behind the leftmost bubbles; screen-blended, so it only brightens. */}
					<div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 700, background: "radial-gradient(ellipse 450px 240px at 220px 130px, rgba(90,130,210,0.22) 0%, rgba(90,130,210,0.08) 45%, rgba(90,130,210,0) 80%)", mixBlendMode: "screen", pointerEvents: "none" }} />
				</>
			) : (
				<div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 183.516, background: "linear-gradient(to right, rgba(10,16,32,1) 0%, rgba(18,29,58,0.75) 25%, rgba(26,42,83,0.5) 50%, rgba(34,54,108,0.25) 75%, rgba(42,67,134,0) 100%)", pointerEvents: "none" }} />
			)}
		</div>
	);
}

/** Each layout's stat: arrow size, number size and line, gap to the label, label size. */
const STAT_BLOCK = {
	desktop: { arrowW: 30.002, arrowH: 36.001, num: 80, line: 43, gap: 23.9, label: 13 },
	tablet: { arrowW: 23.715, arrowH: 28.457, num: 63.236, line: 33, gap: 20.075, label: 12 },
	phone: { arrowW: 16.347, arrowH: 19.616, num: 43.589, line: 52, gap: 1, label: 12 },
} as const;

function StatBlock({ value, label }: { value: string; label: string }) {
	const l = useLayout();
	const s = STAT_BLOCK[l];
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: s.gap, alignItems: "center" }}>
			<p style={{ display: "flex", alignItems: "center", margin: 0, fontFamily: SQ, fontSize: s.num, lineHeight: `${s.line}px`, color: "#fff", whiteSpace: "nowrap" }}>
				<img src={A.emStatArrow} alt="" style={{ width: s.arrowW, height: s.arrowH, flexShrink: 0 }} />
				{value}
			</p>
			<p style={{ fontFamily: SR, fontWeight: l === "phone" ? 400 : 600, fontSize: s.label, color: "#f5f1f1", textAlign: "center", margin: 0, maxWidth: l === "phone" ? 155 : undefined }}>{label}</p>
		</div>
	);
}

function EarlyMomentum() {
	const l = useLayout();
	const desktop = l === "desktop";
	const stats = (
		<>
			<StatBlock value="50M+" label="Millennials & Gen Z investing today" />
			<StatBlock value="30M+" label="Investors seeking better tools" />
		</>
	);
	return (
		<Section k="earlyMomentum" style={{ overflow: "hidden", paddingTop: TOKENS[l].padTop, paddingBottom: desktop ? 128 : l === "tablet" ? 119 : 81 }}>
			<SectionIntro k="earlyMomentum" pill="Early Momentum" lines={["Real People.", "Real Momentum."]} />
			{l === "phone" ? (
				<>
					<div style={{ marginTop: 138, display: "flex" }}><BubbleRows /></div>
					<div style={{ marginTop: 55, display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "24px 27.243px", paddingInline: 16 }}>{stats}</div>
				</>
			) : (
				/* Stats on the left (Figma 1:734 puts them 96px in on the 1400 frame); the bubbles run to the screen's edge. */
				<div style={{ marginTop: desktop ? 159 : 123, display: "flex", alignItems: "center", gap: desktop ? 117.5 : 67.2, paddingLeft: desktop ? "max(24px, calc((100% - 1208px) / 2))" : "max(16px, calc((100% - 712px) / 2))" }}>
					<div style={{ flex: "0 0 auto", width: desktop ? 252.275 : 199.412, display: "flex", flexDirection: "column", gap: desktop ? 48 : 39.523 }}>{stats}</div>
					<BubbleRows />
				</div>
			)}
		</Section>
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

/* Netflix-style accordion row (user-directed, modelled on netflix.com's FAQ): solid card rows, only the question bar
   lightens on hover, a drawn "+" that turns into an "x" when open, and the answer in its own panel below. */
function FaqRow({ i, q, a, open, onToggle }: { i: number; q: string; a: string; open: boolean; onToggle: () => void }) {
	const l = useLayout();
	const desktop = l === "desktop";
	const qId = `landing-faq-q${i}`;
	const aId = `landing-faq-a${i}`;
	return (
		<div style={{ display: "flex", flexDirection: "column" }}>
			<h3 style={{ margin: 0 }}>
				<button
					id={qId}
					type="button"
					aria-expanded={open}
					aria-controls={open ? aId : undefined}
					onClick={onToggle}
					className="landing-faq-q"
					style={{ ...btnReset, width: "100%", boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: desktop ? "18px 24px" : "16px 20px", WebkitTapHighlightColor: "transparent", textAlign: "left" }}
				>
					<span style={{ fontFamily: SR, fontWeight: 500, fontSize: l === "phone" ? 16 : 20, lineHeight: 1.3, color: "#fff", overflowWrap: "break-word", flex: 1, minWidth: 0 }}>{q}</span>
					<svg width={desktop ? 26 : 24} height={desktop ? 26 : 24} viewBox="0 0 24 24" aria-hidden="true" style={{ flexShrink: 0, transform: open ? "rotate(45deg)" : "rotate(0deg)", transition: "transform 0.25s ease" }}>
						<path d="M12 4.5v15M4.5 12h15" stroke="#fff" strokeWidth={2} strokeLinecap="round" fill="none" />
					</svg>
				</button>
			</h3>
			{open && (
				<div id={aId} role="region" aria-labelledby={qId} style={{ marginTop: 2, background: "#1a2237", padding: desktop ? "20px 24px" : "16px 20px" }}>
					<p style={{ fontFamily: SR, fontWeight: 300, fontSize: desktop ? 16 : 14, lineHeight: 1.6, color: "rgba(255,255,255,0.85)", margin: 0, overflowWrap: "break-word" }}>{a}</p>
				</div>
			)}
		</div>
	);
}

function Faq({ onEmail }: { onEmail: () => void }) {
	const l = useLayout();
	const desktop = l === "desktop";
	// At most one answer open; none on arrival. Opening one closes the other; the open one closes on a second click.
	const [openIdx, setOpenIdx] = useState<number | null>(null);
	return (
		<Section k="faq" style={{ paddingTop: TOKENS[l].padTop, paddingBottom: desktop ? 218 : l === "tablet" ? 274 : 266 }}>
			<SectionIntro k="faq" pill="STAK FAQ" lines={["We’re here to answer", "all your questions."]} phoneLines={["We’re here to answer all your questions."]} sub={["If you are new to world of stocks and financial", "discipline, STAK is built for you."]} subGap={20} />
			<Column maxWidth={l === "phone" ? 306 : 586} style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: l === "phone" ? 160 : 183 }}>
				{FAQS.map((f, i) => (
					<FaqRow key={i} i={i} q={f.q} a={f.a} open={openIdx === i} onToggle={() => setOpenIdx((prev) => (prev === i ? null : i))} />
				))}
			</Column>
			<div style={{ display: "flex", flexDirection: "column", gap: 30, alignItems: "center", marginTop: desktop ? 125 : 83.805, paddingInline: 16 }}>
				<p style={{ fontFamily: SR, fontWeight: 300, fontSize: 18, lineHeight: "25px", color: "#fff", margin: 0, textAlign: "center" }}>Have more questions?</p>
				<CtaButton label="Email Us" onClick={onEmail} fontSize={14.453} arrowSize={{ w: 13.775, h: 11.48 }} />
			</div>
		</Section>
	);
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  SECTION 7: OUR GROWING COMMUNITY ("STAK IT UP" photo mosaic)        */
/* ═══════════════════════════════════════════════════════════════════ */
/**
 * A fixed-size picture (`width` x `height` design px) drawn to the full width of the page. Only for decoration - the
 * photo mosaic - never for words people need to read, which must reflow and zoom.
 */
function ScaledArt({ width, height, children }: { width: number; height: number; children: ReactNode }) {
	const ref = useRef<HTMLDivElement>(null);
	const [w, setW] = useState(width);
	useLayoutEffect(() => {
		const el = ref.current;
		if (!el) return;
		const measure = () => setW(el.clientWidth || width);
		measure();
		const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
		ro?.observe(el);
		return () => ro?.disconnect();
	}, [width]);
	const s = w / width;
	return (
		<div ref={ref} aria-hidden="true" data-decor style={{ position: "relative", width: "100%", height: height * s, overflow: "hidden" }}>
			<div style={{ position: "absolute", left: 0, top: 0, width, height, transform: `scale(${s})`, transformOrigin: "top left" }}>{children}</div>
		</div>
	);
}

/* Desktop tiles: 347x186, rounded. Each photo sits at its own size and offset in its frame (Figma's crop, not
   object-fit), so every cell shows the slice the design chose. */
const TILE_W = 347;
const TILE_H = 186;
const TILE_BG = "#172037";

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

function ImageTile({ src }: { src: string }) {
	const f = TILE_FRAMES[src] ?? { imgW: TILE_W, imgH: TILE_H, imgX: 0, imgY: 0 };
	return (
		<div style={{ width: TILE_W, height: TILE_H, borderRadius: 12, background: TILE_BG, overflow: "hidden", position: "relative", flexShrink: 0 }}>
			<img src={src} alt="" loading="lazy" decoding="async" style={{ position: "absolute", left: f.imgX, top: f.imgY, width: f.imgW, height: f.imgH, maxWidth: "none", maxHeight: "none", objectFit: "cover", display: "block" }} />
		</div>
	);
}

/** "STAK" / "IT" / "UP": 80px display letters on a 45px line, the design's tall tight look. */
function LetterTile({ text }: { text: string }) {
	return (
		<div style={{ width: TILE_W, height: TILE_H, position: "relative", flexShrink: 0 }}>
			<p style={{ position: "absolute", left: "50%", top: "calc(50% - 22px)", transform: "translateX(-50%)", fontFamily: SQ, fontSize: 80, lineHeight: "45px", color: "#fff", margin: 0, whiteSpace: "nowrap" }}>{text}</p>
		</div>
	);
}

/** A blank cell (Figma leaves one in row 2), keeping the row's length. */
function EmptyTile() {
	return <div style={{ width: TILE_W, height: TILE_H, flexShrink: 0 }} />;
}

/* Desktop mosaic (Figma 1:933), on the 1400 frame: three rows running off both edges, each at its own offset. */
function CommunityTiles1400() {
	const row = (top: number, left: number, tiles: ReactNode) => <div style={{ position: "absolute", left, top, display: "flex", gap: 20, alignItems: "center" }}>{tiles}</div>;
	return (
		<ScaledArt width={1400} height={614}>
			{row(0, -20, <>
				<ImageTile src={A.ctaTile1} />
				<LetterTile text="STAK" />
				<ImageTile src={A.ctaTile2} />
				<ImageTile src={A.ctaTile3} />
			</>)}
			{/* The last cell is blank in Figma (1:959). */}
			{row(214, -285.5, <>
				<ImageTile src={A.ctaTile4} />
				<ImageTile src={A.ctaTile5} />
				<ImageTile src={A.ctaTile4} />
				<LetterTile text="IT" />
				<ImageTile src={A.ctaTile6} />
				<EmptyTile />
			</>)}
			{row(428, -179.5, <>
				<ImageTile src={A.ctaTile7} />
				<LetterTile text="UP" />
				<ImageTile src={A.ctaTile8} />
				<ImageTile src={A.ctaTile9} />
				<ImageTile src={A.ctaTile5} />
			</>)}
		</ScaledArt>
	);
}

/* Tablet mosaic (Figma 1:1465), on the 810 frame. */
function CommunityTiles810() {
	const tb: CSSProperties = { width: 240.752, height: 129.049, borderRadius: 8.326, overflow: "hidden", position: "relative", flexShrink: 0 };
	const imgTile = (src: string, st: CSSProperties, key: number) => <div key={key} style={{ ...tb, background: TILE_BG }}><img src={src} alt="" loading="lazy" decoding="async" style={{ position: "absolute", objectFit: "cover", maxWidth: "none", ...st }} /></div>;
	const maskTile = (src: string, st: CSSProperties, mpos: string, key: number) => (
		<div key={key} style={tb}>
			<div style={{ position: "absolute", WebkitMaskImage: `url(${A.ctaMqMask})`, maskImage: `url(${A.ctaMqMask})`, WebkitMaskSize: "240.752px 129.049px", maskSize: "240.752px 129.049px", WebkitMaskPosition: mpos, maskPosition: mpos, WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat", ...st }}>
				<img src={src} alt="" loading="lazy" decoding="async" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
			</div>
		</div>
	);
	const txt = (t: string, key: number) => <div key={key} style={tb}><p style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", fontFamily: SQ, fontSize: 55.505, color: "#fff", margin: 0, whiteSpace: "nowrap", lineHeight: "31.221px" }}>{t}</p></div>;
	const emptyTile = (key: number) => <div key={key} style={{ ...tb, background: TILE_BG }} />;
	const row = (tiles: ReactNode[], left: string, top: number, w: number) => (
		<div style={{ position: "absolute", left, top, transform: "translateX(-50%)", width: w, display: "flex", gap: 13.876, alignItems: "center" }}>{tiles}</div>
	);
	return (
		<ScaledArt width={810} height={426}>
			{row([
				maskTile(A.ctaTile1, { left: "calc(50% + 0.7px)", top: "calc(50% + 59.47px)", transform: "translate(-50%,-50%)", width: 250.442, height: 375.663 }, "4.139px 63.838px", 0),
				txt("STAK", 1),
				maskTile(A.ctaTile2, { left: -2.08, top: -77.01, width: 244.731, height: 366.332 }, "2.082px 77.013px", 2),
				imgTile(A.ctaTile3, { left: "calc(50% - 0.3px)", top: "calc(50% + 48.22px)", transform: "translate(-50%,-50%)", width: 313.692, height: 312.908 }, 3),
			], "calc(50% - 70.48px)", 0, 1004.637)}
			{row([
				imgTile(A.ctaTile4, { left: "calc(50% + 0.12px)", top: "calc(50% + 17.69px)", transform: "translate(-50%,-50%)", width: 260.41, height: 390.615 }, 0),
				maskTile(A.ctaTile5, { left: -8.25, top: -24.29, width: 260.799, height: 346.065 }, "8.252px 24.286px", 1),
				imgTile(A.ctaTile4, { left: "calc(50% + 0.12px)", top: "calc(50% + 17.69px)", transform: "translate(-50%,-50%)", width: 260.41, height: 390.615 }, 2),
				txt("IT", 3),
				imgTile(A.ctaTile6, { left: -30.53, top: -326.1, width: 349.632, height: 651.487 }, 4),
				emptyTile(5),
			], "calc(50% - 0.05px)", 148.48, 1513.893)}
			{row([
				imgTile(A.ctaTile7, { left: -48.57, top: -16.66, width: 314.99, height: 314.99 }, 0),
				txt("UP", 1),
				imgTile(A.ctaTile8, { left: "calc(50% + 0.34px)", top: "calc(50% - 7.63px)", transform: "translate(-50%,-50%)", width: 287.237, height: 287.237 }, 2),
				imgTile(A.ctaTile9, { left: -15.96, top: -90.19, width: 271.973, height: 388.006 }, 3),
				maskTile(A.ctaTile5, { left: -8.24, top: -24.29, width: 260.799, height: 346.065 }, "8.243px 24.286px", 4),
			], "calc(50% - 53.83px)", 296.95, 1259.265)}
		</ScaledArt>
	);
}

/* Phone mosaic (Figma 1:1586), on the 390 frame. */
function CommunityTiles390() {
	const tb: CSSProperties = { width: 182.724, height: 97.944, borderRadius: 6.319, overflow: "hidden", position: "relative", flexShrink: 0 };
	const imgTile = (src: string, st: CSSProperties, key: number) => <div key={key} style={{ ...tb, background: TILE_BG }}><img src={src} alt="" loading="lazy" decoding="async" style={{ position: "absolute", objectFit: "cover", maxWidth: "none", ...st }} /></div>;
	const maskTile = (src: string, st: CSSProperties, mpos: string, key: number) => (
		<div key={key} style={tb}>
			<div style={{ position: "absolute", WebkitMaskImage: `url(${A.ctaMqMask})`, maskImage: `url(${A.ctaMqMask})`, WebkitMaskSize: "182.724px 97.944px", maskSize: "182.724px 97.944px", WebkitMaskPosition: mpos, maskPosition: mpos, WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat", ...st }}>
				<img src={src} alt="" loading="lazy" decoding="async" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
			</div>
		</div>
	);
	const txt = (t: string, key: number) => <div key={key} style={tb}><p style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", fontFamily: SQ, fontSize: 42.126, color: "#fff", margin: 0, whiteSpace: "nowrap", lineHeight: "23.696px" }}>{t}</p></div>;
	const emptyTile = (key: number) => <div key={key} style={{ ...tb, background: TILE_BG }} />;
	const row = (tiles: ReactNode[], left: string, top: number, w: number) => (
		<div style={{ position: "absolute", left, top, transform: "translateX(-50%)", width: w, display: "flex", gap: 10.532, alignItems: "center" }}>{tiles}</div>
	);
	return (
		<ScaledArt width={390} height={324}>
			{row([
				maskTile(A.ctaTile1, { left: "calc(50% + 0.53px)", top: "calc(50% + 45.14px)", transform: "translate(-50%,-50%)", width: 190.078, height: 285.117 }, "3.143px 48.45px", 0),
				txt("STAK", 1),
				maskTile(A.ctaTile2, { left: -1.58, top: -58.45, width: 185.744, height: 278.035 }, "1.577px 58.453px", 2),
				imgTile(A.ctaTile3, { left: "calc(50% - 0.23px)", top: "calc(50% + 36.6px)", transform: "translate(-50%,-50%)", width: 238.083, height: 237.488 }, 3),
			], "calc(50% + 147.05px)", 0, 762.489)}
			{row([
				imgTile(A.ctaTile4, { left: "calc(50% + 0.09px)", top: "calc(50% + 13.43px)", transform: "translate(-50%,-50%)", width: 197.643, height: 296.465 }, 0),
				maskTile(A.ctaTile5, { left: -6.26, top: -18.43, width: 197.939, height: 262.653 }, "6.261px 18.429px", 1),
				imgTile(A.ctaTile4, { left: "calc(50% + 0.09px)", top: "calc(50% + 13.43px)", transform: "translate(-50%,-50%)", width: 197.643, height: 296.465 }, 2),
				txt("IT", 3),
				imgTile(A.ctaTile6, { left: -23.17, top: -247.5, width: 265.36, height: 494.46 }, 4),
				emptyTile(5),
			], "calc(50% + 200.5px)", 112.69, 1149)}
			{row([
				imgTile(A.ctaTile7, { left: -36.86, top: -12.64, width: 239.068, height: 239.068 }, 0),
				txt("UP", 1),
				imgTile(A.ctaTile8, { left: "calc(50% + 0.26px)", top: "calc(50% - 5.79px)", transform: "translate(-50%,-50%)", width: 218.005, height: 218.005 }, 2),
				imgTile(A.ctaTile9, { left: -12.11, top: -68.45, width: 206.42, height: 294.485 }, 3),
				maskTile(A.ctaTile5, { left: -6.26, top: -18.43, width: 197.939, height: 262.653 }, "6.256px 18.435px", 4),
			], "calc(50% + 159.69px)", 225.38, 955.745)}
		</ScaledArt>
	);
}

function FinalCta() {
	const l = useLayout();
	const desktop = l === "desktop";
	return (
		<Section k="finalCta" style={{ overflow: "hidden", paddingTop: TOKENS[l].padTop, paddingBottom: desktop ? 326 : l === "tablet" ? 337 : 239 }}>
			<SectionIntro
				k="finalCta"
				pill="Our growing community"
				largePill
				lines={["Our community of fast rising", "young investors"]}
				sub={["Join a generation that invests with confidence.", "Sign up free and start STAKing today."]}
				subGap={l === "phone" ? 15 : 20}
				lineHeight={desktop ? 45 : 35}
			/>
			<div style={{ marginTop: desktop ? 159 : l === "tablet" ? 142 : 158 }}>
				{desktop ? <CommunityTiles1400 /> : l === "tablet" ? <CommunityTiles810 /> : <CommunityTiles390 />}
			</div>
		</Section>
	);
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  SECTION 8: FOOTER                                                   */
/* ═══════════════════════════════════════════════════════════════════ */
/** A store badge's frame: white, black edge, 120x40 at the design's spacing. */
const BADGE: CSSProperties = { background: "#fff", border: "1px solid #000", minWidth: 120, minHeight: 40, boxSizing: "border-box", borderRadius: 6, display: "flex", alignItems: "center", gap: 7, padding: "3px 6px", cursor: "pointer" };

/* The store badges open early access until the apps are out. */
function FooterAppleStoreButton() {
	const openEarlyAccess = useContext(EarlyAccessContext);
	return (
		<button
			type="button"
			onClick={openEarlyAccess}
			aria-label="Download on the App Store"
			style={BADGE}
		>
			<div style={{ width: 20, height: 24, flexShrink: 0 }} aria-hidden="true">
				<svg
					width="100%"
					height="100%"
					viewBox="0 0 20 24"
					preserveAspectRatio="none"
					fill="none"
					xmlns="http://www.w3.org/2000/svg"
					style={{ display: "block" }}
				>
					<g>
						<path
							d="M16.7045 12.7631C16.7166 11.8432 16.9669 10.9413 17.4321 10.1412C17.8972 9.34108 18.5621 8.66885 19.3648 8.18702C18.8548 7.47597 18.1821 6.89081 17.4 6.478C16.6178 6.0652 15.7479 5.83613 14.8592 5.80898C12.9635 5.61471 11.1258 6.91644 10.1598 6.91644C9.17506 6.91644 7.68776 5.82827 6.08616 5.86044C5.05021 5.89311 4.04059 6.18722 3.15568 6.7141C2.27077 7.24099 1.54075 7.98268 1.03674 8.86691C-1.14648 12.5573 0.482005 17.9809 2.57338 20.964C3.61975 22.4247 4.84264 24.0564 6.44279 23.9985C8.00863 23.9351 8.59344 23.0237 10.4835 23.0237C12.3561 23.0237 12.9048 23.9985 14.5374 23.9617C16.2176 23.9351 17.2762 22.4945 18.2859 21.02C19.0377 19.9792 19.6162 18.8288 20 17.6116C19.0238 17.2085 18.1908 16.5338 17.6048 15.6716C17.0187 14.8094 16.7056 13.7979 16.7045 12.7631Z"
							fill="#000000"
						/>
						<path
							d="M13.6208 3.84713C14.5369 2.77343 14.9883 1.39335 14.879 0C13.4794 0.143519 12.1865 0.796596 11.258 1.82911C10.804 2.33351 10.4563 2.92033 10.2348 3.55601C10.0132 4.19168 9.92221 4.86375 9.96687 5.5338C10.6669 5.54084 11.3595 5.3927 11.9924 5.10054C12.6254 4.80838 13.1821 4.37982 13.6208 3.84713Z"
							fill="#000000"
						/>
					</g>
				</svg>
			</div>

			<div
				style={{ minWidth: 78, display: "flex", flexDirection: "column", alignItems: "flex-start", color: "#000" }}
			>
				<p
					style={{ fontFamily: "'SF Compact Text', -apple-system, sans-serif", fontWeight: 500, fontSize: 9, lineHeight: "9px", margin: 0, textAlign: "left" }}
				>
					Download on the
				</p>
				<p
					style={{ fontFamily: "'SF Compact Display', -apple-system, sans-serif", fontWeight: 500, fontSize: 18, lineHeight: "1", letterSpacing: -0.47, margin: 0, textAlign: "left" }}
				>
					App Store
				</p>
			</div>
		</button>
	);
}

function FooterPlayStoreButton() {
	const openEarlyAccess = useContext(EarlyAccessContext);
	return (
		<button
			type="button"
			onClick={openEarlyAccess}
			aria-label="Get it on Google Play"
			style={BADGE}
		>
			<div style={{ width: 21, height: 24, flexShrink: 0 }} aria-hidden="true">
				<svg
					width="100%"
					height="100%"
					viewBox="0 0 21 24"
					preserveAspectRatio="none"
					fill="none"
					xmlns="http://www.w3.org/2000/svg"
					style={{ display: "block" }}
				>
					<g>
						<path
							d="M9.80482 11.4617L0.0896003 22.0059C0.0905128 22.0078 0.0905127 22.0106 0.0914252 22.0125C0.389807 23.1574 1.41179 24 2.62539 24C3.11083 24 3.56616 23.8656 3.95671 23.6305L3.98773 23.6118L14.9229 17.1593L9.80482 11.4617Z"
							fill="#EA4335"
						/>
						<path
							d="M19.6331 9.66619L19.624 9.65966L14.9028 6.86123L9.58391 11.7013L14.9219 17.1582L19.6176 14.3878C20.4406 13.9324 21 13.045 21 12.0223C21 11.0052 20.4489 10.1225 19.6331 9.66619Z"
							fill="#FBBC04"
						/>
						<path
							d="M0.0894234 1.99332C0.0310244 2.21353 0 2.44495 0 2.68382V21.3164C0 21.5552 0.0310245 21.7866 0.0903359 22.0059L10.1386 11.7313L0.0894234 1.99332Z"
							fill="#4285F4"
						/>
						<path
							d="M9.87657 11.9999L14.9044 6.85936L3.98192 0.383511C3.58499 0.139967 3.12145 1.42739e-07 2.62597 1.42739e-07C1.41237 1.42739e-07 0.38856 0.844472 0.0901781 1.99034C0.0901781 1.99128 0.0892662 1.99221 0.0892662 1.99314L9.87657 11.9999Z"
							fill="#34A853"
						/>
					</g>
				</svg>
			</div>

			<div
				style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 3 }}
			>
				<p
					style={{ fontFamily: "'Product Sans', Arial, sans-serif", fontSize: 10, color: "#000", margin: 0, textTransform: "uppercase", lineHeight: "normal", textAlign: "left" }}
				>
					GET IT ON
				</p>
				<div style={{ width: 74, height: 15, transform: "scaleY(-1)" }}>
					<img src={A.footerPlayText} alt="Google Play" style={{ width: "100%", height: "100%" }} />
				</div>
			</div>
		</button>
	);
}

/* Desktop: a hairline, then a giant STAK fading into the page, stretched to the full width (decoration). */
function FooterBottomBand() {
	return (
		<div
			style={{ width: "100%", height: 348, background: SECTION_BG, overflow: "visible", position: "relative" }}
		>
			<div
				style={{ position: "absolute", left: 0, top: 5.5, width: "100%", height: 0.5, background: "rgba(255,255,255,0.47)" }}
				aria-hidden="true"
			/>

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
					x={700.5}
					y={284}
					textAnchor="middle"
					fontFamily="'Squarish Sans CT', sans-serif"
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

/** The footer's "Privacy terms" slot: the Privacy Policy and the Terms of Service, side by side on one line. */
function LegalFooterLinks({ style }: { style: CSSProperties }) {
	const link: CSSProperties = { ...style, color: "inherit", textDecoration: "none" };
	return (
		<span style={{ ...style, display: "inline-flex", gap: 6, alignItems: "center" }}>
			<a href="/privacy" style={link}>Privacy</a>
			<span aria-hidden="true">·</span>
			<a href="/terms" style={link}>Terms</a>
		</span>
	);
}

/** A footer column: its heading and items. */
function FooterColumn({ title, children, labelledNav = false }: { title: string; children: ReactNode; labelledNav?: boolean }) {
	const desktop = useLayout() === "desktop";
	const id = `landing-footer-${title.toLowerCase().replace(/\s+/g, "-")}`;
	const list = (
		<ul style={{ display: "flex", flexDirection: "column", gap: desktop ? 18 : 14, alignItems: "flex-start", listStyle: "none", margin: 0, padding: 0, fontFamily: SR, fontWeight: 300, fontSize: 16, lineHeight: "25px", color: "#fff" }}>
			{children}
		</ul>
	);
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: desktop ? 49 : 30, alignItems: "flex-start", minWidth: 135 }}>
			<h2 id={id} style={{ fontFamily: SR, fontWeight: desktop ? 400 : 600, fontSize: desktop ? 18 : 16, lineHeight: "25px", color: "#fff", margin: 0 }}>{title}</h2>
			{labelledNav ? <nav aria-labelledby={id}>{list}</nav> : list}
		</div>
	);
}

function Footer({ onSubscribe, onScrollTo }: { onSubscribe: (email: string) => void; onScrollTo: (k: SectionKey) => void }) {
	const l = useLayout();
	const desktop = l === "desktop";
	const [email, setEmail] = useState("");
	const item: CSSProperties = { ...btnReset, fontFamily: SR, fontWeight: 300, fontSize: 16, lineHeight: "25px", color: "#fff", textAlign: "left" };

	const brand = (
		<div style={{ display: "flex", flexDirection: "column", gap: 59, alignItems: "flex-start", flex: desktop ? "0 1 530px" : undefined, minWidth: desktop ? 260 : undefined }}>
			<div style={{ display: "flex", flexDirection: "column", gap: 40, alignItems: "flex-start" }}>
				<NavLogo width={109.131} />
				<p style={{ fontFamily: SR, fontWeight: 300, fontSize: 14, lineHeight: "25px", color: "#fff", margin: 0, maxWidth: desktop ? 380 : 686 }}>
					You’ve heard the advice — "invest early, invest often." But nobody tells you how. Every platform you open hits you with charts, tickers, and jargon that feels designed to make you feel dumb
				</p>
			</div>
			<div style={{ display: "flex", flexWrap: "wrap", gap: 15, alignItems: "center" }}>
				<FooterPlayStoreButton />
				<FooterAppleStoreButton />
			</div>
		</div>
	);
	const useful = (
		<FooterColumn title="Useful Links" labelledNav>
			<li><button type="button" onClick={() => onScrollTo("hero")} style={item}>Home</button></li>
			<li><button type="button" onClick={() => onScrollTo("howItWorks")} style={item}>How it works</button></li>
			<li><button type="button" onClick={() => onScrollTo("features")} style={item}>Features</button></li>
			<li><button type="button" onClick={() => onScrollTo("faq")} style={item}>FAQ</button></li>
			<li><LegalFooterLinks style={{ fontFamily: SR, fontWeight: 300, fontSize: 16, lineHeight: "25px", color: "#fff" }} /></li>
		</FooterColumn>
	);
	// Instagram links out; the others have no page yet, so they stay text.
	const social = (
		<FooterColumn title="Social Links">
			<li>Facebook</li>
			<li><a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" style={{ color: "#fff", textDecoration: "none" }}>Instagram</a></li>
			<li>X</li>
			<li>Tiktok</li>
			<li>Discord</li>
		</FooterColumn>
	);
	const newsletter = (
		<div style={{ display: "flex", flexDirection: "column", gap: desktop ? 135 : l === "tablet" ? 127 : 51, alignItems: "flex-start" }}>
			<div style={{ display: "flex", flexDirection: "column", gap: desktop ? 48 : 24, alignItems: "flex-start" }}>
				<h2 style={{ fontFamily: SR, fontWeight: 400, fontSize: desktop ? 18 : 16, lineHeight: "25px", color: "#fff", margin: 0 }}>Subscribe to our newsletter</h2>
				<form
					onSubmit={(e) => { e.preventDefault(); onSubscribe(email); }}
					className="landing-newsletter"
					style={{ background: "rgba(255,255,255,0.07)", border: "1px solid #64789A", padding: "8px 9px 8px 11px", borderRadius: 13, display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center", maxWidth: "100%", boxSizing: "border-box" }}
				>
					<input
						type="email"
						required
						autoComplete="email"
						aria-label="Email address for the newsletter"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						placeholder="Your email address"
						style={{ fontFamily: SR, fontWeight: 300, fontSize: desktop ? 12 : 16, lineHeight: "25px", color: "#fff", background: "transparent", border: 0, outline: "none", flex: "1 1 120px", minWidth: 0, width: 120 }}
					/>
					<CtaButton type="submit" label="Subscribe" withArrow={false} fontSize={14.453} />
				</form>
			</div>
			<p style={{ fontFamily: SR, fontWeight: 300, fontSize: 12, lineHeight: "16px", color: "#fff", margin: 0 }}>© 2026 All rights reserved</p>
		</div>
	);

	return (
		<footer style={{ background: SECTION_BG }}>
			{desktop ? (
				<>
					<div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 48, padding: "35px max(24px, calc((100% - 1226px) / 2)) 35px" }}>
						<div style={{ display: "flex", flexWrap: "wrap", gap: 58, alignItems: "flex-start", flex: "1 1 auto" }}>
							{brand}
							{useful}
							{social}
						</div>
						{newsletter}
					</div>
					<FooterBottomBand />
				</>
			) : (
				<div style={{ display: "flex", flexDirection: "column", gap: 58, padding: "40px 24px", maxWidth: 810, margin: "0 auto", boxSizing: "border-box" }}>
					{brand}
					{l === "tablet" ? (
						<div style={{ display: "flex", flexWrap: "wrap", gap: "58px 134px", alignItems: "flex-start" }}>
							<div style={{ display: "flex", flexWrap: "wrap", gap: 58, alignItems: "flex-start" }}>{useful}{social}</div>
							{newsletter}
						</div>
					) : (
						<>
							{useful}
							{social}
							{newsletter}
						</>
					)}
				</div>
			)}
		</footer>
	);
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  ROOT: LandingPage                                                   */
/* ═══════════════════════════════════════════════════════════════════ */
const prefersReducedMotion = () => typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function LandingPage() {
	const { appUser, loading } = useAuth();
	const { account, accountLoading } = useAccount();
	const navigate = useNavigate();
	const scrollRef = useRef<HTMLDivElement>(null);
	const headerRef = useRef<HTMLElement>(null);
	// Only the layout is kept, so a resize re-renders the page when it crosses a breakpoint, not on every pixel.
	const [layout, setLayout] = useState<Layout>(() => layoutFor(typeof window !== "undefined" ? window.innerWidth : 1400));
	const [headerH, setHeaderH] = useState(0);

	useEffect(() => {
		if (loading || accountLoading) return;
		if (appUser) {
			navigate({ to: account?.onboardingCompleted ? "/" : "/onboarding" });
		}
	}, [appUser, loading, accountLoading, navigate, account?.onboardingCompleted]);

	useLayoutEffect(() => {
		/* The scroll box's clientWidth (not innerWidth, which counts a scrollbar), in CSS px - so zooming in narrows it
		   and moves to the tablet, then the phone layout. ResizeObserver catches zoom and scrollbar changes too. */
		const compute = () => {
			setLayout(layoutFor(scrollRef.current ? scrollRef.current.clientWidth : window.innerWidth));
			setHeaderH(headerRef.current?.offsetHeight ?? 0);
		};
		compute();
		window.addEventListener("resize", compute);
		const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(compute) : null;
		if (ro && scrollRef.current) ro.observe(scrollRef.current);
		if (ro && headerRef.current) ro.observe(headerRef.current);
		return () => {
			window.removeEventListener("resize", compute);
			ro?.disconnect();
		};
	}, []);

	/* Scrolls the section up to just under the header (its label 16px clear of it) and takes keyboard focus there
	   with it, so Tab carries on from the section, not from the link that was pressed. */
	const scrollTo = useCallback((key: SectionKey) => {
		const box = scrollRef.current;
		const target = document.getElementById(sectionId(key));
		if (!box || !target) return;
		const sectionTop = target.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop;
		const padTop = parseFloat(getComputedStyle(target).paddingTop) || 0;
		const top = key === "hero" ? 0 : Math.max(0, sectionTop + padTop - (headerRef.current?.offsetHeight ?? 0) - 16);
		box.scrollTo({ top, behavior: prefersReducedMotion() ? "auto" : "smooth" });
		document.getElementById(`${sectionId(key)}-title`)?.focus({ preventScroll: true });
	}, []);

	const handleEmail = useCallback(() => {
		window.location.href = "mailto:support@thestak.org";
	}, []);
	const handleSubscribe = useCallback((email: string) => {
		if (!email) return;
		window.location.href = `mailto:favour@thestak.org?subject=Newsletter%20signup&body=${encodeURIComponent(email)}`;
	}, []);
	const { join } = useSearch({ strict: false }) as { join?: "1" };
	const [earlyAccessOpen, setEarlyAccessOpen] = useState(false);
	useEffect(() => { if (join === "1") setEarlyAccessOpen(true); }, [join]);
	const openEarlyAccess = useCallback(() => setEarlyAccessOpen(true), []);
	// Closing drops ?join=1 too, so a refresh or Back doesn't open the form again.
	const closeEarlyAccess = useCallback(() => {
		setEarlyAccessOpen(false);
		if (join) navigate({ to: "/welcome", search: {}, replace: true });
	}, [join, navigate]);

	return (
		<EarlyAccessContext.Provider value={openEarlyAccess}>
		<LayoutContext.Provider value={layout}>
		<div ref={scrollRef} className="landing-scroll" style={{ background: SECTION_BG, overflowY: "auto", overflowX: "hidden", scrollbarWidth: "none", scrollPaddingTop: headerH }}>
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
				.landing-scroll {
					height: 100vh;
					height: 100dvh;
				}
				.landing-scroll::-webkit-scrollbar {
					display: none;
				}
				.landing-faq-q {
					background: #1a2237;
					transition: background-color 0.2s ease;
				}
				.landing-faq-q:hover {
					background: #2a3552;
				}
				.landing-scroll :is(a, button):focus-visible {
					outline: 2px solid #69B3CA;
					outline-offset: 2px;
				}
				.landing-scroll .landing-faq-q:focus-visible {
					outline-offset: -2px;
				}
				.landing-newsletter:focus-within {
					outline: 2px solid #69B3CA;
					outline-offset: 2px;
				}
				.landing-proof-scroll::-webkit-scrollbar {
					display: none;
				}
				.landing-proof-scroll:focus-visible {
					outline: 2px solid #69B3CA;
					outline-offset: -2px;
				}
				.landing-scroll input::placeholder {
					color: #819ABB;
				}
			`}</style>
			<Header ref={headerRef} onScrollTo={scrollTo} />
			<div className="landing-page" data-layout={layout}>
				<Hero />
				<Problem />
				<HowItWorks />
				<Features />
				<EarlyMomentum />
				<Faq onEmail={handleEmail} />
				<FinalCta />
				<Footer onSubscribe={handleSubscribe} onScrollTo={scrollTo} />
			</div>
		</div>
		</LayoutContext.Provider>
		<EarlyAccessModal open={earlyAccessOpen} onClose={closeEarlyAccess} />
		</EarlyAccessContext.Provider>
	);
}
