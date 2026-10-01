package com.stak.demo.data

import com.google.gson.Gson
import com.google.gson.JsonObject
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.flowOn
import javax.inject.Inject
import javax.inject.Singleton

/**
 * STAK AI's calls. An interface (unlike StockRepository) so the chat's ViewModels can be tested against a fake -
 * see StakAiViewModelTest.
 */
interface StakAiRepository {
	suspend fun chat(request: StakAiChatRequest): StakAiChatReply
	/**
	 * Asks with the answer streamed. Emits the text so far as it's written, then the finished reply. A refusal before
	 * the answer starts (out of questions, not found...) throws an HttpException like [chat]; a failure part-way
	 * throws [StakAiStreamException].
	 */
	fun chatStream(request: StakAiChatRequest): Flow<StakAiStreamEvent>
	/** "STAK AI was opened from [entry]" (header, stock, article, brief) for the usage stats; never throws. */
	suspend fun trackOpen(entry: String)
	suspend fun usage(): StakAiUsage
	suspend fun conversations(before: String? = null): StakAiConversationsResponse
	suspend fun messages(conversationId: String): StakAiMessagesResponse
	suspend fun rename(conversationId: String, title: String): OkResponse
	suspend fun delete(conversationId: String): OkResponse
	suspend fun feedback(messageId: Long, value: Int?): OkResponse
}

@Singleton
class StakAiRepositoryImpl @Inject constructor(private val api: StockApiService) : StakAiRepository {
	override suspend fun chat(request: StakAiChatRequest) = api.stakAiChat(request)

	override fun chatStream(request: StakAiChatRequest): Flow<StakAiStreamEvent> = flow {
		val response = api.stakAiChatStream(request)
		if (!response.isSuccessful) throw retrofit2.HttpException(response)
		val body = response.body() ?: throw java.io.IOException("Empty stream")
		val gson = Gson()
		var soFar = ""
		var event: String? = null
		body.use {
			val source = it.source()
			while (true) {
				val line = source.readUtf8Line() ?: break
				when {
					line.startsWith("event:") -> event = line.removePrefix("event:").trim()
					line.startsWith("data:") -> {
						val data = line.removePrefix("data:").trim()
						when (event) {
							"delta" -> {
								soFar += gson.fromJson(data, JsonObject::class.java).get("text")?.asString.orEmpty()
								emit(StakAiStreamEvent.Text(soFar))
							}
							"done" -> {
								emit(StakAiStreamEvent.Done(gson.fromJson(data, StakAiChatReply::class.java)))
								return@flow
							}
							"error" -> {
								val err = gson.fromJson(data, StakAiError::class.java)
								throw StakAiStreamException(err.code ?: "ai_unavailable", err.error ?: "STAK AI couldn't answer")
							}
						}
					}
					line.isEmpty() -> event = null
				}
			}
		}
		// The connection dropped before the reply.
		throw java.io.IOException("STAK AI's answer was cut off")
	}.flowOn(Dispatchers.IO)

	override suspend fun trackOpen(entry: String) {
		runCatching { api.recordEvent(EngagementEventRequest(type = "stak_ai_open", params = mapOf("entry" to entry, "platform" to "android"))) }
	}
	override suspend fun usage() = api.stakAiUsage()
	override suspend fun conversations(before: String?) = api.stakAiConversations(before)
	override suspend fun messages(conversationId: String) = api.stakAiMessages(conversationId)
	override suspend fun rename(conversationId: String, title: String) = api.stakAiRename(conversationId, StakAiRenameRequest(title))
	override suspend fun delete(conversationId: String) = api.stakAiDelete(conversationId)
	override suspend fun feedback(messageId: Long, value: Int?) = api.stakAiFeedback(messageId, StakAiFeedbackRequest(value))
}

@Module
@InstallIn(SingletonComponent::class)
abstract class StakAiModule {
	@Binds
	abstract fun bindStakAiRepository(impl: StakAiRepositoryImpl): StakAiRepository
}
