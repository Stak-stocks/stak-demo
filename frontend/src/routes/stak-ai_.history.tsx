import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { SettingsScaffold } from "@/components/profile/ProfileKit";
import { StakAiHistoryList } from "@/components/stakAi/StakAiHistoryList";
import { stakAiLauncher } from "@/components/stakAi/useStakAiChat";
import { useStakAiHistory } from "@/components/stakAi/useStakAiHistory";

export const Route = createFileRoute("/stak-ai_/history")({
	component: StakAiHistoryRoute,
});

/** The phone's list of past STAK AI chats (Android's history screen). Desktop shows them beside the chat instead. */
function StakAiHistoryRoute() {
	const isMobile = useIsMobile();
	const navigate = useNavigate();
	useEffect(() => { if (!isMobile) navigate({ to: "/stak-ai", replace: true }); }, [isMobile, navigate]);
	return isMobile ? <StakAiHistoryPage /> : null;
}

function StakAiHistoryPage() {
	const router = useRouter();
	const history = useStakAiHistory();
	return (
		<SettingsScaffold title="Your chats" backTo="/stak-ai" gap={10}>
			<StakAiHistoryList
				history={history}
				variant="phone"
				// Back to the chat, which reopens this conversation (it's always under this page).
				onOpen={(id) => {
					stakAiLauncher.conversationId = id;
					stakAiLauncher.resume = null;
					router.history.back();
				}}
			/>
		</SettingsScaffold>
	);
}
