package com.stak.demo.ui.onboarding

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
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
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.OffsetMapping
import androidx.compose.ui.text.input.TransformedText
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.stak.demo.data.Eligibility
import com.stak.demo.ui.theme.FIGMA_LINE_BOX
import com.stak.demo.ui.theme.Geist
import com.stak.demo.ui.theme.Sora
import com.stak.demo.ui.theme.StakColors
import kotlinx.coroutines.launch

/** Up to eight typed digits shown as MM/DD/YYYY - the slashes are drawn, never typed or stored. */
private object DateOfBirthTransformation : VisualTransformation {
	override fun filter(text: AnnotatedString): TransformedText {
		val d = text.text
		val shown = buildString {
			d.forEachIndexed { i, c ->
				append(c)
				if ((i == 1 || i == 3) && i < d.length - 1) append('/')
			}
		}
		val mapping = object : OffsetMapping {
			override fun originalToTransformed(offset: Int): Int = offset + (if (offset > 2) 1 else 0) + (if (offset > 4) 1 else 0)
			override fun transformedToOriginal(offset: Int): Int = (offset - (if (offset > 2) 1 else 0) - (if (offset > 5) 1 else 0)).coerceIn(0, d.length)
		}
		return TransformedText(AnnotatedString(shown), mapping)
	}
}

/**
 * "Before we get started" (Eligibility): date of birth, U.S. residence and the Terms / Privacy, over the whole app until
 * the account confirms. The wording doesn't name the cutoff until someone's under it. [onRefused]: the server has
 * deleted the account - sign out and start over. Mirrors web EligibilityGate and iOS EligibilityView.
 */
@Composable
internal fun EligibilityScreen(onRefused: () -> Unit) {
	val u = figmaUnit()
	val scope = rememberCoroutineScope()
	val uriHandler = LocalUriHandler.current
	var digits by rememberSaveable { mutableStateOf("") }
	var inUS by rememberSaveable { mutableStateOf(false) }
	var accepted by rememberSaveable { mutableStateOf(false) }
	var busy by remember { mutableStateOf(false) }
	var error by remember { mutableStateOf<String?>(null) }
	var refused by rememberSaveable { mutableStateOf(Eligibility.blockedHere) }
	val dob = Eligibility.isoDob(digits)
	val dobError = if (digits.length == 8 && dob == null) "Enter a real date" else null
	val ready = dob != null && inUS && accepted && !busy
	// Nothing to go back to: the account can't be used until this is answered.
	BackHandler(enabled = true) {}

	val titleStyle = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (26 * u).sp, lineHeight = (33 * u).sp, lineHeightStyle = FIGMA_LINE_BOX)
	val subtitleStyle = TextStyle(fontFamily = Geist, fontSize = (12 * u).sp, lineHeight = (16 * u).sp, lineHeightStyle = FIGMA_LINE_BOX)

	Box(
		modifier = Modifier
			.fillMaxSize()
			.background(StakColors.Bg)
			// The gate is the whole screen: taps never reach the app beneath it.
			.clickable(interactionSource = remember { MutableInteractionSource() }, indication = null) {},
	) {
		AuthWatermark()
		Artboard {
			Column(
				verticalArrangement = Arrangement.spacedBy((14 * u).dp),
				modifier = Modifier.weight(1f).fillMaxWidth().padding(horizontal = (24 * u).dp).padding(top = (32 * u).dp),
			) {
				if (refused) {
					Text("We can’t open STAK for you yet", style = titleStyle, color = StakColors.TextPrimary)
					Text("STAK is currently available only to users 18 and older.", style = subtitleStyle, color = Auth.SubtitleGray)
				} else {
					Column(verticalArrangement = Arrangement.spacedBy((12 * u).dp)) {
						Text("Before we get started", style = titleStyle, color = StakColors.TextPrimary)
						Text("A couple of quick details first.", style = subtitleStyle, color = Auth.SubtitleGray)
					}
					Spacer(modifier = Modifier.height((4 * u).dp))
					Text("Date of birth", style = subtitleStyle.copy(fontWeight = FontWeight.Medium), color = StakColors.Muted)
					AuthInput(
						value = digits,
						onValueChange = { digits = it.filter(Char::isDigit).take(8); error = null },
						placeholder = "MM/DD/YYYY",
						keyboardType = KeyboardType.Number,
						error = dobError,
						visualTransformation = DateOfBirthTransformation,
					)
					EligibilityCheck(inUS, "I confirm that I currently live in the United States.") { inUS = !inUS }
					EligibilityCheck(accepted, "I agree to the Terms of Service and Privacy Policy.") { accepted = !accepted }
					Row(horizontalArrangement = Arrangement.spacedBy((16 * u).dp), modifier = Modifier.padding(start = (30 * u).dp)) {
						LegalLink("Terms of Service") { uriHandler.openUri(Eligibility.TERMS_URL) }
						LegalLink("Privacy Policy") { uriHandler.openUri(Eligibility.PRIVACY_URL) }
					}
				}
			}
			Column(verticalArrangement = Arrangement.spacedBy((12 * u).dp), modifier = Modifier.padding(bottom = (26 * u).dp)) {
				error?.let {
					Text(it, style = TextStyle(fontFamily = Geist, fontSize = (11 * u).sp), color = Auth.ErrorRed, modifier = Modifier.padding(horizontal = (24 * u).dp))
				}
				if (refused) {
					AuthCta(text = "OK", onClick = onRefused)
				} else {
					AuthCta(text = if (busy) "Checking…" else "Continue", enabled = ready) {
						val iso = dob ?: return@AuthCta
						if (!ready) return@AuthCta
						busy = true
						error = null
						scope.launch {
							when (val outcome = Eligibility.confirm(iso)) {
								Eligibility.Outcome.Confirmed -> {}
								Eligibility.Outcome.Refused -> refused = true
								is Eligibility.Outcome.Failed -> error = if (outcome.invalid) "Check your date of birth and both boxes." else "Something went wrong. Try again."
							}
							busy = false
						}
					}
				}
			}
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
			.clickable(
				interactionSource = remember { MutableInteractionSource() },
				indication = com.stak.demo.ui.theme.PressDim,
				role = Role.Checkbox,
				onClickLabel = label,
				onClick = onToggle,
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
		modifier = Modifier.clickable(
			interactionSource = remember { MutableInteractionSource() },
			indication = com.stak.demo.ui.theme.PressDim,
			role = Role.Button,
			onClick = onClick,
		),
	)
}
