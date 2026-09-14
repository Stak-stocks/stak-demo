import SwiftUI

/// Discover · Stock Detail (CHINEDU 1:2382 folded / 1:2579 open, save
/// success 92:969; My STAK entry 16:1012) — serves the TAPPED stock’s
/// DetailFacts (AAPL carries the authored values verbatim): price hero,
/// chart with range pills, Risk fit, Numbers that matter, expandable
/// Analyst view / Compare and learn, News signal, TIP and the CTAs.
/// Every authored metric is multiplied by `figmaUnit` (390px artboard).
/// Ported from android/ ui/discover/StockDetailScreen.kt.
private let card = Color(argb: 0xFF181F30)
private let bright = Color(argb: 0xFFF2F6FC)
private let muted = Color(argb: 0xFF819ABB)
private let green = Color(argb: 0xFF2FD08A)
/// Down moves (Codex parity audit 2026-09-04): the template only ever served up
/// tickers; the same red the Simulate rows use, keyed on the ▼ glyph.
private let red = Color(argb: 0xFFFF5A6A)
private let teal = Color(argb: 0xFF69B3CA)

struct StockDetailView: View {
	let onBack: () -> Void
	var fromMyStak: Bool = false
	/// The stock the page serves - deck taps route their card here (user,
	/// 2026-09-01: the NVIDIA card must open NVIDIA, not AAPL).
	var symbol: String = "AAPL"
	/// Authored exits raised to the shell (nil keeps the local fallback):
	/// success "View in My STAK" (92:969 / 71:949, the forward push), "Keep
	/// exploring" (deck dissolve 300), the Discover entry's "Practice buy"
	/// (1:2382, to the Simulate tab, Instant) and the open state's tab-bar
	/// SWAPs (1:2579).
	var onViewInMyStak: (() -> Void)? = nil
	var onKeepExploring: (() -> Void)? = nil
	var onPracticeBuyToSimulate: (() -> Void)? = nil
	var onTab: ((MainTab) -> Void)? = nil

	@State private var saved: Bool
	@State private var showSuccess = false
	@State private var showBuy = false
	/// Hoisted from AnalystCard - drives the 1:2579 tab bar and the fold
	/// back to 16:1012 when the buy receipt's Done fires.
	@State private var analystOpen = false
	/// The range pills select (user, 2026-09-05); "3M" keeps the authored SdChartLine (1:2382).
	@State private var range = "3M"

	init(
		onBack: @escaping () -> Void,
		fromMyStak: Bool = false,
		symbol: String = "AAPL",
		onViewInMyStak: (() -> Void)? = nil,
		onKeepExploring: (() -> Void)? = nil,
		onPracticeBuyToSimulate: (() -> Void)? = nil,
		onTab: ((MainTab) -> Void)? = nil
	) {
		self.onBack = onBack
		self.fromMyStak = fromMyStak
		self.symbol = symbol
		self.onViewInMyStak = onViewInMyStak
		self.onKeepExploring = onKeepExploring
		self.onPracticeBuyToSimulate = onPracticeBuyToSimulate
		self.onTab = onTab
		// Codex audit (2026-09-04): saved follows the holdings store, like the deck card.
		// The Discover entry follows THIS RUN's saves, like the deck's Save chip:
		// 1:2382/1:2579 author "Unsaved" for a stock My STAK already lists, and
		// the chip ruling (user, 2026-09-04) applies to the page it opens. The
		// seeded holdings made every designed card open "Saved". My STAK entry
		// opens saved. Mirrors android.
		self._saved = State(initialValue: fromMyStak || DeckSession.shared.saved.contains(symbol))
	}

