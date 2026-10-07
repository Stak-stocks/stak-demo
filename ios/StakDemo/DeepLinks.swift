import Foundation
import SwiftUI

/// Links the app is opened with (09 · Auth recovery, 2026-10-07): the password-reset mail's
/// stak://reset / https://stak.app/reset lands on Auth · Set a new password (1:5892). RootFlowView
/// records the link; the auth flow pushes the page at once, the tab shell when it is on screen.
/// Mirrors android navigation/DeepLinks.kt.
final class DeepLinks: ObservableObject {
	static let shared = DeepLinks()
	@Published var pendingReset = false

	/// True when the URL is the reset link.
	static func isReset(_ url: URL) -> Bool {
		if url.scheme == "stak" { return url.host == "reset" }
		return url.host == "stak.app" && url.path.trimmingCharacters(in: CharacterSet(charactersIn: "/")) == "reset"
	}

	private init() {}
}
