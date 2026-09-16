package com.stak.demo.ui.discover

import com.stak.demo.ui.theme.FIGMA_LINE_BOX
import com.stak.demo.ui.theme.fractionalSpacedBy
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.EnterTransition
import androidx.compose.animation.ExitTransition
import androidx.compose.animation.core.EaseOut
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.stak.demo.R
import com.stak.demo.ui.components.MainTab
import com.stak.demo.ui.components.RANGE_LABELS
import com.stak.demo.ui.components.RANGE_SERIES
import com.stak.demo.ui.components.RangeChart
import com.stak.demo.ui.components.MainTabBar
import com.stak.demo.ui.onboarding.AuthBackCircle
import com.stak.demo.ui.theme.Geist
import com.stak.demo.ui.theme.Sora
import com.stak.demo.ui.theme.StakColors

private val Card = Color(0xFF181F30)
private val Bright = Color(0xFFF2F6FC)
private val Muted = Color(0xFF819ABB)
private val Green = Color(0xFF2FD08A)
// Down moves (Codex parity audit 2026-09-04): the template only ever served up
// tickers; the same red the Simulate rows use, keyed on the ▼ glyph.
private val Red = Color(0xFFFF5A6A)
private val Teal = Color(0xFF69B3CA)

private val BULLISH_ACTIONS = setOf("Buy", "Strong Buy", "Outperform", "Overweight", "Market Outperform")

/**
 * Discover · Stock Detail (CHINEDU 1:2382 folded, 92:969 save success)
 * — reached from the deck's Learn more, serving the TAPPED stock's
 * facts (AAPL carries the authored values verbatim): price hero, the
 * performance chart with range pills, Risk fit, Numbers that matter,
 * Analyst view / Compare and learn (collapsed), News signal, TIP and
 * the Save / Practice buy CTAs. Saving raises the Saved-to-My-STAK
 * sheet and flips the CTA area to the saved state.
 */
@Composable
fun StockDetailScreen(
	onBack: () -> Unit,
	// The stock the page serves - deck taps route their card here (user,
	// 2026-09-01: the NVIDIA card must open NVIDIA, not AAPL).
	symbol: String = "AAPL",
	fromMyStak: Boolean = false,
	viewModel: StockDetailViewModel = hiltViewModel(),
	// B5 (1:2382 Motion): the Discover entry's Practice buy leaves the
	// detail for the Simulate tab; null keeps the in-page ticket.
	onPracticeBuy: (() -> Unit)? = null,
	// B7/B13: the success sheets' "View in My STAK" pop (92:969/71:949).
	onViewInMyStak: (() -> Unit)? = null,
	// B8 (92:969 Motion): "Keep exploring" dissolves back to the deck.
	onKeepExploring: (() -> Unit)? = null,
	// B9 (1:2579): the Discover-entry OPEN state composes the shell tab
	// bar; each tab pops the detail Instant and lands on that tab.
	onTab: ((MainTab) -> Unit)? = null,
) {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
	// A real account never borrows authored facts - not even for the moment before
	// its own data lands. They flashed another company's numbers under this stock's
	// name on every open (user, 2026-09-15). The demo keeps its authored frames.
	val f = if (com.stak.demo.data.Session.demoAccount) {
		DETAIL_FACTS[symbol] ?: DETAIL_FACTS.getValue("AAPL")
	} else {
		emptyFacts(symbol)
	}
	val liveDetail by viewModel.liveDetail.collectAsStateWithLifecycle()
	val chartSeries by viewModel.chartSeries.collectAsStateWithLifecycle()
	val chartMissing by viewModel.chartMissing.collectAsStateWithLifecycle()
	val chartPct by viewModel.chartPct.collectAsStateWithLifecycle()
	val savedReference by viewModel.savedReference.collectAsStateWithLifecycle()
	val savedReferenceSettled by viewModel.savedReferenceSettled.collectAsStateWithLifecycle()
	LaunchedEffect(symbol) { viewModel.fetch(symbol) }
	// The Discover entry follows THIS RUN's saves, like the deck's Save chip:
	// 1:2382/1:2579 author "Unsaved" for a stock My STAK already lists, and
	// the chip ruling (user, 2026-09-04: 1:1627 shows Save on NVDA even
	// though My STAK holds it) applies to the page it opens. The seeded
	// holdings made every designed card open "Saved" (StakTest walk vs the
	// 2x export of 1:2382, 2026-09-04 evening). My STAK entry opens saved.
	var saved by rememberSaveable { mutableStateOf(fromMyStak || symbol in DeckSession.saved) }
	var showSuccess by rememberSaveable { mutableStateOf(false) }
	var showBuy by rememberSaveable { mutableStateOf(false) }
	// Shown when Save is refused because the Stak is full; clears on its own.
	val stakFullNotice = com.stak.demo.ui.components.rememberStakFullNoticeState()
	// The range pills select (user, 2026-09-05); "3M" keeps the authored sd_chart_line (1:2382).
	var range by rememberSaveable { mutableStateOf("3M") }
	// Each pill draws that range's own closes; the demo keeps its authored line.
	if (!com.stak.demo.data.Session.demoAccount) {
		LaunchedEffect(symbol, range) { viewModel.selectRange(symbol, range) }
	}
	// B9/B13: hoisted Analyst state - the open state carries the tab bar
	// (Discover entry) and the buy-success "Done" folds the section.
	var analystOpen by rememberSaveable { mutableStateOf(false) }

	Box(modifier = Modifier.fillMaxSize().background(StakColors.Bg)) {
		Column(modifier = Modifier.fillMaxSize()) {
			Row(
				verticalAlignment = Alignment.CenterVertically,
				modifier = Modifier
					.fillMaxWidth()
					.background(StakColors.Bg)
					.statusBarsPadding()
					.padding(horizontal = (18 * u).dp, vertical = (8 * u).dp),
			) {
				AuthBackCircle(onClick = onBack)
				Spacer(modifier = Modifier.weight(1f))
				Text(
					text = symbol,
					style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (16 * u).sp),
					color = Color.White,
				)
				Spacer(modifier = Modifier.weight(1f))
				// The share control had no click handling at all - a drawing that took
				// a tap and did nothing, without even the press dim every real button
				// here shows. Removed until there is something to share to; the spacer
				// keeps the title centred against the back circle.
				Spacer(modifier = Modifier.size((40 * u).dp))
			}
			Column(modifier = Modifier.weight(1f).fillMaxWidth().verticalScroll(rememberScrollState()).navigationBarsPadding()) {
				Column(
					verticalArrangement = Arrangement.spacedBy((4 * u).dp),
					modifier = Modifier.fillMaxWidth().padding(horizontal = (20 * u).dp).padding(top = (10 * u).dp, bottom = (6 * u).dp),
				) {
					val displayPrice = liveDetail?.price ?: f.price
					// The figure follows the selected pill: a red line for the year above a
					// green "today" was two periods stacked with nothing to tell them apart.
					val displayChange = chartPct.let { p -> if (range != "1D" && p != null) rangeChangeText(p, range) else (liveDetail?.change ?: f.change) }
					// The page names the stock it is showing; the authored title is another
					// company's whenever this symbol has no authored facts of its own.
					Text(liveDetail?.name?.let { "$symbol · $it" } ?: f.title, style = TextStyle(fontFamily = Geist, fontSize = (11 * u).sp), color = Muted)
					Text(
						displayPrice,
						style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (26 * u).sp),
						color = Bright,
					)
					Text(
						displayChange,
						style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (12 * u).sp),
						color = if (displayChange.startsWith("▼")) Red else Green,
					)
				}
				val chartModifier = Modifier.align(Alignment.CenterHorizontally).size((345 * u).dp, (76 * u).dp)
				if (com.stak.demo.data.Session.demoAccount) {
					val series = RANGE_SERIES[range]
					if (series == null) {
						Image(
							painter = painterResource(R.drawable.sd_chart_line),
							contentDescription = null,
							contentScale = ContentScale.Fit,
							modifier = chartModifier,
						)
					} else {
						RangeChart(series = series, tint = Teal, modifier = chartModifier)
					}
				} else {
					// This stock's own closes. A range with no prices draws nothing:
					// a shape invented to fill the box would read as its real history.
					val live = chartSeries
					if (live != null) {
						// The line's colour is the range's verdict: green where the
						// period ends above where it started, red where it ends below.
						RangeChart(series = live, tint = if ((chartPct ?: 0.0) < 0.0) Red else Green, modifier = chartModifier)
					} else {
						Box(contentAlignment = Alignment.Center, modifier = chartModifier) {
							if (chartMissing) {
								Text(
									"No price history for this range",
									style = TextStyle(fontFamily = Geist, fontSize = (11 * u).sp),
									color = Muted,
								)
							}
						}
					}
				}
				Spacer(modifier = Modifier.height((40 * u).dp))
				Row(
					verticalAlignment = Alignment.CenterVertically,
					horizontalArrangement = Arrangement.spacedBy((37 * u).dp),
					modifier = Modifier.align(Alignment.CenterHorizontally),
				) {
					RANGE_LABELS.forEach { label ->
						val select = Modifier.clickable(
							interactionSource = remember { MutableInteractionSource() },
							indication = com.stak.demo.ui.theme.PressDim,
						) { range = label }
						if (label == range) {
							Box(
								contentAlignment = Alignment.Center,
								modifier = Modifier
									.size((39 * u).dp, (22.5 * u).dp)
									.clip(RoundedCornerShape((11.25 * u).dp))
									.background(Color(0x292C9DBC))
									.border((0.75 * u).dp, Color(0x662C9DBC), RoundedCornerShape((11.25 * u).dp))
									.then(select),
							) {
								Text(
									label,
									style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (12 * u).sp),
									color = Teal,
								)
							}
						} else {
							Text(label, style = TextStyle(fontFamily = Geist, fontSize = (12 * u).sp), color = Muted, modifier = select)
						}
					}
				}
				Column(
					// Fractional gaps: Compose's per-gap px rounding drifted the last
					// modules 2.5 below the frame (StakTest, 2026-09-05).
					verticalArrangement = fractionalSpacedBy((14 * u).dp),
					modifier = Modifier.fillMaxWidth().padding(horizontal = (20 * u).dp, vertical = (12 * u).dp),
				) {
					if (fromMyStak) {
						SinceYouSavedCard(f, symbol, liveDetail, savedReference, savedReferenceSettled)
					}
					RiskFitCard(f, liveDetail)
					NumbersCard(f, liveDetail)
					AnalystCard(f, open = analystOpen, onToggle = { analystOpen = !analystOpen }, liveDetail = liveDetail)
					NewsSignalCard(f, liveDetail)
					CompareCard(f, liveDetail, symbol)
				}
				Column(
					verticalArrangement = Arrangement.spacedBy((10 * u).dp),
					modifier = Modifier.fillMaxWidth().padding(horizontal = (20 * u).dp).padding(top = (4 * u).dp, bottom = (16 * u).dp),
				) {
					if (fromMyStak) {
						DetailCta("Practice buy") { showBuy = true }
						// Codex audit (2026-09-04): Unsave drops the stock from the
						// holdings store, so the collection page and every count follow.
						DetailSecondary("Unsave") { com.stak.demo.data.MyStakHoldings.remove(symbol); onBack() }
					} else if (saved) {
						// A saved stock reads the same from every entry: the authored
						// saved block (16:1012) - Practice buy + Unsave. The "Saved to
						// My STAK" outline button was never in a frame (user, 2026-09-05:
						// "something is off when I saved my stock"). Unsave here drops
						// the stock from this run's saves and the holdings store and
						// stays on the page with the Save CTA back.
						DetailCta("Practice buy") { if (onPracticeBuy != null) onPracticeBuy() else showBuy = true }
						DetailSecondary("Unsave") {
							saved = false
							DeckSession.saved = DeckSession.saved - symbol
							com.stak.demo.data.MyStakHoldings.remove(symbol)
						}
					} else {
						// The sheet this opens says "Saved to My STAK" before the save is
						// attempted, so a full Stak must not reach it - and must say why
						// rather than leaving the button to do nothing.
						DetailCta("Save") {
							if (com.stak.demo.data.MyStakHoldings.isFull) stakFullNotice.show() else showSuccess = true
						}
						if (stakFullNotice.visible) {
							Text(
								com.stak.demo.ui.components.STAK_FULL_MESSAGE,
								style = TextStyle(fontFamily = Geist, fontSize = (11 * u).sp),
								color = Muted,
								modifier = Modifier.fillMaxWidth(),
								textAlign = androidx.compose.ui.text.style.TextAlign.Center,
							)
						}
						DetailSecondary("Practice buy") { if (onPracticeBuy != null) onPracticeBuy() else showBuy = true }
					}
				}
			}
			if (!fromMyStak && analystOpen && onTab != null) {
				// B9: ONLY the Discover-entry OPEN frame (1:2579) authors the
				// 86 shell bar pinned at the bottom - SWAP taps pop the detail.
				MainTabBar(selected = MainTab.Discover, onSelect = onTab)
			}
		}
		// B6: the save-success sheet enters like the News one - scale
		// 0.92 -> 1 + fade - at the authored 350 ease-out (92:969).
		AnimatedVisibility(
			visible = showSuccess,
			enter = scaleIn(initialScale = 0.92f, animationSpec = tween(350, easing = EaseOut)) +
				fadeIn(tween(350, easing = EaseOut)),
			// The scrim dismiss is unauthored - it stays instant.
			exit = ExitTransition.None,
		) {
			DetailSavedSheet(symbol = symbol, liveDetail = liveDetail,
				f = f,
				onDone = { showSuccess = false; saved = true; DeckSession.saved = DeckSession.saved + symbol },
				// B7/B8: both CTAs mark the stock saved, then leave the page
				// (forward push to My STAK / dissolve back to the deck).
				onViewInMyStak = {
					// add() is the authority: it refuses at capacity, and a refused save
					// must not leave this page or the deck believing the stock is kept.
					saved = com.stak.demo.data.MyStakHoldings.add(symbol)
					if (saved) DeckSession.saved = DeckSession.saved + symbol
					if (onViewInMyStak != null) onViewInMyStak() else { showSuccess = false }
				},
				onKeepExploring = {
					// add() is the authority: it refuses at capacity, and a refused save
					// must not leave this page or the deck believing the stock is kept.
					saved = com.stak.demo.data.MyStakHoldings.add(symbol)
					if (saved) DeckSession.saved = DeckSession.saved + symbol
					if (onKeepExploring != null) onKeepExploring() else { showSuccess = false }
				},
			)
		}
		// B13 (1:3423 Motion): the buy sheet's Back and the success "Done"
		// both dismiss with a 300 dissolve over the detail.
		AnimatedVisibility(
			visible = showBuy,
			enter = EnterTransition.None,
			exit = fadeOut(tween(300, easing = EaseOut)),
		) {
			DetailBuyHost(
				spec = liveBuySpec(symbol, liveDetail, f),
				onClose = { showBuy = false },
				onViewInMyStak = { if (onViewInMyStak != null) onViewInMyStak() else { showBuy = false } },
				// B13: "Done" also folds the Analyst section - the authored
				// destination is the FOLDED detail (16:1012).
				onDone = { analystOpen = false; showBuy = false },
			)
		}
	}
}

