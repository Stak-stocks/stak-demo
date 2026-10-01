import { useCallback, useEffect, useRef, useState } from "react";
import {
	ApiError,
	getStakAiMessages,
	getStakAiUsage,
	sendStakAiFeedback,
	sendStakAiMessage,
	type StakAiContext,
	type StakAiSource,
	type StakAiUsage,
} from "@/lib/api";

/**
 * How a page opens STAK AI: set what it's opened from (and optionally a first question to ask at once), or a past
 * conversation to reopen, then go to /stak-ai. The chat takes these once, when it mounts. Mirrors Android's
 * StakAiLauncher; kept in memory, so a reload opens a plain chat.
 */
export const stakAiLauncher: {
	context: StakAiContext | null;
	question: string | null;
	conversationId: string | null;
	/** The chat that was open when /stak-ai was left (for its history page, say): reopened on return. */
	resume: string | null;
} = { context: null, question: null, conversationId: null, resume: null };

export function resetStakAiLauncher() {
	stakAiLauncher.context = null;
	stakAiLauncher.question = null;
	stakAiLauncher.conversationId = null;
	stakAiLauncher.resume = null;
}

/** One line in the chat. `id` is the server's message id (answers only), for thumbs. */
export interface AiMessage {
	key: number;
	fromUser: boolean;
	text: string;
	id?: number | null;
	feedback?: 1 | -1 | null;
	/** "answer", "declined" or "clarify" - the last two don't count against the limit. */
	kind: "answer" | "declined" | "clarify";
	followUps: string[];
	sources: StakAiSource[];
	/** A question that got no answer; the chat offers to resend it. */
	failed?: boolean;
}

export type AiNotice =
	| { type: "limit"; resetsAt: string | null }
	| { type: "failed"; offline: boolean }
	| { type: "loadFailed" };

interface Options {
	/** Take what the launcher holds (the /stak-ai page); embedded panels pass their own context instead. */
	fromLauncher?: boolean;
	/** For an embedded panel: the page it sits on. */
	context?: StakAiContext | null;
}

/**
 * STAK AI's chat state - the web twin of Android's StakAiViewModel. Context goes with the first question only; a
 * failed question is retried in place; out of questions hands the question back and unlocks itself when a slot frees;
 * nothing sends while a past chat loads; a deleted chat carries on in a fresh one.
 */
