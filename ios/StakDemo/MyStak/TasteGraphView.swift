import SwiftUI

/// "Your Investing Taste" — expandable theme rows showing score, saves and signals.
/// Mirrors android/ui/mystak/TasteGraphScreen.kt.
struct TasteGraphView: View {
    let onBack: () -> Void
    @ObservedObject var myStakVM: MyStakViewModel
    @State private var expanded: Set<String> = []

    var body: some View {
        let u = figmaUnit
        VStack(spacing: 0) {
            ZStack {
                Text("Your Investing Taste")
                    .font(StakFont.sora(16 * u, .semiBold))
                    .foregroundStyle(StakColors.textPrimary)
                HStack {
                    AuthBackCircle(action: onBack).padding(.leading, 20 * u)
                    Spacer()
                }
            }
            .frame(maxWidth: .infinity).frame(height: 56 * u)

            if let taste = myStakVM.taste {
                ScrollView(showsIndicators: false) {
                    VStack(spacing: 0) {
                        tasteSummary(taste, u: u)
                        Divider().background(Color(argb: 0xFF1E2A3D))
                            .padding(.horizontal, 20 * u)
                            .padding(.vertical, 8 * u)

                        let sorted = taste.themes.sorted { $0.score > $1.score }
                        ForEach(sorted, id: \.category) { theme in
                            TasteThemeRow(
                                theme: theme,
                                isExpanded: expanded.contains(theme.category),
                                u: u,
                                onToggle: {
                                    if expanded.contains(theme.category) {
                                        expanded.remove(theme.category)
                                    } else {
                                        expanded.insert(theme.category)
                                    }
                                }
                            )
                        }
                        if taste.otherShare > 0 {
                            HStack {
                                Text("Other categories")
                                    .font(StakFont.geist(13 * u))
                                    .foregroundStyle(Color(argb: 0xFF819ABB))
                                Spacer()
                                Text("\(Int((taste.otherShare * 100).rounded()))%")
                                    .font(StakFont.geist(13 * u))
                                    .foregroundStyle(Color(argb: 0xFF4A5E7A))
                            }
                            .padding(.horizontal, 20 * u)
                            .padding(.vertical, 12 * u)
                        }
                    }
                    .padding(.bottom, 32 * u)
                    .safeAreaPadding(.bottom)
                }
                .refreshable { await myStakVM.loadTaste(force: true) }
            } else if myStakVM.tasteFailed {
                Spacer()
                VStack(spacing: 12 * u) {
                    Image(systemName: "chart.bar.xaxis")
                        .font(.system(size: 32 * u))
                        .foregroundStyle(Color(argb: 0xFF4A5E7A))
                    Text("Couldn't load your taste graph")
                        .font(StakFont.geist(14 * u, .medium))
                        .foregroundStyle(Color(argb: 0xFF819ABB))
                    Button("Retry") { Task { await myStakVM.loadTaste(force: true) } }
                        .font(StakFont.geist(13 * u, .medium))
                        .foregroundStyle(Color(argb: 0xFF69B3CA))
                }
                Spacer()
            } else {
                Spacer()
                ProgressView().tint(Color(argb: 0xFF69B3CA))
                Spacer()
            }
        }
        .background(StakColors.bg.ignoresSafeArea())
        .task {
            StakEvents.log(StakEvents.tasteGraphOpen)
            await myStakVM.loadTaste()
        }
    }

    @ViewBuilder
    private func tasteSummary(_ taste: TasteResponse, u: CGFloat) -> some View {
        VStack(alignment: .leading, spacing: 8 * u) {
            HStack(alignment: .firstTextBaseline, spacing: 6 * u) {
                Text("\(taste.themes.count)")
                    .font(StakFont.sora(28 * u, .semiBold))
                    .foregroundStyle(StakColors.textPrimary)
                Text("themes detected")
                    .font(StakFont.geist(14 * u))
                    .foregroundStyle(Color(argb: 0xFF819ABB))
                Spacer()
            }
            HStack(spacing: 16 * u) {
                statPill(icon: "heart.fill", value: "\(taste.totalSaves)", label: "saves", u: u)
                statPill(icon: "bolt.fill", value: "\(taste.signals)", label: "signals", u: u)
            }
            if taste.learning {
                HStack(spacing: 6 * u) {
                    Image(systemName: "sparkles")
                        .font(.system(size: 11 * u))
                        .foregroundStyle(Color(argb: 0xFF69B3CA))
                    Text("Still learning your taste — keep saving stocks")
                        .font(StakFont.geist(12 * u))
                        .foregroundStyle(Color(argb: 0xFF819ABB))
                }
            }
        }
        .padding(.horizontal, 20 * u)
        .padding(.top, 16 * u)
        .padding(.bottom, 8 * u)
    }

