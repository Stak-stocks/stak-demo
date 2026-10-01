package com.stak.demo.ui.ai

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.gson.Gson
import com.stak.demo.data.StakAiChatRequest
import com.stak.demo.data.StakAiContext
import com.stak.demo.data.StakAiError
import com.stak.demo.data.StakAiFeedbackRequest
import com.stak.demo.data.StakAiSource
import com.stak.demo.data.StakAiUsage
import com.stak.demo.data.StockApiService
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import java.io.IOException
import javax.inject.Inject

/**
 * How a screen opens STAK AI: set what it's opened from (and, for a chip like "Why is NVDA moving?", the first
 * question), or a past conversation to reopen, then navigate to StakRoutes.STAK_AI. The chat takes these once.
 */
object StakAiLauncher {
	var context: StakAiContext? = null
	var question: String? = null
	var conversationId: String? = null

	fun reset() {
		context = null
		question = null
		conversationId = null
	}
}

/** One line in the chat. `id` is the server's message id (answers only), for thumbs. */
data class AiMessage(
	val key: Long,
	val fromUser: Boolean,
	val text: String,
	val id: Long? = null,
	val feedback: Int? = null,
	/** "answer", "declined" or "clarify" - the last two don't count against the limit. */
	val kind: String = "answer",
	val followUps: List<String> = emptyList(),
	val sources: List<StakAiSource> = emptyList(),
	/** A question that didn't get an answer (offline, or the AI failed); the chat offers to resend it. */
	val failed: Boolean = false,
)

/** Something the chat needs to tell the person, shown above the input. */
sealed interface AiNotice {
	/** Out of questions until [resetsAt] (ISO). */
	data class LimitReached(val resetsAt: String?) : AiNotice
	/** The last question got no answer; [offline] picks the wording. It didn't count. */
	data class Failed(val offline: Boolean) : AiNotice
	/** A past conversation couldn't be loaded. */
	data object LoadFailed : AiNotice
}

@HiltViewModel
class StakAiViewModel @Inject constructor(private val api: StockApiService) : ViewModel() {
	var messages by mutableStateOf<List<AiMessage>>(emptyList())
		private set
	/** What this chat was opened from (shown as a chip); sent with the first question only. */
	var context by mutableStateOf<StakAiContext?>(null)
		private set
	var usage by mutableStateOf<StakAiUsage?>(null)
		private set
	var sending by mutableStateOf(false)
		private set
	var loading by mutableStateOf(false)
		private set
	var notice by mutableStateOf<AiNotice?>(null)
		private set
	/** A question that couldn't be asked (out of questions), handed back for the input box to show again. */
	var returnedDraft by mutableStateOf<String?>(null)

	private var conversationId: String? = null
	private var contextSent = false
	private var nextKey = 0L
	private val gson = Gson()

	init {
		val reopen = StakAiLauncher.conversationId
		val first = StakAiLauncher.question
		context = StakAiLauncher.context
		StakAiLauncher.reset()
		refreshUsage()
		if (reopen != null) open(reopen) else if (!first.isNullOrBlank()) send(first)
	}

	val outOfQuestions: Boolean get() = (usage?.remaining ?: 1) <= 0

	fun send(text: String) {
		val question = text.trim()
		if (question.isEmpty() || sending) return
		// A resend replaces the failed line rather than repeating it.
		messages = messages.filterNot { it.failed } + AiMessage(key = nextKey++, fromUser = true, text = question)
		notice = null
		sending = true
		viewModelScope.launch {
			runCatching {
				api.stakAiChat(StakAiChatRequest(message = question, conversationId = conversationId, context = context.takeIf { !contextSent }))
			}.onSuccess { r ->
				contextSent = true
				conversationId = r.conversationId
				usage = r.usage
				messages = messages + AiMessage(
					key = nextKey++, fromUser = false, text = r.response, id = r.messageId,
					kind = r.answerKind, followUps = r.followUps, sources = r.sources,
				)
			}.onFailure { e ->
				val err = errorBody(e)
				if (err?.code == "limit_reached") {
					err.usage?.let { usage = it }
					// The question wasn't asked: take it off the screen and hand it back to the input box.
					messages = messages.dropLast(1)
					returnedDraft = question
					notice = AiNotice.LimitReached(err.usage?.resetsAt ?: usage?.resetsAt)
				} else {
					messages = messages.dropLast(1) + messages.last().copy(failed = true)
					notice = AiNotice.Failed(offline = e is IOException)
				}
			}
			sending = false
		}
	}

	/** Ask the failed question again. */
	fun retry() {
		messages.lastOrNull { it.failed }?.let { send(it.text) }
	}

	/** Thumbs on an answer; tapping the same thumb again clears it. Shown at once, put back if the save fails. */
	fun rate(message: AiMessage, value: Int) {
		val id = message.id ?: return
		val before = message.feedback
		val next = if (before == value) null else value
		setFeedback(message.key, next)
		viewModelScope.launch {
			runCatching { api.stakAiFeedback(id, StakAiFeedbackRequest(next)) }.onFailure { setFeedback(message.key, before) }
		}
	}

	/** Start over: a fresh conversation with no page context. */
	fun newChat() {
		if (sending) return
		messages = emptyList()
		conversationId = null
		context = null
		contextSent = false
		notice = if (outOfQuestions) AiNotice.LimitReached(usage?.resetsAt) else null
	}

	fun open(id: String) {
		loading = true
		notice = null
		viewModelScope.launch {
			runCatching { api.stakAiMessages(id) }
				.onSuccess { r ->
					conversationId = id
					context = r.context
					contextSent = true
					messages = r.messages.map { m ->
						AiMessage(key = nextKey++, fromUser = m.role == "user", text = m.content, id = m.id.takeIf { m.role == "assistant" }, feedback = m.feedback)
					}
				}
				.onFailure { notice = AiNotice.LoadFailed }
			loading = false
		}
	}

	private fun refreshUsage() {
		viewModelScope.launch {
			runCatching { api.stakAiUsage() }.onSuccess { u ->
				usage = u
				if (u.remaining <= 0 && messages.isEmpty()) notice = AiNotice.LimitReached(u.resetsAt)
			}
		}
	}

	private fun setFeedback(key: Long, value: Int?) {
		messages = messages.map { if (it.key == key) it.copy(feedback = value) else it }
	}

	/** The server's error body ({ error, code, usage }) from a failed call, when it sent one. */
	private fun errorBody(e: Throwable): StakAiError? {
		val http = e as? retrofit2.HttpException ?: return null
		val body = runCatching { http.response()?.errorBody()?.string() }.getOrNull() ?: return null
		return runCatching { gson.fromJson(body, StakAiError::class.java) }.getOrNull()
	}
}
