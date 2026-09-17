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
		// A summary that opens with the headline and then adds more keeps only the more:
		// printed whole, the card or page repeated its own title before getting going.
		if (h.isNotEmpty() && s.startsWith(h)) return afterLettersAndDigits(summary, h.length)
		return summary.trim()
	}

	/** [text] from just past its first [count] letters and digits, without leading punctuation. */
	private fun afterLettersAndDigits(text: String, count: Int): String {
		var seen = 0
		var i = 0
		while (i < text.length && seen < count) {
			if (text[i].isLetterOrDigit()) seen++
			i++
		}
		return text.substring(i).trimStart { !it.isLetterOrDigit() }
	}

	private fun lettersAndDigits(text: String): String = text.lowercase().filter { it.isLetterOrDigit() }
}
