package com.stak.demo.ui

import com.stak.demo.ui.mystak.COLLECTIONS
import com.stak.demo.ui.mystak.otherCollection
import com.stak.demo.ui.mystak.CollStock
import com.stak.demo.ui.mystak.StakCollection
import com.stak.demo.ui.mystak.held
import com.stak.demo.ui.simulate.PaperPortfolio
import java.util.Locale
import kotlin.math.abs
import kotlin.math.min

/**
 * What a NEW account's screens say about its own stocks (product audit,
 * 2026-09-05: with a single save, My STAK read "Six of your fourteen
 * picks", a +4.9% week, TSLA/SNOW as best and worst and a five-bucket
 * allocation - the demo persona's frames). The demo account keeps its
 * authored copy and art (user, 2026-09-04: the authored look wins);
 * everything here is read from MyStakHoldings, the collection catalogue
 * and the paper ledger. Mirrors ios/StakDemo/StakInsights.swift.
 */
internal object StakInsights {
	/** One allocation bucket: a collection (or "other") and its share of the stocks. */
	data class Bucket(val id: String, val name: String, val count: Int, val share: Float)

	private val THEME = mapOf(
		"aitech" to "tech and AI", "finance" to "finance", "green" to "green energy",
		"realestate" to "real estate", "health" to "healthcare", "consumer" to "consumer brands",
	)
	private val BUCKET_NAME = mapOf(
		"aitech" to "Tech & AI", "finance" to "Finance", "green" to "Green Energy",
		"realestate" to "Real Estate", "health" to "Healthcare", "consumer" to "Consumer",
	)

	/** The collections the user holds stocks in, biggest first - the Other collection (uncatalogued saves) included (Codex review, PR #167 mirror). */
	fun heldGroups(): List<Pair<StakCollection, List<CollStock>>> =
		(COLLECTIONS.map { it to it.held() } + listOfNotNull(otherCollection()?.let { it to it.stocks }))
			.filter { it.second.isNotEmpty() }.sortedByDescending { it.second.size }

	/** "tech and AI names" for a catalogued group; "stocks you found yourself" for the Other collection. */
	private fun themeNames(id: String): String = THEME[id]?.let { "$it names" } ?: "stocks you found yourself"

	fun heldStocks(): List<CollStock> = heldGroups().flatMap { it.second }

	/** "▲ 2.4%" -> 2.4, "▼ 0.4%" -> -0.4. */
	fun changePct(s: CollStock): Double {
		val v = s.change.filter { it.isDigit() || it == '.' }.toDoubleOrNull() ?: 0.0
		return if (s.up) v else -v
	}

	/** The week's move across the held stocks - their average change. */
	fun weekChangePct(): Double = heldStocks().let { if (it.isEmpty()) 0.0 else it.sumOf(::changePct) / it.size }

	fun signedPct(pct: Double): String = (if (pct < 0) "-" else "+") + String.format(Locale.US, "%.1f", abs(pct)) + "%"

	/** Best and worst held stock this week - only meaningful with two or more. */
	fun bestWorst(): Pair<CollStock, CollStock>? {
		val held = heldStocks()
		if (held.size < 2) return null
		return held.maxBy(::changePct) to held.minBy(::changePct)
	}

	/** "You lean into tech and AI." */
	fun readHeadline(): String {
		val top = heldGroups().firstOrNull()
			?: return if (MyStakHoldings.count > 0) "Your saves sit outside the six collections." else "Your read starts with your first save."
		return "You lean into ${THEME[top.first.id] ?: "stocks you found yourself"}."
	}

	fun readBody(): String {
		val groups = heldGroups()
		val total = groups.sumOf { it.second.size }
		val top = groups.firstOrNull()
			?: return if (MyStakHoldings.count > 0) "Save a stock from one of the collections and STAK will read your taste from it."
			else "Save stocks from the Discover deck and STAK will read your taste from them."
		val theme = THEME[top.first.id]
		if (total == 1) return "${top.second.first().ticker} is your first save${if (theme != null) ", a $theme name" else ""}. Save a few more and STAK will read the pattern."
		val lead = "${top.second.size.word().cap()} of your ${total.word()} picks are ${themeNames(top.first.id)}."
		val second = groups.getOrNull(1)
		val tail = if (second != null) {
			" ${second.second.size.word().cap()} more ${if (second.second.size == 1) "sits" else "sit"} ${THEME[second.first.id]?.let { "in $it" } ?: "outside the six collections"}."
		} else {
			" Your STAK is all ${theme ?: "your own finds"} for now."
		}
		return lead + tail
	}

	private fun Int.word(): String =
		listOf("zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve").getOrNull(this) ?: toString()

	private fun String.cap(): String = replaceFirstChar { it.uppercase() }

	/** Allocation by collection for the given symbols; unknown symbols land in Other. */
	fun buckets(symbols: Collection<String>): List<Bucket> {
		if (symbols.isEmpty()) return emptyList()
		val ids = symbols.map { sym -> COLLECTIONS.firstOrNull { c -> c.stocks.any { it.ticker == sym } }?.id ?: "other" }
		val counts = ids.groupingBy { it }.eachCount()
		return counts.entries
			.sortedWith(compareBy({ it.key == "other" }, { -it.value }))
			.map { (id, n) -> Bucket(id, BUCKET_NAME[id] ?: "Other", n, n.toFloat() / symbols.size) }
	}

	/** Home "Why this matters": how many held stocks today's stories touch. */
	fun whyThisMattersBody(newsTickers: Set<String>): String {
		val held = MyStakHoldings.tickers
		val hit = held.count { it in newsTickers }
		val n = held.size
		return when {
			n == 1 && hit == 1 -> "${held.first()} sits in an industry today's news hits."
			n == 1 -> "${held.first()} is quiet in today's news - nothing hits it yet."
			hit == 0 -> "None of your $n saved stocks are in today's news - a quiet day for your STAK."
			hit == n -> "All $n of your saved stocks sit in industries today's news hits."
			else -> "$hit of your $n saved stocks sit in industries today's news hits."
		}
	}

	/** Simulate's INSIGHT card, read from a new account's own picks. */
	fun simInsight(): String {
		val symbols = PaperPortfolio.positions.map { it.spec.symbol }
		if (symbols.size == 1) return "${symbols.first()} is your first pick. Insights start once it has a week of moves."
		val buckets = buckets(symbols)
		val top = buckets.first()
		if (top.id == "other" || top.count < 2) {
			return "Your ${symbols.size} picks span ${buckets.size} industries. STAK reads a pattern once a few of them share one."
		}
		return "${top.count.word().cap()} of your ${symbols.size} picks are ${THEME[top.id]} names. Your taste has a type."
	}

	/** A demo line reshaped to a real move: flat at 0%, the full authored swing at +/-5%, mirrored when negative. */
	fun scaled(series: List<Float>, pct: Double): List<Float> {
		val amp = min(1.0, abs(pct) / 5.0).toFloat()
		val sign = if (pct < 0) -1f else 1f
		return series.map { 0.5f + (it - 0.5f) * amp * sign }
	}
}
