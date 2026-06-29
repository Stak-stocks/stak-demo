import {
	createContext,
	useContext,
	useEffect,
	useRef,
	useState,
	type ReactNode,
} from "react";
import { logEvent } from "@/lib/firebase";
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
import { supabase } from "../lib/supabase";

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
	// Additive Supabase sign-in, internal cohort only for now (migration plan, Phase 5).
	// Deliberately separate from the Firebase methods above rather than unifying `user`
	// into a common shape -- see the plan's note on this for why, and the explicit
	// commitment to do the unification in Phase 6/7 instead of skipping it.
	signInWithEmailSupabase: (email: string, password: string) => Promise<void>;
	signInWithGoogleSupabase: () => Promise<void>;
	// Minimal session presence, NOT a unified user object (see note above) -- just
	// enough for consumers like login.tsx to know "someone is now signed in via
	// Supabase" and react (e.g. navigate), the same way they already react to `user`.
	supabaseUserId: string | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

const INACTIVITY_MS = 30 * 60 * 1000; // 30 minutes

export function AuthProvider({ children }: { children: ReactNode }) {
	const [user, setUser] = useState<User | null>(null);
	const [loading, setLoading] = useState(true);
	const [supabaseUserId, setSupabaseUserId] = useState<string | null>(null);
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

	// Mirrors the Firebase listener above, additively -- internal cohort only for now.
	// Doesn't touch `loading`/`onboardingCompleted` (Firebase-keyed today); consumers
	// that need to react to a Supabase sign-in check supabaseUserId directly, the same
	// narrow approach as the rest of this Phase 5 work.
	useEffect(() => {
		supabase.auth.getSession().then(({ data }) => setSupabaseUserId(data.session?.user.id ?? null));
		const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
			setSupabaseUserId(session?.user.id ?? null);
		});
		return () => listener.subscription.unsubscribe();
	}, []);

	async function signInWithGoogle(): Promise<{ isNew: boolean; uid: string }> {
		const result = await signInWithPopup(auth, googleProvider);
		const isNew = getAdditionalUserInfo(result)?.isNewUser ?? false;
		if (isNew) logEvent("sign_up", { method: "google" });
		else logEvent("login", { method: "google" });
		return { isNew, uid: result.user.uid };
	}

	async function signInWithEmail(email: string, password: string) {
		await signInWithEmailAndPassword(auth, email, password);
		logEvent("login", { method: "email" });
	}

	async function signUpWithEmail(email: string, password: string) {
		await createUserWithEmailAndPassword(auth, email, password);
		logEvent("sign_up", { method: "email" });
	}

	// Additive Supabase paths, internal cohort only -- callers check getAuthProvider()
	// first and only call these for emails already migrated. Errors propagate to the
	// caller the same way the Firebase methods above do, not swallowed here.
	async function signInWithEmailSupabase(email: string, password: string) {
		const { error } = await supabase.auth.signInWithPassword({ email, password });
		if (error) throw error;
		logEvent("login", { method: "email", provider: "supabase" });
	}

	async function signInWithGoogleSupabase() {
		const { error } = await supabase.auth.signInWithOAuth({ provider: "google" });
		if (error) throw error;
		// signInWithOAuth redirects the browser away immediately on success -- there's
		// no result to log here the way the Firebase popup flow has; logEvent fires
		// after redirect-back instead, same place onAuthStateChanged would need wiring
		// for the Supabase session once this is no longer cohort-only.
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
		// Sign out of both -- harmless no-op for whichever provider isn't actually
		// active, and ensures neither session lingers regardless of which one signed
		// the user in.
		await Promise.all([signOut(auth), supabase.auth.signOut()]);
	}

	return (
		<AuthContext.Provider
			value={{
				user, loading, onboardingCompleted, refreshClaims, signInWithGoogle, signInWithEmail,
				signUpWithEmail, sendVerificationEmail, resetPassword, verifyResetCode, confirmReset, logout,
				signInWithEmailSupabase, signInWithGoogleSupabase, supabaseUserId,
			}}
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
