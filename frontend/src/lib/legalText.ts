// The published Terms of Service and Privacy Policy: the founders' documents (STAK_Terms_of_Service and
// STAK_Privacy_Policy, October 7, 2026) with the October 8 corrections that bring them in line with the app (date of
// birth at sign-up, web and iOS push, Google sign-in, the Gemini models, in-app account deletion, notification
// settings and time zone, hosting) - in use pending the lawyer's review. Changing either means bumping TERMS_VERSION /
// PRIVACY_VERSION in shared/src/eligibility.ts, which asks every account to accept again.

/** A paragraph, or a bulleted list. */
export type LegalBlock = string | { list: string[] };
export interface LegalSection { heading: string; sub?: string; blocks: LegalBlock[] }
export interface LegalDoc { title: string; effective: string; notice: string; sections: LegalSection[] }

const NOTICE = "SUBJECT TO LEGAL REVIEW. STAK is not yet incorporated. These terms may be revised following review by STAK’s legal counsel and after formation of the legal entity. If material changes affect users after publication, STAK will notify registered users by email at the address associated with their account and may also provide notice through the Service.";

export const PRIVACY_POLICY: LegalDoc = {
	title: "Privacy Policy",
	effective: "October 8, 2026",
	notice: NOTICE,
	sections: [
		{ heading: "1. Overview", blocks: [
			"This Privacy Policy explains how STAK collects, uses, shares, and protects information when you use the STAK website, beta application, newsletters, and related services (collectively, the “Service”).",
			"STAK is currently operated by its founders and is not yet a separate incorporated legal entity. In this Policy, “STAK,” “we,” “us,” and “our” refer to the founders currently operating the Service under the STAK name. We expect to form a legal entity in the near future and will update this Policy when that occurs.",
			"The current beta is intended only for users located in the United States who are at least 18 years old.",
		] },
		{ heading: "2. Information We Collect", sub: "A. Account and contact information", blocks: [
			{ list: [
				"Name and email address.",
				"Account and authentication information needed to create, verify, secure, and maintain your account.",
				"Communications you send to STAK, including support requests and feedback.",
			] },
			"STAK uses Supabase Auth for account authentication, sign-up verification, and password-reset workflows. We do not need to view your password in plain text.",
			"If you choose to sign in with Google, Google shares your name, email address, and basic profile information with STAK to create and authenticate your account. Google’s own privacy terms govern the information it processes when you use Sign in with Google.",
		] },
		{ heading: "", sub: "B. Age and eligibility information", blocks: [
			"Before you use the Service, we ask for your date of birth, whether you currently reside in the United States, and your agreement to these Terms and this Privacy Policy.",
			{ list: [
				"We use your date of birth only to determine whether you are at least 18 years old. We do not store your date of birth.",
				"We store that your eligibility was confirmed and when, that you confirmed U.S. residence, and which versions of the Terms of Service and Privacy Policy you accepted and when.",
				"If a sign-up is declined because the person is under 18, we delete the account and keep only a one-way cryptographic hash of the email address for 30 days, so the same address cannot immediately sign up again. The hash cannot be used to read the email address.",
			] },
		] },
		{ heading: "", sub: "C. Beta-profile and survey information", blocks: [
			"If you complete a beta questionnaire or provide product feedback, we may collect information such as:",
			{ list: [
				"Your investing experience and investing journey.",
				"Research or investing tools you use.",
				"Investing challenges or areas where you want more clarity.",
				"Features you are most interested in trying.",
				"Device or operating-system information you provide.",
				"Your willingness to participate in beta testing, interviews, or feedback sessions.",
				"Open-ended survey responses and other feedback.",
			] },
			"If we use Tally for beta forms, Tally may process your responses. If those responses are routed to Google Sheets, Google may also process and store the submitted information on our behalf.",
		] },
		{ heading: "", sub: "D. Product and personalization activity", blocks: [
			"To operate and personalize STAK, we may collect information about how you interact with the Service, including:",
			{ list: [
				"Companies you save or “STAK,” pass on, revisit, search for, or explore.",
				"Swipe and discovery activity.",
				"Collections, watch interests, and companies or themes you follow.",
				"Articles, market updates, company pages, features, and topics you view or engage with.",
				"Questions, searches (including the recent-search history you keep), clicks, revisits, and other product interactions.",
				"Investing Taste or similar personalization signals inferred from your interactions.",
				"Simulated portfolio and paper-trading activity, including virtual trades and practice activity.",
				"Feature usage, session activity, and other events needed to operate, secure, and improve the beta.",
				"Notification settings, such as which alerts you receive and the price-move threshold you choose.",
			] },
			"STAK may use these interactions to personalize the companies, explanations, news, educational content, and other information shown to you. Personalized content reflects your activity on STAK and is not a determination that any investment is suitable for you.",
		] },
		{ heading: "", sub: "E. STAK AI information", blocks: [
			"If you use STAK AI, we may collect the prompts, questions, and other content you submit, along with relevant STAK context used to generate a response (for example, a company you are viewing or companies you have saved). STAK currently uses Google Gemini models (currently Gemini 2.5 Flash and Gemini 2.5 Flash-Lite) to support AI functionality, including STAK AI and AI-generated summaries of news and company information, and information included in an AI request may be transmitted to Google for processing.",
			"Please do not submit highly sensitive information to STAK AI, such as Social Security numbers, bank or brokerage passwords, payment-card numbers, medical information, or other credentials.",
		] },
		{ heading: "", sub: "F. Technical and device information", blocks: [
			"When you use the Service, STAK and its service providers may automatically process technical information such as browser type, device type, operating system, IP or network information, referral information, pages or features viewed, timestamps, authentication/session information, and security or error logs, to the extent generated or made available through the Service and our providers.",
			"If you allow notifications, we store a push-notification token for your device or browser, together with its notification settings and time zone (so reminders arrive at the right local time). In the mobile apps, Firebase Cloud Messaging processes device tokens to deliver notifications; on iPhone, it does so through Apple’s push notification service. If you turn on browser notifications on the website, your browser’s push service (for example, those run by Google, Mozilla, or Apple) processes a push subscription to deliver them. Firebase is not STAK’s primary database. STAK currently uses Vercel Analytics on the website and does not currently use a separate analytics provider in the mobile apps.",
		] },
		{ heading: "", sub: "G. Information we do not collect in the current beta", blocks: [
			{ list: [
				"The beta does not connect to brokerage accounts.",
				"The beta does not request or store brokerage login credentials.",
				"The beta does not execute real-money securities transactions or custody assets.",
				"The beta is free and does not currently collect payment-card information for subscriptions.",
			] },
			"If STAK later adds paid subscriptions, brokerage connectivity, or other financial-account functionality, we will update this Policy and provide any additional notices required before those features are launched.",
		] },
		{ heading: "3. How We Use Information", blocks: [
			{ list: [
				"Create, authenticate, secure, and maintain accounts.",
				"Confirm that users are eligible for the beta (at least 18 years old and located in the United States) and record acceptance of our Terms and Privacy Policy.",
				"Operate the STAK website, app, Discover, My STAK, News, Simulate, STAK AI, and related beta features.",
				"Remember companies, preferences, and other user-selected information.",
				"Personalize content, company discovery, Investing Taste, explanations, and other experiences.",
				"Generate AI-supported explanations and responses.",
				"Provide paper-trading and other simulated educational experiences.",
				"Send verification, password-reset, support, product, security, and other service communications.",
				"Send newsletters and marketing communications where you have subscribed or where otherwise permitted by law.",
				"Analyze product usage and website performance, improve STAK, diagnose bugs, and develop new features.",
				"Conduct beta testing, surveys, research, and product-feedback programs.",
				"Detect, investigate, and prevent fraud, abuse, security incidents, and violations of our Terms.",
				"Comply with legal obligations and protect the rights, safety, and integrity of STAK, our users, and others.",
			] },
		] },
		{ heading: "4. Aggregated and De-Identified Information", blocks: [
			"We may create aggregated or de-identified information that is not reasonably capable of identifying you. We may use that information to understand market and product trends, improve STAK, conduct research, develop product or business insights, and support commercial or partnership activities. We do not represent aggregated or de-identified information as information that identifies a specific user.",
		] },
		{ heading: "5. How We Share Information", blocks: [
			"We may share information with service providers and other parties only as reasonably necessary for the purposes described in this Policy, including:",
			{ list: [
				"Supabase - PostgreSQL database, account authentication, sign-up verification, and password resets.",
				"Google Cloud - hosting for STAK’s application servers.",
				"Google - Sign in with Google, if you choose it.",
				"Firebase Cloud Messaging (FCM) - mobile app push notifications (Android, and iPhone through Apple’s push notification service).",
				"Browser push services (for example, those run by Google, Mozilla, and Apple) - website notifications you turn on.",
				"Vercel Analytics - website analytics and performance measurement.",
				"Resend - application and product email delivery.",
				"Zoho Mail - STAK business and support inboxes, including support@thestak.org.",
				"Google Gemini (currently Gemini 2.5 Flash and Gemini 2.5 Flash-Lite) - AI processing for STAK AI and AI-generated summaries.",
				"Tally and Google Sheets - beta forms and response storage, if used for the beta questionnaire.",
				"Professional advisers and service providers, such as lawyers, accountants, security providers, hosting providers, and contractors, where reasonably necessary to support STAK.",
				"Government authorities, courts, regulators, or other parties when required by law or when reasonably necessary to protect rights, safety, security, or prevent fraud or abuse.",
			] },
			"STAK also uses third-party market and content sources, including Finnhub (quotes, company profiles, and company news), Yahoo Finance (charts, analyst recommendations, and earnings information), SEC EDGAR (company filings), and NewsAPI (general and market news). These services primarily provide market or content data to STAK. Their own privacy terms may govern information they independently receive through technical requests to their services.",
			"STAK does not sell identifiable personal information for money. If our data practices materially change, we will update this Policy and provide any notice or choices required by applicable law.",
		] },
		{ heading: "6. Email, Newsletter, and Push Notifications", blocks: [
			"STAK may send essential account and service messages, such as sign-up codes, password resets, security notices, and important product or legal notices. You may not be able to opt out of communications that are necessary to operate or secure your account.",
			"If you subscribe to The STAK Brief or other marketing communications, you can unsubscribe using the link provided in the message or by contacting us. STAK has not yet selected a separate newsletter-delivery provider; if we add one, that provider may process email addresses and newsletter engagement information, and we will update this Policy as appropriate.",
			"You can control push notifications in STAK’s notification settings and through your device or browser settings.",
		] },
		{ heading: "7. Cookies and Similar Technologies", blocks: [
			"STAK and its service providers may use cookies, local storage, session storage, and similar technologies for authentication, security, preferences, product functionality, and website analytics. Browser controls may allow you to limit some of these technologies, but doing so may affect Service functionality.",
		] },
		{ heading: "8. Data Retention", blocks: [
			"We retain personal information for as long as reasonably necessary to provide the Service, maintain accounts, fulfill the purposes described in this Policy, comply with legal obligations, resolve disputes, enforce agreements, and protect the Service. When information is no longer reasonably necessary, we may delete or de-identify it, subject to legal, security, backup, and technical requirements.",
		] },
		{ heading: "9. Security", blocks: [
			"We use reasonable administrative, technical, and organizational measures designed to protect personal information. However, no online service or method of storage or transmission is completely secure, and we cannot guarantee absolute security.",
		] },
		{ heading: "10. Your Choices and Privacy Rights", blocks: [
			"Depending on where you live and applicable law, you may have rights regarding your personal information, such as requesting access, correction, deletion, or a copy of certain information, and opting out of certain marketing communications. To make a privacy request, contact support@thestak.org. We may need to verify your identity before completing a request.",
			"You can delete your STAK account at any time in the app’s settings, or request deletion of your account and associated personal information by contacting support@thestak.org, subject to information we must or are permitted to retain for legal, security, fraud-prevention, dispute-resolution, or technical reasons.",
		] },
		{ heading: "11. Children", blocks: [
			"The beta is not intended for anyone under 18, and we do not knowingly permit users under 18 to participate. We ask for a date of birth before the Service can be used, and we delete accounts that indicate the user is under 18 (see “Age and eligibility information” above). If you believe a person under 18 has provided personal information to STAK, contact support@thestak.org.",
		] },
		{ heading: "12. United States Service and Data Processing", blocks: [
			"The current beta is offered only in the United States. Our providers may process or store information in the United States or other locations where they operate. By using the Service, you understand that information may be processed in locations with different data-protection rules than your state of residence.",
		] },
		{ heading: "13. Business Changes and Future Entity", blocks: [
			"If STAK forms a legal entity, raises financing, completes a merger, acquisition, reorganization, sale of assets, or similar transaction, information may be transferred as part of that transaction or to the newly formed entity, subject to applicable law. We will update this Policy when the legal operator of STAK changes.",
		] },
		{ heading: "14. Changes to This Policy", blocks: [
			"We may update this Privacy Policy as STAK changes or following legal review. If we make material changes, we will notify registered users by email at the email address associated with their STAK account before or when the changes become effective. The notice will identify the updated effective date and may include a link to or copy of the revised Policy. We may also provide notice through the Service. For users who only subscribe to a STAK newsletter and do not have an account, we may use the subscribed email address where the change materially affects newsletter-related data practices. The effective date at the top of this Policy identifies the latest version.",
		] },
		{ heading: "15. Contact Us", blocks: [
			"For privacy questions, account-deletion requests, or other privacy requests, contact: support@thestak.org",
			"STAK is currently operated by its founders pending formation of a legal entity. This contact section should be updated with the legal entity name and business address after incorporation.",
		] },
	],
};

