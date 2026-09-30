import SwiftUI
import Combine
import WebKit
import AVKit
import AVFoundation

/// The CHINEDU CTA gradient (Add to STAK / View in My STAK).
private let ctaGradient = LinearGradient(
	stops: [
		.init(color: Color(argb: 0xFFA6E4F7), location: 0.0889),
		.init(color: Color(argb: 0xFF5DA8BF), location: 0.3919),
		.init(color: Color(argb: 0xFF3C98B4), location: 0.7255),
		.init(color: Color(argb: 0xFF3C98B4), location: 1)
	],
	startPoint: .top,
	endPoint: .bottom
)
private let ctaBorder = StakColors.ctaBorderGradient

/// 03 · News — the article page in its three frames: "News detail page
/// unsaved" (1:1495), "News detail · Save success" (101:1005, the bottom
/// sheet over a rgba(12,19,32,0.55) scrim) and "News detail page saved" (1:1359 —
/// hero toast, View-in-My-STAK row on the stock card, Apple + Tech tags).
/// Mirrors android/ NewsDetailScreen.kt. Every metric is scaled by the
/// 390pt artboard unit (`figmaUnit`), exactly like the Android build.
///
/// The screen is a PAGER (user, 2026-08-31: "swipe to get the previous/next
/// news - social media vibes"): the fixed top bar stays put while, under it,
/// one NewsArticlePage per feed story rides a horizontal .page TabView -
/// exactly the pre-pager article content per page, only the container
/// changed. It opens on the tapped story's page (NewsArticleFeed.pageOrder),
/// share uses the CURRENT page's story, and only the current page owns a
/// live hero player (HeroImage.isActive).
struct NewsDetailView: View {
	/// The served article for the tapped story (user, 2026-08-25); the
	/// Apple article is the authored one and renders frame-exact.
	var articleId: String = NewsArticleFeed.apple
	let onBack: () -> Void
	var onViewInMyStak: () -> Void = {}
	/// READ NEXT rows push the next story's article (user, 2026-08-25).
	var onOpenArticle: (String) -> Void = { _ in }
	/// This screen is the TOP of the shell's pushed stack. A READ NEXT push
	/// covers the previous article without unmounting it, so the shell
	/// passes false to the covered one: its hero releases its player (no
	/// audio under the new article) and re-warms when Back uncovers it.
	var isTop: Bool = true

	/// SWIPE DIRECTION - the one place to flip it. `true` is the standard
	/// pager convention: a finger swipe to the LEFT snaps to the NEXT story,
	/// a swipe to the RIGHT to the PREVIOUS one. `false` reverses the page
	/// list, so the same pager runs the other way round.
	static let swipeLeftIsNext = true

	/// The story ids this screen pages through, in swipe order.
	private let pages: [String]
	/// The current page - starts on the tapped story.
	@State private var index: Int
	/// Saved is PER STORY and lives here rather than in the page: it survives
	/// the pager recycling far-off pages, and the save-success sheet (whose
	/// authored scrim, 101:1168, dims the top bar too) keeps drawing over the
	/// whole screen exactly as it did before the pager.
	// Product audit (2026-09-05): saves live in NewsSaves, shared and persisted.
	@ObservedObject private var saves = NewsSaves.shared
	private var savedIds: Set<String> { saves.ids }
	/// The story whose save-success sheet is up (nil = none).
	@State private var successId: String? = nil

	init(articleId: String = NewsArticleFeed.apple, onBack: @escaping () -> Void, onViewInMyStak: @escaping () -> Void = {}, onOpenArticle: @escaping (String) -> Void = { _ in }, isTop: Bool = true) {
		self.articleId = articleId
		self.onBack = onBack
		self.onViewInMyStak = onViewInMyStak
		self.onOpenArticle = onOpenArticle
		self.isTop = isTop
		// The feed's canonical order; a story outside it (never, in the demo)
		// still opens - as the only page.
		let order = NewsArticleFeed.pageOrder
		let base = order.contains(articleId) ? order : [articleId]
		let pages = Self.swipeLeftIsNext ? base : Array(base.reversed())
		self.pages = pages
		_index = State(initialValue: pages.firstIndex(of: articleId) ?? 0)
	}

	/// The story on the current page - the top bar's share link uses it.
	private var currentArticle: NewsArticleFeed.Article {
		NewsArticleFeed.article(pages[min(max(index, 0), pages.count - 1)])
	}

	var body: some View {
		let u = figmaUnit
		ZStack {
			VStack(spacing: 0) {
				// Fixed top bar — back circle + share; it stays put above the pager.
				HStack {
					AuthBackCircle(action: onBack)
					Spacer()
					// Designer's call (2026-08-22): share creates a link that
					// takes a co-app user to the shared info - the CURRENT page's.
					ShareLink(item: currentArticle.shareText) {
						Image("IcNewsShare")
							.resizable()
							.frame(width: 24 * u, height: 24 * u)
					}
					.buttonStyle(.pressDim)
					.accessibilityLabel("Share")
				}
				.padding(.leading, 16 * u)
				.padding(.trailing, 18 * u)
				.padding(.top, 10 * u)
				.padding(.bottom, 12 * u)

				// The pager: iOS's standard horizontal page style (swipe left =
				// next, see swipeLeftIsNext). It owns horizontal drags only -
				// each page's vertical ScrollView scrolls exactly as before.
				TabView(selection: $index) {
					ForEach(pages.indices, id: \.self) { i in
						let id = pages[i]
						NewsArticlePage(
							article: NewsArticleFeed.article(id),
							// Live hero only on the current page of the TOP screen:
							// a covered article (READ NEXT) releases its player.
							isActive: isTop && index == i,
							saved: savedIds.contains(id),
							onSave: { save(id) },
							// Designer's call (2026-08-22): the sheet scale-ins; its
							// authored entry is Smart Animate 350 (1:1359, Codex parity
							// audit 2026-09-04) - the dismiss below stays the 300 dissolve.
							// The save is committed on the tap (Codex review, PR #167); the sheet's paths only navigate.
							onAddToStak: { save(id); withAnimation(.easeOut(duration: 0.35)) { successId = id } },
							onOpenArticle: onOpenArticle
						)
						.tag(i)
					}
				}
				.tabViewStyle(.page(indexDisplayMode: .never))
			}
			// Authored (101:1005 Motion): Back -> News detail page saved,
			// DISSOLVE 300 EaseOut; View in My STAK -> My STAK Overview,
			// Push Right 300 (hoisted to the shell). Entry is authored Smart
			// Animate 350 (Codex parity audit 2026-09-04) - see onAddToStak.
			if let sheetId = successId {
				SaveSuccessOverlay(
					facts: NewsArticleFeed.stockFacts(NewsArticleFeed.article(sheetId).ticker ?? "AAPL"),
					onViewInMyStak: { save(sheetId); onViewInMyStak() },
					onDismiss: {
						save(sheetId)
						withAnimation(.easeOut(duration: 0.3)) { successId = nil }
					}
				)
				.transition(.asymmetric(insertion: .scale(scale: 0.92).combined(with: .opacity), removal: .opacity))
			}
		}
		.background(StakColors.bg.ignoresSafeArea())
	}

