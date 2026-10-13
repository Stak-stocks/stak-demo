import SwiftUI

/// "What changed" — one card per saved company that has news worth returning for (My STAK product spec, Sept 2026).
/// Each card names the company, states the change and gives enough context to decide whether to look further; opening
/// one marks it read and takes a point off the overview's count. Mirrors android ui/mystak/UpdatesScreen.kt.
struct UpdatesView: View {
	let onBack: () -> Void
	let onOpenStock: (String) -> Void
	@ObservedObject var myStakVM: MyStakViewModel
	/// Back on top (from the stock page a card opened), the list is re-checked - Android's screen re-enters then.
	var isTop = true

	var body: some View {
		let u = figmaUnit
		// Every company with a change gets a card; a card caps how many of ITS OWN changes it shows, so one chatty
		// company can't crowd the rest out.
		let fresh = myStakVM.updates.filter { !$0.read }
		let earlier = myStakVM.updates.filter(\.read)
		VStack(spacing: 0) {
			HStack {
				AuthBackCircle(action: onBack).padding(.leading, 20 * u)
				Spacer()
			}
			.frame(maxWidth: .infinity)
			.frame(height: 56 * u)

			ScrollView {
				VStack(alignment: .leading, spacing: 12 * u) {
					VStack(alignment: .leading, spacing: 4 * u) {
						Text("What changed")
							.font(StakFont.sora(24 * u, .semiBold))
							.stakLineHeight(30 * u, size: 24 * u, face: .sora)
							.foregroundStyle(StakColors.textPrimary)
							.accessibilityAddTraits(.isHeader)
						Text(subtitleFor(fresh))
							.font(StakFont.geist(13 * u))
							.stakLineHeight(17 * u, size: 13 * u, face: .geist)
							.foregroundStyle(Stak.muted)
					}
					if !fresh.isEmpty {
						UpdateSection(title: "New", updates: fresh, myStakVM: myStakVM, onOpenStock: onOpenStock)
					}
					if !myStakVM.updates.isEmpty {
						HStack(spacing: 8 * u) {
							Text("✓").font(StakFont.geist(13 * u)).foregroundStyle(Stak.faint).accessibilityHidden(true)
							// "Up to date" is only true once every one of them has been opened.
							Text(fresh.isEmpty ? "You're up to date on your saved companies." : "That's all the new updates.")
								.font(StakFont.geist(12 * u))
								.stakLineHeight(16 * u, size: 12 * u, face: .geist)
								.foregroundStyle(Stak.faint)
						}
						.padding(.top, 4 * u)
					}
					if !earlier.isEmpty {
						UpdateSection(title: "Earlier · already opened", updates: earlier, myStakVM: myStakVM, onOpenStock: onOpenStock)
					}
				}
				.padding(.horizontal, 20 * u)
				.padding(.top, 8 * u)
				.padding(.bottom, 32 * u)
			}
		}
		.background(StakColors.bg.ignoresSafeArea())
		.task(id: isTop) { if isTop { myStakVM.loadUpdates() } }
	}
}

/// How many of one company's own changes its card shows before "+N more". The server sends every update newest first
/// and nothing here re-sorts them, so the prefix always keeps the most recent ones.
private let maxChangesPerCard = 3

/// One band of the inbox - its heading, then a card per company in it, grouped so two changes at one company are one
/// card.
private struct UpdateSection: View {
	let title: String
	let updates: [StockUpdateDto]
	@ObservedObject var myStakVM: MyStakViewModel
	let onOpenStock: (String) -> Void

	var body: some View {
		let u = figmaUnit
		Text(title)
			.font(StakFont.geist(11 * u, .medium))
			.tracking(0.8 * u)
			.stakLineHeight(14 * u, size: 11 * u, face: .geist)
			.foregroundStyle(Stak.faint)
			.padding(.top, 4 * u)
			.accessibilityAddTraits(.isHeader)
		ForEach(byCompany(updates), id: \.0) { ticker, forCompany in
			CompanyUpdateCard(updates: forCompany) {
				myStakVM.markCompanyRead(ticker)
				StakEvents.log(StakEvents.updateOpen, ticker: ticker, params: ["kind": forCompany[0].kind])
				onOpenStock(ticker)
			}
		}
	}

