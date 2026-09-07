package com.stak.demo.data

import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.postgrest.from
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ProfileRepository @Inject constructor(private val supabase: SupabaseClient) {

    /**
     * Upserts the user's profile row. The `id` column is the Supabase user's
     * UUID, enforced by the profiles table FK on auth.users.
     */
    suspend fun upsertProfile(
        displayName: String?,
        brandPicks: List<String>,
        goalAnswer: Int,
        riskAnswer: Int,
        riskStyle: String,
        onboardingCompleted: Boolean,
    ) {
        val uid = supabase.auth.currentSessionOrNull()?.user?.id ?: return
        supabase.from("profiles").upsert(
            Profile(
                id = uid,
                displayName = displayName,
                brandPicks = brandPicks,
                goalAnswer = goalAnswer,
                riskAnswer = riskAnswer,
                riskStyle = riskStyle,
                onboardingCompleted = onboardingCompleted,
            )
        )
    }

    /**
     * Returns true if the signed-in user has completed onboarding, false if
     * not, null if the row doesn't exist or the query fails (caller treats
     * null as "not completed").
     */
    suspend fun getOnboardingComplete(): Boolean? = runCatching {
        val uid = supabase.auth.currentSessionOrNull()?.user?.id ?: return null
        supabase.from("profiles")
            .select {
                filter { eq("id", uid) }
                limit(1)
            }
            .decodeSingleOrNull<Profile>()
            ?.onboardingCompleted
    }.getOrNull()
}
