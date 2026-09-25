package com.stak.demo.ui.mystak

import com.stak.demo.ui.theme.FIGMA_LINE_BOX
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.stak.demo.ui.theme.Geist
import com.stak.demo.ui.theme.Sora

/** The My STAK pages' shared palette (overview, all collections, Taste Graph). */
internal object Stak {
	val CardBg = Color(0xFF181F30)
	val Muted = Color(0xFF819ABB)
	val Faint = Color(0xFF5C6B85)
	val Body = Color(0xFFC8D2E0)
	val Teal = Color(0xFF69B3CA)
	val HeaderGray = Color(0xFFD3D3DD)
	val Divider = Color(0xFF2A3346)
}

/** One collection chip's content, whichever account it came from. */
internal data class CollectionEntry(
	val id: String,
	val name: String,
	val count: Int,
	val imageRes: Int? = null,
	val iconRes: Int? = null,
	/** One of its companies has an update nobody has opened yet. */
	val hasUpdate: Boolean = false,
)

/** Every collection on screen, with the dot for one whose company has an unopened update. */
internal fun collectionEntries(
	demo: Boolean,
	ui: MyStakViewModel.MyStakUi,
	unreadTickers: Set<String>,
): List<CollectionEntry> = if (demo) {
	COLLECTIONS.map { c ->
		CollectionEntry(c.id, c.name, c.held().size, c.imageRes, c.iconRes, c.held().any { it.ticker in unreadTickers })
	}
} else {
	ui.groups.map { g ->
		// Its own category's icon: the glass art is drawn per family, so Chips and Big
		// Tech - and Streaming and E-commerce - arrived wearing the same picture.
		CollectionEntry(g.id, g.name, g.holdings.size, null, null, g.holdings.any { it.ticker in unreadTickers })
	}
}

/**
 * The Taste Mix palette: one shade of blue per ranked theme, strongest lightest. Shades
 * of one colour rather than six hues - a rainbow ring read as decoration, and this is
 * the app's own blue (design concept, user 2026-09-17).
 */
private val TASTE_PALETTE = listOf(
	Color(0xFF9BD7EC), Color(0xFF69B3CA), Color(0xFF4A8FC0), Color(0xFF356F9F), Color(0xFF2A5476), Color(0xFF223D57),
)

internal fun themeColor(colorKey: String): Color =
	TASTE_PALETTE.getOrNull(colorKey.removePrefix("t").toIntOrNull() ?: -1) ?: Stak.Faint

@Composable
internal fun StakSectionHeader(title: String) {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
	Text(
		text = title,
		style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (16 * u).sp, lineHeight = (20 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
		color = Stak.HeaderGray,
	)
}

/** A small marked tile - the shape every icon on the My STAK pages wears. */
@Composable
internal fun StakIconTile(iconRes: Int, tint: Color, size: Int = 34, glyph: Int = 20) {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
	Box(
		contentAlignment = Alignment.Center,
		modifier = Modifier.size((size * u).dp).clip(RoundedCornerShape((10 * u).dp)).background(tint.copy(alpha = 0.18f)),
	) {
		Image(
			painter = painterResource(iconRes),
			contentDescription = null,
			modifier = Modifier.size((glyph * u).dp),
		)
	}
}

/** Two-column collection chips, as the overview and the full list both draw them. */
@Composable
internal fun CollectionGrid(entries: List<CollectionEntry>, onOpen: (String) -> Unit) {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
	Column(verticalArrangement = Arrangement.spacedBy((10 * u).dp), modifier = Modifier.fillMaxWidth()) {
		entries.chunked(2).forEach { pair ->
			Row(horizontalArrangement = Arrangement.spacedBy((10 * u).dp), modifier = Modifier.fillMaxWidth()) {
				pair.forEach { c ->
					CollectionChip(
						name = c.name,
						count = heldCountLabel(c.count),
						imageRes = c.imageRes,
						iconRes = c.iconRes,
						initial = c.name.take(1),
						hasUpdate = c.hasUpdate,
						onClick = { onOpen(c.id) },
						modifier = Modifier.weight(1f),
					)
				}
				// A lone chip keeps its column instead of stretching across the row.
				if (pair.size == 1) Spacer(modifier = Modifier.weight(1f))
			}
		}
	}
}

/** One collection chip — art/icon, name + count, chevron (#181f30 r12). */
@Composable
private fun CollectionChip(
	name: String,
	count: String,
	modifier: Modifier = Modifier,
	imageRes: Int? = null,
	iconRes: Int? = null,
	/** Drawn when no authored art fits the category - better than borrowing art that says the wrong thing. */
	initial: String? = null,
	hasUpdate: Boolean = false,
	onClick: () -> Unit = {},
) {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
	Box(
		modifier = modifier
			.clip(RoundedCornerShape((12 * u).dp))
			.background(Stak.CardBg)
			.clickable(
				interactionSource = remember { MutableInteractionSource() },
				indication = com.stak.demo.ui.theme.PressDim,
				onClick = onClick,
			),
	) {
		Row(
			verticalAlignment = Alignment.CenterVertically,
			horizontalArrangement = Arrangement.spacedBy((10 * u).dp),
			modifier = Modifier.padding((12 * u).dp),
		) {
			if (imageRes != null) {
				// The demo persona keeps its authored glass art.
				Image(
					painter = painterResource(imageRes),
					contentDescription = null,
					contentScale = ContentScale.Crop,
					modifier = Modifier.size((34 * u).dp),
				)
			} else if (iconRes != null) {
				Image(painterResource(iconRes), null, modifier = Modifier.size((36 * u).dp))
			} else {
				StakIconTile(com.stak.demo.data.categoryIcon(name), Stak.Teal)
			}
			Column(verticalArrangement = Arrangement.spacedBy((2 * u).dp), modifier = Modifier.weight(1f)) {
				Text(
					text = name,
					style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (13 * u).sp, lineHeight = (16 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
					color = Color.White,
					maxLines = 1,
					softWrap = false,
					// Authored: "Green Energy" (box 90) overflows its 84 column —
					// the frame draws it past the column, so don't clip it.
					overflow = TextOverflow.Visible,
				)
				Text(
					text = count,
					style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (11 * u).sp, lineHeight = (14 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
					color = Stak.Muted,
					maxLines = 1,
					// Same treatment as the name above it (device report, 2026-09-18): a
					// narrow tile was breaking "companies" mid-word ("companie" / "s")
					// instead of overflowing past the column.
					softWrap = false,
					overflow = TextOverflow.Visible,
				)
			}
			Text(
				text = "›",
				style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (16 * u).sp),
				color = Stak.Faint,
			)
		}
		if (hasUpdate) {
			// A corner badge, not inline with the name (device report, 2026-09-18: it was
			// sitting right after the text and crowded a longer name).
			Box(
				modifier = Modifier
					.align(Alignment.TopEnd)
					.padding((8 * u).dp)
					.size((8 * u).dp)
					.clip(CircleShape)
					.background(Stak.Teal),
			)
		}
	}
}
