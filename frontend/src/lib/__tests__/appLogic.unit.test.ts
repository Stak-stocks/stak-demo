import { beforeEach, describe, expect, it } from "vitest";
import { capitalizeWords } from "../utils";
import { getAppearance, setAppearance } from "../appearance";
import { readRememberedArticle, rememberArticles } from "../openedArticle";
import { confirmError, emailError, friendlyAuthError, passwordError } from "@/components/auth/AuthKit";
import { greetingFor } from "@/components/home/HomeHeader";
import { sourceBriefs } from "@/components/news/NewsParts";
import { heldCountLabel } from "@/components/mystak/CollectionChip";
import type { DailyBriefResponse } from "../api";

describe("capitalizeWords / greetingFor", () => {
	it("title-cases each word and drops blanks", () => expect(capitalizeWords("gOODLUCK   b")).toBe("Goodluck B"));
	it("greets by the hour, like Android", () => {
		expect(greetingFor(5)).toBe("Good Morning");
		expect(greetingFor(11)).toBe("Good Morning");
		expect(greetingFor(12)).toBe("Good Afternoon");
		expect(greetingFor(16)).toBe("Good Afternoon");
		expect(greetingFor(17)).toBe("Good Evening");
		expect(greetingFor(3)).toBe("Good Evening");
	});
});

describe("auth rules", () => {
	it("checks email, password and confirmation with Android's words", () => {
		expect(emailError("")).toBe("Enter your email address");
		expect(emailError("nope")).toBe("That doesn’t look like an email address");
		expect(emailError(" a@b.co ")).toBeNull();
		expect(passwordError("")).toBe("Enter your password");
		expect(passwordError("short")).toBe("Use at least 8 characters");
		expect(passwordError("longenough")).toBeNull();
		expect(confirmError("abc12345", "")).toBe("Confirm your password");
		expect(confirmError("abc12345", "abc12346")).toBe("Passwords don’t match");
	});
	it("turns Supabase failures into plain words", () => {
		expect(friendlyAuthError(new Error("Invalid login credentials"))).toBe("Wrong email or password");
		expect(friendlyAuthError(new Error("User already registered"))).toBe("An account with this email already exists");
		expect(friendlyAuthError(new Error("Token has expired or is invalid"))).toContain("wrong or expired");
		expect(friendlyAuthError(new Error("weird"))).toBe("weird");
		expect(friendlyAuthError(new Error(""))).toBe("Something went wrong. Try again.");
	});
});

describe("appearance and opened articles", () => {
	beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });
	it("remembers the appearance, defaulting to dark", () => {
		expect(getAppearance()).toBe("dark");
		setAppearance("system");
		expect(getAppearance()).toBe("system");
	});
	it("remembers an opened story for the article page", () => {
		const a = { headline: "H", source: "S", url: "https://x/1", image: "", datetime: 1, summary: "", explanation: "", whyItMatters: "", sentiment: "neutral" as const, type: "macro" as const, extra: "dropped" };
		rememberArticles([a as never]);
		expect(readRememberedArticle("https://x/1")?.headline).toBe("H");
		expect((readRememberedArticle("https://x/1") as unknown as { extra?: string }).extra).toBeUndefined();
		expect(readRememberedArticle("https://x/none")).toBeNull();
	});
});

describe("sourceBriefs / heldCountLabel", () => {
	const story = { headline: "Fed holds rates", source: "Wire", url: "u", image: "", datetime: 0, summary: "", explanation: "It held.", whyItMatters: "", sentiment: "neutral" as const, type: "macro" as const };
	it("leads with the AI brief and its personal read, then stories, four cards at most", () => {
		const brief = { moodExplanation: "Calm day", plainEnglish: "Not much moved.", personalizedImpact: "Your NVDA is fine.", dayLabel: "Friday's" } as DailyBriefResponse;
		const out = sourceBriefs(brief, [story, story, story, story]);
		expect(out).toHaveLength(4);
		expect(out[0]).toMatchObject({ title: "Calm day", source: "STAK AI · Friday's Brief" });
		expect(out[1].title).toBe("What this means for you");
	});
	it("falls back to the top stories without a brief, and to nothing without either", () => {
		expect(sourceBriefs(undefined, [story])[0].title).toBe("Fed holds rates");
		expect(sourceBriefs(undefined, [])).toEqual([]);
	});
	it("counts companies", () => {
		expect(heldCountLabel(1)).toBe("1 company");
		expect(heldCountLabel(4)).toBe("4 companies");
	});
});
