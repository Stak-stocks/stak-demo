import SwiftUI

/// Every collection — lifts the overview grid's cap for accounts with many.
/// Mirrors android/ui/mystak/AllCollectionsScreen.kt.
struct AllCollectionsView: View {
    let onBack: () -> Void
    let onOpenCollection: (String) -> Void
    @ObservedObject var myStakVM: MyStakViewModel
    @ObservedObject private var holdings = MyStakHoldings.shared

    var body: some View {
        let u = figmaUnit
        VStack(spacing: 0) {
            ZStack {
                Text("Collections")
                    .font(StakFont.sora(16 * u, .semiBold))
                    .foregroundStyle(StakColors.textPrimary)
                HStack {
                    AuthBackCircle(action: onBack).padding(.leading, 20 * u)
                    Spacer()
                }
            }
            .frame(maxWidth: .infinity).frame(height: 56 * u)

            let other = StakCollections.other(holdings: holdings.tickers)
            let all = StakCollections.all + (other.map { [$0] } ?? [])
            let unreadTickers = Set(myStakVM.updates.filter { !$0.read }.map { $0.ticker })
            ScrollView(showsIndicators: false) {
                VStack(alignment: .leading, spacing: 16 * u) {
                    Text("\(all.count == 1 ? "1 collection" : "\(all.count) collections") · \(heldCountLabel(holdings.count))")
                        .font(StakFont.geist(12 * u))
                        .foregroundStyle(Color(argb: 0xFF819ABB))
                    let rows = stride(from: 0, to: all.count, by: 2).map { Array(all[$0..<min($0 + 2, all.count)]) }
                    VStack(spacing: 10 * u) {
                        ForEach(Array(rows.enumerated()), id: \.offset) { _, row in
                            HStack(spacing: 10 * u) {
                                ForEach(row) { col in
                                    CollectionChipFull(
                                        collection: col,
                                        hasUnread: col.tickers.contains { unreadTickers.contains($0) },
                                        countLabel: heldCountLabel(col.held(in: holdings.tickers).count),
                                        action: { onOpenCollection(col.id) }
                                    )
                                }
                                if row.count == 1 { Spacer() }
                            }
                        }
                    }
                }
                .padding(.horizontal, 20 * u)
                .padding(.top, 8 * u)
                .padding(.bottom, 32 * u)
                .safeAreaPadding(.bottom)
            }
        }
        .background(StakColors.bg.ignoresSafeArea())
    }
}

private struct CollectionChipFull: View {
    let collection: StakCollection
    let hasUnread: Bool
    let countLabel: String
    let action: () -> Void

    var body: some View {
        let u = figmaUnit
        Button(action: action) {
            ZStack(alignment: .topTrailing) {
                HStack(spacing: 10 * u) {
                    Image(collection.icon)
                        .resizable()
                        .frame(width: 32 * u, height: 32 * u)
                    VStack(alignment: .leading, spacing: 2 * u) {
                        Text(collection.name)
                            .font(StakFont.geist(13 * u, .medium))
                            .foregroundStyle(StakColors.textPrimary)
                            .lineLimit(1)
                        if !countLabel.isEmpty {
                            Text(countLabel)
                                .font(StakFont.geist(11 * u))
                                .foregroundStyle(Color(argb: 0xFF819ABB))
                        }
                    }
                    Spacer()
                    Image(systemName: "chevron.right")
                        .font(.system(size: 12 * u))
                        .foregroundStyle(Color(argb: 0xFF819ABB))
                }
                .padding(12 * u)
                .background(Color(argb: 0xFF181F30), in: RoundedRectangle(cornerRadius: 12 * u))
                if hasUnread {
                    Circle().fill(Color(argb: 0xFF69B3CA))
                        .frame(width: 8 * u, height: 8 * u)
                        .offset(x: -8 * u, y: 8 * u)
                }
            }
        }
        .buttonStyle(.pressDim)
        .frame(maxWidth: .infinity)
    }
}