	var body: some View {
		let u = figmaUnit
		let f = detailFactsFor(symbol)
		// Authored (1:2579): ONLY the Discover-entry open state composes the
		// shell tab bar (an authored inconsistency - matched per frame).
		let showsBar = !fromMyStak && analystOpen && onTab != nil
		ZStack {
			VStack(spacing: 0) {
				HStack {
					AuthBackCircle(action: onBack)
					Spacer()
					Text(f.symbol)
						.font(StakFont.sora(16 * u, .semiBold))
						.foregroundStyle(Color.white)
					Spacer()
					ZStack {
						Circle().fill(card)
						// 1:2382 authors the share glyph white; the News asset is #AEAEAE
						// (mirrors Android, 2026-09-05).
						Image("IcNewsShare")
							.renderingMode(.template)
							.resizable()
							.foregroundStyle(Color.white)
							.frame(width: 17 * u, height: 17 * u)
					}
					.frame(width: 40 * u, height: 40 * u)
				}
				.padding(.horizontal, 18 * u)
				.padding(.vertical, 8 * u)

				ScrollView(showsIndicators: false) {
					VStack(spacing: 0) {
						VStack(alignment: .leading, spacing: 4 * u) {
							Text(f.title)
								.font(StakFont.geist(11 * u))
								.foregroundStyle(muted)
							Text(f.price)
								.font(StakFont.sora(26 * u, .semiBold))
								.foregroundStyle(bright)
							Text(f.change)
								.font(StakFont.geist(12 * u, .medium))
								.foregroundStyle(f.change.hasPrefix("▼") ? red : green)
						}
						.frame(maxWidth: .infinity, alignment: .leading)
						.padding(.horizontal, 20 * u)
						.padding(.top, 10 * u)
						.padding(.bottom, 6 * u)

						RangeLineChart(range: range, tint: teal, authored: "SdChartLine", width: 345 * u, height: 76 * u)
						Spacer().frame(height: 40 * u)
						RangePills(selected: $range, tint: teal, muted: muted)

						VStack(spacing: 14 * u) {
							if fromMyStak {
								SinceYouSavedCard(f: f)
							}
							RiskFitCard(f: f)
							NumbersCard(f: f)
							AnalystCard(f: f, open: $analystOpen)
							NewsSignalCard(f: f)
							CompareCard(f: f)
							HStack(alignment: .top, spacing: 8 * u) {
								Text("TIP")
									.font(StakFont.geist(11 * u, .medium))
									.foregroundStyle(Color(argb: 0xFF5BD7E4))
								Text(f.tip)
									.font(StakFont.geist(11 * u))
									.foregroundStyle(muted)
									.frame(width: 260 * u, alignment: .leading)
								Spacer(minLength: 0)
							}
							.padding(.horizontal, 12 * u)
							.padding(.vertical, 10 * u)
							.background(card, in: RoundedRectangle(cornerRadius: 12 * u))
							// Related lesson (FigJam Discover board, 2026-09-14) - the sector's plain-English read.
							LessonCard(lesson: StockLessons.lessonFor(f.symbol))
						}
						.padding(.horizontal, 20 * u)
						.padding(.vertical, 12 * u)

						VStack(spacing: 10 * u) {
							if fromMyStak {
								DetailCta(text: "Practice buy") { showBuy = true }
								// Codex audit (2026-09-04): Unsave drops the stock from the
								// store so the Collection page and every count follow, then
								// the authored Back -> Collection, Instant (16:1012).
								// Mirrors android ui/discover/StockDetailScreen.kt.
								DetailSecondary(text: "Unsave") {
									// Unsave clears this run's deck save too (Codex review, PR #167).
									DeckSession.shared.saved.remove(f.symbol)
									MyStakHoldings.shared.remove(f.symbol); NewsSaves.shared.removeStories(ticker: f.symbol)
									onBack()
								}
							} else if saved {
								// A saved stock reads the same from every entry: the authored
								// saved block (16:1012) - Practice buy + Unsave. The "Saved to
								// My STAK" outline button was never in a frame (user, 2026-09-05).
								// Unsave drops the stock from this run's saves and the holdings
								// store and stays on the page with the Save CTA back. Mirrors android.
								DetailCta(text: "Practice buy", action: practiceBuy)
								DetailSecondary(text: "Unsave") {
									saved = false
									DeckSession.shared.saved.remove(f.symbol)
									MyStakHoldings.shared.remove(f.symbol); NewsSaves.shared.removeStories(ticker: f.symbol)
								}
							} else {
								// Authored (1:2382 -> 92:969, SMART_ANIMATE 350): the
								// save-success sheet scale-fades in like the News one.
								DetailCta(text: "Save") { withAnimation(.easeOut(duration: 0.35)) { showSuccess = true } }
								DetailSecondary(text: "Practice buy", action: practiceBuy)
							}
						}
						.padding(.horizontal, 20 * u)
						.padding(.top, 4 * u)
						.padding(.bottom, 16 * u)
					}
				}
				if showsBar {
					// Authored (1:2579): the 86-tall shell bar sits fixed at
					// the bottom of the viewport; its taps SWAP - pop the
					// detail instantly and land on the tapped tab.
					MainTabBar(selected: Binding<MainTab>(
						get: { .discover },
						set: { tapped in onTab?(tapped) }
					))
				}
			}
			.ignoresSafeArea(edges: showsBar ? .bottom : [])
			if showSuccess {
				DetailSavedSheet(
					f: f,
					// Unauthored scrim tap - keeps its instant dismiss-and-mark.
					// The scrim dismiss saves like the two CTAs do (Codex review, PR #167).
					onDismiss: { showSuccess = false; saved = true; DeckSession.shared.saved.insert(f.symbol); MyStakHoldings.shared.add(f.symbol) },
					// Authored (92:969): View in My STAK -> Overview, the
					// forward push; Keep exploring -> deck, dissolve 300 -
					// the stock is marked saved before the page leaves.
					onViewInMyStak: {
						saved = true
						DeckSession.shared.saved.insert(f.symbol)
						MyStakHoldings.shared.add(f.symbol)
						if let onViewInMyStak { onViewInMyStak() } else { showSuccess = false }
					},
					onKeepExploring: {
						saved = true
						DeckSession.shared.saved.insert(f.symbol)
						MyStakHoldings.shared.add(f.symbol)
						if let onKeepExploring { onKeepExploring() } else { showSuccess = false }
					}
				)
				// Authored entry (SMART_ANIMATE 350): the News sheet's
				// scale-in - 0.92 -> 1 + fade, 350 ease-out.
				.transition(.asymmetric(insertion: .scale(scale: 0.92).combined(with: .opacity), removal: .opacity))
			}
			if showBuy {
				DiscoverBuyFlow(
					spec: f.buySpec,
					onClose: { showBuy = false },
					filledSecondary: "Done", ticketSecondary: "Back",
					// Authored (71:949 / 71:994): View in My STAK -> Overview,
					// the forward push.
					onFilledPrimary: {
						if let onViewInMyStak { onViewInMyStak() } else { showBuy = false }
					},
					// Authored: Done -> the FOLDED detail (16:1012) - the
					// sheet fades 300 and the Analyst section closes.
					onFilledSecondary: {
						analystOpen = false
						withAnimation(.easeOut(duration: 0.3)) { showBuy = false }
					},
					// Authored (1:3423): the ticket's secondary -> detail,
					// DISSOLVE 300.
					onTicketSecondary: { withAnimation(.easeOut(duration: 0.3)) { showBuy = false } }
				)
				.transition(.opacity)
			}
		}
		.background(StakColors.bg.ignoresSafeArea())
	}

