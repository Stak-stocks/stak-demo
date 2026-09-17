import Foundation

/// Market Mood data source.
///
/// CONTRACT (designer, 2026-08-22): the mood is computed by the STAK
/// BACKEND from current economic news trends and investor bias - the
/// app only renders the served score. `angleFor(score:)` maps the
/// backend's 0..100 onto the gauge's 180deg sweep (0 = trouble/red on
/// the right, 100 = good/green on the left).
///
/// In this build phase `live` stays false so the gauge always matches
/// the authored frame's rest pose. When the backend endpoint
/// exists, point refresh() at it and flip `live`. The CNN Fear & Greed
/// fetch below is an INTERIM reference implementation only.
enum MarketMoodFeed {
	/// Production switch — keep false while reviews compare build vs frame.
	static let live = false

	/// Authored rest pose measured from the 1:1159 SVG itself (blob
	/// center -> tip axis). Under angleFor() this corresponds to score
	/// ~14.6 - recalibrate the mapping against the backend's scale when
	/// it lands (the old 33.4 was a raster estimate with a wrong pivot).
	static let demoAngleDeg: Double = 26.27

	/// The status line is backend-served with the score (designer,
	/// 2026-08-22): the lead word pair and the advice change with the
	/// computed mood. Authored demo copy for this phase:
	static let demoStatusLead = "High volatility"
	static let demoStatusRest = ", you should consider being cautious."

	/// The last served score (nil until `live` delivers one).
	static private(set) var score: Double? = nil

	/// The status line BOTH mood cards read - Home's and the News mood row
	/// (Codex audit 2026-09-04: News hard-coded "Low volatility" against the
	/// same needle resting in the red band). The served score's band once
	/// live; the authored demo copy until then. Bands follow the gauge
	/// arcs: red (score < 33) = high, neutral = moderate, green (> 66) = low.
	/// Copy for the two non-demo bands is a stand-in until the backend
	/// serves the status line with the score (designer, 2026-08-22).
	static var statusLead: String { score.map(leadFor) ?? demoStatusLead }
	static var statusRest: String { score.map(restFor) ?? demoStatusRest }

	static func leadFor(score: Double) -> String {
		if score < 33 { return "High volatility" }
		if score <= 66 { return "Moderate volatility" }
		return "Low volatility"
	}

	static func restFor(score: Double) -> String {
		if score < 33 { return demoStatusRest }
		if score <= 66 { return ", a mixed picture - stay selective." }
		return ", markets are calm right now."
	}

	/// 0 = extreme fear (red, right) … 100 = greed (green, left).
	static func angleFor(score: Double) -> Double { min(max(score, 0), 100) / 100 * 180 }

	/// Fetches the live score and delivers the needle angle on the main
	/// queue. No-op while `live` is false. The CNN endpoint 4xx's without
	/// browser-looking headers — keep all three.
	static func refresh(_ apply: @escaping (Double) -> Void) {
		guard live else { return }
		guard let url = URL(string: "https://production.dataviz.cnn.io/index/fearandgreed/graphdata") else { return }
		var req = URLRequest(url: url)
		req.setValue(
			"Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
			forHTTPHeaderField: "User-Agent"
		)
		req.setValue("application/json", forHTTPHeaderField: "Accept")
		req.setValue("https://edition.cnn.com/markets/fear-and-greed", forHTTPHeaderField: "Referer")
		URLSession.shared.dataTask(with: req) { data, _, _ in
			guard
				let data,
				let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
				let fg = obj["fear_and_greed"] as? [String: Any],
				let score = fg["score"] as? Double
			else { return }
			DispatchQueue.main.async {
				Self.score = score
				apply(angleFor(score: score))
			}
		}.resume()
	}
}
