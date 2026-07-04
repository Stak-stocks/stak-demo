import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import type { Request, Response, NextFunction } from "express";

const pgQueryMock = vi.fn();
vi.mock("../lib/postgres.js", () => ({
	pgQuery: pgQueryMock,
	ensureUserRow: vi.fn().mockResolvedValue(undefined),
}));

describe("authMiddleware", () => {
	let req: Partial<Request> & { user?: unknown; headers: Record<string, string> };
	let res: { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> };
	let next: ReturnType<typeof vi.fn>;
	const fetchMock = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
		req = { headers: {} };
		const json = vi.fn();
		const status = vi.fn(() => ({ json }));
		res = { status, json } as any;
		next = vi.fn();
		vi.stubGlobal("fetch", fetchMock);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("returns 401 when Authorization header is missing", async () => {
		const { authMiddleware } = await import("../authMiddleware.js");
		await authMiddleware(req as any, res as any, next as NextFunction);

		expect(res.status).toHaveBeenCalledWith(401);
		expect(next).not.toHaveBeenCalled();
	});

	it("returns 401 when header does not start with Bearer", async () => {
		req.headers.authorization = "Basic sometoken";
		const { authMiddleware } = await import("../authMiddleware.js");
		await authMiddleware(req as any, res as any, next as NextFunction);

		expect(res.status).toHaveBeenCalledWith(401);
		expect(next).not.toHaveBeenCalled();
	});

	it("sets req.user and calls next() for a valid Supabase token", async () => {
		req.headers.authorization = "Bearer valid-token";
		fetchMock.mockResolvedValueOnce({
			ok: true,
			json: async () => ({ id: "supabase-123", email: "test@example.com", app_metadata: {} }),
		});
		// auth_identity_map lookup
		pgQueryMock.mockResolvedValueOnce({ rows: [{ firebase_uid: "user-123" }] });
		// onboarding_completed lookup
		pgQueryMock.mockResolvedValueOnce({ rows: [{ onboarding_completed: false }] });

		const { authMiddleware } = await import("../authMiddleware.js");
		await authMiddleware(req as any, res as any, next as NextFunction);

		expect((req as any).user).toEqual({ uid: "user-123", email: "test@example.com", onboardingCompleted: false });
		expect(next).toHaveBeenCalledTimes(1);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("provisions a new user on-demand when no auth_identity_map row exists", async () => {
		req.headers.authorization = "Bearer new-user-token";
		fetchMock.mockResolvedValueOnce({
			ok: true,
			json: async () => ({ id: "new-supabase-uuid", email: "new@example.com", app_metadata: { provider: "email" } }),
		});
		// auth_identity_map lookup → no row (new user)
		pgQueryMock.mockResolvedValueOnce({ rows: [] });
		// insert into users → no-op result
		pgQueryMock.mockResolvedValueOnce({ rows: [] });
		// insert into auth_identity_map → no-op result
		pgQueryMock.mockResolvedValueOnce({ rows: [] });
		// onboarding_completed lookup
		pgQueryMock.mockResolvedValueOnce({ rows: [{ onboarding_completed: false }] });

		const { authMiddleware } = await import("../authMiddleware.js");
		await authMiddleware(req as any, res as any, next as NextFunction);

		expect((req as any).user).toEqual({ uid: "new-supabase-uuid", email: "new@example.com", onboardingCompleted: false });
		expect(next).toHaveBeenCalledTimes(1);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("returns 401 when Supabase token verification fails", async () => {
		req.headers.authorization = "Bearer bad-token";
		fetchMock.mockResolvedValueOnce({ ok: false });

		const { authMiddleware } = await import("../authMiddleware.js");
		await authMiddleware(req as any, res as any, next as NextFunction);

		expect(res.status).toHaveBeenCalledWith(401);
		expect(next).not.toHaveBeenCalled();
	});
});
