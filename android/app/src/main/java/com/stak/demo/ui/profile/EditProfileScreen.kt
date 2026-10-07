package com.stak.demo.ui.profile

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.stak.demo.ui.Session
import com.stak.demo.ui.UserProfile
import com.stak.demo.ui.capitalizeWords
import com.stak.demo.ui.onboarding.AuthCta
import com.stak.demo.ui.onboarding.copyAvatar
import com.stak.demo.ui.onboarding.deleteAvatarFile
import com.stak.demo.ui.onboarding.figmaUnit
import com.stak.demo.ui.onboarding.pruneAvatars
import com.stak.demo.ui.theme.FIGMA_LINE_BOX
import com.stak.demo.ui.theme.Geist
import com.stak.demo.ui.theme.Sora
import com.stak.demo.ui.theme.StakColors
import kotlinx.coroutines.launch

private const val NAME_MAX = 20

/**
 * 08 · Profile — "Profile · Edit" (Chinedu_Mobile 1:5782, 2026-10-07; replaces the reused 09
 * frame). The 64 avatar ("Tap the avatar to change your photo"), DISPLAY NAME / HANDLE / EMAIL
 * inputs, the SECURITY card ("Reset password · Email me a link ›"), the handle footnote and the
 * bottom-anchored Save changes CTA. The photo picker and the app-owned avatar copies are 09's
 * (ProfileSetupScreen); Save persists in place. Mirrors ios Profile/EditProfileView.swift.
 */
