package com.stak.demo.navigation

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue

/**
 * Links the app is opened with (09 · Auth recovery, 2026-10-07): the password-reset mail's
 * stak://reset / https://stak.app/reset lands on Auth · Set a new password (1:5892). MainActivity
 * records the pending link; StakRoot consumes it once the splash is out of the way.
 */
object DeepLinks {
	const val RESET = "reset"
	var pending by mutableStateOf<String?>(null)

	/** True when the intent's data is the reset link. */
	fun isReset(data: android.net.Uri?): Boolean = data != null &&
		((data.scheme == "stak" && data.host == "reset") || (data.host == "stak.app" && data.path?.trimEnd('/') == "/reset"))
}
