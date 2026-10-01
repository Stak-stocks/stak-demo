/**
 * STAK AI's contract, shared by the backend route (backend/src/routes/stakAi.ts) and the web client
 * (frontend/src/lib/api.ts) so the limit, the context shapes and the reply can't drift apart. Android mirrors these
 * in Kotlin.
 */

/** Questions per user in any rolling window. Declined answers, clarifying questions and failures don't count. */
export const STAK_AI_WINDOW_LIMIT = 5;
export const STAK_AI_WINDOW_HOURS = 6;

/**
 * What a chat was opened from. Send it with the FIRST question only: the server keeps it on the conversation, and
 * re-sending it on every turn would pull follow-ups back to it after the person has moved on to another company.
 * Article and brief text are what the person sees (capped server-side); a stock page sends only its ticker.
 */
export type StakAiContext =
	| { type: "article"; headline: string; summary?: string; source?: string; url?: string; tickers?: string[] }
	| { type: "stock"; ticker: string }
	| { type: "brief"; title?: string; points: string[] };

/** Questions left in the window; `resetsAt` is when the oldest counted one frees a slot (null when none are used). */
export interface StakAiUsage {
	limit: number;
	used: number;
	remaining: number;
	resetsAt: string | null;
}

/** "answer": a normal reply. "declined": it couldn't help (advice, predictions). "clarify": it asked a question back. Only answers count against the limit. */
export type StakAiAnswerKind = "answer" | "declined" | "clarify";

/** A headline the answer was given, for a "Based on" row under it. */
export interface StakAiSource {
	ticker: string;
	headline: string;
	url?: string;
}

export interface StakAiChatReply {
	response: string;
	conversationId: string;
	/** The answer's id, for thumbs up/down. */
	messageId: number | null;
	answerKind: StakAiAnswerKind;
	/** Two or three short questions the person might ask next; may be empty. */
	followUps: string[];
	sources: StakAiSource[];
	usage: StakAiUsage;
}

/** A stored message, as GET /conversations/:id/messages returns it. */
export interface StakAiStoredMessage {
	id: number;
	role: "user" | "assistant";
	content: string;
	/** For answers: what kind it was (user messages are "answer"). */
	kind: StakAiAnswerKind;
	/** Thumbs on an answer: 1 up, -1 down, null unrated. */
	feedback: 1 | -1 | null;
	created_at: string;
}

/** Every error carries one of these, so the apps choose their own wording rather than showing the server's. */
export type StakAiErrorCode = "limit_reached" | "ai_unavailable" | "not_found" | "bad_request" | "server_error";
