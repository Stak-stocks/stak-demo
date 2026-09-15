package com.stak.demo.ui.home

import com.stak.demo.ui.news.DailyBriefHolder

/**
 * Market Mood news deck data source. Reads live market news from DailyBriefHolder
 * (populated by NewsViewModel on app open) and falls back to authored demo stories
 * until data arrives. DailyBriefHolder uses mutableStateOf so the deck recomposes
 * automatically when news loads.
 */
object NewsDeckFeed {
    const val LIVE = true

    data class Story(val title: String, val body: String)

    val DEMO_STORIES = listOf(
        Story(
            "Wall Street's fear gauge reads 32",
            "The Fear & Greed Index is firmly in Fear territory. Money is rotating out of the...",
        ),
        Story(
            "Fed meeting notes drop Wednesday",
            "Minutes from the last Fed meeting land July 8. A market this tense moves on every word...",
        ),
        Story(
            "The OpenAI IPO is reportedly delayed",
            "The year's most anticipated listing just slipped. Markets riding a wave of IPO excitement...",
        ),
    )

    const val DECK_SIZE = 3

    fun stories(): List<Story> {
        val liveNews = DailyBriefHolder.news
        if (liveNews.isNotEmpty()) {
            val mapped = liveNews.take(DECK_SIZE).map { article ->
                val title = article.headline.let {
                    if (it.length > 65) it.take(65).trimEnd() + "…" else it
                }
                val body = (article.summary.takeIf { it.isNotBlank() } ?: article.headline).let {
                    if (it.length > 110) it.take(110).trimEnd() + "…" else it
                }
                Story(title = title, body = body)
            }
            return padToDeck(mapped)
        }
        return padToDeck(DEMO_STORIES)
    }

    fun padToDeck(served: List<Story>): List<Story> = (served + DEMO_STORIES).take(DECK_SIZE)
}
