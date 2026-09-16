package com.stak.demo.data

/** How far a chart line stays clear of the top and bottom of its box. */
private const val EDGE = 0.08f

/**
 * Closes as fractions of a chart's height, inset from the edges. The line is a
 * 2dp stroke centred on its path, so a high of exactly 1.0 would draw half of
 * itself outside the box and read as clipped. A series that never moved sits in
 * the middle rather than pinned to the floor.
 */
internal fun chartFractions(values: List<Double>): List<Float> {
	if (values.isEmpty()) return emptyList()
	val low = values.min()
	val span = (values.max() - low).takeIf { it > 1e-9 }
	return values.map { v ->
		if (span == null) 0.5f else (EDGE + ((v - low) / span).toFloat() * (1f - 2 * EDGE)).coerceIn(0f, 1f)
	}
}

// The equal-weight combination lives on the backend now (GET /api/stock/
// portfolio-chart), which returns one line for a whole Stak. Keeping a second
// implementation here only invited the two to drift.

/** The move across an indexed series, as a percentage. */
internal fun indexedMovePct(indexed: List<Double>): Double = (indexed.last() - 1.0) * 100.0
