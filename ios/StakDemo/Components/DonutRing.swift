import SwiftUI

/// A new account's allocation ring (product audit, 2026-09-05): one arc per
/// bucket, clockwise from the top, a small gap between arcs, drawn in the
/// 150-box the authored donut exports (MsDonut / SimDonut) occupy. The demo
/// account keeps those exports. Mirrors android ui/components/DonutRing.kt.
struct DonutRing: View {
	let shares: [CGFloat]
	let colors: [Color]
	let size: CGFloat

	var body: some View {
		let u = figmaUnit
		let stroke = 28 * u
		let gap: CGFloat = shares.count > 1 ? 5 : 0
		Canvas { context, box in
			let center = CGPoint(x: box.width / 2, y: box.height / 2)
			let radius = (min(box.width, box.height) - stroke) / 2
			var start: CGFloat = -90
			for (i, share) in shares.enumerated() {
				let sweep = max(2, 360 * share - gap)
				var arc = Path()
				arc.addArc(
					center: center, radius: radius,
					startAngle: .degrees(start + gap / 2), endAngle: .degrees(start + gap / 2 + sweep),
					clockwise: false
				)
				context.stroke(arc, with: .color(colors[i % max(colors.count, 1)]), style: StrokeStyle(lineWidth: stroke, lineCap: .butt))
				start += 360 * share
			}
		}
		.frame(width: size, height: size)
	}
}
