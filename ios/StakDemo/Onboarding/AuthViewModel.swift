import SwiftUI
import Supabase
import AuthenticationServices
import CryptoKit
import GoogleSignIn

// MARK: – UI state

enum AuthUiState: Equatable {
    case idle
    case loading
    case error(String)
    /// onboardingComplete: false → route to onboarding; true → route to main tabs.
    case success(onboardingComplete: Bool)
    /// Sign-up succeeded but Supabase needs the email confirmed first.
    case awaitingConfirmation(email: String)
    /// Forgot password step 2→3: recovery code verified, ready to set new password.
    case recoveryVerified
    /// Forgot password step 4: new password set.
    case passwordResetComplete
}

// MARK: – ViewModel

/// Supabase auth logic for all sign-in / sign-up / password-reset screens.
/// Mirrors android/ui/onboarding/AuthViewModel.kt one-to-one.
@MainActor
final class AuthViewModel: ObservableObject {
    @Published private(set) var uiState: AuthUiState = .idle

    private let repository = StockRepository.shared

    // MARK: – Email sign-in

    func signIn(email: String, password: String) {
        guard setLoading() else { return }
        Task {
            do {
                let session = try await supabase.auth.signIn(
                    email: email.trimmingCharacters(in: .whitespaces),
                    password: password
                )
                Session.shared.setToken(session.accessToken)
                let me = try? await repository.getMe()
                applyDisplayName(from: me)
                UserProfile.shared.linkedGoogle = false
                Session.shared.saveProfile()
                uiState = .success(onboardingComplete: me?.onboardingCompleted ?? true)
            } catch {
                uiState = .error(friendlyError(error))
            }
        }
    }

    // MARK: – Email sign-up

    func createAccount(email: String, password: String) {
        guard setLoading() else { return }
        Task {
            do {
                let response = try await supabase.auth.signUp(
                    email: email.trimmingCharacters(in: .whitespaces),
                    password: password
                )
                if let session = response.session {
                    Session.shared.setToken(session.accessToken)
                    UserProfile.shared.linkedGoogle = false
                    uiState = .success(onboardingComplete: false)
                } else {
                    uiState = .awaitingConfirmation(email: email.trimmingCharacters(in: .whitespaces))
                }
            } catch {
                uiState = .error(friendlyError(error))
            }
        }
    }

    /// "Didn't get it?" — re-sends the signup confirmation email.
    func resendConfirmation(email: String) {
        guard setLoading() else { return }
        Task {
            do {
                try await supabase.auth.resend(email: email, type: .signup)
                uiState = .awaitingConfirmation(email: email)
            } catch {
                uiState = .error(friendlyError(error))
            }
        }
    }

    /// Robinhood-style in-app 6-digit code entry: verifies the real Supabase signup OTP
    /// and signs in immediately without leaving the app. Mirrors Android verifyEmailCode().
    func verifyEmailCode(email: String, code: String) {
        guard setLoading() else { return }
        Task {
            do {
                let response = try await supabase.auth.verifyOTP(
                    email: email.trimmingCharacters(in: .whitespaces),
                    token: code.trimmingCharacters(in: .whitespaces),
                    type: .signup
                )
                guard let session = response.session else { throw AuthError.noSession }
                Session.shared.setToken(session.accessToken)
                UserProfile.shared.linkedGoogle = false
                uiState = .success(onboardingComplete: false)
            } catch {
                uiState = .error(friendlyError(error))
            }
        }
    }

    // MARK: – Forgot password (3-step in-app flow)

    /// Step 1: sends the password-reset email. Returns an error string or nil on success.
    func sendPasswordReset(email: String) async -> String? {
        do {
            try await supabase.auth.resetPasswordForEmail(email.trimmingCharacters(in: .whitespaces))
            return nil
        } catch {
            return friendlyError(error)
        }
    }

    /// Step 2: verifies the 6-digit recovery code from the reset email.
    func verifyPasswordResetCode(email: String, code: String) {
        guard setLoading() else { return }
        Task {
            do {
                let response = try await supabase.auth.verifyOTP(
                    email: email.trimmingCharacters(in: .whitespaces),
                    token: code.trimmingCharacters(in: .whitespaces),
                    type: .recovery
                )
                guard let session = response.session else { throw AuthError.noSession }
                Session.shared.setToken(session.accessToken)
                uiState = .recoveryVerified
            } catch {
                uiState = .error(friendlyError(error))
            }
        }
    }

    /// Step 3: sets the new password on the recovery session, then clears it.
    func completePasswordReset(newPassword: String) {
        guard setLoading() else { return }
        Task {
            do {
                try await supabase.auth.update(user: UserAttributes(password: newPassword))
                await clearSession()
                uiState = .passwordResetComplete
            } catch {
                uiState = .error(friendlyError(error))
            }
        }
    }

    // MARK: – Onboarding / profile

    /// Saves onboarding completion to the backend (single source of truth checked on every login).
    /// Mirrors android AuthViewModel.saveProfile().
    func saveProfile() async {
        let p = UserProfile.shared
        let taste = TasteDto(
            goal: p.goal, risk: p.risk, riskStyle: p.riskStyle,
            picks: Array(p.brandPicks).sorted()
        )
        _ = try? await repository.putMe(
            displayName: p.displayName.trimmingCharacters(in: .whitespaces).isEmpty ? nil : p.displayName,
            onboardingCompleted: true,
            taste: taste
        )
    }

    /// Updates display name only (Edit profile screen).
    func updateProfile() async {
        let name = UserProfile.shared.displayName.trimmingCharacters(in: .whitespaces)
        _ = try? await repository.putMe(displayName: name.isEmpty ? nil : name)
    }

    // MARK: – Change password

