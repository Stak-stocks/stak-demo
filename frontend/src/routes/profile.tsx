import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/profile")({
	component: ProfilePage,
});

function ProfilePage() {
	return (
		<div className="min-h-screen bg-white dark:bg-[#121212] text-zinc-900 dark:text-white px-6 py-12">
			<div className="max-w-lg mx-auto space-y-8">
				<header className="text-center">
					<h1 className="text-3xl font-bold">Your Taste Profile</h1>
					<p className="text-zinc-400 mt-2">
						Analytics based on your swiping activity
					</p>
				</header>

				<div className="text-center text-zinc-500 py-20">
					<p className="text-lg">Coming soon</p>
					<p className="text-sm mt-2">
						Swipe more brands to unlock your taste analytics
					</p>
				</div>
			</div>
		</div>
	);
}
