import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const navigate = vi.fn();
const deleteMe = vi.fn();
const logout = vi.fn(() => Promise.resolve());
vi.mock("@tanstack/react-router", () => ({
	createFileRoute: () => (opts: unknown) => opts,
	redirect: (opts: unknown) => ({ redirect: opts }),
	useNavigate: () => navigate,
	useRouterState: () => "/profile/app-settings",
	useCanGoBack: () => true,
	useRouter: () => ({ history: { back: vi.fn() } }),
}));
vi.mock("@tanstack/react-query", () => ({ useQueryClient: () => ({ clear: vi.fn() }) }));
vi.mock("@/context/AuthContext", () => ({ useAuth: () => ({ logout }) }));
vi.mock("@/lib/api", () => ({ deleteMe: () => deleteMe() }));
vi.mock("@/lib/appearance", () => ({ getAppearance: () => "dark" }));
// Phone layout (jsdom has no matchMedia).
Object.defineProperty(window, "matchMedia", { writable: true, value: (q: string) => ({ matches: false, media: q, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {} }) });

import { completeFirstRun, startFirstRun, useFirstRunPending } from "@/lib/firstRun";
import { Route as AppSettingsRoute } from "../profile_.app-settings";
import { Route as SignupRoute } from "../signup";

// createFileRoute is mocked to return the raw options object.
const AppSettings = (AppSettingsRoute as unknown as { component: React.ComponentType }).component;
const signupBeforeLoad = (SignupRoute as unknown as { beforeLoad: (a: { search: { confirm?: string } }) => void }).beforeLoad;

beforeEach(() => {
	vi.clearAllMocks();
	localStorage.clear();
});
afterEach(cleanup);

describe("Home's first run", () => {
	it("is pending only for the account that started it, until it's completed", () => {
		const { result: mine } = renderHook(() => useFirstRunPending("u1"));
		const { result: other } = renderHook(() => useFirstRunPending("u2"));
		expect(mine.current).toBe(false);
		act(() => startFirstRun("u1"));
		expect(mine.current).toBe(true);
		expect(other.current).toBe(false);
		act(() => completeFirstRun("u1"));
		expect(mine.current).toBe(false);
	});

	it("is never pending without an account", () => {
		const { result } = renderHook(() => useFirstRunPending(undefined));
		expect(result.current).toBe(false);
	});
});

describe("early access: web sign-up is closed", () => {
	it("sends /signup to the waitlist", () => {
		expect(() => signupBeforeLoad({ search: {} })).toThrow();
		try { signupBeforeLoad({ search: {} }); } catch (e) {
			expect(e).toEqual({ redirect: { to: "/welcome", search: { join: "1" } } });
		}
	});

	it("still lets an account already started finish by typing its code", () => {
		expect(() => signupBeforeLoad({ search: { confirm: "a@b.co" } })).not.toThrow();
	});
});

describe("Delete account", () => {
	it("only deletes once DELETE is typed", async () => {
		deleteMe.mockResolvedValue({ ok: true });
		render(<AppSettings />);
		fireEvent.click(screen.getByText("Delete account"));
		const button = screen.getByRole("button", { name: "Delete my account" });
		expect(button).toBeDisabled();
		fireEvent.click(button);
		expect(deleteMe).not.toHaveBeenCalled();

		fireEvent.change(screen.getByLabelText("Type DELETE to confirm"), { target: { value: "delete" } });
		expect(button).toBeDisabled();
		fireEvent.change(screen.getByLabelText("Type DELETE to confirm"), { target: { value: "DELETE" } });
		expect(button).toBeEnabled();
		fireEvent.click(button);
		await waitFor(() => expect(deleteMe).toHaveBeenCalledTimes(1));
		// Sign-up is closed, so a deleted account goes to the landing page, not Create account.
		await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: "/welcome" }));
	});
});
