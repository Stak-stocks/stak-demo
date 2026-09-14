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
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
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
	val f = detailFactsFor(symbol)
	// The Discover entry follows THIS RUN's saves, like the deck's Save chip:
	// 1:2382/1:2579 author "Unsaved" for a stock My STAK already lists, and
	// the chip ruling (user, 2026-09-04: 1:1627 shows Save on NVDA even
	// though My STAK holds it) applies to the page it opens. The seeded
	// holdings made every designed card open "Saved" (StakTest walk vs the
	// 2x export of 1:2382, 2026-09-04 evening). My STAK entry opens saved.
	var saved by rememberSaveable { mutableStateOf(fromMyStak || f.symbol in DeckSession.saved) }
	var showSuccess by rememberSaveable { mutableStateOf(false) }
	var showBuy by rememberSaveable { mutableStateOf(false) }
	// The range pills select (user, 2026-09-05); "3M" keeps the authored sd_chart_line (1:2382).
	var range by rememberSaveable { mutableStateOf("3M") }
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
					text = f.symbol,
					style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (16 * u).sp),
					color = Color.White,
				)
				Spacer(modifier = Modifier.weight(1f))
				Box(
					contentAlignment = Alignment.Center,
					modifier = Modifier.size((40 * u).dp).background(Card, CircleShape),
				) {
					// 1:2382 authors the share glyph WHITE (1.5 strokes); the News page's
					// asset is its own #AEAEAE - tinted here (StakTest audit, 2026-09-05).
					Image(painterResource(R.drawable.ic_news_share), null, modifier = Modifier.size((17 * u).dp), colorFilter = androidx.compose.ui.graphics.ColorFilter.tint(Color.White))
				}
			}
			Column(modifier = Modifier.weight(1f).fillMaxWidth().verticalScroll(rememberScrollState())) {
				Column(
					verticalArrangement = Arrangement.spacedBy((4 * u).dp),
					modifier = Modifier.fillMaxWidth().padding(horizontal = (20 * u).dp).padding(top = (10 * u).dp, bottom = (6 * u).dp),
				) {
					Text(f.title, style = TextStyle(fontFamily = Geist, fontSize = (11 * u).sp), color = Muted)
					Text(
						f.price,
						style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (26 * u).sp),
						color = Bright,
					)
					Text(
						f.change,
						style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (12 * u).sp),
						color = if (f.change.startsWith("▼")) Red else Green,
					)
				}
				val chartModifier = Modifier.align(Alignment.CenterHorizontally).size((345 * u).dp, (76 * u).dp)
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
						SinceYouSavedCard(f)
					}
					RiskFitCard(f)
					NumbersCard(f)
					AnalystCard(f, open = analystOpen, onToggle = { analystOpen = !analystOpen })
					NewsSignalCard(f)
					CompareCard(f)
					Row(
						horizontalArrangement = Arrangement.spacedBy((8 * u).dp),
						modifier = Modifier
							.fillMaxWidth()
							.clip(RoundedCornerShape((12 * u).dp))
							.background(Card)
							.padding(horizontal = (12 * u).dp, vertical = (10 * u).dp),
					) {
						Text(
							"TIP",
							style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (11 * u).sp),
							color = Color(0xFF5BD7E4),
						)
						Text(
							f.tip,
							// Measured exception (2026-09-04): the authored tip (1:2828)
							// is ONE line in a 260 box - the AAPL copy fits by 6u and the
							// advance-rounding compensation added 12u. No tracking here.
							style = TextStyle(fontFamily = Geist, fontSize = (11 * u).sp),
							color = Muted,
							modifier = Modifier.width((260 * u).dp),
						)
					}
					// Related lesson (FigJam Discover board, 2026-09-14) - the sector's plain-English read.
					LessonCard(lesson = StockLessons.lessonFor(f.symbol))
				}
				Column(
					verticalArrangement = Arrangement.spacedBy((10 * u).dp),
					modifier = Modifier.fillMaxWidth().padding(horizontal = (20 * u).dp).padding(top = (4 * u).dp, bottom = (16 * u).dp),
				) {
					if (fromMyStak) {
						DetailCta("Practice buy") { showBuy = true }
						// Codex audit (2026-09-04): Unsave drops the stock from the
						// holdings store, so the collection page and every count follow.
						// Unsave clears this run's deck save too (Codex review, PR #167 mirror).
						DetailSecondary("Unsave") { DeckSession.saved = DeckSession.saved - f.symbol; com.stak.demo.ui.MyStakHoldings.remove(f.symbol); com.stak.demo.ui.news.NewsSaves.removeStories(f.symbol); onBack() }
					} else if (saved) {
						// A saved stock reads the same from every entry: the authored
						// saved block (16:1012) - Practice buy + Unsave. The "Saved to
						// My STAK" outline button was never in a frame (user, 2026-09-05:
						// "something is off when I saved my stock"). Unsave here drops
						// the stock from this run's saves and the holdings store and
						// stays on the page with the Save CTA back.
						DetailCta("Practice buy") { if (onPracticeBuy != null && hopsToSimulate(f.symbol)) onPracticeBuy() else showBuy = true }
						DetailSecondary("Unsave") {
							saved = false
							DeckSession.saved = DeckSession.saved - f.symbol
							com.stak.demo.ui.MyStakHoldings.remove(f.symbol); com.stak.demo.ui.news.NewsSaves.removeStories(f.symbol)
						}
					} else {
						// The save is committed on the tap itself (Codex review, PR #166): the
						// overlay's paths only navigate, so no dismissal can lose it.
						DetailCta("Save") {
							saved = true
							DeckSession.saved = DeckSession.saved + f.symbol
							com.stak.demo.ui.MyStakHoldings.add(f.symbol)
							showSuccess = true
						}
						DetailSecondary("Practice buy") { if (onPracticeBuy != null && hopsToSimulate(f.symbol)) onPracticeBuy() else showBuy = true }
					}
				}
			}
			if (!fromMyStak && analystOpen && onTab != null) {
				// B9: ONLY the Discover-entry OPEN frame (1:2579) authors the
				// 86 shell bar pinned at the bottom - SWAP taps pop the detail.
				MainTabBar(selected = MainTab.Discover, onSelect = onTab)
			}
		}
		// System Back dismisses the overlay like the scrim does (Codex review, PR #166).
		androidx.activity.compose.BackHandler(enabled = showSuccess) { showSuccess = false }
		// B6: the save-success sheet enters like the News one - scale
		// 0.92 -> 1 + fade - at the authored 350 ease-out (92:969).
		AnimatedVisibility(
			visible = showSuccess,
			enter = scaleIn(initialScale = 0.92f, animationSpec = tween(350, easing = EaseOut)) +
				fadeIn(tween(350, easing = EaseOut)),
			// The scrim dismiss is unauthored - it stays instant.
			exit = ExitTransition.None,
		) {
			DetailSavedSheet(
				f = f,
				// The scrim dismiss saves like the two CTAs do (Codex review, PR #166).
				onDone = { showSuccess = false; saved = true; DeckSession.saved = DeckSession.saved + f.symbol; com.stak.demo.ui.MyStakHoldings.add(f.symbol) },
				// B7/B8: both CTAs mark the stock saved, then leave the page
				// (forward push to My STAK / dissolve back to the deck).
				onViewInMyStak = {
					saved = true
					DeckSession.saved = DeckSession.saved + f.symbol
					com.stak.demo.ui.MyStakHoldings.add(f.symbol)
					if (onViewInMyStak != null) onViewInMyStak() else { showSuccess = false }
				},
				onKeepExploring = {
					saved = true
					DeckSession.saved = DeckSession.saved + f.symbol
					com.stak.demo.ui.MyStakHoldings.add(f.symbol)
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
				spec = f.buySpec,
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
private fun RiskFitCard(f: DetailFacts) {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
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
			Box(
				modifier = Modifier
					.clip(RoundedCornerShape((999 * u).dp))
					.background(Color(0x1F5DA8BF))
					.padding(horizontal = (10 * u).dp, vertical = (4 * u).dp),
			) {
				Text(
					riskFitFor(f).first,
					style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (11 * u).sp),
					color = Color(0xFFA6E4F7),
				)
			}
		}
		// Authored (1:2382): a lone 14x8 pill indicator - the frame draws no track.
		Box(modifier = Modifier.fillMaxWidth().height((8 * u).dp)) {
			Box(modifier = Modifier.offset(x = (f.riskPillX * u).dp).size((14 * u).dp, (8 * u).dp).background(Color(0xFFA6E4F7), RoundedCornerShape((4 * u).dp)))
		}
		Row(modifier = Modifier.fillMaxWidth()) {
			Text("Low", style = TextStyle(fontFamily = Geist, fontSize = (10 * u).sp), color = Muted)
			Spacer(modifier = Modifier.weight(1f))
			Text("High", style = TextStyle(fontFamily = Geist, fontSize = (10 * u).sp), color = Muted)
		}
		Text(
			riskFitFor(f).second,
			style = TextStyle(fontFamily = Geist, fontSize = (11 * u).sp),
			color = Muted,
		)
	}
}