	/// Authored (1:2382): the Discover entry's Practice buy leaves the
	/// detail for the Simulate tab, Instant - not a ticket; only the
	/// My STAK entry raises the in-page ticket (16:1012).
	private func practiceBuy() {
		if !fromMyStak, let onPracticeBuyToSimulate, hopsToSimulate(symbol) {
			onPracticeBuyToSimulate()
		} else {
			showBuy = true
		}
	}
}

private struct DetailCta: View {
	let text: String
	let action: () -> Void

	var body: some View {
		let u = figmaUnit
		Button(action: action) {
			Text(text)
				.font(StakFont.geist(14 * u, .medium))
				.foregroundStyle(Color.white)
				.frame(maxWidth: .infinity)
				.frame(height: 52 * u)
				.background(discCtaGradient, in: RoundedRectangle(cornerRadius: 6 * u))
				.overlay(RoundedRectangle(cornerRadius: 6 * u).strokeBorder(StakColors.ctaBorderGradient, lineWidth: 0.36 * u))
		}
		.buttonStyle(.pressDim)
	}
}

/// Hairline secondary. The page CTA (1:2568) authors Sora 13; the save-success
/// sheet's "Keep exploring" (92:1205) authors Sora 14 - exact-design audit
/// 2026-09-04. `size` is declared last (memberwise order); callers pass it last.
private struct DetailSecondary: View {
	let text: String
	let action: () -> Void
	var size: CGFloat = 13

	var body: some View {
		let u = figmaUnit
		Button(action: action) {
			Text(text)
				.font(StakFont.sora(size * u))
				.foregroundStyle(muted)
				.frame(maxWidth: .infinity)
				.frame(height: 52 * u)
				.overlay(RoundedRectangle(cornerRadius: 6 * u).strokeBorder(Color(argb: 0x54343B4F), lineWidth: 0.36 * u))
		}
		.buttonStyle(.pressDim)
	}
}

/// Kicker label — Geist 10, tracking 0.8, muted. 1:2653 "PRICE TARGET RANGE"
/// authors Regular; the consensus / RECENT ACTIONS kickers (1:2668 / 1:2675)
/// author Medium - exact-design audit 2026-09-04. `weight` declared last.
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

