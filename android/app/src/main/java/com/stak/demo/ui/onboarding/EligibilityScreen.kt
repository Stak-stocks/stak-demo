package com.stak.demo.ui.onboarding

import androidx.activity.compose.BackHandler
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
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.wrapContentHeight
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.KeyboardArrowRight
import androidx.compose.material.icons.rounded.Description
import androidx.compose.material.icons.rounded.Lock
import androidx.compose.material3.Icon
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
import androidx.compose.ui.graphics.vector.ImageVector
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
 * The screen for Eligibility, as apps' "review and agree" steps do it: the STAK mark, the heading and a card with the
 * two documents (each opens to read), centred in the space; then one sentence - 18 or older, living in the United
 * States, and agreeing to both - and "Agree and continue", which confirms it. Over the whole app until the account has
 * confirmed. [onSignOut]: leave without answering. Mirrors web EligibilityGate and iOS EligibilityView.
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
			// The mark, heading and card centred in the space, the sentence at the foot (right above the button it describes,
			// so what tapping it means is in view when it's tapped). At a large font size they scroll, so nothing is pushed
			// off. (The empty first child makes SpaceBetween centre the middle one.)
			BoxWithConstraints(modifier = Modifier.weight(1f).fillMaxWidth()) {
				Column(
					verticalArrangement = Arrangement.SpaceBetween,
					modifier = Modifier
						.fillMaxWidth()
						.verticalScroll(rememberScrollState())
						.heightIn(min = maxHeight)
						.padding(horizontal = (24 * u).dp)
						.padding(top = (12 * u).dp, bottom = (14 * u).dp),
				) {
					Spacer(modifier = Modifier.height(0.dp))
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
							"STAK’s beta is open to adults in the United States. Please review our terms before you continue.",
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
							DocRow(Icons.Rounded.Description, "Terms of Service") { reading = LegalDocs.TERMS }
							RowDivider()
							DocRow(Icons.Rounded.Lock, "Privacy Policy") { reading = LegalDocs.PRIVACY }
						}
					}
					Column(verticalArrangement = Arrangement.spacedBy((10 * u).dp), modifier = Modifier.padding(top = (24 * u).dp)) {
						// Never below 13sp: what someone agrees to stays easy to read on a narrow phone.
						Text(
							"By tapping Agree and continue, I confirm that I’m 18 or older and live in the United States, and I agree to the Terms of Service and Privacy Policy.",
							style = TextStyle(fontFamily = Geist, fontSize = maxOf(13f, 13 * u).sp, lineHeight = maxOf(19f, 19 * u).sp),
							color = StakColors.Body,
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

/** One line of the card: a teal icon and a document's name; opens it to read. */
@Composable
private fun DocRow(icon: ImageVector, label: String, onOpen: () -> Unit) {
	val u = figmaUnit()
	Row(
		verticalAlignment = Alignment.CenterVertically,
		modifier = Modifier
			.fillMaxWidth()
			.clickable(
				interactionSource = remember { MutableInteractionSource() },
				indication = PressDim,
				role = Role.Button,
				onClickLabel = "Read",
				onClick = onOpen,
			)
			.heightIn(min = (54 * u).dp)
			.padding(horizontal = (16 * u).dp, vertical = (10 * u).dp),
	) {
		Box(
			contentAlignment = Alignment.Center,
			modifier = Modifier.size((32 * u).dp).background(StakColors.Teal.copy(alpha = 0.14f), CircleShape),
		) {
			Icon(icon, contentDescription = null, tint = StakColors.Teal, modifier = Modifier.size((18 * u).dp))
		}
		Text(
			label,
			style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = maxOf(14f, 14 * u).sp),
			color = StakColors.Teal,
			modifier = Modifier.weight(1f).padding(start = (12 * u).dp),
		)
		Icon(Icons.AutoMirrored.Rounded.KeyboardArrowRight, contentDescription = null, tint = StakColors.Muted, modifier = Modifier.size((20 * u).dp))
	}
}

@Composable
private fun RowDivider() {
	val u = figmaUnit()
	Box(modifier = Modifier.fillMaxWidth().padding(start = (60 * u).dp).height((1 * u).dp).background(StakColors.Divider))
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
