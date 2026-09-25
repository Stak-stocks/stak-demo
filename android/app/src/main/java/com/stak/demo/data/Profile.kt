package com.stak.demo.data

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class Profile(
    val id: String,
    @SerialName("display_name") val displayName: String? = null,
    @SerialName("risk_style") val riskStyle: String? = null,
    @SerialName("risk_answer") val riskAnswer: Int? = null,
    @SerialName("goal_answer") val goalAnswer: Int? = null,
    @SerialName("brand_picks") val brandPicks: List<String>? = null,
    @SerialName("onboarding_completed") val onboardingCompleted: Boolean = false,
)
