import Foundation

/// Authored update feed shown for the demo account in UpdatesView.
/// Mirrors the Android demo persona's authored update list.
enum DemoUpdates {
    static let all: [StockUpdateDto] = [
        StockUpdateDto(
            id: 101, ticker: "NVDA", company: "NVIDIA Corp", kind: "earnings",
            title: "Q3 revenue of $30.0B — data centre demand holds strong",
            body: "Hyperscaler spending on Blackwell GPUs drove another beat. Gross margin expanded to 75.1%.",
            watch: "Rack-scale GB200 shipment ramp and competitive pressure from AMD MI300X.",
            sources: [], occurredAt: "2026-10-01T10:00:00Z", read: false
        ),
        StockUpdateDto(
            id: 102, ticker: "AAPL", company: "Apple Inc", kind: "product",
            title: "Apple Intelligence rolls out to 60 more countries",
            body: "The on-device AI features expand to EU, Japan and LatAm in the October software update.",
            watch: "Upgrade-cycle pull-through and developer adoption of on-device model APIs.",
            sources: [], occurredAt: "2026-09-28T14:00:00Z", read: false
        ),
        StockUpdateDto(
            id: 103, ticker: "MSFT", company: "Microsoft Corp", kind: "partnership",
            title: "Microsoft and OpenAI extend exclusivity agreement through 2030",
            body: "The deal keeps Azure as the sole cloud provider for OpenAI's frontier model training workloads.",
            watch: "Azure AI revenue contribution and potential antitrust scrutiny in the EU.",
            sources: [], occurredAt: "2026-09-22T09:00:00Z", read: false
        ),
        StockUpdateDto(
            id: 104, ticker: "GOOGL", company: "Alphabet Inc", kind: "earnings",
            title: "Alphabet Q3 — Search ad revenue up 12% YoY despite AI query shift",
            body: "AI Overviews are showing higher ad click rates than traditional results, easing cannibalisation fears.",
            watch: "Cloud growth acceleration and YouTube ad recovery.",
            sources: [], occurredAt: "2026-09-15T10:00:00Z", read: true
        ),
        StockUpdateDto(
            id: 105, ticker: "AMD", company: "Advanced Micro Devices", kind: "product",
            title: "AMD ships MI400 GPU series for AI inference workloads",
            body: "The MI400 targets inference cost-per-token and is already in qualification at three hyperscalers.",
            watch: "Design wins and market share gains against NVIDIA in inference deployments.",
            sources: [], occurredAt: "2026-09-10T11:00:00Z", read: true
        ),
        StockUpdateDto(
            id: 106, ticker: "JPM", company: "JPMorgan Chase", kind: "analysis",
            title: "JPMorgan raises 2026 net interest income guidance",
            body: "Higher-for-longer rate environment lifts NII outlook. Investment banking fees also recovering.",
            watch: "Credit loss provisions as consumer debt levels rise.",
            sources: [], occurredAt: "2026-09-05T08:00:00Z", read: true
        ),
    ]

    static var unread: Int { all.filter { !$0.read }.count }
}
