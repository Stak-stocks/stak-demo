/**
 * The article hero is the story's MEDIA SLOT, as on the phones (android ui/news/NewsMedia.kt:5-29, the user's media-slot
 * contract of 2026-08-23 / 08-30; iOS StakDemo/News/NewsMedia.swift): a story that arrives with a clip shows its poster
 * with the play mark, and the clip plays IN PLACE on the mark (android NewsDetailScreen.kt:535-551, iOS
 * NewsDetailView.swift:348-366); a story without a clip draws no play mark (the phones draw the glyph only for video
 * media). Each clip carries its own link, which the article's Source row opens (android NewsDetailScreen.kt:366-367,
 * 921-954: "take users where the news is gotten from", user 2026-09-08; iOS NewsDetailView.swift:707-733).
 *
 * The clips are the phones' own vetted demo media, word for word (android ui/news/NewsArticleFeed.kt and NewsMedia.kt;
 * the same URLs in iOS StakDemo/News/NewsArticleFeed.swift), for the six website stories that have a phone twin (the
 * coordinator's decision D9). Each URL was checked to answer on 2026-11-07 (clips: 206 video/mp4, the VOA clip after
 * its 301 to voa-video.voanews.eu; posters: 200 image/jpeg; links: 200 text/html). The Fed minutes, the June jobs story
 * and Home's two stories (the fear gauge, the OpenAI IPO) have no clip on the phones: no play mark, and their Source
 * keeps the publisher's site. The article texts stay the website's own.
 */

/** A story's clip: a direct MP4 the browser plays, the poster it shows at rest, and the story's own link. */
export type StoryClip = {
	/** the clip (a direct stream: the phones' demo serves MP4s the platform players decode, NewsMedia.kt:24-27) */
	readonly url: string;
	/**
	 * the served poster (the phones' posterUrl). null: the hero's own image is the poster, as the phones' posterRes is
	 * for Apple (NewsMedia.demo(): R.drawable.news_hero_phone, the frame's illustration 2:4465)
	 */
	readonly poster: string | null;
	/** the story's own page (the phones' sourceLink): the Source row opens it */
	readonly sourceLink: string;
	/** where the phones author it: the Android story id and its line in NewsArticleFeed.kt / NewsMedia.kt */
	readonly ref: string;
	/**
	 * The clip's host refuses a request that names another site as its referrer (video.twimg.com answers 403 text/plain
	 * to the page's own <video> request, which carries the page's address, and 200 video/mp4 to the same request without
	 * one: measured 2026-11-07 in Chrome on /news/oil-slips-iran). A <video> cannot drop its referrer (media elements take
	 * no referrerpolicy), so the hero fetches such a clip without one and plays it from memory (the clips are 3-7 MB).
	 */
	readonly noReferrer?: true;
	/**
	 * The clip's own LEAD-IN, in seconds of its media time: how long it takes to get from its first frame to its picture.
	 * The two CNBC clips open on black and fade the newscast in (measured 2026-11-09, each clip paused frame by frame in
	 * Chrome, the picture's mean luminance against its settled level: 0% at 0 s and 0.033 s, 2% at 0.1 s, 9-10% at
	 * 0.2 s, 25% at 0.3 s, 50% at 0.4 s, 84% at 0.5 s, 99-100% from 0.6 s: 18 frames at 30 fps). Shown at its first
	 * frame, the player went poster, black, picture (the review of 2026-11-09), so the hero's poster holds until the clip
	 * has played past its lead-in (heroPlayer.ts watchFirstFrame). Absent: the clip opens on its picture (the VOA clip and
	 * the three X clips: 56-100% of their settled level at 0 s) and shows at its first moving frame.
	 */
	readonly leadIn?: number;
};

/** CNBC's own clips fade in from black over their first 0.6 s (StoryClip.leadIn: measured on both, frame by frame). */
export const CNBC_FADE_IN = 0.6;

