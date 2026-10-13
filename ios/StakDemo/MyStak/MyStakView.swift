import SwiftUI

/// How many collection chips the overview shows before "View all".
private let chipsShown = 6

/// 06 · My STAK — the saved companies, what STAK has learned from them, and the way back into Discover (My STAK
/// product spec, Sept 2026).
///
/// My STAK is continuity, not a brokerage screen: it answers "I cared about these companies - what changed, and what
/// is STAK learning from them?". So there is no weekly return, no portfolio grade and no allocation - STAK doesn't know
/// what anyone owns, and a number that looks like performance would claim it does. Mirrors android
/// ui/mystak/MyStakScreen.kt.
struct MyStakView: View {
	let onOpenCollection: (String) -> Void
	let onStartSwiping: () -> Void
	var onOpenAllCollections: () -> Void = {}
	var onOpenUpdates: () -> Void = {}
	var onOpenTasteGraph: () -> Void = {}
	@ObservedObject var myStakVM: MyStakViewModel
	/// False while a page is pushed over the tab: coming back to it re-reads, as Android's screen does on re-entering.
	var isTop = true
	@ObservedObject private var holdings = MyStakHoldings.shared
	@ObservedObject private var session = Session.shared

	var body: some View {
		let u = figmaUnit
		let demo = session.demoAccount
		VStack(spacing: 0) {
			VStack(alignment: .leading, spacing: 4 * u) {
				Text("My STAK")
					.font(StakFont.sora(26 * u, .semiBold))
					.stakLineHeight(33 * u, size: 26 * u, face: .sora)
					.foregroundStyle(StakColors.textPrimary)
					.accessibilityAddTraits(.isHeader)
				Text("Companies you've STAK'd, all in one place.")
					.font(StakFont.geist(13 * u))
					.stakLineHeight(17 * u, size: 13 * u, face: .geist)
					.foregroundStyle(Stak.muted)
			}
			.frame(maxWidth: .infinity, alignment: .leading)
			.padding(.horizontal, 20 * u)
			.padding(.top, 20 * u)

			ScrollView {
				VStack(spacing: 16 * u) {
					// The collections holding a company whose update is still unopened.
					let unreadTickers = Set(myStakVM.updates.filter { !$0.read }.map(\.ticker))
					let entries = collectionEntries(demo: demo, groups: myStakVM.groups, unreadTickers: unreadTickers)
					if !entries.isEmpty {
						HStack {
							StakSectionHeader(title: "Collections")
							Spacer()
							// Only worth offering when the grid is holding some back.
							if entries.count > chipsShown {
								Button(action: onOpenAllCollections) {
									Text("View all \(entries.count) ›")
										.font(StakFont.geist(12 * u, .medium))
										.stakLineHeight(16 * u, size: 12 * u, face: .geist)
										.foregroundStyle(Stak.teal)
										.frame(minHeight: 44)
										.contentShape(Rectangle())
								}
								.buttonStyle(.pressDim)
								.padding(.vertical, -14)
							}
						}
						CollectionGrid(entries: Array(entries.prefix(chipsShown)), onOpen: onOpenCollection)
					} else {
						emptyStak
					}
					// Only when something actually changed - a calm screen is the right answer on a quiet day.
					if !myStakVM.updates.isEmpty {
						updatesCard(
							// Companies, not updates: one company can have several, and the inbox counts companies too.
							unreadCompanies: unreadTickers.count,
							unread: myStakVM.unreadUpdates
						)
					}
					tasteCard
					if myStakVM.updatesFailed {
						FailedCard(title: "Updates in your STAK", message: "Couldn't check your saved companies right now.")
					}
					discoverHandoff
				}
				.padding(.horizontal, 20 * u)
				.padding(.top, 20 * u)
				.padding(.bottom, 24 * u)
			}
		}
		.background(StakColors.bg.ignoresSafeArea())
		// Keyed on the holdings: a save from the deck or an Unsave re-reads the screen; and on coming back to it.
		.task(id: "\(holdings.tickers.sorted().joined(separator: ",")):\(demo):\(isTop)") {
			guard isTop else { return }
			if !demo { myStakVM.loadIfNeeded() }
			myStakVM.loadTaste()
			myStakVM.loadUpdates()
		}
	}

