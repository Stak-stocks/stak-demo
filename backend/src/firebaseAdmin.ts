import admin from "firebase-admin";
import dotenv from "dotenv";

dotenv.config();

if (!admin.apps.length) {
	admin.initializeApp({
		credential: admin.credential.applicationDefault(),
	});
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
