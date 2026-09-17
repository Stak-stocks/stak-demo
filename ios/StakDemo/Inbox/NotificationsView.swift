import SwiftUI

private let cardBg = Color(argb: 0xFF10182B)
private let muted = Color(argb: 0xFF819ABB)
private let bodyInk = Color(argb: 0xFFC8D2E0)
private let divider = Color(argb: 0xFF1A2333)
private let iconBg = Color(argb: 0xFF1A2333)
private let teal = Color(argb: 0xFF69B3CA)
private let dot = Color(argb: 0xFFFF8030)

/// The inbox behind the Home bell (product audit, 2026-09-05). Built in the
/// Profile hub's language - the same header, card and row metrics - because no
/// frame exists for it. Opening it reads everything, so the bell's dot clears
/// the way an activity feed does. Mirrors android NotificationsScreen.kt.
struct NotificationsView: View {
	let onBack: () -> Void
	let onOpenSettings: () -> Void
	@ObservedObject private var inbox = StakNotifications.shared
	@State private var readBefore: Set<String> = []

	var body: some View {
		let u = figmaUnit
		SettingsScaffold(title: "Notifications", onBack: onBack) {
			ScrollView(showsIndicators: false) {
				VStack(spacing: 14 * u) {
					if inbox.items.isEmpty {
						VStack(alignment: .leading, spacing: 6 * u) {
							Text("You’re all caught up.")
								.font(StakFont.sora(15 * u, .semiBold))
								.foregroundStyle(StakColors.textPrimary)
							Text("Price moves on your picks and your daily deck land here.")
								.font(StakFont.geist(13 * u))
								.foregroundStyle(muted)
						}
						.frame(maxWidth: .infinity, alignment: .leading)
						.padding(16 * u)
						.background(cardBg, in: RoundedRectangle(cornerRadius: 16 * u))
					} else {
						VStack(spacing: 0) {
							ForEach(Array(inbox.items.enumerated()), id: \.element.id) { i, item in
								NotificationRow(item: item, unread: !readBefore.contains(item.id))
								if i < inbox.items.count - 1 {
									Rectangle().fill(divider).frame(height: 1 * u).padding(.horizontal, 14 * u)
								}
							}
						}
						.background(cardBg, in: RoundedRectangle(cornerRadius: 16 * u))
					}
					VStack(spacing: 0) {
						SettingsLinkRow(label: "Notification settings", action: onOpenSettings)
					}
					.padding(.vertical, 4 * u)
					.background(cardBg, in: RoundedRectangle(cornerRadius: 16 * u))
				}
				.padding(.horizontal, 20 * u)
				.padding(.bottom, 26 * u)
			}
		}
		.onAppear {
			readBefore = inbox.readIds
			inbox.markAllRead()
		}
	}
}

private struct NotificationRow: View {
	let item: StakNotifications.Item
	let unread: Bool

	var body: some View {
		let u = figmaUnit
		HStack(alignment: .center, spacing: 12 * u) {
			ZStack {
				Circle().fill(iconBg)
				Text(String(item.title.prefix(1)).uppercased())
					.font(StakFont.sora(14 * u, .semiBold))
					.foregroundStyle(teal)
			}
			.frame(width: 36 * u, height: 36 * u)
			VStack(alignment: .leading, spacing: 2 * u) {
				Text(item.title)
					.font(StakFont.geist(14 * u, .medium))
					.foregroundStyle(StakColors.textPrimary)
				Text(item.body)
					.font(StakFont.geist(12 * u))
					.foregroundStyle(bodyInk)
				Text(item.time)
					.font(StakFont.geist(11 * u))
					.foregroundStyle(muted)
			}
			.frame(maxWidth: .infinity, alignment: .leading)
			Circle().fill(unread ? dot : Color.clear).frame(width: 6 * u, height: 6 * u)
		}
		.padding(.horizontal, 14 * u)
		.padding(.vertical, 12 * u)
	}
}
