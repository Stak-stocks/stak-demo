package com.stak.demo.ui.profile

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
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
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.stak.demo.ui.onboarding.AuthBackCircle
import com.stak.demo.ui.onboarding.figmaUnit
import com.stak.demo.ui.theme.FIGMA_LINE_BOX
import com.stak.demo.ui.theme.Geist
import com.stak.demo.ui.theme.Sora
import com.stak.demo.ui.theme.StakColors

/**
 * The 08 · Profile / 10 · Notifications page language (Chinedu_Mobile, 2026-10-07):
 * a fixed 100-tall top nav (44 status + 56 bar), #10182B r16 cards of 48-tall rows,
 * Geist Medium 11 section labels, Geist 12 captions. Mirrors ios Profile/ProfileKit.swift.
 */
internal object Prof {
	val CardBg = Color(0xFF10182B)
	val Muted = Color(0xFF819ABB)
	val Body = Color(0xFFC8D2E0)
	/** The section's accent: the Edit link, "Change ›", the avatar ring, the unread dot (1:5731 / 1:5753 / 1:5668 / 1:5936). */
	val Accent = Color(0xFF66B7DA)
	val Red = Color(0xFFE5484D)
	val AvatarBg = Color(0xFF242B3D)
	val AvatarInk = Color(0xFF9EADC7)
	val InputBg = Color(0xFF181F30)
	/** Log out / secondary hairline: rgba(52,59,79,0.33) at 0.361. */
	val Hairline = Color(0x54343B4F)
}

/**
 * The fixed top nav: back circle at x20 y8, the title at x168 (the Profile frames author the
 * title's LEFT edge there - "Profile" happens to centre, "Taste & risk" / "Edit profile" sit
 * 20 right of centre; `centred` is the Notifications frames' true-centred title), an optional
 * trailing link 20 from the right edge. The content below starts at the nav's bottom.
 */
@Composable
internal fun ProfilePageScaffold(
	title: String,
	onBack: () -> Unit,
	centred: Boolean = false,
	trailing: (@Composable BoxScope.() -> Unit)? = null,
	content: @Composable ColumnScope.() -> Unit,
) {
	val u = figmaUnit()
	Column(modifier = Modifier.fillMaxSize().background(StakColors.Bg)) {
		Box(modifier = Modifier.fillMaxWidth().statusBarsPadding().height((56 * u).dp)) {
			AuthBackCircle(onClick = onBack, modifier = Modifier.align(Alignment.CenterStart).padding(start = (20 * u).dp))
			Text(
				text = title,
				style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (16 * u).sp, lineHeight = (20 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
				color = Color.White,
				modifier = if (centred) Modifier.align(Alignment.Center) else Modifier.align(Alignment.CenterStart).padding(start = (168 * u).dp),
			)
			if (trailing != null) {
				Box(modifier = Modifier.align(Alignment.CenterEnd).padding(end = (20 * u).dp)) { trailing() }
			}
		}
		content()
	}
}

/** "YOUR STAK" / "ACCOUNT" / "SECURITY": Geist Medium 11 on a 14 box, full width. */
@Composable
internal fun SectionLabel(text: String) {
	val u = figmaUnit()
	Text(
		text = text,
		style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (11 * u).sp, lineHeight = (14 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
		color = Prof.Muted,
		modifier = Modifier.fillMaxWidth(),
	)
}

/** Geist 12 on a 16 box, muted - the captions under the Taste & risk cards and the Edit page's footnote. */
@Composable
internal fun ProfileCaption(text: String, color: Color = Prof.Muted) {
	val u = figmaUnit()
	Text(
		text = text,
		style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (12 * u).sp, lineHeight = (16 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
		color = color,
		modifier = Modifier.fillMaxWidth(),
	)
}

/** The #10182B r16 card with its 4 vertical inset ("Settings card"). */
@Composable
internal fun ProfileCard(content: @Composable ColumnScope.() -> Unit) {
	val u = figmaUnit()
	Column(
		modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape((16 * u).dp)).background(Prof.CardBg).padding(vertical = (4 * u).dp),
		content = content,
	)
}

/**
 * One 48-tall card row: an optional 20 icon + 10 gap, the Geist Medium 13 label, then either a
 * Geist 14 value that carries its own "  ›" (YOUR STAK rows, 1:5675) or the bare "›" chevron
 * (ACCOUNT rows, 1:5689). `valueColor` is the accent for the Taste & risk page's "Change  ›".
 */
@Composable
internal fun ProfileRow(label: String, value: String? = null, icon: Int? = null, valueColor: Color = Prof.Muted, horizontalPadding: Float = 14f, onClick: () -> Unit) {
	val u = figmaUnit()
	Row(
		verticalAlignment = Alignment.CenterVertically,
		modifier = Modifier
			.fillMaxWidth()
			.height((48 * u).dp)
			.clickable(interactionSource = remember { MutableInteractionSource() }, indication = com.stak.demo.ui.theme.PressDim, onClick = onClick)
			.padding(horizontal = (horizontalPadding * u).dp),
	) {
		if (icon != null) {
			Image(painter = painterResource(icon), contentDescription = null, modifier = Modifier.size((20 * u).dp))
			Spacer(modifier = Modifier.size((10 * u).dp))
		}
		Text(
			text = label,
			style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (13 * u).sp, lineHeight = (17 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
			color = Color.White,
		)
		Spacer(modifier = Modifier.weight(1f))
		Text(
			text = if (value != null) "$value  ›" else "›",
			style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (14 * u).sp, lineHeight = (18 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
			color = if (value != null) valueColor else Prof.Muted,
			maxLines = 1,
			softWrap = false,
		)
	}
}

/** The page column under the nav: 16 below it, 20 side gutters, 16 between items, 40 at the bottom. */
@Composable
internal fun ProfileContent(scroll: androidx.compose.foundation.ScrollState, horizontalAlignment: Alignment.Horizontal = Alignment.Start, content: @Composable ColumnScope.() -> Unit) {
	val u = figmaUnit()
	Column(
		horizontalAlignment = horizontalAlignment,
		verticalArrangement = Arrangement.spacedBy((16 * u).dp),
		modifier = Modifier
			.fillMaxSize()
			.verticalScroll(scroll)
			.padding(horizontal = (20 * u).dp)
			.padding(top = (16 * u).dp, bottom = (40 * u).dp),
		content = content,
	)
}
