import SwiftUI

/// Every collection — lifts the overview grid's cap for accounts with many.
/// Mirrors android/ui/mystak/AllCollectionsScreen.kt.
struct AllCollectionsView: View {
    let onBack: () -> Void
    let onOpenCollection: (String) -> Void
    @ObservedObject var myStakVM: MyStakViewModel
    @ObservedObject private var holdings = MyStakHoldings.shared

    private var allCollections: [StakCollection] {
        let other = StakCollections.other(holdings: holdings.tickers)
        return StakCollections.all + (other.map { [$0] } ?? [])
    }

    private var unreadTickers: Set<String> {
        Set(myStakVM.updates.filter { !$0.read }.map { $0.ticker })
    }

    var body: some View {
        let u = figmaUnit
        VStack(spacing: 0) {
            headerBar(u: u)
            collectionsList(u: u)
        }
        .background(StakColors.bg.ignoresSafeArea())
    }

    private func headerBar(u: CGFloat) -> some View {
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
    }

    private func collectionsList(u: CGFloat) -> some View {
        let all = allCollections
        let unread = unreadTickers
        return ScrollView(showsIndicators: false) {
            VStack(alignment: .leading, spacing: 16 * u) {
                Text(subtitle(all.count))
                    .font(StakFont.geist(12 * u))
                    .foregroundStyle(Color(argb: 0xFF819ABB))
                collectionsGrid(all: all, unread: unread, u: u)
            }
            .padding(.horizontal, 20 * u)
            .padding(.top, 8 * u)
            .padding(.bottom, 32 * u)
            .safeAreaPadding(.bottom)
        }
    }

    private func subtitle(_ count: Int) -> String {
        "\(count == 1 ? "1 collection" : "\(count) collections") · \(heldCountLabel(holdings.count))"
    }

    private func collectionsGrid(all: [StakCollection], unread: Set<String>, u: CGFloat) -> some View {
        let rows = stride(from: 0, to: all.count, by: 2).map { Array(all[$0..<min($0 + 2, all.count)]) }
        return VStack(spacing: 10 * u) {
            ForEach(Array(rows.enumerated()), id: \.offset) { _, row in
                HStack(spacing: 10 * u) {
                    ForEach(row) { col in
                        CollectionChipFull(
                            collection: col,
                            hasUnread: col.stocks.contains { unread.contains($0.ticker) },
                            countLabel: heldCountLabel(col.held(in: holdings.tickers).count),
                            action: { onOpenCollection(col.id) }
                        )
                    }
                    if row.count == 1 { Spacer() }
                }
            }
        }
    }
}

private struct CollectionChipFull: View {
    let collection: StakCollection
    let hasUnread: Bool
    let countLabel: String
    let action: () -> Void

    var body: some View {
        let u = figmaUnit
        return Button(action: action) {
            ZStack(alignment: .topTrailing) {
                HStack(spacing: 10 * u) {
                    if let icon = collection.icon {
                        Image(icon)
                            .resizable()
                            .frame(width: 32 * u, height: 32 * u)
                    }
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
