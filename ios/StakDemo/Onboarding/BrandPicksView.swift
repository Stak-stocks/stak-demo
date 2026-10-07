import SwiftUI

private struct Brand: Identifiable {
	let name: String
	let asset: String
	var id: String { name }
}

/// The 12 brand tiles of Figma "Onboarding · 02 Brand picks" (1554:8541), in grid order.
private let brands: [Brand] = [
	Brand(name: "Apple", asset: "BrandApple"),
	Brand(name: "Tesla", asset: "BrandTesla"),
	Brand(name: "Nike", asset: "BrandNike"),
	Brand(name: "Spotify", asset: "BrandSpotify"),
	Brand(name: "Netflix", asset: "BrandNetflix"),
	Brand(name: "Amazon", asset: "BrandAmazon"),
	Brand(name: "Disney", asset: "BrandDisney"),
	Brand(name: "Microsoft", asset: "BrandMicrosoft"),
	Brand(name: "NVIDIA", asset: "BrandNVIDIA"),
	Brand(name: "PlayStation", asset: "BrandPlayStation"),
	Brand(name: "Coinbase", asset: "BrandCoinbase"),
	Brand(name: "Uber", asset: "BrandUber")
]

/// The five tiles selected on the authored frame (1554:8541), by brand name.

/// Onboarding · 02 Brand picks — Figma node 1554:8541 (CHINEDU file, "STEP 2 OF 6").
///
/// A 3-wide grid of #181f30 tiles, each a white 34pt circle with the real
/// brand mark (flattened Figma exports) and a Geist 11 label. Selected
/// tiles carry a 1.5pt rgba(105,179,202,0.5) border and a white label.
/// The gradient CTA counts the picks ("Continue · N picked"), with the
/// hairline "Back" button and "You can change this later" underneath.
struct BrandPicksView: View {
	let onBack: () -> Void
	let onContinue: () -> Void
	// The frame (1554:8541) arrives with five brands already picked and the
	// CTA reading "Continue · 5 picked"; the build starts in that state
	// (Codex parity audit 2026-09-04). Every tile stays toggleable.
	// Product audit (2026-09-05): a real first run starts with nothing picked (the
	// frame's five were authored demo state).
	@State private var picked: Set<String> = []

	var body: some View {
		let u = figmaUnit
		Artboard {
			// Nav row — back circle + step label.
			HStack {
				AuthBackCircle(action: onBack)
				Spacer()
				Text("STEP 2 OF 6")
					.font(StakFont.geist(10 * u, .medium))
					.tracking(0.9 * u)
					.foregroundStyle(Auth.faintText)
			}
			.padding(.horizontal, 20 * u)
			.padding(.top, 10 * u)
			.padding(.bottom, 4 * u)

			ScrollView {
				VStack(alignment: .leading, spacing: 18 * u) {
					VStack(alignment: .leading, spacing: 12 * u) {
						Text("Which brands do you know or use?")
							.font(StakFont.sora(24 * u, .semiBold))
							.stakLineHeight(31 * u, size: 24 * u, face: .sora)
							.foregroundStyle(StakColors.textPrimary)
						Text("Pick a few. STAK uses this to learn what feels familiar to you.")
							// Authored box (1:255): 303 wide -> the designed two-line wrap.
							.font(StakFont.geist(12 * u))
							.stakLineHeight(16 * u, size: 12 * u, face: .geist)
							.foregroundStyle(Auth.subtitleGray)
							.frame(width: 303 * u, alignment: .leading)
					}

					// 3-wide tile grid, 10pt gaps.
					VStack(spacing: 10 * u) {
						ForEach(0..<4) { row in
							HStack(spacing: 10 * u) {
								ForEach(brands[row * 3..<(row * 3 + 3)]) { brand in
									BrandTile(brand: brand, selected: picked.contains(brand.name)) {
										if picked.contains(brand.name) {
											picked.remove(brand.name)
										} else {
											picked.insert(brand.name)
										}
									}
								}
							}
						}
					}
					.padding(.top, 6 * u)
				}
				.frame(maxWidth: .infinity, alignment: .leading)
				.padding(.horizontal, 24 * u)
				.padding(.top, 14 * u)
			}

			VStack(spacing: 10 * u) {
				AuthCta(text: picked.isEmpty ? "Continue" : "Continue · \(picked.count) picked", enabled: picked.count >= 3) {
					// User's call (2026-08-21): Continue unlocks at three picks.
					if picked.count >= 3 {
						UserProfile.shared.brandPicks = picked
						onContinue()
					}
				}
				AuthSecondaryButton(text: "Back", action: onBack)
				Text("You can change this later")
					.font(StakFont.geist(11 * u))
					.foregroundStyle(Auth.faintText)
			}
			.padding(.top, 8 * u)
			.padding(.bottom, 26 * u)
		}
		.background(StakColors.bg.ignoresSafeArea())
	}
}

/// One brand tile — white circle render + label; teal border when selected.
private struct BrandTile: View {
	let brand: Brand
	let selected: Bool
	let action: () -> Void

	var body: some View {
		let u = figmaUnit
		Button(action: action) {
			VStack(spacing: 7 * u) {
				Image(brand.asset)
					.resizable()
					.frame(width: 34 * u, height: 34 * u)
				Text(brand.name)
					.font(StakFont.geist(11 * u))
					.foregroundStyle(selected ? StakColors.textPrimary : StakColors.muted)
					// lh14 — a fixed 14u line box so the tile lands at the
					// authored 79u height (13 + 34 + 7 + 14 + 11).
					.frame(height: 14 * u)
			}
			.frame(maxWidth: .infinity)
			.padding(.top, 13 * u)
			.padding(.bottom, 11 * u)
			.padding(.horizontal, 4 * u)
			.background(Auth.inputBg, in: RoundedRectangle(cornerRadius: 14 * u))
			.overlay {
				if selected {
					RoundedRectangle(cornerRadius: 14 * u)
						.strokeBorder(Color(argb: 0x8069B3CA), lineWidth: 1.5 * u)
				}
			}
		}
		.buttonStyle(.pressDim)
	}
}
