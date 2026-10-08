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
		// onboarding_completed + eligibility lookup
		pgQueryMock.mockResolvedValueOnce({ rows: [{ onboarding_completed: false, eligible: true }] });

		const { authMiddleware } = await import("../authMiddleware.js");
		await authMiddleware(req as any, res as any, next as NextFunction);

		expect((req as any).user).toEqual({ uid: "user-123", email: "test@example.com", onboardingCompleted: false, eligible: true });
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
		// onboarding_completed + eligibility lookup: a brand-new account hasn't confirmed yet
		pgQueryMock.mockResolvedValueOnce({ rows: [{ onboarding_completed: false, eligible: false }] });
		// It may still read its own account (which tells the app to ask).
		Object.assign(req, { method: "GET", baseUrl: "/api/me", path: "/" });

		const { authMiddleware } = await import("../authMiddleware.js");
		await authMiddleware(req as any, res as any, next as NextFunction);

		expect((req as any).user).toEqual({ uid: "new-supabase-uuid", email: "new@example.com", onboardingCompleted: false, eligible: false });
		expect(next).toHaveBeenCalledTimes(1);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("refuses an unconfirmed new account anything but reading its account, confirming and leaving", async () => {
		req.headers.authorization = "Bearer unconfirmed-token";
		fetchMock.mockResolvedValueOnce({
			ok: true,
			json: async () => ({ id: "supabase-new", email: "kid@example.com", app_metadata: {} }),
		});
		pgQueryMock.mockResolvedValueOnce({ rows: [{ firebase_uid: "uid-new" }] });
		pgQueryMock.mockResolvedValueOnce({ rows: [{ onboarding_completed: false, eligible: false }] });
		Object.assign(req, { method: "POST", baseUrl: "/api/swipe", path: "/" });

		const { authMiddleware } = await import("../authMiddleware.js");
		await authMiddleware(req as any, res as any, next as NextFunction);

		expect(res.status).toHaveBeenCalledWith(403);
		expect(next).not.toHaveBeenCalled();

		// Not remembered while unconfirmed: the next request reads the account again (a confirmation on another
		// instance takes effect at once).
		fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ id: "supabase-new", email: "kid@example.com", app_metadata: {} }) });
		pgQueryMock.mockResolvedValueOnce({ rows: [{ firebase_uid: "uid-new" }] });
		pgQueryMock.mockResolvedValueOnce({ rows: [{ onboarding_completed: false, eligible: true }] });
		const next2 = vi.fn();
		await authMiddleware(req as any, res as any, next2 as NextFunction);
		expect(next2).toHaveBeenCalledTimes(1);
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
