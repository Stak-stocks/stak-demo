import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import { ArrowRight, ArrowUp, Sparkles, ThumbsDown, ThumbsUp } from "lucide-react";
import { DISC, cu } from "@/components/discover/discoverTheme";
import { DESK, deskFocus } from "@/components/desktop/deskKit";
import { useBrandsList } from "@/hooks/useBrandsList";
import { nextQuestionText, starterQuestions, type AiMessage, type AiNotice, type StakAiChat } from "./useStakAiChat";
import type { StakAiContext } from "@/lib/api";

const USER_BUBBLE = "#1C3A4A";
const WARN = "#E5A54B";
const FOCUS = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#69B3CA]";

/** Sizes in the phone's scaled units (cu) or plain desktop pixels. */
type Variant = "phone" | "desktop";
const sizer = (v: Variant) => (n: number) => (v === "phone" ? cu(n) : `${n}px`);

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

function AiMarkdown({ text, s }: { text: string; s: (n: number) => string }) {
	const blocks = parseMarkdown(text);
	const body: CSSProperties = { fontSize: s(14), lineHeight: s(21), color: DISC.body };
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
	const s = sizer(variant);
	const scroller = useRef<HTMLDivElement>(null);
	const [draft, setDraft] = useState("");
	const { data: brandsList } = useBrandsList();
	const nameOf = (t: string) => brandsList?.find((b) => b.ticker === t)?.name ?? t;

	// A question that couldn't be asked comes back into the box.
	useEffect(() => {
		if (!chat.returnedDraft) return;
		const d = chat.consumeReturnedDraft();
		if (d) setDraft((cur) => cur || d);
	}, [chat.returnedDraft, chat]);
	// Keep the newest line in view.
	useLayoutEffect(() => {
		const el = scroller.current;
		el?.scrollTo?.({ top: el.scrollHeight, behavior: "smooth" });
	}, [chat.messages.length, chat.sending, chat.loading]);

	const submit = () => {
		if (!draft.trim() || !chat.canAsk) return;
		chat.send(draft);
		setDraft("");
	};
	const lastAnswer = [...chat.messages].reverse().find((m) => !m.fromUser);

	return (
		<div className="flex min-h-0 flex-1 flex-col">
			<div ref={scroller} role="log" aria-live="polite" aria-label="STAK AI conversation" className="min-h-0 flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none]" style={{ padding: `${s(12)} ${s(20)} ${s(16)}` }}>
				<div style={{ display: "flex", flexDirection: "column", gap: s(16) }}>
					{chat.messages.length === 0 && !chat.loading && !chat.sending && chat.notice?.type !== "loadFailed" && (
						<EmptyState title={emptyTitle} context={chat.context} enabled={chat.canAsk} nameOf={nameOf} s={s} onAsk={chat.send} starters={starters} compact={compact} />
					)}
					{chat.messages.map((m) =>
						m.fromUser
							? <UserLine key={m.key} m={m} offline={chat.notice?.type === "failed" && chat.notice.offline} s={s} />
							: <AnswerLine key={m.key} m={m} s={s} showFollowUps={m.key === lastAnswer?.key && chat.canAsk} onRate={(v) => chat.rate(m, v)} onFollowUp={chat.send} />,
					)}
					{chat.loading && <p style={{ fontSize: s(13), color: DISC.muted }}>Loading chat…</p>}
					{chat.sending && <TypingDots s={s} />}
				</div>
			</div>

			{chat.notice && <NoticeBar notice={chat.notice} s={s} onRetry={chat.retry} onRetryOpen={chat.retryOpen} onNewChat={chat.newChat} />}

			<div style={{ padding: `${s(8)} ${s(20)} ${s(variant === "phone" ? 10 : 14)}` }}>
				<div className="flex items-end" style={{ borderRadius: s(22), background: variant === "phone" ? "#172037" : DESK.panelRaised, border: `1px solid ${variant === "phone" ? "#243049" : DESK.border}`, padding: `${s(4)} ${s(4)} ${s(4)} ${s(16)}` }}>
					<AutoGrowTextarea
						value={draft}
						onChange={setDraft}
						onSubmit={submit}
						disabled={chat.outOfQuestions || chat.loading}
						placeholder={chat.outOfQuestions ? "You're out of questions for now" : "Ask about a stock, the news or a term…"}
						autoFocus={autoFocus}
						s={s}
					/>
					<button
						type="button"
						onClick={submit}
						disabled={!draft.trim() || !chat.canAsk}
						aria-label="Send"
						className={`grid shrink-0 place-items-center rounded-full transition-colors disabled:cursor-not-allowed ${FOCUS}`}
						style={{ width: s(40), height: s(40), background: draft.trim() && chat.canAsk ? DISC.teal : "#243049", color: draft.trim() && chat.canAsk ? DISC.pageBg : DISC.muted }}
					>
						<ArrowUp style={{ width: s(18), height: s(18) }} aria-hidden="true" />
					</button>
				</div>
				<div className="flex justify-between" style={{ marginTop: s(6), fontSize: s(11), color: DISC.muted }}>
					<span>Educational, not financial advice.</span>
					{chat.usage && <span style={{ color: chat.usage.remaining <= 1 ? WARN : DISC.muted }}>{chat.usage.remaining} of {chat.usage.limit} questions left</span>}
				</div>
			</div>
		</div>
	);
}

