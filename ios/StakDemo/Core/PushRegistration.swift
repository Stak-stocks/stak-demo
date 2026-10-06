import UIKit
import UserNotifications

/// Registers this install for APNs push notifications and keeps the backend
/// in sync with the current token and notification preferences.
/// Mirrors android/data/PushRegistration.kt.
///
/// Flow:
///  1. PermissionsView asks UNUserNotificationCenter for authorization
///  2. On grant it calls UIApplication.registerForRemoteNotifications()
///  3. AppDelegate.didRegisterForRemoteNotificationsWithDeviceToken calls tokenReceived(_:)
///  4. tokenReceived stores the hex token and calls sync(token:) to POST it
///  5. Session.signIn + Session.signOut call sync() / forget() respectively
///  6. Notification settings changes call sync() to update the backend row
enum PushRegistration {
    /// Register with the OS (if not already) and, if a stored token exists,
    /// push current preferences to the backend. Safe to call multiple times.
    @MainActor static func sync() {
        guard !StakStore.demoAccount, Session.shared.token != nil else { return }
        Task.detached(priority: .background) {
            await MainActor.run { UIApplication.shared.registerForRemoteNotifications() }
            guard let t = storedToken() else { return }
            await upload(token: t)
        }
    }

    /// Called by AppDelegate when iOS delivers a new (or refreshed) APNs token.
    @MainActor static func tokenReceived(_ data: Data) {
        let hex = data.map { String(format: "%02hhx", $0) }.joined()
        StakStore.set(hex, for: "push.token")
        guard !StakStore.demoAccount, Session.shared.token != nil else { return }
        Task.detached(priority: .background) { await upload(token: hex) }
    }

    /// Sign-out: unregister from APNs so the device row ages out on the backend.
    static func forget() {
        StakStore.set("", for: "push.token")
        Task.detached(priority: .background) {
            await MainActor.run { UIApplication.shared.unregisterForRemoteNotifications() }
        }
    }

    private static func storedToken() -> String? {
        let t = StakStore.string("push.token") ?? ""; return t.isEmpty ? nil : t
    }

    private static func upload(token: String) async {
        _ = try? await StockRepository.shared.putPushDevice(PushDeviceRequest(
            token: token,
            platform: "ios",
            timezone: TimeZone.current.identifier,
            priceAlerts: UserProfile.shared.notificationsOn && UserProfile.shared.priceAlerts,
            dailyDeck: UserProfile.shared.notificationsOn && UserProfile.shared.dailyDeck
        ))
    }
}
