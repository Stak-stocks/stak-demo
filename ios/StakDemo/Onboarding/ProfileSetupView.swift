import SwiftUI
import UIKit
import PhotosUI

private let nameMax = 20

/// Onboarding · 09 Profile setup — Figma node 1:793 (CHINEDU file,
/// "STEP · LAST ONE"). Mirrors android ui/onboarding/ProfileSetupScreen.kt.
///
/// Final onboarding step: 96pt #242b3d avatar circle with the teal ring
/// and the display-name initial, "Add a photo" link, the DISPLAY NAME
/// input card with its live "n / 20" counter, and the gradient
/// "Proceed to home" CTA. Both the avatar circle and the link open the
/// system photo picker and the chosen image becomes the avatar; the
/// picker carries its own permission flow, so the app requests none.
struct ProfileSetupView: View {
	let onBack: () -> Void
	let onProceed: () -> Void
	/// The same frame serves as the Profile hub's edit page (its own copy promises
	/// "You can change this anytime in Profile."; user, 2026-09-07) - it arrives
	/// with the account's name and photo and saves in place.
	var editing: Bool = false
	@State private var seeded = false

	// The frame arrives with "Nedu" typed (avatar "N", counter 4 / 20) - user, 2026-09-04 (CHINEDU 01 · Onboarding 1:793): the exact frame wins.
	// Product audit (2026-09-05): a real first run starts with an empty name (the
	// frame's "Nedu" was authored demo state) and Proceed waits for one.
	@State private var name = ""
	@State private var showPhotoPicker = false
	@State private var pickedItem: PhotosPickerItem? = nil
	/// The picked photo as a ~512px JPEG (tens of KB) - never the original.
	@State private var photoData: Data? = nil
	/// Proceed waits for the thumbnail (mirrors the Android review fix, PR #166): leaving mid-load would persist a nil photo.
	@State private var loadingPhoto = false
	/// A second pick before the first load finished supersedes it (Codex review, PR #166 mirror): the older Task touches no state.
	@State private var loadGen = 0
	/// The same thumbnail decoded once, so the avatar does not re-decode
	/// on every keystroke of the name field.
	@State private var photo: UIImage? = nil

