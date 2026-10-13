import SwiftUI
import UIKit
import UserNotifications
import GoogleSignIn
import FirebaseMessaging

/// The app is portrait-locked (Info.plist), EXCEPT while the article
/// player's native fullscreen presentation is up: then the scene FOLLOWS
/// the phone - it opens the way the phone is held (upright = the clip
/// letterboxed on black with the same chrome, user's 2026-09-05
/// screenshot) and turns to landscape only when the phone is tilted
/// sideways, back to portrait when it is held upright again (mirrors
/// Android's fullscreen FULL_SENSOR; the phone is never turned for the
/// user). Leaving fullscreen pins the scene back to portrait before the
/// dismissal lands. The delegate's answer overrides Info.plist.
final class OrientationLock {
	static let shared = OrientationLock()
	private(set) var landscapeAllowed = false

	func allowLandscape(_ allow: Bool) {
		guard landscapeAllowed != allow else { return }
		landscapeAllowed = allow
		// Widening to every orientation does not turn the scene; it stays
		// where the phone is and rotates with it. Narrowing to portrait
		// turns it back upright.
		let mask: UIInterfaceOrientationMask = allow ? .allButUpsideDown : .portrait
		for scene in UIApplication.shared.connectedScenes.compactMap({ $0 as? UIWindowScene }) {
			if #available(iOS 16.0, *) {
				scene.keyWindow?.rootViewController?.setNeedsUpdateOfSupportedInterfaceOrientations()
				scene.requestGeometryUpdate(.iOS(interfaceOrientations: mask))
			} else {
				UIViewController.attemptRotationToDeviceOrientation()
			}
		}
	}
}

final class AppDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate, MessagingDelegate {
	func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil) -> Bool {
		UNUserNotificationCenter.current().delegate = self
		// Firebase (push) starts only when the app carries GoogleService-Info.plist - dormant until then.
		PushRegistration.configure(delegate: self)
		PushRegistration.sync()
		// A returning account catches up with the server at launch, as android's Session.init does through
		// applyAccount - Session's own init can't start these (they read Session.shared, still being built).
		if Session.shared.signedIn && !Session.shared.demoAccount {
			ProfileSync.shared.sync(force: true)
			DeviceStateSync.shared.sync()
		}
		if let clientID = Bundle.main.object(forInfoDictionaryKey: "GIDClientID") as? String {
			GIDSignIn.sharedInstance.configuration = GIDConfiguration(clientID: clientID)
		}
		return true
	}

	func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
		GIDSignIn.sharedInstance.handle(url)
	}

	func application(_ application: UIApplication, supportedInterfaceOrientationsFor window: UIWindow?) -> UIInterfaceOrientationMask {
		OrientationLock.shared.landscapeAllowed ? .allButUpsideDown : .portrait
	}

	func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
		PushRegistration.apnsTokenReceived(deviceToken)
	}

	/// Firebase issued or rotated this install's token - the one the backend sends to.
	nonisolated func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
		guard let fcmToken, !fcmToken.isEmpty else { return }
		Task { @MainActor in PushRegistration.fcmTokenReceived(fcmToken) }
	}

	func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
		// Simulator, or a build without the push entitlement (a free developer account): silently ignored - push stays
		// off until the entitlement is added.
	}

	/// Show the notification banner while the app is in the foreground (mirrors Android onMessageReceived).
	func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification,
	                             withCompletionHandler handler: @escaping (UNNotificationPresentationOptions) -> Void) {
		handler([.banner, .sound, .badge])
	}

	/// Notification tap — bring the app to the foreground (no deep link routing at this stage).
	func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse,
	                             withCompletionHandler handler: @escaping () -> Void) {
		handler()
	}
}
