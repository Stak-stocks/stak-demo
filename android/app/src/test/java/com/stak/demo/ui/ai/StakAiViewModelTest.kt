package com.stak.demo.ui.ai

import com.stak.demo.data.OkResponse
import com.stak.demo.data.StakAiChatReply
import com.stak.demo.data.StakAiChatRequest
import com.stak.demo.data.StakAiContext
import com.stak.demo.data.StakAiConversation
import com.stak.demo.data.StakAiConversationsResponse
import com.stak.demo.data.StakAiMessageDto
import com.stak.demo.data.StakAiMessagesResponse
import com.stak.demo.data.StakAiRepository
import com.stak.demo.data.StakAiStreamEvent
import com.stak.demo.data.StakAiStreamException
import com.stak.demo.data.StakAiUsage
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.setMain
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.ResponseBody.Companion.toResponseBody
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import retrofit2.HttpException
import retrofit2.Response
import java.io.IOException

/** A scripted STAK AI backend: each chat call takes the next scripted outcome; every request is kept. */
private class FakeRepo : StakAiRepository {
	val requests = mutableListOf<StakAiChatRequest>()
	val outcomes = ArrayDeque<() -> StakAiChatReply>()
	var usage = StakAiUsage(limit = 5, used = 0, remaining = 5)
	var messagesGate: CompletableDeferred<StakAiMessagesResponse>? = null
	var failFeedback = false
	var failDelete = false
	/** Text the next streamed answer writes before it finishes (or fails). */
	var streamFirst: List<String> = emptyList()
	/** Holds a streamed answer open after its text, until completed (to see it mid-stream). */
	var streamGate: CompletableDeferred<Unit>? = null
	val opens = mutableListOf<String>()

	override fun chatStream(request: StakAiChatRequest): Flow<StakAiStreamEvent> = flow {
		requests += request
		streamFirst.forEach { emit(StakAiStreamEvent.Text(it)) }
		streamFirst = emptyList()
		streamGate?.await()
		emit(StakAiStreamEvent.Done(outcomes.removeFirst()()))
	}
	override suspend fun trackOpen(entry: String) { opens += entry }
	override suspend fun usage() = usage
	override suspend fun conversations(before: String?) = StakAiConversationsResponse(listOf(StakAiConversation(id = "c1", title = "One"), StakAiConversation(id = "c2", title = "Two")))
	override suspend fun messages(conversationId: String) = messagesGate?.await() ?: StakAiMessagesResponse(
		title = "Old chat",
		messages = listOf(StakAiMessageDto(1, "user", "Should I buy it?"), StakAiMessageDto(2, "assistant", "I can't advise that.", kind = "declined")),
	)
	override suspend fun rename(conversationId: String, title: String) = OkResponse(true)
	override suspend fun delete(conversationId: String): OkResponse = if (failDelete) throw IOException("offline") else OkResponse(true)
	override suspend fun feedback(messageId: Long, value: Int?): OkResponse = if (failFeedback) throw IOException("offline") else OkResponse(true)
}

private fun reply(text: String = "Here's why.", id: Long = 10, remaining: Int = 4, conv: String = "conv-1") =
	StakAiChatReply(response = text, conversationId = conv, messageId = id, usage = StakAiUsage(5, 5 - remaining, remaining, null))

private fun httpError(status: Int, json: String) = HttpException(Response.error<Any>(status, json.toResponseBody("application/json".toMediaType())))

@OptIn(ExperimentalCoroutinesApi::class)
class StakAiViewModelTest {
	private val repo = FakeRepo()

	@Before fun setUp() {
		Dispatchers.setMain(UnconfinedTestDispatcher())
		StakAiLauncher.reset()
	}

	@After fun tearDown() {
		Dispatchers.resetMain()
		StakAiLauncher.reset()
	}

	@Test fun anAnswerArrivesAndTheCountUpdates() {
		repo.outcomes += { reply() }
		val vm = StakAiViewModel(repo)
		vm.send("What is beta?")
		assertEquals(listOf(true, false), vm.messages.map { it.fromUser })
		assertEquals(4, vm.usage?.remaining)
		assertFalse(vm.sending)
	}

