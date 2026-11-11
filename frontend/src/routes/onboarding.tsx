import { fillHeight, useSizeClass } from "@/app/FitCanvas";
import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { type CSSProperties, useCallback, useEffect, useRef, useState } from "react";
import { GRADIENT, PrimaryButton } from "@/app/ui/Button";
import { BrandCard } from "@/app/onboarding/BrandCard";
import { BackControl, HeroBox, OnboardingChrome, pinTop, STEP_TITLE_FOCUS, StepHeading } from "@/app/onboarding/Chrome";
import { EXAMPLE_DEFAULT_RISK, ExampleStepCard } from "@/app/onboarding/ExampleCard";
import { backWithMotion, DISSOLVE, PREPARING_MS, PUSH_BACK, PUSH_FORWARD, type ViewTransition } from "@/app/onboarding/motion";
import { GOAL_ICONS, OptionMatrix, RISK_ICONS } from "@/app/onboarding/OptionMatrix";
import { SwipeCards } from "@/app/onboarding/SwipeCards";
import { FracFill, FracLabel, onFraction } from "@/app/onboarding/subpixel";
import {
	BRANDS,
	DEFAULT_BRAND_PICKS,
	DEFAULT_GOAL,
	DEFAULT_RISK,
	GOALS,
	PROFILE_DEFAULT_NAME,
	PROFILE_NAME_MAX,
	RISK_STYLE,
	RISKS,
	TASTE_BARS,
} from "@/app/onboarding/data";
import { warmCatalog } from "@/app/live/catalog";
import type { Preferences } from "@/app/live/guest";
import { useLive } from "@/app/live/store";
import { RISK_STYLES, tasteBars } from "@/app/live/taste";
import { downscalePhoto, useSaveProfileExtras } from "@/app/profile/identity";
import { rememberReturnFocus } from "@/app/profile/returnFocus";
import { useAccount } from "@/context/AccountContext";
import { trackEvent, updateProfile } from "@/lib/api";
import { logEvent } from "@/lib/firebase";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import { getLocalDateKey } from "@/lib/utils";
import "@/app/onboarding/responsive.css";

/** Welcome's Back marks its landing-page entry, so the landing page lets a signed-in first-run person stay (welcome.tsx). */
declare module "@tanstack/history" {
	interface HistoryState {
		fromOnboarding?: boolean;
		onboardingPreviousStep?: number;
		onboardingEditFromProfile?: boolean;
		/** the retake's entries above Taste & risk: 1 on 02, one more per step pushed (a replace keeps it) */
		onboardingRetakeDepth?: number;
	}
}

/** Profile › Taste & risk sends `edit=taste|goal|risk` (its "Retake the taste quiz" / "Change" rows): the step that asks that question. */
type EditTarget = "taste" | "goal" | "risk";
const EDIT_STEP: Record<EditTarget, number> = { taste: 2, goal: 4, risk: 5 };
/**
 * The retake (`edit=taste`) walks the whole quiz, as both phones do (android StakNavHost.kt:729-735 with QuizRetake,
 * UserProfile.kt:81-86; ios Profile/QuizRetakeFlow.swift:56-80): 02 Brand picks -> 03 Swipe tutorial -> 04 Goal ->
 * 05 Risk -> 06 Preparing -> 07 Taste reveal, whose Lets go saves the answers and returns to Taste & risk.
 */
const RETAKE_LAST_STEP = 7;

/** A switch in the URL: `=1` or `=true`, kept in the form it arrived in (see `flag`). */
type Flag = 1 | true;
type OnboardingSearch = { step: number; hold?: Flag; preview?: Flag; variant?: "example"; edit?: EditTarget };

/**
 * `preview=1` and `preview=true` (and `hold`) are both accepted and each stays as it came: a value normalised to the other
 * form made the router rewrite the URL on load, a second navigation that cut the entry view transition short (the audit
 * routes and the Taste & risk links send `=1`).
 */
const flag = (v: unknown): Flag | undefined => (v === true ? true : v === 1 || v === "1" ? 1 : undefined);

/** Figma's auto-width text boxes are whole pixels wide: a text whose frame width is not fixed, rounded up like Figma's. */
const FIGMA_W = "calc-size(fit-content, round(up, size, 1px))";

/**
 * The document title of each step, named by what the screen itself shows (its step label, or 06's heading). The root
 * titles /onboarding "Welcome · STAK" and keeps that while only the search changes, so without these every step read
 * the same; the EXAMPLE card (00 References 2:6664) prints its own "STEP 5 OF 9".
 */
const STEP_TITLES: Record<number, string> = {
	1: "Welcome",
	2: "Step 2 of 6 · Welcome",
	3: "Step 3 of 6 · Welcome",
	4: "Step 4 of 6 · Welcome",
	5: "Step 5 of 6 · Welcome",
	6: "Building your first deck · Welcome",
	7: "Step 6 of 6 · Welcome",
	8: "Last step · Welcome",
};
const EXAMPLE_TITLE = "Step 5 of 9 · Welcome";

/** A left offset in the 1440 frame, kept relative to the window's centre (the steps are centred compositions). */
const fromCentre = (x: number) => `calc(50% ${x < 720 ? "-" : "+"} ${Math.abs(720 - x)}px)`;

/**
 * Where the 1024 band of a step sits in a taller window, from the constraints of its content (read 2026-10-18): 01, 04,
 * 05, 06, 07 and 08 centre it (CENTER/CENTER: 2:5711, 2:6048, 2:6120, 2:6166, 2:6228, 2:6289), so the band is centred
 * and the top chrome subtracts it (pinTop); 02 and 03 pin it to the top (MIN/MIN: 2:5777, 2:5780, 2:5890, 2:5893), as
 * every layer of the EXAMPLE card 2:6664 is, so their band stays at the top with --stak-band 0 inside it, and the page
 * grows below (the approved "taller windows: the page grows" rule).
 */
const CENTRED_BAND: CSSProperties = { top: "var(--stak-band, 0px)" };
const TOP_BAND = { top: 0, "--stak-band": "0px" } as CSSProperties;

