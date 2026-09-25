package com.stak.demo.ui.components

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.stak.demo.R
import com.stak.demo.ui.theme.Inter

/** The five CHINEDU tabs - all built. */
enum class MainTab(val label: String, val activeIcon: Int, val inactiveIcon: Int) {
	Home("Home", R.drawable.ic_tab_home, R.drawable.ic_tab_home_inactive),
	News("News", R.drawable.ic_tab_news_active, R.drawable.ic_tab_news),
	Discover("Discover", R.drawable.tab_discover_active, R.drawable.ic_tab_discover),
	MySTAK("My STAK", R.drawable.ic_tab_mystak_active, R.drawable.ic_tab_mystak),
	Simulate("Simulate", R.drawable.tab_simulate_active, R.drawable.ic_tab_simulate),
}

/**
 * CHINEDU tab bar (Home Main 1:1220 / News listing 1:1352) — 86px
 * #060c1d, five 24px icons with Inter 12 white labels, gap 28. Active
 * tabs use their filled/bright glyph; switching is the prototype's
 * "Swap overlay · Instant".
 */
@Composable
fun MainTabBar(selected: MainTab, onSelect: (MainTab) -> Unit) {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
	// ONE stable bar on every tab (user, 2026-08-23): only the active tab
	// changes; the Discover frame's 75/30 variant is a recorded standing
	// deviation. The authored 86 bar is the visible band; Android's system
	// gesture pill gets its OWN band below it (navigation-bar inset, same
	// #060c1d) instead of overlaying the labels - the pill sat right under
	// "Home" (user, 2026-09-04: "there should be space"). The iPhone frame
	// keeps its indicator inside the 86 as authored.
	Box(
		modifier = Modifier
			.fillMaxWidth()
			.background(Color(0xFF060C1D))
			.navigationBarsPadding()
			.height((86 * u).dp),
	) {
		Row(
			// Gap 30 / row 337 (+0.5 nudge) - the spec on the News, My STAK,
			// Simulate and Discover bars (1:1353/1:3327/1:4116/1:1788). The
			// HOME bars author 28/329 (1:1221, dev 118:1757) - overridden by
			// the one-stable-bar ruling; majority spec wins (user, 2026-08-23).
			horizontalArrangement = Arrangement.spacedBy((30 * u).dp),
			verticalAlignment = Alignment.Top,
			modifier = Modifier.align(Alignment.TopCenter).offset(x = (0.5 * u).dp).padding(top = (18 * u).dp),
		) {
			MainTab.entries.forEach { tab ->
				Column(
					horizontalAlignment = Alignment.CenterHorizontally,
					verticalArrangement = Arrangement.spacedBy((10 * u).dp),
					// Authored: only Tab - Home has a fixed width (34); the rest hug.
					modifier = (if (tab == MainTab.Home) Modifier.width((34 * u).dp) else Modifier).clickable(
						interactionSource = remember { MutableInteractionSource() },
						indication = com.stak.demo.ui.theme.PressDim,
					) { onSelect(tab) },
				) {
					Image(
						painter = painterResource(if (tab == selected) tab.activeIcon else tab.inactiveIcon),
						contentDescription = tab.label,
						modifier = Modifier.size((24 * u).dp),
					)
					Text(
						text = tab.label,
						// Measured exception (user screenshot, 2026-09-04): the Home
						// column is the authored 34-wide hug, so the advance-rounding
						// compensation pushed "Home" onto two lines - the labels take
						// no tracking and never wrap.
						style = TextStyle(fontFamily = Inter, fontWeight = FontWeight.Normal, fontSize = (12 * u).sp),
						color = Color.White,
						maxLines = 1,
						softWrap = false,
					)
				}
			}
		}
	}
}
