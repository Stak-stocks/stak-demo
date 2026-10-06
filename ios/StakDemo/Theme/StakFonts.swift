import SwiftUI

/// Bundled brand faces — static instances cut from the same Sora/Geist
/// variable fonts the Android app ships, plus Squarish Sans CT for the
/// wordmark. PostScript names are baked into the TTF name tables
/// (Sora-SemiBold, Geist-Medium, SquarishSansCTRegular, …) and listed in
/// Info.plist under UIAppFonts.
enum StakFont {
	enum Weight: String {
		case light = "Light"
		case regular = "Regular"
		case medium = "Medium"
		case semiBold = "SemiBold"
		case bold = "Bold"
	}

	/// Sora — the UI face across the app (headlines, buttons, tab labels).
	static func sora(_ size: CGFloat, _ weight: Weight = .regular) -> Font {
		.custom("Sora-\(weight.rawValue)", size: size, relativeTo: scaleStyle(size))
	}

	/// Geist — the in-app data/UI face (body copy, captions, inputs).
	static func geist(_ size: CGFloat, _ weight: Weight = .regular) -> Font {
		.custom("Geist-\(weight.rawValue)", size: size, relativeTo: scaleStyle(size))
	}

	/// Which text style's curve a size grows on with the Text Size setting. Body for reading sizes; headings and big
	/// figures on Apple's heading curves, which grow far less at the largest settings (a 38 hero figure would
	/// otherwise reach ~74pt) - as Android 14 scales large text less than small. `typeScale` (the boxes) follows Body,
	/// the largest growth, so a heading's box is never too small for it.
	private static func scaleStyle(_ size: CGFloat) -> Font.TextStyle {
		let designSize = size / figmaUnit
		if designSize >= 28 { return .largeTitle }
		if designSize >= 20 { return .title2 }
		return .body
	}

	/// Inter — the authored tab-bar label face (static Regular instance cut
	/// from the same variable font the Android app ships).
	static func inter(_ size: CGFloat) -> Font {
		.custom("Inter-Regular", size: size)
	}

	/// Squarish Sans CT — display face for the STAK wordmark / big numerals.
	static func squarish(_ size: CGFloat, smallCaps: Bool = false) -> Font {
		.custom(smallCaps ? "SquarishSansCTRegularSC" : "SquarishSansCTRegular", size: size)
	}
}

/// How far the user's Text Size setting scales text: 1 at the default size (Large), so every authored layout is
/// exactly as designed, and up to 33/17 at Accessibility 2 - the app's ceiling (StakDemoApp caps Dynamic Type there),
/// close to Android's 200% font-scale maximum. The bundled fonts (`Font.custom(_:size:)`) already scale with the
/// setting, relative to Body; this is the same factor for the things around them - line heights, and the fixed boxes
/// text sits in (buttons, chips, rows, pinned line boxes) - so larger text grows its box instead of being clipped.
/// Icons, photos and spacing stay put, as in Apple's own apps.
/// Read hundreds of times per render (every `stakLineHeight` and text box), so it's worked out once per Text Size
/// setting, not on each read. It's Observable: a view that read it is redrawn when the setting changes - in place,
/// keeping its state (an earlier rebuild of the whole app replayed the splash and lost a sign-up in progress).
/// Not `textScale`: inside a view that name resolves to SwiftUI's own `textScale(_:isEnabled:)` modifier (iOS 17).
var typeScale: CGFloat { TextScale.shared.current }

@Observable
final class TextScale {
	static let shared = TextScale()

	/// Body text's size at the setting over its size at the default - the factor `Font.custom(_:size:)` applies,
	/// computed with the same UIFontMetrics, so the boxes grow exactly as the fonts do. Never below 1: at the Smaller
	/// settings the text shrinks but its boxes keep their designed size (and tap targets their 44pt).
	private(set) var current: CGFloat = 1

	/// Set from SwiftUI's own Dynamic Type size (already capped at Accessibility 2 by StakDemoApp).
	func update(_ size: DynamicTypeSize) {
		let traits = UITraitCollection(preferredContentSizeCategory: Self.category(size))
		let scale = max(1, UIFontMetrics(forTextStyle: .body).scaledValue(for: 17, compatibleWith: traits) / 17)
		if scale != current { current = scale }
	}

	private static func category(_ size: DynamicTypeSize) -> UIContentSizeCategory {
		switch size {
		case .xSmall: return .extraSmall
		case .small: return .small
		case .medium: return .medium
		case .large: return .large
		case .xLarge: return .extraLarge
		case .xxLarge: return .extraExtraLarge
		case .xxxLarge: return .extraExtraExtraLarge
		case .accessibility1: return .accessibilityMedium
		case .accessibility2: return .accessibilityLarge
		case .accessibility3: return .accessibilityExtraLarge
		case .accessibility4: return .accessibilityExtraExtraLarge
		case .accessibility5: return .accessibilityExtraExtraExtraLarge
		@unknown default: return .large
		}
	}
}

/// The bundled faces' natural (font-designed) line height as a multiple of the
/// point size, measured on the shipped static instances (2026-09-04): the
/// hhea ascender + |descender| + lineGap over unitsPerEm, which is the pitch
/// SwiftUI lays a single line out at. Weight cuts of a face share the metric.
enum StakFace {
	case sora, geist, inter

	var naturalLineHeightFactor: CGFloat {
		switch self {
		case .sora: return 1.26
		case .geist: return 1.30
		case .inter: return 1.21
		}
	}
}

extension View {
	/// Lays a text run out at its authored Figma line height.
	///
	/// SwiftUI's `.lineSpacing(_:)` is ADDITIVE over the face's natural line
	/// height - it does not set the pitch. The old `.lineSpacing((L - S) * u)`
	/// form therefore rendered `natural(S) + (L - S)` per line: a Geist 12 run
	/// authored at 16 came out at 15.6 + 4 = 19.6, so every multi-line
	/// paragraph ran ~3-4 pt per line too loose (proven on Home, 2026-09-04).
	/// The correct extra is `L - natural(face, S)`, clamped at zero.
	///
	/// Residual: additive spacing cannot go negative, so an authored pitch
	/// BELOW the natural height keeps the natural height - Geist 11 at 14
	/// renders 14.3, Geist 12 at 15 renders 15.6, Sora 20 at 25 renders 25.2,
	/// Sora 26 at 31 renders 32.76. Those sites are flagged, not hacked.
	///
	/// Figma's line box (2026-09-04, measured on Android vs the 2x export of
	/// 1:1495 and mirrored here): a block is exactly lines x L with the extra
	/// leading split evenly above and below EVERY line, the first and last
	/// included - the cap-top of Sora 20 at L 32 sits 8.2 below the box top
	/// (3.4 half-leading + 4.8 ascender-to-cap). `.lineSpacing` alone put the
	/// extra only between lines, so every block ran (L - natural) short and
	/// long pages crept upward; the half-leading padding restores the box.
	///
	/// - Parameters:
	///   - lineHeight: the authored line height, already scaled (`L * u`).
	///   - size: the point size the preceding `.font(...)` set, already scaled (`S * u`).
	///   - face: the bundled face that `.font(StakFont.<face>(...))` used.
	func stakLineHeight(_ lineHeight: CGFloat, size: CGFloat, face: StakFace) -> some View {
		// The text is drawn at `size * typeScale` (Dynamic Type), so the authored line height scales with it.
		let extra = max(0, lineHeight - size * face.naturalLineHeightFactor) * typeScale
		return lineSpacing(extra).padding(.vertical, extra / 2)
	}
}