	/// The updates grouped by company, in the order each company first appears (Kotlin's groupBy).
	private func byCompany(_ all: [StockUpdateDto]) -> [(String, [StockUpdateDto])] {
		var order: [String] = []
		var map: [String: [StockUpdateDto]] = [:]
		for u in all {
			if map[u.ticker] == nil { order.append(u.ticker) }
			map[u.ticker, default: []].append(u)
		}
		return order.map { ($0, map[$0] ?? []) }
	}
}

/// The line under the title - what is waiting, in words rather than a window.
private func subtitleFor(_ fresh: [StockUpdateDto]) -> String {
	if fresh.isEmpty { return "Nothing new at your saved companies." }
	let companies = Set(fresh.map(\.ticker)).count
	return companies == 1 ? "1 saved company has something new" : "\(companies) saved companies have something new"
}

/// One company's changes: what happened, the context, and where each one came from.
private struct CompanyUpdateCard: View {
	let updates: [StockUpdateDto]
	let onOpen: () -> Void
	/// "+N more" opens onto the rest of this same card.
	@State private var expanded = false

	var body: some View {
		let u = figmaUnit
		let update = updates[0]
		let unread = updates.contains { !$0.read }
		let shown = expanded ? updates : Array(updates.prefix(maxChangesPerCard))
		// A tap on the card, not a Button around it: "+N more" inside it is a button of its own.
		VStack(alignment: .leading, spacing: 8 * u) {
			HStack(alignment: .top, spacing: 10 * u) {
				CompanyLogo(update: update)
				VStack(alignment: .leading, spacing: 2 * u) {
					Text(update.company)
						.font(StakFont.sora(14 * u, .semiBold))
						.stakLineHeight(18 * u, size: 14 * u, face: .sora)
						.foregroundStyle(StakColors.textPrimary)
					Text("\(update.ticker) · \(kindLabel(update.kind))\(ageOf(update).map { " · \($0)" } ?? "")")
						.font(StakFont.geist(11 * u))
						.stakLineHeight(14 * u, size: 11 * u, face: .geist)
						.foregroundStyle(Stak.muted)
				}
				.frame(maxWidth: .infinity, alignment: .leading)
				// An unread dot, as on the overview's collections - gone once it's opened.
				if unread {
					Circle().fill(Stak.teal).frame(width: 8 * u, height: 8 * u).accessibilityHidden(true)
				}
			}
			ForEach(Array(shown.enumerated()), id: \.element.id) { i, change in
				VStack(alignment: .leading, spacing: 8 * u) {
					Text(change.title)
						.font(StakFont.sora(16 * u, .semiBold))
						.stakLineHeight(21 * u, size: 16 * u, face: .sora)
						.foregroundStyle(StakColors.textPrimary)
					Text(change.body)
						.font(StakFont.geist(13 * u))
						.stakLineHeight(19 * u, size: 13 * u, face: .geist)
						.foregroundStyle(Stak.body)
					if let watch = change.watch, !watch.trimmingCharacters(in: .whitespaces).isEmpty {
						Text(watch)
							.font(StakFont.geist(12 * u))
							.stakLineHeight(16 * u, size: 12 * u, face: .geist)
							.foregroundStyle(Stak.muted)
					}
					// Each change carries its own age, so a 4-day-old change under a "5h ago" header doesn't read
					// as just as fresh.
					let meta = [ageOf(change), updateSourceLine(change)].compactMap { $0 }.joined(separator: " · ")
					if !meta.isEmpty {
						Text(meta)
							.font(StakFont.geist(11 * u))
							.stakLineHeight(14 * u, size: 11 * u, face: .geist)
							.foregroundStyle(Stak.faint)
					}
				}
				.padding(.top, i > 0 ? 12 * u : 0)
			}
			if !expanded && updates.count > maxChangesPerCard {
				Button { withAnimation(.easeInOut(duration: 0.25)) { expanded = true } } label: {
					Text("+\(updates.count - maxChangesPerCard) more this week")
						.font(StakFont.geist(12 * u, .medium))
						.stakLineHeight(16 * u, size: 12 * u, face: .geist)
						.foregroundStyle(Stak.teal)
						.frame(minHeight: 44, alignment: .leading)
						.contentShape(Rectangle())
				}
				.buttonStyle(.pressDim)
				.padding(.vertical, -14)
			}
			// The company's page carries these changes under Since you saved, so the promise this makes is one the
			// destination keeps.
			Text("Understand this change ›")
				.font(StakFont.geist(13 * u, .medium))
				.stakLineHeight(17 * u, size: 13 * u, face: .geist)
				.foregroundStyle(Stak.teal)
				.padding(.top, 10 * u)
		}
		.frame(maxWidth: .infinity, alignment: .leading)
		.multilineTextAlignment(.leading)
		.padding(16 * u)
		.background(Stak.cardBg, in: RoundedRectangle(cornerRadius: 16 * u))
		.contentShape(RoundedRectangle(cornerRadius: 16 * u))
		.onTapGesture(perform: onOpen)
		.accessibilityElement(children: .combine)
		.accessibilityLabel(unread ? "New: \(update.company)" : update.company)
		.accessibilityAddTraits(.isButton)
		.accessibilityAction(.default, onOpen)
		.accessibilityActions {
			if !expanded && updates.count > maxChangesPerCard {
				Button("Show \(updates.count - maxChangesPerCard) more") { expanded = true }
			}
		}
	}
}

