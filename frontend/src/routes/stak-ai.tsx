import { createFileRoute, useCanGoBack, useNavigate, useRouter } from "@tanstack/react-router";
import { History, Plus, Sparkles } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { BackCircle, PRESS, PhonePage, focusRing } from "@/components/phone/phone";
import { DISC, cu } from "@/components/discover/discoverTheme";
import { DESK, deskFocus } from "@/components/desktop/deskKit";
import { ContextChip, StakAiThread } from "@/components/stakAi/StakAiThread";
import { StakAiHistoryList } from "@/components/stakAi/StakAiHistoryList";
import { stakAiLauncher, useStakAiChat } from "@/components/stakAi/useStakAiChat";
import { useStakAiHistory } from "@/components/stakAi/useStakAiHistory";

export const Route = createFileRoute("/stak-ai")({
	component: StakAiRoute,
});

/** STAK AI's chat. The phone is Android's screen; desktop puts your chats beside the conversation. */
function StakAiRoute() {
	return useIsMobile() ? <StakAiPhonePage /> : <StakAiDesktopPage />;
}

function StakAiPhonePage() {
	const router = useRouter();
	const canGoBack = useCanGoBack();
	const navigate = useNavigate();
	const chat = useStakAiChat({ fromLauncher: true });
	// Opened from a link or a reload, there's nothing behind it in the app: go Home instead of leaving.
	const back = () => (canGoBack ? router.history.back() : navigate({ to: "/" }));
	const openHistory = () => {
		stakAiLauncher.historyFromChat = true;
		void navigate({ to: "/stak-ai/history" });
	};
	const iconButton = (label: string, onClick: () => void, Icon: typeof History, disabled = false) => (
		<button type="button" onClick={onClick} disabled={disabled} aria-label={label} className={`grid place-items-center disabled:opacity-50 ${PRESS}`} style={{ width: 44, height: 44, ...focusRing }}>
			<span className="grid place-items-center rounded-full" style={{ width: cu(36), height: cu(36), background: DISC.cardDark }}>
				<Icon style={{ width: cu(18), height: cu(18), color: "#fff" }} aria-hidden="true" />
			</span>
		</button>
	);
	return (
		<PhonePage className="h-full">
			<div className="flex h-[100dvh] flex-col">
				<header className="relative flex items-center" style={{ padding: `${cu(8)} ${cu(12)} ${cu(6)} ${cu(20)}` }}>
					<BackCircle onClick={back} />
					<h1 className="pointer-events-none absolute inset-x-0 flex items-center justify-center font-semibold text-white" style={{ gap: cu(6), fontSize: cu(17) }}>
						<Sparkles style={{ width: cu(16), height: cu(16), color: DISC.teal }} aria-hidden="true" />STAK AI
					</h1>
					<div className="ml-auto flex">
						{iconButton("Your chats", openHistory, History)}
						{iconButton("New chat", chat.newChat, Plus, chat.sending)}
					</div>
				</header>
				{chat.context && <ContextChip context={chat.context} variant="phone" />}
				<StakAiThread chat={chat} variant="phone" />
			</div>
		</PhonePage>
	);
}

/** Desktop: the conversation, with your chats in a sidebar (the app shell already supplies <main>). */
function StakAiDesktopPage() {
	const chat = useStakAiChat({ fromLauncher: true });
	// The list refreshes itself when an answer lands (the chat invalidates it); opening a chat doesn't reload it.
	const history = useStakAiHistory();
	return (
		<div className="flex h-[100dvh]" style={{ background: DESK.bg }}>
			<section className="mx-auto flex min-w-0 max-w-[820px] flex-1 flex-col pt-6" aria-labelledby="stak-ai-title">
				<h1 id="stak-ai-title" className="flex items-center gap-2 px-5 pb-3 text-[20px] font-semibold text-white">
					<Sparkles className="h-5 w-5" style={{ color: DESK.cyan }} aria-hidden="true" />STAK AI
				</h1>
				{chat.context && <ContextChip context={chat.context} variant="desktop" />}
				<StakAiThread chat={chat} variant="desktop" autoFocus />
			</section>
			<aside aria-label="Your chats" className="order-first flex w-[320px] shrink-0 flex-col" style={{ borderRight: `1px solid ${DESK.border}` }}>
				<div className="flex items-center justify-between px-5 pb-3 pt-6">
					<h2 className="text-[15px] font-semibold text-white">Your chats</h2>
					<button type="button" onClick={chat.newChat} className={`flex min-h-[40px] items-center gap-1.5 rounded-[8px] px-3 text-[13px] font-medium ${deskFocus}`} style={{ color: DESK.cyan, background: DESK.cyanSoft }}>
						<Plus className="h-4 w-4" aria-hidden="true" /> New chat
					</button>
				</div>
				<div className="min-h-0 flex-1 overflow-y-auto px-3 pb-6">
					<StakAiHistoryList history={history} variant="desktop" activeId={chat.currentConversationId()} onOpen={(id) => chat.open(id)} />
				</div>
			</aside>
		</div>
	);
}
