package com.stak.demo.ui.ai

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.gson.Gson
import com.stak.demo.data.StakAiChatRequest
import com.stak.demo.data.StakAiContext
import com.stak.demo.data.StakAiEntry
import com.stak.demo.data.StakAiError
import com.stak.demo.data.StakAiRepository
import com.stak.demo.data.StakAiSource
import com.stak.demo.data.StakAiStreamEvent
import com.stak.demo.data.StakAiStreamException
import com.stak.demo.data.StakAiUsage
import com.stak.demo.data.StakAiVia
import com.stak.demo.data.httpErrorBody
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.io.IOException
import java.io.InterruptedIOException
import java.time.Duration
import java.time.Instant
import javax.inject.Inject

/**
 * How a screen opens STAK AI: set what it's opened from (and optionally a first question to ask at once), or a past
 * conversation to reopen, then navigate to StakRoutes.STAK_AI. The chat takes these once, in its ViewModel's init.
 */
object StakAiLauncher {
	var context: StakAiContext? = null
	var question: String? = null
	var conversationId: String? = null
	/** Where it was opened from, for the usage stats (a StakAiEntry). */
	var entry: String? = null

	fun reset() {
		context = null
		question = null
		conversationId = null
		entry = null
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
	/** A question that got no answer; the chat offers to resend it. */
	val failed: Boolean = false,
	/** An answer still being written (streamed); replaced by the finished one. */
	val streaming: Boolean = false,
	/** What was written of an answer before the connection went quiet or dropped; the full one may be in the chats. */
	val cutOff: Boolean = false,
)

/** Something the chat needs to tell the person, shown above the input. */
sealed interface AiNotice {
	/** Out of questions until [resetsAt] (ISO). */
	data class LimitReached(val resetsAt: String?) : AiNotice
	/** The last question got no answer. It didn't count. */
	data class Failed(val offline: Boolean) : AiNotice
	/** The answer took too long to arrive; it may still have been saved, so check before asking again. */
	data object Slow : AiNotice
	/** A past conversation couldn't be loaded. */
	data object LoadFailed : AiNotice
}

/** After a slow answer, look again at the count once the server has surely finished. */
private const val RECHECK_MS = 60_000L

@HiltViewModel
class StakAiViewModel @Inject constructor(private val repo: StakAiRepository) : ViewModel() {
	var messages by mutableStateOf<List<AiMessage>>(emptyList())
		private set
	/** What this chat was opened from (shown as a chip); sent with the first question only. */
	var context by mutableStateOf<StakAiContext?>(null)
		private set
	var usage by mutableStateOf<StakAiUsage?>(null)
		private set
	var sending by mutableStateOf(false)
		private set
	/** A past conversation is loading. */
	var loading by mutableStateOf(false)
		private set
	var notice by mutableStateOf<AiNotice?>(null)
		private set
	/** A question that couldn't be asked (out of questions), handed back for the input box; take it with [consumeReturnedDraft]. */
	var returnedDraft by mutableStateOf<String?>(null)
		private set

	private var conversationId: String? = null
	private var openedId: String? = null
	private var contextSent = false
	private var nextKey = 0L
	private var openJob: Job? = null
	private var usageRefresh: Job? = null
	/** Bumped by every reply; a usage read started before one can't overwrite the newer count it carries. */
	private var usageVersion = 0
	private val gson = Gson()

	init {
		val reopen = StakAiLauncher.conversationId
		val first = StakAiLauncher.question
		val entry = StakAiLauncher.entry
		context = StakAiLauncher.context
		StakAiLauncher.reset()
		// A fresh open (not a past chat reopened from history) counts toward the usage stats.
		if (reopen == null) viewModelScope.launch { repo.trackOpen(entry ?: StakAiEntry.HEADER) }
		refreshUsage()
		if (reopen != null) open(reopen) else if (!first.isNullOrBlank()) send(first)
	}

	val outOfQuestions: Boolean get() = (usage?.remaining ?: 1) <= 0
	/** The input takes questions: not mid-answer, not loading a chat, and questions left. */
	val canAsk: Boolean get() = !sending && !loading && !outOfQuestions

	fun consumeReturnedDraft(): String? = returnedDraft.also { returnedDraft = null }

	/** [via] says how it was asked, for the usage stats (a StakAiVia). */
	fun send(text: String, via: String = StakAiVia.TYPED) {
		val question = text.trim()
		if (question.isEmpty() || sending || loading) return
		// A resend replaces the failed line rather than repeating it.
		messages = messages.filterNot { it.failed } + AiMessage(key = nextKey++, fromUser = true, text = question)
		notice = null
		sending = true
		viewModelScope.launch {
			ask(question, allowRestart = true, via = via)
			sending = false
		}
	}

