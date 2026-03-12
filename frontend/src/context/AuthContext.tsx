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
	sendEmailVerification,
	sendPasswordResetEmail,
	verifyPasswordResetCode,
	confirmPasswordReset,
	signOut,
	type User,
} from "firebase/auth";
import { auth, googleProvider } from "../lib/firebase";

interface AuthContextType {
	user: User | null;
	loading: boolean;
	onboardingCompleted: boolean;
	refreshClaims: () => Promise<void>;
	signInWithGoogle: () => Promise<{ isNew: boolean; uid: string }>;
	signInWithEmail: (email: string, password: string) => Promise<void>;
	signUpWithEmail: (email: string, password: string) => Promise<void>;
	sendVerificationEmail: () => Promise<void>;
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
	const [onboardingCompleted, setOnboardingCompleted] = useState(false);
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
				// Wipe localStorage if this is a different user logging in
				const lastUid = localStorage.getItem("last-user-uid");
				if (lastUid && lastUid !== firebaseUser.uid) {
					const keys = [
						`daily-swipe-state:${lastUid}`, `stak-deck-order:${lastUid}`,
					];
					keys.forEach((k) => localStorage.removeItem(k));
				}
				localStorage.setItem("last-user-uid", firebaseUser.uid);

				// Read onboardingCompleted from the JWT claim — available instantly,
				// cross-device, no Firestore read needed.
				try {
					const tokenResult = await firebaseUser.getIdTokenResult();
					setOnboardingCompleted(tokenResult.claims.onboardingCompleted === true);
				} catch {
					// Token is invalid — most likely the account was deleted from Firebase
					// Console while a local session was still cached. Sign out cleanly.
					setOnboardingCompleted(false);
					setUser(null);
					setLoading(false);
					await signOut(auth).catch(() => {});
					return;
				}
			} else {
				setOnboardingCompleted(false);
			}
			setUser(firebaseUser);
			setLoading(false);
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

	async function sendVerificationEmail() {
		if (!auth.currentUser) return;
		await sendEmailVerification(auth.currentUser);
	}

	async function resetPassword(email: string) {
		await sendPasswordResetEmail(auth, email, {
			url: `${window.location.origin}/reset-password`,
			handleCodeInApp: true,
		});
	}

	async function verifyResetCode(code: string) {
		return await verifyPasswordResetCode(auth, code);
	}

	async function confirmReset(code: string, newPassword: string) {
		await confirmPasswordReset(auth, code, newPassword);
	}

	async function refreshClaims() {
		if (!auth.currentUser) return;
		const tokenResult = await auth.currentUser.getIdToken(true).then(() =>
			auth.currentUser!.getIdTokenResult(),
		);
		setOnboardingCompleted(tokenResult.claims.onboardingCompleted === true);
	}

	async function logout() {
		localStorage.removeItem("onboardingCompleted");
		await signOut(auth);
	}

	return (
		<AuthContext.Provider
			value={{ user, loading, onboardingCompleted, refreshClaims, signInWithGoogle, signInWithEmail, signUpWithEmail, sendVerificationEmail, resetPassword, verifyResetCode, confirmReset, logout }}
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
