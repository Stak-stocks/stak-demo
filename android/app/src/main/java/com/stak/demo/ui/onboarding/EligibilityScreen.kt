package com.stak.demo.ui.onboarding

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.wrapContentHeight
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.LinkAnnotation
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextLinkStyles
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.withLink
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.stak.demo.data.Eligibility
import com.stak.demo.data.LegalDocs
import com.stak.demo.ui.components.LegalSheet
import com.stak.demo.ui.theme.FIGMA_LINE_BOX
import com.stak.demo.ui.theme.Geist
import com.stak.demo.ui.theme.PressDim
import com.stak.demo.ui.theme.Sora
import com.stak.demo.ui.theme.StakColors
import kotlinx.coroutines.launch

/**
 * The screen for Eligibility: one sentence and one button, as most apps do it - tapping "Agree and continue" confirms
 * 18 or older, living in the United States, and agreement to the Terms of Service and Privacy Policy, which the sentence
 * links to (each opens in a sheet to read). Over the whole app until the account has confirmed. [onSignOut]: leave
 * without answering. Mirrors web EligibilityGate and iOS EligibilityView.
 */
@Composable
internal fun EligibilityScreen(onSignOut: () -> Unit) {
	val u = figmaUnit()
	val scope = rememberCoroutineScope()
	val context = LocalContext.current
	// The document open in the sheet (LegalDocs.TERMS / PRIVACY), or null.
	var reading by rememberSaveable { mutableStateOf<String?>(null) }
	var busy by remember { mutableStateOf(false) }
	var error by remember { mutableStateOf<String?>(null) }
	// Back leaves the app (Sign out is on the screen): the account can't be used until this is answered. (With a document
	// open, the sheet's own Back closes it.)
	BackHandler(enabled = reading == null) { (context as? android.app.Activity)?.moveTaskToBack(true) }

	// Built once: its links only open a document, so it never changes.
	val agreement = remember {
		val linkStyle = TextLinkStyles(SpanStyle(color = StakColors.Teal, fontWeight = FontWeight.Medium, textDecoration = TextDecoration.Underline))
		buildAnnotatedString {
			append("By tapping Agree and continue, I confirm that I am 18 years of age or older, that I currently reside in the United States, and that I agree to the ")
			withLink(LinkAnnotation.Clickable("terms", linkStyle) { reading = LegalDocs.TERMS }) { append("Terms of Service") }
			append(" and ")
			withLink(LinkAnnotation.Clickable("privacy", linkStyle) { reading = LegalDocs.PRIVACY }) { append("Privacy Policy") }
			append(".")
		}
	}

	Box(
		modifier = Modifier
			.fillMaxSize()
			.background(StakColors.Bg)
			// The gate is the whole screen: taps never reach the app beneath it (and it adds no node for TalkBack).
			.pointerInput(Unit) { detectTapGestures { } },
	) {
		AuthWatermark()
		Artboard {
			Row(modifier = Modifier.fillMaxWidth().padding(start = (24 * u).dp, top = (10 * u).dp)) {
				SignOutLink(onClick = onSignOut)
			}
			// Heading at the top, the sentence at the foot (right above the button it describes, so what tapping it means
			// is in view when it's tapped). At a large font size the two scroll, so neither is ever pushed off the screen.
			BoxWithConstraints(modifier = Modifier.weight(1f).fillMaxWidth()) {
				Column(
					verticalArrangement = Arrangement.SpaceBetween,
					modifier = Modifier
						.fillMaxWidth()
						.verticalScroll(rememberScrollState())
						.heightIn(min = maxHeight)
						.padding(horizontal = (24 * u).dp)
						.padding(top = (22 * u).dp, bottom = (14 * u).dp),
				) {
					Column(verticalArrangement = Arrangement.spacedBy((12 * u).dp)) {
						Text(
							"Before we get started",
							style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (26 * u).sp, lineHeight = (33 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
							color = StakColors.TextPrimary,
							modifier = Modifier.semantics { heading() },
						)
						Text(
							"STAK’s beta is open to adults in the United States.",
							style = TextStyle(fontFamily = Geist, fontSize = (12 * u).sp, lineHeight = (16 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
							color = Auth.SubtitleGray,
						)
					}
					Column(verticalArrangement = Arrangement.spacedBy((14 * u).dp), modifier = Modifier.padding(top = (24 * u).dp)) {
						// Never below 13sp: what someone agrees to stays easy to read on a narrow phone.
						Text(
							agreement,
							style = TextStyle(fontFamily = Geist, fontSize = maxOf(13f, 13 * u).sp, lineHeight = maxOf(19f, 19 * u).sp),
							color = StakColors.TextPrimary,
						)
						error?.let {
							Text(
								it,
								style = TextStyle(fontFamily = Geist, fontSize = maxOf(11f, 11 * u).sp),
								color = Auth.ErrorRed,
								// TalkBack reads the failure out (focus stays on the button).
								modifier = Modifier.semantics { liveRegion = LiveRegionMode.Polite },
							)
						}
					}
				}
			}
			Column(modifier = Modifier.padding(bottom = (26 * u).dp)) {
				AuthCta(text = if (busy) "Saving…" else "Agree and continue", enabled = !busy) {
					if (busy) return@AuthCta
					busy = true
					error = null
					scope.launch {
						if (!Eligibility.confirm()) error = "Something went wrong. Try again."
						busy = false
					}
				}
			}
		}
		reading?.let { doc -> LegalSheet(doc = doc, onClose = { reading = null }) }
	}
}

@Composable
private fun SignOutLink(onClick: () -> Unit) {
	val u = figmaUnit()
	Text(
		"Sign out",
		style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (12 * u).sp, textDecoration = TextDecoration.Underline),
		color = StakColors.Teal,
		modifier = Modifier
			// A comfortable target for small text.
			.heightIn(min = (32 * u).dp)
			.clickable(
				interactionSource = remember { MutableInteractionSource() },
				indication = PressDim,
				role = Role.Button,
				onClick = onClick,
			)
			.wrapContentHeight(),
	)
}
