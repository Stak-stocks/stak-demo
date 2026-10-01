import { useNavigate } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { Panel, PanelHeader } from "@/components/desktop/deskKit";
import { StakAiThread } from "@/components/stakAi/StakAiThread";
import { resetStakAiLauncher, stakAiLauncher, useStakAiChat } from "@/components/stakAi/useStakAiChat";
import type { StakAiContext } from "@/lib/api";

/**
 * Ask STAK AI on desktop News and the Daily Brief: a real conversation in the panel (the page as its context on the
 * Brief), its suggestions as the starting questions, and "Open full chat" carrying it over to /stak-ai.
 */
export function AskStakAi({ suggestions, context = null }: { suggestions: string[]; context?: StakAiContext | null }) {
	const navigate = useNavigate();
	const chat = useStakAiChat({ context });
	const openFull = () => {
		resetStakAiLauncher();
		const id = chat.currentConversationId();
		if (id) stakAiLauncher.conversationId = id;
		else stakAiLauncher.context = context;
		void navigate({ to: "/stak-ai" });
	};
	return (
		<Panel label="Ask STAK AI" className="gap-3 p-5">
			<PanelHeader icon={Sparkles} title="Ask STAK AI" subtitle="Plain-English answers about today's news." action="Open full chat" onAction={openFull} />
			<div className="-mx-5 flex h-[460px] flex-col">
				<StakAiThread chat={chat} variant="desktop" starters={suggestions.length ? suggestions : undefined} compact />
			</div>
		</Panel>
	);
}
