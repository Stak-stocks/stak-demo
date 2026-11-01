import Foundation

/// Time-of-day greeting in the USER'S OWN timezone (user, 2026-08-22:
/// "someone can be in Nigeria, another in Germany, another in China").
/// The device clock already runs in the user's zone, so the local hour
/// is the whole story: 00-11 morning (after midnight is morning - user, 2026-11-01), 12-16 afternoon, 17-23 evening.
/// The authored frame shows the morning state. Mirrors android ui/Greeting.kt.
enum Greeting {
	static func word(hour: Int) -> String {
		switch hour {
		case 0...11: return "Good Morning"
		case 12...16: return "Good Afternoon"
		default: return "Good Evening"
		}
	}

	/// The greeting for right now, in the device's local time.
	static func now() -> String {
		word(hour: Calendar.current.component(.hour, from: Date()))
	}
}
