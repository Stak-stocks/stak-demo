package com.stak.demo.ui.theme

import androidx.compose.foundation.IndicationNodeFactory
import androidx.compose.foundation.interaction.InteractionSource
import androidx.compose.foundation.interaction.PressInteraction
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.toRect
import androidx.compose.ui.graphics.drawscope.ContentDrawScope
import androidx.compose.ui.graphics.drawscope.drawIntoCanvas
import androidx.compose.ui.node.DelegatableNode
import androidx.compose.ui.node.DrawModifierNode
import androidx.compose.ui.node.invalidateDraw
import kotlinx.coroutines.launch

/**
 * The app's press feedback (product audit, 2026-09-05: every tappable was
 * `indication = null`, so nothing acknowledged a touch). While pressed the
 * target draws at 70% - a quiet fade like Instagram's and Spotify's, with
 * no ripple to fight the frames' flat surfaces. It is a FADE of the
 * target's own pixels, never a painted overlay: the first cut drew a black
 * rect at 30% on top, which on a target with no fill of its own (the tab
 * bar's icons, the top bars' glyphs) showed as a black box (user,
 * 2026-09-05: "when I'm tapping each nav icon I see a black color").
 * Scrims and the video surfaces stay indication-free. Mirrors ios
 * PressDimStyle (opacity 0.7).
 */
object PressDim : IndicationNodeFactory {
	override fun create(interactionSource: InteractionSource): DelegatableNode = PressDimNode(interactionSource)
	override fun equals(other: Any?): Boolean = other === this
	override fun hashCode(): Int = javaClass.hashCode()
}

private class PressDimNode(private val interactionSource: InteractionSource) : Modifier.Node(), DrawModifierNode {
	private var pressed = false

	override fun onAttach() {
		coroutineScope.launch {
			interactionSource.interactions.collect { interaction ->
				val now = when (interaction) {
					is PressInteraction.Press -> true
					is PressInteraction.Release, is PressInteraction.Cancel -> false
					else -> pressed
				}
				if (now != pressed) {
					pressed = now
					invalidateDraw()
				}
			}
		}
	}

	override fun ContentDrawScope.draw() {
		if (!pressed) {
			drawContent()
			return
		}
		// A layer at 70%: everything the node draws (the content, plus any
		// fill or border placed AFTER the clickable in the chain) fades as
		// one, and a target with no fill fades only its glyph - no box.
		drawIntoCanvas { canvas ->
			canvas.saveLayer(size.toRect(), layerPaint)
			drawContent()
			canvas.restore()
		}
	}

	private val layerPaint = androidx.compose.ui.graphics.Paint().apply { alpha = 0.7f }
}
