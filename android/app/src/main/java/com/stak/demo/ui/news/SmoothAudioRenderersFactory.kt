package com.stak.demo.ui.news

import android.content.Context
import androidx.annotation.OptIn
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.DefaultRenderersFactory
import androidx.media3.exoplayer.audio.AudioSink
import androidx.media3.exoplayer.audio.DefaultAudioSink
import androidx.media3.exoplayer.audio.DefaultAudioTrackBufferSizeProvider

/**
 * ExoPlayer renderers whose audio sink runs a DEEP AudioTrack buffer.
 *
 * Crackling / breaking audio (user, 2026-09-05, Pixel emulator) is the
 * AudioTrack underrunning: the default sink keeps only ~250ms of PCM
 * queued (4x the track's minimum), and an emulator's audio thread on a
 * laptop host stalls for longer than that, so the track starves and
 * pops. Queueing 1.5-3s (12x minimum) rides through the stalls; the
 * added output latency is invisible for a video clip because ExoPlayer
 * clocks video off the audio track's own timestamp, so lip-sync holds.
 * Decoder fallback stays on (a decoder that fails to init falls back to
 * the next one instead of killing the clip).
 */
@OptIn(UnstableApi::class)
internal class SmoothAudioRenderersFactory(context: Context) : DefaultRenderersFactory(context) {
	init {
		setEnableDecoderFallback(true)
	}

	override fun buildAudioSink(context: Context, enableFloatOutput: Boolean, enableAudioTrackPlaybackParams: Boolean): AudioSink {
		return DefaultAudioSink.Builder(context)
			.setEnableFloatOutput(enableFloatOutput)
			.setEnableAudioTrackPlaybackParams(enableAudioTrackPlaybackParams)
			.setAudioTrackBufferSizeProvider(
				DefaultAudioTrackBufferSizeProvider.Builder()
					.setMinPcmBufferDurationUs(1_500_000)
					.setMaxPcmBufferDurationUs(3_000_000)
					.setPcmBufferMultiplicationFactor(12)
					.build(),
			)
			.build()
	}
}
