package com.stak.demo.ui.onboarding

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.stak.demo.data.ProfileRepository
import com.stak.demo.data.Session
import com.stak.demo.data.UserProfile
import dagger.hilt.android.lifecycle.HiltViewModel
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.auth.providers.builtin.Email
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
    private val profileRepository: ProfileRepository,
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
                // Null (network error / missing row) defaults to true so a
                // returning user with a flaky connection still reaches MAIN.
                val onboardingComplete = profileRepository.getOnboardingComplete() ?: true
                token to onboardingComplete
            }.fold(
                onSuccess = { (token, onboardingComplete) ->
                    if (token != null) Session.setToken(token)
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
     * Saves the completed onboarding profile to Supabase. Fire-and-forget —
     * the UI proceeds immediately; a save failure only affects cross-device
     * onboarding routing, not the current device's local state.
     */
    fun saveProfile() {
        viewModelScope.launch {
            runCatching {
                profileRepository.upsertProfile(
                    displayName = UserProfile.displayName.takeIf { it.isNotBlank() },
                    brandPicks = UserProfile.brandPicks.toList(),
                    goalAnswer = UserProfile.goal,
                    riskAnswer = UserProfile.risk,
                    riskStyle = UserProfile.riskStyle,
                    onboardingCompleted = true,
                )
            }
        }
    }

    fun signOut() {
        viewModelScope.launch {
            runCatching { supabase.auth.signOut() }
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
