package com.stak.demo.ui.theme

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.Dp
import kotlin.math.roundToInt

/**
 * Arrangement.spacedBy(space) that keeps the gap's fractional pixels.
 *
 * Compose rounds every Dp gap to whole pixels on its own, so a 15u gap
 * (41.54 px on a 390-unit artboard at 1080 wide) becomes 42 px at EVERY
 * step: the seventeen gaps of the News article pushed its tail 2.8u below
 * the frame (StakTest vs the 2x export of 1:1495, 2026-09-05). Here each
 * child is placed at round(exact cumulative offset) instead, so the error
 * never exceeds half a pixel however long the stack is.
 */
fun fractionalSpacedBy(space: Dp): Arrangement.Vertical = object : Arrangement.Vertical {
	override val spacing: Dp = space

	override fun Density.arrange(totalSize: Int, sizes: IntArray, outPositions: IntArray) {
		val gap = space.toPx()
		var y = 0f
		sizes.forEachIndexed { i, s ->
			outPositions[i] = y.roundToInt()
			y += s + gap
		}
	}

	override fun toString() = "fractionalSpacedBy($space)"
}
