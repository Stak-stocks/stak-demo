import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
	ApiError,
	getStakAiMessages,
	getStakAiUsage,
	sendStakAiFeedback,
	streamStakAiMessage,
	trackStakAiOpen,
	type StakAiChatReply,
	type StakAiContext,
	type StakAiSource,
	type StakAiUsage,
	type StakAiVia,
} from "@/lib/api";

/**
 * How a page opens STAK AI: set what it's opened from (plus a first question to ask, or one to leave in the box), or
 * a past conversation to reopen, then go to /stak-ai. The chat takes these once, when it mounts. Mirrors Android's
 * StakAiLauncher; kept in memory, so a reload opens a plain chat.
 */
export const stakAiLauncher: {
	context: StakAiContext | null;
	/** Asked as soon as the chat opens. */
	question: string | null;
	/** Left in the input box for the person to send (or change) - it costs a question, so it isn't sent for them. */
	draft: string | null;
	conversationId: string | null;
	/** The chat that was open when /stak-ai was left (for its history page, say): reopened on return. */
	resume: string | null;
	/** /stak-ai/history was opened from the chat, so going back returns to it. */
	historyFromChat: boolean;
	/** Where it was opened from, for the usage stats (header, stock, article, brief). */
	entry: Parameters<typeof trackStakAiOpen>[0] | null;
} = { context: null, question: null, draft: null, conversationId: null, resume: null, historyFromChat: false, entry: null };

export function resetStakAiLauncher() {
	stakAiLauncher.context = null;
	stakAiLauncher.question = null;
	stakAiLauncher.draft = null;
	stakAiLauncher.conversationId = null;
	stakAiLauncher.resume = null;
	stakAiLauncher.historyFromChat = false;
	stakAiLauncher.entry = null;
}

export const STAK_AI_USAGE_KEY = ["stakAi", "usage"] as const;
export const STAK_AI_CONVERSATIONS_KEY = ["stakAi", "conversations"] as const;
/** No text by now: report the answer as slow - it may still be saved and count, so the chat doesn't say it didn't. */
const SLOW_MS = 45_000;

/** The questions-left count, shared by every chat on screen (the /stak-ai page and the desktop panels). */
export function useStakAiUsage() {
	return useQuery({ queryKey: STAK_AI_USAGE_KEY, queryFn: getStakAiUsage, staleTime: 60_000 });
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
	/** An answer still being written (streamed); replaced by the finished one. */
	streaming?: boolean;
}

export type AiNotice =
	| { type: "limit"; resetsAt: string | null }
	| { type: "failed"; offline: boolean }
	| { type: "slow" }
	| { type: "loadFailed" };

interface Options {
	/** Take what the launcher holds (the /stak-ai page); embedded panels pass their own context instead. */
	fromLauncher?: boolean;
	/** For an embedded panel: the page it sits on. */
	context?: StakAiContext | null;
	/** The /stak-ai page: where it counts an open from when the launcher doesn't say (desktop's nav, a direct link). */
	defaultEntry?: Parameters<typeof trackStakAiOpen>[0];
}

class SlowAnswer extends Error {}

/**
 * STAK AI's chat state - the web twin of Android's StakAiViewModel. Context goes with the first question only; a
 * failed question is retried in place; out of questions hands the question back and unlocks itself when a slot
 * frees; nothing sends while a past chat loads; switching chats mid-answer leaves that answer in its own chat; a
 * deleted chat carries on in a fresh one.
 */
