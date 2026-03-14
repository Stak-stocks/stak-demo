import * as admin from "firebase-admin";
import * as functions from "firebase-functions/v1";

admin.initializeApp();

const db = admin.firestore();

/**
 * Automatically delete the Firestore user document whenever a Firebase Auth
 * account is deleted — whether deleted manually from the Console, via the
 * cleanup-unverified job, or any other mechanism.
 */
export const cleanupUserData = functions.auth.user().onDelete(async (user) => {
  const uid = user.uid;
  try {
    await db.collection("users").doc(uid).delete();
    console.log(`[Auth onDelete] Deleted Firestore doc for ${uid} (${user.email ?? "no email"})`);
  } catch (err) {
    console.error(`[Auth onDelete] Failed to delete Firestore doc for ${uid}:`, err);
  }
});
