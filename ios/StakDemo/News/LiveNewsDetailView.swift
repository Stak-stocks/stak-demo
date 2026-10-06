import SwiftUI

/// Detail page for a live (server-fetched) news article — mirrors Android's LiveNewsDetailScreen.
/// Shown when the tapped article came from the server feed rather than the authored catalogue,
/// so it has no authored paragraphs, video, or READ NEXT pager.
struct LiveNewsDetailView: View {
    let article: NewsArticleDto
    let onBack: () -> Void
    var onOpenAi: (() -> Void)? = nil

    @ObservedObject private var holdings = MyStakHoldings.shared
    @ObservedObject private var saves = NewsSaves.shared

    private var isSaved: Bool { saves.ids.contains(article.url) }

    var body: some View {
        let u = figmaUnit
        VStack(spacing: 0) {
            // Navigation bar
            HStack {
                Button(action: onBack) {
                    Image(systemName: "chevron.left")
                        .font(.system(size: 18 * u, weight: .semibold))
                        .foregroundStyle(StakColors.textPrimary)
                        .frame(width: 44 * u, height: 44 * u)
                }
                Spacer()
                HStack(spacing: 12 * u) {
                    if let onOpenAi {
                        Button(action: onOpenAi) {
                            Image(systemName: "sparkles")
                                .font(.system(size: 16 * u))
                                .foregroundStyle(News.teal)
                        }
                    }
                    if !article.url.isEmpty {
                        Button {
                            saves.add(article.url)
                        } label: {
                            Image(systemName: isSaved ? "bookmark.fill" : "bookmark")
                                .font(.system(size: 16 * u))
                                .foregroundStyle(isSaved ? News.teal : StakColors.textPrimary)
                        }
                    }
                }
                .padding(.trailing, 4 * u)
            }
            .padding(.horizontal, 12 * u)
            .padding(.top, 8 * u)
            .frame(height: 56 * u)

            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    // Hero image
                    if !article.image.isEmpty {
                        AsyncImage(url: URL(string: article.image)) { phase in
                            if let img = phase.image {
                                img.resizable()
                                    .scaledToFill()
                                    .frame(maxWidth: .infinity)
                                    .frame(height: 220 * u)
                                    .clipped()
                            } else {
                                Color(argb: 0xFF181F30)
                                    .frame(maxWidth: .infinity)
                                    .frame(height: 220 * u)
                            }
                        }
                        .clipped()
                    }

                    VStack(alignment: .leading, spacing: 16 * u) {
                        // Source + age pill
                        HStack(spacing: 8 * u) {
                            if !article.ticker.isEmpty {
                                Text(article.ticker.uppercased())
                                    .font(StakFont.geist(10 * u, .medium))
                                    .foregroundStyle(News.teal)
                                    .padding(.horizontal, 8 * u)
                                    .padding(.vertical, 3 * u)
                                    .background(Color(argb: 0x1A69B3CA), in: Capsule())
                            }
                            Text(article.source)
                                .font(StakFont.geist(11 * u))
                                .foregroundStyle(News.muted)
                            Text("·")
                                .foregroundStyle(News.faint)
                            Text(ageLabel(article.datetime))
                                .font(StakFont.geist(11 * u))
                                .foregroundStyle(News.muted)
                        }

                        // Headline
                        Text(article.headline)
                            .font(StakFont.sora(20 * u, .semiBold))
                            .stakLineHeight(28 * u, size: 20 * u, face: .sora)
                            .foregroundStyle(StakColors.textPrimary)

                        // Summary / body
                        if !article.summary.isEmpty {
                            Text(article.summary)
                                .font(StakFont.geist(14 * u))
                                .stakLineHeight(22 * u, size: 14 * u, face: .geist)
                                .foregroundStyle(News.body)
                        }

                        // Explanation / why it matters
                        if !article.explanation.isEmpty {
                            VStack(alignment: .leading, spacing: 8 * u) {
                                Text("Why it matters")
                                    .font(StakFont.geist(11 * u, .medium))
                                    .tracking(0.6 * u)
                                    .foregroundStyle(News.teal)
                                Text(article.explanation)
                                    .font(StakFont.geist(14 * u))
                                    .stakLineHeight(22 * u, size: 14 * u, face: .geist)
                                    .foregroundStyle(News.body)
                            }
                            .padding(14 * u)
                            .background(Color(argb: 0x1A69B3CA), in: RoundedRectangle(cornerRadius: 12 * u))
                        }

                        // Related stock metrics row
                        if !article.ticker.isEmpty {
                            RelatedStockRow(ticker: article.ticker, u: u)
                        }

                        // External link
                        if let url = URL(string: article.url), !article.url.isEmpty {
                            Link(destination: url) {
                                HStack(spacing: 6 * u) {
                                    Text("Read full article")
                                        .font(StakFont.geist(13 * u, .medium))
                                        .foregroundStyle(News.teal)
                                    Image(systemName: "arrow.up.right")
                                        .font(.system(size: 11 * u))
                                        .foregroundStyle(News.teal)
                                }
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 14 * u)
                                .background(Color(argb: 0xFF181F30), in: RoundedRectangle(cornerRadius: 12 * u))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 12 * u)
                                        .strokeBorder(Color(argb: 0xFF2A3346), lineWidth: 1)
                                )
                            }
                        }
                    }
                    .padding(.horizontal, 20 * u)
                    .padding(.top, 20 * u)
                    .padding(.bottom, 40 * u)
                }
            }
        }
        .background(StakColors.bg.ignoresSafeArea())
    }

    private func ageLabel(_ ts: Int64) -> String {
        let secs = max(0, Int(Date().timeIntervalSince1970) - Int(ts))
        if secs < 3600 { return "\(secs / 60)m ago" }
        if secs < 86400 { return "\(secs / 3600)h ago" }
        return "\(secs / 86400)d ago"
    }
}

/// Compact stock metrics chip for a news article's related ticker.
private struct RelatedStockRow: View {
    let ticker: String
    let u: CGFloat

    @ObservedObject private var holdings = MyStakHoldings.shared

    private var inStak: Bool { holdings.tickers.contains(ticker.uppercased()) }

    var body: some View {
        HStack(spacing: 10 * u) {
            Text(ticker.uppercased())
                .font(StakFont.sora(13 * u, .semiBold))
                .foregroundStyle(StakColors.textPrimary)
            Spacer()
            if inStak {
                HStack(spacing: 4 * u) {
                    Image("StakLogoMark")
                        .resizable()
                        .frame(width: 14 * u, height: 14 * u)
                    Text("In your STAK")
                        .font(StakFont.geist(11 * u))
                        .foregroundStyle(Color(argb: 0xFF69B3CA))
                }
            }
        }
        .padding(.horizontal, 14 * u)
        .padding(.vertical, 12 * u)
        .background(Color(argb: 0xFF181F30), in: RoundedRectangle(cornerRadius: 12 * u))
        .overlay(
            RoundedRectangle(cornerRadius: 12 * u)
                .strokeBorder(Color(argb: 0xFF2A3346), lineWidth: 1)
        )
    }
}
