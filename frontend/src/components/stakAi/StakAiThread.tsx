import { forwardRef, memo, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import { ArrowRight, ArrowUp, Sparkles, ThumbsDown, ThumbsUp } from "lucide-react";
import { DISC, cu } from "@/components/discover/discoverTheme";
import { DESK, deskFocus } from "@/components/desktop/deskKit";
import { PRESS, focusRing } from "@/components/phone/phone";
import { useBrandsList } from "@/hooks/useBrandsList";
import { limitRule, nextQuestionText, starterQuestions, type AiMessage, type AiNotice, type StakAiChat } from "./useStakAiChat";
import type { StakAiContext } from "@/lib/api";

const USER_BUBBLE = "#1C3A4A";
const WARN = "#E5A54B";

/** Sizes in the phone's scaled units (cu) or plain desktop pixels, and each side's colours and focus treatment. */
type Variant = "phone" | "desktop";
interface Look {
	s: (n: number) => string;
	card: string;
	raised: string;
	border: string;
	body: string;
	/** Focus ring classes; the phone adds the press dim (PRESS) and its ring colour via `ring`. */
	focus: string;
	ring: CSSProperties;
}
const LOOKS: Record<Variant, Look> = {
	phone: { s: (n) => cu(n), card: DISC.cardDark, raised: DISC.surfaceAlt, border: DISC.cardBorder, body: DISC.body, focus: PRESS, ring: focusRing },
	desktop: { s: (n) => `${n}px`, card: DESK.panel, raised: DESK.panelRaised, border: DESK.border, body: DESK.body, focus: deskFocus, ring: {} },
};
/** Every tap target is at least this tall (WCAG / Android's 48dp minimum, rounded for the web). */
const TAP = 44;

// ── Formatting ──────────────────────────────────────────────────────────────

export type MdBlock = { type: "p"; text: string } | { type: "ul"; items: string[] };
const isBullet = (line: string) => /^([-*•])\s/.test(line);

/** An answer split into paragraphs and bullet lists - grouped line by line, so "Here's why:\n- a\n- b" keeps its list. */
export function parseMarkdown(text: string): MdBlock[] {
	const out: MdBlock[] = [];
	for (const block of text.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean)) {
		let para: string[] = [];
		let items: string[] = [];
		const flushPara = () => { if (para.length) out.push({ type: "p", text: para.join(" ") }); para = []; };
		const flushItems = () => { if (items.length) out.push({ type: "ul", items }); items = []; };
		for (const line of block.split("\n").map((l) => l.trim()).filter(Boolean)) {
			if (isBullet(line)) { flushPara(); items.push(line.slice(2).trim()); } else { flushItems(); para.push(line); }
		}
		flushPara();
		flushItems();
	}
	return out;
}

/** "**this**" → bold; an unclosed marker stays as text. */
export function BoldText({ text }: { text: string }) {
	const parts: ReactNode[] = [];
	let rest = text;
	let i = 0;
	for (;;) {
		const start = rest.indexOf("**");
		const end = start >= 0 ? rest.indexOf("**", start + 2) : -1;
		if (start < 0 || end < 0) { parts.push(rest); break; }
		parts.push(rest.slice(0, start), <strong key={i++} className="font-semibold text-white">{rest.slice(start + 2, end)}</strong>);
		rest = rest.slice(end + 2);
	}
	return <>{parts}</>;
}

/**
 * A streaming answer, minus what would flash and then change: an unclosed "**" (shown as bold only once it closes) and
 * a list marker on a line that has nothing after it yet.
 */
export function tidyStreaming(text: string): string {
	let t = text.replace(/\n[ \t]*[-*•]?[ \t]*$/, "");
	if ((t.match(/\*\*/g)?.length ?? 0) % 2 === 1) {
		const at = t.lastIndexOf("**");
		t = t.slice(0, at) + t.slice(at + 2);
	}
	return t.replace(/(?<!\*)\*$/, "");
}

