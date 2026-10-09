package com.stak.demo.ui.onboarding

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.stak.demo.R
import com.stak.demo.data.Eligibility
import com.stak.demo.data.LegalDocs
import com.stak.demo.ui.components.LegalSheet
import com.stak.demo.ui.theme.Geist
import com.stak.demo.ui.theme.PressDim
import com.stak.demo.ui.theme.Sora
import com.stak.demo.ui.theme.StakColors
import kotlinx.coroutines.launch

/**
 * The screen for Eligibility: the STAK mark and heading, then three separate attestations to tick - 18 or older,
 * living in the United States, and agreeing to the Terms of Service and Privacy Policy (both linked underneath, each
 * opening to read) - centred in the space, and "Continue" once all three are ticked. Over the whole app until the
 * account has confirmed. [onSignOut]: leave without answering. Mirrors web EligibilityGate and iOS EligibilityView.
 */
@Composable
internal fun EligibilityScreen(onSignOut: () -> Unit) {
	val u = figmaUnit()
	val scope = rememberCoroutineScope()
	val context = LocalContext.current
	// The document open in the sheet (LegalDocs.TERMS / PRIVACY), or null.
	var reading by rememberSaveable { mutableStateOf<String?>(null) }
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
		Artboard {
			Row(modifier = Modifier.fillMaxWidth().padding(start = (24 * u).dp, top = (10 * u).dp)) {
				SignOutLink(onClick = onSignOut)
			}
			// The mark, heading, boxes and links centred in the space above the button. At a large font size they scroll,
			// so nothing is pushed off.
			BoxWithConstraints(modifier = Modifier.weight(1f).fillMaxWidth()) {
				Column(
					verticalArrangement = Arrangement.Center,
					modifier = Modifier
						.fillMaxWidth()
						.verticalScroll(rememberScrollState())
						.heightIn(min = maxHeight)
						.padding(horizontal = (24 * u).dp)
						.padding(top = (12 * u).dp, bottom = (14 * u).dp),
				) {
					Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
						// The splash's glass ball, exported small for this size (the splash art itself is 1440px).
						Image(painter = painterResource(R.drawable.stak_glass_mark), contentDescription = null, modifier = Modifier.size((104 * u).dp))
						Text(
							"Before we get started",
							style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (26 * u).sp, lineHeight = (33 * u).sp, textAlign = TextAlign.Center),
							color = StakColors.TextPrimary,
							modifier = Modifier.padding(top = (18 * u).dp).semantics { heading() },
						)
						Text(
							"STAK’s beta is open to adults in the United States. Please confirm the following to continue.",
							style = TextStyle(fontFamily = Geist, fontSize = maxOf(13f, 13 * u).sp, lineHeight = maxOf(18f, 18 * u).sp, textAlign = TextAlign.Center),
							color = Auth.SubtitleGray,
							modifier = Modifier.padding(top = (8 * u).dp),
						)
						Column(
							modifier = Modifier
								.padding(top = (24 * u).dp)
								.fillMaxWidth()
								.background(StakColors.Surface, RoundedCornerShape((16 * u).dp))
								.border((1 * u).dp, StakColors.CardBorder, RoundedCornerShape((16 * u).dp)),
						) {
							AttestRow(adult, "I confirm that I am 18 years of age or older.") { adult = !adult; error = null }
							RowDivider()
							AttestRow(inUS, "I confirm that I currently reside in the United States.") { inUS = !inUS; error = null }
							RowDivider()
							AttestRow(accepted, "I agree to the Terms of Service and Privacy Policy.") { accepted = !accepted; error = null }
						}
						// The documents on their own line (a link inside a box's label would only tick the box).
						Row(horizontalArrangement = Arrangement.spacedBy((20 * u).dp), modifier = Modifier.padding(top = (12 * u).dp)) {
							DocLink("Terms of Service") { reading = LegalDocs.TERMS }
							DocLink("Privacy Policy") { reading = LegalDocs.PRIVACY }
						}
					}
				}
			}
			Column(verticalArrangement = Arrangement.spacedBy((12 * u).dp), modifier = Modifier.padding(bottom = (26 * u).dp)) {
				error?.let {
					Text(
						it,
						style = TextStyle(fontFamily = Geist, fontSize = maxOf(11f, 11 * u).sp, textAlign = TextAlign.Center),
						color = Auth.ErrorRed,
						// TalkBack reads the failure out (focus stays on the button).
						modifier = Modifier.fillMaxWidth().padding(horizontal = (24 * u).dp).semantics { liveRegion = LiveRegionMode.Polite },
					)
				}
				AuthCta(text = if (busy) "Saving…" else "Continue", enabled = ready) {
					if (!ready) return@AuthCta
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

/** One attestation: a box and its statement. The whole row toggles; TalkBack hears a checkbox with its state. */
@Composable
private fun AttestRow(checked: Boolean, label: String, onToggle: () -> Unit) {
	val u = figmaUnit()
	Row(
		horizontalArrangement = Arrangement.spacedBy((12 * u).dp),
		modifier = Modifier
			.fillMaxWidth()
			.toggleable(
				value = checked,
				interactionSource = remember { MutableInteractionSource() },
				indication = PressDim,
				role = Role.Checkbox,
				onValueChange = { onToggle() },
			)
			.heightIn(min = (54 * u).dp)
			.padding(horizontal = (16 * u).dp, vertical = (15 * u).dp),
	) {
		Box(
			contentAlignment = Alignment.Center,
			modifier = Modifier
				.padding(top = (1 * u).dp)
				.size((22 * u).dp)
				.background(if (checked) StakColors.Teal else Color.Transparent, RoundedCornerShape((6 * u).dp))
				.then(if (checked) Modifier else Modifier.border((1.5 * u).dp, StakColors.Muted, RoundedCornerShape((6 * u).dp))),
		) {
			if (checked) {
				Canvas(modifier = Modifier.size((13 * u).dp)) {
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
			style = TextStyle(fontFamily = Geist, fontSize = maxOf(14f, 14 * u).sp, lineHeight = maxOf(20f, 20 * u).sp),
			color = StakColors.TextPrimary,
			modifier = Modifier.weight(1f),
		)
	}
}

@Composable
private fun RowDivider() {
	val u = figmaUnit()
	Box(modifier = Modifier.fillMaxWidth().padding(start = (50 * u).dp).height((1 * u).dp).background(StakColors.Divider))
}

/** A document to read, as a teal link. */
@Composable
private fun DocLink(text: String, onClick: () -> Unit) {
	val u = figmaUnit()
	Text(
		text,
		style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = maxOf(13f, 13 * u).sp, textDecoration = TextDecoration.Underline),
		color = StakColors.Teal,
		modifier = Modifier
			// A comfortable target for small text.
			.heightIn(min = (40 * u).dp)
			.clickable(
				interactionSource = remember { MutableInteractionSource() },
				indication = PressDim,
				role = Role.Button,
				onClickLabel = "Read",
				onClick = onClick,
			)
			.wrapContentHeight(),
	)
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
