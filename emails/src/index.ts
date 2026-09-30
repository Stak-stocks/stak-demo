import { createElement } from "react";
import { render } from "@react-email/components";
import EarlyAccessConfirmation, { EARLY_ACCESS_SUBJECT, type EarlyAccessConfirmationProps } from "./templates/EarlyAccessConfirmation";

/**
 * STAK's emails. Templates live in ./templates (preview them with `npm run email:dev`); the backend sends them
 * with these renderers, which return what a provider needs: subject, HTML and a plain-text alternative.
 */
export interface RenderedEmail {
	subject: string;
	html: string;
	text: string;
}

async function renderBoth(element: ReturnType<typeof createElement>): Promise<{ html: string; text: string }> {
	const [html, text] = await Promise.all([render(element), render(element, { plainText: true })]);
	return { html, text };
}

export async function renderEarlyAccessConfirmation(props: EarlyAccessConfirmationProps): Promise<RenderedEmail> {
	return { subject: EARLY_ACCESS_SUBJECT, ...(await renderBoth(createElement(EarlyAccessConfirmation, props))) };
}

export { EARLY_ACCESS_SUBJECT };
export type { EarlyAccessConfirmationProps };
