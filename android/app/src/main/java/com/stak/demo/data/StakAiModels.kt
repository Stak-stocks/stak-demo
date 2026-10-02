package com.stak.demo.data

import com.google.gson.annotations.SerializedName

/*
 * STAK AI's API, mirroring the shared contract in shared/src/stakAi.ts (the backend route and the web client use
 * that file directly). Keep the two in step: limits, context shapes, the reply and the error codes.
 */

/**
 * What a chat was opened from - send it with the FIRST question only; the server keeps it on the conversation.
 * One class for the three shapes (Gson drops the null fields): a stock page sends only its ticker; an article its
 * headline, summary, source, link and tickers; the Daily Brief its title and points.
 */
data class StakAiContext(
	val type: String,
	val ticker: String? = null,
	val headline: String? = null,
	val summary: String? = null,
	val source: String? = null,
	val url: String? = null,
	val tickers: List<String>? = null,
	val title: String? = null,
	val points: List<String>? = null,
) {
	companion object {
		fun stock(ticker: String) = StakAiContext(type = "stock", ticker = ticker.uppercase())

		fun article(a: NewsArticleDto) = StakAiContext(
			type = "article",
			headline = a.headline,
			summary = a.summary.ifBlank { a.explanation }.ifBlank { null },
			source = a.source.ifBlank { null },
			url = a.url.ifBlank { null },
			tickers = a.ticker.takeIf { it.isNotBlank() }?.let { listOf(it.uppercase()) },
		)

		fun brief(b: DailyBriefResponse) = StakAiContext(
			type = "brief",
			title = b.dayLabel.ifBlank { null },
			points = (listOf(b.plainEnglish, b.personalizedImpact) + b.whatHappened.map { "${it.title}: ${it.body}" })
				.map { it.trim() }.filter { it.isNotEmpty() }.take(8),
		)
	}
}

data class StakAiChatRequest(
	val message: String,
	val conversationId: String? = null,
	val context: StakAiContext? = null,
	/** How it was asked, for the usage stats: "typed", "starter", "followup" or "retry". */
	val via: String? = null,
)

/** What a streamed answer sends: the answer so far as it's written, then the finished reply. */
sealed interface StakAiStreamEvent {
	data class Text(val soFar: String) : StakAiStreamEvent
	data class Done(val reply: StakAiChatReply) : StakAiStreamEvent
}

/** A streamed answer that failed part-way (its `error` event): [code] is a StakAiErrorCode. */
class StakAiStreamException(val code: String, message: String) : Exception(message)

/** How a question was asked, for the usage stats (shared STAK_AI_VIA). */
object StakAiVia {
	const val TYPED = "typed"
	const val STARTER = "starter"
	const val FOLLOWUP = "followup"
	const val RETRY = "retry"
}

/** Where STAK AI was opened from, for the usage stats (shared StakAiEntry; a context's type doubles as one). */
object StakAiEntry {
	const val HEADER = "header"
	const val STOCK = "stock"
	const val ARTICLE = "article"
	const val BRIEF = "brief"
}

/** Questions left in the rolling window; `resetsAt` (ISO) is when the oldest counted one frees a slot. */
data class StakAiUsage(
	val limit: Int = 5,
	val used: Int = 0,
	val remaining: Int = 5,
	val resetsAt: String? = null,
)

/** A headline the answer was given, for the "Based on" row. */
data class StakAiSource(val ticker: String = "", val headline: String = "", val url: String? = null)

data class StakAiChatReply(
	val response: String = "",
	val conversationId: String = "",
	/** The answer's id, for thumbs up/down. */
	val messageId: Long? = null,
	/** "answer", "declined" (couldn't help - doesn't count) or "clarify" (asked back - doesn't count). */
	val answerKind: String = "answer",
	val followUps: List<String> = emptyList(),
	val sources: List<StakAiSource> = emptyList(),
	val usage: StakAiUsage = StakAiUsage(),
)

/** The body of a failed call: `code` is limit_reached, ai_unavailable, not_found, bad_request or server_error. */
data class StakAiError(val error: String? = null, val code: String? = null, val usage: StakAiUsage? = null)

data class StakAiConversation(
	val id: String = "",
	val title: String = "",
	@SerializedName("context_type") val contextType: String? = null,
	/** The stock's name, the article's headline or "Daily Brief". */
	@SerializedName("context_label") val contextLabel: String? = null,
	/** The start of the latest answer. */
	val preview: String? = null,
	@SerializedName("updated_at") val updatedAt: String = "",
)

data class StakAiConversationsResponse(
	val conversations: List<StakAiConversation> = emptyList(),
	/** Pass back as `before` for the next page; null when there are no more. */
	val nextBefore: String? = null,
)

data class StakAiMessageDto(
	val id: Long = 0,
	val role: String = "",
	val content: String = "",
	/** For answers: "answer", "declined" or "clarify". */
	val kind: String = "answer",
	/** 1 up, -1 down, null unrated. */
	val feedback: Int? = null,
)

data class StakAiMessagesResponse(
	val title: String = "",
	val context: StakAiContext? = null,
	val messages: List<StakAiMessageDto> = emptyList(),
)

data class StakAiRenameRequest(val title: String)

/** `value` 1, -1, or null to clear (Gson leaves a null out; the server reads a missing value as null). */
data class StakAiFeedbackRequest(val value: Int?)