@Composable
private fun NumbersCard(f: DetailFacts) {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
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
			f.stats.forEach { st ->
				StatCell(st.label, st.value, st.verdict, if (st.good) Green else Muted, Modifier.weight(1f), border = st.border)
			}
		}
		Text(
			"Tap a stat for sector and peer benchmarks",
			style = TextStyle(fontFamily = Geist, fontSize = (10 * u).sp),
			color = Muted,
		)
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
private fun NewsSignalCard(f: DetailFacts) {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
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
			f.newsClose,
			style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (11 * u).sp),
			color = Green,
		)
		Text(
			f.newsSignal,
			style = TextStyle(fontFamily = Geist, fontSize = (11 * u).sp),
			color = Muted,
		)
		Text(f.newsEarnings, style = TextStyle(fontFamily = Geist, fontSize = (11 * u).sp), color = Muted)
		Row(
			horizontalArrangement = Arrangement.spacedBy((12 * u).dp),
			modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
		) {
			f.newsSources.forEachIndexed { i, (src, tag) ->
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
						if (i == 0) f.newsHeadline else f.newsHeadline2,
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
private fun DetailSavedSheet(f: DetailFacts, onDone: () -> Unit, onViewInMyStak: () -> Unit = onDone, onKeepExploring: () -> Unit = onDone) {
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
					Text(f.sheetBadge, style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (15 * u).sp), color = Color(0xFF9EADC7))
				}
				Column(verticalArrangement = Arrangement.spacedBy((2 * u).dp), modifier = Modifier.weight(1f)) {
					Text(f.sheetName, style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (13 * u).sp), color = Color.White)
					Text(f.sheetPrice, style = TextStyle(fontFamily = Geist, fontSize = (10 * u).sp), color = Muted)
				}
				Text(f.sheetChange, style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (12 * u).sp), color = if (f.sheetChange.startsWith("▼")) Red else Green)
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
private fun AnalystCard(f: DetailFacts, open: Boolean, onToggle: () -> Unit) {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
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
			// The caret stays when the card is open, flipped into a drop-up so the user
			// sees it folds back (user, 2026-09-06: "no drop up when a user is on it");
			// the open frames (1:2651 / 1:2719) author none. Mirrors iOS.
			Image(painterResource(R.drawable.ic_sd_caret), null, modifier = Modifier.size((20 * u).dp).rotate(if (open) 180f else 0f))
		}
		if (!open) {
			Text(
				f.upside,
				style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (11 * u).sp),
				color = Green,
			)
		} else {
			Kicker("PRICE TARGET RANGE", weight = FontWeight.Normal)
			// 1:2656: a 14 circle at y-3 inside the 8-tall clipped track renders as
			// a 14x8 cap - exact-design audit 2026-09-04 (was 13 wide).
			Box(modifier = Modifier.fillMaxWidth().height((8 * u).dp)) {
				Box(modifier = Modifier.width((180 * u).dp).height((8 * u).dp).background(Color(0x8C5DA8BF), RoundedCornerShape((4 * u).dp)))
				Box(modifier = Modifier.offset(x = (f.targetMarkerX * u).dp).size((14 * u).dp, (8 * u).dp).background(Color(0xFFA6E4F7), RoundedCornerShape((4 * u).dp)))
			}
			Row(modifier = Modifier.fillMaxWidth()) {
				Column(verticalArrangement = Arrangement.spacedBy((1 * u).dp)) {
					Text("Low", style = TextStyle(fontFamily = Geist, fontSize = (10 * u).sp), color = Muted)
					Text(f.targetLow, style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (12 * u).sp), color = Bright)
				}
				Spacer(modifier = Modifier.weight(1f))
				Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy((1 * u).dp)) {
					Text("Avg", style = TextStyle(fontFamily = Geist, fontSize = (10 * u).sp), color = Muted)
					Text(f.targetAvg, style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (12 * u).sp), color = Bright)
				}
				Spacer(modifier = Modifier.weight(1f))
				Column(horizontalAlignment = Alignment.End, verticalArrangement = Arrangement.spacedBy((1 * u).dp)) {
					Text("High", style = TextStyle(fontFamily = Geist, fontSize = (10 * u).sp), color = Muted)
					Text(f.targetHigh, style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (12 * u).sp), color = Bright)
				}
			}
			Text(
				f.upside,
				style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (11 * u).sp),
				color = Green,
			)
			Kicker(f.consensus)
			// 1:2669 authors the consensus track in the card's own #181F30 (the
			// render shows only the green fill) - exact-design audit 2026-09-04.
			Box(modifier = Modifier.fillMaxWidth().height((8 * u).dp).clip(RoundedCornerShape((4 * u).dp)).background(Card)) {
				Box(modifier = Modifier.width((f.buyBarW * u).dp).height((8 * u).dp).background(Green, RoundedCornerShape((4 * u).dp)))
			}
			Row(modifier = Modifier.fillMaxWidth()) {
				Text(f.buyCount, style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (11 * u).sp), color = Green)
				Spacer(modifier = Modifier.weight(1f))
				Text(f.holdCount, style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (11 * u).sp), color = Muted)
				Spacer(modifier = Modifier.weight(1f))
				Text(f.sellCount, style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (11 * u).sp), color = Muted)
			}
			Kicker("RECENT ACTIONS")
			f.actions.forEach { (name, action, target) ->
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
					Text(name, style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (12 * u).sp), color = Bright)
					Spacer(modifier = Modifier.weight(1f))
					Text(
						action,
						style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (11 * u).sp),
						color = if (action == "Buy") Green else Muted,
					)
					Spacer(modifier = Modifier.width((10 * u).dp))
					Text(target, style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (12 * u).sp), color = Bright)
				}
			}
		}
	}
}

