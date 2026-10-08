import {
	createContext,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
	type ReactNode,
} from "react";
import { WEB_GOOGLE_SIGN_IN_KEY } from "../lib/earlyAccess";
import { supabase } from "../lib/supabase";
import { disableWebPush } from "../lib/webPush";

export interface AppUser {
	uid: string;
	email: string | null;
	emailVerified: boolean;
	displayName: string | null;
	photoURL: string | null;
	provider: string;
	/** When the sign-in account was created (Supabase auth), for telling a brand-new account from an existing one. */
	createdAt: string | null;
}

interface AuthContextType {
	appUser: AppUser | null;
	loading: boolean;
	supabaseUserId: string | null;
	logout: () => Promise<void>;
	signUpWithEmail: (email: string, password: string) => Promise<void>;
	signInWithEmailSupabase: (email: string, password: string) => Promise<void>;
	signInWithGoogleSupabase: () => Promise<void>;
	resetPasswordSupabase: (email: string) => Promise<void>;
	confirmResetSupabase: (newPassword: string) => Promise<void>;
	verifySignupOtp: (email: string, code: string) => Promise<void>;
	resendSignupOtp: (email: string) => Promise<void>;
	verifyRecoveryOtp: (email: string, code: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const INACTIVITY_MS = 30 * 60 * 1000;

export function AuthProvider({ children }: { children: ReactNode }) {
	const [supabaseUserId, setSupabaseUserId] = useState<string | null>(null);
	const [canonicalUid, setCanonicalUid] = useState<string | null>(null);
	const [supabaseSessionData, setSupabaseSessionData] = useState<{
		email: string | null; emailVerified: boolean; displayName: string | null;
		photoURL: string | null; provider: string; createdAt: string | null;
	} | null>(null);
	// loading stays true until we know whether a session exists AND (if it does)
	// until the canonical UID lookup completes. The sessionChecked ref prevents
	// the second effect from setting loading=false prematurely on the initial
	// null supabaseUserId state before getSession() has resolved.
	const [loading, setLoading] = useState(true);
	const sessionChecked = useRef(false);
	const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		supabase.auth.getSession().then(({ data }) => {
			sessionChecked.current = true;
			const uid = data.session?.user.id ?? null;
			setSupabaseUserId(uid);
			if (!uid) setLoading(false);
		});
		const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
			setSupabaseUserId(session?.user.id ?? null);
			if (!session && sessionChecked.current) setLoading(false);
			// Refresh displayName/photoURL immediately when the user updates their profile
			// (e.g. name edit in personal-details). Without this, appUser.displayName stays
			// stale until next login because the second effect only runs on supabaseUserId change.
			if (event === "USER_UPDATED" && session) {
				const meta = session.user.user_metadata ?? {};
				setSupabaseSessionData({
					email: session.user.email ?? null,
					emailVerified: !!session.user.email_confirmed_at,
					displayName: (meta.full_name ?? meta.name ?? null) as string | null,
					photoURL: (meta.avatar_url ?? meta.picture ?? null) as string | null,
					provider: session.user.app_metadata?.provider === "google" ? "google.com" : "password",
					createdAt: session.user.created_at ?? null,
				});
			}
		});
		return () => listener.subscription.unsubscribe();
	}, []);

	useEffect(() => {
		// Skip the initial render where supabaseUserId is null because getSession()
		// hasn't resolved yet — prevents briefly setting loading=false and flashing
		// the logged-out state on page load.
		if (!sessionChecked.current && supabaseUserId === null) return;
		if (!supabaseUserId) {
			setCanonicalUid(null);
			setSupabaseSessionData(null);
			setLoading(false);
			return;
		}
		setLoading(true);
		Promise.all([
			supabase.rpc("current_firebase_uid"),
			supabase.auth.getSession(),
		]).then(([uidResult, sessionResult]) => {
			// current_firebase_uid() is null for brand-new Supabase-only users whose
			// auth_identity_map row hasn't been created yet (first backend request
			// triggers on-demand provisioning). Fall back to the Supabase UUID, which
			// is exactly what authMiddleware uses as the canonical uid for them.
			setCanonicalUid((uidResult.data as string | null) ?? supabaseUserId);
			const session = sessionResult.data.session;
			if (session) {
				const meta = session.user.user_metadata ?? {};
				setSupabaseSessionData({
					email: session.user.email ?? null,
					emailVerified: !!session.user.email_confirmed_at,
					displayName: (meta.full_name ?? meta.name ?? null) as string | null,
					photoURL: (meta.avatar_url ?? meta.picture ?? null) as string | null,
					provider: session.user.app_metadata?.provider === "google" ? "google.com" : "password",
					createdAt: session.user.created_at ?? null,
				});
			}
		}).finally(() => setLoading(false));
	}, [supabaseUserId]);

	// Inactivity auto-logout: 30 minutes of no user activity signs the session out.
	useEffect(() => {
		if (!supabaseUserId) return;

		function resetTimer() {
			if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
			inactivityTimer.current = setTimeout(() => {
				supabase.auth.signOut().catch(() => {});
			}, INACTIVITY_MS);
		}

		const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"];
		events.forEach((e) => window.addEventListener(e, resetTimer, { passive: true }));
		resetTimer();

		return () => {
			events.forEach((e) => window.removeEventListener(e, resetTimer));
			if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
		};
	}, [supabaseUserId]);

	async function signUpWithEmail(email: string, password: string) {
		const { data, error } = await supabase.auth.signUp({ email, password });
		if (error) throw error;
		// For an already-confirmed address Supabase answers success with an empty identities
		// list (so signup can't be used to probe which emails exist) - and sends no code. Treat
		// it as the duplicate it is, or the user waits on an email that never comes.
		if (data.user && (data.user.identities?.length ?? 0) === 0) {
			throw new Error("User already registered");
		}
	}

	async function signInWithEmailSupabase(email: string, password: string) {
		const { error } = await supabase.auth.signInWithPassword({ email, password });
		if (error) throw error;
	}

	async function signInWithGoogleSupabase() {
		// Early access: lets the root route tell an account this tab's Google sign-in just made from any other.
		try { sessionStorage.setItem(WEB_GOOGLE_SIGN_IN_KEY, "1"); } catch { /* no storage: never removed, only signed out */ }
		const { error } = await supabase.auth.signInWithOAuth({
			provider: "google",
			options: {
				// Without redirectTo, Supabase falls back to the dashboard Site URL, which
				// may not match the current origin (breaks on dev vs prod or staging deploys).
				redirectTo: window.location.origin,
			},
		});
		if (error) throw error;
	}

	async function resetPasswordSupabase(email: string) {
		// No redirectTo — the recovery email template emits {{ .Token }} (a code
		// the user types into forgot-password.tsx's Step 2 via verifyRecoveryOtp),
		// not a clickable link, so there's no browser redirect to configure.
		const { error } = await supabase.auth.resetPasswordForEmail(email);
		if (error) throw error;
	}

	async function confirmResetSupabase(newPassword: string) {
		const { error } = await supabase.auth.updateUser({ password: newPassword });
		if (error) throw error;
	}

	// In-app numeric-code verification (matches Android's flow — no email
	// links at all). Requires the Supabase Auth email templates for "Confirm
	// signup" and "Reset password" to emit {{ .Token }} (a code) rather than
	// a confirmation link, or these have nothing to verify against.
	async function verifySignupOtp(email: string, code: string) {
		const { error } = await supabase.auth.verifyOtp({ email, token: code, type: "signup" });
		if (error) throw error;
	}

	async function resendSignupOtp(email: string) {
		const { error } = await supabase.auth.resend({ type: "signup", email });
		if (error) throw error;
	}

	async function verifyRecoveryOtp(email: string, code: string) {
		const { error } = await supabase.auth.verifyOtp({ email, token: code, type: "recovery" });
		if (error) throw error;
	}

	async function logout() {
		// Another person signing in on this browser must not receive this account's alerts.
		await disableWebPush().catch(() => {});
		await supabase.auth.signOut();
	}

	const appUser = useMemo<AppUser | null>(() => {
		if (supabaseUserId && canonicalUid && supabaseSessionData) {
			return { uid: canonicalUid, ...supabaseSessionData };
		}
		return null;
	}, [supabaseUserId, canonicalUid, supabaseSessionData]);

	return (
		<AuthContext.Provider
			value={{
				appUser,
				loading,
				supabaseUserId,
				logout,
				signUpWithEmail,
				signInWithEmailSupabase,
				signInWithGoogleSupabase,
				resetPasswordSupabase,
				confirmResetSupabase,
				verifySignupOtp,
				resendSignupOtp,
				verifyRecoveryOtp,
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
