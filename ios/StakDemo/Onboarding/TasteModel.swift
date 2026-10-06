import SwiftUI

/// One taste bar — label, strength word (its own gray), fill fraction of the track.
struct TasteBar: Identifiable {
	let label: String
	let strength: String
	let strengthColor: Color
	let fraction: CGFloat
	var id: String { label }
}

/// The onboarding answers, turned into the taste reveal, the risk style and the
/// Profile chips (product audit, 2026-09-05: the reveal used to be fixed copy and the
/// quiz answers went nowhere). Deterministic and tiny: each taste is the share of the
/// user's brand picks that belong to it, nudged by the goal and the risk answer.
/// Mirrors android TasteModel.kt.
enum TasteModel {
	private static let tech: Set<String> = ["Apple", "Tesla", "Spotify", "Netflix", "Amazon", "Microsoft", "NVIDIA", "PlayStation", "Coinbase", "Uber"]
	private static let growth: Set<String> = ["Tesla", "NVIDIA", "Coinbase", "Uber", "Amazon", "Spotify", "Netflix"]
	private static let consumer: Set<String> = ["Nike", "Disney", "Netflix", "Spotify", "Amazon", "PlayStation", "Uber", "Apple", "Tesla"]
	private static let income: Set<String> = ["Apple", "Microsoft", "Nike", "Disney"]

	// 04 Goal options, in card order.
	static let goalLearn = 0, goalGrow = 1, goalFirstStocks = 2, goalExplore = 3
	// 05 Risk options, in card order.
	static let riskBuyMore = 0, riskHold = 1, riskStepAway = 2, riskSellSome = 3

	static func riskStyle(_ risk: Int) -> String {
		switch risk {
		case riskBuyMore: return "Growth-Oriented"
		case riskHold: return "Balanced"
		case riskStepAway: return "Conservative"
		case riskSellSome: return "Cautious"
		default: return "Growth-Oriented"
		}
	}

	/// tech / growth / consumer / income, each 0...1.
	static func scores(_ picks: Set<String>, goal: Int, risk: Int) -> [CGFloat] {
		func share(_ group: Set<String>) -> CGFloat {
			picks.isEmpty ? 0 : CGFloat(picks.filter { group.contains($0) }.count) / CGFloat(picks.count)
		}
		let t = share(tech) + (goal == goalFirstStocks ? 0.1 : 0)
		let g = share(growth) + (goal == goalGrow ? 0.25 : 0) + (risk == riskBuyMore ? 0.2 : 0) - (risk == riskSellSome ? 0.2 : 0)
		let c = share(consumer)
		let i = share(income) + (risk == riskSellSome ? 0.3 : 0) + (risk == riskStepAway ? 0.15 : 0) + (goal == goalLearn ? 0.1 : 0)
		return [t, g, c, i].map { min(max($0, 0), 1) }
	}

	static func bars(_ picks: Set<String>, goal: Int, risk: Int) -> [TasteBar] {
		let labels = ["Tech curious", "Growth seeking", "Consumer brands", "Income & dividends"]
		return zip(labels, scores(picks, goal: goal, risk: risk)).map { label, s in
			let strength = strengthOf(s)
			return TasteBar(label: label, strength: strength, strengthColor: colorOf(strength), fraction: 0.2 + 0.8 * s)
		}
	}

	/// The Profile's YOUR TASTE chips, strongest first, at most three.
	static func chips(_ picks: Set<String>, goal: Int, risk: Int) -> [String] {
		let s = scores(picks, goal: goal, risk: risk)
		var out: [(CGFloat, String)] = []
		if s[0] >= 0.3 { out.append((s[0], "Tech Curious")) }
		if s[1] >= 0.45 { out.append((s[1], "High Growth")) }
		if s[2] >= 0.3 { out.append((s[2], "Consumer Brands")) }
		if s[3] >= 0.35 { out.append((s[3], "Income Focused")) }
		if risk == riskSellSome || risk == riskStepAway { out.append((0.5, "Risk Aware")) }
		if goal == goalLearn { out.append((0.4, "Learning")) }
		var seen = Set<String>()
		let chips = out.sorted { $0.0 > $1.0 }.map { $0.1 }.filter { seen.insert($0).inserted }.prefix(3)
		return chips.isEmpty ? ["Just Exploring"] : Array(chips)
	}

	private static func strengthOf(_ s: CGFloat) -> String {
		if s >= 0.6 { return "Strong" }
		if s >= 0.3 { return "Medium" }
		return "Light"
	}

	// The authored strength colours (1:687): teal / muted / faint.
	private static func colorOf(_ strength: String) -> Color {
		switch strength {
		case "Strong": return Color(argb: 0xFF69B3CA)
		case "Medium": return Color(argb: 0xFF819ABB)
		default: return Color(argb: 0xFF5C6B85)
		}
	}
}
