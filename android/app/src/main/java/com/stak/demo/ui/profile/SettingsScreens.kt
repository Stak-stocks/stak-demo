package com.stak.demo.ui.profile

import android.content.Intent
import android.graphics.BitmapFactory
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
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
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.stak.demo.data.Session
import com.stak.demo.data.UserProfile
import com.stak.demo.data.capitalizeWords
import com.stak.demo.ui.onboarding.AuthBackCircle
import com.stak.demo.ui.onboarding.AuthCta
import com.stak.demo.ui.onboarding.AuthViewModel
import com.stak.demo.ui.onboarding.PermissionCard
import com.stak.demo.ui.onboarding.figmaUnit
import com.stak.demo.ui.theme.FIGMA_LINE_BOX
import com.stak.demo.ui.theme.Geist
import com.stak.demo.ui.theme.Sora
import com.stak.demo.ui.theme.StakColors
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File

private val CardBg = Color(0xFF10182B)
private val Muted = Color(0xFF819ABB)
private val Body = Color(0xFFC8D2E0)
private val Teal = Color(0xFF69B3CA)

/**
 * The settings pages behind the Profile hub's rows (product audit,
 * 2026-09-05: the rows did nothing). No frames exist for them, so they
 * borrow the hub's language - its header, #10182B r16 cards, 48-tall
 * rows, Geist 13 labels - and the permissions step's toggle card.
 * Mirrors ios SettingsViews.swift.
 */
object SettingsKind {
	const val NOTIFICATIONS = "notifications"
	const val APPEARANCE = "appearance"
	const val LINKED = "linked"
	const val HELP = "help"
	const val EDIT_PROFILE = "edit_profile"
}

/** The hub's header (back circle + centred title) over a dark page. */
@Composable
fun SettingsScaffold(title: String, onBack: () -> Unit, content: @Composable ColumnScope.() -> Unit) {
	val u = figmaUnit()
	Column(modifier = Modifier.fillMaxSize().background(StakColors.Bg)) {
		Box(modifier = Modifier.fillMaxWidth().statusBarsPadding().padding(top = (8 * u).dp, bottom = (16 * u).dp)) {
			AuthBackCircle(onClick = onBack, modifier = Modifier.align(Alignment.CenterStart).padding(start = (20 * u).dp))
			Text(
				text = title,
				style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (17 * u).sp, lineHeight = (22 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
				color = Color.White,
				modifier = Modifier.align(Alignment.Center),
			)
		}
		content()
	}
}

/** A hub-style row: label, chevron, tap. */
@Composable
fun SettingsLinkRow(label: String, value: String? = null, chevron: Boolean = true, onClick: () -> Unit) {
	val u = figmaUnit()
	Row(
		verticalAlignment = Alignment.CenterVertically,
		modifier = Modifier
			.fillMaxWidth()
			.height((48 * u).dp)
			.clickable(interactionSource = remember { MutableInteractionSource() }, indication = com.stak.demo.ui.theme.PressDim, onClick = onClick)
			.padding(horizontal = (14 * u).dp),
	) {
		Text(label, style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (13 * u).sp), color = Color.White)
		Spacer(modifier = Modifier.weight(1f))
		if (value != null) Text(value, style = TextStyle(fontFamily = Geist, fontSize = (12 * u).sp), color = Muted, modifier = Modifier.padding(end = (8 * u).dp))
		if (chevron) Text("›", style = TextStyle(fontFamily = Geist, fontSize = (14 * u).sp), color = Muted)
	}
}

@Composable
private fun Caption(text: String) {
	val u = figmaUnit()
	Text(text, style = TextStyle(fontFamily = Geist, fontSize = (12 * u).sp, lineHeight = (16 * u).sp, lineHeightStyle = FIGMA_LINE_BOX), color = Muted, modifier = Modifier.padding(horizontal = (4 * u).dp))
}

@Composable
private fun SettingsPage(title: String, onBack: () -> Unit, content: @Composable ColumnScope.() -> Unit) {
	val u = figmaUnit()
	SettingsScaffold(title = title, onBack = onBack) {
		Column(
			verticalArrangement = Arrangement.spacedBy((12 * u).dp),
			modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).navigationBarsPadding().padding(horizontal = (20 * u).dp).padding(bottom = (26 * u).dp),
			content = content,
		)
	}
}

@Composable
fun SettingsScreen(kind: String, onBack: () -> Unit) {
	when (kind) {
		SettingsKind.NOTIFICATIONS -> NotificationSettingsScreen(onBack)
		SettingsKind.APPEARANCE -> AppearanceScreen(onBack)
		SettingsKind.LINKED -> LinkedAccountsScreen(onBack)
		SettingsKind.EDIT_PROFILE -> EditProfileScreen(onBack)
		else -> HelpSupportScreen(onBack)
	}
}