	private suspend fun ask(question: String, allowRestart: Boolean, via: String) {
		// The answer appears as it's written, in a line of its own that the finished answer replaces.
		val streamKey = nextKey++
		var reply: com.stak.demo.data.StakAiChatReply? = null
		var gotText = false
		runCatching {
			repo.chatStream(StakAiChatRequest(message = question, conversationId = conversationId, context = context.takeIf { !contextSent }, via = via)).collect { ev ->
				when (ev) {
					is StakAiStreamEvent.Text -> {
						gotText = true
						val line = AiMessage(key = streamKey, fromUser = false, text = ev.soFar, streaming = true)
						messages = if (messages.any { it.key == streamKey }) messages.map { if (it.key == streamKey) line else it } else messages + line
					}
					is StakAiStreamEvent.Done -> reply = ev.reply
				}
			}
		}.onSuccess {
			val r = reply ?: return@onSuccess
			contextSent = true
			conversationId = r.conversationId
			usageVersion++
			applyUsage(r.usage)
			val finished = AiMessage(
				key = streamKey, fromUser = false, text = r.response, id = r.messageId,
				kind = r.answerKind, followUps = r.followUps, sources = r.sources,
			)
			messages = if (messages.any { it.key == streamKey }) messages.map { if (it.key == streamKey) finished else it } else messages + finished
		}.onFailure { e ->
			// Too slow, or the connection dropped after words arrived: the server may well have finished, saved and
			// counted it. (A failure the server reports part-way is a StakAiStreamException: that one really didn't count.)
			val mayHaveCounted = e is InterruptedIOException || (gotText && e is IOException)
			// A half-written answer that failed comes off the screen; one that may have been saved stays, marked cut off.
			messages = if (mayHaveCounted) messages.map { if (it.key == streamKey) it.copy(streaming = false, cutOff = true) else it }
			else messages.filterNot { it.key == streamKey }
			val err = errorBody(e)
			when {
				// The chat was deleted (from history) while open: carry on in a fresh one, asking the same question.
				err?.code == "not_found" && allowRestart && conversationId != null -> {
					conversationId = null
					contextSent = false
					ask(question, allowRestart = false, via = via)
				}
				err?.code == "limit_reached" -> {
					usageVersion++
					applyUsage(err.usage ?: usage)
					messages = messages.dropLast(1)
					returnedDraft = question
				}
				// Don't say it didn't count: refresh the count now, and again once the server has surely finished (now, it
				// may still be writing - or not count it after all). The question is unanswered only if nothing showed.
				mayHaveCounted -> {
					if (!gotText) markLastFailed()
					notice = AiNotice.Slow
					refreshUsage()
					viewModelScope.launch {
						delay(RECHECK_MS)
						refreshUsage()
					}
				}
				else -> {
					markLastFailed()
					notice = AiNotice.Failed(offline = e is IOException && e !is StakAiStreamException)
				}
			}
		}
	}

	/** Ask the failed question again. */
	fun retry() {
		messages.lastOrNull { it.failed }?.let { send(it.text, via = StakAiVia.RETRY) }
	}

	/** Thumbs on an answer; tapping the same thumb again clears it. Shown at once, put back if the save fails. */
	fun rate(message: AiMessage, value: Int) {
		val id = message.id ?: return
		val before = message.feedback
		val next = if (before == value) null else value
		setFeedback(message.key, next)
		viewModelScope.launch {
			runCatching { repo.feedback(id, next) }.onFailure { setFeedback(message.key, before) }
		}
	}

	/** Start over: a fresh conversation with no page context (and stop loading a past one). */
	fun newChat() {
		if (sending) return
		openJob?.cancel()
		loading = false
		messages = emptyList()
		conversationId = null
		openedId = null
		context = null
		contextSent = false
		notice = if (outOfQuestions) AiNotice.LimitReached(usage?.resetsAt) else null
	}

	fun open(id: String) {
		openJob?.cancel()
		openedId = id
		loading = true
		notice = null
		openJob = viewModelScope.launch {
			runCatching { repo.messages(id) }
				.onSuccess { r ->
					conversationId = id
					context = r.context
					contextSent = true
					messages = r.messages.map { m ->
						AiMessage(
							key = nextKey++, fromUser = m.role == "user", text = m.content,
							id = m.id.takeIf { m.role == "assistant" }, feedback = m.feedback, kind = m.kind,
						)
					}
				}
				.onFailure { notice = AiNotice.LoadFailed }
			loading = false
		}
	}

	/** Try the past chat that failed to load again. */
	fun retryOpen() {
		openedId?.let { open(it) }
	}

	private fun refreshUsage() {
		val version = usageVersion
		viewModelScope.launch {
			runCatching { repo.usage() }.onSuccess { u -> if (version == usageVersion) applyUsage(u) }
		}
	}

	/**
	 * Takes a new count. Out of questions: say when the next frees up, and check again at that moment, so the box
	 * unlocks on its own instead of waiting for the person to leave and come back.
	 */
	private fun applyUsage(u: StakAiUsage?) {
		usage = u
		usageRefresh?.cancel()
		if (u == null || u.remaining > 0) {
			if (notice is AiNotice.LimitReached) notice = null
			return
		}
		notice = AiNotice.LimitReached(u.resetsAt)
		val wait = u.resetsAt?.let { runCatching { Duration.between(Instant.now(), Instant.parse(it)).toMillis() }.getOrNull() } ?: return
		usageRefresh = viewModelScope.launch {
			delay(wait.coerceAtLeast(0) + 2_000)
			refreshUsage()
		}
	}

	private fun markLastFailed() {
		messages = messages.dropLast(1) + messages.last().copy(failed = true)
	}

	private fun setFeedback(key: Long, value: Int?) {
		messages = messages.map { if (it.key == key) it.copy(feedback = value) else it }
	}

	/** The server's error body ({ error, code, usage }) from a failed call, when it sent one. */
	private fun errorBody(e: Throwable): StakAiError? =
		httpErrorBody(e)?.let { body -> runCatching { gson.fromJson(body, StakAiError::class.java) }.getOrNull() }
}
