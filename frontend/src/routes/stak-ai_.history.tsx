import { createFileRoute, useCanGoBack, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { PhonePage, SubPageBar } from "@/components/phone/phone";
import { cu } from "@/components/discover/discoverTheme";
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
	useEffect(() => { if (!isMobile) void navigate({ to: "/stak-ai", replace: true }); }, [isMobile, navigate]);
	return isMobile ? <StakAiHistoryPage /> : null;
}

function StakAiHistoryPage() {
	const router = useRouter();
	const canGoBack = useCanGoBack();
	const navigate = useNavigate();
	const history = useStakAiHistory();
	// Opened from the chat: step back to it (it reopens whatever the launcher says). Reached any other way - a link,
	// a reload - replace this page with the chat, so Back never bounces between the two or leaves the app.
	const toChat = () => {
		const fromChat = stakAiLauncher.historyFromChat && canGoBack;
		stakAiLauncher.historyFromChat = false;
		if (fromChat) router.history.back();
		else void navigate({ to: "/stak-ai", replace: true });
	};
	return (
		<PhonePage>
			<SubPageBar title="Your chats" onBack={toChat} />
			<div style={{ padding: `0 ${cu(20)} ${cu(26)}` }}>
				<StakAiHistoryList
					history={history}
					variant="phone"
					onOpen={(id) => {
						stakAiLauncher.conversationId = id;
						stakAiLauncher.resume = null;
						toChat();
					}}
				/>
			</div>
		</PhonePage>
	);
}