	/// The save itself - the hero bookmark's direct save, the sheet's Back
	/// and its View in My STAK all land here: the story is saved and its
	/// stock joins My STAK.
	private func save(_ id: String) {
		saves.add(id)
		if let t = NewsArticleFeed.article(id).ticker { MyStakHoldings.shared.add(t) }
	}
}

/// ONE story's page under the fixed top bar - the hero and the article
/// column, exactly the pre-pager content; NewsDetailView pages a row of these.
private struct NewsArticlePage: View {
	let article: NewsArticleFeed.Article
	/// true while this is the pager's current page (see HeroImage.isActive).
	let isActive: Bool
	let saved: Bool
	/// The hero bookmark's direct save (authored 1:1495: skips the sheet).
	let onSave: () -> Void
	/// Add to STAK - the shell puts up the save-success sheet.
	let onAddToStak: () -> Void
	/// READ NEXT rows push the next story's article (user, 2026-08-25).
	let onOpenArticle: (String) -> Void

	var body: some View {
		let u = figmaUnit
		ScrollView {
			VStack(spacing: 0) {
				// Authored motion (1:1495): the hero bookmark -> News detail
				// page saved, Instant - a direct save that skips the sheet.
				HeroImage(media: article.media, category: article.category, saved: saved, isActive: isActive, onBookmark: onSave)
				VStack(alignment: .leading, spacing: 15 * u) {
					// Grouped: a ViewBuilder block takes ten children at most (Swift 5.9).
					Group {
						Text(article.headline)
							// RENDER-measured 20sp (the metadata's 24 lied); lh32 box stands.
							.font(StakFont.sora(20 * u, .semiBold))
							.stakLineHeight(32 * u, size: 20 * u, face: .sora)
							.foregroundStyle(StakColors.textPrimary)
						Text(article.subtitle)
							// 14.3 keeps the authored line-1 break after "lineup".
							.font(StakFont.geist(14.3 * u))
							.stakLineHeight(22 * u, size: 14.3 * u, face: .geist)
							.foregroundStyle(News.muted)
							// The column's 15 alone: the headline box is the authored 64 now
							// (stakLineHeight pads the half-leading), the old +5 is gone.
						Byline(source: article.source, meta: article.sourceMeta)
						if !saved {
							AddToStakButton(action: onAddToStak)
						}
						NewsHairline()
					}
					// Story blocks.
					Group {
						// ONE template for every story (user, 2026-08-25: the
						// Apple article is the section's PLACEHOLDER - each
						// block renders per story from served data; stock
						// blocks appear whenever the story has a ticker).
						if let ticker = article.ticker { StockCard(saved: saved, ticker: ticker, facts: NewsArticleFeed.stockFacts(ticker)) }
						if !article.gist.isEmpty { GistCard(bullets: article.gist) }
						if let first = article.paragraphs.first {
							Paragraph(text: first, size: 15, line: 24)
						}
						if article.paragraphs.count > 1 {
							Paragraph(text: article.paragraphs[1])
						}
						if let quote = article.pullQuote { PullQuote(text: quote) }
						if let explainer = article.explainer { NewToThisCard(body_: explainer) }
					}
					// Tail.
					Group {
						ForEach(Array(article.paragraphs.dropFirst(2).enumerated()), id: \.offset) { _, text in
							Paragraph(text: text)
						}
						// The Source row opens where the story came from (user, 2026-09-08).
						SourceRow(link: article.media.sourceLink)
						if let ticker = article.ticker { KeyStatsCard(facts: NewsArticleFeed.stockFacts(ticker)) }
						NewsHairline()
						HStack(spacing: 8 * u) {
							if let first = article.tags.first { ArticleTag(text: first) }
							if saved, article.tags.count > 1 {
								ArticleTag(text: article.tags[1])
							}
						}
						ReadNext(currentId: article.id, onOpen: onOpenArticle)
					}
				}
				.frame(maxWidth: .infinity, alignment: .leading)
				.padding(.horizontal, 20 * u)
				// Authored Content pad 22 (1:1525). The old 26 compensated the
				// short headline box; with the half-leading in stakLineHeight the
				// cap-top lands at the frame's 344 from 22 (mirrors android).
				.padding(.top, 22 * u)
				.padding(.bottom, 28 * u)
			}
		}
	}
}

/// 360x208 r10 hero — phone art, Tech & AI toast, play badge, bookmark/saved
/// chip. The authored image is oversized (407x271.18 in the 360x208 card,
/// top-left at -24,-15) — it keeps its exact authored frame (the Compose
/// requiredSize + Crop becomes .scaledToFill + explicit .frame + .clipped)
/// and the card's rounded clip crops the overflow.
// CONTRACT (user, 2026-08-25): this screen is the News info page TEMPLATE.
// The design authors exactly ONE article (1:1495, the Apple foldable
// story), so every authored news tap lands here in the demo. In
// production the backend serves each story's own headline, subtitle,
// body and media into this page - same slot pattern as NewsMedia.
private struct HeroImage: View {
	let media: NewsMedia
	let category: String
	let saved: Bool
	/// The hero's page is the pager's CURRENT page (NewsDetailView,
	/// 2026-08-31). Only the current page owns a player: it pre-buffers the
	/// moment its page becomes current, and swiping away stops and releases
	/// it - native chrome, system PiP window and fullscreen included - so an
	/// off-screen page never plays audio. Rest state (poster + glyph) untouched.
	let isActive: Bool
	let onBookmark: () -> Void
	/// The hero is a media slot: poster + play glyph at rest (frame-exact),
	/// the served video playing IN PLACE once tapped (user, 2026-08-23).
	/// Once playing, the native chrome owns pause/resume (2026-08-31), so the
	/// 2026-08-30 tap-to-pause glyph and its `paused` state are gone.
	@State private var playing = false
	/// Cinema-fast start (user, 2026-08-30): the player is created (and starts
	/// buffering) while the page is current; the poster holds until playback runs.
	@State private var heroPlayer: AVPlayer? = nil
	@State private var firstFrame = false
	@Environment(\.openURL) private var openURL