export function useStakAiChat({ fromLauncher = false, context: given = null, defaultEntry = "direct" }: Options = {}) {
	const qc = useQueryClient();
	const { data: usage = null } = useStakAiUsage();
	const [messages, setMessages] = useState<AiMessage[]>([]);
	const [context, setContext] = useState<StakAiContext | null>(() => (fromLauncher ? stakAiLauncher.context : given));
	const [sending, setSending] = useState(false);
	const [loading, setLoading] = useState(false);
	const [problem, setProblem] = useState<Exclude<AiNotice, { type: "limit" }> | null>(null);
	const [returnedDraft, setReturnedDraft] = useState<string | null>(null);

	const conversationId = useRef<string | null>(null);
	const openedId = useRef<string | null>(null);
	const contextSent = useRef(false);
	const contextRef = useRef(context);
	contextRef.current = context;
	const messagesRef = useRef(messages);
	messagesRef.current = messages;
	const nextKey = useRef(0);
	/** Bumped by open() and newChat(): a reply for an earlier chat no longer lands on screen. */
	const session = useRef(0);
	const busy = useRef({ sending: false, loading: false });
	const mounted = useRef(true);

	// A reply's count is the newest. A count fetch already in flight (the one on opening, say) would land after it
	// and put the older number back, so stop that fetch and write this count again once it has settled.
	const setUsage = useCallback((u: StakAiUsage | null | undefined) => {
		if (!u) return;
		qc.setQueryData(STAK_AI_USAGE_KEY, u);
		void qc.cancelQueries({ queryKey: STAK_AI_USAGE_KEY }, { revert: false }).finally(() => qc.setQueryData(STAK_AI_USAGE_KEY, u));
	}, [qc]);

	// Out of questions: check again when the oldest one drops out (30s at the soonest, in case clocks disagree), so
	// the box unlocks without a reload.
	useEffect(() => {
		if (!usage || usage.remaining > 0 || !usage.resetsAt) return;
		const wait = Math.max(Date.parse(usage.resetsAt) - Date.now() + 2_000, 30_000);
		const t = setTimeout(() => { void qc.invalidateQueries({ queryKey: STAK_AI_USAGE_KEY }); }, Math.min(wait, 2 ** 31 - 1));
		return () => clearTimeout(t);
	}, [usage, qc]);

	/** Stop whatever was in flight from landing here: the next reply or load belongs to a chat no longer shown. */
	const moveOn = () => {
		session.current++;
		busy.current = { sending: false, loading: false };
		setSending(false);
		setLoading(false);
	};

	const open = useCallback((id: string) => {
		moveOn();
		const mine = session.current;
		openedId.current = id;
		busy.current.loading = true;
		setLoading(true);
		setProblem(null);
		getStakAiMessages(id)
			.then((r) => {
				if (mine !== session.current) return;
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
			.catch(() => { if (mine === session.current) setProblem({ type: "loadFailed" }); })
			.finally(() => { if (mine === session.current) { busy.current.loading = false; setLoading(false); } });
	}, []);

	const ask = useCallback(async (question: string, allowRestart: boolean, mine: number, via: StakAiVia): Promise<void> => {
		let r: StakAiChatReply;
		const controller = new AbortController();
		let slow = false;
		// No text within SLOW_MS: stop waiting (the server keeps going and saves it, so the chat says "check back").
		let timer: ReturnType<typeof setTimeout> | undefined = setTimeout(() => { slow = true; controller.abort(); }, SLOW_MS);
		// The answer appears as it's written, in a line of its own that the finished answer replaces.
		const streamKey = nextKey.current++;
		try {
			r = await streamStakAiMessage(question, {
				conversationId: conversationId.current ?? undefined,
				context: contextSent.current ? undefined : contextRef.current ?? undefined,
				via,
				signal: controller.signal,
				onText: (soFar) => {
					clearTimeout(timer);
					timer = undefined;
					if (mine !== session.current) return;
					setMessages((ms) => {
						const line: AiMessage = { key: streamKey, fromUser: false, text: soFar, kind: "answer", followUps: [], sources: [], streaming: true };
						return ms.some((m) => m.key === streamKey) ? ms.map((m) => (m.key === streamKey ? line : m)) : [...ms, line];
					});
				},
			});
		} catch (e) {
			clearTimeout(timer);
			if (mine !== session.current) return;
			// A half-written answer that didn't finish comes off the screen; the question is marked unanswered.
			setMessages((ms) => ms.filter((m) => m.key !== streamKey));
			const body = e instanceof ApiError ? (e.body as { code?: string; usage?: StakAiUsage } | undefined) : undefined;
			if (body?.code === "not_found" && allowRestart && conversationId.current) {
				// The chat was deleted (from history) while open: carry on in a fresh one, asking the same question.
				conversationId.current = null;
				contextSent.current = false;
				return ask(question, false, mine, via);
			}
			if (body?.code === "limit_reached") {
				setUsage(body.usage);
				setMessages((ms) => ms.slice(0, -1));
				setReturnedDraft(question);
				return;
			}
			setMessages((ms) => ms.map((m, i) => (i === ms.length - 1 ? { ...m, failed: true } : m)));
			setProblem(slow ? { type: "slow" } : { type: "failed", offline: !(e instanceof ApiError) });
			return;
		}
		clearTimeout(timer);
		setUsage(r.usage);
		void qc.invalidateQueries({ queryKey: STAK_AI_CONVERSATIONS_KEY });
		if (mine !== session.current) return;
		contextSent.current = true;
		conversationId.current = r.conversationId;
		// Left the page before the first answer came back: reopen this chat on return.
		if (!mounted.current && fromLauncher && !stakAiLauncher.conversationId && !stakAiLauncher.context) stakAiLauncher.resume = r.conversationId;
		const finished: AiMessage = {
			key: streamKey, fromUser: false, text: r.response, id: r.messageId,
			kind: r.answerKind, followUps: r.followUps, sources: r.sources,
		};
		setMessages((ms) => (ms.some((m) => m.key === streamKey) ? ms.map((m) => (m.key === streamKey ? finished : m)) : [...ms, finished]));
	}, [qc, setUsage, fromLauncher]);

	const send = useCallback((text: string, via: StakAiVia = "typed") => {
		const question = text.trim();
		if (!question || busy.current.sending || busy.current.loading) return;
		busy.current.sending = true;
		const mine = session.current;
		// A resend replaces the failed line rather than repeating it.
		setMessages((ms) => [...ms.filter((m) => !m.failed), { key: nextKey.current++, fromUser: true, text: question, kind: "answer", followUps: [], sources: [] }]);
		setProblem(null);
		setSending(true);
		void ask(question, true, mine, via).finally(() => {
			if (mine !== session.current) return;
			busy.current.sending = false;
			setSending(false);
		});
	}, [ask]);

	/** Ask the failed question again. */
	const retry = useCallback(() => {
		const failed = [...messagesRef.current].reverse().find((m) => m.failed);
		if (failed) send(failed.text, "retry");
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

	/** Start over: a fresh conversation with no page context (an answer still on its way stays in its own chat). */
	const newChat = useCallback(() => {
		moveOn();
		setMessages([]);
		conversationId.current = null;
		openedId.current = null;
		contextSent.current = false;
		setContext(null);
		setProblem(null);
	}, []);

	const retryOpen = useCallback(() => { if (openedId.current) open(openedId.current); }, [open]);

	/** Takes the question handed back to the input box (out of questions, or left there by the page that opened this). */
	const consumeReturnedDraft = useCallback(() => {
		const d = returnedDraft;
		setReturnedDraft(null);
		return d;
	}, [returnedDraft]);

	// Mount: a past chat to reopen, a first question to ask, or a question to leave in the box.
	useEffect(() => {
		mounted.current = true;
		if (fromLauncher) {
			const reopen = stakAiLauncher.conversationId ?? stakAiLauncher.resume;
			const first = stakAiLauncher.question;
			const draft = stakAiLauncher.draft;
			// A fresh open (not a return from its own history page) counts toward the usage stats.
			if (!reopen) void trackStakAiOpen(stakAiLauncher.entry ?? defaultEntry);
			resetStakAiLauncher();
			if (reopen) open(reopen);
			else if (first) send(first);
			else if (draft) setReturnedDraft(draft);
		}
		return () => {
			mounted.current = false;
			// Leaving the page (to its history, say): come back to this conversation.
			if (fromLauncher && !stakAiLauncher.conversationId && !stakAiLauncher.context && conversationId.current) stakAiLauncher.resume = conversationId.current;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps -- once, on mount
	}, []);

	const outOfQuestions = (usage?.remaining ?? 1) <= 0;
	const notice: AiNotice | null = problem ?? (outOfQuestions && usage ? { type: "limit", resetsAt: usage.resetsAt } : null);
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

/** "You get 5 questions every 6 hours…" - from the live limit, so the copy can't drift from the server. */
export function limitRule(limit: number | undefined): string {
	return `You get ${limit ?? 5} questions every 6 hours. When STAK AI can't help, or asks you something back, it doesn't count.`;
}
