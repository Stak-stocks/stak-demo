package com.stak.demo.ui.components

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.gestures.detectVerticalDragGestures
import androidx.compose.foundation.layout.offset
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.input.pointer.util.VelocityTracker
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import kotlin.math.roundToInt

/**
 * A bottom sheet the finger can pull down to close - its handle says it can: the sheet follows the drag down, closes
 * past a third of its height (or 120dp) or on a downward flick, and springs back otherwise. Controls inside keep their
 * own taps. Apply it before the sheet's clip/background so the whole card moves. Mirrors iOS SheetDragToDismiss.
 */
@Composable
fun Modifier.sheetDragToDismiss(onDismiss: () -> Unit): Modifier {
	val scope = rememberCoroutineScope()
	val offset = remember { Animatable(0f) }
	var height by remember { mutableIntStateOf(0) }
	val dismiss by rememberUpdatedState(onDismiss)
	val thresholdPx = with(LocalDensity.current) { 120.dp.toPx() }
	return this
		.onSizeChanged { height = it.height }
		.offset { IntOffset(0, offset.value.roundToInt()) }
		.pointerInput(Unit) {
			val tracker = VelocityTracker()
			detectVerticalDragGestures(
				onDragStart = { tracker.resetTracking() },
				onDragEnd = {
					val flick = tracker.calculateVelocity().y > 1500f
					scope.launch {
						if (offset.value > minOf(thresholdPx, height / 3f) || (flick && offset.value > 0f)) {
							offset.animateTo(maxOf(height.toFloat(), offset.value), tween(180))
							dismiss()
						} else {
							offset.animateTo(0f, spring())
						}
					}
				},
				onDragCancel = { scope.launch { offset.animateTo(0f, spring()) } },
			) { change, dy ->
				change.consume()
				// The sheet moves with the finger, so the finger's own speed is its local motion plus the sheet's.
				tracker.addPosition(change.uptimeMillis, change.position.copy(y = change.position.y + offset.value))
				scope.launch { offset.snapTo((offset.value + dy).coerceAtLeast(0f)) }
			}
		}
}
