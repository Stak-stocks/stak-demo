import Foundation

/// "Before we get started": one "Agree and continue" confirms 18 or older, living in the United States, and the Terms /
/// Privacy (Terms §2); no date of birth. While an account hasn't confirmed them, `required` is true and the gate (EligibilityView)
/// covers the whole app - a new account right after it signs up, an existing one the next time it opens. The server
/// keeps that each was confirmed, when, and which versions of the documents. Mirrors shared/src/eligibility.ts, web
/// components/onboarding/EligibilityGate.tsx and android data/Eligibility.kt.
@MainActor
final class EligibilityGate: ObservableObject {
	static let shared = EligibilityGate()

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

	/// Sends the three confirmations; false when they didn't reach the server (a network or server failure).
	func confirm() async -> Bool {
		do {
			_ = try await StockRepository.shared.confirmEligibility()
			required = false
			return true
		} catch {
			return false
		}
	}

	/// Signed out: nothing to ask until the next account says so.
	func reset() {
		required = false
		checkedFor = nil
	}
}
