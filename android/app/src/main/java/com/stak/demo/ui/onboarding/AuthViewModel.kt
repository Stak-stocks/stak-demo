package com.stak.demo.ui.onboarding

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.stak.demo.data.Session
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
    data object Success : AuthUiState
}

@HiltViewModel
class AuthViewModel @Inject constructor(
    private val supabase: SupabaseClient,
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
                supabase.auth.currentSessionOrNull()?.accessToken
            }.fold(
                onSuccess = { token ->
                    if (token != null) Session.setToken(token)
                    _uiState.value = AuthUiState.Success
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
                        _uiState.value = AuthUiState.Success
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
