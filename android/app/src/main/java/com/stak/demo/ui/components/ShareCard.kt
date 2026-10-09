package com.stak.demo.ui.components

import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RadialGradient
import android.graphics.Shader
import android.graphics.Typeface
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import androidx.core.content.res.ResourcesCompat
import com.stak.demo.R
import java.io.File
import kotlinx.coroutines.launch

/**
 * A share picture: STAK's mark, what's being shared, its figure, the selected range's change and chart - 1080x1350 (a
 * 4:5 post), in the app's colours - sent with its line in words. Mirrors web lib/shareCard.ts and iOS ShareCardView.
 */
object ShareCard {
	data class Spec(
		/** "MY PICK" / "MY PORTFOLIO". */
		val kicker: String,
		/** "NVDA" / "My STAK portfolio". */
		val title: String,
		/** The company's name, or what the portfolio is. */
		val subtitle: String?,
		/** The price, or the portfolio's value: "$188.42". */
		val figure: String,
		/** The range's change: "▲ +$12.30 (+6.9%) past month". */
		val line: String,
		val up: Boolean,
		/** One more line under it ("My gain +$94.20 (+6.2%) since Oct 8"). */
		val note: String?,
		/** The chart's values, oldest first (nothing drawn under two). */
		val values: List<Double>,
	)

	private const val W = 1080
	private const val H = 1350
	private const val PAD = 88f
	private const val BG = 0xFF0A1020.toInt()
	private const val WHITE = 0xFFFFFFFF.toInt()
	private const val MUTED = 0xFF819ABB.toInt()
	private const val TEAL = 0xFF69B3CA.toInt()
	private const val GREEN = 0xFF2FD08A.toInt()
	private const val RED = 0xFFFF6B6B.toInt()

	/**
	 * Shares the picture with [text] through the system sheet; with no picture (it couldn't be drawn or saved), the words.
	 * Drawn and saved off the main thread (a 1080x1350 PNG is a visible stall on a mid-range phone); one at a time.
	 */
	fun share(context: Context, scope: kotlinx.coroutines.CoroutineScope, spec: Spec, text: String, chooserTitle: String, fileName: String) {
		if (sharing) return
		sharing = true
		scope.launch {
			try {
				val uri = kotlinx.coroutines.withContext(kotlinx.coroutines.Dispatchers.Default) { saved(context, spec, fileName) }
				open(context, uri, text, chooserTitle)
			} finally {
				sharing = false
			}
		}
	}

	@Volatile private var sharing = false

	private fun saved(context: Context, spec: Spec, fileName: String): android.net.Uri? = runCatching {
		val dir = File(context.cacheDir, "share").apply { mkdirs() }
		val file = File(dir, fileName)
		val bitmap = render(context, spec)
		file.outputStream().use { bitmap.compress(Bitmap.CompressFormat.PNG, 100, it) }
		bitmap.recycle()
		FileProvider.getUriForFile(context, "${context.packageName}.share", file)
	}.getOrNull()

	private fun open(context: Context, uri: android.net.Uri?, text: String, chooserTitle: String) {
		val send = Intent(Intent.ACTION_SEND).putExtra(Intent.EXTRA_TEXT, text)
		if (uri != null) {
			send.setType("image/png").putExtra(Intent.EXTRA_STREAM, uri)
			// The preview in the share sheet, and read access for whichever app it goes to.
			send.clipData = android.content.ClipData.newRawUri(null, uri)
			send.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
		} else {
			send.setType("text/plain")
		}
		runCatching { context.startActivity(Intent.createChooser(send, chooserTitle)) }
	}

	private fun font(context: Context, id: Int): Typeface = runCatching { ResourcesCompat.getFont(context, id) }.getOrNull() ?: Typeface.DEFAULT

	/** The longest start of [text] that fits [max] px wide, with "…" when cut. */
	private fun fit(paint: Paint, text: String, max: Float): String {
		if (paint.measureText(text) <= max) return text
		var s = text
		while (s.length > 1 && paint.measureText("$s…") > max) s = s.dropLast(1)
		return "$s…"
	}

