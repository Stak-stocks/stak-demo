package com.stak.demo.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.unit.dp

/**
 * A new account's allocation ring (product audit, 2026-09-05): one arc per
 * bucket, clockwise from the top, a small gap between arcs, drawn in the
 * 150-box the authored donut exports (ms_donut / sim_donut) occupy. The
 * demo account keeps those exports. Mirrors ios DonutRing.swift.
 */
@Composable
internal fun DonutRing(shares: List<Float>, colors: List<Color>, modifier: Modifier) {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
	Canvas(modifier = modifier) {
		val stroke = (28 * u).dp.toPx()
		val inset = stroke / 2
		val gap = if (shares.size > 1) 5f else 0f
		var start = -90f
		shares.forEachIndexed { i, share ->
			val sweep = 360f * share - gap
			drawArc(
				color = colors[i % colors.size],
				startAngle = start + gap / 2,
				sweepAngle = sweep.coerceAtLeast(2f),
				useCenter = false,
				topLeft = Offset(inset, inset),
				size = Size(size.width - stroke, size.height - stroke),
				style = Stroke(width = stroke, cap = StrokeCap.Butt),
			)
			start += 360f * share
		}
	}
}
