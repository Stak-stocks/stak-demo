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
					// Different user signed in — wipe all previous user's local data
					// so a fresh account doesn't inherit stale stak/interests/etc.
					localStorage.removeItem("daily-swipe-state");
					localStorage.removeItem("my-stak");
					localStorage.removeItem("passed-brands");
					localStorage.removeItem("user-interests");
					// Default to needing onboarding — profile fetch below will override if they're existing
					localStorage.setItem("onboardingCompleted", "false");
				}
				localStorage.setItem("last-user-uid", firebaseUser.uid);
			}

			setUser(firebaseUser);
			if (firebaseUser) {
				// Fetch profile BEFORE setting loading=false so onboarding
				// status is available for navigation decisions on any device
				try {
					const profile = await getProfile();
					if (profile.onboardingCompleted !== undefined) {
						localStorage.setItem(
							"onboardingCompleted",
							profile.onboardingCompleted ? "true" : "false",
						);
					}
					// Hydrate user interests from backend
					if (profile.preferences?.interests) {
						localStorage.setItem(
							"user-interests",
							JSON.stringify(profile.preferences.interests),
						);
					} else {
						localStorage.removeItem("user-interests");
					}
				} catch {
					// Profile fetch failed — continue with whatever localStorage has
				}
				setLoading(false);

				// Stak hydration — always write so a fresh account starts empty
				getStak()
					.then(({ brandIds }) => {
						const stakBrands = brandIds
							.map((id) => allBrands.find((b) => b.id === id))
							.filter(Boolean);
						localStorage.setItem("my-stak", JSON.stringify(stakBrands));
					})
					.catch(() => {});

				// Passed brands hydration — always write so a fresh account starts empty
				getPassedBrands()
					.then(({ entries }) => {
						localStorage.setItem("passed-brands", JSON.stringify(entries));
					})
					.catch(() => {});
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
