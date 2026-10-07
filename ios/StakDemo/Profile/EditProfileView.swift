import SwiftUI
import UIKit
import PhotosUI

private let nameMax = 20

/// 08 · Profile — "Profile · Edit" (Chinedu_Mobile 1:5782, 2026-10-07; replaces the reused 09
/// frame). The 64 avatar ("Tap the avatar to change your photo"), DISPLAY NAME / HANDLE / EMAIL
/// inputs, the SECURITY card ("Reset password · Email me a link ›"), the handle footnote and the
/// Save changes CTA pinned at the authored 732 (632 of content under the 100 nav). The photo
/// picker and thumbnailing are 09's (ProfileSetupView); Save persists in place.
/// Mirrors android ui/profile/EditProfileScreen.kt.
struct EditProfileView: View {
	let onBack: () -> Void
	let onSaved: () -> Void
	var onResetPassword: () -> Void = {}
	@State private var seeded = false
	@State private var name = ""
	@State private var handle = ""
	@State private var email = ""
	@State private var showPhotoPicker = false
	@State private var pickedItem: PhotosPickerItem? = nil
	@State private var photoData: Data? = nil
	@State private var loadingPhoto = false
	@State private var loadGen = 0
	@State private var photo: UIImage? = nil

	var body: some View {
		let u = figmaUnit
		ProfilePageScaffold(title: "Edit profile", onBack: onBack) {
			GeometryReader { proxy in
				let cta = 86 * u
				let contentH = 632 * u + cta < proxy.size.height ? 632 * u : max(proxy.size.height - cta, 0)
				VStack(spacing: 0) {
					ProfileContent {
						// Avatar (1:5784): 64 circle, no ring, the initial at Sora SemiBold 22; 8 under it the hint.
						VStack(spacing: 8 * u) {
							Button(action: { showPhotoPicker = true }) {
								ZStack {
									Circle().fill(Prof.avatarBg)
									if let photo {
										Image(uiImage: photo)
											.resizable()
											.scaledToFill()
											.frame(width: 64 * u, height: 64 * u)
											.clipShape(Circle())
									} else {
										Text(name.trimmingCharacters(in: .whitespaces).prefix(1).uppercased())
											.font(StakFont.sora(22 * u, .semiBold))
											.foregroundStyle(Prof.avatarInk)
									}
								}
								.frame(width: 64 * u, height: 64 * u)
							}
							.buttonStyle(.pressDim)
							.accessibilityLabel("Change photo")
							Button(action: { showPhotoPicker = true }) {
								Text("Tap the avatar to change your photo")
									.font(StakFont.geist(12 * u))
									.foregroundStyle(Prof.muted)
							}
							.buttonStyle(.pressDim)
						}
						.frame(maxWidth: .infinity)
						EditField(label: "DISPLAY NAME", text: $name, capitalization: .words)
							.onChange(of: name) { _, v in if v.count > nameMax { name = String(v.prefix(nameMax)) } }
						EditField(label: "HANDLE", text: $handle)
							.onChange(of: handle) { _, v in
								let clean = String(v.filter { !$0.isWhitespace }.prefix(nameMax + 1))
								if clean != v { handle = clean }
							}
						EditField(label: "EMAIL", text: $email, keyboard: .emailAddress)
						SectionLabel(text: "SECURITY")
						ProfileCard { ProfileRow(label: "Reset password", value: "Email me a link", action: onResetPassword) }
						ProfileCaption(text: "Your handle shows on the Simulate leaderboard. Your email never does.")
					}
					.frame(height: contentH)
					// CTA (1:5826): 8 above, 26 below the gradient button, right under the 632 content area.
					VStack(spacing: 0) {
						AuthCta(text: "Save changes", enabled: !name.trimmingCharacters(in: .whitespaces).isEmpty && !loadingPhoto, action: save)
					}
					.padding(.top, 8 * u)
					.padding(.bottom, 26 * u)
					Spacer(minLength: 0)
				}
			}
		}
		.onAppear {
			guard !seeded else { return }
			seeded = true
			let p = UserProfile.shared
			let current = p.displayName.trimmingCharacters(in: .whitespaces)
			name = current.isEmpty ? p.greetingName : current
			handle = p.handleText
			email = p.emailText
			photoData = p.photoData
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
				// A 512px thumbnail as an 85% JPEG (mirrors ProfileSetupView / android copyAvatar).
				guard let data = try? await item.loadTransferable(type: Data.self),
					let thumb = await UIImage(data: data)?.byPreparingThumbnail(ofSize: CGSize(width: 512, height: 512)),
					let jpeg = thumb.jpegData(compressionQuality: 0.85) else { return }
				guard gen == loadGen else { return }
				photo = thumb
				photoData = jpeg
			}
		}
	}

	private func save() {
		let p = UserProfile.shared
		p.displayName = name.trimmingCharacters(in: .whitespaces).capitalizedWords
		p.photoData = photoData
		// The authored defaults stay derived: a handle / email typed back to them is stored blank.
		let trimmed = handle.trimmingCharacters(in: .whitespaces)
		let h = trimmed.isEmpty || trimmed == "@" ? "" : (trimmed.hasPrefix("@") ? trimmed : "@" + trimmed)
		p.handle = h == "@" + p.greetingName.lowercased().replacingOccurrences(of: " ", with: "") ? "" : h
		let e = email.trimmingCharacters(in: .whitespaces)
		p.email = e == "hamza@gmail.com" && Session.shared.demoAccount ? "" : e
		Session.shared.saveProfile()
		onSaved()
	}
}

/// A labelled input (1:5788): Geist Medium 11 label, 6 gap, the #181F30 r14 field with 16 padding and Geist 13 text.
private struct EditField: View {
	let label: String
	@Binding var text: String
	var keyboard: UIKeyboardType = .default
	var capitalization: TextInputAutocapitalization = .never

	var body: some View {
		let u = figmaUnit
		VStack(alignment: .leading, spacing: 6 * u) {
			Text(label)
				.font(StakFont.geist(11 * u, .medium))
				.stakLineHeight(14 * u, size: 11 * u, face: .geist)
				.foregroundStyle(Prof.muted)
			TextField("", text: $text)
				.font(StakFont.geist(13 * u))
				.foregroundStyle(StakColors.textPrimary)
				.tint(StakColors.accent)
				.keyboardType(keyboard)
				.textInputAutocapitalization(capitalization)
				.autocorrectionDisabled()
				.padding(16 * u)
				.background(Prof.inputBg, in: RoundedRectangle(cornerRadius: 14 * u))
				.accessibilityLabel(label)
		}
		.frame(maxWidth: .infinity, alignment: .leading)
	}
}
