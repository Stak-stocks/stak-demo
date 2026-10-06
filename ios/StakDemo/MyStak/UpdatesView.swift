import SwiftUI

/// "What changed" — per-company update feed. Mirrors android/ui/mystak/UpdatesScreen.kt.
struct UpdatesView: View {
    let onBack: () -> Void
    let onOpenStock: (String) -> Void
    @ObservedObject var myStakVM: MyStakViewModel

    var body: some View {
        let u = figmaUnit
        VStack(spacing: 0) {
            ZStack {
                Text("What changed")
                    .font(StakFont.sora(16 * u, .semiBold))
                    .foregroundStyle(StakColors.textPrimary)
                HStack {
                    AuthBackCircle(action: onBack).padding(.leading, 20 * u)
                    Spacer()
                }
            }
            .frame(maxWidth: .infinity).frame(height: 56 * u)

            if myStakVM.updates.isEmpty && !myStakVM.updatesFailed {
                Spacer()
                VStack(spacing: 12 * u) {
                    Image(systemName: "bell.slash")
                        .font(.system(size: 32 * u))
                        .foregroundStyle(Color(argb: 0xFF4A5E7A))
                    Text("Nothing to report yet")
                        .font(StakFont.geist(15 * u, .medium))
                        .foregroundStyle(Color(argb: 0xFF819ABB))
                    Text("Updates appear here when your saved stocks report earnings, news, or metric changes.")
                        .font(StakFont.geist(12 * u))
                        .foregroundStyle(Color(argb: 0xFF4A5E7A))
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 40 * u)
                }
                Spacer()
            } else {
                let groups = groupedUpdates(myStakVM.updates)
                ScrollView(showsIndicators: false) {
                    VStack(spacing: 0) {
                        let unread = myStakVM.unreadCount
                        if unread > 0 {
                            HStack {
                                Text("\(unread) unread")
                                    .font(StakFont.geist(12 * u))
                                    .foregroundStyle(Color(argb: 0xFF69B3CA))
                                Spacer()
                            }
                            .padding(.horizontal, 20 * u)
                            .padding(.top, 8 * u)
                            .padding(.bottom, 12 * u)
                        }
                        ForEach(groups, id: \.ticker) { group in
                            UpdateGroupSection(
                                group: group,
                                u: u,
                                onOpenStock: { onOpenStock(group.ticker); myStakVM.markCompanyRead(group.ticker) }
                            )
                        }
                    }
                    .padding(.bottom, 32 * u)
                    .safeAreaPadding(.bottom)
                }
                .refreshable { await myStakVM.loadUpdates() }
            }
        }
        .background(StakColors.bg.ignoresSafeArea())
        .task { await myStakVM.loadUpdates() }
    }
}

// MARK: – helpers

private struct UpdateGroup {
    let ticker: String
    let company: String
    let updates: [StockUpdateDto]
    var hasUnread: Bool { updates.contains { !$0.read } }
}

private func groupedUpdates(_ all: [StockUpdateDto]) -> [UpdateGroup] {
    var order: [String] = []
    var map: [String: UpdateGroup] = [:]
    for u in all {
        let key = u.ticker.uppercased()
        if map[key] == nil {
            order.append(key)
            map[key] = UpdateGroup(ticker: key, company: u.company, updates: [u])
        } else {
            map[key] = UpdateGroup(ticker: key, company: map[key]!.company, updates: map[key]!.updates + [u])
        }
    }
    return order.compactMap { map[$0] }
}

private struct UpdateGroupSection: View {
    let group: UpdateGroup
    let u: CGFloat
    let onOpenStock: () -> Void

    var body: some View {
        VStack(spacing: 0) {
            Button(action: onOpenStock) {
                HStack(spacing: 10 * u) {
                    ZStack(alignment: .topTrailing) {
                        ZStack {
                            Circle().fill(Color(argb: 0xFF1E2A3D))
                                .frame(width: 36 * u, height: 36 * u)
                            Text(String(group.ticker.prefix(1)))
                                .font(StakFont.geist(14 * u, .medium))
                                .foregroundStyle(Color(argb: 0xFF69B3CA))
                        }
                        if group.hasUnread {
                            Circle().fill(Color(argb: 0xFF69B3CA))
                                .frame(width: 8 * u, height: 8 * u)
                                .offset(x: 2 * u, y: -2 * u)
                        }
                    }
                    VStack(alignment: .leading, spacing: 2 * u) {
                        Text(group.company)
                            .font(StakFont.geist(14 * u, .medium))
                            .foregroundStyle(StakColors.textPrimary)
                            .lineLimit(1)
                        Text("\(group.updates.count) \(group.updates.count == 1 ? "update" : "updates")")
                            .font(StakFont.geist(12 * u))
                            .foregroundStyle(Color(argb: 0xFF819ABB))
                    }
                    Spacer()
                    Image(systemName: "chevron.right")
                        .font(.system(size: 13 * u))
                        .foregroundStyle(Color(argb: 0xFF4A5E7A))
                }
                .padding(.horizontal, 20 * u)
                .padding(.vertical, 14 * u)
            }
            .buttonStyle(.pressDim)

            ForEach(group.updates) { update in
                UpdateRow(update: update, u: u)
            }

            Divider()
                .background(Color(argb: 0xFF1E2A3D))
                .padding(.horizontal, 20 * u)
        }
    }
}

private struct UpdateRow: View {
    let update: StockUpdateDto
    let u: CGFloat

    var body: some View {
        HStack(alignment: .top, spacing: 12 * u) {
            Circle()
                .fill(update.read ? Color(argb: 0xFF2A3A52) : Color(argb: 0xFF69B3CA))
                .frame(width: 6 * u, height: 6 * u)
                .padding(.top, 6 * u)
            VStack(alignment: .leading, spacing: 4 * u) {
                Text(update.title)
                    .font(StakFont.geist(13 * u, .medium))
                    .foregroundStyle(update.read ? Color(argb: 0xFF819ABB) : StakColors.textPrimary)
                    .fixedSize(horizontal: false, vertical: true)
                if !update.body.isEmpty {
                    Text(update.body)
                        .font(StakFont.geist(12 * u))
                        .foregroundStyle(Color(argb: 0xFF4A5E7A))
                        .lineLimit(2)
                        .fixedSize(horizontal: false, vertical: true)
                }
                Text(relativeDate(update.occurredAt))
                    .font(StakFont.geist(11 * u))
                    .foregroundStyle(Color(argb: 0xFF3A4E6A))
            }
            Spacer()
        }
        .padding(.horizontal, 20 * u)
        .padding(.vertical, 10 * u)
        .background(update.read ? Color.clear : Color(argb: 0x0A69B3CA))
    }
}

private func relativeDate(_ iso: String) -> String {
    let f = ISO8601DateFormatter()
    f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    guard let d = f.date(from: iso) ?? ISO8601DateFormatter().date(from: iso) else { return "" }
    let secs = Int(-d.timeIntervalSinceNow)
    if secs < 60 { return "Just now" }
    if secs < 3600 { return "\(secs / 60)m ago" }
    if secs < 86400 { return "\(secs / 3600)h ago" }
    return "\(secs / 86400)d ago"
}
