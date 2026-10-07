import SwiftUI

/// The stocks in the user's My STAK (user, 2026-08-23): a story earns the
/// "In your STAK" chip only when it relates to a stock the user actually
/// holds - Google news + Google in My STAK -> chip; otherwise none.
///
/// Codex audit (2026-09-04): this store is the single source of truth for
/// every My STAK number - the chip counts, "Across N stocks", the Breakdown
/// buckets and the Collection page's tiles all derive from it, and Unsave
/// drops a ticker from all of them at once. The demo seed is every ticker the
/// six authored collections list plus the Overview's Best/Worst (TSLA/SNOW) =
/// 21. Saves from the Discover deck and the article bookmark add to it, and
/// every save and unsave is written to the server (PUT api/me/android-stocks),
/// which serves the holdings back on the next launch or device.
/// Mirrors android data/MyStakHoldings.kt.
final class MyStakHoldings: ObservableObject {
	static let shared = MyStakHoldings()

	/// The authored demo account's holdings (the frames' 5/3/3/2/4/2 counts).
	static let seed: Set<String> = [
		"NVDA", "AAPL", "MSFT", "GOOGL", "AMD", // AI & Tech
		"JPM", "V", "GS", // Finance
		"ENPH", "NEE", "FSLR", // Green Energy
		"PLD", "O", // Real Estate
		"LLY", "UNH", "JNJ", "PFE", // Healthcare
		"COST", "NKE", // Consumer
		"TSLA", "SNOW", // Overview Best/Worst - no collection lists them
	]

	/// How many stocks a Stak holds. Mirrors STAK_CAPACITY in shared/src/stakCapacity.ts, which the backend
	/// enforces on write (Android MyStakHoldings.CAPACITY).
	static let capacity = 30

	@Published private(set) var tickers: Set<String> = MyStakHoldings.seed

	/// What the server knows about each save: the company's name, the category the deck ranked it on, and the price
	/// when it was saved. My STAK reads this instead of the authored catalogue, so a stock outside the six demo
	/// collections still shows up with its real name and group.
	struct SavedStock: Codable {
		let ticker: String
		let brandId: String
		let name: String
		let category: String?
		let savedDay: Int?
		/// The exact moment of the save. The day alone can only find a close.
		let savedAtSec: Int64?
		let priceAtSave: Double?
	}

	@Published private(set) var details: [String: SavedStock] = [:]

	/// When each stock was saved on THIS account (local epoch day) - the "Since you saved" card reads it.
	private var savedAt: [String: Int] = [:]

	/// The save or unsave currently being written to the server. A refresh that overtook one read the server's
	/// pre-change list and wrote it back over the local change, so an unsaved stock reappeared (Android device
	/// audit, 2026-09-16). A read waits for the write in flight; each write waits for the one before it.
	private var pendingWrite: Task<Void, Never>? = nil

	private let repo = StockRepository.shared

	/// True for a signed-in, non-demo account: only then do saves reach the server. Set by `reset` - Session passes
	/// it in, because this store can't read the main-actor Session itself (and Session calls reset from its init).
	private var syncs = false
	/// Bumped by every `reset` (a sign-in, sign-out or account switch): a server read started for one account must
	/// never land in the next one's store.
	private var generation = 0

	/// Product audit (2026-09-05): a NEW account holds nothing until the user saves; the demo account keeps the seed.
	func reset(demo: Bool, signedIn: Bool = false) {
		generation += 1
		syncs = signedIn && !demo
		// Local prefs restore first - instant, no network wait.
		tickers = StakStore.stringSet("holdings") ?? (demo ? MyStakHoldings.seed : [])
		savedAt = [:]
		for entry in (StakStore.string("saved_at") ?? "").split(separator: ",") {
			let parts = entry.split(separator: "=", maxSplits: 1)
			if parts.count == 2, !parts[0].trimmingCharacters(in: .whitespaces).isEmpty, let day = Int(parts[1]) {
				savedAt[String(parts[0]).trimmingCharacters(in: .whitespaces)] = day
			}
		}
		details = readDetails()
		// Overlay with the server's state when signed in - silently no-ops on failure.
		Task { @MainActor in await self.refreshFromBackend() }
	}