    func changePassword(newPassword: String) async -> String? {
        do {
            try await supabase.auth.update(user: UserAttributes(password: newPassword))
            return nil
        } catch { return friendlyError(error) }
    }

    // MARK: – Delete account

    func deleteAccount() async -> String? {
        do {
            let result = try await repository.deleteMe()
            return result.ok ? nil : "Something went wrong. Try again."
        } catch { return friendlyError(error) }
    }

    // MARK: – Session lifecycle

    /// Drops the SDK's live session locally. Mirrors android AuthViewModel.clearSession().
    func clearSession() async {
        try? await supabase.auth.signOut(scope: .local)
    }

    /// Best-effort server-side token revocation. clearSession() already did the real local work.
    func revokeSessionRemotely() {
        Task { try? await supabase.auth.signOut() }
    }

    // MARK: – Google Sign-In (native account picker via GIDSignIn SDK)

    /// Shows the native Google sign-in sheet (account picker on iOS 14+ when a Google account
    /// is already on the device). On success, exchanges the ID token with Supabase.
    func signInWithGoogle() {
        guard setLoading() else { return }
        guard let scene = UIApplication.shared.connectedScenes
            .first(where: { $0.activationState == .foregroundActive }) as? UIWindowScene,
              let rootVC = scene.keyWindow?.rootViewController else {
            uiState = .error("Cannot present sign-in — try again")
            return
        }
        Task {
            do {
                let result = try await GIDSignIn.sharedInstance.signIn(withPresenting: rootVC)
                guard let idToken = result.user.idToken?.tokenString else {
                    uiState = .error("Google sign-in did not return an ID token")
                    return
                }
                let session = try await supabase.auth.signInWithIdToken(credentials: .init(
                    provider: .google,
                    idToken: idToken,
                    accessToken: result.user.accessToken.tokenString
                ))
                Session.shared.setToken(session.accessToken)
                let me = try? await repository.getMe()
                applyDisplayName(from: me)
                UserProfile.shared.linkedGoogle = true
                Session.shared.saveProfile()
                uiState = .success(onboardingComplete: me?.onboardingCompleted ?? true)
            } catch {
                let nsErr = error as NSError
                let isCancel = nsErr.code == GIDSignInError.canceled.rawValue
                uiState = isCancel ? .idle : .error(friendlyError(error))
            }
        }
    }

    // MARK: – Sign in with Apple (required by App Store Guideline 4.8)

    /// Called from the view after ASAuthorizationAppleIDProvider delivers credentials.
    /// `nonce` is the plain-text nonce whose SHA-256 hash was sent in the Apple request.
    func signInWithApple(idToken: String, nonce: String) {
        guard setLoading() else { return }
        Task {
            do {
                try await supabase.auth.signInWithIdToken(credentials: .init(
                    provider: .apple,
                    idToken: idToken,
                    nonce: nonce
                ))
                guard let session = supabase.auth.currentSession else { throw AuthError.noSession }
                Session.shared.setToken(session.accessToken)
                let me = try? await repository.getMe()
                applyDisplayName(from: me)
                UserProfile.shared.linkedApple = true
                Session.shared.saveProfile()
                uiState = .success(onboardingComplete: me?.onboardingCompleted ?? true)
            } catch {
                uiState = .error(friendlyError(error))
            }
        }
    }

    // MARK: – State helpers

    func resetState() { uiState = .idle }

    @discardableResult
    private func setLoading() -> Bool {
        guard uiState != .loading else { return false }
        uiState = .loading
        return true
    }

    private func applyDisplayName(from me: MeResponse?) {
        UserProfile.shared.displayName = me?.displayName.trimmingCharacters(in: .whitespaces) ?? ""
    }

    private func friendlyError(_ error: Error) -> String {
        let msg = error.localizedDescription
        if msg.range(of: "invalid_credentials", options: .caseInsensitive) != nil { return "Wrong email or password" }
        if msg.range(of: "already registered", options: .caseInsensitive) != nil ||
           msg.range(of: "User already registered", options: .caseInsensitive) != nil {
            return "An account with this email already exists"
        }
        if msg.range(of: "network", options: .caseInsensitive) != nil { return "Network error — check your connection" }
        if msg.range(of: "weak_password", options: .caseInsensitive) != nil { return "Password is too weak — use at least 8 characters" }
        if msg.range(of: "email not confirmed", options: .caseInsensitive) != nil { return "Confirm your email first — check your inbox for the link we sent." }
        if msg.range(of: "user not found", options: .caseInsensitive) != nil { return "No account found for that email" }
        if msg.range(of: "security purposes", options: .caseInsensitive) != nil { return "Give it a moment before trying again." }
        if msg.range(of: "token has expired or is invalid", options: .caseInsensitive) != nil ||
           msg.range(of: "otp_expired", options: .caseInsensitive) != nil ||
           msg.range(of: "invalid otp", options: .caseInsensitive) != nil {
            return "That code's wrong or expired — check the email again, or tap Resend."
        }
        return msg.isEmpty ? "Something went wrong. Try again." : msg
    }
}

// MARK: – Apple Sign-In nonce helpers

extension AuthViewModel {
    static func randomNonce(length: Int = 32) -> String {
        precondition(length > 0)
        var bytes = [UInt8](repeating: 0, count: length)
        _ = SecRandomCopyBytes(kSecRandomDefault, bytes.count, &bytes)
        let charset = Array("0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._")
        return String(bytes.map { charset[Int($0) % charset.count] })
    }

    static func sha256(_ input: String) -> String {
        SHA256.hash(data: Data(input.utf8)).map { String(format: "%02x", $0) }.joined()
    }
}

// MARK: – Internal errors

private enum AuthError: Error { case noSession }
