import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";

const verifyIdTokenMock = vi.fn();

vi.mock("../firebaseAdmin.js", () => ({
	adminAuth: { verifyIdToken: verifyIdTokenMock },
}));

describe("authMiddleware", () => {
	let req: Partial<Request> & { user?: unknown; headers: Record<string, string> };
	let res: { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> };
	let next: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.clearAllMocks();
		req = { headers: {} };
		const json = vi.fn();
		const status = vi.fn(() => ({ json }));
		res = { status, json } as any;
		next = vi.fn();
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

	it("sets req.user and calls next() for a valid token", async () => {
		req.headers.authorization = "Bearer valid-token";
		verifyIdTokenMock.mockResolvedValueOnce({ uid: "user-123", email: "test@example.com" });

		const { authMiddleware } = await import("../authMiddleware.js");
		await authMiddleware(req as any, res as any, next as NextFunction);

		expect(verifyIdTokenMock).toHaveBeenCalledWith("valid-token");
		expect((req as any).user).toEqual({ uid: "user-123", email: "test@example.com" });
		expect(next).toHaveBeenCalledTimes(1);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("returns 401 when verifyIdToken throws", async () => {
		req.headers.authorization = "Bearer bad-token";
		verifyIdTokenMock.mockRejectedValueOnce(new Error("Token expired"));

		const { authMiddleware } = await import("../authMiddleware.js");
		await authMiddleware(req as any, res as any, next as NextFunction);

		expect(res.status).toHaveBeenCalledWith(401);
		expect(next).not.toHaveBeenCalled();
	});
});