	/// Re-reads the saved list and what the server knows about each save. Silent on failure. Main-actor, like every
	/// other change to this store.
	@MainActor
	func refreshFromBackend() async {
		guard syncs else { return }
		let started = generation
		// Never read the list out from under a save or unsave still being written.
		let awaited = pendingWrite
		await awaited?.value
		guard let resp = try? await repo.getAndroidStocks() else { return }
		// Signed out or switched account meanwhile: this answer belongs to someone else.
		guard generation == started else { return }
		// A save or unsave started while the read was out: the server's list predates it, and applying it would
		// quietly undo the change (it will be re-read after that write).
		guard pendingWrite == awaited else { return }
		let fresh = resp.tickers
		let saved: [String: SavedStock]? = resp.saved.isEmpty ? nil : Dictionary(
			resp.saved.filter { !$0.ticker.isEmpty }.map { s in
				(s.ticker, SavedStock(
					ticker: s.ticker,
					brandId: s.brandId,
					name: s.name.isEmpty ? s.ticker : s.name,
					category: s.category,
					savedDay: s.savedAt.flatMap(MyStakHoldings.epochDay(of:)),
					savedAtSec: s.savedAt.flatMap(MyStakHoldings.epochSec(of:)),
					priceAtSave: s.priceAtSave
				))
			},
			uniquingKeysWith: { $1 }
		)
		if !fresh.isEmpty { tickers = Set(fresh) }
		if let saved { details = saved }
		persist()
	}

	// MARK: - Reads

	/// Every held ticker - the Overview's "Across N stocks".
	var count: Int { tickers.count }

	/// True when the Stak cannot take another stock.
	var isFull: Bool { tickers.count >= MyStakHoldings.capacity }

	/// True when any of the story's related tickers is held.
	func holdsAny(_ related: [String]) -> Bool { related.contains { tickers.contains($0) } }

	/// A ticker the demo persona's authored history carries (never an "Other" tile).
	func isSeed(_ ticker: String) -> Bool { MyStakHoldings.seed.contains(bare(ticker)) }

	/// Days since the stock was saved on this account; nil when the save predates the record (the demo's authored
	/// saves). The server's date wins - it survives a reinstall and a second device, which the local note does not.
	func daysSinceSaved(_ ticker: String) -> Int? {
		let sym = bare(ticker)
		guard let day = details[sym]?.savedDay ?? savedAt[sym] else { return nil }
		return MyStakHoldings.today - day
	}

	/// The company's name as the catalogue has it ("NVIDIA"), or nil for a save we haven't synced.
	func nameOf(_ ticker: String) -> String? { details[bare(ticker)]?.name }

	/// The brand this save points at ("tsla") - the key the brand endpoints take.
	func brandIdOf(_ ticker: String) -> String? { details[bare(ticker)].flatMap { $0.brandId.isEmpty ? nil : $0.brandId } }

	/// The category the deck ranked this save on ("semiconductor"), or nil when unsynced.
	func categoryOf(_ ticker: String) -> String? { details[bare(ticker)]?.category }

	/// What the stock cost when it was saved - the "since you saved" move measures from here.
	func priceAtSave(_ ticker: String) -> Double? { details[bare(ticker)]?.priceAtSave }

	/// The exact moment of the save, in epoch seconds, when the server has told us.
	func savedInstant(_ ticker: String) -> Int64? { details[bare(ticker)]?.savedAtSec }

	/// The day the save was made (local epoch day): a save from before prices were stamped has no price of its own,
	/// but its date is enough to look up what the stock closed at that day.
	func savedEpochDay(_ ticker: String) -> Int? {
		let sym = bare(ticker)
		return details[sym]?.savedDay ?? savedAt[sym]
	}

	// MARK: - Writes