    private func statPill(icon: String, value: String, label: String, u: CGFloat) -> some View {
        HStack(spacing: 4 * u) {
            Image(systemName: icon)
                .font(.system(size: 11 * u))
                .foregroundStyle(Color(argb: 0xFF69B3CA))
            Text("\(value) \(label)")
                .font(StakFont.geist(12 * u))
                .foregroundStyle(Color(argb: 0xFF819ABB))
        }
    }
}

private struct TasteThemeRow: View {
    let theme: TasteThemeDto
    let isExpanded: Bool
    let u: CGFloat
    let onToggle: () -> Void

    var body: some View {
        VStack(spacing: 0) {
            Button(action: onToggle) {
                HStack(spacing: 12 * u) {
                    VStack(alignment: .leading, spacing: 4 * u) {
                        HStack(spacing: 6 * u) {
                            Text(theme.category)
                                .font(StakFont.geist(14 * u, .medium))
                                .foregroundStyle(StakColors.textPrimary)
                            if theme.score >= 0.8 {
                                Text("Strong")
                                    .font(StakFont.geist(10 * u, .medium))
                                    .foregroundStyle(Color(argb: 0xFF69B3CA))
                                    .padding(.horizontal, 6 * u)
                                    .padding(.vertical, 2 * u)
                                    .background(Color(argb: 0x1A69B3CA), in: Capsule())
                            }
                        }
                        TasteShareBar(fill: CGFloat(theme.share), u: u)
                    }
                    Spacer()
                    HStack(spacing: 4 * u) {
                        Text("\(Int((theme.share * 100).rounded()))%")
                            .font(StakFont.geist(13 * u))
                            .foregroundStyle(Color(argb: 0xFF819ABB))
                        Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                            .font(.system(size: 11 * u))
                            .foregroundStyle(Color(argb: 0xFF4A5E7A))
                    }
                }
                .padding(.horizontal, 20 * u)
                .padding(.vertical, 14 * u)
            }
            .buttonStyle(.pressDim)

            if isExpanded {
                VStack(alignment: .leading, spacing: 8 * u) {
                    HStack(spacing: 16 * u) {
                        miniStat(label: "Saves", value: "\(theme.saves)", u: u)
                        miniStat(label: "Learn more", value: "\(theme.learnMores)", u: u)
                        miniStat(label: "Opens", value: "\(theme.opens)", u: u)
                        miniStat(label: "Passes", value: "\(theme.passes)", u: u)
                    }
                    if !theme.savedNames.isEmpty {
                        Text(theme.savedNames.prefix(4).joined(separator: " · "))
                            .font(StakFont.geist(11 * u))
                            .foregroundStyle(Color(argb: 0xFF4A5E7A))
                            .lineLimit(2)
                    }
                }
                .padding(.horizontal, 20 * u)
                .padding(.bottom, 12 * u)
                .transition(.opacity.combined(with: .move(edge: .top)))
            }

            Divider().background(Color(argb: 0xFF1A2638))
                .padding(.horizontal, 20 * u)
        }
        .animation(.easeOut(duration: 0.2), value: isExpanded)
    }

    private func miniStat(label: String, value: String, u: CGFloat) -> some View {
        VStack(spacing: 2 * u) {
            Text(value)
                .font(StakFont.geist(13 * u, .medium))
                .foregroundStyle(StakColors.textPrimary)
            Text(label)
                .font(StakFont.geist(10 * u))
                .foregroundStyle(Color(argb: 0xFF4A5E7A))
        }
    }
}

private struct TasteShareBar: View {
    let fill: CGFloat
    let u: CGFloat
    var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                Capsule().fill(Color(argb: 0xFF1E2A3D))
                    .frame(height: 4 * u)
                Capsule().fill(Color(argb: 0xFF69B3CA))
                    .frame(width: geo.size.width * fill, height: 4 * u)
            }
        }
        .frame(height: 4 * u)
    }
}
