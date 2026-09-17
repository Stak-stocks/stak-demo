import SwiftUI

/// 07 · Simulate — "Final · Leaderboard · % return" (CHINEDU 1:4124).
/// This-week/All-time chips, RANKED BY RETURN, the highlighted You row
/// (#47, ▲ 12 spots) above the top five and the neighbors around you.
/// Ported from android/ ui/simulate/LeaderboardScreen.kt. Every metric
/// is scaled by the 390pt artboard unit (`figmaUnit`), exactly like
/// the Android build's `u` scaling.
private struct Rank {
	let rank: String
	let initial: String
	let name: String
	let picks: String
	let pct: String
}

private let top: [Rank] = [
	Rank(rank: "1", initial: "M", name: "Maya A.", picks: "9 picks", pct: "+9.4%"),
	Rank(rank: "2", initial: "J", name: "Jide O.", picks: "14 picks", pct: "+8.8%"),
	Rank(rank: "3", initial: "T", name: "Tunde K.", picks: "7 picks", pct: "+8.1%"),
	Rank(rank: "4", initial: "Z", name: "Zara M.", picks: "22 picks", pct: "+7.6%"),
	Rank(rank: "5", initial: "K", name: "Kofi B.", picks: "11 picks", pct: "+7.0%")
]
private let near: [Rank] = [
	Rank(rank: "46", initial: "L", name: "Lena S.", picks: "8 picks", pct: "+4.3%"),
	Rank(rank: "48", initial: "D", name: "Dami F.", picks: "15 picks", pct: "+4.1%")
]

struct LeaderboardView: View {
	let onBack: () -> Void

	/// Codex audit (2026-09-04): the You row quotes PaperPortfolio's week
	/// figures and pick count - the same numbers as the Simulate hero.
	@ObservedObject private var portfolio = PaperPortfolio.shared

	var body: some View {
		let u = figmaUnit
		VStack(spacing: 0) {
			HStack {
				AuthBackCircle(action: onBack)
				Spacer()
				Text("Leaderboard")
					.font(StakFont.sora(16 * u, .semiBold))
					.foregroundStyle(Color.white)
				Spacer()
				ZStack {
					Circle().fill(Sim.cardBg)
					Image("IcNewsShare")
						.resizable()
						.frame(width: 18 * u, height: 18 * u) // 1:4145 icon/share is 18 (exact-design audit 2026-09-04)
				}
				.frame(width: 40 * u, height: 40 * u)
			}
			.padding(.horizontal, 18 * u)
			.padding(.vertical, 8 * u)

			ScrollView(showsIndicators: false) {
				VStack(alignment: .leading, spacing: 16 * u) {
					HStack(spacing: 8 * u) {
						PeriodChip(label: "This week", selected: true)
						PeriodChip(label: "All time", selected: false)
					}
					// 1:4152 season (exact-design audit 2026-09-04): the row is inset 2 on both sides.
					HStack {
						Text("RANKED BY RETURN")
							.font(StakFont.geist(10 * u, .medium))
							.tracking(0.9 * u)
							.foregroundStyle(Sim.faint)
						Spacer()
						Text("Trailing 7 days")
							.font(StakFont.geist(10 * u))
							.foregroundStyle(Sim.faint)
					}
					.padding(.horizontal, 2 * u)

					// You — highlighted with the ▲ spots delta. Teal-tint bg
					// only, no border (1:4124).
					HStack(spacing: 11 * u) {
						Text(portfolio.rank.map(String.init) ?? "—")
							.font(StakFont.sora(16 * u, .semiBold))
							.foregroundStyle(Sim.teal)
							.frame(width: 28 * u, alignment: .leading)
						ZStack {
							Circle().fill(Sim.chipBg)
							// The authored "E" is the demo persona's; a new account shows its own initial (product audit, 2026-09-05).
							// A renamed persona reaches the board too (the edit page promises it; review 2026-09-07).
							Text(portfolio.demo && UserProfile.shared.displayName.trimmingCharacters(in: .whitespaces).isEmpty ? "E" : String(UserProfile.shared.greetingName.prefix(1)).uppercased())
								.font(StakFont.sora(14 * u, .semiBold)) // 1:4158 is 14 (exact-design audit 2026-09-04)
								.foregroundStyle(Sim.badgeInk)
						}
						.frame(width: 36 * u, height: 36 * u)
						VStack(alignment: .leading, spacing: 2 * u) {
							Text("You")
								.font(StakFont.sora(12 * u, .medium)) // 1:4160 Sora Medium (exact-design audit 2026-09-04)
								.foregroundStyle(Color.white)
							Text("\(portfolio.pickCountText) this week")
								.font(StakFont.geist(10 * u))
								.foregroundStyle(Sim.muted)
						}
						.frame(maxWidth: .infinity, alignment: .leading)
						VStack(alignment: .trailing, spacing: 2 * u) {
							// Authored You row (user, 2026-09-04 (CHINEDU 07 · Simulate 423:1007): the authored look wins).
							Text(portfolio.demo ? "+4.2%" : portfolio.weekPctText)
								.font(StakFont.sora(13 * u, .semiBold))
								.foregroundStyle(Sim.teal)
							Text(portfolio.demo ? "▲ 12 spots" : "new this week")
								.font(StakFont.geist(10 * u))
								.foregroundStyle(Sim.green)
						}
					}
					.padding(.horizontal, 16 * u)
					.padding(.vertical, 14 * u)
					// Authored You card is 64 tall (1:4124) - pinned so the list lands on the
					// frame's row grid (mirrors the Android leaderboard fix, 2026-09-05).
					.frame(height: 64 * u)
					// 1:4155 (exact-design audit 2026-09-04): the You card is r14.
					.background(Sim.tealTint, in: RoundedRectangle(cornerRadius: 14 * u))

					ForEach(top, id: \.rank) { LeaderRow(r: $0) }
					// The authored #46/#48 neighbours cluster around the persona's #47; an unranked
					// first-time user sees the top five only (audit 2026-09-07).
					if PaperPortfolio.shared.rank != nil {
						Text("· · ·")
							// 1:4205 (exact-design audit 2026-09-04): Geist Medium 13 - was Regular 12.
							.font(StakFont.geist(13 * u, .medium))
							.foregroundStyle(Sim.faint)
							.frame(maxWidth: .infinity)
						ForEach(near, id: \.rank) { LeaderRow(r: $0) }
					}
					Text("Percentage return, not dollar size, so everyone competes on the same scale. This week ranks the trailing 7 days.")
						.font(StakFont.geist(11 * u))
						.stakLineHeight(16 * u, size: 11 * u, face: .geist)
						.foregroundStyle(Sim.faint)
						// 1:4124 centres the explainer across the full column width.
						.multilineTextAlignment(.center)
						.frame(maxWidth: .infinity)
				}
				.padding(.horizontal, 20 * u)
				.padding(.top, 6 * u)
				.padding(.bottom, 26 * u) // 1:4146 pb 26 (exact-design audit 2026-09-04)
			}
		}
		.background(StakColors.bg.ignoresSafeArea())
	}
}

