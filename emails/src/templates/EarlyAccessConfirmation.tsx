/** @jsxRuntime automatic */
/** @jsxImportSource react */
// ^ Every tool that compiles this file (tsx in the backend, vitest, the preview server) uses the same JSX setup.

import { Column, Heading, Row, Section, Text } from "@react-email/components";
import { EmailLayout } from "../components/EmailLayout";
import { CtaButton, Divider, Footer, SectionLabel, Wordmark } from "../components/parts";
import { C, FONT } from "../theme";

export interface EarlyAccessConfirmationProps {
	/** The person's Tally beta profile link (their email and source pre-filled). No link, no button. */
	betaProfileUrl?: string | null;
	unsubscribeUrl?: string | null;
}

export const EARLY_ACCESS_SUBJECT = "You’re on the STAK early-access list";
export const EARLY_ACCESS_PREVIEW = "We’re almost ready. Here’s what happens next.";

const NEXT = [
	{ title: "Beta waves", body: "We’ll invite early users in small groups." },
	{ title: "Product updates", body: "You’ll hear when something meaningful ships." },
	{ title: "Help shape STAK", body: "Your feedback will influence what we build next." },
];

/** Sent when someone joins the early-access list from the landing page. One action: complete the beta profile. */
export default function EarlyAccessConfirmation({ betaProfileUrl, unsubscribeUrl }: EarlyAccessConfirmationProps) {
	const body = { margin: 0, fontFamily: FONT, fontSize: 16, lineHeight: "26px", color: C.text };
	return (
		<EmailLayout preview={EARLY_ACCESS_PREVIEW}>
			<Section className="px" style={{ padding: "32px 40px 8px" }}>
				<Wordmark />
			</Section>

			<Section className="px" style={{ padding: "24px 40px 28px" }}>
				<Text style={{ display: "inline-block", margin: 0, padding: "7px 14px", borderRadius: 999, backgroundColor: C.card2, fontFamily: FONT, fontSize: 13, fontWeight: 600, color: C.white }}>
					<span style={{ color: C.teal }}>●</span>&nbsp; You’re in.
				</Text>
				<Heading as="h1" className="h1" style={{ margin: "22px 0 12px", fontFamily: FONT, fontSize: 34, lineHeight: "40px", fontWeight: 700, color: C.white }}>
					You’re on the <span style={{ color: C.teal }}>STAK</span>
					<br />
					early-access list.
				</Heading>
				<Text style={{ margin: "0 0 22px", fontFamily: FONT, fontSize: 18, lineHeight: "26px", color: C.text }}>{EARLY_ACCESS_PREVIEW}</Text>
				<Text style={body}>
					Thanks for joining STAK. We’re getting ready to open access to our first group of beta testers. Early users will get to try the product before launch and help us shape what we build next.
				</Text>
				{betaProfileUrl && (
					<>
						<CtaButton href={betaProfileUrl}>Complete your Beta Profile →</CtaButton>
						<Text style={{ margin: 0, fontFamily: FONT, fontSize: 13, lineHeight: "20px", color: C.muted, textAlign: "center" }}>
							Takes about 60–90 seconds. Optional, but it helps us choose our first beta testers.
						</Text>
					</>
				)}
			</Section>

			<Divider />

			<Section className="px" style={{ padding: "26px 32px 8px" }}>
				<Section style={{ padding: "0 8px" }}><SectionLabel>WHAT HAPPENS NEXT</SectionLabel></Section>
				<Row>
					{NEXT.map((n) => (
						<Column key={n.title} className="stack" width="33%" style={{ padding: "0 8px 16px", textAlign: "center", verticalAlign: "top" }}>
							<Text style={{ margin: "0 0 6px", fontFamily: FONT, fontSize: 16, fontWeight: 700, lineHeight: "22px", color: C.white, textAlign: "center" }}>{n.title}</Text>
							<Text style={{ margin: 0, fontFamily: FONT, fontSize: 14, lineHeight: "21px", color: C.text, textAlign: "center" }}>{n.body}</Text>
						</Column>
					))}
				</Row>
			</Section>

			<Divider />
			<Footer reason="You’re receiving this because you joined the STAK early-access list." unsubscribeUrl={unsubscribeUrl} />
		</EmailLayout>
	);
}

/** What `npm run email:dev` shows. */
EarlyAccessConfirmation.PreviewProps = {
	betaProfileUrl: "https://tally.so/r/abc123?email=ada%40example.com&source=early_access_email",
	unsubscribeUrl: "https://example.com/api/waitlist/unsubscribe?token=preview",
} satisfies EarlyAccessConfirmationProps;