@Composable
private fun RiskFitCard(f: DetailFacts, liveDetail: LiveDetail? = null) {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
	// Beta decides where the marker sits and what the chip says. Until it lands
	// there is nothing to place or to claim - the placeholder's mid-track value
	// would otherwise read as "Around market" for a stock we know nothing about.
	val known = liveDetail?.riskPillX != null || com.stak.demo.data.Session.demoAccount
	Column(
		verticalArrangement = Arrangement.spacedBy((12 * u).dp),
		modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape((16 * u).dp)).background(Card)
			.padding(horizontal = (16 * u).dp, vertical = (14 * u).dp),
	) {
		// 1:2427 authors a 24-tall head row - exact-design audit 2026-09-04.
		Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth().height((24 * u).dp)) {
			Text(
				"Risk fit",
				style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (15 * u).sp),
				color = Bright,
			)
			Spacer(modifier = Modifier.weight(1f))
			if (known) {
				Box(
					modifier = Modifier
						.clip(RoundedCornerShape((999 * u).dp))
						.background(Color(0x1F5DA8BF))
						.padding(horizontal = (10 * u).dp, vertical = (4 * u).dp),
				) {
					Text(
						riskFitFor(f, liveDetail).first,
						style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (11 * u).sp),
						color = Color(0xFFA6E4F7),
					)
				}
			}
		}
		// 1:2382 draws the marker alone, with no track. That reads as decoration;
		// once the position is real it needs a scale to be read against, and a
		// midpoint tick for the market itself (beta 1.0), which is what "more" and
		// "less than the market" are measured from. The offset is a fraction of the
		// measured width, not a fixed dp: riskPillX is computed against a 375-wide
		// design and drifted off the track on any other screen.
		BoxWithConstraints(contentAlignment = Alignment.CenterStart, modifier = Modifier.fillMaxWidth().height((8 * u).dp)) {
			val pillWidth = (14 * u).dp
			val fraction = ((liveDetail?.riskPillX ?: f.riskPillX) / 289f).coerceIn(0f, 1f)
			Box(modifier = Modifier.fillMaxWidth().height((4 * u).dp).background(Color(0xFF2A3346), RoundedCornerShape((2 * u).dp)))
			Box(modifier = Modifier.offset(x = (maxWidth - (2 * u).dp) / 2).size((2 * u).dp, (8 * u).dp).background(Color(0xFF3A465E)))
			if (known) {
				Box(modifier = Modifier.offset(x = (maxWidth - pillWidth) * fraction).size(pillWidth, (8 * u).dp).background(Color(0xFFA6E4F7), RoundedCornerShape((4 * u).dp)))
			}
		}
		Row(modifier = Modifier.fillMaxWidth()) {
			Text("Low", style = TextStyle(fontFamily = Geist, fontSize = (10 * u).sp), color = Muted)
			Spacer(modifier = Modifier.weight(1f))
			// Names what the midpoint tick is, so "moves more than the market" has
			// something on the scale to point at.
			Text("Market", style = TextStyle(fontFamily = Geist, fontSize = (10 * u).sp), color = Muted)
			Spacer(modifier = Modifier.weight(1f))
			Text("High", style = TextStyle(fontFamily = Geist, fontSize = (10 * u).sp), color = Muted)
		}
		Text(
			riskFitFor(f, liveDetail).second,
			style = TextStyle(fontFamily = Geist, fontSize = (11 * u).sp),
			color = Muted,
		)
	}
}

@Composable
private fun NumbersCard(f: DetailFacts, liveDetail: LiveDetail? = null) {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
	val displayStats = if (liveDetail != null) {
		f.stats.mapIndexed { i, st ->
			when (i) {
				0 -> st.copy(value = liveDetail.peRatioValue ?: st.value, verdict = liveDetail.statVerdicts?.getOrNull(0)?.first?.takeIf { it.isNotBlank() } ?: st.verdict, good = liveDetail.statVerdicts?.getOrNull(0)?.second ?: st.good)
				1 -> st.copy(value = liveDetail.revenueGrowthValue ?: st.value, verdict = liveDetail.statVerdicts?.getOrNull(1)?.first?.takeIf { it.isNotBlank() } ?: st.verdict, good = liveDetail.statVerdicts?.getOrNull(1)?.second ?: st.good)
				2 -> st.copy(value = liveDetail.profitMarginValue ?: st.value, verdict = liveDetail.statVerdicts?.getOrNull(2)?.first?.takeIf { it.isNotBlank() } ?: st.verdict, good = liveDetail.statVerdicts?.getOrNull(2)?.second ?: st.good)
				else -> st
			}
		}
	} else f.stats
	Column(
		verticalArrangement = Arrangement.spacedBy((12 * u).dp),
		modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape((16 * u).dp)).background(Card)
			.padding(horizontal = (16 * u).dp, vertical = (14 * u).dp),
	) {
		Text(
			"Numbers that matter",
			style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (15 * u).sp),
			color = Bright,
		)
		Row(horizontalArrangement = Arrangement.spacedBy((8 * u).dp), modifier = Modifier.fillMaxWidth()) {
			displayStats.forEach { st ->
				StatCell(st.label, st.value, st.verdict, if (st.good) Green else Muted, Modifier.weight(1f), border = st.border)
			}
		}
	}
}

@Composable
private fun StatCell(label: String, value: String, verdict: String, verdictColor: Color, modifier: Modifier, border: Boolean = false) {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
	Column(
		verticalArrangement = Arrangement.spacedBy((4 * u).dp),
		modifier = modifier
			.clip(RoundedCornerShape((12 * u).dp))
			.background(Card)
			.then(if (border) Modifier.border((1 * u).dp, Color(0xFF212D4B), RoundedCornerShape((12 * u).dp)) else Modifier)
			.padding((10 * u).dp),
	) {
		Text(label, style = TextStyle(fontFamily = Geist, fontSize = (10 * u).sp), color = Muted)
		Text(value, style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (17 * u).sp), color = Bright)
		Text(verdict, style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (10 * u).sp), color = verdictColor)
	}
}

@Composable
private fun CollapsedCard(title: String, sub: String, subColor: Color) {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
	Column(
		verticalArrangement = Arrangement.spacedBy((12 * u).dp),
		modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape((16 * u).dp)).background(Card)
			.padding(horizontal = (16 * u).dp, vertical = (14 * u).dp),
	) {
		Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
			Text(
				title,
				style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (15 * u).sp),
				color = Bright,
			)
			Spacer(modifier = Modifier.weight(1f))
			Image(painterResource(R.drawable.ic_sd_caret), null, modifier = Modifier.size((20 * u).dp))
		}
		Text(
			sub,
			style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (11 * u).sp),
			color = subColor,
		)
	}
}

@Composable
private fun NewsSignalCard(f: DetailFacts, liveDetail: LiveDetail? = null) {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
	val displayNewsClose = liveDetail?.newsClose ?: f.newsClose
	val displayNewsSignal = liveDetail?.newsSignal ?: f.newsSignal
	val displayEarnings = liveDetail?.earningsStr ?: f.newsEarnings
	Column(
		verticalArrangement = Arrangement.spacedBy((12 * u).dp),
		modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape((16 * u).dp)).background(Card)
			.padding(horizontal = (16 * u).dp, vertical = (14 * u).dp),
	) {
		Text(
			"News signal",
			style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (15 * u).sp),
			color = Bright,
		)
		Text(
			displayNewsClose,
			style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (11 * u).sp),
			color = if (displayNewsClose.startsWith("▼")) Red else Green,
		)
		Text(
			displayNewsSignal,
			style = TextStyle(fontFamily = Geist, fontSize = (11 * u).sp),
			color = Muted,
		)
		Text(displayEarnings, style = TextStyle(fontFamily = Geist, fontSize = (11 * u).sp), color = Muted)
		Row(
			horizontalArrangement = Arrangement.spacedBy((12 * u).dp),
			modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
		) {
			(liveDetail?.newsSources ?: f.newsSources).forEachIndexed { i, (src, tag) ->
				Column(
					verticalArrangement = Arrangement.spacedBy((8 * u).dp),
					modifier = Modifier
						.width((205 * u).dp)
						.clip(RoundedCornerShape((12 * u).dp))
						.background(Card)
						.padding((12 * u).dp),
				) {
					Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
						Text(
							src,
							style = TextStyle(fontFamily = Geist, fontSize = (10 * u).sp),
							color = Muted,
						)
						Spacer(modifier = Modifier.weight(1f))
						Box(
							modifier = Modifier
								.clip(RoundedCornerShape((999 * u).dp))
								.background(Color(0x14FFFFFF))
								.padding(horizontal = (8 * u).dp, vertical = (3 * u).dp),
						) {
							Text(
								tag,
								style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (10 * u).sp),
								color = Muted,
							)
						}
					}
					Text(
						liveDetail?.newsHeadlines?.getOrNull(i) ?: if (i == 0) f.newsHeadline else f.newsHeadline2,
						style = TextStyle(fontFamily = Geist, fontSize = (12 * u).sp),
						color = Bright,
						modifier = Modifier.width((173 * u).dp),
					)
				}
			}
		}
	}
}

@Composable
private fun DetailCta(text: String, onClick: () -> Unit) {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
	Box(
		contentAlignment = Alignment.Center,
		modifier = Modifier
			.fillMaxWidth()
			.height((52 * u).dp)
			.background(
				androidx.compose.ui.graphics.Brush.verticalGradient(
					0.0889f to Color(0xFFA6E4F7),
					0.3919f to Color(0xFF5DA8BF),
					0.7255f to Color(0xFF3C98B4),
					1f to Color(0xFF3C98B4),
				),
				RoundedCornerShape((6 * u).dp),
			)
			.border((0.36 * u).dp, com.stak.demo.ui.theme.StakColors.CtaBorderBrush, RoundedCornerShape((6 * u).dp))
			.clickable(
				interactionSource = remember { MutableInteractionSource() },
				indication = com.stak.demo.ui.theme.PressDim,
				onClick = onClick,
			),
	) {
		Text(text, style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (14 * u).sp), color = Color.White)
	}
}

/**
 * Hairline secondary. The page CTA (1:2568) authors Sora 13; the save-success
 * sheet's "Keep exploring" (92:1205) authors Sora 14 - exact-design audit 2026-09-04.
 */
@Composable
private fun DetailSecondary(text: String, size: Float = 13f, onClick: () -> Unit) {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
	Box(
		contentAlignment = Alignment.Center,
		modifier = Modifier
			.fillMaxWidth()
			.height((52 * u).dp)
			.border((0.36 * u).dp, Color(0x54343B4F), RoundedCornerShape((6 * u).dp))
			.clickable(
				interactionSource = remember { MutableInteractionSource() },
				indication = com.stak.demo.ui.theme.PressDim,
				onClick = onClick,
			),
	) {
		Text(text, style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.Normal, fontSize = (size * u).sp), color = Muted)
	}
}

