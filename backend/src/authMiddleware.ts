import type { Request, Response, NextFunction } from "express";
import { adminAuth } from "./firebaseAdmin.js";

export interface AuthenticatedRequest extends Request {
	user?: {
		uid: string;
		email?: string;
		onboardingCompleted?: boolean;
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

	// Accounts created on or after this date must have email verified.
	// Accounts created before this date (existing users) get a grace period.
	const VERIFICATION_REQUIRED_SINCE = new Date("2026-03-11T00:00:00Z").getTime();

	try {
		const decoded = await adminAuth.verifyIdToken(token);

		// Block unverified email/password accounts created after the feature was deployed
		const isPasswordProvider = decoded.firebase?.sign_in_provider === "password";
		if (isPasswordProvider && !decoded.email_verified) {
			const userRecord = await adminAuth.getUser(decoded.uid);
			const createdAt = new Date(userRecord.metadata.creationTime).getTime();
			if (createdAt >= VERIFICATION_REQUIRED_SINCE) {
				res.status(403).json({ error: "Email not verified", code: "email_not_verified" });
				return;
			}
		}

		req.user = {
			uid: decoded.uid,
			email: decoded.email,
			onboardingCompleted: decoded.onboardingCompleted === true,
		};
		next();
	} catch {
		res.status(401).json({ error: "Invalid or expired token" });
	}
}
