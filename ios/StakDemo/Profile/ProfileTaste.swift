import Foundation

/// What the Profile hub and the Taste & risk page say about the account (08 · Profile, 2026-10-07).
/// The demo persona reads the authored copy (1:5665 / 1:5732); a created account reads its own
/// onboarding answers through TasteModel. Mirrors android ui/profile/ProfileTaste.kt.
enum ProfileTaste {
	/// The hub's YOUR STAK line: the strongest taste chip in sentence case · the risk style's lead word ("Tech curious · Growth").
	static func summary() -> String {
		let lead = riskLabel().split(separator: "-").first.map(String.init) ?? riskLabel()
		return sentence(chips().first ?? "") + " · " + (lead.split(separator: " ").first.map(String.init) ?? lead)
	}

	/// The YOUR TASTE chips - the persona's authored three, else the account's strongest tastes.
	static func chips() -> [String] {
		let p = UserProfile.shared
		return Session.shared.demoAccount ? ["Tech Curious", "High Growth", "Consumer Brands"] : TasteModel.chips(p.brandPicks, goal: p.goal, risk: p.risk)
	}

	/// The RISK STYLE row: the stored style in the page's authored casing ("Growth-oriented", not 07's "Growth-Oriented").
	static func riskLabel() -> String {
		let s = UserProfile.shared.riskStyle
		guard let dash = s.firstIndex(of: "-") else { return s }
		return String(s[..<dash]) + "-" + s[s.index(after: dash)...].lowercased()
	}

	/// The caption under the risk card - the authored line for Growth-oriented, one per other style.
	static func riskBlurb() -> String {
		switch riskLabel() {
		case "Balanced": return "You hold through the dips and watch closely. Your deck mixes steady names with a few growth picks."
		case "Conservative": return "You step back when things drop. Your deck leans toward steady names and skips the wildest swings."
		case "Cautious": return "You protect what you have first. Your deck favours steady, dividend-paying names."
		default: return "You accept bigger swings for bigger upside. Your deck leans toward growth names and skips the steadiest ones."
		}
	}

	/// The GOAL row - the persona's authored "Long-term growth"; a created account's 04 answer.
	static func goalLabel() -> String {
		switch UserProfile.shared.goal {
		case TasteModel.goalLearn: return "Learn the basics"
		case TasteModel.goalFirstStocks: return "First stocks"
		case TasteModel.goalExplore: return "Just exploring"
		default: return "Long-term growth"
		}
	}

	/// The caption under the goal card - the authored line for Long-term growth, one per other goal.
	static func goalBlurb() -> String {
		switch UserProfile.shared.goal {
		case TasteModel.goalLearn: return "You’re here to understand how investing works. The brief explains the why behind every move."
		case TasteModel.goalFirstStocks: return "You want names worth watching. Your deck leads with companies you already know."
		case TasteModel.goalExplore: return "You’re looking around with no plan yet. Your deck stays broad until you pick a direction."
		default: return "You’re building a position over years, not weeks. The brief and your deck are tuned for that."
		}
	}

	private static func sentence(_ s: String) -> String {
		let lower = s.lowercased()
		guard let first = lower.first else { return lower }
		return first.uppercased() + lower.dropFirst()
	}
}

/// Profile · Taste & risk (1:5732): "Retake the taste quiz" / "Change" re-enter the onboarding
/// quiz from the profile; the retake flow returns to the page after 07 Taste reveal's Lets go
/// instead of going on to 08. Mirrors android QuizRetake.
enum QuizRetake {
	static var active = false
}
