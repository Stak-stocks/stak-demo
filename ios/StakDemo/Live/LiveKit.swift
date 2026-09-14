import SwiftUI

/// The Go live screens' shared pieces (FigJam Go live boards, 2026-09-14). No
/// frames exist for them, so they borrow the settings pages' language: the hub
/// header, #10182B r16 cards, Geist 13 labels, the auth kit's inputs and CTA.
/// Mirrors android ui/live/LiveKit.kt.
enum Live {
	static let cardBg = Color(argb: 0xFF10182B)
	static let muted = Color(argb: 0xFF819ABB)
	static let body = Color(argb: 0xFFC8D2E0)
	static let teal = Color(argb: 0xFF69B3CA)
	static let green = Color(argb: 0xFF2FD08A)
	static let red = Color(argb: 0xFFE5484D)
	static let amber = Color(argb: 0xFFFFB454)
	static let badgeBg = Color(argb: 0xFF242B3D)
	static let badgeInk = Color(argb: 0xFF9EADC7)
	static let sheetBg = Color(argb: 0xFF10172A)
}

/// A titled, scrolling page with the hub header.
struct LivePage<Content: View>: View {
	let title: String
	let onBack: () -> Void
	@ViewBuilder let content: () -> Content

	var body: some View {
		let u = figmaUnit
		SettingsScaffold(title: title, onBack: onBack) {
			ScrollView(showsIndicators: false) {
				VStack(alignment: .leading, spacing: 12 * u) { content() }
					.frame(maxWidth: .infinity, alignment: .leading)
					.padding(.horizontal, 20 * u)
					.padding(.bottom, 26 * u)
			}
		}
	}
}

struct LiveCard<Content: View>: View {
	@ViewBuilder let content: () -> Content

	var body: some View {
		let u = figmaUnit
		VStack(alignment: .leading, spacing: 8 * u) { content() }
			.frame(maxWidth: .infinity, alignment: .leading)
			.padding(16 * u)
			.background(Live.cardBg, in: RoundedRectangle(cornerRadius: 16 * u))
	}
}

struct LiveKicker: View {
	let text: String
	var color: Color = Live.teal
	var body: some View {
		Text(text).font(StakFont.geist(11 * figmaUnit, .medium)).foregroundStyle(color)
	}
}

struct LiveTitle: View {
	let text: String
	var body: some View {
		Text(text).font(StakFont.sora(20 * figmaUnit, .semiBold)).foregroundStyle(StakColors.textPrimary)
	}
}

struct LiveBody: View {
	let text: String
	var color: Color = Live.body
	var body: some View {
		Text(text).font(StakFont.geist(13 * figmaUnit)).foregroundStyle(color)
	}
}

struct LiveCaption: View {
	let text: String
	var body: some View {
		Text(text).font(StakFont.geist(11 * figmaUnit)).foregroundStyle(Live.muted)
	}
}

/// A label / value line.
struct LiveRow: View {
	let label: String
	let value: String
	var valueColor: Color = StakColors.textPrimary

	var body: some View {
		let u = figmaUnit
		HStack {
			Text(label).font(StakFont.geist(13 * u)).foregroundStyle(Live.muted)
			Spacer()
			Text(value).font(StakFont.geist(13 * u, .medium)).foregroundStyle(valueColor)
		}
		.frame(height: 32 * u)
	}
}

/// The badge circle every stock row draws.
struct LiveBadge: View {
	let letter: String
	var size: CGFloat = 32

	var body: some View {
		let u = figmaUnit
		ZStack {
			Circle().fill(Live.badgeBg)
			Text(letter).font(StakFont.sora(size * 0.4 * u, .semiBold)).foregroundStyle(Live.badgeInk)
		}
		.frame(width: size * u, height: size * u)
	}
}

/// A status pill: Pending (amber), Filled / Done (green), Cancelled (muted).
struct LiveStatusPill: View {
	let status: String

	var body: some View {
		let u = figmaUnit
		let (label, color): (String, Color) = {
			switch status {
			case "pending": return ("Pending", Live.amber)
			case "processing": return ("Processing", Live.amber)
			case "filled": return ("Filled", Live.green)
			case "done": return ("Done", Live.green)
			default: return ("Cancelled", Live.muted)
			}
		}()
		Text(label)
			.font(StakFont.geist(10 * u, .medium))
			.foregroundStyle(color)
			.padding(.horizontal, 8 * u)
			.padding(.vertical, 3 * u)
			.background(color.opacity(0.16), in: RoundedRectangle(cornerRadius: 10 * u))
	}
}

/// A secondary, hairline action (the sheet's "Not now" / "Cancel").
struct LiveSecondary: View {
	let text: String
	let action: () -> Void