	var body: some View {
		let u = figmaUnit
		ZStack {
			Color(argb: 0xFFC4C4C4)
				.onAppear { if isActive { prebuffer() } }
				// The page swiped in or out (a page the pager built mid-drag
				// appears inactive and picks its player up once it snaps current).
				.onChange(of: isActive) { _, active in
					if active { prebuffer() } else { release() }
				}
			if playing, case let .video(url, _, _, _) = media {
				// A failed OR FINISHED stream returns to the poster + glyph
				// instead of stranding a frame (user, 2026-08-25/26).
				// Full player (user, 2026-08-31, video_app reference): the
				// native AVPlayerViewController chrome carries play/pause with
				// the +/-10s skips, the scrubber with elapsed/total time,
				// subtitles, fullscreen, the "..." menu (playback speed,
				// AirPlay) and system PiP - see NativePlayerView. The custom
				// mute chip and the tap-to-pause glyph drew over that chrome,
				// so both are gone; volume lives in the hardware buttons and
				// the fullscreen chrome's slider.
				NewsVideoPlayer(url: url, prebuffered: heroPlayer, onBegan: { firstFrame = true }, onDone: { playing = false; firstFrame = false; heroPlayer?.pause(); heroPlayer?.seek(to: .zero) })
				if !firstFrame, case let .video(_, asset, posterUrl, _) = media {
					// The poster holds until the clip actually runs - no black gap.
					if let asset {
						Image(asset)
							.resizable()
							.scaledToFill()
							.frame(width: 407 * u, height: 271.18 * u)
							.clipped()
							.offset(x: -0.5 * u, y: 16.59 * u)
					} else if let posterUrl, let pu = URL(string: posterUrl) {
						AsyncImage(url: pu) { img in img.resizable().scaledToFill() } placeholder: { Color(argb: 0xFFC4C4C4) }
					}
				}
			} else {
				let poster: String? = {
					switch media {
					case let .image(asset, _, _): return asset
					case let .video(_, asset, _, _): return asset
					}
				}()
				// A story whose artwork is a remote URL, not a bundled poster, shows it
				// before playback too (Codex review, PR #167).
				let remotePoster: String? = {
					switch media {
					case let .image(_, url, _): return url
					case let .video(_, _, posterUrl, _): return posterUrl
					}
				}()
				if let poster {
					Image(poster)
						.resizable()
						.scaledToFill()
						.frame(width: 407 * u, height: 271.18 * u)
						.clipped()
						.offset(x: -0.5 * u, y: 16.59 * u)
				} else if let remotePoster, let remoteURL = URL(string: remotePoster) {
					AsyncImage(url: remoteURL) { img in img.resizable().scaledToFill() } placeholder: { Color(argb: 0xFFC4C4C4) }
						.frame(width: 407 * u, height: 271.18 * u)
						.clipped()
						.offset(x: -0.5 * u, y: 16.59 * u)
				}
				if case .video = media {
					Button { playing = true } label: {
						Image("IcHeroPlay")
							.resizable()
							.frame(width: 59.92 * u, height: 53.75 * u)
							.rotationEffect(.degrees(90))
					}
					.buttonStyle(.pressDim)
					// 1:1522: the polygon sits 8.64%/25% inset in its 81 box, so the rotated
					// glyph's centre is 6.63 right of the box centre - exact-design audit 2026-09-04.
					.offset(x: 6.13 * u, y: 12.5 * u)
				}
				// An image with an embedded link (served contract): tapping
				// the hero opens the story's own dynamic link.
				if case let .image(_, _, link) = media, let link, let linkURL = URL(string: link) {
					Color.clear
						.contentShape(Rectangle())
						.onTapGesture { openURL(linkURL) }
				}
			}
			// The category chip is the REST state's (frame-authored); while
			// playing the canvas belongs to the native controls (mirrors
			// android's HeroImage, 2026-08-31).
			if !playing {
				Text(category)
					.font(StakFont.geist(10 * u, .medium))
					.foregroundStyle(StakColors.textPrimary)
					.padding(.horizontal, 7 * u)
					.padding(.vertical, 5 * u)
					// Authored r7.875 (1:1519) - exact-design audit 2026-09-04.
					.background(Color(argb: 0x40242B3D), in: RoundedRectangle(cornerRadius: 7.875 * u))
					.padding(.leading, 9 * u)
					.padding(.bottom, 10 * u)
					.frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomLeading)
				// The bookmark/saved chip is rest-state chrome too: while
				// playing, the hero's top-right corner belongs to the native
				// chrome's PiP button (android, 2026-08-31: the chip sat OVER
				// it and swallowed the tap).
				if saved {
					HStack(spacing: 4 * u) {
						Image("IcSavedBookmark")
							.resizable()
							.frame(width: 11 * u, height: 11 * u)
						Text("Saved to My STAK")
							.font(StakFont.geist(10 * u, .medium))
							.foregroundStyle(StakColors.textPrimary)
					}
					.padding(.horizontal, 7 * u)
					// Authored toast is 21 tall (1:1386): 13 text + 4/4 pads.
					.padding(.vertical, 4 * u)
					// Authored r7.875 (1:1386) - exact-design audit 2026-09-04.
					.background(Color(argb: 0x40242B3D), in: RoundedRectangle(cornerRadius: 7.875 * u))
					.padding(.top, 8 * u)
					.padding(.trailing, 7 * u)
					.frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topTrailing)
				} else {
					Button(action: onBookmark) {
						Image("IcHeroBookmark")
							.resizable()
							.frame(width: 17.79 * u, height: 18.27 * u)
					}
					.buttonStyle(.pressDim)
					.padding(.top, 8 * u)
					// 1:1523 sits at x 330.77 in the 360 hero: 11.44 from the right - exact-design audit 2026-09-04.
					.padding(.trailing, 11.44 * u)
					.frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topTrailing)
				}
			}
		}
		.frame(maxWidth: .infinity)
		.frame(height: 208 * u)
		// Authored radius 10 (1:1517 Inspect) - the earlier 24 was wrong.
		.clipShape(RoundedRectangle(cornerRadius: 10 * u))
		.padding(.horizontal, 15 * u)
	}

	/// Cinema-fast start (user, 2026-08-30): the player is created (and
	/// starts buffering) as soon as this page is the current one, so the play
	/// tap finds a warm player; the poster holds until playback runs.
	private func prebuffer() {
		guard heroPlayer == nil, case let .video(url, _, _, _) = media,
			NewsMedia.youTubeEmbedURL(for: url) == nil, let direct = URL(string: url) else { return }
		let p = AVPlayer(url: direct)
		// Deep buffer so playback never stall-cycles (user, 2026-08-30).
		p.currentItem?.preferredForwardBufferDuration = 30
		heroPlayer = p
	}

	/// The page was swiped away: back to poster + glyph, which drops the
	/// player view - NativePlayerView.dismantleUIViewController detaches the
	/// AVPlayer, ending any system PiP window or fullscreen presentation, and
	/// a YouTube embed's WKWebView simply goes - then the pre-buffered player
	/// is paused and let go: no audio, no buffering from an off-screen page.
	private func release() {
		playing = false
		firstFrame = false
		heroPlayer?.pause()
		heroPlayer = nil
	}
}