@Composable
fun EditProfileScreen(onBack: () -> Unit, onSaved: () -> Unit, onResetPassword: () -> Unit = {}) {
	val u = figmaUnit()
	val context = LocalContext.current
	val scope = rememberCoroutineScope()
	var name by rememberSaveable { mutableStateOf(UserProfile.displayName.ifBlank { UserProfile.greetingName }) }
	var handle by rememberSaveable { mutableStateOf(UserProfile.handleText) }
	var email by rememberSaveable { mutableStateOf(UserProfile.emailText) }
	var photoUri by rememberSaveable { mutableStateOf(UserProfile.photoUri) }
	// Save waits for the avatar copy (Codex review, PR #166); a later pick supersedes an unfinished one.
	var copying by remember { mutableStateOf(false) }
	var copyGen by remember { mutableStateOf(0) }
	val pickPhoto = rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) { uri ->
		if (uri == null) return@rememberLauncherForActivityResult
		copying = true
		copyGen += 1
		val gen = copyGen
		scope.launch {
			val copy = kotlinx.coroutines.withContext(kotlinx.coroutines.Dispatchers.IO) { copyAvatar(context, uri) }
			if (gen != copyGen) {
				if (copy != null) deleteAvatarFile(copy)
				return@launch
			}
			val previous = photoUri
			photoUri = copy ?: uri.toString()
			if (previous != null && previous != UserProfile.photoUri) deleteAvatarFile(previous)
			copying = false
		}
	}
	// Leaving without saving discards the unsaved copies; the account's own photo stays (review 2026-09-07).
	val leave: () -> Unit = {
		pruneAvatars(context, keep = UserProfile.photoUri)
		onBack()
	}
	androidx.activity.compose.BackHandler(onBack = leave)
	val pick = { pickPhoto.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)) }

	ProfilePageScaffold(title = "Edit profile", onBack = leave) {
		// The CTA block tops at the authored 732 (1:5826): 632 of content under the 100 nav. A shorter screen
		// gives the content what is left instead; the surplus of a taller one stays under the CTA like the auth frames.
		androidx.compose.foundation.layout.BoxWithConstraints(modifier = Modifier.weight(1f).fillMaxWidth()) {
			val cta = (86 * u).dp
			val contentH = if ((632 * u).dp + cta < maxHeight) (632 * u).dp else maxHeight - cta
			Column(modifier = Modifier.fillMaxWidth()) {
			Box(modifier = Modifier.fillMaxWidth().height(contentH)) {
			ProfileContent(scroll = rememberScrollState()) {
				// Avatar (1:5784): 64 circle, no ring, the initial at Sora SemiBold 22; 8 under it the hint.
				Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy((8 * u).dp), modifier = Modifier.fillMaxWidth()) {
					Box(
						contentAlignment = Alignment.Center,
						modifier = Modifier
							.size((64 * u).dp)
							.background(Prof.AvatarBg, CircleShape)
							.clip(CircleShape)
							.clickable(interactionSource = remember { MutableInteractionSource() }, indication = com.stak.demo.ui.theme.PressDim, onClickLabel = "Change photo", onClick = pick),
					) {
						val photo = photoUri
						if (photo != null) {
							coil.compose.AsyncImage(
								model = photo,
								contentDescription = "Profile photo",
								contentScale = androidx.compose.ui.layout.ContentScale.Crop,
								modifier = Modifier.matchParentSize().clip(CircleShape),
							)
						} else {
							Text(
								text = name.trim().take(1).uppercase(),
								style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (22 * u).sp, lineHeight = (28 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
								color = Prof.AvatarInk,
							)
						}
					}
					Text(
						text = "Tap the avatar to change your photo",
						style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (12 * u).sp, lineHeight = (16 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
						color = Prof.Muted,
						modifier = Modifier.clickable(interactionSource = remember { MutableInteractionSource() }, indication = com.stak.demo.ui.theme.PressDim, onClick = pick),
					)
				}
				EditField(label = "DISPLAY NAME", value = name, onValueChange = { name = it.take(NAME_MAX) }, capitalization = KeyboardCapitalization.Words)
				EditField(label = "HANDLE", value = handle, onValueChange = { handle = it.filter { c -> !c.isWhitespace() }.take(NAME_MAX + 1) })
				EditField(label = "EMAIL", value = email, onValueChange = { email = it.trim() }, keyboardType = KeyboardType.Email)
				SectionLabel("SECURITY")
				ProfileCard { ProfileRow(label = "Reset password", value = "Email me a link", onClick = onResetPassword) }
				ProfileCaption("Your handle shows on the Simulate leaderboard. Your email never does.")
			}
			}
			// CTA (1:5826): 8 above, 26 below the gradient button, right under the 632 content area.
			Column(modifier = Modifier.fillMaxWidth().padding(top = (8 * u).dp, bottom = (26 * u).dp)) {
			AuthCta(text = "Save changes", enabled = name.isNotBlank() && !copying, onClick = {
				UserProfile.displayName = name.trim().capitalizeWords()
				UserProfile.photoUri = photoUri
				// The authored defaults stay derived: a handle / email typed back to them is stored blank.
				val h = handle.trim().let { if (it.isEmpty() || it == "@") "" else if (it.startsWith("@")) it else "@$it" }
				UserProfile.handle = if (h == "@" + UserProfile.greetingName.lowercase().replace(" ", "")) "" else h
				UserProfile.email = if (email == "hamza@gmail.com" && Session.demoAccount) "" else email
				pruneAvatars(context, keep = photoUri)
				Session.saveProfile()
				onSaved()
			})
			}
			}
		}
	}
}

/** A labelled input (1:5788): Geist Medium 11 label, 6 gap, the #181F30 r14 field with 16 padding and Geist 13 text. */
@Composable
private fun EditField(label: String, value: String, onValueChange: (String) -> Unit, keyboardType: KeyboardType = KeyboardType.Text, capitalization: KeyboardCapitalization = KeyboardCapitalization.None) {
	val u = figmaUnit()
	val style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (13 * u).sp, lineHeight = (17 * u).sp, lineHeightStyle = FIGMA_LINE_BOX, color = Color.White)
	Column(verticalArrangement = Arrangement.spacedBy((6 * u).dp), modifier = Modifier.fillMaxWidth()) {
		Text(
			text = label,
			style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (11 * u).sp, lineHeight = (14 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
			color = Prof.Muted,
		)
		BasicTextField(
			value = value,
			onValueChange = onValueChange,
			textStyle = style,
			singleLine = true,
			cursorBrush = SolidColor(StakColors.Accent),
			keyboardOptions = KeyboardOptions(keyboardType = keyboardType, capitalization = capitalization),
			modifier = Modifier
				.fillMaxWidth()
				.background(Prof.InputBg, RoundedCornerShape((14 * u).dp))
				.padding((16 * u).dp)
				.semantics { contentDescription = label },
		)
	}
}
