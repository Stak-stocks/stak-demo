/** @jsxRuntime automatic */
/** @jsxImportSource react */
// ^ Every tool that compiles this file (tsx in the backend, vitest, the preview server) uses the same JSX setup.

import type { ReactNode } from "react";
import { Body, Container, Head, Html, Preview, Section } from "@react-email/components";
import { C, FONT } from "../theme";

/**
 * Every STAK email's frame: the navy page, a 620px card, the inbox preview line, and the phone rules
 * (`.px` narrows the side padding; `.stack` puts side-by-side columns one under another).
 */
export function EmailLayout({ preview, children }: { preview: string; children: ReactNode }) {
	return (
		<Html lang="en">
			<Head>
				<meta name="color-scheme" content="dark" />
				<meta name="supported-color-schemes" content="dark" />
				<style>{`
					@media only screen and (max-width: 620px) {
						.px { padding-left: 22px !important; padding-right: 22px !important; }
						.stack { display: block !important; width: 100% !important; padding: 0 0 18px !important; }
						.h1 { font-size: 30px !important; line-height: 36px !important; }
					}
				`}</style>
			</Head>
			<Preview>{preview}</Preview>
			<Body style={{ margin: 0, padding: 0, backgroundColor: C.page, fontFamily: FONT }}>
				<Container style={{ width: "100%", maxWidth: 620, margin: "0 auto", padding: "28px 12px" }}>
					<Section style={{ backgroundColor: C.card, border: `1px solid ${C.border}`, borderRadius: 24 }}>
						{children}
					</Section>
				</Container>
			</Body>
		</Html>
	);
}
