import Foundation

/// The user-state store (product audit, 2026-09-05: saves, practice buys, the
/// deck's progress and the notification badge all vanished on a relaunch).
/// UserDefaults keys per ACCOUNT KIND ("demo." / "new.") so the demo account and
/// a fresh account never read each other's state. Every mutation writes through;
/// Session.applyAccount() reads it back. Mirrors android StakStore.kt.
enum StakStore {
	private static var defaults: UserDefaults { .standard }

	/// Which account's keys to use. Session sets it BEFORE it reads any store (its
	/// init, sign-in and sign-out) - the store must never reach for
	/// `Session.shared`, whose static init is what calls it (Copilot review, PR
	/// #167: a re-entrant `Session.shared` access during launch).
	static var demoAccount: Bool = true

	private static func key(_ name: String) -> String { (demoAccount ? "demo." : "new.") + name }

	static func string(_ name: String) -> String? { defaults.string(forKey: key(name)) }
	static func set(_ value: String, for name: String) { defaults.set(value, forKey: key(name)) }
	static func int(_ name: String, default value: Int) -> Int { defaults.object(forKey: key(name)) as? Int ?? value }
	static func set(_ value: Int, for name: String) { defaults.set(value, forKey: key(name)) }
	static func bool(_ name: String, default value: Bool) -> Bool { defaults.object(forKey: key(name)) as? Bool ?? value }
	static func set(_ value: Bool, for name: String) { defaults.set(value, forKey: key(name)) }
	static func data(_ name: String) -> Data? { defaults.data(forKey: key(name)) }
	static func set(_ value: Data, for name: String) { defaults.set(value, forKey: key(name)) }

	/// A set of ids; nil = no record (an empty set is a record).
	static func stringSet(_ name: String) -> Set<String>? { (defaults.stringArray(forKey: key(name))).map(Set.init) }
	static func set(_ value: Set<String>, for name: String) { defaults.set(Array(value).sorted(), forKey: key(name)) }

	/// Forgets one account kind's state - a brand-new account starts from nothing.
	static func clearAccount(demo: Bool) {
		let prefix = demo ? "demo." : "new."
		for k in defaults.dictionaryRepresentation().keys where k.hasPrefix(prefix) { defaults.removeObject(forKey: k) }
	}
}
