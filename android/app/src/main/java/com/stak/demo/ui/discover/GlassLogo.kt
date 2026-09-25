package com.stak.demo.ui.discover

import android.graphics.Bitmap
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.BlendMode
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import coil.request.ImageRequest
import coil.transform.Transformation
import kotlin.math.abs

/**
 * A brand logo set into the basket template's glass ball, for brands with no
 * pre-generated card art. Positioned for the 340x229 art box: the template is
 * width-fitted and centre-cropped, which puts the ball's centre at (172u, 100u).
 */
@Composable
internal fun GlassLogo(url: String, u: Float) {
    val context = LocalContext.current
    val request = remember(url) {
        ImageRequest.Builder(context)
            .data(url)
            .transformations(GlassGlyphTransformation())
            .allowHardware(false)
            .build()
    }
    Box(modifier = Modifier.offset(x = (122 * u).dp, y = (50 * u).dp).size((100 * u).dp)) {
        // Depth: a darker copy down-right, then the pale glass glyph over it.
        AsyncImage(
            model = request,
            contentDescription = null,
            colorFilter = ColorFilter.tint(Color(0xFF2E7DA3), BlendMode.SrcIn),
            modifier = Modifier.fillMaxSize().offset(x = (1.5 * u).dp, y = (2.5 * u).dp).alpha(0.7f),
        )
        AsyncImage(model = request, contentDescription = null, modifier = Modifier.fillMaxSize())
        // Glass sheen back over the mark so it reads as inside the ball.
        Canvas(modifier = Modifier.fillMaxSize()) {
            drawOval(
                brush = Brush.linearGradient(
                    listOf(Color(0x40FFFFFF), Color.Transparent),
                    Offset(0f, 0f), Offset(size.width * 0.7f, size.height * 0.6f),
                ),
                topLeft = Offset(size.width * 0.08f, size.height * 0.02f),
                size = Size(size.width * 0.62f, size.height * 0.45f),
            )
        }
    }
}

/**
 * Lifts a logo off its opaque tile: every pixel that differs from the tile's
 * border colour becomes the mark, repainted as pale glass. The on-device twin of
 * tools/card-art/gen_cards.py's glyph_mask (without its badge handling).
 */
internal class GlassGlyphTransformation : Transformation {
    override val cacheKey: String = "glass-glyph-v1"

    override suspend fun transform(input: Bitmap, size: coil.size.Size): Bitmap {
        val w = input.width
        val h = input.height
        val src = IntArray(w * h)
        input.getPixels(src, 0, w, 0, 0, w, h)
        val bg = borderColor(src, w, h)
        val bgR = (bg shr 16) and 0xFF
        val bgG = (bg shr 8) and 0xFF
        val bgB = bg and 0xFF
        val out = IntArray(w * h)
        for (y in 0 until h) {
            val t = y / (h - 1f).coerceAtLeast(1f)
            val r = (0xD0 + (0x80 - 0xD0) * t).toInt()
            val g = (0xF0 + (0xC4 - 0xF0) * t).toInt()
            val b = (0xFA + (0xDE - 0xFA) * t).toInt()
            for (x in 0 until w) {
                val p = src[y * w + x]
                val d = (abs(((p shr 16) and 0xFF) - bgR) + abs(((p shr 8) and 0xFF) - bgG) + abs((p and 0xFF) - bgB))
                    .coerceAtMost(255)
                val a = ((d - 45) * 255 / 95).coerceIn(0, 255)
                out[y * w + x] = (a shl 24) or (r shl 16) or (g shl 8) or b
            }
        }
        return Bitmap.createBitmap(out, w, h, Bitmap.Config.ARGB_8888)
    }

    /** Median (by brightness) of pixels sampled around the tile's edge. */
    private fun borderColor(px: IntArray, w: Int, h: Int): Int {
        val samples = ArrayList<Int>()
        for (x in 0 until w step 7) {
            samples += px[x]
            samples += px[(h - 1) * w + x]
        }
        for (y in 0 until h step 7) {
            samples += px[y * w]
            samples += px[y * w + (w - 1)]
        }
        samples.sortBy { ((it shr 16) and 0xFF) + ((it shr 8) and 0xFF) + (it and 0xFF) }
        return samples[samples.size / 2]
    }
}
