/** @jsxRuntime automatic */
/** @jsxImportSource react */
// ^ Every tool that compiles this file (tsx in the backend, vitest, the preview server) uses the same JSX setup.

import { Column, Heading, Row, Section, Text } from "@react-email/components";
import { EmailLayout } from "../components/EmailLayout";
import { CircleIcon, CtaButton, Divider, Footer, HeroBanner, SectionLabel } from "../components/parts";
import { C, FONT } from "../theme";

export interface BetaSelectedProps {
	/** The tester's first name, from the beta application; without one, "Hi there,". */
	firstName?: string | null;
	/** The TestFlight public link (Cloud Run env BETA_TESTFLIGHT_URL). */
	testflightUrl: string;
	unsubscribeUrl?: string | null;
}

export const BETA_SELECTED_SUBJECT = "You’ve been selected for the STAK beta";
export const BETA_SELECTED_PREVIEW = "Install STAK on your iPhone and tell us what you think.";

const NEXT = [
	{ icon: "icon-install", title: "Install & sign in", body: "Get the app through TestFlight, sign in or create your account, and set up your profile." },
	{ icon: "icon-explore", title: "Explore STAK", body: "Try key features like Discover, Quick Look, News, and Simulate." },
	{ icon: "icon-feedback", title: "Share your feedback", body: "Tell us what you like, what’s missing, and what we should improve: reply to this email, or use Help & support in the app." },
];

/** Sent once to each beta tester the team selects (the beta sheet's STAK -> Send selection emails). One action: install. */
export default function BetaSelected({ firstName, testflightUrl, unsubscribeUrl }: BetaSelectedProps) {
	const body = { margin: "0 0 14px", fontFamily: FONT, fontSize: 16, lineHeight: "26px", color: C.text };
	return (
		<EmailLayout preview={BETA_SELECTED_PREVIEW}>
			<Section>
				<HeroBanner />
			</Section>

			<Section className="px" style={{ padding: "12px 40px 28px" }}>
				<Text style={{ display: "inline-block", margin: 0, padding: "7px 14px", borderRadius: 999, backgroundColor: C.card2, fontFamily: FONT, fontSize: 13, fontWeight: 600, color: C.white }}>
					<span style={{ color: C.teal }}>●</span>&nbsp; You’re in.
				</Text>
				<Heading as="h1" className="h1" style={{ margin: "22px 0 18px", fontFamily: FONT, fontSize: 34, lineHeight: "40px", fontWeight: 700, color: C.white }}>
					You’ve been selected
					<br />
					for the <span style={{ color: C.teal }}>STAK</span> beta.
				</Heading>
				<Text style={body}>Hi {firstName?.trim() || "there"},</Text>
				<Text style={{ ...body, margin: 0 }}>
					We’re excited to have you join the first group of STAK beta testers. Your feedback will help us shape the future of investing intelligence.
				</Text>
				<CtaButton href={testflightUrl}>Install STAK Beta on iPhone →</CtaButton>
				<Text style={{ margin: 0, fontFamily: FONT, fontSize: 13, lineHeight: "20px", color: C.muted, textAlign: "center" }}>
					Open this email on your iPhone. The link opens in TestFlight; if you don’t have TestFlight yet, Apple will prompt you to install it.
				</Text>
				<Text style={{ margin: "10px 0 0", fontFamily: FONT, fontSize: 13, lineHeight: "20px", color: C.muted, textAlign: "center" }}>
					On Android? Reply to this email and we’ll send you the Android test link.
				</Text>
			</Section>

			<Divider />

			<Section className="px" style={{ padding: "26px 32px 8px" }}>
				<Section style={{ padding: "0 8px" }}><SectionLabel>WHAT TO DO NEXT</SectionLabel></Section>
				<Row>
					{NEXT.map((n) => (
						<Column key={n.title} className="stack" width="33%" style={{ padding: "0 8px 16px", textAlign: "center", verticalAlign: "top" }}>
							<CircleIcon name={n.icon} />
							<Text style={{ margin: "0 0 6px", fontFamily: FONT, fontSize: 16, fontWeight: 700, lineHeight: "22px", color: C.white, textAlign: "center" }}>{n.title}</Text>
							<Text style={{ margin: 0, fontFamily: FONT, fontSize: 14, lineHeight: "21px", color: C.text, textAlign: "center" }}>{n.body}</Text>
						</Column>
					))}
				</Row>
			</Section>

			<Divider />
			<Footer reason="You’re receiving this because you were selected for the STAK beta." unsubscribeUrl={unsubscribeUrl} />
		</EmailLayout>
	);
}

/** What `npm run email:dev` shows. */
BetaSelected.PreviewProps = {
	firstName: "Ada",
	testflightUrl: "https://testflight.apple.com/join/PREVIEW",
	unsubscribeUrl: "https://example.com/api/waitlist/unsubscribe?token=preview",
} satisfies BetaSelectedProps;
