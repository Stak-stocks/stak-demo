import Foundation
import SwiftUI

/// Where the account is on the Go live path (FigJam "STAK · Go live to buy and sell", 2026-09-14).
enum LiveStatus: String, Codable {
	case none, review, verified, rejected, live
}

/// The identity the user entered (KYC). The SSN is NEVER kept - it is validated on the step and dropped.
struct KycProfile: Codable, Equatable {
	var firstName = ""
	var lastName = ""
	var dob = ""
	var street = ""
	var city = ""
	var state = ""
	var zip = ""
	var employment = ""

	var fullName: String { "\(firstName) \(lastName)".trimmingCharacters(in: .whitespaces) }
}

/// A real-money position.
struct LiveHolding: Codable, Identifiable {
	let symbol: String
	let badge: String
	let name: String
	var shares: Double
	var avgPrice: Double
	var value: Double { shares * avgPrice }
	var id: String { symbol }
}

/// A live order: pending until the (demo) market fills it, then part of the holdings.
struct LiveOrder: Codable, Identifiable {
	let id: String
	let side: String
	let symbol: String
	let badge: String
	let name: String
	let amount: Double
	let shares: Double
	let price: Double
	let type: String
	let limit: Double?
	var status: String
	let day: String
	var isBuy: Bool { side == "BUY" }
}

/// A cash movement: deposits and withdrawals, processing then done.
struct LiveTx: Codable, Identifiable {
	let id: String
	let kind: String
	let amount: Double
	let method: String
	var status: String
	let day: String
	var isDeposit: Bool { kind == "deposit" }
}

/// The real-money account behind Go live (FigJam Full Cascade copies, 2026-09-14:
/// Go live -> Identity check -> Fund account -> Real money ON -> Account home,
/// Withdraw, and the Stock Detail's "Account live?" branch). A local mock: the
/// review resolves on the phone (an applicant under 18 is rejected, so the "Fix &
/// resubmit" edge is reachable), deposits settle after a moment, orders fill at
/// the catalogue price. Persisted per account through StakStore; the SSN never
/// touches storage. Mirrors android ui/live/LiveAccount.kt.
final class LiveAccount: ObservableObject {
	static let shared = LiveAccount()

	@Published private(set) var status = LiveStatus.none
	@Published private(set) var kyc = KycProfile()
	/// The verifier's note on a rejection.
	@Published private(set) var rejectionReason = ""
	@Published private(set) var bankName = ""
	@Published private(set) var bankLast4 = ""
	@Published private(set) var cash = 0.0
	@Published private(set) var holdings: [LiveHolding] = []
	@Published private(set) var orders: [LiveOrder] = []
	@Published private(set) var transactions: [LiveTx] = []

	var isLive: Bool { status == .live }
	var bankLinked: Bool { !bankLast4.isEmpty }
	var holdingsValue: Double { holdings.reduce(0) { $0 + $1.value } }
	/// Cash reserved for pending buys is still the account's money (review 2026-09-14).
	var accountValue: Double { cash + holdingsValue + pendingBuyCash }
	/// Cash the pending buys have not spent yet.
	var pendingBuyCash: Double { orders.filter { $0.isBuy && $0.status == "pending" }.reduce(0) { $0 + $1.amount } }

	/// The banks and cards the demo links (FigJam: Link card / bank).
	static let bankOptions: [(String, String)] = [("Chase", "4821"), ("Bank of America", "0193"), ("Wells Fargo", "7750"), ("Debit card", "2264")]

	private init() {}

	/// Called from Session.applyAccount - the account kind's own record, or nothing.
	func load() {
		status = .none
		kyc = KycProfile()
		rejectionReason = ""
		bankName = ""; bankLast4 = ""
		cash = 0
		holdings = []; orders = []; transactions = []
		if let data = StakStore.data("live"), let r = try? JSONDecoder().decode(Record.self, from: data) {
			status = r.status
			kyc = r.kyc
			rejectionReason = r.reason
			bankName = r.bankName; bankLast4 = r.bankLast4
			cash = r.cash
			holdings = r.holdings; orders = r.orders; transactions = r.transactions
		}
		// A deposit or withdrawal left processing by a killed app lands now (review 2026-09-14).
		settleProcessing()
	}