/** Saved-to-My-STAK sheet over the detail (92:969) — Apple row variant. */
@Composable
private fun DetailSavedSheet(f: DetailFacts, symbol: String = f.symbol, liveDetail: LiveDetail? = null, onDone: () -> Unit, onViewInMyStak: () -> Unit = onDone, onKeepExploring: () -> Unit = onDone) {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
	Box(modifier = Modifier.fillMaxSize()) {
		Box(
			modifier = Modifier
				.fillMaxSize()
				// Authored scrim rgba(12,19,32,0.55) (106:1037).
				.background(Color(0x8C0C1320))
				.clickable(
					interactionSource = remember { MutableInteractionSource() },
					indication = com.stak.demo.ui.theme.PressDim,
					onClick = onDone,
				),
		)
		Column(
			horizontalAlignment = Alignment.CenterHorizontally,
			verticalArrangement = Arrangement.spacedBy((14 * u).dp),
			modifier = Modifier
				.align(Alignment.BottomCenter)
				.fillMaxWidth()
				.clip(RoundedCornerShape(topStart = (24 * u).dp, topEnd = (24 * u).dp))
				.background(Card)
				.padding(horizontal = (20 * u).dp)
				.padding(top = (10 * u).dp)
				.padding(bottom = (30 * u).dp),
		) {
			Box(
				modifier = Modifier
					.padding(bottom = (4 * u).dp)
					.size((40 * u).dp, (4 * u).dp)
					.background(Color(0xFF2A3346), RoundedCornerShape((2 * u).dp)),
			)
			Image(painterResource(R.drawable.ic_sheet_check), null, modifier = Modifier.size((47 * u).dp))
			Text(
				"Saved to My STAK",
				style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (18 * u).sp),
				color = Color.White,
			)
			Row(
				verticalAlignment = Alignment.CenterVertically,
				horizontalArrangement = Arrangement.spacedBy((11 * u).dp),
				modifier = Modifier
					.fillMaxWidth()
					.clip(RoundedCornerShape((6 * u).dp))
					.background(Color(0x1A69B3CA))
					.padding(horizontal = (14 * u).dp, vertical = (12 * u).dp),
			) {
				Box(contentAlignment = Alignment.Center, modifier = Modifier.size((38 * u).dp).background(Color(0xFF242B3D), CircleShape)) {
					Text(if (liveDetail?.name != null) symbol.take(1) else f.sheetBadge, style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (15 * u).sp), color = Color(0xFF9EADC7))
				}
				Column(verticalArrangement = Arrangement.spacedBy((2 * u).dp), modifier = Modifier.weight(1f)) {
					Text(liveDetail?.name ?: f.sheetName, style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (13 * u).sp), color = Color.White)
					Text(liveDetail?.price ?: f.sheetPrice, style = TextStyle(fontFamily = Geist, fontSize = (10 * u).sp), color = Muted)
				}
				val sheetChange = liveDetail?.change ?: f.sheetChange
				Text(sheetChange, style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (12 * u).sp), color = if (sheetChange.startsWith("▼")) Red else Green)
			}
			Text(
				"Watching from today · no money committed",
				style = TextStyle(fontFamily = Geist, fontSize = (12 * u).sp, lineHeight = (18 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
				color = Color(0xFFC8D2E0),
				modifier = Modifier.fillMaxWidth(),
			)
			Column(verticalArrangement = Arrangement.spacedBy((16 * u).dp), modifier = Modifier.fillMaxWidth()) {
				DetailCta("View in My STAK", onClick = onViewInMyStak)
				// 92:1205 authors Sora 14 - exact-design audit 2026-09-04.
				DetailSecondary("Keep exploring", size = 14f, onClick = onKeepExploring)
			}
		}
	}
}

/** The practice-buy ticket reused from the deck (public host wrapper). */
@Composable
private fun DetailBuyHost(spec: BuySpec, onClose: () -> Unit, onViewInMyStak: () -> Unit, onDone: () -> Unit) {
	DiscoverBuyFlow(
		onClose = onClose,
		spec = spec,
		filledSecondary = "Done",
		// 1:3460: the My STAK ticket's secondary is authored "Back".
		ticketSecondary = "Back",
		// B13 (71:949/71:994 Motion): the success CTAs leave the sheet.
		onFilledPrimary = onViewInMyStak,
		onFilledSecondary = onDone,
	)
}

/**
 * Kicker label — Geist 10, tracking 0.8, muted. 1:2653 "PRICE TARGET RANGE"
 * authors Regular; the consensus / RECENT ACTIONS kickers (1:2668 / 1:2675)
 * author Medium - exact-design audit 2026-09-04.
 */
@Composable
private fun Kicker(text: String, weight: FontWeight = FontWeight.Medium) {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
	Text(
		text,
		style = TextStyle(fontFamily = Geist, fontWeight = weight, fontSize = (10 * u).sp, letterSpacing = (0.8 * u).sp),
		color = Muted,
	)
}

/** Analyst view (collapsed 1:2454 / open 1:2651) — caret toggles; state hoisted for B9/B13. */
@Composable
private fun AnalystCard(f: DetailFacts, open: Boolean, onToggle: () -> Unit, liveDetail: LiveDetail? = null) {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
	val displayUpside = liveDetail?.upside ?: f.upside
	val displayTargetLow = liveDetail?.targetLow ?: f.targetLow
	val displayTargetAvg = liveDetail?.targetAvg ?: f.targetAvg
	val displayTargetHigh = liveDetail?.targetHigh ?: f.targetHigh
	val displayMarkerX = liveDetail?.targetMarkerX ?: f.targetMarkerX
	val displayConsensus = liveDetail?.consensus ?: f.consensus
	val displayBuyCount = liveDetail?.buyCount ?: f.buyCount
	val displayHoldCount = liveDetail?.holdCount ?: f.holdCount
	val displaySellCount = liveDetail?.sellCount ?: f.sellCount
	val displayBuyBarW = liveDetail?.buyBarW ?: f.buyBarW
	val displayActions = liveDetail?.actions ?: f.actions
	Column(
		verticalArrangement = Arrangement.spacedBy((12 * u).dp),
		modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape((16 * u).dp)).background(Card)
			.clickable(
				interactionSource = remember { MutableInteractionSource() },
				indication = com.stak.demo.ui.theme.PressDim,
			) { onToggle() }
			.padding(horizontal = (16 * u).dp, vertical = (14 * u).dp),
	) {
		// Collapsed head (1:2455) authors a 22-tall row - exact-design audit 2026-09-04.
		Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth().then(if (!open) Modifier.height((22 * u).dp) else Modifier)) {
			Text(
				"Analyst view",
				style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (15 * u).sp),
				color = Bright,
			)
			Spacer(modifier = Modifier.weight(1f))
			if (!open) {
				Image(painterResource(R.drawable.ic_sd_caret), null, modifier = Modifier.size((20 * u).dp))
			}
		}
		if (!open) {
			Text(
				displayUpside,
				style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (11 * u).sp),
				color = Green,
			)
		} else {
			Kicker("PRICE TARGET RANGE", weight = FontWeight.Normal)
			// 1:2656: a 14 circle at y-3 inside the 8-tall clipped track renders as
			// a 14x8 cap - exact-design audit 2026-09-04 (was 13 wide).
			// The track was a fixed 180 inside a full-width row whose Low/Avg/High
			// labels span the whole width, so it stopped two thirds of the way across
			// and the marker never sat above the Avg it marks. Both now measure from
			// the row's real width; the marker keeps its 0..166 scale as a fraction.
			BoxWithConstraints(modifier = Modifier.fillMaxWidth().height((8 * u).dp)) {
				val pillWidth = (14 * u).dp
				val fraction = (displayMarkerX / 166f).coerceIn(0f, 1f)
				Box(modifier = Modifier.fillMaxWidth().height((8 * u).dp).background(Color(0x8C5DA8BF), RoundedCornerShape((4 * u).dp)))
				Box(modifier = Modifier.offset(x = (maxWidth - pillWidth) * fraction).size(pillWidth, (8 * u).dp).background(Color(0xFFA6E4F7), RoundedCornerShape((4 * u).dp)))
			}
			Row(modifier = Modifier.fillMaxWidth()) {
				Column(verticalArrangement = Arrangement.spacedBy((1 * u).dp)) {
					Text("Low", style = TextStyle(fontFamily = Geist, fontSize = (10 * u).sp), color = Muted)
					Text(displayTargetLow, style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (12 * u).sp), color = Bright)
				}
				Spacer(modifier = Modifier.weight(1f))
				Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy((1 * u).dp)) {
					Text("Avg", style = TextStyle(fontFamily = Geist, fontSize = (10 * u).sp), color = Muted)
					Text(displayTargetAvg, style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (12 * u).sp), color = Bright)
				}
				Spacer(modifier = Modifier.weight(1f))
				Column(horizontalAlignment = Alignment.End, verticalArrangement = Arrangement.spacedBy((1 * u).dp)) {
					Text("High", style = TextStyle(fontFamily = Geist, fontSize = (10 * u).sp), color = Muted)
					Text(displayTargetHigh, style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (12 * u).sp), color = Bright)
				}
			}
			Text(
				displayUpside,
				style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (11 * u).sp),
				color = Green,
			)
			Kicker(displayConsensus)
			// 1:2669 authors the consensus track in the card's own #181F30 (the
			// render shows only the green fill) - exact-design audit 2026-09-04.
			// The track was painted in the card's own colour, so only the green fill
			// showed and it read as a line floating in space. The fill was also sized
			// against a 318 design width inside a full-width box, so its share of the
			// bar was wrong - a unanimous buy would have run past the end of it.
			BoxWithConstraints(modifier = Modifier.fillMaxWidth().height((8 * u).dp).clip(RoundedCornerShape((4 * u).dp)).background(Color(0xFF2A3346))) {
				val fraction = (displayBuyBarW / 318f).coerceIn(0f, 1f)
				Box(modifier = Modifier.width(maxWidth * fraction).height((8 * u).dp).background(Green, RoundedCornerShape((4 * u).dp)))
			}
			Row(modifier = Modifier.fillMaxWidth()) {
				Text(displayBuyCount, style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (11 * u).sp), color = Green)
				Spacer(modifier = Modifier.weight(1f))
				Text(displayHoldCount, style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (11 * u).sp), color = Muted)
				Spacer(modifier = Modifier.weight(1f))
				Text(displaySellCount, style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (11 * u).sp), color = Muted)
			}
			Kicker("RECENT ACTIONS")
			displayActions.forEach { (name, action, target) ->
				// 1:2676..1:2696 author the rows in the card's own #181F30 (flat in
				// the render, no darker wells) - exact-design audit 2026-09-04.
				Row(
					verticalAlignment = Alignment.CenterVertically,
					modifier = Modifier
						.fillMaxWidth()
						.height((38 * u).dp)
						.clip(RoundedCornerShape((10 * u).dp))
						.background(Card)
						.padding(horizontal = (12 * u).dp),
				) {
					// Fixed columns for the action and the target. Laid out by a weighted
					// spacer, the action's own width ("Hold" against "Buy") shifted the
					// price after it, so the targets never lined up down the list.
					Text(
						name,
						style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (12 * u).sp),
						color = Bright,
						maxLines = 1,
						overflow = TextOverflow.Ellipsis,
						modifier = Modifier.weight(1f),
					)
					Text(
						action,
						style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (11 * u).sp),
						color = if (action in BULLISH_ACTIONS) Green else Muted,
						maxLines = 1,
						textAlign = androidx.compose.ui.text.style.TextAlign.End,
						modifier = Modifier.width((64 * u).dp),
					)
					Spacer(modifier = Modifier.width((10 * u).dp))
					Text(
						target,
						style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (12 * u).sp),
						color = Bright,
						maxLines = 1,
						textAlign = androidx.compose.ui.text.style.TextAlign.End,
						modifier = Modifier.width((52 * u).dp),
					)
				}
			}
		}
	}
}

