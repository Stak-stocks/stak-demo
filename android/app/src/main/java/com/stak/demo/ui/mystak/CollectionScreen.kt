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
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
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
import com.stak.demo.ui.theme.FIGMA_LINE_BOX
import com.stak.demo.ui.theme.StakColors
import java.util.Locale
import kotlin.math.abs

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
	viewModel: MyStakViewModel = sharedMyStakViewModel(),
) {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
	val demo = com.stak.demo.data.Session.demoAccount
	val ui by viewModel.ui.collectAsState()
	LaunchedEffect(com.stak.demo.data.MyStakHoldings.tickers, demo) { if (!demo) viewModel.loadIfNeeded() }
	// Prices keep moving while this is on screen, not only when it is opened. Every 30s
	// rather than the stock page's 15: a whole Stak is up to 30 quotes a refresh, and at
	// 15s one viewer alone could use most of the Finnhub keys' per-minute allowance.
	if (!demo) com.stak.demo.ui.components.RefreshWhileVisible(key = Unit, intervalMs = 30_000L) { viewModel.refreshQuotes() }
	// The authored catalogue is the demo account's. A real account's collection
	// is one of its own saved categories (product audit, 2026-09-05), and its
	// tiles carry live prices instead of the catalogue's fixed ones.
	val c = collection(collectionId)
	val group = if (demo) null else ui.groups.firstOrNull { it.id == collectionId }
	val title = if (demo) c.name else group?.name ?: "Collection"
	// Codex audit (2026-09-04): the page shows what the holdings store
	// holds of this collection - Unsave on a tile's Stock Detail drops it.
	val baseHeld: List<CollStock> = if (demo) c.held() else (group?.holdings ?: emptyList()).map(::holdingTile)
	// Sort (FigJam Watchlist board, 2026-09-14): newest save first, A-Z, or the
	// day's biggest movers; Remove = a long press on a tile, confirmed inline.
	var sort by rememberSaveable { mutableStateOf(SORT_NEWEST) }
	var removing by rememberSaveable { mutableStateOf<String?>(null) }
	val held = when (sort) {
		SORT_AZ -> baseHeld.sortedBy { it.ticker }
		SORT_MOVERS -> baseHeld.sortedByDescending { kotlin.math.abs(com.stak.demo.data.StakInsights.changePct(it)) }
		else -> baseHeld.sortedWith(compareBy<CollStock> { com.stak.demo.data.MyStakHoldings.daysSinceSaved(it.ticker) ?: Int.MAX_VALUE }.thenBy { c.stocks.indexOf(it) })
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
				text = title,
				style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (16 * u).sp),
				color = Color.White,
			)
			Spacer(modifier = Modifier.weight(1f))
			// The menu behind these dots was never designed and they carried no click
			// handling, so they were a drawing users could tap to no effect. Removed
			// until there is a menu; the spacer keeps the title centred.
			Spacer(modifier = Modifier.size((40 * u).dp))
		}
		Column(
			verticalArrangement = Arrangement.spacedBy((20 * u).dp),
			modifier = Modifier
				.weight(1f)
				.fillMaxWidth()
				.verticalScroll(rememberScrollState())
				.navigationBarsPadding()
				.padding(horizontal = (20 * u).dp)
				.padding(top = (16 * u).dp, bottom = (26 * u).dp),
		) {
			Column(verticalArrangement = Arrangement.spacedBy((10 * u).dp)) {
				// The demo persona's six collections keep their authored 60 glass art
				// (1:3357, user 2026-09-05). A real account's collection instead wears
				// its own category icon - the same one the Overview chip shows, so the
				// two pages never disagree about what a category looks like (device
				// report, 2026-09-23: Big Tech's chip and its Collection page differed).
				val heroRes = if (demo) c.heroRes else null
				if (heroRes != null) {
					Image(
						painter = painterResource(heroRes),
						contentDescription = null,
						contentScale = ContentScale.Crop,
						modifier = Modifier.size((60 * u).dp),
					)
				} else if (!demo) {
					StakIconTile(com.stak.demo.data.categoryIcon(title), Stak.Teal, size = 60, glyph = 32)
				} else {
					Box(
						contentAlignment = Alignment.Center,
						modifier = Modifier.size((60 * u).dp).clip(RoundedCornerShape((16 * u).dp)).background(CardBg),
					) {
						Text(
							text = title.take(1).uppercase(),
							style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (24 * u).sp),
							color = BadgeInk,
						)
					}
				}
				Text(
					text = title,
					style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (26 * u).sp),
					color = Color.White,
				)
				Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy((7 * u).dp)) {
					// Say nothing rather than "0 stocks" while the load is still in flight.
					val pending = !demo && group == null && ui.loading
					Text(if (pending) "—" else heldCountLabel(held.size), style = TextStyle(fontFamily = Geist, fontSize = (13 * u).sp), color = Muted)
					Text("·", style = TextStyle(fontFamily = Geist, fontSize = (13 * u).sp), color = Faint)
					// The demo keeps the authored literal (the weekly move isn't in its data);
					// a real collection shows its own stocks' move today.
					val move = group?.changePct
					Text(
						if (demo) "+2.4% this week" else if (pending) "Loading…" else if (move == null) "No quote yet" else com.stak.demo.data.StakInsights.signedPct(move) + " today",
						style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (13 * u).sp),
						color = if (demo || (move ?: 0.0) >= 0) Green else RedDown,
					)
				}
				Text(
					text = if (demo) c.blurb else if (group == null && ui.loading) "" else "The ${title} names you've saved.",
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
							com.stak.demo.data.MyStakHoldings.remove(ticker)
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
					// 144, not the authored 139: with every line box pinned the tile's
					// own content measures 139 exactly, leaving no room for rounding,
					// and the price's descent was being shaved off the bottom.
					Row(horizontalArrangement = Arrangement.spacedBy((10 * u).dp), modifier = Modifier.fillMaxWidth().height((144 * u).dp)) {
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
				style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (16 * u).sp, lineHeight = (20 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
				color = Color.White,
			)
			Text(stock.company, style = TextStyle(fontFamily = Geist, fontSize = (11 * u).sp, lineHeight = (14 * u).sp, lineHeightStyle = FIGMA_LINE_BOX), color = Muted)
		}
		Text(
			stock.price,
			// Pinned line box: the tile's height is fixed at 139, and the default
			// line box added enough bottom leading to clip the digits' descent.
			style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.Medium, fontSize = (15 * u).sp, lineHeight = (19 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
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

/**
* A saved stock in the authored tile's shape (1:3333) - same badge, change,
* price and company line, with the account's own numbers. A stock with no
* quote back yet reads "—" rather than a made-up price.
*/
private fun holdingTile(h: MyStakViewModel.Holding): CollStock {
	val pct = h.changePct
	return CollStock(
		badge = h.ticker.take(1),
		change = if (pct == null) "—" else (if (pct >= 0) "\u25b2 " else "\u25bc ") + String.format(Locale.US, "%.1f", abs(pct)) + "%",
		up = (pct ?: 0.0) >= 0,
		ticker = h.ticker,
		company = h.name,
		price = h.price?.let { "\$" + String.format(Locale.US, "%,.2f", it) } ?: "—",
	)
}

