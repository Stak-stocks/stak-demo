package com.stak.demo.ui.profile

import com.stak.demo.ui.theme.FIGMA_LINE_BOX
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
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.stak.demo.ui.onboarding.AuthBackCircle
import com.stak.demo.ui.theme.Geist
import com.stak.demo.ui.theme.Sora
import com.stak.demo.ui.theme.StakColors
import androidx.compose.foundation.layout.requiredSize

private val CardBg = Color(0xFF10182B)
private val Muted = Color(0xFF819ABB)
private val Body = Color(0xFFC8D2E0)
private val Bright = Color(0xFFF2F6FC)
private val Green = Color(0xFF2FD08A)
private val ChipBg = Color(0xFF1A2333)
private val ChipBorder = Color(0xFF2C9DBC)
private val ChipInk = Color(0xFF7FD4E8)
/** The hub row that opens the share sheet instead of a settings page. */
private const val INVITE = "invite"

/**
 * 05 · Profile — "Profile · hub" (CHINEDU 171:995), reached from the
 * Home nav circle (prototype: Push Right 300ms). Avatar block, the
 * YOUR TASTE chips, the paper stats card, the settings list and the
 * Log out hairline button.
 */
@OptIn(androidx.compose.foundation.layout.ExperimentalLayoutApi::class)
@Composable
fun ProfileScreen(onBack: () -> Unit, onLogOut: () -> Unit = {}, onOpenSetting: (String) -> Unit = {}, onEditProfile: () -> Unit = {}, onGoLive: () -> Unit = {}) {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
	val context = androidx.compose.ui.platform.LocalContext.current
	Column(modifier = Modifier.fillMaxSize().background(StakColors.Bg)) {
		Box(
			modifier = Modifier
				.fillMaxWidth()
				.background(StakColors.Bg)
				.statusBarsPadding()
				.height((56 * u).dp),
		) {
			AuthBackCircle(
				onClick = onBack,
				modifier = Modifier.align(Alignment.CenterStart).padding(start = (20 * u).dp),
			)
			Text(
				text = "Profile",
				style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (16 * u).sp, lineHeight = (20 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
				color = Color.White,
				modifier = Modifier.align(Alignment.Center),
			)
		}
		Column(
			horizontalAlignment = Alignment.CenterHorizontally,
			verticalArrangement = Arrangement.spacedBy((16 * u).dp),
			modifier = Modifier
				.weight(1f)
				.fillMaxWidth()
				.verticalScroll(rememberScrollState())
				.padding(horizontal = (20 * u).dp)
				.padding(top = (16 * u).dp, bottom = (40 * u).dp),
		) {
			// The whole block - avatar, name, joined line - is ONE target that opens the
			// edit page: 09 Profile setup's own promise, "You can change this anytime in
			// Profile." (user, 2026-09-07: a photo of their choice, editable after sign-up).
			Column(
				horizontalAlignment = Alignment.CenterHorizontally,
				verticalArrangement = Arrangement.spacedBy((8 * u).dp),
				modifier = Modifier
					.clip(RoundedCornerShape((12 * u).dp))
					.clickable(
						interactionSource = remember { MutableInteractionSource() },
						indication = com.stak.demo.ui.theme.PressDim,
						onClickLabel = "Edit profile",
						onClick = onEditProfile,
					)
					.padding(horizontal = (12 * u).dp),
			) {
				Box(
					contentAlignment = Alignment.Center,
					modifier = Modifier.size((64 * u).dp).background(Color(0xFF242B3D), CircleShape).clip(CircleShape),
				) {
					// The picked photo when one exists; else the live initial of
					// the display name ("H" was hardcoded - audit 2026-08-25).
					val photo = com.stak.demo.ui.UserProfile.photoUri
					if (photo != null) {
						coil.compose.AsyncImage(
							model = photo,
							contentDescription = null,
							contentScale = androidx.compose.ui.layout.ContentScale.Crop,
							modifier = Modifier.matchParentSize().clip(CircleShape),
						)
					} else {
						Text(
							text = com.stak.demo.ui.UserProfile.greetingName.take(1).uppercase(),
							style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (22 * u).sp, lineHeight = (28 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
							color = Color(0xFF9EADC7),
						)
					}
				}
				Text(
					text = com.stak.demo.ui.UserProfile.greetingName,
					style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (20 * u).sp, lineHeight = (25 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
					color = Color.White,
				)
				Text(
					// A live account reads "Live investor" (FigJam Go live boards, 2026-09-14).
					text = "${if (com.stak.demo.ui.live.LiveAccount.isLive) "Live investor" else "Paper investor"} · joined ${com.stak.demo.ui.UserProfile.joined}",
					style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (12 * u).sp, lineHeight = (16 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
					color = Muted,
				)
			}
			// YOUR TASTE card.
			Column(
				verticalArrangement = Arrangement.spacedBy((10 * u).dp),
				modifier = Modifier
					.fillMaxWidth()
					.clip(RoundedCornerShape((16 * u).dp))
					.background(CardBg)
					.padding((14 * u).dp),
			) {
				Text(
					text = "YOUR TASTE",
					style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (11 * u).sp, lineHeight = (14 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
					color = Muted,
				)
				// A new account's chips hug their labels and may not fit one row - they wrap.
				androidx.compose.foundation.layout.FlowRow(horizontalArrangement = Arrangement.spacedBy((8 * u).dp), verticalArrangement = Arrangement.spacedBy((8 * u).dp)) {
				// Authored chip widths (171:1004): 97 / 94 / 125 — pinned so the
				// row fills the 332 content width and the labels never wrap.
				// The demo account keeps the authored chips at their pinned widths; a
				// new account's chips come from its onboarding answers and hug their
				// labels (product audit, 2026-09-05).
				val profile = com.stak.demo.ui.UserProfile
				val chips: List<Pair<String, Int?>> = if (com.stak.demo.ui.Session.demoAccount) {
					listOf("Tech Curious" to 97, "High Growth" to 94, "Consumer Brands" to 125)
				} else {
					com.stak.demo.ui.onboarding.TasteModel.chips(profile.brandPicks, profile.goal, profile.risk).map { it to null }
				}
				chips.forEach { (label, w) ->
					Box(
						contentAlignment = Alignment.Center,
						modifier = Modifier
							.then(if (w != null) Modifier.requiredSize((w * u).dp, (28 * u).dp) else Modifier.height((28 * u).dp))
							.clip(RoundedCornerShape((14 * u).dp))
							.background(ChipBg)
							.border((1 * u).dp, ChipBorder, RoundedCornerShape((14 * u).dp))
							.padding(horizontal = if (w == null) (12 * u).dp else 0.dp),
					) {
						Text(
							text = label,
							style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (12 * u).sp, lineHeight = (16 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
							color = ChipInk,
							maxLines = 1,
							softWrap = false,
						)
					}
				}
			}
			Text(
					text = "Your taste graph sharpens with every swipe.",
					style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (12 * u).sp, lineHeight = (16 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
					color = Body,
				)
			}
			// Paper stats card.
			Column(
				verticalArrangement = Arrangement.spacedBy((10 * u).dp),
				modifier = Modifier
					.fillMaxWidth()
					.clip(RoundedCornerShape((16 * u).dp))
					.background(CardBg)
					.padding((14 * u).dp),
			) {
				Row(modifier = Modifier.fillMaxWidth().height((40 * u).dp).padding(horizontal = 0.dp)) {
					// Live from the shared paper portfolio (product audit, 2026-09-05).
					val pp = com.stak.demo.ui.simulate.PaperPortfolio
					ProfileStat(pp.wholeUsd(pp.portfolioValue), "Portfolio")
					Spacer(modifier = Modifier.weight(1f))
					ProfileStat(pp.usd(pp.cash), "Cash")
					Spacer(modifier = Modifier.weight(1f))
					ProfileStat(pp.pickCountLabel.toString(), "Picks")
				}
				val gain = com.stak.demo.ui.simulate.PaperPortfolio.allTimeGain
				Text(
					text = "${if (gain >= 0) "▲" else "▼"} ${com.stak.demo.ui.simulate.PaperPortfolio.signedUsd(gain)} all time on $10,000 paper",
					style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (12 * u).sp, lineHeight = (16 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
					color = if (gain >= 0) Green else Color(0xFFE5484D),
				)
			}
			// Go live (FigJam Go live boards, 2026-09-14): the real-money account's entry, status-aware.
			com.stak.demo.ui.live.GoLiveBanner(onOpen = onGoLive)
			// Settings card.
			Column(
				modifier = Modifier
					.fillMaxWidth()
					.clip(RoundedCornerShape((16 * u).dp))
					.background(CardBg)
					.padding(vertical = (4 * u).dp),
			) {
				// App settings and Invite a friend join the authored four (FigJam Profile board, 2026-09-14).
				listOf("Notifications" to SettingsKind.NOTIFICATIONS, "Appearance" to SettingsKind.APPEARANCE, "Linked accounts" to SettingsKind.LINKED, "App settings" to SettingsKind.APP, "Help & support" to SettingsKind.HELP, "Invite a friend" to INVITE).forEach { (label, kind) ->
					Row(
						verticalAlignment = Alignment.CenterVertically,
						modifier = Modifier
							.fillMaxWidth()
							.height((48 * u).dp)
							.clickable(
								interactionSource = remember { MutableInteractionSource() },
								indication = com.stak.demo.ui.theme.PressDim,
							) {
								if (kind == INVITE) {
									// The system share sheet with the invite line (FigJam: Your profile -> Invite a friend).
									val send = android.content.Intent(android.content.Intent.ACTION_SEND).setType("text/plain")
										.putExtra(android.content.Intent.EXTRA_TEXT, "Join me on STAK \u2014 swipe stocks you actually understand and practise with paper money. https://stak.app")
									runCatching { context.startActivity(android.content.Intent.createChooser(send, "Invite a friend")) }
								} else {
									onOpenSetting(kind)
								}
							}
							.padding(horizontal = (14 * u).dp),
					) {
						Text(
							text = label,
							style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (13 * u).sp, lineHeight = (17 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
							color = Color.White,
						)
						Spacer(modifier = Modifier.weight(1f))
						// Chevron line height 18 as authored (171:1027 - exact-design audit 2026-09-04).
						Text(
							text = "›",
							style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (14 * u).sp, lineHeight = (18 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
							color = Muted,
						)
					}
				}
			}
			Box(
				contentAlignment = Alignment.Center,
				modifier = Modifier
					.fillMaxWidth()
					.height((52 * u).dp)
					// 171:1037 authors the auth CTAs' teal drop-shadow stack, but the button
					// has NO fill and Figma casts shadows from the rendered alpha - the 0.36
					// hairline at 33% renders nothing: the 2x export's rows under the button
					// are pure #0A1020, while the old rect glow read (24,45,62) fading over
					// 35u (StakTest, 2026-09-05). No glow.
					.border((0.36 * u).dp, Color(0x54343B4F), RoundedCornerShape((6 * u).dp))
					.clickable(
						interactionSource = remember { MutableInteractionSource() },
						indication = com.stak.demo.ui.theme.PressDim,
					) { onLogOut() },
			) {
				Text(
					text = "Log out",
					style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.Normal, fontSize = (14 * u).sp, lineHeight = (18 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
					color = Muted,
				)
			}
		}
	}
}

@Composable
private fun ProfileStat(value: String, label: String) {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
	Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy((4 * u).dp)) {
		Text(
			text = value,
			style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (16 * u).sp, lineHeight = (20 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
			color = Bright,
		)
		Text(
			text = label,
			style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (11 * u).sp, lineHeight = (14 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
			color = Muted,
		)
	}
}
