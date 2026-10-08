import SwiftUI

/// Discover · Stock Detail (CHINEDU 1:2382 folded / 1:2579 open, save success 92:969; My STAK entry 16:1012) - a port
/// of android ui/discover/StockDetailScreen.kt. A real account's page is this stock's live data (StockDetailViewModel):
/// the company row, price and chart with its range pills, Since you saved (My STAK entry), the Risk snapshot and What
/// to watch next, News signal, Numbers that matter, the Analyst view and Compare and learn, a related lesson, Ask STAK
/// AI and the save / practice actions. The demo account keeps the authored frames (DetailFacts). Every authored metric
/// is multiplied by `figmaUnit` (390px artboard).
private let card = Color(argb: 0xFF181F30)
private let bright = Color(argb: 0xFFF2F6FC)
private let muted = Color(argb: 0xFF819ABB)
private let green = Color(argb: 0xFF2FD08A)
/// Down moves: the same red the Simulate rows use, keyed on the ▼ glyph.
private let red = Color(argb: 0xFFFF5A6A)
private let teal = Color(argb: 0xFF69B3CA)
private let iconTint = Color(argb: 0xFFA6E4F7)

/// Ratings that read as bullish in Recent actions.
private let bullishActions: Set<String> = ["Buy", "Strong Buy", "Outperform", "Overweight", "Market Outperform"]

struct StockDetailView: View {
	let onBack: () -> Void
	var fromMyStak: Bool = false
	/// The stock the page serves - deck taps route their card here (user, 2026-09-01: NVIDIA opens NVIDIA, not AAPL).
	var symbol: String = "AAPL"
	/// The updates My STAK already holds, narrowed to this company - the same detection, no second request.
	@ObservedObject var myStakVM: MyStakViewModel
	/// Authored exits raised to the shell (nil keeps the local fallback): success "View in My STAK" (92:969 / 71:949),
	/// "Keep exploring" (deck dissolve 300), the Discover entry's "Practice buy" (1:2382, to the Simulate tab) and the
	/// open state's tab-bar SWAPs (1:2579).
	var onViewInMyStak: (() -> Void)? = nil
	var onKeepExploring: (() -> Void)? = nil
	var onPracticeBuyToSimulate: (() -> Void)? = nil
	/// The My STAK entry's "Practice with ... · paper money": Simulate, with this company ready to buy.
	var onPracticeInSimulate: (() -> Void)? = nil
	var onTab: ((MainTab) -> Void)? = nil
	/// STAK AI with this stock as its context (nil hides the card).
	var onOpenAi: (() -> Void)? = nil
	/// The top of the shell's stack: covered by another page (STAK AI, say), the price stops refreshing.
	var isTop: Bool = true

	@StateObject private var vm = StockDetailViewModel()
	@ObservedObject private var session = Session.shared
	@ObservedObject private var holdings = MyStakHoldings.shared
	@ObservedObject private var brandNames = BrandNames.shared
	@Environment(\.scenePhase) private var scenePhase
	@State private var saved: Bool
	@State private var showSuccess = false
	@State private var showBuy = false
	/// Hoisted from AnalystCard - drives the 1:2579 tab bar and the fold back to 16:1012 when the buy receipt's Done fires.
	@State private var analystOpen = false
	/// The range pills select. Today first for a real account (user, 2026-09-17): a page opened to see what a stock did
	/// today shouldn't answer with three months. The demo keeps "3M", the range its authored line draws.
	@State private var range: String
	/// Shown when Save is refused because the Stak is full; clears on its own after 3 seconds.
	@State private var stakFullShownAt: Date? = nil
	/// Which of this company's changes were unread when the page opened: marking them read here would otherwise flip
	/// the dots in front of the reader.
	@State private var unreadOnEntry: Set<Int64>? = nil

	@MainActor init(
		onBack: @escaping () -> Void,
		fromMyStak: Bool = false,
		symbol: String = "AAPL",
		myStakVM: MyStakViewModel,
		onViewInMyStak: (() -> Void)? = nil,
		onKeepExploring: (() -> Void)? = nil,
		onPracticeBuyToSimulate: (() -> Void)? = nil,
		onPracticeInSimulate: (() -> Void)? = nil,
		onTab: ((MainTab) -> Void)? = nil,
		onOpenAi: (() -> Void)? = nil,
		isTop: Bool = true
	) {
		self.onBack = onBack
		self.fromMyStak = fromMyStak
		self.symbol = symbol
		self.myStakVM = myStakVM
		self.onViewInMyStak = onViewInMyStak
		self.onKeepExploring = onKeepExploring
		self.onPracticeBuyToSimulate = onPracticeBuyToSimulate
		self.onPracticeInSimulate = onPracticeInSimulate
		self.onTab = onTab
		self.onOpenAi = onOpenAi
		self.isTop = isTop
		// The Discover entry follows THIS RUN's saves, like the deck's Save chip (1:2382/1:2579 author "Unsaved" for a
		// stock My STAK already lists); the My STAK entry opens saved. Mirrors android.
		// A real account's earlier saves count too: the Saved chip reads the holdings, and a Save button beside it
		// re-saved a stock already kept. (The demo's seeded holdings keep the authored "Unsaved" frames.)
		let held = !Session.shared.demoAccount && MyStakHoldings.shared.tickers.contains(symbol.uppercased())
		self._saved = State(initialValue: fromMyStak || held || DeckSession.shared.saved.contains(symbol))
		self._range = State(initialValue: Session.shared.demoAccount ? "3M" : "1D")
	}

	var body: some View {
		let u = figmaUnit
		let demo = session.demoAccount
		// A real account never borrows authored facts - not even before its own data lands: they flashed another
		// company's numbers under this stock's name (user, 2026-09-15). The demo keeps its authored frames.
		let f = demo ? detailFactsFor(symbol) : emptyFacts(symbol)
		let live = vm.liveDetail
		let changes = myStakVM.updates.filter { $0.ticker.caseInsensitiveCompare(symbol) == .orderedSame }
		// Authored (1:2579): ONLY the Discover-entry open state composes the shell tab bar.
		let showsBar = !fromMyStak && analystOpen && onTab != nil
		ZStack {
			VStack(spacing: 0) {
				HStack {
					AuthBackCircle(action: onBack)
					Spacer()
					Text(symbol)
						.font(StakFont.sora(16 * u, .semiBold))
						.foregroundStyle(Color.white)
						.accessibilityAddTraits(.isHeader)
					Spacer()
					// The share control did nothing - removed until there's something to share to; this keeps the title
					// centred against the back circle.
					Color.clear.frame(width: 40 * u, height: 40 * u)
				}
				.padding(.horizontal, 18 * u)
				.padding(.vertical, 8 * u)

				ScrollView {
					VStack(spacing: 0) {
						if !demo { companyRow(u: u, live: live) }
						priceBlock(u: u, f: f, live: live, demo: demo)
						chart(u: u, demo: demo)
						Spacer().frame(height: 40 * u)
						RangePills(selected: $range, tint: teal, muted: muted)
						VStack(spacing: 14 * u) {
							// My STAK product spec (Sept 2026), V1 hierarchy: price and chart, then Since you saved, the
							// company's own risks, the checkpoints ahead, and only then the evidence.
							if fromMyStak {
								SinceYouSavedCard(
									f: f, symbol: symbol, live: live, reference: vm.savedReference,
									referenceSettled: vm.savedReferenceSettled, detailSettled: vm.detailSettled,
									changes: changes, unreadOnEntry: unreadOnEntry ?? []
								)
							}
							if demo {
								RiskFitCard(f: f, live: live)
							} else {
								RiskSnapshotCard(riskWatch: vm.riskWatch, failed: vm.riskWatchFailed)
								WhatToWatchCard(riskWatch: vm.riskWatch, failed: vm.riskWatchFailed)
							}
							NewsSignalCard(f: f, live: live)
							NumbersCard(f: f, live: live)
							AnalystCard(f: f, live: live, open: $analystOpen)
							CompareCard(f: f, live: live, symbol: symbol)
							// Related lesson (FigJam Discover board, 2026-09-14) - the sector's plain-English read.
							LessonCard(lesson: StockLessons.lessonFor(f.symbol))
						}
						.padding(.horizontal, 20 * u)
						.padding(.vertical, 12 * u)
						actions(u: u, f: f, live: live, demo: demo)
					}
				}
				.scrollIndicators(.hidden)
				if showsBar {
					// Authored (1:2579): the 86-tall shell bar, fixed at the bottom; its taps pop the detail and land
					// on the tapped tab.
					MainTabBar(selected: Binding<MainTab>(get: { .discover }, set: { tapped in onTab?(tapped) }))
				}
			}
			.ignoresSafeArea(edges: showsBar ? .bottom : [])
			if showSuccess {
				DetailSavedSheet(
					f: f, symbol: symbol, live: live,
					// The scrim dismiss saves like the two CTAs do - dismissing without either must not drop the save.
					onDismiss: { showSuccess = false; save() },
					// Authored (92:969): View in My STAK -> Overview, the forward push; Keep exploring -> deck,
					// dissolve 300. add() is the authority: a refused save mustn't leave the page believing it's kept.
					onViewInMyStak: {
						save()
						if let onViewInMyStak { onViewInMyStak() } else { showSuccess = false }
					},
					onKeepExploring: {
						save()
						if let onKeepExploring { onKeepExploring() } else { showSuccess = false }
					}
				)
				// Authored entry (SMART_ANIMATE 350): 0.92 -> 1 + fade, 350 ease-out.
				.transition(.asymmetric(insertion: .scale(scale: 0.92).combined(with: .opacity), removal: .opacity))
			}
			if showBuy {
				DiscoverBuyFlow(
					// The demo's own ticket until a live price exists (a stock without an authored one read "$0.00").
					spec: live == nil && demo ? f.buySpec : liveBuySpec(symbol, live: live, f: f),
					onClose: { withAnimation(.easeOut(duration: 0.3)) { showBuy = false } },
					filledSecondary: "Done", ticketSecondary: "Back",
					// Authored (71:949 / 71:994): View in My STAK -> Overview, the forward push.
					onFilledPrimary: {
						if let onViewInMyStak { onViewInMyStak() } else { withAnimation(.easeOut(duration: 0.3)) { showBuy = false } }
					},
					// Authored: Done -> the FOLDED detail (16:1012) - the sheet fades 300 and Analyst folds.
					onFilledSecondary: {
						analystOpen = false
						withAnimation(.easeOut(duration: 0.3)) { showBuy = false }
					},
					// Authored (1:3423): the ticket's secondary -> detail, DISSOLVE 300.
					onTicketSecondary: { withAnimation(.easeOut(duration: 0.3)) { showBuy = false } }
				)
				.transition(.opacity)
			}
		}
		.background(StakColors.bg.ignoresSafeArea())
		.task(id: symbol) {
			vm.fetch(symbol, needsReference: fromMyStak)
			// The header's logo and the stock card names: the brand list Discover loads, fetched here if it hasn't.
			await brandNames.ensure()
		}
		// Each pill draws that range's own closes; the demo keeps its authored line.
		.task(id: "\(symbol):\(range)") { if !session.demoAccount { vm.selectRange(symbol, range) } }
		// The price keeps moving while the page is in front: every 15 seconds - not while another page covers it or the
		// app is in the background, and the wait restarts on returning (Android RefreshWhileVisible, no tick on resume).
		.task(id: "\(symbol):\(isTop):\(scenePhase == .active)") {
			guard !session.demoAccount, isTop, scenePhase == .active else { return }
			while true {
				do { try await Task.sleep(nanoseconds: livePriceInterval) } catch { return }
				vm.refreshQuote(symbol, range: range)
			}
		}
		.onDisappear { vm.stop() }
		// The saved sheet and the ticket hold the page: swiping back past them would drop a save (Android's Back
		// closes the sheet first).
		.preference(key: PageOverlayOpenKey.self, value: showSuccess || showBuy)
		// Read state as it was on arrival, taken when the changes actually arrive (keyed on the symbol alone it caught
		// a cold start's empty list); then marked read, once they're on screen.
		.onChange(of: changes.map(\.id), initial: true) { _, ids in
			guard unreadOnEntry == nil, !ids.isEmpty else { return }
			unreadOnEntry = Set(changes.filter { !$0.read }.map(\.id))
			if fromMyStak { myStakVM.markCompanyRead(symbol) }
		}
		.task(id: stakFullShownAt) {
			guard stakFullShownAt != nil else { return }
			try? await Task.sleep(nanoseconds: 3_000_000_000)
			guard !Task.isCancelled else { return }
			stakFullShownAt = nil
		}
	}

	// MARK: - Top of the page

	/// The company the way the design concept introduces it: its mark, its name, the ticker and STAK's category for
	/// it - and whether it's in the reader's STAK.
	private func companyRow(u: CGFloat, live: LiveDetail?) -> some View {
		HStack(spacing: 12 * u) {
			ZStack {
				RoundedRectangle(cornerRadius: 12 * u).fill(Color(argb: 0xFF242B3D))
				if let logo = brandNames.logoByTicker[symbol.uppercased()], let url = URL(string: logo) {
					AsyncImage(url: url) { $0.resizable().scaledToFit() } placeholder: { Color.clear }
						.frame(width: 30 * u, height: 30 * u)
				} else {
					Text(String((live?.name ?? symbol).prefix(1)).uppercased())
						.font(StakFont.sora(18 * u, .semiBold))
						.foregroundStyle(muted)
				}
			}
			.frame(width: 44 * u, height: 44 * u)
			.accessibilityHidden(true)
			VStack(alignment: .leading, spacing: 2 * u) {
				Text(live?.name ?? symbol)
					.font(StakFont.sora(20 * u, .semiBold))
					.foregroundStyle(Color.white)
					.lineLimit(1)
				// The category the deck ranked this save on - STAK's own grouping, so it says so rather than passing
				// for the company's industry.
				Text(holdings.categoryOf(symbol).map { "\(symbol) · in your \(categoryName($0))" } ?? symbol)
					.font(StakFont.geist(11 * u))
					.foregroundStyle(muted)
			}
			.frame(maxWidth: .infinity, alignment: .leading)
			if saved || holdings.tickers.contains(symbol.uppercased()) {
				HStack(spacing: 5 * u) {
					Image("IcSavedBookmark").resizable().frame(width: 10 * u, height: 10 * u)
					Text("Saved")
						.font(StakFont.geist(11 * u, .medium))
						.foregroundStyle(iconTint)
				}
				.padding(.horizontal, 10 * u)
				.padding(.vertical, 5 * u)
				.background(Color(argb: 0x1F5DA8BF), in: Capsule())
			}
		}
		.padding(.horizontal, 20 * u)
		.padding(.top, 6 * u)
		.accessibilityElement(children: .combine)
	}

