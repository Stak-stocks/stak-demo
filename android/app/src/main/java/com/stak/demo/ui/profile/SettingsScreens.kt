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
import androidx.compose.foundation.selection.selectable
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
	/** App settings (FigJam Profile board, 2026-09-14): dark mode, biometric login, change password, delete account. */
	const val APP = "app"
	const val PASSWORD = "password"
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
/** A settings row; with no [onClick] it only shows a value and doesn't react to taps. */
fun SettingsLinkRow(label: String, value: String? = null, chevron: Boolean = true, onClick: (() -> Unit)?) {
	val u = figmaUnit()
	Row(
		verticalAlignment = Alignment.CenterVertically,
		modifier = Modifier
			.fillMaxWidth()
			.height((48 * u).dp)
			.then(if (onClick != null) Modifier.clickable(interactionSource = remember { MutableInteractionSource() }, indication = com.stak.demo.ui.theme.PressDim, onClick = onClick) else Modifier)
			.padding(horizontal = (14 * u).dp),
	) {
		Text(label, style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (13 * u).sp), color = Color.White, maxLines = 1)
		// The value takes the rest of the row, right-aligned; a long one (an email) ends in
		// an ellipsis instead of wrapping out of the row.
		Text(value ?: "", style = TextStyle(fontFamily = Geist, fontSize = (12 * u).sp, textAlign = androidx.compose.ui.text.style.TextAlign.End), color = Muted, maxLines = 1, overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis, modifier = Modifier.weight(1f).padding(start = (12 * u).dp, end = (8 * u).dp))
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

/** `onOpen` pushes a sibling settings page (App settings -> Appearance / Change password); `onAccountDeleted` leaves the signed-out app on Create account. */
@Composable
fun SettingsScreen(kind: String, onBack: () -> Unit, onOpen: (String) -> Unit = {}, onAccountDeleted: () -> Unit = {}) {
	when (kind) {
		SettingsKind.NOTIFICATIONS -> NotificationSettingsScreen(onBack)
		SettingsKind.APPEARANCE -> AppearanceScreen(onBack)
		SettingsKind.LINKED -> LinkedAccountsScreen(onBack)
		SettingsKind.EDIT_PROFILE -> EditProfileScreen(onBack)
		SettingsKind.APP -> AppSettingsScreen(onBack, onOpen, onAccountDeleted)
		SettingsKind.PASSWORD -> ChangePasswordScreen(onBack)
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
		PermissionCard("Price moves on your picks", "A nudge when a saved or bought stock moves more than ${UserProfile.priceThreshold}%.", UserProfile.priceAlerts) { UserProfile.priceAlerts = !UserProfile.priceAlerts; Session.saveProfile(); com.stak.demo.data.PushRegistration.sync() }
		// Price threshold (FigJam Profile board, 2026-09-14): how big a move earns the nudge.
		Column(
			verticalArrangement = Arrangement.spacedBy((10 * u).dp),
			modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape((14 * u).dp)).background(com.stak.demo.ui.onboarding.Auth.InputBg).padding((16 * u).dp),
		) {
			Text("Price threshold", style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (14 * u).sp), color = Color.White)
			Text("Only moves at least this big get a nudge.", style = TextStyle(fontFamily = Geist, fontSize = (11 * u).sp), color = com.stak.demo.ui.onboarding.Auth.SubtitleGray)
			Row(horizontalArrangement = Arrangement.spacedBy((8 * u).dp)) {
				listOf(1, 3, 5, 10).forEach { pct ->
					SettingsChip(label = "$pct%", selected = UserProfile.priceThreshold == pct) { UserProfile.priceThreshold = pct; Session.saveProfile() }
				}
			}
		}
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
	val demo = Session.demoAccount
	SettingsPage(title = if (demo) "Linked accounts" else "Sign-in", onBack = onBack) {
		Column(modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape((16 * u).dp)).background(CardBg).padding(vertical = (4 * u).dp)) {
			if (demo) {
				LinkedRow("Google", UserProfile.linkedGoogle) { UserProfile.linkedGoogle = !UserProfile.linkedGoogle; Session.saveProfile() }
				LinkedRow("Apple", UserProfile.linkedApple) { UserProfile.linkedApple = !UserProfile.linkedApple; Session.saveProfile() }
			} else {
				// A real account shows how it signs in. Linking a second method isn't built,
				// so there are no switches that would only pretend to.
				SettingsLinkRow(label = "Signed in with", value = if (UserProfile.linkedGoogle) "Google" else "Email and password", chevron = false, onClick = null)
				if (UserProfile.email.isNotBlank()) SettingsLinkRow(label = "Email", value = UserProfile.email, chevron = false, onClick = null)
			}
		}
		Caption(
			if (demo) "A linked account lets you sign in with one tap. Your STAK stays the same either way."
			else "Sign in the same way next time, on this phone or a new one. Your saved stocks and taste come with you.",
		)
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
			FaqRow("Is this real money?", "No. The Simulate tab gives you $10,000 of pretend money to practice with. Nothing is bought or sold for real.")
			if (Session.demoAccount) {
				FaqRow("Where do the prices come from?", "The demo account shows sample prices so you can look around. Create an account to see live market prices.")
			} else {
				FaqRow("Where do the prices come from?", "Real prices from the US stock market. They update on their own while the market is open (9:30am to 4pm ET, weekdays). When it's closed, you see the last closing price.")
			}
			if (Session.demoAccount) {
				FaqRow("Is my data private?", "STAK never sells your data.")
			} else {
				FaqRow("Is my data private?", "Your saved stocks and taste answers are stored with your STAK account, so they follow you to a new phone. Your paper portfolio stays on this phone for now. STAK never sells your data.")
			}
			SettingsLinkRow(label = "Email support") {
				val intent = Intent(Intent.ACTION_SENDTO, Uri.parse("mailto:support@stak.app")).putExtra(Intent.EXTRA_SUBJECT, "STAK support")
				runCatching { context.startActivity(intent) }
			}
			// Contact / report and the legal links (FigJam Profile board, 2026-09-14).
			SettingsLinkRow(label = "Report a problem") {
				val intent = Intent(Intent.ACTION_SENDTO, Uri.parse("mailto:support@stak.app"))
					.putExtra(Intent.EXTRA_SUBJECT, "STAK problem report")
					.putExtra(Intent.EXTRA_TEXT, "What happened:\n\nWhere in the app:\n\nApp version $version")
				runCatching { context.startActivity(intent) }
			}
			SettingsLinkRow(label = "Terms of service") { runCatching { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(TERMS_URL))) } }
			SettingsLinkRow(label = "Privacy policy") { runCatching { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(PRIVACY_URL))) } }
			// A value row - nothing to open behind it (product audit, 2026-09-05).
			SettingsLinkRow(label = "Version", value = version, chevron = false, onClick = null)
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

