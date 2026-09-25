package com.stak.demo.ui.mystak

import com.stak.demo.data.StockUpdateDto
import com.stak.demo.data.UpdateSourceDto

/**
 * The demo account's "Updates in your STAK" - its persona has no saved companies on the
 * server to detect changes for, so the showcase carries its own, in the shape a real
 * account's updates arrive in.
 */
internal object DemoUpdates {
	private val read = mutableSetOf<Long>()

	private val SAMPLE = listOf(
		StockUpdateDto(
			id = -1L,
			ticker = "MSFT",
			company = "Microsoft",
			kind = "earnings",
			title = "Cloud growth slowed",
			body = "Azure grew more slowly than last quarter, though it still makes up most of the company's growth.",
			watch = "Cloud demand is a key growth driver.",
			sources = listOf(UpdateSourceDto(source = "Reuters", url = "", headline = "Microsoft cloud growth cools from last quarter")),
			occurredAt = "",
		),
		StockUpdateDto(
			id = -2L,
			ticker = "GOOGL",
			company = "Alphabet",
			kind = "earnings",
			title = "Cloud profit improved",
			body = "More of Google's cloud revenue is turning into profit as its data centres fill up.",
			watch = "Watch whether those margins hold.",
			sources = listOf(UpdateSourceDto(source = "CNBC", url = "", headline = "Google Cloud margins improve again")),
			occurredAt = "",
		),
		StockUpdateDto(
			id = -3L,
			ticker = "NFLX",
			company = "Netflix",
			kind = "guidance",
			title = "Revenue outlook raised",
			body = "Netflix now expects higher sales this year than it did three months ago.",
			watch = "Its next results will test that outlook.",
			sources = listOf(UpdateSourceDto(source = "Bloomberg", url = "", headline = "Netflix lifts full-year revenue forecast")),
			occurredAt = "",
		),
	)

	val list: List<StockUpdateDto> get() = SAMPLE.map { if (it.id in read) it.copy(read = true) else it }

	fun markRead(id: Long) {
		read += id
	}
}
