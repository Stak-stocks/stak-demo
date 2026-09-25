package com.stak.demo.ui.news

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.stak.demo.ui.StakStore

/**
 * The stories the user saved (bookmark / Add to STAK), shared by every
 * article page and persisted across relaunches (product audit,
 * 2026-09-05: the flag used to live in one screen's saved state).
 * Mirrors ios NewsSaves.swift.
 */
object NewsSaves {
	var ids by mutableStateOf(setOf<String>())
		private set

	fun load() {
		ids = StakStore.getSet("news.saved") ?: emptySet()
	}

	fun add(id: String) {
		if (id in ids) return
		ids = ids + id
		StakStore.putSet("news.saved", ids)
	}

	/** Unsaving a stock forgets the stories that saved it, so they offer Add to STAK again (Codex review, PR #167 mirror). */
	fun removeStories(ticker: String) {
		val next = ids.filterNot { NewsArticleFeed.tickerOf(it) == ticker }.toSet()
		if (next.size == ids.size) return
		ids = next
		StakStore.putSet("news.saved", ids)
	}
}