function AiMarkdown({ text, look, streaming = false }: { text: string; look: Look; streaming?: boolean }) {
	const { s } = look;
	const blocks = useMemo(() => parseMarkdown(streaming ? tidyStreaming(text) : text), [text, streaming]);
	const body: CSSProperties = { fontSize: s(14), lineHeight: s(21), color: look.body };
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: s(8) }}>
			{blocks.map((b, i) =>
				b.type === "p"
					? <p key={i} style={body}><BoldText text={b.text} /></p>
					: (
						<ul key={i} style={{ display: "flex", flexDirection: "column", gap: s(4) }}>
							{b.items.map((item, j) => (
								<li key={j} className="flex" style={body}>
									<span aria-hidden="true" style={{ color: DISC.teal, marginRight: s(8) }}>•</span>
									<span><BoldText text={item} /></span>
								</li>
							))}
						</ul>
					),
			)}
		</div>
	);
}

// ── The thread ──────────────────────────────────────────────────────────────

/**
 * STAK AI's conversation: messages (with sources, thumbs and follow-ups), notices, and the input with the questions
 * left and a fixed "educational, not financial advice" line. The phone draws it in scaled units, desktop in pixels.
 */
export function StakAiThread({ chat, variant, autoFocus = false, emptyTitle = "Ask STAK AI", starters, compact = false }: {
	chat: StakAiChat;
	variant: Variant;
	autoFocus?: boolean;
	emptyTitle?: string;
	/** Starting questions in place of the context's own (a panel's suggestions). */
	starters?: string[];
	/** Inside a panel: no big empty-state heading, just the questions. */
	compact?: boolean;
}) {
	const look = LOOKS[variant];
	const { s } = look;
	const scroller = useRef<HTMLDivElement>(null);
	const composer = useRef<ComposerHandle>(null);
	const { data: brandsList } = useBrandsList();
	const nameOf = (t: string) => brandsList?.find((b) => b.ticker === t)?.name ?? t;

	// Keep the newest line in view: jump when a past chat loads, glide as the conversation grows, and follow an answer
	// as it's written - unless the person has scrolled up to read, when the view stays where they put it.
	const wasLoading = useRef(false);
	const nearBottom = useRef(true);
	const shownCount = useRef(0);
	const last = chat.messages.at(-1);
	const streaming = !!last?.streaming;
	useLayoutEffect(() => {
		const el = scroller.current;
		// Asking, or a past chat opening, always brings the bottom into view; anything else (words arriving, the
		// finished answer's thumbs and follow-ups) only for someone already there.
		const asked = chat.messages.length > shownCount.current && !!last?.fromUser;
		const opened = wasLoading.current && !chat.loading;
		if (el && (asked || opened || nearBottom.current)) {
			const instant = opened || streaming || matchMedia?.("(prefers-reduced-motion: reduce)").matches;
			el.scrollTo?.({ top: el.scrollHeight, behavior: instant ? "auto" : "smooth" });
			nearBottom.current = true;
		}
		shownCount.current = chat.messages.length;
		wasLoading.current = chat.loading;
	}, [chat.messages.length, chat.sending, chat.loading, last?.text.length, streaming, last?.fromUser]);
	const onScroll = () => {
		const el = scroller.current;
		if (el) nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
	};

	// Tapping a suggestion or follow-up removes the button that had focus: put focus in the box instead. Stable, so
	// finished answers don't re-render while a new one streams in.
	const send = chat.send;
	const askStarter = useCallback((q: string) => { send(q, "starter"); composer.current?.focus(); }, [send]);
	const askFollowUp = useCallback((q: string) => { send(q, "followup"); composer.current?.focus(); }, [send]);
	const lastAnswerKey = useMemo(() => [...chat.messages].reverse().find((m) => !m.fromUser)?.key, [chat.messages]);
	const failedOffline = chat.notice?.type === "failed" && chat.notice.offline;

	return (
		<div className="flex min-h-0 flex-1 flex-col">
			{/* role="log" is a polite live region: answers added here are announced. A streaming answer is only "STAK AI is
			    answering" to screen readers; its words arrive as new nodes once finished, so they're read once, whole. */}
			<div ref={scroller} onScroll={onScroll} role="log" aria-label="STAK AI conversation" className="min-h-0 flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none]" style={{ padding: `${s(12)} ${s(20)} ${s(16)}` }}>
				<div style={{ display: "flex", flexDirection: "column", gap: s(16) }}>
					{chat.messages.length === 0 && !chat.loading && !chat.sending && chat.notice?.type !== "loadFailed" && (
						<EmptyState title={emptyTitle} context={chat.context} enabled={chat.canAsk} limit={chat.usage?.limit} nameOf={nameOf} look={look} onAsk={askStarter} starters={starters} compact={compact} />
					)}
					{chat.messages.map((m) =>
						m.fromUser
							? <UserLine key={m.key} m={m} offline={failedOffline} look={look} />
							: <AnswerLine key={m.key} m={m} look={look} showFollowUps={m.key === lastAnswerKey && chat.canAsk} onRate={chat.rate} onFollowUp={askFollowUp} />,
					)}
					{chat.loading && <p style={{ fontSize: s(13), color: DISC.muted }}>Loading chat…</p>}
					{/* The dots until the first words arrive; then the answer writes itself out. */}
					{chat.sending && !chat.messages.at(-1)?.streaming && <TypingDots s={s} />}
				</div>
			</div>

			{chat.notice && <NoticeBar notice={chat.notice} limit={chat.usage?.limit} look={look} onRetry={chat.retry} onRetryOpen={chat.retryOpen} onNewChat={chat.newChat} />}

			<Composer ref={composer} chat={chat} look={look} variant={variant} autoFocus={autoFocus} />
		</div>
	);
}

