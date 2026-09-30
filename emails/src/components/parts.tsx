/** @jsxRuntime automatic */
/** @jsxImportSource react */
// ^ Every tool that compiles this file (tsx in the backend, vitest, the preview server) uses the same JSX setup.

import type { ReactNode } from "react";
import { Button, Hr, Img, Link, Section, Text } from "@react-email/components";
import { ASSET_BASE, C, FONT, INSTAGRAM_URL } from "../theme";

/** The STAK logo (the landing page's icon + wordmark). With images off, its alt text is styled as the wordmark. */
export function Logo({ width = 132 }: { width?: number }) {
	const height = Math.round((width * 26.479) / 109.131);
	return (
		<Img
			src={`${ASSET_BASE}/logo.png`}
			width={width}
			height={height}
			alt="STAK"
			style={{ display: "block", margin: "0 auto", border: 0, fontFamily: FONT, fontSize: Math.round(height * 0.75), fontWeight: 800, letterSpacing: 6, color: C.white, textAlign: "center" }}
		/>
	);
}

/**
 * The card's top strip: the logo beside the glass STAK mark, as one image (see build-images.mjs). Rounded to the
 * card's top corners; with images off, its alt text stands in as the wordmark.
 */
export function HeroBanner() {
	return (
		<Img
			src={`${ASSET_BASE}/hero.jpg`}
			width={594}
			alt="STAK"
			style={{ display: "block", width: "100%", maxWidth: 594, height: "auto", border: 0, borderRadius: "24px 24px 0 0", fontFamily: FONT, fontSize: 24, fontWeight: 800, letterSpacing: 6, color: C.white, textAlign: "center" }}
		/>
	);
}

/** A 48px teal line icon in a navy circle, from frontend/public/email. Decorative, so no alt text. */
export function CircleIcon({ name }: { name: string }) {
	return <Img src={`${ASSET_BASE}/${name}.png`} width={48} height={48} alt="" style={{ display: "block", margin: "0 auto 12px", border: 0 }} />;
}

/** The one primary action: a full-width teal pill with navy text. */
export function CtaButton({ href, children }: { href: string; children: ReactNode }) {
	return (
		<Button
			href={href}
			style={{ display: "block", boxSizing: "border-box", width: "100%", margin: "28px 0 10px", padding: "16px 28px", backgroundColor: C.teal, borderRadius: 28, fontFamily: FONT, fontSize: 17, fontWeight: 700, lineHeight: "22px", color: C.page, textAlign: "center", textDecoration: "none" }}
		>
			{children}
		</Button>
	);
}

/** A hairline across the card. */
export function Divider() {
	return (
		<Section className="px" style={{ padding: "0 40px" }}>
			<Hr style={{ margin: 0, border: "none", borderTop: `1px solid ${C.border}` }} />
		</Section>
	);
}

/** "WHAT HAPPENS NEXT"-style section label. */
export function SectionLabel({ children }: { children: ReactNode }) {
	return <Text style={{ margin: "0 0 20px", fontFamily: FONT, fontSize: 12, fontWeight: 700, letterSpacing: 3, color: C.muted }}>{children}</Text>;
}

/** The sign-off every STAK email ends with: logo, tagline, Instagram, why you got it, and how to stop. */
export function Footer({ reason, unsubscribeUrl }: { reason: string; unsubscribeUrl?: string | null }) {
	const small = { margin: "0 0 6px", fontFamily: FONT, fontSize: 12, lineHeight: "18px", color: C.muted, textAlign: "center" as const };
	return (
		<Section className="px" style={{ padding: "26px 40px 32px", textAlign: "center" }}>
			<Logo width={100} />
			<Text style={{ margin: "12px 0 18px", fontFamily: FONT, fontSize: 11, fontWeight: 700, letterSpacing: 2, color: C.muted, textAlign: "center" }}>
				BEFORE YOU BUY ANYTHING, <span style={{ color: C.teal }}>STAK IT.</span>
			</Text>
			<Text style={{ margin: "0 0 18px", textAlign: "center" }}>
				<Link href={INSTAGRAM_URL} style={{ display: "inline-block" }}>
					<Img src={`${ASSET_BASE}/instagram.png`} width={24} height={24} alt="Instagram" style={{ display: "block", border: 0, fontFamily: FONT, fontSize: 13, color: C.teal }} />
				</Link>
			</Text>
			<Text style={small}>© {new Date().getFullYear()} STAK. All rights reserved.</Text>
			<Text style={{ ...small, margin: "0 0 10px" }}>{reason}</Text>
			{unsubscribeUrl && (
				<Text style={{ ...small, margin: 0 }}>
					<Link href={unsubscribeUrl} style={{ color: C.teal, textDecoration: "underline" }}>Unsubscribe</Link>
				</Text>
			)}
		</Section>
	);
}
