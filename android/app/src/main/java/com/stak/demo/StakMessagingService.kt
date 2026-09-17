package com.stak.demo

import android.app.PendingIntent
import android.content.Intent
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.stak.demo.data.PushRegistration

/**
 * Receives push notifications. With the app in the background Android shows them
 * itself from the message's notification block; this draws the same notification when
 * STAK is open, where the system would otherwise drop it. A refreshed FCM token is sent
 * straight to the backend.
 */
class StakMessagingService : FirebaseMessagingService() {
	override fun onNewToken(token: String) {
		PushRegistration.sync(knownToken = token)
	}

	override fun onMessageReceived(message: RemoteMessage) {
		val n = message.notification ?: return
		val open = PendingIntent.getActivity(
			this,
			0,
			Intent(this, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP),
			PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
		)
		val notification = NotificationCompat.Builder(this, PushRegistration.CHANNEL_ID)
			.setSmallIcon(R.mipmap.ic_launcher)
			.setContentTitle(n.title)
			.setContentText(n.body)
			.setAutoCancel(true)
			.setContentIntent(open)
			.build()
		runCatching { NotificationManagerCompat.from(this).notify(message.messageId.hashCode(), notification) }
	}
}