/// Templated per story - the authored sample is "Bloomberg · Jul 2 · 3 min read".
private struct Byline: View {
	let source: String
	let meta: String

	var body: some View {
		let u = figmaUnit
		HStack(spacing: 8 * u) {
			ZStack {
				Circle().fill(News.chipBg)
				Text(String(source.prefix(1)))
					.font(StakFont.sora(10 * u, .semiBold))
					.foregroundStyle(Color(argb: 0xFF9EADC7))
			}
			.frame(width: 24 * u, height: 24 * u)
			HStack(spacing: 5 * u) {
				Text(source)
					.font(StakFont.geist(12 * u, .medium))
					.foregroundStyle(StakColors.textPrimary)
				Text(meta)
					.font(StakFont.geist(12 * u))
					.foregroundStyle(News.faint)
			}
		}
		.padding(.vertical, 2 * u)
	}
}

/// 150x52 gradient CTA with the plus mark.
private struct AddToStakButton: View {
	let action: () -> Void

	var body: some View {
		let u = figmaUnit
		Button(action: action) {
			HStack(spacing: 8 * u) {
				Text("Add to STAK")
					.font(StakFont.geist(14 * u, .medium))
					.foregroundStyle(StakColors.textPrimary)
				Image("IcPlusSmall")
					.resizable()
					.frame(width: 14 * u, height: 14 * u)
			}
			.frame(width: 150 * u, height: 52 * u)
			.background(ctaGradient, in: RoundedRectangle(cornerRadius: 6 * u))
			.overlay(
				RoundedRectangle(cornerRadius: 6 * u)
					.strokeBorder(ctaBorder, lineWidth: 0.36 * u)
			)
		}
		.buttonStyle(.pressDim)
	}
}

/// 1-unit #2a3346 hairline (the Android Divider()).
private struct NewsHairline: View {
	var body: some View {
		let u = figmaUnit
		Rectangle()
			.fill(News.divider)
			.frame(height: 1 * u)
	}
}

/// The story's stock card - EVERY article renders it with its own
/// stock's served facts (user, 2026-08-25: "use the apple features...
/// replace the placeholder"). The sparkline stays the authored demo
/// asset until the backend serves chart data.
private struct StockCard: View {
	let saved: Bool
	let ticker: String
	let facts: NewsArticleFeed.StockFacts

	var body: some View {
		let u = figmaUnit
		VStack(alignment: .leading, spacing: 13 * u) {
			HStack(spacing: 0) {
				ZStack {
					Circle().fill(News.chipBg)
					Text(String(facts.name.prefix(1)))
						.font(StakFont.sora(18 * u, .semiBold))
						.foregroundStyle(Color(argb: 0xFF9EADC7))
				}
				.frame(width: 44 * u, height: 44 * u)
				Spacer().frame(width: 12 * u)
				VStack(alignment: .leading, spacing: 3 * u) {
					Text(facts.name)
						.font(StakFont.sora(15 * u, .semiBold))
						.foregroundStyle(StakColors.textPrimary)
					Text(ticker)
						.font(StakFont.geist(12 * u))
						.foregroundStyle(News.muted)
				}
				Spacer()
				HStack(spacing: 5 * u) {
					Text("Daily")
						.font(StakFont.geist(8 * u, .medium))
						.tracking(0.4 * u)
						.foregroundStyle(StakColors.textPrimary)
					Image("IcDailyChevron")
						.resizable()
						.frame(width: 6.53 * u, height: 3.56 * u)
				}
				.padding(.horizontal, 10 * u)
				.padding(.vertical, 4 * u)
				.background(Color(argb: 0x403E4958), in: RoundedRectangle(cornerRadius: 6 * u))
			}
			HStack(alignment: .bottom) {
				VStack(alignment: .leading, spacing: 3 * u) {
					Text(facts.price)
						.font(StakFont.sora(26 * u, .semiBold))
						.foregroundStyle(StakColors.textPrimary)
					Text(facts.change)
						.font(StakFont.geist(13 * u, .medium))
						// The app's authored up/down pair (green here, the
						// My STAK / Simulate red for down moves).
						.foregroundStyle(facts.up ? News.green : Color(argb: 0xFFFF5A6A))
				}
				Spacer()
				// The chart must agree with the move (user, 2026-08-25:
				// "showing red then the graph is green") - the down variant
				// is the authored line flipped + recolored to the app red.
				Image(facts.up ? "NewsSparkline" : "NewsSparklineDown")
					.resizable()
					.frame(width: 110 * u, height: 40 * u)
			}
			if saved {
				NewsHairline()
				HStack {
					Text("View \(ticker) in My STAK")
						.font(StakFont.geist(13 * u, .medium))
						// 1:1359: the link reads #AEAEAE, not teal (Codex parity audit 2026-09-04).
						.foregroundStyle(Color(argb: 0xFFAEAEAE))
					Spacer()
					// The rotated chevron occupies its authored 3.75x6.875 box (1:1422), so its
					// visual edge meets the card's padding - exact-design audit 2026-09-04.
					Image("IcDailyChevron")
						.resizable()
						.frame(width: 6.875 * u, height: 3.75 * u)
						.rotationEffect(.degrees(-90))
						.frame(width: 3.75 * u, height: 6.875 * u)
				}
				// Authored CTA row carries a 2 vertical pad (1:1420) - exact-design audit 2026-09-04.
				.padding(.vertical, 2 * u)
			}
		}
		.frame(maxWidth: .infinity, alignment: .leading)
		.padding(.horizontal, 16 * u)
		.padding(.top, 16 * u)
		.padding(.bottom, 14 * u)
		.background(News.cardBg, in: RoundedRectangle(cornerRadius: 16 * u))
	}
}

