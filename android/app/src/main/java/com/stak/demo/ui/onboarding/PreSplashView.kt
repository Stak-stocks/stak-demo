package com.stak.demo.ui.onboarding

import android.annotation.SuppressLint
import android.content.Context
import android.graphics.Color
import android.util.TypedValue
import android.view.Gravity
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import androidx.annotation.FontRes
import androidx.core.content.res.ResourcesCompat
import com.stak.demo.R
import kotlin.math.roundToInt

/**
 * The 00 Splash frame (Figma 1:926) drawn with plain views — the app's FIRST frame.
 *
 * Android 12+ keeps the OS launch window up (a flat navy blank; the user ruled
 * out an icon on it, 2026-09-05) until the activity draws its first frame. That
 * frame used to wait for the Compose runtime to load and compose, which is
 * seconds in a debug build, so the blank lingered. These views draw within
 * milliseconds of the activity's creation, then [SplashScreen] takes over with
 * the same geometry, so the hand-off is invisible and the user only ever sees
 * the 00 Splash. Every number is SplashScreen's: a 390x844 canvas anchored to
 * the top, scaled uniformly to the screen width about its top-centre.
 */
class PreSplashView(context: Context) : FrameLayout(context) {
	private val density = resources.displayMetrics.density
	private fun px(dp: Double): Float = (dp * density).toFloat()
	private fun ipx(dp: Double): Int = px(dp).roundToInt()

	private val canvas = FrameLayout(context).apply {
		layoutParams = LayoutParams(ipx(390.0), ipx(844.0), Gravity.TOP or Gravity.CENTER_HORIZONTAL)
		pivotX = px(390.0) / 2f
		pivotY = 0f

		// Glass ball — 394 square rotated 48.43°, top-left (183.8, 23).
		addView(ImageView(context).apply {
			setImageResource(R.drawable.splash_glass_ball)
			scaleType = ImageView.ScaleType.FIT_XY
			layoutParams = LayoutParams(ipx(394.0), ipx(394.0))
			// Whole pixels, like Compose's offset() rounds them.
			translationX = ipx(183.8).toFloat()
			translationY = ipx(23.0).toFloat()
			rotation = 48.43f
		})

		// Logo mark / 37 / "Welcome to STAK" / 10 / subtitle, centred, at (0.3, 334.49).
		addView(LinearLayout(context).apply {
			orientation = LinearLayout.VERTICAL
			gravity = Gravity.CENTER_HORIZONTAL
			layoutParams = LayoutParams(
				LayoutParams.WRAP_CONTENT, LayoutParams.WRAP_CONTENT, Gravity.TOP or Gravity.CENTER_HORIZONTAL,
			)
			translationX = ipx(0.3).toFloat()
			translationY = ipx(334.49).toFloat()
			addView(ImageView(context).apply {
				setImageResource(R.drawable.ic_stak_logo_mark)
				contentDescription = "STAK"
				layoutParams = LinearLayout.LayoutParams(ipx(49.43), ipx(49.43))
			})
			addView(text("Welcome to STAK", R.font.sora_semibold, 29.87f, 1f, topDp = 37.0))
			addView(text("The stock market finally speaks\nyour language", R.font.geist_light, 16f, 0.7f, topDp = 10.0))
		})
	}

	init {
		setBackgroundColor(BG)
		addView(canvas)
	}

	override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
		super.onSizeChanged(w, h, oldw, oldh)
		// SplashScreen: scale = maxWidth / 390.dp about the canvas's top-centre.
		val scale = w / px(390.0)
		canvas.scaleX = scale
		canvas.scaleY = scale
	}

	// The copy is the authored frame's, identical to SplashScreen's literals.
	@SuppressLint("SetTextI18n")
	private fun text(copy: String, @FontRes font: Int, sizeSp: Float, alpha: Float, topDp: Double): TextView =
		TextView(context).apply {
			text = copy
			typeface = ResourcesCompat.getFont(context, font)
			setTextSize(TypedValue.COMPLEX_UNIT_SP, sizeSp)
			setTextColor(Color.WHITE)
			this.alpha = alpha
			gravity = Gravity.CENTER_HORIZONTAL
			includeFontPadding = false // Compose Text's default; keeps the same line box
			layoutParams = LinearLayout.LayoutParams(
				LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT,
			).apply { topMargin = ipx(topDp) }
		}

	private companion object {
		/** StakColors.Bg — a plain int so this view never touches Compose. */
		const val BG = 0xFF0A1020.toInt()
	}
}
