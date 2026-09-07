package com.stak.demo.ui.onboarding

import android.graphics.BitmapFactory
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.foundation.text.BasicTextField
import com.stak.demo.data.capitalizeWords
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
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.stak.demo.ui.theme.Geist
import com.stak.demo.ui.theme.Sora
import com.stak.demo.ui.theme.StakColors
import androidx.hilt.navigation.compose.hiltViewModel
import kotlinx.coroutines.launch
import java.io.File

private const val NAME_MAX = 20

/**
 * Onboarding · 09 Profile setup — Figma node 1:793 (CHINEDU file,
 * "STEP · LAST ONE").
 *
 * Final onboarding step: 96dp #242b3d avatar circle with the teal ring
 * and the display-name initial, "Add a photo" link, the DISPLAY NAME
 * input card with its live "n / 20" counter, and the gradient
 * "Proceed to home" CTA.
 */
@Composable
fun ProfileSetupScreen(
    viewModel: AuthViewModel = hiltViewModel(),
    onBack: () -> Unit,
    onProceed: () -> Unit,
) {
	val u = figmaUnit()
	// The frame arrives with "Nedu" typed (avatar "N", counter 4 / 20) - user, 2026-09-04 (CHINEDU 01 · Onboarding 1:793): the exact frame wins.
	// Product audit (2026-09-05): a real first run starts with an empty name
	// (the frame's "Nedu" was authored demo state) and Proceed waits for one.
	var name by rememberSaveable { mutableStateOf("") }
	// User's motion (2026-08-21): Add a photo opens the system gallery and
	// the chosen image becomes the avatar. The photo picker carries its own
	// permission flow, so no runtime permission is requested by the app.
	var photoUri by rememberSaveable { mutableStateOf<String?>(null) }
	val context = LocalContext.current
	val scope = rememberCoroutineScope()
	// Decoded off the main thread - a large gallery image decoded inside
	// composition can freeze the first frame after picking (audit 2026-08-25).
	// remember + LaunchedEffect rather than produceState (audit 2026-09-04):
	// same semantics (state survives recomposition, a new photoUri cancels
	// the previous decode and starts another), but the
	// ProduceStateDoesNotAssignValue lint check could not see the
	// assignment made after the suspend call and kept the quality gate red.
	var avatar by androidx.compose.runtime.remember { androidx.compose.runtime.mutableStateOf<android.graphics.Bitmap?>(null) }
	androidx.compose.runtime.LaunchedEffect(photoUri) {
		avatar = kotlinx.coroutines.withContext(kotlinx.coroutines.Dispatchers.IO) {
			photoUri?.let { stored ->
				runCatching {
					val uri = Uri.parse(stored)
					val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
					context.contentResolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it, null, bounds) }
					val opts = BitmapFactory.Options().apply {
						inSampleSize = maxOf(1, minOf(bounds.outWidth, bounds.outHeight) / 512)
					}
					context.contentResolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it, null, opts) }
				}.getOrNull()
			}
		}
	}
	val pickPhoto = rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) { uri ->
		if (uri == null) return@rememberLauncherForActivityResult
		// The picker's read grant is temporary while Session persists the URI
		// for later launches (Codex review, PR #166): keep an app-owned copy
		// and store THAT, so the avatar survives a reboot. The picker URI is
		// the fallback when the copy fails.
		scope.launch {
			val copy = kotlinx.coroutines.withContext(kotlinx.coroutines.Dispatchers.IO) { copyAvatar(context, uri) }
			photoUri = copy ?: uri.toString()
		}
	}

	Artboard(modifier = Modifier.background(StakColors.Bg)) {
		Row(modifier = Modifier.fillMaxWidth().padding(horizontal = (20 * u).dp).padding(top = (10 * u).dp, bottom = (4 * u).dp)) {
			AuthBackCircle(onClick = onBack)
		}
		OnboardingKicker(text = "STEP · LAST ONE")

		Column(
			verticalArrangement = Arrangement.spacedBy((18 * u).dp),
			modifier = Modifier
				.weight(1f)
				.fillMaxWidth()
				.padding(horizontal = (24 * u).dp)
				.padding(top = (14 * u).dp),
		) {
			Column(verticalArrangement = Arrangement.spacedBy((12 * u).dp)) {
				Text(
					text = "Make it yours",
					style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (26 * u).sp),
					color = StakColors.TextPrimary,
				)
				Text(
					text = "Pick a name and photo. This is how you’ll show up on leaderboards.",
					style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (12 * u).sp),
					color = Auth.SubtitleGray,
					modifier = Modifier.width((276 * u).dp),
				)
			}

			// Avatar — 96dp #242b3d circle, 2dp teal ring, Sora 36 initial.
			Column(
				horizontalAlignment = Alignment.CenterHorizontally,
				verticalArrangement = Arrangement.spacedBy((10 * u).dp),
				modifier = Modifier.fillMaxWidth().padding(vertical = (6 * u).dp),
			) {
				Box(
					modifier = Modifier
						.size((96 * u).dp)
						.background(Color(0xFF242B3D), CircleShape)
						.border((2 * u).dp, Auth.LinkTeal, CircleShape)
						.clip(CircleShape)
						.clickable(
							interactionSource = remember { MutableInteractionSource() },
							indication = com.stak.demo.ui.theme.PressDim,
							onClick = { pickPhoto.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)) },
						),
					contentAlignment = Alignment.Center,
				) {
					val bmp = avatar
					if (bmp != null) {
						Image(
							bitmap = bmp.asImageBitmap(),
							contentDescription = "Profile photo",
							contentScale = ContentScale.Crop,
							modifier = Modifier.size((96 * u).dp),
						)
					} else {
						Text(
							text = name.firstOrNull()?.uppercase() ?: "",
							style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (36 * u).sp),
							color = Color(0xFF9EADC7),
						)
					}
				}
				Text(
					text = "Add a photo",
					style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (12 * u).sp),
					color = Auth.LinkTeal,
					modifier = Modifier.clickable(
						interactionSource = remember { MutableInteractionSource() },
						indication = com.stak.demo.ui.theme.PressDim,
						onClick = { pickPhoto.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)) },
					),
				)
			}

			Text(
				text = "DISPLAY NAME",
				style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (10 * u).sp, letterSpacing = (1.2 * u).sp),
				color = Auth.FaintText,
			)

			// Name input — #181f30 r14 card with the live "n / 20" counter.
			Row(
				verticalAlignment = Alignment.CenterVertically,
				modifier = Modifier
					.fillMaxWidth()
					.background(Auth.InputBg, RoundedCornerShape((14 * u).dp))
					.padding((16 * u).dp),
			) {
				BasicTextField(
					value = name,
					onValueChange = { name = it.take(NAME_MAX) },
					textStyle = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (14 * u).sp, color = StakColors.TextPrimary),
					singleLine = true,
					// Names start capitalized on the keyboard; whatever is typed
					// is capitalized again at save (UserProfile.capitalizeWords).
					keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(
						capitalization = androidx.compose.ui.text.input.KeyboardCapitalization.Words,
					),
					cursorBrush = SolidColor(StakColors.Accent),
					modifier = Modifier.weight(1f),
					decorationBox = { inner ->
						Box(contentAlignment = Alignment.CenterStart) {
							if (name.isEmpty()) {
								Text(
									text = "Your name",
									style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (14 * u).sp),
									color = StakColors.Muted,
								)
							}
							inner()
						}
					},
				)
				Text(
					text = "${name.length} / $NAME_MAX",
					style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (11 * u).sp),
					color = Auth.FaintText,
				)
			}

			Text(
				text = "You can change this anytime in Profile.",
				style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (11 * u).sp),
				color = Auth.FaintText,
			)
		}

		Column(modifier = Modifier.fillMaxWidth().padding(top = (8 * u).dp, bottom = (26 * u).dp)) {
			AuthCta(text = "Proceed to home", enabled = name.isNotBlank(), onClick = {
				com.stak.demo.data.UserProfile.displayName = name.trim().capitalizeWords()
				com.stak.demo.data.UserProfile.photoUri = photoUri
				com.stak.demo.data.Session.saveProfile()
				// Fire-and-forget: save profile to Supabase in the background.
				// The UI proceeds immediately; failure only affects cross-device routing.
				viewModel.saveProfile()
				onProceed()
			})
		}
	}
}

/** Copies the picked image into app storage; its file URI, or null when the copy fails. */
private fun copyAvatar(context: android.content.Context, uri: Uri): String? = runCatching {
	val file = File(context.filesDir, "avatar.jpg")
	context.contentResolver.openInputStream(uri)?.use { input -> file.outputStream().use { input.copyTo(it) } } ?: return null
	Uri.fromFile(file).toString()
}.getOrNull()
