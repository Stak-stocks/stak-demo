import SwiftUI

/// Full-screen expansion of the API daily brief (market mood + explanations +
/// what happened + watch items). Mirrors android/ui/news/DailyBriefDetailScreen.kt.
struct DailyBriefDetailView: View {
    let brief: DailyBriefResponse
    let onBack: () -> Void

    var body: some View {
        let u = figmaUnit
        VStack(spacing: 0) {
            ZStack {
                Text("Today's Brief")
                    .font(StakFont.sora(16 * u, .semiBold))
                    .foregroundStyle(StakColors.textPrimary)
                HStack {
                    AuthBackCircle(action: onBack).padding(.leading, 20 * u)
                    Spacer()
                }
            }
            .frame(maxWidth: .infinity).frame(height: 56 * u)

            ScrollView(showsIndicators: false) {
                VStack(alignment: .leading, spacing: 20 * u) {
                    moodHeader(u: u)
                    if !brief.plainEnglish.isEmpty { plainEnglishCard(u: u) }
                    if !brief.personalizedImpact.isEmpty { impactCard(u: u) }
                    if !brief.whatHappened.isEmpty { whatHappenedSection(u: u) }
                    if !brief.contextQuestion.isEmpty { contextQuestionCard(u: u) }
                    if !brief.watchItems.isEmpty { watchSection(u: u) }
                }
                .padding(.horizontal, 20 * u)
                .padding(.top, 12 * u)
                .padding(.bottom, 32 * u)
                .safeAreaPadding(.bottom)
            }
        }
        .background(StakColors.bg.ignoresSafeArea())
    }

    // MARK: – sections

    @ViewBuilder
    private func moodHeader(u: CGFloat) -> some View {
        VStack(alignment: .leading, spacing: 8 * u) {
            HStack(spacing: 10 * u) {
                moodIcon(u: u)
                VStack(alignment: .leading, spacing: 2 * u) {
                    Text(brief.dayLabel.isEmpty ? brief.session : brief.dayLabel)
                        .font(StakFont.geist(12 * u))
                        .foregroundStyle(Color(argb: 0xFF819ABB))
                    Text(moodTitle)
                        .font(StakFont.sora(20 * u, .semiBold))
                        .foregroundStyle(moodColor)
                }
                Spacer()
                if brief.marketClosed {
                    Text("Market closed")
                        .font(StakFont.geist(11 * u))
                        .foregroundStyle(Color(argb: 0xFF4A5E7A))
                        .padding(.horizontal, 8 * u)
                        .padding(.vertical, 4 * u)
                        .background(Color(argb: 0xFF1E2A3D), in: Capsule())
                }
            }
            if !brief.moodExplanation.isEmpty {
                Text(brief.moodExplanation)
                    .font(StakFont.geist(14 * u))
                    .foregroundStyle(Color(argb: 0xFFC8D2E0))
                    .fixedSize(horizontal: false, vertical: true)
            }
            if brief.marketClosed, !brief.nextTradingDayLabel.isEmpty {
                Text("Next trading: \(brief.nextTradingDayLabel)")
                    .font(StakFont.geist(12 * u))
                    .foregroundStyle(Color(argb: 0xFF819ABB))
            }
        }
        .padding(16 * u)
        .background(Color(argb: 0xFF181F30), in: RoundedRectangle(cornerRadius: 14 * u))
    }

