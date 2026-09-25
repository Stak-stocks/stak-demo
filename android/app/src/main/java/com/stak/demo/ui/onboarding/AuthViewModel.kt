package com.stak.demo.ui.onboarding

import android.content.Context
import androidx.credentials.CredentialManager
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.GetCredentialCancellationException
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.stak.demo.BuildConfig
import com.stak.demo.data.ProfileSync
import com.stak.demo.data.Session
import com.stak.demo.data.StockRepository
import com.stak.demo.data.UserProfile
import dagger.hilt.android.lifecycle.HiltViewModel
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.auth.OtpType
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.auth.providers.Google
import io.github.jan.supabase.auth.providers.builtin.Email
import io.github.jan.supabase.auth.providers.builtin.IDToken
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

sealed interface AuthUiState {
    data object Idle : AuthUiState
    data object Loading : AuthUiState
    data class Error(val message: String) : AuthUiState
    /** onboardingComplete: false → route to onboarding; true → route to MAIN. */
    data class Success(val onboardingComplete: Boolean = true) : AuthUiState
    /** Sign-up succeeded but Supabase needs the email confirmed before a session exists - not an error. */
    data class AwaitingConfirmation(val email: String) : AuthUiState
    /** Forgot password, step 2->3: the recovery code checked out - ready to set a new password. */
    data object RecoveryVerified : AuthUiState
    /** Forgot password, step 4: the new password is set. */
    data object PasswordResetComplete : AuthUiState
}