interface ComposerHandle { focus: () => void }

/** The input, the questions left and the disclaimer. Holds the draft, so typing doesn't re-render the conversation. */
const Composer = forwardRef<ComposerHandle, { chat: StakAiChat; look: Look; variant: Variant; autoFocus: boolean }>(function Composer({ chat, look, variant, autoFocus }, ref) {
	const { s } = look;
	const [draft, setDraft] = useState("");
	const box = useRef<HTMLTextAreaElement>(null);
	useImperativeHandle(ref, () => ({ focus: () => box.current?.focus() }), []);

	// A question handed back (out of questions) or left by the page that opened the chat comes into the box.
	useEffect(() => {
		if (!chat.returnedDraft) return;
		const d = chat.consumeReturnedDraft();
		if (d) setDraft((cur) => cur || d);
	}, [chat.returnedDraft, chat.consumeReturnedDraft]);
	useLayoutEffect(() => {
		const el = box.current;
		if (!el) return;
		el.style.height = "auto";
		el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
	}, [draft]);

	const ready = !!draft.trim() && chat.canAsk;
	const submit = () => {
		if (!ready) return;
		chat.send(draft);
		setDraft("");
	};
	const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
		// Enter sends; Shift+Enter makes a new line.
		if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); submit(); }
	};
	const left = chat.usage?.remaining;

	return (
		<div style={{ padding: `${s(8)} ${s(20)}`, paddingBottom: variant === "phone" ? `max(${s(10)}, env(safe-area-inset-bottom))` : s(14) }}>
			<div className="flex items-end focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#69B3CA]" style={{ borderRadius: s(22), background: look.raised, border: `1px solid ${look.border}`, padding: `${s(2)} ${s(2)} ${s(2)} ${s(16)}` }}>
				<textarea
					ref={box}
					rows={1}
					value={draft}
					onChange={(e) => setDraft(e.target.value.slice(0, 1000))}
					onKeyDown={onKeyDown}
					disabled={chat.outOfQuestions || chat.loading}
					placeholder={chat.outOfQuestions ? "You're out of questions for now" : "Ask about a stock, the news or a term…"}
					aria-label="Ask STAK AI"
					autoFocus={autoFocus}
					autoCapitalize="sentences"
					className="min-w-0 flex-1 resize-none bg-transparent text-white outline-none placeholder:text-[#819ABB] disabled:cursor-not-allowed"
					style={{ fontSize: s(14), lineHeight: s(20), padding: `${s(12)} 0`, maxHeight: 120 }}
				/>
				<button
					type="button"
					onClick={submit}
					disabled={!ready}
					aria-label="Send"
					className={`grid shrink-0 place-items-center rounded-full disabled:cursor-not-allowed ${look.focus}`}
					style={{ width: TAP, height: TAP, ...look.ring }}
				>
					<span className="grid place-items-center rounded-full transition-colors" style={{ width: s(36), height: s(36), background: ready ? DISC.teal : look.border, color: ready ? DISC.pageBg : DISC.muted }}>
						<ArrowUp style={{ width: s(18), height: s(18) }} aria-hidden="true" />
					</span>
				</button>
			</div>
			<div className="flex justify-between" style={{ marginTop: s(6), fontSize: s(11), color: DISC.muted }}>
				<span>Educational, not financial advice.</span>
				{chat.usage && <span style={{ color: chat.usage.remaining <= 1 ? WARN : DISC.muted }}>{chat.usage.remaining} of {chat.usage.limit} questions left</span>}
			</div>
			{/* Say it out loud when the count gets low; the line above changes silently. */}
			<span className="sr-only" aria-live="polite">{left === 1 ? "One question left." : left === 0 ? "No questions left for now." : ""}</span>
		</div>
	);
});

