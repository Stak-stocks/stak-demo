import Foundation

/// The dates the app shows, on the real calendar (product audit, 2026-09-05: the
/// app was frozen on "Saturday, July 4" while the greeting used the live clock).
/// Story and save dates are relative ages, so they stay fresh. Market times are
/// US Eastern; personal habits (the deck day) are the phone's local time.
/// Mirrors android data/StakClock.kt (plus the deck day from ui/discover/DiscoverViewModel.kt).
enum StakClock {
	/// One formatter per pattern (Copilot review, PR #167: a new DateFormatter per call
	/// is expensive in feed paths); en_US_POSIX for fixed-format output, the device's
	/// live time zone.
	private static var formatters: [String: DateFormatter] = [:]
	/// The cache is read from the main thread (cards) and from background tasks (the deck's swipe-day start), so
	/// every access holds this lock - two threads writing one dictionary can crash.
	private static let lock = NSLock()
	private static func formatter(_ pattern: String, zone: TimeZone = .autoupdatingCurrent) -> DateFormatter {
		let key = pattern + "|" + zone.identifier
		lock.lock()
		defer { lock.unlock() }
		if let f = formatters[key] { return f }
		let f = DateFormatter()
		f.locale = Locale(identifier: "en_US_POSIX")
		f.timeZone = zone
		f.dateFormat = pattern
		formatters[key] = f
		return f
	}

	private static let eastern = TimeZone(identifier: "America/New_York")!
	private static var easternCalendar: Calendar = {
		var c = Calendar(identifier: .gregorian)
		c.timeZone = eastern
		return c
	}()

	// MARK: - Market session (US Eastern)

	/// What a price fetched at `fetchedAt` stands for. While the market is open it is that moment's price: "as of
	/// 2:31 PM" in the phone's time. Once the session has closed, a price fetched at 8:39 PM is still the 4:00 PM
	/// close, so it says which close it is - worded like the News signal ("at today's close", "at Friday's close").
	static func pricesAsOf(_ fetchedAt: Date) -> String {
		let ref = lastCloseRef()
		return ref == "today" ? "as of " + formatter("h:mm a").string(from: fetchedAt) : ref
	}

	/// Today's date in US Eastern time ("2026-09-16") - the market's own day, for dating saved prices.
	static func marketDay() -> String { formatter("yyyy-MM-dd", zone: eastern).string(from: Date()) }

	/// Which session a quote's daily move belongs to, in US Eastern time: "today" while the market is open, "at
	/// today's close" after 4pm, "at yesterday's close" before a weekday open, and "at Friday's close" before Monday's
	/// open and over the weekend. Mirrors the web's getLastCloseRef (frontend/src/lib/utils.ts). Holidays not known.
	static func lastCloseRef(now: Date = Date()) -> String {
		let c = easternCalendar.dateComponents([.weekday, .hour, .minute], from: now)
		let weekday = c.weekday ?? 2 // 1 = Sunday ... 7 = Saturday
		if weekday == 1 || weekday == 7 { return "at Friday's close" }
		let minutes = (c.hour ?? 0) * 60 + (c.minute ?? 0)
		if minutes < 570 { return weekday == 2 ? "at Friday's close" : "at yesterday's close" }
		if minutes < 960 { return "today" }
		return "at today's close"
	}

	/// The daily brief's sessions, as the server divides the US Eastern day (backend routes/dailyBrief.ts
	/// getMarketStatus): before the 9:30 open, the open until noon, midday until 3:30, the last half hour, and after
	/// the 4:00 close - one a day at weekends. Approved scope (2026-10-06): the app re-reads the brief once per
	/// session, never on a timer - each read can mean a Gemini call for the account. Mirrors android StakClock.
	enum BriefPhase: String {
		case pre, open, midday, late, after, weekend
	}

	static func briefPhase(now: Date = Date()) -> BriefPhase {
		let c = easternCalendar.dateComponents([.weekday, .hour, .minute], from: now)
		let weekday = c.weekday ?? 2 // 1 = Sunday ... 7 = Saturday
		if weekday == 1 || weekday == 7 { return .weekend }
		let minutes = (c.hour ?? 0) * 60 + (c.minute ?? 0)
		switch minutes {
		case ..<(9 * 60 + 30): return .pre
		case ..<(12 * 60): return .open
		case ..<(15 * 60 + 30): return .midday
		case ..<(16 * 60): return .late
		default: return .after
		}
	}

	/// "2026-10-06-open": the brief the app should be showing now. It re-reads the brief when this changes.
	static func briefSessionKey(now: Date = Date()) -> String {
		formatter("yyyy-MM-dd", zone: eastern).string(from: now) + "-" + briefPhase(now: now).rawValue
	}

	/// Whether a served brief was written for `phase`. Just after a boundary the server can still hand back the
	/// previous session's cached brief (its cache lasts 15 minutes, its market status 10) - that one isn't taken as
	/// the new session's. A closed day (a holiday) is closed whatever the hour.
	static func briefFits(_ phase: BriefPhase, session: String, marketClosed: Bool, dayLabel: String) -> Bool {
		let closedDay = marketClosed && dayLabel != "Today's"
		switch phase {
		case .weekend: return true
		case .pre: return closedDay
		case .open: return (session == "open" && !marketClosed) || closedDay
		case .midday: return (session == "midday" && !marketClosed) || closedDay
		case .late: return (session == "close" && !marketClosed) || closedDay
		case .after: return marketClosed
		}
	}

