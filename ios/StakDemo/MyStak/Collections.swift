import SwiftUI

/// One stock tile in a collection - the fields of the 1:3375 tile template.
/// Mirrors the android/ ui/mystak CollStock.
struct CollStock: Identifiable {
	let badge: String
	let change: String
	let up: Bool
	let ticker: String
	let company: String
	let price: String
	var id: String { ticker }
}

/// One My STAK collection: what its Overview chip (1:3180) and its
/// Collection page hero (1:3333) serve. `image` is glass art (MsColl*),
/// `icon` a category glyph (IcCat*) - a collection carries one or the other.
struct StakCollection: Identifiable {
	let id: String
	let name: String
	/// The authored "5 stocks" label (1:3180 / 1:3333) - kept as the record
	/// of what was drawn; nothing renders it since the holdings store drives
	/// every count (Codex audit 2026-09-04).
	let count: String
	let blurb: String
	var image: String? = nil
	var icon: String? = nil
	/// The collection page's 60 hero (1:3357 authors AI & Tech's glass art at
	/// 60). Every collection draws its own art at that size - the four
	/// category icons are the 4x exports of their 1:3155 cat-icon frames
	/// (user, 2026-09-05). Declared before `stocks`: memberwise-init order.
	let hero: String
	let stocks: [CollStock]

	/// Codex audit (2026-09-04): the stocks of this collection the user
	/// still holds - the chip count, the hero count and the tile grid all
	/// read this, so a deck save or an Unsave moves every number at once.
	/// Mirrors android ui/mystak/Collections.kt.
	func held(in holdings: Set<String>) -> [CollStock] {
		stocks.filter { holdings.contains($0.ticker) }
	}
}

/// "1 stock" / "N stocks" - the chip, hero and allocation count text.
/// Mirrors android ui/mystak/Collections.kt heldCountLabel.
func heldCountLabel(_ n: Int) -> String {
	n == 1 ? "1 stock" : "\(n) stocks"
}

/// Codex parity audit (2026-09-04): every chip carries its own collection
/// and the Collection page serves the tapped one through the same authored
/// template (1:3333) - exactly as the Discover deck's "Learn more" serves
/// the tapped stock. AI & Tech keeps the authored sample verbatim; the
/// other five are the shared demo seed the backend would serve.
/// Mirrors the android/ ui/mystak collection catalogue.
enum StakCollections {
	static let all: [StakCollection] = [
		StakCollection(
			id: "aitech", name: "AI & Tech", count: "5 stocks",
			blurb: "Your highest-conviction growth and AI names.",
			image: "MsCollAITech",
			hero: "MsCollAITech",
			stocks: [
				CollStock(badge: "N", change: "▲ 2.4%", up: true, ticker: "NVDA", company: "Nvidia", price: "$122.10"),
				CollStock(badge: "A", change: "▲ 1.2%", up: true, ticker: "AAPL", company: "Apple", price: "$229.35"),
				CollStock(badge: "M", change: "▼ 0.4%", up: false, ticker: "MSFT", company: "Microsoft", price: "$438.20"),
				CollStock(badge: "G", change: "▲ 0.8%", up: true, ticker: "GOOGL", company: "Alphabet", price: "$178.90"),
				CollStock(badge: "A", change: "▲ 2.1%", up: true, ticker: "AMD", company: "Adv Micro", price: "$164.30")
			]
		),
		StakCollection(
			id: "finance", name: "Finance", count: "3 stocks",
			blurb: "The banks and payment rails that move money.",
			image: "MsCollFinance",
			hero: "MsCollFinance",
			stocks: [
				CollStock(badge: "J", change: "▲ 0.6%", up: true, ticker: "JPM", company: "JPMorgan", price: "$245.60"),
				CollStock(badge: "V", change: "▲ 0.3%", up: true, ticker: "V", company: "Visa", price: "$352.10"),
				CollStock(badge: "G", change: "▼ 0.5%", up: false, ticker: "GS", company: "Goldman Sachs", price: "$612.40")
			]
		),
		StakCollection(
			id: "green", name: "Green Energy", count: "3 stocks",
			blurb: "Solar, the grid and the utilities going clean.",
			icon: "IcCatGreen",
			hero: "MsCollGreen",
			stocks: [
				CollStock(badge: "E", change: "▲ 1.9%", up: true, ticker: "ENPH", company: "Enphase", price: "$78.40"),
				CollStock(badge: "N", change: "▲ 0.4%", up: true, ticker: "NEE", company: "NextEra", price: "$84.20"),
				CollStock(badge: "F", change: "▼ 1.1%", up: false, ticker: "FSLR", company: "First Solar", price: "$228.90")
			]
		),
		StakCollection(
			id: "realestate", name: "Real Estate", count: "2 stocks",
			blurb: "Your small hedge: warehouses and rent checks.",
			icon: "IcCatRealEstate",
			hero: "MsCollRealEstate",
			stocks: [
				CollStock(badge: "P", change: "▲ 0.2%", up: true, ticker: "PLD", company: "Prologis", price: "$118.30"),
				CollStock(badge: "O", change: "▼ 0.3%", up: false, ticker: "O", company: "Realty Income", price: "$59.10")
			]
		),
		StakCollection(
			id: "health", name: "Healthcare", count: "4 stocks",
			blurb: "Drugmakers and insurers with steady demand.",
			icon: "IcCatHealth",
			hero: "MsCollHealth",
			stocks: [
				CollStock(badge: "L", change: "▲ 1.4%", up: true, ticker: "LLY", company: "Eli Lilly", price: "$792.50"),
				CollStock(badge: "U", change: "▼ 0.8%", up: false, ticker: "UNH", company: "UnitedHealth", price: "$318.70"),
				CollStock(badge: "J", change: "▲ 0.5%", up: true, ticker: "JNJ", company: "Johnson & Johnson", price: "$162.40"),
				CollStock(badge: "P", change: "▼ 0.2%", up: false, ticker: "PFE", company: "Pfizer", price: "$25.30")
			]
		),
		StakCollection(
			id: "consumer", name: "Consumer", count: "2 stocks",
			blurb: "Brands people keep buying, in any market.",
			icon: "IcCatConsumer",
			hero: "MsCollConsumer",
			stocks: [
				CollStock(badge: "C", change: "▲ 0.7%", up: true, ticker: "COST", company: "Costco", price: "$947.20"),
				CollStock(badge: "N", change: "▼ 1.3%", up: false, ticker: "NKE", company: "Nike", price: "$72.80")
			]
		)
	]

