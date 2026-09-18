package com.stak.demo.ui.discover

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.stak.demo.ui.mystak.COLLECTIONS
import com.stak.demo.ui.onboarding.figmaUnit
import com.stak.demo.ui.theme.FIGMA_LINE_BOX
import com.stak.demo.ui.theme.Geist
import com.stak.demo.ui.theme.Sora

/** One plain-English lesson - a title, its two-line summary and the short read behind "Read lesson". */
internal data class Lesson(val title: String, val summary: String, val body: List<String>)

/**
 * The Stock Detail's Related lesson (FigJam Discover board, 2026-09-14: Stock
 * detail -> Related lesson). One lesson per collection - the sector the stock
 * sits in - and a general one for anything uncatalogued. The backend serves
 * real lessons in production. Mirrors ios Discover/StockLessons.swift.
 */
internal object StockLessons {
	private val BY_COLLECTION = mapOf(
		"aitech" to Lesson(
			"Why chip stocks swing so hard",
			"Demand for AI hardware comes in waves, and prices ride every wave up and down.",
			listOf(
				"Chipmakers sell into cycles: when data centres and phone makers stock up, orders surge; when they have enough, orders stall. The stock price tends to run ahead of both turns.",
				"That is why a great company can still be a bumpy stock. Nothing changed about the business - the market changed its guess about the next order book.",
				"What to do with it: size a chip position so a 20% drop is uncomfortable, not ruinous, and judge the company on multi-year demand rather than one quarter.",
			),
		),
		"finance" to Lesson(
			"How interest rates move bank profits",
			"Banks earn the gap between what they pay savers and what they charge borrowers.",
			listOf(
				"When rates rise, banks can charge more on loans faster than they raise what they pay on deposits - the gap, called net interest margin, widens and profits follow.",
				"When rates fall, the gap narrows, but cheaper credit means more people borrow, so volume can make up for margin. Payment networks like Visa care less about rates and more about how much people spend.",
				"What to do with it: read a bank's results for margin and loan growth together, and expect the stock to react to central-bank news before the earnings even land.",
			),
		),
		"green" to Lesson(
			"Policy is the weather for clean energy",
			"Subsidies, tariffs and rate changes matter as much as sunshine for solar and grid stocks.",
			listOf(
				"Clean-energy projects are financed over decades, so their value depends on the cost of borrowing and on how long tax credits last. A policy shift can reprice a whole sector in a day.",
				"Utilities that own the grid are the steadier end: regulated returns and slow, predictable growth. Equipment makers like solar-inverter companies are the fast, swingy end.",
				"What to do with it: know which end of the sector a stock sits on, and treat policy headlines as part of the fundamentals, not noise.",
			),
		),
		"realestate" to Lesson(
			"REITs: rent cheques as a stock",
			"A real-estate trust passes most of its rent to shareholders, so it behaves like a bond with a growth kicker.",
			listOf(
				"REITs must pay out most of their income as dividends, which is why their yields look high. The trade-off: they raise money by borrowing, so higher rates squeeze them twice - dearer debt and more competition from bonds.",
				"Warehouses, data centres and shops behave differently. Logistics rents track online shopping; retail rents track footfall; both track the economy.",
				"What to do with it: judge a REIT by occupancy, lease length and debt cost, and expect the price to move opposite to interest-rate news.",
			),
		),
		"health" to Lesson(
			"Patents, pipelines and patience",
			"A drug company's future is its pipeline; its present is how long its best sellers stay protected.",
			listOf(
				"A blockbuster drug earns for as long as its patent holds, then generic copies arrive and revenue falls off a cliff. Investors watch the cliff dates as closely as the sales.",
				"The pipeline - drugs in trials - is the replacement. Trial results are binary: a pass can add billions overnight, a fail can erase them. Insurers and hospital groups are the calmer end of healthcare.",
				"What to do with it: for drug makers, know the patent calendar and the next trial readout; for the rest, follow enrolment and pricing, not headlines.",
			),
		),
		"consumer" to Lesson(
			"Brands, margins and the shopper's mood",
			"Consumer companies live on repeat purchases, so watch what people keep buying when money is tight.",
			listOf(
				"A strong brand lets a company raise prices without losing customers - that pricing power shows up as a steady profit margin through inflation.",
				"Membership models like a warehouse club earn from fees before they sell a thing, which smooths the ride. Fashion and sportswear ride the mood: hot one season, discounted the next.",
				"What to do with it: track same-store sales and margins, and remember that a beloved brand can still be an expensive stock.",
			),
		),
	)

	private val DEFAULT = Lesson(
		"What actually moves a stock price",
		"Prices move on the gap between what the market expected and what it gets.",
		listOf(
			"A company can report record profits and the stock can still fall - because the market had priced in even better. Expectations, not results, set the direction on the day.",
			"Over years, though, price follows earnings and cash. The daily noise is investors updating their guesses; the long trend is the business doing its work.",
			"What to do with it: decide whether you are trading the guesses or owning the business, and size the position for the one you chose.",
		),
	)

	/** The lesson for a stock - its collection's, or the general one. */
	fun lessonFor(symbol: String): Lesson {
		val id = COLLECTIONS.firstOrNull { c -> c.stocks.any { it.ticker == symbol } }?.id
		return BY_COLLECTION[id] ?: DEFAULT
	}
}

/** The Related lesson card - kicker, title, summary and an inline "Read lesson" expander. */
@Composable
internal fun LessonCard(lesson: Lesson) {
	val u = figmaUnit()
	var open by rememberSaveable(lesson.title) { mutableStateOf(false) }
	Column(
		verticalArrangement = Arrangement.spacedBy((8 * u).dp),
		modifier = Modifier
			.fillMaxWidth()
			.clip(RoundedCornerShape((12 * u).dp))
			.background(Color(0xFF181F30))
			.clickable(interactionSource = remember { MutableInteractionSource() }, indication = com.stak.demo.ui.theme.PressDim) { open = !open }
			.padding((14 * u).dp),
	) {
		Text("RELATED LESSON", style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (11 * u).sp), color = Color(0xFF5BD7E4))
		Text(lesson.title, style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (15 * u).sp, lineHeight = (19 * u).sp, lineHeightStyle = FIGMA_LINE_BOX), color = Color.White)
		Text(lesson.summary, style = TextStyle(fontFamily = Geist, fontSize = (12 * u).sp, lineHeight = (17 * u).sp, lineHeightStyle = FIGMA_LINE_BOX), color = Color(0xFFC8D2E0))
		AnimatedVisibility(visible = open) {
			Column(verticalArrangement = Arrangement.spacedBy((8 * u).dp), modifier = Modifier.padding(top = (4 * u).dp)) {
				lesson.body.forEach { p ->
					Text(p, style = TextStyle(fontFamily = Geist, fontSize = (12 * u).sp, lineHeight = (17 * u).sp, lineHeightStyle = FIGMA_LINE_BOX), color = Color(0xFF819ABB))
				}
			}
		}
		Row(verticalAlignment = Alignment.CenterVertically) {
			Text(if (open) "Close lesson" else "Read lesson · 2 min", style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (12 * u).sp), color = Color(0xFF69B3CA))
			Spacer(modifier = Modifier.weight(1f))
			Text(if (open) "⌃" else "⌄", style = TextStyle(fontFamily = Geist, fontSize = (14 * u).sp), color = Color(0xFF819ABB))
		}
	}
}