	/// Saves the stock. `brandId` and `priceNow` are what the Discover deck knows at the moment of the swipe; passing
	/// them stamps what the stock cost when it was saved, which is the only honest moment to record it. Returns false
	/// when the Stak is full: the server rejects a save past `capacity` and the sync swallows the failure, so an
	/// unrefused save would leave the card looking saved while the server kept a different list.
	@discardableResult
	func add(_ ticker: String, brandId: String? = nil, priceNow: Double? = nil) -> Bool {
		let sym = bare(ticker)
		if tickers.contains(sym) { return true }
		if tickers.count >= MyStakHoldings.capacity { return false }
		tickers.insert(sym)
		if savedAt[sym] == nil { savedAt[sym] = MyStakHoldings.today }
		persist()
		syncToBackend(brandId: brandId, priceNow: priceNow)
		return true
	}

	/// Unsave (Stock Detail from My STAK) - the same bare-symbol normalisation as add.
	func remove(_ ticker: String) {
		let sym = bare(ticker)
		tickers.remove(sym)
		savedAt[sym] = nil
		persist()
		syncToBackend()
	}

	private func syncToBackend(brandId: String? = nil, priceNow: Double? = nil) {
		guard syncs else { return }
		let snapshot = Array(tickers).sorted()
		// Chained, not just replaced: two quick saves started two PUTs with no order between them, so the older list
		// could land last and win. Each write now waits for the one before it, and a refresh waits for the tail.
		let previous = pendingWrite
		let repo = self.repo
		pendingWrite = Task { @MainActor in
			await previous?.value
			_ = try? await repo.putAndroidStocks(snapshot)
			// The row has to exist before its price can be stamped, so this follows the PUT rather than racing it -
			// the server only keeps the first value.
			if let brandId, !brandId.isEmpty, let priceNow, priceNow > 0 {
				_ = try? await repo.patchStakPrice(brandId: brandId, price: priceNow)
			}
		}
	}

	// MARK: - Storage

	private func persist() {
		StakStore.set(tickers, for: "holdings")
		StakStore.set(savedAt.map { "\($0.key)=\($0.value)" }.sorted().joined(separator: ","), for: "saved_at")
		if let data = try? JSONEncoder().encode(Array(details.values)) { StakStore.set(data, for: "saved_details") }
	}

	private func readDetails() -> [String: SavedStock] {
		guard let data = StakStore.data("saved_details"),
			  let list = try? JSONDecoder().decode([SavedStock].self, from: data) else { return [:] }
		return Dictionary(list.filter { !$0.ticker.isEmpty }.map { ($0.ticker, $0) }, uniquingKeysWith: { $1 })
	}

	// MARK: - Dates

	/// Today as a LOCAL epoch day (Android's LocalDate.now().toEpochDay()).
	static var today: Int { localEpochDay(Date()) }

	private static func localEpochDay(_ date: Date) -> Int {
		let seconds = date.timeIntervalSince1970 + Double(TimeZone.current.secondsFromGMT(for: date))
		return Int((seconds / 86_400).rounded(.down))
	}

	private static let isoFractional: ISO8601DateFormatter = {
		let f = ISO8601DateFormatter()
		f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
		return f
	}()
	private static let isoPlain = ISO8601DateFormatter()

	/// A server timestamp, with or without fractional seconds - shared by the pages that read the server's dates.
	static func parse(_ iso: String) -> Date? { isoFractional.date(from: iso) ?? isoPlain.date(from: iso) }

	/// The server's timestamp as epoch seconds - the moment, not just the day.
	private static func epochSec(of iso: String) -> Int64? { parse(iso).map { Int64($0.timeIntervalSince1970) } }

	/// The server's timestamp as a local epoch day; nil when it isn't a date we can read.
	private static func epochDay(of iso: String) -> Int? { parse(iso).map(localEpochDay) }

	// MARK: -

	/// Deck cards carry "NVDA · NVIDIA Corp" - hold the bare symbol.
	private func bare(_ ticker: String) -> String {
		(ticker.components(separatedBy: " · ").first ?? ticker).trimmingCharacters(in: .whitespaces)
	}

	private init() {}
}