export function useStakAiChat({ fromLauncher = false, context: given = null }: Options = {}) {
	const [messages, setMessages] = useState<AiMessage[]>([]);
	const [context, setContext] = useState<StakAiContext | null>(() => (fromLauncher ? stakAiLauncher.context : given));
	const [usage, setUsage] = useState<StakAiUsage | null>(null);
	const [sending, setSending] = useState(false);
	const [loading, setLoading] = useState(false);
	const [notice, setNotice] = useState<AiNotice | null>(null);
	const [returnedDraft, setReturnedDraft] = useState<string | null>(null);

	const conversationId = useRef<string | null>(null);
	const openedId = useRef<string | null>(null);
	const contextSent = useRef(false);
	const contextRef = useRef(context);
	contextRef.current = context;
	const nextKey = useRef(0);
	const usageVersion = useRef(0);
	const openToken = useRef(0);
	const unlockTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const messagesRef = useRef(messages);
	messagesRef.current = messages;
	const busy = useRef({ sending: false, loading: false });
	busy.current = { sending, loading };

	const applyUsage = useCallback((u: StakAiUsage | null) => {
		setUsage(u);
		if (unlockTimer.current) clearTimeout(unlockTimer.current);
		if (!u || u.remaining > 0) {
			setNotice((n) => (n?.type === "limit" ? null : n));
			return;
		}
		setNotice({ type: "limit", resetsAt: u.resetsAt });
		const wait = u.resetsAt ? Date.parse(u.resetsAt) - Date.now() : NaN;
		if (Number.isFinite(wait)) {
			// Check again when the oldest question drops out, so the box unlocks without a reload.
			unlockTimer.current = setTimeout(() => {
				const version = usageVersion.current;
				getStakAiUsage().then((fresh) => { if (version === usageVersion.current) applyUsage(fresh); }).catch(() => {});
			}, Math.min(Math.max(wait, 0) + 2_000, 2 ** 31 - 1));
		}
	}, []);

	const open = useCallback((id: string) => {
		const token = ++openToken.current;
		openedId.current = id;
		setLoading(true);
		setNotice(null);
		getStakAiMessages(id)
			.then((r) => {
				if (token !== openToken.current) return;
				conversationId.current = id;
				contextSent.current = true;
				setContext(r.context);
				setMessages(r.messages.map((m) => ({
					key: nextKey.current++,
					fromUser: m.role === "user",
					text: m.content,
					id: m.role === "assistant" ? m.id : null,
					feedback: m.feedback,
					kind: m.kind ?? "answer",
					followUps: [],
					sources: [],
				})));
			})
			.catch(() => { if (token === openToken.current) setNotice({ type: "loadFailed" }); })
			.finally(() => { if (token === openToken.current) setLoading(false); });
	}, []);

	const ask = useCallback(async (question: string, allowRestart: boolean): Promise<void> => {
		try {
			const r = await sendStakAiMessage(question, conversationId.current ?? undefined, contextSent.current ? undefined : contextRef.current ?? undefined);
			contextSent.current = true;
			conversationId.current = r.conversationId;
			usageVersion.current++;
			applyUsage(r.usage);
			setMessages((ms) => [...ms, {
				key: nextKey.current++, fromUser: false, text: r.response, id: r.messageId,
				kind: r.answerKind, followUps: r.followUps, sources: r.sources,
			}]);
		} catch (e) {
			const body = e instanceof ApiError ? (e.body as { code?: string; usage?: StakAiUsage } | undefined) : undefined;
			if (body?.code === "not_found" && allowRestart && conversationId.current) {
				// The chat was deleted (from history) while open: carry on in a fresh one, asking the same question.
				conversationId.current = null;
				contextSent.current = false;
				return ask(question, false);
			}
			if (body?.code === "limit_reached") {
				usageVersion.current++;
				applyUsage(body.usage ?? null);
				setMessages((ms) => ms.slice(0, -1));
				setReturnedDraft(question);
				return;
			}
			setMessages((ms) => ms.map((m, i) => (i === ms.length - 1 ? { ...m, failed: true } : m)));
			setNotice({ type: "failed", offline: !(e instanceof ApiError) });
		}
	}, [applyUsage]);

	const send = useCallback((text: string) => {
		const question = text.trim();
		if (!question || busy.current.sending || busy.current.loading) return;
		busy.current.sending = true;
		// A resend replaces the failed line rather than repeating it.
		setMessages((ms) => [...ms.filter((m) => !m.failed), { key: nextKey.current++, fromUser: true, text: question, kind: "answer", followUps: [], sources: [] }]);
		setNotice(null);
		setSending(true);
		void ask(question, true).finally(() => setSending(false));
	}, [ask]);

	/** Ask the failed question again. */
	const retry = useCallback(() => {
		const failed = [...messagesRef.current].reverse().find((m) => m.failed);
		if (failed) send(failed.text);
	}, [send]);

	/** Thumbs on an answer; tapping the same thumb again clears it. Shown at once, put back if the save fails. */
	const rate = useCallback((m: AiMessage, value: 1 | -1) => {
		if (m.id == null) return;
		const before = m.feedback ?? null;
		const next = before === value ? null : value;
		const set = (v: 1 | -1 | null) => setMessages((ms) => ms.map((x) => (x.key === m.key ? { ...x, feedback: v } : x)));
		set(next);
		sendStakAiFeedback(m.id, next).catch(() => set(before));
	}, []);

	/** Start over: a fresh conversation with no page context (and stop loading a past one). */
	const newChat = useCallback(() => {
		if (busy.current.sending) return;
		openToken.current++;
		setLoading(false);
		setMessages([]);
		conversationId.current = null;
		openedId.current = null;
		contextSent.current = false;
		setContext(null);
		setNotice(() => (usage && usage.remaining <= 0 ? { type: "limit", resetsAt: usage.resetsAt } : null));
	}, [usage]);

	const retryOpen = useCallback(() => { if (openedId.current) open(openedId.current); }, [open]);

	const consumeReturnedDraft = useCallback(() => {
		const d = returnedDraft;
		setReturnedDraft(null);
		return d;
	}, [returnedDraft]);

	// Mount: the questions-left count, then a past chat to reopen or a first question to ask.
	useEffect(() => {
		const version = usageVersion.current;
		getStakAiUsage().then((u) => { if (version === usageVersion.current) applyUsage(u); }).catch(() => {});
		if (fromLauncher) {
			const reopen = stakAiLauncher.conversationId ?? stakAiLauncher.resume;
			const first = stakAiLauncher.question;
			resetStakAiLauncher();
			if (reopen) open(reopen);
			else if (first) send(first);
		}
		return () => {
			if (unlockTimer.current) clearTimeout(unlockTimer.current);
			// Leaving the page (to its history, say): come back to this conversation.
			if (fromLauncher && !stakAiLauncher.conversationId && !stakAiLauncher.context) stakAiLauncher.resume = conversationId.current;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps -- once, on mount
	}, []);

	const outOfQuestions = (usage?.remaining ?? 1) <= 0;
	return {
		messages, context, usage, sending, loading, notice, returnedDraft,
		outOfQuestions,
		canAsk: !sending && !loading && !outOfQuestions,
		/** The conversation on screen (null before its first answer). */
		currentConversationId: () => conversationId.current,
		send, retry, rate, newChat, open, retryOpen, consumeReturnedDraft,
	};
}

export type StakAiChat = ReturnType<typeof useStakAiChat>;

/** Questions to start with, matched to where the chat was opened from. */
export function starterQuestions(ctx: StakAiContext | null, nameOf: (ticker: string) => string = (t) => t): string[] {
	if (ctx?.type === "stock") return [`Why is ${ctx.ticker} moving today?`, `How does ${nameOf(ctx.ticker)} make money?`, `What do ${ctx.ticker}'s numbers say?`];
	if (ctx?.type === "article") return ["What does this mean for me?", "Explain this in simple terms", "Which companies does this affect?"];
	if (ctx?.type === "brief") return ["Explain today's market simply", "Why does this matter to me?", "What's worth keeping an eye on?"];
	return ["Why is Nvidia moving today?", "What is a P/E ratio?", "How do earnings move a stock?"];
}

/** "Your next one is at 3:40 PM." (or "tomorrow at …") from the window's reset time. */
export function nextQuestionText(resetsAt: string | null): string {
	const at = resetsAt ? new Date(resetsAt) : null;
	if (!at || Number.isNaN(at.getTime())) return "Check back in a few hours.";
	const time = at.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
	return at.toDateString() === new Date().toDateString() ? `Your next one is at ${time}.` : `Your next one is tomorrow at ${time}.`;
}
