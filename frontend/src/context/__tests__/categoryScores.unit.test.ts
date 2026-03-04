import { act, renderHook } from "@testing-library/react";
import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ── Firebase mocks ────────────────────────────────────────────────────────────

const updateDocMock = vi.fn().mockResolvedValue(undefined);
const onSnapshotMock = vi.fn();
const docRefStub = {};

vi.mock("firebase/firestore", () => ({
	doc: vi.fn(() => docRefStub),
	onSnapshot: onSnapshotMock,
	updateDoc: updateDocMock,
}));

vi.mock("@/lib/firebase", () => ({ db: {} }));

vi.mock("@/context/AuthContext", () => ({
	useAuth: vi.fn(),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

async function setupHook(existingScores: Record<string, number> = {}) {
	const { useAuth } = await import("@/context/AuthContext");
	vi.mocked(useAuth).mockReturnValue({ user: { uid: "u1" } } as any);

	// onSnapshot fires the callback immediately with the given account data
	onSnapshotMock.mockImplementation(
		(_ref: unknown, cb: (snap: unknown) => void, _err: unknown) => {
			cb({
				exists: () => true,
				data: () => ({ categoryScores: existingScores }),
			});
			return () => {}; // unsubscribe
		},
	);

	const { AccountProvider } = await import("@/context/AccountContext");
	const { useAccount } = await import("@/context/AccountContext");

	const wrapper = ({ children }: { children: React.ReactNode }) =>
		createElement(AccountProvider, null, children);

	return renderHook(() => useAccount(), { wrapper });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("updateCategoryScores — merging logic", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.resetModules();
	});

	it("writes delta scores when account has no existing scores", async () => {
		const { result } = await setupHook({});

		await act(async () => {
			await result.current.updateCategoryScores({ tech: 2, finance: 1 });
		});

		expect(updateDocMock).toHaveBeenCalledWith(
			docRefStub,
			{ categoryScores: { tech: 2, finance: 1 } },
		);
	});

	it("accumulates delta on top of existing scores", async () => {
		const { result } = await setupHook({ tech: 5, retail: 3 });

		await act(async () => {
			await result.current.updateCategoryScores({ tech: 2, retail: -1 });
		});

		expect(updateDocMock).toHaveBeenCalledWith(
			docRefStub,
			{ categoryScores: { tech: 7, retail: 2 } },
		);
	});

	it("adds a new category without touching existing ones", async () => {
		const { result } = await setupHook({ tech: 4 });

		await act(async () => {
			await result.current.updateCategoryScores({ energy: 3 });
		});

		expect(updateDocMock).toHaveBeenCalledWith(
			docRefStub,
			{ categoryScores: { tech: 4, energy: 3 } },
		);
	});

	it("handles negative deltas that bring a score below zero", async () => {
		const { result } = await setupHook({ tech: 1 });

		await act(async () => {
			await result.current.updateCategoryScores({ tech: -5 });
		});

		expect(updateDocMock).toHaveBeenCalledWith(
			docRefStub,
			{ categoryScores: { tech: -4 } },
		);
	});

	it("is a no-op when there is no logged-in user", async () => {
		const { useAuth } = await import("@/context/AuthContext");
		vi.mocked(useAuth).mockReturnValue({ user: null } as any);

		onSnapshotMock.mockImplementation(
			(_ref: unknown, cb: (snap: unknown) => void, _err: unknown) => {
				// no snapshot — user is null so useEffect returns early
				return () => {};
			},
		);

		const { AccountProvider, useAccount } = await import("@/context/AccountContext");
		const wrapper = ({ children }: { children: React.ReactNode }) =>
			createElement(AccountProvider, null, children);
		const { result } = renderHook(() => useAccount(), { wrapper });

		await act(async () => {
			await result.current.updateCategoryScores({ tech: 10 });
		});

		expect(updateDocMock).not.toHaveBeenCalled();
	});
});
