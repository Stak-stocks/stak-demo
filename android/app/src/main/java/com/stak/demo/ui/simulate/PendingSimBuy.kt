package com.stak.demo.ui.simulate

/**
 * A company handed to Simulate from somewhere else - the stock page's "Practice with
 * ..." button. The tab is reached by popping the whole shell, so the request is left
 * here and picked up once Simulate is on screen.
 *
 * Taken exactly once: coming back to Simulate later must not reopen a ticket the user
 * has already dealt with.
 */
internal object PendingSimBuy {
	private var symbol: String? = null
	private var company: String? = null

	fun request(symbol: String, company: String) {
		this.symbol = symbol
		this.company = company
	}

	/** The waiting request, left in place. */
	fun peek(): Pair<String, String>? {
		val s = symbol ?: return null
		return s to (company ?: s)
	}

	/** Spends the request - called once the ticket can actually be opened. */
	fun take() {
		symbol = null
		company = null
	}
}
