package com.stak.demo.ui.components

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.rememberUpdatedState
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.repeatOnLifecycle
import kotlinx.coroutines.delay

/** How often an on-screen price refreshes while the market is open. */
internal const val LIVE_PRICE_INTERVAL_MS = 15_000L

/**
 * Calls [onTick] every [intervalMs] while this screen is resumed - on screen and the
 * app in front. Leaving the screen, locking the phone or switching apps stops it, so
 * prices are only fetched for someone looking at them. Each tick decides for itself
 * whether there is anything to do (the market may be closed).
 */
@Composable
internal fun RefreshWhileVisible(key: Any?, intervalMs: Long = LIVE_PRICE_INTERVAL_MS, onTick: () -> Unit) {
	val lifecycleOwner = LocalLifecycleOwner.current
	val tick = rememberUpdatedState(onTick)
	LaunchedEffect(key, lifecycleOwner) {
		lifecycleOwner.repeatOnLifecycle(Lifecycle.State.RESUMED) {
			while (true) {
				delay(intervalMs)
				tick.value()
			}
		}
	}
}
