package com.stak.demo.ui.onboarding

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.wrapContentHeight
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.toggleable
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.stak.demo.data.Eligibility
import com.stak.demo.ui.theme.FIGMA_LINE_BOX
import com.stak.demo.ui.theme.Geist
import com.stak.demo.ui.theme.PressDim
import com.stak.demo.ui.theme.Sora
import com.stak.demo.ui.theme.StakColors
import kotlinx.coroutines.launch

/**
 * The screen for Eligibility: three boxes - 18 or older, living in the United States, and the Terms / Privacy - over
 * the whole app until the account has confirmed them. [onSignOut]: leave without answering. Mirrors web
 * EligibilityGate and iOS EligibilityView.
 */
@Composable
internal fun EligibilityScreen(onSignOut: () -> Unit) {
	val u = figmaUnit()
	val scope = rememberCoroutineScope()
	val context = LocalContext.current
	// The document open in the sheet (LegalDocs.TERMS / PRIVACY), or null; and which have been agreed at their end.
	var reading by rememberSaveable { mutableStateOf<String?>(null) }
	var agreedTerms by rememberSaveable { mutableStateOf(false) }
	var agreedPrivacy by rememberSaveable { mutableStateOf(false) }
	var adult by rememberSaveable { mutableStateOf(false) }
	var inUS by rememberSaveable { mutableStateOf(false) }
	var accepted by rememberSaveable { mutableStateOf(false) }
	var busy by remember { mutableStateOf(false) }
	var error by remember { mutableStateOf<String?>(null) }
	val ready = adult && inUS && accepted && !busy
	// Back leaves the app (Sign out is on the screen): the account can't be used until this is answered. (With a document
	// open, the sheet's own Back closes it.)
	BackHandler(enabled = reading == null) { (context as? android.app.Activity)?.moveTaskToBack(true) }

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
				LegalLink("Sign out", onClick = onSignOut)
			}
			Column(
				verticalArrangement = Arrangement.spacedBy((14 * u).dp),
				// Scrolls at a large font size, so every box and link stays reachable.
				modifier = Modifier.weight(1f).fillMaxWidth().verticalScroll(rememberScrollState()).padding(horizontal = (24 * u).dp).padding(top = (22 * u).dp),
			) {
				Column(verticalArrangement = Arrangement.spacedBy((12 * u).dp)) {
					Text(
						"Before we get started",
						style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (26 * u).sp, lineHeight = (33 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
						color = StakColors.TextPrimary,
					)
					Text(
						"STAK’s beta is open to adults in the United States.",
						style = TextStyle(fontFamily = Geist, fontSize = (12 * u).sp, lineHeight = (16 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
						color = Auth.SubtitleGray,
					)
				}
				Spacer(modifier = Modifier.height((4 * u).dp))
				EligibilityCheck(adult, "I confirm that I am 18 years of age or older.") { adult = !adult; error = null }
				EligibilityCheck(inUS, "I confirm that I currently reside in the United States.") { inUS = !inUS; error = null }
				EligibilityCheck(accepted, "I agree to the Terms of Service and Privacy Policy.") { accepted = !accepted; error = null }
				// The documents on their own row (a link inside the toggling label would only tick the box), each in a sheet
				// whose "I agree" - once read to the end - ticks the agreement.
				Row(horizontalArrangement = Arrangement.spacedBy((16 * u).dp), modifier = Modifier.padding(start = (30 * u).dp)) {
					LegalLink("Terms of Service") { reading = com.stak.demo.data.LegalDocs.TERMS }
					LegalLink("Privacy Policy") { reading = com.stak.demo.data.LegalDocs.PRIVACY }
				}
			}
			Column(verticalArrangement = Arrangement.spacedBy((12 * u).dp), modifier = Modifier.padding(bottom = (26 * u).dp)) {
				error?.let {
					Text(it, style = TextStyle(fontFamily = Geist, fontSize = (11 * u).sp), color = Auth.ErrorRed, modifier = Modifier.padding(horizontal = (24 * u).dp))
				}
				AuthCta(text = if (busy) "Saving…" else "Continue", enabled = ready) {
					if (!ready) return@AuthCta
					busy = true
					error = null
					scope.launch {
						when (val outcome = Eligibility.confirm()) {
							Eligibility.Outcome.Confirmed -> {}
							is Eligibility.Outcome.Failed -> error = if (outcome.invalid) "Tick all three boxes to continue." else "Something went wrong. Try again."
						}
						busy = false
					}
				}
			}
		}
		reading?.let { doc ->
			com.stak.demo.ui.components.LegalSheet(
				doc = doc,
				onClose = { reading = null },
				// The box covers both documents: agreeing to one opens the other if it hasn't been read yet, and the box
				// ticks once both have been agreed at their end.
				onAgree = {
					if (doc == com.stak.demo.data.LegalDocs.TERMS) agreedTerms = true else agreedPrivacy = true
					error = null
					reading = when {
						!agreedTerms -> com.stak.demo.data.LegalDocs.TERMS
						!agreedPrivacy -> com.stak.demo.data.LegalDocs.PRIVACY
						else -> { accepted = true; null }
					}
				},
			)
		}
	}
}

@Composable
private fun EligibilityCheck(checked: Boolean, label: String, onToggle: () -> Unit) {
	val u = figmaUnit()
	Row(
		horizontalArrangement = Arrangement.spacedBy((10 * u).dp),
		modifier = Modifier
			.fillMaxWidth()
			// A checkbox to TalkBack: its label, and "checked" / "not checked".
			.toggleable(
				value = checked,
				interactionSource = remember { MutableInteractionSource() },
				indication = PressDim,
				role = Role.Checkbox,
				onValueChange = { onToggle() },
			),
	) {
		Box(
			contentAlignment = Alignment.Center,
			modifier = Modifier
				.padding(top = (1 * u).dp)
				.size((20 * u).dp)
				.background(if (checked) StakColors.Teal else Color.Transparent, RoundedCornerShape((5 * u).dp))
				.then(if (checked) Modifier else Modifier.border((1.5 * u).dp, StakColors.Muted, RoundedCornerShape((5 * u).dp))),
		) {
			if (checked) {
				Canvas(modifier = Modifier.size((12 * u).dp)) {
					val w = size.width
					val path = Path().apply {
						moveTo(w * 0.17f, w * 0.54f)
						lineTo(w * 0.42f, w * 0.75f)
						lineTo(w * 0.83f, w * 0.25f)
					}
					drawPath(path, StakColors.Bg, style = Stroke(width = 2.dp.toPx() * u, cap = StrokeCap.Round))
				}
			}
		}
		Text(
			label,
			style = TextStyle(fontFamily = Geist, fontSize = (13 * u).sp, lineHeight = (19 * u).sp),
			color = StakColors.TextPrimary,
		)
	}
}

@Composable
private fun LegalLink(text: String, onClick: () -> Unit) {
	val u = figmaUnit()
	Text(
		text,
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
