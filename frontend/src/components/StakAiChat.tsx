import { useState, useRef, useEffect, useCallback } from "react";
import { Sparkles, X, Plus, Send, Clock, ChevronRight, TrendingUp, Newspaper, BookOpen, Star } from "lucide-react";
import { useAccount } from "@/context/AccountContext";
import { useBrandsList } from "@/hooks/useBrandsList";
import {
	sendStakAiMessage,
	getStakAiConversations,
	getStakAiMessages,
	type StakAiConversation,
} from "@/lib/api";
import { toast } from "sonner";

interface Message {
	id: string;
	role: "user" | "assistant";
	content: string;
}

function escapeHtml(text: string): string {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

function renderMarkdown(raw: string): string {
	const escaped = escapeHtml(raw);
	return escaped
		.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
		.replace(/(?:^|\n)[-*] (.+)/g, "<li>$1</li>")
		.replace(/(<li>.*?<\/li>)+/gs, (m) => `<ul style="list-style:disc;padding-left:1rem;margin:0.25rem 0">${m}</ul>`)
		.replace(/\n/g, "<br />");
}

function AiMessage({ content }: { content: string }) {
	return (
		<div
			className="text-sm leading-relaxed"
			// eslint-disable-next-line react/no-danger
			dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
		/>
	);
}

const TAG_DISPLAY: Record<string, string> = {
	tech: "Tech", fashion: "Fashion", food: "Food & Beverage",
	entertainment: "Entertainment", retail: "Retail", finance: "Finance",
	health: "Health & Wellness", auto: "Auto", sports: "Sports", travel: "Travel",
};

export function StakAiChat() {
	const { account } = useAccount();
	const { data: allBrands } = useBrandsList();

	const [open, setOpen] = useState(false);
	const [showHistory, setShowHistory] = useState(false);
	const [conversationId, setConversationId] = useState<string | null>(null);
	const [messages, setMessages] = useState<Message[]>([]);
	const [input, setInput] = useState("");
	const [loading, setLoading] = useState(false);
	const [conversations, setConversations] = useState<StakAiConversation[]>([]);

	const messagesEndRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const chatInputRef = useRef<HTMLTextAreaElement>(null);
	const conversationsLoadedRef = useRef(false);
	const isChat = messages.length > 0 || loading;

	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages]);

	useEffect(() => {
		if (open && !isChat) inputRef.current?.focus();
		if (open && isChat) chatInputRef.current?.focus();
	}, [open, isChat]);

	const loadConversations = useCallback(async () => {
		if (conversationsLoadedRef.current) return;
		try {
			const data = await getStakAiConversations();
			setConversations(data.conversations);
			conversationsLoadedRef.current = true;
		} catch { /* non-fatal */ }
	}, []);

	function handleOpen() {
		setOpen(true);
		loadConversations();
	}

	function handleClose() {
		setOpen(false);
		setShowHistory(false);
	}

	function handleNewChat() {
		setConversationId(null);
		setMessages([]);
		setInput("");
		setShowHistory(false);
	}

	async function loadConversation(conv: StakAiConversation) {
		setShowHistory(false);
		setConversationId(conv.id);
		setMessages([]);
		try {
			const data = await getStakAiMessages(conv.id);
			setMessages(data.messages.map((m) => ({
				id: String(m.id),
				role: m.role as "user" | "assistant",
				content: m.content,
			})));
		} catch {
			toast.error("Failed to load conversation");
		}
	}

	async function handleSend(text: string) {
		const trimmed = text.trim();
		if (!trimmed || loading) return;
		setInput("");
		const tempId = `tmp-${Date.now()}`;
		setMessages((prev) => [...prev, { id: tempId, role: "user", content: trimmed }]);
		setLoading(true);
		try {
			const data = await sendStakAiMessage(trimmed, conversationId ?? undefined);
			if (!conversationId) {
				setConversationId(data.conversationId);
				conversationsLoadedRef.current = false;
			}
			setMessages((prev) => [...prev, { id: `ai-${Date.now()}`, role: "assistant", content: data.response }]);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Stak AI is unavailable — please try again");
			setMessages((prev) => prev.filter((m) => m.id !== tempId));
			setInput(trimmed);
		} finally {
			setLoading(false);
		}
	}

	// Personalized "Try asking" prompts
	const starterPrompts = (() => {
		const firstBrandId = account?.stakBrandIds?.[0];
		const firstName = firstBrandId && allBrands ? (allBrands.find((b) => b.id === firstBrandId)?.name ?? null) : null;
		const tagScores = account?.tagScores ?? {};
		const topTag = Object.entries(tagScores).sort(([, a], [, b]) => b - a)[0]?.[0];
		const tagLabel = topTag ? (TAG_DISPLAY[topTag] ?? topTag) : null;

		return [
			{ icon: TrendingUp, text: firstName ? `Why did ${firstName} move today?` : "Why did a stock move today?" },
			{ icon: Newspaper,  text: tagLabel ? `What's happening in ${tagLabel} stocks?` : "Is this news bullish or bearish?" },
			{ icon: BookOpen,   text: "What should I check before buying?" },
			{ icon: Star,       text: firstName ? `What changed since I saved ${firstName}?` : "What's moving the market today?" },
		];
	})();

	return (
		<>
			{/* Floating button */}
			{!open && (
				<button
					onClick={handleOpen}
					aria-label="Open Stak AI"
					className="fixed bottom-20 right-4 z-[65] w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30 flex items-center justify-center text-white hover:scale-105 active:scale-95 transition-transform"
				>
					<Sparkles className="w-5 h-5" />
				</button>
			)}

			{/* Overlay */}
			<div
				className={`fixed inset-0 z-[70] flex flex-col bg-background transition-transform duration-300 ease-out ${open ? "translate-y-0" : "translate-y-full"}`}
				aria-hidden={!open}
			>
				{/* Top bar */}
				<div
					className="flex items-center gap-2 px-4 border-b border-border/50 shrink-0"
					style={{ paddingTop: `max(0.75rem, env(safe-area-inset-top))`, paddingBottom: "0.75rem" }}
				>
					<Sparkles className="w-4 h-4 text-indigo-500 shrink-0" />
					<span className="font-bold text-base flex-1">Stak AI</span>
					<button onClick={() => setShowHistory((v) => !v)} aria-label="History"
						className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
						<Clock className="w-4 h-4" />
					</button>
					<button onClick={handleNewChat} aria-label="New chat"
						className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
						<Plus className="w-4 h-4" />
					</button>
					<button onClick={handleClose} aria-label="Close"
						className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
						<X className="w-4 h-4" />
					</button>
				</div>

				{/* History panel */}
				{showHistory && (
					<div className="border-b border-border/50 bg-muted/20 shrink-0 max-h-48 overflow-y-auto">
						{conversations.length === 0 ? (
							<p className="text-sm text-muted-foreground px-4 py-3">No past conversations yet.</p>
						) : (
							<ul>
								{conversations.map((conv) => (
									<li key={conv.id}>
										<button onClick={() => loadConversation(conv)}
											className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted/50 transition-colors flex items-center gap-2">
											<Sparkles className="w-3 h-3 text-indigo-400 shrink-0" />
											<span className="truncate">{conv.title}</span>
										</button>
									</li>
								))}
							</ul>
						)}
					</div>
				)}

				{/* ── LANDING STATE (no messages yet) ── */}
				{!isChat && (
					<div className="flex-1 overflow-y-auto px-5 py-6 flex flex-col gap-6">
						{/* Header */}
						<div>
							<h1 className="text-3xl font-extrabold tracking-tight">Stak AI</h1>
							<p className="text-muted-foreground mt-1 text-sm">Ask about your stocks.</p>
						</div>

						{/* Search input */}
						<div className="flex items-center gap-2 rounded-2xl border border-border/60 bg-muted/30 px-4 py-3">
							<input
								ref={inputRef}
								value={input}
								onChange={(e) => setInput(e.target.value)}
								onKeyDown={(e) => { if (e.key === "Enter") handleSend(input); }}
								placeholder="Ask why a stock moved, what changed, or what to check next"
								className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
							/>
							<button
								onClick={() => handleSend(input)}
								disabled={!input.trim()}
								aria-label="Send"
								className="w-8 h-8 rounded-full bg-indigo-600 disabled:opacity-30 flex items-center justify-center text-white shrink-0 transition-opacity"
							>
								<Send className="w-3.5 h-3.5" />
							</button>
						</div>

						{/* Try asking */}
						<div>
							<p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Try asking</p>
							<ul className="flex flex-col divide-y divide-border/40">
								{starterPrompts.map(({ icon: Icon, text }) => (
									<li key={text}>
										<button
											onClick={() => handleSend(text)}
											className="w-full flex items-center gap-3 py-3.5 text-left hover:bg-muted/40 transition-colors -mx-1 px-1 rounded-lg"
										>
											<div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
												<Icon className="w-4 h-4 text-muted-foreground" />
											</div>
											<span className="flex-1 text-sm font-medium">{text}</span>
											<ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
										</button>
									</li>
								))}
							</ul>
						</div>
					</div>
				)}

				{/* ── CHAT STATE (messages exist) ── */}
				{isChat && (
					<>
						<div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
							{messages.map((msg) => (
								<div key={msg.id} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
									{msg.role === "assistant" && (
										<div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shrink-0 mt-0.5">
											<Sparkles className="w-3.5 h-3.5 text-white" />
										</div>
									)}
									<div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
										msg.role === "user"
											? "bg-indigo-600 text-white rounded-tr-sm"
											: "bg-muted rounded-tl-sm"
									}`}>
										{msg.role === "assistant" ? <AiMessage content={msg.content} /> : msg.content}
									</div>
								</div>
							))}

							{loading && (
								<div className="flex gap-2 justify-start">
									<div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shrink-0">
										<Sparkles className="w-3.5 h-3.5 text-white" />
									</div>
									<div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
										<div className="flex gap-1">
											<span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:0ms]" />
											<span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:150ms]" />
											<span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:300ms]" />
										</div>
									</div>
								</div>
							)}
							<div ref={messagesEndRef} />
						</div>

						{/* Chat input */}
						<div
							className="px-4 pt-2 border-t border-border/50 shrink-0"
							style={{ paddingBottom: `max(1rem, env(safe-area-inset-bottom))` }}
						>
							<div className="flex gap-2 items-end">
								<textarea
									ref={chatInputRef}
									value={input}
									onChange={(e) => setInput(e.target.value)}
									onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(input); } }}
									placeholder="Ask Stak AI anything…"
									rows={1}
									disabled={loading}
									className="flex-1 resize-none rounded-xl border border-border/60 bg-muted/30 px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-indigo-400 transition-colors max-h-32 disabled:opacity-50"
									style={{ lineHeight: "1.5" }}
								/>
								<button
									onClick={() => handleSend(input)}
									disabled={!input.trim() || loading}
									aria-label="Send"
									className="w-10 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-white transition-colors shrink-0"
								>
									{loading
										? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
										: <Send className="w-4 h-4" />}
								</button>
							</div>
							<p className="text-[10px] text-muted-foreground/60 text-center mt-2">
								For educational purposes only — not financial advice.
							</p>
						</div>
					</>
				)}
			</div>
		</>
	);
}
