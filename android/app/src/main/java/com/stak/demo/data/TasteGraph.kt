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
	)

	/** One line of "Why STAK thinks this": what the user did, and the count behind it. */
	data class Evidence(val text: String, val detail: String)

	data class Graph(
		val themes: List<Theme> = emptyList(),
		val otherShare: Float = 0f,
		val totalSaves: Int = 0,
		/** Too little activity to name a lead; the card says so instead of guessing. */
		val learning: Boolean = true,
	) {
		val isEmpty: Boolean get() = themes.isEmpty()

		/** The one-sentence reading. Never states a lead the evidence doesn't carry. */
		val summary: String
			get() = when {
				themes.isEmpty() -> "Still learning your taste."
				learning -> "Still learning your taste."
				themes.size == 1 -> "${themes[0].label} leads your interests."
				else -> "${themes[0].label} and ${themes[1].label} lead your interests."
			}

		val subtitle: String
			get() = if (themes.isEmpty() || learning) {
				"Save a few companies and STAK will read what draws you."
			} else {
				"Based on what you save and explore."
			}

		/** The activity behind [theme], strongest evidence first. */
		fun evidenceFor(theme: Theme): List<Evidence> {
			val out = mutableListOf<Evidence>()
			val ofSaved = if (totalSaves > 0) " · ${theme.saves} of your $totalSaves saved companies" else ""
			when {
				theme.savedNames.size == 1 -> out += Evidence("You saved ${theme.savedNames[0]}.", theme.label + ofSaved)
				theme.savedNames.size >= 2 -> out += Evidence(
					"You saved ${theme.savedNames.take(2).joinToString(" and ")}.",
					theme.label + ofSaved,
				)
				theme.saves > 0 -> out += Evidence("You saved ${theme.saves} ${theme.label} companies.", theme.label + ofSaved)
			}
			if (theme.learnMores > 0) out += Evidence(
				"You opened Learn more on ${countWord(theme.learnMores)} ${theme.label} ${cards(theme.learnMores)}.",
				"Exploration · Last 90 days",
			)
			if (theme.opens > 0) out += Evidence(
				"You opened ${theme.label} companies ${countWord(theme.opens)} ${times(theme.opens)}.",
				"Exploration · Last 90 days",
			)
			return out
		}

		/** The evidence across every theme, for the "Why STAK thinks this" card. */
		val evidence: List<Evidence> get() = themes.flatMap { evidenceFor(it) }.take(4)
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
				strength = strengthOf(t.share.toFloat(), t.saves, t.learnMores + t.opens),
				saves = t.saves,
				learnMores = t.learnMores,
				opens = t.opens,
				savedNames = t.savedNames,
			)
		},
		otherShare = dto.otherShare.toFloat(),
		totalSaves = dto.totalSaves,
		learning = dto.learning,
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
					strength = strengthOf(b.share, b.count, 0),
					saves = b.count,
					savedNames = StakInsights.namesIn(b.id, symbols).take(2),
				)
			},
			otherShare = buckets.drop(5).sumOf { it.share.toDouble() }.toFloat(),
			totalSaves = symbols.size,
			learning = symbols.size < 3,
		)
	}

	/**
	 * How firmly a theme can be stated. A big share of very little activity is not a
	 * strong reading, so the evidence behind it has to be there too.
	 */
	private fun strengthOf(share: Float, saves: Int, explorations: Int): Strength = when {
		share >= 0.25f && (saves >= 2 || saves + explorations >= 3) -> Strength.STRONG
		share >= 0.12f && saves + explorations >= 1 -> Strength.MODERATE
		else -> Strength.EMERGING
	}

	private fun countWord(n: Int): String =
		listOf("zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten").getOrNull(n) ?: "$n"

	private fun cards(n: Int): String = if (n == 1) "card" else "cards"
	private fun times(n: Int): String = if (n == 1) "time" else "times"
}
