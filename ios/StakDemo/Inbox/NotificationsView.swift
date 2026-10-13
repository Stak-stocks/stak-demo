import SwiftUI

/// The row's second line (1:5935 renders #ACAFB1 - the auth subtitle grey, not the section's muted blue).
private let rowBody = Color(argb: 0xFFACAFB1)

/// 10 · Notifications tab — "Notifications · List" (Chinedu_Mobile 1:5927) and "Notifications ·
/// Empty" (1:5977), 2026-10-07 (replaces the frameless 2026-09-05 inbox). TODAY and EARLIER cards
/// of 68-tall rows (title, one-line body, the teal unread dot); opening the page reads everything,
/// so the Home bell's dot clears the way an activity feed does. A row opens where its information
/// comes from (user, 2026-10-07). Mirrors android NotificationsScreen.kt.
struct NotificationsView: View {
	let onBack: () -> Void
	/// A row opens where its information comes from. Declared after onBack - memberwise order.
	var onOpen: (StakNotifications.Item) -> Void = { _ in }
	@ObservedObject private var inbox = StakNotifications.shared
	@State private var readBefore: Set<String> = []

	var body: some View {
		let u = figmaUnit
		let items = inbox.items
		ProfilePageScaffold(title: "Notifications", onBack: onBack, centred: true) {
			if items.isEmpty {
				// 1:5977: "Nothing yet" sits 330 from the frame top (230 under the 100 nav), the 248-wide line 16 below it.
				VStack(spacing: 16 * u) {
					Text("Nothing yet")
						.font(StakFont.sora(20 * u, .semiBold))
						.foregroundStyle(StakColors.textPrimary)
					Text("Price moves on your picks, your daily brief, and filled practice orders will show up here.")
						.font(StakFont.geist(12 * u))
						.stakLineHeight(16 * u, size: 12 * u, face: .geist)
						.foregroundStyle(Prof.muted)
						.multilineTextAlignment(.center)
						.frame(width: 248 * u)
				}
				.frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
				.padding(.top, 230 * u)
			} else {
				let today = items.filter(\.today)
				let earlier = items.filter { !$0.today }
				ProfileContent {
					if !today.isEmpty {
						SectionLabel(text: "TODAY")
						NotificationCard(items: today, readBefore: readBefore, inset: 11, onOpen: onOpen)
					}
					if !earlier.isEmpty {
						SectionLabel(text: "EARLIER")
						NotificationCard(items: earlier, readBefore: readBefore, inset: 9.5, onOpen: onOpen)
					}
				}
			}
		}
		.onAppear {
			readBefore = inbox.readIds
			inbox.markAllRead()
		}
	}
}

/// A #10182B r16 card: 8 side inset, `inset` above and below (11 on TODAY, 9.5 on EARLIER as authored), 10 between rows.
private struct NotificationCard: View {
	let items: [StakNotifications.Item]
	let readBefore: Set<String>
	let inset: CGFloat
	let onOpen: (StakNotifications.Item) -> Void

	var body: some View {
		let u = figmaUnit
		VStack(spacing: 10 * u) {
			ForEach(items) { item in
				NotificationRow(item: item, unread: !readBefore.contains(item.id), onOpen: { onOpen(item) })
			}
		}
		.padding(.horizontal, 8 * u)
		.padding(.vertical, inset * u)
		.frame(maxWidth: .infinity)
		.background(Prof.cardBg, in: RoundedRectangle(cornerRadius: 16 * u))
	}
}

/// One 68-tall #181F30 row (the 08 Permissions card surface): copy at 16/16, the 8 teal dot 16 from the right edge.
private struct NotificationRow: View {
	let item: StakNotifications.Item
	let unread: Bool
	let onOpen: () -> Void

	var body: some View {
		let u = figmaUnit
		// User (2026-10-07): the row opens where its information comes from.
		Button(action: onOpen) {
			ZStack(alignment: .topLeading) {
				VStack(alignment: .leading, spacing: 4 * u) {
					Text(item.title)
						.font(StakFont.geist(14 * u, .medium))
						.stakLineHeight(18 * u, size: 14 * u, face: .geist)
						.foregroundStyle(StakColors.textPrimary)
						.lineLimit(1)
					Text(item.body)
						.font(StakFont.geist(12 * u))
						.stakLineHeight(14 * u, size: 12 * u, face: .geist)
						.foregroundStyle(rowBody)
						.lineLimit(1)
				}
				.padding(.leading, 16 * u)
				.padding(.top, 16 * u)
				.padding(.trailing, 36 * u)
				if unread {
					HStack {
						Spacer()
						Circle().fill(Prof.accent).frame(width: 8 * u, height: 8 * u)
					}
					.padding(.trailing, 16 * u)
					.frame(height: 68 * u)
				}
			}
			.frame(maxWidth: .infinity, alignment: .leading)
			.frame(height: 68 * u)
			.background(Prof.inputBg, in: RoundedRectangle(cornerRadius: 14 * u))
		}
		.buttonStyle(.pressDim)
	}
}