	@Test fun theAnswerIsWrittenOutThenReplacedByTheFinishedOne() {
		val gate = CompletableDeferred<Unit>()
		repo.streamFirst = listOf("Chips", "Chips fell")
		repo.streamGate = gate
		repo.outcomes += { reply(text = "Chips fell on export curbs.") }
		val vm = StakAiViewModel(repo)
		vm.send("Why?", via = "starter")
		// Mid-stream: the words so far, marked as still being written.
		assertEquals("Chips fell", vm.messages.last().text)
		assertTrue(vm.messages.last().streaming)
		gate.complete(Unit)
		val last = vm.messages.last()
		assertEquals("Chips fell on export curbs.", last.text)
		assertFalse(last.streaming)
		assertEquals(2, vm.messages.size)
		assertEquals("starter", repo.requests.single().via)
	}

	@Test fun aHalfWrittenAnswerThatFailsComesOffTheScreen() {
		repo.streamFirst = listOf("Chips fe")
		repo.outcomes += { throw IOException("cut off") }
		val vm = StakAiViewModel(repo)
		vm.send("Why?")
		assertEquals(1, vm.messages.size)
		assertTrue(vm.messages.single().failed)
		// The connection dropped after words arrived: it may have been saved and counted, so it's "check your chats".
		assertEquals(AiNotice.Slow, vm.notice)
	}

	@Test fun anErrorFromTheServerMidAnswerSaysItDidNotCount() {
		repo.streamFirst = listOf("Chips fe")
		repo.outcomes += { throw StakAiStreamException("ai_unavailable", "no answer") }
		val vm = StakAiViewModel(repo)
		vm.send("Why?")
		assertEquals(AiNotice.Failed(offline = false), vm.notice)
	}

	@Test fun openingCountsWhereItCameFromButReopeningDoesNot() {
		StakAiLauncher.context = StakAiContext.stock("nvda")
		StakAiLauncher.entry = "stock"
		StakAiViewModel(repo)
		assertEquals(listOf("stock"), repo.opens)
		StakAiLauncher.conversationId = "old"
		StakAiViewModel(repo)
		assertEquals(listOf("stock"), repo.opens)
	}

	@Test fun aRetryIsMarkedAsOne() {
		repo.outcomes += { throw IOException("offline") }
		repo.outcomes += { reply() }
		val vm = StakAiViewModel(repo)
		vm.send("What is beta?")
		vm.retry()
		assertEquals(listOf("typed", "retry"), repo.requests.map { it.via })
	}

	@Test fun thePageContextGoesWithTheFirstQuestionOnly() {
		StakAiLauncher.context = StakAiContext.stock("nvda")
		repo.outcomes += { reply() }
		repo.outcomes += { reply() }
		val vm = StakAiViewModel(repo)
		vm.send("Why is it down?")
		vm.send("Is that normal?")
		assertEquals("NVDA", repo.requests[0].context?.ticker)
		assertNull(repo.requests[1].context)
		assertEquals("conv-1", repo.requests[1].conversationId)
	}

	@Test fun outOfQuestionsHandsTheQuestionBackAndSaysWhen() {
		repo.outcomes += { throw httpError(429, """{"code":"limit_reached","error":"x","usage":{"limit":5,"used":5,"remaining":0,"resetsAt":"2099-01-01T10:00:00Z"}}""") }
		val vm = StakAiViewModel(repo)
		vm.send("One more?")
		assertTrue(vm.messages.isEmpty())
		assertEquals("One more?", vm.consumeReturnedDraft())
		assertNull(vm.returnedDraft)
		assertTrue(vm.notice is AiNotice.LimitReached)
		assertTrue(vm.outOfQuestions)
		assertFalse(vm.canAsk)
	}