@Composable
private fun NotificationSettingsScreen(onBack: () -> Unit) {
	val u = figmaUnit()
	val context = LocalContext.current
	// Live OS check so the warning card appears if the user revoked the permission in phone Settings
	// after onboarding, without relying on the stored preference (which is only written at grant time).
	val osGranted = androidx.core.app.NotificationManagerCompat.from(context).areNotificationsEnabled()
	SettingsPage(title = "Notifications", onBack = onBack) {
		if (!osGranted) {
			Column(
				verticalArrangement = Arrangement.spacedBy((8 * u).dp),
				modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape((16 * u).dp)).background(CardBg).padding((16 * u).dp),
			) {
				Text("Notifications are off for STAK", style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (15 * u).sp), color = Color.White)
				Text("Turn them on in your phone’s settings to get price moves and your daily deck.", style = TextStyle(fontFamily = Geist, fontSize = (13 * u).sp, lineHeight = (19 * u).sp, lineHeightStyle = FIGMA_LINE_BOX), color = Body)
				Text(
					"Open phone settings ›",
					style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (13 * u).sp),
					color = Teal,
					modifier = Modifier.clickable(interactionSource = remember { MutableInteractionSource() }, indication = com.stak.demo.ui.theme.PressDim) {
						val intent = Intent(android.provider.Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(android.provider.Settings.EXTRA_APP_PACKAGE, context.packageName)
						runCatching { context.startActivity(intent) }
					},
				)
			}
		}
		// Each switch is sent to the backend, which does the sending while STAK is closed.
		PermissionCard("Price moves on your picks", "A nudge when a saved stock moves more than 3%.", UserProfile.priceAlerts) { UserProfile.priceAlerts = !UserProfile.priceAlerts; Session.saveProfile(); com.stak.demo.data.PushRegistration.sync() }
		PermissionCard("Daily deck", "One reminder when a fresh deck lands each morning.", UserProfile.dailyDeck) { UserProfile.dailyDeck = !UserProfile.dailyDeck; Session.saveProfile(); com.stak.demo.data.PushRegistration.sync() }
		PermissionCard("Market news", "The stories behind the moves, a few times a week.", UserProfile.marketNews) { UserProfile.marketNews = !UserProfile.marketNews; Session.saveProfile() }
		Caption("You can change these any time.")
	}
}

@Composable
private fun AppearanceScreen(onBack: () -> Unit) {
	val u = figmaUnit()
	SettingsPage(title = "Appearance", onBack = onBack) {
		Column(modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape((16 * u).dp)).background(CardBg).padding(vertical = (4 * u).dp)) {
			listOf("dark" to "Dark", "system" to "Match system").forEach { (key, label) ->
				Row(
					verticalAlignment = Alignment.CenterVertically,
					modifier = Modifier
						.fillMaxWidth()
						.height((48 * u).dp)
						.clickable(interactionSource = remember { MutableInteractionSource() }, indication = com.stak.demo.ui.theme.PressDim) { UserProfile.appearance = key; Session.saveProfile() }
						.padding(horizontal = (14 * u).dp),
				) {
					Text(label, style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (13 * u).sp), color = Color.White)
					Spacer(modifier = Modifier.weight(1f))
					if (UserProfile.appearance == key) Text("✓", style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (14 * u).sp), color = Teal)
				}
			}
		}
		Caption("STAK is designed for dark mode. Match system keeps it dark for now and follows your phone once a light theme ships.")
	}
}

@Composable
private fun LinkedAccountsScreen(onBack: () -> Unit) {
	val u = figmaUnit()
	SettingsPage(title = "Linked accounts", onBack = onBack) {
		Column(modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape((16 * u).dp)).background(CardBg).padding(vertical = (4 * u).dp)) {
			LinkedRow("Google", UserProfile.linkedGoogle) { UserProfile.linkedGoogle = !UserProfile.linkedGoogle; Session.saveProfile() }
			LinkedRow("Apple", UserProfile.linkedApple) { UserProfile.linkedApple = !UserProfile.linkedApple; Session.saveProfile() }
		}
		Caption("A linked account lets you sign in with one tap. Your STAK stays the same either way.")
	}
}

@Composable
private fun LinkedRow(name: String, linked: Boolean, onToggle: () -> Unit) {
	val u = figmaUnit()
	Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth().height((48 * u).dp).padding(horizontal = (14 * u).dp)) {
		Text(name, style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (13 * u).sp), color = Color.White)
		Spacer(modifier = Modifier.weight(1f))
		Text(if (linked) "Linked" else "Not linked", style = TextStyle(fontFamily = Geist, fontSize = (12 * u).sp), color = if (linked) Teal else Muted, modifier = Modifier.padding(end = (12 * u).dp))
		Text(
			if (linked) "Unlink" else "Link",
			style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (13 * u).sp),
			color = Teal,
			modifier = Modifier.clickable(interactionSource = remember { MutableInteractionSource() }, indication = com.stak.demo.ui.theme.PressDim, onClick = onToggle),
		)
	}
}

