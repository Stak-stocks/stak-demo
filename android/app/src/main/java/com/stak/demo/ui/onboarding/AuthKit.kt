package com.stak.demo.ui.onboarding

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.graphics.nativeCanvas
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.stak.demo.R
import com.stak.demo.ui.theme.Geist
import com.stak.demo.ui.theme.StakColors
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.statusBarsPadding

/**
 * Shared pieces of the Figma "Auth ·" screens (Sign up 1554:9126,
 * Sign in 1554:11288) — palette, watermark, nav circle, social pills,
 * inputs, the sharp-cornered gradient CTA and the switch link row.
 */
internal object Auth {
	val NavCircle = Color(0xFF192238)
	val SubtitleGray = Color(0xFFACAFB1)
	val InputBg = Color(0xFF181F30)
	val DividerLine = Color(0xFF2A3346)
	val FaintText = Color(0xFF5C6B85)
	/** Inline validation red (the app's negative tone). */
	val ErrorRed = Color(0xFFE5484D)
	val LinkTeal = Color(0xFF69B3CA)
	val DarkOnWhite = Color(0xFF0E162B)
}

/**
 * Figma-artboard scale: 1 design px = `figmaUnit()` dp. The CHINEDU
 * frames are fixed 390dp artboards; fixed compositions (hero renders,
 * the swipe deck) multiply by this so their proportions hold on wider
 * devices (e.g. the 411dp Pixel 7) instead of shrinking relative to
 * the screen. Text/paddings stay plain dp.
 */
@Composable
internal fun figmaUnit(): Float {
	// Configuration.screenWidthDp is an INTEGER (411 on a 1080/2.625 Pixel 7
	// whose true width is 411.43dp) — that 0.1% shortfall compounds to a
	// few px over a full-height artboard. Derive u from the real pixel width.
	val dm = androidx.compose.ui.platform.LocalContext.current.resources.displayMetrics
	return dm.widthPixels / dm.density / 390f
}

/**
 * Frame-exact vertical composition (user ruling 2026-08-30, "just what's
 * on the Figma design"): every onboarding/auth frame is a 390x844
 * artboard whose bottom-anchored CTA block is authored against the
 * frame's bottom edge (the 44 status bar + 800 of content, the home
 * indicator zone INSIDE the authored bottom padding). Taller phones
 * used to stretch that column to the screen, pushing the CTA ~22 frame
 * px below its authored spot; this pins the column to the authored 800u
 * below the real status bar and leaves the surplus (the gesture zone)
 * under it. Screens shorter than the artboard fall back to filling.
 */
@Composable
internal fun Artboard(modifier: Modifier = Modifier, content: @Composable ColumnScope.() -> Unit) {
	val u = figmaUnit()
	BoxWithConstraints(modifier = modifier.fillMaxSize().statusBarsPadding()) {
		val h = if ((800 * u).dp < maxHeight) (800 * u).dp else maxHeight
		Column(modifier = Modifier.fillMaxWidth().height(h), content = content)
	}
}

/** 10%-alpha glass ball rotated 174.3°, centered 10dp left / 159.8dp below screen center. */
@Composable
internal fun BoxScope.AuthWatermark() {
	val u = figmaUnit()
	// The authored node render (1:831): the tilt AND the 10% opacity are
	// baked into the asset. Fitted pose: 364u square, center 185.6/582.2,
	// no rotation. Top-anchored so taller devices don't sink it.
	Image(
		painter = painterResource(R.drawable.auth_watermark),
		contentDescription = null,
		modifier = Modifier
			.size((364 * u).dp)
			.align(Alignment.TopCenter)
			.offset(x = (-9.37 * u).dp, y = (400.16 * u).dp),
	)
}

/** 40dp #192238 circle with the #AEAEAE back chevron. */
@Composable
internal fun AuthBackCircle(onClick: () -> Unit, modifier: Modifier = Modifier) {
	val u = figmaUnit()
	Box(
		modifier = modifier
			.size((40 * u).dp)
			.background(Auth.NavCircle, CircleShape)
			.clickable(
				interactionSource = remember { MutableInteractionSource() },
				indication = com.stak.demo.ui.theme.PressDim,
				onClick = onClick,
			),
		contentAlignment = Alignment.Center,
	) {
		Image(
			painter = painterResource(R.drawable.ic_back_chevron),
			contentDescription = "Back",
			modifier = Modifier.size((22 * u).dp),
		)
	}
}