private struct RiskFitCard: View {
	let f: DetailFacts

	var body: some View {
		let u = figmaUnit
		VStack(alignment: .leading, spacing: 12 * u) {
			// 1:2427 authors a 24-tall head row - exact-design audit 2026-09-04.
			HStack {
				Text("Risk fit")
					.font(StakFont.sora(15 * u, .semiBold))
					.foregroundStyle(bright)
				Spacer()
				Text(riskFitFor(f).0)
					.font(StakFont.geist(11 * u, .medium))
					.foregroundStyle(Color(argb: 0xFFA6E4F7))
					.padding(.horizontal, 10 * u)
					.padding(.vertical, 4 * u)
					.background(Color(argb: 0x1F5DA8BF), in: Capsule())
			}
			.frame(height: 24 * u)
			// Authored (1:2382): a lone 14x8 pill indicator - the frame draws no track.
			ZStack(alignment: .topLeading) {
				Color.clear.frame(height: 8 * u)
				RoundedRectangle(cornerRadius: 4 * u)
					.fill(Color(argb: 0xFFA6E4F7))
					.frame(width: 14 * u, height: 8 * u)
					.offset(x: f.riskPillX * u)
			}
			HStack {
				Text("Low").font(StakFont.geist(10 * u)).foregroundStyle(muted)
				Spacer()
				Text("High").font(StakFont.geist(10 * u)).foregroundStyle(muted)
			}
			Text(riskFitFor(f).1)
				.font(StakFont.geist(11 * u))
				.foregroundStyle(muted)
		}
		.padding(.horizontal, 16 * u)
		.padding(.vertical, 14 * u)
		.background(card, in: RoundedRectangle(cornerRadius: 16 * u))
	}
}

private struct NumbersCard: View {
	let f: DetailFacts

	var body: some View {
		let u = figmaUnit
		VStack(alignment: .leading, spacing: 12 * u) {
			Text("Numbers that matter")
				.font(StakFont.sora(15 * u, .semiBold))
				.foregroundStyle(bright)
			HStack(spacing: 8 * u) {
				ForEach(f.stats, id: \.label) { st in
					StatCell(label: st.label, value: st.value, verdict: st.verdict, verdictColor: st.good ? green : muted, border: st.border)
				}
			}
			Text("Tap a stat for sector and peer benchmarks")
				.font(StakFont.geist(10 * u))
				.foregroundStyle(muted)
		}
		.padding(.horizontal, 16 * u)
		.padding(.vertical, 14 * u)
		.background(card, in: RoundedRectangle(cornerRadius: 16 * u))
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
		.overlay(
			border
				? RoundedRectangle(cornerRadius: 12 * u).strokeBorder(Color(argb: 0xFF212D4B), lineWidth: 1 * u)
				: nil
		)
	}
}

/// Analyst view (collapsed 1:2454 / open 1:2651) — caret toggles; the open
/// flag is hoisted so the page can compose the 1:2579 tab bar and fold the
/// section when the buy receipt's Done lands on the folded frame (16:1012).
private struct AnalystCard: View {
	let f: DetailFacts
	@Binding var open: Bool