private func kindLabel(_ kind: String) -> String {
	switch kind {
	case "earnings": return "Earnings"
	case "guidance": return "Outlook"
	case "analyst": return "Analysts"
	case "business": return "Company news"
	default: return "Update"
	}
}

/// The company's logo from the brand catalog, or its initial while that's still loading (or for a company the
/// catalog has no mark for).
private struct CompanyLogo: View {
	let update: StockUpdateDto
	@ObservedObject private var brands = BrandNames.shared

	var body: some View {
		let u = figmaUnit
		ZStack {
			RoundedRectangle(cornerRadius: 9 * u).fill(Color(argb: 0xFF242B3D))
			if let url = brands.logoByTicker[update.ticker.uppercased()].flatMap(URL.init(string:)) {
				AsyncImage(url: url) { phase in
					if let image = phase.image {
						image.resizable().scaledToFit().frame(width: 26 * u, height: 26 * u)
					} else {
						initial(u)
					}
				}
			} else {
				initial(u)
			}
		}
		.frame(width: 34 * u, height: 34 * u)
		.clipShape(RoundedRectangle(cornerRadius: 9 * u))
		.accessibilityHidden(true)
	}

	private func initial(_ u: CGFloat) -> some View {
		Text(update.company.prefix(1).uppercased())
			.font(StakFont.sora(14 * u, .semiBold))
			.foregroundStyle(Stak.muted)
	}
}

/// "From Reuters" / "From Reuters and 2 more" - the headlines this was written from. Shared with the stock page's Since
/// you saved card.
func updateSourceLine(_ update: StockUpdateDto) -> String? {
	var names: [String] = []
	for s in update.sources where !s.source.trimmingCharacters(in: .whitespaces).isEmpty && !names.contains(s.source) { names.append(s.source) }
	guard let first = names.first else { return nil }
	let extra = update.sources.count - 1
	if names.count == 1 && extra > 0 { return "From \(first) and \(extra) more \(extra == 1 ? "headline" : "headlines")" }
	if names.count == 1 { return "From \(first)" }
	return "From \(first) and \(names.count - 1) more"
}

/// How old the change is - dated from the newest headline behind it, not from when STAK noticed it.
private func ageOf(_ update: StockUpdateDto) -> String? {
	let newest = update.sources.map(\.datetime).max().flatMap { $0 > 0 ? $0 : nil }
	let seconds: Int64
	if let newest {
		seconds = newest
	} else if let date = MyStakHoldings.parse(update.occurredAt) {
		seconds = Int64(date.timeIntervalSince1970)
	} else {
		return nil
	}
	let age = StakClock.newsAge(seconds)
	return age == "0m" ? "Just now" : "\(age) ago"
}

