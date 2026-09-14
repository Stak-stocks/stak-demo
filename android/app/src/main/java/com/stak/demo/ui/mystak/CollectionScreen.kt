package com.stak.demo.ui.mystak

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.combinedClickable
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
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.stak.demo.R
import com.stak.demo.ui.onboarding.AuthBackCircle
import com.stak.demo.ui.theme.Geist
import com.stak.demo.ui.theme.Sora
import com.stak.demo.ui.theme.fractionalSpacedBy
import com.stak.demo.ui.theme.StakColors

private val CardBg = Color(0xFF181F30)
private val Muted = Color(0xFF819ABB)
private val Faint = Color(0xFF5C6B85)
private val Green = Color(0xFF2FD08A)
private val RedDown = Color(0xFFE5484D)
/** The collection page's sort keys (FigJam Watchlist board, 2026-09-14). */
private const val SORT_NEWEST = "newest"
private const val SORT_AZ = "az"
private const val SORT_MOVERS = "movers"

private val BadgeInk = Color(0xFF9EADC7)

/**
 * 06 · My STAK — "Collection · Cards A · corrected" (CHINEDU 1:3333).
 * The authored AI & Tech layout - hero (glass art, title, meta, blurb)
 * and the stock-tile grid with the dashed Add-stock card - served with
 * the TAPPED collection's data from Collections.kt (Codex parity audit,
 * 2026-09-04; unknown ids fall back to AI & Tech). Every stock card
 * opens ITS saved Stock Detail - 1:3375's edge is the template (B11).
 * Mirrors ios/StakDemo/MyStak/CollectionView.swift.
 */
