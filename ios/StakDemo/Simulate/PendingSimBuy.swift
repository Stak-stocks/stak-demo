import Foundation

/// "Practice with ... · paper money" hands the stock to Simulate: the request waits here until the Simulate tab can
/// open its ticket. Mirrors android ui/simulate/PendingSimBuy.kt.
@MainActor
enum PendingSimBuy {
	private static var symbol: String? = nil
	private static var company: String? = nil

	static func request(_ symbol: String, company: String) {
		self.symbol = symbol
		self.company = company
	}

	/// The waiting request, left in place.
	static func peek() -> (symbol: String, company: String)? {
		guard let symbol else { return nil }
		return (symbol, company ?? symbol)
	}

	/// Spends the request - once the ticket can actually be opened.
	static func take() {
		symbol = nil
		company = nil
	}
}