/// "The gist" — sparkle header + three check bullets.
private struct GistCard: View {
	let bullets: [String]

	var body: some View {
		let u = figmaUnit
		VStack(alignment: .leading, spacing: 12 * u) {
			HStack(spacing: 8 * u) {
				Image("IcGistSparkle")
					.resizable()
					.frame(width: 18 * u, height: 18 * u)
				Text("The gist")
					.font(StakFont.sora(14 * u, .semiBold))
					.foregroundStyle(StakColors.textPrimary)
			}
			ForEach(bullets, id: \.self) { GistBullet(text: $0) }
		}
		.frame(maxWidth: .infinity, alignment: .leading)
		.padding(16 * u)
		.background(News.cardBg, in: RoundedRectangle(cornerRadius: 14 * u))
	}
}

private struct GistBullet: View {
	let text: String

	var body: some View {
		let u = figmaUnit
		HStack(alignment: .top, spacing: 10 * u) {
			Image("IcGistCheck")
				.resizable()
				.frame(width: 16 * u, height: 16 * u)
			Text(text)
				.font(StakFont.geist(13 * u))
				.stakLineHeight(19 * u, size: 13 * u, face: .geist)
				.foregroundStyle(News.body)
				.frame(maxWidth: .infinity, alignment: .leading)
		}
	}
}

private struct Paragraph: View {
	let text: String
	var size: CGFloat = 14
	var line: CGFloat = 23

	var body: some View {
		let u = figmaUnit
		Text(text)
			.font(StakFont.geist(size * u))
			.stakLineHeight(line * u, size: size * u, face: .geist)
			.foregroundStyle(News.body)
			.frame(maxWidth: .infinity, alignment: .leading)
	}
}

private struct PullQuote: View {
	let text: String

	var body: some View {
		let u = figmaUnit
		HStack(spacing: 14 * u) {
			RoundedRectangle(cornerRadius: 2 * u)
				.fill(News.teal)
				.frame(width: 3 * u)
			Text(text)
				.font(StakFont.sora(16 * u, .semiBold))
				.stakLineHeight(26 * u, size: 16 * u, face: .sora)
				.foregroundStyle(Color(argb: 0xFFD3D3DD))
				.frame(maxWidth: .infinity, alignment: .leading)
		}
		// IntrinsicSize.Min in Compose: the teal bar stretches to the
		// quote's own height, no further.
		.fixedSize(horizontal: false, vertical: true)
		.padding(.leading, 2 * u)
		.padding(.vertical, 6 * u)
	}
}

private struct NewToThisCard: View {
	let body_: String

	var body: some View {
		let u = figmaUnit
		VStack(alignment: .leading, spacing: 9 * u) {
			HStack(spacing: 8 * u) {
				Image("IcGistHelp")
					.resizable()
					.frame(width: 18 * u, height: 18 * u)
				Text("New to this?")
					.font(StakFont.sora(13 * u, .semiBold))
					.foregroundStyle(News.teal)
			}
			Text(body_)
				.font(StakFont.geist(13 * u))
				.stakLineHeight(20 * u, size: 13 * u, face: .geist)
				.foregroundStyle(News.body)
		}
		.frame(maxWidth: .infinity, alignment: .leading)
		.padding(16 * u)
		.background(News.cardBg, in: RoundedRectangle(cornerRadius: 14 * u))
	}
}

private struct SourceRow: View {
	var link: String? = nil
	@Environment(\.openURL) private var openURL

	var body: some View {
		let u = figmaUnit
		// The row - label and the external-link glyph - opens the story's source
		// (user, 2026-09-08: "take users where the news is gotten from").
		Button {
			if let link, let url = URL(string: link) { openURL(url) }
		} label: {
			HStack {
				Text("Source")
					.font(StakFont.sora(13 * u))
					.foregroundStyle(StakColors.textPrimary)
				Spacer()
				Image("IcNewsExternal")
					.resizable()
					.frame(width: 19 * u, height: 19 * u)
			}
			.frame(width: 81 * u)
		}
		.buttonStyle(.pressDim)
		.disabled(link == nil)
		.accessibilityLabel("Source")
		.accessibilityHint(link == nil ? "" : "Opens the story's source")
	}
}

private struct KeyStatsCard: View {
	let facts: NewsArticleFeed.StockFacts

	var body: some View {
		let u = figmaUnit
		VStack(alignment: .leading, spacing: 13 * u) {
			HStack(spacing: 8 * u) {
				Image("IcGistInfo")
					.resizable()
					.frame(width: 18 * u, height: 18 * u)
				Text("Key stats")
					.font(StakFont.sora(14 * u, .semiBold))
					.foregroundStyle(StakColors.textPrimary)
			}
			StatRow(l1: "Market cap", v1: facts.marketCap, l2: "P/E ratio", v2: facts.peRatio)
			StatRow(l1: "Day range", v1: facts.dayRange, l2: "Volume", v2: facts.volume)
			StatRow(l1: "52-wk range", v1: facts.week52, l2: "Div yield", v2: facts.divYield)
		}
		.frame(maxWidth: .infinity, alignment: .leading)
		.padding(16 * u)
		.background(News.cardBg, in: RoundedRectangle(cornerRadius: 14 * u))
	}
}

private struct StatRow: View {
	let l1: String
	let v1: String
	let l2: String
	let v2: String

	var body: some View {
		let u = figmaUnit
		HStack(alignment: .top, spacing: 14 * u) {
			StatCell(label: l1, value: v1)
				.frame(width: 212 * u, alignment: .leading)
			StatCell(label: l2, value: v2)
		}
	}
}

private struct StatCell: View {
	let label: String
	let value: String

	var body: some View {
		let u = figmaUnit
		VStack(alignment: .leading, spacing: 3 * u) {
			Text(label)
				.font(StakFont.geist(11 * u))
				.foregroundStyle(News.faint)
			Text(value)
				.font(StakFont.sora(13 * u, .semiBold))
				.foregroundStyle(StakColors.textPrimary)
		}
	}
}