@Composable
fun CollectionScreen(
	collectionId: String,
	onBack: () -> Unit,
	onOpenStock: (String) -> Unit,
	// Codex audit (2026-09-04): the dashed Add-stock tile - adding stocks
	// is the Discover deck, the app's only add path; the host hops there.
	onAddStock: () -> Unit = {},
) {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
	val c = collection(collectionId)
	// Codex audit (2026-09-04): the page shows what the holdings store
	// holds of this collection - Unsave on a tile's Stock Detail drops it.
	// Sort (FigJam Watchlist board, 2026-09-14): newest save first, A-Z, or the
	// day's biggest movers; Remove = a long press on a tile, confirmed inline.
	var sort by rememberSaveable { mutableStateOf(SORT_NEWEST) }
	var removing by rememberSaveable { mutableStateOf<String?>(null) }
	val held = when (sort) {
		SORT_AZ -> c.held().sortedBy { it.ticker }
		SORT_MOVERS -> c.held().sortedByDescending { kotlin.math.abs(com.stak.demo.ui.StakInsights.changePct(it)) }
		else -> c.held().sortedWith(compareBy<CollStock> { com.stak.demo.ui.MyStakHoldings.daysSinceSaved(it.ticker) ?: Int.MAX_VALUE }.thenBy { c.stocks.indexOf(it) })
	}
	Column(modifier = Modifier.fillMaxSize().background(StakColors.Bg)) {
		Row(
			verticalAlignment = Alignment.CenterVertically,
			modifier = Modifier
				.fillMaxWidth()
				.background(StakColors.Bg)
				.statusBarsPadding()
				.padding(start = (16 * u).dp, end = (18 * u).dp, top = (8 * u).dp, bottom = (8 * u).dp),
		) {
			AuthBackCircle(onClick = onBack)
			Spacer(modifier = Modifier.weight(1f))
			Text(
				text = c.name,
				style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (16 * u).sp),
				color = Color.White,
			)
			Spacer(modifier = Modifier.weight(1f))
			// No designed menu yet (Codex audit 2026-09-04) - decorative until the designer draws one.
			Box(
				contentAlignment = Alignment.Center,
				modifier = Modifier.size((40 * u).dp).background(CardBg, CircleShape),
			) {
				Image(painterResource(R.drawable.ic_more_dots), contentDescription = null, modifier = Modifier.size((24 * u).dp))
			}
		}
		Column(
			verticalArrangement = Arrangement.spacedBy((20 * u).dp),
			modifier = Modifier
				.weight(1f)
				.fillMaxWidth()
				.verticalScroll(rememberScrollState())
				.padding(horizontal = (20 * u).dp)
				.padding(top = (16 * u).dp, bottom = (26 * u).dp),
		) {
			Column(verticalArrangement = Arrangement.spacedBy((10 * u).dp)) {
				// Every collection's hero is its own 60 art, the AI & Tech treatment
				// (1:3357) - user, 2026-09-05. Mirrors ios CollectionView.
				Image(
					painter = painterResource(c.heroRes),
					contentDescription = null,
					contentScale = ContentScale.Crop,
					modifier = Modifier.size((60 * u).dp),
				)
				Text(
					text = c.name,
					style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (26 * u).sp),
					color = Color.White,
				)
				Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy((7 * u).dp)) {
					Text(heldCountLabel(held.size), style = TextStyle(fontFamily = Geist, fontSize = (13 * u).sp), color = Muted)
					Text("·", style = TextStyle(fontFamily = Geist, fontSize = (13 * u).sp), color = Faint)
					// The persona keeps the authored 1:3333 literal; a first-time user's
					// collection reads the week move of ITS held stocks, none while it is
					// empty (audit 2026-09-07: "0 stocks · +2.4% this week").
					val ownMove = if (com.stak.demo.ui.Session.demoAccount) null
						else held.takeIf { it.isNotEmpty() }?.let { hs -> hs.sumOf { com.stak.demo.ui.StakInsights.changePct(it) } / hs.size }
					if (com.stak.demo.ui.Session.demoAccount || ownMove != null) {
						Text(
							if (ownMove == null) "+2.4% this week" else com.stak.demo.ui.StakInsights.signedPct(ownMove) + " this week",
							style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (13 * u).sp),
							color = if (ownMove != null && ownMove < 0) Color(0xFFE5484D) else Green,
						)
					}
				}
				Text(
					text = c.blurb,
					style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (13 * u).sp),
					color = Color(0xFFC8D2E0),
				)
			}
			if (held.size > 1) {
				Row(horizontalArrangement = Arrangement.spacedBy((8 * u).dp), modifier = Modifier.fillMaxWidth()) {
					listOf(SORT_NEWEST to "Newest", SORT_AZ to "A\u2013Z", SORT_MOVERS to "Top movers").forEach { (key, label) ->
						com.stak.demo.ui.profile.SettingsChip(label = label, selected = sort == key) { sort = key }
					}
				}
			}
			removing?.let { ticker ->
				Row(
					verticalAlignment = Alignment.CenterVertically,
					horizontalArrangement = Arrangement.spacedBy((12 * u).dp),
					modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape((12 * u).dp)).background(CardBg).padding(horizontal = (14 * u).dp, vertical = (12 * u).dp),
				) {
					Text("Remove $ticker from My STAK?", style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (13 * u).sp), color = Color.White, modifier = Modifier.weight(1f))
					Text(
						"Keep",
						style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (13 * u).sp),
						color = Muted,
						modifier = Modifier.clickable(interactionSource = remember { MutableInteractionSource() }, indication = com.stak.demo.ui.theme.PressDim) { removing = null },
					)
					Text(
						"Remove",
						style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (13 * u).sp),
						color = RedDown,
						modifier = Modifier.clickable(interactionSource = remember { MutableInteractionSource() }, indication = com.stak.demo.ui.theme.PressDim) {
							// The same three stores Stock Detail's Unsave clears.
							com.stak.demo.ui.discover.DeckSession.saved = com.stak.demo.ui.discover.DeckSession.saved - ticker
							com.stak.demo.ui.MyStakHoldings.remove(ticker)
							com.stak.demo.ui.news.NewsSaves.removeStories(ticker)
							removing = null
						},
					)
				}
			}
			// Authored tiles are 139 tall (1:3333) and the grid gap 10: pinned, with
			// fractional gaps, so the rows stop drifting (+2.5 by row 3 on StakTest,
			// 2026-09-05, from per-text and per-gap px rounding).
			Column(verticalArrangement = fractionalSpacedBy((10 * u).dp), modifier = Modifier.fillMaxWidth()) {
				// Codex audit (2026-09-04): the dashed Add-stock tile is ALWAYS
				// the last cell - on a new row when the held count is even or
				// zero - so an emptied collection still offers "Add stock".
				// null is that cell; the two-per-row layout is unchanged.
				val cells: List<CollStock?> = held + null
				cells.chunked(2).forEach { row ->
					Row(horizontalArrangement = Arrangement.spacedBy((10 * u).dp), modifier = Modifier.fillMaxWidth().height((139 * u).dp)) {
						row.forEach { stock ->
							if (stock != null) {
								StockTile(
									stock = stock,
									// B11: the tile opens ITS ticker, not always AAPL.
									onClick = { onOpenStock(stock.ticker) },
									onLongClick = { removing = stock.ticker },
									modifier = Modifier.weight(1f).fillMaxSize(),
								)
							} else {
								AddStockTile(onClick = onAddStock, modifier = Modifier.weight(1f).fillMaxSize())
							}
						}
						if (row.size == 1) {
							// A lone Add tile keeps a stock tile's slot AND height:
							// an invisible, inert catalogue tile fills the second
							// cell so IntrinsicSize.Min still measures the authored
							// tile height instead of the Add tile's own content.
							Box(modifier = Modifier.weight(1f).fillMaxSize().alpha(0f).clearAndSetSemantics {}) {
								StockTile(stock = c.stocks.first(), onClick = null, modifier = Modifier.fillMaxSize())
							}
						}
					}
				}
			}
		}
	}
}

