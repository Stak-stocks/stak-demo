import type { Request, Response, NextFunction } from "express";
import { adminAuth } from "./firebaseAdmin.js";

export interface AuthenticatedRequest extends Request {
	user?: {
		uid: string;
		email?: string;
	};
}

export async function authMiddleware(
	req: AuthenticatedRequest,
	res: Response,
	next: NextFunction,
): Promise<void> {
	const authHeader = req.headers.authorization;

	if (!authHeader?.startsWith("Bearer ")) {
		res.status(401).json({ error: "Missing or invalid authorization header" });
		return;
	}

	const token = authHeader.split("Bearer ")[1];

	try {
		const decoded = await adminAuth.verifyIdToken(token);
		req.user = {
			uid: decoded.uid,
			email: decoded.email,
		};
		next();
	} catch {
		res.status(401).json({ error: "Invalid or expired token" });
	}
}
