import { beforeEach, describe, expect, it } from "vitest";
import { FRAME_NOW } from "@/app/live/clock";
import { seedGuest } from "@/app/live/guest";
import { answerScores, blendedScores, NO_TASTE_CHIP, SWIPE_HALF, swipeScores, tasteBars, tasteChips } from "@/app/live/taste";
import { DEFAULT_SETTINGS, normalizeSettings, PRICE_THRESHOLDS, settingsStore } from "@/app/notifications/settings";
import { editProfile, helpSupport, mailto, notificationSettings, profile, tasteRisk } from "../data";
import { cleanHandleInput, derivedHandle, extrasStore, HANDLE_MAX, handleToStore, investorSince } from "../identity";
import { rememberReturnFocus, takeReturnFocus } from "../returnFocus";

describe("taste chips from the onboarding answers (the phones' TasteModel)", () => {
	it("gives the guest persona's seed answers the frame's three chips (2:2793-2:2801), in the frame's order", () => {
		const seed = seedGuest();
		const answers = { picks: seed.preferences.onboardingSwipes, goal: seed.preferences.goal, risk: seed.preferences.familiarity };
		expect(tasteChips(answers)).toEqual(["Tech Curious", "High Growth", "Consumer Brands"]);
		// and with the persona's swipe-learned scores blended in
		expect(tasteChips(answers, seed.tagScores)).toEqual(["Tech Curious", "High Growth", "Consumer Brands"]);
	});

	it("scores picks, goal and risk as TasteModel.scores does (android TasteModel.kt:42-49)", () => {
		const s = answerScores({ picks: ["nike", "spotify", "disney"], goal: "learn", risk: "sell" });
		expect(s.tech).toBeCloseTo(1 / 3, 5);
		expect(s.growth).toBeCloseTo(1 / 3 - 0.2, 5);
		expect(s.consumer).toBe(1);
		expect(s.income).toBe(1); // 2/3 + 0.3 + 0.1, clamped
		expect(answerScores({ picks: [] })).toEqual({ tech: 0, growth: 0, consumer: 0, income: 0 });
	});

	it("re-ranks visibly on a retake: the audit's two personas", () => {
		// Nike, Spotify, Disney + Protective + Learning: the strongest first, at most three
		expect(tasteChips({ picks: ["nike", "spotify", "disney"], goal: "learn", risk: "sell" })).toEqual(["Consumer Brands", "Income Focused", "Risk Aware"]);
		// the retake's NVIDIA, Microsoft, Spotify with the same goal and risk
		expect(tasteChips({ picks: ["nvidia", "microsoft", "spotify"], goal: "learn", risk: "sell" })).toEqual(["Tech Curious", "Income Focused", "Risk Aware"]);
	});

	it("says Just Exploring when nothing qualifies, and Learning / Risk Aware from the answers alone", () => {
		expect(tasteChips({})).toEqual([NO_TASTE_CHIP]);
		expect(tasteChips({ picks: [], goal: "explore", risk: "hold" })).toEqual([NO_TASTE_CHIP]);
		expect(tasteChips({ picks: [], goal: "learn", risk: "step" })).toEqual(["Risk Aware", "Learning"]);
	});

	it("blends the swipe-learned scores in as they grow, and takes them alone when there are no answers", () => {
		const nvdaSave = { technology: 5, ai: 5, semiconductor: 5, high_growth: 3.75, data_center: 3.75 };
		const { signal, scores } = swipeScores(nvdaSave);
		expect(signal).toBeCloseTo(36.25, 5);
		expect(scores.tech).toBe(1);
		expect(scores.income).toBe(0);
		// no answers: the learned tastes alone
		expect(tasteChips({}, nvdaSave)).toEqual(["Tech Curious", "High Growth"]);
		// a consumer-only quiz is pulled toward tech as saves pile up
		const quiz = { picks: ["nike", "disney"] };
		const one = blendedScores(quiz, nvdaSave);
		const ten = blendedScores(quiz, Object.fromEntries(Object.entries(nvdaSave).map(([k, v]) => [k, v * 10])));
		expect(one.tech).toBeGreaterThan(0);
		expect(ten.tech).toBeGreaterThan(one.tech);
		expect(ten.consumer).toBeLessThan(one.consumer);
		expect(tasteChips(quiz)).toEqual(["Consumer Brands", "Income Focused"]);
		expect(tasteChips(quiz, Object.fromEntries(Object.entries(nvdaSave).map(([k, v]) => [k, v * 10])))[0]).toBe("Tech Curious");
		// the learned weight is half at SWIPE_HALF of signal
		const w = SWIPE_HALF / (SWIPE_HALF + SWIPE_HALF);
		expect(w).toBe(0.5);
	});

	it("gives the reveal's bars as TasteModel.bars does", () => {
		const bars = tasteBars({ picks: ["apple", "nvidia", "tesla"], goal: "grow", risk: "buy" });
		expect(bars.map((b) => b.label)).toEqual(["Tech curious", "Growth seeking", "Consumer brands", "Income & dividends"]);
		expect(bars.map((b) => b.level)).toEqual(["Strong", "Strong", "Strong", "Medium"]);
		expect(bars[0]!.fraction).toBe(1);
		expect(bars[3]!.fraction).toBeCloseTo(0.2 + 0.8 / 3, 5);
	});
});

