import SwiftUI

// File-private palette — mirrors the Android MyStakScreen.kt literals verbatim.
private let cardBg = Color(argb: 0xFF181F30)
private let muted = Color(argb: 0xFF819ABB)
private let faint = Color(argb: 0xFF5C6B85)
private let bodyColor = Color(argb: 0xFFC8D2E0)
private let green = Color(argb: 0xFF2FD08A)
private let red = Color(argb: 0xFFFF5A6A)
private let teal = Color(argb: 0xFF69B3CA)
private let ink = Color(argb: 0xFF0E162B)
private let track = Color(argb: 0xFF2A3346)
private let headerGray = Color(argb: 0xFFD3D3DD)

private let ctaGradient = LinearGradient(
	stops: [
		.init(color: Color(argb: 0xFFA6E4F7), location: 0.0889),
		.init(color: Color(argb: 0xFF5DA8BF), location: 0.3919),
		.init(color: Color(argb: 0xFF3C98B4), location: 0.7255),
		.init(color: Color(argb: 0xFF3C98B4), location: 1)
	],
	startPoint: .top,
	endPoint: .bottom
)

/// 06 · My STAK — "My STAK Overview · corrected" (CHINEDU 1:3155).
/// Collections grid with the Add more CTA, the "Your read" insight,
/// the performance summary (chart, range pills, best/worst), the
/// Breakdown allocation donut with sector bars, and the teal
/// "More like your STAK" Discover banner. Tab bar via MainTabsView.
/// Every metric is scaled by the 390pt artboard unit (`figmaUnit`),
/// exactly like the Android build's `u` scaling.
/// Ported from android/ ui/mystak/MyStakScreen.kt.
struct MyStakView: View {
	/// Receives the tapped chip's collection id (MyStak/Collections.swift).
	let onOpenCollection: (String) -> Void
	let onStartSwiping: () -> Void
	/// Only the chip counts read the store. The summary line, the Your read
	/// body and Allocation are the authored literals - user, 2026-09-04
	/// (CHINEDU 06 · My STAK 1:3155): the authored look wins.
	@ObservedObject private var holdings = MyStakHoldings.shared

	var body: some View {
		let u = figmaUnit
		VStack(spacing: 0) {
			ScrollView {
				VStack(spacing: 20 * u) {
					// The header scrolls with the content like Home's top nav (user, 2026-09-14:
					// "I don't want a fixed top bar"); the 20 item gap is the old top inset.
					VStack(alignment: .leading, spacing: 4 * u) {
						Text("My STAK")
							.font(StakFont.sora(26 * u, .semiBold))
							.foregroundStyle(StakColors.textPrimary)
						Text("Your saved stocks, live.")
							.font(StakFont.geist(13 * u))
							.foregroundStyle(muted)
					}
					.frame(maxWidth: .infinity, alignment: .leading)
					.padding(.top, 20 * u)
					SectionHeader(title: "Collections")
					collectionsGrid
					addMoreCta
					yourReadCard
					PortfolioSummary()
					if holdings.count > 0 {
						SectionHeader(title: "Breakdown")
						AllocationCard()
					}
					discoverBanner
					// 1:3156: the Sections column ends at the Discover CTA and the 86 bottom
					// padding IS the tab bar, so no trailing gap - exact-design audit 2026-09-04.
				}
				.padding(.horizontal, 20 * u)
			}
		}
		.background(StakColors.bg.ignoresSafeArea())
	}

