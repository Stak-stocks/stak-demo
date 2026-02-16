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
import { getProfile, getStak } from "../lib/api";
import { brands as allBrands } from "../data/brands";

interface AuthContextType {
	user: User | null;
	loading: boolean;
	signInWithGoogle: () => Promise<boolean>;
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
				} catch {
					// Profile fetch failed — continue with whatever localStorage has
				}
				setLoading(false);

				// Stak hydration can stay fire-and-forget
				getStak()
					.then(({ brandIds }) => {
						if (brandIds.length > 0) {
							const stakBrands = brandIds
								.map((id) => allBrands.find((b) => b.id === id))
								.filter(Boolean);
							localStorage.setItem("my-stak", JSON.stringify(stakBrands));
						}
					})
					.catch(() => {});
			} else {
				setLoading(false);
			}
		});
		return unsubscribe;
	}, []);

	async function signInWithGoogle(): Promise<boolean> {
		const result = await signInWithPopup(auth, googleProvider);
		const isNew = getAdditionalUserInfo(result)?.isNewUser ?? false;
		return isNew;
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
			url: `${baseUrl}/login`,
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
