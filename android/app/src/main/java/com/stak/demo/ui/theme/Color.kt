package com.stak.demo.ui.theme

import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color

/**
 * STAK design tokens — exact values from the Figma app design
 * (file tzBCgpuPAFGnipu7NtwH3z, sections "STAK · Components" / app screens).
 */
object StakColors {
	/** Screen background. */
	val Bg = Color(0xFF0A1020)

	/** Card / tab-bar surface. */
	val Surface = Color(0xFF10172A)

	/** Raised surface: inputs, social buttons, secondary buttons. */
	val SurfaceAlt = Color(0xFF172037)

	/** Teal accent: active tab, links, ghost buttons. */
	val Accent = Color(0xFF39C5CB)

	/** Deep accent blue (borders, secondary emphasis). */
	val AccentBlue = Color(0xFF2C9DBC)

	/** Muted blue-gray: secondary text, placeholders, inactive tabs. */
	val Muted = Color(0xFF819ABB)

	val TextPrimary = Color.White
	/** rgba(255,255,255,0.62) body copy on cards. */
	val TextDim = Color(0x9EFFFFFF)
	/** rgba(255,255,255,0.4) fine print. */
	val TextFaint = Color(0x66FFFFFF)
	val TextSoft = Color(0xFFF5F1F1)

	/** Gains green (▲) from the tab screens. */
	val Positive = Color(0xFF2FD08A)

	/** 1px hairline: rgba(255,255,255,0.08). */
	val Divider = Color(0x14FFFFFF)
	/** rgba(255,255,255,0.1) borders on social buttons. */
	val BorderSoft = Color(0x1AFFFFFF)
	/** rgba(255,255,255,0.12) "or" divider strips. */
	val BorderMid = Color(0x1FFFFFFF)

	/** Primary CTA gradient (#a9dbea → #3c98b4, mid stop 44%). */
	val CtaGradTop = Color(0xFFA9DBEA)
	val CtaGradBottom = Color(0xFF3C98B4)
	/** rgba(101,158,173,0.63) border on the landing-style pill button. */
	val CtaBorder = Color(0xA1659EAD)
	// Authored CTA hairline (1:921 Inspect): a vertical gradient
	// #659EAD@63% -> #16363F@43%, border 0.36 outside.
	val CtaBorderBrush = Brush.verticalGradient(
		0f to Color(0xA1659EAD),
		1f to Color(0x6E16363F),
	)
	/** rgba(44,157,188,0.45) border on secondary pill buttons. */
	val CtaSecondaryBorder = Color(0x732C9DBC)
	/** rgba(82,170,199,x) glow behind primary CTAs. */
	val CtaGlow = Color(0xFF52AAC7)

	fun ctaGradient() = Brush.verticalGradient(
		0f to CtaGradTop,
		0.44f to CtaGradBottom,
		1f to CtaGradBottom,
	)
}