	private func priceBlock(u: CGFloat, f: DetailFacts, live: LiveDetail?, demo: Bool) -> some View {
		let price = live?.price ?? f.price
		// The figure follows the selected pill: a red line for the year above a green "today" was two periods
		// stacked with nothing to tell them apart.
		let change: String = {
			if range != "1D", let pct = vm.chartPct { return rangeChangeText(pct, range) }
			return StakClock.sessionChange(live?.change ?? f.change)
		}()
		// When the price was fetched: a page opened from the cache looks just like a live one until the new figures land.
		let asOf: String? = {
			if demo { return nil }
			if vm.quotePending && live != nil { return "Updating\u{2026}" }
			guard let at = vm.priceAt else { return nil }
			let text = StakClock.pricesAsOf(at)
			return text.prefix(1).uppercased() + text.dropFirst()
		}()
		let caption = demo ? (live?.name.map { "\(symbol) · \($0)" } ?? f.title) : (asOf ?? "")
		return VStack(alignment: .leading, spacing: 4 * u) {
			// A blank line still takes its line, so the price doesn't jump as the caption arrives or changes.
			Text(caption.isEmpty ? " " : caption)
				.font(StakFont.geist(11 * u))
				.foregroundStyle(muted)
				.lineLimit(1)
			Text(price)
				.font(StakFont.sora(26 * u, .semiBold))
				.foregroundStyle(bright)
			Text(change.isEmpty ? " " : change)
				.font(StakFont.geist(12 * u, .medium))
				.foregroundStyle(change.hasPrefix("▼") ? red : green)
		}
		.frame(maxWidth: .infinity, alignment: .leading)
		.padding(.horizontal, 20 * u)
		.padding(.top, 10 * u)
		.padding(.bottom, 6 * u)
		.accessibilityElement(children: .ignore)
		.accessibilityLabel([caption, price == "—" ? "Price loading" : price, spokenMove(change)].filter { !$0.isEmpty }.joined(separator: ", "))
	}

	@ViewBuilder
	private func chart(u: CGFloat, demo: Bool) -> some View {
		if demo {
			RangeLineChart(range: range, tint: teal, authored: "SdChartLine", width: 345 * u, height: 76 * u)
		} else if let series = vm.chartSeries {
			// The line's color is the range's verdict: green where it ends above where it started, red below.
			SeriesLine(series: series, tint: (vm.chartPct ?? 0) < 0 ? red : green)
				.frame(width: 345 * u, height: 76 * u)
				.accessibilityLabel("Price chart, " + (vm.chartPct.map { spokenMove(rangeChangeText($0, range)) } ?? rangeSpoken[range, default: range]))
		} else {
			// This stock's own closes; a range with no prices draws nothing - an invented shape would read as history.
			ZStack {
				if vm.chartNoMovementYet {
					Text("Not much movement yet today").font(StakFont.geist(11 * u)).foregroundStyle(muted)
				} else if vm.chartMissing {
					Text("No price history for this range").font(StakFont.geist(11 * u)).foregroundStyle(muted)
				}
			}
			.frame(width: 345 * u, height: 76 * u)
		}
	}

	// MARK: - Actions

	private func actions(u: CGFloat, f: DetailFacts, live: LiveDetail?, demo: Bool) -> some View {
		// No price yet, no ticket: it would open priced "$0.00".
		let priceReady = demo || (live.map { $0.price != "—" } ?? false)
		return VStack(spacing: 10 * u) {
			// STAK AI (2026-10-01): the chat about this stock, "Why is it moving today?" its first suggestion - not
			// asked on tap, since every answer spends one of the account's questions.
			if let onOpenAi, !demo {
				AskAiCard(title: "Why is \(symbol) moving?", subtitle: "Ask STAK AI · plain English, today's numbers", onOpen: onOpenAi)
			}
			if fromMyStak {
				// Simulation belongs in Simulate, with this company prefilled (My STAK product spec, Sept 2026); the demo
				// keeps its in-page ticket.
				if !demo, let onPracticeInSimulate {
					DetailCta(text: "Practice with \(live?.name ?? symbol) · paper money") {
						PendingSimBuy.request(symbol, company: live?.name ?? symbol)
						onPracticeInSimulate()
					}
				} else {
					DetailCta(text: "Practice buy", enabled: priceReady) { showBuy = true }
				}
				// Unsave drops the stock everywhere (deck saves, holdings, its saved stories), then Back -> Collection.
				DetailSecondary(text: "Unsave") {
					unsave()
					onBack()
				}
			} else if saved {
				// A saved stock reads the same from every entry: Practice buy + Unsave; Unsave stays on the page.
				DetailCta(text: "Practice buy", enabled: priceReady, action: practiceBuy)
				DetailSecondary(text: "Unsave") {
					saved = false
					unsave()
				}
			} else {
				// The sheet this opens says "Saved to My STAK" before the save is attempted, so a full Stak mustn't
				// reach it - and must say why rather than leave the button doing nothing.
				DetailCta(text: "Save") {
					if holdings.isFull {
						stakFullShownAt = Date()
						UINotificationFeedbackGenerator().notificationOccurred(.warning)
						AccessibilityNotification.Announcement(stakFullMessage).post()
					} else {
						withAnimation(.easeOut(duration: 0.35)) { showSuccess = true }
					}
				}
				if stakFullShownAt != nil {
					Text(stakFullMessage)
						.font(StakFont.geist(11 * u))
						.foregroundStyle(muted)
						.frame(maxWidth: .infinity)
						.multilineTextAlignment(.center)
				}
				DetailSecondary(text: "Practice buy", enabled: priceReady, action: practiceBuy)
			}
		}
		.padding(.horizontal, 20 * u)
		.padding(.top, 4 * u)
		.padding(.bottom, 16 * u)
	}

	private func save() {
		// The price on screen goes with the save, so "Since you saved" measures from it (not +0.0% all day).
		let priceNow = vm.liveDetail.flatMap { Double($0.price.replacingOccurrences(of: "$", with: "").replacingOccurrences(of: ",", with: "")) }
		saved = holdings.add(symbol, priceNow: priceNow.flatMap { $0 > 0 ? $0 : nil })
		if saved {
			DeckSession.shared.saved.insert(symbol)
			UIImpactFeedbackGenerator(style: .light).impactOccurred()
		}
	}

	private func unsave() {
		DeckSession.shared.saved.remove(symbol)
		holdings.remove(symbol)
		NewsSaves.shared.removeStories(ticker: symbol)
	}

	/// Authored (1:2382): the Discover entry's Practice buy leaves for the Simulate tab - a dead end unless the stock is
	/// one of the account's saves, when the in-page ticket serves it.
	private func practiceBuy() {
		if let onPracticeBuyToSimulate, hopsToSimulate(symbol) {
			// Simulate opens with this stock waiting, as the My STAK entry's "Practice with" does.
			if !session.demoAccount { PendingSimBuy.request(symbol, company: vm.liveDetail?.name ?? symbol) }
			onPracticeBuyToSimulate()
		} else {
			showBuy = true
		}
	}
}

// MARK: - Pieces

/// A card's title row: its icon tile and Sora 15 name.
private struct CardTitle: View {
	let icon: String
	let title: String
	var tint: Color = iconTint
	var tileSize: CGFloat = 28
	var glyph: CGFloat = 16

	var body: some View {
		let u = figmaUnit
		HStack(spacing: 10 * u) {
			StakIconTile(icon: icon, tint: tint, size: tileSize, glyph: glyph)
			Text(title)
				.font(StakFont.sora(15 * u, .semiBold))
				.foregroundStyle(bright)
				.accessibilityAddTraits(.isHeader)
		}
	}
}

private extension View {
	/// The page's card: #181F30 r16, 16/14 padding.
	func detailCard() -> some View {
		let u = figmaUnit
		return self
			.padding(.horizontal, 16 * u)
			.padding(.vertical, 14 * u)
			.frame(maxWidth: .infinity, alignment: .leading)
			.background(card, in: RoundedRectangle(cornerRadius: 16 * u))
	}
}

private struct DetailCta: View {
	let text: String
	var enabled = true
	let action: () -> Void

	var body: some View {
		let u = figmaUnit
		Button(action: action) {
			Text(text)
				.font(StakFont.geist(14 * u, .medium))
				.foregroundStyle(Color.white)
				.frame(maxWidth: .infinity)
				.frame(height: 52 * u * typeScale)
				.background(discCtaGradient, in: RoundedRectangle(cornerRadius: 6 * u))
				.overlay(RoundedRectangle(cornerRadius: 6 * u).strokeBorder(StakColors.ctaBorderGradient, lineWidth: 0.36 * u))
		}
		.buttonStyle(.pressDim)
		.disabled(!enabled)
		.opacity(enabled ? 1 : 0.5)
	}
}

/// Hairline secondary. The page CTA (1:2568) authors Sora 13; the save-success sheet's "Keep exploring" (92:1205)
/// authors Sora 14 - exact-design audit 2026-09-04. `size` is declared last (memberwise order).
private struct DetailSecondary: View {
	let text: String
	var enabled = true
	let action: () -> Void
	var size: CGFloat = 13

	var body: some View {
		let u = figmaUnit
		Button(action: action) {
			Text(text)
				.font(StakFont.sora(size * u))
				.foregroundStyle(muted)
				.frame(maxWidth: .infinity)
				.frame(height: 52 * u * typeScale)
				.overlay(RoundedRectangle(cornerRadius: 6 * u).strokeBorder(Color(argb: 0x54343B4F), lineWidth: 0.36 * u))
				.contentShape(Rectangle())
		}
		.buttonStyle(.pressDim)
		.disabled(!enabled)
		.opacity(enabled ? 1 : 0.5)
	}
}

/// Kicker label - Geist 10, tracking 0.8, muted. 1:2653 "PRICE TARGET RANGE" authors Regular; the consensus / RECENT
/// ACTIONS kickers author Medium - exact-design audit 2026-09-04.
private struct Kicker: View {
	let text: String
	var weight: StakFont.Weight = .medium

	var body: some View {
		let u = figmaUnit
		Text(text)
			.font(StakFont.geist(10 * u, weight))
			.tracking(0.8 * u)
			.foregroundStyle(muted)
	}
}

// MARK: - Risk

/// Risk snapshot - what could go wrong at THIS company, and how big each is. It replaced "Risk fit / Matches you",
/// which claimed to know whether a stock suited the reader (My STAK product spec, §7).
private struct RiskSnapshotCard: View {
	let riskWatch: RiskWatchResponse?
	let failed: Bool

	var body: some View {
		let u = figmaUnit
		let risks = riskWatch?.risks ?? []
		VStack(alignment: .leading, spacing: (risks.isEmpty && !failed ? 10 : 12) * u) {
			CardTitle(icon: "IcRiskShield", title: "Risk snapshot", tint: Color(argb: 0xFFE8B86D))
			if risks.isEmpty && !failed {
				// Still reading: the card keeps its place rather than appearing later and shoving the page down.
				Text("Reading this company's risks\u{2026}")
					.font(StakFont.geist(12 * u))
					.foregroundStyle(muted)
			} else {
				// Not "what to understand before you act": the reader isn't necessarily about to do anything.
				Text("What could go wrong at this company")
					.font(StakFont.geist(11 * u))
					.foregroundStyle(muted)
				if risks.isEmpty {
					// A failed read is STAK's problem, not a statement about the company.
					Text("STAK couldn't load this company's risks right now - that doesn't mean it has none.")
						.font(StakFont.geist(12 * u))
						.stakLineHeight(16 * u, size: 12 * u, face: .geist)
						.foregroundStyle(muted)
						.fixedSize(horizontal: false, vertical: true)
				} else {
					ForEach(Array(risks.enumerated()), id: \.offset) { _, risk in
						VStack(alignment: .leading, spacing: 4 * u) {
							HStack {
								Text(risk.label)
									.font(StakFont.geist(13 * u, .medium))
									.foregroundStyle(Color.white)
								Spacer(minLength: 8 * u)
								// Only where a figure rates it: measured from beta or P/E against peers, never guessed.
								if let level = risk.level { RiskLevelChip(level: level) }
							}
							Text(risk.note)
								.font(StakFont.geist(11 * u))
								.stakLineHeight(15 * u, size: 11 * u, face: .geist)
								.foregroundStyle(muted)
								.fixedSize(horizontal: false, vertical: true)
						}
						.accessibilityElement(children: .combine)
					}
				}
			}
		}
		.detailCard()
	}
}

/// Elevated / Moderate / Lower - how much of this risk the figures show. Never green: the good/bad palette on a risk
/// chip reads as "safe to buy", the suitability signal removing "Risk fit" was meant to end.
private struct RiskLevelChip: View {
	let level: String

	var body: some View {
		let u = figmaUnit
		let (bg, ink): (Color, Color) = switch level {
		case "Elevated": (Color(argb: 0x33E8B86D), Color(argb: 0xFFE8C08A))
		case "Lower": (Color(argb: 0x142A3346), muted)
		default: (Color(argb: 0x1F3A465E), Color(argb: 0xFFC8D2E0))
		}
		Text(level)
			.font(StakFont.geist(11 * u, .medium))
			.foregroundStyle(ink)
			.padding(.horizontal, 10 * u)
			.padding(.vertical, 3 * u)
			.background(bg, in: Capsule())
	}
}

/// What to watch next - the two or three checkpoints that decide how the company's story goes. Never a prediction,
/// and never ten catalysts: narrowing is the point.
private struct WhatToWatchCard: View {
	let riskWatch: RiskWatchResponse?
	let failed: Bool

	var body: some View {
		let u = figmaUnit
		let watch = riskWatch?.watch ?? []
		// Nothing came back for this company: no card, rather than an empty one.
		if !(watch.isEmpty && (failed || riskWatch != nil)) {
			VStack(alignment: .leading, spacing: (watch.isEmpty ? 10 : 12) * u) {
				CardTitle(icon: "IcRiskEye", title: "What to watch next")
				if watch.isEmpty {
					Text("Working out what matters next\u{2026}")
						.font(StakFont.geist(12 * u))
						.foregroundStyle(muted)
				} else {
					Text("Key questions to follow")
						.font(StakFont.geist(11 * u))
						.foregroundStyle(muted)
					ForEach(Array(watch.enumerated()), id: \.offset) { i, item in
						HStack(alignment: .top, spacing: 10 * u) {
							Text(String(format: "%02d", i + 1))
								.font(StakFont.geist(10 * u, .medium))
								.foregroundStyle(iconTint)
								.frame(width: 24 * u * typeScale, height: 24 * u * typeScale)
								.background(Color(argb: 0x1F5DA8BF), in: RoundedRectangle(cornerRadius: 8 * u))
								.accessibilityHidden(true)
							VStack(alignment: .leading, spacing: 2 * u) {
								Text(item.title)
									.font(StakFont.geist(13 * u, .medium))
									.foregroundStyle(Color.white)
									.fixedSize(horizontal: false, vertical: true)
								Text(item.note)
									.font(StakFont.geist(11 * u))
									.stakLineHeight(15 * u, size: 11 * u, face: .geist)
									.foregroundStyle(muted)
									.fixedSize(horizontal: false, vertical: true)
							}
						}
						.accessibilityElement(children: .combine)
					}
				}
			}
			.detailCard()
		}
	}
}

