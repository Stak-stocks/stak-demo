package com.stak.demo.ui.live

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.stak.demo.ui.onboarding.figmaUnit
import com.stak.demo.ui.profile.SettingsScaffold
import com.stak.demo.ui.theme.FIGMA_LINE_BOX
import com.stak.demo.ui.theme.Geist
import com.stak.demo.ui.theme.Sora
import com.stak.demo.ui.theme.StakColors

/**
 * The Go live screens' shared pieces (FigJam Go live boards, 2026-09-14). No
 * frames exist for them, so they borrow the settings pages' language: the hub
 * header, #10182B r16 cards, Geist 13 labels, the auth kit's inputs and CTA.
 * Mirrors ios Live/LiveKit.swift.
 */
internal object Live {
	val CardBg = Color(0xFF10182B)
	val Muted = Color(0xFF819ABB)
	val Body = Color(0xFFC8D2E0)
	val Teal = Color(0xFF69B3CA)
	val Green = Color(0xFF2FD08A)
	val Red = Color(0xFFE5484D)
	val Amber = Color(0xFFFFB454)
	val BadgeBg = Color(0xFF242B3D)
	val BadgeInk = Color(0xFF9EADC7)
	val SheetBg = Color(0xFF10172A)
}

/** A titled, scrolling page with the hub header. */
@Composable
internal fun LivePage(title: String, onBack: () -> Unit, content: @Composable ColumnScope.() -> Unit) {
	val u = figmaUnit()
	SettingsScaffold(title = title, onBack = onBack) {
		Column(
			verticalArrangement = Arrangement.spacedBy((12 * u).dp),
			modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontal = (20 * u).dp).padding(bottom = (26 * u).dp),
			content = content,
		)
	}
}

@Composable
internal fun LiveCard(content: @Composable ColumnScope.() -> Unit) {
	val u = figmaUnit()
	Column(
		verticalArrangement = Arrangement.spacedBy((8 * u).dp),
		modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape((16 * u).dp)).background(Live.CardBg).padding((16 * u).dp),
		content = content,
	)
}

@Composable
internal fun LiveKicker(text: String, color: Color = Live.Teal) {
	val u = figmaUnit()
	Text(text, style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (11 * u).sp, lineHeight = (14 * u).sp, lineHeightStyle = FIGMA_LINE_BOX), color = color)
}

@Composable
internal fun LiveTitle(text: String) {
	val u = figmaUnit()
	Text(text, style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (20 * u).sp, lineHeight = (25 * u).sp, lineHeightStyle = FIGMA_LINE_BOX), color = Color.White)
}

@Composable
internal fun LiveBody(text: String, color: Color = Live.Body) {
	val u = figmaUnit()
	Text(text, style = TextStyle(fontFamily = Geist, fontSize = (13 * u).sp, lineHeight = (19 * u).sp, lineHeightStyle = FIGMA_LINE_BOX), color = color)
}

@Composable
internal fun LiveCaption(text: String) {
	val u = figmaUnit()
	Text(text, style = TextStyle(fontFamily = Geist, fontSize = (11 * u).sp, lineHeight = (15 * u).sp, lineHeightStyle = FIGMA_LINE_BOX), color = Live.Muted)
}

/** A label / value line. */
@Composable
internal fun LiveRow(label: String, value: String, valueColor: Color = Color.White) {
	val u = figmaUnit()
	Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth().height((32 * u).dp)) {
		Text(label, style = TextStyle(fontFamily = Geist, fontSize = (13 * u).sp), color = Live.Muted)
		Spacer(modifier = Modifier.weight(1f))
		Text(value, style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (13 * u).sp), color = valueColor)
	}
}

/** The badge circle every stock row draws. */
@Composable
internal fun LiveBadge(letter: String, size: Float = 32f) {
	val u = figmaUnit()
	Box(contentAlignment = Alignment.Center, modifier = Modifier.size((size * u).dp).background(Live.BadgeBg, CircleShape)) {
		Text(letter, style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (size * 0.4f * u).sp), color = Live.BadgeInk)
	}
}

/** A status pill: Pending (amber), Filled / Done (green), Cancelled (muted). */
@Composable
internal fun LiveStatusPill(status: String) {
	val u = figmaUnit()
	val (label, color) = when (status) {
		"pending", "processing" -> (if (status == "pending") "Pending" else "Processing") to Live.Amber
		"filled", "done" -> (if (status == "filled") "Filled" else "Done") to Live.Green
		else -> "Cancelled" to Live.Muted
	}
	Box(modifier = Modifier.clip(RoundedCornerShape((10 * u).dp)).background(color.copy(alpha = 0.16f)).padding(horizontal = (8 * u).dp, vertical = (3 * u).dp)) {
		Text(label, style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (10 * u).sp), color = color)
	}
}

/** A secondary, hairline action (the sheet's "Not now" / "Cancel"). */
@Composable
internal fun LiveSecondary(text: String, onClick: () -> Unit) {
	val u = figmaUnit()
	Box(
		contentAlignment = Alignment.Center,
		modifier = Modifier
			.fillMaxWidth()
			.height((48 * u).dp)
			.clip(RoundedCornerShape((6 * u).dp))
			.border((0.36 * u).dp, Color(0x54343B4F), RoundedCornerShape((6 * u).dp))
			.clickable(interactionSource = remember { MutableInteractionSource() }, indication = com.stak.demo.ui.theme.PressDim, onClick = onClick),
	) {
		Text(text, style = TextStyle(fontFamily = Sora, fontSize = (14 * u).sp), color = Live.Muted)
	}
}

