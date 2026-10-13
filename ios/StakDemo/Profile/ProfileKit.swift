import SwiftUI

/// The 08 · Profile / 10 · Notifications page language (Chinedu_Mobile, 2026-10-07):
/// a fixed 100-tall top nav (44 status + 56 bar), #10182B r16 cards of 48-tall rows,
/// Geist Medium 11 section labels, Geist 12 captions. Mirrors android ui/profile/ProfileKit.kt.
enum Prof {
	static let cardBg = Color(argb: 0xFF10182B)
	static let muted = Color(argb: 0xFF819ABB)
	static let body = Color(argb: 0xFFC8D2E0)
	/// The section's accent: the Edit link, "Change ›", the avatar ring, the unread dot (1:5731 / 1:5753 / 1:5668 / 1:5936).
	static let accent = Color(argb: 0xFF66B7DA)
	static let red = Color(argb: 0xFFE5484D)
	static let avatarBg = Color(argb: 0xFF242B3D)
	static let avatarInk = Color(argb: 0xFF9EADC7)
	static let inputBg = Color(argb: 0xFF181F30)
	/// Log out / secondary hairline: rgba(52,59,79,0.33) at 0.361.
	static let hairline = Color(argb: 0x54343B4F)
}

/// The fixed top nav: back circle at x20 y8, the title at x168 (the Profile frames author the
/// title's LEFT edge there - "Profile" happens to centre, "Taste & risk" / "Edit profile" sit
/// 20 right of centre; `centred` is the Notifications frames' true-centred title), an optional
/// trailing link 20 from the right edge. The content below starts at the nav's bottom.
struct ProfilePageScaffold<Content: View, Trailing: View>: View {
	let title: String
	let onBack: () -> Void
	var centred: Bool = false
	@ViewBuilder let trailing: () -> Trailing
	@ViewBuilder let content: () -> Content

	var body: some View {
		let u = figmaUnit
		VStack(spacing: 0) {
			ZStack {
				HStack {
					AuthBackCircle(action: onBack)
					Spacer()
				}
				.padding(.leading, 20 * u)
				if centred {
					Text(title)
						.font(StakFont.sora(16 * u, .semiBold))
						.foregroundStyle(StakColors.textPrimary)
				} else {
					HStack {
						Text(title)
							.font(StakFont.sora(16 * u, .semiBold))
							.foregroundStyle(StakColors.textPrimary)
							.padding(.leading, 168 * u)
						Spacer()
					}
				}
				HStack {
					Spacer()
					trailing()
				}
				.padding(.trailing, 20 * u)
			}
			.frame(maxWidth: .infinity)
			.frame(height: 56 * u)
			content()
		}
		.frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
		.background(StakColors.bg.ignoresSafeArea())
	}
}

extension ProfilePageScaffold where Trailing == EmptyView {
	init(title: String, onBack: @escaping () -> Void, centred: Bool = false, @ViewBuilder content: @escaping () -> Content) {
		self.init(title: title, onBack: onBack, centred: centred, trailing: { EmptyView() }, content: content)
	}
}

/// "YOUR STAK" / "ACCOUNT" / "SECURITY": Geist Medium 11 on a 14 box, full width.
struct SectionLabel: View {
	let text: String
	var body: some View {
		let u = figmaUnit
		Text(text)
			.font(StakFont.geist(11 * u, .medium))
			.stakLineHeight(14 * u, size: 11 * u, face: .geist)
			.foregroundStyle(Prof.muted)
			.frame(maxWidth: .infinity, alignment: .leading)
	}
}

/// Geist 12 on a 16 box, muted - the captions under the Taste & risk cards and the Edit page's footnote.
struct ProfileCaption: View {
	let text: String
	var color: Color = Prof.muted
	var body: some View {
		let u = figmaUnit
		Text(text)
			.font(StakFont.geist(12 * u))
			.stakLineHeight(16 * u, size: 12 * u, face: .geist)
			.foregroundStyle(color)
			.frame(maxWidth: .infinity, alignment: .leading)
	}
}

/// The #10182B r16 card with its 4 vertical inset ("Settings card").
struct ProfileCard<Content: View>: View {
	@ViewBuilder let content: () -> Content
	var body: some View {
		let u = figmaUnit
		VStack(spacing: 0) { content() }
			.padding(.vertical, 4 * u)
			.frame(maxWidth: .infinity)
			.background(Prof.cardBg, in: RoundedRectangle(cornerRadius: 16 * u))
	}
}

/// One 48-tall card row: an optional 20 icon + 10 gap, the Geist Medium 13 label, then either a
/// Geist 14 value that carries its own "  ›" (YOUR STAK rows, 1:5675) or the bare "›" chevron
/// (ACCOUNT rows, 1:5689). `valueColor` is the accent for the Taste & risk page's "Change  ›".
struct ProfileRow: View {
	let label: String
	var value: String? = nil
	var icon: String? = nil
	var valueColor: Color = Prof.muted
	var horizontalPadding: CGFloat = 14
	let action: () -> Void

	var body: some View {
		let u = figmaUnit
		Button(action: action) {
			HStack(spacing: 0) {
				if let icon {
					Image(icon)
						.resizable()
						.frame(width: 20 * u, height: 20 * u)
					Spacer().frame(width: 10 * u)
				}
				Text(label)
					.font(StakFont.geist(13 * u, .medium))
					.foregroundStyle(StakColors.textPrimary)
				Spacer()
				Text(value.map { "\($0)  ›" } ?? "›")
					.font(StakFont.geist(14 * u))
					.foregroundStyle(value == nil ? Prof.muted : valueColor)
					.lineLimit(1)
					.fixedSize(horizontal: true, vertical: false)
			}
			.padding(.horizontal, horizontalPadding * u)
			.frame(maxWidth: .infinity)
			.frame(height: 48 * u)
			.contentShape(Rectangle())
		}
		.buttonStyle(.pressDim)
	}
}

/// The page column under the nav: 16 below it, 20 side gutters, 16 between items, 40 at the bottom.
struct ProfileContent<Content: View>: View {
	var alignment: HorizontalAlignment = .leading
	@ViewBuilder let content: () -> Content
	var body: some View {
		let u = figmaUnit
		ScrollView(showsIndicators: false) {
			VStack(alignment: alignment, spacing: 16 * u) { content() }
				.frame(maxWidth: .infinity)
				.padding(.horizontal, 20 * u)
				.padding(.top, 16 * u)
				.padding(.bottom, 40 * u)
		}
	}
}
