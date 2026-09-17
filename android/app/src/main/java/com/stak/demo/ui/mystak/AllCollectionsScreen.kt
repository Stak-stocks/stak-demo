package com.stak.demo.ui.mystak

import com.stak.demo.ui.theme.FIGMA_LINE_BOX
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.stak.demo.ui.onboarding.AuthBackCircle
import com.stak.demo.ui.theme.Geist
import com.stak.demo.ui.theme.Sora
import com.stak.demo.ui.theme.StakColors

/**
 * Every collection, for an account with more than the overview's grid shows. The same
 * chips, in the same order - this page only lifts the cap.
 */
@Composable
fun AllCollectionsScreen(
	onBack: () -> Unit,
	onOpenCollection: (String) -> Unit,
	viewModel: MyStakViewModel = sharedMyStakViewModel(),
) {
	val u = com.stak.demo.ui.onboarding.figmaUnit()
	val demo = com.stak.demo.data.Session.demoAccount
	val ui by viewModel.ui.collectAsState()
	val entries = if (demo) {
		COLLECTIONS.map { CollectionEntry(it.id, it.name, it.held().size, it.imageRes, it.iconRes) }
	} else {
		ui.groups.map { CollectionEntry(it.id, it.name, it.holdings.size, it.imageRes, it.iconRes) }
	}
	Column(modifier = Modifier.fillMaxSize().background(StakColors.Bg)) {
		Box(modifier = Modifier.fillMaxWidth().statusBarsPadding().height((56 * u).dp)) {
			AuthBackCircle(onClick = onBack, modifier = Modifier.align(Alignment.CenterStart).padding(start = (20 * u).dp))
			Text(
				text = "Collections",
				style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (16 * u).sp, lineHeight = (20 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
				color = Color.White,
				modifier = Modifier.align(Alignment.Center),
			)
		}
		Column(
			verticalArrangement = Arrangement.spacedBy((10 * u).dp),
			modifier = Modifier
				.weight(1f)
				.fillMaxWidth()
				.verticalScroll(rememberScrollState())
				.navigationBarsPadding()
				.padding(horizontal = (20 * u).dp)
				.padding(top = (8 * u).dp, bottom = (32 * u).dp),
		) {
			Text(
				text = "${entries.size} collections · ${heldCountLabel(entries.sumOf { it.count })}",
				style = TextStyle(fontFamily = Geist, fontSize = (12 * u).sp, lineHeight = (16 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
				color = Stak.Muted,
			)
			CollectionGrid(entries, onOpenCollection)
		}
	}
}