	/// Updates in your STAK: the companies with something new, and the way into them.
	private func updatesCard(unreadCompanies: Int, unread: Int) -> some View {
		let u = figmaUnit
		return Button(action: onOpenUpdates) {
			VStack(alignment: .leading, spacing: 12 * u) {
				HStack(spacing: 8 * u) {
					Text("🔔").font(StakFont.geist(15 * u)).accessibilityHidden(true)
					Text("Updates in your STAK")
						.font(StakFont.sora(15 * u, .semiBold))
						.stakLineHeight(19 * u, size: 15 * u, face: .sora)
						.foregroundStyle(StakColors.textPrimary)
					Spacer(minLength: 0)
					// The count is what is still unopened; nothing to count once all are read.
					if unread > 0 {
						Text("\(unread)")
							.font(StakFont.geist(12 * u, .medium))
							.foregroundStyle(.white)
							.frame(minWidth: 24 * u * typeScale, minHeight: 24 * u * typeScale)
							.background(StakColors.accentBlue, in: Capsule())
					}
				}
				Text(updatesLine(unreadCompanies))
					.font(StakFont.geist(13 * u))
					.stakLineHeight(19 * u, size: 13 * u, face: .geist)
					.foregroundStyle(Stak.body)
					.frame(maxWidth: .infinity, alignment: .leading)
					.multilineTextAlignment(.leading)
				Text(unread > 0 ? "See what changed  →" : "Read them again  →")
					.font(StakFont.geist(14 * u, .medium))
					.foregroundStyle(.white)
					.frame(maxWidth: .infinity)
					.frame(minHeight: 44 * u * typeScale)
					.background(Color(argb: 0xFF3C98B4), in: RoundedRectangle(cornerRadius: 10 * u))
			}
			.padding(16 * u)
			.background(Stak.cardBg, in: RoundedRectangle(cornerRadius: 16 * u))
			.overlay(RoundedRectangle(cornerRadius: 16 * u).strokeBorder(Color(argb: 0x442C9DBC), lineWidth: 1 * u))
		}
		.buttonStyle(.pressDim)
		.accessibilityElement(children: .ignore)
		.accessibilityLabel("Updates in your STAK\(unread > 0 ? ", \(unread) new" : ""). \(updatesLine(unreadCompanies)) \(unread > 0 ? "See what changed" : "Read them again")")
		.accessibilityAddTraits(.isButton)
	}

	/// Your Investing Taste: the mix of what draws the user's attention, as a share of observed interest signals. It is
	/// never money - the label and the copy both say so.
	@ViewBuilder private var tasteCard: some View {
		let u = figmaUnit
		if let taste = myStakVM.taste {
			Button(action: onOpenTasteGraph) {
				VStack(alignment: .leading, spacing: 12 * u) {
					HStack(spacing: 8 * u) {
						Image("IcGistSparkle").resizable().frame(width: 20 * u, height: 20 * u).accessibilityHidden(true)
						Text("Your Investing Taste")
							.font(StakFont.sora(15 * u, .semiBold))
							.stakLineHeight(19 * u, size: 15 * u, face: .sora)
							.foregroundStyle(StakColors.textPrimary)
						Spacer(minLength: 0)
						Text("›").font(StakFont.geist(16 * u)).foregroundStyle(Stak.faint).accessibilityHidden(true)
					}
					HStack(spacing: 16 * u) {
						ZStack {
							if taste.themes.isEmpty {
								// An unmeasured ring in the design's colors would read as a mix STAK doesn't have.
								Circle().fill(Color(argb: 0xFF212A3D)).frame(width: 92 * u, height: 92 * u)
							} else {
								let other = taste.otherShare > 0.01 ? [taste.otherShare] : []
								DonutRing(
									shares: (taste.themes.map(\.share) + other).map { CGFloat($0) },
									colors: taste.themes.map { themeColor($0.colorKey) } + (other.isEmpty ? [] : [Stak.faint]),
									size: 92 * u
								)
							}
							Text("Taste\nmix")
								.font(StakFont.geist(10 * u, .medium))
								.stakLineHeight(13 * u, size: 10 * u, face: .geist)
								.foregroundStyle(Stak.muted)
								.multilineTextAlignment(.center)
						}
						.frame(width: 92 * u, height: 92 * u)
						.accessibilityHidden(true)
						VStack(alignment: .leading, spacing: 6 * u) {
							Text(taste.summary)
								.font(StakFont.sora(14 * u, .semiBold))
								.stakLineHeight(19 * u, size: 14 * u, face: .sora)
								.foregroundStyle(StakColors.textPrimary)
							Text(taste.subtitle)
								.font(StakFont.geist(12 * u))
								.stakLineHeight(16 * u, size: 12 * u, face: .geist)
								.foregroundStyle(Stak.body)
							Text("\(taste.ctaLabel) ›")
								.font(StakFont.geist(12 * u, .medium))
								.stakLineHeight(16 * u, size: 12 * u, face: .geist)
								.foregroundStyle(Stak.teal)
						}
						.frame(maxWidth: .infinity, alignment: .leading)
						.multilineTextAlignment(.leading)
					}
				}
				.padding(16 * u)
				.background(Stak.cardBg, in: RoundedRectangle(cornerRadius: 16 * u))
			}
			.buttonStyle(.pressDim)
			.accessibilityElement(children: .ignore)
			.accessibilityLabel("Your Investing Taste. \(taste.summary). \(taste.subtitle)")
			.accessibilityAddTraits(.isButton)
		} else if myStakVM.tasteFailed {
			FailedCard(title: "Your Taste is unavailable", message: "We couldn't load your interests. Try again later.") {
				myStakVM.loadTaste(force: true)
			}
		}
		// Still loading: no card rather than an empty ring.
	}