/// The demo's Risk fit card (the live page reads Risk snapshot instead).
private struct RiskFitCard: View {
	let f: DetailFacts
	let live: LiveDetail?

	var body: some View {
		let u = figmaUnit
		let fit = riskFitFor(f, live: live)
		VStack(alignment: .leading, spacing: 12 * u) {
			// 1:2427 authors a 24-tall head row - exact-design audit 2026-09-04.
			HStack {
				Text("Risk fit")
					.font(StakFont.sora(15 * u, .semiBold))
					.foregroundStyle(bright)
				Spacer()
				Text(fit.0)
					.font(StakFont.geist(11 * u, .medium))
					.foregroundStyle(iconTint)
					.padding(.horizontal, 10 * u)
					.padding(.vertical, 4 * u)
					.background(Color(argb: 0x1F5DA8BF), in: Capsule())
			}
			.frame(height: 24 * u * typeScale)
			// A scale to read the marker against, with a midpoint tick for the market itself (beta 1.0) - "more" and
			// "less than the market" are measured from it. The marker sits at a fraction of the measured width.
			GeometryReader { geo in
				let pill = 14 * u
				let fraction = min(1, max(0, (live?.riskPillX ?? Double(f.riskPillX)) / 289))
				ZStack(alignment: .leading) {
					RoundedRectangle(cornerRadius: 2 * u).fill(Color(argb: 0xFF2A3346)).frame(height: 4 * u)
					Rectangle().fill(Color(argb: 0xFF3A465E)).frame(width: 2 * u, height: 8 * u)
						.offset(x: (geo.size.width - 2 * u) / 2)
					RoundedRectangle(cornerRadius: 4 * u).fill(iconTint).frame(width: pill, height: 8 * u)
						.offset(x: (geo.size.width - pill) * fraction)
				}
				.frame(height: 8 * u)
			}
			.frame(height: 8 * u)
			HStack {
				Text("Low").font(StakFont.geist(10 * u)).foregroundStyle(muted)
				Spacer()
				// Names what the midpoint tick is, so "moves more than the market" has something to point at.
				Text("Market").font(StakFont.geist(10 * u)).foregroundStyle(muted)
				Spacer()
				Text("High").font(StakFont.geist(10 * u)).foregroundStyle(muted)
			}
			Text(fit.1)
				.font(StakFont.geist(11 * u))
				.foregroundStyle(muted)
				.fixedSize(horizontal: false, vertical: true)
		}
		.detailCard()
	}
}

// MARK: - Evidence

private struct NewsSignalCard: View {
	let f: DetailFacts
	let live: LiveDetail?

	var body: some View {
		let u = figmaUnit
		let close = live?.newsClose ?? f.newsClose
		let signal = live?.newsSignal ?? f.newsSignal
		let earnings = live?.earningsStr ?? f.newsEarnings
		let sources = live?.newsSources ?? f.newsSources.map { NewsSourceTag(source: $0.0, tag: $0.1) }
		VStack(alignment: .leading, spacing: 12 * u) {
			CardTitle(icon: "IcTabNews", title: "News signal")
			Text(close)
				.font(StakFont.geist(11 * u, .medium))
				.foregroundStyle(close.hasPrefix("▼") ? red : green)
			Text(signal)
				.font(StakFont.geist(11 * u))
				.foregroundStyle(muted)
				.fixedSize(horizontal: false, vertical: true)
			Text(earnings)
				.font(StakFont.geist(11 * u))
				.foregroundStyle(muted)
			ScrollView(.horizontal, showsIndicators: false) {
				HStack(spacing: 12 * u) {
					ForEach(Array(sources.enumerated()), id: \.offset) { i, src in
						VStack(alignment: .leading, spacing: 8 * u) {
							HStack {
								Text(src.source).font(StakFont.geist(10 * u)).foregroundStyle(muted)
								Spacer()
								Text(src.tag)
									.font(StakFont.geist(10 * u, .medium))
									.foregroundStyle(muted)
									.padding(.horizontal, 8 * u)
									.padding(.vertical, 3 * u)
									.background(Color(argb: 0x14FFFFFF), in: Capsule())
							}
							Text(live?.newsHeadlines.flatMap { i < $0.count ? $0[i] : nil } ?? (i == 0 ? f.newsHeadline : f.newsHeadline2))
								.font(StakFont.geist(12 * u))
								.foregroundStyle(bright)
								.frame(width: 173 * u, alignment: .leading)
								.fixedSize(horizontal: false, vertical: true)
						}
						.padding(12 * u)
						.frame(width: 205 * u, alignment: .leading)
						.background(card, in: RoundedRectangle(cornerRadius: 12 * u))
						.accessibilityElement(children: .combine)
					}
				}
			}
		}
		.detailCard()
	}
}

private struct NumbersCard: View {
	let f: DetailFacts
	let live: LiveDetail?

	var body: some View {
		let u = figmaUnit
		let stats: [DetailStat] = f.stats.enumerated().map { i, st in
			guard let live else { return st }
			let value = [live.peRatioValue, live.revenueGrowthValue, live.profitMarginValue][min(i, 2)]
			let verdict = live.statVerdicts.flatMap { i < $0.count ? $0[i] : nil }
			return DetailStat(
				label: st.label,
				value: (i < 3 ? value : nil) ?? st.value,
				verdict: verdict.flatMap { $0.text.isEmpty ? nil : $0.text } ?? st.verdict,
				good: verdict?.good ?? st.good,
				border: st.border
			)
		}
		VStack(alignment: .leading, spacing: 12 * u) {
			CardTitle(icon: "IcGistInfo", title: "Numbers that matter")
			HStack(spacing: 8 * u) {
				ForEach(Array(stats.enumerated()), id: \.offset) { _, st in
					StatCell(label: st.label, value: st.value, verdict: st.verdict, verdictColor: st.good ? green : muted, border: st.border)
				}
			}
		}
		.detailCard()
	}
}

private struct StatCell: View {
	let label: String
	let value: String
	let verdict: String
	let verdictColor: Color
	var border: Bool = false

	var body: some View {
		let u = figmaUnit
		VStack(alignment: .leading, spacing: 4 * u) {
			Text(label).font(StakFont.geist(10 * u)).foregroundStyle(muted)
			Text(value).font(StakFont.sora(17 * u, .semiBold)).foregroundStyle(bright)
			Text(verdict).font(StakFont.geist(10 * u, .medium)).foregroundStyle(verdictColor)
		}
		.padding(10 * u)
		.frame(maxWidth: .infinity, alignment: .leading)
		.background(card, in: RoundedRectangle(cornerRadius: 12 * u))
		.overlay(border ? RoundedRectangle(cornerRadius: 12 * u).strokeBorder(Color(argb: 0xFF212D4B), lineWidth: 1 * u) : nil)
		.accessibilityElement(children: .combine)
	}
}

/// Analyst view (collapsed 1:2454 / open 1:2651) - the caret toggles; the open flag is hoisted so the page can compose
/// the 1:2579 tab bar and fold the section when the buy receipt's Done lands.
private struct AnalystCard: View {
	let f: DetailFacts
	let live: LiveDetail?
	@Binding var open: Bool

	var body: some View {
		let u = figmaUnit
		let upside = live?.upside ?? f.upside
		Button { open.toggle() } label: {
			VStack(alignment: .leading, spacing: 12 * u) {
				// Collapsed head (1:2455) authors a 22-tall row - exact-design audit 2026-09-04.
				HStack(spacing: 0) {
					StakIconTile(icon: "GoalSearch", tint: iconTint, size: 22, glyph: 13)
					Spacer().frame(width: 10 * u)
					Text("Analyst view")
						.font(StakFont.sora(15 * u, .semiBold))
						.foregroundStyle(bright)
					Spacer()
					// The caret stays when open, flipped into a drop-up so it reads as folding back (user, 2026-09-06).
					Image("IcSdCaret")
						.resizable()
						.frame(width: 20 * u, height: 20 * u)
						.rotationEffect(.degrees(open ? 180 : 0))
				}
				.frame(minHeight: open ? nil : 22 * u * typeScale)
				if !open {
					Text(upside).font(StakFont.geist(11 * u, .medium)).foregroundStyle(upside.hasPrefix("↓") ? muted : green)
				} else {
					openContent(u: u, upside: upside)
				}
			}
			.detailCard()
			.contentShape(Rectangle())
		}
		.buttonStyle(.pressDim)
		.accessibilityValue(open ? "Expanded" : "Collapsed")
	}

	@ViewBuilder
	private func openContent(u: CGFloat, upside: String) -> some View {
		let marker = live?.targetMarkerX ?? Double(f.targetMarkerX)
		let buyBar = live?.buyBarW ?? Double(f.buyBarW)
		let actions = live?.actions ?? f.actions.map { AnalystRow(firm: $0.0, action: $0.1, target: $0.2) }
		Kicker(text: "PRICE TARGET RANGE", weight: .regular)
		// The track spans the row whose Low/Avg/High labels it sits over, so the marker sits above the Avg it marks;
		// it keeps its 0...166 scale as a fraction of the real width.
		GeometryReader { geo in
			let pill = 14 * u
			ZStack(alignment: .leading) {
				RoundedRectangle(cornerRadius: 4 * u).fill(Color(argb: 0x8C5DA8BF))
				RoundedRectangle(cornerRadius: 4 * u).fill(iconTint).frame(width: pill)
					.offset(x: (geo.size.width - pill) * min(1, max(0, marker / 166)))
			}
		}
		.frame(height: 8 * u)
		HStack {
			targetColumn("Low", live?.targetLow ?? f.targetLow, .leading, u: u)
			Spacer()
			targetColumn("Avg", live?.targetAvg ?? f.targetAvg, .center, u: u)
			Spacer()
			targetColumn("High", live?.targetHigh ?? f.targetHigh, .trailing, u: u)
		}
		Text(upside).font(StakFont.geist(11 * u, .medium)).foregroundStyle(upside.hasPrefix("↓") ? muted : green)
		Kicker(text: live?.consensus ?? f.consensus)
		// A real track (it was painted in the card's own color, so only the green fill showed), and the fill's share
		// measured against the bar's actual width.
		GeometryReader { geo in
			ZStack(alignment: .leading) {
				Color(argb: 0xFF2A3346)
				RoundedRectangle(cornerRadius: 4 * u).fill(green).frame(width: geo.size.width * min(1, max(0, buyBar / 318)))
			}
			.clipShape(RoundedRectangle(cornerRadius: 4 * u))
		}
		.frame(height: 8 * u)
		HStack {
			Text(live?.buyCount ?? f.buyCount).font(StakFont.geist(11 * u, .medium)).foregroundStyle(green)
			Spacer()
			Text(live?.holdCount ?? f.holdCount).font(StakFont.geist(11 * u, .medium)).foregroundStyle(muted)
			Spacer()
			Text(live?.sellCount ?? f.sellCount).font(StakFont.geist(11 * u, .medium)).foregroundStyle(muted)
		}
		Kicker(text: "RECENT ACTIONS")
		ForEach(Array(actions.enumerated()), id: \.offset) { _, row in
			// Fixed columns for the rating and the target, so the targets line up down the list.
			HStack(spacing: 0) {
				Text(row.firm)
					.font(StakFont.geist(12 * u, .medium))
					.foregroundStyle(bright)
					.lineLimit(1)
					.frame(maxWidth: .infinity, alignment: .leading)
				Text(row.action)
					.font(StakFont.geist(11 * u, .medium))
					.foregroundStyle(bullishActions.contains(row.action) ? green : muted)
					.lineLimit(1)
					.frame(width: 64 * u * typeScale, alignment: .trailing)
				Spacer().frame(width: 10 * u)
				Text(row.target)
					.font(StakFont.geist(12 * u, .medium))
					.foregroundStyle(bright)
					.lineLimit(1)
					.frame(width: 52 * u * typeScale, alignment: .trailing)
			}
			.padding(.horizontal, 12 * u)
			.frame(height: 38 * u * typeScale)
			// 1:2676..1:2696 author the rows in the card's own #181F30 - exact-design audit 2026-09-04.
			.background(card, in: RoundedRectangle(cornerRadius: 10 * u))
			.accessibilityElement(children: .combine)
		}
	}

	private func targetColumn(_ label: String, _ value: String, _ alignment: HorizontalAlignment, u: CGFloat) -> some View {
		VStack(alignment: alignment, spacing: 1 * u) {
			Text(label).font(StakFont.geist(10 * u)).foregroundStyle(muted)
			Text(value).font(StakFont.geist(12 * u, .medium)).foregroundStyle(bright)
		}
		.accessibilityElement(children: .combine)
	}
}

/// Compare and learn (collapsed 1:2526 / open 1:2719) - the peer table.
private struct CompareCard: View {
	let f: DetailFacts
	let live: LiveDetail?
	let symbol: String
	@State private var open = false

	var body: some View {
		let u = figmaUnit
		Button { open.toggle() } label: {
			// Both states author a 23 gap under the title (1:2526 / 1:2719); the open table and its footnote sit 21
			// apart (1:2723) - exact-design audit 2026-09-04.
			VStack(alignment: .leading, spacing: 23 * u) {
				HStack(spacing: 0) {
					StakIconTile(icon: "IcTabSimulate", tint: iconTint, size: 22, glyph: 13)
					Spacer().frame(width: 10 * u)
					Text("Compare and learn")
						.font(StakFont.sora(15 * u, .semiBold))
						.foregroundStyle(bright)
					Spacer()
					Image("IcSdCaret")
						.resizable()
						.frame(width: 20 * u, height: 20 * u)
						.rotationEffect(.degrees(open ? 180 : 0))
				}
				.frame(minHeight: open ? nil : 22 * u * typeScale)
				if !open {
					// 1:2531 authors Geist Regular - exact-design audit 2026-09-04.
					Text(live?.peersLabel ?? f.peersLabel)
						.font(StakFont.geist(11 * u))
						.foregroundStyle(muted)
				} else {
					table(u: u)
				}
			}
			.detailCard()
			.contentShape(Rectangle())
		}
		.buttonStyle(.pressDim)
		.accessibilityValue(open ? "Expanded" : "Collapsed")
	}

