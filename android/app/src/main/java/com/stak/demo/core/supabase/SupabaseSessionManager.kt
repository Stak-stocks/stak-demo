package com.stak.demo.core.supabase

import android.content.Context
import io.github.jan.supabase.auth.SessionManager
import io.github.jan.supabase.auth.user.UserSession
import kotlinx.serialization.json.Json

class SupabaseSessionManager(context: Context) : SessionManager {

    private val prefs = context.getSharedPreferences("supabase_auth", Context.MODE_PRIVATE)
    private val json = Json { ignoreUnknownKeys = true; encodeDefaults = true }

    override suspend fun loadSession(): UserSession? {
        val raw = prefs.getString("session", null) ?: return null
        return try {
            json.decodeFromString(UserSession.serializer(), raw)
        } catch (_: Exception) {
            null
        }
    }

    override suspend fun saveSession(session: UserSession) {
        prefs.edit().putString("session", json.encodeToString(UserSession.serializer(), session)).apply()
    }

    override suspend fun deleteSession() {
        prefs.edit().remove("session").apply()
    }
}