/** Compare and learn (collapsed 1:2526 / open 1:2719) — peer table. */
@Composable
private fun CompareCard(f: DetailFacts, liveDetail: LiveDetail? = null, symbol: String = f.symbol) {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
	var open by rememberSaveable { mutableStateOf(false) }
	// Both states author a 23 gap under the title (1:2526 / 1:2719); the open
	// table and its footnote sit 21 apart (1:2723) - exact-design audit 2026-09-04.
	Column(
		verticalArrangement = Arrangement.spacedBy((23 * u).dp),
		modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape((16 * u).dp)).background(Card)
			.clickable(
				interactionSource = remember { MutableInteractionSource() },
				indication = com.stak.demo.ui.theme.PressDim,
			) { open = !open }
			.padding(horizontal = (16 * u).dp, vertical = (14 * u).dp),
	) {
		// Collapsed head (1:2527) authors a 22-tall row - exact-design audit 2026-09-04.
		Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth().then(if (!open) Modifier.height((22 * u).dp) else Modifier)) {
			Text(
				"Compare and learn",
				style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (15 * u).sp),
				color = Bright,
			)
			Spacer(modifier = Modifier.weight(1f))
			if (!open) {
				Image(painterResource(R.drawable.ic_sd_caret), null, modifier = Modifier.size((20 * u).dp))
			}
		}
		if (!open) {
			// 1:2531 authors Geist Regular - exact-design audit 2026-09-04 (was Medium).
			Text(
				liveDetail?.peersLabel ?: f.peersLabel,
				style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (11 * u).sp),
				color = Muted,
			)
		} else {
			Column(verticalArrangement = Arrangement.spacedBy((21 * u).dp), modifier = Modifier.fillMaxWidth()) {
				// The tint column and the hairline are DRAWN behind the 148-tall
				// table (1:2724), never laid out: as sized siblings the 170-tall
				// tint made the box 170 and pushed the footnote, TIP and CTAs 22
				// down (StakTest band-diff vs the 2x export of 1:2579, 2026-09-04).
				Column(
					verticalArrangement = Arrangement.spacedBy((12 * u).dp),
					modifier = Modifier.fillMaxWidth().drawBehind {
						// AAPL column tint (1:2721): 81x170 r8 at card (94, 43.94) - 12
						// above the table top - exact-design audit 2026-09-04.
						drawRoundRect(
							color = Color(0x125DA8BF),
							topLeft = Offset((78 * u).dp.toPx(), (-12 * u).dp.toPx()),
							size = Size((81 * u).dp.toPx(), (170 * u).dp.toPx()),
							cornerRadius = CornerRadius((8 * u).dp.toPx()),
						)
						// 1:2722: a 0.5-wide #272F40 hairline between the MSFT and GOOGL
						// columns, card x257 y49.94, 134.5 tall - exact-design audit 2026-09-04.
						drawRect(
							color = Color(0xFF272F40),
							topLeft = Offset((241 * u).dp.toPx(), (-6 * u).dp.toPx()),
							size = Size((0.5 * u).dp.toPx(), (134.5 * u).dp.toPx()),
						)
					},
				) {
					CompareRow("", symbol, liveDetail?.peerA ?: f.peerA, liveDetail?.peerB ?: f.peerB, header = true)
					(liveDetail?.compareRows?.map { DetailCompare(it.label, it.a, it.b, it.c, it.green) } ?: f.compareRows).forEach { r ->
						CompareRow(r.label, r.a, r.b, r.c, valueColor = if (r.green) Green else null)
					}
				}
				Text(
					"Cultural context only, not financial advice.",
					style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (10 * u).sp),
					color = Muted,
				)
			}
		}
	}
}

@Composable
private fun CompareRow(label: String, a: String, m: String, g: String, header: Boolean = false, valueColor: Color? = null) {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
	Row(horizontalArrangement = Arrangement.spacedBy((8 * u).dp), modifier = Modifier.fillMaxWidth().height((20 * u).dp)) {
		Text(
			label,
			style = TextStyle(fontFamily = Geist, fontSize = (11 * u).sp),
			color = Muted,
			modifier = Modifier.weight(1f),
		)
		Text(
			a,
			style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (11 * u).sp),
			color = valueColor ?: Bright,
			textAlign = androidx.compose.ui.text.style.TextAlign.Center,
			modifier = Modifier.weight(1f),
		)
		Text(
			m,
			style = TextStyle(fontFamily = Geist, fontWeight = if (header) FontWeight.Medium else FontWeight.Normal, fontSize = (11 * u).sp),
			color = valueColor ?: Bright,
			textAlign = androidx.compose.ui.text.style.TextAlign.Center,
			modifier = Modifier.weight(1f),
		)
		Text(
			g,
			style = TextStyle(fontFamily = Geist, fontWeight = if (header) FontWeight.Medium else FontWeight.Normal, fontSize = (11 * u).sp),
			color = valueColor ?: Bright,
			textAlign = androidx.compose.ui.text.style.TextAlign.Center,
			modifier = Modifier.weight(1f),
		)
	}
}

/**
 * The "Since you saved" line for THIS stock (product audit, 2026-09-05: the
 * authored 16:1012 copy named AAPL on every page and "5 weeks ago" on a
 * stock saved a minute earlier). The demo keeps the authored figures with
 * the right symbol; a new account reads its own save date, and the move
 * since is this week's change once a day has passed.
 */
private fun sinceSavedFor(f: DetailFacts, symbol: String, liveDetail: LiveDetail?, savedReference: SavedReference?, referenceSettled: Boolean): Triple<String, String, Boolean> {
	val demo = com.stak.demo.data.Session.demoAccount
	val days = if (demo) null else com.stak.demo.data.MyStakHoldings.daysSinceSaved(symbol)
	// Two references, and they are not the same claim. A stamped price is what the
	// stock cost at the moment of saving. A save from before stamping existed has
	// only the close on that day, which is a real price but a different moment - so
	// the copy says which one it measured from rather than blurring them.
	val stamped = if (demo) null else com.stak.demo.data.MyStakHoldings.priceAtSave(symbol)?.takeIf { it > 0.0 }
	val recovered = if (demo) null else savedReference?.takeIf { it.price > 0.0 }
	// A stamped price and a price recovered for the same minute are the same claim;
	// a day's close is a real price from a different moment, so it reads differently.
	val atMoment = stamped != null || recovered?.atMoment == true
	val reference = stamped ?: recovered?.price
	val now = liveDetail?.price?.removePrefix("$")?.replace(",", "")?.toDoubleOrNull()
	val savedPct = if (reference != null && now != null) (now - reference) / reference * 100.0 else null
	val move = savedPct?.let { String.format(java.util.Locale.US, "%.1f", kotlin.math.abs(it)) }
	val up = savedPct?.let { it >= 0.0 } ?: true
	val whenSaved = if (days == 1) "yesterday" else "$days days ago"
	return when {
		demo -> Triple("+4.6%", "Saved 5 weeks ago. $symbol is up 4.6% since, moving roughly with the market. Steady giants tend to.", true)
		// null = a save from before the record existed; it reads as recent rather than as the demo's five weeks.
		days == null || days == 0 -> Triple("+0.0%", "Saved ${if (days == 0) "today" else "recently"}. $symbol hasn't moved since you saved it - check back after a few sessions.", true)
		// Still arriving - today's price, or the price to measure against - says only what
		// is known. "No record" is a finding, and it can't be made before the look-up ends.
		savedPct == null && (now == null || (stamped == null && !referenceSettled)) ->
			Triple("\u2014", "Saved $whenSaved.", true)
		savedPct == null -> Triple("\u2014", "Saved $whenSaved. STAK has no record of what $symbol cost then, so there's no move to measure yet.", true)
		atMoment -> Triple(
			(if (up) "+" else "-") + move + "%",
			"Saved $whenSaved. $symbol is ${if (up) "up" else "down"} $move% since you saved it.",
			up,
		)
		else -> Triple(
			(if (up) "+" else "-") + move + "%",
			"Saved $whenSaved, when $symbol closed at " + formatPrice(reference ?: 0.0) + ". It is ${if (up) "up" else "down"} $move% since that close.",
			up,
		)
	}
}

/**
 * "▼ 15.4% past year" - the selected range's own move, named for its period so
 * the figure and the line beneath it always describe the same stretch of time.
 */
private fun rangeChangeText(pct: Double, range: String): String {
	val arrow = if (pct < 0) "▼" else "▲"
	val period = when (range) {
		"1D" -> "today"
		"1W" -> "past week"
		"1M" -> "past month"
		"3M" -> "past 3 months"
		"YTD" -> "year to date"
		else -> "past year"
	}
	return "$arrow " + String.format(java.util.Locale.US, "%.1f", kotlin.math.abs(pct)) + "% $period"
}


/** "SINCE YOU SAVED +4.6%" banner (16:1012) for the My STAK entry. */
@Composable
private fun SinceYouSavedCard(f: DetailFacts, symbol: String, liveDetail: LiveDetail?, savedReference: SavedReference?, referenceSettled: Boolean) {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
	val since = sinceSavedFor(f, symbol, liveDetail, savedReference, referenceSettled)
	Column(
		verticalArrangement = Arrangement.spacedBy((12 * u).dp),
		modifier = Modifier
			.fillMaxWidth()
			.clip(RoundedCornerShape((16 * u).dp))
			.background(Card)
			// 16:1012 authors p14/16/14/16 (84 tall); the old uniform 16 made the
			// card 4 taller and pushed every module below it (StakTest, 2026-09-05).
			.padding(horizontal = (16 * u).dp, vertical = (14 * u).dp),
	) {
		Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy((8 * u).dp)) {
			Image(painterResource(R.drawable.ic_saved_bookmark), null, modifier = Modifier.size((12 * u).dp))
			Text(
				"SINCE YOU SAVED",
				style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (10 * u).sp, letterSpacing = (0.8 * u).sp),
				color = Muted,
			)
			Text(
				since.first,
				style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (12 * u).sp),
				color = if (since.third) Green else Red,
			)
		}
		Text(
			since.second,
			style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (11 * u).sp, lineHeight = (14 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
			color = Muted,
		)
	}
}


/** One stat tile in "Numbers that matter". */
private data class DetailStat(val label: String, val value: String, val verdict: String, val good: Boolean = false, val border: Boolean = false)

/** One "Compare and learn" table row (a = this stock). */
private data class DetailCompare(val label: String, val a: String, val b: String, val c: String, val green: Boolean = false)

/**
 * The practice-buy ticket for THIS stock. Only three symbols have authored
 * tickets and buySpecFor() falls back to NVDA, so a stock without one opened
 * another company's ticket - and because DiscoverBuyFlow re-prices by
 * spec.symbol, the paper order FILLED that company at its live price
 * (audit, 2026-09-15). The amount, cash and share count are recomputed by the
 * sheet itself, so the placeholders here never reach the screen.
 */
private fun liveBuySpec(symbol: String, live: LiveDetail?, f: DetailFacts): BuySpec {
	listOf(NVDA_BUY, AAPL_BUY, GOOGL_BUY).firstOrNull { it.symbol == symbol }?.let { return it }
	return BuySpec(
		title = "Buy $symbol?",
		badge = symbol.take(1),
		name = live?.name ?: symbol,
		priceLine = (live?.price ?: "$0.00") + " today",
		// formatChange() ends "% today"; the ticket's change carries no suffix.
		change = (live?.change ?: "▲ 0.0% today").removeSuffix(" today"),
		cashBefore = "$0.00",
		cashAfter = "$0.00",
		shares = "0",
		symbol = symbol,
	)
}

/**
 * Everything the detail page serves per stock - backend-shaped like the
 * news feed’s StockFacts. AAPL carries the authored 1:2382/92:969 frame
 * values VERBATIM; NVDA and GOOGL extend their deck cards, priced off
 * the same DECK numbers so every surface agrees.
 */
/**
 * The Risk fit chip against the user's OWN risk style (product audit,
 * 2026-09-05: it read "Matches you" for everyone, high volatility
 * included). The pill's authored x (88 low / 150 mid / 238 high) is the
 * stock's volatility; TasteModel.riskStyle is the user's answer.
 */
private fun riskFitFor(f: DetailFacts, liveDetail: LiveDetail? = null): Pair<String, String> {
	val pillX = liveDetail?.riskPillX ?: f.riskPillX
	val riskCopy = liveDetail?.riskCopy ?: f.riskCopy
	// 120 and 170 sit either side of the track's midpoint, which is market beta.
	val stockBand = when {
		pillX > 170f -> 1
		pillX < 120f -> -1
		else -> 0
	}
	// An unanswered risk question is not a profile. The old rule read the
	// onboarding default and told the user a stock matched them on the strength
	// of an answer they never gave, so this names the stock instead.
	if (com.stak.demo.data.UserProfile.risk < 0) {
		val label = when (stockBand) {
			1 -> "More volatile"
			-1 -> "Less volatile"
			else -> "Around market"
		}
		return label to riskCopy
	}
	// The volatility each style is comfortable with, so every style gets a real
	// comparison. The old rule tested two combinations and called everything else
	// a match, which told a Balanced account that every stock matched it.
	val styleBand = when (com.stak.demo.ui.onboarding.TasteModel.riskStyle(com.stak.demo.data.UserProfile.risk)) {
		"Growth-Oriented" -> 1
		"Balanced" -> 0
		else -> -1
	}
	val first = riskCopy.substringBefore(". ").takeIf { it.isNotBlank() }?.plus(".").orEmpty()
	return when {
		stockBand > styleBand -> "Bolder than you" to "$first Bolder than your profile, so keep any stake small.".trim()
		stockBand < styleBand -> "Calmer than you" to "$first Calmer than your profile, a steady anchor for a bold STAK.".trim()
		else -> "Matches you" to riskCopy
	}
}

