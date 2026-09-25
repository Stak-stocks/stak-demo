package com.stak.demo.ui.theme

import androidx.compose.ui.text.style.LineHeightStyle
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

/**
 * Figma's line box: a text block is exactly lines x lineHeight, the extra
 * leading split evenly above and below every line. Compose's default
 * LineHeightStyle (Proportional + Trim.Both) trims the first line's top and
 * the last line's bottom leading, so every multi-line block came out
 * (lineHeight - natural height) shorter than its frame box and long pages
 * crept upward - measured on StakTest vs the 2x export of 1:1495
 * (2026-09-04): gist bullet pitch 48 vs the authored 50, paragraph gap 3
 * short. Every TextStyle literal that pins a lineHeight carries this.
 */
val FIGMA_LINE_BOX = LineHeightStyle(LineHeightStyle.Alignment.Center, LineHeightStyle.Trim.None)

private val StakColorScheme = darkColorScheme(
	primary = StakColors.Accent,
	onPrimary = StakColors.Bg,
	secondary = StakColors.AccentBlue,
	onSecondary = StakColors.TextPrimary,
	background = StakColors.Bg,
	onBackground = StakColors.TextPrimary,
	surface = StakColors.Surface,
	onSurface = StakColors.TextPrimary,
	surfaceVariant = StakColors.SurfaceAlt,
	onSurfaceVariant = StakColors.Muted,
	outline = StakColors.BorderSoft,
	error = androidx.compose.ui.graphics.Color(0xFFFF6B6B),
)


private val StakTypography = Typography(
	// Screen H1 ("Create your account") — Sora SemiBold 28.
	headlineMedium = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = 28.sp),
	// Section titles — Sora SemiBold 20.
	titleLarge = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = 20.sp),
	titleMedium = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = 16.sp),
	// Body / subtitles — Sora Regular 14 (muted by callers).
	bodyLarge = TextStyle(fontFamily = Sora, fontWeight = FontWeight.Normal, fontSize = 15.sp),
	bodyMedium = TextStyle(fontFamily = Sora, fontWeight = FontWeight.Normal, fontSize = 14.sp),
	bodySmall = TextStyle(fontFamily = Sora, fontWeight = FontWeight.Normal, fontSize = 13.sp),
	labelLarge = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = 15.sp),
	labelMedium = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = 13.sp),
	labelSmall = TextStyle(fontFamily = Sora, fontWeight = FontWeight.Normal, fontSize = 11.sp),
)

@Composable
fun StakTheme(content: @Composable () -> Unit) {
	// The STAK app is dark-only by design; ignore the system light theme.
	MaterialTheme(
		colorScheme = StakColorScheme,
		typography = StakTypography,
		content = content,
	)
}
