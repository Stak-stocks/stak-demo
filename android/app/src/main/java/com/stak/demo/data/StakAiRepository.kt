package com.stak.demo.data

import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Inject
import javax.inject.Singleton

/**
 * STAK AI's calls. An interface (unlike StockRepository) so the chat's ViewModels can be tested against a fake -
 * see StakAiViewModelTest.
 */
interface StakAiRepository {
	suspend fun chat(request: StakAiChatRequest): StakAiChatReply
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