	/// Whether the US market's regular session is on right now (holidays not known).
	static func isMarketOpen() -> Bool { lastCloseRef() == "today" }

	/// A "▲ 1.2% today" move named for the session it describes. From the day's open on, "today" stands (after 4pm
	/// it is still today's move). Before the open and over the weekend it names that session's weekday - "▲ 1.2% on
	/// Wednesday" - which, unlike "yesterday", reads right in any time zone. Applied when shown, so a card loaded in
	/// the afternoon doesn't still say "today" the next morning.
	static func sessionChange(_ change: String, now: Date = Date()) -> String {
		guard change.hasSuffix(" today") else { return change }
		let c = easternCalendar.dateComponents([.weekday, .hour, .minute], from: now)
		let weekday = c.weekday ?? 2
		let minutes = (c.hour ?? 0) * 60 + (c.minute ?? 0)
		let weekend = weekday == 1 || weekday == 7
		if !weekend && minutes >= 570 { return change }
		var day = easternCalendar.date(byAdding: .day, value: -1, to: now) ?? now
		while [1, 7].contains(easternCalendar.component(.weekday, from: day)) {
			day = easternCalendar.date(byAdding: .day, value: -1, to: day) ?? day
		}
		let name = formatter("EEEE", zone: eastern).string(from: day)
		return String(change.dropLast("today".count)) + "on \(name)"
	}

	// MARK: - The deck day (local time)

	/// The local hour a new deck day begins - the server counts swipes under the same rollover.
	static let deckDayStartHour = 9

	/// The swipe day: rolls over at 9am local, matching the key the server counts swipes under ("2026-10-06").
	/// Android's todayKey().
	static func deckDayKey(now: Date = Date()) -> String {
		let cal = Calendar.current
		let day = cal.component(.hour, from: now) < deckDayStartHour ? (cal.date(byAdding: .day, value: -1, to: now) ?? now) : now
		return formatter("yyyy-MM-dd").string(from: day)
	}

	/// When today's swipe day began (9am local on `deckDayKey`'s date), as an ISO instant.
	static func deckDayStartISO() -> String {
		let start = formatter("yyyy-MM-dd").date(from: deckDayKey())
			.flatMap { Calendar.current.date(bySettingHour: deckDayStartHour, minute: 0, second: 0, of: $0) } ?? Date()
		return ISO8601DateFormatter().string(from: start)
	}

	// MARK: - Calendar labels

	/// "Saturday, July 4" for today.
	static func todayLong() -> String { formatter("EEEE, MMMM d").string(from: Date()) }

	/// "Jul 2" for N days ago.
	static func monthDay(daysAgo: Int) -> String {
		formatter("MMM d").string(from: Calendar.current.date(byAdding: .day, value: -daysAgo, to: Date()) ?? Date())
	}

	/// "· Jul 2 · 3 min read" from a story's age ("2d", "5h") and its read time.
	static func byline(_ age: String, _ read: String) -> String {
		let days = age.hasSuffix("d") ? Int(age.dropLast()) ?? 0 : 0
		return "· \(monthDay(daysAgo: days)) · \(read)"
	}

	/// "Oct 29" for N days ahead - the stock pages' next-earnings line (product audit, 2026-09-05: "Q2 earnings land Aug 27" had passed).
	static func daysAhead(_ days: Int) -> String { monthDay(daysAgo: -days) }

	/// "Saved Jul 2" / "Saved today".
	static func savedLabel(daysAgo: Int) -> String { daysAgo == 0 ? "Saved today" : "Saved \(monthDay(daysAgo: daysAgo))" }

	/// "13h" - a story's age in the largest unit that still reads small. Shared by the news list and the stock pages so
	/// one story can't be two ages at once.
	static func newsAge(_ datetime: Int64) -> String {
		let ageSeconds = Int64(Date().timeIntervalSince1970) - datetime
		if ageSeconds < 3600 { return "\(ageSeconds / 60)m" }
		if ageSeconds < 86_400 { return "\(ageSeconds / 3600)h" }
		return "\(ageSeconds / 86_400)d"
	}

	/// "Just now", "5m ago", "3h ago", "2d ago" - a feed's age line, from epoch seconds.
	static func ago(_ epochSeconds: Int64) -> String {
		let age = newsAge(epochSeconds)
		return age == "0m" || age.hasPrefix("-") ? "Just now" : "\(age) ago"
	}

	/// "September 2026" for the month a new account was created.
	static func monthYear(_ date: Date = Date()) -> String { formatter("MMMM yyyy").string(from: date) }
}

/// How often a page in front re-reads live prices - Android's LIVE_PRICE_INTERVAL_MS (ui/components/RefreshWhileVisible.kt).
let livePriceInterval: UInt64 = 15_000_000_000
