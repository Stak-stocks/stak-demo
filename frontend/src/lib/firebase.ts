import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, browserLocalPersistence, setPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, logEvent as firebaseLogEvent, isSupported } from "firebase/analytics";

const firebaseConfig = {
	apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
	authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
	projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
	storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
	messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
	appId: import.meta.env.VITE_FIREBASE_APP_ID,
	measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

// Firebase Analytics — only initialised in environments that support it (not SSR/bots)
const analyticsInstance = isSupported().then((yes) => yes ? getAnalytics(app) : null);

export async function logEvent(eventName: string, params?: Record<string, unknown>) {
	const analytics = await analyticsInstance;
	if (analytics) firebaseLogEvent(analytics, eventName, params);
}