	var body: some View {
		let u = figmaUnit
		VStack(alignment: .leading, spacing: 12 * u) {
			// Collapsed head (1:2455) authors a 22-tall row - exact-design audit 2026-09-04.
			HStack {
				Text("Analyst view")
					.font(StakFont.sora(15 * u, .semiBold))
					.foregroundStyle(bright)
				Spacer()
				// The caret stays when the card is open, flipped into a drop-up so the user
				// sees it folds back (user, 2026-09-06); the open frames (1:2651 / 1:2719)
				// author none. Mirrors Android.
				Image("IcSdCaret")
					.resizable()
					.frame(width: 20 * u, height: 20 * u)
					.rotationEffect(.degrees(open ? 180 : 0))
			}
			.frame(height: open ? nil : 22 * u)
			if !open {
				Text(f.upside)
					.font(StakFont.geist(11 * u, .medium))
					.foregroundStyle(green)
			} else {
				Kicker(text: "PRICE TARGET RANGE", weight: .regular)
				// 1:2656: a 14 circle at y-3 inside the 8-tall clipped track renders as
				// a 14x8 cap over the 180 fill - exact-design audit 2026-09-04 (was 13).
				ZStack(alignment: .topLeading) {
					Color.clear.frame(height: 8 * u)
					RoundedRectangle(cornerRadius: 4 * u)
						.fill(Color(argb: 0x8C5DA8BF))
						.frame(width: 180 * u, height: 8 * u)
					RoundedRectangle(cornerRadius: 4 * u)
						.fill(Color(argb: 0xFFA6E4F7))
						.frame(width: 14 * u, height: 8 * u)
						.offset(x: f.targetMarkerX * u)
				}
				HStack {
					VStack(alignment: .leading, spacing: 1 * u) {
						Text("Low").font(StakFont.geist(10 * u)).foregroundStyle(muted)
						Text(f.targetLow).font(StakFont.geist(12 * u, .medium)).foregroundStyle(bright)
					}
					Spacer()
					VStack(spacing: 1 * u) {
						Text("Avg").font(StakFont.geist(10 * u)).foregroundStyle(muted)
						Text(f.targetAvg).font(StakFont.geist(12 * u, .medium)).foregroundStyle(bright)
					}
					Spacer()
					VStack(alignment: .trailing, spacing: 1 * u) {
						Text("High").font(StakFont.geist(10 * u)).foregroundStyle(muted)
						Text(f.targetHigh).font(StakFont.geist(12 * u, .medium)).foregroundStyle(bright)
					}
				}
				Text(f.upside)
					.font(StakFont.geist(11 * u, .medium))
					.foregroundStyle(green)
				Kicker(text: f.consensus)
				// 1:2669 authors the consensus track in the card's own #181F30 (the
				// render shows only the green fill) - exact-design audit 2026-09-04.
				ZStack(alignment: .leading) {
					RoundedRectangle(cornerRadius: 4 * u).fill(card).frame(height: 8 * u)
					RoundedRectangle(cornerRadius: 4 * u).fill(green).frame(width: f.buyBarW * u, height: 8 * u)
				}
				HStack {
					Text(f.buyCount).font(StakFont.geist(11 * u, .medium)).foregroundStyle(green)
					Spacer()
					Text(f.holdCount).font(StakFont.geist(11 * u, .medium)).foregroundStyle(muted)
					Spacer()
					Text(f.sellCount).font(StakFont.geist(11 * u, .medium)).foregroundStyle(muted)
				}
				Kicker(text: "RECENT ACTIONS")
				ForEach(
					f.actions,
					id: \.0
				) { name, action, target in
					HStack {
						Text(name).font(StakFont.geist(12 * u, .medium)).foregroundStyle(bright)
						Spacer()
						Text(action)
							.font(StakFont.geist(11 * u, .medium))
							.foregroundStyle(action == "Buy" ? green : muted)
						Spacer().frame(width: 10 * u)
						Text(target).font(StakFont.geist(12 * u, .medium)).foregroundStyle(bright)
					}
					.padding(.horizontal, 12 * u)
					.frame(height: 38 * u)
					// 1:2676..1:2696 author the rows in the card's own #181F30 (flat in
					// the render, no darker wells) - exact-design audit 2026-09-04.
					.background(card, in: RoundedRectangle(cornerRadius: 10 * u))
				}
			}
		}
		.padding(.horizontal, 16 * u)
		.padding(.vertical, 14 * u)
		.background(card, in: RoundedRectangle(cornerRadius: 16 * u))
		.contentShape(Rectangle())
		.onTapGesture { open.toggle() }
	}
}

private struct NewsSignalCard: View {
	let f: DetailFacts

	var body: some View {
		let u = figmaUnit
		VStack(alignment: .leading, spacing: 12 * u) {
			Text("News signal")
				.font(StakFont.sora(15 * u, .semiBold))
				.foregroundStyle(bright)
			Text(f.newsClose)
				.font(StakFont.geist(11 * u, .medium))
				.foregroundStyle(green)
			Text(f.newsSignal)
				.font(StakFont.geist(11 * u))
				.foregroundStyle(muted)
			Text(f.newsEarnings)
				.font(StakFont.geist(11 * u))
				.foregroundStyle(muted)
			ScrollView(.horizontal, showsIndicators: false) {
				HStack(spacing: 12 * u) {
					ForEach(f.newsSources, id: \.0) { src, tag in
						newsChip(source: src, tag: tag)
					}
				}
			}
		}
		.padding(.horizontal, 16 * u)
		.padding(.vertical, 14 * u)
		.background(card, in: RoundedRectangle(cornerRadius: 16 * u))
	}