	private var collectionsGrid: some View {
		let u = figmaUnit
		// Authored (1:3180 template): EVERY collection card opens the
		// Collection screen, Instant. Codex parity audit (2026-09-04): each
		// chip carries its own collection id so the page serves the tapped
		// one; the six catalogue chips fill the authored three rows of two.
		// A seventh, "Other" tile appears only while the account holds stocks no
		// collection catalogues (Codex review, PR #167) - the persona's seeded
		// TSLA/SNOW never count, so the frame keeps its six; a save the persona
		// makes itself (an Amazon story) is visible and reversible (audit 2026-09-07).
		let other = StakCollections.other(holdings: holdings.tickers)
		let all = StakCollections.all + (other.map { [$0] } ?? [])
		let rows = stride(from: 0, to: all.count, by: 2).map {
			Array(all[$0..<min($0 + 2, all.count)])
		}
		return VStack(spacing: 10 * u) {
			ForEach(Array(rows.enumerated()), id: \.offset) { _, row in
				HStack(spacing: 10 * u) {
					ForEach(row) { collection in
						CollectionChip(
							collection: collection,
							action: { onOpenCollection(collection.id) },
							countLabel: heldCountLabel(collection.held(in: holdings.tickers).count)
						)
					}
					if row.count == 1 { Spacer() }
				}
			}
		}
	}

	private var addMoreCta: some View {
		let u = figmaUnit
		return Button(action: onStartSwiping) {
			HStack(spacing: 8 * u) {
				// Figma 1:3155 sets 14 (Codex parity audit, 2026-09-04).
				Text("Add more")
					.font(StakFont.geist(14 * u, .medium))
					.foregroundStyle(StakColors.textPrimary)
				Image("IcPlusSmall")
					.resizable()
					.frame(width: 14 * u, height: 14 * u)
			}
			.frame(width: 150 * u, height: 52 * u)
			.background(ctaGradient, in: RoundedRectangle(cornerRadius: 6 * u))
			.overlay(
				RoundedRectangle(cornerRadius: 6 * u)
					// 1:3225 authored gradient hairline (the Android CtaBorderBrush) - exact-design audit 2026-09-04.
					.strokeBorder(StakColors.ctaBorderGradient, lineWidth: 0.36 * u)
			)
		}
		.buttonStyle(.pressDim)
	}

	/// Your read insight card.
	private var yourReadCard: some View {
		let u = figmaUnit
		return VStack(alignment: .leading, spacing: 7 * u) {
			HStack(spacing: 8 * u) {
				Image("IcGistSparkle")
					.resizable()
					.frame(width: 24 * u, height: 24 * u)
				Text("Your read")
					.font(StakFont.sora(14 * u, .semiBold))
					.foregroundStyle(StakColors.textPrimary)
			}
			// Product audit (2026-09-05): a new account has no read yet.
			Text(holdings.count == 0 ? "Your read starts with your first save." : (Session.shared.demoAccount ? "You lean into growth and tech." : StakInsights.readHeadline()))
				.font(StakFont.sora(15 * u, .semiBold))
				.foregroundStyle(StakColors.textPrimary)
			// Figma 1:3155 sets the body at 13 (Codex parity audit, 2026-09-04).
			// Authored copy, not the store's counts - user, 2026-09-04 (CHINEDU 06 ·
			// My STAK 1:3155): the authored look wins.
			Text(holdings.count == 0 ? "Save stocks from the Discover deck and STAK will read your taste from them." : (Session.shared.demoAccount ? "Six of your fourteen picks are tech or AI names. Your STAK skews high-growth, with a small hedge in real estate." : StakInsights.readBody()))
				.font(StakFont.geist(13 * u))
				.stakLineHeight(19 * u, size: 13 * u, face: .geist)
				.foregroundStyle(bodyColor)
		}
		.frame(maxWidth: .infinity, alignment: .leading)
		.padding(16 * u)
		.background(cardBg, in: RoundedRectangle(cornerRadius: 14 * u))
	}

