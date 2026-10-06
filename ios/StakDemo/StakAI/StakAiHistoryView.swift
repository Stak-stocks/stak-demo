import SwiftUI

private let teal = Color(argb: 0xFF69B3CA)
private let surface = Color(argb: 0xFF181F30)
private let cardBorder = Color(argb: 0xFF2A3346)
private let muted = Color(argb: 0xFF819ABB)
private let warn = Color(argb: 0xFFE5A54B)

/// Past conversations list — mirrors android/ui/ai/StakAiHistoryScreen.kt.
struct StakAiHistoryView: View {
    let onBack: () -> Void
    let onOpen: (StakAiConversationDto) -> Void

    @StateObject private var vm = StakAiHistoryViewModel()
    @State private var renaming: StakAiConversationDto? = nil
    @State private var renameText = ""

    var body: some View {
        let u = figmaUnit
        VStack(spacing: 0) {
            header(u: u)
            if vm.loading && vm.conversations.isEmpty {
                Spacer()
                ProgressView().tint(teal)
                Spacer()
            } else if vm.failed && vm.conversations.isEmpty {
                emptyOrFailed(failed: true, u: u)
            } else if vm.conversations.isEmpty {
                emptyOrFailed(failed: false, u: u)
            } else {
                list(u: u)
            }
        }
        .background(StakColors.bg.ignoresSafeArea())
        .task { vm.load() }
        .sheet(item: $renaming) { c in
            renameSheet(c, u: u)
                .presentationDetents([.height(220)])
                .presentationDragIndicator(.visible)
        }
    }

    // MARK: – Header

    private func header(u: CGFloat) -> some View {
        ZStack {
            Text("Your chats")
                .font(StakFont.sora(17 * u, .semiBold))
                .foregroundStyle(StakColors.textPrimary)
            HStack {
                AuthBackCircle(action: onBack)
                    .padding(.leading, 20 * u)
                Spacer()
            }
        }
        .frame(maxWidth: .infinity)
        .frame(height: 56 * u * textScale)
    }

    // MARK: – List

    private func list(u: CGFloat) -> some View {
        ScrollView(showsIndicators: false) {
            LazyVStack(spacing: 0) {
                ForEach(vm.conversations) { c in
                    conversationRow(c, u: u)
                    Divider().background(cardBorder).padding(.leading, 20 * u)
                }
                if vm.hasMore {
                    Button {
                        vm.load(more: true)
                    } label: {
                        if vm.loading {
                            ProgressView().tint(teal).frame(maxWidth: .infinity).padding(.vertical, 20 * u)
                        } else {
                            Text("Load more")
                                .font(StakFont.geist(14 * u, .medium))
                                .foregroundStyle(teal)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 16 * u)
                        }
                    }
                    .buttonStyle(.pressDim)
                }
            }
            .padding(.bottom, 24 * u)
        }
    }

    private func conversationRow(_ c: StakAiConversationDto, u: CGFloat) -> some View {
        HStack(spacing: 12 * u) {
            ZStack {
                Circle().fill(surface).frame(width: 38 * u, height: 38 * u)
                Image(systemName: "sparkles")
                    .font(.system(size: 16 * u))
                    .foregroundStyle(teal)
            }
            VStack(alignment: .leading, spacing: 3 * u) {
                Text(c.title)
                    .font(StakFont.geist(14 * u, .medium))
                    .foregroundStyle(StakColors.textPrimary)
                    .lineLimit(1)
                if let preview = c.preview {
                    Text(preview)
                        .font(StakFont.geist(12 * u))
                        .foregroundStyle(muted)
                        .lineLimit(1)
                }
                if let label = c.contextLabel {
                    Text(label)
                        .font(StakFont.geist(11 * u))
                        .foregroundStyle(teal.opacity(0.8))
                        .lineLimit(1)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            Image(systemName: "chevron.right")
                .font(.system(size: 14 * u))
                .foregroundStyle(muted)
        }
        .padding(.horizontal, 20 * u)
        .padding(.vertical, 14 * u)
        .contentShape(Rectangle())
        .onTapGesture { onOpen(c) }
        .contextMenu {
            Button {
                renameText = c.title
                renaming = c
            } label: { Label("Rename", systemImage: "pencil") }
            Button(role: .destructive) { vm.delete(c) } label: { Label("Delete", systemImage: "trash") }
        }
    }

    // MARK: – Empty / failed

    private func emptyOrFailed(failed: Bool, u: CGFloat) -> some View {
        VStack(spacing: 12 * u) {
            Spacer()
            ZStack {
                Circle().fill(surface).frame(width: 52 * u, height: 52 * u)
                Image(systemName: failed ? "exclamationmark.triangle" : "sparkles")
                    .font(.system(size: 24 * u))
                    .foregroundStyle(failed ? warn : teal)
            }
            Text(failed ? "Couldn't load chats" : "No chats yet")
                .font(StakFont.sora(17 * u, .semiBold))
                .foregroundStyle(StakColors.textPrimary)
            Text(failed ? "Check your connection and try again."
                        : "Start a conversation and it'll appear here.")
                .font(StakFont.geist(13 * u))
                .foregroundStyle(muted)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32 * u)
            if failed {
                Button { vm.load() } label: {
                    Text("Try again")
                        .font(StakFont.geist(14 * u, .medium))
                        .foregroundStyle(teal)
                        .padding(.vertical, 10 * u)
                }
                .buttonStyle(.pressDim)
            }
            Spacer()
        }
    }

    // MARK: – Rename sheet

    private func renameSheet(_ c: StakAiConversationDto, u: CGFloat) -> some View {
        VStack(spacing: 16 * u) {
            Text("Rename chat")
                .font(StakFont.sora(16 * u, .semiBold))
                .foregroundStyle(StakColors.textPrimary)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, 20 * u)
                .padding(.top, 20 * u)
            TextField("Title", text: $renameText)
                .font(StakFont.geist(14 * u))
                .foregroundStyle(StakColors.textPrimary)
                .tint(teal)
                .padding(.horizontal, 16 * u)
                .padding(.vertical, 12 * u)
                .background(surface, in: RoundedRectangle(cornerRadius: 10 * u))
                .overlay(RoundedRectangle(cornerRadius: 10 * u).strokeBorder(cardBorder, lineWidth: 1 * u))
                .padding(.horizontal, 20 * u)
            HStack(spacing: 12 * u) {
                Button { renaming = nil } label: {
                    Text("Cancel")
                        .font(StakFont.geist(14 * u, .medium))
                        .foregroundStyle(muted)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12 * u)
                        .background(surface, in: RoundedRectangle(cornerRadius: 10 * u))
                }
                .buttonStyle(.pressDim)
                Button {
                    vm.rename(c, title: renameText)
                    renaming = nil
                } label: {
                    Text("Save")
                        .font(StakFont.geist(14 * u, .medium))
                        .foregroundStyle(StakColors.bg)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12 * u)
                        .background(teal, in: RoundedRectangle(cornerRadius: 10 * u))
                }
                .buttonStyle(.pressDim)
                .disabled(renameText.trimmingCharacters(in: .whitespaces).isEmpty)
            }
            .padding(.horizontal, 20 * u)
        }
        .background(StakColors.bg.ignoresSafeArea())
    }
}
