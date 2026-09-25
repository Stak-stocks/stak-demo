package com.stak.demo.ui.onboarding

import com.stak.demo.ui.theme.FIGMA_LINE_BOX
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.stak.demo.R
import com.stak.demo.ui.theme.Geist
import com.stak.demo.ui.theme.Sora
import com.stak.demo.ui.theme.StakColors

private data class Brand(val name: String, val iconRes: Int)

/** The 12 brand tiles of Figma "Onboarding · 02 Brand picks" (1554:8541), in grid order. */
/** The five tiles selected on the authored frame, by brand name. */

private val BRANDS = listOf(
	Brand("Apple", R.drawable.brand_apple),
	Brand("Tesla", R.drawable.brand_tesla),
	Brand("Nike", R.drawable.brand_nike),
	Brand("Spotify", R.drawable.brand_spotify),
	Brand("Netflix", R.drawable.brand_netflix),
	Brand("Amazon", R.drawable.brand_amazon),
	Brand("Disney", R.drawable.brand_disney),
	Brand("Microsoft", R.drawable.brand_microsoft),
	Brand("NVIDIA", R.drawable.brand_nvidia),
	Brand("PlayStation", R.drawable.brand_playstation),
	Brand("Coinbase", R.drawable.brand_coinbase),
	Brand("Uber", R.drawable.brand_uber),
)

/**
 * Onboarding · 02 Brand picks — Figma node 1554:8541 ("STEP 2 OF 6").
 *
 * A 3-wide grid of #181f30 tiles, each a white 34dp circle with the real
 * brand mark (flattened Figma exports) and a Geist 11 label. Selected
 * tiles carry a 1.5dp rgba(105,179,202,0.5) border and a white label.
 * The gradient CTA counts the picks ("Continue · N picked"), with the
 * hairline "Back" button and "You can change this later" underneath.
 */
@Composable
fun BrandPicksScreen(onBack: () -> Unit, onContinue: () -> Unit) {
	val u = figmaUnit()
	// The frame (1554:8541) arrives with five brands already picked and the
	// CTA reading "Continue · 5 picked"; the build starts in that state
	// (Codex parity audit 2026-09-04). Every tile stays toggleable.
	// Product audit (2026-09-05): a real first run starts with nothing picked
	// (the frame's five were authored demo state).
	var picked by rememberSaveable { mutableStateOf(setOf<String>()) }

	Artboard(modifier = Modifier.background(StakColors.Bg)) {
		// Nav row — back circle + step label.
		Row(
			verticalAlignment = Alignment.CenterVertically,
			modifier = Modifier.fillMaxWidth().padding(horizontal = (20 * u).dp).padding(top = (10 * u).dp, bottom = (4 * u).dp),
		) {
			AuthBackCircle(onClick = onBack)
			androidx.compose.foundation.layout.Spacer(modifier = Modifier.weight(1f))
			Text(
				text = "STEP 2 OF 6",
				style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (10 * u).sp, letterSpacing = (0.9 * u).sp),
				color = Auth.FaintText,
			)
		}

		Column(
			verticalArrangement = Arrangement.spacedBy((18 * u).dp),
			modifier = Modifier
				.weight(1f)
				.fillMaxWidth()
				.verticalScroll(rememberScrollState())
				.padding(horizontal = (24 * u).dp)
				.padding(top = (14 * u).dp),
		) {
			Column(verticalArrangement = Arrangement.spacedBy((12 * u).dp)) {
				Text(
					text = "Which brands do you know or use?",
					style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (24 * u).sp, lineHeight = (31 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
					color = StakColors.TextPrimary,
				)
				Text(
					text = "Pick a few. STAK uses this to learn what feels familiar to you.",
					// Authored box (1:255): 303 wide -> the designed two-line wrap.
					style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (12 * u).sp, lineHeight = (16 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
					color = Auth.SubtitleGray,
					modifier = Modifier.width((303 * u).dp),
				)
			}

			// 3-wide tile grid, 10dp gaps.
			Column(
				verticalArrangement = Arrangement.spacedBy((10 * u).dp),
				modifier = Modifier.fillMaxWidth().padding(top = (6 * u).dp),
			) {
				BRANDS.chunked(3).forEach { row ->
					Row(horizontalArrangement = Arrangement.spacedBy((10 * u).dp), modifier = Modifier.fillMaxWidth()) {
						row.forEach { brand ->
							val selected = brand.name in picked
							BrandTile(
								brand = brand,
								selected = selected,
								onClick = {
									picked = if (selected) picked - brand.name else picked + brand.name
								},
								modifier = Modifier.weight(1f),
							)
						}
					}
				}
			}
		}

		Column(
			horizontalAlignment = Alignment.CenterHorizontally,
			verticalArrangement = Arrangement.spacedBy((10 * u).dp),
			modifier = Modifier.fillMaxWidth().padding(top = (8 * u).dp, bottom = (26 * u).dp),
		) {
			AuthCta(
				text = if (picked.isEmpty()) "Continue" else "Continue · ${picked.size} picked",
				// User's call (2026-08-21): Continue unlocks at three picks.
				enabled = picked.size >= 3,
				onClick = {
					if (picked.size >= 3) {
						com.stak.demo.ui.UserProfile.brandPicks = picked
						onContinue()
					}
				},
			)
			AuthSecondaryButton(text = "Back", onClick = onBack)
			Text(
				text = "You can change this later",
				style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (11 * u).sp),
				color = Auth.FaintText,
			)
		}
	}
}

/** One brand tile — white circle render + label; teal border when selected. */
@Composable
private fun BrandTile(
	brand: Brand,
	selected: Boolean,
	onClick: () -> Unit,
	modifier: Modifier = Modifier,
) {
	val u = figmaUnit()
	val shape = RoundedCornerShape((14 * u).dp)
	Column(
		horizontalAlignment = Alignment.CenterHorizontally,
		verticalArrangement = Arrangement.spacedBy((7 * u).dp),
		modifier = modifier
			.background(Auth.InputBg, shape)
			.then(
				if (selected) Modifier.border((1.5 * u).dp, Color(0x8069B3CA), shape) else Modifier,
			)
			.clickable(
				interactionSource = remember { MutableInteractionSource() },
				indication = com.stak.demo.ui.theme.PressDim,
				onClick = onClick,
			)
			.padding(top = (13 * u).dp, bottom = (11 * u).dp, start = (4 * u).dp, end = (4 * u).dp),
	) {
		Image(
			painter = painterResource(brand.iconRes),
			contentDescription = brand.name,
			modifier = Modifier.size((34 * u).dp),
		)
		Text(
			text = brand.name,
			style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (11 * u).sp, lineHeight = (14 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
			color = if (selected) StakColors.TextPrimary else StakColors.Muted,
		)
	}
}
