package com.stak.demo.ui.simulate

import com.stak.demo.ui.theme.FIGMA_LINE_BOX
import com.stak.demo.ui.theme.fractionalSpacedBy
import androidx.compose.foundation.Image
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
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.stak.demo.R
import com.stak.demo.ui.onboarding.AuthBackCircle
import com.stak.demo.ui.theme.Geist
import com.stak.demo.ui.theme.Sora
import com.stak.demo.ui.theme.StakColors

private data class Rank(
	val rank: String, val initial: String, val name: String,
	val picks: String, val pct: String, val you: Boolean = false,
)

private val TOP = listOf(
	Rank("1", "M", "Maya A.", "9 picks", "+9.4%"),
	Rank("2", "J", "Jide O.", "14 picks", "+8.8%"),
	Rank("3", "T", "Tunde K.", "7 picks", "+8.1%"),
	Rank("4", "Z", "Zara M.", "22 picks", "+7.6%"),
	Rank("5", "K", "Kofi B.", "11 picks", "+7.0%"),
)
private val NEAR = listOf(
	Rank("46", "L", "Lena S.", "8 picks", "+4.3%"),
	Rank("48", "D", "Dami F.", "15 picks", "+4.1%"),
)

/**
 * 07 · Simulate — "Final · Leaderboard · % return" (CHINEDU 1:4124).
 * This-week/All-time chips, RANKED BY RETURN, the highlighted You row
 * (#47, ▲ 12 spots) above the top five and the neighbors around you.
 */
@Composable
fun LeaderboardScreen(onBack: () -> Unit) {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
	Column(modifier = Modifier.fillMaxSize().background(StakColors.Bg)) {
		Row(
			verticalAlignment = Alignment.CenterVertically,
			modifier = Modifier
				.fillMaxWidth()
				.background(StakColors.Bg)
				.statusBarsPadding()
				.padding(horizontal = (18 * u).dp, vertical = (8 * u).dp),
		) {
			AuthBackCircle(onClick = onBack)
			Spacer(modifier = Modifier.weight(1f))
			Text(
				text = "Leaderboard",
				style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (16 * u).sp, lineHeight = (20 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
				color = Color.White,
			)
			Spacer(modifier = Modifier.weight(1f))
			Box(
				contentAlignment = Alignment.Center,
				modifier = Modifier.size((40 * u).dp).background(Sim.CardBg, CircleShape),
			) {
				Image(painterResource(R.drawable.ic_news_share), null, modifier = Modifier.size((18 * u).dp)) // 1:4145 icon/share is 18 (exact-design audit 2026-09-04)
			}
		}
		Column(
			// Fractional gaps: nine 16u gaps rounded per step drifted the last rows 1.8
			// above the frame (StakTest vs the 2x export of 1:4124, 2026-09-05).
			verticalArrangement = fractionalSpacedBy((16 * u).dp),
			modifier = Modifier
				.weight(1f)
				.fillMaxWidth()
				.verticalScroll(rememberScrollState())
				.padding(horizontal = (20 * u).dp)
				.padding(top = (6 * u).dp, bottom = (26 * u).dp), // 1:4146 pb 26 (exact-design audit 2026-09-04)
		) {
			Row(horizontalArrangement = Arrangement.spacedBy((8 * u).dp)) {
				PeriodChip("This week", selected = true)
				PeriodChip("All time", selected = false)
			}
			// 1:4152 season (exact-design audit 2026-09-04): the row is inset 2 on both sides.
			Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth().padding(horizontal = (2 * u).dp)) {
				Text(
					text = "RANKED BY RETURN",
					style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (10 * u).sp, lineHeight = (13 * u).sp, letterSpacing = (0.9 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
					color = Sim.Faint,
				)
				Spacer(modifier = Modifier.weight(1f))
				Text("Trailing 7 days", style = TextStyle(fontFamily = Geist, fontSize = (10 * u).sp, lineHeight = (13 * u).sp, lineHeightStyle = FIGMA_LINE_BOX), color = Sim.Faint)
			}
			// You — highlighted with the ▲ spots delta.
			Row(
				verticalAlignment = Alignment.CenterVertically,
				horizontalArrangement = Arrangement.spacedBy((11 * u).dp),
				modifier = Modifier
					.fillMaxWidth()
					// 1:4155 (exact-design audit 2026-09-04): the You card is r14.
					.clip(RoundedCornerShape((14 * u).dp))
					.background(Sim.TealTint)
					.padding(horizontal = (16 * u).dp, vertical = (14 * u).dp),
			) {
				// Codex audit (2026-09-04): You reads the shared PaperPortfolio
				// week figures and pick count - the same #47 / +1.9% the
				// Simulate hero and board card show.
				Box(modifier = Modifier.width((28 * u).dp)) {
					Text(PaperPortfolio.weekRank?.toString() ?: "—", style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (16 * u).sp, lineHeight = (20 * u).sp, lineHeightStyle = FIGMA_LINE_BOX), color = Sim.Teal)
				}
				Box(contentAlignment = Alignment.Center, modifier = Modifier.size((36 * u).dp).background(Sim.ChipBg, CircleShape)) {
					// The authored "E" is the demo persona's; a new account shows its own initial (product audit, 2026-09-05).
					// A renamed persona reaches the board too (the edit page promises it; review 2026-09-07).
					Text(if (PaperPortfolio.demo && com.stak.demo.ui.UserProfile.displayName.isBlank()) "E" else com.stak.demo.ui.UserProfile.greetingName.take(1).uppercase(), style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (14 * u).sp, lineHeight = (18 * u).sp, lineHeightStyle = FIGMA_LINE_BOX), color = Sim.BadgeInk) // 1:4158 is 14 (exact-design audit 2026-09-04)
				}
				Column(verticalArrangement = Arrangement.spacedBy((2 * u).dp), modifier = Modifier.weight(1f)) {
					Text("You", style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.Medium, fontSize = (12 * u).sp, lineHeight = (15 * u).sp, lineHeightStyle = FIGMA_LINE_BOX), color = Color.White) // 1:4160 Sora Medium (exact-design audit 2026-09-04)
					Text("${PaperPortfolio.pickCountText} this week", style = TextStyle(fontFamily = Geist, fontSize = (10 * u).sp, lineHeight = (13 * u).sp, lineHeightStyle = FIGMA_LINE_BOX), color = Sim.Muted)
				}
				Column(horizontalAlignment = Alignment.End, verticalArrangement = Arrangement.spacedBy((2 * u).dp)) {
					// Authored You row (user, 2026-09-04 (CHINEDU 07 · Simulate 423:1007): the authored look wins).
					// A new account's You row reads its own week - it was the authored +4.2% / 12 spots for everyone (product audit, 2026-09-05).
					Text(if (PaperPortfolio.demo) "+4.2%" else PaperPortfolio.weekPctText, style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (13 * u).sp, lineHeight = (16 * u).sp, lineHeightStyle = FIGMA_LINE_BOX), color = Sim.Teal)
					Text(if (PaperPortfolio.demo) "▲ 12 spots" else "new this week", style = TextStyle(fontFamily = Geist, fontSize = (10 * u).sp, lineHeight = (13 * u).sp, lineHeightStyle = FIGMA_LINE_BOX), color = Sim.Green)
				}
			}
			TOP.forEach { LeaderRow(it) }
			// The authored #46/#48 neighbours cluster around the persona's #47; an unranked
			// first-time user sees the top five only (audit 2026-09-07).
			if (PaperPortfolio.weekRank != null) {
				Text(
					text = "· · ·",
					// 1:4205 (exact-design audit 2026-09-04): Geist Medium 13 - was Regular 12.
					style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (13 * u).sp, lineHeight = (17 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
					color = Sim.Faint,
					modifier = Modifier.align(Alignment.CenterHorizontally),
				)
				NEAR.forEach { LeaderRow(it) }
			}
			Text(
				text = "Percentage return, not dollar size, so everyone competes on the same scale. This week ranks the trailing 7 days.",
				// 1:4124 centres the explainer.
				style = TextStyle(fontFamily = Geist, fontSize = (11 * u).sp, lineHeight = (16 * u).sp, textAlign = androidx.compose.ui.text.style.TextAlign.Center, lineHeightStyle = FIGMA_LINE_BOX),
				color = Sim.Faint,
				modifier = Modifier.fillMaxWidth(),
			)
		}
	}
}

