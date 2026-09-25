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

/** The six range labels every chart offers; "3M" is the authored default and keeps each frame's exported line. */
internal val RANGE_LABELS = listOf("1D", "1W", "1M", "3M", "YTD", "1Y")

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