	private func table(u: CGFloat) -> some View {
		let rows = live?.compareRows ?? f.compareRows.map { CompareValues(label: $0.label, a: $0.a, b: $0.b, c: $0.c, green: $0.green) }
		return VStack(alignment: .leading, spacing: 21 * u) {
			// The tint column and the hairline are a BACKGROUND of the table (1:2724), never laid out: as siblings the
			// 170-tall tint pushed the footnote and CTAs down (mirrors android, 2026-09-04).
			VStack(spacing: 12 * u) {
				compareRow("", symbol, live?.peerA ?? f.peerA, live?.peerB ?? f.peerB, header: true, u: u)
				ForEach(Array(rows.enumerated()), id: \.offset) { _, r in
					compareRow(r.label, r.a, r.b, r.c, valueColor: r.green ? green : nil, u: u)
				}
			}
			.background(alignment: .topLeading) {
				ZStack(alignment: .topLeading) {
					// This stock's column tint (1:2721): 81x170 r8, 12 above the table top.
					RoundedRectangle(cornerRadius: 8 * u)
						.fill(Color(argb: 0x125DA8BF))
						.frame(width: 81 * u, height: 170 * u * typeScale)
						.offset(x: 78 * u, y: -12 * u)
					// 1:2722: a 0.5-wide hairline between the peer columns, 134.5 tall.
					Rectangle()
						.fill(Color(argb: 0xFF272F40))
						.frame(width: 0.5 * u, height: 134.5 * u * typeScale)
						.offset(x: 241 * u, y: -6 * u)
				}
				.frame(width: 0, height: 0, alignment: .topLeading)
			}
			Text("Cultural context only, not financial advice.")
				.font(StakFont.geist(10 * u, .medium))
				.foregroundStyle(muted)
		}
	}

	private func compareRow(_ label: String, _ a: String, _ m: String, _ g: String, header: Bool = false, valueColor: Color? = nil, u: CGFloat) -> some View {
		HStack(spacing: 8 * u) {
			Text(label).font(StakFont.geist(11 * u)).foregroundStyle(muted).frame(maxWidth: .infinity, alignment: .leading)
			Text(a).font(StakFont.geist(11 * u, .medium)).foregroundStyle(valueColor ?? bright).frame(maxWidth: .infinity)
			Text(m).font(StakFont.geist(11 * u, header ? .medium : .regular)).foregroundStyle(valueColor ?? bright).frame(maxWidth: .infinity)
			Text(g).font(StakFont.geist(11 * u, header ? .medium : .regular)).foregroundStyle(valueColor ?? bright).frame(maxWidth: .infinity)
		}
		.frame(minHeight: 20 * u * typeScale, alignment: .top)
		.accessibilityElement(children: .combine)
	}
}

// MARK: - Since you saved

/// The "Since you saved" line for THIS stock. Two references, not the same claim: a stamped price is what the stock
/// cost at the moment of saving; a save from before stamping has only that day's close - a real price, but a
/// different moment - so the copy says which one it measured from.
@MainActor private func sinceSavedFor(
	_ f: DetailFacts, symbol: String, live: LiveDetail?, reference: SavedReference?, referenceSettled: Bool, detailSettled: Bool
) -> (String, String, Bool) {
	let demo = Session.shared.demoAccount
	if demo {
		return ("+4.6%", "Saved 5 weeks ago. \(symbol) is up 4.6% since, moving roughly with the market. Steady giants tend to.", true)
	}
	let holdings = MyStakHoldings.shared
	let days = holdings.daysSinceSaved(symbol)
	let stamped = holdings.priceAtSave(symbol).flatMap { $0 > 0 ? $0 : nil }
	let recovered = reference.flatMap { $0.price > 0 ? $0 : nil }
	let atMoment = stamped != nil || recovered?.atMoment == true
	let ref = stamped ?? recovered?.price
	let now = live.flatMap { Double($0.price.replacingOccurrences(of: "$", with: "").replacingOccurrences(of: ",", with: "")) }
	let savedPct: Double? = ref.flatMap { r in now.map { ($0 - r) / r * 100 } }
	let move = savedPct.map { String(format: "%.1f", abs($0)) }
	let up = (savedPct ?? 0) >= 0
	let whenSaved: String = switch days {
	case nil: "recently"
	case 0: "today"
	case 1: "yesterday"
	default: "\(days ?? 0) days ago"
	}
	// A save from today (or from before the record existed) with no price to measure from hasn't a move to show yet;
	// with one - the price stamped at the save - it's measured like any other.
	if (days ?? 0) == 0 && ref == nil && referenceSettled {
		return ("+0.0%", "Saved \(whenSaved). \(symbol) hasn't moved since you saved it - check back after a few sessions.", true)
	}
	guard let savedPct, let move else {
		// Still arriving - today's price, or the price to measure against - says only what's known: "no record" is a
		// finding, and it can't be made before the look-up ends.
		if (now == nil && !detailSettled) || (stamped == nil && !referenceSettled) { return ("\u{2014}", "Saved \(whenSaved).", true) }
		if now == nil {
			return ("\u{2014}", "Saved \(whenSaved). Today's price isn't available right now, so there's no move to show.", true)
		}
		return ("\u{2014}", "Saved \(whenSaved). STAK has no record of what \(symbol) cost then, so there's no move to measure yet.", true)
	}
	let figure = (savedPct >= 0 ? "+" : "-") + move + "%"
	if atMoment {
		return (figure, "Saved \(whenSaved). \(symbol) is \(up ? "up" : "down") \(move)% since you saved it.", up)
	}
	return (figure, "Saved \(whenSaved), when \(symbol) closed at \(formatPrice(ref ?? 0)). It is \(up ? "up" : "down") \(move)% since that close.", up)
}

/// "SINCE YOU SAVED +4.6%" (16:1012) for the My STAK entry, with the company's recent changes under it.
private struct SinceYouSavedCard: View {
	let f: DetailFacts
	let symbol: String
	let live: LiveDetail?
	let reference: SavedReference?
	let referenceSettled: Bool
	let detailSettled: Bool
	/// What changed at this company - the same updates My STAK lists.
	let changes: [StockUpdateDto]
	/// Which of them were still unopened when the page was opened.
	let unreadOnEntry: Set<Int64>

	var body: some View {
		let u = figmaUnit
		let since = sinceSavedFor(f, symbol: symbol, live: live, reference: reference, referenceSettled: referenceSettled, detailSettled: detailSettled)
		VStack(alignment: .leading, spacing: 12 * u) {
			HStack(spacing: 8 * u) {
				Image("IcSavedBookmark").resizable().frame(width: 12 * u, height: 12 * u).accessibilityHidden(true)
				Text("SINCE YOU SAVED")
					.font(StakFont.geist(10 * u, .medium))
					.tracking(0.8 * u)
					.foregroundStyle(muted)
				// A dash is no move at all, so it takes neither the up nor the down color.
				Text(since.0)
					.font(StakFont.geist(12 * u, .medium))
					.foregroundStyle(since.0 == "\u{2014}" ? muted : (since.2 ? green : red))
			}
			Text(since.1)
				.font(StakFont.geist(11 * u))
				.stakLineHeight(14 * u, size: 11 * u, face: .geist)
				.foregroundStyle(muted)
				.fixedSize(horizontal: false, vertical: true)
			if !changes.isEmpty {
				Rectangle().fill(Color(argb: 0xFF232B3D)).frame(height: 1 * u)
				// Detection reads a few days of news, so this is what changed recently - not everything since a save.
				Text("RECENT CHANGES")
					.font(StakFont.geist(10 * u, .medium))
					.tracking(0.8 * u)
					.foregroundStyle(muted)
				// Two at most: the story since the save, not an archive of it.
				ForEach(Array(changes.prefix(2)), id: \.id) { change in
					HStack(alignment: .top, spacing: 8 * u) {
						Circle()
							.fill(unreadOnEntry.contains(change.id) ? Color(argb: 0xFF2C9DBC) : muted)
							.frame(width: 6 * u, height: 6 * u)
							.padding(.top, 5 * u)
							.accessibilityHidden(true)
						VStack(alignment: .leading, spacing: 2 * u) {
							Text(change.title)
								.font(StakFont.geist(12 * u, .medium))
								.stakLineHeight(16 * u, size: 12 * u, face: .geist)
								.foregroundStyle(Color.white)
							Text(change.body)
								.font(StakFont.geist(11 * u))
								.stakLineHeight(15 * u, size: 11 * u, face: .geist)
								.foregroundStyle(muted)
							// What it affects, and the headlines behind it: this page is where the inbox's "Understand
							// this change" lands, so it can't arrive with less than the card that sent it.
							if let watch = change.watch, !watch.isEmpty {
								Text(watch)
									.font(StakFont.geist(11 * u))
									.stakLineHeight(15 * u, size: 11 * u, face: .geist)
									.foregroundStyle(muted)
							}
							if let line = updateSourceLine(change) {
								Text(line)
									.font(StakFont.geist(10 * u))
									.stakLineHeight(14 * u, size: 10 * u, face: .geist)
									.foregroundStyle(muted)
							}
						}
						.fixedSize(horizontal: false, vertical: true)
					}
					.accessibilityElement(children: .combine)
				}
			}
		}
		// 16:1012 authors p14/16/14/16.
		.detailCard()
	}
}

/// "▼ 15.4% past year" - the selected range's own move, named for its period so the figure and the line beneath it
/// always describe the same stretch of time.
private func rangeChangeText(_ pct: Double, _ range: String) -> String {
	let period: String = switch range {
	case "1D": "today"
	case "1W": "past week"
	case "1M": "past month"
	case "3M": "past 3 months"
	case "YTD": "year to date"
	default: "past year"
	}
	return "\(pct < 0 ? "▼" : "▲") \(String(format: "%.1f", abs(pct)))% \(period)"
}

// MARK: - Saved sheet

/// Saved-to-My-STAK sheet over the detail (92:969), with this stock's own name, price and move.
private struct DetailSavedSheet: View {
	let f: DetailFacts
	let symbol: String
	let live: LiveDetail?
	let onDismiss: () -> Void
	let onViewInMyStak: () -> Void
	let onKeepExploring: () -> Void

	var body: some View {
		let u = figmaUnit
		let change = StakClock.sessionChange(live?.change ?? f.sheetChange)
		ZStack(alignment: .bottom) {
			// Authored scrim rgba(12,19,32,0.55) (106:1037).
			Color(argb: 0x8C0C1320)
				.ignoresSafeArea()
				.onTapGesture(perform: onDismiss)
				.accessibilityLabel("Close and save")
				.accessibilityAddTraits(.isButton)
			VStack(spacing: 14 * u) {
				RoundedRectangle(cornerRadius: 2 * u)
					.fill(Color(argb: 0xFF2A3346))
					.frame(width: 40 * u, height: 4 * u)
					.padding(.bottom, 4 * u)
				Image("IcSheetCheck").resizable().frame(width: 47 * u, height: 47 * u).accessibilityHidden(true)
				Text("Saved to My STAK")
					.font(StakFont.sora(18 * u, .semiBold))
					.foregroundStyle(Color.white)
					.accessibilityAddTraits(.isHeader)
				HStack(spacing: 11 * u) {
					Text(live?.name != nil ? String(symbol.prefix(1)) : f.sheetBadge)
						.font(StakFont.sora(15 * u, .semiBold))
						.foregroundStyle(Color(argb: 0xFF9EADC7))
						.frame(width: 38 * u * typeScale, height: 38 * u * typeScale)
						.background(Color(argb: 0xFF242B3D), in: Circle())
						.accessibilityHidden(true)
					VStack(alignment: .leading, spacing: 2 * u) {
						Text(live?.name ?? f.sheetName)
							.font(StakFont.geist(13 * u, .medium))
							.foregroundStyle(Color.white)
						Text(live?.price ?? f.sheetPrice)
							.font(StakFont.geist(10 * u))
							.foregroundStyle(muted)
					}
					.frame(maxWidth: .infinity, alignment: .leading)
					Text(change)
						.font(StakFont.geist(12 * u, .medium))
						.foregroundStyle(change.hasPrefix("▼") ? red : green)
				}
				.padding(.horizontal, 14 * u)
				.padding(.vertical, 12 * u)
				.background(Color(argb: 0x1A69B3CA), in: RoundedRectangle(cornerRadius: 6 * u))
				.accessibilityElement(children: .combine)
				Text("Watching from today · no money committed")
					.font(StakFont.geist(12 * u))
					.stakLineHeight(18 * u, size: 12 * u, face: .geist)
					.foregroundStyle(Color(argb: 0xFFC8D2E0))
					.frame(maxWidth: .infinity, alignment: .leading)
				VStack(spacing: 16 * u) {
					DetailCta(text: "View in My STAK", action: onViewInMyStak)
					// 92:1205 authors Sora 14 - exact-design audit 2026-09-04.
					DetailSecondary(text: "Keep exploring", action: onKeepExploring, size: 14)
				}
			}
			.padding(.horizontal, 20 * u)
			.padding(.top, 10 * u)
			.padding(.bottom, 30 * u)
			.frame(maxWidth: .infinity)
			.background(card, in: UnevenRoundedRectangle(topLeadingRadius: 24 * u, topTrailingRadius: 24 * u))
			.ignoresSafeArea(edges: .bottom)
			.sheetDragToDismiss(onDismiss)
			.accessibilityAddTraits(.isModal)
		}
	}
}

// MARK: - Facts

/// One stat tile in "Numbers that matter".
private struct DetailStat {
	let label: String
	let value: String
	let verdict: String
	var good = false
	var border = false
}

/// One "Compare and learn" table row (a = this stock).
private struct DetailCompareRow {
	let label: String
	let a: String
	let b: String
	let c: String
	var green = false
}

/// The practice-buy ticket for THIS stock. Only three symbols have authored tickets; any other gets its own, priced
/// from its live quote - another company's ticket once filled that company at its live price (audit, 2026-09-15). The
/// sheet recomputes the amount, cash and shares itself, so the placeholders here never reach the screen.
@MainActor private func liveBuySpec(_ symbol: String, live: LiveDetail?, f: DetailFacts) -> BuySpec {
	// The authored tickets carry sample prices: the demo's only. A real account's ticket is the live price - a buy
	// confirmed before the quote landed (or offline) once filled at the sample $122.10 / $229.35 / $178.90.
	if Session.shared.demoAccount, let authored = [nvdaBuy, aaplBuy, googlBuy].first(where: { $0.symbol == symbol }) { return authored }
	let price = live.flatMap { $0.price == "—" ? nil : $0.price } ?? "$0.00"
	let change = live.flatMap { $0.change.isEmpty ? nil : $0.change } ?? "▲ 0.0% today"
	return BuySpec(
		title: "Buy \(symbol)?", badge: String(symbol.prefix(1)), name: live?.name ?? symbol,
		priceLine: price + " today",
		// formatChange() ends "% today"; the ticket's change carries no suffix.
		change: change.hasSuffix(" today") ? String(change.dropLast(" today".count)) : change,
		cashBefore: "$0.00", cashAfter: "$0.00", shares: "0", symbol: symbol
	)
}

