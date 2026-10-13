package com.stak.demo.ui.components

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.gestures.detectVerticalDragGestures
import androidx.compose.foundation.layout.offset
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
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
	// Set once a close has begun: a second drag (or the close's own last events) can't call onDismiss again.
	var dismissing by remember { mutableStateOf(false) }
	val dismiss by rememberUpdatedState(onDismiss)
	val thresholdPx = with(LocalDensity.current) { 120.dp.toPx() }
	val flickPx = with(LocalDensity.current) { 1000.dp.toPx() }
	return this
		.onSizeChanged { height = it.height }
		.offset { IntOffset(0, offset.value.roundToInt()) }
		.pointerInput(Unit) {
			val tracker = VelocityTracker()
			// The finger's own travel since the drag began - the sheet moves under it, so its local position can't say.
			var travel = 0f
			detectVerticalDragGestures(
				onDragStart = { tracker.resetTracking(); travel = 0f },
				onDragEnd = {
					if (dismissing) return@detectVerticalDragGestures
					val flick = tracker.calculateVelocity().y > flickPx
					scope.launch {
						if (offset.value > minOf(thresholdPx, height / 3f) || (flick && offset.value > 0f)) {
							dismissing = true
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
				if (dismissing) return@detectVerticalDragGestures
				travel += dy
				tracker.addPosition(change.uptimeMillis, androidx.compose.ui.geometry.Offset(0f, travel))
				scope.launch { offset.snapTo((offset.value + dy).coerceAtLeast(0f)) }
			}
		}
}
