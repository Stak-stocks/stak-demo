import { useState, type FormEvent } from "react";
import { Send, Sparkles } from "lucide-react";
import { sendStakAiMessage } from "@/lib/api";
import { DESK, Panel, PanelHeader, SkeletonBar, deskFocus } from "@/components/desktop/deskKit";

/**
 * Ask STAK AI on desktop News and the Daily Brief: a question box plus suggestions; the answer shows in the panel, and a
 * follow-up keeps the same conversation. Calls /api/stak-ai/chat (ungrounded Gemini) only when asked.
 */
export function AskStakAi({ suggestions }: { suggestions: string[] }) {
	const [ask, setAsk] = useState("");
	const [chat, setChat] = useState<{ q: string; a: string | null; failed?: boolean } | null>(null);
	const [conversationId, setConversationId] = useState<string | undefined>(undefined);
	const waiting = !!chat && chat.a === null && !chat.failed;

	async function askAi(question: string) {
		const q = question.trim();
		if (!q || waiting) return;
		setAsk("");
		setChat({ q, a: null });
		try {
			const r = await sendStakAiMessage(q, conversationId);
			setConversationId(r.conversationId);
			setChat({ q, a: r.response });
		} catch {
			setChat({ q, a: null, failed: true });
		}
	}
	const onAsk = (e: FormEvent) => { e.preventDefault(); void askAi(ask); };

	return (
		<Panel label="Ask STAK AI" className="gap-3 p-5">
			<PanelHeader icon={Sparkles} title="Ask STAK AI" subtitle="Get plain-English answers about today's news." />
			{chat && (
				<div className="flex flex-col gap-2 rounded-[12px] p-3" style={{ background: DESK.panelRaised, border: `1px solid ${DESK.border}` }} aria-live="polite">
					<p className="text-[12.5px] font-semibold text-white">{chat.q}</p>
					{chat.a !== null ? (
						<p className="whitespace-pre-wrap text-[13px] leading-[20px]" style={{ color: DESK.body }}>{chat.a}</p>
					) : chat.failed ? (
						<p className="text-[12.5px]" style={{ color: DESK.red }}>Couldn't get an answer right now. Try again in a moment.</p>
					) : (
						<SkeletonBar width="80%" height={14} />
					)}
				</div>
			)}
			<form onSubmit={onAsk} className="relative">
				<input value={ask} onChange={(e) => setAsk(e.target.value)} placeholder="Ask a question about today's news…" aria-label="Ask STAK AI" maxLength={500} className={`h-[40px] w-full rounded-[10px] pl-3 pr-10 text-[13px] text-white outline-none placeholder:text-[#819ABB] ${deskFocus}`} style={{ background: DESK.panelRaised, border: `1px solid ${DESK.border}` }} />
				<button type="submit" disabled={!ask.trim() || waiting} aria-label="Ask" className={`absolute right-1 top-1 grid h-[32px] w-[32px] place-items-center rounded-[8px] disabled:opacity-40 ${deskFocus}`} style={{ color: DESK.cyan }}>
					<Send className="h-[15px] w-[15px]" aria-hidden="true" />
				</button>
			</form>
			<div className="flex flex-wrap gap-2">
				{suggestions.map((s) => (
					<button key={s} type="button" disabled={waiting} onClick={() => { void askAi(s); }} className={`rounded-full px-3 py-[5px] text-left text-[12px] transition-colors hover:bg-white/[0.06] disabled:opacity-50 ${deskFocus}`} style={{ color: DESK.body, border: `1px solid ${DESK.border}` }}>
						{s}
					</button>
				))}
			</div>
		</Panel>
	);
}