/// The Risk fit chip against the user's OWN risk style. An unanswered risk question isn't a profile: then it names the
/// stock's own volatility instead of matching the user on an answer they never gave. Otherwise each style gets a real
/// comparison - the old rule called everything a match for a Balanced account.
@MainActor private func riskFitFor(_ f: DetailFacts, live: LiveDetail?) -> (String, String) {
	let pillX = live?.riskPillX ?? Double(f.riskPillX)
	let riskCopy = live?.riskCopy ?? f.riskCopy
	// 120 and 170 sit either side of the track's midpoint, which is market beta.
	let stockBand = pillX > 170 ? 1 : (pillX < 120 ? -1 : 0)
	let risk = UserProfile.shared.risk
	if risk < 0 {
		return (stockBand == 1 ? "More volatile" : (stockBand == -1 ? "Less volatile" : "Around market"), riskCopy)
	}
	let styleBand: Int = switch TasteModel.riskStyle(risk) {
	case "Growth-Oriented": 1
	case "Balanced": 0
	default: -1
	}
	let first = riskCopy.components(separatedBy: ". ").first.flatMap { $0.isEmpty ? nil : ($0.hasSuffix(".") ? $0 : $0 + ".") } ?? ""
	if stockBand > styleBand {
		return ("Bolder than you", "\(first) Bolder than your profile, so keep any stake small.".trimmingCharacters(in: .whitespaces))
	}
	if stockBand < styleBand {
		return ("Calmer than you", "\(first) Calmer than your profile, a steady anchor for a bold STAK.".trimmingCharacters(in: .whitespaces))
	}
	return ("Matches you", riskCopy)
}

/// The page with nothing filled in: what a real account shows until its own data arrives. Every field is a
/// placeholder, so a value on screen is either this stock's or visibly absent - never another company's.
private func emptyFacts(_ symbol: String) -> DetailFacts {
	DetailFacts(
		symbol: symbol, title: symbol, price: "—", change: "", tip: "",
		// Mid-track until beta says otherwise; the copy stays blank rather than guessing.
		riskPillX: 145, riskCopy: "",
		stats: [
			DetailStat(label: "P/E ratio", value: "—", verdict: ""),
			DetailStat(label: "Revenue growth", value: "—", verdict: ""),
			// No border: the authored highlight marked a stat a designer judged notable for one company.
			DetailStat(label: "Profit margin", value: "—", verdict: ""),
		],
		upside: "", targetLow: "—", targetAvg: "—", targetHigh: "—", targetMarkerX: 0,
		consensus: "", buyCount: "", holdCount: "", sellCount: "", buyBarW: 0,
		actions: [], newsClose: "", newsSignal: "", newsEarnings: "", newsSources: [],
		newsHeadline: "", newsHeadline2: "", peersLabel: "", peerA: "—", peerB: "—", compareRows: [],
		sheetBadge: String(symbol.prefix(1)), sheetName: symbol, sheetPrice: "—", sheetChange: "",
		// Replaced by liveBuySpec() at the call site; never the ticket shown.
		buySpec: BuySpec(title: "Buy \(symbol)?", badge: String(symbol.prefix(1)), name: symbol, priceLine: "$0.00 today", change: "▲ 0.0%", cashBefore: "$0.00", cashAfter: "$0.00", shares: "0", symbol: symbol)
	)
}

/// The page's facts for a symbol. The nineteen designed pages carry their own; any
/// other stock a first-time user saved (a Tesla or Amazon story, the Other
/// collection) keeps ITS identity - symbol, name, quote - over the Apple
/// template's body, so the header, the Since-you-saved line and Unsave are about
/// the stock the user tapped (audit 2026-09-07: they opened Apple's page).
private func detailFactsFor(_ symbol: String) -> DetailFacts {
	if let designed = detailFacts[symbol] { return designed }
	var f = detailFacts["AAPL"]!
	f.symbol = symbol
	let badge = String(symbol.prefix(1))
	// Every order-related field follows the requested ticker (Codex review, PR #167):
	// the inherited AAPL buySpec used to add Apple to the paper portfolio for an AMZN page.
	guard NewsArticleFeed.hasStockFacts(symbol) else {
		f.title = symbol
		f.sheetBadge = badge
		f.sheetName = symbol
		let b = f.buySpec
		f.buySpec = BuySpec(title: "Buy \(symbol)?", badge: badge, name: symbol, priceLine: b.priceLine, change: b.change, cashBefore: b.cashBefore, cashAfter: b.cashAfter, shares: b.shares, symbol: symbol)
		return f
	}
	let sf = NewsArticleFeed.stockFacts(symbol)
	var pct = sf.change.filter { $0.isNumber || $0 == "." }
	if pct.isEmpty { pct = "0.0" }
	let move = (sf.up ? "\u{25B2} " : "\u{25BC} ") + pct + "%"
	f.title = "\(symbol) · \(sf.name)"
	f.price = sf.price
	f.change = move + " today"
	f.sheetBadge = badge
	f.sheetName = sf.shortName
	f.sheetPrice = "\(sf.price) today"
	f.sheetChange = move
	// The ticket recomputes cash and shares from the chosen amount (withAmount).
	f.buySpec = BuySpec(title: "Buy \(symbol)?", badge: badge, name: sf.name, priceLine: "\(sf.price) today", change: move, cashBefore: "$0.00", cashAfter: "$0.00", shares: "0.0000", symbol: symbol)
	return f
}

/// The authored Discover-entry Practice buy hops to the Simulate tab (1:2382,
/// Instant), whose Saved staks list the ACCOUNT's saves. For the demo persona that
/// is the authored frame; for a first-time user the hop is a dead end unless the
/// stock is one of their saves - then the in-page ticket (16:1012) serves it.
@MainActor private func hopsToSimulate(_ symbol: String) -> Bool {
	Session.shared.demoAccount || MyStakHoldings.shared.tickers.contains(symbol)
}

private struct DetailFacts {
	var symbol: String
	var title: String
	var price: String
	var change: String
	let tip: String
	let riskPillX: CGFloat
	let riskCopy: String
	let stats: [DetailStat]
	let upside: String
	let targetLow: String
	let targetAvg: String
	let targetHigh: String
	let targetMarkerX: CGFloat
	let consensus: String
	let buyCount: String
	let holdCount: String
	let sellCount: String
	let buyBarW: CGFloat
	let actions: [(String, String, String)]
	let newsClose: String
	let newsSignal: String
	let newsEarnings: String
	let newsSources: [(String, String)]
	let newsHeadline: String
	/// The second news card's own headline (product audit, 2026-09-05: both cards repeated one line).
	let newsHeadline2: String
	let peersLabel: String
	let peerA: String
	let peerB: String
	let compareRows: [DetailCompareRow]
	var sheetBadge: String
	var sheetName: String
	var sheetPrice: String
	var sheetChange: String
	var buySpec: BuySpec
}

