package com.stak.demo.ui.news

import com.stak.demo.R

/**
 * The article hero is a MEDIA SLOT, not a fixed picture (user,
 * 2026-08-23 + 2026-08-30): every story/stock update MUST arrive with a
 * visual so viewers get a social-media-feel view of what the stock is
 * about, like a news channel's picture-then-write-up.
 *
 * SERVING CONTRACT for the backend (user, 2026-08-30): search the
 * internet's NEWS for each story - newscasters actually talking about
 * it - across platforms: YouTube, CNN, X (Twitter), Reddit, network
 * news sites and other outlets, and merge the best segment in. A
 * relevant video from the company's own channel also qualifies;
 * otherwise serve a representative image. NEVER out-of-context b-roll.
 * Each item carries its own dynamic embed link (sourceLink: an image
 * hero opens it on tap; a video's tap plays the clip), refreshed as
 * news changes - content may stay static for a period, but it is never
 * one fixed asset. The app renders whatever is served inside the
 * authored 360x208 r10 hero box; a video shows its poster with the
 * play glyph and plays IN PLACE on tap.
 *
 * Demo note: in-app YouTube embeds render BLACK on the emulators
 * (probed 2026-08-25 and again 2026-08-30), so demo stories serve
 * DIRECT MP4 newscast clips; YouTube/webviews remain a production
 * option only where the platform player can actually stream them.
 * Served posters arrive as URLs (posterUrl).
 */
sealed class NewsMedia {
	/** A still image. */
	data class Image(val posterRes: Int? = null, val url: String? = null, val sourceLink: String? = null) : NewsMedia()

	/** A video behind a poster: YouTube links embed, other links play directly. */
	data class Video(val url: String, val posterRes: Int? = null, val posterUrl: String? = null, val sourceLink: String? = null) : NewsMedia() {
		/** YouTube watch/short links -> the embeddable player URL; null for direct media. */
		val youTubeEmbedUrl: String?
			get() {
				val id = Regex("""(?:youtube\.com/(?:watch\?v=|embed/|shorts/)|youtu\.be/)([A-Za-z0-9_-]{6,})""")
					.find(url)?.groupValues?.get(1) ?: return null
				return "https://www.youtube.com/embed/$id?autoplay=1&playsinline=1&rel=0"
			}
	}

	companion object {
		/**
		 * Demo story media: the authored poster art over a verified
		 * direct-stream phone b-roll (Mixkit). YouTube embeds stay the
		 * production contract, but this environment's in-app WebViews are
		 * refused YouTube's video streams (user, 2026-08-25 black screen),
		 * so the demo serves direct MP4s the platform players decode.
		 */
		fun demo(): NewsMedia = Video(
			// iPhone-on-table b-roll (Pexels 4008368, real-time 25fps,
			// verified) - recognizably an iPhone (user, 2026-08-26).
			url = "https://pdl-iphone-cnbc-com.akamaized.net/7000408952/64564c90-32b6-11f1-83bc-712bef7f5456/1775589430-45101273114-hd_L.mp4",
			posterRes = R.drawable.news_hero_phone,
			sourceLink = "https://www.cnbc.com/video/2026/04/07/apple-shares-drop-on-dueling-reports-over-foldable-iphone-timeline.html",
		)
	}
}
