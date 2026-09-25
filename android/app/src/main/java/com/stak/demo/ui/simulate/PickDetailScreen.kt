package com.stak.demo.ui.simulate

import com.stak.demo.ui.theme.FIGMA_LINE_BOX
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
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.stak.demo.R
import com.stak.demo.ui.components.RANGE_LABELS
import com.stak.demo.ui.components.RANGE_SERIES
import com.stak.demo.ui.components.RangeChart
import com.stak.demo.ui.components.SERIES_3M
import com.stak.demo.ui.onboarding.AuthBackCircle
import com.stak.demo.ui.theme.Geist
import com.stak.demo.ui.theme.Sora
import com.stak.demo.ui.theme.StakColors
import androidx.compose.foundation.layout.requiredSize

/**
 * One paper pick's numbers - the six authored picks are $100 stakes. NVDA is frame
 * 1:4631 (and its sell sheets 1:4698 / 73:855) verbatim; the others derive
 * from the shared demo table - Codex parity audit (2026-09-04). Mirrors
 * ios/StakDemo/Simulate/PickDetailView.swift.
 */
internal data class PickSpec(
	val symbol: String,
	val badge: String,
	/** The sell row's name (1:4698) - NVDA keeps the authored "NVIDIA Corp". */
	val company: String,
	val priceNow: String,
	val pickedLine: String,
	val priceThen: String,
	/** Signed dollars, e.g. "+$24.00" - the hero splits it at the point. */
	val gain: String,
	/** Unsigned, e.g. "24.0%" - `up` picks the up/down wording and the red. */
	val gainPct: String,
	val up: Boolean,
	val shares: String,
	/** $100 + gain - the sell sheet's position value / proceeds. */
	val stakeValue: String,
	val vsMarket: String,
	val ahead: Boolean,
	/** The day move on the sell row - the same figure the My STAK tile shows. */
	val dayChange: String,
	/** Cost basis label - "$100" for the six authored picks; a paper order carries its own (review 2026-09-04). */
	val stakeBasis: String = "$100",
	/** The This-week stat (1:4673) - authored "+$3.80"; a fresh order starts at "+$0.00". */
	val weekGain: String = "+$3.80",
)

internal val PICK_SPECS = listOf(
	PickSpec("NVDA", "N", "NVIDIA Corp", "$122.10", "Picked May 8 at $98.50", "$98.50", "+$24.00", "24.0%", true, "1.0152", "$124.00", "+20.8% ahead", true, "▲ 2.4%"),
	// TSLA's day move: the News feed's "Tesla drops 7%" story (-6.95% today).
	PickSpec("TSLA", "T", "Tesla", "$291.30", "Picked Jun 3 at $246.86", "$246.86", "+$18.00", "18.0%", true, "0.4051", "$118.00", "+14.8% ahead", true, "▼ 7.0%"),
	PickSpec("AMD", "A", "AMD", "$164.30", "Picked May 29 at $148.02", "$148.02", "+$11.00", "11.0%", true, "0.6756", "$111.00", "+7.8% ahead", true, "▲ 2.1%"),
	PickSpec("AAPL", "A", "Apple", "$229.35", "Picked Apr 22 at $216.37", "$216.37", "+$6.00", "6.0%", true, "0.4622", "$106.00", "+2.8% ahead", true, "▲ 1.2%"),
	PickSpec("JPM", "J", "JPMorgan", "$245.60", "Picked Jun 20 at $240.78", "$240.78", "+$2.00", "2.0%", true, "0.4153", "$102.00", "-1.2% behind", false, "▲ 0.6%"),
	PickSpec("MSFT", "M", "Microsoft", "$438.20", "Picked Jun 26 at $451.75", "$451.75", "-$3.00", "3.0%", false, "0.2214", "$97.00", "-6.2% behind", false, "▼ 0.4%"),
)

/**
 * The tapped pick's numbers: the live position first (Codex audit
 * 2026-09-04 - a fresh buy has no authored entry), then the authored
 * table; an unknown symbol falls back to the frame's NVDA.
 */