function AutoGrowTextarea({ value, onChange, onSubmit, disabled, placeholder, autoFocus, s }: {
	value: string; onChange: (v: string) => void; onSubmit: () => void; disabled: boolean; placeholder: string; autoFocus: boolean; s: (n: number) => string;
}) {
	const ref = useRef<HTMLTextAreaElement>(null);
	useLayoutEffect(() => {
		const el = ref.current;
		if (!el) return;
		el.style.height = "auto";
		el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
	}, [value]);
	const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
		// Enter sends; Shift+Enter makes a new line.
		if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); onSubmit(); }
	};
	return (
		<textarea
			ref={ref}
			rows={1}
			value={value}
			onChange={(e) => onChange(e.target.value.slice(0, 1000))}
			onKeyDown={onKeyDown}
			disabled={disabled}
			placeholder={placeholder}
			aria-label="Ask STAK AI"
			autoFocus={autoFocus}
			autoCapitalize="sentences"
			className="min-w-0 flex-1 resize-none bg-transparent text-white outline-none placeholder:text-[#819ABB] disabled:cursor-not-allowed"
			style={{ fontSize: s(14), lineHeight: s(20), padding: `${s(10)} 0`, maxHeight: 120 }}
		/>
	);
}

function EmptyState({ title, context, enabled, nameOf, s, onAsk, starters, compact }: { title: string; context: StakAiContext | null; enabled: boolean; nameOf: (t: string) => string; s: (n: number) => string; onAsk: (q: string) => void; starters?: string[]; compact?: boolean }) {
	const questions = starters ?? starterQuestions(context, nameOf);
	if (compact) {
		return (
			<div className="flex flex-col" style={{ gap: s(8) }}>
				{questions.map((q) => <StarterButton key={q} q={q} enabled={enabled} s={s} onAsk={onAsk} />)}
				<p style={{ fontSize: s(11), lineHeight: s(16), color: DISC.muted, marginTop: s(4) }}>5 questions every 6 hours. When STAK AI can't help, or asks you something back, it doesn't count.</p>
			</div>
		);
	}
	return (
		<div className="flex flex-col items-center text-center" style={{ paddingTop: s(24) }}>
			<span className="grid place-items-center rounded-full" style={{ width: s(56), height: s(56), background: DISC.cardDark }} aria-hidden="true">
				<Sparkles style={{ width: s(26), height: s(26), color: DISC.teal }} />
			</span>
			<h2 className="font-semibold text-white" style={{ fontSize: s(20), marginTop: s(14) }}>{title}</h2>
			<p style={{ fontSize: s(13), lineHeight: s(19), color: DISC.muted, marginTop: s(6), padding: `0 ${s(12)}` }}>Plain-English answers about stocks, the news and investing terms.</p>
			<div className="flex w-full flex-col" style={{ gap: s(8), marginTop: s(22) }}>
				{questions.map((q) => <StarterButton key={q} q={q} enabled={enabled} s={s} onAsk={onAsk} />)}
			</div>
			<p style={{ fontSize: s(11), lineHeight: s(16), color: DISC.muted, marginTop: s(16), padding: `0 ${s(8)}` }}>
				You get 5 questions every 6 hours. When STAK AI can't help, or asks you something back, it doesn't count.
			</p>
		</div>
	);
}