/// rgba(105,179,202,0.1) r12 tag chip.
private struct ArticleTag: View {
	let text: String

	var body: some View {
		let u = figmaUnit
		Text(text)
			.font(StakFont.geist(11 * u, .medium))
			.foregroundStyle(News.muted)
			.padding(.horizontal, 11 * u)
			.padding(.vertical, 5 * u)
			.background(Color(argb: 0x1A69B3CA), in: RoundedRectangle(cornerRadius: 12 * u))
	}
}

/// READ NEXT - the authored sample repeats the Tesla row twice as its
/// placeholder; the served rows are two other stories, and each opens
/// its own article (user, 2026-08-25).
private struct ReadNext: View {
	let currentId: String
	let onOpen: (String) -> Void

	var body: some View {
		let u = figmaUnit
		VStack(alignment: .leading, spacing: 10 * u) {
			Text("READ NEXT")
				.font(StakFont.geist(10 * u, .medium))
				.tracking(0.5 * u)
				.foregroundStyle(News.muted)
			ForEach(NewsArticleFeed.readNext(excluding: currentId), id: \.id) { next in
				Button {
					onOpen(next.id)
				} label: {
					HStack(spacing: 12 * u) {
						if let thumb = next.thumb {
							Image(thumb)
								.resizable()
								.scaledToFill()
								.frame(width: 60 * u, height: 60 * u)
								.clipShape(RoundedRectangle(cornerRadius: 10 * u))
						}
						VStack(alignment: .leading, spacing: 5 * u) {
							Text("\(next.source) · \(next.age)")
								.font(StakFont.geist(11 * u))
								.foregroundStyle(News.muted)
							Text(next.headline)
								.font(StakFont.sora(14 * u))
								.stakLineHeight(19 * u, size: 14 * u, face: .sora)
								.foregroundStyle(StakColors.textPrimary)
						}
						.frame(maxWidth: .infinity, alignment: .leading)
					}
					.padding(12 * u)
					// Authored Read-next cards are 84 tall (1:1495) - pinned (mirrors Android, 2026-09-05).
					.frame(height: 84 * u)
					.background(News.cardBg, in: RoundedRectangle(cornerRadius: 14 * u))
				}
				.buttonStyle(.pressDim)
			}
		}
		.padding(.top, 6 * u)
	}
}

/// Save success — rgba(12,19,32,0.55) scrim + the r24 #181f30 bottom
/// sheet (101:1169). The stock row shows the SAVED stock's served facts
/// (user, 2026-08-25: every article = the full Apple page with the
/// story's own content; the frame's Apple row was placeholder).
private struct SaveSuccessOverlay: View {
	let facts: NewsArticleFeed.StockFacts
	let onViewInMyStak: () -> Void
	let onDismiss: () -> Void

	var body: some View {
		let u = figmaUnit
		ZStack(alignment: .bottom) {
			// Authored scrim rgba(12,19,32,0.55) (101:1168); it has NO
			// prototype connection - tapping it does not dismiss.
			Color(argb: 0x8C0C1320)
				.ignoresSafeArea()
			VStack(spacing: 14 * u) {
				RoundedRectangle(cornerRadius: 2 * u)
					.fill(News.divider)
					.frame(width: 40 * u, height: 4 * u)
					.padding(.bottom, 4 * u)
				VStack(spacing: 14 * u) {
					Image("IcSheetCheck")
						.resizable()
						.frame(width: 47 * u, height: 47 * u)
					Text("Saved to My STAK")
						.font(StakFont.sora(18 * u, .semiBold))
						.foregroundStyle(StakColors.textPrimary)
				}
				HStack(spacing: 11 * u) {
					ZStack {
						Circle().fill(News.chipBg)
						Text(String(facts.shortName.prefix(1)))
							.font(StakFont.sora(15 * u, .semiBold))
							.foregroundStyle(Color(argb: 0xFF9EADC7))
					}
					.frame(width: 38 * u, height: 38 * u)
					VStack(alignment: .leading, spacing: 2 * u) {
						Text(facts.shortName)
							.font(StakFont.geist(13 * u, .medium))
							.foregroundStyle(StakColors.textPrimary)
						Text("\(facts.price) today")
							.font(StakFont.geist(10 * u))
							.foregroundStyle(News.muted)
					}
					.frame(maxWidth: .infinity, alignment: .leading)
					// "+4.84% today" -> "▲ 4.84%" (the sheet's authored format).
					Text("\(facts.up ? "▲" : "▼") \(String(facts.change.dropFirst()).replacingOccurrences(of: " today", with: ""))")
						.font(StakFont.geist(12 * u, .medium))
						.foregroundStyle(facts.up ? News.green : Color(argb: 0xFFFF5A6A))
				}
				.padding(.horizontal, 14 * u)
				.padding(.vertical, 12 * u)
				.background(Color(argb: 0x1A69B3CA), in: RoundedRectangle(cornerRadius: 6 * u))
				Text("Watching from today · no money committed")
					.font(StakFont.geist(12 * u))
					.stakLineHeight(18 * u, size: 12 * u, face: .geist)
					.foregroundStyle(News.body)
					.frame(maxWidth: .infinity, alignment: .leading)
				VStack(spacing: 16 * u) {
					Button(action: onViewInMyStak) {
						Text("View in My STAK")
							.font(StakFont.geist(14 * u, .medium))
							.foregroundStyle(StakColors.textPrimary)
							.frame(maxWidth: .infinity)
							.frame(height: 52 * u)
							.background(ctaGradient, in: RoundedRectangle(cornerRadius: 6 * u))
							.overlay(
								RoundedRectangle(cornerRadius: 6 * u)
									.strokeBorder(ctaBorder, lineWidth: 0.36 * u)
							)
					}
					.buttonStyle(.pressDim)
					Button(action: onDismiss) {
						Text("Back")
							.font(StakFont.sora(14 * u))
							.foregroundStyle(News.muted)
							.frame(maxWidth: .infinity)
							.frame(height: 52 * u)
							.overlay(
								RoundedRectangle(cornerRadius: 6 * u)
									.strokeBorder(Color(argb: 0x54343B4F), lineWidth: 0.36 * u)
							)
							.contentShape(Rectangle())
					}
					.buttonStyle(.pressDim)
				}
			}
			.padding(.horizontal, 20 * u)
			.padding(.top, 10 * u)
			// Authored sheet is 388 tall - its 30 bottom pad INCLUDES the
			// home-indicator zone (101:1169), so the content ignores the
			// bottom safe area and pads to the physical screen bottom.
			.padding(.bottom, 30 * u)
			.frame(maxWidth: .infinity)
			.background {
				UnevenRoundedRectangle(topLeadingRadius: 24 * u, bottomLeadingRadius: 0, bottomTrailingRadius: 0, topTrailingRadius: 24 * u, style: .circular)
					.fill(News.cardBg)
			}
			.ignoresSafeArea(edges: .bottom)
		}
	}
}

