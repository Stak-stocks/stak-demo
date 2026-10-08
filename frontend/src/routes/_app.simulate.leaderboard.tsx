import { createFileRoute } from "@tanstack/react-router";
import { Leaderboard } from "@/app/simulate/Leaderboard";

export const Route = createFileRoute("/_app/simulate/leaderboard")({
	component: Leaderboard,
});