function StarterButton({ q, enabled, s, onAsk }: { q: string; enabled: boolean; s: (n: number) => string; onAsk: (q: string) => void }) {
	return (
		<button
			type="button"
			disabled={!enabled}
			onClick={() => onAsk(q)}
			className={`flex items-center text-left transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS}`}
			style={{ minHeight: 48, borderRadius: s(12), background: DISC.cardDark, border: "1px solid #243049", padding: `${s(10)} ${s(14)}`, fontSize: s(13), fontWeight: 500, color: "#fff" }}
		>
			<span className="flex-1">{q}</span>
			<ArrowRight style={{ width: s(16), height: s(16), color: DISC.teal }} aria-hidden="true" />
		</button>
	);
}

function UserLine({ m, offline, s }: { m: AiMessage; offline: boolean; s: (n: number) => string }) {
	return (
		<div className="flex flex-col items-end">
			<p className="whitespace-pre-wrap text-white" style={{ maxWidth: "80%", fontSize: s(14), lineHeight: s(20), background: USER_BUBBLE, borderRadius: `${s(16)} ${s(16)} ${s(4)} ${s(16)}`, padding: `${s(10)} ${s(14)}`, opacity: m.failed ? 0.6 : 1 }}>
				{m.text}
			</p>
			{m.failed && <span style={{ fontSize: s(11), color: WARN, marginTop: s(4) }}>{offline ? "Not sent" : "No answer"}</span>}
		</div>
	);
}

