package com.stak.demo.data

/**
 * The Taste Graph in the words the app shows: what draws the user's attention, how
 * strongly, and the evidence behind it.
 *
 * Every figure is a share of observed interest signals - saves, passes, Learn more
 * opens, stock pages opened - and never a share of money. STAK does not know what
 * anyone owns, so nothing here may read as an allocation.
 *
 * It also never claims the user understands anything: it reports what they did.
 */
object TasteGraph {
	/** How long since the last save before the card reads as "paused" rather than current. */
	private const val PAUSED_AFTER_MS = 14L * 24 * 60 * 60 * 1000

	enum class Strength(val label: String) { STRONG("Strong"), MODERATE("Moderate"), EMERGING("Emerging") }

	/** One theme: a backend category in the app's words, with what produced it. */
	data class Theme(
		val category: String,
		val label: String,
		val colorKey: String,
		val share: Float,
		val strength: Strength,
		val saves: Int = 0,
		val learnMores: Int = 0,
		val opens: Int = 0,
		val savedNames: List<String> = emptyList(),
		/** When the newest save in this theme happened; null when it can't be read. */
		val savedAtMs: Long? = null,
	)

	/** What kind of activity an evidence line reports, so the page can mark it. */
	enum class Act { SAVED, LEARNED, OPENED }

	/** One line of "Why STAK thinks this": the theme it's evidence for, and the plain fact behind it. */
	data class Evidence(val theme: String, val text: String, val act: Act)

	/**
	 * The My STAK card reads differently depending on how much there is to say (device
	 * report, 2026-09-24) - a brand-new account, one clear lead, several at once, or a
	 * account that hasn't touched Discover in a while all deserve their own line rather
	 * than the same "X leads your interests" for everyone.
	 */
	enum class Scenario { NO_SIGNAL, PAUSED, EARLY_SIGNAL, ONE_DOMINANT, TWO_STRONG, BROAD_MIX }

	data class Graph(
		val themes: List<Theme> = emptyList(),
		val otherShare: Float = 0f,
		val totalSaves: Int = 0,
		/** Too little activity to name a lead; the card says so instead of guessing. */
		val learning: Boolean = true,
		/**
		 * Every save, swipe and open counted, whether or not any of it landed on a theme -
		 * device report, 2026-09-24: an account that's passed on plenty but never saved or
		 * right-swiped anything has real signals but zero POSITIVE ones, so [themes] comes
		 * back empty exactly like a brand-new account's does. Kept so the copy can tell
		 * "you haven't done anything yet" from "you have, just not toward anything yet".
		 */
		val totalSignals: Int = 0,
	) {
		val isEmpty: Boolean get() = themes.isEmpty()

		/**
		 * No new save in [PAUSED_AFTER_MS] - the closest reading of "gone quiet" the data
		 * supports. Learn-more and page-open counts aren't timestamped individually, only
		 * saves are, so a theme with no save at all can't be judged this way and just
		 * isn't - it falls through to whatever scenario its theme count gives it.
		 */
		private val isPaused: Boolean
			get() {
				val newestSave = themes.mapNotNull { it.savedAtMs }.maxOrNull() ?: return false
				return System.currentTimeMillis() - newestSave > PAUSED_AFTER_MS
			}

		val scenario: Scenario
			get() = when {
				themes.isEmpty() -> Scenario.NO_SIGNAL
				isPaused -> Scenario.PAUSED
				learning -> Scenario.EARLY_SIGNAL
				themes.size == 1 -> Scenario.ONE_DOMINANT
				themes.size == 2 -> Scenario.TWO_STRONG
				else -> Scenario.BROAD_MIX
			}

		/**
		 * True when there's real activity behind an empty [themes] - passes and swipes that
		 * just never landed positively on anything - so NO_SIGNAL's copy doesn't claim "you
		 * haven't done anything" to someone who has (device report, 2026-09-24).
		 */
		private val activeButUnfocused: Boolean get() = themes.isEmpty() && totalSignals > 0

		/** The one-sentence reading. Never states a lead the evidence doesn't carry. */
		val summary: String
			get() = when (scenario) {
				Scenario.NO_SIGNAL -> if (activeButUnfocused) "Nothing's caught on yet" else "Your Taste starts here"
				// Never "your LAST picture" - a web save from before this screen existed
				// reads as stale the very first time it's ever shown here, and "last" would
				// wrongly imply there was an earlier one they'd already seen.
				Scenario.PAUSED -> "Quiet for a while"
				Scenario.EARLY_SIGNAL -> "Your Taste is taking shape"
				Scenario.ONE_DOMINANT -> "${themes[0].label} stands out"
				Scenario.TWO_STRONG -> "${themes[0].label} + ${themes[1].label}"
				Scenario.BROAD_MIX -> "A broad mix of interests"
			}

		val subtitle: String
			get() = when (scenario) {
				Scenario.NO_SIGNAL -> if (activeButUnfocused) {
					"Nothing you've saved or explored has stood out yet. Save a company you like in Discover."
				} else {
					"Explore and STAK companies to build your picture."
				}
				Scenario.PAUSED -> "Based on saves from a while back - explore or save something to freshen this up."
				Scenario.EARLY_SIGNAL -> "${themes[0].label} caught your attention. Keep exploring."
				Scenario.ONE_DOMINANT -> "Updated to reflect your choices."
				Scenario.TWO_STRONG -> "Based on what you STAK and explore."
				Scenario.BROAD_MIX -> "No single theme stands out yet."
			}

		/** The card's link, without its trailing "›" - MyStakScreen adds that itself. */
		val ctaLabel: String
			get() = if (scenario == Scenario.NO_SIGNAL) "Explore companies" else "See your Taste"

		/**
		 * The activity behind [theme], strongest evidence first. Plain facts, not
		 * second-person narration ("You saved...") - device report, 2026-09-23:
		 * paired with the theme name shown once as its own heading, not repeated in
		 * every line.
		 */
		fun evidenceFor(theme: Theme): List<Evidence> {
			val out = mutableListOf<Evidence>()
			// "this week" answers the question a returning user actually has - why the
			// reading moved - without inventing anything: the save dates are stored.
			val whenSaved = recencyOf(theme.savedAtMs)
			when {
				theme.savedNames.size == 1 -> out += Evidence(theme.label, "Saved ${theme.savedNames[0]}$whenSaved.", Act.SAVED)
				theme.savedNames.size >= 2 -> out += Evidence(
					theme.label,
					"Saved ${theme.savedNames.take(2).joinToString(" and ")}$whenSaved.",
					Act.SAVED,
				)
				theme.saves > 0 -> out += Evidence(
					theme.label,
					"Saved ${theme.saves} ${if (theme.saves == 1) "company" else "companies"}$whenSaved.",
					Act.SAVED,
				)
			}
			if (theme.learnMores > 0) out += Evidence(
				theme.label,
				"Opened Learn more on ${theme.learnMores} ${if (theme.learnMores == 1) "company card" else "company cards"}.",
				Act.LEARNED,
			)
			if (theme.opens > 0) out += Evidence(
				theme.label,
				"Visited company pages ${theme.opens} ${if (theme.opens == 1) "time" else "times"}.",
				Act.OPENED,
			)
			return out
		}

		/**
		 * One line per theme for "Why STAK thinks this" - the card explains the whole
		 * reading, so a single busy theme must not fill it. Saves are the strongest
		 * evidence for almost every theme, so taking each theme's top line on its own
		 * produced four "You saved..." rows in a row. Each theme instead offers a kind
		 * of evidence not already shown - a save, then a Learn more, then a page opened -
		 * so the card reads as several kinds of activity, not one repeated four times.
		 */
		val evidence: List<Evidence>
			get() {
				val shown = mutableSetOf<Act>()
				val out = mutableListOf<Evidence>()
				for (theme in themes) {
					if (out.size >= 4) break
					val options = evidenceFor(theme)
					val pick = options.firstOrNull { it.act !in shown } ?: options.firstOrNull() ?: continue
					out += pick
					shown += pick.act
				}
				return out
			}
	}

