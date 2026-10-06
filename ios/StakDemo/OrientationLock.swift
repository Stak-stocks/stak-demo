import SwiftUI
import UIKit
import UserNotifications
import GoogleSignIn

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

final class AppDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate {
	func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil) -> Bool {
		UNUserNotificationCenter.current().delegate = self
		PushRegistration.sync()
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
		PushRegistration.tokenReceived(deviceToken)
	}

	func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
		// Simulator and devices without APNs capability: silently ignored.
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
