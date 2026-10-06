import Foundation

/// "Why this matters to you" data source (CHINEDU 1:1176). Mirrors android ui/home/WhyThisMattersFeed.kt.
///
/// CONTRACT (user, 2026-08-23): the card is a SUMMARY of why the day's market news matters to THIS user - the daily
/// brief's personalizedImpact, computed by the backend from the news, the user's saved stocks and their risk profile.
enum WhyThisMattersFeed {
	// user, 2026-09-04: grammar fixed, frame typo not copied.
	static let demoBody = "Your STAK collections house 80% of stocks from affected industries."

	/// A new account with nothing saved yet (product audit, 2026-09-05).
	static let emptyBody = "Save a few stocks and STAK will show how today's news hits them."

	/// Said once the brief has come back without a summary for this account.
	static let unavailableBody = "Today's read on your STAK isn't available."

	/// The served summary when there is one. A real account no longer falls back to a line counted against the
	/// authored news ("None of your 4 saved stocks are in today's news"), which described stories the user never saw;
	/// it stays empty while the brief loads and says so if the brief comes back without one.
	static func body(brief: DailyBriefResponse?, savedCount: Int, demo: Bool) -> String {
		if let impact = brief?.personalizedImpact, !impact.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
			return impact
		}
		if savedCount == 0 { return emptyBody }
		if demo { return demoBody }
		return brief == nil ? "" : unavailableBody
	}
}