	/** The server's measurement, named and rated for the screen. */
	fun from(dto: TasteResponse): Graph = Graph(
		themes = dto.themes.mapIndexed { i, t ->
			val label = categoryName(t.category)
			Theme(
				category = t.category,
				label = label,
				// Ranked position, not the art family: several categories share one family,
				// and the ring's slices have to be told apart from each other.
				colorKey = "t$i",
				share = t.share.toFloat(),
				strength = strengthOf(t.share.toFloat(), t.saves, t.learnMores + t.opens, dto.learning),
				saves = t.saves,
				learnMores = t.learnMores,
				opens = t.opens,
				savedNames = t.savedNames,
				savedAtMs = t.lastSavedAt?.let { runCatching { java.time.Instant.parse(it).toEpochMilli() }.getOrNull() },
			)
		},
		otherShare = dto.otherShare.toFloat(),
		totalSaves = dto.totalSaves,
		learning = dto.learning,
		totalSignals = dto.signals,
	)

	/**
	 * The demo account's graph, read from the persona's own saved stocks - it has no
	 * server activity of its own to measure.
	 */
	fun demo(): Graph {
		val symbols = MyStakHoldings.tickers.toList()
		val buckets = StakInsights.buckets(symbols)
		if (buckets.isEmpty()) return Graph()
		return Graph(
			themes = buckets.take(5).mapIndexed { i, b ->
				Theme(
					category = b.id,
					label = b.name,
					colorKey = "t$i",
					share = b.share,
					strength = strengthOf(b.share, b.count, 0, symbols.size < 3),
					saves = b.count,
					savedNames = StakInsights.namesIn(b.id, symbols).take(2),
				)
			},
			otherShare = buckets.drop(5).sumOf { it.share.toDouble() }.toFloat(),
			totalSaves = symbols.size,
			learning = symbols.size < 3,
			totalSignals = symbols.size,
		)
	}

	/** " today" / " this week" / " this month" for a save recent enough to be worth saying. */
	private fun recencyOf(savedAtMs: Long?): String {
		val days = savedAtMs?.let { (System.currentTimeMillis() - it) / (24 * 60 * 60 * 1000L) } ?: return ""
		return when {
			days < 0L -> ""
			days < 1L -> " today"
			days < 7L -> " this week"
			days < 31L -> " this month"
			else -> ""
		}
	}

	/**
	 * How firmly a theme can be stated. A big share of very little activity is not a
	 * strong reading, so the evidence behind it has to be there too.
	 */
	private fun strengthOf(share: Float, saves: Int, explorations: Int, learning: Boolean): Strength = when {
		// While there is too little activity to name a lead at all, nothing can be Strong -
		// a Strong chip beside "Still learning your taste" contradicts it.
		learning -> if (share >= 0.25f) Strength.MODERATE else Strength.EMERGING
		share >= 0.25f && (saves >= 2 || saves + explorations >= 3) -> Strength.STRONG
		share >= 0.12f && saves + explorations >= 1 -> Strength.MODERATE
		else -> Strength.EMERGING
	}

}
