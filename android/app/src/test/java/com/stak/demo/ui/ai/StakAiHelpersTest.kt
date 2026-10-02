package com.stak.demo.ui.ai

import com.stak.demo.data.DailyBriefResponse
import com.stak.demo.data.NewsArticleDto
import com.stak.demo.data.StakAiContext
import com.stak.demo.data.WhatHappenedItem
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.Instant
import java.time.temporal.ChronoUnit

class StakAiHelpersTest {
	@Test
	fun boldSpansDropsTheMarkersAndKeepsTheText() {
		val s = boldSpans("Shares fell **3.2%** after **earnings**.")
		assertEquals("Shares fell 3.2% after earnings.", s.text)
		assertEquals(2, s.spanStyles.size)
	}

	@Test
	fun anUnclosedBoldMarkerStaysAsPlainText() {
		assertEquals("A **dangling marker", boldSpans("A **dangling marker").text)
	}

	@Test
	fun aStreamingAnswerHidesHalfFinishedBoldAndBullets() {
		assertEquals("It's very", tidyStreaming("It's **very"))
		assertEquals("It's **very** high", tidyStreaming("It's **very** high"))
		assertEquals("Reasons:\n- one", tidyStreaming("Reasons:\n- one\n- "))
		assertEquals("Hmm ", tidyStreaming("Hmm *"))
	}

	@Test
	fun nextQuestionTextNamesATimeOrFallsBack() {
		val soon = Instant.now().plus(1, ChronoUnit.MINUTES).toString()
		assertTrue(nextQuestionText(soon).startsWith("Your next one is"))
		assertEquals("Check back in a few hours.", nextQuestionText(null))
		assertEquals("Check back in a few hours.", nextQuestionText("not a time"))
	}

	@Test
	fun agoReadsLikeAFeed() {
		assertEquals("Just now", ago(Instant.now().toString()))
		assertEquals("3h ago", ago(Instant.now().minus(3, ChronoUnit.HOURS).minusSeconds(30).toString()))
		assertEquals("", ago("garbage"))
	}

	@Test
	fun articleContextCarriesTheStoryAndItsTicker() {
		val ctx = StakAiContext.article(NewsArticleDto(headline = "Apple raises orders", summary = "", explanation = "Suppliers told to prepare.", source = "Bloomberg", url = "https://x.test/a", ticker = "aapl"))
		assertEquals("article", ctx.type)
		assertEquals("Suppliers told to prepare.", ctx.summary)
		assertEquals(listOf("AAPL"), ctx.tickers)
	}

	@Test
	fun articleWithoutATickerSendsNone() {
		assertNull(StakAiContext.article(NewsArticleDto(headline = "Markets wobble")).tickers)
	}

	@Test
	fun briefContextKeepsItsPointsAndSkipsEmptyOnes() {
		val ctx = StakAiContext.brief(DailyBriefResponse(dayLabel = "Friday", plainEnglish = "Stocks rose.", personalizedImpact = " ", whatHappened = listOf(WhatHappenedItem("Fed", "Held rates."))))
		assertEquals("brief", ctx.type)
		assertEquals(listOf("Stocks rose.", "Fed: Held rates."), ctx.points)
	}

	@Test
	fun aListAfterAnIntroLineKeepsItsBullets() {
		val blocks = parseMarkdown(listOf("Here's why:", "- Chips fell", "- Rates rose", "", "That's the gist.").joinToString("\n"))
		assertEquals(3, blocks.size)
		assertEquals("Here's why:", (blocks[0] as MdBlock.Paragraph).text.text)
		assertEquals(listOf("Chips fell", "Rates rose"), (blocks[1] as MdBlock.Bullets).items.map { it.text })
		assertEquals("That's the gist.", (blocks[2] as MdBlock.Paragraph).text.text)
	}

	@Test
	fun starterQuestionsFollowWhereTheChatWasOpened() {
		assertEquals("Why is NVDA moving today?", starterQuestions(StakAiContext.stock("nvda")).first())
		assertEquals(3, starterQuestions(null).size)
	}
}