	private func newsChip(source: String, tag: String) -> some View {
		let u = figmaUnit
		return VStack(alignment: .leading, spacing: 8 * u) {
			HStack {
				Text(source).font(StakFont.geist(10 * u)).foregroundStyle(muted)
				Spacer()
				Text(tag)
					.font(StakFont.geist(10 * u, .medium))
					.foregroundStyle(muted)
					.padding(.horizontal, 8 * u)
					.padding(.vertical, 3 * u)
					.background(Color(argb: 0x14FFFFFF), in: Capsule())
			}
			Text(source == f.newsSources.first?.0 ? f.newsHeadline : f.newsHeadline2)
				.font(StakFont.geist(12 * u))
				.foregroundStyle(bright)
				.frame(width: 173 * u, alignment: .leading)
		}
		.padding(12 * u)
		.frame(width: 205 * u, alignment: .leading)
		.background(card, in: RoundedRectangle(cornerRadius: 12 * u))
	}
}

/// Compare and learn (collapsed 1:2526 / open 1:2719) — peer table.
private struct CompareCard: View {
	let f: DetailFacts

	@State private var open = false

	var body: some View {
		let u = figmaUnit
		// Both states author a 23 gap under the title (1:2526 / 1:2719); the open
		// table and its footnote sit 21 apart (1:2723) - exact-design audit 2026-09-04.
		VStack(alignment: .leading, spacing: 23 * u) {
			// Collapsed head (1:2527) authors a 22-tall row - exact-design audit 2026-09-04.
			HStack {
				Text("Compare and learn")
					.font(StakFont.sora(15 * u, .semiBold))
					.foregroundStyle(bright)
				Spacer()
				// The caret stays when the card is open, flipped into a drop-up so the user
				// sees it folds back (user, 2026-09-06); the open frames (1:2651 / 1:2719)
				// author none. Mirrors Android.
				Image("IcSdCaret")
					.resizable()
					.frame(width: 20 * u, height: 20 * u)
					.rotationEffect(.degrees(open ? 180 : 0))
			}
			.frame(height: open ? nil : 22 * u)
			if !open {
				// 1:2531 authors Geist Regular - exact-design audit 2026-09-04 (was Medium).
				Text(f.peersLabel)
					.font(StakFont.geist(11 * u))
					.foregroundStyle(muted)
			} else {
				VStack(alignment: .leading, spacing: 21 * u) {
					// The tint column and the hairline are a BACKGROUND of the
					// 148-tall table (1:2724), never laid out: as ZStack siblings the
					// 170-tall tint made the stack 170 and pushed the footnote, TIP
					// and CTAs 22 down (mirrors android, 2026-09-04).
					VStack(spacing: 12 * u) {
						compareRow("", f.symbol, f.peerA, f.peerB, header: true)
						ForEach(f.compareRows, id: \.label) { r in
							compareRow(r.label, r.a, r.b, r.c, valueColor: r.green ? green : nil)
						}
					}
					.background(alignment: .topLeading) {
						ZStack(alignment: .topLeading) {
							// AAPL column tint (1:2721): 81x170 r8 at card (94, 43.94) - 12
							// above the table top - exact-design audit 2026-09-04.
							RoundedRectangle(cornerRadius: 8 * u)
								.fill(Color(argb: 0x125DA8BF))
								.frame(width: 81 * u, height: 170 * u)
								.offset(x: 78 * u, y: -12 * u)
							// 1:2722: a 0.5-wide #272F40 hairline between the MSFT and GOOGL
							// columns, card x257 y49.94, 134.5 tall - exact-design audit 2026-09-04.
							Rectangle()
								.fill(Color(argb: 0xFF272F40))
								.frame(width: 0.5 * u, height: 134.5 * u)
								.offset(x: 241 * u, y: -6 * u)
						}
						.frame(width: 0, height: 0, alignment: .topLeading)
					}
					Text("Cultural context only, not financial advice.")
						.font(StakFont.geist(10 * u, .medium))
						.foregroundStyle(muted)
				}
			}
		}
		.padding(.horizontal, 16 * u)
		.padding(.vertical, 14 * u)
		.background(card, in: RoundedRectangle(cornerRadius: 16 * u))
		.contentShape(Rectangle())
		.onTapGesture { open.toggle() }
	}