private let detailFacts: [String: DetailFacts] = [
	"AAPL": DetailFacts(
		symbol: "AAPL",
		title: "AAPL · Apple Inc",
		price: "$229.35",
		change: "▲ 1.2% today",
		tip: "Steady giants move slower. Stable stocks often do.",
		riskPillX: 88,
		riskCopy: "Low volatility. Fits the steady side of your profile.",
		stats: [
			DetailStat(label: "P/E ratio", value: "31.2", verdict: "In line"),
			DetailStat(label: "Revenue growth", value: "6.1%", verdict: "Slower"),
			DetailStat(label: "Profit margin", value: "24.3%", verdict: "Excellent", good: true, border: true),
		],
		upside: "↑ 6.7% upside",
		// 1:2656 authors the marker at x173 - exact-design audit 2026-09-04 (was 167).
		targetLow: "$180", targetAvg: "$248", targetHigh: "$300", targetMarkerX: 173,
		consensus: "WALL ST. CONSENSUS · 42 ANALYSTS",
		buyCount: "● Buy 28", holdCount: "Hold 12", sellCount: "Sell 2", buyBarW: 212,
		actions: [
			("Morgan Stanley", "Buy", "$260"),
			("Wedbush", "Buy", "$285"),
			("Goldman Sachs", "Buy", "$256"),
			("UBS", "Hold", "$236"),
			("Barclays", "Hold", "$230"),
		],
		newsClose: "▲ +0.8% at yesterday’s close",
		newsSignal: "Foldable iPhone reports point to a premium fall lineup.",
		newsEarnings: "Next earnings land \(StakClock.daysAhead(26)).",
		newsSources: [("Yahoo · 13h ago", "Neutral"), ("CNN · 1h ago", "Neutral")],
		newsHeadline: "The rally leaves Apple about 4 percent shy of the market-cap crown",
		newsHeadline2: "Apple's services arm posts another record quarter as the iPhone cycle steadies",
		peersLabel: "vs MSFT · GOOGL",
		peerA: "MSFT", peerB: "GOOGL",
		compareRows: [
			DetailCompareRow(label: "P/E ratio", a: "31.2", b: "36x", c: "24x"),
			DetailCompareRow(label: "Rev growth", a: "+6.1%", b: "+15%", c: "+12%", green: true),
			DetailCompareRow(label: "Profit margin", a: "24.3%", b: "36%", c: "29%"),
			DetailCompareRow(label: "Market cap", a: "$3.5T", b: "$3.4T", c: "$2.3T"),
		],
		sheetBadge: "A", sheetName: "Apple", sheetPrice: "$229.35 today", sheetChange: "▲ 1.2%",
		buySpec: aaplBuy
	),
	"NVDA": DetailFacts(
		symbol: "NVDA",
		title: "NVDA · NVIDIA Corp",
		price: "$122.10",
		change: "▲ 2.4% today",
		tip: "Chip stocks swing hard. Small stakes, long views.",
		riskPillX: 238,
		riskCopy: "High volatility. Fits the bolder side of your profile.",
		stats: [
			DetailStat(label: "P/E ratio", value: "52.8", verdict: "Rich"),
			DetailStat(label: "Revenue growth", value: "62%", verdict: "Explosive", good: true, border: true),
			DetailStat(label: "Profit margin", value: "48.9%", verdict: "Strong"),
		],
		upside: "↑ 17.9% upside",
		targetLow: "$100", targetAvg: "$144", targetHigh: "$200", targetMarkerX: 33,
		consensus: "WALL ST. CONSENSUS · 63 ANALYSTS",
		buyCount: "● Buy 55", holdCount: "Hold 7", sellCount: "Sell 1", buyBarW: 273,
		actions: [
			("Morgan Stanley", "Buy", "$152"),
			("BofA", "Buy", "$150"),
			("Goldman Sachs", "Buy", "$145"),
			("Citi", "Buy", "$150"),
			("HSBC", "Hold", "$120"),
		],
		newsClose: "▲ +2.1% at yesterday’s close",
		newsSignal: "Blackwell demand keeps outrunning supply into the fall.",
		newsEarnings: "Next earnings land \(StakClock.daysAhead(54)).",
		newsSources: [("Reuters · 2h ago", "Bullish"), ("CNBC · 9h ago", "Neutral")],
		newsHeadline: "Nvidia lags the chip rally it kicked off as orders pile up",
		newsHeadline2: "Nvidia's data-center backlog stretches into next year, analysts say",
		peersLabel: "vs AMD · TSM",
		peerA: "AMD", peerB: "TSM",
		compareRows: [
			DetailCompareRow(label: "P/E ratio", a: "52.8", b: "110x", c: "28x"),
			DetailCompareRow(label: "Rev growth", a: "+62%", b: "+18%", c: "+33%", green: true),
			DetailCompareRow(label: "Profit margin", a: "48.9%", b: "6.4%", c: "39%"),
			DetailCompareRow(label: "Market cap", a: "$3.0T", b: "$0.2T", c: "$1.0T"),
		],
		sheetBadge: "N", sheetName: "Nvidia", sheetPrice: "$122.10 today", sheetChange: "▲ 2.4%",
		buySpec: nvdaBuy
	),
	"GOOGL": DetailFacts(
		symbol: "GOOGL",
		title: "GOOGL · Alphabet Inc",
		price: "$178.90",
		change: "▲ 0.8% today",
		tip: "Ad money tracks the economy. Some quarters drift.",
		riskPillX: 150,
		riskCopy: "Moderate volatility. Sits mid-range for your profile.",
		stats: [
			DetailStat(label: "P/E ratio", value: "24.1", verdict: "Cheaper", good: true, border: true),
			DetailStat(label: "Revenue growth", value: "12%", verdict: "Healthy"),
			DetailStat(label: "Profit margin", value: "29.5%", verdict: "Strong"),
		],
		upside: "↑ 12.4% upside",
		targetLow: "$150", targetAvg: "$201", targetHigh: "$240", targetMarkerX: 52,
		consensus: "WALL ST. CONSENSUS · 48 ANALYSTS",
		buyCount: "● Buy 40", holdCount: "Hold 8", sellCount: "Sell 0", buyBarW: 261,
		actions: [
			("Morgan Stanley", "Buy", "$210"),
			("JPMorgan", "Buy", "$208"),
			("Goldman Sachs", "Buy", "$205"),
			("Bernstein", "Hold", "$185"),
			("Wells Fargo", "Hold", "$182"),
		],
		newsClose: "▲ +0.6% at yesterday’s close",
		newsSignal: "A blowout ad quarter pushed the stock to fresh highs.",
		newsEarnings: "Next earnings land \(StakClock.daysAhead(18)).",
		newsSources: [("Bloomberg · 5h ago", "Bullish"), ("Yahoo · 1d ago", "Neutral")],
		newsHeadline: "Alphabet jumps after a blowout ad quarter as cloud accelerates",
		newsHeadline2: "Alphabet lifts its capex plan again as Gemini demand outruns capacity",
		peersLabel: "vs MSFT · META",
		peerA: "MSFT", peerB: "META",
		compareRows: [
			DetailCompareRow(label: "P/E ratio", a: "24.1", b: "36x", c: "27x"),
			DetailCompareRow(label: "Rev growth", a: "+12%", b: "+15%", c: "+19%", green: true),
			DetailCompareRow(label: "Profit margin", a: "29.5%", b: "36%", c: "34%"),
			DetailCompareRow(label: "Market cap", a: "$2.3T", b: "$3.4T", c: "$1.5T"),
		],
		sheetBadge: "G", sheetName: "Alphabet", sheetPrice: "$178.90 today", sheetChange: "▲ 0.8%",
		buySpec: googlBuy
	),
	// Codex parity audit (2026-09-04): every collection / pick ticker serves
	// its own detail page - the three authored entries above are the
	// template, these are demo-authored in the same shape (prices and
	// changes agree with the collection tiles and NewsArticleFeed's
	// stockFacts). Generated from one shared table; mirrors
	// android ui/discover/StockDetailScreen.kt entry for entry.
	"MSFT": DetailFacts(
		symbol: "MSFT",
		title: "MSFT · Microsoft Corp",
		price: "$438.20",
		change: "▼ 0.4% today",
		tip: "Subscriptions renew monthly. Swings stay small.",
		riskPillX: 88,
		riskCopy: "Low volatility. Fits the steady side of your profile.",
		stats: [
			DetailStat(label: "P/E ratio", value: "37.5", verdict: "Rich"),
			DetailStat(label: "Revenue growth", value: "15%", verdict: "Healthy"),
			DetailStat(label: "Profit margin", value: "36%", verdict: "Excellent", good: true, border: true),
		],
		upside: "↑ 14.1% upside",
		targetLow: "$380", targetAvg: "$500", targetHigh: "$560", targetMarkerX: 106,
		consensus: "WALL ST. CONSENSUS · 55 ANALYSTS",
		buyCount: "● Buy 48", holdCount: "Hold 6", sellCount: "Sell 1", buyBarW: 277,
		actions: [
			("Morgan Stanley", "Buy", "$520"),
			("Wedbush", "Buy", "$550"),
			("Jefferies", "Buy", "$505"),
			("Goldman Sachs", "Buy", "$500"),
			("UBS", "Hold", "$450"),
		],
		newsClose: "▼ -0.3% at yesterday’s close",
		newsSignal: "Azure growth and Copilot seat counts are the numbers to watch this week.",
		newsEarnings: "Next earnings land \(StakClock.daysAhead(117)).",
		newsSources: [("Bloomberg · 4h ago", "Bullish"), ("Reuters · 11h ago", "Neutral")],
		newsHeadline: "Tech earnings week: what to watch",
		newsHeadline2: "Microsoft's Azure growth holds as Copilot seats climb",
		peersLabel: "vs AAPL · GOOGL",
		peerA: "AAPL", peerB: "GOOGL",
		compareRows: [
			DetailCompareRow(label: "P/E ratio", a: "37.5", b: "31x", c: "24x"),
			DetailCompareRow(label: "Rev growth", a: "+15%", b: "+6.1%", c: "+12%", green: true),
			DetailCompareRow(label: "Profit margin", a: "36%", b: "24%", c: "29%"),
			DetailCompareRow(label: "Market cap", a: "$3.8T", b: "$3.5T", c: "$2.3T"),
		],
		sheetBadge: "M", sheetName: "Microsoft", sheetPrice: "$438.20 today", sheetChange: "▼ 0.4%",
		buySpec: BuySpec(title: "Buy MSFT?", badge: "M", name: "Microsoft Corp", priceLine: "$438.20 today", change: "▼ 0.4%", cashBefore: "$8,800.00", cashAfter: "$8,775.00", shares: "0.0571", symbol: "MSFT")
	),
	"AMD": DetailFacts(
		symbol: "AMD",
		title: "AMD · Advanced Micro Devices",
		price: "$164.30",
		change: "▲ 2.1% today",
		tip: "Chip rallies rotate. Expect sharp days both ways.",
		riskPillX: 238,
		riskCopy: "High volatility. Fits the bolder side of your profile.",
		stats: [
			DetailStat(label: "P/E ratio", value: "45.6", verdict: "Rich"),
			DetailStat(label: "Revenue growth", value: "18%", verdict: "Accelerating", good: true, border: true),
			DetailStat(label: "Profit margin", value: "6.4%", verdict: "Thin"),
		],
		upside: "↑ 15.6% upside",
		targetLow: "$130", targetAvg: "$190", targetHigh: "$250", targetMarkerX: 79,
		consensus: "WALL ST. CONSENSUS · 50 ANALYSTS",
		buyCount: "● Buy 36", holdCount: "Hold 13", sellCount: "Sell 1", buyBarW: 228,
		actions: [
			("Morgan Stanley", "Buy", "$195"),
			("BofA", "Buy", "$200"),
			("Jefferies", "Buy", "$190"),
			("Goldman Sachs", "Hold", "$170"),
			("Bernstein", "Hold", "$160"),
		],
		newsClose: "▲ +1.6% at yesterday’s close",
		newsSignal: "The AI rotation is lifting AMD as buyers look past the most crowded chip names.",
		newsEarnings: "Next earnings land \(StakClock.daysAhead(123)).",
		newsSources: [("CNBC · 3h ago", "Bullish"), ("Yahoo · 8h ago", "Neutral")],
		newsHeadline: "AMD rides the AI rotation to a yearly high",
		newsHeadline2: "AMD lands another hyperscaler for its MI-series chips",
		peersLabel: "vs NVDA · TSM",
		peerA: "NVDA", peerB: "TSM",
		compareRows: [
			DetailCompareRow(label: "P/E ratio", a: "45.6", b: "53x", c: "28x"),
			DetailCompareRow(label: "Rev growth", a: "+18%", b: "+62%", c: "+33%", green: true),
			DetailCompareRow(label: "Profit margin", a: "6.4%", b: "48.9%", c: "39%"),
			DetailCompareRow(label: "Market cap", a: "$302B", b: "$3.0T", c: "$1.0T"),
		],
		sheetBadge: "A", sheetName: "AMD", sheetPrice: "$164.30 today", sheetChange: "▲ 2.1%",
		buySpec: BuySpec(title: "Buy AMD?", badge: "A", name: "Advanced Micro Devices", priceLine: "$164.30 today", change: "▲ 2.1%", cashBefore: "$8,800.00", cashAfter: "$8,775.00", shares: "0.1522", symbol: "AMD")
	),
	"JPM": DetailFacts(
		symbol: "JPM",
		title: "JPM · JPMorgan Chase",
		price: "$245.60",
		change: "▲ 0.6% today",
		tip: "Banks earn on the spread. Rates set the pace.",
		riskPillX: 150,
		riskCopy: "Moderate volatility. Sits mid-range for your profile.",
		stats: [
			DetailStat(label: "P/E ratio", value: "13.1", verdict: "Cheap", good: true, border: true),
			DetailStat(label: "Revenue growth", value: "8%", verdict: "Steady"),
			DetailStat(label: "Profit margin", value: "34%", verdict: "Strong"),
		],
		upside: "↑ 9.1% upside",
		targetLow: "$215", targetAvg: "$268", targetHigh: "$300", targetMarkerX: 132,
		consensus: "WALL ST. CONSENSUS · 26 ANALYSTS",
		buyCount: "● Buy 15", holdCount: "Hold 10", sellCount: "Sell 1", buyBarW: 183,
		actions: [
			("Morgan Stanley", "Buy", "$275"),
			("Wells Fargo", "Buy", "$290"),
			("Barclays", "Buy", "$270"),
			("UBS", "Hold", "$255"),
			("KBW", "Hold", "$250"),
		],
		newsClose: "▲ +0.4% at yesterday’s close",
		newsSignal: "Trading desks and card spending keep the bank ahead of a softer loan market.",
		newsEarnings: "Next earnings land \(StakClock.daysAhead(102)).",
		newsSources: [("Reuters · 6h ago", "Bullish"), ("WSJ · 1d ago", "Neutral")],
		newsHeadline: "JPMorgan tops estimates again as trading and card spending hold up",
		newsHeadline2: "JPMorgan lifts its net-interest income outlook for the year",
		peersLabel: "vs BAC · WFC",
		peerA: "BAC", peerB: "WFC",
		compareRows: [
			DetailCompareRow(label: "P/E ratio", a: "13.1", b: "13x", c: "14x"),
			DetailCompareRow(label: "Rev growth", a: "+8%", b: "+6%", c: "+2%", green: true),
			DetailCompareRow(label: "Profit margin", a: "34%", b: "26%", c: "24%"),
			DetailCompareRow(label: "Market cap", a: "$690B", b: "$350B", c: "$250B"),
		],
		sheetBadge: "J", sheetName: "JPMorgan", sheetPrice: "$245.60 today", sheetChange: "▲ 0.6%",
		buySpec: BuySpec(title: "Buy JPM?", badge: "J", name: "JPMorgan Chase", priceLine: "$245.60 today", change: "▲ 0.6%", cashBefore: "$8,800.00", cashAfter: "$8,775.00", shares: "0.1018", symbol: "JPM")
	),
	"V": DetailFacts(
		symbol: "V",
		title: "V · Visa Inc",
		price: "$352.10",
		change: "▲ 0.3% today",
		tip: "Visa takes a toll on every swipe. Fees rarely swing.",
		riskPillX: 88,
		riskCopy: "Low volatility. Fits the steady side of your profile.",
		stats: [
			DetailStat(label: "P/E ratio", value: "32.4", verdict: "In line"),
			DetailStat(label: "Revenue growth", value: "10%", verdict: "Healthy"),
			DetailStat(label: "Profit margin", value: "54%", verdict: "Exceptional", good: true, border: true),
		],
		upside: "↑ 9.3% upside",
		targetLow: "$320", targetAvg: "$385", targetHigh: "$420", targetMarkerX: 104,
		consensus: "WALL ST. CONSENSUS · 38 ANALYSTS",
		buyCount: "● Buy 31", holdCount: "Hold 7", sellCount: "Sell 0", buyBarW: 259,
		actions: [
			("Morgan Stanley", "Buy", "$400"),
			("Goldman Sachs", "Buy", "$395"),
			("BofA", "Buy", "$390"),
			("Mizuho", "Hold", "$360"),
			("Piper Sandler", "Hold", "$355"),
		],
		newsClose: "▲ +0.5% at yesterday’s close",
		newsSignal: "Cross-border travel volume keeps payment growth running in double digits.",
		newsEarnings: "Next earnings land \(StakClock.daysAhead(116)).",
		newsSources: [("Bloomberg · 7h ago", "Bullish"), ("CNBC · 1d ago", "Neutral")],
		newsHeadline: "Visa keeps growing at a double-digit clip as cross-border spending holds",
		newsHeadline2: "Visa's cross-border volumes climb as travel stays strong",
		peersLabel: "vs MA · AXP",
		peerA: "MA", peerB: "AXP",
		compareRows: [
			DetailCompareRow(label: "P/E ratio", a: "32.4", b: "36x", c: "20x"),
			DetailCompareRow(label: "Rev growth", a: "+10%", b: "+14%", c: "+9%", green: true),
			DetailCompareRow(label: "Profit margin", a: "54%", b: "45%", c: "15%"),
			DetailCompareRow(label: "Market cap", a: "$706B", b: "$500B", c: "$220B"),
		],
		sheetBadge: "V", sheetName: "Visa", sheetPrice: "$352.10 today", sheetChange: "▲ 0.3%",
		buySpec: BuySpec(title: "Buy V?", badge: "V", name: "Visa", priceLine: "$352.10 today", change: "▲ 0.3%", cashBefore: "$8,800.00", cashAfter: "$8,775.00", shares: "0.0710", symbol: "V")
	),
	"GS": DetailFacts(
		symbol: "GS",
		title: "GS · Goldman Sachs Group",
		price: "$612.40",
		change: "▼ 0.5% today",
		tip: "Deal fees come in waves. Expect lumpy quarters.",
		riskPillX: 150,
		riskCopy: "Moderate volatility. Sits mid-range for your profile.",
		stats: [
			DetailStat(label: "P/E ratio", value: "15.2", verdict: "Cheap", good: true, border: true),
			DetailStat(label: "Revenue growth", value: "12%", verdict: "Healthy"),
			DetailStat(label: "Profit margin", value: "27%", verdict: "Strong"),
		],
		upside: "↑ 6.1% upside",
		targetLow: "$540", targetAvg: "$650", targetHigh: "$720", targetMarkerX: 162,
		consensus: "WALL ST. CONSENSUS · 27 ANALYSTS",
		buyCount: "● Buy 16", holdCount: "Hold 10", sellCount: "Sell 1", buyBarW: 188,
		actions: [
			("Morgan Stanley", "Buy", "$680"),
			("Wells Fargo", "Buy", "$700"),
			("BofA", "Buy", "$660"),
			("UBS", "Hold", "$620"),
			("HSBC", "Hold", "$600"),
		],
		newsClose: "▼ -0.7% at yesterday’s close",
		newsSignal: "A reopening deal calendar is refilling the investment-banking pipeline.",
		newsEarnings: "Next earnings land \(StakClock.daysAhead(103)).",
		newsSources: [("Reuters · 5h ago", "Neutral"), ("FT · 14h ago", "Bullish")],
		newsHeadline: "Goldman rides a deal-making rebound as advisory fees climb",
		newsHeadline2: "Goldman's IPO pipeline fills up as issuers return",
		peersLabel: "vs MS · JPM",
		peerA: "MS", peerB: "JPM",
		compareRows: [
			DetailCompareRow(label: "P/E ratio", a: "15.2", b: "16x", c: "13x"),
			DetailCompareRow(label: "Rev growth", a: "+12%", b: "+11%", c: "+8%", green: true),
			DetailCompareRow(label: "Profit margin", a: "27%", b: "22%", c: "34%"),
			DetailCompareRow(label: "Market cap", a: "$189B", b: "$220B", c: "$690B"),
		],
		sheetBadge: "G", sheetName: "Goldman Sachs", sheetPrice: "$612.40 today", sheetChange: "▼ 0.5%",
		buySpec: BuySpec(title: "Buy GS?", badge: "G", name: "Goldman Sachs", priceLine: "$612.40 today", change: "▼ 0.5%", cashBefore: "$8,800.00", cashAfter: "$8,775.00", shares: "0.0408", symbol: "GS")
	),
	"ENPH": DetailFacts(
		symbol: "ENPH",
		title: "ENPH · Enphase Energy",
		price: "$78.40",
		change: "▲ 1.9% today",
		tip: "Solar rides policy and rates. Expect sharp moves.",
		riskPillX: 238,
		riskCopy: "High volatility. Fits the bolder side of your profile.",
		stats: [
			DetailStat(label: "P/E ratio", value: "38.6", verdict: "Rich"),
			DetailStat(label: "Revenue growth", value: "22%", verdict: "Rebounding", good: true, border: true),
			DetailStat(label: "Profit margin", value: "9.5%", verdict: "Thin"),
		],
		upside: "↑ 12.2% upside",
		targetLow: "$55", targetAvg: "$88", targetHigh: "$130", targetMarkerX: 98,
		consensus: "WALL ST. CONSENSUS · 34 ANALYSTS",
		buyCount: "● Buy 14", holdCount: "Hold 17", sellCount: "Sell 3", buyBarW: 131,
		actions: [
			("Goldman Sachs", "Buy", "$95"),
			("Jefferies", "Buy", "$100"),
			("Morgan Stanley", "Hold", "$80"),
			("Barclays", "Hold", "$75"),
			("BofA", "Sell", "$60"),
		],
		newsClose: "▲ +2.3% at yesterday’s close",
		newsSignal: "Battery attach rates are climbing as home-storage demand builds ahead of credit changes.",
		newsEarnings: "Next earnings land \(StakClock.daysAhead(116)).",
		newsSources: [("Yahoo · 3h ago", "Neutral"), ("CNBC · 9h ago", "Bullish")],
		newsHeadline: "Enphase bounces as battery orders pick up in a shaky solar market",
		newsHeadline2: "Enphase guides to a rebound as installers work through inventory",
		peersLabel: "vs SEDG · FSLR",
		peerA: "SEDG", peerB: "FSLR",
		compareRows: [
			DetailCompareRow(label: "P/E ratio", a: "38.6", b: "n/m", c: "18x"),
			DetailCompareRow(label: "Rev growth", a: "+22%", b: "-14%", c: "+26%", green: true),
			DetailCompareRow(label: "Profit margin", a: "9.5%", b: "n/m", c: "31%"),
			DetailCompareRow(label: "Market cap", a: "$10.3B", b: "$1.2B", c: "$24.5B"),
		],
		sheetBadge: "E", sheetName: "Enphase", sheetPrice: "$78.40 today", sheetChange: "▲ 1.9%",
		buySpec: BuySpec(title: "Buy ENPH?", badge: "E", name: "Enphase Energy", priceLine: "$78.40 today", change: "▲ 1.9%", cashBefore: "$8,800.00", cashAfter: "$8,775.00", shares: "0.3189", symbol: "ENPH")
	),
	"NEE": DetailFacts(
		symbol: "NEE",
		title: "NEE · NextEra Energy",
		price: "$84.20",
		change: "▲ 0.4% today",
		tip: "Power bills get paid in every market. Slow mover.",
		riskPillX: 88,
		riskCopy: "Low volatility. Fits the steady side of your profile.",
		stats: [
			DetailStat(label: "P/E ratio", value: "22.7", verdict: "In line"),
			DetailStat(label: "Revenue growth", value: "9%", verdict: "Steady"),
			DetailStat(label: "Profit margin", value: "24%", verdict: "Excellent", good: true, border: true),
		],
		upside: "↑ 9.3% upside",
		targetLow: "$72", targetAvg: "$92", targetHigh: "$105", targetMarkerX: 139,
		consensus: "WALL ST. CONSENSUS · 22 ANALYSTS",
		buyCount: "● Buy 15", holdCount: "Hold 7", sellCount: "Sell 0", buyBarW: 216,
		actions: [
			("Morgan Stanley", "Buy", "$95"),
			("Wells Fargo", "Buy", "$94"),
			("BofA", "Buy", "$92"),
			("UBS", "Hold", "$85"),
			("Jefferies", "Hold", "$84"),
		],
		newsClose: "▲ +0.6% at yesterday’s close",
		newsSignal: "Data-center power deals are adding to a renewables backlog that already runs for years.",
		newsEarnings: "Next earnings land \(StakClock.daysAhead(111)).",
		newsSources: [("Reuters · 8h ago", "Bullish"), ("Bloomberg · 1d ago", "Neutral")],
		newsHeadline: "NextEra signs more data-center power deals as its renewables backlog swells",
		newsHeadline2: "NextEra's storage build-out hits a record quarter",
		peersLabel: "vs DUK · SO",
		peerA: "DUK", peerB: "SO",
		compareRows: [
			DetailCompareRow(label: "P/E ratio", a: "22.7", b: "19x", c: "20x"),
			DetailCompareRow(label: "Rev growth", a: "+9%", b: "+5%", c: "+7%", green: true),
			DetailCompareRow(label: "Profit margin", a: "24%", b: "15%", c: "16%"),
			DetailCompareRow(label: "Market cap", a: "$173B", b: "$95B", c: "$100B"),
		],
		sheetBadge: "N", sheetName: "NextEra", sheetPrice: "$84.20 today", sheetChange: "▲ 0.4%",
		buySpec: BuySpec(title: "Buy NEE?", badge: "N", name: "NextEra Energy", priceLine: "$84.20 today", change: "▲ 0.4%", cashBefore: "$8,800.00", cashAfter: "$8,775.00", shares: "0.2969", symbol: "NEE")
	),
	"FSLR": DetailFacts(
		symbol: "FSLR",
		title: "FSLR · First Solar Inc",
		price: "$228.90",
		change: "▼ 1.1% today",
		tip: "Policy headlines move solar. Size the stake small.",
		riskPillX: 238,
		riskCopy: "High volatility. Fits the bolder side of your profile.",
		stats: [
			DetailStat(label: "P/E ratio", value: "17.8", verdict: "Cheaper", good: true, border: true),
			DetailStat(label: "Revenue growth", value: "26%", verdict: "Fast"),
			DetailStat(label: "Profit margin", value: "31%", verdict: "Strong"),
		],
		upside: "↑ 18.0% upside",
		targetLow: "$180", targetAvg: "$270", targetHigh: "$330", targetMarkerX: 108,
		consensus: "WALL ST. CONSENSUS · 32 ANALYSTS",
		buyCount: "● Buy 25", holdCount: "Hold 6", sellCount: "Sell 1", buyBarW: 248,
		actions: [
			("Jefferies", "Buy", "$290"),
			("Goldman Sachs", "Buy", "$280"),
			("UBS", "Buy", "$275"),
			("Morgan Stanley", "Buy", "$265"),
			("BofA", "Hold", "$230"),
		],
		newsClose: "▼ -1.4% at yesterday’s close",
		newsSignal: "Tariff rulings on imported panels keep swinging the stock week to week.",
		newsEarnings: "Next earnings land \(StakClock.daysAhead(118)).",
		newsSources: [("Reuters · 4h ago", "Neutral"), ("WSJ · 12h ago", "Bullish")],
		newsHeadline: "First Solar slips as a tariff ruling clouds the outlook for imported panels",
		newsHeadline2: "First Solar books more U.S. capacity as tariffs bite imports",
		peersLabel: "vs ENPH · NEE",
		peerA: "ENPH", peerB: "NEE",
		compareRows: [
			DetailCompareRow(label: "P/E ratio", a: "17.8", b: "39x", c: "23x"),
			DetailCompareRow(label: "Rev growth", a: "+26%", b: "+22%", c: "+9%", green: true),
			DetailCompareRow(label: "Profit margin", a: "31%", b: "9.5%", c: "24%"),
			DetailCompareRow(label: "Market cap", a: "$24.5B", b: "$10.3B", c: "$173B"),
		],
		sheetBadge: "F", sheetName: "First Solar", sheetPrice: "$228.90 today", sheetChange: "▼ 1.1%",
		buySpec: BuySpec(title: "Buy FSLR?", badge: "F", name: "First Solar", priceLine: "$228.90 today", change: "▼ 1.1%", cashBefore: "$8,800.00", cashAfter: "$8,775.00", shares: "0.1092", symbol: "FSLR")
	),
	"PLD": DetailFacts(
		symbol: "PLD",
		title: "PLD · Prologis Inc",
		price: "$118.30",
		change: "▲ 0.2% today",
		tip: "Rent arrives monthly. Landlords move gently.",
		riskPillX: 150,
		riskCopy: "Moderate volatility. Sits mid-range for your profile.",
		stats: [
			DetailStat(label: "P/E ratio", value: "27.9", verdict: "In line"),
			DetailStat(label: "Revenue growth", value: "9%", verdict: "Steady"),
			DetailStat(label: "Profit margin", value: "45%", verdict: "Excellent", good: true, border: true),
		],
		upside: "↑ 9.9% upside",
		targetLow: "$100", targetAvg: "$130", targetHigh: "$150", targetMarkerX: 136,
		consensus: "WALL ST. CONSENSUS · 24 ANALYSTS",
		buyCount: "● Buy 17", holdCount: "Hold 7", sellCount: "Sell 0", buyBarW: 225,
		actions: [
			("Morgan Stanley", "Buy", "$135"),
			("BofA", "Buy", "$132"),
			("Evercore ISI", "Buy", "$130"),
			("Wells Fargo", "Hold", "$120"),
			("Mizuho", "Hold", "$118"),
		],
		newsClose: "▲ +0.3% at yesterday’s close",
		newsSignal: "Warehouse leasing is firming as tenants sign again after a slow stretch.",
		newsEarnings: "Next earnings land \(StakClock.daysAhead(103)).",
		newsSources: [("Bloomberg · 6h ago", "Neutral"), ("Reuters · 1d ago", "Bullish")],
		newsHeadline: "Prologis lifts its outlook as warehouse leasing steadies",
		newsHeadline2: "Prologis leases fill faster as e-commerce demand firms",
		peersLabel: "vs O · AMT",
		peerA: "O", peerB: "AMT",
		compareRows: [
			DetailCompareRow(label: "P/E ratio", a: "27.9", b: "54x", c: "40x"),
			DetailCompareRow(label: "Rev growth", a: "+9%", b: "+14%", c: "+5%", green: true),
			DetailCompareRow(label: "Profit margin", a: "45%", b: "17%", c: "25%"),
			DetailCompareRow(label: "Market cap", a: "$110B", b: "$53.2B", c: "$100B"),
		],
		sheetBadge: "P", sheetName: "Prologis", sheetPrice: "$118.30 today", sheetChange: "▲ 0.2%",
		buySpec: BuySpec(title: "Buy PLD?", badge: "P", name: "Prologis", priceLine: "$118.30 today", change: "▲ 0.2%", cashBefore: "$8,800.00", cashAfter: "$8,775.00", shares: "0.2113", symbol: "PLD")
	),
	"O": DetailFacts(
		symbol: "O",
		title: "O · Realty Income Corp",
		price: "$59.10",
		change: "▼ 0.3% today",
		tip: "Built for the monthly dividend, not big price moves.",
		riskPillX: 88,
		riskCopy: "Low volatility. Fits the steady side of your profile.",
		stats: [
			DetailStat(label: "P/E ratio", value: "54.3", verdict: "Rich"),
			DetailStat(label: "Revenue growth", value: "14%", verdict: "Healthy", good: true, border: true),
			DetailStat(label: "Profit margin", value: "17%", verdict: "Modest"),
		],
		upside: "↑ 6.6% upside",
		targetLow: "$54", targetAvg: "$63", targetHigh: "$70", targetMarkerX: 103,
		consensus: "WALL ST. CONSENSUS · 20 ANALYSTS",
		buyCount: "● Buy 8", holdCount: "Hold 12", sellCount: "Sell 0", buyBarW: 127,
		actions: [
			("Morgan Stanley", "Buy", "$66"),
			("Stifel", "Buy", "$65"),
			("RBC", "Hold", "$62"),
			("Mizuho", "Hold", "$61"),
			("Wells Fargo", "Hold", "$60"),
		],
		newsClose: "▼ -0.2% at yesterday’s close",
		newsSignal: "Monthly dividend hikes keep coming as rate-cut hopes lift REITs.",
		newsEarnings: "Next earnings land \(StakClock.daysAhead(122)).",
		newsSources: [("Yahoo · 5h ago", "Neutral"), ("CNBC · 1d ago", "Bullish")],
		newsHeadline: "Realty Income raises its monthly dividend again as rate hopes lift REITs",
		newsHeadline2: "Realty Income adds another European portfolio to its rent roll",
		peersLabel: "vs PLD · SPG",
		peerA: "PLD", peerB: "SPG",
		compareRows: [
			DetailCompareRow(label: "P/E ratio", a: "54.3", b: "28x", c: "22x"),
			DetailCompareRow(label: "Rev growth", a: "+14%", b: "+9%", c: "+4%", green: true),
			DetailCompareRow(label: "Profit margin", a: "17%", b: "45%", c: "35%"),
			DetailCompareRow(label: "Market cap", a: "$53.2B", b: "$110B", c: "$60B"),
		],
		sheetBadge: "O", sheetName: "Realty Income", sheetPrice: "$59.10 today", sheetChange: "▼ 0.3%",
		buySpec: BuySpec(title: "Buy O?", badge: "O", name: "Realty Income", priceLine: "$59.10 today", change: "▼ 0.3%", cashBefore: "$8,800.00", cashAfter: "$8,775.00", shares: "0.4230", symbol: "O")
	),
	"LLY": DetailFacts(
		symbol: "LLY",
		title: "LLY · Eli Lilly and Co",
		price: "$792.50",
		change: "▲ 1.4% today",
		tip: "Blockbuster drugs grow fast. The price expects it.",
		riskPillX: 150,
		riskCopy: "Moderate volatility. Sits mid-range for your profile.",
		stats: [
			DetailStat(label: "P/E ratio", value: "63.4", verdict: "Rich"),
			DetailStat(label: "Revenue growth", value: "38%", verdict: "Explosive", good: true, border: true),
			DetailStat(label: "Profit margin", value: "24%", verdict: "Strong"),
		],
		upside: "↑ 16.1% upside",
		targetLow: "$680", targetAvg: "$920", targetHigh: "$1,050", targetMarkerX: 92,
		consensus: "WALL ST. CONSENSUS · 28 ANALYSTS",
		buyCount: "● Buy 24", holdCount: "Hold 4", sellCount: "Sell 0", buyBarW: 272,
		actions: [
			("Morgan Stanley", "Buy", "$950"),
			("BofA", "Buy", "$940"),
			("Goldman Sachs", "Buy", "$920"),
			("JPMorgan", "Buy", "$910"),
			("Bernstein", "Hold", "$800"),
		],
		newsClose: "▲ +1.1% at yesterday’s close",
		newsSignal: "The weight-loss pill is heading toward a decision that could open a much larger market.",
		newsEarnings: "Next earnings land \(StakClock.daysAhead(118)).",
		newsSources: [("Reuters · 2h ago", "Bullish"), ("CNBC · 10h ago", "Neutral")],
		newsHeadline: "Eli Lilly climbs as its oral weight-loss pill nears a decision",
		newsHeadline2: "Lilly's weight-loss pill moves closer to a filing",
		peersLabel: "vs NVO · JNJ",
		peerA: "NVO", peerB: "JNJ",
		compareRows: [
			DetailCompareRow(label: "P/E ratio", a: "63.4", b: "15x", c: "17x"),
			DetailCompareRow(label: "Rev growth", a: "+38%", b: "+18%", c: "+5%", green: true),
			DetailCompareRow(label: "Profit margin", a: "24%", b: "35%", c: "25%"),
			DetailCompareRow(label: "Market cap", a: "$752B", b: "$300B", c: "$391B"),
		],
		sheetBadge: "L", sheetName: "Eli Lilly", sheetPrice: "$792.50 today", sheetChange: "▲ 1.4%",
		buySpec: BuySpec(title: "Buy LLY?", badge: "L", name: "Eli Lilly", priceLine: "$792.50 today", change: "▲ 1.4%", cashBefore: "$8,800.00", cashAfter: "$8,775.00", shares: "0.0315", symbol: "LLY")
	),
	"UNH": DetailFacts(
		symbol: "UNH",
		title: "UNH · UnitedHealth Group",
		price: "$318.70",
		change: "▼ 0.8% today",
		tip: "A thin slice of a huge pie. Cost surprises bite.",
		riskPillX: 150,
		riskCopy: "Moderate volatility. Sits mid-range for your profile.",
		stats: [
			DetailStat(label: "P/E ratio", value: "13.7", verdict: "Cheap", good: true, border: true),
			DetailStat(label: "Revenue growth", value: "9%", verdict: "Steady"),
			DetailStat(label: "Profit margin", value: "4.2%", verdict: "Thin"),
		],
		upside: "↑ 13.0% upside",
		targetLow: "$260", targetAvg: "$360", targetHigh: "$440", targetMarkerX: 108,
		consensus: "WALL ST. CONSENSUS · 26 ANALYSTS",
		buyCount: "● Buy 17", holdCount: "Hold 8", sellCount: "Sell 1", buyBarW: 207,
		actions: [
			("Morgan Stanley", "Buy", "$380"),
			("Goldman Sachs", "Buy", "$370"),
			("Barclays", "Buy", "$365"),
			("Mizuho", "Hold", "$330"),
			("Raymond James", "Hold", "$320"),
		],
		newsClose: "▼ -1.0% at yesterday’s close",
		newsSignal: "Medical-cost trends are still running hot, and the new CEO is resetting expectations.",
		newsEarnings: "Next earnings land \(StakClock.daysAhead(102)).",
		newsSources: [("WSJ · 4h ago", "Bearish"), ("Reuters · 9h ago", "Neutral")],
		newsHeadline: "UnitedHealth slides again as medical costs keep climbing",
		newsHeadline2: "UnitedHealth trims its outlook as medical costs stay high",
		peersLabel: "vs ELV · CI",
		peerA: "ELV", peerB: "CI",
		compareRows: [
			DetailCompareRow(label: "P/E ratio", a: "13.7", b: "11x", c: "12x"),
			DetailCompareRow(label: "Rev growth", a: "+9%", b: "+7%", c: "+6%", green: true),
			DetailCompareRow(label: "Profit margin", a: "4.2%", b: "3.0%", c: "3.6%"),
			DetailCompareRow(label: "Market cap", a: "$289B", b: "$70B", c: "$85B"),
		],
		sheetBadge: "U", sheetName: "UnitedHealth", sheetPrice: "$318.70 today", sheetChange: "▼ 0.8%",
		buySpec: BuySpec(title: "Buy UNH?", badge: "U", name: "UnitedHealth", priceLine: "$318.70 today", change: "▼ 0.8%", cashBefore: "$8,800.00", cashAfter: "$8,775.00", shares: "0.0784", symbol: "UNH")
	),
	"JNJ": DetailFacts(
		symbol: "JNJ",
		title: "JNJ · Johnson & Johnson",
		price: "$162.40",
		change: "▲ 0.5% today",
		tip: "Band-Aids to cancer drugs. The spread stays calm.",
		riskPillX: 88,
		riskCopy: "Low volatility. Fits the steady side of your profile.",
		stats: [
			DetailStat(label: "P/E ratio", value: "16.9", verdict: "In line"),
			DetailStat(label: "Revenue growth", value: "5%", verdict: "Slower"),
			DetailStat(label: "Profit margin", value: "25%", verdict: "Excellent", good: true, border: true),
		],
		upside: "↑ 7.8% upside",
		targetLow: "$150", targetAvg: "$175", targetHigh: "$190", targetMarkerX: 96,
		consensus: "WALL ST. CONSENSUS · 25 ANALYSTS",
		buyCount: "● Buy 12", holdCount: "Hold 13", sellCount: "Sell 0", buyBarW: 152,
		actions: [
			("Morgan Stanley", "Buy", "$180"),
			("Goldman Sachs", "Buy", "$178"),
			("UBS", "Hold", "$168"),
			("Wells Fargo", "Hold", "$165"),
			("Barclays", "Hold", "$160"),
		],
		newsClose: "▲ +0.4% at yesterday’s close",
		newsSignal: "New drug launches are offsetting the Stelara patent cliff faster than expected.",
		newsEarnings: "Next earnings land \(StakClock.daysAhead(102)).",
		newsSources: [("Reuters · 7h ago", "Neutral"), ("Bloomberg · 1d ago", "Bullish")],
		newsHeadline: "J&J raises its forecast as new drugs outrun the Stelara patent cliff",
		newsHeadline2: "J&J's oncology pipeline carries the quarter",
		peersLabel: "vs PFE · LLY",
		peerA: "PFE", peerB: "LLY",
		compareRows: [
			DetailCompareRow(label: "P/E ratio", a: "16.9", b: "13x", c: "63x"),
			DetailCompareRow(label: "Rev growth", a: "+5%", b: "+2%", c: "+38%", green: true),
			DetailCompareRow(label: "Profit margin", a: "25%", b: "13%", c: "24%"),
			DetailCompareRow(label: "Market cap", a: "$391B", b: "$144B", c: "$752B"),
		],
		sheetBadge: "J", sheetName: "J&J", sheetPrice: "$162.40 today", sheetChange: "▲ 0.5%",
		buySpec: BuySpec(title: "Buy JNJ?", badge: "J", name: "Johnson & Johnson", priceLine: "$162.40 today", change: "▲ 0.5%", cashBefore: "$8,800.00", cashAfter: "$8,775.00", shares: "0.1539", symbol: "JNJ")
	),
	"PFE": DetailFacts(
		symbol: "PFE",
		title: "PFE · Pfizer Inc",
		price: "$25.30",
		change: "▼ 0.2% today",
		tip: "Fat dividend, slow grind. Patience is the trade.",
		riskPillX: 88,
		riskCopy: "Low volatility. Fits the steady side of your profile.",
		stats: [
			DetailStat(label: "P/E ratio", value: "13.2", verdict: "Cheap", good: true, border: true),
			DetailStat(label: "Revenue growth", value: "2%", verdict: "Flat"),
			DetailStat(label: "Profit margin", value: "13%", verdict: "Modest"),
		],
		upside: "↑ 10.7% upside",
		targetLow: "$23", targetAvg: "$28", targetHigh: "$33", targetMarkerX: 40,
		consensus: "WALL ST. CONSENSUS · 24 ANALYSTS",
		buyCount: "● Buy 9", holdCount: "Hold 14", sellCount: "Sell 1", buyBarW: 119,
		actions: [
			("BofA", "Buy", "$30"),
			("Leerink Partners", "Buy", "$29"),
			("Morgan Stanley", "Hold", "$27"),
			("UBS", "Hold", "$27"),
			("Goldman Sachs", "Hold", "$26"),
		],
		newsClose: "▼ -0.4% at yesterday’s close",
		newsSignal: "Cost cuts are holding up profit while the post-Covid revenue reset plays out.",
		newsEarnings: "Next earnings land \(StakClock.daysAhead(123)).",
		newsSources: [("Yahoo · 6h ago", "Neutral"), ("Reuters · 1d ago", "Neutral")],
		newsHeadline: "Pfizer leans on cost cuts as Covid sales keep fading",
		newsHeadline2: "Pfizer pushes deeper into obesity with a new deal",
		peersLabel: "vs MRK · JNJ",
		peerA: "MRK", peerB: "JNJ",
		compareRows: [
			DetailCompareRow(label: "P/E ratio", a: "13.2", b: "12x", c: "17x"),
			DetailCompareRow(label: "Rev growth", a: "+2%", b: "+3%", c: "+5%", green: true),
			DetailCompareRow(label: "Profit margin", a: "13%", b: "27%", c: "25%"),
			DetailCompareRow(label: "Market cap", a: "$144B", b: "$210B", c: "$391B"),
		],
		sheetBadge: "P", sheetName: "Pfizer", sheetPrice: "$25.30 today", sheetChange: "▼ 0.2%",
		buySpec: BuySpec(title: "Buy PFE?", badge: "P", name: "Pfizer", priceLine: "$25.30 today", change: "▼ 0.2%", cashBefore: "$8,800.00", cashAfter: "$8,775.00", shares: "0.9881", symbol: "PFE")
	),
	"COST": DetailFacts(
		symbol: "COST",
		title: "COST · Costco Wholesale Corp",
		price: "$947.20",
		change: "▲ 0.7% today",
		tip: "Pay yearly, shop weekly. Boring on purpose.",
		riskPillX: 88,
		riskCopy: "Low volatility. Fits the steady side of your profile.",
		stats: [
			DetailStat(label: "P/E ratio", value: "52.1", verdict: "Rich"),
			DetailStat(label: "Revenue growth", value: "8.1%", verdict: "Reliable", good: true, border: true),
			DetailStat(label: "Profit margin", value: "2.9%", verdict: "Thin"),
		],
		upside: "↓ 2.3% downside",
		targetLow: "$800", targetAvg: "$925", targetHigh: "$1,080", targetMarkerX: 249,
		consensus: "WALL ST. CONSENSUS · 36 ANALYSTS",
		buyCount: "● Buy 20", holdCount: "Hold 15", sellCount: "Sell 1", buyBarW: 176,
		actions: [
			("BofA", "Buy", "$1,020"),
			("Morgan Stanley", "Buy", "$1,000"),
			("Jefferies", "Buy", "$980"),
			("Wells Fargo", "Hold", "$920"),
			("UBS", "Hold", "$900"),
		],
		newsClose: "▲ +0.5% at yesterday’s close",
		newsSignal: "Membership renewals and monthly sales are still running ahead of the rest of retail.",
		newsEarnings: "Next earnings land \(StakClock.daysAhead(83)).",
		newsSources: [("CNBC · 5h ago", "Bullish"), ("Bloomberg · 1d ago", "Neutral")],
		newsHeadline: "Costco posts another strong sales month as memberships keep renewing",
		newsHeadline2: "Costco's membership renewals hit a fresh high",
		peersLabel: "vs WMT · TGT",
		peerA: "WMT", peerB: "TGT",
		compareRows: [
			DetailCompareRow(label: "P/E ratio", a: "52.1", b: "38x", c: "13x"),
			DetailCompareRow(label: "Rev growth", a: "+8.1%", b: "+5%", c: "-2%", green: true),
			DetailCompareRow(label: "Profit margin", a: "2.9%", b: "2.9%", c: "3.7%"),
			DetailCompareRow(label: "Market cap", a: "$420B", b: "$800B", c: "$45B"),
		],
		sheetBadge: "C", sheetName: "Costco", sheetPrice: "$947.20 today", sheetChange: "▲ 0.7%",
		buySpec: BuySpec(title: "Buy COST?", badge: "C", name: "Costco Wholesale", priceLine: "$947.20 today", change: "▲ 0.7%", cashBefore: "$8,800.00", cashAfter: "$8,775.00", shares: "0.0264", symbol: "COST")
	),
	"NKE": DetailFacts(
		symbol: "NKE",
		title: "NKE · Nike Inc",
		price: "$72.80",
		change: "▼ 1.3% today",
		tip: "Brand turnarounds take seasons, not weeks.",
		riskPillX: 150,
		riskCopy: "Moderate volatility. Sits mid-range for your profile.",
		stats: [
			DetailStat(label: "P/E ratio", value: "33.6", verdict: "Rich"),
			DetailStat(label: "Revenue growth", value: "1%", verdict: "Turning", good: true, border: true),
			DetailStat(label: "Profit margin", value: "7.1%", verdict: "Thin"),
		],
		upside: "↑ 9.9% upside",
		targetLow: "$55", targetAvg: "$80", targetHigh: "$100", targetMarkerX: 157,
		consensus: "WALL ST. CONSENSUS · 35 ANALYSTS",
		buyCount: "● Buy 18", holdCount: "Hold 15", sellCount: "Sell 2", buyBarW: 163,
		actions: [
			("Jefferies", "Buy", "$90"),
			("Morgan Stanley", "Buy", "$85"),
			("Goldman Sachs", "Buy", "$82"),
			("UBS", "Hold", "$70"),
			("Barclays", "Hold", "$68"),
		],
		newsClose: "▼ -1.6% at yesterday’s close",
		newsSignal: "The turnaround is showing up in wholesale orders before it shows up in sales.",
		newsEarnings: "Next earnings land \(StakClock.daysAhead(88)).",
		newsSources: [("WSJ · 3h ago", "Neutral"), ("CNBC · 12h ago", "Bearish")],
		newsHeadline: "Nike slips as tariff costs weigh on a turnaround that is only starting",
		newsHeadline2: "Nike's turnaround shows early signs in running",
		peersLabel: "vs LULU · DECK",
		peerA: "LULU", peerB: "DECK",
		compareRows: [
			DetailCompareRow(label: "P/E ratio", a: "33.6", b: "15x", c: "18x"),
			DetailCompareRow(label: "Rev growth", a: "+1%", b: "+7%", c: "+16%", green: true),
			DetailCompareRow(label: "Profit margin", a: "7.1%", b: "17%", c: "19%"),
			DetailCompareRow(label: "Market cap", a: "$108B", b: "$25B", c: "$17B"),
		],
		sheetBadge: "N", sheetName: "Nike", sheetPrice: "$72.80 today", sheetChange: "▼ 1.3%",
		buySpec: BuySpec(title: "Buy NKE?", badge: "N", name: "Nike", priceLine: "$72.80 today", change: "▼ 1.3%", cashBefore: "$8,800.00", cashAfter: "$8,775.00", shares: "0.3434", symbol: "NKE")
	),
]

/// "Up 1.2% today" for "▲ 1.2% today" - what VoiceOver reads instead of the arrow.
private func spokenMove(_ text: String) -> String {
	if text.hasPrefix("▲") { return "Up" + text.dropFirst() }
	if text.hasPrefix("▼") { return "Down" + text.dropFirst() }
	return text
}

/// True while the page has its saved sheet or practice ticket up - MainTabsView holds swipe back then.
struct PageOverlayOpenKey: PreferenceKey {
	static var defaultValue = false
	static func reduce(value: inout Bool, nextValue: () -> Bool) { value = value || nextValue() }
}
