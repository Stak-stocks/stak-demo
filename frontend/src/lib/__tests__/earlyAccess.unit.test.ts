import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	TEAM_CODE_SHA256,
	WEB_LOCKED,
	applyTeamCode,
	hasSavedWebSession,
	isLockedPath,
	isWebLockedOut,
	takeTeamAccessChange,
	takeTeamCodeFromUrl,
} from "../earlyAccess";

/** Makes SHA-256 of anything come out as the team code's hash, standing in for the real code (which isn't in the repo). */
function digestMatchesTeamCode() {
	const bytes = new Uint8Array(TEAM_CODE_SHA256.match(/../g)!.map((h) => parseInt(h, 16)));
	return vi.spyOn(crypto.subtle, "digest").mockResolvedValue(bytes.buffer);
}

beforeEach(() => {
	localStorage.clear();
	takeTeamAccessChange();
	window.history.replaceState(null, "", "/");
});
afterEach(() => vi.restoreAllMocks());

describe("web lock", () => {
	it("is on (this test flips with WEB_LOCKED when the web reopens)", () => {
		expect(WEB_LOCKED).toBe(true);
	});

	it("leaves only the landing page, Terms and Privacy open", () => {
		expect(isWebLockedOut()).toBe(true);
		for (const open of ["/welcome", "/welcome/", "/terms", "/Privacy"]) expect(isLockedPath(open)).toBe(false);
		for (const closed of ["/", "/login", "/signup", "/forgot-password", "/onboarding", "/stak-ai", "/stock/AAPL", "/profile"]) {
			expect(isLockedPath(closed)).toBe(true);
		}
	});

	it("takes the team code out of the address before anything reads it", () => {
		window.history.replaceState(null, "", "/login?team= guess &x=1#top");
		expect(takeTeamCodeFromUrl()).toBe("guess");
		expect(window.location.pathname + window.location.search + window.location.hash).toBe("/login?x=1#top");
		expect(takeTeamCodeFromUrl()).toBeNull();
	});

	it("a wrong code stays locked and says so", async () => {
		await applyTeamCode("guess");
		expect(isWebLockedOut()).toBe(true);
		expect(takeTeamAccessChange()).toBe("wrong");
	});

	it("the team code unlocks this browser for good, and ?team=off locks it again", async () => {
		digestMatchesTeamCode();
		await applyTeamCode("the-code");
		expect(isWebLockedOut()).toBe(false);
		expect(isLockedPath("/login")).toBe(false);
		expect(takeTeamAccessChange()).toBe("unlocked");
		expect(takeTeamAccessChange()).toBeNull();

		await applyTeamCode("off");
		expect(isWebLockedOut()).toBe(true);
		expect(takeTeamAccessChange()).toBe("relocked");
	});

	it("no team link: nothing is hashed and nothing changes", async () => {
		const digest = vi.spyOn(crypto.subtle, "digest");
		await applyTeamCode(null);
		expect(digest).not.toHaveBeenCalled();
		expect(takeTeamAccessChange()).toBeNull();
	});

	it("spots a web session saved before the lock", () => {
		expect(hasSavedWebSession()).toBe(false);
		localStorage.setItem("sb-abc123-auth-token", "{}");
		expect(hasSavedWebSession()).toBe(true);
	});
});
