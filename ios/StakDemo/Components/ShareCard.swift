import SwiftUI
import UIKit

/// A share picture: STAK's mark, what's being shared, its figure, the selected range's change and chart - 1080x1350 (a
/// 4:5 post), in the app's colours - sent with its line in words. Drawn to the same pixel layout as android ShareCard and
/// web lib/shareCard.ts.
enum ShareCard {
	struct Spec {
		/// "MY PICK" / "MY PORTFOLIO".
		let kicker: String
		/// "NVDA" / "My STAK portfolio".
		let title: String
		/// The company's name, or what the portfolio is.
		let subtitle: String?
		/// The price, or the portfolio's value: "$188.42".
		let figure: String
		/// The range's change: "▲ +$12.30 (+6.9%) past month".
		let line: String
		let up: Bool
		/// One more line under it ("My gain +$94.20 (+6.2%) · Picked Oct 8 at $98.50").
		let note: String?
		/// The chart's values, oldest first (nothing drawn under two).
		let values: [Double]
	}

	private static let width: CGFloat = 1080
	private static let height: CGFloat = 1350
	private static let pad: CGFloat = 88
	private static let white = UIColor.white
	private static let muted = UIColor(red: 0x81 / 255, green: 0x9A / 255, blue: 0xBB / 255, alpha: 1)
	private static let teal = UIColor(red: 0x69 / 255, green: 0xB3 / 255, blue: 0xCA / 255, alpha: 1)
	private static let green = UIColor(red: 0x2F / 255, green: 0xD0 / 255, blue: 0x8A / 255, alpha: 1)
	private static let red = UIColor(red: 0xFF / 255, green: 0x6B / 255, blue: 0x6B / 255, alpha: 1)
	private static let bg = UIColor(red: 0x0A / 255, green: 0x10 / 255, blue: 0x20 / 255, alpha: 1)