/** White social pill — radius 24, 13dp vertical padding, 18dp brand mark. */
@Composable
internal fun SocialPill(text: String, iconRes: Int, onClick: () -> Unit) {
	val u = figmaUnit()
	Row(
		horizontalArrangement = Arrangement.spacedBy((10 * u).dp, Alignment.CenterHorizontally),
		verticalAlignment = Alignment.CenterVertically,
		modifier = Modifier
			.fillMaxWidth()
			.background(Color.White, RoundedCornerShape((24 * u).dp))
			.clickable(onClick = onClick)
			.padding(vertical = (13 * u).dp),
	) {
		Image(painter = painterResource(iconRes), contentDescription = null, modifier = Modifier.size((18 * u).dp))
		Text(
			text = text,
			style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (14 * u).sp),
			color = Auth.DarkOnWhite,
		)
	}
}

/** The 1px #2a3346 "or" divider row. */
@Composable
internal fun AuthOrDivider() {
	val u = figmaUnit()
	Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy((10 * u).dp)) {
		Box(modifier = Modifier.weight(1f).height((1 * u).dp).background(Auth.DividerLine))
		Text(
			text = "or",
			style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (11 * u).sp),
			color = Auth.FaintText,
		)
		Box(modifier = Modifier.weight(1f).height((1 * u).dp).background(Auth.DividerLine))
	}
}

/** Auth input — #181f30, radius 14, 16dp padding, Geist 13, optional trailing. */
@Composable
internal fun AuthInput(
	value: String,
	onValueChange: (String) -> Unit,
	placeholder: String,
	keyboardType: KeyboardType = KeyboardType.Text,
	hidden: Boolean = false,
	trailing: (@Composable () -> Unit)? = null,
	/** Inline validation (product audit, 2026-09-05): a red hairline and a caption under the field. */
	error: String? = null,
) {
	val u = figmaUnit()
	val textStyle = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (13 * u).sp, color = StakColors.TextPrimary)
	Column(verticalArrangement = Arrangement.spacedBy((6 * u).dp)) {
	Row(
		verticalAlignment = Alignment.CenterVertically,
		modifier = Modifier
			.fillMaxWidth()
			.background(Auth.InputBg, RoundedCornerShape((14 * u).dp))
			.then(if (error != null) Modifier.border((1 * u).dp, Auth.ErrorRed, RoundedCornerShape((14 * u).dp)) else Modifier)
			.padding((16 * u).dp),
	) {
		Box(modifier = Modifier.weight(1f)) {
			if (value.isEmpty()) {
				Text(text = placeholder, style = textStyle, color = StakColors.Muted)
			}
			BasicTextField(
				value = value,
				onValueChange = onValueChange,
				textStyle = textStyle,
				singleLine = true,
				cursorBrush = SolidColor(StakColors.Accent),
				visualTransformation = if (hidden) PasswordVisualTransformation() else VisualTransformation.None,
				keyboardOptions = KeyboardOptions(keyboardType = keyboardType),
				// The placeholder is the field's accessible name (screen readers and UI tests).
				modifier = Modifier.fillMaxWidth().semantics { contentDescription = placeholder },
			)
		}
		if (trailing != null) {
			trailing()
		}
	}
	if (error != null) {
		Text(
			text = error,
			style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (11 * u).sp),
			color = Auth.ErrorRed,
			modifier = Modifier.padding(start = (4 * u).dp),
		)
	}
	}
}

/** The sign-up / sign-in field rules (product audit, 2026-09-05). Mirrors ios AuthRules. */
internal object AuthRules {
	private val EMAIL = Regex("[^@\\s]+@[^@\\s]+\\.[^@\\s]{2,}")
	const val PASSWORD_MIN = 8

	fun emailError(email: String): String? = when {
		email.isBlank() -> "Enter your email address"
		!EMAIL.matches(email.trim()) -> "That doesn’t look like an email address"
		else -> null
	}

	fun passwordError(password: String): String? = when {
		password.isEmpty() -> "Enter your password"
		password.length < PASSWORD_MIN -> "Use at least $PASSWORD_MIN characters"
		else -> null
	}

	fun confirmError(password: String, confirm: String): String? = when {
		confirm.isEmpty() -> "Confirm your password"
		confirm != password -> "Passwords don’t match"
		else -> null
	}
}

