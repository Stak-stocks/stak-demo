import Foundation

/// The user-state store (product audit, 2026-09-05: saves, practice buys, the
/// deck's progress and the notification badge all vanished on a relaunch).
/// UserDefaults keys per ACCOUNT: "demo." for the demo persona, "u.<userId>." for a
/// real account (the Supabase JWT subject), so logging out and back in restores that
/// account's own state and a second account on the phone never reads it. Every
/// mutation writes through; Session.applyAccount() reads it back. Mirrors android StakStore.kt.
enum StakStore {
	private static var defaults: UserDefaults { .standard }

	/// Which account's keys to use. Session sets it BEFORE it reads any store (its
	/// init, sign-in and sign-out) - the store must never reach for
	/// `Session.shared`, whose static init is what calls it (Copilot review, PR
	/// #167: a re-entrant `Session.shared` access during launch).
	static var demoAccount: Bool = true
	/// The signed-in account's id, set by Session alongside demoAccount.
	static var accountId: String? = nil

	private static func prefix() -> String {
		if demoAccount { return "demo." }
		if let id = accountId { return "u.\(id)." }
		return "anon."
	}

	private static func key(_ name: String) -> String { prefix() + name }

	static func string(_ name: String) -> String? { defaults.string(forKey: key(name)) }
	static func set(_ value: String, for name: String) { defaults.set(value, forKey: key(name)) }
	static func int(_ name: String, default value: Int) -> Int { defaults.object(forKey: key(name)) as? Int ?? value }
	static func set(_ value: Int, for name: String) { defaults.set(value, forKey: key(name)) }
	static func bool(_ name: String, default value: Bool) -> Bool { defaults.object(forKey: key(name)) as? Bool ?? value }
	static func set(_ value: Bool, for name: String) { defaults.set(value, forKey: key(name)) }
	static func data(_ name: String) -> Data? { defaults.data(forKey: key(name)) }
	static func remove(_ name: String) { defaults.removeObject(forKey: key(name)) }
	static func set(_ value: Data, for name: String) { defaults.set(value, forKey: key(name)) }

	/// A set of ids; nil = no record (an empty set is a record).
	static func stringSet(_ name: String) -> Set<String>? { (defaults.stringArray(forKey: key(name))).map(Set.init) }
	static func set(_ value: Set<String>, for name: String) { defaults.set(Array(value).sorted(), forKey: key(name)) }

	/// Forgets the current account's state (Delete account or account reset).
	static func clearAccount(demo: Bool) {
		let pfx = demo ? "demo." : (accountId.map { "u.\($0)." } ?? "new.")
		for k in defaults.dictionaryRepresentation().keys where k.hasPrefix(pfx) { defaults.removeObject(forKey: k) }
	}

	/// Before per-user keys every real account shared "new." and was wiped at each sign-in.
	/// Move any remaining "new." entries under the current account id; drop them if no id.
	static func migrateLegacy(accountId: String?) {
		let legacy = defaults.dictionaryRepresentation().filter { $0.key.hasPrefix("new.") }
		guard !legacy.isEmpty else { return }
		for (k, v) in legacy {
			defaults.removeObject(forKey: k)
			guard let id = accountId else { continue }
			let target = "u.\(id)." + k.dropFirst("new.".count)
			guard defaults.object(forKey: target) == nil else { continue }
			defaults.set(v, forKey: target)
		}
	}
}