	private func compareRow(_ label: String, _ a: String, _ m: String, _ g: String, header: Bool = false, valueColor: Color? = nil) -> some View {
		let u = figmaUnit
		return HStack(spacing: 8 * u) {
			Text(label)
				.font(StakFont.geist(11 * u))
				.foregroundStyle(muted)
				.frame(maxWidth: .infinity, alignment: .leading)
			Text(a)
				.font(StakFont.geist(11 * u, .medium))
				.foregroundStyle(valueColor ?? bright)
				.frame(maxWidth: .infinity)
			Text(m)
				.font(StakFont.geist(11 * u, header ? .medium : .regular))
				.foregroundStyle(valueColor ?? bright)
				.frame(maxWidth: .infinity)
			Text(g)
				.font(StakFont.geist(11 * u, header ? .medium : .regular))
				.foregroundStyle(valueColor ?? bright)
				.frame(maxWidth: .infinity)
		}
		.frame(height: 20 * u)
	}
}

/// The "Since you saved" line for THIS stock (product audit, 2026-09-05: the
/// authored 16:1012 copy named AAPL on every page and "5 weeks ago" on a
/// stock saved a minute earlier). The demo keeps the authored figures with
/// the right symbol; a new account reads its own save date, and the move
/// since is this week's change once a day has passed.
private func sinceSavedFor(_ f: DetailFacts) -> (String, String, Bool) {
	// A save with a recorded day reads its real age on either account; the authored
	// "5 weeks ago" belongs to the demo persona's SEED saves, which predate the record
	// (audit 2026-09-07: the persona's own saves read "5 weeks ago" a minute later).
	let recorded = MyStakHoldings.shared.daysSinceSaved(f.symbol)
	let demo = Session.shared.demoAccount && recorded == nil
	let days = demo ? nil : recorded
	var move = f.change.filter { $0.isNumber || $0 == "." }
	if move.isEmpty { move = "0.0" }
	let up = !f.change.contains("\u{25BC}") && !f.change.trimmingCharacters(in: .whitespaces).hasPrefix("-")
	if demo {
		return ("+4.6%", "Saved 5 weeks ago. \(f.symbol) is up 4.6% since, moving roughly with the market. Steady giants tend to.", true)
	}
	// nil = a save from before the record existed; it reads as recent rather than as the demo's five weeks.
	guard let days, days > 0 else {
		return ("+0.0%", "Saved \(days == 0 ? "today" : "recently"). \(f.symbol) hasn't moved since you saved it - check back after a few sessions.", true)
	}
	return (
		(up ? "+" : "-") + move + "%",
		"Saved \(days == 1 ? "yesterday" : "\(days) days ago"). \(f.symbol) is \(up ? "up" : "down") \(move)% since, moving with the market this week.",
		up
	)
}

/// "SINCE YOU SAVED +4.6%" banner (16:1012) for the My STAK entry.
private struct SinceYouSavedCard: View {
	let f: DetailFacts

	var body: some View {
		let u = figmaUnit
		let since = sinceSavedFor(f)
		VStack(alignment: .leading, spacing: 12 * u) {
			HStack(spacing: 8 * u) {
				Image("IcSavedBookmark")
					.resizable()
					.frame(width: 12 * u, height: 12 * u)
				Text("SINCE YOU SAVED")
					.font(StakFont.geist(10 * u, .medium))
					.tracking(0.8 * u)
					.foregroundStyle(muted)
				Text(since.0)
					.font(StakFont.geist(12 * u, .medium))
					.foregroundStyle(since.2 ? green : red)
			}
			Text(since.1)
				.font(StakFont.geist(11 * u))
				.stakLineHeight(14 * u, size: 11 * u, face: .geist)
				.foregroundStyle(muted)
		}
		// 16:1012 authors p14/16/14/16 - 84 tall (mirrors Android, 2026-09-05).
		.padding(.horizontal, 16 * u)
		.padding(.vertical, 14 * u)
		.frame(maxWidth: .infinity, alignment: .leading)
		.background(card, in: RoundedRectangle(cornerRadius: 16 * u))
	}
}

/// Saved-to-My-STAK sheet over the detail (92:969) — Apple row variant.
/// Built inline (not on SheetScaffold) to pin the Android geometry: 14u
/// item spacing, 11u stock-row spacing, and the Detail CTAs (sora 13).
private struct DetailSavedSheet: View {
	let f: DetailFacts
	let onDismiss: () -> Void
	let onViewInMyStak: () -> Void
	let onKeepExploring: () -> Void

