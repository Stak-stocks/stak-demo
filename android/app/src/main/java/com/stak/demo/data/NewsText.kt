package com.stak.demo.data

/** Shared reading of the live news feed's text, so Home and News judge a story the same way. */
object NewsText {
	/**
	 * [summary] when it says more than [headline], else null. Feeds often send the
	 * headline again as the summary, padded with the source and stray characters
	 * ("... sources say� Reuters" under "... sources say - Reuters"), so the two
	 * are compared by letters and digits alone, and a summary needs 25 more of those
	 * than the headline to count as saying something new.
	 */
	fun summaryBeyondHeadline(headline: String, summary: String): String? {
		val core = headline.substringBeforeLast(" - ").takeIf { it.length >= 20 } ?: headline
		val h = lettersAndDigits(core)
		val s = lettersAndDigits(summary)
		if (s.length < 25 || (s.startsWith(h) && s.length - h.length < 25)) return null
		return summary.trim()
	}

	private fun lettersAndDigits(text: String): String = text.lowercase().filter { it.isLetterOrDigit() }
}