@HiltViewModel
class AuthViewModel @Inject constructor(
    private val supabase: SupabaseClient,
    private val stockRepository: StockRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow<AuthUiState>(AuthUiState.Idle)
    val uiState: StateFlow<AuthUiState> = _uiState

    fun signIn(email: String, password: String) {
        viewModelScope.launch {
            _uiState.value = AuthUiState.Loading
            runCatching {
                supabase.auth.signInWith(Email) {
                    this.email = email.trim()
                    this.password = password
                }
                val token = supabase.auth.currentSessionOrNull()?.accessToken
                    ?: throw Exception("No session after sign-in")
                // Set token before calling /api/me so the auth header is included.
                Session.setToken(token)
                val me = runCatching { stockRepository.getMe() }.getOrNull()
                me?.displayName?.takeIf { it.isNotBlank() }?.let { UserProfile.displayName = it }
                // Network failure → me is null → assume returning user (mirrors web's .catch → "/").
                me?.onboardingCompleted ?: true
            }.fold(
                onSuccess = { onboardingComplete ->
                    UserProfile.linkedGoogle = false
                    Session.saveProfile()
                    _uiState.value = AuthUiState.Success(onboardingComplete)
                },
                onFailure = { e ->
                    _uiState.value = AuthUiState.Error(friendlyError(e))
                },
            )
        }
    }

    fun createAccount(email: String, password: String) {
        viewModelScope.launch {
            _uiState.value = AuthUiState.Loading
            runCatching {
                supabase.auth.signUpWith(Email) {
                    this.email = email.trim()
                    this.password = password
                }
                supabase.auth.currentSessionOrNull()?.accessToken
            }.fold(
                onSuccess = { token ->
                    if (token != null) {
                        Session.setToken(token)
                        UserProfile.linkedGoogle = false
                        // New users always go through onboarding.
                        _uiState.value = AuthUiState.Success(onboardingComplete = false)
                    } else {
                        // Email confirmation is enabled in the Supabase dashboard - this isn't
                        // an error, so it gets its own state rather than AuthUiState.Error
                        // (which the screens render in red).
                        _uiState.value = AuthUiState.AwaitingConfirmation(email.trim())
                    }
                },
                onFailure = { e ->
                    _uiState.value = AuthUiState.Error(friendlyError(e))
                },
            )
        }
    }

    /** "Didn't get it?" on the awaiting-confirmation screen - re-sends the same signup confirmation email. */
    fun resendConfirmation(email: String) {
        viewModelScope.launch {
            _uiState.value = AuthUiState.Loading
            runCatching {
                supabase.auth.resendEmail(OtpType.Email.SIGNUP, email)
            }.fold(
                onSuccess = { _uiState.value = AuthUiState.AwaitingConfirmation(email) },
                onFailure = { e -> _uiState.value = AuthUiState.Error(friendlyError(e)) },
            )
        }
    }

    /**
     * The Robinhood-style code entry on "Check your email" (2026-09-19) - verifies the
     * real 6-digit code Supabase's own confirmation email carries ({{ .Token }}, the
     * same underlying token the link would exchange), signing the account in immediately
     * without ever leaving the app. Success routes through the same Success state
     * createAccount() uses, so the screen's existing navigation handles it unchanged.
     */
    fun verifyEmailCode(email: String, code: String) {
        viewModelScope.launch {
            _uiState.value = AuthUiState.Loading
            runCatching {
                supabase.auth.verifyEmailOtp(OtpType.Email.SIGNUP, email.trim(), code.trim())
                supabase.auth.currentSessionOrNull()?.accessToken
                    ?: throw Exception("No session after verification")
            }.fold(
                onSuccess = { token ->
                    Session.setToken(token)
                    UserProfile.linkedGoogle = false
                    // New users always go through onboarding.
                    _uiState.value = AuthUiState.Success(onboardingComplete = false)
                },
                onFailure = { e -> _uiState.value = AuthUiState.Error(friendlyError(e)) },
            )
        }
    }

    /**
     * Forgot password. No redirectUrl - the app has no deep link registered to catch a
     * return trip, so (mirroring the web app's resetPasswordSupabase in AuthContext.tsx)
     * this relies on the Supabase dashboard's own email template, which already points
     * the link at the web app's /reset-password page. The user finishes there and comes
     * back here to sign in with the new password. Null on success, else a message to show.
     */
    suspend fun sendPasswordReset(email: String): String? =
        runCatching { supabase.auth.resetPasswordForEmail(email.trim(), redirectUrl = null) }.fold(
            onSuccess = { null },
            onFailure = { e -> friendlyError(e) },
        )

    /**
     * Forgot password, step 2 (2026-09-19): verifies the real recovery code the reset
     * email carries - the same in-app pattern as signup confirmation, instead of a link
     * that opens a browser. A real Supabase code verification always signs the account
     * in (it has to, to let the next step change the password), so this also doubles as
     * a genuine sign-in; step 3 changes the password, then drops this session so the
     * user signs in fresh with it, same as every other password change.
     */
    fun verifyPasswordResetCode(email: String, code: String) {
        viewModelScope.launch {
            _uiState.value = AuthUiState.Loading
            runCatching {
                supabase.auth.verifyEmailOtp(OtpType.Email.RECOVERY, email.trim(), code.trim())
                supabase.auth.currentSessionOrNull()?.accessToken
                    ?: throw Exception("No session after verification")
            }.fold(
                onSuccess = { token ->
                    Session.setToken(token)
                    _uiState.value = AuthUiState.RecoveryVerified
                },
                onFailure = { e -> _uiState.value = AuthUiState.Error(friendlyError(e)) },
            )
        }
    }

    /** Forgot password, step 3: sets the new password on the recovery session step 2 established, then drops it. */
    fun completePasswordReset(newPassword: String) {
        viewModelScope.launch {
            _uiState.value = AuthUiState.Loading
            runCatching {
                supabase.auth.updateUser { password = newPassword }
            }.fold(
                onSuccess = {
                    clearSession()
                    _uiState.value = AuthUiState.PasswordResetComplete
                },
                onFailure = { e -> _uiState.value = AuthUiState.Error(friendlyError(e)) },
            )
        }
    }

    /**
     * Saves onboarding completion to the backend users table (the single source of truth
     * checked at every login). Suspend so the caller can await it before navigating away —
     * fire-and-forget was unreliable because the ViewModel scope was cancelled mid-request
     * when the nav stack was cleared.
     */
    suspend fun saveProfile() {
        runCatching {
            stockRepository.putMe(
                displayName = UserProfile.displayName.takeIf { it.isNotBlank() },
                onboardingCompleted = true,
                // The answers go with the account, so a new phone shows the same taste.
                taste = ProfileSync.currentTaste(),
            )
        }
    }

    /** Updates display name after onboarding (Edit profile screen). Does not touch onboardingCompleted. */
    suspend fun updateProfile() {
        runCatching {
            stockRepository.putMe(displayName = UserProfile.displayName.takeIf { it.isNotBlank() })
        }
    }

    /**
     * Change password screen. Supabase's password update uses the active session -
     * no re-auth with the current password needed (mirrors the web app's
     * profile_.security.tsx). Null on success, else a message to show inline.
     */
    suspend fun changePassword(newPassword: String): String? =
        runCatching {
            supabase.auth.updateUser { password = newPassword }
        }.fold(
            onSuccess = { null },
            onFailure = { e -> friendlyError(e) },
        )

    /**
     * App settings -> Delete account, for a real (non-demo) account: DELETE /api/me
     * removes every saved row and the Supabase auth record itself. Null on success,
     * else a message - the caller must not wipe local state or sign out on failure,
     * since the server-side account (and its data) would still exist.
     */
    suspend fun deleteAccount(): String? =
        runCatching { stockRepository.deleteMe() }.fold(
            onSuccess = { ok -> if (ok.ok) null else "Something went wrong. Try again." },
            onFailure = { e -> friendlyError(e) },
        )

    /**
     * Drops the SDK's live session immediately - no network call, so nothing that
     * runs after this (a sign-in, a sign-up) can ever read a stale one. Awaited by
     * the caller before it navigates to Sign In (audit 2026-09-19: the old
     * fire-and-forget signOut() did the server revocation - a real network round
     * trip - before clearing anything locally, so a fast re-signup right after
     * logout could still see the previous account's session and silently inherit
     * it instead of creating a real new one).
     */
    suspend fun clearSession() {
        runCatching { supabase.auth.clearSession() }
    }

    /** Best-effort: revokes the refresh token server-side too. clearSession() above already did the real local job, so this can lag or fail without the app noticing. */
    fun revokeSessionRemotely() {
        viewModelScope.launch {
            runCatching { supabase.auth.signOut() }
        }
    }

    fun signInWithGoogle(context: Context) {
        viewModelScope.launch {
            _uiState.value = AuthUiState.Loading
            runCatching {
                val credentialManager = CredentialManager.create(context)
                // The button flow's own API (device report, 2026-09-19): this is an explicit
                // "Continue with Google" tap, which is what GetSignInWithGoogleOption is for.
                // GetGoogleIdOption is the automatic bottom-sheet prompt - on this phone
                // Google's side answered in 3.2-4.1s on every attempt while Android's
                // credential framework cancels a remote provider at ~3.0s, so a sign-in
                // that actually succeeded surfaced as "No credentials available".
                val googleOption = GetSignInWithGoogleOption.Builder(BuildConfig.GOOGLE_WEB_CLIENT_ID).build()
                val request = GetCredentialRequest.Builder()
                    .addCredentialOption(googleOption)
                    .build()
                val result = credentialManager.getCredential(context = context, request = request)
                val googleCred = GoogleIdTokenCredential.createFrom(result.credential.data)
                supabase.auth.signInWith(IDToken) {
                    this.idToken = googleCred.idToken
                    provider = Google
                }
                val token = supabase.auth.currentSessionOrNull()?.accessToken
                    ?: throw Exception("No session after Google sign-in")
                // Set token before calling /api/me so the auth header is included.
                Session.setToken(token)
                val me = runCatching { stockRepository.getMe() }.getOrNull()
                // Profile name takes priority; Google account name is the fallback for new users.
                val name = me?.displayName?.takeIf { it.isNotBlank() }
                    ?: googleCred.displayName?.takeIf { it.isNotBlank() }
                name?.let { UserProfile.displayName = it }
                // Network failure → me is null → assume returning user (mirrors web's .catch → "/").
                me?.onboardingCompleted ?: true
            }.fold(
                onSuccess = { onboardingComplete ->
                    UserProfile.linkedGoogle = true
                    Session.saveProfile()
                    _uiState.value = AuthUiState.Success(onboardingComplete)
                },
                onFailure = { e ->
                    if (e is GetCredentialCancellationException) {
                        _uiState.value = AuthUiState.Idle
                    } else {
                        _uiState.value = AuthUiState.Error(friendlyError(e))
                    }
                },
            )
        }
    }

    fun resetState() {
        _uiState.value = AuthUiState.Idle
    }

    private fun friendlyError(e: Throwable): String {
        val msg = e.message ?: return "Something went wrong. Try again."
        return when {
            msg.contains("invalid_credentials", ignoreCase = true) -> "Wrong email or password"
            msg.contains("already registered", ignoreCase = true) ||
                msg.contains("User already registered", ignoreCase = true) -> "An account with this email already exists"
            msg.contains("network", ignoreCase = true) ||
                msg.contains("Unable to resolve host", ignoreCase = true) -> "Network error — check your connection"
            msg.contains("weak_password", ignoreCase = true) -> "Password is too weak — use at least 8 characters"
            // Sign-in before clicking the confirmation link - the "check your email" state
            // this account never finished, not a wrong-password case.
            msg.contains("email not confirmed", ignoreCase = true) -> "Confirm your email first — check your inbox for the link we sent."
            msg.contains("user not found", ignoreCase = true) -> "No account found for that email"
            // Supabase's own rate-limit wording ("For security purposes, you can only
            // request this after Ns") on a repeated resend/reset tap.
            msg.contains("security purposes", ignoreCase = true) -> "Give it a moment before trying again."
            // A wrong or expired code on the email-confirmation entry (2026-09-19).
            msg.contains("token has expired or is invalid", ignoreCase = true) ||
                msg.contains("invalid otp", ignoreCase = true) ||
                msg.contains("otp_expired", ignoreCase = true) -> "That code's wrong or expired — check the email again, or tap Resend."
            else -> msg
        }
    }
}