describe("the handle (Edit profile 2:2596)", () => {
	it("keeps no spaces, one leading @ and HANDLE_MAX characters", () => {
		expect(cleanHandleInput("@grace hopper")).toBe("@gracehopper");
		expect(cleanHandleInput("@@grace")).toBe("@grace");
		expect(cleanHandleInput("grace")).toBe("grace");
		expect(cleanHandleInput(`@${"x".repeat(40)}`)).toHaveLength(HANDLE_MAX);
		expect(cleanHandleInput("x".repeat(40))).toHaveLength(HANDLE_MAX - 1);
	});

	it("derives the default from the first name as useAccountDisplay does", () => {
		expect(derivedHandle("Hamza")).toBe("@hamza");
		expect(derivedHandle("Grace Hopper")).toBe("@grace");
		expect(derivedHandle("  ")).toBe("@you");
		expect(derivedHandle("Zoë")).toBe("@zo");
	});

	it("stores blank for an empty field, a lone @ or the name's own default, else @ + what was typed", () => {
		expect(handleToStore("", "Hamza")).toBe("");
		expect(handleToStore("@", "Hamza")).toBe("");
		expect(handleToStore("@hamza", "Hamza")).toBe("");
		expect(handleToStore("hz_trades", "Hamza")).toBe("@hz_trades");
		expect(handleToStore("@hz trades", "Hamza")).toBe("@hztrades");
		// renamed: the old default is now a handle of its own
		expect(handleToStore("@hamza", "Grace")).toBe("@hamza");
	});

	it("keeps the handle and the photo per account in this browser", () => {
		localStorage.clear();
		extrasStore("u-1").update({ handle: "@one" });
		expect(extrasStore("u-1").read().handle).toBe("@one");
		expect(extrasStore(null).read()).toEqual({ handle: "", photo: null });
		expect(JSON.parse(localStorage.getItem("stak.profile.u-1.v1") ?? "{}").handle).toBe("@one");
		extrasStore("u-1").reset();
		expect(extrasStore("u-1").read()).toEqual({ handle: "", photo: null });
	});
});

describe("notification settings", () => {
	beforeEach(() => localStorage.clear());

	it("default to the phones' values, with Market news on (it decides the frame's brief row)", () => {
		expect(DEFAULT_SETTINGS).toEqual({ priceAlerts: true, priceThreshold: 3, dailyDeck: true, marketNews: true });
		expect(PRICE_THRESHOLDS).toEqual([1, 3, 5, 10]);
	});

	it("read a threshold the chips do not offer as the default", () => {
		expect(normalizeSettings({ ...DEFAULT_SETTINGS, priceThreshold: 7 }).priceThreshold).toBe(3);
		expect(normalizeSettings({ ...DEFAULT_SETTINGS, priceThreshold: 10 }).priceThreshold).toBe(10);
	});

	it("are kept per account", () => {
		settingsStore("u-2").update({ priceThreshold: 5, marketNews: false });
		expect(settingsStore("u-2").read()).toMatchObject({ priceThreshold: 5, marketNews: false });
		expect(settingsStore(null).read()).toEqual(DEFAULT_SETTINGS);
	});
});

