package com.stak.demo.ui.mystak

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
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import com.stak.demo.ui.components.DonutRing
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.stak.demo.R
import com.stak.demo.data.TasteGraph
import com.stak.demo.ui.theme.Geist
import com.stak.demo.ui.theme.Sora
import com.stak.demo.ui.theme.StakColors

/** How many collection chips the overview shows before "View all". */
private const val CHIPS_SHOWN = 6

/**
 * 06 · My STAK — the saved companies, what STAK has learned from them, and the way
 * back into Discover (My STAK product spec, Sept 2026).
 *
 * My STAK is continuity, not a brokerage screen: it answers "I cared about these
 * companies - what changed, and what is STAK learning from them?". So there is no
 * weekly return, no portfolio grade and no allocation - STAK doesn't know what anyone
 * owns, and a number that looks like performance would claim it does.
 */
@Composable
fun MyStakScreen(
	onOpenCollection: (String) -> Unit,
	onStartSwiping: () -> Unit,
	onOpenTaste: () -> Unit = {},
	onOpenAllCollections: () -> Unit = {},
	onOpenUpdates: () -> Unit = {},
	viewModel: MyStakViewModel = sharedMyStakViewModel(),
) {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
	val demo = com.stak.demo.data.Session.demoAccount
	val ui by viewModel.ui.collectAsState()
	// Keyed on the holdings: a save from the deck or an Unsave on a tile
	// re-reads the screen while it sits in the backstack.
	LaunchedEffect(com.stak.demo.data.MyStakHoldings.tickers, demo) {
		if (!demo) viewModel.loadIfNeeded()
		viewModel.loadTaste()
		viewModel.loadUpdates()
	}
	Column(modifier = Modifier.fillMaxSize().background(StakColors.Bg)) {
		Column(
			verticalArrangement = Arrangement.spacedBy((4 * u).dp),
			modifier = Modifier
				.fillMaxWidth()
				.background(StakColors.Bg)
				.statusBarsPadding()
				.padding(horizontal = (20 * u).dp)
				.padding(top = (20 * u).dp),
		) {
			Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
				Text(
					text = "My STAK",
					style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (26 * u).sp, lineHeight = (33 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
					color = Color.White,
				)
				Spacer(modifier = Modifier.weight(1f))
				AddButton(onClick = onStartSwiping)
			}
			Text(
				text = "Companies you've STAK'd, all in one place.",
				style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (13 * u).sp, lineHeight = (17 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
				color = Stak.Muted,
			)
		}
		Column(
			verticalArrangement = Arrangement.spacedBy((16 * u).dp),
			modifier = Modifier
				.weight(1f)
				.fillMaxWidth()
				.verticalScroll(rememberScrollState())
				.padding(horizontal = (20 * u).dp)
				.padding(top = (20 * u).dp, bottom = (24 * u).dp),
		) {
			// The collections holding a company whose update is still unopened.
			val unreadTickers = ui.updates.filter { !it.read }.map { it.ticker }.toSet()
			val groups = collectionEntries(demo, ui, unreadTickers)
			if (groups.isNotEmpty()) {
				Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
					StakSectionHeader("Collections")
					Spacer(modifier = Modifier.weight(1f))
					// Only worth offering when the grid is holding some back.
					if (groups.size > CHIPS_SHOWN) {
						Text(
							text = "View all ${groups.size} ›",
							style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (12 * u).sp, lineHeight = (16 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
							color = Stak.Teal,
							modifier = Modifier.clickable(
								interactionSource = remember { MutableInteractionSource() },
								indication = com.stak.demo.ui.theme.PressDim,
								onClick = onOpenAllCollections,
							),
						)
					}
				}
				CollectionGrid(groups.take(CHIPS_SHOWN), onOpenCollection)
			} else {
				EmptyStak(onStartSwiping)
			}
			// Only when something actually changed - a calm screen is the right answer
			// on a quiet day (spec: "Updates in your STAK" appears only when meaningful).
			if (ui.updates.isNotEmpty()) {
				UpdatesCard(
					// Companies, not updates: one company can have several, and the inbox
					// counts companies too - the two screens must not disagree.
					unreadCompanies = ui.updates.filter { !it.read }.map { it.ticker }.distinct().size,
					unread = ui.unreadUpdates,
					total = ui.updates.size,
					onOpen = onOpenUpdates,
				)
			}
			TasteCard(ui.taste, ui.tasteFailed, onOpenTaste)
			if (ui.updatesFailed) FailedCard("Updates in your STAK", "Couldn't check your saved companies right now.")
			DiscoverHandoff(ui.cardsLeft, onStartSwiping)
		}
	}
}

/** The header's "+ Add" - the one way into the deck from here (the old CTA sat mid-page). */
@Composable
private fun AddButton(onClick: () -> Unit) {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
	Row(
		verticalAlignment = Alignment.CenterVertically,
		horizontalArrangement = Arrangement.spacedBy((6 * u).dp),
		modifier = Modifier
			.clip(RoundedCornerShape((999 * u).dp))
			.background(Color(0xFF1A2333))
			.border((1 * u).dp, Color(0x552C9DBC), RoundedCornerShape((999 * u).dp))
			.clickable(
				interactionSource = remember { MutableInteractionSource() },
				indication = com.stak.demo.ui.theme.PressDim,
				onClick = onClick,
			)
			.padding(horizontal = (14 * u).dp, vertical = (8 * u).dp),
	) {
		Image(painterResource(R.drawable.ic_plus_small), null, modifier = Modifier.size((12 * u).dp))
		Text(
			text = "Add",
			style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (13 * u).sp, lineHeight = (17 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
			color = Color.White,
		)
	}
}

/** Updates in your STAK: the companies with something new, and the way into them. */
@Composable
private fun UpdatesCard(unreadCompanies: Int, unread: Int, total: Int, onOpen: () -> Unit) {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
	Column(
		verticalArrangement = Arrangement.spacedBy((12 * u).dp),
		modifier = Modifier
			.fillMaxWidth()
			.clip(RoundedCornerShape((16 * u).dp))
			.background(Stak.CardBg)
			.border((1 * u).dp, Color(0x442C9DBC), RoundedCornerShape((16 * u).dp))
			.clickable(
				interactionSource = remember { MutableInteractionSource() },
				indication = com.stak.demo.ui.theme.PressDim,
				onClick = onOpen,
			)
			.padding((16 * u).dp),
	) {
		Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy((8 * u).dp), modifier = Modifier.fillMaxWidth()) {
			Text("🔔", style = TextStyle(fontFamily = Geist, fontSize = (15 * u).sp), color = Stak.Teal)
			Text(
				text = "Updates in your STAK",
				style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (15 * u).sp, lineHeight = (19 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
				color = Color.White,
			)
			Spacer(modifier = Modifier.weight(1f))
			// The count is what is still unopened; nothing to count once all are read.
			if (unread > 0) {
				Box(
					contentAlignment = Alignment.Center,
					modifier = Modifier.size((24 * u).dp).clip(CircleShape).background(Color(0xFF2C9DBC)),
				) {
					Text(
						text = "$unread",
						style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (12 * u).sp),
						color = Color.White,
					)
				}
			}
		}
		Text(
			text = updatesLine(unreadCompanies, total),
			style = TextStyle(fontFamily = Geist, fontSize = (13 * u).sp, lineHeight = (19 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
			color = Stak.Body,
		)
		Box(
			contentAlignment = Alignment.Center,
			modifier = Modifier
				.fillMaxWidth()
				.height((44 * u).dp)
				.clip(RoundedCornerShape((10 * u).dp))
				.background(Color(0xFF3C98B4)),
		) {
			Text(
				text = if (unread > 0) "See what changed  →" else "Read them again  →",
				style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (14 * u).sp),
				color = Color.White,
			)
		}
	}
}

/**
 * "3 saved companies have something new." - companies counted, never rounded up. Once
 * everything is opened it says so plainly, without counting what the user has read or
 * naming the window STAK keeps them for.
 */
private fun updatesLine(unreadCompanies: Int, total: Int): String = when {
	unreadCompanies == 1 -> "1 saved company has something new."
	unreadCompanies > 1 -> "$unreadCompanies saved companies have something new."
	else -> "You're up to date. Past updates are still here if you want them."
}

/**
 * Your Investing Taste: the mix of what draws the user's attention, as a share of
 * observed interest signals. It is never money - the label and the copy both say so.
 */
@Composable
private fun TasteCard(taste: TasteGraph.Graph?, failed: Boolean, onOpen: () -> Unit) {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
	if (taste == null) {
		if (failed) FailedCard("Your Investing Taste", "Couldn't read your taste right now. Pull down or come back in a moment.")
		// Still loading: no card rather than an empty ring.
		return
	}
	Column(
		verticalArrangement = Arrangement.spacedBy((12 * u).dp),
		modifier = Modifier
			.fillMaxWidth()
			.clip(RoundedCornerShape((16 * u).dp))
			.background(Stak.CardBg)
			.clickable(
				interactionSource = remember { MutableInteractionSource() },
				indication = com.stak.demo.ui.theme.PressDim,
				onClick = onOpen,
			)
			.padding((16 * u).dp),
	) {
		Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy((8 * u).dp), modifier = Modifier.fillMaxWidth()) {
			Image(painterResource(R.drawable.ic_gist_sparkle), null, modifier = Modifier.size((20 * u).dp))
			Text(
				text = "Your Investing Taste",
				style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (15 * u).sp, lineHeight = (19 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
				color = Color.White,
			)
			Spacer(modifier = Modifier.weight(1f))
			Text("›", style = TextStyle(fontFamily = Geist, fontSize = (16 * u).sp), color = Stak.Faint)
		}
		Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy((16 * u).dp), modifier = Modifier.fillMaxWidth()) {
			Box(contentAlignment = Alignment.Center, modifier = Modifier.size((92 * u).dp)) {
				if (taste.themes.isEmpty()) {
					// An unmeasured ring in the design's colours would read as a mix STAK doesn't have.
					Box(modifier = Modifier.size((92 * u).dp).clip(CircleShape).background(Color(0xFF212A3D)))
				} else {
					val shares = taste.themes.map { it.share } + listOfNotNull(taste.otherShare.takeIf { it > 0.01f })
					val colors = taste.themes.map { themeColor(it.colorKey) } + listOfNotNull(taste.otherShare.takeIf { it > 0.01f }?.let { Stak.Faint })
					DonutRing(shares, colors, Modifier.size((92 * u).dp))
				}
				Text(
					text = "Taste\nmix",
					style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (10 * u).sp, lineHeight = (13 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
					color = Stak.Muted,
					textAlign = androidx.compose.ui.text.style.TextAlign.Center,
				)
			}
			Column(verticalArrangement = Arrangement.spacedBy((6 * u).dp), modifier = Modifier.weight(1f)) {
				Text(
					text = taste.summary,
					style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (14 * u).sp, lineHeight = (19 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
					color = Color.White,
				)
				Text(
					text = taste.subtitle,
					style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (12 * u).sp, lineHeight = (16 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
					color = Stak.Body,
				)
				Text(
					// Never a share of money: the one misreading a ring like this invites.
					text = "Interest, not money — STAK doesn't know what you own.",
					style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (11 * u).sp, lineHeight = (14 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
					color = Stak.Faint,
				)
				Text(
					text = if (taste.isEmpty || taste.learning) "How this works ›" else "See why ›",
					style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (12 * u).sp, lineHeight = (16 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
					color = Stak.Teal,
				)
			}
		}
	}
}

/** The way back into Discover - present, but not the loudest thing on the page. */
@Composable
private fun DiscoverHandoff(cardsLeft: Int?, onStartSwiping: () -> Unit) {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
	Row(
		verticalAlignment = Alignment.CenterVertically,
		horizontalArrangement = Arrangement.spacedBy((12 * u).dp),
		modifier = Modifier
			.fillMaxWidth()
			.clip(RoundedCornerShape((16 * u).dp))
			.background(Stak.CardBg)
			.clickable(
				interactionSource = remember { MutableInteractionSource() },
				indication = com.stak.demo.ui.theme.PressDim,
				onClick = onStartSwiping,
			)
			.padding((16 * u).dp),
	) {
		Box(
			contentAlignment = Alignment.Center,
			modifier = Modifier.size((36 * u).dp).clip(CircleShape).background(Color(0xFF212A3D)),
		) {
			Text("◎", style = TextStyle(fontFamily = Geist, fontSize = (16 * u).sp), color = Stak.Teal)
		}
		Column(verticalArrangement = Arrangement.spacedBy((2 * u).dp), modifier = Modifier.weight(1f)) {
			Text(
				text = "Based on your taste",
				style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (11 * u).sp, lineHeight = (14 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
				color = Stak.Muted,
			)
			Text(
				text = "Find your next company",
				style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (14 * u).sp, lineHeight = (18 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
				color = Color.White,
			)
			Text(
				// The real number of cards left today when it is known, rather than a fixed "8".
				text = when (cardsLeft) {
					null -> "Explore in Discover ›"
					0 -> "You've been through today's deck ›"
					1 -> "1 card left in today's deck ›"
					else -> "$cardsLeft cards left in today's deck ›"
				},
				style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (12 * u).sp, lineHeight = (16 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
				color = Stak.Teal,
			)
		}
	}
}

/** A read that failed - said plainly, so an empty screen never passes for a quiet day. */
@Composable
private fun FailedCard(title: String, body: String) {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
	Column(
		verticalArrangement = Arrangement.spacedBy((6 * u).dp),
		modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape((16 * u).dp)).background(Stak.CardBg).padding((16 * u).dp),
	) {
		Text(
			text = title,
			style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (15 * u).sp, lineHeight = (19 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
			color = Color.White,
		)
		Text(
			text = body,
			style = TextStyle(fontFamily = Geist, fontSize = (13 * u).sp, lineHeight = (19 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
			color = Stak.Body,
		)
	}
}

/** Nothing saved yet: say what My STAK is for, and open the deck. */
@Composable
private fun EmptyStak(onStartSwiping: () -> Unit) {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
	Column(
		verticalArrangement = Arrangement.spacedBy((8 * u).dp),
		modifier = Modifier
			.fillMaxWidth()
			.clip(RoundedCornerShape((16 * u).dp))
			.background(Stak.CardBg)
			.clickable(
				interactionSource = remember { MutableInteractionSource() },
				indication = com.stak.demo.ui.theme.PressDim,
				onClick = onStartSwiping,
			)
			.padding((16 * u).dp),
	) {
		Text(
			text = "No companies yet",
			style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (15 * u).sp, lineHeight = (19 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
			color = Color.White,
		)
		Text(
			text = "STAK a company in Discover and it lands here, with what changed since you saved it.",
			style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (13 * u).sp, lineHeight = (19 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
			color = Stak.Body,
		)
		Text(
			text = "Open Discover ›",
			style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (13 * u).sp, lineHeight = (17 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
			color = Stak.Teal,
		)
	}
}
