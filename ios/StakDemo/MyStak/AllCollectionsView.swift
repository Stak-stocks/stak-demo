import SwiftUI

/// Every collection, for an account with more than the overview's grid shows. The same chips, in the same order -
/// this page only lifts the cap. Mirrors android ui/mystak/AllCollectionsScreen.kt.
struct AllCollectionsView: View {
	let onBack: () -> Void
	let onOpenCollection: (String) -> Void
	@ObservedObject var myStakVM: MyStakViewModel
	@ObservedObject private var holdings = MyStakHoldings.shared
	@ObservedObject private var session = Session.shared

	var body: some View {
		let u = figmaUnit
		// The same dots the overview shows - this is the page someone with many collections uses to find them.
		let unreadTickers = Set(myStakVM.updates.filter { !$0.read }.map(\.ticker))
		let entries = collectionEntries(demo: session.demoAccount, groups: myStakVM.groups, unreadTickers: unreadTickers)
		VStack(spacing: 0) {
			ZStack {
				Text("Collections")
					.font(StakFont.sora(16 * u, .semiBold))
					.stakLineHeight(20 * u, size: 16 * u, face: .sora)
					.foregroundStyle(StakColors.textPrimary)
					.accessibilityAddTraits(.isHeader)
				HStack {
					AuthBackCircle(action: onBack).padding(.leading, 20 * u)
					Spacer()
				}
			}
			.frame(maxWidth: .infinity)
			.frame(height: 56 * u)

			ScrollView {
				VStack(alignment: .leading, spacing: 10 * u) {
					Text("\(entries.count == 1 ? "1 collection" : "\(entries.count) collections") · \(heldCountLabel(entries.reduce(0) { $0 + $1.count }))")
						.font(StakFont.geist(12 * u))
						.stakLineHeight(16 * u, size: 12 * u, face: .geist)
						.foregroundStyle(Stak.muted)
					CollectionGrid(entries: entries, onOpen: onOpenCollection)
				}
				.padding(.horizontal, 20 * u)
				.padding(.top, 8 * u)
				.padding(.bottom, 32 * u)
			}
		}
		.background(StakColors.bg.ignoresSafeArea())
	}
}