    @ViewBuilder
    private func plainEnglishCard(u: CGFloat) -> some View {
        sectionCard(title: "In plain English", u: u) {
            Text(brief.plainEnglish)
                .font(StakFont.geist(14 * u))
                .foregroundStyle(Color(argb: 0xFFC8D2E0))
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    @ViewBuilder
    private func impactCard(u: CGFloat) -> some View {
        sectionCard(title: "Your portfolio", u: u) {
            Text(brief.personalizedImpact)
                .font(StakFont.geist(14 * u))
                .foregroundStyle(Color(argb: 0xFFC8D2E0))
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    @ViewBuilder
    private func whatHappenedSection(u: CGFloat) -> some View {
        sectionCard(title: "What happened", u: u) {
            VStack(alignment: .leading, spacing: 12 * u) {
                ForEach(Array(brief.whatHappened.enumerated()), id: \.offset) { _, item in
                    VStack(alignment: .leading, spacing: 4 * u) {
                        Text(item.title)
                            .font(StakFont.geist(13 * u, .medium))
                            .foregroundStyle(StakColors.textPrimary)
                        if !item.body.isEmpty {
                            Text(item.body)
                                .font(StakFont.geist(13 * u))
                                .foregroundStyle(Color(argb: 0xFF819ABB))
                                .fixedSize(horizontal: false, vertical: true)
                        }
                    }
                }
            }
        }
    }

    @ViewBuilder
    private func contextQuestionCard(u: CGFloat) -> some View {
        HStack(spacing: 12 * u) {
            Image(systemName: "sparkles")
                .font(.system(size: 14 * u))
                .foregroundStyle(Color(argb: 0xFF69B3CA))
            Text(brief.contextQuestion)
                .font(StakFont.geist(13 * u))
                .foregroundStyle(Color(argb: 0xFFC8D2E0))
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(14 * u)
        .background(Color(argb: 0xFF0F1A2D), in: RoundedRectangle(cornerRadius: 12 * u))
        .overlay(RoundedRectangle(cornerRadius: 12 * u).stroke(Color(argb: 0x2269B3CA), lineWidth: 1))
    }

    @ViewBuilder
    private func watchSection(u: CGFloat) -> some View {
        sectionCard(title: "Watch for", u: u) {
            VStack(alignment: .leading, spacing: 12 * u) {
                ForEach(Array(brief.watchItems.enumerated()), id: \.offset) { _, item in
                    HStack(alignment: .top, spacing: 12 * u) {
                        if !item.icon.isEmpty {
                            Text(item.icon)
                                .font(.system(size: 18 * u))
                                .frame(width: 24 * u)
                        }
                        VStack(alignment: .leading, spacing: 3 * u) {
                            Text(item.label)
                                .font(StakFont.geist(13 * u, .medium))
                                .foregroundStyle(StakColors.textPrimary)
                            if !item.body.isEmpty {
                                Text(item.body)
                                    .font(StakFont.geist(12 * u))
                                    .foregroundStyle(Color(argb: 0xFF819ABB))
                                    .fixedSize(horizontal: false, vertical: true)
                            }
                        }
                    }
                }
            }
        }
    }

    @ViewBuilder
    private func sectionCard<Content: View>(title: String, u: CGFloat, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 12 * u) {
            Text(title)
                .font(StakFont.sora(13 * u, .semiBold))
                .foregroundStyle(Color(argb: 0xFF819ABB))
            content()
        }
        .padding(16 * u)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(argb: 0xFF181F30), in: RoundedRectangle(cornerRadius: 14 * u))
    }

    // MARK: – mood helpers

    private var moodTitle: String {
        switch brief.mood.lowercased() {
        case "bullish": return "Bullish"
        case "bearish": return "Bearish"
        case "neutral": return "Neutral"
        case "volatile": return "Volatile"
        default: return brief.mood.isEmpty ? "Market Update" : brief.mood.capitalized
        }
    }

    private var moodColor: Color {
        switch brief.mood.lowercased() {
        case "bullish": return Color(argb: 0xFF2FD08A)
        case "bearish": return Color(argb: 0xFFE05252)
        case "volatile": return Color(argb: 0xFFE0A352)
        default: return Color(argb: 0xFF69B3CA)
        }
    }

    @ViewBuilder
    private func moodIcon(u: CGFloat) -> some View {
        ZStack {
            Circle().fill(moodColor.opacity(0.15))
                .frame(width: 40 * u, height: 40 * u)
            Image(systemName: moodSystemIcon)
                .font(.system(size: 18 * u))
                .foregroundStyle(moodColor)
        }
    }

    private var moodSystemIcon: String {
        switch brief.mood.lowercased() {
        case "bullish": return "arrow.up.right"
        case "bearish": return "arrow.down.right"
        case "volatile": return "waveform"
        default: return "chart.line.uptrend.xyaxis"
        }
    }
}