	var body: some View {
		let u = figmaUnit
		Button(action: action) {
			Text(text)
				.font(StakFont.sora(14 * u))
				.foregroundStyle(Live.muted)
				.frame(maxWidth: .infinity)
				.frame(height: 48 * u)
				.overlay(RoundedRectangle(cornerRadius: 6 * u).strokeBorder(Color(argb: 0x54343B4F), lineWidth: 0.36 * u))
				.contentShape(Rectangle())
		}
		.buttonStyle(.pressDim)
	}
}

/// A scrim + bottom sheet for the order flow (the Discover ticket's scaffold is private to it).
struct LiveSheet<Content: View>: View {
	let onDismiss: () -> Void
	@ViewBuilder let content: () -> Content

	var body: some View {
		let u = figmaUnit
		ZStack(alignment: .bottom) {
			Color.black.opacity(0.6)
				.ignoresSafeArea()
				.onTapGesture(perform: onDismiss)
			ScrollView(showsIndicators: false) {
				VStack(alignment: .leading, spacing: 14 * u) { content() }
					.frame(maxWidth: .infinity, alignment: .leading)
					.padding(.horizontal, 20 * u)
					.padding(.top, 20 * u)
					.padding(.bottom, 24 * u)
			}
			.frame(maxHeight: UIScreen.main.bounds.height * 0.92)
			.fixedSize(horizontal: false, vertical: true)
			.background(Live.sheetBg, in: UnevenRoundedRectangle(topLeadingRadius: 20 * u, topTrailingRadius: 20 * u))
			.ignoresSafeArea(edges: .bottom)
		}
	}
}

/// The entry banner every host shows (Home, Simulate, Profile): status-aware copy and a chevron.
struct GoLiveBanner: View {
	let onOpen: () -> Void
	@ObservedObject private var account = LiveAccount.shared

	var body: some View {
		let u = figmaUnit
		let (kicker, title, line): (String, String, String) = {
			switch account.status {
			case .live: return ("REAL MONEY ON", "Your live account", "\(LiveAccount.usd(account.cash)) available · \(account.holdings.count) \(account.holdings.count == 1 ? "holding" : "holdings")")
			case .review: return ("GO LIVE", "Identity under review", "We’re checking your details. This usually takes a moment.")
			case .rejected: return ("GO LIVE", "We couldn’t verify you yet", "Fix your details and resubmit to keep going.")
			case .verified: return ("GO LIVE", "You’re verified", account.bankLinked ? "Add funds to turn real money on." : "Link a bank to fund your account.")
			case .none: return ("GO LIVE", "Ready for real money?", "Verify your identity, fund the account and buy for real. Practice stays in Simulate.")
			}
		}()
		Button(action: onOpen) {
			HStack(spacing: 12 * u) {
				VStack(alignment: .leading, spacing: 4 * u) {
					LiveKicker(text: kicker, color: account.isLive ? Live.green : Live.teal)
					Text(title).font(StakFont.sora(15 * u, .semiBold)).foregroundStyle(StakColors.textPrimary)
					Text(line).font(StakFont.geist(12 * u)).foregroundStyle(Live.body)
				}
				.multilineTextAlignment(.leading)
				.frame(maxWidth: .infinity, alignment: .leading)
				Text("›").font(StakFont.geist(18 * u)).foregroundStyle(Live.muted)
			}
			.padding(14 * u)
			.background(Live.cardBg, in: RoundedRectangle(cornerRadius: 16 * u))
			.contentShape(Rectangle())
		}
		.buttonStyle(.pressDim)
		// The Under review caption promises the result shows on the Profile: every host that
		// shows the banner runs the demo verifier too (resolveReview is a no-op once resolved).
		.afterDelay(account.status, millis: 2200) { LiveAccount.shared.resolveReview() }
	}
}

/// The cash-amount chips the funding, withdrawal and order steps share; `customOn` = the typed value.
struct AmountChips: View {
	let presets: [Double]
	let selected: Double?
	let onSelect: (Double) -> Void
	let customOn: Bool
	let onCustom: () -> Void

	var body: some View {
		let u = figmaUnit
		HStack(spacing: 8 * u) {
			ForEach(Array(presets.enumerated()), id: \.offset) { _, p in
				SettingsChip(label: PaperPortfolio.wholeDollars(p), selected: !customOn && selected == p) { onSelect(p) }
			}
			SettingsChip(label: "Custom", selected: customOn, action: onCustom)
			Spacer(minLength: 0)
		}
	}
}

/// Runs `block` once, `millis` after the view appears (re-armed when `key` changes) - the demo's "review", "processing" and "fill" delays.
struct AfterDelay<K: Equatable>: ViewModifier {
	let key: K
	let millis: Int
	let block: () -> Void

	func body(content: Content) -> some View {
		content.task(id: key) {
			try? await Task.sleep(nanoseconds: UInt64(millis) * 1_000_000)
			if !Task.isCancelled { block() }
		}
	}
}

extension View {
	func afterDelay<K: Equatable>(_ key: K, millis: Int, _ block: @escaping () -> Void) -> some View {
		modifier(AfterDelay(key: key, millis: millis, block: block))
	}
}