/** Where the legal pages live - the landing site's routes. */
private const val TERMS_URL = "https://stak.app/terms"
private const val PRIVACY_URL = "https://stak.app/privacy"

/** A small selectable chip - the notification threshold, the portfolio setup's balances. */
@Composable
internal fun SettingsChip(label: String, selected: Boolean, onClick: () -> Unit) {
	val u = figmaUnit()
	Box(
		modifier = Modifier
			.clip(RoundedCornerShape((14 * u).dp))
			.background(if (selected) Color(0x2639C5CB) else Color(0xFF10182B))
			.then(if (selected) Modifier.border((1 * u).dp, Color(0xFF2C9DBC), RoundedCornerShape((14 * u).dp)) else Modifier)
			// A radio-style choice for TalkBack: "5%, selected" (review 2026-09-14).
			.selectable(selected = selected, interactionSource = remember { MutableInteractionSource() }, indication = com.stak.demo.ui.theme.PressDim, role = androidx.compose.ui.semantics.Role.RadioButton, onClick = onClick)
			.padding(horizontal = (12 * u).dp, vertical = (6 * u).dp),
	) {
		Text(label, style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (12 * u).sp, lineHeight = (16 * u).sp, lineHeightStyle = FIGMA_LINE_BOX), color = if (selected) Teal else Muted)
	}
}

/**
 * App settings (FigJam Profile board, 2026-09-14: Dark mode, Biometric login,
 * Change password, Delete / log out). Dark mode opens the Appearance page;
 * Biometric login is the 08 Permissions "Account security" switch, now
 * changeable after onboarding; Delete account wipes this account's state on
 * the phone and signs out (Log out stays on the hub). Mirrors ios
 * AppSettingsView.
 */