/** A stock card; a null onClick is the inert height reference beside a lone Add tile. */
@OptIn(androidx.compose.foundation.ExperimentalFoundationApi::class)
@Composable
private fun StockTile(stock: CollStock, onClick: (() -> Unit)?, onLongClick: (() -> Unit)? = null, modifier: Modifier = Modifier) {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
	val interaction = remember { MutableInteractionSource() }
	Column(
		verticalArrangement = Arrangement.spacedBy((10 * u).dp),
		modifier = modifier
			.clip(RoundedCornerShape((16 * u).dp))
			.background(CardBg)
			.then(
				// A long press offers Remove (FigJam Watchlist board, 2026-09-14).
				if (onClick != null) Modifier.combinedClickable(interactionSource = interaction, indication = com.stak.demo.ui.theme.PressDim, onLongClickLabel = "Remove from My STAK", onLongClick = onLongClick, onClick = onClick) else Modifier,
			)
			.padding((14 * u).dp),
	) {
		Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
			Box(contentAlignment = Alignment.Center, modifier = Modifier.size((36 * u).dp).background(Color(0xFF242B3D), CircleShape)) {
				Text(
					stock.badge,
					style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (14 * u).sp),
					color = BadgeInk,
				)
			}
			Spacer(modifier = Modifier.weight(1f))
			Text(
				stock.change,
				style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (12 * u).sp),
				color = if (stock.up) Green else RedDown,
			)
		}
		Column(verticalArrangement = Arrangement.spacedBy((2 * u).dp)) {
			Text(
				stock.ticker,
				style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (16 * u).sp),
				color = Color.White,
			)
			Text(stock.company, style = TextStyle(fontFamily = Geist, fontSize = (11 * u).sp), color = Muted)
		}
		Text(
			stock.price,
			style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.Medium, fontSize = (15 * u).sp),
			color = Color.White,
		)
	}
}

/** Dashed 1.5dp #2a3346 r16 add card - tapping it is onAddStock (the deck). */
@Composable
private fun AddStockTile(onClick: () -> Unit, modifier: Modifier = Modifier) {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
	Column(
		horizontalAlignment = Alignment.CenterHorizontally,
		verticalArrangement = Arrangement.spacedBy((8 * u).dp, Alignment.CenterVertically),
		modifier = modifier
			.drawBehind {
				drawRoundRect(
					color = Color(0xFF2A3346),
					cornerRadius = CornerRadius((16 * u).dp.toPx()),
					style = Stroke(
						width = (1.5 * u).dp.toPx(),
						pathEffect = PathEffect.dashPathEffect(
							floatArrayOf((6 * u).dp.toPx(), (5 * u).dp.toPx()),
						),
					),
				)
			}
			.clickable(
				interactionSource = remember { MutableInteractionSource() },
				indication = com.stak.demo.ui.theme.PressDim,
				onClick = onClick,
			)
			.padding((14 * u).dp),
	) {
		Image(painterResource(R.drawable.ic_plus_circle), null, modifier = Modifier.size((24 * u).dp))
		Text(
			"Add stock",
			style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (13 * u).sp),
			color = Muted,
		)
	}
}
