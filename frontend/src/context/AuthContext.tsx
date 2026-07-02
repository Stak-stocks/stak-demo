import {
	createContext,
	useContext,
	useEffect,
	useMemo,
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

/**
 * Unified user shape exposed to all consumers (migration plan, Phase 6/7:
 * tingly-conjuring-lake.md). uid is the canonical Firebase UID for both session
 * types -- the bridge that keeps all Postgres tables, analytics, and downstream
 * logic consistent regardless of which provider authenticated the user.
 */
export interface AppUser {
	uid: string;
	email: string | null;
	emailVerified: boolean;
	displayName: string | null;
	photoURL: string | null;
	provider: string;            // 'password' or 'google.com' (original Firebase provider)
	sessionType: "firebase" | "supabase";
}

interface AuthContextType {
	// appUser is the canonical, provider-agnostic user shape -- prefer this over
	// `user` and `supabaseUserId` in all new consumers.
	appUser: AppUser | null;
	// loading: true until both Firebase and (if active) Supabase sessions have
	// resolved, including the canonical UID lookup for Supabase sessions.
	loading: boolean;
	onboardingCompleted: boolean;
	refreshClaims: () => Promise<void>;
	// raw Firebase User -- still needed by Firebase-specific pages (profile editing,
	// email verification) and AccountContext's Firestore write path. Will be removed
	// in Phase 7 once Firebase is fully decommissioned.
	user: User | null;
	// raw Supabase UUID -- still used by AccountContext's Realtime subscription and
	// by profile_.security/personal-details guards. Will collapse into appUser in
	// Phase 7.
	supabaseUserId: string | null;
	signInWithGoogle: () => Promise<{ isNew: boolean; uid: string }>;
	signInWithEmail: (email: string, password: string) => Promise<void>;
	signUpWithEmail: (email: string, password: string) => Promise<void>;
	sendVerificationEmail: () => Promise<void>;
	resetPassword: (email: string) => Promise<void>;
	verifyResetCode: (code: string) => Promise<string>;
	confirmReset: (code: string, newPassword: string) => Promise<void>;
	logout: () => Promise<void>;
	signInWithEmailSupabase: (email: string, password: string) => Promise<void>;
	signInWithGoogleSupabase: () => Promise<void>;
	resetPasswordSupabase: (email: string) => Promise<void>;
	confirmResetSupabase: (newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const INACTIVITY_MS = 30 * 60 * 1000; // 30 minutes

export function AuthProvider({ children }: { children: ReactNode }) {
	const [user, setUser] = useState<User | null>(null);
	const [loading, setLoading] = useState(true);
	const [supabaseUserId, setSupabaseUserId] = useState<string | null>(null);
	const [onboardingCompleted, setOnboardingCompleted] = useState(false);
	const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

	// Supabase-session-specific state, resolved asynchronously once per sign-in.
	// canonicalUid is the Firebase UID corresponding to the Supabase session -- needed
	// to fill appUser.uid, which must be the same uid Postgres tables key on.
	const [canonicalUid, setCanonicalUid] = useState<string | null>(null);
	const [supabaseSessionData, setSupabaseSessionData] = useState<{
		email: string | null; emailVerified: boolean; displayName: string | null;
		photoURL: string | null; provider: string;
	} | null>(null);
	// Start true so the combined `loading || supabaseUidLoading` guard never briefly
	// sees both false before the initial getSession() resolves. Set false once either
	// there's no Supabase session (getSession returned null) or the UID is resolved.
	const [supabaseUidLoading, setSupabaseUidLoading] = useState(true);

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

	useEffect(() => {
		// getSession() resolves supabaseUidLoading: the initial getSession call determines
		// whether there is a Supabase session at all. If there isn't, supabaseUidLoading
		// goes false here so the app doesn't spin forever for pure Firebase users.
		supabase.auth.getSession().then(({ data }) => {
			const uid = data.session?.user.id ?? null;
			setSupabaseUserId(uid);
			if (!uid) setSupabaseUidLoading(false);
		});
		const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
			setSupabaseUserId(session?.user.id ?? null);
			if (!session) setSupabaseUidLoading(false);
		});
		return () => listener.subscription.unsubscribe();
	}, []);

	// When a Supabase session exists, resolve the canonical Firebase UID and session
	// metadata needed to build appUser. One round-trip per sign-in, not per render.
	useEffect(() => {
		if (!supabaseUserId) {
			setCanonicalUid(null);
			setSupabaseSessionData(null);
			setSupabaseUidLoading(false);
			return;
		}
		setSupabaseUidLoading(true);
		Promise.all([
			supabase.rpc("current_firebase_uid"),
			supabase.auth.getSession(),
		]).then(([uidResult, sessionResult]) => {
			setCanonicalUid((uidResult.data as string | null));
			const session = sessionResult.data.session;
			if (session) {
				const meta = session.user.user_metadata ?? {};
				setSupabaseSessionData({
					email: session.user.email ?? null,
					emailVerified: !!session.user.email_confirmed_at,
					displayName: (meta.full_name ?? meta.name ?? null) as string | null,
					photoURL: (meta.avatar_url ?? meta.picture ?? null) as string | null,
					provider: session.user.app_metadata?.provider === "google" ? "google.com" : "password",
				});
			}
		}).finally(() => setSupabaseUidLoading(false));
	}, [supabaseUserId]);

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
		const { error } = await supabase.auth.signInWithOAuth({
			provider: "google",
			options: {
				// Without redirectTo, Supabase falls back to the dashboard Site URL, which
				// may not match the current origin (breaks on dev vs prod or staging deploys).
				redirectTo: window.location.origin,
			},
		});
		if (error) throw error;
		// signInWithOAuth redirects the browser away immediately on success -- there's
		// no result to log here the way the Firebase popup flow has; logEvent fires
		// after redirect-back instead.
	}

	async function resetPasswordSupabase(email: string) {
		const { error } = await supabase.auth.resetPasswordForEmail(email, {
			redirectTo: `${window.location.origin}/reset-password`,
		});
		if (error) throw error;
	}

	async function confirmResetSupabase(newPassword: string) {
		const { error } = await supabase.auth.updateUser({ password: newPassword });
		if (error) throw error;
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

	const appUser = useMemo<AppUser | null>(() => {
		if (user) {
			return {
				uid: user.uid,
				email: user.email,
				emailVerified: user.emailVerified,
				displayName: user.displayName,
				photoURL: user.photoURL,
				provider: user.providerData[0]?.providerId ?? "password",
				sessionType: "firebase",
			};
		}
		if (supabaseUserId && canonicalUid && supabaseSessionData) {
			return { uid: canonicalUid, ...supabaseSessionData, sessionType: "supabase" };
		}
		return null;
	}, [user, supabaseUserId, canonicalUid, supabaseSessionData]);

	return (
		<AuthContext.Provider
			value={{
				appUser,
				user, loading: loading || supabaseUidLoading, onboardingCompleted, refreshClaims,
				signInWithGoogle, signInWithEmail,
				signUpWithEmail, sendVerificationEmail, resetPassword, verifyResetCode, confirmReset, logout,
				signInWithEmailSupabase, signInWithGoogleSupabase, supabaseUserId,
				resetPasswordSupabase, confirmResetSupabase,
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