	/// Discover banner.
	private var discoverBanner: some View {
		let u = figmaUnit
		return Button(action: onStartSwiping) {
			VStack(alignment: .leading, spacing: 9 * u) {
				Text("DISCOVER")
					.font(StakFont.geist(10 * u, .medium))
					.tracking(0.6 * u)
					.foregroundStyle(ink)
				Text("More like your STAK")
					.font(StakFont.sora(18 * u, .semiBold))
					.foregroundStyle(ink)
				// 1:3322 Geist Regular 12 / 17 (was 13) - exact-design audit 2026-09-04.
				// Authored two-line shape breaks before "deck." (1:3322; mirrors Android, 2026-09-05).
				Text("Based on your taste, 8 fresh picks are waiting in the\ndeck.")
					.font(StakFont.geist(12 * u))
					.stakLineHeight(17 * u, size: 12 * u, face: .geist)
					.foregroundStyle(ink)
				// 1:3323 "b": pt 4 over the natural runs (was a 22u strip) - exact-design audit 2026-09-04.
				HStack(spacing: 4 * u) {
					Text("Start swiping")
						.font(StakFont.geist(13 * u, .medium))
						.foregroundStyle(Color(argb: 0xB80A1020))
					Text("›")
						.font(StakFont.geist(14 * u, .medium))
						.foregroundStyle(ink)
				}
				.padding(.top, 4 * u)
			}
			.frame(maxWidth: .infinity, alignment: .leading)
			.padding(18 * u)
			.background(teal, in: RoundedRectangle(cornerRadius: 16 * u))
		}
		.buttonStyle(.pressDim)
	}
}

private struct SectionHeader: View {
	let title: String

	var body: some View {
		Text(title)
			.font(StakFont.sora(16 * figmaUnit, .semiBold))
			.foregroundStyle(headerGray)
			.frame(maxWidth: .infinity, alignment: .leading)
	}
}

/// One collection chip — art/icon, name + count, chevron (#181f30 r12).
private struct CollectionChip: View {
	let collection: StakCollection
	let action: () -> Void
	/// The held count from the store - never the authored `collection.count`.
	var countLabel: String = ""

	var body: some View {
		let u = figmaUnit
		Button(action: action) {
			HStack(spacing: 10 * u) {
				if let image = collection.image {
					Image(image)
						.resizable()
						.scaledToFill()
						.frame(width: 34 * u, height: 34 * u)
						.clipped()
				} else if let icon = collection.icon {
					Image(icon)
						.resizable()
						.frame(width: 36 * u, height: 36 * u)
				}
				VStack(alignment: .leading, spacing: 2 * u) {
					// Authored: "Green Energy" (box 90) overflows its 84 column —
					// the frame draws it past the column, so never wrap or clip it
					// (Kotlin softWrap = false + TextOverflow.Visible).
					Text(collection.name)
						.font(StakFont.sora(13 * u, .semiBold))
						.foregroundStyle(StakColors.textPrimary)
						.lineLimit(1)
						.fixedSize(horizontal: true, vertical: false)
					Text(countLabel)
						.font(StakFont.geist(11 * u))
						.foregroundStyle(muted)
				}
				.frame(maxWidth: .infinity, alignment: .leading)
				Text("›")
					.font(StakFont.geist(16 * u))
					.foregroundStyle(faint)
			}
			.padding(12 * u)
			.background(cardBg, in: RoundedRectangle(cornerRadius: 12 * u))
		}
		.buttonStyle(.pressDim)
	}
}

/// Performance this week — +4.9%, chart, range pills, best/worst.
private struct PortfolioSummary: View {
	/// The range pills select (user, 2026-09-05: "be able to click on the
	/// timeline"); "3M" is the authored default (1:3155) and keeps the
	/// authored chart image. Mirrors android.
	@State private var range = "3M"
	@ObservedObject private var holdings = MyStakHoldings.shared

