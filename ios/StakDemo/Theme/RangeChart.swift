import SwiftUI

/// The six range labels every chart offers; "3M" is the authored default and keeps each frame's exported line.
let rangeLabels = ["1D", "1W", "1M", "3M", "YTD", "1Y"]

/// A chart at a range. "3M" shows the authored export (`authored`); every
/// other range draws the shared demo series in the same box - a `tint`
/// 2-wide round stroke and nothing else: every authored "Chart line" is a
/// bare #69B3CA 2 stroke with no fill (user, 2026-09-05). The series are demo
/// stand-ins until the backend serves price history. Shared by Simulate,
/// My STAK, Stock Detail and Pick Detail (user, 2026-09-05: "be able to
/// click on the timeline"). Mirrors android ui/components/RangeChart.kt.
struct RangeLineChart: View {
	let range: String
	let tint: Color
	let authored: String
	let width: CGFloat
	let height: CGFloat
	/// A real move in percent: the line is DRAWN from it - flat at 0, the
	/// authored swing at +/-5 - instead of the demo export (a new account's
	/// charts, product audit 2026-09-05). nil keeps the demo behaviour.
	var move: Double? = nil
	/// When set, the chart fetches live portfolio data for these comma-separated tickers
	/// and renders the indexed series from the server. Overrides `move` and authored exports.
	var portfolioTickers: [String]? = nil

	@State private var livePoints: [CGFloat]? = nil
	@State private var fetchTask: Task<Void, Never>? = nil

	/// The 3M shape when a line is drawn instead of exported.
	static let series3M: [CGFloat] = [0.30, 0.34, 0.32, 0.40, 0.38, 0.46, 0.52, 0.48, 0.58, 0.56, 0.64, 0.70, 0.66, 0.76, 0.84]

	/// Height fraction from the bottom (0 = bottom) per point, spread
	/// evenly across the width.
	static let series: [String: [CGFloat]] = [
		"1D": [0.45, 0.50, 0.42, 0.55, 0.60, 0.52, 0.58, 0.66, 0.62, 0.70],
		"1W": [0.30, 0.38, 0.35, 0.50, 0.46, 0.60, 0.72],
		"1M": [0.25, 0.30, 0.28, 0.42, 0.38, 0.52, 0.48, 0.60, 0.55, 0.68, 0.75],
		"YTD": [0.20, 0.35, 0.30, 0.45, 0.40, 0.55, 0.50, 0.62, 0.70, 0.66, 0.80],
		"1Y": [0.15, 0.22, 0.30, 0.26, 0.40, 0.36, 0.50, 0.55, 0.48, 0.62, 0.70, 0.82]
	]

	var body: some View {
		let u = figmaUnit
		Group {
			if let live = livePoints {
				GeometryReader { geo in
					let line = RangeLineChart.linePath(live, in: geo.size)
					line.stroke(tint, style: StrokeStyle(lineWidth: 2 * u, lineCap: .round, lineJoin: .round))
				}
			} else if let move {
				let points = StakInsights.scaled(RangeLineChart.series[range] ?? RangeLineChart.series3M, move)
				GeometryReader { geo in
					let line = RangeLineChart.linePath(points, in: geo.size)
					line.stroke(tint, style: StrokeStyle(lineWidth: 2 * u, lineCap: .round, lineJoin: .round))
				}
			} else if let points = RangeLineChart.series[range], range != "3M" {
				GeometryReader { geo in
					let line = RangeLineChart.linePath(points, in: geo.size)
					line.stroke(tint, style: StrokeStyle(lineWidth: 2 * u, lineCap: .round, lineJoin: .round))
				}
			} else {
				Image(authored)
					.resizable()
					.scaledToFit()
			}
		}
		.frame(width: width, height: height)
		.task(id: taskKey) { await fetchLiveChart() }
	}

	private var taskKey: String {
		guard let tickers = portfolioTickers else { return "" }
		return tickers.joined(separator: ",") + "-" + range
	}

	private func fetchLiveChart() async {
		guard let tickers = portfolioTickers, !tickers.isEmpty else { livePoints = nil; return }
		let resp = try? await StockRepository.shared.getPortfolioChart(tickers, range: range)
		guard let indexed = resp?.indexed, indexed.count > 1 else { livePoints = nil; return }
		let minV = indexed.min() ?? 0
		let maxV = indexed.max() ?? 1
		let span = max(maxV - minV, 0.001)
		let fractions = indexed.map { CGFloat(($0 - minV) / span) }
		livePoints = fractions
	}

	/// The series as a polyline across the box.
	/// The line through `points` (fractions of the height, 0 = bottom) spread evenly across `size` - shared with the
	/// stock page's live chart.
	static func linePath(_ points: [CGFloat], in size: CGSize) -> Path {
		var path = Path()
		let steps = CGFloat(max(points.count - 1, 1))
		for (i, fraction) in points.enumerated() {
			let point = CGPoint(x: size.width * CGFloat(i) / steps, y: size.height * (1 - fraction))
			if i == 0 { path.move(to: point) } else { path.addLine(to: point) }
		}
		return path
	}
}

/// The authored 39x22.5 teal pill row; `selected` follows the tap.
struct RangePills: View {
	@Binding var selected: String
	let tint: Color
	let muted: Color

	var body: some View {
		let u = figmaUnit
		HStack(spacing: 37 * u) {
			ForEach(rangeLabels, id: \.self) { label in
				Button { selected = label } label: {
					if label == selected {
						Text(label)
							.font(StakFont.geist(12 * u, .medium))
							.foregroundStyle(tint)
							.frame(width: 39 * u, height: 22.5 * u)
							.dynamicTypeSize(...DynamicTypeSize.xLarge)
							.background(Color(argb: 0x292C9DBC), in: RoundedRectangle(cornerRadius: 11.25 * u))
							.overlay(
								RoundedRectangle(cornerRadius: 11.25 * u)
									.strokeBorder(Color(argb: 0x662C9DBC), lineWidth: 0.75 * u)
							)
					} else {
						Text(label)
							.font(StakFont.geist(12 * u))
							.foregroundStyle(muted)
							.dynamicTypeSize(...DynamicTypeSize.xLarge)
					}
				}
				.buttonStyle(.pressDim)
				.accessibilityLabel(rangeSpoken[label] ?? label)
				.accessibilityAddTraits(label == selected ? .isSelected : [])
			}
		}
	}
}

/// What VoiceOver says for each range pill.
let rangeSpoken: [String: String] = [
	"1D": "1 day", "1W": "1 week", "1M": "1 month", "3M": "3 months", "YTD": "Year to date", "1Y": "1 year",
]
