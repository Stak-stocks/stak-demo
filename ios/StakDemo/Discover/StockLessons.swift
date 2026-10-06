import SwiftUI

/// One plain-English lesson - a title, its two-line summary and the short read behind "Read lesson".
struct Lesson {
	let title: String
	let summary: String
	let body: [String]
}

/// The Stock Detail's Related lesson (FigJam Discover board, 2026-09-14: Stock
/// detail -> Related lesson). One lesson per collection - the sector the stock
/// sits in - and a general one for anything uncatalogued. The backend serves
/// real lessons in production. Mirrors android ui/discover/StockLessons.kt.
enum StockLessons {
	private static let byCollection: [String: Lesson] = [
		"aitech": Lesson(
			title: "Why chip stocks swing so hard",
			summary: "Demand for AI hardware comes in waves, and prices ride every wave up and down.",
			body: [
				"Chipmakers sell into cycles: when data centres and phone makers stock up, orders surge; when they have enough, orders stall. The stock price tends to run ahead of both turns.",
				"That is why a great company can still be a bumpy stock. Nothing changed about the business - the market changed its guess about the next order book.",
				"What to do with it: size a chip position so a 20% drop is uncomfortable, not ruinous, and judge the company on multi-year demand rather than one quarter."
			]
		),
		"finance": Lesson(
			title: "How interest rates move bank profits",
			summary: "Banks earn the gap between what they pay savers and what they charge borrowers.",
			body: [
				"When rates rise, banks can charge more on loans faster than they raise what they pay on deposits - the gap, called net interest margin, widens and profits follow.",
				"When rates fall, the gap narrows, but cheaper credit means more people borrow, so volume can make up for margin. Payment networks like Visa care less about rates and more about how much people spend.",
				"What to do with it: read a bank's results for margin and loan growth together, and expect the stock to react to central-bank news before the earnings even land."
			]
		),
		"green": Lesson(
			title: "Policy is the weather for clean energy",
			summary: "Subsidies, tariffs and rate changes matter as much as sunshine for solar and grid stocks.",
			body: [
				"Clean-energy projects are financed over decades, so their value depends on the cost of borrowing and on how long tax credits last. A policy shift can reprice a whole sector in a day.",
				"Utilities that own the grid are the steadier end: regulated returns and slow, predictable growth. Equipment makers like solar-inverter companies are the fast, swingy end.",
				"What to do with it: know which end of the sector a stock sits on, and treat policy headlines as part of the fundamentals, not noise."
			]
		),
		"realestate": Lesson(
			title: "REITs: rent cheques as a stock",
			summary: "A real-estate trust passes most of its rent to shareholders, so it behaves like a bond with a growth kicker.",
			body: [
				"REITs must pay out most of their income as dividends, which is why their yields look high. The trade-off: they raise money by borrowing, so higher rates squeeze them twice - dearer debt and more competition from bonds.",
				"Warehouses, data centres and shops behave differently. Logistics rents track online shopping; retail rents track footfall; both track the economy.",
				"What to do with it: judge a REIT by occupancy, lease length and debt cost, and expect the price to move opposite to interest-rate news."
			]
		),
		"health": Lesson(
			title: "Patents, pipelines and patience",
			summary: "A drug company's future is its pipeline; its present is how long its best sellers stay protected.",
			body: [
				"A blockbuster drug earns for as long as its patent holds, then generic copies arrive and revenue falls off a cliff. Investors watch the cliff dates as closely as the sales.",
				"The pipeline - drugs in trials - is the replacement. Trial results are binary: a pass can add billions overnight, a fail can erase them. Insurers and hospital groups are the calmer end of healthcare.",
				"What to do with it: for drug makers, know the patent calendar and the next trial readout; for the rest, follow enrolment and pricing, not headlines."
			]
		),
		"consumer": Lesson(
			title: "Brands, margins and the shopper's mood",
			summary: "Consumer companies live on repeat purchases, so watch what people keep buying when money is tight.",
			body: [
				"A strong brand lets a company raise prices without losing customers - that pricing power shows up as a steady profit margin through inflation.",
				"Membership models like a warehouse club earn from fees before they sell a thing, which smooths the ride. Fashion and sportswear ride the mood: hot one season, discounted the next.",
				"What to do with it: track same-store sales and margins, and remember that a beloved brand can still be an expensive stock."
			]
		)
	]

	private static let general = Lesson(
		title: "What actually moves a stock price",
		summary: "Prices move on the gap between what the market expected and what it gets.",
		body: [
			"A company can report record profits and the stock can still fall - because the market had priced in even better. Expectations, not results, set the direction on the day.",
			"Over years, though, price follows earnings and cash. The daily noise is investors updating their guesses; the long trend is the business doing its work.",
			"What to do with it: decide whether you are trading the guesses or owning the business, and size the position for the one you chose."
		]
	)

	/// The lesson for a stock - its collection's, or the general one.
	static func lessonFor(_ symbol: String) -> Lesson {
		let id = StakCollections.all.first { c in c.stocks.contains { $0.ticker == symbol } }?.id
		return id.flatMap { byCollection[$0] } ?? general
	}
}

/// The Related lesson card - kicker, title, summary and an inline "Read lesson" expander.
struct LessonCard: View {
	let lesson: Lesson
	@State private var open = false

	var body: some View {
		let u = figmaUnit
		Button { withAnimation(.easeOut(duration: 0.2)) { open.toggle() } } label: {
			VStack(alignment: .leading, spacing: 8 * u) {
				Text("RELATED LESSON")
					.font(StakFont.geist(11 * u, .medium))
					.foregroundStyle(Color(argb: 0xFF5BD7E4))
				Text(lesson.title)
					.font(StakFont.sora(15 * u, .semiBold))
					.foregroundStyle(StakColors.textPrimary)
				Text(lesson.summary)
					.font(StakFont.geist(12 * u))
					.foregroundStyle(Color(argb: 0xFFC8D2E0))
				if open {
					VStack(alignment: .leading, spacing: 8 * u) {
						ForEach(Array(lesson.body.enumerated()), id: \.offset) { _, p in
							Text(p)
								.font(StakFont.geist(12 * u))
								.foregroundStyle(Color(argb: 0xFF819ABB))
						}
					}
					.padding(.top, 4 * u)
				}
				HStack {
					Text(open ? "Close lesson" : "Read lesson · 2 min")
						.font(StakFont.geist(12 * u, .medium))
						.foregroundStyle(Color(argb: 0xFF69B3CA))
					Spacer()
					Text(open ? "⌃" : "⌄")
						.font(StakFont.geist(14 * u))
						.foregroundStyle(Color(argb: 0xFF819ABB))
				}
			}
			.multilineTextAlignment(.leading)
			.frame(maxWidth: .infinity, alignment: .leading)
			.padding(14 * u)
			.background(Color(argb: 0xFF181F30), in: RoundedRectangle(cornerRadius: 12 * u))
			.contentShape(Rectangle())
		}
		.buttonStyle(.pressDim)
	}
}