	var body: some View {
		let u = figmaUnit
		VStack(spacing: 14 * u) {
			VStack(alignment: .leading, spacing: 8 * u) {
				Text("Performance this week")
					.font(StakFont.sora(12 * u))
					.foregroundStyle(muted)
				Text(holdings.count == 0 ? "—" : (Session.shared.demoAccount ? "+4.9%" : StakInsights.signedPct(StakInsights.weekChangePct())))
					.font(StakFont.sora(44 * u, .semiBold))
					.tracking(-0.44 * u)
					.foregroundStyle(StakColors.textPrimary)
				HStack(spacing: 10 * u) {
					// Authored summary copy; the store's count is not what the frame shows - user, 2026-09-04 (CHINEDU 06 · My STAK 1:3155).
					Text(holdings.count == 0 ? "No stocks yet" : (Session.shared.demoAccount ? "Across 14 stocks" : "Across " + heldCountLabel(holdings.count)))
						.font(StakFont.geist(14 * u, .medium))
						.foregroundStyle(holdings.count == 0 ? muted : (!Session.shared.demoAccount && StakInsights.weekChangePct() < 0 ? red : green))
					Text(".")
						.font(StakFont.sora(14 * u))
						.foregroundStyle(muted)
					Text("3M")
						.font(StakFont.geist(14 * u))
						.foregroundStyle(muted)
				}
			}
			.frame(maxWidth: .infinity, alignment: .leading)
			.padding(.leading, 20 * u)

			RangeLineChart(range: range, tint: teal, authored: "MsChartLine", width: 343 * u, height: 73.56 * u, move: Session.shared.demoAccount ? nil : StakInsights.weekChangePct())

			RangePills(selected: $range, tint: teal, muted: muted)
				.padding(.top, 26 * u)

			Rectangle()
				.fill(track)
				.frame(maxWidth: .infinity)
				.frame(height: 1 * u)

			// The demo's authored TSLA / SNOW; a new account's own best and worst, once it holds two (product audit, 2026-09-05).
			let duo = Session.shared.demoAccount ? nil : StakInsights.bestWorst()
			if holdings.count > 0 && (Session.shared.demoAccount || duo != nil) {
				HStack(spacing: 151 * u) {
				VStack(alignment: .leading, spacing: 3 * u) {
					Text("Best")
						.font(StakFont.geist(11 * u))
						.foregroundStyle(faint)
					HStack(spacing: 6 * u) {
						Text(Session.shared.demoAccount ? "TSLA" : duo!.0.ticker)
							.font(StakFont.sora(13 * u, .semiBold))
							.foregroundStyle(StakColors.textPrimary)
						Text(Session.shared.demoAccount ? "+3.4%" : StakInsights.signedPct(StakInsights.changePct(duo!.0)))
							.font(StakFont.geist(12 * u, .medium))
							.foregroundStyle(Session.shared.demoAccount || duo!.0.up ? green : red)
					}
				}
				VStack(alignment: .leading, spacing: 3 * u) {
					Text("Worst")
						.font(StakFont.geist(11 * u))
						.foregroundStyle(faint)
					HStack(spacing: 6 * u) {
						Text(Session.shared.demoAccount ? "SNOW" : duo!.1.ticker)
							.font(StakFont.sora(13 * u, .semiBold))
							.foregroundStyle(StakColors.textPrimary)
						Text(Session.shared.demoAccount ? "-0.5%" : StakInsights.signedPct(StakInsights.changePct(duo!.1)))
							.font(StakFont.geist(12 * u, .medium))
							.foregroundStyle(!Session.shared.demoAccount && duo!.1.up ? green : red)
					}
				}
				}
				.frame(maxWidth: .infinity)
			}
		}
		.frame(maxWidth: .infinity)
		.padding(.vertical, 13.5 * u)
		.background(cardBg, in: RoundedRectangle(cornerRadius: 8 * u))
	}
}