	fun render(context: Context, spec: Spec): Bitmap {
		val bitmap = Bitmap.createBitmap(W, H, Bitmap.Config.ARGB_8888)
		val canvas = Canvas(bitmap)
		canvas.drawColor(BG)
		val glow = Paint().apply {
			shader = RadialGradient(W * 0.85f, 0f, W * 0.9f, 0x38_69B3CA, 0x00_69B3CA, Shader.TileMode.CLAMP)
		}
		canvas.drawRect(0f, 0f, W.toFloat(), H.toFloat(), glow)

		// The mark and wordmark (white vectors).
		ContextCompat.getDrawable(context, R.drawable.ic_stak_logo_mark)?.apply {
			setBounds(PAD.toInt(), PAD.toInt(), PAD.toInt() + 64, PAD.toInt() + 64)
			draw(canvas)
		}
		ContextCompat.getDrawable(context, R.drawable.ic_stak_wordmark)?.apply {
			val left = PAD.toInt() + 78
			val top = PAD.toInt() + 17
			setBounds(left, top, left + 156, top + 30)
			draw(canvas)
		}

		val sora = font(context, R.font.sora_semibold)
		val geist = font(context, R.font.geist_regular)
		val geistMedium = font(context, R.font.geist_medium)
		val maxW = W - PAD * 2
		val text = Paint(Paint.ANTI_ALIAS_FLAG)
		fun draw(s: String, face: Typeface, size: Float, color: Int, x: Float, y: Float, alignRight: Boolean = false, shrink: Boolean = false) {
			text.typeface = face
			text.textSize = size
			// The figure and its line shrink to fit rather than lose digits ("$1,234,5…").
			if (shrink) text.measureText(s).let { w -> if (w > maxW) text.textSize = size * maxW / w }
			text.color = color
			text.textAlign = if (alignRight) Paint.Align.RIGHT else Paint.Align.LEFT
			canvas.drawText(fit(text, s, maxW), x, y, text)
		}

		val color = if (spec.up) GREEN else RED
		text.letterSpacing = 0.08f
		draw(spec.kicker, geistMedium, 30f, MUTED, PAD, 280f)
		text.letterSpacing = 0f
		var y = 380f
		draw(spec.title, sora, if (spec.title.length > 10) 72f else 96f, WHITE, PAD, y)
		spec.subtitle?.let { y += 60f; draw(it, geist, 36f, MUTED, PAD, y) }
		y += 160f
		draw(spec.figure, sora, 120f, WHITE, PAD, y, shrink = true)
		y += 70f
		draw(spec.line, geistMedium, 40f, color, PAD, y, shrink = true)
		spec.note?.let { y += 54f; draw(it, geist, 32f, MUTED, PAD, y) }

		// The chart: the range's line with a soft fill under it.
		val top = maxOf(y + 70f, 820f)
		val bottom = 1150f
		if (spec.values.size >= 2) {
			val min = spec.values.min()
			val max = spec.values.max()
			val span = (max - min).takeIf { it > 0.0 } ?: 1.0
			val last = spec.values.lastIndex
			val xs = spec.values.indices.map { PAD + maxW * it / last }
			val ys = spec.values.map { bottom - ((it - min) / span).toFloat() * (bottom - top) }
			val line = Path().apply { moveTo(xs[0], ys[0]); for (i in 1..last) lineTo(xs[i], ys[i]) }
			val area = Path(line).apply { lineTo(xs[last], bottom); lineTo(xs[0], bottom); close() }
			val fillTop = if (spec.up) 0x47_2FD08A else 0x47_FF6B6B
			canvas.drawPath(area, Paint(Paint.ANTI_ALIAS_FLAG).apply { shader = LinearGradient(0f, top, 0f, bottom, fillTop, 0x000A1020, Shader.TileMode.CLAMP) })
			canvas.drawPath(line, Paint(Paint.ANTI_ALIAS_FLAG).apply {
				style = Paint.Style.STROKE
				strokeWidth = 6f
				strokeJoin = Paint.Join.ROUND
				strokeCap = Paint.Cap.ROUND
				this.color = color
			})
		}

		// It's practice money - said on the picture itself, since it travels without the app around it.
		draw("Paper trading on STAK · not real money", geist, 28f, MUTED, PAD, H - PAD)
		draw("thestak.org", geistMedium, 30f, TEAL, W - PAD, H - PAD, alignRight = true)
		return bitmap
	}
}
