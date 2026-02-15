import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "../context/AuthContext";
import { useEffect } from "react";
import { FloatingBrands } from "@/components/FloatingBrands";

export const Route = createFileRoute("/welcome")({
	component: WelcomePage,
});

function WelcomePage() {
	const { user, loading } = useAuth();
	const navigate = useNavigate();

	// If already logged in, skip to home or onboarding
	useEffect(() => {
		if (!loading && user) {
			if (localStorage.getItem("onboardingCompleted") === "false") {
				navigate({ to: "/onboarding" });
			} else {
				navigate({ to: "/" });
			}
		}
	}, [user, loading, navigate]);

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-screen bg-[#0f1629]">
				<div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
			</div>
		);
	}

	return (
		<div className="relative flex flex-col items-center justify-center min-h-screen bg-[#0f1629] px-6 overflow-hidden">
			<FloatingBrands />

			<div className="relative z-10 w-full max-w-sm">
				<div className="text-center space-y-8 animate-in fade-in duration-500">
					<div>
						<h1 className="text-3xl font-bold text-white">Welcome to STAK</h1>
						<p className="text-slate-400 mt-3 text-lg">
							Discover stocks through brands you already know
						</p>
					</div>

					<button
						type="button"
						onClick={() => navigate({ to: "/login" })}
						className="w-full py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-600 hover:to-orange-500 transition-all active:scale-[0.98] shadow-lg shadow-orange-500/25"
					>
						Get Started ►
					</button>
				</div>
			</div>
		</div>
	);
}
