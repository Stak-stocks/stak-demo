package com.stak.demo.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.EaseOut
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.Stable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.stak.demo.ui.theme.Geist
import kotlinx.coroutines.delay

/** What every surface says when a save is refused at MyStakHoldings.CAPACITY. */
internal const val STAK_FULL_MESSAGE = "Your STAK is full — remove a stock to save another"

/**
 * A refused save's notice, shared so Discover, Stock Detail and News say the
 * same thing for the same time. Each surface had its own boolean and timer, and
 * the timer was keyed on that boolean: a second refusal while the first notice
 * was up set true on true, didn't restart it, and cut the second one short.
 * [show] stamps a fresh moment instead, so every refusal gets its full span.
 */
@Stable
internal class StakFullNoticeState {
	var shownAt by mutableLongStateOf(0L)
		private set
	val visible: Boolean get() = shownAt != 0L
	fun show() { shownAt = System.nanoTime() }
	internal fun hide() { shownAt = 0L }
}

/** The same span as Discover's undo toast, the other transient message at that spot. */
private const val NOTICE_MS = 3000L

@Composable
internal fun rememberStakFullNoticeState(): StakFullNoticeState {
	val state = remember { StakFullNoticeState() }
	LaunchedEffect(state.shownAt) {
		if (state.shownAt == 0L) return@LaunchedEffect
		delay(NOTICE_MS)
		state.hide()
	}
	return state
}

/**
 * The notice as a toast, drawn to match Discover's undo pill - it appears in
 * the same place, and two different shapes there read as two different kinds of
 * message.
 */
@Composable
internal fun StakFullToast(state: StakFullNoticeState, u: Float, modifier: Modifier = Modifier) {
	AnimatedVisibility(
		visible = state.visible,
		enter = slideInVertically(tween(280, easing = EaseOut)) { -it } + fadeIn(tween(200)),
		exit = slideOutVertically(tween(220)) { -it } + fadeOut(tween(200)),
		modifier = modifier,
	) {
		Box(
			modifier = Modifier
				.clip(RoundedCornerShape(50))
				.background(Color(0xF2121A2B))
				.border((1 * u).dp, Color(0xFF8A94A8).copy(alpha = 0.45f), RoundedCornerShape(50))
				.padding(horizontal = (16 * u).dp, vertical = (12 * u).dp),
		) {
			Text(
				STAK_FULL_MESSAGE,
				style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (12 * u).sp),
				color = Color(0xFFD7DEEA),
			)
		}
	}
}
