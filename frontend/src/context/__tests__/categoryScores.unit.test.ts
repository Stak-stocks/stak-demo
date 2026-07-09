import { renderHook } from "@testing-library/react";
import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ── Supabase account subscription mock ───────────────────────────────────────

const subscribeSupabaseAccountMock = vi.fn();

vi.mock("@/lib/supabaseAccount", () => ({
	subscribeSupabaseAccount: subscribeSupabaseAccountMock,
	updateStakSupabase: vi.fn().mockResolvedValue(undefined),
	saveToStakSupabase: vi.fn().mockResolvedValue(undefined),
	updatePassedBrandsSupabase: vi.fn().mockResolvedValue(undefined),
	updateDeckOrderSupabase: vi.fn().mockResolvedValue(undefined),
	updatePreferencesSupabase: vi.fn().mockResolvedValue(undefined),
	updateLastBriefDateSupabase: vi.fn().mockResolvedValue(undefined),
	addSearchHistorySupabase: vi.fn().mockResolvedValue(undefined),
	removeSearchHistoryEntrySupabase: vi.fn().mockResolvedValue(undefined),
	clearSearchHistorySupabase: vi.fn().mockResolvedValue(undefined),
	completeActivitySupabase: vi.fn().mockResolvedValue(undefined),
	addXpSupabase: vi.fn().mockResolvedValue(undefined),
	markPlaygroundOnboardedSupabase: vi.fn().mockResolvedValue(undefined),
	saveGeneratedLessonHistorySupabase: vi.fn().mockResolvedValue(undefined),
	completeDailyActivitySupabase: vi.fn().mockResolvedValue(undefined),
	completeChallengeSupabase: vi.fn().mockResolvedValue(undefined),
	addPracticeSkillXpSupabase: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/api", () => ({
	incrementSwipeCountServer: vi.fn().mockResolvedValue({ accepted: true, count: 1, limit: 10 }),
	sandboxInit: vi.fn().mockResolvedValue({ ok: true }),
	sandboxBuy: vi.fn().mockResolvedValue({ price: 100, shares: 1, costBasis: 100, cost: 100, remainingCash: 900 }),
	sandboxSell: vi.fn().mockResolvedValue({ price: 100, sharesToSell: 1, sellValue: 100, remaining: 0 }),
	sandboxReset: vi.fn().mockResolvedValue({ ok: true, cash: 1000, tier: 1 }),
	sandboxMilestone: vi.fn().mockResolvedValue({ ok: true }),
	sandboxTierUpgrade: vi.fn().mockResolvedValue({ ok: true }),
}));

vi.mock("@/context/AuthContext", () => ({
	useAuth: vi.fn(),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

async function setupHook(tagScores: Record<string, number> = {}) {
	const { useAuth } = await import("@/context/AuthContext");
	vi.mocked(useAuth).mockReturnValue({ supabaseUserId: "u1", loading: false } as any);

	subscribeSupabaseAccountMock.mockImplementation(
		(_uid: string, cb: (account: unknown) => void) => {
			cb({ tagScores, stakBrandIds: [], passedBrands: [] });
			return () => {};
		},
	);

	const { AccountProvider, useAccount } = await import("@/context/AccountContext");
	const wrapper = ({ children }: { children: React.ReactNode }) =>
		createElement(AccountProvider, null, children);

	return renderHook(() => useAccount(), { wrapper });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("AccountContext — tagScores from Supabase account subscription", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.resetModules();
	});

	it("exposes tagScores from the Supabase account snapshot", async () => {
		const { result } = await setupHook({ technology: 15, high_growth: 7.5 });
		expect(result.current.account?.tagScores).toEqual({ technology: 15, high_growth: 7.5 });
	});

	it("defaults tagScores to undefined when not in snapshot", async () => {
		const { result } = await setupHook({});
		expect(result.current.account?.tagScores).toEqual({});
	});
});
