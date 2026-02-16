import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";

export const Route = createFileRoute("/profile")({
	component: ProfilePage,
});

function ProfilePage() {
	const { user, loading, logout } = useAuth();
	const navigate = useNavigate();

	async function handleLogout() {
		await logout();
		toast.success("Signed out");
		navigate({ to: "/login" });
	}

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-screen bg-white dark:bg-[#0b1121]">
				<div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
			</div>
		);
	}

	if (!user) {
		navigate({ to: "/login" });
		return null;
	}

	return (
		<div className="min-h-screen bg-white dark:bg-[#0b1121] text-zinc-900 dark:text-white px-6 py-12">
			<div className="max-w-lg mx-auto space-y-8">
				<header className="text-center">
					<h1 className="text-3xl font-bold">Your Profile</h1>
				</header>

				<div className="flex flex-col items-center gap-4">
					{user.photoURL && (
						<img
							src={user.photoURL}
							alt="Profile"
							className="w-20 h-20 rounded-full border-2 border-zinc-700"
							referrerPolicy="no-referrer"
						/>
					)}
					<div className="text-center">
						<p className="text-xl font-semibold">
							{user.displayName || "STAK User"}
						</p>
						<p className="text-zinc-400 text-sm">{user.email}</p>
					</div>
				</div>

				<div className="text-center text-zinc-500 py-8">
					<p className="text-lg">Taste Analytics</p>
					<p className="text-sm mt-2">
						Coming soon — swipe more brands to unlock insights
					</p>
				</div>

				<div className="pt-4">
					<button
						type="button"
						onClick={handleLogout}
						className="w-full py-3 px-4 rounded-xl bg-[#162036] text-white font-semibold hover:bg-zinc-700 transition-all active:scale-95"
					>
						Sign Out
					</button>
				</div>
			</div>
		</div>
	);
}