private data class DetailFacts(
	val symbol: String,
	val title: String,
	val price: String,
	val change: String,
	val tip: String,
	val riskPillX: Float,
	val riskCopy: String,
	val stats: List<DetailStat>,
	val upside: String,
	val targetLow: String,
	val targetAvg: String,
	val targetHigh: String,
	val targetMarkerX: Float,
	val consensus: String,
	val buyCount: String,
	val holdCount: String,
	val sellCount: String,
	val buyBarW: Float,
	val actions: List<Triple<String, String, String>>,
	val newsClose: String,
	val newsSignal: String,
	val newsEarnings: String,
	val newsSources: List<Pair<String, String>>,
	val newsHeadline: String,
	/** The second news card's own headline (product audit, 2026-09-05: both cards repeated one line). */
	val newsHeadline2: String,
	val peersLabel: String,
	val peerA: String,
	val peerB: String,
	val compareRows: List<DetailCompare>,
	val sheetBadge: String,
	val sheetName: String,
	val sheetPrice: String,
	val sheetChange: String,
	val buySpec: BuySpec,
)

/**
 * The page with nothing filled in: what a real account shows until its own data
 * arrives. Every field here is a placeholder, so a value on screen is either
 * this stock's or visibly absent - never another company's.
 */
private fun emptyFacts(symbol: String): DetailFacts = DetailFacts(
	symbol = symbol,
	title = symbol,
	price = "—",
	change = "",
	tip = "",
	// Mid-track until beta says otherwise; the copy stays blank rather than guessing.
	riskPillX = 145f,
	riskCopy = "",
	stats = listOf(
		DetailStat("P/E ratio", "—", ""),
		DetailStat("Revenue growth", "—", ""),
		// No border: the authored highlight marked the one stat a designer judged
		// notable for that company, which says nothing about this one's numbers.
		DetailStat("Profit margin", "—", ""),
	),
	upside = "",
	targetLow = "—",
	targetAvg = "—",
	targetHigh = "—",
	targetMarkerX = 0f,
	consensus = "",
	buyCount = "",
	holdCount = "",
	sellCount = "",
	buyBarW = 0f,
	actions = emptyList(),
	newsClose = "",
	newsSignal = "",
	newsEarnings = "",
	newsSources = emptyList(),
	newsHeadline = "",
	newsHeadline2 = "",
	peersLabel = "",
	peerA = "—",
	peerB = "—",
	compareRows = emptyList(),
	sheetBadge = symbol.take(1),
	sheetName = symbol,
	sheetPrice = "—",
	sheetChange = "",
	// Replaced by liveBuySpec() at the call site; this is never the ticket shown.
	buySpec = BuySpec("Buy $symbol?", symbol.take(1), symbol, "$0.00 today", "▲ 0.0%", "$0.00", "$0.00", "0", symbol),
)