	@Test fun aFailedQuestionIsRetriedInPlaceNotDuplicated() {
		repo.outcomes += { throw IOException("offline") }
		repo.outcomes += { reply() }
		val vm = StakAiViewModel(repo)
		vm.send("What is beta?")
		assertTrue(vm.messages.single().failed)
		assertEquals(AiNotice.Failed(offline = true), vm.notice)
		vm.retry()
		assertEquals(2, vm.messages.size)
		assertFalse(vm.messages.first().failed)
		assertNull(vm.notice)
	}

	@Test fun aSlowAnswerIsNotCalledOfflineOrUncounted() {
		repo.outcomes += { throw java.net.SocketTimeoutException("timeout") }
		val vm = StakAiViewModel(repo)
		vm.send("What is beta?")
		assertEquals(AiNotice.Slow, vm.notice)
	}

	@Test fun askingInADeletedChatCarriesOnInANewOne() {
		StakAiLauncher.conversationId = "gone"
		repo.outcomes += { throw httpError(404, """{"code":"not_found","error":"Conversation not found"}""") }
		repo.outcomes += { reply(conv = "fresh") }
		val vm = StakAiViewModel(repo)
		vm.send("And now?")
		assertEquals("gone", repo.requests[0].conversationId)
		assertNull(repo.requests[1].conversationId)
		assertEquals(false, vm.messages.last().fromUser)
		assertNull(vm.notice)
	}

	@Test fun aReopenedChatKeepsItsDeclines() {
		StakAiLauncher.conversationId = "old"
		val vm = StakAiViewModel(repo)
		assertEquals("declined", vm.messages.last().kind)
		assertNull(vm.messages.first().id)
	}

	@Test fun nothingSendsWhileAPastChatIsLoading() {
		repo.messagesGate = CompletableDeferred()
		StakAiLauncher.conversationId = "old"
		val vm = StakAiViewModel(repo)
		assertTrue(vm.loading)
		assertFalse(vm.canAsk)
		vm.send("Too early")
		assertTrue(repo.requests.isEmpty())
	}

	@Test fun aNewChatStopsAPastOneLoading() {
		val gate = CompletableDeferred<StakAiMessagesResponse>()
		repo.messagesGate = gate
		StakAiLauncher.conversationId = "old"
		val vm = StakAiViewModel(repo)
		vm.newChat()
		gate.complete(StakAiMessagesResponse(messages = listOf(StakAiMessageDto(1, "user", "late"))))
		assertTrue(vm.messages.isEmpty())
		assertFalse(vm.loading)
	}

	@Test fun aThumbThatFailsToSaveIsPutBack() {
		repo.outcomes += { reply() }
		repo.failFeedback = true
		val vm = StakAiViewModel(repo)
		vm.send("What is beta?")
		vm.rate(vm.messages.last(), 1)
		assertNull(vm.messages.last().feedback)
	}

	@Test fun tappingTheSameThumbAgainClearsIt() {
		repo.outcomes += { reply() }
		val vm = StakAiViewModel(repo)
		vm.send("What is beta?")
		vm.rate(vm.messages.last(), 1)
		assertEquals(1, vm.messages.last().feedback)
		vm.rate(vm.messages.last(), 1)
		assertNull(vm.messages.last().feedback)
	}

	@Test fun aNewChatWhileOutOfQuestionsSaysSo() {
		repo.usage = StakAiUsage(5, 5, 0, "2099-01-01T10:00:00Z")
		val vm = StakAiViewModel(repo)
		vm.newChat()
		assertTrue(vm.notice is AiNotice.LimitReached)
	}

	@Test fun historyPutsADeletedChatBackIfTheDeleteFails() {
		repo.failDelete = true
		val vm = StakAiHistoryViewModel(repo)
		val first = vm.conversations.first()
		vm.delete(first)
		assertEquals(listOf("c1", "c2"), vm.conversations.map { it.id })
	}

	@Test fun historyRenamesOnScreen() {
		val vm = StakAiHistoryViewModel(repo)
		vm.rename(vm.conversations.first(), "  Nvidia questions ")
		assertEquals("Nvidia questions", vm.conversations.first().title)
	}
}
