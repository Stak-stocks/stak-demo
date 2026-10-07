package com.stak.demo.ui.components

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import com.stak.demo.R
import com.stak.demo.ui.theme.StakColors
import kotlinx.coroutines.delay

/**
 * 11 · States — the loading frames (Chinedu_Mobile 1:6057 Home · Loading, 1:6189 Deck · Loading,
 * 1:6360 Stock detail · Loading, 2026-10-07). Each is the authored frame itself, baked from its 2x
 * export with the status bar cropped off (sk_*.png, drawn at the screen's width = the artboard
 * unit) and the tab bar split out so it anchors to the screen bottom like the live bar.
 *
 * WHEN THEY SHOW (demo rule, the file authors no loading motion): the first time a page is
 * opened in a process it warms up behind its skeleton for WARMUP_MILLIS - Home and the deck
 * behind the whole-screen frames (tab bar included), a stock page behind the content frame
 * under its real top bar. Nothing is fetched in this build, so the window is the signal.
 * Mirrors ios Components/Skeletons.swift.
 */
object Warmup {
	const val HOME = "home"
	const val DECK = "deck"
	const val STOCK = "stock"
	const val WARMUP_MILLIS = 700L
	private val done = mutableSetOf<String>()

	fun pending(key: String): Boolean = key !in done
	fun finish(key: String) { done += key }
}

/** Covers its parent with `skeleton` until the page's warm-up window closes; nothing once it has. */
@Composable
fun WarmupOverlay(key: String, skeleton: @Composable () -> Unit) {
	var show by remember { mutableStateOf(Warmup.pending(key)) }
	if (!show) return
	LaunchedEffect(Unit) {
		delay(Warmup.WARMUP_MILLIS)
		Warmup.finish(key)
		show = false
	}
	Box(modifier = Modifier.fillMaxSize().background(StakColors.Bg)) { skeleton() }
}

/** Home · Loading (1:6057): the greeting, mood deck, why-card and banner placeholders over the skeleton tab bar. */
@Composable
fun HomeLoadingSkeleton() = BakedSkeleton(content = R.drawable.sk_home, tabBar = R.drawable.sk_home_tabbar)

/** Deck · Loading (1:6189): the Discover header, ring, queue slabs, gesture hint and CTA ghosts over the skeleton tab bar. */
@Composable
fun DeckLoadingSkeleton() = BakedSkeleton(content = R.drawable.sk_deck, tabBar = R.drawable.sk_deck_tabbar)

/** Stock detail · Loading (1:6360): everything under the real top bar - price hero, chart, modules, CTAs. */
@Composable
fun StockDetailLoadingSkeleton() = BakedSkeleton(content = R.drawable.sk_stock, tabBar = null, statusBar = false)

@Composable
private fun BakedSkeleton(content: Int, tabBar: Int?, statusBar: Boolean = true) {
	Column(modifier = Modifier.fillMaxSize().then(if (statusBar) Modifier.statusBarsPadding() else Modifier)) {
		Image(
			painter = painterResource(content),
			contentDescription = "Loading",
			contentScale = ContentScale.FillWidth,
			alignment = Alignment.TopCenter,
			modifier = Modifier.fillMaxWidth().weight(1f).clipToBounds(),
		)
		if (tabBar != null) {
			Box(modifier = Modifier.fillMaxWidth().background(Color(0xFF060C1D)).navigationBarsPadding()) {
				Image(painter = painterResource(tabBar), contentDescription = null, contentScale = ContentScale.FillWidth, modifier = Modifier.fillMaxWidth())
			}
		}
	}
}
