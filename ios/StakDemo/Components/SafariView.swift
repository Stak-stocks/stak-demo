import SafariServices
import SwiftUI

/// A web page opened inside the app (SFSafariViewController) - the iOS norm for a story's source: Reader mode, and
/// Done brings the reader back where they were. Android hands the link to the browser; on iOS leaving the app for
/// Safari strands people behind the status-bar back link.
struct SafariView: UIViewControllerRepresentable {
	let url: URL

	func makeUIViewController(context: Context) -> SFSafariViewController {
		let vc = SFSafariViewController(url: url)
		vc.preferredControlTintColor = UIColor(red: 0x69 / 255, green: 0xB3 / 255, blue: 0xCA / 255, alpha: 1)
		vc.dismissButtonStyle = .done
		return vc
	}

	func updateUIViewController(_ vc: SFSafariViewController, context: Context) {}
}

/// A link to show in a SafariView sheet (`.sheet(item:)` needs Identifiable). Only http(s): SFSafariViewController
/// refuses anything else, so other links go to the system instead.
struct WebLink: Identifiable {
	let url: URL
	var id: String { url.absoluteString }

	init?(_ string: String) {
		guard let url = URL(string: string), let scheme = url.scheme?.lowercased(), scheme == "http" || scheme == "https" else {
			return nil
		}
		self.url = url
	}
}

extension View {
	/// Presents `link` in an in-app Safari sheet while it's set.
	func safariSheet(_ link: Binding<WebLink?>) -> some View {
		sheet(item: link) { SafariView(url: $0.url).ignoresSafeArea() }
	}
}