/** Compare and learn (collapsed 1:2526 / open 1:2719) — peer table. */
@Composable
private fun CompareCard(f: DetailFacts) {
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
			// The caret stays when the card is open, flipped into a drop-up so the user
			// sees it folds back (user, 2026-09-06: "no drop up when a user is on it");
			// the open frames (1:2651 / 1:2719) author none. Mirrors iOS.
			Image(painterResource(R.drawable.ic_sd_caret), null, modifier = Modifier.size((20 * u).dp).rotate(if (open) 180f else 0f))
		}
		if (!open) {
			// 1:2531 authors Geist Regular - exact-design audit 2026-09-04 (was Medium).
			Text(
				f.peersLabel,
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
					CompareRow("", f.symbol, f.peerA, f.peerB, header = true)
					f.compareRows.forEach { r ->
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
private fun sinceSavedFor(f: DetailFacts): Triple<String, String, Boolean> {
	// A save with a recorded day reads its real age on either account; the authored
	// "5 weeks ago" belongs to the demo persona's SEED saves, which predate the record
	// (audit 2026-09-07: the persona's own saves read "5 weeks ago" a minute later).
	val recorded = com.stak.demo.ui.MyStakHoldings.daysSinceSaved(f.symbol)
	val demo = com.stak.demo.ui.Session.demoAccount && recorded == null
	val days = if (demo) null else recorded
	val move = f.change.filter { it.isDigit() || it == '.' }.ifBlank { "0.0" }
	val up = !f.change.contains('\u25BC') && !f.change.trimStart().startsWith("-")
	return when {
		demo -> Triple("+4.6%", "Saved 5 weeks ago. ${f.symbol} is up 4.6% since, moving roughly with the market. Steady giants tend to.", true)
		// null = a save from before the record existed; it reads as recent rather than as the demo's five weeks.
		days == null || days == 0 -> Triple("+0.0%", "Saved ${if (days == 0) "today" else "recently"}. ${f.symbol} hasn't moved since you saved it - check back after a few sessions.", true)
		else -> Triple(
			(if (up) "+" else "-") + move + "%",
			"Saved ${if (days == 1) "yesterday" else "$days days ago"}. ${f.symbol} is ${if (up) "up" else "down"} $move% since, moving with the market this week.",
			up,
		)
	}
}

/** "SINCE YOU SAVED +4.6%" banner (16:1012) for the My STAK entry. */
@Composable
private fun SinceYouSavedCard(f: DetailFacts) {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
	val since = sinceSavedFor(f)
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
private fun riskFitFor(f: DetailFacts): Pair<String, String> {
	// The active user (Sign in) is the authored persona: its page reads the frame's
	// "Matches you"; only a first-time user's own 05 Risk answer drives the variants
	// (audit 2026-09-07 - the persona never answers 05, so its risk is -1).
	if (com.stak.demo.ui.Session.demoAccount) return "Matches you" to f.riskCopy
	val style = com.stak.demo.ui.onboarding.TasteModel.riskStyle(com.stak.demo.ui.UserProfile.risk)
	val highVol = f.riskPillX > 170f
	val lowVol = f.riskPillX < 120f
	val first = f.riskCopy.substringBefore(". ") + "."
	return when {
		highVol && (style == "Conservative" || style == "Cautious") -> "Bolder than you" to "$first Bolder than your profile, so keep any stake small."
		lowVol && style == "Growth-Oriented" -> "Calmer than you" to "$first Calmer than your profile, a steady anchor for a bold STAK."
		else -> "Matches you" to f.riskCopy
	}
}

/**
 * The page's facts for a symbol. The nineteen designed pages carry their own; any
 * other stock a first-time user saved (a Tesla or Amazon story, the Other
 * collection) keeps ITS identity - symbol, name, quote - over the Apple
 * template's body, so the header, the Since-you-saved line and Unsave are about
 * the stock the user tapped (audit 2026-09-07: they opened Apple's page).
 */
private fun detailFactsFor(symbol: String): DetailFacts {
	DETAIL_FACTS[symbol]?.let { return it }
	val base = DETAIL_FACTS.getValue("AAPL")
	val feed = com.stak.demo.ui.news.NewsArticleFeed
	if (!feed.hasStockFacts(symbol)) return base.copy(symbol = symbol, title = symbol)
	val sf = feed.stockFacts(symbol)
	val pct = sf.change.filter { it.isDigit() || it == '.' }.ifBlank { "0.0" }
	return base.copy(
		symbol = symbol,
		title = "$symbol · ${sf.name}",
		price = sf.price,
		change = (if (sf.up) "\u25B2 " else "\u25BC ") + pct + "% today",
	)
}

/**
 * The authored Discover-entry Practice buy hops to the Simulate tab (1:2382,
 * Instant), whose Saved staks list the ACCOUNT's saves. For the demo persona that
 * is the authored frame; for a first-time user the hop is a dead end unless the
 * stock is one of their saves - then the in-page ticket (16:1012) serves it.
 */
private fun hopsToSimulate(symbol: String): Boolean =
	com.stak.demo.ui.Session.demoAccount || symbol in com.stak.demo.ui.MyStakHoldings.tickers

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
		newsEarnings = "Next earnings land ${com.stak.demo.ui.StakClock.daysAhead(26)}.",
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
		newsEarnings = "Next earnings land ${com.stak.demo.ui.StakClock.daysAhead(54)}.",
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
		newsEarnings = "Next earnings land ${com.stak.demo.ui.StakClock.daysAhead(18)}.",
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
		newsEarnings = "Next earnings land ${com.stak.demo.ui.StakClock.daysAhead(117)}.",
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
		newsEarnings = "Next earnings land ${com.stak.demo.ui.StakClock.daysAhead(123)}.",
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
		newsEarnings = "Next earnings land ${com.stak.demo.ui.StakClock.daysAhead(102)}.",
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
		newsEarnings = "Next earnings land ${com.stak.demo.ui.StakClock.daysAhead(116)}.",
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
		newsEarnings = "Next earnings land ${com.stak.demo.ui.StakClock.daysAhead(103)}.",
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
		newsEarnings = "Next earnings land ${com.stak.demo.ui.StakClock.daysAhead(116)}.",
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
		newsEarnings = "Next earnings land ${com.stak.demo.ui.StakClock.daysAhead(111)}.",
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
		newsEarnings = "Next earnings land ${com.stak.demo.ui.StakClock.daysAhead(118)}.",
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
		newsEarnings = "Next earnings land ${com.stak.demo.ui.StakClock.daysAhead(103)}.",
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
		newsEarnings = "Next earnings land ${com.stak.demo.ui.StakClock.daysAhead(122)}.",
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
		newsEarnings = "Next earnings land ${com.stak.demo.ui.StakClock.daysAhead(118)}.",
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
		newsEarnings = "Next earnings land ${com.stak.demo.ui.StakClock.daysAhead(102)}.",
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
		newsEarnings = "Next earnings land ${com.stak.demo.ui.StakClock.daysAhead(102)}.",
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
		newsEarnings = "Next earnings land ${com.stak.demo.ui.StakClock.daysAhead(123)}.",
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
		newsEarnings = "Next earnings land ${com.stak.demo.ui.StakClock.daysAhead(83)}.",
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
		newsEarnings = "Next earnings land ${com.stak.demo.ui.StakClock.daysAhead(88)}.",
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