private val DETAIL_FACTS = mapOf(
	"AAPL" to DetailFacts(
		symbol = "AAPL",
		title = "AAPL · Apple Inc",
		price = "$229.35",
		change = "▲ 1.2% today",
		tip = "Steady giants move slower. Stable stocks often do.",
		riskPillX = 88f,
		riskCopy = "Low volatility. Fits the steady side of your profile.",
		stats = listOf(
			DetailStat("P/E ratio", "31.2", "In line"),
			DetailStat("Revenue growth", "6.1%", "Slower"),
			DetailStat("Profit margin", "24.3%", "Excellent", good = true, border = true),
		),
		upside = "↑ 6.7% upside",
		// 1:2656 authors the marker at x173 - exact-design audit 2026-09-04 (was 167).
		targetLow = "$180", targetAvg = "$248", targetHigh = "$300", targetMarkerX = 173f,
		consensus = "WALL ST. CONSENSUS · 42 ANALYSTS",
		buyCount = "● Buy 28", holdCount = "Hold 12", sellCount = "Sell 2", buyBarW = 212f,
		actions = listOf(
			Triple("Morgan Stanley", "Buy", "$260"),
			Triple("Wedbush", "Buy", "$285"),
			Triple("Goldman Sachs", "Buy", "$256"),
			Triple("UBS", "Hold", "$236"),
			Triple("Barclays", "Hold", "$230"),
		),
		newsClose = "▲ +0.8% at yesterday’s close",
		newsSignal = "Foldable iPhone reports point to a premium fall lineup.",
		newsEarnings = "Next earnings land ${com.stak.demo.data.StakClock.daysAhead(26)}.",
		newsSources = listOf("Yahoo · 13h ago" to "Neutral", "CNN · 1h ago" to "Neutral"),
		newsHeadline = "The rally leaves Apple about 4 percent shy of the market-cap crown",
		newsHeadline2 = "Apple's services arm posts another record quarter as the iPhone cycle steadies",
		peersLabel = "vs MSFT · GOOGL",
		peerA = "MSFT", peerB = "GOOGL",
		compareRows = listOf(
			DetailCompare("P/E ratio", "31.2", "36x", "24x"),
			DetailCompare("Rev growth", "+6.1%", "+15%", "+12%", green = true),
			DetailCompare("Profit margin", "24.3%", "36%", "29%"),
			DetailCompare("Market cap", "$3.5T", "$3.4T", "$2.3T"),
		),
		sheetBadge = "A", sheetName = "Apple", sheetPrice = "$229.35 today", sheetChange = "▲ 1.2%",
		buySpec = AAPL_BUY,
	),
	"NVDA" to DetailFacts(
		symbol = "NVDA",
		title = "NVDA · NVIDIA Corp",
		price = "$122.10",
		change = "▲ 2.4% today",
		tip = "Chip stocks swing hard. Small stakes, long views.",
		riskPillX = 238f,
		riskCopy = "High volatility. Fits the bolder side of your profile.",
		stats = listOf(
			DetailStat("P/E ratio", "52.8", "Rich"),
			DetailStat("Revenue growth", "62%", "Explosive", good = true, border = true),
			DetailStat("Profit margin", "48.9%", "Strong"),
		),
		upside = "↑ 17.9% upside",
		targetLow = "$100", targetAvg = "$144", targetHigh = "$200", targetMarkerX = 33f,
		consensus = "WALL ST. CONSENSUS · 63 ANALYSTS",
		buyCount = "● Buy 55", holdCount = "Hold 7", sellCount = "Sell 1", buyBarW = 273f,
		actions = listOf(
			Triple("Morgan Stanley", "Buy", "$152"),
			Triple("BofA", "Buy", "$150"),
			Triple("Goldman Sachs", "Buy", "$145"),
			Triple("Citi", "Buy", "$150"),
			Triple("HSBC", "Hold", "$120"),
		),
		newsClose = "▲ +2.1% at yesterday’s close",
		newsSignal = "Blackwell demand keeps outrunning supply into the fall.",
		newsEarnings = "Next earnings land ${com.stak.demo.data.StakClock.daysAhead(54)}.",
		newsSources = listOf("Reuters · 2h ago" to "Bullish", "CNBC · 9h ago" to "Neutral"),
		newsHeadline = "Nvidia lags the chip rally it kicked off as orders pile up",
		newsHeadline2 = "Nvidia's data-center backlog stretches into next year, analysts say",
		peersLabel = "vs AMD · TSM",
		peerA = "AMD", peerB = "TSM",
		compareRows = listOf(
			DetailCompare("P/E ratio", "52.8", "110x", "28x"),
			DetailCompare("Rev growth", "+62%", "+18%", "+33%", green = true),
			DetailCompare("Profit margin", "48.9%", "6.4%", "39%"),
			DetailCompare("Market cap", "$3.0T", "$0.2T", "$1.0T"),
		),
		sheetBadge = "N", sheetName = "NVIDIA", sheetPrice = "$122.10 today", sheetChange = "▲ 2.4%",
		buySpec = NVDA_BUY,
	),
	"GOOGL" to DetailFacts(
		symbol = "GOOGL",
		title = "GOOGL · Alphabet Inc",
		price = "$178.90",
		change = "▲ 0.8% today",
		tip = "Ad money tracks the economy. Some quarters drift.",
		riskPillX = 150f,
		riskCopy = "Moderate volatility. Sits mid-range for your profile.",
		stats = listOf(
			DetailStat("P/E ratio", "24.1", "Cheaper", good = true, border = true),
			DetailStat("Revenue growth", "12%", "Healthy"),
			DetailStat("Profit margin", "29.5%", "Strong"),
		),
		upside = "↑ 12.4% upside",
		targetLow = "$150", targetAvg = "$201", targetHigh = "$240", targetMarkerX = 52f,
		consensus = "WALL ST. CONSENSUS · 48 ANALYSTS",
		buyCount = "● Buy 40", holdCount = "Hold 8", sellCount = "Sell 0", buyBarW = 261f,
		actions = listOf(
			Triple("Morgan Stanley", "Buy", "$210"),
			Triple("JPMorgan", "Buy", "$208"),
			Triple("Goldman Sachs", "Buy", "$205"),
			Triple("Bernstein", "Hold", "$185"),
			Triple("Wells Fargo", "Hold", "$182"),
		),
		newsClose = "▲ +0.6% at yesterday’s close",
		newsSignal = "A blowout ad quarter pushed the stock to fresh highs.",
		newsEarnings = "Next earnings land ${com.stak.demo.data.StakClock.daysAhead(18)}.",
		newsSources = listOf("Bloomberg · 5h ago" to "Bullish", "Yahoo · 1d ago" to "Neutral"),
		newsHeadline = "Alphabet jumps after a blowout ad quarter as cloud accelerates",
		newsHeadline2 = "Alphabet lifts its capex plan again as Gemini demand outruns capacity",
		peersLabel = "vs MSFT · META",
		peerA = "MSFT", peerB = "META",
		compareRows = listOf(
			DetailCompare("P/E ratio", "24.1", "36x", "27x"),
			DetailCompare("Rev growth", "+12%", "+15%", "+19%", green = true),
			DetailCompare("Profit margin", "29.5%", "36%", "34%"),
			DetailCompare("Market cap", "$2.3T", "$3.4T", "$1.5T"),
		),
		sheetBadge = "G", sheetName = "Alphabet", sheetPrice = "$178.90 today", sheetChange = "▲ 0.8%",
		buySpec = GOOGL_BUY,
	),
	// Codex parity audit (2026-09-04): every collection / pick ticker serves
	// its own detail page - the three authored entries above are the
	// template, these are demo-authored in the same shape (prices and
	// changes agree with the collection tiles and NewsArticleFeed's
	// StockFacts). Generated from one shared table; mirrors
	// ios/StakDemo/Discover/StockDetailView.swift entry for entry.
	"MSFT" to DetailFacts(
		symbol = "MSFT",
		title = "MSFT · Microsoft Corp",
		price = "\$438.20",
		change = "▼ 0.4% today",
		tip = "Subscriptions renew monthly. Swings stay small.",
		riskPillX = 88f,
		riskCopy = "Low volatility. Fits the steady side of your profile.",
		stats = listOf(
			DetailStat("P/E ratio", "37.5", "Rich"),
			DetailStat("Revenue growth", "15%", "Healthy"),
			DetailStat("Profit margin", "36%", "Excellent", good = true, border = true),
		),
		upside = "↑ 14.1% upside",
		targetLow = "\$380", targetAvg = "\$500", targetHigh = "\$560", targetMarkerX = 106f,
		consensus = "WALL ST. CONSENSUS · 55 ANALYSTS",
		buyCount = "● Buy 48", holdCount = "Hold 6", sellCount = "Sell 1", buyBarW = 277f,
		actions = listOf(
			Triple("Morgan Stanley", "Buy", "\$520"),
			Triple("Wedbush", "Buy", "\$550"),
			Triple("Jefferies", "Buy", "\$505"),
			Triple("Goldman Sachs", "Buy", "\$500"),
			Triple("UBS", "Hold", "\$450"),
		),
		newsClose = "▼ -0.3% at yesterday’s close",
		newsSignal = "Azure growth and Copilot seat counts are the numbers to watch this week.",
		newsEarnings = "Next earnings land ${com.stak.demo.data.StakClock.daysAhead(117)}.",
		newsSources = listOf("Bloomberg · 4h ago" to "Bullish", "Reuters · 11h ago" to "Neutral"),
		newsHeadline = "Tech earnings week: what to watch",
		newsHeadline2 = "Microsoft's Azure growth holds as Copilot seats climb",
		peersLabel = "vs AAPL · GOOGL",
		peerA = "AAPL", peerB = "GOOGL",
		compareRows = listOf(
			DetailCompare("P/E ratio", "37.5", "31x", "24x"),
			DetailCompare("Rev growth", "+15%", "+6.1%", "+12%", green = true),
			DetailCompare("Profit margin", "36%", "24%", "29%"),
			DetailCompare("Market cap", "\$3.8T", "\$3.5T", "\$2.3T"),
		),
		sheetBadge = "M", sheetName = "Microsoft", sheetPrice = "\$438.20 today", sheetChange = "▼ 0.4%",
		buySpec = BuySpec("Buy MSFT?", "M", "Microsoft Corp", "\$438.20 today", "▼ 0.4%", "\$8,800.00", "\$8,775.00", "0.0571", "MSFT"),
	),
	"AMD" to DetailFacts(
		symbol = "AMD",
		title = "AMD · Advanced Micro Devices",
		price = "\$164.30",
		change = "▲ 2.1% today",
		tip = "Chip rallies rotate. Expect sharp days both ways.",
		riskPillX = 238f,
		riskCopy = "High volatility. Fits the bolder side of your profile.",
		stats = listOf(
			DetailStat("P/E ratio", "45.6", "Rich"),
			DetailStat("Revenue growth", "18%", "Accelerating", good = true, border = true),
			DetailStat("Profit margin", "6.4%", "Thin"),
		),
		upside = "↑ 15.6% upside",
		targetLow = "\$130", targetAvg = "\$190", targetHigh = "\$250", targetMarkerX = 79f,
		consensus = "WALL ST. CONSENSUS · 50 ANALYSTS",
		buyCount = "● Buy 36", holdCount = "Hold 13", sellCount = "Sell 1", buyBarW = 228f,
		actions = listOf(
			Triple("Morgan Stanley", "Buy", "\$195"),
			Triple("BofA", "Buy", "\$200"),
			Triple("Jefferies", "Buy", "\$190"),
			Triple("Goldman Sachs", "Hold", "\$170"),
			Triple("Bernstein", "Hold", "\$160"),
		),
		newsClose = "▲ +1.6% at yesterday’s close",
		newsSignal = "The AI rotation is lifting AMD as buyers look past the most crowded chip names.",
		newsEarnings = "Next earnings land ${com.stak.demo.data.StakClock.daysAhead(123)}.",
		newsSources = listOf("CNBC · 3h ago" to "Bullish", "Yahoo · 8h ago" to "Neutral"),
		newsHeadline = "AMD rides the AI rotation to a yearly high",
		newsHeadline2 = "AMD lands another hyperscaler for its MI-series chips",
		peersLabel = "vs NVDA · TSM",
		peerA = "NVDA", peerB = "TSM",
		compareRows = listOf(
			DetailCompare("P/E ratio", "45.6", "53x", "28x"),
			DetailCompare("Rev growth", "+18%", "+62%", "+33%", green = true),
			DetailCompare("Profit margin", "6.4%", "48.9%", "39%"),
			DetailCompare("Market cap", "\$302B", "\$3.0T", "\$1.0T"),
		),
		sheetBadge = "A", sheetName = "AMD", sheetPrice = "\$164.30 today", sheetChange = "▲ 2.1%",
		buySpec = BuySpec("Buy AMD?", "A", "Advanced Micro Devices", "\$164.30 today", "▲ 2.1%", "\$8,800.00", "\$8,775.00", "0.1522", "AMD"),
	),
	"JPM" to DetailFacts(
		symbol = "JPM",
		title = "JPM · JPMorgan Chase",
		price = "\$245.60",
		change = "▲ 0.6% today",
		tip = "Banks earn on the spread. Rates set the pace.",
		riskPillX = 150f,
		riskCopy = "Moderate volatility. Sits mid-range for your profile.",
		stats = listOf(
			DetailStat("P/E ratio", "13.1", "Cheap", good = true, border = true),
			DetailStat("Revenue growth", "8%", "Steady"),
			DetailStat("Profit margin", "34%", "Strong"),
		),
		upside = "↑ 9.1% upside",
		targetLow = "\$215", targetAvg = "\$268", targetHigh = "\$300", targetMarkerX = 132f,
		consensus = "WALL ST. CONSENSUS · 26 ANALYSTS",
		buyCount = "● Buy 15", holdCount = "Hold 10", sellCount = "Sell 1", buyBarW = 183f,
		actions = listOf(
			Triple("Morgan Stanley", "Buy", "\$275"),
			Triple("Wells Fargo", "Buy", "\$290"),
			Triple("Barclays", "Buy", "\$270"),
			Triple("UBS", "Hold", "\$255"),
			Triple("KBW", "Hold", "\$250"),
		),
		newsClose = "▲ +0.4% at yesterday’s close",
		newsSignal = "Trading desks and card spending keep the bank ahead of a softer loan market.",
		newsEarnings = "Next earnings land ${com.stak.demo.data.StakClock.daysAhead(102)}.",
		newsSources = listOf("Reuters · 6h ago" to "Bullish", "WSJ · 1d ago" to "Neutral"),
		newsHeadline = "JPMorgan tops estimates again as trading and card spending hold up",
		newsHeadline2 = "JPMorgan lifts its net-interest income outlook for the year",
		peersLabel = "vs BAC · WFC",
		peerA = "BAC", peerB = "WFC",
		compareRows = listOf(
			DetailCompare("P/E ratio", "13.1", "13x", "14x"),
			DetailCompare("Rev growth", "+8%", "+6%", "+2%", green = true),
			DetailCompare("Profit margin", "34%", "26%", "24%"),
			DetailCompare("Market cap", "\$690B", "\$350B", "\$250B"),
		),
		sheetBadge = "J", sheetName = "JPMorgan", sheetPrice = "\$245.60 today", sheetChange = "▲ 0.6%",
		buySpec = BuySpec("Buy JPM?", "J", "JPMorgan Chase", "\$245.60 today", "▲ 0.6%", "\$8,800.00", "\$8,775.00", "0.1018", "JPM"),
	),
	"V" to DetailFacts(
		symbol = "V",
		title = "V · Visa Inc",
		price = "\$352.10",
		change = "▲ 0.3% today",
		tip = "Visa takes a toll on every swipe. Fees rarely swing.",
		riskPillX = 88f,
		riskCopy = "Low volatility. Fits the steady side of your profile.",
		stats = listOf(
			DetailStat("P/E ratio", "32.4", "In line"),
			DetailStat("Revenue growth", "10%", "Healthy"),
			DetailStat("Profit margin", "54%", "Exceptional", good = true, border = true),
		),
		upside = "↑ 9.3% upside",
		targetLow = "\$320", targetAvg = "\$385", targetHigh = "\$420", targetMarkerX = 104f,
		consensus = "WALL ST. CONSENSUS · 38 ANALYSTS",
		buyCount = "● Buy 31", holdCount = "Hold 7", sellCount = "Sell 0", buyBarW = 259f,
		actions = listOf(
			Triple("Morgan Stanley", "Buy", "\$400"),
			Triple("Goldman Sachs", "Buy", "\$395"),
			Triple("BofA", "Buy", "\$390"),
			Triple("Mizuho", "Hold", "\$360"),
			Triple("Piper Sandler", "Hold", "\$355"),
		),
		newsClose = "▲ +0.5% at yesterday’s close",
		newsSignal = "Cross-border travel volume keeps payment growth running in double digits.",
		newsEarnings = "Next earnings land ${com.stak.demo.data.StakClock.daysAhead(116)}.",
		newsSources = listOf("Bloomberg · 7h ago" to "Bullish", "CNBC · 1d ago" to "Neutral"),
		newsHeadline = "Visa keeps growing at a double-digit clip as cross-border spending holds",
		newsHeadline2 = "Visa's cross-border volumes climb as travel stays strong",
		peersLabel = "vs MA · AXP",
		peerA = "MA", peerB = "AXP",
		compareRows = listOf(
			DetailCompare("P/E ratio", "32.4", "36x", "20x"),
			DetailCompare("Rev growth", "+10%", "+14%", "+9%", green = true),
			DetailCompare("Profit margin", "54%", "45%", "15%"),
			DetailCompare("Market cap", "\$706B", "\$500B", "\$220B"),
		),
		sheetBadge = "V", sheetName = "Visa", sheetPrice = "\$352.10 today", sheetChange = "▲ 0.3%",
		buySpec = BuySpec("Buy V?", "V", "Visa", "\$352.10 today", "▲ 0.3%", "\$8,800.00", "\$8,775.00", "0.0710", "V"),
	),
	"GS" to DetailFacts(
		symbol = "GS",
		title = "GS · Goldman Sachs Group",
		price = "\$612.40",
		change = "▼ 0.5% today",
		tip = "Deal fees come in waves. Expect lumpy quarters.",
		riskPillX = 150f,
		riskCopy = "Moderate volatility. Sits mid-range for your profile.",
		stats = listOf(
			DetailStat("P/E ratio", "15.2", "Cheap", good = true, border = true),
			DetailStat("Revenue growth", "12%", "Healthy"),
			DetailStat("Profit margin", "27%", "Strong"),
		),
		upside = "↑ 6.1% upside",
		targetLow = "\$540", targetAvg = "\$650", targetHigh = "\$720", targetMarkerX = 162f,
		consensus = "WALL ST. CONSENSUS · 27 ANALYSTS",
		buyCount = "● Buy 16", holdCount = "Hold 10", sellCount = "Sell 1", buyBarW = 188f,
		actions = listOf(
			Triple("Morgan Stanley", "Buy", "\$680"),
			Triple("Wells Fargo", "Buy", "\$700"),
			Triple("BofA", "Buy", "\$660"),
			Triple("UBS", "Hold", "\$620"),
			Triple("HSBC", "Hold", "\$600"),
		),
		newsClose = "▼ -0.7% at yesterday’s close",
		newsSignal = "A reopening deal calendar is refilling the investment-banking pipeline.",
		newsEarnings = "Next earnings land ${com.stak.demo.data.StakClock.daysAhead(103)}.",
		newsSources = listOf("Reuters · 5h ago" to "Neutral", "FT · 14h ago" to "Bullish"),
		newsHeadline = "Goldman rides a deal-making rebound as advisory fees climb",
		newsHeadline2 = "Goldman's IPO pipeline fills up as issuers return",
		peersLabel = "vs MS · JPM",
		peerA = "MS", peerB = "JPM",
		compareRows = listOf(
			DetailCompare("P/E ratio", "15.2", "16x", "13x"),
			DetailCompare("Rev growth", "+12%", "+11%", "+8%", green = true),
			DetailCompare("Profit margin", "27%", "22%", "34%"),
			DetailCompare("Market cap", "\$189B", "\$220B", "\$690B"),
		),
		sheetBadge = "G", sheetName = "Goldman Sachs", sheetPrice = "\$612.40 today", sheetChange = "▼ 0.5%",
		buySpec = BuySpec("Buy GS?", "G", "Goldman Sachs", "\$612.40 today", "▼ 0.5%", "\$8,800.00", "\$8,775.00", "0.0408", "GS"),
	),
	"ENPH" to DetailFacts(
		symbol = "ENPH",
		title = "ENPH · Enphase Energy",
		price = "\$78.40",
		change = "▲ 1.9% today",
		tip = "Solar rides policy and rates. Expect sharp moves.",
		riskPillX = 238f,
		riskCopy = "High volatility. Fits the bolder side of your profile.",
		stats = listOf(
			DetailStat("P/E ratio", "38.6", "Rich"),
			DetailStat("Revenue growth", "22%", "Rebounding", good = true, border = true),
			DetailStat("Profit margin", "9.5%", "Thin"),
		),
		upside = "↑ 12.2% upside",
		targetLow = "\$55", targetAvg = "\$88", targetHigh = "\$130", targetMarkerX = 98f,
		consensus = "WALL ST. CONSENSUS · 34 ANALYSTS",
		buyCount = "● Buy 14", holdCount = "Hold 17", sellCount = "Sell 3", buyBarW = 131f,
		actions = listOf(
			Triple("Goldman Sachs", "Buy", "\$95"),
			Triple("Jefferies", "Buy", "\$100"),
			Triple("Morgan Stanley", "Hold", "\$80"),
			Triple("Barclays", "Hold", "\$75"),
			Triple("BofA", "Sell", "\$60"),
		),
		newsClose = "▲ +2.3% at yesterday’s close",
		newsSignal = "Battery attach rates are climbing as home-storage demand builds ahead of credit changes.",
		newsEarnings = "Next earnings land ${com.stak.demo.data.StakClock.daysAhead(116)}.",
		newsSources = listOf("Yahoo · 3h ago" to "Neutral", "CNBC · 9h ago" to "Bullish"),
		newsHeadline = "Enphase bounces as battery orders pick up in a shaky solar market",
		newsHeadline2 = "Enphase guides to a rebound as installers work through inventory",
		peersLabel = "vs SEDG · FSLR",
		peerA = "SEDG", peerB = "FSLR",
		compareRows = listOf(
			DetailCompare("P/E ratio", "38.6", "n/m", "18x"),
			DetailCompare("Rev growth", "+22%", "-14%", "+26%", green = true),
			DetailCompare("Profit margin", "9.5%", "n/m", "31%"),
			DetailCompare("Market cap", "\$10.3B", "\$1.2B", "\$24.5B"),
		),
		sheetBadge = "E", sheetName = "Enphase", sheetPrice = "\$78.40 today", sheetChange = "▲ 1.9%",
		buySpec = BuySpec("Buy ENPH?", "E", "Enphase Energy", "\$78.40 today", "▲ 1.9%", "\$8,800.00", "\$8,775.00", "0.3189", "ENPH"),
	),
	"NEE" to DetailFacts(
		symbol = "NEE",
		title = "NEE · NextEra Energy",
		price = "\$84.20",
		change = "▲ 0.4% today",
		tip = "Power bills get paid in every market. Slow mover.",
		riskPillX = 88f,
		riskCopy = "Low volatility. Fits the steady side of your profile.",
		stats = listOf(
			DetailStat("P/E ratio", "22.7", "In line"),
			DetailStat("Revenue growth", "9%", "Steady"),
			DetailStat("Profit margin", "24%", "Excellent", good = true, border = true),
		),
		upside = "↑ 9.3% upside",
		targetLow = "\$72", targetAvg = "\$92", targetHigh = "\$105", targetMarkerX = 139f,
		consensus = "WALL ST. CONSENSUS · 22 ANALYSTS",
		buyCount = "● Buy 15", holdCount = "Hold 7", sellCount = "Sell 0", buyBarW = 216f,
		actions = listOf(
			Triple("Morgan Stanley", "Buy", "\$95"),
			Triple("Wells Fargo", "Buy", "\$94"),
			Triple("BofA", "Buy", "\$92"),
			Triple("UBS", "Hold", "\$85"),
			Triple("Jefferies", "Hold", "\$84"),
		),
		newsClose = "▲ +0.6% at yesterday’s close",
		newsSignal = "Data-center power deals are adding to a renewables backlog that already runs for years.",
		newsEarnings = "Next earnings land ${com.stak.demo.data.StakClock.daysAhead(111)}.",
		newsSources = listOf("Reuters · 8h ago" to "Bullish", "Bloomberg · 1d ago" to "Neutral"),
		newsHeadline = "NextEra signs more data-center power deals as its renewables backlog swells",
		newsHeadline2 = "NextEra's storage build-out hits a record quarter",
		peersLabel = "vs DUK · SO",
		peerA = "DUK", peerB = "SO",
		compareRows = listOf(
			DetailCompare("P/E ratio", "22.7", "19x", "20x"),
			DetailCompare("Rev growth", "+9%", "+5%", "+7%", green = true),
			DetailCompare("Profit margin", "24%", "15%", "16%"),
			DetailCompare("Market cap", "\$173B", "\$95B", "\$100B"),
		),
		sheetBadge = "N", sheetName = "NextEra", sheetPrice = "\$84.20 today", sheetChange = "▲ 0.4%",
		buySpec = BuySpec("Buy NEE?", "N", "NextEra Energy", "\$84.20 today", "▲ 0.4%", "\$8,800.00", "\$8,775.00", "0.2969", "NEE"),
	),
	"FSLR" to DetailFacts(
		symbol = "FSLR",
		title = "FSLR · First Solar Inc",
		price = "\$228.90",
		change = "▼ 1.1% today",
		tip = "Policy headlines move solar. Size the stake small.",
		riskPillX = 238f,
		riskCopy = "High volatility. Fits the bolder side of your profile.",
		stats = listOf(
			DetailStat("P/E ratio", "17.8", "Cheaper", good = true, border = true),
			DetailStat("Revenue growth", "26%", "Fast"),
			DetailStat("Profit margin", "31%", "Strong"),
		),
		upside = "↑ 18.0% upside",
		targetLow = "\$180", targetAvg = "\$270", targetHigh = "\$330", targetMarkerX = 108f,
		consensus = "WALL ST. CONSENSUS · 32 ANALYSTS",
		buyCount = "● Buy 25", holdCount = "Hold 6", sellCount = "Sell 1", buyBarW = 248f,
		actions = listOf(
			Triple("Jefferies", "Buy", "\$290"),
			Triple("Goldman Sachs", "Buy", "\$280"),
			Triple("UBS", "Buy", "\$275"),
			Triple("Morgan Stanley", "Buy", "\$265"),
			Triple("BofA", "Hold", "\$230"),
		),
		newsClose = "▼ -1.4% at yesterday’s close",
		newsSignal = "Tariff rulings on imported panels keep swinging the stock week to week.",
		newsEarnings = "Next earnings land ${com.stak.demo.data.StakClock.daysAhead(118)}.",
		newsSources = listOf("Reuters · 4h ago" to "Neutral", "WSJ · 12h ago" to "Bullish"),
		newsHeadline = "First Solar slips as a tariff ruling clouds the outlook for imported panels",
		newsHeadline2 = "First Solar books more U.S. capacity as tariffs bite imports",
		peersLabel = "vs ENPH · NEE",
		peerA = "ENPH", peerB = "NEE",
		compareRows = listOf(
			DetailCompare("P/E ratio", "17.8", "39x", "23x"),
			DetailCompare("Rev growth", "+26%", "+22%", "+9%", green = true),
			DetailCompare("Profit margin", "31%", "9.5%", "24%"),
			DetailCompare("Market cap", "\$24.5B", "\$10.3B", "\$173B"),
		),
		sheetBadge = "F", sheetName = "First Solar", sheetPrice = "\$228.90 today", sheetChange = "▼ 1.1%",
		buySpec = BuySpec("Buy FSLR?", "F", "First Solar", "\$228.90 today", "▼ 1.1%", "\$8,800.00", "\$8,775.00", "0.1092", "FSLR"),
	),
	"PLD" to DetailFacts(
		symbol = "PLD",
		title = "PLD · Prologis Inc",
		price = "\$118.30",
		change = "▲ 0.2% today",
		tip = "Rent arrives monthly. Landlords move gently.",
		riskPillX = 150f,
		riskCopy = "Moderate volatility. Sits mid-range for your profile.",
		stats = listOf(
			DetailStat("P/E ratio", "27.9", "In line"),
			DetailStat("Revenue growth", "9%", "Steady"),
			DetailStat("Profit margin", "45%", "Excellent", good = true, border = true),
		),
		upside = "↑ 9.9% upside",
		targetLow = "\$100", targetAvg = "\$130", targetHigh = "\$150", targetMarkerX = 136f,
		consensus = "WALL ST. CONSENSUS · 24 ANALYSTS",
		buyCount = "● Buy 17", holdCount = "Hold 7", sellCount = "Sell 0", buyBarW = 225f,
		actions = listOf(
			Triple("Morgan Stanley", "Buy", "\$135"),
			Triple("BofA", "Buy", "\$132"),
			Triple("Evercore ISI", "Buy", "\$130"),
			Triple("Wells Fargo", "Hold", "\$120"),
			Triple("Mizuho", "Hold", "\$118"),
		),
		newsClose = "▲ +0.3% at yesterday’s close",
		newsSignal = "Warehouse leasing is firming as tenants sign again after a slow stretch.",
		newsEarnings = "Next earnings land ${com.stak.demo.data.StakClock.daysAhead(103)}.",
		newsSources = listOf("Bloomberg · 6h ago" to "Neutral", "Reuters · 1d ago" to "Bullish"),
		newsHeadline = "Prologis lifts its outlook as warehouse leasing steadies",
		newsHeadline2 = "Prologis leases fill faster as e-commerce demand firms",
		peersLabel = "vs O · AMT",
		peerA = "O", peerB = "AMT",
		compareRows = listOf(
			DetailCompare("P/E ratio", "27.9", "54x", "40x"),
			DetailCompare("Rev growth", "+9%", "+14%", "+5%", green = true),
			DetailCompare("Profit margin", "45%", "17%", "25%"),
			DetailCompare("Market cap", "\$110B", "\$53.2B", "\$100B"),
		),
		sheetBadge = "P", sheetName = "Prologis", sheetPrice = "\$118.30 today", sheetChange = "▲ 0.2%",
		buySpec = BuySpec("Buy PLD?", "P", "Prologis", "\$118.30 today", "▲ 0.2%", "\$8,800.00", "\$8,775.00", "0.2113", "PLD"),
	),
	"O" to DetailFacts(
		symbol = "O",
		title = "O · Realty Income Corp",
		price = "\$59.10",
		change = "▼ 0.3% today",
		tip = "Built for the monthly dividend, not big price moves.",
		riskPillX = 88f,
		riskCopy = "Low volatility. Fits the steady side of your profile.",
		stats = listOf(
			DetailStat("P/E ratio", "54.3", "Rich"),
			DetailStat("Revenue growth", "14%", "Healthy", good = true, border = true),
			DetailStat("Profit margin", "17%", "Modest"),
		),
		upside = "↑ 6.6% upside",
		targetLow = "\$54", targetAvg = "\$63", targetHigh = "\$70", targetMarkerX = 103f,
		consensus = "WALL ST. CONSENSUS · 20 ANALYSTS",
		buyCount = "● Buy 8", holdCount = "Hold 12", sellCount = "Sell 0", buyBarW = 127f,
		actions = listOf(
			Triple("Morgan Stanley", "Buy", "\$66"),
			Triple("Stifel", "Buy", "\$65"),
			Triple("RBC", "Hold", "\$62"),
			Triple("Mizuho", "Hold", "\$61"),
			Triple("Wells Fargo", "Hold", "\$60"),
		),
		newsClose = "▼ -0.2% at yesterday’s close",
		newsSignal = "Monthly dividend hikes keep coming as rate-cut hopes lift REITs.",
		newsEarnings = "Next earnings land ${com.stak.demo.data.StakClock.daysAhead(122)}.",
		newsSources = listOf("Yahoo · 5h ago" to "Neutral", "CNBC · 1d ago" to "Bullish"),
		newsHeadline = "Realty Income raises its monthly dividend again as rate hopes lift REITs",
		newsHeadline2 = "Realty Income adds another European portfolio to its rent roll",
		peersLabel = "vs PLD · SPG",
		peerA = "PLD", peerB = "SPG",
		compareRows = listOf(
			DetailCompare("P/E ratio", "54.3", "28x", "22x"),
			DetailCompare("Rev growth", "+14%", "+9%", "+4%", green = true),
			DetailCompare("Profit margin", "17%", "45%", "35%"),
			DetailCompare("Market cap", "\$53.2B", "\$110B", "\$60B"),
		),
		sheetBadge = "O", sheetName = "Realty Income", sheetPrice = "\$59.10 today", sheetChange = "▼ 0.3%",
		buySpec = BuySpec("Buy O?", "O", "Realty Income", "\$59.10 today", "▼ 0.3%", "\$8,800.00", "\$8,775.00", "0.4230", "O"),
	),
	"LLY" to DetailFacts(
		symbol = "LLY",
		title = "LLY · Eli Lilly and Co",
		price = "\$792.50",
		change = "▲ 1.4% today",
		tip = "Blockbuster drugs grow fast. The price expects it.",
		riskPillX = 150f,
		riskCopy = "Moderate volatility. Sits mid-range for your profile.",
		stats = listOf(
			DetailStat("P/E ratio", "63.4", "Rich"),
			DetailStat("Revenue growth", "38%", "Explosive", good = true, border = true),
			DetailStat("Profit margin", "24%", "Strong"),
		),
		upside = "↑ 16.1% upside",
		targetLow = "\$680", targetAvg = "\$920", targetHigh = "\$1,050", targetMarkerX = 92f,
		consensus = "WALL ST. CONSENSUS · 28 ANALYSTS",
		buyCount = "● Buy 24", holdCount = "Hold 4", sellCount = "Sell 0", buyBarW = 272f,
		actions = listOf(
			Triple("Morgan Stanley", "Buy", "\$950"),
			Triple("BofA", "Buy", "\$940"),
			Triple("Goldman Sachs", "Buy", "\$920"),
			Triple("JPMorgan", "Buy", "\$910"),
			Triple("Bernstein", "Hold", "\$800"),
		),
		newsClose = "▲ +1.1% at yesterday’s close",
		newsSignal = "The weight-loss pill is heading toward a decision that could open a much larger market.",
		newsEarnings = "Next earnings land ${com.stak.demo.data.StakClock.daysAhead(118)}.",
		newsSources = listOf("Reuters · 2h ago" to "Bullish", "CNBC · 10h ago" to "Neutral"),
		newsHeadline = "Eli Lilly climbs as its oral weight-loss pill nears a decision",
		newsHeadline2 = "Lilly's weight-loss pill moves closer to a filing",
		peersLabel = "vs NVO · JNJ",
		peerA = "NVO", peerB = "JNJ",
		compareRows = listOf(
			DetailCompare("P/E ratio", "63.4", "15x", "17x"),
			DetailCompare("Rev growth", "+38%", "+18%", "+5%", green = true),
			DetailCompare("Profit margin", "24%", "35%", "25%"),
			DetailCompare("Market cap", "\$752B", "\$300B", "\$391B"),
		),
		sheetBadge = "L", sheetName = "Eli Lilly", sheetPrice = "\$792.50 today", sheetChange = "▲ 1.4%",
		buySpec = BuySpec("Buy LLY?", "L", "Eli Lilly", "\$792.50 today", "▲ 1.4%", "\$8,800.00", "\$8,775.00", "0.0315", "LLY"),
	),
	"UNH" to DetailFacts(
		symbol = "UNH",
		title = "UNH · UnitedHealth Group",
		price = "\$318.70",
		change = "▼ 0.8% today",
		tip = "A thin slice of a huge pie. Cost surprises bite.",
		riskPillX = 150f,
		riskCopy = "Moderate volatility. Sits mid-range for your profile.",
		stats = listOf(
			DetailStat("P/E ratio", "13.7", "Cheap", good = true, border = true),
			DetailStat("Revenue growth", "9%", "Steady"),
			DetailStat("Profit margin", "4.2%", "Thin"),
		),
		upside = "↑ 13.0% upside",
		targetLow = "\$260", targetAvg = "\$360", targetHigh = "\$440", targetMarkerX = 108f,
		consensus = "WALL ST. CONSENSUS · 26 ANALYSTS",
		buyCount = "● Buy 17", holdCount = "Hold 8", sellCount = "Sell 1", buyBarW = 207f,
		actions = listOf(
			Triple("Morgan Stanley", "Buy", "\$380"),
			Triple("Goldman Sachs", "Buy", "\$370"),
			Triple("Barclays", "Buy", "\$365"),
			Triple("Mizuho", "Hold", "\$330"),
			Triple("Raymond James", "Hold", "\$320"),
		),
		newsClose = "▼ -1.0% at yesterday’s close",
		newsSignal = "Medical-cost trends are still running hot, and the new CEO is resetting expectations.",
		newsEarnings = "Next earnings land ${com.stak.demo.data.StakClock.daysAhead(102)}.",
		newsSources = listOf("WSJ · 4h ago" to "Bearish", "Reuters · 9h ago" to "Neutral"),
		newsHeadline = "UnitedHealth slides again as medical costs keep climbing",
		newsHeadline2 = "UnitedHealth trims its outlook as medical costs stay high",
		peersLabel = "vs ELV · CI",
		peerA = "ELV", peerB = "CI",
		compareRows = listOf(
			DetailCompare("P/E ratio", "13.7", "11x", "12x"),
			DetailCompare("Rev growth", "+9%", "+7%", "+6%", green = true),
			DetailCompare("Profit margin", "4.2%", "3.0%", "3.6%"),
			DetailCompare("Market cap", "\$289B", "\$70B", "\$85B"),
		),
		sheetBadge = "U", sheetName = "UnitedHealth", sheetPrice = "\$318.70 today", sheetChange = "▼ 0.8%",
		buySpec = BuySpec("Buy UNH?", "U", "UnitedHealth", "\$318.70 today", "▼ 0.8%", "\$8,800.00", "\$8,775.00", "0.0784", "UNH"),
	),
	"JNJ" to DetailFacts(
		symbol = "JNJ",
		title = "JNJ · Johnson & Johnson",
		price = "\$162.40",
		change = "▲ 0.5% today",
		tip = "Band-Aids to cancer drugs. The spread stays calm.",
		riskPillX = 88f,
		riskCopy = "Low volatility. Fits the steady side of your profile.",
		stats = listOf(
			DetailStat("P/E ratio", "16.9", "In line"),
			DetailStat("Revenue growth", "5%", "Slower"),
			DetailStat("Profit margin", "25%", "Excellent", good = true, border = true),
		),
		upside = "↑ 7.8% upside",
		targetLow = "\$150", targetAvg = "\$175", targetHigh = "\$190", targetMarkerX = 96f,
		consensus = "WALL ST. CONSENSUS · 25 ANALYSTS",
		buyCount = "● Buy 12", holdCount = "Hold 13", sellCount = "Sell 0", buyBarW = 152f,
		actions = listOf(
			Triple("Morgan Stanley", "Buy", "\$180"),
			Triple("Goldman Sachs", "Buy", "\$178"),
			Triple("UBS", "Hold", "\$168"),
			Triple("Wells Fargo", "Hold", "\$165"),
			Triple("Barclays", "Hold", "\$160"),
		),
		newsClose = "▲ +0.4% at yesterday’s close",
		newsSignal = "New drug launches are offsetting the Stelara patent cliff faster than expected.",
		newsEarnings = "Next earnings land ${com.stak.demo.data.StakClock.daysAhead(102)}.",
		newsSources = listOf("Reuters · 7h ago" to "Neutral", "Bloomberg · 1d ago" to "Bullish"),
		newsHeadline = "J&J raises its forecast as new drugs outrun the Stelara patent cliff",
		newsHeadline2 = "J&J's oncology pipeline carries the quarter",
		peersLabel = "vs PFE · LLY",
		peerA = "PFE", peerB = "LLY",
		compareRows = listOf(
			DetailCompare("P/E ratio", "16.9", "13x", "63x"),
			DetailCompare("Rev growth", "+5%", "+2%", "+38%", green = true),
			DetailCompare("Profit margin", "25%", "13%", "24%"),
			DetailCompare("Market cap", "\$391B", "\$144B", "\$752B"),
		),
		sheetBadge = "J", sheetName = "J&J", sheetPrice = "\$162.40 today", sheetChange = "▲ 0.5%",
		buySpec = BuySpec("Buy JNJ?", "J", "Johnson & Johnson", "\$162.40 today", "▲ 0.5%", "\$8,800.00", "\$8,775.00", "0.1539", "JNJ"),
	),
	"PFE" to DetailFacts(
		symbol = "PFE",
		title = "PFE · Pfizer Inc",
		price = "\$25.30",
		change = "▼ 0.2% today",
		tip = "Fat dividend, slow grind. Patience is the trade.",
		riskPillX = 88f,
		riskCopy = "Low volatility. Fits the steady side of your profile.",
		stats = listOf(
			DetailStat("P/E ratio", "13.2", "Cheap", good = true, border = true),
			DetailStat("Revenue growth", "2%", "Flat"),
			DetailStat("Profit margin", "13%", "Modest"),
		),
		upside = "↑ 10.7% upside",
		targetLow = "\$23", targetAvg = "\$28", targetHigh = "\$33", targetMarkerX = 40f,
		consensus = "WALL ST. CONSENSUS · 24 ANALYSTS",
		buyCount = "● Buy 9", holdCount = "Hold 14", sellCount = "Sell 1", buyBarW = 119f,
		actions = listOf(
			Triple("BofA", "Buy", "\$30"),
			Triple("Leerink Partners", "Buy", "\$29"),
			Triple("Morgan Stanley", "Hold", "\$27"),
			Triple("UBS", "Hold", "\$27"),
			Triple("Goldman Sachs", "Hold", "\$26"),
		),
		newsClose = "▼ -0.4% at yesterday’s close",
		newsSignal = "Cost cuts are holding up profit while the post-Covid revenue reset plays out.",
		newsEarnings = "Next earnings land ${com.stak.demo.data.StakClock.daysAhead(123)}.",
		newsSources = listOf("Yahoo · 6h ago" to "Neutral", "Reuters · 1d ago" to "Neutral"),
		newsHeadline = "Pfizer leans on cost cuts as Covid sales keep fading",
		newsHeadline2 = "Pfizer pushes deeper into obesity with a new deal",
		peersLabel = "vs MRK · JNJ",
		peerA = "MRK", peerB = "JNJ",
		compareRows = listOf(
			DetailCompare("P/E ratio", "13.2", "12x", "17x"),
			DetailCompare("Rev growth", "+2%", "+3%", "+5%", green = true),
			DetailCompare("Profit margin", "13%", "27%", "25%"),
			DetailCompare("Market cap", "\$144B", "\$210B", "\$391B"),
		),
		sheetBadge = "P", sheetName = "Pfizer", sheetPrice = "\$25.30 today", sheetChange = "▼ 0.2%",
		buySpec = BuySpec("Buy PFE?", "P", "Pfizer", "\$25.30 today", "▼ 0.2%", "\$8,800.00", "\$8,775.00", "0.9881", "PFE"),
	),
	"COST" to DetailFacts(
		symbol = "COST",
		title = "COST · Costco Wholesale Corp",
		price = "\$947.20",
		change = "▲ 0.7% today",
		tip = "Pay yearly, shop weekly. Boring on purpose.",
		riskPillX = 88f,
		riskCopy = "Low volatility. Fits the steady side of your profile.",
		stats = listOf(
			DetailStat("P/E ratio", "52.1", "Rich"),
			DetailStat("Revenue growth", "8.1%", "Reliable", good = true, border = true),
			DetailStat("Profit margin", "2.9%", "Thin"),
		),
		upside = "↓ 2.3% downside",
		targetLow = "\$800", targetAvg = "\$925", targetHigh = "\$1,080", targetMarkerX = 249f,
		consensus = "WALL ST. CONSENSUS · 36 ANALYSTS",
		buyCount = "● Buy 20", holdCount = "Hold 15", sellCount = "Sell 1", buyBarW = 176f,
		actions = listOf(
			Triple("BofA", "Buy", "\$1,020"),
			Triple("Morgan Stanley", "Buy", "\$1,000"),
			Triple("Jefferies", "Buy", "\$980"),
			Triple("Wells Fargo", "Hold", "\$920"),
			Triple("UBS", "Hold", "\$900"),
		),
		newsClose = "▲ +0.5% at yesterday’s close",
		newsSignal = "Membership renewals and monthly sales are still running ahead of the rest of retail.",
		newsEarnings = "Next earnings land ${com.stak.demo.data.StakClock.daysAhead(83)}.",
		newsSources = listOf("CNBC · 5h ago" to "Bullish", "Bloomberg · 1d ago" to "Neutral"),
		newsHeadline = "Costco posts another strong sales month as memberships keep renewing",
		newsHeadline2 = "Costco's membership renewals hit a fresh high",
		peersLabel = "vs WMT · TGT",
		peerA = "WMT", peerB = "TGT",
		compareRows = listOf(
			DetailCompare("P/E ratio", "52.1", "38x", "13x"),
			DetailCompare("Rev growth", "+8.1%", "+5%", "-2%", green = true),
			DetailCompare("Profit margin", "2.9%", "2.9%", "3.7%"),
			DetailCompare("Market cap", "\$420B", "\$800B", "\$45B"),
		),
		sheetBadge = "C", sheetName = "Costco", sheetPrice = "\$947.20 today", sheetChange = "▲ 0.7%",
		buySpec = BuySpec("Buy COST?", "C", "Costco Wholesale", "\$947.20 today", "▲ 0.7%", "\$8,800.00", "\$8,775.00", "0.0264", "COST"),
	),
	"NKE" to DetailFacts(
		symbol = "NKE",
		title = "NKE · Nike Inc",
		price = "\$72.80",
		change = "▼ 1.3% today",
		tip = "Brand turnarounds take seasons, not weeks.",
		riskPillX = 150f,
		riskCopy = "Moderate volatility. Sits mid-range for your profile.",
		stats = listOf(
			DetailStat("P/E ratio", "33.6", "Rich"),
			DetailStat("Revenue growth", "1%", "Turning", good = true, border = true),
			DetailStat("Profit margin", "7.1%", "Thin"),
		),
		upside = "↑ 9.9% upside",
		targetLow = "\$55", targetAvg = "\$80", targetHigh = "\$100", targetMarkerX = 157f,
		consensus = "WALL ST. CONSENSUS · 35 ANALYSTS",
		buyCount = "● Buy 18", holdCount = "Hold 15", sellCount = "Sell 2", buyBarW = 163f,
		actions = listOf(
			Triple("Jefferies", "Buy", "\$90"),
			Triple("Morgan Stanley", "Buy", "\$85"),
			Triple("Goldman Sachs", "Buy", "\$82"),
			Triple("UBS", "Hold", "\$70"),
			Triple("Barclays", "Hold", "\$68"),
		),
		newsClose = "▼ -1.6% at yesterday’s close",
		newsSignal = "The turnaround is showing up in wholesale orders before it shows up in sales.",
		newsEarnings = "Next earnings land ${com.stak.demo.data.StakClock.daysAhead(88)}.",
		newsSources = listOf("WSJ · 3h ago" to "Neutral", "CNBC · 12h ago" to "Bearish"),
		newsHeadline = "Nike slips as tariff costs weigh on a turnaround that is only starting",
		newsHeadline2 = "Nike's turnaround shows early signs in running",
		peersLabel = "vs LULU · DECK",
		peerA = "LULU", peerB = "DECK",
		compareRows = listOf(
			DetailCompare("P/E ratio", "33.6", "15x", "18x"),
			DetailCompare("Rev growth", "+1%", "+7%", "+16%", green = true),
			DetailCompare("Profit margin", "7.1%", "17%", "19%"),
			DetailCompare("Market cap", "\$108B", "\$25B", "\$17B"),
		),
		sheetBadge = "N", sheetName = "Nike", sheetPrice = "\$72.80 today", sheetChange = "▼ 1.3%",
		buySpec = BuySpec("Buy NKE?", "N", "Nike", "\$72.80 today", "▼ 1.3%", "\$8,800.00", "\$8,775.00", "0.3434", "NKE"),
	),
)
