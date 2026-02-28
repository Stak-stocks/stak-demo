import {
	createContext,
	useContext,
	useEffect,
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
import { getProfile, getStak, getPassedBrands } from "../lib/api";
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

export function AuthProvider({ children }: { children: ReactNode }) {
	const [user, setUser] = useState<User | null>(null);
	const [loading, setLoading] = useState(true);

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
				const [profileResult, stakResult, passedResult] = await Promise.allSettled([
					getProfile(),
					getStak(),
					getPassedBrands(),
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
					const stakBrands = brandIds
						.map((id) => allBrands.find((b) => b.id === id))
						.filter(Boolean);
					localStorage.setItem("my-stak", JSON.stringify(stakBrands));
					window.dispatchEvent(new Event("stak-updated"));
				}

				if (passedResult.status === "fulfilled") {
					const { entries } = passedResult.value;
					localStorage.setItem("passed-brands", JSON.stringify(entries));
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
