import Foundation

/// "Why this matters to you" data source (CHINEDU 1:1176). Mirrors
/// android ui/home/WhyThisMattersFeed.kt.
///
/// CONTRACT (user, 2026-08-23): the card is a SUMMARY of why the day's
/// market news matters to THIS user - computed by the STAK BACKEND from
/// (a) the current market news, (b) the stocks the user holds
/// (MyStakHoldings - the same holdings that gate the "In your STAK"
/// chip), and (c) the user's risk profile (UserProfile.riskStyle, from
/// the onboarding answers). The app renders the served summary in the
/// authored card; the title stays authored.
///
/// `live` stays false this phase; the demo body is the authored copy so
/// the rest state matches the frame.
enum WhyThisMattersFeed {
	/// Production switch - keep false while reviews compare build vs frame.
	static let live = false

	// user, 2026-09-04: grammar fixed, frame typo not copied.
	static let demoBody = "Your STAK collections house 80% of stocks from affected industries."

	/// The current summary - the served personalized copy once the backend exists.
	/// A new account with nothing saved yet (product audit, 2026-09-05).
	static let emptyBody = "Save a few stocks and STAK will show how today's news hits them."

	static func body() -> String {
		if MyStakHoldings.shared.count == 0 { return emptyBody }
		if Session.shared.demoAccount { return demoBody }
		// A new account's saves against today's stories (product audit, 2026-09-05).
		return StakInsights.whyThisMattersBody(newsTickers: NewsArticleFeed.relatedTickers())
	}
}