	/// Shares the picture with `text` through the system sheet; with no picture, the words.
	@MainActor
	static func share(_ spec: Spec, text: String) {
		let scene = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }.first
		guard let root = scene?.keyWindow?.rootViewController else { return }
		var top = root
		while let presented = top.presentedViewController { top = presented }
		let items: [Any] = [render(spec), text]
		let sheet = UIActivityViewController(activityItems: items, applicationActivities: nil)
		sheet.popoverPresentationController?.sourceView = top.view
		top.present(sheet, animated: true)
	}

	private static func font(_ name: String, _ size: CGFloat) -> UIFont {
		UIFont(name: name, size: size) ?? .systemFont(ofSize: size)
	}

	/// The longest start of `text` that fits `max` wide in `attrs`, with "…" when cut.
	private static func fit(_ text: String, _ attrs: [NSAttributedString.Key: Any], _ max: CGFloat) -> String {
		if (text as NSString).size(withAttributes: attrs).width <= max { return text }
		var s = text
		while s.count > 1 && ((s + "…") as NSString).size(withAttributes: attrs).width > max { s.removeLast() }
		return s + "…"
	}

	static func render(_ spec: Spec) -> UIImage {
		let format = UIGraphicsImageRendererFormat()
		format.scale = 1
		return UIGraphicsImageRenderer(size: CGSize(width: width, height: height), format: format).image { ctx in
			let cg = ctx.cgContext
			bg.setFill()
			cg.fill(CGRect(x: 0, y: 0, width: width, height: height))
			let space = CGColorSpaceCreateDeviceRGB()
			if let glow = CGGradient(colorsSpace: space, colors: [teal.withAlphaComponent(0.22).cgColor, teal.withAlphaComponent(0).cgColor] as CFArray, locations: [0, 1]) {
				cg.drawRadialGradient(glow, startCenter: CGPoint(x: width * 0.85, y: 0), startRadius: 0, endCenter: CGPoint(x: width * 0.85, y: 0), endRadius: width * 0.9, options: [])
			}

			// The mark and wordmark (white vectors).
			UIImage(named: "StakLogoMark")?.draw(in: CGRect(x: pad, y: pad, width: 64, height: 64))
			UIImage(named: "IcStakWordmark")?.draw(in: CGRect(x: pad + 78, y: pad + 17, width: 156, height: 30))

			let maxW = width - pad * 2
			/// Draws `s` with its baseline at `y` (as the web and Android canvases place text).
			func draw(_ s: String, _ base: UIFont, _ color: UIColor, x: CGFloat, y: CGFloat, kern: CGFloat = 0, right: Bool = false, shrink: Bool = false) {
				// The figure and its line shrink to fit rather than lose digits ("$1,234,5…").
				var f = base
				if shrink {
					let w = (s as NSString).size(withAttributes: [.font: base]).width
					if w > maxW { f = base.withSize(base.pointSize * maxW / w) }
				}
				let attrs: [NSAttributedString.Key: Any] = [.font: f, .foregroundColor: color, .kern: kern]
				let shown = fit(s, attrs, maxW)
				let size = (shown as NSString).size(withAttributes: attrs)
				let originX = right ? x - size.width : x
				(shown as NSString).draw(at: CGPoint(x: originX, y: y - f.ascender), withAttributes: attrs)
			}

			let color = spec.up ? green : red
			draw(spec.kicker, font("Geist-Medium", 30), muted, x: pad, y: 280, kern: 2.4)
			var y: CGFloat = 380
			draw(spec.title, font("Sora-SemiBold", spec.title.count > 10 ? 72 : 96), white, x: pad, y: y)
			if let subtitle = spec.subtitle { y += 60; draw(subtitle, font("Geist-Regular", 36), muted, x: pad, y: y) }
			y += 160
			draw(spec.figure, font("Sora-SemiBold", 120), white, x: pad, y: y, shrink: true)
			y += 70
			draw(spec.line, font("Geist-Medium", 40), color, x: pad, y: y, shrink: true)
			if let note = spec.note { y += 54; draw(note, font("Geist-Regular", 32), muted, x: pad, y: y) }

			// The chart: the range's line with a soft fill under it.
			let top = max(y + 70, 820)
			let bottom: CGFloat = 1150
			if spec.values.count >= 2, let lo = spec.values.min(), let hi = spec.values.max() {
				let span = hi - lo > 0 ? hi - lo : 1
				let last = CGFloat(spec.values.count - 1)
				let points = spec.values.enumerated().map { i, v in
					CGPoint(x: pad + maxW * CGFloat(i) / last, y: bottom - CGFloat((v - lo) / span) * (bottom - top))
				}
				let line = UIBezierPath()
				line.move(to: points[0])
				points.dropFirst().forEach { line.addLine(to: $0) }
				let area = line.copy() as! UIBezierPath
				area.addLine(to: CGPoint(x: points[points.count - 1].x, y: bottom))
				area.addLine(to: CGPoint(x: points[0].x, y: bottom))
				area.close()
				cg.saveGState()
				area.addClip()
				if let fill = CGGradient(colorsSpace: space, colors: [color.withAlphaComponent(0.28).cgColor, bg.withAlphaComponent(0).cgColor] as CFArray, locations: [0, 1]) {
					cg.drawLinearGradient(fill, start: CGPoint(x: 0, y: top), end: CGPoint(x: 0, y: bottom), options: [])
				}
				cg.restoreGState()
				color.setStroke()
				line.lineWidth = 6
				line.lineJoinStyle = .round
				line.lineCapStyle = .round
				line.stroke()
			}

			// It's practice money - said on the picture itself, since it travels without the app around it.
			draw("Paper trading on STAK · not real money", font("Geist-Regular", 28), muted, x: pad, y: height - pad)
			draw("thestak.org", font("Geist-Medium", 30), teal, x: width - pad, y: height - pad, right: true)
		}
	}
}