function EmptyState({ title, context, enabled, limit, nameOf, look, onAsk, starters, compact }: {
	title: string; context: StakAiContext | null; enabled: boolean; limit?: number; nameOf: (t: string) => string; look: Look; onAsk: (q: string) => void; starters?: string[]; compact?: boolean;
}) {
	const { s } = look;
	const questions = starters ?? starterQuestions(context, nameOf);
	const rule = <p style={{ fontSize: s(11), lineHeight: s(16), color: DISC.muted, marginTop: s(compact ? 4 : 16), padding: compact ? 0 : `0 ${s(8)}` }}>{limitRule(limit)}</p>;
	if (compact) {
		return (
			<div className="flex flex-col" style={{ gap: s(8) }}>
				{questions.map((q) => <StarterButton key={q} q={q} enabled={enabled} look={look} onAsk={onAsk} />)}
				{rule}
			</div>
		);
	}
	return (
		<div className="flex flex-col items-center text-center" style={{ paddingTop: s(24) }}>
			<span className="grid place-items-center rounded-full" style={{ width: s(56), height: s(56), background: look.card }} aria-hidden="true">
				<Sparkles style={{ width: s(26), height: s(26), color: DISC.teal }} />
			</span>
			<h2 className="font-semibold text-white" style={{ fontSize: s(20), marginTop: s(14) }}>{title}</h2>
			<p style={{ fontSize: s(13), lineHeight: s(19), color: DISC.muted, marginTop: s(6), padding: `0 ${s(12)}` }}>Plain-English answers about stocks, the news and investing terms.</p>
			<div className="flex w-full flex-col" style={{ gap: s(8), marginTop: s(22) }}>
				{questions.map((q) => <StarterButton key={q} q={q} enabled={enabled} look={look} onAsk={onAsk} />)}
			</div>
			{rule}
		</div>
	);
}

function StarterButton({ q, enabled, look, onAsk }: { q: string; enabled: boolean; look: Look; onAsk: (q: string) => void }) {
	const { s } = look;
	return (
		<button
			type="button"
			disabled={!enabled}
			onClick={() => onAsk(q)}
			className={`flex items-center text-left transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 ${look.focus}`}
			style={{ minHeight: TAP + 4, borderRadius: s(12), background: look.card, border: `1px solid ${look.border}`, padding: `${s(10)} ${s(14)}`, fontSize: s(13), fontWeight: 500, color: "#fff", ...look.ring }}
		>
			<span className="flex-1">{q}</span>
			<ArrowRight style={{ width: s(16), height: s(16), color: DISC.teal }} aria-hidden="true" />
		</button>
	);
}

function UserLine({ m, offline, look }: { m: AiMessage; offline: boolean; look: Look }) {
	const { s } = look;
	return (
		<div className="flex flex-col items-end">
			<p className="whitespace-pre-wrap text-white" style={{ maxWidth: "80%", fontSize: s(14), lineHeight: s(20), background: USER_BUBBLE, borderRadius: `${s(16)} ${s(16)} ${s(4)} ${s(16)}`, padding: `${s(10)} ${s(14)}`, opacity: m.failed ? 0.6 : 1 }}>
				{m.text}
			</p>
			{m.failed && <span style={{ fontSize: s(11), color: WARN, marginTop: s(4) }}>{offline ? "Not sent" : "No answer"}</span>}
		</div>
	);
}