	// MARK: - Identity

	/// Agreements signed: the application goes under review. `ssn` is checked here and forgotten.
	func submit(_ profile: KycProfile, ssn: String) -> Bool {
		guard LiveAccount.ssnValid(ssn) else { return false }
		kyc = profile
		status = .review
		rejectionReason = ""
		persist()
		return true
	}

	/// The (demo) verifier's answer: 18 or over is verified, younger is rejected with the reason.
	func resolveReview() {
		guard status == .review else { return }
		if let age = LiveAccount.ageOf(kyc.dob), age >= 18 {
			status = .verified
		} else {
			status = .rejected
			rejectionReason = "You need to be 18 or over to open a real-money account. Check the date of birth and resubmit."
		}
		persist()
	}

	// MARK: - Funding

	func linkBank(_ name: String, last4: String) {
		bankName = name; bankLast4 = last4
		persist()
	}

	/// Adds a processing deposit; `settle` lands it in cash.
	func deposit(_ amount: Double) -> String {
		let id = newId("dep")
		transactions.insert(LiveTx(id: id, kind: "deposit", amount: amount, method: "\(bankName) ••\(bankLast4)", status: "processing", day: LiveAccount.today()), at: 0)
		persist()
		return id
	}

	func settle(_ txId: String) {
		guard let i = transactions.firstIndex(where: { $0.id == txId && $0.status == "processing" }) else { return }
		transactions[i].status = "done"
		if transactions[i].isDeposit { cash += transactions[i].amount }
		persist()
	}

	/// Lands every deposit / withdrawal still processing - a step left early, or the app killed
	/// mid-transfer (review 2026-09-14). settle() is a no-op once a transaction has landed.
	func settleProcessing() {
		for t in transactions where t.status == "processing" { settle(t.id) }
	}

	/// Fills every pending order the market would take; fill() keeps a waiting limit open.
	func fillPending() {
		for o in orders where o.status == "pending" { fill(o.id) }
	}

	/// Real money ON: cash is available and the account trades for real.
	func goLive() {
		if status == .verified { status = .live }
		persist()
	}

	/// A withdrawal leaves cash at once and shows as processing until the bank has it.
	func withdraw(_ amount: Double, method: String) -> String? {
		guard amount > 0, amount <= cash else { return nil }
		let id = newId("wd")
		cash -= amount
		transactions.insert(LiveTx(id: id, kind: "withdraw", amount: amount, method: method, status: "processing", day: LiveAccount.today()), at: 0)
		persist()
		return id
	}

	// MARK: - Trading

	func holding(_ symbol: String) -> LiveHolding? { holdings.first { $0.symbol == symbol } }

	/// Shares of a symbol already committed to pending sells (review 2026-09-14).
	func pendingSellShares(_ symbol: String) -> Double {
		orders.filter { !$0.isBuy && $0.status == "pending" && $0.symbol == symbol }.reduce(0) { $0 + $1.shares }
	}

	/// What the user can still sell: the holding minus its pending sells.
	func availableShares(_ symbol: String) -> Double { (holding(symbol)?.shares ?? 0) - pendingSellShares(symbol) }

	func canBuy(_ amount: Double) -> Bool { amount > 0 && amount <= cash }