internal fun pickSpec(symbol: String): PickSpec =
	PaperPortfolio.pickSpec(symbol) ?: PICK_SPECS.firstOrNull { it.symbol == symbol } ?: PICK_SPECS.first()

/**
 * 07 · Simulate — "Pick detail · paper" (CHINEDU 1:4631). The position
 * page, templated on the tapped pick (NVDA is the frame): picked line,
 * the +$24.00 gain hero, chart with range pills, the This-week /
 * vs-the-market duo, Price then/now, the WHY? insight and the dark Sell
 * CTA (raises the sell flow from here too).
 */
@Composable
fun PickDetailScreen(
	onBack: () -> Unit,
	// Codex parity audit (2026-09-04): the tapped row's ticker rides the
	// route (simulate/pick/{symbol}); its numbers fill the same template.
	symbol: String = "NVDA",
	// B19 (73:855 Motion): the sell-success CTAs leave the page with
	// their own styles - wired by the nav host.
	onBackToSimulate: (() -> Unit)? = null,
	onViewPortfolio: (() -> Unit)? = null,
) {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
	// The range pills select (user, 2026-09-05); "3M" keeps the authored sim_chart_line (1:4631).
	var range by rememberSaveable { mutableStateOf("3M") }
	// Pinned for the page's life: once Confirm sell removes the position,
	// the Position-closed sheet must still show THIS pick, not the fallback.
	val p = remember(symbol) { pickSpec(symbol) }
	// "+$24.00" -> "+$24" in the 48 box and ".00" in its own 16/20 box (1:4654).
	val gainWhole = p.gain.substringBefore('.')
	// "" when a gain carries no cents, ".00" otherwise - never an index crash.
	val gainCents = p.gain.removePrefix(p.gain.substringBefore('.'))
	var showSell by rememberSaveable { mutableStateOf(false) }

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
					text = p.symbol,
					style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (16 * u).sp),
					color = Color.White,
				)
				Spacer(modifier = Modifier.weight(1f))
				Box(
					contentAlignment = Alignment.Center,
					modifier = Modifier.size((40 * u).dp).background(Sim.CardBg, CircleShape),
				) {
					Image(painterResource(R.drawable.ic_news_share), null, modifier = Modifier.size((18 * u).dp)) // 1:4652 icon/share is 18 (exact-design audit 2026-09-04)
				}
			}
			Column(
				verticalArrangement = Arrangement.spacedBy((16 * u).dp),
				modifier = Modifier
					.weight(1f)
					.fillMaxWidth()
					.verticalScroll(rememberScrollState())
					.padding(horizontal = (20 * u).dp)
					.padding(top = (6 * u).dp, bottom = (26 * u).dp), // 1:4653 pb 26 (exact-design audit 2026-09-04)
			) {
				// Authored hero card (1:4654): 350x307 r16 with 18 padding - avatar row,
				// +$24 in a 48-tall box with the .00 at 16/20, subtitle, the 343x73.5 chart
				// line bleeding 14.5 past the padding, range tabs 40 below the line.
				Column(
					modifier = Modifier
						.fillMaxWidth()
						.height((307 * u).dp)
						// 1:4654 (exact-design audit 2026-09-04): the hero is r16 - the r24 was never authored.
						.clip(RoundedCornerShape((16 * u).dp))
						.background(Sim.CardBg)
						.padding((18 * u).dp),
				) {
					Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy((9 * u).dp)) {
						Box(contentAlignment = Alignment.Center, modifier = Modifier.size((38 * u).dp).background(Sim.ChipBg, CircleShape)) {
							Text(p.badge, style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (15 * u).sp, lineHeight = (19 * u).sp, lineHeightStyle = FIGMA_LINE_BOX), color = Sim.BadgeInk)
						}
						Text(
							p.pickedLine,
							style = TextStyle(fontFamily = Geist, fontSize = (12 * u).sp, lineHeight = (16 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
							color = Sim.Muted,
						)
					}
					Row(verticalAlignment = Alignment.Bottom, modifier = Modifier.padding(top = (11 * u).dp).height((48 * u).dp)) {
						Text(
							gainWhole,
							style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (38 * u).sp, lineHeight = (48 * u).sp, lineHeightStyle = FIGMA_LINE_BOX), // 1:4660 carries no tracking (exact-design audit 2026-09-04)
							// A losing pick's figure takes the authored red (the rows' Sim.Red).
							color = if (p.up) Color.White else Sim.Red,
						)
						Text(
							gainCents,
							style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (16 * u).sp, lineHeight = (20 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
							color = Sim.Muted,
							modifier = Modifier.padding(start = (7 * u).dp, bottom = (6 * u).dp),
						)
					}
					Text(
						"That is ${if (p.up) "up" else "down"} ${p.gainPct} on a ${p.stakeBasis} paper stake",
						// 1:4662 (exact-design audit 2026-09-04): Geist Light, like the hero's all-time line.
						style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Light, fontSize = (12 * u).sp, lineHeight = (16 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
						color = Sim.Muted,
						modifier = Modifier.padding(top = (11 * u).dp),
					)
					val chartModifier = Modifier.padding(top = (11 * u).dp).requiredSize((343 * u).dp, (73.5 * u).dp)
					val series = RANGE_SERIES[range]
					if (series == null && PaperPortfolio.demo) {
						Image(
							painter = painterResource(R.drawable.sim_chart_line),
							contentDescription = null,
							contentScale = ContentScale.Fit,
							modifier = chartModifier,
						)
					} else {
						// A new account's pick draws its own move - flat until the price moves (product audit, 2026-09-05).
						val pct = (p.gainPct.filter { it.isDigit() || it == '.' }.toDoubleOrNull() ?: 0.0) * (if (p.up) 1 else -1)
						val line = if (PaperPortfolio.demo) series!! else com.stak.demo.ui.StakInsights.scaled(series ?: SERIES_3M, pct)
						RangeChart(series = line, tint = Sim.Teal, modifier = chartModifier)
					}
					Row(
						verticalAlignment = Alignment.CenterVertically,
						horizontalArrangement = Arrangement.spacedBy((37 * u).dp),
						modifier = Modifier.align(Alignment.CenterHorizontally).padding(top = (40 * u).dp),
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
									Text(label, style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (12 * u).sp), color = Sim.Teal)
								}
							} else {
								Text(label, style = TextStyle(fontFamily = Geist, fontSize = (12 * u).sp), color = Sim.Muted, modifier = select)
							}
						}
					}
				}
				// Stats (1:4673): two 61-tall rows, 10 apart, 170-wide cells.
				Column(verticalArrangement = Arrangement.spacedBy((10 * u).dp)) {
					Row(horizontalArrangement = Arrangement.spacedBy((10 * u).dp)) {
						// The authored "+$3.80" for every seeded pick (the demo table
						// carries no weekly move); a fresh order starts at "+$0.00".
						StatBox("This week", p.weekGain, Sim.Green, Modifier.weight(1f))
						StatBox("vs the market", p.vsMarket, if (p.ahead) Sim.Green else Sim.Red, Modifier.weight(1f))
					}
					Row(horizontalArrangement = Arrangement.spacedBy((10 * u).dp)) {
						// 1:4684 / 1:4687 (exact-design audit 2026-09-04): the prices are plain white, not #f2f6fc.
						StatBox("Price then", p.priceThen, Color.White, Modifier.weight(1f))
						StatBox("Price now", p.priceNow, Color.White, Modifier.weight(1f))
					}
				}
				// WHY / insight card — teal-tinted like the deck tips.
				Column(
					verticalArrangement = Arrangement.spacedBy((9 * u).dp),
					modifier = Modifier
						.fillMaxWidth()
						// 1:4688 (exact-design audit 2026-09-04): the live note is r14.
						.clip(RoundedCornerShape((14 * u).dp))
						.background(Sim.TealTint)
						// Live note (1:4688): 83 tall, x14, kicker row at 12, body at 37.
						.padding(horizontal = (14 * u).dp, vertical = (12 * u).dp),
				) {
					// 1:4689 (exact-design audit 2026-09-04): sparkle and kicker share the row's top edge.
					Row(verticalAlignment = Alignment.Top, horizontalArrangement = Arrangement.spacedBy((7 * u).dp)) {
						Image(painterResource(R.drawable.ic_gist_sparkle), null, modifier = Modifier.size((16 * u).dp))
						Text(
							"INSIGHT",
							style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (10 * u).sp, letterSpacing = (0.9 * u).sp),
							color = Sim.Faint,
						)
					}
					Text(
						// The authored sentence with only the symbol swapped (losing picks too).
						"Your stake tracks the move live. If ${p.symbol} gives back gains, the dollars follow it down.",
						style = TextStyle(fontFamily = Geist, fontSize = (12 * u).sp, lineHeight = (17 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
						color = Sim.Body,
					)
				}
				// Review 2026-09-04: a pick no longer held shows no Sell - there
				// is nothing to close (phantom sell).
				if (PaperPortfolio.holds(symbol)) {
					Box(
						contentAlignment = Alignment.Center,
						modifier = Modifier
							.fillMaxWidth()
							.height((51 * u).dp)
							// 1:4694 (exact-design audit 2026-09-04): the 0.361 CTA hairline and the 4% teal wash under #12203e.
							.tealShadow(u, dy = 12.285f, blur = 12.285f, alpha = 0.04f)
							.background(Sim.DarkCta, RoundedCornerShape((6 * u).dp))
							.border((0.361 * u).dp, Sim.CtaBorder, RoundedCornerShape((6 * u).dp))
							.clickable(
								interactionSource = remember { MutableInteractionSource() },
								indication = com.stak.demo.ui.theme.PressDim,
							) { showSell = true },
					) {
						Text(
							"Sell",
							// 1:4695 (exact-design audit 2026-09-04): Sora Regular 14 on a 20.69 line - was Geist Medium.
							style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.Normal, fontSize = (14 * u).sp, lineHeight = (20.69 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
							color = Color.White,
						)
					}
				}
				Box(
					contentAlignment = Alignment.Center,
					modifier = Modifier
						.fillMaxWidth()
						.height((52 * u).dp)
						.border((0.36 * u).dp, Color(0x54343B4F), RoundedCornerShape((6 * u).dp))
						.clickable(
							interactionSource = remember { MutableInteractionSource() },
							indication = com.stak.demo.ui.theme.PressDim,
							onClick = onBack,
						),
				) {
					Text("Back", style = TextStyle(fontFamily = Sora, fontSize = (14 * u).sp), color = Sim.Muted)
				}
			}
		}
		if (showSell) {
			// Sell confirm (1:4698 Motion): "Back" just drops the sheet,
			// Instant; the success CTAs route through the nav host (B19) so
			// the sheet rides the page's own transition out.
			SellFlowHost(
				pick = p,
				onClose = { showSell = false },
				onBackToSimulate = { if (onBackToSimulate != null) onBackToSimulate() else { showSell = false; onBack() } },
				onViewPortfolio = { if (onViewPortfolio != null) onViewPortfolio() else { showSell = false; onBack() } },
			)
		}
	}
}

@Composable
private fun StatBox(label: String, value: String, valueColor: Color, modifier: Modifier) {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
	// 1:4675 cell (exact-design audit 2026-09-04): r14, label Geist 10 #819abb, value
	// Geist Regular 14 - was r12 / #5c6b85 / Sora SemiBold 15.
	Column(
		verticalArrangement = Arrangement.spacedBy((4 * u).dp),
		modifier = modifier
			.height((61 * u).dp)
			.clip(RoundedCornerShape((14 * u).dp))
			.background(Sim.CardBg)
			.padding(horizontal = (14 * u).dp, vertical = (13 * u).dp),
	) {
		Text(label, style = TextStyle(fontFamily = Geist, fontSize = (10 * u).sp, lineHeight = (13 * u).sp, lineHeightStyle = FIGMA_LINE_BOX), color = Sim.Muted)
		Text(
			value,
			style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (14 * u).sp, lineHeight = (18 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
			color = valueColor,
		)
	}
}