	var body: some View {
		let u = figmaUnit
		ZStack(alignment: .bottom) {
			// Authored scrim rgba(12,19,32,0.55) (106:1037).
			Color(argb: 0x8C0C1320)
				.ignoresSafeArea()
				.onTapGesture(perform: onDismiss)
			VStack(spacing: 14 * u) {
				RoundedRectangle(cornerRadius: 2 * u)
					.fill(Color(argb: 0xFF2A3346))
					.frame(width: 40 * u, height: 4 * u)
					.padding(.bottom, 4 * u)
				Image("IcSheetCheck")
					.resizable()
					.frame(width: 47 * u, height: 47 * u)
				Text("Saved to My STAK")
					.font(StakFont.sora(18 * u, .semiBold))
					.foregroundStyle(Color.white)
				HStack(spacing: 11 * u) {
					ZStack {
						Circle().fill(Color(argb: 0xFF242B3D))
						Text(f.sheetBadge)
							.font(StakFont.sora(15 * u, .semiBold))
							.foregroundStyle(Color(argb: 0xFF9EADC7))
					}
					.frame(width: 38 * u, height: 38 * u)
					VStack(alignment: .leading, spacing: 2 * u) {
						Text(f.sheetName)
							.font(StakFont.geist(13 * u, .medium))
							.foregroundStyle(Color.white)
						Text(f.sheetPrice)
							.font(StakFont.geist(10 * u))
							.foregroundStyle(muted)
					}
					.frame(maxWidth: .infinity, alignment: .leading)
					Text(f.sheetChange)
						.font(StakFont.geist(12 * u, .medium))
						.foregroundStyle(f.sheetChange.hasPrefix("▼") ? red : green)
				}
				.padding(.horizontal, 14 * u)
				.padding(.vertical, 12 * u)
				.background(Color(argb: 0x1A69B3CA), in: RoundedRectangle(cornerRadius: 6 * u))
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
		}
	}
}


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

/// Everything the detail page serves per stock - backend-shaped like the
/// news feed’s StockFacts, mirroring android/ StockDetailScreen.kt.
/// AAPL carries the authored 1:2382/92:969 frame values VERBATIM;
/// NVDA and GOOGL extend their deck cards off the same DECK numbers.
/// The Risk fit chip against the user's OWN risk style (product audit,
/// 2026-09-05: it read "Matches you" for everyone, high volatility
/// included). The pill's authored x (88 low / 150 mid / 238 high) is the
/// stock's volatility; TasteModel.riskStyle is the user's answer.
private func riskFitFor(_ f: DetailFacts) -> (String, String) {
	// The active user (Sign in) is the authored persona: its page reads the frame's
	// "Matches you"; only a first-time user's own 05 Risk answer drives the variants
	// (audit 2026-09-07 - the persona never answers 05, so its risk is -1).
	if Session.shared.demoAccount { return ("Matches you", f.riskCopy) }
	let style = TasteModel.riskStyle(UserProfile.shared.risk)
	let highVol = f.riskPillX > 170
	let lowVol = f.riskPillX < 120
	let first = (f.riskCopy.components(separatedBy: ". ").first ?? f.riskCopy) + "."
	if highVol && (style == "Conservative" || style == "Cautious") {
		return ("Bolder than you", "\(first) Bolder than your profile, so keep any stake small.")
	}
	if lowVol && style == "Growth-Oriented" {
		return ("Calmer than you", "\(first) Calmer than your profile, a steady anchor for a bold STAK.")
	}
	return ("Matches you", f.riskCopy)
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
	guard NewsArticleFeed.hasStockFacts(symbol) else { f.title = symbol; return f }
	let sf = NewsArticleFeed.stockFacts(symbol)
	var pct = sf.change.filter { $0.isNumber || $0 == "." }
	if pct.isEmpty { pct = "0.0" }
	f.title = "\(symbol) · \(sf.name)"
	f.price = sf.price
	f.change = (sf.up ? "\u{25B2} " : "\u{25BC} ") + pct + "% today"
	return f
}

/// The authored Discover-entry Practice buy hops to the Simulate tab (1:2382,
/// Instant), whose Saved staks list the ACCOUNT's saves. For the demo persona that
/// is the authored frame; for a first-time user the hop is a dead end unless the
/// stock is one of their saves - then the in-page ticket (16:1012) serves it.
private func hopsToSimulate(_ symbol: String) -> Bool {
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
	let sheetBadge: String
	let sheetName: String
	let sheetPrice: String
	let sheetChange: String
	let buySpec: BuySpec
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
		sheetBadge: "N", sheetName: "NVIDIA", sheetPrice: "$122.10 today", sheetChange: "▲ 2.4%",
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