export const TERMS_OF_SERVICE: LegalDoc = {
	title: "Terms of Service",
	effective: "October 8, 2026",
	notice: NOTICE,
	sections: [
		{ heading: "1. Acceptance of These Terms", blocks: [
			"These Terms of Service (“Terms”) govern your access to and use of the STAK website, beta application, newsletters, and related products and services (collectively, the “Service”). By creating an account, accessing, or using the Service, you agree to these Terms and to the STAK Privacy Policy.",
			"STAK is currently operated by its founders and is not yet a separate incorporated legal entity. References to “STAK,” “we,” “us,” and “our” mean the founders currently operating the Service under the STAK name. We expect to form a legal entity in the near future. To the extent permitted by law, these Terms may be assigned to or assumed by that entity when formed, and we will update the Terms accordingly.",
			"If you do not agree to these Terms, do not use the Service.",
		] },
		{ heading: "2. Eligibility and U.S.-Only Beta", blocks: [
			"You must be at least 18 years old and located in the United States to participate in the current beta. By using STAK, you represent that you meet these requirements and are legally able to enter into these Terms.",
			"Before you can use the Service, we ask you to provide your date of birth, confirm that you currently reside in the United States, and agree to these Terms and the Privacy Policy. Providing false information to gain access violates these Terms. We may suspend or delete an account that does not meet these requirements.",
		] },
		{ heading: "3. The STAK Beta", blocks: [
			"STAK is currently a beta product. Features may be experimental, incomplete, unavailable, delayed, changed, or removed at any time. We may limit beta access, impose usage limits, reset test data, pause features, or discontinue all or part of the beta without guaranteeing continued availability.",
			"The beta is currently free. STAK may later offer paid subscriptions or other paid services. We will provide additional or updated terms before charging users.",
		] },
		{ heading: "4. What STAK Provides", blocks: [
			"STAK is designed to help users discover companies, understand market and company information, follow companies they care about, learn investing concepts, use AI-supported explanations, and practice through simulated investing experiences. Features may include News, Discover, My STAK, Investing Taste, Simulate, STAK AI, newsletters, and related tools.",
			"“STAK,” “STAK it,” save, follow, or similar product language means that a user is expressing interest in or saving a company within the Service. It does not mean that STAK is instructing the user to buy a security.",
		] },
		{ heading: "5. Important Investing Disclaimer", blocks: [
			"STAK provides educational and informational tools. The beta does not provide brokerage services, execute securities transactions, hold customer funds or securities, or connect to brokerage accounts. STAK does not know your full financial circumstances, investment objectives, tax situation, liquidity needs, or risk tolerance merely because it personalizes content based on your activity.",
			"Nothing in the Service is a guarantee, promise of investment performance, or instruction to purchase, sell, or hold a security. Market commentary, company explanations, personalized feeds, Investing Taste, risk summaries, analyst information, and AI-generated content are provided for informational and educational purposes and should not be treated as individualized financial, investment, tax, accounting, or legal advice.",
			"You are responsible for your own financial decisions. Consider conducting independent research and, where appropriate, consulting a qualified professional before making financial decisions.",
		] },
		{ heading: "6. Simulated Investing", blocks: [
			"Any paper-trading, simulated portfolio, Playground, or Simulate feature uses virtual funds and does not represent an actual purchase or sale of securities. Simulated results may differ materially from real-world results because they may not reflect market impact, spreads, liquidity, taxes, commissions, execution delays, emotional behavior, or other real-world conditions.",
			"Past or simulated performance does not guarantee future results.",
		] },
		{ heading: "7. Accounts and Account Security", blocks: [
			{ list: [
				"Provide accurate and current account information.",
				"Maintain the confidentiality and security of your login credentials and devices.",
				"Do not share verification codes or passwords with unauthorized persons.",
				"Notify us promptly if you suspect unauthorized access or misuse of your account.",
				"You are responsible for activity conducted through your account to the extent permitted by law.",
			] },
			"STAK currently uses Supabase Auth to support account authentication, verification, and password resets.",
		] },
		{ heading: "8. Personalization and Investing Taste", blocks: [
			"STAK may use your saves, passes, searches, revisits, questions, research activity, simulated investing activity, and other interactions to personalize the Service and infer themes or interests reflected in features such as Investing Taste. These inferences describe activity within STAK and are not a complete assessment of your finances or suitability for any investment.",
			"Personalization may cause different users to see different companies, explanations, news, educational content, or other information.",
		] },
		{ heading: "9. STAK AI", blocks: [
			"STAK AI uses artificial intelligence to generate explanations, summaries, comparisons, and other content. AI output may be incomplete, outdated, misleading, or incorrect. You should independently verify important information before relying on it.",
			"STAK currently uses Google Gemini models (currently Gemini 2.5 Flash and Gemini 2.5 Flash-Lite) to support AI functionality. By using STAK AI, you authorize us to process your prompts and relevant Service context as described in the Privacy Policy.",
			"Do not submit sensitive credentials or highly sensitive personal information to STAK AI, including Social Security numbers, bank or brokerage passwords, payment-card numbers, or other account credentials.",
		] },
		{ heading: "10. Market, News, and Third-Party Data", blocks: [
			"STAK displays information obtained from third-party sources. Current sources may include Finnhub, Yahoo Finance, SEC EDGAR, and NewsAPI. Third-party information may be delayed, incomplete, unavailable, or inaccurate. Analyst ratings, recommendations, estimates, articles, filings, and other third-party content remain attributable to their respective sources and are not STAK recommendations merely because they appear in the Service.",
			"We do not guarantee the accuracy, completeness, timeliness, sequence, availability, or fitness of market data or third-party content for any particular purpose.",
		] },
		{ heading: "11. Newsletter and Communications", blocks: [
			"STAK may send account, security, beta, product, and legal communications that are necessary to provide the Service. If you subscribe to The STAK Brief or other marketing communications, you may unsubscribe using the link in the communication or by contacting us. Opting out of marketing does not prevent us from sending necessary account, security, or transactional messages.",
		] },
		{ heading: "12. User Content, Prompts, and Feedback", blocks: [
			"You retain ownership of content you submit to STAK, such as feedback, survey responses, and AI prompts, to the extent you own that content. You grant STAK a non-exclusive, worldwide, royalty-free license to host, process, reproduce, and use submitted content as reasonably necessary to operate, secure, improve, and provide the Service and as described in the Privacy Policy.",
			"If you voluntarily provide ideas, suggestions, product feedback, or feature requests, you agree that STAK may use that feedback without restriction or compensation, provided we do not publicly identify you in connection with the feedback without permission.",
		] },
		{ heading: "13. Acceptable Use", blocks: [
			"You may not use the Service to:",
			{ list: [
				"Violate applicable law or another person’s rights.",
				"Attempt to gain unauthorized access to STAK, another user’s account, or connected systems.",
				"Interfere with, overload, disrupt, or circumvent the security or operation of the Service.",
				"Introduce malware, malicious code, or harmful automated activity.",
				"Scrape, crawl, copy, or extract the Service or its data at scale except as expressly permitted.",
				"Reverse engineer or attempt to derive source code except where such restrictions are prohibited by law.",
				"Impersonate another person, misrepresent your affiliation, or use another person’s credentials.",
				"Use STAK or its content to create a competing product through unauthorized copying or extraction.",
				"Use the Service for market manipulation, fraud, deceptive conduct, or other unlawful financial activity.",
			] },
		] },
		{ heading: "14. Intellectual Property", blocks: [
			"STAK and its licensors retain all rights in the Service, including software, interfaces, designs, branding, logos, original content, personalization systems, and other proprietary materials, except for third-party content and user-owned content. These Terms do not grant you ownership of STAK intellectual property.",
			"Third-party company names, trademarks, market data, articles, filings, analyst information, and other content remain the property of their respective owners or licensors.",
		] },
		{ heading: "15. Third-Party Services and Links", blocks: [
			"The Service may rely on or link to third-party services, websites, APIs, data providers, and content. STAK is not responsible for third-party services that we do not control. Your use of a third-party service may be subject to that provider’s terms and privacy policy.",
		] },
		{ heading: "16. Suspension and Termination", blocks: [
			"You may stop using STAK at any time. You can delete your account in the app’s settings or request account deletion by contacting support@thestak.org. We may suspend, limit, or terminate access to the Service if we reasonably believe you have violated these Terms, created a security or legal risk, abused the Service, or if we discontinue the beta or a feature.",
			"Sections that by their nature should survive termination, including intellectual-property, disclaimer, limitation-of-liability, and other protective provisions, will survive to the extent permitted by law.",
		] },
		{ heading: "17. Disclaimer of Warranties", blocks: [
			"TO THE FULLEST EXTENT PERMITTED BY LAW, THE SERVICE IS PROVIDED “AS IS” AND “AS AVAILABLE.” STAK DISCLAIMS WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, ACCURACY, AVAILABILITY, AND ANY WARRANTIES ARISING FROM COURSE OF DEALING OR USAGE OF TRADE. WE DO NOT WARRANT THAT THE SERVICE, MARKET DATA, AI OUTPUT, OR THIRD-PARTY CONTENT WILL BE ERROR-FREE, COMPLETE, CURRENT, SECURE, OR UNINTERRUPTED.",
		] },
		{ heading: "18. Limitation of Liability", blocks: [
			"TO THE FULLEST EXTENT PERMITTED BY LAW, STAK AND THE PERSONS OPERATING IT WILL NOT BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, OR FOR LOST PROFITS, LOST DATA, LOST INVESTMENT OPPORTUNITIES, TRADING LOSSES, OR OTHER LOSSES ARISING FROM OR RELATED TO YOUR USE OF OR RELIANCE ON THE SERVICE, MARKET DATA, AI OUTPUT, OR THIRD-PARTY CONTENT.",
			"TO THE FULLEST EXTENT PERMITTED BY LAW, THE TOTAL AGGREGATE LIABILITY ARISING OUT OF OR RELATING TO THE SERVICE WILL NOT EXCEED THE GREATER OF (A) THE AMOUNT YOU PAID TO STAK FOR THE SERVICE DURING THE 12 MONTHS BEFORE THE EVENT GIVING RISE TO THE CLAIM OR (B) $100. SOME JURISDICTIONS DO NOT ALLOW CERTAIN LIMITATIONS, SO SOME OF THESE LIMITATIONS MAY NOT APPLY TO YOU.",
		] },
		{ heading: "19. Changes to the Service and These Terms", blocks: [
			"We may change the Service and these Terms as STAK develops or following legal review. If we make material changes to these Terms, we will notify registered users by email at the email address associated with their STAK account before or when the updated Terms become effective. The notice will identify the effective date and may include a link to or copy of the revised Terms. We may also provide notice through the Service. Continued use of the Service after the updated Terms take effect constitutes acceptance to the extent permitted by law.",
			"When STAK launches paid subscriptions, brokerage connectivity, or other materially different financial functionality, those features may be governed by updated Terms, supplemental terms, third-party terms, and an updated Privacy Policy.",
		] },
		{ heading: "20. Future Legal Entity and Assignment", blocks: [
			"STAK is currently being operated before formal incorporation. If a legal entity is formed to own or operate STAK, the rights and obligations associated with the Service, these Terms, user accounts, and related agreements may be assigned or transferred to that entity to the extent permitted by law. We will update the operator information in these Terms when formation is complete.",
		] },
		{ heading: "21. General Terms", blocks: [
			"If any provision of these Terms is found unenforceable, the remaining provisions will remain in effect to the extent permitted by law. Our failure to enforce a provision is not a waiver of our right to do so later. These Terms, together with the Privacy Policy and any feature-specific terms presented to you, form the agreement governing your use of the Service.",
			"These Terms are subject to legal review. Because STAK has not yet completed formation of its legal entity, provisions concerning governing law, venue, arbitration, jury waiver, and the final legal operator may be added or revised after counsel review and formation. If any such change is material after users have accepted these Terms, registered users will be notified by email at the address associated with their STAK account before or when the change becomes effective.",
		] },
		{ heading: "22. Contact", blocks: [
			"Questions about these Terms may be sent to: support@thestak.org",
			"STAK is currently operated by its founders pending formation of a legal entity. This section should be updated with the legal entity name and business address after incorporation.",
		] },
	],
};