describe("Help & support", () => {
	it("writes mailto links with an encoded subject and body", () => {
		expect(mailto("support@thestak.org", helpSupport.email.subject)).toBe("mailto:support@thestak.org?subject=STAK%20support");
		const report = mailto("support@thestak.org", helpSupport.report.subject, helpSupport.report.body("1.0"));
		expect(report).toContain("subject=STAK%20problem%20report");
		expect(decodeURIComponent(report.split("body=")[1]!)).toBe("What happened:\n\nWhere in the app:\n\nApp version 1.0 (web)");
	});

	it("answers the money question with the person's own budget", () => {
		expect(helpSupport.faq.money.answer("$10,000")).toContain("$10,000 of paper money");
	});

	it("spells 'practice' as the frames and the phones do, with the typographic apostrophe in its own copy (C-18)", () => {
		expect(helpSupport.faq.money.answer("$10,000")).toBe("No. Simulate runs on $10,000 of paper money so you can practice with zero risk. Nothing is bought or sold for real.");
		// every string of the profile pages' copy: no "practise", no straight apostrophe inside a word
		const strings: string[] = [];
		const walk = (v: unknown): void => {
			if (typeof v === "string") strings.push(v);
			else if (typeof v === "function") strings.push(String((v as (...a: unknown[]) => unknown)("$10,000", 3)));
			else if (v && typeof v === "object") Object.values(v).forEach(walk);
		};
		[profile, editProfile, notificationSettings, helpSupport, tasteRisk].forEach(walk);
		expect(strings.length).toBeGreaterThan(40);
		for (const text of strings) {
			expect(text, text).not.toMatch(/practis/i);
			expect(text, text).not.toMatch(/[A-Za-z]'[A-Za-z]/);
		}
	});
});

describe("Paper investor since (the hub's line 2:2512; N23d / N23s / N30.3b)", () => {
	const at = (y: number, m: number, d: number) => new Date(y, m - 1, d, 9, 41).getTime();

	it("prints the month the account was created in, whatever the clock reads", () => {
		// the frame's own string for the persona's seed day, on the frames' Saturday and four months later
		expect(investorSince(at(2026, 7, 1), FRAME_NOW)).toBe("July 2026");
		expect(investorSince(at(2026, 7, 1), at(2026, 11, 9))).toBe("July 2026");
		expect(investorSince(at(2026, 4, 1), at(2026, 11, 9))).toBe("April 2026");
		expect(investorSince(at(2025, 12, 31), at(2026, 11, 9))).toBe("December 2025");
		// the persona's own seed, wherever the ledger's owner puts its first day: never a literal of this page
		expect(investorSince(seedGuest().createdAt, at(2026, 11, 9))).toBe(new Date(seedGuest().createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" }));
	});

	it("gives a guest created today this month, and an account without a creation day the clock's month (never 'July 2026')", () => {
		const nov9 = at(2026, 11, 9);
		expect(investorSince(nov9, nov9)).toBe("November 2026");
		expect(investorSince(null, nov9)).toBe("November 2026");
		expect(investorSince(undefined, at(2027, 1, 1))).toBe("January 2027");
		expect(investorSince(null, FRAME_NOW)).toBe("July 2026");
	});
});

describe("the quiz's return focus (profile/returnFocus.ts)", () => {
	it("hands the row to Taste & risk once, then forgets it", () => {
		expect(takeReturnFocus()).toBeNull();
		rememberReturnFocus("risk");
		expect(sessionStorage.getItem("stak.profile.focusRow")).toBe("risk");
		expect(takeReturnFocus()).toBe("risk");
		expect(takeReturnFocus()).toBeNull();
		expect(sessionStorage.getItem("stak.profile.focusRow")).toBeNull();
	});

	it("ignores a value that names no row", () => {
		sessionStorage.setItem("stak.profile.focusRow", "elsewhere");
		expect(takeReturnFocus()).toBeNull();
		expect(sessionStorage.getItem("stak.profile.focusRow")).toBeNull();
	});
});