	/// Places an order. A market order - or a buy limit at/above today's price, a sell limit at/below
	/// it - is pending until `fill` runs; a buy limit under today's price or a sell limit over it stays open.
	func place(side: String, symbol: String, badge: String, name: String, amount: Double, price: Double, type: String, limit: Double?) -> LiveOrder? {
		guard price > 0, amount > 0 else { return nil }
		var shares = amount / price
		var amount = amount
		if side == "BUY" {
			guard canBuy(amount) else { return nil }
			cash -= amount
		} else {
			// Shares in pending sells are not for sale twice; an amount within half a cent of the
			// whole available position sells all of it (the ticket rounds to cents) - review 2026-09-14.
			let available = availableShares(symbol)
			guard available > 1e-9 else { return nil }
			if amount >= available * price - 0.005 {
				shares = available
				amount = available * price
			} else if shares > available + 1e-9 {
				return nil
			}
		}
		let order = LiveOrder(id: newId("ord"), side: side, symbol: symbol, badge: badge, name: name, amount: amount, shares: shares, price: price, type: type, limit: limit, status: "pending", day: LiveAccount.today())
		orders.insert(order, at: 0)
		persist()
		return order
	}

	/// The demo market fills a pending order at its price: holdings and cash update (FigJam: Order filled -> holdings update).
	func fill(_ orderId: String) {
		guard let i = orders.firstIndex(where: { $0.id == orderId && $0.status == "pending" }) else { return }
		let o = orders[i]
		// A buy limit under today's price, or a sell limit over it, is still waiting (review 2026-09-14).
		if o.type == "limit", let limit = o.limit, (o.isBuy ? limit < o.price : limit > o.price) { return }
		if o.isBuy {
			if let h = holdings.firstIndex(where: { $0.symbol == o.symbol }) {
				let shares = holdings[h].shares + o.shares
				let avg = (holdings[h].shares * holdings[h].avgPrice + o.shares * o.price) / shares
				holdings[h].shares = shares
				holdings[h].avgPrice = avg
			} else {
				holdings.append(LiveHolding(symbol: o.symbol, badge: o.badge, name: o.name, shares: o.shares, avgPrice: o.price))
			}
		} else {
			guard let h = holdings.firstIndex(where: { $0.symbol == o.symbol }) else { return }
			let left = holdings[h].shares - o.shares
			if left <= 1e-6 { holdings.remove(at: h) } else { holdings[h].shares = left }
			cash += o.amount
		}
		orders[i].status = "filled"
		persist()
	}

	func cancel(_ orderId: String) {
		guard let i = orders.firstIndex(where: { $0.id == orderId && $0.status == "pending" }) else { return }
		if orders[i].isBuy { cash += orders[i].amount }
		orders[i].status = "cancelled"
		persist()
	}

	// MARK: - Helpers

	static func ssnValid(_ ssn: String) -> Bool { ssn.filter(\.isNumber).count == 9 }

	/// Age from "YYYY-MM-DD"; nil when the date does not parse.
	static func ageOf(_ dob: String) -> Int? {
		let f = DateFormatter()
		f.locale = Locale(identifier: "en_US_POSIX")
		f.dateFormat = "yyyy-MM-dd"
		f.isLenient = false
		guard let date = f.date(from: dob.trimmingCharacters(in: .whitespaces)) else { return nil }
		return Calendar.current.dateComponents([.year], from: date, to: Date()).year
	}

	static func usd(_ amount: Double) -> String { PaperPortfolio.money(amount) }
	static func sharesText(_ shares: Double) -> String { String(format: "%.4f", shares) }

	static func today() -> String { PaperPortfolio.today() }

	private func newId(_ prefix: String) -> String { "\(prefix)-\(Int(Date().timeIntervalSince1970 * 1000))-\(orders.count + transactions.count)" }

	// MARK: - Persistence

	private struct Record: Codable {
		let status: LiveStatus
		let kyc: KycProfile
		let reason: String
		let bankName: String
		let bankLast4: String
		let cash: Double
		let holdings: [LiveHolding]
		let orders: [LiveOrder]
		let transactions: [LiveTx]
	}

	private func persist() {
		let r = Record(status: status, kyc: kyc, reason: rejectionReason, bankName: bankName, bankLast4: bankLast4, cash: cash, holdings: holdings, orders: orders, transactions: transactions)
		if let data = try? JSONEncoder().encode(r) { StakStore.set(data, for: "live") }
	}
}