/// Plays the served video inside the hero box: YouTube links through the
/// embeddable player (WKWebView), any other link through AVKit. Both
/// autoplay once the user tapped the play glyph.
private struct NewsVideoPlayer: View {
	let url: String
	/// A player created (and buffering) before the play tap - cinema-fast start.
	var prebuffered: AVPlayer? = nil
	var onBegan: () -> Void = {}
	var onDone: () -> Void = {}

	var body: some View {
		if let embed = NewsMedia.youTubeEmbedURL(for: url) {
			// The poster lifts once the embed has loaded (Codex review, PR #167).
			YouTubeEmbedView(url: embed, onLoaded: onBegan)
		} else if let direct = URL(string: url) {
			AutoplayVideoPlayer(url: direct, prebuffered: prebuffered, onBegan: onBegan, onDone: onDone)
		}
	}
}

private struct AutoplayVideoPlayer: View {
	let url: URL
	var prebuffered: AVPlayer? = nil
	var onBegan: () -> Void = {}
	var onDone: () -> Void = {}
	@State private var player: AVPlayer? = nil
	/// The native chrome's fullscreen presentation is up (reported by
	/// NativePlayerView's delegate). An end-of-clip that lands while it is
	/// up parks in `donePending` until AVKit's dismissal has completed.
	@State private var inFullScreen = false
	@State private var donePending = false

	var body: some View {
		// Native player chrome (user, 2026-08-31, video_app reference) in
		// place of SwiftUI's bare VideoPlayer - see NativePlayerView.
		NativePlayerView(player: player, onFullScreenChange: { full in
			inFullScreen = full
			if !full, donePending {
				donePending = false
				onDone()
			}
		})
			.onAppear {
				// Audible even with the silent switch on (user, 2026-08-30
				// "no audio?"): playback category routes through the media channel.
				try? AVAudioSession.sharedInstance().setCategory(.playback, mode: .moviePlayback)
				try? AVAudioSession.sharedInstance().setActive(true)
				// Cinema-fast start (user, 2026-08-30): reuse the player that
				// began buffering when the article opened.
				let p = prebuffered ?? AVPlayer(url: url)
				// Deep buffer so playback never stall-cycles (user, 2026-08-30).
				p.currentItem?.preferredForwardBufferDuration = 30
				// Exactly 1x (user, 2026-08-26: "put it on 1x speed" - not
				// sluggish, not fast). defaultRate is the rate play() restores
				// AND what the native "Playback Speed" menu shows as selected,
				// so the menu opens on Normal. Clip SOURCES must also be
				// real-time footage; see NewsArticleFeed's media notes.
				p.defaultRate = 1.0
				player = p
				p.play()
			}
			// The poster in the hero holds until playback actually runs.
			.onReceive(player?.publisher(for: \.timeControlStatus).eraseToAnyPublisher() ?? Just(AVPlayer.TimeControlStatus.paused).eraseToAnyPublisher()) { status in
				if status == .playing { onBegan() }
			}
			.onDisappear { player?.pause() }
			// A finished or failed clip returns the hero to its poster +
			// play glyph (user, 2026-08-26: "i cant see the play icon").
			// Scoped to THIS player's item so no other clip's end resets the hero.
			.onReceive(NotificationCenter.default.publisher(for: .AVPlayerItemDidPlayToEndTime, object: player?.currentItem)) { _ in clipEnded() }
			.onReceive(NotificationCenter.default.publisher(for: .AVPlayerItemFailedToPlayToEndTime, object: player?.currentItem)) { _ in clipEnded() }
			// FailedToPlayToEndTime covers MID-STREAM failures only. An item that
			// fails to LOAD (404, expired CDN link, offline) posts nothing - just
			// its status flips - so watch that too, or the poster would hold
			// forever with the chips hidden.
			.onReceive(player?.currentItem?.publisher(for: \.status).eraseToAnyPublisher() ?? Just(AVPlayerItem.Status.unknown).eraseToAnyPublisher()) { status in
				if status == .failed { clipEnded() }
			}
	}

	/// exitsFullScreenWhenPlaybackEnds and the receivers above fire off the
	/// same end-of-clip notification, so a clip that ends in fullscreen defers
	/// onDone until the fullscreen dismissal completes (via onFullScreenChange)
	/// - tearing the embedded controller down mid-transition could strand
	/// the presentation.
	private func clipEnded() {
		if inFullScreen { donePending = true } else { onDone() }
	}
}

/// The reference player (user, 2026-08-31, video_app reference - the Chelsea
/// FC app's player): AVPlayerViewController's own inline chrome supplies the
/// centre play/pause with a skip button either side (the system's 10s, the
/// same interval its PiP window shows), the scrubber with elapsed/total
/// time, the subtitles/audio button whenever the asset carries tracks,
/// fullscreen, the "..." menu (Playback Speed, AirPlay) and true system
/// picture-in-picture: the clip floats in its own window with mini controls
/// while the hero shows the system's "This video is playing in picture in
/// picture" placeholder. Its colours, fonts and skip interval are the
/// system's - not restylable to teal/Geist. Chromecast is not a system
/// control on iOS, so it is not offered.
///
/// PiP requires Info.plist UIBackgroundModes = ["audio"] (present in
/// StakDemo/Info.plist) plus the .playback audio session that
/// AutoplayVideoPlayer sets before play.
private struct NativePlayerView: UIViewControllerRepresentable {
	var player: AVPlayer? = nil
	/// true when the native chrome's fullscreen presentation begins, false
	/// once its dismissal has COMPLETED (a cancelled interactive dismissal
	/// keeps it true). AutoplayVideoPlayer gates its end-of-clip teardown on it.
	var onFullScreenChange: (Bool) -> Void = { _ in }