@Composable
private fun AppSettingsScreen(onBack: () -> Unit, onOpen: (String) -> Unit, onAccountDeleted: () -> Unit) {
	val u = figmaUnit()
	var confirmDelete by rememberSaveable { mutableStateOf(false) }
	SettingsPage(title = "App settings", onBack = onBack) {
		Column(modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape((16 * u).dp)).background(CardBg).padding(vertical = (4 * u).dp)) {
			SettingsLinkRow(label = "Dark mode", value = if (UserProfile.appearance == "system") "Match system" else "On") { onOpen(SettingsKind.APPEARANCE) }
			SettingsLinkRow(label = "Change password") { onOpen(SettingsKind.PASSWORD) }
		}
		PermissionCard("Biometric login", "Unlock STAK with your fingerprint, face or phone PIN whenever you come back.", UserProfile.accountLock) { UserProfile.accountLock = !UserProfile.accountLock; Session.saveProfile() }
		Column(modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape((16 * u).dp)).background(CardBg).padding(vertical = (4 * u).dp)) {
			SettingsLinkRow(label = "Delete account", chevron = !confirmDelete) { confirmDelete = !confirmDelete }
			AnimatedVisibility(visible = confirmDelete) {
				Column(verticalArrangement = Arrangement.spacedBy((10 * u).dp), modifier = Modifier.padding(start = (14 * u).dp, end = (14 * u).dp, bottom = (14 * u).dp)) {
					Text(
						"This removes your saves, paper portfolio and settings from this phone and signs you out. It can\u2019t be undone.",
						style = TextStyle(fontFamily = Geist, fontSize = (12 * u).sp, lineHeight = (17 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
						color = Body,
					)
					Box(
						contentAlignment = Alignment.Center,
						modifier = Modifier
							.fillMaxWidth()
							.height((44 * u).dp)
							.clip(RoundedCornerShape((6 * u).dp))
							.background(Color(0x33E5484D))
							.clickable(interactionSource = remember { MutableInteractionSource() }, indication = com.stak.demo.ui.theme.PressDim) {
								Session.deleteAccount()
								onAccountDeleted()
							},
					) {
						Text("Delete my account", style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (13 * u).sp), color = Color(0xFFE5484D))
					}
				}
			}
		}
		// Account-aware (review 2026-09-14): Sign in always restores the demo persona; a created account's state is not re-enterable after log out.
		Caption(if (Session.demoAccount) "Log out from the Profile page keeps your saves and paper portfolio for the next sign-in." else "Log out from the Profile page ends this account’s session; a new sign-up starts fresh.")
	}
}

/**
 * Change password (FigJam Profile board, 2026-09-14). The demo has no auth
 * backend: the new password must pass the sign-up rules and match its
 * confirmation, then the page flips into its "Password updated" state.
 */
@Composable
private fun ChangePasswordScreen(onBack: () -> Unit) {
	val u = figmaUnit()
	var current by rememberSaveable { mutableStateOf("") }
	var next by rememberSaveable { mutableStateOf("") }
	var confirm by rememberSaveable { mutableStateOf("") }
	var show by rememberSaveable { mutableStateOf(false) }
	var attempted by rememberSaveable { mutableStateOf(false) }
	var updated by rememberSaveable { mutableStateOf(false) }
	val currentError = if (current.isEmpty()) "Enter your current password" else null
	val nextError = com.stak.demo.ui.onboarding.AuthRules.passwordError(next) ?: if (next == current) "Choose a password you haven\u2019t used" else null
	val confirmError = com.stak.demo.ui.onboarding.AuthRules.confirmError(next, confirm)
	SettingsPage(title = "Change password", onBack = onBack) {
		if (updated) {
			Column(
				verticalArrangement = Arrangement.spacedBy((8 * u).dp),
				modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape((16 * u).dp)).background(CardBg).padding((16 * u).dp),
			) {
				Text("Password updated", style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (15 * u).sp), color = Color.White)
				Text("Use it the next time you sign in. Sessions on other phones were signed out.", style = TextStyle(fontFamily = Geist, fontSize = (13 * u).sp, lineHeight = (19 * u).sp, lineHeightStyle = FIGMA_LINE_BOX), color = Body)
			}
			com.stak.demo.ui.onboarding.AuthCta(text = "Done", onClick = onBack)
		} else {
			com.stak.demo.ui.onboarding.AuthInput(value = current, onValueChange = { current = it }, placeholder = "Current password", keyboardType = androidx.compose.ui.text.input.KeyboardType.Password, hidden = !show, trailing = { com.stak.demo.ui.onboarding.ShowHideToggle(shown = show, onToggle = { show = !show }) }, error = if (attempted) currentError else null)
			com.stak.demo.ui.onboarding.AuthInput(value = next, onValueChange = { next = it }, placeholder = "New password", keyboardType = androidx.compose.ui.text.input.KeyboardType.Password, hidden = !show, error = if (attempted) nextError else null)
			com.stak.demo.ui.onboarding.AuthInput(value = confirm, onValueChange = { confirm = it }, placeholder = "Confirm new password", keyboardType = androidx.compose.ui.text.input.KeyboardType.Password, hidden = !show, error = if (attempted) confirmError else null)
			Caption("At least ${com.stak.demo.ui.onboarding.AuthRules.PASSWORD_MIN} characters.")
			com.stak.demo.ui.onboarding.AuthCta(text = "Update password", enabled = current.isNotEmpty() && next.isNotEmpty() && confirm.isNotEmpty(), onClick = {
				attempted = true
				if (currentError == null && nextError == null && confirmError == null) updated = true
			})
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
