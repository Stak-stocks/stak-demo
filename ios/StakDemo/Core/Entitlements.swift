import Foundation

/// Free vs STAK+, decided in one place. A screen asks whether a feature is available,
/// never which plan the account is on, so packaging can change here without touching a
/// UI flow. Mirrors android/data/Entitlements.kt; the server's plan (GET /api/me)
/// is the truth, and this copy only follows it.
final class Entitlements: ObservableObject {
	static let shared = Entitlements()

	enum Plan: String { case free, plus }
	enum Feature { case updatesHistory, tasteEvolution }

	private static let plusOnly: Set<Feature> = [.updatesHistory, .tasteEvolution]
	private static let key = "entitlements.plan"

	@Published private(set) var plan: Plan = .free

	private init() { load() }

	func has(_ feature: Feature) -> Bool { plan == .plus || !Self.plusOnly.contains(feature) }

	func apply(raw: String?) {
		plan = raw == "plus" ? .plus : .free
		StakStore.set(plan.rawValue, for: Self.key)
	}

	func load() {
		plan = StakStore.string(Self.key) == Plan.plus.rawValue ? .plus : .free
	}
}
