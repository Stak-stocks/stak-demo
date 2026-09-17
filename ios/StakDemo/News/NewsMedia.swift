import Foundation

/// The article hero is a MEDIA SLOT, not a fixed picture (user,
/// 2026-08-23 + 2026-08-30): every story/stock update MUST arrive with a
/// visual so viewers get a social-media-feel view of what the stock is
/// about, like a news channel's picture-then-write-up.
///
/// SERVING CONTRACT for the backend (user, 2026-08-30): search the
/// internet's NEWS for each story - newscasters actually talking about
/// it - across platforms: YouTube, CNN, X (Twitter), Reddit, network
/// news sites and other outlets, and merge the best segment in. A
/// relevant video from the company's own channel also qualifies;
/// otherwise serve a representative image. NEVER out-of-context b-roll.
/// Each item carries its own dynamic embed link (sourceLink: an image
/// hero opens it on tap; a video's tap plays the clip), refreshed as
/// news changes - content may stay static for a period, but it is never
/// one fixed asset. The app renders whatever is served inside the
/// authored 360x208 r10 hero box; a video shows its poster with the
/// play glyph and plays IN PLACE on tap.
///
/// Demo note: in-app YouTube embeds render BLACK on the emulators
/// (probed 2026-08-25 and again 2026-08-30), so demo stories serve
/// DIRECT MP4 newscast clips; YouTube/webviews remain a production
/// option only where the platform player can actually stream them.
/// Served posters arrive as URLs (posterUrl).
/// Mirrors android ui/news/NewsMedia.kt.
enum NewsMedia {
	/// A still image.
	case image(posterAsset: String?, url: String?, sourceLink: String?)
	/// A video behind a poster: YouTube links embed, other links play directly.
	case video(url: String, posterAsset: String?, posterUrl: String?, sourceLink: String?)

	/// The story's own link, whichever media carries it.
	var sourceLink: String? {
		switch self {
		case let .image(_, _, link): return link
		case let .video(_, _, _, link): return link
		}
	}

	/// YouTube watch/short links -> the embeddable player URL; nil for direct media.
	static func youTubeEmbedURL(for url: String) -> URL? {
		let pattern = #"(?:youtube\.com/(?:watch\?v=|embed/|shorts/)|youtu\.be/)([A-Za-z0-9_-]{6,})"#
		guard let re = try? NSRegularExpression(pattern: pattern),
			  let m = re.firstMatch(in: url, range: NSRange(url.startIndex..., in: url)),
			  let r = Range(m.range(at: 1), in: url) else { return nil }
		return URL(string: "https://www.youtube.com/embed/\(url[r])?autoplay=1&playsinline=1&rel=0")
	}

	/// Demo story media: the authored poster art over a verified
	/// direct-stream phone b-roll (Mixkit). YouTube embeds stay the
	/// production contract, but this environment's in-app WebViews are
	/// refused YouTube's video streams (user, 2026-08-25 black screen),
	/// so the demo serves direct MP4s the platform players decode.
	static func demo() -> NewsMedia {
		// iPhone-on-table b-roll (Pexels 4008368, real-time 25fps,
		// verified) - recognizably an iPhone (user, 2026-08-26).
		.video(url: "https://pdl-iphone-cnbc-com.akamaized.net/7000408952/64564c90-32b6-11f1-83bc-712bef7f5456/1775589430-45101273114-hd_L.mp4", posterAsset: "NewsHeroPhone", posterUrl: nil, sourceLink: "https://www.cnbc.com/video/2026/04/07/apple-shares-drop-on-dueling-reports-over-foldable-iphone-timeline.html")
	}
}
