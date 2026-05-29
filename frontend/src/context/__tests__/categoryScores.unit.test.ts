import { renderHook } from "@testing-library/react";
import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ── Firebase mocks ────────────────────────────────────────────────────────────

const onSnapshotMock = vi.fn();
const docRefStub = {};

vi.mock("firebase/firestore", () => ({
	doc: vi.fn(() => docRefStub),
	onSnapshot: onSnapshotMock,
	updateDoc: vi.fn().mockResolvedValue(undefined),
	runTransaction: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/firebase", () => ({ db: {} }));

vi.mock("@/context/AuthContext", () => ({
	useAuth: vi.fn(),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

async function setupHook(tagScores: Record<string, number> = {}) {
	const { useAuth } = await import("@/context/AuthContext");
	vi.mocked(useAuth).mockReturnValue({ user: { uid: "u1" }, loading: false } as any);

	onSnapshotMock.mockImplementation(
		(_ref: unknown, cb: (snap: unknown) => void, _err: unknown) => {
			cb({
				exists: () => true,
				data: () => ({ tagScores }),
			});
			return () => {};
		},
	);

	const { AccountProvider, useAccount } = await import("@/context/AccountContext");
	const wrapper = ({ children }: { children: React.ReactNode }) =>
		createElement(AccountProvider, null, children);

	return renderHook(() => useAccount(), { wrapper });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("AccountContext — tagScores read from Firestore", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.resetModules();
	});

	it("exposes tagScores from the Firestore snapshot", async () => {
		const { result } = await setupHook({ technology: 15, high_growth: 7.5 });
		expect(result.current.account?.tagScores).toEqual({ technology: 15, high_growth: 7.5 });
	});

	it("defaults tagScores to undefined when not in snapshot", async () => {
		const { result } = await setupHook({});
		expect(result.current.account?.tagScores).toEqual({});
	});
});
