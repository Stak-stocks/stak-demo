package com.stak.demo.data

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build
import com.google.firebase.messaging.FirebaseMessaging
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await

/**
 * Registers this install for push notifications, so price moves and the morning deck
 * reach the phone while STAK is closed. The backend (GET /api/stock/push-run) decides
 * what to send; this tells it where, and which of the notification settings are on.
 */
object PushRegistration {
	/** The channel the backend's messages name; created at app start. */
	const val CHANNEL_ID = "stak_alerts"

	private var repository: StockRepository? = null
	private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

	fun init(context: Context, repo: StockRepository) {
		repository = repo
		if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
			val manager = context.getSystemService(NotificationManager::class.java)
			manager?.createNotificationChannel(
				NotificationChannel(CHANNEL_ID, "Price moves and your deck", NotificationManager.IMPORTANCE_DEFAULT).apply {
					description = "Big moves on your saved stocks, and a reminder when a fresh deck lands."
				},
			)
		}
	}

	/**
	 * Sends this install's token and current settings to the backend. Called at start-up,
	 * after sign-in, when a notification setting changes, and when FCM issues a new token.
	 * The demo account and a signed-out app register nothing.
	 */
	fun sync(knownToken: String? = null) {
		if (Session.demoAccount || Session.token == null) return
		val repo = repository ?: return
		scope.launch {
			val token = knownToken ?: runCatching { FirebaseMessaging.getInstance().token.await() }.getOrNull() ?: return@launch
			runCatching {
				repo.putPushDevice(
					PushDeviceRequest(
						token = token,
						platform = "android",
						timezone = java.util.TimeZone.getDefault().id,
						priceAlerts = UserProfile.notificationsOn && UserProfile.priceAlerts,
						dailyDeck = UserProfile.notificationsOn && UserProfile.dailyDeck,
					),
				)
			}
		}
	}

	/**
	 * Sign-out: this install's token is deleted, so the backend's next send to it comes
	 * back unregistered and the device row is removed - the next person to use the phone
	 * doesn't get the last account's alerts. A new token is issued on the next sign-in.
	 */
	fun forget() {
		scope.launch { runCatching { FirebaseMessaging.getInstance().deleteToken().await() } }
	}
}