/** A scrim + bottom sheet for the order flow (the Discover ticket's scaffold is private to it). */
@Composable
internal fun LiveSheet(onDismiss: () -> Unit, content: @Composable ColumnScope.() -> Unit) {
	val u = figmaUnit()
	Box(modifier = Modifier.fillMaxSize()) {
		Box(
			modifier = Modifier
				.fillMaxSize()
				.background(Color(0x99000000))
				.clickable(interactionSource = remember { MutableInteractionSource() }, indication = null, onClick = onDismiss),
		)
		Column(
			verticalArrangement = Arrangement.spacedBy((14 * u).dp),
			modifier = Modifier
				.align(Alignment.BottomCenter)
				.fillMaxWidth()
				.clip(RoundedCornerShape(topStart = (20 * u).dp, topEnd = (20 * u).dp))
				.background(Live.SheetBg)
				.clickable(interactionSource = remember { MutableInteractionSource() }, indication = null) {}
				.padding(horizontal = (20 * u).dp)
				.padding(top = (20 * u).dp, bottom = (24 * u).dp)
				.navigationBarsPadding()
				// A tall ticket scrolls inside the sheet instead of running off the screen.
				.heightIn(max = (androidx.compose.ui.platform.LocalConfiguration.current.screenHeightDp * 0.92f).dp)
				.verticalScroll(rememberScrollState()),
			content = content,
		)
	}
}

/** The entry banner every host shows (Home, Simulate, Profile): status-aware copy and a chevron. */
@Composable
internal fun GoLiveBanner(onOpen: () -> Unit) {
	val u = figmaUnit()
	val (kicker, title, body) = when (LiveAccount.status) {
		LiveStatus.LIVE -> Triple("REAL MONEY ON", "Your live account", "${LiveAccount.usd(LiveAccount.cash)} available · ${LiveAccount.holdings.size} ${if (LiveAccount.holdings.size == 1) "holding" else "holdings"}")
		LiveStatus.REVIEW -> Triple("GO LIVE", "Identity under review", "We’re checking your details. This usually takes a moment.")
		LiveStatus.REJECTED -> Triple("GO LIVE", "We couldn’t verify you yet", "Fix your details and resubmit to keep going.")
		LiveStatus.VERIFIED -> Triple("GO LIVE", "You’re verified", if (LiveAccount.bankLinked) "Add funds to turn real money on." else "Link a bank to fund your account.")
		else -> Triple("GO LIVE", "Ready for real money?", "Verify your identity, fund the account and buy for real. Practice stays in Simulate.")
	}
	Row(
		verticalAlignment = Alignment.CenterVertically,
		horizontalArrangement = Arrangement.spacedBy((12 * u).dp),
		modifier = Modifier
			.fillMaxWidth()
			.clip(RoundedCornerShape((16 * u).dp))
			.background(Live.CardBg)
			.clickable(interactionSource = remember { MutableInteractionSource() }, indication = com.stak.demo.ui.theme.PressDim, onClick = onOpen)
			.padding((14 * u).dp),
	) {
		Column(verticalArrangement = Arrangement.spacedBy((4 * u).dp), modifier = Modifier.weight(1f)) {
			LiveKicker(kicker, color = if (LiveAccount.isLive) Live.Green else Live.Teal)
			Text(title, style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (15 * u).sp, lineHeight = (19 * u).sp, lineHeightStyle = FIGMA_LINE_BOX), color = Color.White)
			Text(body, style = TextStyle(fontFamily = Geist, fontSize = (12 * u).sp, lineHeight = (16 * u).sp, lineHeightStyle = FIGMA_LINE_BOX), color = Live.Body)
		}
		Text("›", style = TextStyle(fontFamily = Geist, fontSize = (18 * u).sp), color = Live.Muted)
	}
}

/** The cash-amount chips the funding, withdrawal and order steps share; `custom` = the typed value. */
@Composable
internal fun AmountChips(presets: List<Double>, selected: Double?, onSelect: (Double) -> Unit, customOn: Boolean, onCustom: () -> Unit) {
	val u = figmaUnit()
	Row(horizontalArrangement = Arrangement.spacedBy((8 * u).dp), modifier = Modifier.fillMaxWidth()) {
		presets.forEach { p -> com.stak.demo.ui.profile.SettingsChip(label = "$" + String.format(java.util.Locale.US, "%,.0f", p), selected = !customOn && selected == p) { onSelect(p) } }
		com.stak.demo.ui.profile.SettingsChip(label = "Custom", selected = customOn, onClick = onCustom)
	}
}

/** Runs `block` once, `millis` after the page appears - the demo's "review", "processing" and "fill" delays. */
@Composable
internal fun AfterDelay(key: Any?, millis: Long, block: () -> Unit) {
	androidx.compose.runtime.LaunchedEffect(key) {
		kotlinx.coroutines.delay(millis)
		block()
	}
}

/** The overlay's dismiss target as a BoxScope helper for hosts that stack it. */
@Composable
internal fun BoxScope.LiveOverlay(visible: Boolean, content: @Composable () -> Unit) {
	if (visible) content()
}