@Composable
private fun PeriodChip(label: String, selected: Boolean) {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
	Box(
		modifier = Modifier
			// 1:4148 (exact-design audit 2026-09-04): r15, fill only - the selected chip carries no hairline.
			.clip(RoundedCornerShape((15 * u).dp))
			.background(if (selected) Sim.TealTint else Sim.CardBg)
			.padding(horizontal = (13 * u).dp, vertical = (7 * u).dp),
	) {
		Text(
			text = label,
			style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (12 * u).sp, lineHeight = (16 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
			color = if (selected) Sim.Teal else Sim.Muted,
		)
	}
}

@Composable
private fun LeaderRow(r: Rank) {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
	Row(
		verticalAlignment = Alignment.CenterVertically,
		horizontalArrangement = Arrangement.spacedBy((11 * u).dp),
		modifier = Modifier
			.fillMaxWidth()
			.clip(RoundedCornerShape((12 * u).dp))
			.background(Sim.CardBg)
			.padding(horizontal = (14 * u).dp, vertical = (11 * u).dp),
	) {
		Box(modifier = Modifier.width((24 * u).dp)) {
			Text(r.rank, style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (12 * u).sp, lineHeight = (15 * u).sp, lineHeightStyle = FIGMA_LINE_BOX), color = Sim.Faint)
		}
		Box(contentAlignment = Alignment.Center, modifier = Modifier.size((32 * u).dp).background(Sim.ChipBg, CircleShape)) {
			Text(r.initial, style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (13 * u).sp, lineHeight = (16 * u).sp, lineHeightStyle = FIGMA_LINE_BOX), color = Sim.BadgeInk)
		}
		Column(verticalArrangement = Arrangement.spacedBy((2 * u).dp), modifier = Modifier.weight(1f)) {
			Text(r.name, style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.Medium, fontSize = (12 * u).sp, lineHeight = (15 * u).sp, lineHeightStyle = FIGMA_LINE_BOX), color = Color.White) // 1:4170 Sora Medium, not Geist (exact-design audit 2026-09-04)
			Text(r.picks, style = TextStyle(fontFamily = Geist, fontSize = (10 * u).sp, lineHeight = (13 * u).sp, lineHeightStyle = FIGMA_LINE_BOX), color = Sim.Faint) // 1:4171 #5c6b85 (exact-design audit 2026-09-04)
		}
		Text(r.pct, style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (12 * u).sp, lineHeight = (15 * u).sp, lineHeightStyle = FIGMA_LINE_BOX), color = Sim.HeaderGray)
	}
}
