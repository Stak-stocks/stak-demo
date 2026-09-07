package com.stak.demo.ui.news

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.stak.demo.data.StakStore

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
}
