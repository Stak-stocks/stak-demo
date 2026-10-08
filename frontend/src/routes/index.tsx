import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";

export const Route = createFileRoute("/")({
	component: IndexRedirect,
});

/**
 * "/" used to be the old mobile swipe deck; the desktop rebuild moved the deck to /discover and
 * the app's front door is /home (Figma 02 Home). Signed-in users go there, everyone else to the landing page.
 */
function IndexRedirect() {
	const { user, loading } = useAuth();
	const navigate = useNavigate();
	useEffect(() => {
		if (loading) return;
		navigate({ to: user ? "/home" : "/welcome", replace: true });
	}, [user, loading, navigate]);
	return <div className="min-h-screen bg-[#0a1020]" aria-busy="true" />;
}
