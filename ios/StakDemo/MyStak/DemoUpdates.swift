import Foundation

/// The demo account's "Updates in your STAK" - its persona has no saved companies on the server to detect changes for,
/// so the showcase carries its own, in the shape a real account's updates arrive in. Mirrors android
/// ui/mystak/DemoUpdates.kt.
@MainActor
enum DemoUpdates {
	private static var read = Set<Int64>()

	private static let sample: [StockUpdateDto] = [
		StockUpdateDto(
			id: -1, ticker: "MSFT", company: "Microsoft", kind: "earnings",
			title: "Cloud growth slowed",
			body: "Azure grew more slowly than last quarter, though it still makes up most of the company's growth.",
			watch: "Cloud demand is a key growth driver.",
			sources: [UpdateSourceDto(source: "Reuters", url: "", headline: "Microsoft cloud growth cools from last quarter")],
			occurredAt: ""
		),
		StockUpdateDto(
			id: -2, ticker: "GOOGL", company: "Alphabet", kind: "earnings",
			title: "Cloud profit improved",
			body: "More of Google's cloud revenue is turning into profit as its data centers fill up.",
			watch: "Watch whether those margins hold.",
			sources: [UpdateSourceDto(source: "CNBC", url: "", headline: "Google Cloud margins improve again")],
			occurredAt: ""
		),
		StockUpdateDto(
			id: -3, ticker: "NFLX", company: "Netflix", kind: "guidance",
			title: "Revenue outlook raised",
			body: "Netflix now expects higher sales this year than it did three months ago.",
			watch: "Its next results will test that outlook.",
			sources: [UpdateSourceDto(source: "Bloomberg", url: "", headline: "Netflix lifts full-year revenue forecast")],
			occurredAt: ""
		),
	]

	static var list: [StockUpdateDto] {
		sample.map { u in
			var copy = u
			if read.contains(u.id) { copy.read = true }
			return copy
		}
	}

	static func markRead(_ id: Int64) { read.insert(id) }
}
