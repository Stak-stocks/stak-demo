import Foundation

/// The Taste Graph in the words the app shows: what draws the user's attention, how strongly, and the evidence behind
/// it.
///
/// Every figure is a share of observed interest signals - saves, passes, Learn more opens, stock pages opened - and
/// never a share of money. STAK does not know what anyone owns, so nothing here may read as an allocation.
///
/// It also never claims the user understands anything: it reports what they did. Mirrors android data/TasteGraph.kt.
enum TasteGraph {
	/// How long since the last save before the card reads as "paused" rather than current.
	private static let pausedAfter: TimeInterval = 14 * 24 * 60 * 60

	enum Strength: String {
		case strong = "Strong", moderate = "Moderate", emerging = "Emerging"
		var label: String { rawValue }
	}

	/// One theme: a backend category in the app's words, with what produced it.
	struct Theme: Equatable {
		let category: String
		let label: String
		let colorKey: String
		let share: Double
		let strength: Strength
		var saves = 0
		var learnMores = 0
		var opens = 0
		var savedNames: [String] = []
		/// When the newest save in this theme happened; nil when it can't be read.
		var savedAt: Date? = nil
	}

	/// What kind of activity an evidence line reports, so the page can mark it.
	enum Act { case saved, learned, opened }

	/// One line of "Why STAK thinks this": the theme it's evidence for, and the plain fact behind it.
	struct Evidence: Equatable {
		let theme: String
		let text: String
		let act: Act
	}

	/// The My STAK card reads differently depending on how much there is to say - a brand-new account, one clear lead,
	/// several at once, or an account that hasn't touched Discover in a while each get their own line.
	enum Scenario { case noSignal, paused, earlySignal, oneDominant, twoStrong, broadMix }

	struct Graph: Equatable {
		var themes: [Theme] = []
		var otherShare: Double = 0
		var totalSaves = 0
		/// Too little activity to name a lead; the card says so instead of guessing.
		var learning = true
		/// Every save, swipe and open counted, whether or not any of it landed on a theme - so the copy can tell "you
		/// haven't done anything yet" from "you have, just not toward anything yet".
		var totalSignals = 0

		var isEmpty: Bool { themes.isEmpty }

		/// No new save in two weeks - the closest reading of "gone quiet" the data supports (only saves are dated).
		private var isPaused: Bool {
			guard let newest = themes.compactMap(\.savedAt).max() else { return false }
			return Date().timeIntervalSince(newest) > TasteGraph.pausedAfter
		}

		var scenario: Scenario {
			if themes.isEmpty { return .noSignal }
			if isPaused { return .paused }
			if learning { return .earlySignal }
			switch themes.count {
			case 1: return .oneDominant
			case 2: return .twoStrong
			default: return .broadMix
			}
		}

		/// Real activity behind an empty `themes` - passes and swipes that never landed positively on anything.
		private var activeButUnfocused: Bool { themes.isEmpty && totalSignals > 0 }

		/// The one-sentence reading. Never states a lead the evidence doesn't carry.
		var summary: String {
			switch scenario {
			case .noSignal: return activeButUnfocused ? "Nothing's caught on yet" : "Your Taste starts here"
			case .paused: return "Quiet for a while"
			case .earlySignal: return "Your Taste is taking shape"
			case .oneDominant: return "\(themes[0].label) stands out"
			case .twoStrong: return "\(themes[0].label) + \(themes[1].label)"
			case .broadMix: return "A broad mix of interests"
			}
		}

		var subtitle: String {
			switch scenario {
			case .noSignal:
				return activeButUnfocused
					? "Nothing you've saved or explored has stood out yet. Save a company you like in Discover."
					: "Explore and STAK companies to build your picture."
			case .paused: return "Based on saves from a while back - explore or save something to freshen this up."
			case .earlySignal: return "\(themes[0].label) caught your attention. Keep exploring."
			case .oneDominant: return "Updated to reflect your choices."
			case .twoStrong: return "Based on what you STAK and explore."
			case .broadMix: return "No single theme stands out yet."
			}
		}

		/// The card's link, without its trailing "›" - the card adds that itself.
		var ctaLabel: String { scenario == .noSignal ? "Explore companies" : "See your Taste" }

