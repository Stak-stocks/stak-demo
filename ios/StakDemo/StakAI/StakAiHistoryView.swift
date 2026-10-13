import SwiftUI

/// STAK AI's past chats, newest first: what each was about, its latest answer, and rename / delete. Mirrors
/// android ui/ai/StakAiHistoryScreen.kt.
struct StakAiHistoryView: View {
	let onBack: () -> Void
	let onOpen: (StakAiConversationDto) -> Void

	@StateObject private var vm = StakAiHistoryViewModel()
	@State private var renaming: StakAiConversationDto? = nil
	@State private var renameText = ""
	@State private var deleting: StakAiConversationDto? = nil

	var body: some View {
		let u = figmaUnit
		SettingsScaffold(title: "Your chats", onBack: onBack) {
			ScrollView(showsIndicators: false) {
				LazyVStack(spacing: 10 * u) {
					if vm.conversations.isEmpty && vm.loading {
						Text("Loading…")
							.font(StakFont.geist(13 * u))
							.foregroundStyle(StakColors.muted)
							.frame(maxWidth: .infinity, alignment: .leading)
					} else if vm.conversations.isEmpty && vm.failed {
						messageCard("Couldn't load your chats.", action: "Try again", u: u) { vm.load() }
					} else if vm.conversations.isEmpty {
						messageCard("No chats yet. Ask STAK AI something and it'll show up here.", action: nil, u: u) {}
					} else {
						ForEach(vm.conversations) { c in chatRow(c, u: u) }
						if vm.hasMore {
							Button { vm.load(more: true) } label: {
								Text(vm.loading ? "Loading…" : "Show older chats")
									.font(StakFont.geist(13 * u, .semiBold))
									.foregroundStyle(StakColors.teal)
									.frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
									.padding(.vertical, 12 * u)
									.contentShape(Rectangle())
							}
							.buttonStyle(.pressDim)
							.disabled(vm.loading)
						}
					}
				}
				.padding(.horizontal, 20 * u)
				.padding(.bottom, 26 * u)
			}
		}
		.task { vm.load() }
		.alert("Rename chat", isPresented: Binding(get: { renaming != nil }, set: { if !$0 { renaming = nil } })) {
			TextField("Title", text: $renameText)
				.onChange(of: renameText) { _, new in if new.count > 80 { renameText = String(new.prefix(80)) } }
			Button("Cancel", role: .cancel) { renaming = nil }
			Button("Save") {
				if let c = renaming { vm.rename(c, title: renameText) }
				renaming = nil
			}
			.disabled(renameText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
		}
		.alert("Delete this chat?", isPresented: Binding(get: { deleting != nil }, set: { if !$0 { deleting = nil } }), presenting: deleting) { c in
			Button("Delete", role: .destructive) { vm.delete(c); deleting = nil }
			Button("Cancel", role: .cancel) { deleting = nil }
		} message: { c in
			Text("\u{201C}\(c.title)\u{201D} will be gone for good.")
		}
	}

	private func chatRow(_ c: StakAiConversationDto, u: CGFloat) -> some View {
		HStack(alignment: .top, spacing: 0) {
			Button { onOpen(c) } label: {
				VStack(alignment: .leading, spacing: 3 * u) {
					HStack(spacing: 6 * u) {
						if let label = c.contextLabel {
							Text(label)
								.font(StakFont.geist(11 * u, .medium))
								.foregroundStyle(StakColors.teal)
								.lineLimit(1)
							Circle().fill(StakColors.muted).frame(width: 3 * u, height: 3 * u).accessibilityHidden(true)
						}
						Text(historyAgo(c.updatedAt))
							.font(StakFont.geist(11 * u))
							.foregroundStyle(StakColors.muted)
							.lineLimit(1)
							.fixedSize()
					}
					Text(c.title)
						.font(StakFont.geist(14 * u, .medium))
						.stakLineHeight(19 * u, size: 14 * u, face: .geist)
						.foregroundStyle(StakColors.textPrimary)
						.lineLimit(2)
					if let preview = c.preview {
						Text(preview.replacingOccurrences(of: "**", with: "").replacingOccurrences(of: "\n", with: " "))
							.font(StakFont.geist(12 * u))
							.stakLineHeight(17 * u, size: 12 * u, face: .geist)
							.foregroundStyle(Color(argb: 0xFFC8D2E0))
							.lineLimit(2)
					}
				}
				.frame(maxWidth: .infinity, alignment: .leading)
				.multilineTextAlignment(.leading)
				.padding(.leading, 14 * u)
				.padding(.vertical, 12 * u)
				.contentShape(Rectangle())
			}
			.buttonStyle(.pressDim)
			Menu {
				Button("Rename") {
					renameText = c.title
					renaming = c
				}
				Button("Delete", role: .destructive) { deleting = c }
			} label: {
				Image(systemName: "ellipsis")
					.rotationEffect(.degrees(90))
					.font(.system(size: 16 * u))
					.foregroundStyle(StakColors.muted)
					.frame(width: 44, height: 44)
					.contentShape(Rectangle())
			}
			.accessibilityLabel("More options for \(c.title)")
		}
		.background(StakColors.surface, in: RoundedRectangle(cornerRadius: 14 * u))
		.accessibilityAction(named: Text("Rename")) {
			renameText = c.title
			renaming = c
		}
		.accessibilityAction(named: Text("Delete")) { deleting = c }
	}

	private func messageCard(_ text: String, action: String?, u: CGFloat, onAction: @escaping () -> Void) -> some View {
		VStack(alignment: .leading, spacing: 8 * u) {
			Text(text)
				.font(StakFont.geist(13 * u))
				.stakLineHeight(19 * u, size: 13 * u, face: .geist)
				.foregroundStyle(Color(argb: 0xFFC8D2E0))
			if let action {
				Button(action: onAction) {
					Text(action)
						.font(StakFont.geist(13 * u, .semiBold))
						.foregroundStyle(StakColors.teal)
						.frame(minHeight: 44)
						.contentShape(Rectangle())
				}
				.buttonStyle(.pressDim)
			}
		}
		.frame(maxWidth: .infinity, alignment: .leading)
		.padding(16 * u)
		.background(StakColors.surface, in: RoundedRectangle(cornerRadius: 16 * u))
	}
}

/// "Just now", "12m ago", "3h ago", "2d ago" from the server's timestamp; "" if it won't parse.
private func historyAgo(_ iso: String) -> String {
	guard let date = MyStakHoldings.parse(iso) else { return "" }
	return StakClock.ago(Int64(date.timeIntervalSince1970))
}
