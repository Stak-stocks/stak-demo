import Foundation

/// "Before we get started": the beta's 18+ / U.S. confirmation and the Terms / Privacy acceptance (Terms §2). While an
/// account hasn't confirmed, `required` is true and the gate (EligibilityView) covers the whole app - a new account right
/// after it signs up, an existing one the next time it opens. The age is worked out by the server, which keeps only that
/// it was confirmed; under 18 it deletes the account and blocks the email for 30 days (any date it sends after that is
/// refused too). Mirrors shared/src/eligibility.ts, web components/onboarding/EligibilityGate.tsx and android
/// data/Eligibility.kt.
@MainActor
final class EligibilityGate: ObservableObject {
	static let shared = EligibilityGate()
	static let termsURL = URL(string: "https://thestak.org/terms")!
	static let privacyURL = URL(string: "https://thestak.org/privacy")!

	/// The signed-in account hasn't confirmed: the gate is up.
	@Published private(set) var required = false
	/// The session last asked about - a second launch path doesn't ask again for the same one.
	private var checkedFor: String? = nil

	private init() {}

	/// From an account read (ProfileSync): the server says whether this account still has to confirm.
	func apply(_ me: MeResponse) {
		guard Session.shared.token != nil else { return }
		if required != me.needsEligibility { required = me.needsEligibility }
	}

	/// Asks the server - right after a sign-in or sign-up (the account isn't "signed in" to the app until onboarding
	/// ends, so this goes by the session, not Session.signedIn) and when the app opens. Once per session; a failed read
	/// is asked again next time.
	func check() {
		guard let token = Session.shared.token, token != checkedFor else { return }
		checkedFor = token
		Task {
			guard let me = try? await StockRepository.shared.getMe() else {
				if checkedFor == token { checkedFor = nil }
				return
			}
			// A different session by now (signed out, or another account): this answer isn't its.
			guard Session.shared.token == token else { return }
			apply(me)
		}
	}

	enum Outcome: Equatable {
		case confirmed
		/// Not eligible: the server has deleted the account.
		case refused
		/// `invalid`: the server didn't accept the date or a box; otherwise a network or server failure.
		case failed(invalid: Bool)
	}

	/// Sends the confirmation. `dob` is "YYYY-MM-DD".
	func confirm(dob: String) async -> Outcome {
		do {
			_ = try await StockRepository.shared.confirmEligibility(dob: dob)
			required = false
			return .confirmed
		} catch NetworkError.http(let code, _) {
			switch code {
			case 403: return .refused
			case 400: return .failed(invalid: true)
			default: return .failed(invalid: false)
			}
		} catch {
			return .failed(invalid: false)
		}
	}

	/// Signed out: nothing to ask until the next account says so.
	func reset() {
		required = false
		checkedFor = nil
	}

	/// "MMDDYYYY" as typed -> "YYYY-MM-DD", or nil until it's a whole, real date from 1900 to today (the server checks
	/// again).
	nonisolated static func isoDob(_ digits: String, now: Date = Date()) -> String? {
		guard digits.count == 8, let mm = Int(digits.prefix(2)), let dd = Int(digits.dropFirst(2).prefix(2)), let yyyy = Int(digits.suffix(4)),
			  yyyy >= 1900 else { return nil }
		var cal = Calendar(identifier: .gregorian)
		cal.timeZone = TimeZone(identifier: "UTC")!
		guard let date = cal.date(from: DateComponents(year: yyyy, month: mm, day: dd)), date <= now else { return nil }
		let back = cal.dateComponents([.year, .month, .day], from: date)
		guard back.year == yyyy, back.month == mm, back.day == dd else { return nil }
		return String(format: "%04d-%02d-%02d", yyyy, mm, dd)
	}

	/// Up to eight typed digits as MM/DD/YYYY.
	nonisolated static func formatDob(_ digits: String) -> String {
		let d = Array(digits.prefix(8))
		if d.count > 4 { return String(d[0..<2]) + "/" + String(d[2..<4]) + "/" + String(d[4...]) }
		if d.count > 2 { return String(d[0..<2]) + "/" + String(d[2...]) }
		return String(d)
	}
}
