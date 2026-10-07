package com.stak.demo.ui.profile

import android.content.Intent
import android.net.Uri
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.stak.demo.R
import com.stak.demo.ui.Session
import com.stak.demo.ui.UserProfile
import com.stak.demo.ui.onboarding.figmaUnit
import com.stak.demo.ui.simulate.PaperPortfolio
import com.stak.demo.ui.theme.FIGMA_LINE_BOX
import com.stak.demo.ui.theme.Geist
import com.stak.demo.ui.theme.Sora

/**
 * 08 · Profile — "Profile · hub" (Chinedu_Mobile 1:5665, 2026-10-07; replaces the
 * CHINEDU 171:995 hub). Fixed top bar (back circle, "Profile", the Edit link), the 72
 * avatar with its teal ring and the name, YOUR STAK (Taste & risk profile / Paper
 * portfolio / Leaderboard rank), ACCOUNT (Notifications / Contact support / Terms of
 * service / Privacy policy), the Log out hairline and the red Delete account line.
 * Mirrors ios Profile/ProfileView.swift.
 */
@Composable
fun ProfileScreen(
	onBack: () -> Unit,
	onLogOut: () -> Unit = {},
	/** ACCOUNT rows: Notifications -> SettingsKind.NOTIFICATIONS, Contact support -> SettingsKind.HELP. */
	onOpenSetting: (String) -> Unit = {},
	onEditProfile: () -> Unit = {},
	onOpenTasteRisk: () -> Unit = {},
	onOpenPortfolio: () -> Unit = {},
	onOpenLeaderboard: () -> Unit = {},
	/** Delete account confirmed: the session is gone (Session.deleteAccount ran). */
	onAccountDeleted: () -> Unit = {},
) {
	val u = figmaUnit()
	val context = LocalContext.current
	var confirmDelete by rememberSaveable { mutableStateOf(false) }
	ProfilePageScaffold(
		title = "Profile",
		onBack = onBack,
		trailing = {
			Text(
				text = "Edit",
				style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (13 * u).sp, lineHeight = (17 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
				color = Prof.Accent,
				modifier = Modifier.clickable(interactionSource = remember { MutableInteractionSource() }, indication = com.stak.demo.ui.theme.PressDim, onClick = onEditProfile),
			)
		},
	) {
		ProfileContent(scroll = rememberScrollState(), horizontalAlignment = Alignment.CenterHorizontally) {
			// Avatar block (1:5667): the 72 circle with its 2 teal ring, 16 under it the name.
			Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy((16 * u).dp)) {
				Box(
					contentAlignment = Alignment.Center,
					modifier = Modifier
						.size((72 * u).dp)
						.background(Prof.AvatarBg, CircleShape)
						.border((2 * u).dp, Prof.Accent, CircleShape)
						.clip(CircleShape),
				) {
					val photo = UserProfile.photoUri
					if (photo != null) {
						coil.compose.AsyncImage(
							model = photo,
							contentDescription = null,
							contentScale = androidx.compose.ui.layout.ContentScale.Crop,
							modifier = Modifier.matchParentSize().clip(CircleShape),
						)
					} else {
						Text(
							text = UserProfile.greetingName.take(1).uppercase(),
							style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (24.75 * u).sp, lineHeight = (31 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
							color = Prof.AvatarInk,
						)
					}
				}
				Text(
					text = UserProfile.greetingName,
					style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (20 * u).sp, lineHeight = (25 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
					color = Color.White,
				)
			}
			SectionLabel("YOUR STAK")
			ProfileCard {
				ProfileRow(label = "Taste & risk profile", value = ProfileTaste.summary(), onClick = onOpenTasteRisk)
				// Live from the shared paper portfolio (product audit, 2026-09-05).
				ProfileRow(label = "Paper portfolio", value = PaperPortfolio.wholeUsd(PaperPortfolio.portfolioValue), onClick = onOpenPortfolio)
				ProfileRow(label = "Leaderboard rank", value = PaperPortfolio.weekRank?.let { "#$it this week" } ?: "Unranked", onClick = onOpenLeaderboard)
			}
			SectionLabel("ACCOUNT")
			ProfileCard {
				ProfileRow(label = "Notifications", icon = R.drawable.ic_prof_bell) { onOpenSetting(SettingsKind.NOTIFICATIONS) }
				ProfileRow(label = "Contact support", icon = R.drawable.ic_prof_support) { onOpenSetting(SettingsKind.HELP) }
				ProfileRow(label = "Terms of service", icon = R.drawable.ic_prof_terms) { runCatching { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(TERMS_URL))) } }
				ProfileRow(label = "Privacy policy", icon = R.drawable.ic_prof_privacy) { runCatching { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(PRIVACY_URL))) } }
			}
			// Log out (1:5708): the hairline button. Its authored teal drop-shadow stack casts from a
			// fill-less shape, so Figma renders nothing under it - no glow (verified 2026-09-05).
			Box(
				contentAlignment = Alignment.Center,
				modifier = Modifier
					.fillMaxWidth()
					.height((52 * u).dp)
					.border((0.36 * u).dp, Prof.Hairline, RoundedCornerShape((6 * u).dp))
					.clickable(interactionSource = remember { MutableInteractionSource() }, indication = com.stak.demo.ui.theme.PressDim) { onLogOut() },
			) {
				Text(
					text = "Log out",
					style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.Normal, fontSize = (14 * u).sp, lineHeight = (18 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
					color = Prof.Muted,
				)
			}
			// Delete account (1:5710): Geist Medium 13 red at 85%; a tap unfolds the confirmation the
			// FigJam App settings page carried (2026-09-14) - the wipe itself is unchanged.
			Text(
				text = "Delete account",
				style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (13 * u).sp, lineHeight = (17 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
				color = Prof.Red,
				textAlign = TextAlign.Center,
				modifier = Modifier
					.fillMaxWidth()
					.alpha(0.85f)
					.clickable(interactionSource = remember { MutableInteractionSource() }, indication = com.stak.demo.ui.theme.PressDim) { confirmDelete = !confirmDelete },
			)
			AnimatedVisibility(visible = confirmDelete) {
				Column(
					verticalArrangement = Arrangement.spacedBy((10 * u).dp),
					modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape((16 * u).dp)).background(Prof.CardBg).padding((14 * u).dp),
				) {
					Text(
						text = "This removes your saves, paper portfolio and settings from this phone and signs you out. It can’t be undone.",
						style = TextStyle(fontFamily = Geist, fontSize = (12 * u).sp, lineHeight = (17 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
						color = Prof.Body,
					)
					Box(
						contentAlignment = Alignment.Center,
						modifier = Modifier
							.fillMaxWidth()
							.height((44 * u).dp)
							.clip(RoundedCornerShape((6 * u).dp))
							.background(Color(0x33E5484D))
							.clickable(interactionSource = remember { MutableInteractionSource() }, indication = com.stak.demo.ui.theme.PressDim) {
								Session.deleteAccount()
								onAccountDeleted()
							},
					) {
						Text("Delete my account", style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (13 * u).sp), color = Prof.Red)
					}
				}
			}
		}
	}
}
