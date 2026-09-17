package com.stak.demo.ui.home

import com.stak.demo.data.Session
import com.stak.demo.ui.news.DailyBriefHolder

/**
 * Market Mood news deck data source. Reads live market news from DailyBriefHolder
 * (populated by NewsViewModel on app open). DailyBriefHolder uses mutableStateOf so
 * the deck recomposes automatically when news loads.
 *
 * Only the demo account falls back to the authored stories. A real account was
 * shown them until the news arrived - "Wall Street's fear gauge reads 32", "The
 * OpenAI IPO is reportedly delayed" - and a short live list was topped up with
 * them; invented headlines beside real ones. It now gets blank cards instead.
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

    private val BLANK = Story("", "")

    fun stories(): List<Story> {
        val liveNews = DailyBriefHolder.news
        if (liveNews.isNotEmpty()) {
            val mapped = liveNews.take(DECK_SIZE).map { article ->
                val title = article.headline.let {
                    if (it.length > 65) it.take(65).trimEnd() + "…" else it
                }
                // A summary that only restates the headline isn't a body. Feeds pad it with
                // their source and stray characters ("... sources say� Reuters" under
                // "... sources say - Reuters"), so the two are compared by letters and
                // digits alone; a summary needs 25 more of those to count as saying more.
                val body = article.summary.trim()
                    .takeIf { summary ->
                        val core = article.headline.substringBeforeLast(" - ").takeIf { it.length >= 20 } ?: article.headline
                        val h = lettersAndDigits(core)
                        val sum = lettersAndDigits(summary)
                        sum.length >= 25 && !(sum.startsWith(h) && sum.length - h.length < 25)
                    }
                    ?.let { if (it.length > 110) it.take(110).trimEnd() + "…" else it }
                    .orEmpty()
                Story(title = title, body = body)
            }
            return padToDeck(mapped)
        }
        return padToDeck(if (Session.demoAccount) DEMO_STORIES else emptyList())
    }

    private fun lettersAndDigits(text: String): String = text.lowercase().filter { it.isLetterOrDigit() }

    fun padToDeck(served: List<Story>): List<Story> {
        val filler = if (Session.demoAccount) DEMO_STORIES else List(DECK_SIZE) { BLANK }
        return (served + filler).take(DECK_SIZE)
    }
}
