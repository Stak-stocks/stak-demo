/**
 * Onboarding's first run never waits on the STAK API (BUILD-PLAN N59; the user's report of 2026-11-11). 06 Preparing
 * deck sends its completion writes and forgets them, as the original onboarding did, so an API that is down or hung (or
 * a profile document it never created) neither holds the person on 06 nor sends them back to 05: the prototype's 1.8 s
 * still moves them to 07 Taste reveal, and 08's Proceed to home goes Home without waiting on the name save. An email
 * account that has not verified its address never walks the steps (the API refuses its token, so nothing would be saved):
 * it is sent to Check your email first, as the original onboarding sent it to /verify-email.
 */
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ButtonHTMLAttributes, ComponentType, ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from "vitest";

/** The fields of Firebase's User the page reads. */
type TestUser = { uid: string; email: string | null; emailVerified: boolean; providerData: { providerId: string }[] };

const mocks = vi.hoisted(() => ({
	search: { step: 6 } as Record<string, unknown>,
	navigate: vi.fn(),
	auth: {
		user: null as TestUser | null,
		loading: false,
		onboardingCompleted: false,
		refreshClaims: vi.fn(),
	},
	account: {
		account: null as { onboardingCompleted?: boolean } | null,
		accountLoading: false,
		updatePreferences: vi.fn(),
		updateDeckOrder: vi.fn(),
		updateLastBriefDate: vi.fn(),
	},
	setDisplayName: vi.fn(),
	saveExtras: vi.fn(),
	updateProfile: vi.fn(),
	trackEvent: vi.fn(),
	logEvent: vi.fn(),
	toastError: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
	createFileRoute: () => (options: object) => ({ ...options, useSearch: () => mocks.search }),
	useNavigate: () => mocks.navigate,
	useRouter: () => ({ history: { location: { state: {} }, canGoBack: () => false } }),
}));
vi.mock("@/context/AuthContext", () => ({ useAuth: () => mocks.auth }));
vi.mock("@/context/AccountContext", () => ({ useAccount: () => mocks.account }));
vi.mock("@/app/live/store", () => ({
	useLive: () => ({ ready: true, preferences: {}, actions: { setDisplayName: mocks.setDisplayName, setPreferences: vi.fn() } }),
}));
vi.mock("@/lib/api", () => ({ updateProfile: mocks.updateProfile, trackEvent: mocks.trackEvent }));
vi.mock("@/lib/firebase", () => ({ logEvent: mocks.logEvent }));
vi.mock("sonner", () => ({ toast: { error: mocks.toastError, success: vi.fn() } }));
vi.mock("@/app/live/catalog", () => ({ warmCatalog: () => {} }));
vi.mock("@/app/live/taste", () => ({ RISK_STYLES: {}, tasteBars: () => [] }));
vi.mock("@/app/profile/identity", () => ({ downscalePhoto: vi.fn(), useSaveProfileExtras: () => mocks.saveExtras }));
vi.mock("@/app/profile/returnFocus", () => ({ rememberReturnFocus: vi.fn() }));
// the frames' drawing is not under test here: light stand-ins for the presentational pieces
vi.mock("@/app/FitCanvas", () => ({ fillHeight: "1024px", useSizeClass: () => "desktop" }));
vi.mock("@/app/ui/Button", () => ({
	GRADIENT: "linear-gradient(#5da8bf, #2c9dbc)",
	PrimaryButton: ({ children, width: _width, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { width?: number }) => (
		<button type="button" {...props}>
			{children}
		</button>
	),
}));
vi.mock("@/app/onboarding/Chrome", () => ({
	BackControl: ({ onClick }: { onClick: () => void }) => <button type="button" onClick={onClick}>Back</button>,
	HeroBox: () => null,
	OnboardingChrome: ({ onBack }: { onBack: () => void }) => <button type="button" onClick={onBack}>Back</button>,
	pinTop: (y: number) => `${y}px`,
	STEP_TITLE_FOCUS: { tabIndex: -1, "data-step-title": "" },
	StepHeading: ({ title }: { title: string }) => <h1>{title}</h1>,
}));
vi.mock("@/app/onboarding/BrandCard", () => ({ BrandCard: () => null }));
vi.mock("@/app/onboarding/ExampleCard", () => ({ EXAMPLE_DEFAULT_RISK: "hold", ExampleStepCard: () => null }));
vi.mock("@/app/onboarding/OptionMatrix", () => ({ GOAL_ICONS: {}, OptionMatrix: () => null, RISK_ICONS: {} }));
vi.mock("@/app/onboarding/SwipeCards", () => ({ SwipeCards: () => null }));
vi.mock("@/app/onboarding/subpixel", () => ({
	FracFill: () => null,
	FracLabel: ({ children }: { children: ReactNode }) => children,
	onFraction: () => ({}),
}));

import { DEFAULT_BRAND_PICKS, DEFAULT_GOAL, DEFAULT_RISK } from "@/app/onboarding/data";
import { DISSOLVE, PREPARING_MS, PUSH_FORWARD } from "@/app/onboarding/motion";
import { Route } from "../onboarding";

/* createFileRoute is mocked to return its options (plus useSearch), so the route object carries `component`. */
const OnboardingPage = (Route as unknown as { component: ComponentType }).component;

const PREFS = { interests: [], familiarity: DEFAULT_RISK, onboardingSwipes: DEFAULT_BRAND_PICKS, goal: DEFAULT_GOAL };
const HOME = { to: "/home", search: { firstRun: true }, replace: true, viewTransition: PUSH_FORWARD };
const notFound = () => Object.assign(new Error("No document to update"), { code: "not-found" });
const never = () => new Promise<never>(() => {});
/** A first-run email account; verified unless told otherwise (Check your email lets only a verified one through). */
const emailAccount = (emailVerified = true): TestUser => ({ uid: "new-user", email: "new@stak.test", emailVerified, providerData: [{ providerId: "password" }] });

/** The ways the STAK API (and the profile document only it creates) can fail the first run. */
const API_FAILURES: Record<string, () => void> = {
	"down (every write rejects)": () => {
		mocks.account.updatePreferences.mockRejectedValue(notFound());
		mocks.account.updateDeckOrder.mockRejectedValue(notFound());
		mocks.account.updateLastBriefDate.mockRejectedValue(notFound());
		mocks.updateProfile.mockRejectedValue(new TypeError("Failed to fetch"));
		mocks.trackEvent.mockRejectedValue(new TypeError("Failed to fetch"));
	},
	"hung (no write ever settles)": () => {
		mocks.account.updatePreferences.mockImplementation(never);
		mocks.account.updateDeckOrder.mockImplementation(never);
		mocks.account.updateLastBriefDate.mockImplementation(never);
		mocks.updateProfile.mockImplementation(never);
		mocks.trackEvent.mockImplementation(never);
	},
};

const flush = () => act(async () => { await vi.advanceTimersByTimeAsync(0); });
let warn: MockInstance<typeof console.warn>;

beforeEach(() => {
	vi.clearAllMocks();
	vi.useFakeTimers();
	mocks.search = { step: 6 };
	mocks.auth.user = emailAccount();
	mocks.auth.loading = false;
	mocks.auth.onboardingCompleted = false;
	mocks.auth.refreshClaims.mockResolvedValue(undefined);
	mocks.account.account = null;
	mocks.account.accountLoading = false;
	mocks.account.updatePreferences.mockResolvedValue(undefined);
	mocks.account.updateDeckOrder.mockResolvedValue(undefined);
	mocks.account.updateLastBriefDate.mockResolvedValue(undefined);
	mocks.updateProfile.mockResolvedValue({});
	mocks.trackEvent.mockResolvedValue({});
	mocks.setDisplayName.mockResolvedValue(undefined);
	mocks.navigate.mockResolvedValue(undefined);
	warn = vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
	cleanup();
	vi.useRealTimers();
	warn.mockRestore();
});

describe("06 Preparing deck with the API failing", () => {
	it.each(Object.entries(API_FAILURES))("moves on to the Taste reveal after 1.8 s when the API is %s", async (_label, fail) => {
		fail();
		render(<OnboardingPage />);
		await flush();
		// every completion write was sent, once
		expect(mocks.account.updatePreferences.mock.calls).toEqual([[PREFS]]);
		expect(mocks.account.updateDeckOrder.mock.calls).toEqual([[[]]]);
		expect(mocks.account.updateLastBriefDate).toHaveBeenCalledOnce();
		expect(mocks.updateProfile.mock.calls).toEqual([[{ onboardingCompleted: true, preferences: PREFS }]]);
		// nothing holds the person or sends them back to 05 with the old "Could not prepare your deck" toast
		await act(async () => { await vi.advanceTimersByTimeAsync(PREPARING_MS - 1); });
		expect(mocks.navigate).not.toHaveBeenCalled();
		await act(async () => { await vi.advanceTimersByTimeAsync(1); });
		expect(mocks.navigate.mock.calls).toEqual([
			[expect.objectContaining({ to: "/onboarding", search: { step: 7 }, viewTransition: DISSOLVE, replace: true })],
		]);
		expect(mocks.toastError).not.toHaveBeenCalled();
		// the completion was not saved, so no claim refresh and no completion event
		expect(mocks.auth.refreshClaims).not.toHaveBeenCalled();
		expect(mocks.logEvent).not.toHaveBeenCalled();
	});

	it("logs a failed completion and sends it again on the step's next visit, but a saved one only once", async () => {
		API_FAILURES["down (every write rejects)"]();
		const page = render(<OnboardingPage />);
		await flush();
		expect(warn).toHaveBeenCalledWith("[onboarding] updateProfile failed:", expect.any(TypeError));

		// the API is back; 07's Back returns to 05, whose Continue shows 06 again
		mocks.updateProfile.mockResolvedValue({});
		mocks.trackEvent.mockResolvedValue({});
		mocks.search = { step: 5 };
		page.rerender(<OnboardingPage />);
		mocks.search = { step: 6 };
		page.rerender(<OnboardingPage />);
		await flush();
		expect(mocks.updateProfile).toHaveBeenCalledTimes(2);
		expect(mocks.auth.refreshClaims).toHaveBeenCalledOnce();
		expect(mocks.logEvent.mock.calls).toEqual([
			["onboarding_complete", { brands: DEFAULT_BRAND_PICKS, goal: DEFAULT_GOAL, risk: DEFAULT_RISK }],
		]);
		expect(mocks.trackEvent).toHaveBeenCalledOnce();

		mocks.search = { step: 5 };
		page.rerender(<OnboardingPage />);
		mocks.search = { step: 6 };
		page.rerender(<OnboardingPage />);
		await flush();
		expect(mocks.updateProfile).toHaveBeenCalledTimes(2);
		expect(mocks.logEvent).toHaveBeenCalledOnce();
	});

	it("runs no completion writes for a preview, which still moves on after 1.8 s", async () => {
		mocks.search = { step: 6, preview: 1 };
		render(<OnboardingPage />);
		await act(async () => { await vi.advanceTimersByTimeAsync(PREPARING_MS); });
		expect(mocks.updateProfile).not.toHaveBeenCalled();
		expect(mocks.account.updatePreferences).not.toHaveBeenCalled();
		expect(mocks.navigate).toHaveBeenCalledWith(expect.objectContaining({ search: { step: 7, preview: 1 }, viewTransition: DISSOLVE }));
	});
});

describe("the rest of the first run with the API failing", () => {
	it("goes 06 -> 07 -> 08 -> Home with the API down and the name save hung", async () => {
		API_FAILURES["down (every write rejects)"]();
		mocks.setDisplayName.mockImplementation(never);
		const page = render(<OnboardingPage />);
		await act(async () => { await vi.advanceTimersByTimeAsync(PREPARING_MS); });
		expect(mocks.navigate).toHaveBeenLastCalledWith(expect.objectContaining({ search: { step: 7 }, viewTransition: DISSOLVE }));

		mocks.search = { step: 7 };
		page.rerender(<OnboardingPage />);
		fireEvent.click(screen.getByRole("button", { name: "Lets go!" }));
		expect(mocks.navigate).toHaveBeenLastCalledWith(expect.objectContaining({ to: "/onboarding", search: { step: 8 }, viewTransition: false }));

		mocks.search = { step: 8 };
		page.rerender(<OnboardingPage />);
		fireEvent.change(screen.getByLabelText("DISPLAY NAME"), { target: { value: "Ada" } });
		fireEvent.click(screen.getByRole("button", { name: "Proceed to home" }));
		expect(mocks.setDisplayName).toHaveBeenCalledWith("Ada");
		expect(mocks.navigate).toHaveBeenLastCalledWith(HOME);
		expect(mocks.toastError).not.toHaveBeenCalled();
	});

	it("08 still tells a failed name save, on the way Home, and goes Home once", async () => {
		mocks.search = { step: 8 };
		mocks.setDisplayName.mockRejectedValue(notFound());
		render(<OnboardingPage />);
		fireEvent.change(screen.getByLabelText("DISPLAY NAME"), { target: { value: "Ada" } });
		const proceed = screen.getByRole("button", { name: "Proceed to home" });
		fireEvent.click(proceed);
		fireEvent.click(proceed);
		expect(mocks.navigate.mock.calls).toEqual([[HOME]]);
		await flush();
		expect(mocks.toastError).toHaveBeenCalledWith("Could not save your name. Try again.");
		expect(mocks.setDisplayName).toHaveBeenCalledOnce();
		expect(mocks.navigate).toHaveBeenCalledOnce();
	});

	it("08 does not save the frame's default name", async () => {
		mocks.search = { step: 8 };
		render(<OnboardingPage />);
		fireEvent.click(screen.getByRole("button", { name: "Proceed to home" }));
		expect(mocks.setDisplayName).not.toHaveBeenCalled();
		expect(mocks.navigate.mock.calls).toEqual([[HOME]]);
	});
});

describe("an email account that has not verified its address", () => {
	/** Check your email in place of the step, as the sign-in continuation sends the same account (usePostAuthRedirect). */
	const CHECK_EMAIL = { to: "/check-email", search: { purpose: "verify", email: "new@stak.test" }, replace: true };

	// Back from Check your email lands on the landing page, which forwards a signed-in first-run account to step 01; a link
	// can open any later step
	it.each([1, 2, 6, 8])("is sent from step %i to Check your email, and nothing is saved for it", async (step) => {
		mocks.search = { step };
		mocks.auth.user = emailAccount(false);
		render(<OnboardingPage />);
		await flush();
		expect(mocks.navigate.mock.calls).toEqual([[CHECK_EMAIL]]);
		expect(mocks.updateProfile).not.toHaveBeenCalled();
		expect(mocks.account.updatePreferences).not.toHaveBeenCalled();
		expect(mocks.account.updateDeckOrder).not.toHaveBeenCalled();
		expect(mocks.account.updateLastBriefDate).not.toHaveBeenCalled();
	});

	it("is not sent back to Check your email once its reload has marked the address verified", async () => {
		const user = emailAccount(false);
		mocks.search = { step: 1 };
		mocks.auth.user = user;
		const page = render(<OnboardingPage />);
		await flush();
		expect(mocks.navigate.mock.calls).toEqual([[CHECK_EMAIL]]);
		// "I've verified my email": reload() updates this same User object, then that page sends the person back here
		user.emailVerified = true;
		page.unmount();
		render(<OnboardingPage />);
		await flush();
		expect(mocks.navigate).toHaveBeenCalledOnce();
	});

	const LEFT_ALONE: Record<string, () => void> = {
		"a verified email account": () => {
			mocks.auth.user = emailAccount();
		},
		"a Google account (only email accounts verify here)": () => {
			mocks.auth.user = { ...emailAccount(false), providerData: [{ providerId: "google.com" }] };
		},
		"a preview of the frames": () => {
			mocks.search = { step: 1, preview: 1 };
		},
		"a Profile edit": () => {
			mocks.search = { step: 4, edit: "goal" };
		},
	};
	it.each(Object.entries(LEFT_ALONE))("leaves %s on the step", async (_label, arrange) => {
		mocks.search = { step: 1 };
		mocks.auth.user = emailAccount(false);
		arrange();
		render(<OnboardingPage />);
		await flush();
		expect(mocks.navigate).not.toHaveBeenCalled();
	});
});
