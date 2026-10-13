import SwiftUI

extension Color {
	/// 0xAARRGGBB, matching the Android Compose literals verbatim.
	init(argb: UInt32) {
		self.init(
			.sRGB,
			red: Double((argb >> 16) & 0xFF) / 255,
			green: Double((argb >> 8) & 0xFF) / 255,
			blue: Double(argb & 0xFF) / 255,
			opacity: Double((argb >> 24) & 0xFF) / 255
		)
	}
}

/// STAK design tokens — exact values from the Figma app design.
/// Mirrors android/ StakColors (ui/theme/Color.kt); the app is dark-only
/// by design, so these are literal brand colors, not adaptive system ones.
enum StakColors {
	/// Screen background.
	static let bg = Color(argb: 0xFF0A1020)

	/// Card / tab-bar surface.
	static let surface = Color(argb: 0xFF10172A)

	/// Raised surface: inputs, social buttons, secondary buttons.
	static let surfaceAlt = Color(argb: 0xFF172037)

	/// Teal accent: active tab, links, ghost buttons.
	static let accent = Color(argb: 0xFF39C5CB)

	/// Deep accent blue (borders, secondary emphasis, the 08 toggles).
	static let accentBlue = Color(argb: 0xFF2C9DBC)

	/// Muted blue-gray: secondary text, placeholders, inactive tabs.
	static let muted = Color(argb: 0xFF819ABB)

	static let textPrimary = Color.white
	/// rgba(255,255,255,0.62) body copy on cards.
	static let textDim = Color(argb: 0x9EFFFFFF)
	/// rgba(255,255,255,0.4) fine print.
	static let textFaint = Color(argb: 0x66FFFFFF)
	static let textSoft = Color(argb: 0xFFF5F1F1)

	/// Gains green (▲) from the tab screens.
	static let positive = Color(argb: 0xFF2FD08A)

	/// 1px hairline: rgba(255,255,255,0.08).
	static let divider = Color(argb: 0x14FFFFFF)
	/// rgba(255,255,255,0.1) borders on social buttons.
	static let borderSoft = Color(argb: 0x1AFFFFFF)
	/// rgba(255,255,255,0.12) "or" divider strips.
	static let borderMid = Color(argb: 0x1FFFFFFF)

	/// Primary CTA gradient (#a9dbea → #3c98b4, mid stop 44%).
	static let ctaGradTop = Color(argb: 0xFFA9DBEA)
	static let ctaGradBottom = Color(argb: 0xFF3C98B4)
	/// rgba(101,158,173,0.63) border on the landing-style pill button.
	static let ctaBorder = Color(argb: 0xA1659EAD)
	/// Authored CTA hairline (1:921 Inspect): vertical gradient
	/// #659EAD@63% -> #16363F@43%, border 0.36 outside.
	static let ctaBorderGradient = LinearGradient(
		stops: [
			.init(color: Color(argb: 0xA1659EAD), location: 0),
			.init(color: Color(argb: 0x6E16363F), location: 1)
		],
		startPoint: .top, endPoint: .bottom
	)
	/// rgba(44,157,188,0.45) border on secondary pill buttons.
	static let ctaSecondaryBorder = Color(argb: 0x732C9DBC)
	/// rgba(82,170,199,x) glow behind primary CTAs.
	static let ctaGlow = Color(argb: 0xFF52AAC7)
}

/// Shared palette of the Figma "Auth ·" screens — mirrors android/ AuthKit.kt.
enum Auth {
	static let navCircle = Color(argb: 0xFF192238)
	static let subtitleGray = Color(argb: 0xFFACAFB1)
	static let inputBg = Color(argb: 0xFF181F30)
	static let dividerLine = Color(argb: 0xFF2A3346)
	static let faintText = Color(argb: 0xFF5C6B85)
	static let linkTeal = Color(argb: 0xFF69B3CA)
	static let darkOnWhite = Color(argb: 0xFF0E162B)
}
