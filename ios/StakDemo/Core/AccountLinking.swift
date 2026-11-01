import Foundation
import GoogleSignIn
import Supabase
import UIKit

/// The account's ways to sign in (Profile -> Sign-in): which are linked, linking another, unlinking one. Needs "Allow
/// manual linking" on in Supabase (Authentication -> Sign In / Providers).
///
/// Linking with a native sign-in's ID token (Apple's sheet, Google's) isn't in a released supabase-swift yet - main has
/// `linkIdentityWithIDToken`, 2.55.x doesn't - so this makes the same request it does: the token sign-in, carrying the
/// signed-in user's session and `link_identity`. Swap to the library call once a release has it.
enum AccountLinking {
	enum LinkError: LocalizedError {
		case notSignedIn
		case failed(String)

		var errorDescription: String? {
			switch self {
			case .notSignedIn: return "Sign in first, then link."
			case .failed(let message): return message
			}
		}
	}

	/// The providers this phone can link, in the order the Sign-in page lists them.
	static let linkable = ["google", "apple"]

	static func identities() async throws -> [UserIdentity] {
		try await supabase.auth.userIdentities()
	}

	/// Adds a sign-in method to the signed-in account, from the ID token its sheet returned.
	static func link(provider: String, idToken: String, nonce: String? = nil, accessToken: String? = nil) async throws {
		guard let session = try? await supabase.auth.session else { throw LinkError.notSignedIn }
		var request = URLRequest(url: SupabaseConfig.url
			.appending(path: "auth/v1/token")
			.appending(queryItems: [URLQueryItem(name: "grant_type", value: "id_token")]))
		request.httpMethod = "POST"
		request.setValue("application/json", forHTTPHeaderField: "Content-Type")
		request.setValue(SupabaseConfig.anonKey, forHTTPHeaderField: "apikey")
		request.setValue("Bearer \(session.accessToken)", forHTTPHeaderField: "Authorization")
		var body: [String: Any] = ["provider": provider, "id_token": idToken, "link_identity": true]
		if let nonce { body["nonce"] = nonce }
		if let accessToken { body["access_token"] = accessToken }
		request.httpBody = try JSONSerialization.data(withJSONObject: body)
		let (data, response) = try await URLSession.shared.data(for: request)
		guard let status = (response as? HTTPURLResponse)?.statusCode, (200..<300).contains(status) else {
			throw LinkError.failed(message(from: data))
		}
		// The answer is a session carrying the new identity: the app holds it (refreshing instead would leave this one
		// unused on the server).
		let json = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any]
		if let access = json?["access_token"] as? String, let refresh = json?["refresh_token"] as? String {
			_ = try? await supabase.auth.setSession(accessToken: access, refreshToken: refresh)
		} else {
			_ = try? await supabase.auth.refreshSession()
		}
	}

	/// Links the Google account picked in Google's own sheet.
	@MainActor
	static func linkGoogle() async throws {
		guard let root = UIApplication.shared.connectedScenes
			.compactMap({ $0 as? UIWindowScene })
			.first(where: { $0.activationState == .foregroundActive })?.keyWindow?.rootViewController else {
			throw LinkError.failed("Couldn't open Google sign-in - try again.")
		}
		let result = try await GIDSignIn.sharedInstance.signIn(withPresenting: root)
		guard let idToken = result.user.idToken?.tokenString else {
			throw LinkError.failed("Google didn't return an ID token - try again.")
		}
		try await link(provider: "google", idToken: idToken, accessToken: result.user.accessToken.tokenString)
	}

	/// Removes a sign-in method. Supabase refuses the last one, and the Sign-in page never offers it.
	static func unlink(_ identity: UserIdentity) async throws {
		do {
			try await supabase.auth.unlinkIdentity(identity)
		} catch {
			throw LinkError.failed("Couldn't unlink that. Try again.")
		}
		_ = try? await supabase.auth.refreshSession()
	}

	/// An address Apple made up for "Hide My Email": STAK can't tell from it whose account this is.
	static func isHiddenAppleEmail(_ email: String?) -> Bool {
		email?.lowercased().hasSuffix("@privaterelay.appleid.com") == true
	}

	private static func message(from data: Data) -> String {
		let json = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any]
		switch json?["error_code"] as? String {
		case "identity_already_exists":
			return "That account already has its own STAK account. To link it here, sign in with it, delete that STAK account in Profile, then try again."
		case "manual_linking_disabled":
			return "Linking isn't available yet. Try again later."
		default:
			return "Couldn't link that account. Try again."
		}
	}
}
