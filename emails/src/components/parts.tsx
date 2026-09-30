/** @jsxRuntime automatic */
/** @jsxImportSource react */
// ^ Every tool that compiles this file (tsx in the backend, vitest, the preview server) uses the same JSX setup.

import type { ReactNode } from "react";
import { Button, Hr, Link, Section, Text } from "@react-email/components";
import { C, FONT, INSTAGRAM_URL } from "../theme";

/** The STAK wordmark as text: it reads with images off, and needs no hosted file. */
export function Wordmark({ size = 24 }: { size?: number }) {
	return <Text style={{ margin: 0, fontFamily: FONT, fontSize: size, fontWeight: 800, letterSpacing: Math.round(size * 0.3), color: C.white, textAlign: "center" }}>STAK</Text>;
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

/** The sign-off every STAK email ends with: wordmark, tagline, Instagram, why you got it, and how to stop. */
export function Footer({ reason, unsubscribeUrl }: { reason: string; unsubscribeUrl?: string | null }) {
	const small = { margin: "0 0 6px", fontFamily: FONT, fontSize: 12, lineHeight: "18px", color: C.muted, textAlign: "center" as const };
	return (
		<Section className="px" style={{ padding: "26px 40px 32px", textAlign: "center" }}>
			<Wordmark size={20} />
			<Text style={{ margin: "8px 0 18px", fontFamily: FONT, fontSize: 11, fontWeight: 700, letterSpacing: 2, color: C.muted, textAlign: "center" }}>
				BEFORE YOU BUY ANYTHING, <span style={{ color: C.teal }}>STAK IT.</span>
			</Text>
			<Text style={{ margin: "0 0 18px", textAlign: "center" }}>
				<Link href={INSTAGRAM_URL} style={{ fontFamily: FONT, fontSize: 13, color: C.teal, textDecoration: "none" }}>Follow us on Instagram</Link>
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
