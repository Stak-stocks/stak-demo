import Foundation

/// Mirrors android data/NewsText.kt.
enum NewsText {
	/// `summary` when it says more than `headline`, else nil. Feeds often send the headline again as the summary,
	/// padded with the source and stray characters ("... sources say� Reuters" under "... sources say - Reuters"), so
	/// the two are compared by letters and digits alone, and a summary needs 25 more of those than the headline to
	/// count as saying something new.
	static func summaryBeyondHeadline(_ headline: String, _ summary: String) -> String? {
		let beforeSource = headline.range(of: " - ", options: .backwards).map { String(headline[..<$0.lowerBound]) }
		let core = beforeSource.flatMap { $0.count >= 20 ? $0 : nil } ?? headline
		let h = lettersAndDigits(core)
		let s = lettersAndDigits(summary)
		if s.count < 25 || (s.hasPrefix(h) && s.count - h.count < 25) { return nil }
		// A summary that opens with the headline and then adds more keeps only the more: printed whole, the card or
		// page repeated its own title before getting going.
		if !h.isEmpty && s.hasPrefix(h) { return afterLettersAndDigits(summary, h.count) }
		return summary.trimmingCharacters(in: .whitespacesAndNewlines)
	}

	/// `text` from just past its first `count` letters and digits, without leading punctuation.
	private static func afterLettersAndDigits(_ text: String, _ count: Int) -> String {
		var seen = 0
		var i = text.startIndex
		while i < text.endIndex && seen < count {
			if isLetterOrDigit(text[i]) { seen += 1 }
			i = text.index(after: i)
		}
		return String(text[i...].drop { !isLetterOrDigit($0) })
	}

	private static func lettersAndDigits(_ text: String) -> String {
		String(text.lowercased().filter(isLetterOrDigit))
	}

	/// Kotlin's Char.isLetterOrDigit: letters, and decimal digits only - not ½, ² or circled numbers, which Swift's
	/// isNumber also counts and which would shift the comparison.
	private static func isLetterOrDigit(_ c: Character) -> Bool {
		if c.isLetter { return true }
		guard c.unicodeScalars.count == 1, let scalar = c.unicodeScalars.first else { return false }
		return scalar.properties.numericType == .decimal
	}

	/// `text` split into sentences after . ! or ? - Kotlin's split on (?<=[.!?])\s+, used by the article's pull quote
	/// and the brief's fallback items.
	static func sentences(_ text: String) -> [String] {
		text.replacingOccurrences(of: #"(?<=[.!?])\s+"#, with: "\u{1}", options: .regularExpression)
			.split(separator: "\u{1}").map(String.init)
	}
}