/** The phones' clips, keyed by the website's story id. */
export const STORY_CLIPS: Readonly<Record<string, StoryClip>> = {
	// android NewsArticleFeed.kt:168 "dow-record-chips-slide" (CNBC Closing Bell on X)
	"dow-record-chips": {
		url: "https://video.twimg.com/amplify_video/1407070844472508418/vid/640x360/IrLoEoh_QEHqT5Zc.mp4?tag=14",
		poster: "https://pbs.twimg.com/media/E4brjWsXoAAF3gP.jpg",
		sourceLink: "https://x.com/CNBCClosingBell/status/1407070932716474374",
		ref: "android NewsArticleFeed.kt:168 (dow-record-chips-slide)",
		noReferrer: true,
	},
	// android NewsArticleFeed.kt:294 "nvda-lags-rally" (CNBC)
	"nvidia-chip-rally": {
		url: "https://pdl-iphone-cnbc-com.akamaized.net/7000396229/a2927310-c652-11f0-afc8-d79487fce04e/1763671856-42633094871-hd_L.mp4",
		poster: "https://image.cnbcfm.com/api/v1/image/108229488-17636718631763671856-42633094871-1080pnbcnews.jpg?v=1763671862&w=1280&h=720",
		sourceLink: "https://www.cnbc.com/video/2025/11/20/dan-ives-nvidia-put-up-a-masterpiece-quarter-and-threw-ai-bubble-out-the-window.html",
		ref: "android NewsArticleFeed.kt:294 (nvda-lags-rally)",
		leadIn: CNBC_FADE_IN,
	},
	// android NewsMedia.kt:53-59 NewsMedia.demo(), the Apple story's media (NewsArticleFeed.kt:129): its poster is the
	// frame's own illustration, so the hero keeps Figma's image
	"apple-foldable": {
		url: "https://pdl-iphone-cnbc-com.akamaized.net/7000408952/64564c90-32b6-11f1-83bc-712bef7f5456/1775589430-45101273114-hd_L.mp4",
		poster: null,
		sourceLink: "https://www.cnbc.com/video/2026/04/07/apple-shares-drop-on-dueling-reports-over-foldable-iphone-timeline.html",
		ref: "android NewsMedia.kt:53-59 (NewsMedia.demo(), apple-foldable)",
		leadIn: CNBC_FADE_IN,
	},
	// android NewsArticleFeed.kt:316 "tsla-drops-deliveries" (CNBC Squawk Box on X)
	"tesla-deliveries": {
		url: "https://video.twimg.com/amplify_video/1477968621418823684/vid/640x360/RK2UN9LzxttCiyIs.mp4?tag=14",
		poster: "https://pbs.twimg.com/media/FILMuTvXMAAk1hK.jpg",
		sourceLink: "https://x.com/SquawkCNBC/status/1477968728969072641",
		ref: "android NewsArticleFeed.kt:316 (tsla-drops-deliveries)",
		noReferrer: true,
	},
	// android NewsArticleFeed.kt:363 "memory-chips-soar" (VOA)
	"memory-chips-soar": {
		url: "https://voa-video-ns.akamaized.net/pangeavideo/2024/04/0/01/01000000-0aff-0242-4978-08dc5a5cdef2_480p.mp4?cb=eddaa30b3",
		poster: "https://gdb.voanews.com/89efc172-826e-45dd-ad20-df3a903817f7_w1080_h608.jpg",
		sourceLink: "https://www.voanews.com/a/7566533.html",
		ref: "android NewsArticleFeed.kt:363 (memory-chips-soar)",
	},
	// android NewsArticleFeed.kt:224 "oil-opec-supply" (Bloomberg TV on X)
	"oil-slips-iran": {
		url: "https://video.twimg.com/amplify_video/1699284608536248320/vid/avc1/640x360/Eeh_WcbfPbwwZC8h.mp4?tag=16",
		poster: "https://pbs.twimg.com/amplify_video_thumb/1699284608536248320/img/FYIKCy2RrRRIaOEG.jpg",
		sourceLink: "https://x.com/BloombergTV/status/1699393999142879621",
		ref: "android NewsArticleFeed.kt:224 (oil-opec-supply)",
		noReferrer: true,
	},
};

/**
 * How a clip, or its poster, fills the hero. The phones crop the clip to their hero (android NewsDetailScreen.kt:432-436
 * VideoSurfaceHost zoom = true: "The clip fills the hero at ITS aspect ratio, cropped like the frame's hero image"; their
 * 350 x 208 hero is 5% off a 16:9 clip, as the frame's 720 x 416 hero is 3% off it). The website's hero keeps the frame's
 * 416 at every desktop width and fills the column below 1024, so its shape runs from about 1.1:1 (a 390 phone) to
 * 3.5:1 (a 2560 window) while the clips and posters stay 16:9: cropped, a 2560 hero would keep half of the picture's
 * height and a phone's hero two thirds of its width (the review of 2026-11-07). So a hero within FIT_TOLERANCE of the
 * picture's shape crops as the phones do ("cover"), and one further off shows the whole picture letterboxed ("contain"),
 * the hero filled behind it. A size not yet known reads "cover" (nothing is drawn with it before it is known).
 */
export const FIT_TOLERANCE = 0.1;
export type MediaFit = "cover" | "contain";
export type MediaSize = { readonly width: number; readonly height: number };
export function mediaFit(box: MediaSize, media: MediaSize, tolerance: number = FIT_TOLERANCE): MediaFit {
	if (!(box.width > 0 && box.height > 0 && media.width > 0 && media.height > 0)) return "cover";
	const ratio = box.width / box.height / (media.width / media.height);
	return Math.abs(ratio - 1) <= tolerance ? "cover" : "contain";
}

/** The story's clip, or null: a story without one draws no play mark. */
export const clipOf = (id: string): StoryClip | null => STORY_CLIPS[id] ?? null;

/** Where the article's Source row leads: the story's own link when its clip carries one, otherwise the publisher's site. */
export const sourceHrefOf = (story: { readonly id: string; readonly sourceUrl: string }): string => clipOf(story.id)?.sourceLink ?? story.sourceUrl;