	var body: some View {
		let u = figmaUnit
		Artboard {
			HStack {
				AuthBackCircle(action: onBack)
				Spacer()
			}
			.padding(.horizontal, 20 * u)
			.padding(.top, 10 * u)
			.padding(.bottom, 4 * u)
			OnboardingKicker(text: editing ? "PROFILE" : "STEP · LAST ONE")

			VStack(alignment: .leading, spacing: 18 * u) {
				VStack(alignment: .leading, spacing: 12 * u) {
					Text("Make it yours")
						.font(StakFont.sora(26 * u, .semiBold))
						.foregroundStyle(StakColors.textPrimary)
					Text("Pick a name and photo. This is how you’ll show up on leaderboards.")
						.font(StakFont.geist(12 * u))
						.foregroundStyle(Auth.subtitleGray)
						.frame(width: 276 * u, alignment: .leading)
				}

				// Avatar — 96pt #242b3d circle, 2pt teal ring, Sora 36 initial.
				// Tapping the circle (or the link below) opens the photo picker;
				// the picked image fills the circle under the ring.
				VStack(spacing: 10 * u) {
					Button(action: { showPhotoPicker = true }) {
						ZStack {
							Circle().fill(Color(argb: 0xFF242B3D))
							if let photo {
								Image(uiImage: photo)
									.resizable()
									.scaledToFill()
									.frame(width: 96 * u, height: 96 * u)
									.clipShape(Circle())
							} else {
								Text(name.first.map { String($0).uppercased() } ?? "")
									.font(StakFont.sora(36 * u, .semiBold))
									.foregroundStyle(Color(argb: 0xFF9EADC7))
							}
							Circle().strokeBorder(Auth.linkTeal, lineWidth: 2 * u)
						}
						.frame(width: 96 * u, height: 96 * u)
					}
					.buttonStyle(.pressDim)
					.accessibilityLabel(photoData == nil ? "Add a photo" : "Profile photo")
					Button(action: { showPhotoPicker = true }) {
						Text(photo == nil ? "Add a photo" : "Change photo")
							.font(StakFont.geist(12 * u, .medium))
							.foregroundStyle(Auth.linkTeal)
					}
					.buttonStyle(.pressDim)
				}
				.frame(maxWidth: .infinity)
				.padding(.vertical, 6 * u)

				Text("DISPLAY NAME")
					.font(StakFont.geist(10 * u, .medium))
					.tracking(1.2 * u)
					.foregroundStyle(Auth.faintText)

				// Name input — #181f30 r14 card with the live "n / 20" counter.
				HStack {
					TextField("Your name", text: $name)
						.font(StakFont.geist(14 * u))
						.foregroundStyle(StakColors.textPrimary)
						.tint(StakColors.accent)
						.textInputAutocapitalization(.words)
						.autocorrectionDisabled()
						.onChange(of: name) { _, newValue in
							if newValue.count > nameMax {
								name = String(newValue.prefix(nameMax))
							}
						}
					Text("\(name.count) / \(nameMax)")
						.font(StakFont.geist(11 * u))
						.foregroundStyle(Auth.faintText)
				}
				.padding(16 * u)
				.background(Auth.inputBg, in: RoundedRectangle(cornerRadius: 14 * u))

				// The onboarding footnote; on the edit page the user is already in Profile.
				if !editing {
					Text("You can change this anytime in Profile.")
						.font(StakFont.geist(11 * u))
						.foregroundStyle(Auth.faintText)
				}

				Spacer(minLength: 0)
			}
			.frame(maxWidth: .infinity, alignment: .leading)
			.padding(.horizontal, 24 * u)
			.padding(.top, 14 * u)

			VStack(spacing: 0) {
				AuthCta(text: editing ? "Save changes" : "Proceed to home", enabled: !name.trimmingCharacters(in: .whitespaces).isEmpty && !loadingPhoto, action: {
					UserProfile.shared.displayName = name.trimmingCharacters(in: .whitespaces).capitalizedWords
					UserProfile.shared.photoData = photoData
					// Editing saves in place; onboarding persists with the account at Proceed.
					if editing { Session.shared.saveProfile() }
					onProceed()
				})
			}
			.padding(.top, 8 * u)
			.padding(.bottom, 26 * u)
		}
		.background(StakColors.bg.ignoresSafeArea())
		.onAppear {
			// Edit mode arrives with the account's current name and photo.
			guard editing, !seeded else { return }
			seeded = true
			let current = UserProfile.shared.displayName.trimmingCharacters(in: .whitespaces)
			name = current.isEmpty ? UserProfile.shared.greetingName : current
			photoData = UserProfile.shared.photoData
			photo = photoData.flatMap { UIImage(data: $0) }
		}
		.photosPicker(isPresented: $showPhotoPicker, selection: $pickedItem, matching: .images)
		.onChange(of: pickedItem) { _, item in
			guard let item else { return }
			loadGen += 1
			let gen = loadGen
			Task {
				loadingPhoto = true
				defer { if gen == loadGen { loadingPhoto = false } }
				// A camera-roll original is tens of MB once decoded, so only a
				// 512px thumbnail survives the pick (ImageIO downsample, EXIF
				// orientation applied) as an 85% JPEG of a few tens of KB -
				// the avatar circle, the session file and the leaderboards
				// need nothing larger (audit 2026-09-04; mirrors android's
				// inSampleSize decode in ProfileSetupScreen).
				guard let data = try? await item.loadTransferable(type: Data.self),
					let thumb = await UIImage(data: data)?.byPreparingThumbnail(ofSize: CGSize(width: 512, height: 512)),
					let jpeg = thumb.jpegData(compressionQuality: 0.85) else { return }
				guard gen == loadGen else { return }
				photo = thumb
				photoData = jpeg
			}
		}
	}
}