/** The teal Show/Hide toggle used inside password inputs. */
@Composable
internal fun ShowHideToggle(shown: Boolean, onToggle: () -> Unit) {
	val u = figmaUnit()
	Text(
		text = if (shown) "Hide" else "Show",
		style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (11 * u).sp),
		color = Auth.LinkTeal,
		modifier = Modifier.clickable(
			interactionSource = remember { MutableInteractionSource() },
			indication = com.stak.demo.ui.theme.PressDim,
			onClick = onToggle,
		),
	)
}

/** Sharp-cornered 52dp CTA — 3-stop a6e4f7/5da8bf/3c98b4 gradient, white Geist Medium 14 (CHINEDU 1:873). */
@Composable
internal fun AuthCta(text: String, enabled: Boolean = true, onClick: () -> Unit) {
	val u = figmaUnit()
	Box(
		modifier = Modifier
			.fillMaxWidth()
			.padding(horizontal = (20 * u).dp)
			.height((52 * u).dp)
			// A gated step (no picks / no answer / no name) shows the CTA at half
			// strength - glow, fill and label alike - and swallows the tap
			// (product audit, 2026-09-05). alpha() only dims what is drawn AFTER
			// it in the chain, so it sits before the glow and the fill.
			.alpha(if (enabled) 1f else 0.5f)
			// Authored glow (1:873): teal drop shadows cast downward — the
			// soft wash behind the rows under the button.
			.drawBehind {
				val r = (6 * u).dp.toPx()
				val fw = drawContext.canvas.nativeCanvas
				val paint = android.graphics.Paint().apply { isAntiAlias = true }
				for ((dy, blur, a) in listOf(
					Triple(28.18f, 8.31f, 0.03f),
					Triple(49.86f, 9.76f, 0.01f),
				)) {
					paint.color = android.graphics.Color.argb((a * 255).toInt(), 82, 170, 199)
					paint.maskFilter = android.graphics.BlurMaskFilter((blur * u).dp.toPx(), android.graphics.BlurMaskFilter.Blur.NORMAL)
					fw.drawRoundRect(0f, (dy * u).dp.toPx(), size.width, (dy * u).dp.toPx() + size.height, r, r, paint)
				}
			}
			.background(
				Brush.verticalGradient(
					0.0889f to Color(0xFFA6E4F7),
					0.3919f to Color(0xFF5DA8BF),
					0.7255f to Color(0xFF3C98B4),
					1f to Color(0xFF3C98B4),
				),
				RoundedCornerShape((6 * u).dp),
			)
			.border((0.36 * u).dp, StakColors.CtaBorderBrush, RoundedCornerShape((6 * u).dp))
			.clickable(enabled = enabled, onClick = onClick),
		contentAlignment = Alignment.Center,
	) {
		Text(
			text = text,
			style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (14 * u).sp),
			color = StakColors.TextPrimary,
		)
	}
}

/** Secondary flow button — h52, r6, rgba(52,59,79,0.33) hairline, Sora 14 muted (CHINEDU 1:791). */
@Composable
internal fun AuthSecondaryButton(text: String, onClick: () -> Unit) {
	val u = figmaUnit()
	Box(
		modifier = Modifier
			.fillMaxWidth()
			.padding(horizontal = (20 * u).dp)
			.height((52 * u).dp)
			.border((0.36 * u).dp, Color(0x54343B4F), RoundedCornerShape((6 * u).dp))
			.clickable(onClick = onClick),
		contentAlignment = Alignment.Center,
	) {
		Text(
			text = text,
			style = TextStyle(fontFamily = com.stak.demo.ui.theme.Sora, fontWeight = FontWeight.Normal, fontSize = (14 * u).sp),
			color = StakColors.Muted,
		)
	}
}

/** "Already have an account? Sign in" / "New to STAK? Create account" row. */
@Composable
internal fun AuthSwitchRow(prefix: String, link: String, onClick: () -> Unit) {
	val u = figmaUnit()
	Row(horizontalArrangement = Arrangement.spacedBy((5 * u).dp), verticalAlignment = Alignment.CenterVertically) {
		Text(
			text = prefix,
			style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (12 * u).sp),
			color = StakColors.Muted,
		)
		Text(
			text = link,
			style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (12 * u).sp),
			color = Auth.LinkTeal,
			modifier = Modifier.clickable(
				interactionSource = remember { MutableInteractionSource() },
				indication = com.stak.demo.ui.theme.PressDim,
				onClick = onClick,
			),
		)
	}
}
