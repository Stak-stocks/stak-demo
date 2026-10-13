import SwiftUI

/// The stories the user saved (bookmark / Add to STAK), shared by every article
/// page and persisted across relaunches (product audit, 2026-09-05: the flag used
/// to live in one view's @State). Mirrors android NewsSaves.kt.
final class NewsSaves: ObservableObject {
	static let shared = NewsSaves()
	@Published private(set) var ids: Set<String> = []

	func load() {
		ids = StakStore.stringSet("news.saved") ?? []
	}

	func add(_ id: String) {
		guard !ids.contains(id) else { return }
		ids.insert(id)
		StakStore.set(ids, for: "news.saved")
	}

	/// Unsaving a stock forgets the stories that saved it, so they offer Add to STAK again (Codex review, PR #167).
	func removeStories(ticker: String) {
		let next = ids.filter { NewsArticleFeed.ticker(of: $0) != ticker }
		guard next.count != ids.count else { return }
		ids = next
		StakStore.set(ids, for: "news.saved")
	}

	private init() {}
}