@Composable
private fun HelpSupportScreen(onBack: () -> Unit) {
	val u = figmaUnit()
	val context = LocalContext.current
	val version = remember { runCatching { context.packageManager.getPackageInfo(context.packageName, 0).versionName }.getOrNull() ?: "1.0" }
	SettingsPage(title = "Help & support", onBack = onBack) {
		Column(modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape((16 * u).dp)).background(CardBg).padding(vertical = (4 * u).dp)) {
			FaqRow("Is this real money?", "No. Simulate runs on $10,000 of paper money so you can practise with zero risk. Nothing is bought or sold for real.")
			FaqRow("Where do the prices come from?", "STAK shows demo prices while the market feed is being wired up. Every number on screen is illustrative.")
			FaqRow("Is my data private?", "Your picks, saves and paper portfolio live on this phone. STAK never sells your data.")
			SettingsLinkRow(label = "Email support") {
				val intent = Intent(Intent.ACTION_SENDTO, Uri.parse("mailto:support@stak.app")).putExtra(Intent.EXTRA_SUBJECT, "STAK support")
				runCatching { context.startActivity(intent) }
			}
			// A value row - nothing to open behind it (product audit, 2026-09-05).
			SettingsLinkRow(label = "Version", value = version, chevron = false) {}
		}
	}
}

@Composable
private fun FaqRow(question: String, answer: String) {
	val u = figmaUnit()
	var open by rememberSaveable { mutableStateOf(false) }
	Column(modifier = Modifier.fillMaxWidth()) {
		Row(
			verticalAlignment = Alignment.CenterVertically,
			modifier = Modifier
				.fillMaxWidth()
				.height((48 * u).dp)
				.clickable(interactionSource = remember { MutableInteractionSource() }, indication = com.stak.demo.ui.theme.PressDim) { open = !open }
				.padding(horizontal = (14 * u).dp),
		) {
			Text(question, style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (13 * u).sp), color = Color.White)
			Spacer(modifier = Modifier.weight(1f))
			Text(if (open) "⌃" else "⌄", style = TextStyle(fontFamily = Geist, fontSize = (14 * u).sp), color = Muted)
		}
		AnimatedVisibility(visible = open) {
			Text(answer, style = TextStyle(fontFamily = Geist, fontSize = (12 * u).sp, lineHeight = (17 * u).sp, lineHeightStyle = FIGMA_LINE_BOX), color = Body, modifier = Modifier.padding(start = (14 * u).dp, end = (14 * u).dp, bottom = (12 * u).dp))
		}
	}
}

private const val EDIT_NAME_MAX = 20

@Composable
private fun EditProfileScreen(onBack: () -> Unit) {
	val viewModel: AuthViewModel = hiltViewModel()
	val u = figmaUnit()
	val context = LocalContext.current
	val scope = rememberCoroutineScope()

	var name by rememberSaveable { mutableStateOf(UserProfile.displayName) }
	var photoUri by rememberSaveable { mutableStateOf(UserProfile.photoUri) }
	var avatar by remember { mutableStateOf<android.graphics.Bitmap?>(null) }
	var isSaving by rememberSaveable { mutableStateOf(false) }

	LaunchedEffect(photoUri) {
		avatar = withContext(Dispatchers.IO) {
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
		scope.launch {
			val copy = withContext(Dispatchers.IO) { copyAvatarEdit(context, uri) }
			photoUri = copy ?: uri.toString()
		}
	}

	SettingsPage(title = "Edit profile", onBack = onBack) {
		Column(
			horizontalAlignment = Alignment.CenterHorizontally,
			verticalArrangement = Arrangement.spacedBy((10 * u).dp),
			modifier = Modifier.fillMaxWidth().padding(vertical = (8 * u).dp),
		) {
			Box(
				modifier = Modifier
					.size((96 * u).dp)
					.background(Color(0xFF242B3D), CircleShape)
					.border((2 * u).dp, Teal, CircleShape)
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
				text = "Change photo",
				style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (12 * u).sp),
				color = Teal,
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
			color = Muted,
		)

		Row(
			verticalAlignment = Alignment.CenterVertically,
			modifier = Modifier
				.fillMaxWidth()
				.background(Color(0xFF181F30), RoundedCornerShape((14 * u).dp))
				.padding((16 * u).dp),
		) {
			BasicTextField(
				value = name,
				onValueChange = { name = it.take(EDIT_NAME_MAX) },
				textStyle = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (14 * u).sp, color = StakColors.TextPrimary),
				singleLine = true,
				keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Words),
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
				text = "${name.length} / $EDIT_NAME_MAX",
				style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (11 * u).sp),
				color = Muted,
			)
		}

		AuthCta(
			text = if (isSaving) "Saving…" else "Save changes",
			enabled = name.isNotBlank() && !isSaving,
			onClick = {
				isSaving = true
				scope.launch {
					UserProfile.displayName = name.trim().capitalizeWords()
					UserProfile.photoUri = photoUri
					Session.saveProfile()
					viewModel.updateProfile()
					onBack()
				}
			},
		)
	}
}

private fun copyAvatarEdit(context: android.content.Context, uri: Uri): String? = runCatching {
	val file = File(context.filesDir, "avatar.jpg")
	context.contentResolver.openInputStream(uri)?.use { input -> file.outputStream().use { input.copyTo(it) } } ?: return null
	Uri.fromFile(file).toString()
}.getOrNull()
