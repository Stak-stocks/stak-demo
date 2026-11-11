/**
 * Profile hub icons (Figma 2:2476, the ACCOUNT card), Figma's own SVG exports of each 20x20 icon layer, named after
 * the layer and its node id. Each file carries the layer's 0.75 opacity, as Figma exports it.
 */
const base = "/figma/profile";

export const P = {
	/** "ion:notifications-outline" 2:2530 */
	notifications: `${base}/ion-notifications-outline-2-2530.svg`,
	/** "Frame" 2:2536 (Contact support) */
	support: `${base}/frame-contact-support-2-2536.svg`,
	/** "Frame" 2:2542 (Terms of service) */
	terms: `${base}/frame-terms-of-service-2-2542.svg`,
	/** "Frame" 2:2548 (Privacy policy) */
	privacy: `${base}/frame-privacy-policy-2-2548.svg`,
	/**
	 * "CaretDown" 2:3559 / 2:3566: the desktop's disclosure caret (the stock page's analyst view and compare teaser, 20 px,
	 * #819ABB; Figma's export shared through /app-assets, src/app/stocks/assets.ts `caret`), for Help & support's questions.
	 */
	caret: "/app-assets/a87c6.svg",
} as const;