private struct PeriodChip: View {
	let label: String
	let selected: Bool

	var body: some View {
		let u = figmaUnit
		Text(label)
			.font(StakFont.geist(12 * u, .medium))
			.foregroundStyle(selected ? Sim.teal : Sim.muted)
			.padding(.horizontal, 13 * u)
			.padding(.vertical, 7 * u)
			// 1:4148 (exact-design audit 2026-09-04): r15, fill only - the selected chip carries no hairline.
			.background(selected ? Sim.tealTint : Sim.cardBg, in: RoundedRectangle(cornerRadius: 15 * u))
	}
}

private struct LeaderRow: View {
	let r: Rank

	var body: some View {
		let u = figmaUnit
		HStack(spacing: 11 * u) {
			Text(r.rank)
				.font(StakFont.sora(12 * u, .semiBold))
				.foregroundStyle(Sim.faint)
				.frame(width: 24 * u, alignment: .leading)
			ZStack {
				Circle().fill(Sim.chipBg)
				Text(r.initial)
					.font(StakFont.sora(13 * u, .semiBold))
					.foregroundStyle(Sim.badgeInk)
			}
			.frame(width: 32 * u, height: 32 * u)
			VStack(alignment: .leading, spacing: 2 * u) {
				Text(r.name)
					.font(StakFont.sora(12 * u, .medium)) // 1:4170 Sora Medium, not Geist (exact-design audit 2026-09-04)
					.foregroundStyle(Color.white)
				Text(r.picks)
					.font(StakFont.geist(10 * u))
					.foregroundStyle(Sim.faint) // 1:4171 #5c6b85 (exact-design audit 2026-09-04)
			}
			.frame(maxWidth: .infinity, alignment: .leading)
			Text(r.pct)
				.font(StakFont.sora(12 * u, .semiBold))
				.foregroundStyle(Sim.headerGray)
		}
		.padding(.horizontal, 14 * u)
		.padding(.vertical, 11 * u)
		// Authored rows are 54 tall with a 16 gap (1:4124) - pinned so nine rows land
		// on the frame's grid (mirrors the Android leaderboard fix, 2026-09-05).
		.frame(height: 54 * u)
		.background(Sim.cardBg, in: RoundedRectangle(cornerRadius: 12 * u))
	}
}
