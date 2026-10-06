import SwiftUI

/// Market Mood data source - the score and status line come straight from the daily brief's mood word, served by the
/// backend (NewsViewModel.dailyBrief, the one brief Home and News both read). Mirrors android ui/home/MarketMoodFeed.kt.
///
/// A real account never sees the authored reading as a stand-in (device check, 2026-09-16): until the brief arrives
/// the card says it is still reading, or that the mood isn't available, and draws no needle. The demo account keeps
/// its authored pose.
enum MarketMoodFeed {
	/// Authored demo needle angle (the 1:1159 SVG's own pose) for the demo account.
	static let demoAngleDeg: Double = 26.27

	static let demoStatusLead = "High volatility"
	static let demoStatusRest = ", you should consider being cautious."

	/// The brief's mood, or nil while it hasn't arrived or came back without one.
	static func mood(_ brief: DailyBriefResponse?) -> String? {
		guard let m = brief?.mood, !m.trimmingCharacters(in: .whitespaces).isEmpty else { return nil }
		return m
	}

	/// True once the brief request has finished, whatever it brought back (a failure is stored as an empty mood).
	static func settled(_ brief: DailyBriefResponse?) -> Bool { brief != nil }

	/// Score (0–100) from the served mood word; nil until there is one.
	static func score(_ brief: DailyBriefResponse?) -> Double? { mood(brief).map(scoreForMood) }

	/// Whether the gauge has a reading to point at; the demo always shows its authored one.
	static func hasReading(_ brief: DailyBriefResponse?, demo: Bool) -> Bool { demo || score(brief) != nil }

	static func statusLead(_ brief: DailyBriefResponse?, demo: Bool) -> String {
		if let m = mood(brief) { return leadForMood(m) }
		if demo { return demoStatusLead }
		return settled(brief) ? "Mood unavailable" : "Reading the market"
	}

	static func statusRest(_ brief: DailyBriefResponse?, demo: Bool) -> String {
		if let m = mood(brief) { return restForMood(m) }
		if demo { return demoStatusRest }
		return settled(brief) ? " right now." : "\u{2026}"
	}

	/// The needle's angle: the served score's, or the authored pose for the demo and while there's no reading.
	static func angle(_ brief: DailyBriefResponse?) -> Double { score(brief).map(angleFor) ?? demoAngleDeg }

	/// How the served mood word is compared: case and surrounding spaces don't matter.
	private static func normalized(_ mood: String) -> String { mood.lowercased().trimmingCharacters(in: .whitespaces) }

	static func scoreForMood(_ mood: String) -> Double {
		switch normalized(mood) {
		case "bullish", "risk-on": return 85
		case "calm": return 72
		case "mixed": return 50
		case "cautious": return 40
		case "volatile": return 25
		case "bearish", "risk-off": return 12
		default: return 50
		}
	}

	static func leadForMood(_ mood: String) -> String {
		switch normalized(mood) {
		case "bullish": return "Bullish momentum"
		case "risk-on": return "Risk-On mode"
		case "calm": return "Calm markets"
		case "mixed": return "Mixed signals"
		case "cautious": return "Cautious tone"
		case "volatile": return "High volatility"
		case "bearish": return "Bearish pressure"
		case "risk-off": return "Risk-Off tone"
		default:
			// A mood the app doesn't know yet is still the served reading, not the demo's.
			let t = mood.trimmingCharacters(in: .whitespaces)
			return t.prefix(1).uppercased() + t.dropFirst()
		}
	}

	static func restForMood(_ mood: String) -> String {
		switch normalized(mood) {
		case "bullish", "risk-on": return ", momentum is building."
		case "calm": return ", markets are calm right now."
		case "mixed", "cautious": return ", a mixed picture across the market."
		case "volatile": return ", expect bigger swings than usual."
		case "bearish", "risk-off": return ", investors are pulling back."
		default: return "."
		}
	}

	/// Maps the score onto the gauge's sweep (0 = red/right, 180 = green/left).
	static func angleFor(_ score: Double) -> Double { min(max(score, 0), 100) / 100 * 180 }

	/// The needle's fraction of the arc (0 = red, 1 = green) - the same score Home's angle comes from, so News's
	/// gauge can't point somewhere else for the same mood.
	static func fractionFor(_ mood: String) -> Double { scoreForMood(mood) / 100 }

	/// The mood's colour - one definition for every screen that tints something by mood.
	static func colorFor(_ mood: String) -> Color {
		switch normalized(mood) {
		case "bullish", "risk-on": return Color(argb: 0xFF2FD08A)
		case "mixed": return Color(argb: 0xFFDEB940)
		case "cautious", "volatile": return Color(argb: 0xFFF5A623)
		case "bearish": return Color(argb: 0xFFFF5252)
		case "risk-off": return Color(argb: 0xFFB06BE3)
		default: return Color(argb: 0xFF69B3CA)
		}
	}
}
