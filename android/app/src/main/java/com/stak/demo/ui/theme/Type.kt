package com.stak.demo.ui.theme

import androidx.compose.ui.text.ExperimentalTextApi
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontVariation
import androidx.compose.ui.text.font.FontWeight
import com.stak.demo.R

/**
 * Sora is the UI face across the app; Squarish Sans CT is the display face
 * for the STAK wordmark and big numerals.
 *
 * STATIC instances, one file per weight - the same files iOS bundles and
 * Figma renders. The variable fonts were dropped on 2026-09-04: Android
 * shapes a FontVariation instance with the DEFAULT instance's advances
 * (HVAR ignored), so every SemiBold/Medium run came out 1.5-2.6% narrower
 * than the frame (Sora 26 SemiBold "Discover" 400-vs-600 advance gap 1.5%,
 * Geist 14 Medium "Practice buy" 2.6% - measured on StakTest vs the 2x
 * export of 1:1627) while Regular runs matched. The old ADVANCE_ROUNDING
 * tracking was a workaround for exactly this and is gone.
 */
val Sora = FontFamily(
	Font(R.font.sora_light, FontWeight.Light),
	Font(R.font.sora_regular, FontWeight.Normal),
	Font(R.font.sora_medium, FontWeight.Medium),
	Font(R.font.sora_semibold, FontWeight.SemiBold),
	Font(R.font.sora_bold, FontWeight.Bold),
)

val Squarish = FontFamily(Font(R.font.squarish_sans_ct))
val SquarishSC = FontFamily(Font(R.font.squarish_sans_ct_sc))

/** Geist — the in-app data/UI face used by the splash subtitle and stat chips (static instances, see Sora). */
val Geist = FontFamily(
	Font(R.font.geist_light, FontWeight.Light),
	Font(R.font.geist_regular, FontWeight.Normal),
	Font(R.font.geist_medium, FontWeight.Medium),
	Font(R.font.geist_semibold, FontWeight.SemiBold),
	Font(R.font.geist_bold, FontWeight.Bold),
)

@OptIn(ExperimentalTextApi::class)
private fun inter(weight: FontWeight) = Font(
	R.font.inter_variable,
	weight = weight,
	style = FontStyle.Normal,
	variationSettings = FontVariation.Settings(FontVariation.weight(weight.weight)),
)

/** Inter — the CHINEDU tab-bar label face (Home tab bar, node 1:1220). */
@OptIn(ExperimentalTextApi::class)
val Inter = FontFamily(
	inter(FontWeight.Normal),
	inter(FontWeight.Medium),
)
