package com.stak.demo.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.unit.dp
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import com.stak.demo.ui.theme.FIGMA_LINE_BOX
import com.stak.demo.ui.theme.Geist

/** A stock chart's ranges (5Y weekly closes, MAX the whole listed history); "3M" is the authored default and keeps each
 *  frame's exported line. Mirrors web STOCK_RANGES. */
internal val RANGE_LABELS = listOf("1D", "1W", "1M", "3M", "YTD", "1Y", "5Y", "MAX")

/** The portfolio chart's: a simulated account is new, so it has ALL (since it began) where a stock has 5Y and MAX. */
internal val PORTFOLIO_RANGE_LABELS = listOf("1D", "1W", "1M", "3M", "YTD", "1Y", "ALL")

/** What TalkBack says for each range pill (as iOS's rangeSpoken): "MAX" or "5Y" alone is cryptic read aloud. */
internal val RANGE_SPOKEN = mapOf(
	"1D" to "1 day", "1W" to "1 week", "1M" to "1 month", "3M" to "3 months", "YTD" to "Year to date", "1Y" to "1 year",
	"5Y" to "5 years", "MAX" to "All time", "ALL" to "Since you started",
)

/**
 * The range pills under a chart - the selected one in the authored 39x22.5 teal pill, the rest plain text - with what
 * they mean for TalkBack and a tab's selected state. Stock Detail, Pick Detail and Simulate share it (one row, not
 * three copies). Mirrors iOS RangePills.
 */
@Composable
internal fun RangePillRow(labels: List<String>, selected: String, onSelect: (String) -> Unit, tint: Color, muted: Color, modifier: Modifier = Modifier) {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
	Row(
		verticalAlignment = Alignment.CenterVertically,
		// Spread across the card's width, so seven or eight pills fit as six did.
		horizontalArrangement = Arrangement.SpaceBetween,
		modifier = modifier.width((343 * u).dp).padding(horizontal = (8 * u).dp),
	) {
		labels.forEach { label ->
			val on = label == selected
			Box(
				contentAlignment = Alignment.Center,
				modifier = Modifier
					// A taller target than the 22.5 pill (its row is pulled up by the same amount where it's placed).
					.heightIn(min = (34 * u).dp)
					.clickable(
						interactionSource = remember { MutableInteractionSource() },
						indication = com.stak.demo.ui.theme.PressDim,
						role = Role.Tab,
					) { onSelect(label) }
					// TalkBack says "5 years, selected", not "5Y".
					.semantics { contentDescription = RANGE_SPOKEN[label] ?: label; this.selected = on },
			) {
				val style = TextStyle(fontFamily = Geist, fontWeight = if (on) FontWeight.Medium else FontWeight.Normal, fontSize = (12 * u).sp, lineHeight = (16 * u).sp, lineHeightStyle = FIGMA_LINE_BOX)
				if (on) {
					Box(
						contentAlignment = Alignment.Center,
						modifier = Modifier
							// At least the authored 39 wide, wider when large text needs it (MAX at 150%).
							.widthIn(min = (39 * u).dp)
							.height((22.5 * u).dp)
							.clip(RoundedCornerShape((11.25 * u).dp))
							.background(Color(0x292C9DBC))
							.border((0.75 * u).dp, Color(0x662C9DBC), RoundedCornerShape((11.25 * u).dp))
							.padding(horizontal = (5 * u).dp),
					) {
						Text(label, style = style, color = tint, maxLines = 1, softWrap = false)
					}
				} else {
					Text(label, style = style, color = muted, maxLines = 1, softWrap = false)
				}
			}
		}
	}
}

/**
 * Demo stand-ins until the backend serves price history - each range's line
 * as fractions of the chart height from the bottom (0 = bottom), spread
 * evenly across the width. "3M" is absent on purpose: that range shows the
 * authored export (sim_chart_line 1:3935, ms_chart_line 1:3155, sd_chart_line
 * 1:2382). Shared by Simulate, My STAK, Stock Detail and Pick Detail (user,
 * 2026-09-05: "be able to click on the timeline"). Mirrors
 * ios/StakDemo/Theme/RangeChart.swift.
 */
/**
 * The 3M shape when a line is DRAWN instead of exported - a new account's
 * charts follow its own move (StakInsights.scaled), so the authored 3M
 * export cannot stand in for them (product audit, 2026-09-05).
 */
internal val SERIES_3M: List<Float> = listOf(0.30f, 0.34f, 0.32f, 0.40f, 0.38f, 0.46f, 0.52f, 0.48f, 0.58f, 0.56f, 0.64f, 0.70f, 0.66f, 0.76f, 0.84f)

internal val RANGE_SERIES: Map<String, List<Float>> = mapOf(
	"1D" to listOf(0.45f, 0.50f, 0.42f, 0.55f, 0.60f, 0.52f, 0.58f, 0.66f, 0.62f, 0.70f),
	"1W" to listOf(0.30f, 0.38f, 0.35f, 0.50f, 0.46f, 0.60f, 0.72f),
	"1M" to listOf(0.25f, 0.30f, 0.28f, 0.42f, 0.38f, 0.52f, 0.48f, 0.60f, 0.55f, 0.68f, 0.75f),
	"YTD" to listOf(0.20f, 0.35f, 0.30f, 0.45f, 0.40f, 0.55f, 0.50f, 0.62f, 0.70f, 0.66f, 0.80f),
	"1Y" to listOf(0.15f, 0.22f, 0.30f, 0.26f, 0.40f, 0.36f, 0.50f, 0.55f, 0.48f, 0.62f, 0.70f, 0.82f),
)

/**
 * A range's line: a `tint` 2-wide round stroke in the caller's box and
 * nothing else - every authored "Chart line" (1:3245, 1:3936, 1:2409,
 * 1:4664) is a bare #69B3CA 2 stroke with no fill (user, 2026-09-05: "was
 * there a gradient?" - there was not; the old fill came from a stand-in).
 */
@Composable
internal fun RangeChart(series: List<Float>, tint: Color, modifier: Modifier) {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
	Canvas(modifier = modifier) {
		val w = size.width
		val h = size.height
		val last = series.lastIndex
		val points = series.mapIndexed { i, f -> Offset(if (last == 0) 0f else w * i / last, h * (1f - f)) }
		val line = Path().apply {
			moveTo(points.first().x, points.first().y)
			points.drop(1).forEach { lineTo(it.x, it.y) }
		}
		drawPath(line, tint, style = Stroke(width = (2 * u).dp.toPx(), cap = StrokeCap.Round, join = StrokeJoin.Round))
	}
}
