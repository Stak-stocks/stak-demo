import {
	createContext,
	useContext,
	useEffect,
	useRef,
	useState,
	type ReactNode,
} from "react";
import {
	onAuthStateChanged,
	signInWithPopup,
	getAdditionalUserInfo,
	signInWithEmailAndPassword,
	createUserWithEmailAndPassword,
	sendPasswordResetEmail,
	verifyPasswordResetCode,
	confirmPasswordReset,
	signOut,
	type User,
} from "firebase/auth";
import { auth, googleProvider } from "../lib/firebase";
import { getProfile, getStak, getPassedBrands, saveStak, savePassedBrands, getDailySwipeCount, getDeckOrder } from "../lib/api";
import { brands as allBrands } from "../data/brands";

interface AuthContextType {
	user: User | null;
	loading: boolean;
	signInWithGoogle: () => Promise<{ isNew: boolean; uid: string }>;
	signInWithEmail: (email: string, password: string) => Promise<void>;
	signUpWithEmail: (email: string, password: string) => Promise<void>;
	resetPassword: (email: string) => Promise<void>;
	verifyResetCode: (code: string) => Promise<string>;
	confirmReset: (code: string, newPassword: string) => Promise<void>;
	logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const INACTIVITY_MS = 30 * 60 * 1000; // 30 minutes

export function AuthProvider({ children }: { children: ReactNode }) {
	const [user, setUser] = useState<User | null>(null);
	const [loading, setLoading] = useState(true);
	const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

	// Auto-logout after 30 minutes of inactivity
	useEffect(() => {
		if (!user) return;

		function resetTimer() {
			if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
			inactivityTimer.current = setTimeout(() => {
				signOut(auth).catch(() => {});
			}, INACTIVITY_MS);
		}

		const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"];
		events.forEach((e) => window.addEventListener(e, resetTimer, { passive: true }));
		resetTimer(); // start the clock immediately on login

		return () => {
			events.forEach((e) => window.removeEventListener(e, resetTimer));
			if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
		};
	}, [user]);

	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
			if (firebaseUser) {
				const lastUid = localStorage.getItem("last-user-uid");
				if (lastUid && lastUid !== firebaseUser.uid) {
					// Different user — wipe all previous user's local data
					localStorage.removeItem("daily-swipe-state");
					localStorage.removeItem("my-stak");
					localStorage.removeItem("passed-brands");
					localStorage.removeItem("user-interests");
					localStorage.removeItem("stak-streak");
					localStorage.removeItem("swipes-since-intel");
					localStorage.removeItem("intel-card-queue");
					localStorage.removeItem("intel-card-last-date");
					// Remove rather than pre-set "false": getProfile() below will set the
					// correct value. If that fetch fails, the absent key means __root.tsx
					// won't redirect to onboarding — much safer than a wrong "false".
					localStorage.removeItem("onboardingCompleted");
				}
				localStorage.setItem("last-user-uid", firebaseUser.uid);
			}

			setUser(firebaseUser);
			if (firebaseUser) {
				// Fetch profile + stak + passed brands in parallel, ALL before setLoading(false),
				// so every piece of account data is in localStorage when components first mount.
				// This ensures cross-device sync works and navigation decisions are always correct.
				const [profileResult, stakResult, passedResult, swipeResult, deckResult] = await Promise.allSettled([
					getProfile(),
					getStak(),
					getPassedBrands(),
					getDailySwipeCount(),
					getDeckOrder(),
				]);

				if (profileResult.status === "fulfilled") {
					const profile = profileResult.value;
					if (profile.onboardingCompleted !== undefined) {
						localStorage.setItem(
							"onboardingCompleted",
							profile.onboardingCompleted ? "true" : "false",
						);
					}
					if (profile.preferences?.interests) {
						localStorage.setItem(
							"user-interests",
							JSON.stringify(profile.preferences.interests),
						);
					} else {
						localStorage.removeItem("user-interests");
					}
				}
				// If profile fetch fails: onboardingCompleted key is absent →
				// __root.tsx doesn't redirect to onboarding (safe default for network errors)

				if (stakResult.status === "fulfilled") {
					const { brandIds } = stakResult.value;
					if (brandIds.length > 0) {
						// Firestore has data — write to localStorage (cross-device sync)
						const stakBrands = brandIds
							.map((id) => allBrands.find((b) => b.id === id))
							.filter(Boolean);
						localStorage.setItem("my-stak", JSON.stringify(stakBrands));
					} else {
						// Firestore is empty — if localStorage has data, back-sync it up
						const local = localStorage.getItem("my-stak");
						const localBrands: { id: string }[] = local ? JSON.parse(local) : [];
						if (localBrands.length > 0) {
							saveStak(localBrands.map((b) => b.id)).catch(() => {});
						}
					}
					// No stak-updated dispatch needed — data is already in localStorage
					// before setLoading(false), so components mount with correct data
				}

				if (passedResult.status === "fulfilled") {
					const { entries } = passedResult.value;
					if (entries.length > 0) {
						// Firestore has data — write to localStorage
						localStorage.setItem("passed-brands", JSON.stringify(entries));
					} else {
						// Firestore is empty — back-sync localStorage if it has data
						const local = localStorage.getItem("passed-brands");
						const localEntries: { id: string; at: number }[] = local ? JSON.parse(local) : [];
						if (localEntries.length > 0) {
							savePassedBrands(localEntries).catch(() => {});
						}
					}
				}

				// Sync Firestore daily swipe count to user-specific localStorage key.
				// No date comparison here — getDailySwipeState() on this device validates
				// dates using its own 9AM reset-hour logic, avoiding timezone mismatches.
				if (swipeResult.status === "fulfilled") {
					const { date, count } = swipeResult.value;
					if (date && count > 0) {
						// Firestore has swipes — write to local so this device respects the count
						const key = "daily-swipe-state:" + firebaseUser.uid;
						const local = localStorage.getItem(key);
						const localState = local ? JSON.parse(local) : { count: 0, date: "" };
						// Take whichever is higher for the same date; always update on new date
						if (localState.date !== date || count > localState.count) {
							localStorage.setItem(key, JSON.stringify({ date, count }));
						}
					}
				}

				// Sync Firestore deck order to user-specific localStorage key
				if (deckResult.status === "fulfilled") {
					const { order } = deckResult.value;
					if (order.length > 0) {
						localStorage.setItem("stak-deck-order:" + firebaseUser.uid, JSON.stringify(order));
					}
				}

				setLoading(false);
			} else {
				setLoading(false);
			}
		});
		return unsubscribe;
	}, []);

	async function signInWithGoogle(): Promise<{ isNew: boolean; uid: string }> {
		const result = await signInWithPopup(auth, googleProvider);
		const isNew = getAdditionalUserInfo(result)?.isNewUser ?? false;
		return { isNew, uid: result.user.uid };
	}

	async function signInWithEmail(email: string, password: string) {
		await signInWithEmailAndPassword(auth, email, password);
	}

	async function signUpWithEmail(email: string, password: string) {
		await createUserWithEmailAndPassword(auth, email, password);
	}

	async function resetPassword(email: string) {
		const baseUrl = import.meta.env.DEV
			? "http://localhost:3000"
			: "https://stak-demo-goodluck-badewoles-projects.vercel.app";
		await sendPasswordResetEmail(auth, email, {
			url: `${baseUrl}/reset-password`,
			handleCodeInApp: true,
		});
	}

	async function verifyResetCode(code: string) {
		return await verifyPasswordResetCode(auth, code);
	}

	async function confirmReset(code: string, newPassword: string) {
		await confirmPasswordReset(auth, code, newPassword);
	}

	async function logout() {
		localStorage.removeItem("swipes-since-intel");
		await signOut(auth);
	}

	return (
		<AuthContext.Provider
			value={{ user, loading, signInWithGoogle, signInWithEmail, signUpWithEmail, resetPassword, verifyResetCode, confirmReset, logout }}
		>
			{children}
		</AuthContext.Provider>
	);
}

export function useAuth() {
	const context = useContext(AuthContext);
	if (!context) {
		throw new Error("useAuth must be used within an AuthProvider");
	}
	return context;
}