/// Allocation — the 150u donut render + sector bars.
/// The baked MsDonut render and the five authored bars, not the store -
/// user, 2026-09-04 (CHINEDU 06 · My STAK 1:3155): the authored look wins.
private struct AllocationCard: View {
	var body: some View {
		let u = figmaUnit
		VStack(spacing: 16 * u) {
			Text("Allocation")
				.font(StakFont.sora(15 * u, .semiBold))
				.foregroundStyle(StakColors.textPrimary)
			Group {
				if Session.shared.demoAccount {
					Image("MsDonut")
						.resizable()
						.frame(width: 150 * u, height: 150 * u)
					VStack(spacing: 12 * u) {
						SectorBar(name: "Tech & AI", share: "42% · 6 stocks", color: teal, fill: 132)
						SectorBar(name: "Finance", share: "21% · 3 stocks", color: Color(argb: 0xFF7AB3F0), fill: 66)
						SectorBar(name: "Green Energy", share: "20% · 3 stocks", color: green, fill: 63)
						// 1:3306 legend dot is #9E8CE6 while the 1:3310 bar is #9E8CE5 - exact-design audit 2026-09-04.
						SectorBar(name: "Real Estate", share: "12% · 2 stocks", color: Color(argb: 0xFF9E8CE5), fill: 38, dot: Color(argb: 0xFF9E8CE6))
						SectorBar(name: "Other", share: "5% · 1 stock", color: faint, fill: 16)
					}
				} else {
					// A new account's ring and bars come from its own saves (product audit, 2026-09-05).
					let buckets = StakInsights.buckets(Array(MyStakHoldings.shared.tickers))
					DonutRing(shares: buckets.map { CGFloat($0.share) }, colors: buckets.map { myStakBucketColor($0.id) }, size: 150 * u)
					VStack(spacing: 12 * u) {
						ForEach(buckets, id: \.id) { b in
							SectorBar(name: b.name, share: "\(Int((b.share * 100).rounded()))% · \(heldCountLabel(b.count))", color: myStakBucketColor(b.id), fill: CGFloat(314 * b.share))
						}
					}
				}
			}
			.frame(maxWidth: .infinity)
		}
		.frame(maxWidth: .infinity)
		.padding(18 * u)
		.background(cardBg, in: RoundedRectangle(cornerRadius: 16 * u))
	}
}

/// The authored bucket palette (1:3155), one colour per collection.
private func myStakBucketColor(_ id: String) -> Color {
	switch id {
	case "aitech": return Color(argb: 0xFF69B3CA)
	case "finance": return Color(argb: 0xFF7AB3F0)
	case "green": return Color(argb: 0xFF2FD08A)
	case "realestate": return Color(argb: 0xFF9E8CE5)
	case "health": return Color(argb: 0xFF5DA8BF)
	case "consumer": return Color(argb: 0xFFE8B86D)
	default: return Color(argb: 0xFF5C6B85)
	}
}

struct SectorBar: View {
	let name: String
	let share: String
	let color: Color
	/// Exact Figma fill width in artboard units (scaled by `figmaUnit`).
	let fill: CGFloat
	/// The legend dot when it is not the bar colour (1:3306 vs 1:3310) - a new
	/// stored property LAST with a default, so the memberwise init keeps its order.
	var dot: Color? = nil

	var body: some View {
		let u = figmaUnit
		VStack(spacing: 6 * u) {
			HStack(spacing: 0) {
				Circle()
					.fill(dot ?? color)
					.frame(width: 9 * u, height: 9 * u)
				Spacer().frame(width: 8 * u)
				Text(name)
					.font(StakFont.geist(13 * u))
					.foregroundStyle(StakColors.textPrimary)
				Spacer(minLength: 0)
				Text(share)
					.font(StakFont.geist(12 * u, .medium))
					.foregroundStyle(muted)
			}
			ZStack(alignment: .leading) {
				RoundedRectangle(cornerRadius: 4 * u)
					.fill(track)
				RoundedRectangle(cornerRadius: 4 * u)
					.fill(color)
					.frame(width: fill * u)
			}
			.frame(maxWidth: .infinity)
			.frame(height: 7 * u)
		}
	}
}
