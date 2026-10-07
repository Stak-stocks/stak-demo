package com.stak.demo.ui.profile

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.stak.demo.ui.onboarding.figmaUnit
import com.stak.demo.ui.theme.FIGMA_LINE_BOX
import com.stak.demo.ui.theme.Geist

/** The taste chips' own surface (1:5739): rgba(26,35,51,0.55) with a 0.5 rgba(44,157,188,0.14) hairline. */
private val ChipBg = Color(0x8C1A2333)
private val ChipBorder = Color(0x242C9DBC)
private val ChipInk = Color(0xFF7FD4E8)

/**
 * 08 · Profile — "Profile · Taste & risk" (Chinedu_Mobile 1:5732, 2026-10-07): the YOUR TASTE
 * card (chips, "Your taste graph sharpens with every swipe.", Retake the taste quiz), the RISK
 * STYLE and GOAL cards with their Change links and captions, and the closing note. Retake /
 * Change re-enter the onboarding quiz frames (QuizRetake brings 07 Taste reveal back here).
 * Mirrors ios Profile/TasteRiskView.swift.
 */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun TasteRiskScreen(onBack: () -> Unit, onRetakeQuiz: () -> Unit = {}, onChangeRisk: () -> Unit = {}, onChangeGoal: () -> Unit = {}) {
	val u = figmaUnit()
	ProfilePageScaffold(title = "Taste & risk", onBack = onBack) {
		ProfileContent(scroll = rememberScrollState()) {
			SectionLabel("YOUR TASTE")
			// Taste card (1:5735): 14 inset, 17 between the chips, the line and the row, 4 under the row.
			Column(
				verticalArrangement = Arrangement.spacedBy((17 * u).dp),
				modifier = Modifier
					.fillMaxWidth()
					.clip(RoundedCornerShape((16 * u).dp))
					.background(Prof.CardBg)
					.padding(start = (14 * u).dp, end = (14 * u).dp, top = (14 * u).dp, bottom = (4 * u).dp),
			) {
				FlowRow(horizontalArrangement = Arrangement.spacedBy((8 * u).dp), verticalArrangement = Arrangement.spacedBy((8 * u).dp)) {
					ProfileTaste.chips().forEach { label ->
						Box(
							modifier = Modifier
								.clip(RoundedCornerShape((14 * u).dp))
								.background(ChipBg)
								.border((0.5 * u).dp, ChipBorder, RoundedCornerShape((14 * u).dp))
								.padding(horizontal = (12 * u).dp, vertical = (6 * u).dp),
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
					color = Prof.Body,
				)
				ProfileRow(label = "Retake the taste quiz", horizontalPadding = 0f, onClick = onRetakeQuiz)
			}
			SectionLabel("RISK STYLE")
			ProfileCard { ProfileRow(label = ProfileTaste.riskLabel(), value = "Change", valueColor = Prof.Accent, onClick = onChangeRisk) }
			ProfileCaption(ProfileTaste.riskBlurb())
			SectionLabel("GOAL")
			ProfileCard { ProfileRow(label = ProfileTaste.goalLabel(), value = "Change", valueColor = Prof.Accent, onClick = onChangeGoal) }
			ProfileCaption(ProfileTaste.goalBlurb())
			ProfileCaption("Changing your risk style or goal rebuilds tomorrow’s deck. Your saves and paper portfolio stay as they are.")
		}
	}
}
