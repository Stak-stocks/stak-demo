package com.stak.demo.ui.inbox

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.stak.demo.ui.StakNotifications
import com.stak.demo.ui.profile.Prof
import com.stak.demo.ui.profile.ProfileContent
import com.stak.demo.ui.profile.ProfilePageScaffold
import com.stak.demo.ui.profile.SectionLabel
import com.stak.demo.ui.theme.FIGMA_LINE_BOX
import com.stak.demo.ui.theme.Geist
import com.stak.demo.ui.theme.Sora

/** The row's second line (1:5935 renders #ACAFB1 - the auth subtitle grey, not the section's muted blue). */
private val RowBody = Color(0xFFACAFB1)

/**
 * 10 · Notifications tab — "Notifications · List" (Chinedu_Mobile 1:5927) and "Notifications ·
 * Empty" (1:5977), 2026-10-07 (replaces the frameless 2026-09-05 inbox). TODAY and EARLIER cards
 * of 68-tall rows (title, one-line body, the teal unread dot); opening the page reads everything,
 * so the Home bell's dot clears the way an activity feed does. A row opens where its information
 * comes from (user, 2026-10-07). Mirrors ios NotificationsView.swift.
 */
@Composable
fun NotificationsScreen(onBack: () -> Unit, onOpen: (StakNotifications.Item) -> Unit = {}) {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
	val items = StakNotifications.items
	// Captured once: markAllRead rewrites readIds, and the rows opened unread keep their dot for this visit.
	val readBefore = remember { StakNotifications.readIds }
	LaunchedEffect(Unit) { StakNotifications.markAllRead() }
	ProfilePageScaffold(title = "Notifications", onBack = onBack, centred = true) {
		if (items.isEmpty()) {
			// 1:5977: "Nothing yet" sits 330 from the frame top (230 under the 100 nav), the 248-wide line 16 below it.
			Column(
				horizontalAlignment = Alignment.CenterHorizontally,
				verticalArrangement = Arrangement.spacedBy((16 * u).dp),
				modifier = Modifier.fillMaxSize().padding(top = (230 * u).dp),
			) {
				Text(
					text = "Nothing yet",
					style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (20 * u).sp, lineHeight = (25 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
					color = Color.White,
					textAlign = TextAlign.Center,
				)
				Text(
					text = "Price moves on your picks, your daily brief, and filled practice orders will show up here.",
					style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (12 * u).sp, lineHeight = (16 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
					color = Prof.Muted,
					textAlign = TextAlign.Center,
					modifier = Modifier.width((248 * u).dp),
				)
			}
		} else {
			val today = items.filter { it.today }
			val earlier = items.filter { !it.today }
			ProfileContent(scroll = rememberScrollState()) {
				if (today.isNotEmpty()) {
					SectionLabel("TODAY")
					NotificationCard(today, readBefore, inset = 11f, onOpen = onOpen)
				}
				if (earlier.isNotEmpty()) {
					SectionLabel("EARLIER")
					NotificationCard(earlier, readBefore, inset = 9.5f, onOpen = onOpen)
				}
			}
		}
	}
}

/** A #10182B r16 card: 8 side inset, `inset` above and below (11 on TODAY, 9.5 on EARLIER as authored), 10 between rows. */
@Composable
private fun NotificationCard(items: List<StakNotifications.Item>, readBefore: Set<String>, inset: Float, onOpen: (StakNotifications.Item) -> Unit) {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
	Column(
		verticalArrangement = Arrangement.spacedBy((10 * u).dp),
		modifier = Modifier
			.fillMaxWidth()
			.clip(RoundedCornerShape((16 * u).dp))
			.background(Prof.CardBg)
			.padding(horizontal = (8 * u).dp, vertical = (inset * u).dp),
	) {
		items.forEach { item -> NotificationRow(item = item, unread = item.id !in readBefore, onOpen = { onOpen(item) }) }
	}
}

/** One 68-tall #181F30 row (the 08 Permissions card surface): copy at 16/16, the 8 teal dot 16 from the right edge. */
@Composable
private fun NotificationRow(item: StakNotifications.Item, unread: Boolean, onOpen: () -> Unit) {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
	Box(
		modifier = Modifier
			.fillMaxWidth()
			.height((68 * u).dp)
			.clip(RoundedCornerShape((14 * u).dp))
			.background(Prof.InputBg)
			// User (2026-10-07): the row opens where its information comes from.
			.clickable(interactionSource = remember { MutableInteractionSource() }, indication = com.stak.demo.ui.theme.PressDim, onClick = onOpen),
	) {
		Column(
			verticalArrangement = Arrangement.spacedBy((4 * u).dp),
			modifier = Modifier.padding(start = (16 * u).dp, top = (16 * u).dp, end = (36 * u).dp),
		) {
			Text(
				text = item.title,
				style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (14 * u).sp, lineHeight = (18 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
				color = Color.White,
				maxLines = 1,
				overflow = TextOverflow.Ellipsis,
			)
			Text(
				text = item.body,
				style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (12 * u).sp, lineHeight = (14 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
				color = RowBody,
				maxLines = 1,
				overflow = TextOverflow.Ellipsis,
			)
		}
		if (unread) Box(modifier = Modifier.align(Alignment.CenterEnd).padding(end = (16 * u).dp).size((8 * u).dp).background(Prof.Accent, CircleShape))
	}
}