	/// The collection an Overview chip pushed; an unknown id serves the
	/// authored AI & Tech sample, like `stockFacts` falls back to AAPL.
	static func collection(_ id: String) -> StakCollection {
		// An open Other page whose last stock was just removed keeps an EMPTY Other (Codex review, PR #166 mirror), not AI & Tech.
		if id == otherId { return other(holdings: MyStakHoldings.shared.tickers) ?? other(stocks: []) }
		return all.first { $0.id == id } ?? all[0]
	}

	static let otherId = "other"

	/// The stocks the user holds that no collection catalogues - news saves such
	/// as AMZN, MU, PLTR, TSLA or XOM (Codex review, PR #167). Built from the
	/// holdings and the news feed's stock facts, so every saved ticker has a tile
	/// to open and unsave from; nil while nothing uncatalogued is held. The demo
	/// persona keeps its authored six-tile grid (its TSLA / SNOW are the authored
	/// Best / Worst stand-ins). Mirrors android otherCollection().
	static func other(holdings: Set<String>) -> StakCollection? {
		let catalogued = Set(all.flatMap { $0.stocks }.map(\.ticker))
		// The persona's seeded TSLA/SNOW are the frame's until the persona saves one itself -
		// a recorded save day makes it a real, reversible save (Codex review, PR #166 mirror).
		let extra = holdings.filter { !catalogued.contains($0) && !(StakStore.demoAccount && MyStakHoldings.seed.contains($0) && MyStakHoldings.shared.daysSinceSaved($0) == nil) }.sorted()
		if extra.isEmpty { return nil }
		let stocks = extra.map { t -> CollStock in
			let known = NewsArticleFeed.hasStockFacts(t)
			let f = NewsArticleFeed.stockFacts(t)
			let move = f.change.replacingOccurrences(of: "+", with: "").replacingOccurrences(of: "-", with: "").replacingOccurrences(of: " today", with: "")
			return CollStock(
				badge: String(t.prefix(1)),
				change: known ? (f.up ? "▲ " : "▼ ") + move : "—",
				up: known ? f.up : true,
				ticker: t,
				company: known ? f.shortName : t,
				price: known ? f.price : "—"
			)
		}
		return other(stocks: stocks)
	}

	/// The Other collection around the given tiles - empty for a page that just lost its last one.
	private static func other(stocks: [CollStock]) -> StakCollection {
		StakCollection(
			id: otherId, name: "Other", count: "",
			blurb: "Stocks you saved from the news that sit outside the six collections.",
			icon: "IcSavedBookmark", hero: "IcSavedBookmark", stocks: stocks
		)
	}
}
