/**
 * The public support page (the App Store's Support URL): a working way to reach us, the safety note, every shared
 * question under its topic, and an answer's own link opening it.
 */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { SUPPORT_EMAIL, SUPPORT_SECURITY_NOTE, SUPPORT_TOPICS } from "@stak/shared";

vi.mock("@tanstack/react-router", () => ({
	createFileRoute: () => (opts: unknown) => opts,
	Link: ({ children, to }: { children: ReactNode; to: string }) => <a href={to}>{children}</a>,
}));

import { Route } from "../support";
import { LEGAL_PATHS, WEB_PUBLIC_PATHS } from "@/lib/earlyAccess";

const SupportPage = (Route as unknown as { component: () => ReactNode }).component as () => React.JSX.Element;

afterEach(() => {
	cleanup();
	window.location.hash = "";
});

describe("Support page", () => {
	it("is open while the web is locked, without the app around it", () => {
		expect(LEGAL_PATHS).toContain("/support");
		expect(WEB_PUBLIC_PATHS).toContain("/support");
	});

	it("gives a working way to reach us and the safety note", () => {
		render(<SupportPage />);
		expect(screen.getByText(SUPPORT_EMAIL)).toBeTruthy();
		const email = screen.getByRole("link", { name: "Email support" }).getAttribute("href") ?? "";
		expect(email.startsWith(`mailto:${SUPPORT_EMAIL}`)).toBe(true);
		const report = screen.getByRole("link", { name: "Report a problem" }).getAttribute("href") ?? "";
		expect(report).toContain("subject=STAK%20problem%20report");
		expect(screen.getByText(SUPPORT_SECURITY_NOTE)).toBeTruthy();
	});

	it("lists every question under its topic, closed until opened", () => {
		render(<SupportPage />);
		for (const topic of SUPPORT_TOPICS) {
			expect(screen.getByRole("heading", { name: topic.title })).toBeTruthy();
			for (const q of topic.questions) {
				const details = document.getElementById(q.id) as HTMLDetailsElement;
				expect(details.tagName).toBe("DETAILS");
				expect(details.open).toBe(false);
				expect(details.textContent).toContain(q.q);
			}
		}
	});

	it("opens the answer a link points at", () => {
		window.location.hash = "#delete-account";
		Element.prototype.scrollIntoView = vi.fn();
		render(<SupportPage />);
		expect((document.getElementById("delete-account") as HTMLDetailsElement).open).toBe(true);
		expect((document.getElementById("real-money") as HTMLDetailsElement).open).toBe(false);
	});
});