function AnswerLine({ m, s, showFollowUps, onRate, onFollowUp }: { m: AiMessage; s: (n: number) => string; showFollowUps: boolean; onRate: (v: 1 | -1) => void; onFollowUp: (q: string) => void }) {
	return (
		<div className="flex flex-col" style={{ gap: s(8) }}>
			<div className="flex items-center" style={{ gap: s(6) }}>
				<span className="grid place-items-center rounded-full" style={{ width: s(22), height: s(22), background: DISC.cardDark }} aria-hidden="true">
					<Sparkles style={{ width: s(12), height: s(12), color: DISC.teal }} />
				</span>
				<span className="font-semibold" style={{ fontSize: s(12), color: DISC.muted }}>STAK AI</span>
			</div>
			<AiMarkdown text={m.text} s={s} />
			{m.kind !== "answer" && <p style={{ fontSize: s(11), color: DISC.muted }}>This one didn't count toward your questions.</p>}
			{m.sources.length > 0 && (
				<div style={{ borderRadius: s(12), background: DISC.cardDark, padding: `${s(6)} ${s(12)}` }}>
					<p className="font-semibold" style={{ fontSize: s(10), letterSpacing: s(1), color: DISC.muted, padding: `${s(4)} 0` }}>BASED ON</p>
					<ul>
						{m.sources.map((src) => (
							<li key={`${src.ticker}-${src.headline}`}>
								{src.url ? (
									<a href={src.url} target="_blank" rel="noopener noreferrer" className={`flex items-center rounded-md hover:underline ${FOCUS}`} style={{ minHeight: 40, fontSize: s(12), lineHeight: s(17), color: DISC.body }}>
										<span><span className="font-semibold" style={{ color: DISC.teal }}>{src.ticker}</span>&nbsp; {src.headline}</span>
									</a>
								) : (
									<p className="flex items-center" style={{ minHeight: 40, fontSize: s(12), lineHeight: s(17), color: DISC.body }}><span><span className="font-semibold" style={{ color: DISC.teal }}>{src.ticker}</span>&nbsp; {src.headline}</span></p>
								)}
							</li>
						))}
					</ul>
				</div>
			)}
			{m.id != null && m.kind === "answer" && (
				<div className="flex" style={{ marginLeft: s(-10) }}>
					<ThumbButton label="Helpful" pressed={m.feedback === 1} onClick={() => onRate(1)} s={s}><ThumbsUp style={{ width: s(16), height: s(16) }} fill={m.feedback === 1 ? "currentColor" : "none"} aria-hidden="true" /></ThumbButton>
					<ThumbButton label="Not helpful" pressed={m.feedback === -1} onClick={() => onRate(-1)} s={s}><ThumbsDown style={{ width: s(16), height: s(16) }} fill={m.feedback === -1 ? "currentColor" : "none"} aria-hidden="true" /></ThumbButton>
				</div>
			)}
			{showFollowUps && m.followUps.length > 0 && (
				<div className="flex flex-wrap" style={{ gap: s(8) }}>
					{m.followUps.map((q) => (
						<button key={q} type="button" onClick={() => onFollowUp(q)} className={`rounded-full transition-colors hover:bg-white/[0.05] ${FOCUS}`} style={{ minHeight: 36, border: `1px solid rgba(105,179,202,0.45)`, padding: `${s(7)} ${s(12)}`, fontSize: s(12), color: DISC.teal }}>
							{q}
						</button>
					))}
				</div>
			)}
		</div>
	);
}

function ThumbButton({ label, pressed, onClick, s, children }: { label: string; pressed: boolean; onClick: () => void; s: (n: number) => string; children: ReactNode }) {
	return (
		<button type="button" onClick={onClick} aria-label={label} aria-pressed={pressed} className={`grid place-items-center rounded-full transition-colors hover:bg-white/[0.05] ${FOCUS}`} style={{ width: s(40), height: s(40), color: pressed ? DISC.teal : DISC.muted }}>
			{children}
		</button>
	);
}

function TypingDots({ s }: { s: (n: number) => string }) {
	return (
		<div className="flex" style={{ gap: s(5), padding: `${s(6)} 0` }} role="status" aria-label="STAK AI is answering">
			{[0, 150, 300].map((delay) => (
				<span key={delay} className="animate-pulse rounded-full motion-reduce:animate-none" style={{ width: s(7), height: s(7), background: DISC.teal, animationDelay: `${delay}ms` }} />
			))}
		</div>
	);
}

function NoticeBar({ notice, s, onRetry, onRetryOpen, onNewChat }: { notice: AiNotice; s: (n: number) => string; onRetry: () => void; onRetryOpen: () => void; onNewChat: () => void }) {
	const text = notice.type === "limit"
		? `You've used your 5 questions for now. ${nextQuestionText(notice.resetsAt)}`
		: notice.type === "failed"
			? notice.offline ? "You're offline, so that didn't send. It didn't count." : "STAK AI couldn't answer just now. That one didn't count."
			: "Couldn't open that chat.";
	const action = (label: string, onClick: () => void) => (
		<button type="button" onClick={onClick} className={`shrink-0 rounded-md font-semibold ${FOCUS}`} style={{ minHeight: 40, padding: `0 ${s(10)}`, fontSize: s(12), color: DISC.teal }}>{label}</button>
	);
	return (
		<div role="status" aria-live="polite" className="flex items-center" style={{ margin: `0 ${s(20)}`, borderRadius: s(12), background: DISC.cardDark, padding: `${s(2)} ${s(4)} ${s(2)} ${s(14)}` }}>
			<p className="flex-1" style={{ fontSize: s(12), lineHeight: s(17), color: DISC.body, padding: `${s(10)} 0` }}>{text}</p>
			{notice.type === "failed" && action("Try again", onRetry)}
			{notice.type === "loadFailed" && <>{action("Try again", onRetryOpen)}{action("New chat", onNewChat)}</>}
		</div>
	);
}

/** "Asking about NVIDIA" - what the chat was opened from. */
export function ContextChip({ context, variant }: { context: StakAiContext; variant: Variant }) {
	const s = sizer(variant);
	const { data: brandsList } = useBrandsList();
	const label = context.type === "stock"
		? `Asking about ${brandsList?.find((b) => b.ticker === context.ticker)?.name ?? context.ticker}`
		: context.type === "article" ? `About: ${context.headline}` : "About today's Daily Brief";
	return (
		<p className="flex max-w-full items-center self-start overflow-hidden" style={{ gap: s(6), margin: `0 ${s(20)}`, borderRadius: s(14), background: DISC.cardDark, padding: `${s(6)} ${s(12)}`, fontSize: s(12), color: DISC.body }}>
			<span className="shrink-0 rounded-full" style={{ width: s(6), height: s(6), background: DISC.teal }} aria-hidden="true" />
			<span className="truncate">{label}</span>
		</p>
	);
}

/** The way into STAK AI from a page (an article, a stock, the Daily Brief): opens the chat with that page as context. */
export function AskAiCard({ title, subtitle, onOpen, variant }: { title: string; subtitle: string; onOpen: () => void; variant: Variant }) {
	const s = sizer(variant);
	return (
		<button
			type="button"
			onClick={onOpen}
			className={`flex w-full items-center text-left transition-colors hover:bg-white/[0.03] ${variant === "desktop" ? deskFocus : FOCUS}`}
			style={{ gap: s(12), borderRadius: s(14), background: variant === "desktop" ? DESK.panel : DISC.cardDark, border: "1px solid rgba(105,179,202,0.35)", padding: `${s(12)} ${s(14)}` }}
		>
			<span className="grid shrink-0 place-items-center rounded-full" style={{ width: s(34), height: s(34), background: "#172037" }} aria-hidden="true">
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
