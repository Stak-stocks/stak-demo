import {
	createContext,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
	type ReactNode,
} from "react";
import { supabase } from "../lib/supabase";

export interface AppUser {
	uid: string;
	email: string | null;
	emailVerified: boolean;
	displayName: string | null;
	photoURL: string | null;
	provider: string;
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
}

const AuthContext = createContext<AuthContextType | null>(null);

const INACTIVITY_MS = 30 * 60 * 1000;

export function AuthProvider({ children }: { children: ReactNode }) {
	const [supabaseUserId, setSupabaseUserId] = useState<string | null>(null);
	const [canonicalUid, setCanonicalUid] = useState<string | null>(null);
	const [supabaseSessionData, setSupabaseSessionData] = useState<{
		email: string | null; emailVerified: boolean; displayName: string | null;
		photoURL: string | null; provider: string;
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
		const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
			setSupabaseUserId(session?.user.id ?? null);
			if (!session && sessionChecked.current) setLoading(false);
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
		const { error } = await supabase.auth.signUp({ email, password });
		if (error) throw error;
	}

	async function signInWithEmailSupabase(email: string, password: string) {
		const { error } = await supabase.auth.signInWithPassword({ email, password });
		if (error) throw error;
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
	}

	async function resetPasswordSupabase(email: string) {
		// No redirectTo — the email template uses {{ .TokenHash }} to point directly
		// to /reset-password, so redirectTo is not needed.
		const { error } = await supabase.auth.resetPasswordForEmail(email);
		if (error) throw error;
	}

	async function confirmResetSupabase(newPassword: string) {
		const { error } = await supabase.auth.updateUser({ password: newPassword });
		if (error) throw error;
	}

	async function logout() {
		localStorage.removeItem("onboardingCompleted");
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
