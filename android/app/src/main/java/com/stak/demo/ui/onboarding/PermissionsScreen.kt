package com.stak.demo.ui.onboarding

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.platform.LocalContext
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.stak.demo.ui.theme.Geist
import com.stak.demo.ui.theme.Sora
import com.stak.demo.ui.theme.StakColors

/**
 * Onboarding · 08 Permissions — Figma node 1:749 (CHINEDU file,
 * "STEP · ALMOST THERE").
 *
 * Post-signup permissions ask: notifications + account security rows as
 * #181f30 cards with the teal 42x24 toggles (both on by default), the
 * settings footnote, and the gradient "Allow and continue" CTA over the
 * hairline "Not now".
 */
@Composable
fun PermissionsScreen(onBack: () -> Unit, onContinue: () -> Unit) {
	val u = figmaUnit()
	var notifications by rememberSaveable { mutableStateOf(true) }
	var accountSecurity by rememberSaveable { mutableStateOf(true) }
	// Product audit (2026-09-05): "Allow and continue" really asks the OS
	// (Android 13+ POST_NOTIFICATIONS); the grant is what the toggle meant.
	val context = LocalContext.current
	val askNotifications = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
		notifications = granted
		com.stak.demo.ui.UserProfile.notificationsOn = granted
		onContinue()
	}
	fun allowAndContinue() {
		val needsAsk = notifications && android.os.Build.VERSION.SDK_INT >= 33 &&
			androidx.core.content.ContextCompat.checkSelfPermission(context, android.Manifest.permission.POST_NOTIFICATIONS) != android.content.pm.PackageManager.PERMISSION_GRANTED
		com.stak.demo.ui.UserProfile.notificationsOn = notifications
		// The lock the toggle promises is real: enforced at the next launch (Codex review, PR #167 mirror).
		com.stak.demo.ui.UserProfile.accountLock = accountSecurity
		if (needsAsk) askNotifications.launch(android.Manifest.permission.POST_NOTIFICATIONS) else onContinue()
	}

	Artboard(modifier = Modifier.background(StakColors.Bg)) {
		Row(modifier = Modifier.fillMaxWidth().padding(horizontal = (20 * u).dp).padding(top = (10 * u).dp, bottom = (4 * u).dp)) {
			AuthBackCircle(onClick = onBack)
		}
		OnboardingKicker(text = "STEP · ALMOST THERE")

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
					text = "Stay in the loop",
					style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (26 * u).sp),
					color = StakColors.TextPrimary,
				)
				Text(
					text = "Two quick permissions so STAK can alert you and keep your account secure.",
					style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (12 * u).sp),
					color = Auth.SubtitleGray,
					modifier = Modifier.width((276 * u).dp),
				)
			}

			PermissionCard(
				title = "Notifications",
				description = "Price moves on your picks and your daily deck.",
				checked = notifications,
				onToggle = { notifications = !notifications },
			)
			PermissionCard(
				title = "Account security",
				// The frame says Face ID; on Android that is fingerprint or face unlock (product audit, 2026-09-05).
				description = "Fingerprint or face unlock keeps your account locked to you.",
				checked = accountSecurity,
				onToggle = { accountSecurity = !accountSecurity },
			)

			Text(
				text = "You can change these anytime in Settings.",
				style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (11 * u).sp),
				color = Auth.FaintText,
			)
		}

		Column(
			verticalArrangement = Arrangement.spacedBy((10 * u).dp),
			modifier = Modifier.fillMaxWidth().padding(top = (8 * u).dp, bottom = (26 * u).dp),
		) {
			AuthCta(text = "Allow and continue", onClick = { allowAndContinue() })
			AuthSecondaryButton(text = "Not now", onClick = { com.stak.demo.ui.UserProfile.notificationsOn = false; com.stak.demo.ui.UserProfile.accountLock = false; onContinue() })
		}
	}
}

/** The "STEP · …" kicker row — Geist Medium 10, 1.2 tracking, #5c6b85. */
@Composable
internal fun OnboardingKicker(text: String) {
	val u = figmaUnit()
	Text(
		text = text,
		style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (10 * u).sp, letterSpacing = (1.2 * u).sp),
		color = Auth.FaintText,
		modifier = Modifier.padding(horizontal = (20 * u).dp).padding(top = (6 * u).dp),
	)
}

/** One permission row — #181f30 r14 card, copy column + the 42x24 toggle. */
@Composable
internal fun PermissionCard(title: String, description: String, checked: Boolean, onToggle: () -> Unit) {
	val u = figmaUnit()
	Row(
		horizontalArrangement = Arrangement.spacedBy((12 * u).dp),
		verticalAlignment = Alignment.CenterVertically,
		modifier = Modifier
			.fillMaxWidth()
			.background(Auth.InputBg, RoundedCornerShape((14 * u).dp))
			.padding((16 * u).dp),
	) {
		Column(verticalArrangement = Arrangement.spacedBy((4 * u).dp), modifier = Modifier.weight(1f)) {
			Text(
				text = title,
				style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (14 * u).sp),
				color = StakColors.TextPrimary,
			)
			Text(
				text = description,
				style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (11 * u).sp),
				color = Auth.SubtitleGray,
			)
		}
		StakToggle(checked = checked, onToggle = onToggle, label = title)
	}
}

/** 42x24 Figma toggle — #2c9dbc track when on, white 18dp thumb 3dp from the edge. */
@Composable
internal fun StakToggle(checked: Boolean, onToggle: () -> Unit, label: String? = null) {
	val u = figmaUnit()
	val track by animateColorAsState(if (checked) Color(0xFF2C9DBC) else Color(0xFF242B3D), label = "track")
	val thumbOffset by animateDpAsState(if (checked) (21 * u).dp else (3 * u).dp, label = "thumb")
	Box(
		modifier = Modifier
			.size((42 * u).dp, (24 * u).dp)
			.background(track, RoundedCornerShape((12 * u).dp))
			.clickable(
				interactionSource = remember { MutableInteractionSource() },
				indication = com.stak.demo.ui.theme.PressDim,
				onClick = onToggle,
			)
			// TalkBack reads the row it switches (mirrors the iOS review fix, PR #167).
			.semantics {
				role = Role.Switch
				if (label != null) contentDescription = label
				stateDescription = if (checked) "On" else "Off"
			},
	) {
		Box(
			modifier = Modifier
				.align(Alignment.CenterStart)
				.offset(x = thumbOffset)
				.size((18 * u).dp)
				.background(Color.White, CircleShape),
		)
	}
}
