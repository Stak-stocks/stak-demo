package com.stak.demo.ui.mystak

import com.stak.demo.ui.theme.FIGMA_LINE_BOX
import androidx.compose.foundation.background
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
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.stak.demo.data.StakClock
import com.stak.demo.data.StakEvents
import com.stak.demo.data.StockUpdateDto
import com.stak.demo.ui.onboarding.AuthBackCircle
import com.stak.demo.ui.theme.Geist
import com.stak.demo.ui.theme.Sora
import com.stak.demo.ui.theme.StakColors

/**
 * "What changed" — one card per saved company that has news worth returning for
 * (My STAK product spec, Sept 2026). Each card names the company, states the change and
 * gives enough context to decide whether to look further; opening one marks it read and
 * takes a point off the overview's count.
 */
@Composable
fun UpdatesScreen(
	onBack: () -> Unit,
	onOpenStock: (String) -> Unit,
	viewModel: MyStakViewModel = sharedMyStakViewModel(),
) {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
	val ui by viewModel.ui.collectAsState()
	LaunchedEffect(Unit) { viewModel.loadUpdates() }
	Column(modifier = Modifier.fillMaxSize().background(StakColors.Bg)) {
		Box(modifier = Modifier.fillMaxWidth().statusBarsPadding().height((56 * u).dp)) {
			AuthBackCircle(onClick = onBack, modifier = Modifier.align(Alignment.CenterStart).padding(start = (20 * u).dp))
		}
		Column(
			verticalArrangement = Arrangement.spacedBy((12 * u).dp),
			modifier = Modifier
				.weight(1f)
				.fillMaxWidth()
				.verticalScroll(rememberScrollState())
				.navigationBarsPadding()
				.padding(horizontal = (20 * u).dp)
				.padding(top = (8 * u).dp, bottom = (32 * u).dp),
		) {
			Column(verticalArrangement = Arrangement.spacedBy((4 * u).dp)) {
				Text(
					text = "What changed",
					style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (24 * u).sp, lineHeight = (30 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
					color = Color.White,
				)
				Text(
					text = subtitleFor(ui.updates.filter { !it.read }),
					style = TextStyle(fontFamily = Geist, fontSize = (13 * u).sp, lineHeight = (17 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
					color = Stak.Muted,
				)
			}
			// New is what the user hasn't opened - not what arrived since they last looked
			// here: opening a list is not reading the cards in it, and an update glanced at
			// and backed out of shouldn't disappear from the top.
			val fresh = ui.updates.filter { !it.read }
			// Already opened, kept for a fortnight in case they want them again. Capped: a
			// busy week across 30 saved companies would otherwise bury the new ones.
			val earlier = ui.updates.filter { it.read }.take(EARLIER_SHOWN)
			if (fresh.isNotEmpty()) {
				UpdateSection("New", fresh, viewModel, onOpenStock)
			}
			if (ui.updates.isNotEmpty()) {
				Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy((8 * u).dp), modifier = Modifier.fillMaxWidth().padding(top = (4 * u).dp)) {
					Text("✓", style = TextStyle(fontFamily = Geist, fontSize = (13 * u).sp), color = Stak.Faint)
					Text(
						// "Up to date" is only true once every one of them has been opened.
						text = if (fresh.isEmpty()) "You're up to date on your saved companies." else "That's all the new updates.",
						style = TextStyle(fontFamily = Geist, fontSize = (12 * u).sp, lineHeight = (16 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
						color = Stak.Faint,
					)
				}
			}
			if (earlier.isNotEmpty()) {
				UpdateSection("Earlier · already opened", earlier, viewModel, onOpenStock)
			}
		}
	}
}

/** How many already-opened updates stay on the page under "Earlier". */
private const val EARLIER_SHOWN = 10

/** One band of the inbox - its heading, then a card per company in it. */
@Composable
private fun UpdateSection(
	title: String,
	updates: List<StockUpdateDto>,
	viewModel: MyStakViewModel,
	onOpenStock: (String) -> Unit,
) {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
	Text(
		text = title,
		style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (11 * u).sp, lineHeight = (14 * u).sp, letterSpacing = (0.8 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
		color = Stak.Faint,
		modifier = Modifier.padding(top = (4 * u).dp),
	)
	// Grouped by company: two changes at one company are one card, as the spec asks.
	updates.groupBy { it.ticker }.forEach { (ticker, forCompany) ->
		CompanyUpdateCard(
			updates = forCompany,
			onOpen = {
				viewModel.markCompanyRead(ticker)
				StakEvents.log(StakEvents.UPDATE_OPEN, ticker = ticker, params = mapOf("kind" to forCompany.first().kind))
				onOpenStock(ticker)
			},
		)
	}
}

/**
 * The line under the title. It says what is waiting, in words rather than a window:
 * "Last 14 days" told the user about STAK's rules instead of about their companies.
 */
private fun subtitleFor(fresh: List<StockUpdateDto>): String {
	if (fresh.isEmpty()) return "Nothing new at your saved companies."
	val companies = fresh.map { it.ticker }.distinct().size
	return if (companies == 1) "1 saved company has something new" else "$companies saved companies have something new"
}

/** One company's changes: what happened, the context, and where each one came from. */
@Composable
private fun CompanyUpdateCard(updates: List<StockUpdateDto>, onOpen: () -> Unit) {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
	val update = updates.first()
	val unread = updates.any { !it.read }
	Column(
		verticalArrangement = Arrangement.spacedBy((8 * u).dp),
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
		Row(verticalAlignment = Alignment.Top, horizontalArrangement = Arrangement.spacedBy((10 * u).dp), modifier = Modifier.fillMaxWidth()) {
			CompanyLogo(update)
			Column(verticalArrangement = Arrangement.spacedBy((2 * u).dp), modifier = Modifier.weight(1f)) {
				Text(
					text = update.company,
					style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (14 * u).sp, lineHeight = (18 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
					color = Color.White,
				)
				Text(
					text = "${update.ticker} · ${kindLabel(update.kind)}${ageOf(update)?.let { " · $it" } ?: ""}",
					style = TextStyle(fontFamily = Geist, fontSize = (11 * u).sp, lineHeight = (14 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
					color = Stak.Muted,
				)
			}
			// An unread dot, as on the overview's collections - gone once it is opened.
			if (unread) Box(modifier = Modifier.size((8 * u).dp).clip(CircleShape).background(Stak.Teal))
		}
		updates.forEachIndexed { i, change ->
			if (i > 0) Spacer(modifier = Modifier.height((4 * u).dp))
			Text(
				text = change.title,
				style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (16 * u).sp, lineHeight = (21 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
				color = Color.White,
			)
			Text(
				text = change.body,
				style = TextStyle(fontFamily = Geist, fontSize = (13 * u).sp, lineHeight = (19 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
				color = Stak.Body,
			)
			change.watch?.takeIf { it.isNotBlank() }?.let {
				Text(
					text = it,
					style = TextStyle(fontFamily = Geist, fontSize = (12 * u).sp, lineHeight = (16 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
					color = Stak.Muted,
				)
			}
			// Where it came from: STAK summarised these headlines, and says so rather than
			// asking to be taken on trust.
			updateSourceLine(change)?.let { line ->
				Text(
					text = line,
					style = TextStyle(fontFamily = Geist, fontSize = (11 * u).sp, lineHeight = (14 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
					color = Stak.Faint,
				)
			}
		}
		Spacer(modifier = Modifier.height((2 * u).dp))
		Text(
			// The company's page now carries these changes under Since you saved, so the
			// promise this makes is one the destination keeps.
			text = "Understand this change ›",
			style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (13 * u).sp, lineHeight = (17 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
			color = Stak.Teal,
		)
	}
}

private fun kindLabel(kind: String): String = when (kind) {
	"earnings" -> "Earnings"
	"guidance" -> "Outlook"
	"analyst" -> "Analysts"
	"business" -> "Company news"
	else -> "Update"
}

/**
 * The company's logo from the brand catalogue, or its initial while that is still
 * loading (or for a company the catalogue has no mark for).
 */
@Composable
private fun CompanyLogo(update: StockUpdateDto) {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
	val url = com.stak.demo.data.BrandNames.logoByTicker[update.ticker.uppercase()]
	Box(
		contentAlignment = Alignment.Center,
		modifier = Modifier.size((34 * u).dp).clip(RoundedCornerShape((9 * u).dp)).background(Color(0xFF242B3D)),
	) {
		if (url != null) {
			coil.compose.AsyncImage(
				model = url,
				contentDescription = null,
				contentScale = androidx.compose.ui.layout.ContentScale.Fit,
				modifier = Modifier.size((26 * u).dp),
			)
		} else {
			Text(
				text = update.company.take(1).uppercase(),
				style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (14 * u).sp),
				color = Stak.Muted,
			)
		}
	}
}

/** "From Reuters" / "From Reuters and 2 more" - the headlines this was written from. */
internal fun updateSourceLine(update: StockUpdateDto): String? {
	val names = update.sources.map { it.source }.filter { it.isNotBlank() }.distinct()
	if (names.isEmpty()) return null
	val extra = update.sources.size - 1
	return when {
		names.size == 1 && extra > 0 -> "From ${names[0]} and $extra more ${if (extra == 1) "headline" else "headlines"}"
		names.size == 1 -> "From ${names[0]}"
		else -> "From ${names[0]} and ${names.size - 1} more"
	}
}

/**
 * How old the change is - dated from the newest headline behind it, not from when STAK
 * noticed it: a story from yesterday shouldn't read as "6m ago" because the job ran then.
 */
private fun ageOf(update: StockUpdateDto): String? {
	val newest = update.sources.maxOfOrNull { it.datetime }?.takeIf { it > 0 }
	val ms = newest?.times(1000)
		?: runCatching { java.time.Instant.parse(update.occurredAt).toEpochMilli() }.getOrNull()
		?: return null
	val age = StakClock.newsAge(ms / 1000)
	return if (age == "0m") "Just now" else "$age ago"
}