/**
 * Where the frames put the primary buttons that sit off whole pixels (x / y in the 1440 frame): Get started 2:5746, 03's
 * Continue 2:6018 (the deck group's 460.4639 height carries the fraction), 04 / 05's Continue 2:6090 / 2:6160, Lets go!
 * 2:6266 and Proceed to home 2:6305. Each is drawn there, edges and glow included (onFraction), its label on its row.
 */
const AT = {
	getStarted: [500.5, 823.7],
	swipeContinue: [500, 888.4639],
	matrixContinue: [500, 746.5],
	letsGo: [500, 757.5],
	proceed: [500, 735.5],
} as const;

/**
 * The canon's fill as one layer: its top gradient alone. Figma masks the composite of a frame's fills once (the opaque
 * gradient over #2c9dbc is the gradient), but Chrome clips each CSS background layer through the rounded corner on its
 * own, so on a fractional edge the two layers are anti-aliased twice: the half-pixel top row of 04's Continue measured
 * (53,87,106) where one layer paints (88,122,140), the half coverage Figma gives it (headless Chrome, 2026-10-18).
 * Identical everywhere inside the button.
 */
const ONE_LAYER = GRADIENT.includes("), linear-gradient(") ? GRADIENT.slice(0, GRADIENT.indexOf("), linear-gradient(") + 1) : GRADIENT;
/** A canon button drawn on its fractional place (AT): edges, ring and glow there, one fill layer. */
const onFractionButton = (at: readonly [number, number]): CSSProperties => ({ ...onFraction(at[0], at[1]), backgroundImage: ONE_LAYER });

/** 07's level-label boxes, by level word: the frame's own (onboarding/data.ts TASTE_BARS `levelW`). */
const LEVEL_W = { Strong: 34, Medium: 41, Light: 26 } as const;

export const Route = createFileRoute("/onboarding")({
	validateSearch: (search: Record<string, unknown>): OnboardingSearch => {
		const n = Number(search.step);
		const edit = search.edit === "taste" || search.edit === "goal" || search.edit === "risk" ? search.edit : undefined;
		return {
			// a one-question edit always opens on the step that asks it; the retake walks 02 to 07 (and opens on 02)
			step:
				edit === "taste"
					? Number.isInteger(n) && n >= EDIT_STEP.taste && n <= RETAKE_LAST_STEP
						? n
						: EDIT_STEP.taste
					: edit
						? EDIT_STEP[edit]
						: Number.isInteger(n) && n >= 1 && n <= 8
							? n
							: 1,
			// hold=1 freezes the Preparing-deck step (no auto-advance), preview=1 skips the sign-in guards
			hold: flag(search.hold),
			preview: flag(search.preview),
			// variant=example: the risk step as the centered card of 00 References 2:6664
			variant: search.variant === "example" ? "example" : undefined,
			edit,
		};
	},
	component: OnboardingPage,
});

/**
 * Figma 01 · Onboarding, steps 1-8 (2:5710 … 2:6271), driven by ?step=. The completion writes of the
 * previous onboarding page (preferences, deck reset, onboardingCompleted + claim refresh) run once
 * on the Preparing-deck step, exactly where the old flow ran them.
 *
 * Screen changes follow the prototype's wiring of these screens (phone section 1:179; the desktop frames carry none):
 * forward PUSH LEFT 0.3 s, Back PUSH RIGHT 0.3 s, Preparing deck -> Taste reveal DISSOLVE 0.35 s after 1.8 s.
 */
