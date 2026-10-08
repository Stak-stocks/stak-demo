import UIKit
import UserNotifications
import FirebaseCore
import FirebaseMessaging

/// Registers this install for push notifications and keeps the backend in sync with its token and notification
/// preferences. Mirrors android/data/PushRegistration.kt.
///
/// The backend delivers every phone's notifications through Firebase Cloud Messaging, so the token it is given is a
/// Firebase one (Firebase turns it into Apple's delivery itself) - the raw APNs token, which FCM rejects, is only
/// handed to Firebase. Dormant until the app is configured: with no GoogleService-Info.plist in the bundle Firebase
/// is never started and nothing is registered; with it, but without the push entitlement (a free developer account),
/// iOS simply never issues a token. Adding both later turns push on with no code change.
///
/// Flow:
///  1. PermissionsView / Notification settings ask UNUserNotificationCenter and register for remote notifications
///  2. AppDelegate hands the APNs token to Firebase (apnsTokenReceived)
///  3. Firebase issues its token -> fcmTokenReceived stores it and uploads it with the settings
///  4. Session.signIn / settings changes call sync(); Session.signOut calls forget()
@MainActor
enum PushRegistration {
    /// True once Firebase has been started (GoogleService-Info.plist is in the app).
    private(set) static var configured = false

    /// Starts Firebase when the app carries its config. Called once, at launch.
    static func configure(delegate: MessagingDelegate) {
        guard !configured, Bundle.main.path(forResource: "GoogleService-Info", ofType: "plist") != nil else { return }
        FirebaseApp.configure()
        Messaging.messaging().delegate = delegate
        configured = true
    }

    /// Register with the OS (if not already) and, if a stored token exists, push current preferences to the backend.
    /// Safe to call multiple times.
    static func sync() {
        guard configured, !StakStore.demoAccount, Session.shared.token != nil else { return }
        UIApplication.shared.registerForRemoteNotifications()
        guard let token = storedToken() else { return }
        let request = request(token: token)
        Task.detached(priority: .background) { await upload(request) }
    }

    /// AppDelegate: iOS delivered (or refreshed) its APNs token - Firebase needs it to issue its own.
    static func apnsTokenReceived(_ data: Data) {
        guard configured else { return }
        Messaging.messaging().apnsToken = data
    }

    /// Firebase issued (or rotated) this install's token: kept, and sent with the settings.
    static func fcmTokenReceived(_ token: String) {
        StakStore.set(token, for: "push.token")
        guard !StakStore.demoAccount, Session.shared.token != nil else { return }
        let request = request(token: token)
        Task.detached(priority: .background) { await upload(request) }
    }

    /// Sign-out: the token is deleted, so the backend's next send to it fails and the row is dropped - the next
    /// account on this phone never gets the last one's alerts. A new token is issued at the next sign-in.
    static func forget() {
        StakStore.set("", for: "push.token")
        guard configured else { return }
        Messaging.messaging().deleteToken { _ in }
        UIApplication.shared.unregisterForRemoteNotifications()
    }

    private static func storedToken() -> String? {
        let t = StakStore.string("push.token") ?? ""; return t.isEmpty ? nil : t
    }

    private static func request(token: String) -> PushDeviceRequest {
        PushDeviceRequest(
            token: token,
            platform: "ios",
            timezone: TimeZone.current.identifier,
            priceAlerts: UserProfile.shared.notificationsOn && UserProfile.shared.priceAlerts,
            dailyDeck: UserProfile.shared.notificationsOn && UserProfile.shared.dailyDeck,
            priceThreshold: UserProfile.shared.priceThreshold
        )
    }

    nonisolated private static func upload(_ request: PushDeviceRequest) async {
        _ = try? await StockRepository.shared.putPushDevice(request)
    }
}
