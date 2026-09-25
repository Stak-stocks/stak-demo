package com.stak.demo.ui.news

import android.content.Context
import android.graphics.Outline
import android.os.Build
import android.view.SurfaceView
import android.view.ViewOutlineProvider
import android.view.TextureView
import android.view.View
import android.widget.FrameLayout
import androidx.media3.common.Player
import androidx.media3.common.VideoSize
import androidx.media3.exoplayer.ExoPlayer
import kotlin.math.roundToInt

/**
 * Hosts a clip's output surface at the VIDEO's aspect ratio inside whatever
 * box Compose gives it - never stretched (a bare surface view fills its
 * bounds and distorts; user, 2026-09-05 fullscreen screenshot). `zoom`
 * fills the box and clips the overflow (the inline hero and the mini
 * player, like the frame's cropped hero image); otherwise the video fits
 * inside, centred, on the host's background (fullscreen, letterboxed like
 * a Netflix player). The ratio is the player's reported video size, 16:9
 * until it is known.
 *
 * SurfaceView, not TextureView (user, 2026-09-05 "audio cracking" on the
 * Pixel emulator): a TextureView's frames are consumed by the app's UI
 * thread, so when the UI draws slowly (any emulator) the decoder blocks
 * waiting for a free buffer, ExoPlayer's single playback loop stalls
 * with it, the audio sink is written in bursts and the AudioTrack
 * underruns - measured 3s of underrun per 11s with only 0-150ms ever
 * queued. A SurfaceView is composited by SurfaceFlinger, off the app's
 * UI, so audio keeps flowing however slow the screen is. It punches
 * through Compose clipping, so the r10 corners are its own outline clip
 * (SurfaceView honours clipToOutline from Android 12); below 12 the
 * TextureView path keeps the corners and the old coupling.
 */
internal class VideoSurfaceHost(
	context: Context,
	private val exo: ExoPlayer,
	private val zoom: Boolean,
	cornerRadiusPx: Float = 0f,
	private val useSurfaceView: Boolean = Build.VERSION.SDK_INT >= Build.VERSION_CODES.S,
) : FrameLayout(context) {
	private val output: View = if (useSurfaceView) SurfaceView(context) else TextureView(context)
	private var aspect = 16f / 9f
	private val listener = object : Player.Listener {
		override fun onVideoSizeChanged(videoSize: VideoSize) = apply(videoSize)
	}

	init {
		clipChildren = true
		if (cornerRadiusPx > 0f) {
			output.outlineProvider = object : ViewOutlineProvider() {
				override fun getOutline(view: View, outline: Outline) = outline.setRoundRect(0, 0, view.width, view.height, cornerRadiusPx)
			}
			output.clipToOutline = true
		}
		addView(output, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT))
		apply(exo.videoSize)
		exo.addListener(listener)
		when (output) {
			is SurfaceView -> exo.setVideoSurfaceView(output)
			is TextureView -> exo.setVideoTextureView(output)
		}
	}

	private fun apply(size: VideoSize) {
		if (size.width <= 0 || size.height <= 0) return
		val a = size.width * size.pixelWidthHeightRatio / size.height
		if (a != aspect) {
			aspect = a
			requestLayout()
		}
	}

	override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
		val w = MeasureSpec.getSize(widthMeasureSpec)
		val h = MeasureSpec.getSize(heightMeasureSpec)
		if (w == 0 || h == 0) {
			super.onMeasure(widthMeasureSpec, heightMeasureSpec)
			return
		}
		val boxAspect = w.toFloat() / h
		// Fit: the wider box constrains by height. Zoom: the wider box fills its width and overflows vertically.
		val byHeight = if (zoom) boxAspect < aspect else boxAspect > aspect
		val cw = if (byHeight) (h * aspect).roundToInt() else w
		val ch = if (byHeight) h else (w / aspect).roundToInt()
		output.measure(MeasureSpec.makeMeasureSpec(cw, MeasureSpec.EXACTLY), MeasureSpec.makeMeasureSpec(ch, MeasureSpec.EXACTLY))
		setMeasuredDimension(w, h)
	}

	override fun onLayout(changed: Boolean, left: Int, top: Int, right: Int, bottom: Int) {
		val cw = output.measuredWidth
		val ch = output.measuredHeight
		val x = ((right - left) - cw) / 2
		val y = ((bottom - top) - ch) / 2
		output.layout(x, y, x + cw, y + ch)
	}

	/** Detaches THIS host's surface only - the mini player or the fullscreen view may already own the player. */
	fun release() {
		exo.removeListener(listener)
		when (output) {
			is SurfaceView -> exo.clearVideoSurfaceView(output)
			is TextureView -> exo.clearVideoTextureView(output)
		}
	}
}