		/// The activity behind `theme`, strongest evidence first - plain facts, not second-person narration.
		func evidenceFor(_ theme: Theme) -> [Evidence] {
			var out: [Evidence] = []
			let whenSaved = TasteGraph.recency(theme.savedAt)
			if theme.savedNames.count == 1 {
				out.append(Evidence(theme: theme.label, text: "Saved \(theme.savedNames[0])\(whenSaved).", act: .saved))
			} else if theme.savedNames.count >= 2 {
				out.append(Evidence(theme: theme.label, text: "Saved \(theme.savedNames.prefix(2).joined(separator: " and "))\(whenSaved).", act: .saved))
			} else if theme.saves > 0 {
				out.append(Evidence(theme: theme.label, text: "Saved \(theme.saves) \(theme.saves == 1 ? "company" : "companies")\(whenSaved).", act: .saved))
			}
			if theme.learnMores > 0 {
				out.append(Evidence(
					theme: theme.label,
					text: "Opened Learn more on \(theme.learnMores) \(theme.learnMores == 1 ? "company card" : "company cards").",
					act: .learned
				))
			}
			if theme.opens > 0 {
				out.append(Evidence(theme: theme.label, text: "Visited company pages \(theme.opens) \(theme.opens == 1 ? "time" : "times").", act: .opened))
			}
			return out
		}

		/// One line per theme for "Why STAK thinks this", at most four. Each theme offers a kind of evidence not
		/// already shown - a save, then a Learn more, then a page opened - so the card reads as several kinds of
		/// activity, not "Saved..." four times over.
		var evidence: [Evidence] {
			var shown = Set<String>()
			var out: [Evidence] = []
			for theme in themes {
				if out.count >= 4 { break }
				let options = evidenceFor(theme)
				guard let pick = options.first(where: { !shown.contains("\($0.act)") }) ?? options.first else { continue }
				out.append(pick)
				shown.insert("\(pick.act)")
			}
			return out
		}
	}

	/// The server's measurement, named and rated for the screen.
	static func from(_ dto: TasteResponse) -> Graph {
		Graph(
			themes: dto.themes.enumerated().map { i, t in
				let label = categoryName(t.category)
				return Theme(
					category: t.category,
					label: label,
					// Ranked position, not the art family: several categories share one family, and the ring's slices
					// have to be told apart from each other.
					colorKey: "t\(i)",
					share: t.share,
					strength: strengthOf(t.share, saves: t.saves, explorations: t.learnMores + t.opens, learning: dto.learning),
					saves: t.saves,
					learnMores: t.learnMores,
					opens: t.opens,
					savedNames: t.savedNames,
					savedAt: t.lastSavedAt.flatMap(MyStakHoldings.parse)
				)
			},
			otherShare: dto.otherShare,
			totalSaves: dto.totalSaves,
			learning: dto.learning,
			totalSignals: dto.signals
		)
	}

	/// The demo account's graph, read from the persona's own saved stocks - it has no server activity to measure.
	@MainActor
	static func demo() -> Graph {
		// Sorted: a Set's order changes every launch, and the reading (theme order, ring colors, names) mustn't.
		let symbols = MyStakHoldings.shared.tickers.sorted()
		let buckets = StakInsights.buckets(symbols)
		guard !buckets.isEmpty else { return Graph() }
		return Graph(
			themes: buckets.prefix(5).enumerated().map { i, b in
				Theme(
					category: b.id,
					label: b.name,
					colorKey: "t\(i)",
					share: b.share,
					strength: strengthOf(b.share, saves: b.count, explorations: 0, learning: symbols.count < 3),
					saves: b.count,
					savedNames: Array(StakInsights.namesIn(b.id, symbols).prefix(2))
				)
			},
			otherShare: buckets.dropFirst(5).reduce(0) { $0 + $1.share },
			totalSaves: symbols.count,
			learning: symbols.count < 3,
			totalSignals: symbols.count
		)
	}

	/// " today" / " this week" / " this month" for a save recent enough to be worth saying.
	private static func recency(_ savedAt: Date?) -> String {
		guard let savedAt else { return "" }
		let days = Int(Date().timeIntervalSince(savedAt) / 86_400)
		if Date() < savedAt { return "" }
		if days < 1 { return " today" }
		if days < 7 { return " this week" }
		if days < 31 { return " this month" }
		return ""
	}

	/// How firmly a theme can be stated. A big share of very little activity is not a strong reading, so the evidence
	/// behind it has to be there too.
	private static func strengthOf(_ share: Double, saves: Int, explorations: Int, learning: Bool) -> Strength {
		// While there is too little activity to name a lead at all, nothing can be Strong - a Strong chip beside
		// "Still learning your taste" contradicts it.
		if learning { return share >= 0.25 ? .moderate : .emerging }
		if share >= 0.25 && (saves >= 2 || saves + explorations >= 3) { return .strong }
		if share >= 0.12 && saves + explorations >= 1 { return .moderate }
		return .emerging
	}

}
