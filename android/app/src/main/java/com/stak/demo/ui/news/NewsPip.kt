package com.stak.demo.ui.news

import android.app.Activity
import android.app.PendingIntent
import android.app.PictureInPictureParams
import android.app.RemoteAction
import android.content.Context
import android.content.Intent
import android.graphics.drawable.Icon
import android.util.Rational
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue

/**
 * System picture-in-picture for the news hero video (user, 2026-08-31,
 * video_app reference shots): the player's PiP button - and leaving the
 * app while a clip plays - floats the video in the OS mini-player with
 * rewind-15 / play-pause / forward-15 remote actions; the article hero
 * meanwhile shows the "playing in picture in picture" placeholder, and
 * expanding the window returns to the full player (reference image 3).
 *
 * MainActivity owns the OS side (mode-change callback, the control
 * receiver, the video-only render while shrunk); the hero player
 * registers itself here while an article's clip is on screen.
 */
object NewsPip {
	/** True while the activity sits in the OS PiP window. */
	var inPip by mutableStateOf(false)

	/** The hero player currently on screen (null when no article video is active). */
	var player: androidx.media3.exoplayer.ExoPlayer? = null

	const val ACTION = "com.stak.demo.NEWS_PIP"
	const val EXTRA = "control"
	const val PLAY = 1
	const val PAUSE = 2
	const val BACK15 = 3
	const val FWD15 = 4

	private fun remote(ctx: Context, code: Int, icon: Int, title: String): RemoteAction {
		val intent = Intent(ACTION).setPackage(ctx.packageName).putExtra(EXTRA, code)
		val pending = PendingIntent.getBroadcast(
			ctx, code, intent,
			PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
		)
		return RemoteAction(Icon.createWithResource(ctx, icon), title, title, pending)
	}

	/** The PiP window: 16:9 like the clips, mini-player actions like the reference. */
	private fun params(ctx: Context, playing: Boolean): PictureInPictureParams =
		PictureInPictureParams.Builder()
			.setAspectRatio(Rational(16, 9))
			.setActions(
				listOf(
					remote(ctx, BACK15, android.R.drawable.ic_media_rew, "Back 15 seconds"),
					if (playing) remote(ctx, PAUSE, android.R.drawable.ic_media_pause, "Pause")
					else remote(ctx, PLAY, android.R.drawable.ic_media_play, "Play"),
					remote(ctx, FWD15, android.R.drawable.ic_media_ff, "Forward 15 seconds"),
				),
			)
			.build()

	/** Floats the video. No-op when no hero player is active. */
	fun enter(activity: Activity) {
		val p = player ?: return
		runCatching { activity.enterPictureInPictureMode(params(activity, p.playWhenReady)) }
	}

	/** Re-publishes the actions (play <-> pause glyph) while the window is up. */
	fun refresh(activity: Activity) {
		if (!inPip) return
		val p = player ?: return
		runCatching { activity.setPictureInPictureParams(params(activity, p.playWhenReady)) }
	}
}
