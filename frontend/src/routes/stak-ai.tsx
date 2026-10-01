import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { History, Plus, Sparkles } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { BackCircle, PhonePage } from "@/components/phone/phone";
import { DISC, cu } from "@/components/discover/discoverTheme";
import { DESK, deskFocus } from "@/components/desktop/deskKit";
import { ContextChip, StakAiThread } from "@/components/stakAi/StakAiThread";
import { StakAiHistoryList } from "@/components/stakAi/StakAiHistoryList";
import { useStakAiChat } from "@/components/stakAi/useStakAiChat";
import { useStakAiHistory } from "@/components/stakAi/useStakAiHistory";

export const Route = createFileRoute("/stak-ai")({
	component: StakAiRoute,
});

/** STAK AI's chat. The phone is Android's screen; desktop puts your chats beside the conversation. */
function StakAiRoute() {
	return useIsMobile() ? <StakAiPhonePage /> : <StakAiDesktopPage />;
}

const FOCUS = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#69B3CA]";

function StakAiPhonePage() {
	const router = useRouter();
	const navigate = useNavigate();
	const chat = useStakAiChat({ fromLauncher: true });
	const iconButton = (label: string, onClick: () => void, icon: React.ReactNode, disabled = false) => (
		<button type="button" onClick={onClick} disabled={disabled} aria-label={label} className={`grid place-items-center ${FOCUS}`} style={{ width: 48, height: 48 }}>
			<span className="grid place-items-center rounded-full" style={{ width: cu(36), height: cu(36), background: DISC.cardDark }}>{icon}</span>
		</button>
	);
	return (
		<PhonePage className="h-full">
			<div className="flex h-[100dvh] flex-col">
				<header className="relative flex items-center" style={{ padding: `${cu(8)} ${cu(12)} ${cu(6)} ${cu(20)}` }}>
					<BackCircle onClick={() => router.history.back()} />
					<h1 className="pointer-events-none absolute inset-x-0 flex items-center justify-center font-semibold text-white" style={{ gap: cu(6), fontSize: cu(17) }}>
						<Sparkles style={{ width: cu(16), height: cu(16), color: DISC.teal }} aria-hidden="true" />STAK AI
					</h1>
					<div className="ml-auto flex">
						{iconButton("Your chats", () => navigate({ to: "/stak-ai/history" }), <History style={{ width: cu(18), height: cu(18), color: "#fff" }} aria-hidden="true" />)}
						{iconButton("New chat", chat.newChat, <Plus style={{ width: cu(18), height: cu(18), color: "#fff" }} aria-hidden="true" />, chat.sending)}
					</div>
				</header>
				{chat.context && <ContextChip context={chat.context} variant="phone" />}
				<StakAiThread chat={chat} variant="phone" />
			</div>
		</PhonePage>
	);
}

function StakAiDesktopPage() {
	const chat = useStakAiChat({ fromLauncher: true });
	const history = useStakAiHistory();
	const activeId = chat.currentConversationId();
	// A new chat's first answer (or a follow-up moving a chat to the top): refresh the list beside it.
	const answers = chat.messages.filter((m) => !m.fromUser && m.id != null).length;
	useEffect(() => { if (answers > 0) history.reload(); }, [answers, activeId]); // eslint-disable-line react-hooks/exhaustive-deps

	return (
		<div className="flex h-[100dvh]" style={{ background: DESK.bg }}>
			<aside aria-label="Your chats" className="flex w-[320px] shrink-0 flex-col" style={{ borderRight: `1px solid ${DESK.border}` }}>
				<div className="flex items-center justify-between px-5 pb-3 pt-6">
					<h2 className="text-[15px] font-semibold text-white">Your chats</h2>
					<button type="button" onClick={chat.newChat} disabled={chat.sending} className={`flex items-center gap-1.5 rounded-[8px] px-3 py-2 text-[13px] font-medium disabled:opacity-50 ${deskFocus}`} style={{ color: DESK.cyan, background: DESK.cyanSoft }}>
						<Plus className="h-4 w-4" aria-hidden="true" /> New chat
					</button>
				</div>
				<div className="min-h-0 flex-1 overflow-y-auto px-3 pb-6">
					<StakAiHistoryList history={history} variant="desktop" activeId={activeId} onOpen={(id) => chat.open(id)} />
				</div>
			</aside>
			<main className="mx-auto flex min-w-0 max-w-[820px] flex-1 flex-col pt-6">
				<h1 className="flex items-center gap-2 px-5 pb-3 text-[20px] font-semibold text-white">
					<Sparkles className="h-5 w-5" style={{ color: DESK.cyan }} aria-hidden="true" />STAK AI
				</h1>
				{chat.context && <ContextChip context={chat.context} variant="desktop" />}
				<StakAiThread chat={chat} variant="desktop" autoFocus />
			</main>
		</div>
	);
}
