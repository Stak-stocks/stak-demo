import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const joinWaitlist = vi.fn();
// The mock itself never throws (vitest fails a test when a vi.fn throws, even if the code catches it): it returns
// { error } and this wrapper throws it, like a refused request would.
vi.mock("@/lib/api", () => ({
	joinWaitlist: async (...args: unknown[]) => {
		const result = await joinWaitlist(...args);
		if (result && typeof result === "object" && "error" in result) throw new Error(String(result.error));
		return result;
	},
}));

const { EarlyAccessModal } = await import("../EarlyAccessModal");

function submit(email: string) {
	fireEvent.change(screen.getByLabelText("Email address"), { target: { value: email } });
	fireEvent.click(screen.getByRole("button", { name: /join early access/i }));
}

describe("EarlyAccessModal", () => {
	beforeEach(() => joinWaitlist.mockReset());
	// The modal portals into <body>; unmount each test's copy so the next test only sees its own.
	afterEach(cleanup);

	it("a new email lands on the success screen with the Instagram link", async () => {
		joinWaitlist.mockResolvedValue({ ok: true, already: false });
		render(<EarlyAccessModal open onClose={() => {}} />);
		submit("ada@example.com");
		expect(await screen.findByText("You're on the list!")).toBeInTheDocument();
		expect(joinWaitlist).toHaveBeenCalledWith("ada@example.com");
		expect(screen.getByRole("link", { name: /follow us on instagram/i })).toHaveAttribute("href", "https://www.instagram.com/just_stak");
	});

	it("says to check the inbox only when the confirmation email went out", async () => {
		joinWaitlist.mockResolvedValue({ ok: true, already: false, emailed: true });
		render(<EarlyAccessModal open onClose={() => {}} />);
		submit("ada@example.com");
		expect(await screen.findByText(/check your inbox/i)).toBeInTheDocument();
	});

	it("an email already on the list is told so", async () => {
		joinWaitlist.mockResolvedValue({ ok: true, already: true });
		render(<EarlyAccessModal open onClose={() => {}} />);
		submit("ada@example.com");
		expect(await screen.findByText("You're already on the list!")).toBeInTheDocument();
	});

	it("an invalid email shows an error and isn't sent", () => {
		render(<EarlyAccessModal open onClose={() => {}} />);
		submit("not-an-email");
		expect(screen.getByRole("alert")).toHaveTextContent("Enter a valid email address.");
		expect(joinWaitlist).not.toHaveBeenCalled();
	});

	it("a server error keeps the form, with the server's reason", async () => {
		joinWaitlist.mockResolvedValue({ error: "Too many tries. Give it a minute and try again." });
		render(<EarlyAccessModal open onClose={() => {}} />);
		submit("ada@example.com");
		expect(await screen.findByRole("alert")).toHaveTextContent("Too many tries");
		expect(screen.getByLabelText("Email address")).toBeInTheDocument();
	});
});