	/// AVPlayerViewControllerDelegate: tracks the fullscreen presentation for
	/// `onFullScreenChange`, and answers the PiP window's restore button - the
	/// hero never leaves the hierarchy while its player is attached (see
	/// dismantleUIViewController), so there is nothing to re-present.
	final class Coordinator: NSObject, AVPlayerViewControllerDelegate {
		var onFullScreenChange: (Bool) -> Void = { _ in }

		func playerViewController(_ playerViewController: AVPlayerViewController, willBeginFullScreenPresentationWithAnimationCoordinator coordinator: UIViewControllerTransitionCoordinator) {
			onFullScreenChange(true)
			// Netflix-style fullscreen (user, 2026-09-05; mirrors Android): the
			// clip sits letterboxed at its own aspect ratio - the inline hero's
			// crop-fill is for the 350x208 box - and the scene follows the
			// phone: upright stays upright, a sideways tilt gives landscape
			// (user's screenshot: no forced turn).
			OrientationLock.shared.allowLandscape(true)
			playerViewController.videoGravity = .resizeAspect
			coordinator.animate(alongsideTransition: nil) { [weak self] context in
				if context.isCancelled {
					self?.onFullScreenChange(false)
					OrientationLock.shared.allowLandscape(false)
					playerViewController.videoGravity = .resizeAspectFill
				}
			}
		}

		func playerViewController(_ playerViewController: AVPlayerViewController, willEndFullScreenPresentationWithAnimationCoordinator coordinator: UIViewControllerTransitionCoordinator) {
			// Portrait FIRST, so the article underneath never shows in landscape
			// (its 390-wide artboard scaling is portrait-only).
			OrientationLock.shared.allowLandscape(false)
			// Reported once the dismissal has actually completed, so a pending
			// end-of-clip tears the player down onto a hero that is back inline.
			coordinator.animate(alongsideTransition: nil) { [weak self] context in
				if context.isCancelled {
					OrientationLock.shared.allowLandscape(true)
				} else {
					self?.onFullScreenChange(false)
					playerViewController.videoGravity = .resizeAspectFill
				}
			}
		}

		func playerViewController(_ playerViewController: AVPlayerViewController, restoreUserInterfaceForPictureInPictureStopWithCompletionHandler completionHandler: @escaping (Bool) -> Void) {
			completionHandler(true)
		}
	}

	func makeCoordinator() -> Coordinator { Coordinator() }

	func makeUIViewController(context: Context) -> AVPlayerViewController {
		let vc = AVPlayerViewController()
		context.coordinator.onFullScreenChange = onFullScreenChange
		vc.delegate = context.coordinator
		vc.player = player
		// The clip fills the 350x208 hero at its own aspect ratio, cropped like
		// the frame's hero image (fullscreen switches to letterboxed fit).
		vc.videoGravity = .resizeAspectFill
		// System PiP exactly like the reference: the clip floats in its own
		// window while the article stays scrollable underneath, and
		// backgrounding the app mid-clip pops it out automatically.
		vc.allowsPictureInPicturePlayback = true
		vc.canStartPictureInPictureAutomaticallyFromInline = true
		// A clip that ends in fullscreen drops back inline first: AVKit
		// dismisses the presentation, and AutoplayVideoPlayer holds the hero's
		// return to poster + glyph until that dismissal has completed (its
		// clipEnded / onFullScreenChange pairing).
		vc.exitsFullScreenWhenPlaybackEnds = true
		vc.updatesNowPlayingInfoCenter = false
		// "Playback Rates · Normal": the system's speed set, with the 1x entry
		// named "Normal" like the reference. The selected entry mirrors
		// AVPlayer.defaultRate, pinned to 1.0 in AutoplayVideoPlayer.
		vc.speeds = AVPlaybackSpeed.systemDefaultSpeeds.map { speed in
			speed.rate == 1.0 ? AVPlaybackSpeed(rate: 1.0, localizedName: "Normal") : speed
		}
		return vc
	}

	func updateUIViewController(_ vc: AVPlayerViewController, context: Context) {
		context.coordinator.onFullScreenChange = onFullScreenChange
		// Only the player identity is synced - the controller is never
		// rebuilt, so the native chrome's play/pause, seek, speed and PiP
		// state survive unrelated SwiftUI re-renders.
		if vc.player !== player { vc.player = player }
	}

	static func dismantleUIViewController(_ vc: AVPlayerViewController, coordinator: Coordinator) {
		// Detaching the player ends any PiP window and releases the surface
		// when SwiftUI drops the view (article popped mid-PiP, clip ended in
		// PiP): no ownerless PiP window outliving its delegate, no second
		// controller attaching to the same AVPlayer on the next play tap. The
		// hero returns to poster + glyph exactly like android's HeroPlayer.stop().
		vc.player = nil
	}
}

private struct YouTubeEmbedView: UIViewRepresentable {
	let url: URL
	/// Fires once the embed page has loaded - the hero drops its poster overlay then.
	var onLoaded: () -> Void = {}

	func makeCoordinator() -> Coordinator { Coordinator(onLoaded: onLoaded) }

	final class Coordinator: NSObject, WKNavigationDelegate {
		let onLoaded: () -> Void
		init(onLoaded: @escaping () -> Void) { self.onLoaded = onLoaded }
		func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) { onLoaded() }
	}

	func makeUIView(context: Context) -> WKWebView {
		let config = WKWebViewConfiguration()
		config.allowsInlineMediaPlayback = true
		config.mediaTypesRequiringUserActionForPlayback = []
		let view = WKWebView(frame: .zero, configuration: config)
		view.navigationDelegate = context.coordinator
		view.isOpaque = false
		view.scrollView.isScrollEnabled = false
		// YouTube's player refuses embeds with no HTTP Referer - a bare
		// URLRequest load dies with "configuration error 153" (user,
		// 2026-08-25; reproduced + fix verified in the browser). The
		// iframe wrapper + base URL presents an embedding origin.
		let html = """
		<!doctype html><html><head>
		<meta name="viewport" content="width=device-width, initial-scale=1">
		<style>html,body{margin:0;padding:0;background:#000;height:100%;overflow:hidden}iframe{position:absolute;top:0;left:0;width:100%;height:100%;border:0}</style>
		</head><body>
		<iframe src="\(url.absoluteString)" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>
		</body></html>
		"""
		view.loadHTMLString(html, baseURL: URL(string: "https://stak.app"))
		return view
	}

	func updateUIView(_ uiView: WKWebView, context: Context) {}
}