/** One answer. Memoised: it only re-renders when its own message (or whether it shows follow-ups) changes. */
const AnswerLine = memo(function AnswerLine({ m, look, showFollowUps, onRate, onFollowUp }: { m: AiMessage; look: Look; showFollowUps: boolean; onRate: (m: AiMessage, v: 1 | -1) => void; onFollowUp: (q: string) => void }) {
	const { s } = look;
	const source: CSSProperties = { minHeight: TAP, fontSize: s(12), lineHeight: s(17), color: look.body };
	return (
		<div className="flex flex-col" style={{ gap: s(8) }}>
			<div className="flex items-center" style={{ gap: s(6) }}>
				<span className="grid place-items-center rounded-full" style={{ width: s(22), height: s(22), background: look.card }} aria-hidden="true">
					<Sparkles style={{ width: s(12), height: s(12), color: DISC.teal }} />
				</span>
				<span className="font-semibold" style={{ fontSize: s(12), color: DISC.muted }}>STAK AI</span>
			</div>
			{m.streaming ? (
				<>
					<span className="sr-only">STAK AI is answering…</span>
					<div aria-hidden="true" className="flex flex-col" style={{ gap: s(8) }}>
						<AiMarkdown text={m.text} look={look} streaming />
						{/* Still being written: a soft caret (steady under reduced motion). */}
						<span className="inline-block animate-pulse motion-reduce:animate-none" style={{ width: s(8), height: s(16), borderRadius: 2, background: DISC.teal, marginTop: s(-4) }} />
					</div>
				</>
			) : (
				<div style={{ opacity: m.cutOff ? 0.6 : 1 }}>
					<AiMarkdown text={m.text} look={look} streaming={m.cutOff} />
				</div>
			)}
			{m.cutOff && <p style={{ fontSize: s(11), color: WARN }}>Cut off. The full answer may be in your chats.</p>}
			{m.kind !== "answer" && <p style={{ fontSize: s(11), color: DISC.muted }}>This one didn't count toward your questions.</p>}
			{m.sources.length > 0 && (
				<div style={{ borderRadius: s(12), background: look.card, padding: `${s(6)} ${s(12)}` }}>
					<p className="font-semibold" style={{ fontSize: s(10), letterSpacing: s(1), color: DISC.muted, padding: `${s(4)} 0` }}>BASED ON</p>
					<ul>
						{m.sources.map((src) => {
							const line = <span><span className="font-semibold" style={{ color: DISC.teal }}>{src.ticker}</span>&nbsp; {src.headline}</span>;
							return (
								<li key={`${src.ticker}-${src.headline}`}>
									{src.url
										? <a href={src.url} target="_blank" rel="noopener noreferrer" className={`flex items-center rounded-md hover:underline ${look.focus}`} style={{ ...source, ...look.ring }}>{line}</a>
										: <p className="flex items-center" style={source}>{line}</p>}
								</li>
							);
						})}
					</ul>
				</div>
			)}
			{m.id != null && m.kind === "answer" && (
				<div className="flex" style={{ marginLeft: -10 }}>
					<ThumbButton label="Helpful" pressed={m.feedback === 1} onClick={() => onRate(m, 1)} look={look}><ThumbsUp style={{ width: s(16), height: s(16) }} fill={m.feedback === 1 ? "currentColor" : "none"} aria-hidden="true" /></ThumbButton>
					<ThumbButton label="Not helpful" pressed={m.feedback === -1} onClick={() => onRate(m, -1)} look={look}><ThumbsDown style={{ width: s(16), height: s(16) }} fill={m.feedback === -1 ? "currentColor" : "none"} aria-hidden="true" /></ThumbButton>
				</div>
			)}
			{showFollowUps && m.followUps.length > 0 && (
				<div className="flex flex-wrap" style={{ gap: s(8) }}>
					{m.followUps.map((q) => (
						<button key={q} type="button" onClick={() => onFollowUp(q)} className={`flex items-center rounded-full transition-colors hover:bg-white/[0.05] ${look.focus}`} style={{ minHeight: TAP, border: "1px solid rgba(105,179,202,0.45)", padding: `0 ${s(14)}`, fontSize: s(12), color: DISC.teal, ...look.ring }}>
							{q}
						</button>
					))}
				</div>
			)}
		</div>
	);
});

function ThumbButton({ label, pressed, onClick, look, children }: { label: string; pressed: boolean; onClick: () => void; look: Look; children: ReactNode }) {
	return (
		<button type="button" onClick={onClick} aria-label={label} aria-pressed={pressed} className={`grid place-items-center rounded-full transition-colors hover:bg-white/[0.05] ${look.focus}`} style={{ width: TAP, height: TAP, color: pressed ? DISC.teal : DISC.muted, ...look.ring }}>
			{children}
		</button>
	);
}

/** Pulsing dots while the answer is on its way (decorative: the log announces the answer itself). */
function TypingDots({ s }: { s: (n: number) => string }) {
	return (
		<div className="flex" style={{ gap: s(5), padding: `${s(6)} 0` }} aria-hidden="true">
			{[0, 150, 300].map((delay) => (
				<span key={delay} className="animate-pulse rounded-full motion-reduce:animate-none" style={{ width: s(7), height: s(7), background: DISC.teal, animationDelay: `${delay}ms` }} />
			))}
		</div>
	);
}

function NoticeBar({ notice, limit, look, onRetry, onRetryOpen, onNewChat }: { notice: AiNotice; limit?: number; look: Look; onRetry: () => void; onRetryOpen: () => void; onNewChat: () => void }) {
	const { s } = look;
	const text = notice.type === "limit"
		? `You've used your ${limit ?? 5} questions for now. ${nextQuestionText(notice.resetsAt)}`
		: notice.type === "failed"
			? notice.offline ? "You're offline, so that didn't send. It didn't count." : "STAK AI couldn't answer just now. That one didn't count."
			: notice.type === "slow"
				? "STAK AI is taking longer than usual. Check your chats in a moment before asking again."
				: "Couldn't open that chat.";
	const action = (label: string, onClick: () => void) => (
		<button type="button" onClick={onClick} className={`shrink-0 rounded-md font-semibold ${look.focus}`} style={{ minHeight: TAP, padding: `0 ${s(10)}`, fontSize: s(12), color: DISC.teal, ...look.ring }}>{label}</button>
	);
	return (
		<div role="status" className="flex items-center" style={{ margin: `0 ${s(20)}`, borderRadius: s(12), background: look.card, padding: `0 ${s(4)} 0 ${s(14)}` }}>
			<p className="flex-1" style={{ fontSize: s(12), lineHeight: s(17), color: look.body, padding: `${s(10)} 0` }}>{text}</p>
			{notice.type === "failed" && action("Try again", onRetry)}
			{notice.type === "loadFailed" && <>{action("Try again", onRetryOpen)}{action("New chat", onNewChat)}</>}
		</div>
	);
}

/** "Asking about NVIDIA" - what the chat was opened from. */
export function ContextChip({ context, variant }: { context: StakAiContext; variant: Variant }) {
	const { s, card, body } = LOOKS[variant];
	const { data: brandsList } = useBrandsList();
	const label = context.type === "stock"
		? `Asking about ${brandsList?.find((b) => b.ticker === context.ticker)?.name ?? context.ticker}`
		: context.type === "article" ? `About: ${context.headline}` : "About today's Daily Brief";
	return (
		<p className="flex max-w-full items-center self-start overflow-hidden" style={{ gap: s(6), margin: `0 ${s(20)}`, borderRadius: s(14), background: card, padding: `${s(6)} ${s(12)}`, fontSize: s(12), color: body }}>
			<span className="shrink-0 rounded-full" style={{ width: s(6), height: s(6), background: DISC.teal }} aria-hidden="true" />
			<span className="truncate">{label}</span>
		</p>
	);
}

/** The way into STAK AI from a page (an article, a stock, the Daily Brief): opens the chat with that page as context. */
export function AskAiCard({ title, subtitle, onOpen, variant }: { title: string; subtitle: string; onOpen: () => void; variant: Variant }) {
	const look = LOOKS[variant];
	const { s } = look;
	return (
		<button
			type="button"
			onClick={onOpen}
			className={`flex w-full items-center text-left transition-colors hover:bg-white/[0.03] ${look.focus}`}
			style={{ gap: s(12), borderRadius: s(14), background: look.card, border: "1px solid rgba(105,179,202,0.35)", padding: `${s(12)} ${s(14)}`, ...look.ring }}
		>
			<span className="grid shrink-0 place-items-center rounded-full" style={{ width: s(34), height: s(34), background: look.raised }} aria-hidden="true">
				<Sparkles style={{ width: s(17), height: s(17), color: DISC.teal }} />
			</span>
			<span className="flex min-w-0 flex-1 flex-col" style={{ gap: s(2) }}>
				<span className="font-semibold text-white" style={{ fontSize: s(14) }}>{title}</span>
				<span style={{ fontSize: s(12), lineHeight: s(16), color: DISC.muted }}>{subtitle}</span>
			</span>
			<ArrowRight style={{ width: s(18), height: s(18), color: DISC.teal }} aria-hidden="true" />
		</button>
	);
}
