package com.stak.demo.ui.home

import com.stak.demo.data.Session
import com.stak.demo.ui.news.DailyBriefHolder

/**
 * Market Mood news deck data source. Reads live market news from DailyBriefHolder
 * (populated by NewsViewModel on app open). DailyBriefHolder uses mutableStateOf so
 * the deck recomposes automatically when news loads.
 *
 * Only the demo account falls back to the authored stories. A real account was
 * shown them until the news arrived — "Wall Street's fear gauge reads 32", "The
 * OpenAI IPO is reportedly delayed" — and a short live list was topped up with
 * them; invented headlines beside real ones. It now gets loading cards, or a line
 * saying the news didn't load.
 */
object NewsDeckFeed {
    const val LIVE = true

    /** [loading] draws the placeholder bars instead of text. */
    data class Story(val title: String, val body: String, val loading: Boolean = false)

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

    private val LOADING = Story("", "", loading = true)
    private val EMPTY = Story("", "")

    fun stories(): List<Story> {
        val liveNews = DailyBriefHolder.news
        if (liveNews.isNotEmpty()) {
            val mapped = liveNews.take(DECK_SIZE).map { article ->
                val title = article.headline.let {
                    if (it.length > 65) it.take(65).trimEnd() + "…" else it
                }
                // A summary that only restates the headline isn't a body.
                val body = com.stak.demo.data.NewsText.summaryBeyondHeadline(article.headline, article.summary)
                    ?.let { if (it.length > 110) it.take(110).trimEnd() + "…" else it }
                    .orEmpty()
                Story(title = title, body = body)
            }
            return padToDeck(mapped)
        }
        if (Session.demoAccount) return padToDeck(DEMO_STORIES)
        // Failed: the front card says so and the ones behind it stay plain.
        if (DailyBriefHolder.newsFailed) {
            return padToDeck(listOf(Story("Market news isn't loading", "Open News to try again.")))
        }
        return List(DECK_SIZE) { LOADING }
    }

    fun padToDeck(served: List<Story>): List<Story> {
        val filler = if (Session.demoAccount) DEMO_STORIES else List(DECK_SIZE) { EMPTY }
        return (served + filler).take(DECK_SIZE)
    }
}