function OnboardingPage() {
	const { step, hold, preview, variant, edit } = Route.useSearch();
	const { user, loading, onboardingCompleted: claimsOnboardingCompleted, refreshClaims } = useAuth();
	const { account, accountLoading, updatePreferences, updateDeckOrder, updateLastBriefDate } = useAccount();
	const navigate = useNavigate();
	const router = useRouter();
	const live = useLive();
	useEffect(warmCatalog, []); // the catalog arrives during the steps, before /home needs it
	const hasProgressed = useRef(false);
	/**
	 * `edit`: Profile › Taste & risk opened the quiz for an onboarded account or the demo persona. `goal` / `risk` ask one
	 * question: the step starts on the saved answer, Continue saves that answer through live.actions.setPreferences and
	 * returns to the profile page, Back returns without saving. `taste` is the retake: the whole quiz from 02 on the saved
	 * answers, 06 Preparing without the first run's completion writes, and 07's Lets go saving every answer and returning
	 * to the profile page; Back on 02 returns without saving, Back on a later step goes to the step before as in the first
	 * run. Nothing else changes: a new user never carries `edit`, so the sign-in guards, the step order and the completion
	 * writes of the first run run exactly as before.
	 */
	const editing = edit !== undefined;
	const retake = edit === "taste";

	const [picks, setPicks] = useState<string[]>(DEFAULT_BRAND_PICKS);
	const [goal, setGoal] = useState<string>(DEFAULT_GOAL);
	// each frame starts on its own selection: the matrix on "Sell some", the example card on "A little drama"
	const [risk, setRisk] = useState<string>(variant === "example" ? EXAMPLE_DEFAULT_RISK : DEFAULT_RISK);
	const [name, setName] = useState(PROFILE_DEFAULT_NAME);
	// 08's photo, picked with Edit profile's picker (profile/identity.ts) and saved by Proceed to home; none: the initial
	const [photo, setPhoto] = useState<string | null>(null);
	const photoInput = useRef<HTMLInputElement>(null);
	const saveExtras = useSaveProfileExtras();
	/**
	 * 07's bars. The retake draws the person's own answers (the phones' TasteModel.bars: android onboarding/TasteModel.kt
	 * :51-57 with TasteRevealScreen.kt; live/taste.ts tasteBars) on the frame's 592 track. The first run keeps the frame's
	 * bars (TASTE_BARS): for the frame's default answers TasteModel would give Strong / Strong / Strong / Medium, not the
	 * frame's Strong / Strong / Medium / Light.
	 */
	const bars = retake
		? tasteBars({ picks, goal, risk }).map((b) => ({ label: b.label, level: b.level, levelW: LEVEL_W[b.level], width: Math.round(b.fraction * 592) }))
		: TASTE_BARS;
	const saving = useRef(false);
	const [savingAnswer, setSavingAnswer] = useState(false);
	// the Preparing-deck bar's fill is on its way from the frame's 260 to the track's 420 (the committed loader, HEAD e28e67a1)
	const [filling, setFilling] = useState(false);
	const [preparingDelayOver, setPreparingDelayOver] = useState<number | null>(null);
	const preparingVisit = useRef(0);
	const preparationKey = useRef("");

	// an edit opens on the person's saved answers, once the live state has them
	const seeded = useRef(false);
	useEffect(() => {
		if (!editing || !live.ready || seeded.current) return;
		seeded.current = true;
		const saved = live.preferences;
		if (saved.onboardingSwipes?.length) setPicks(saved.onboardingSwipes.filter((id) => BRANDS.some((b) => b.id === id)));
		if (saved.goal && GOALS.some((g) => g.id === saved.goal)) setGoal(saved.goal);
		if (saved.familiarity && RISKS.some((r) => r.id === saved.familiarity)) setRisk(saved.familiarity);
	}, [editing, live.ready, live.preferences]);
	/**
	 * Back to Taste & risk the way the person came: Taste & risk pushed this step, so the edit's own entries are popped
	 * (with the push-right of every Back: the one-question edit's one entry, the retake's one per step it pushed) instead
	 * of a new Taste & risk entry being pushed on top of them; the browser's Back from Taste & risk then leads to the page
	 * before it, never into the quiz again. Opened with nothing behind it in this tab (a pasted link), the edit is
	 * replaced by Taste & risk.
	 */
	const returnToProfile = useCallback(() => {
		const state = router.history.location.state;
		// Taste & risk focuses the row the quiz was opened from once it is back (profile/returnFocus.ts): after the pop the
		// control that sent the person here is gone, and focus would fall to <body>
		if (edit) rememberReturnFocus(edit);
		if (router.history.canGoBack() && state.onboardingEditFromProfile) backWithMotion(router, PUSH_BACK, Math.max(1, state.onboardingRetakeDepth ?? 1));
		else navigate({ to: "/profile/taste-risk", replace: true, viewTransition: PUSH_BACK });
	}, [router, navigate, edit]);
	/** The edit's Continue: save the one answer the step asked, then back to Taste & risk (the way the person came). */
	const saveEdit = useCallback(
		async (prefs: Partial<Preferences>) => {
			if (saving.current) return;
			saving.current = true;
			setSavingAnswer(true);
			try {
				await live.actions.setPreferences(prefs);
				returnToProfile();
			} catch {
				toast.error("Could not save your answer. Try again.");
			} finally {
				saving.current = false;
				setSavingAnswer(false);
			}
		},
		[live.actions, returnToProfile],
	);

	const goTo = useCallback(
		(next: number, viewTransition: ViewTransition | false, replace = false) => {
			hasProgressed.current = true;
			// a preview walk-through stays a preview (the harness opens the frames signed out); hold only freezes one capture;
			// the retake stays the retake, counting the entries it pushes above Taste & risk (returnToProfile pops them all)
			navigate({
				to: "/onboarding",
				search: { step: next, ...(variant ? { variant } : {}), ...(preview ? { preview } : {}), ...(retake ? { edit: "taste" as const } : {}) },
				state: (previous) => ({
					...previous,
					onboardingPreviousStep: replace ? previous.onboardingPreviousStep : step,
					...(retake ? { onboardingRetakeDepth: (previous.onboardingRetakeDepth ?? 1) + (replace ? 0 : 1) } : {}),
				}),
				viewTransition,
				replace,
			});
		},
		[navigate, variant, preview, step, retake],
	);
	const forward = useCallback((next: number) => goTo(next, PUSH_FORWARD), [goTo]);
	const back = useCallback(() => {
		// an edit's Back leaves the answers as they were and returns to Taste & risk (the retake's from its first step)
		if (editing && (!retake || step <= EDIT_STEP.taste)) returnToProfile();
		// prototype: Back on the Taste reveal returns to the Risk matrix, skipping the Preparing step (1:704 -> 1:570)
		else if (step > 1) {
			const previousStep = step === 7 ? 5 : step - 1;
			if (router.history.canGoBack() && router.history.location.state.onboardingPreviousStep === previousStep) backWithMotion(router, PUSH_BACK);
			else goTo(previousStep, PUSH_BACK, true);
		}
		// Welcome's Back (2:5749) carries no reaction and the phone Welcome 1:180 has none: it goes to the web's entry page
		// with the push-right motion, as Sign up's Back does (coordinator ruling 10:15); the session is never ended from
		// here. The history-state mark tells the landing page not to forward a signed-in first-run person straight back
		// (user ruling 2026-10-18: option A, the landing page's redirect yields to this Back)
		else navigate({ to: "/welcome", viewTransition: PUSH_BACK, state: (prev) => ({ ...prev, fromOnboarding: true }) });
	}, [editing, retake, returnToProfile, step, goTo, navigate, router]);

	/**
	 * An email account that has not opened its verification link: the API refuses its token (403 email_not_verified), so
	 * nothing the steps save would land and the person would reach Home with nothing saved. It verifies first, on Check
	 * your email, as the previous onboarding page sent it to /verify-email (frontend/src/routes/onboarding.tsx:113-125) and
	 * as the sign-in continuation sends it (usePostAuthRedirect, the same test). Check your email's reload() updates this
	 * same User object, so the verified person it sends back here is not bounced to it again.
	 */
	const verifyFirst = !!user && !user.emailVerified && user.providerData.some((provider) => provider.providerId === "password");

	// Guards from the previous onboarding page: no session -> sign in; an unverified email account -> Check your email;
	// already onboarded -> home. An edit from Taste & risk belongs to an onboarded account or the demo persona, so it passes
	// them like a preview.
	useEffect(() => {
		if (preview || editing || loading) return;
		if (!user) navigate({ to: "/login" });
		else if (verifyFirst) navigate({ to: "/check-email", search: { purpose: "verify", email: user.email ?? undefined }, replace: true });
	}, [preview, editing, user, loading, verifyFirst, navigate]);
	useEffect(() => {
		if (preview || editing || loading || !user || hasProgressed.current) return;
		if (claimsOnboardingCompleted) navigate({ to: "/home", replace: true });
	}, [preview, editing, loading, user, claimsOnboardingCompleted, navigate]);
	useEffect(() => {
		if (preview || editing || loading || accountLoading || !user || hasProgressed.current) return;
		if (account?.onboardingCompleted === true) navigate({ to: "/home", replace: true });
	}, [preview, editing, loading, accountLoading, user, account, navigate]);

	/**
	 * The first run's completion writes, sent once per account and answers and not waited for, as the original onboarding
	 * sent them (frontend/src/routes/onboarding.tsx:756-767, and this page as committed): each one catches its own failure,
	 * so an API that is down, failing or slow, or a profile document it has not created yet, never holds the person on this
	 * step or sends them back (N59). A completion that failed is sent again on the step's next visit. The prototype's
	 * minimum preparing interval below still times the move to the Taste reveal.
	 */
	useEffect(() => {
		// a preview, a signed-out persona and the retake run none of the first run's completion writes (the retake saves on 07),
		// nor does an unverified email account, which the guard above sends to Check your email
		if (step !== 6 || preview || editing || !user || verifyFirst) return;
		const key = JSON.stringify([user.uid, picks, goal, risk]);
		if (preparationKey.current === key) return;
		preparationKey.current = key;
		const prefs = { interests: [] as string[], familiarity: risk, onboardingSwipes: picks, goal };
		sessionStorage.removeItem("stak-deck-order");
		updatePreferences(prefs).catch(() => {});
		updateDeckOrder([]).catch(() => {});
		updateLastBriefDate(getLocalDateKey()).catch(() => {});
		updateProfile({ onboardingCompleted: true, preferences: prefs })
			.then(() => refreshClaims())
			.then(() => {
				logEvent("onboarding_complete", { brands: picks, goal, risk });
				trackEvent("onboarding_complete", { brands: picks, goal, risk }).catch(() => {});
			})
			.catch((err) => {
				console.warn("[onboarding] updateProfile failed:", err);
				if (preparationKey.current === key) preparationKey.current = "";
			});
	}, [step, user, preview, editing, verifyFirst, picks, goal, risk, refreshClaims, updatePreferences, updateDeckOrder, updateLastBriefDate]);
	/**
	 * …and the wait itself, in an effect of its own: refreshClaims changes identity when the claims refresh above lands
	 * (AuthContext re-renders), and in the writes' effect that restarted the 1.8 s. 1:635: AFTER_TIMEOUT 1.8 s, then
	 * DISSOLVE 0.35 s ease-out to the Taste reveal. The bar's fill starts on the frame's 260 of 420 and, a frame later,
	 * runs towards 420 over 2.2 s linear: Figma gives the bar no motion, so the committed loader's motion stays exactly as
	 * committed (HEAD e28e67a1: requestAnimationFrame -> filling, transition-[width] duration-[2200ms] ease-linear; the
	 * coordinator's ruling of 2026-10-18 10:15). `replace`: nothing in the prototype returns to this screen (07's Back goes
	 * to 05, 1:704), so the browser's Back from 07 skips it too instead of landing on a screen that moves on by itself.
	 * hold=1 freezes the frame for captures: no fill, no auto-advance.
	 */
	useEffect(() => {
		if (step !== 6 || hold) return;
		const visit = ++preparingVisit.current;
		setPreparingDelayOver(null);
		const start = requestAnimationFrame(() => setFilling(true));
		const t = setTimeout(() => setPreparingDelayOver(visit), PREPARING_MS);
		return () => {
			cancelAnimationFrame(start);
			clearTimeout(t);
			// the next visit of the step starts the fill from the frame's 260 again
			setFilling(false);
		};
	}, [step, hold]);
	useEffect(() => {
		if (step === 6 && !hold && preparingDelayOver === preparingVisit.current) goTo(7, DISSOLVE, true);
	}, [step, hold, preparingDelayOver, goTo]);

	/**
	 * A step change moves the keyboard focus to the new step's heading: the control that moved on (Continue, Back, Get
	 * started) is gone with its step, so focus fell to <body> and a screen reader announced nothing. The title follows
	 * the step too; it is set a frame later, after the root's own title effect, which runs after this one when the route
	 * is entered. The first screen of a visit keeps the page's focus as it arrived.
	 */
	const bandRef = useRef<HTMLDivElement>(null);
	const shownStep = useRef<string | null>(null);
	useEffect(() => {
		const key = `${step}${variant ?? ""}`;
		if (shownStep.current !== null && shownStep.current !== key) {
			bandRef.current?.querySelector<HTMLElement>("[data-step-title]")?.focus({ preventScroll: true });
		}
		shownStep.current = key;
		const title = variant === "example" && step === 5 ? EXAMPLE_TITLE : STEP_TITLES[step];
		const frame = requestAnimationFrame(() => {
			document.title = `${title} · STAK`;
		});
		return () => cancelAnimationFrame(frame);
	}, [step, variant]);

	const togglePick = (id: string) => setPicks((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
	const topAnchored = step === 2 || step === 3 || (step === 5 && variant === "example");
	/**
	 * Below 1024 the steps reflow (src/app/onboarding/responsive.css, SPEC R1-R11). Two of them also change which piece
	 * comes first, and there the DOM follows what the eye sees (the R2 / R10 ruling: no CSS `order`), so they render by
	 * size class; from 1024 up (desktop, big) every step renders exactly as approved:
	 * - 01 Welcome on a phone: the heading pair, then the hero, then Get started, as the phone frame 1:180 orders them
	 *   (1:196 heading pair, 1:199 Hero, 1:229 CTA); a tablet keeps the desktop frame's order (hero first).
	 * - 07 Taste reveal: "Your deck adjusts as you swipe." (2:6227) is placed in the 1440 frame where the Risk style card
	 *   covers it; reflowed into normal flow (R6) it follows that card, where the phone frame 1:688 puts it (1:743 after the
	 *   Risk chip 1:738, before the CTA).
	 */
	const sizeClass = useSizeClass();
	const phone = sizeClass === "phone";
	const compact = phone || sizeClass === "tablet";

	return (
		<div
			data-onboarding-step={step}
			data-onboarding-variant={variant}
			className="stak-figma stak-onboarding relative w-full overflow-clip bg-[#0a1020] font-geist antialiased"
			style={{ minHeight: fillHeight }}
		>
			{/*
			 * The 1024 band of the frame: centred in taller windows, or kept at the top where the frame pins its content there
			 * (TOP_BAND). Its own compositing layer: Chrome on Windows draws text in the page's opaque root layer with coloured
			 * sub-pixel (LCD) edges, heavier than Figma's grayscale text, and the app's opacity-0.999 text rule does not reach
			 * every text here; in a transparent layer all of it is grayscale.
			 */}
			<div ref={bandRef} className="onboarding-band absolute left-0 h-[1024px] w-full will-change-transform" style={topAnchored ? TOP_BAND : CENTRED_BAND}>
				{step === 1 && (
					<>
						<BackControl className="onboarding-back absolute left-[60px]" style={{ top: pinTop(96) }} onClick={back} />
						{/* 2:5711 at 404 / 116.5, 633 wide */}
						<div
							className="onboarding-section absolute top-[116.5px] flex w-[633px] flex-col items-center gap-[48px] max-lg:max-w-[633px] max-sm:gap-[32px]"
							style={{ left: fromCentre(404) }}
						>
							{phone ? (
								<>
									<WelcomeCopy />
									<HeroBox frame="welcome" />
									<WelcomeAction onStart={() => forward(2)} />
								</>
							) : (
								<>
									<HeroBox frame="welcome" />
									<div className="flex w-full flex-col items-center gap-[70px]">
										<WelcomeCopy />
										<WelcomeAction onStart={() => forward(2)} />
									</div>
								</>
							)}
						</div>
					</>
				)}

				{step === 2 && (
					<>
						<OnboardingChrome label="STEP 2 OF 6" labelX={1308} logoText="early" progress={2} onBack={back} />
						<StepHeading
							className="absolute top-[170px]"
							style={{ left: fromCentre(454) }}
							title="Which brands do you know or use?"
							titleW={532}
							subtitle="Pick a few. STAK uses this to learn what feels familiar to you."
							subW={387}
						/>
						<div
							className="onboarding-section absolute top-[320px] flex w-[960px] flex-col items-center gap-[90px] max-lg:max-w-[960px] max-sm:gap-[32px]"
							style={{ left: fromCentre(240) }}
						>
							{/* the grid clips like Figma's frame, and reaches the focus ring's 4px further while a tile shows it */}
							<div className="onboarding-brands relative h-[268px] w-full overflow-clip has-[:focus-visible]:[overflow-clip-margin:4px]">
								{BRANDS.map((b, i) => (
									<BrandCard key={b.id} brand={b} selected={picks.includes(b.id)} onToggle={() => togglePick(b.id)} index={i} />
								))}
							</div>
							<div className="flex w-[440px] flex-col items-center gap-[17px] max-lg:w-full max-lg:max-w-[440px]">
								<PrimaryButton onClick={() => forward(3)} disabled={picks.length === 0}>
									{/* "Continue · 5 picked" 2:5860 is a HUG text box (its run rounded up: 126 at x 657), centred by the button's
									    auto layout: the canon gives the bare label Figma's 126 for the frame's count and the run rounded up for
									    every other count, so each one is centred as Figma's auto layout centres it */}
									{`Continue · ${picks.length} picked`}
								</PrimaryButton>
								<p className="h-[14px] w-full text-center font-geist text-[11px] leading-[14px] text-[#819abb]">You can change this later</p>
							</div>
						</div>
					</>
				)}

				{step === 3 && (
					<>
						<OnboardingChrome label="STEP 3 OF 6" labelX={1308} logoText="early" progress={3} onBack={back} />
						<StepHeading
							className="absolute top-[170px]"
							style={{ left: fromCentre(554) }}
							title="Now try a few swipes."
							titleW={333}
							subtitle="Use ← → keys or click. Save what you like."
							subW={266}
						/>
						<div
							className="onboarding-section absolute top-[283px] flex w-[440px] flex-col items-center gap-[70px] max-lg:max-w-[680.5034px] max-sm:gap-[32px]"
							style={{ left: fromCentre(500) }}
						>
							<SwipeCards />
							{/* 2:6018 at 888.4639: the deck group's 460.4639 height carries the fraction down */}
							<PrimaryButton onClick={() => forward(4)} style={onFractionButton(AT.swipeContinue)}>
								<Label w={60} at={AT.swipeContinue}>
									Continue
								</Label>
							</PrimaryButton>
						</div>
					</>
				)}

				{step === 4 && (
					<>
						<OnboardingChrome label="STEP 4 OF 6" labelX={1308} logoText="early" progress={4} onBack={back} />
						{/* 2:6048 at 332 / 226.5 */}
						<div
							className="onboarding-section absolute top-[226.5px] flex w-[776px] flex-col items-center gap-[84px] max-lg:max-w-[776px] max-sm:gap-[32px]"
							style={{ left: fromCentre(332) }}
						>
							<StepHeading title="What brings you here?" titleW={343} subtitle="Pick one. You can change it any time." subW={236} />
							<div className="flex w-full flex-col items-center gap-[70px] max-sm:gap-[32px]">
								<OptionMatrix options={GOALS} icons={GOAL_ICONS} selected={goal} onSelect={setGoal} wideFirst fy={0.5} />
								<PrimaryButton className="w-[440px]" onClick={() => (editing && !retake ? saveEdit({ goal }) : forward(5))} style={onFractionButton(AT.matrixContinue)}>
									<Label w={60} at={AT.matrixContinue}>
										Continue
									</Label>
								</PrimaryButton>
							</div>
						</div>
					</>
				)}

				{step === 5 && variant === "example" && (
					<ExampleStepCard risk={risk} onSelect={setRisk} onContinue={() => (editing && !retake ? saveEdit({ familiarity: risk }) : forward(6))} onBack={back} />
				)}

				{step === 5 && variant !== "example" && (
					<>
						<OnboardingChrome label="STEP 5 OF 6" labelX={1307} logoText="early" progress={5} onBack={back} />
						{/* 2:6120 at 332 / 226.5 aligns its children to the right edge: the 700 heading block sits at x 76 of the 776 */}
						{/* below 1024 the heading block centres in the column like every other step's (max-lg:items-center) */}
						<div
							className="onboarding-section absolute top-[226.5px] flex w-[776px] flex-col items-end gap-[84px] max-lg:max-w-[776px] max-lg:items-center max-sm:gap-[32px]"
							style={{ left: fromCentre(332) }}
						>
							<StepHeading
								title="A stock you’re watching drops 10% overnight."
								titleW={700}
								subtitle="No wrong answer. This helps STAK understand your risk style."
								subW={392}
							/>
							<div className="flex w-full flex-col items-center gap-[70px] max-sm:gap-[32px]">
								<OptionMatrix options={RISKS} icons={RISK_ICONS} selected={risk} onSelect={setRisk} fy={0.5} />
								<PrimaryButton
									className="w-[440px]"
									onClick={() => (editing && !retake ? saveEdit({ familiarity: risk }) : forward(6))}
									style={onFractionButton(AT.matrixContinue)}
								>
									<Label w={60} at={AT.matrixContinue}>
										Continue
									</Label>
								</PrimaryButton>
							</div>
						</div>
					</>
				)}

				{step === 6 && (
					// 2:6166 at 510 / 179: no chrome on this frame. The bar starts on the frame's 260 of 420 and fills towards 420 at
					// the codebase's pace (2.2 s linear, HEAD's loader; Figma draws no motion on 2:6200) while the screen holds 1.8 s;
					// below 1024 the same motion in the track's share (responsive.css: 61.9 % -> 100 %)
					<div
						className="onboarding-section absolute top-[179px] flex w-[420px] flex-col items-center gap-[48px] max-lg:max-w-[420px] max-sm:gap-[32px]"
						style={{ left: fromCentre(510) }}
					>
						<HeroBox frame="preparing" />
						<div className="flex w-full flex-col items-center gap-[54px] max-sm:gap-[32px]">
							<StepHeading title="Building your first deck..." titleW={381} subtitle="Reading your brand picks" subW={163} />
							<div
								className="relative h-[6px] w-full overflow-clip rounded-[3px] bg-[#12203e]"
								// 2:6200 at 839.2 (the hero's 492.2 height carries the fraction down)
								style={onFraction(510, 839.2)}
								role="progressbar"
								aria-label="Building your first deck"
								aria-valuemin={0}
								aria-valuemax={420}
								aria-valuenow={filling && !hold ? 420 : 260}
							>
								<div
									// the committed loader exactly (HEAD e28e67a1): 260 -> 420 over transition-[width] 2200 ms linear, started a
									// frame after the step shows; no reduced-motion variant there, so none here (a jump to the full 420 under
									// reduced motion showed neither the frame's 260 nor the committed fill)
									className="onboarding-preparing-fill absolute left-0 top-0 h-[6px] rounded-[3px] bg-[#5da8bf] transition-[width] duration-[2200ms] ease-linear"
									data-onboarding-filling={filling && !hold ? "" : undefined}
									style={{ width: filling && !hold ? 420 : 260 }}
								/>
							</div>
						</div>
					</div>
				)}

				{step === 7 && (
					<>
						<OnboardingChrome label="STEP 6 OF 6" labelX={1307} logoText="late" progress={6} onBack={back} />
						{/* 2:6227 sits under the Risk style card in the frame (drawn first, covered by 2:6261); below 1024 it is in flow
						    after that card instead (R6, the phone frame's order: see `compact` above) */}
						{!compact && (
							<p className="absolute top-[632px] w-[160px] whitespace-nowrap font-geist text-[11px] leading-[14px] text-[#819abb] max-lg:hidden" style={{ left: fromCentre(640) }}>
								Your deck adjusts as you swipe.
							</p>
						)}
						{/* 2:6228 at 370 / 215.5 */}
						<div
							className="onboarding-section absolute top-[215.5px] flex w-[700px] flex-col items-center gap-[70px] max-lg:max-w-[700px] max-sm:gap-[32px]"
							style={{ left: fromCentre(370) }}
						>
							<div className="flex w-full flex-col items-center gap-[64px] max-sm:gap-[32px]">
								<div className="flex w-full flex-col items-center gap-[8px]">
									<p className="h-[14px] w-full text-center font-geist text-[11px] font-medium leading-[14px] tracking-[0.88px] text-[#819abb]">
										YOUR STARTING STAK TASTE
									</p>
									<div className="flex w-full flex-col items-center gap-[10px] overflow-clip">
										<h1
											{...STEP_TITLE_FOCUS}
											className="h-[38px] w-[358px] whitespace-nowrap font-sora text-[30px] font-semibold leading-[38px] text-[#f2f6fc] outline-none max-lg:h-auto max-lg:w-auto max-lg:max-w-full max-lg:whitespace-normal max-lg:text-center max-lg:text-balance"
										>
											Here’s what you’re into.
										</h1>
										<p className="h-[18px] w-[700px] text-center font-geist text-[14px] leading-[18px] text-[#819abb] max-lg:h-auto max-lg:w-full max-sm:text-balance">
											Built from your picks. It gets smarter with every swipe.
										</p>
									</div>
								</div>
								<div className="flex w-[640px] flex-col items-start gap-[14px] max-lg:w-full max-lg:max-w-[640px]">
									{/* "Taste bars" 2:6236 at 400 / 367.5 and "Risk style" 2:6261 at 400 / 627.5: their fills on Figma's half pixel
									    (FracFill), the tracks 2:6241 … at 413.5 + 54n too (onFraction); the texts keep their rows */}
									<div className="relative isolate flex w-full flex-col items-start gap-[14px] rounded-[16px] px-[24px] py-[22px]">
										<FracFill x={400} y={367.5} className="rounded-[16px] bg-[#181f30]" />
										{bars.map((bar, i) => (
											<div key={bar.label} className="flex h-[40px] w-full flex-col items-start gap-[6px] overflow-clip">
												<div className="flex h-[18px] w-full items-start justify-between overflow-clip whitespace-nowrap">
													<span className="font-geist text-[13px] font-medium leading-[17px] text-[#f2f6fc]">{bar.label}</span>
													<span className="font-geist text-[11px] leading-[14px] text-[#819abb]" style={{ width: bar.levelW }}>
														{bar.level}
													</span>
												</div>
												<div className="relative h-[6px] w-full overflow-clip rounded-[3px] bg-[#12203e]" style={onFraction(424, 413.5 + i * 54)}>
													<div className="onboarding-taste-fill absolute left-0 top-0 h-[6px] rounded-[3px] bg-[#5da8bf]" style={{ width: bar.width, "--taste-progress": `${(bar.width / 592) * 100}%` } as CSSProperties} />
												</div>
											</div>
										))}
									</div>
									<div className="relative isolate flex h-[60px] w-full items-center justify-between whitespace-nowrap rounded-[16px] px-[24px] py-[16px]">
										<FracFill x={400} y={627.5} className="rounded-[16px] bg-[#181f30]" />
										<div className="flex flex-col items-start gap-[2px] overflow-clip">
											<span className="font-geist text-[11px] leading-[14px] text-[#819abb]">Risk style</span>
											{/* the retake names the person's own risk style (live/taste.ts RISK_STYLES); the first run the frame's */}
											<span className="font-geist text-[14px] font-medium leading-[18px] text-[#f2f6fc]">{retake ? (RISK_STYLES[risk]?.value ?? RISK_STYLE) : RISK_STYLE}</span>
										</div>
										<span className="w-[6px] font-geist text-[15px] font-medium leading-[20px] text-[#819abb]" aria-hidden="true">
											›
										</span>
									</div>
									{/* 2:6227 below 1024: Geist 11/14 #819abb on one line, centred under the cards as the frame centres its 160 box */}
									{compact && (
										<p className="self-center whitespace-nowrap font-geist text-[11px] leading-[14px] text-[#819abb]">Your deck adjusts as you swipe.</p>
									)}
								</div>
							</div>
							{/* the retake ends here: Lets go saves every answer of the walk and returns to Taste & risk (the phones: 07's Lets go
							    under QuizRetake, android StakNavHost.kt:245-253, ios QuizRetakeFlow.swift:49-53 / 76) */}
							<PrimaryButton
								className="w-[440px]"
								onClick={() => (retake ? saveEdit({ onboardingSwipes: picks, goal, familiarity: risk }) : goTo(8, false))}
								disabled={retake && savingAnswer}
								aria-busy={retake && savingAnswer}
								style={onFractionButton(AT.letsGo)}
							>
								<Label w={52} at={AT.letsGo}>
									Lets go!
								</Label>
							</PrimaryButton>
						</div>
					</>
				)}

				{step === 8 && (
					<>
						<OnboardingChrome label="STEP · LAST ONE" labelX={1281} logoText="late" onBack={back} />
						{/* 2:6289 at 370 / 237.5 */}
						<div
							className="onboarding-section absolute top-[237.5px] flex w-[700px] flex-col items-center gap-[70px] max-lg:max-w-[700px] max-sm:gap-[32px]"
							style={{ left: fromCentre(370) }}
						>
							<div className="flex w-full flex-col items-center gap-[53px] max-sm:gap-[32px]">
								<div className="flex w-full flex-col items-center gap-[10px] overflow-clip">
									<h1
										{...STEP_TITLE_FOCUS}
										className="h-[38px] w-[204px] whitespace-nowrap font-sora text-[30px] font-semibold leading-[38px] text-[#f2f6fc] outline-none max-lg:max-w-full"
									>
										Make it yours
									</h1>
									<p className="h-[18px] w-[700px] text-center font-geist text-[14px] leading-[18px] text-[#819abb] max-lg:h-auto max-lg:w-full max-sm:text-balance">
										Pick a name and photo. This is how you’ll show up on leaderboards.
									</p>
								</div>
								<div className="flex w-[120px] flex-col items-center gap-[18px]">
									{/* "Avatar" 2:6295 at 660 / 356.5, "Input · Display name" 2:6301 at 585.5, "Proceed to home" 2:6305 at 735.5.
									    The avatar and "Add a photo" 2:6297 open Edit profile's picker (the coordinator's ruling of 2026-11-07, profile
									    audit #2: both phones' 09 Profile setup open it from both, android ProfileSetupScreen PickVisualMedia); the
									    picked image becomes the avatar and Proceed to home saves it. The picker is hidden (the system's file dialog is
									    what shows); the avatar is the keyboard's one control, the text is the picker's label. At rest the frame is
									    drawn as before: `text-left` keeps the initial left-aligned in its whole-pixel box (a button centres text). */}
									<input
										ref={photoInput}
										id="onboarding-photo"
										type="file"
										accept="image/*"
										hidden
										onChange={async (e) => {
											const f = e.target.files?.[0];
											e.target.value = ""; // the same file picked again still arrives
											if (!f) return;
											try {
												setPhoto(await downscalePhoto(f));
											} catch {
												toast.error("That file is not an image STAK can read. Try another photo.");
											}
										}}
									/>
									<button
										type="button"
										aria-label="Add a photo"
										onClick={() => photoInput.current?.click()}
										className="relative isolate flex h-[120px] w-full cursor-pointer items-center justify-center rounded-[60px] text-left"
									>
										<FracFill x={660} y={356.5} className="rounded-[60px] bg-[#181f30]" />
										{photo ? (
											<img alt="" src={photo} draggable={false} className="absolute inset-0 size-full rounded-[60px] object-cover" />
										) : (
											<span className="whitespace-nowrap font-sora text-[44px] font-semibold leading-[55px] text-[#f2f6fc]" style={{ width: FIGMA_W }}>
												{(name.trim()[0] ?? "N").toUpperCase()}
											</span>
										)}
									</button>
									{/* "Add a photo" 2:6297: Geist Medium 12/16 #a6e4f7, 120 x 16, centred */}
									<label htmlFor="onboarding-photo" className="block h-[16px] w-full cursor-pointer text-center font-geist text-[12px] font-medium leading-[16px] text-[#a6e4f7]">
										Add a photo
									</label>
								</div>
								<div className="flex w-[440px] flex-col items-center gap-[18px] max-lg:w-full max-lg:max-w-[440px]">
									<div className="flex w-full flex-col items-start gap-[9px]">
										<label htmlFor="display-name" className="h-[13px] w-full font-geist text-[10px] font-medium leading-[13px] tracking-[0.8px] text-[#819abb]">
											DISPLAY NAME
										</label>
										{/* Focus draws the app's ring (2px #69b3ca) on the field's own rounded box, inside it, as the auth fields do,
										    instead of around the bare text line; a person's name gets no spell-check squiggle */}
										<div className="relative isolate flex h-[48px] w-full items-center justify-between whitespace-nowrap rounded-[12px] px-[16px] has-[input:focus-visible]:outline-2 has-[input:focus-visible]:-outline-offset-2 has-[input:focus-visible]:outline-[#69b3ca]">
											<FracFill x={500} y={585.5} className="rounded-[12px] bg-[#181f30]" />
											{/* Below 1024 a tap anywhere on the field (Figma's 48-tall "Input · Display name" 2:6301) focuses the name, not
											    only on its 18-px text line: an empty label over the field box, under the input (max-lg:relative: it keeps
											    its own taps, caret and selection) and the "4 / 20" counter (max-lg:pointer-events-none lets its taps through).
											    Invisible, no pixel changes (the R8 ruling of 2026-10-31 for a target under 24 px); out of the accessibility
											    tree, so the field's name stays "DISPLAY NAME". From 1024 up the field is exactly as approved */}
											{compact && <label htmlFor="display-name" aria-hidden="true" className="absolute inset-0 cursor-text rounded-[12px]" />}
											<input
												id="display-name"
												value={name}
												maxLength={PROFILE_NAME_MAX}
												spellCheck={false}
												onChange={(e) => setName(e.target.value)}
												style={{ outline: "none" }}
												className="min-w-0 flex-1 bg-transparent font-geist text-[14px] font-medium leading-[18px] text-[#f2f6fc] outline-none max-lg:relative"
											/>
											<span className="font-geist text-[11px] leading-[14px] text-[#819abb] max-lg:pointer-events-none" style={{ width: FIGMA_W }}>
												{`${name.length} / ${PROFILE_NAME_MAX}`}
											</span>
										</div>
									</div>
									<p className="h-[14px] w-full text-center font-geist text-[11px] leading-[14px] text-[#819abb]">You can change this anytime in Profile.</p>
								</div>
							</div>
							<PrimaryButton
								width={440}
								disabled={savingAnswer}
								style={onFractionButton(AT.proceed)}
								onClick={() => {
									if (saving.current) return;
									saving.current = true;
									// the name chosen here is the one the sidebar, Home and Profile show. Saved and not waited for, as the
									// committed page saved it: an API that is down or slow, or a profile document it has not created yet,
									// never holds the person on this step (N59); a failed save still says so
									if (name.trim() && name.trim() !== PROFILE_DEFAULT_NAME) {
										live.actions.setDisplayName(name).catch(() => toast.error("Could not save your name. Try again."));
									}
									// …and the photo picked here the avatar they draw (the account's own, as Edit profile saves it)
									if (photo) saveExtras({ photo });
									// 1:785 "Proceed to home" -> "Home first run": PUSH LEFT 0.3 s
									void navigate({ to: "/home", search: { firstRun: true }, replace: true, viewTransition: PUSH_FORWARD }).finally(() => {
										saving.current = false;
									});
								}}
							>
								<Label w={112} at={AT.proceed}>
									Proceed to home
								</Label>
							</PrimaryButton>
						</div>
					</>
				)}
			</div>
		</div>
	);
}

/**
 * 01 Welcome's heading pair (2:5711's text group): "Find stocks you actually understand." Sora SemiBold 34/43 on one
 * 633 line, the line under it Geist 15/20 in its 620 box (two lines, centred). Below 1024 the title wraps at its size in
 * a narrower column, balanced and centred (R1); the 620 box narrows with the column.
 */
function WelcomeCopy() {
	return (
		<div className="flex w-full flex-col items-center gap-[14px] overflow-clip">
			<h1
				{...STEP_TITLE_FOCUS}
				className="h-[43px] w-[633px] whitespace-nowrap font-sora text-[34px] font-semibold leading-[43px] text-[#f2f6fc] outline-none max-lg:h-auto max-lg:w-auto max-lg:max-w-full max-lg:whitespace-normal max-lg:text-center max-lg:text-balance"
			>
				Find stocks you actually understand.
			</h1>
			<p className="h-[40px] w-[620px] text-center font-geist text-[15px] leading-[20px] text-[#819abb] max-lg:h-auto max-lg:max-w-full max-sm:text-balance">
				STAK turns brands you already know into simple, clear stock ideas, so you can invest with confidence.
			</p>
		</div>
	);
}

/** 01 Welcome's action: Get started (2:5746) and "Takes about a minute", 440 wide (the column's width at most below 1024). */
function WelcomeAction({ onStart }: { onStart: () => void }) {
	return (
		<div className="flex w-[440px] flex-col items-center gap-[17px] max-lg:w-full max-lg:max-w-[440px]">
			{/* 2:5746 at 500.5 / 823.7: drawn there, edges and all (onFraction); the label keeps its pixel row */}
			<PrimaryButton onClick={onStart} style={onFractionButton(AT.getStarted)}>
				<Label w={75} at={AT.getStarted}>
					Get started
				</Label>
			</PrimaryButton>
			<p className="h-[14px] w-full text-center font-geist text-[11px] leading-[14px] text-[#819abb]">Takes about a minute</p>
		</div>
	);
}

/**
 * A button label at Figma's text-box width (whole pixels), left-aligned in it like Figma's, so it sits in the button where
 * Figma's does. `at`: the button's place when it is drawn on a fraction (onFraction), so the glyphs keep their row.
 */
function Label({ w, at, children }: { w?: number; at?: readonly [number, number]; children: string }) {
	return (
		<span className="text-left" style={{ width: w ?? FIGMA_W }}>
			{at ? (
				<FracLabel x={at[0]} y={at[1]}>
					{children}
				</FracLabel>
			) : (
				children
			)}
		</span>
	);
}
