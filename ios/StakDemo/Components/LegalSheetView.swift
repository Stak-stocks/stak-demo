import SwiftUI

/// Which document the in-app sheet shows - the path of GET /api/legal/:doc.
enum LegalDocKind: String, Identifiable {
	case terms, privacy
	var id: String { rawValue }
	var fallbackTitle: String { self == .terms ? "Terms of Service" : "Privacy Policy" }
}

/// The Terms of Service and Privacy Policy, read from GET /api/legal/:doc - the same text the web shows at /terms and
/// /privacy (shared/src/legalText.ts). Kept for the life of the app once read. Mirrors android data/LegalDocs.kt.
@MainActor
enum LegalDocs {
	private static var cache: [LegalDocKind: LegalDocResponse] = [:]

	/// Nil when it couldn't be read (the sheet offers a retry).
	static func load(_ kind: LegalDocKind) async -> LegalDocResponse? {
		if let hit = cache[kind] { return hit }
		guard let doc = try? await StockRepository.shared.getLegal(kind.rawValue) else { return nil }
		cache[kind] = doc
		return doc
	}
}

/// The document in a sheet over the app - the whole text to scroll through, no browser. With `onAgree` (the
/// eligibility gate), "I agree" sits at the bottom and switches on once the end has been reached; without it the sheet
/// only reads. Mirrors android ui/components/LegalSheet.kt.
struct LegalSheetView: View {
	let kind: LegalDocKind
	var onAgree: (() -> Void)? = nil
	@Environment(\.dismiss) private var dismiss
	@State private var doc: LegalDocResponse? = nil
	@State private var failed = false
	@State private var reachedEnd = false

	private static let textInk = Color(argb: 0xFFC8D2E0)

	var body: some View {
		let u = figmaUnit
		VStack(spacing: 0) {
			HStack {
				Text(doc?.title ?? kind.fallbackTitle)
					.font(StakFont.sora(18 * u, .semiBold))
					.foregroundStyle(StakColors.textPrimary)
					.accessibilityAddTraits(.isHeader)
				Spacer()
				Button("Close") { dismiss() }
					.font(StakFont.geist(14 * u, .medium))
					.foregroundStyle(StakColors.teal)
					.buttonStyle(.pressDim)
			}
			.padding(.horizontal, 20 * u)
			.padding(.vertical, 14 * u)

			Group {
				if let doc {
					ScrollView {
						LazyVStack(alignment: .leading, spacing: 12 * u) {
							Text("Effective date: \(doc.effective)")
								.font(StakFont.geist(12 * u).italic())
								.foregroundStyle(StakColors.muted)
							Text(doc.notice)
								.font(StakFont.geist(11.5 * u, .semiBold))
								.foregroundStyle(Self.textInk)
								.padding(14 * u)
								.frame(maxWidth: .infinity, alignment: .leading)
								.background(Color(argb: 0xFF171D2C), in: RoundedRectangle(cornerRadius: 12 * u))
								.overlay(RoundedRectangle(cornerRadius: 12 * u).strokeBorder(Color(argb: 0x4069B3CA), lineWidth: 1 * u))
							ForEach(Array(doc.sections.enumerated()), id: \.offset) { _, section in
								VStack(alignment: .leading, spacing: 8 * u) {
									if !section.heading.isEmpty {
										Text(section.heading)
											.font(StakFont.sora(16 * u, .semiBold))
											.foregroundStyle(StakColors.textPrimary)
											.accessibilityAddTraits(.isHeader)
									}
									if let sub = section.sub {
										Text(sub).font(StakFont.geist(14 * u, .semiBold)).foregroundStyle(StakColors.teal)
									}
									ForEach(Array(section.blocks.enumerated()), id: \.offset) { _, block in
										if let text = block.text {
											Text(text).font(StakFont.geist(13.5 * u)).foregroundStyle(Self.textInk)
										}
										ForEach(Array((block.list ?? []).enumerated()), id: \.offset) { _, line in
											HStack(alignment: .top, spacing: 8 * u) {
												Text("•")
												Text(line).frame(maxWidth: .infinity, alignment: .leading)
											}
											.font(StakFont.geist(13.5 * u))
											.foregroundStyle(Self.textInk)
										}
									}
								}
								.padding(.top, 8 * u)
							}
							// Drawn only once scrolled into view: the end has been reached.
							Color.clear.frame(height: 1).onAppear { reachedEnd = true }
						}
						.padding(.horizontal, 20 * u)
						.padding(.bottom, 16 * u)
					}
				} else if failed {
					VStack(spacing: 10 * u) {
						Text("Couldn’t load this right now.").font(StakFont.geist(13 * u)).foregroundStyle(StakColors.muted)
						Button("Try again") { Task { await load() } }
							.font(StakFont.geist(13 * u, .medium))
							.foregroundStyle(StakColors.teal)
							.buttonStyle(.pressDim)
					}
					.frame(maxWidth: .infinity, maxHeight: .infinity)
				} else {
					Text("Loading…").font(StakFont.geist(13 * u)).foregroundStyle(StakColors.muted)
						.frame(maxWidth: .infinity, maxHeight: .infinity)
				}
			}
			.frame(maxHeight: .infinity)

			if let onAgree {
				VStack(spacing: 8 * u) {
					if doc != nil && !reachedEnd {
						Text("Scroll to the end to agree").font(StakFont.geist(11 * u)).foregroundStyle(StakColors.muted)
					}
					AuthCta(text: "I agree", enabled: doc != nil && reachedEnd) {
						guard doc != nil, reachedEnd else { return }
						onAgree()
						dismiss()
					}
				}
				.padding(.top, 8 * u)
				.padding(.bottom, 16 * u)
			}
		}
		.background(StakColors.bg.ignoresSafeArea())
		.task { await load() }
	}

	private func load() async {
		failed = false
		doc = await LegalDocs.load(kind)
		failed = doc == nil
	}
}
