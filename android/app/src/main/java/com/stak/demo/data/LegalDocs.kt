package com.stak.demo.data

/**
 * The Terms of Service and Privacy Policy for the in-app sheet (ui/components/LegalSheet.kt), read from GET
 * /api/legal/:doc - the same text the web shows at /terms and /privacy (shared/src/legalText.ts). Kept for the life of
 * the process once read. Mirrors iOS Core/LegalDocs.swift.
 */
object LegalDocs {
	const val TERMS = "terms"
	const val PRIVACY = "privacy"

	private var repository: StockRepository? = null
	private val cache = java.util.concurrent.ConcurrentHashMap<String, LegalDocResponse>()

	fun init(repo: StockRepository) {
		repository = repo
	}

	/** [doc] is [TERMS] or [PRIVACY]; null when it couldn't be read (the sheet offers a retry). */
	suspend fun load(doc: String): LegalDocResponse? {
		cache[doc]?.let { return it }
		val repo = repository ?: return null
		return runCatching { repo.getLegal(doc) }.getOrNull()?.also { cache[doc] = it }
	}
}
