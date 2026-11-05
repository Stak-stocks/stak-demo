package com.stak.demo.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.width
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.unit.dp
import com.stak.demo.ui.theme.StakColors

/**
 * The width (dp) the app draws in when it isn't the whole window - read by figmaUnit. Null on a
 * phone, where figmaUnit measures the window itself.
 */
val LocalAppWidthDp = staticCompositionLocalOf<Float?> { null }

/**
 * The window's width, or on a window too short for the 390x844 frame (portrait, under 1.7x as tall
 * as wide - a tablet, an unfolded foldable; the shortest phones are ~1.78x), the width of a column
 * with the frame's shape. Landscape is left whole: there the app is only ever the fullscreen video.
 */
internal fun columnWidthDp(width: Float, height: Float): Float =
	if (width > 0f && height > width && height / width < 1.7f) kotlin.math.floor(height * 390f / 844f) else width

/**
 * The app in its column: the whole window on a phone; on a tablet or an unfolded foldable, a
 * phone-shaped column centred between two panels of the page colour - their screens are too short
 * for the frame (Discover's card ran under its buttons, the tab bar fell off the bottom). Mirrors
 * the iPhone app's PhoneColumn on an iPad. The panels are solid and take touches: pages parked
 * beside the column (a tab's shell, a page under a pushed one) would otherwise answer taps there.
 */
@Composable
fun PhoneColumn(content: @Composable () -> Unit) {
	BoxWithConstraints(modifier = Modifier.fillMaxSize().background(StakColors.Bg)) {
		val window = maxWidth.value
		val column = columnWidthDp(window, maxHeight.value)
		val columned = column < window
		val margin = if (columned) (window - column) / 2f else 0f
		// The same tree either way, so unfolding a foldable doesn't reset what's on screen.
		Box(
			modifier = Modifier
				.align(Alignment.Center)
				.width((if (columned) column else window).dp)
				.fillMaxHeight()
				.clipToBounds(),
		) {
			CompositionLocalProvider(LocalAppWidthDp provides (if (columned) column else null)) { content() }
		}
		listOf(Alignment.CenterStart, Alignment.CenterEnd).forEach { side ->
			Box(
				modifier = Modifier
					.align(side)
					.width(margin.dp)
					.fillMaxHeight()
					.background(StakColors.Bg)
					.pointerInput(columned) {
						if (!columned) return@pointerInput
						awaitPointerEventScope {
							while (true) awaitPointerEvent().changes.forEach { it.consume() }
						}
					},
			)
		}
	}
}
