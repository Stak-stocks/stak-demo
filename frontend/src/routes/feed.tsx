import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/feed")({
	component: FeedPage,
});

function FeedPage() {
	return (
		<div className="flex flex-col items-center justify-center min-h-[60vh] px-6">
			<h1 className="text-2xl font-bold text-white">News Feed</h1>
			<p className="text-slate-400 mt-2">Coming soon</p>
		</div>
	);
}