	/// The way back into Discover: the solid teal card, dark ink on it. Its count is the real number of cards left
	/// today when it is known, never a fixed "8".
	private var discoverHandoff: some View {
		let u = figmaUnit
		let ink = StakColors.bg
		let line: String = switch myStakVM.cardsLeft {
		case nil: "Based on your taste, fresh picks are waiting in the deck."
		case 0: "You've been through today's deck."
		case 1: "Based on your taste, 1 fresh pick is waiting in the deck."
		case let n?: "Based on your taste, \(n) fresh picks are waiting in the deck."
		}
		return Button(action: onStartSwiping) {
			VStack(alignment: .leading, spacing: 12 * u) {
				Text("DISCOVER")
					.font(StakFont.geist(11 * u, .medium))
					.stakLineHeight(14 * u, size: 11 * u, face: .geist)
					.tracking(0.9 * u)
					.foregroundStyle(ink)
				Text("More like your STAK")
					.font(StakFont.sora(22 * u, .semiBold))
					.stakLineHeight(28 * u, size: 22 * u, face: .sora)
					.foregroundStyle(ink)
				Text(line)
					.font(StakFont.geist(15 * u))
					.stakLineHeight(24 * u, size: 15 * u, face: .geist)
					.foregroundStyle(ink)
				Text("Start swiping ›")
					.font(StakFont.geist(15 * u, .medium))
					.stakLineHeight(20 * u, size: 15 * u, face: .geist)
					.foregroundStyle(ink.opacity(0.72))
			}
			.frame(maxWidth: .infinity, alignment: .leading)
			.multilineTextAlignment(.leading)
			.padding(.horizontal, 20 * u)
			.padding(.vertical, 22 * u)
			.background(Stak.teal, in: RoundedRectangle(cornerRadius: 16 * u))
		}
		.buttonStyle(.pressDim)
		.accessibilityElement(children: .ignore)
		.accessibilityLabel("More like your STAK. \(line) Start swiping")
		.accessibilityAddTraits(.isButton)
	}

	/// Nothing saved yet: say what My STAK is for, and open the deck.
	private var emptyStak: some View {
		let u = figmaUnit
		return Button(action: onStartSwiping) {
			VStack(alignment: .leading, spacing: 8 * u) {
				Text("No companies yet")
					.font(StakFont.sora(15 * u, .semiBold))
					.stakLineHeight(19 * u, size: 15 * u, face: .sora)
					.foregroundStyle(StakColors.textPrimary)
				Text("STAK a company in Discover and it lands here, with what changed since you saved it.")
					.font(StakFont.geist(13 * u))
					.stakLineHeight(19 * u, size: 13 * u, face: .geist)
					.foregroundStyle(Stak.body)
				Text("Open Discover ›")
					.font(StakFont.geist(13 * u, .medium))
					.stakLineHeight(17 * u, size: 13 * u, face: .geist)
					.foregroundStyle(Stak.teal)
			}
			.frame(maxWidth: .infinity, alignment: .leading)
			.multilineTextAlignment(.leading)
			.padding(16 * u)
			.background(Stak.cardBg, in: RoundedRectangle(cornerRadius: 16 * u))
		}
		.buttonStyle(.pressDim)
	}
}

/// "3 saved companies have something new." - companies counted, never rounded up. Once everything is opened it says so
/// plainly, without counting what the user has read or naming the window STAK keeps them for.
private func updatesLine(_ unreadCompanies: Int) -> String {
	switch unreadCompanies {
	case 1: return "1 saved company has something new."
	case let n where n > 1: return "\(n) saved companies have something new."
	default: return "You're up to date. Past updates are still here if you want them."
	}
}

/// A read that failed - said plainly, so an empty screen never passes for a quiet day.
private struct FailedCard: View {
	let title: String
	let message: String
	var onRetry: (() -> Void)? = nil

	var body: some View {
		let u = figmaUnit
		VStack(alignment: .leading, spacing: 6 * u) {
			Text(title)
				.font(StakFont.sora(15 * u, .semiBold))
				.stakLineHeight(19 * u, size: 15 * u, face: .sora)
				.foregroundStyle(StakColors.textPrimary)
			Text(message)
				.font(StakFont.geist(13 * u))
				.stakLineHeight(19 * u, size: 13 * u, face: .geist)
				.foregroundStyle(Stak.body)
			if let onRetry {
				Button(action: onRetry) {
					Text("Retry ›")
						.font(StakFont.geist(12 * u, .medium))
						.stakLineHeight(16 * u, size: 12 * u, face: .geist)
						.foregroundStyle(Stak.teal)
						.frame(minHeight: 44, alignment: .leading)
						.contentShape(Rectangle())
				}
				.buttonStyle(.pressDim)
				// The 44pt target overhangs; the text keeps its authored 2 below the message.
				.padding(.top, 2 * u)
				.padding(.vertical, -14)
			}
		}
		.frame(maxWidth: .infinity, alignment: .leading)
		.padding(16 * u)
		.background(Stak.cardBg, in: RoundedRectangle(cornerRadius: 16 * u))
	}
}
