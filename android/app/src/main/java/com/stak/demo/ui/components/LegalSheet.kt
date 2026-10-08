package com.stak.demo.ui.components

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.stak.demo.data.LegalDocResponse
import com.stak.demo.data.LegalDocs
import com.stak.demo.ui.onboarding.AuthCta
import com.stak.demo.ui.onboarding.figmaUnit
import com.stak.demo.ui.theme.Geist
import com.stak.demo.ui.theme.PressDim
import com.stak.demo.ui.theme.Sora
import com.stak.demo.ui.theme.StakColors

private val Body = Color(0xFFC8D2E0)
private val CardBg = Color(0xFF171D2C)

/**
 * The Terms of Service or Privacy Policy ([doc]: LegalDocs.TERMS / PRIVACY) in a full-screen sheet over the app - the
 * whole text to scroll through, no browser. With [onAgree] (the eligibility gate), "I agree" sits at the bottom and
 * switches on once the end has been reached; without it the sheet only reads. Mirrors iOS LegalSheetView.
 */
@Composable
fun LegalSheet(doc: String, onClose: () -> Unit, onAgree: (() -> Unit)? = null) {
	val u = figmaUnit()
	var loaded by remember(doc) { mutableStateOf<LegalDocResponse?>(null) }
	var failed by remember(doc) { mutableStateOf(false) }
	var attempt by remember(doc) { mutableIntStateOf(0) }
	LaunchedEffect(doc, attempt) {
		failed = false
		loaded = LegalDocs.load(doc)
		failed = loaded == null
	}
	val listState = rememberLazyListState()
	// The end is reached when the list can't scroll further (a short screen's whole text counts at once).
	val atEnd by remember { derivedStateOf { !listState.canScrollForward } }
	BackHandler(onBack = onClose)

	Box(
		modifier = Modifier
			.fillMaxSize()
			.background(StakColors.Bg)
			// Over the app: taps stay in the sheet.
			.pointerInput(Unit) { detectTapGestures { } },
	) {
		Column(modifier = Modifier.fillMaxSize().statusBarsPadding().navigationBarsPadding()) {
			Row(
				verticalAlignment = Alignment.CenterVertically,
				modifier = Modifier.fillMaxWidth().padding(horizontal = (20 * u).dp, vertical = (12 * u).dp),
			) {
				Text(
					loaded?.title ?: if (doc == LegalDocs.TERMS) "Terms of Service" else "Privacy Policy",
					style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (18 * u).sp),
					color = StakColors.TextPrimary,
					modifier = Modifier.weight(1f).semantics { heading() },
				)
				Text(
					"Close",
					style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (14 * u).sp),
					color = StakColors.Teal,
					modifier = Modifier
						.clickable(interactionSource = remember { MutableInteractionSource() }, indication = PressDim, role = Role.Button, onClick = onClose)
						.padding((8 * u).dp),
				)
			}
			val text = loaded
			Box(modifier = Modifier.weight(1f).fillMaxWidth()) {
				when {
					text != null -> LazyColumn(
						state = listState,
						verticalArrangement = Arrangement.spacedBy((12 * u).dp),
						modifier = Modifier.fillMaxSize().padding(horizontal = (20 * u).dp),
					) {
						item {
							Text(
								"Effective date: ${text.effective}",
								style = TextStyle(fontFamily = Geist, fontStyle = FontStyle.Italic, fontSize = (12 * u).sp),
								color = StakColors.Muted,
							)
						}
						item {
							Text(
								text.notice,
								style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.SemiBold, fontSize = (11.5 * u).sp, lineHeight = (17 * u).sp),
								color = Body,
								modifier = Modifier
									.fillMaxWidth()
									.background(CardBg, RoundedCornerShape((12 * u).dp))
									.border((1 * u).dp, Color(0x4069B3CA), RoundedCornerShape((12 * u).dp))
									.padding((14 * u).dp),
							)
						}
						text.sections.forEach { s ->
							item {
								Column(verticalArrangement = Arrangement.spacedBy((8 * u).dp), modifier = Modifier.padding(top = (8 * u).dp)) {
									if (s.heading.isNotBlank()) {
										Text(s.heading, style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (16 * u).sp), color = StakColors.TextPrimary, modifier = Modifier.semantics { heading() })
									}
									s.sub?.let { Text(it, style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.SemiBold, fontSize = (14 * u).sp), color = StakColors.Teal) }
									s.blocks.forEach { b ->
										val bodyStyle = TextStyle(fontFamily = Geist, fontSize = (13.5 * u).sp, lineHeight = (21 * u).sp)
										b.text?.let { Text(it, style = bodyStyle, color = Body) }
										b.list?.forEach { line ->
											Row(horizontalArrangement = Arrangement.spacedBy((8 * u).dp)) {
												Text("•", style = bodyStyle, color = Body)
												Text(line, style = bodyStyle, color = Body)
											}
										}
									}
								}
							}
						}
						item { Box(modifier = Modifier.padding(bottom = (16 * u).dp)) }
					}
					failed -> Column(
						horizontalAlignment = Alignment.CenterHorizontally,
						verticalArrangement = Arrangement.spacedBy((10 * u).dp),
						modifier = Modifier.align(Alignment.Center).padding((24 * u).dp),
					) {
						Text("Couldn’t load this right now.", style = TextStyle(fontFamily = Geist, fontSize = (13 * u).sp), color = StakColors.Muted)
						Text(
							"Try again",
							style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (13 * u).sp),
							color = StakColors.Teal,
							modifier = Modifier
								.clickable(interactionSource = remember { MutableInteractionSource() }, indication = PressDim, role = Role.Button) { attempt++ }
								.padding((8 * u).dp),
						)
					}
					else -> Text("Loading…", style = TextStyle(fontFamily = Geist, fontSize = (13 * u).sp), color = StakColors.Muted, modifier = Modifier.align(Alignment.Center))
				}
			}
			if (onAgree != null) {
				Column(
					horizontalAlignment = Alignment.CenterHorizontally,
					verticalArrangement = Arrangement.spacedBy((8 * u).dp),
					modifier = Modifier.fillMaxWidth().padding(top = (8 * u).dp, bottom = (16 * u).dp),
				) {
					val ready = loaded != null && atEnd
					if (loaded != null && !atEnd) {
						Text("Scroll to the end to agree", style = TextStyle(fontFamily = Geist, fontSize = (11 * u).sp), color = StakColors.Muted)
					}
					AuthCta(text = "I agree", enabled = ready) { if (ready) onAgree() }
				}
			}
		}
	}
}
