package com.stak.demo.ui.onboarding

import android.content.Context
import androidx.credentials.CredentialManager
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.GetCredentialCancellationException
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.stak.demo.BuildConfig
import com.stak.demo.data.ProfileSync
import com.stak.demo.data.Session
import com.stak.demo.data.StockRepository
import com.stak.demo.data.UserProfile
import dagger.hilt.android.lifecycle.HiltViewModel
import io.github.jan.supabase.SupabaseClient
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
                        // Email confirmation is enabled in the Supabase dashboard.
                        _uiState.value = AuthUiState.Error("Check your email to confirm your account, then sign in.")
                    }
                },
                onFailure = { e ->
                    _uiState.value = AuthUiState.Error(friendlyError(e))
                },
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

    fun signOut() {
        viewModelScope.launch {
            runCatching { supabase.auth.signOut() }
        }
    }

    fun signInWithGoogle(context: Context) {
        viewModelScope.launch {
            _uiState.value = AuthUiState.Loading
            runCatching {
                val credentialManager = CredentialManager.create(context)
                val googleIdOption = GetGoogleIdOption.Builder()
                    .setFilterByAuthorizedAccounts(false)
                    .setServerClientId(BuildConfig.GOOGLE_WEB_CLIENT_ID)
                    .setAutoSelectEnabled(false)
                    .build()
                val request = GetCredentialRequest.Builder()
                    .addCredentialOption(googleIdOption)
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
            else -> msg
        }
    }
}
