package com.stak.demo.ui.inbox

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
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
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.stak.demo.ui.StakNotifications
import com.stak.demo.ui.profile.SettingsLinkRow
import com.stak.demo.ui.profile.SettingsScaffold
import com.stak.demo.ui.theme.FIGMA_LINE_BOX
import com.stak.demo.ui.theme.Geist
import com.stak.demo.ui.theme.Sora

private val CardBg = Color(0xFF10182B)
private val Muted = Color(0xFF819ABB)
private val Body = Color(0xFFC8D2E0)
private val Divider = Color(0xFF1A2333)
private val IconBg = Color(0xFF1A2333)
private val Teal = Color(0xFF69B3CA)
private val Dot = Color(0xFFFF8030)

/**
 * The inbox behind the Home bell (product audit, 2026-09-05). Built in
 * the Profile hub's language - the same header, card and row metrics -
 * because no frame exists for it. Opening it reads everything, so the
 * bell's dot clears the way an activity feed does. Mirrors ios
 * NotificationsView.swift.
 */
@Composable
fun NotificationsScreen(onBack: () -> Unit, onOpenSettings: () -> Unit) {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
	val items = StakNotifications.items
	// Captured once: markAllRead below rewrites readIds, and the rows opened unread keep their dot for this visit.
	val readBefore = remember { StakNotifications.readIds }
	LaunchedEffect(Unit) { StakNotifications.markAllRead() }
	SettingsScaffold(title = "Notifications", onBack = onBack) {
		Column(
			verticalArrangement = Arrangement.spacedBy((14 * u).dp),
			modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontal = (20 * u).dp).padding(bottom = (26 * u).dp),
		) {
			if (items.isEmpty()) {
				Column(
					verticalArrangement = Arrangement.spacedBy((6 * u).dp),
					modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape((16 * u).dp)).background(CardBg).padding((16 * u).dp),
				) {
					Text("You’re all caught up.", style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (15 * u).sp), color = Color.White)
					Text("Price moves on your picks and your daily deck land here.", style = TextStyle(fontFamily = Geist, fontSize = (13 * u).sp, lineHeight = (19 * u).sp, lineHeightStyle = FIGMA_LINE_BOX), color = Muted)
				}
			} else {
				Column(modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape((16 * u).dp)).background(CardBg)) {
					items.forEachIndexed { i, item ->
						NotificationRow(item = item, unread = item.id !in readBefore)
						if (i < items.lastIndex) Box(modifier = Modifier.fillMaxWidth().padding(horizontal = (14 * u).dp).size(width = 0.dp, height = (1 * u).dp).background(Divider))
					}
				}
			}
			Column(modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape((16 * u).dp)).background(CardBg).padding(vertical = (4 * u).dp)) {
				SettingsLinkRow(label = "Notification settings", onClick = onOpenSettings)
			}
		}
	}
}

@Composable
private fun NotificationRow(item: StakNotifications.Item, unread: Boolean) {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
	Row(
		verticalAlignment = Alignment.CenterVertically,
		horizontalArrangement = Arrangement.spacedBy((12 * u).dp),
		modifier = Modifier.fillMaxWidth().padding(horizontal = (14 * u).dp, vertical = (12 * u).dp),
	) {
		Box(contentAlignment = Alignment.Center, modifier = Modifier.size((36 * u).dp).background(IconBg, CircleShape)) {
			Text(item.title.take(1).uppercase(), style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (14 * u).sp), color = Teal)
		}
		Column(verticalArrangement = Arrangement.spacedBy((2 * u).dp), modifier = Modifier.weight(1f)) {
			Text(item.title, style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (14 * u).sp, lineHeight = (18 * u).sp, lineHeightStyle = FIGMA_LINE_BOX), color = Color.White)
			Text(item.body, style = TextStyle(fontFamily = Geist, fontSize = (12 * u).sp, lineHeight = (16 * u).sp, lineHeightStyle = FIGMA_LINE_BOX), color = Body)
			Text(item.time, style = TextStyle(fontFamily = Geist, fontSize = (11 * u).sp), color = Muted)
		}
		if (unread) Box(modifier = Modifier.size((6 * u).dp).background(Dot, CircleShape)) else Spacer(modifier = Modifier.size((6 * u).dp))
	}
}
