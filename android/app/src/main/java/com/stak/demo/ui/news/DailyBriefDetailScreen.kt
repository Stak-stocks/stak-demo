package com.stak.demo.ui.news

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.stak.demo.R
import com.stak.demo.data.DailyBriefResponse
import com.stak.demo.data.MyStakHoldings
import com.stak.demo.data.NewsArticleDto
import com.stak.demo.data.WatchItem
import com.stak.demo.data.WhatHappenedItem
import com.stak.demo.ui.onboarding.AuthBackCircle
import com.stak.demo.ui.onboarding.figmaUnit
import com.stak.demo.ui.theme.FIGMA_LINE_BOX
import com.stak.demo.ui.theme.Geist
import com.stak.demo.ui.theme.Sora
import com.stak.demo.ui.theme.StakColors
import com.stak.demo.ui.theme.fractionalSpacedBy

/** Holds the daily brief and live news; reactive so Home screen updates automatically. */
object DailyBriefHolder {
    var current: DailyBriefResponse? by mutableStateOf(null)
    var news: List<NewsArticleDto> by mutableStateOf(emptyList())
    /** The market news request failed; nothing more is coming this session. */
    var newsFailed: Boolean by mutableStateOf(false)
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun DailyBriefDetailScreen(
    onBack: () -> Unit,
    onOpenLiveArticle: (NewsArticleDto) -> Unit,
) {
    val u = figmaUnit()
    val brief = DailyBriefHolder.current ?: run { onBack(); return }
    // Do NOT use the live news feed as the header — those articles are unrelated to the brief.
    // The brief's own moodExplanation is the headline shown on the card, so match it here.

    Box(modifier = Modifier.fillMaxSize().background(StakColors.Bg)) {
        Column(modifier = Modifier.fillMaxSize()) {
            // ── Top bar ──────────────────────────────────────────────────────
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier
                    .fillMaxWidth()
                    .background(StakColors.Bg)
                    .statusBarsPadding()
                    .padding(start = (16 * u).dp, end = (18 * u).dp, top = (10 * u).dp, bottom = (10 * u).dp),
            ) {
                AuthBackCircle(onClick = onBack)
            }

            // ── Scrollable content ────────────────────────────────────────────
            Column(
                verticalArrangement = fractionalSpacedBy((14 * u).dp),
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState())
                    .padding(horizontal = (20 * u).dp)
                    .navigationBarsPadding()
                    .padding(top = (6 * u).dp, bottom = (36 * u).dp),
            ) {
                // Article header
                BriefArticleHeader(brief = brief, u = u)

                // The gist
                if (brief.plainEnglish.isNotBlank()) {
                    BriefSectionCard(u = u) {
                        BriefSectionHeader(icon = { DocIcon(u) }, label = "The gist", u = u)
                        Text(
                            text = brief.plainEnglish,
                            style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (13 * u).sp, lineHeight = (20 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
                            color = News.Body,
                        )
                    }
                }

                // What actually happened — use backend items when available, else derive from moodExplanation
                val whatHappenedItems = brief.whatHappened.ifEmpty {
                    parseMoodExplanationToItems(brief.moodExplanation)
                }
                if (whatHappenedItems.isNotEmpty()) {
                    BriefWhatHappenedCard(items = whatHappenedItems, u = u)
                }

                // Why this matters to your STAK
                if (brief.personalizedImpact.isNotBlank()) {
                    BriefWhyMattersCard(text = brief.personalizedImpact, u = u)
                }

                // What to watch next — use backend items when available, else mood-based defaults
                val watchItems = brief.watchItems.ifEmpty { defaultWatchItems(brief.mood) }
                if (watchItems.isNotEmpty()) {
                    BriefWatchNextCard(items = watchItems, u = u)
                }

                // Need context? (AI-suggested question)
                if (brief.contextQuestion.isNotBlank()) {
                    BriefContextCard(question = brief.contextQuestion, u = u)
                }
            }
        }
    }
}

// ── Article header ─────────────────────────────────────────────────────────────

@Composable
private fun BriefArticleHeader(brief: DailyBriefResponse, u: Float) {
    Column(verticalArrangement = Arrangement.spacedBy((10 * u).dp)) {
        Text(
            text = "TODAY'S BRIEF",
            style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.SemiBold, fontSize = (10 * u).sp, letterSpacing = (1.1 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
            color = News.Teal,
        )
        if (brief.moodExplanation.isNotBlank()) {
            Text(
                text = brief.moodExplanation,
                style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (20 * u).sp, lineHeight = (27 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
                color = Color.White,
            )
        }
        // "STAK AI · Friday's Brief" — mirrors what the card shows
        val dayPart = brief.dayLabel.let { if (it == "Today's") "Today's Brief" else "$it Brief" }
        Text(
            text = "STAK AI · $dayPart",
            style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (12 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
            color = News.Muted,
        )
    }
}

// ── What actually happened ─────────────────────────────────────────────────────

@Composable
private fun BriefWhatHappenedCard(items: List<WhatHappenedItem>, u: Float) {
    BriefSectionCard(u = u) {
        BriefSectionHeader(icon = { BarChartIcon(u) }, label = "What actually happened", u = u)
        Column(verticalArrangement = Arrangement.spacedBy((12 * u).dp)) {
            items.take(3).forEachIndexed { idx, item ->
                Row(
                    verticalAlignment = Alignment.Top,
                    horizontalArrangement = Arrangement.spacedBy((12 * u).dp),
                ) {
                    Box(
                        contentAlignment = Alignment.Center,
                        modifier = Modifier
                            .size((26 * u).dp)
                            .clip(CircleShape)
                            .background(News.Teal.copy(alpha = 0.15f)),
                    ) {
                        Text(
                            text = "${idx + 1}",
                            style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Bold, fontSize = (12 * u).sp),
                            color = News.Teal,
                        )
                    }
                    Column(verticalArrangement = Arrangement.spacedBy((3 * u).dp)) {
                        Text(
                            text = item.title,
                            style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (13 * u).sp, lineHeight = (18 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
                            color = Color.White,
                        )
                        Text(
                            text = item.body,
                            style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (12 * u).sp, lineHeight = (18 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
                            color = News.Body,
                        )
                    }
                }
            }
        }
    }
}

// ── Why this matters ───────────────────────────────────────────────────────────

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun BriefWhyMattersCard(text: String, u: Float) {
    val tickers = remember { MyStakHoldings.tickers.take(5).toList() }
    BriefSectionCard(u = u) {
        BriefSectionHeader(icon = { StarIcon(u) }, label = "Why this matters to your STAK", u = u)
        Text(
            text = text,
            style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (13 * u).sp, lineHeight = (20 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
            color = News.Body,
        )
        if (tickers.isNotEmpty()) {
            FlowRow(
                horizontalArrangement = Arrangement.spacedBy((8 * u).dp),
                verticalArrangement = Arrangement.spacedBy((8 * u).dp),
                modifier = Modifier.padding(top = (2 * u).dp),
            ) {
                // One colour for every chip: a different one per ticker, picked only by
                // its position in the list, looked like it meant something - performance,
                // category - when it was really just decoration (user, 2026-09-18).
                tickers.forEach { ticker ->
                    val chipColor = News.Teal
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape((20 * u).dp))
                            .background(chipColor.copy(alpha = 0.12f))
                            .border((0.5).dp, chipColor.copy(alpha = 0.35f), RoundedCornerShape((20 * u).dp))
                            .padding(horizontal = (11 * u).dp, vertical = (6 * u).dp),
                    ) {
                        Text(
                            text = ticker,
                            style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.SemiBold, fontSize = (12 * u).sp),
                            color = chipColor,
                        )
                    }
                }
            }
        }
    }
}

// ── What to watch next ─────────────────────────────────────────────────────────

@Composable
private fun BriefWatchNextCard(items: List<WatchItem>, u: Float) {
    BriefSectionCard(u = u) {
        BriefSectionHeader(icon = { EyeIcon(u) }, label = "What to watch next", u = u)
        Row(
            horizontalArrangement = Arrangement.spacedBy((8 * u).dp),
            modifier = Modifier.fillMaxWidth(),
        ) {
            items.take(3).forEach { item ->
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy((5 * u).dp),
                    modifier = Modifier.weight(1f),
                ) {
                    Box(
                        contentAlignment = Alignment.Center,
                        modifier = Modifier
                            .size((36 * u).dp)
                            .clip(RoundedCornerShape((10 * u).dp))
                            .background(Color(0xFF1A2235)),
                    ) {
                        Text(
                            text = item.icon,
                            style = TextStyle(fontSize = (16 * u).sp),
                        )
                    }
                    Text(
                        text = item.label,
                        style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (11 * u).sp, lineHeight = (15 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
                        color = Color.White,
                        textAlign = TextAlign.Center,
                    )
                    Text(
                        text = item.body,
                        style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (10 * u).sp, lineHeight = (14 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
                        color = News.Muted,
                        textAlign = TextAlign.Center,
                    )
                }
            }
        }
    }
}

// ── Need context? (AI) ─────────────────────────────────────────────────────────

@Composable
private fun BriefContextCard(question: String, u: Float) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy((12 * u).dp),
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape((16 * u).dp))
            .background(News.CardBg)
            .padding((16 * u).dp),
    ) {
        Box(
            contentAlignment = Alignment.Center,
            modifier = Modifier
                .size((40 * u).dp)
                .clip(RoundedCornerShape((11 * u).dp))
                .background(News.Teal.copy(alpha = 0.13f)),
        ) {
            Image(
                painter = painterResource(R.drawable.ic_stak_logo_mark),
                contentDescription = null,
                modifier = Modifier.size((22 * u).dp),
                colorFilter = ColorFilter.tint(News.Teal),
            )
        }
        Column(
            verticalArrangement = Arrangement.spacedBy((3 * u).dp),
            modifier = Modifier.weight(1f),
        ) {
            Text(
                text = "Need context?",
                style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (13 * u).sp, lineHeight = (17 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
                color = Color.White,
            )
            Text(
                text = question,
                style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Normal, fontSize = (12 * u).sp, lineHeight = (17 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
                color = News.Muted,
            )
        }
        Image(
            painter = painterResource(R.drawable.ic_arrow_right_small),
            contentDescription = null,
            modifier = Modifier.size((16 * u).dp),
            colorFilter = ColorFilter.tint(News.Muted),
        )
    }
}

// ── Shared card shell ──────────────────────────────────────────────────────────

@Composable
private fun BriefSectionCard(u: Float, content: @Composable () -> Unit) {
    Column(
        verticalArrangement = Arrangement.spacedBy((12 * u).dp),
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape((16 * u).dp))
            .background(News.CardBg)
            .padding((18 * u).dp),
    ) {
        content()
    }
}

@Composable
private fun BriefSectionHeader(icon: @Composable () -> Unit, label: String, u: Float) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy((9 * u).dp),
    ) {
        icon()
        Text(
            text = label,
            style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (14 * u).sp, lineHeight = (18 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
            color = Color.White,
        )
    }
}

// ── Section header icons ───────────────────────────────────────────────────────

@Composable
private fun IconBox(u: Float, content: @Composable () -> Unit) {
    Box(
        contentAlignment = Alignment.Center,
        modifier = Modifier
            .size((28 * u).dp)
            .clip(RoundedCornerShape((8 * u).dp))
            .background(Color(0xFF1A2235)),
    ) {
        content()
    }
}

/** Document icon: 3 horizontal lines. */
@Composable
private fun DocIcon(u: Float) {
    IconBox(u) {
        Canvas(modifier = Modifier.size((14 * u).dp, (12 * u).dp)) {
            val lineH = size.height * 0.14f
            val fullW = size.width
            for (i in 0..2) {
                val y = i * (size.height / 2.5f)
                val w = if (i == 2) fullW * 0.6f else fullW
                drawRoundRect(
                    color = Color(0xFF8B9AB8),
                    topLeft = Offset(0f, y),
                    size = Size(w, lineH),
                    cornerRadius = CornerRadius(2f),
                )
            }
        }
    }
}

/** Bar chart icon: 3 ascending bars. */
@Composable
private fun BarChartIcon(u: Float) {
    IconBox(u) {
        Canvas(modifier = Modifier.size((14 * u).dp, (12 * u).dp)) {
            val barW = size.width * 0.24f
            val gap = size.width * 0.12f
            val heights = listOf(0.45f, 0.7f, 1.0f)
            heights.forEachIndexed { i, h ->
                val x = i * (barW + gap)
                val barH = size.height * h
                drawRoundRect(
                    color = Color(0xFF8B9AB8),
                    topLeft = Offset(x, size.height - barH),
                    size = Size(barW, barH),
                    cornerRadius = CornerRadius(2f),
                )
            }
        }
    }
}

/** Star icon drawn with a path. */
@Composable
private fun StarIcon(u: Float) {
    IconBox(u) {
        Canvas(modifier = Modifier.size((13 * u).dp)) {
            val cx = size.width / 2f
            val cy = size.height / 2f
            val outerR = size.width / 2f
            val innerR = outerR * 0.42f
            val points = 5
            val path = Path()
            for (i in 0 until points * 2) {
                val angle = Math.PI / points * i - Math.PI / 2
                val r = if (i % 2 == 0) outerR else innerR
                val x = cx + (r * kotlin.math.cos(angle)).toFloat()
                val y = cy + (r * kotlin.math.sin(angle)).toFloat()
                if (i == 0) path.moveTo(x, y) else path.lineTo(x, y)
            }
            path.close()
            drawPath(path, color = Color(0xFF8B9AB8))
        }
    }
}

/** Eye icon using the existing drawable. */
@Composable
private fun EyeIcon(u: Float) {
    IconBox(u) {
        Image(
            painter = painterResource(R.drawable.ic_risk_eye),
            contentDescription = null,
            modifier = Modifier.size((15 * u).dp),
            colorFilter = ColorFilter.tint(Color(0xFF8B9AB8)),
        )
    }
}

// ── Utilities ──────────────────────────────────────────────────────────────────

/** Split moodExplanation into up to 3 WhatHappenedItems when backend hasn't returned real ones. */
private fun parseMoodExplanationToItems(moodExplanation: String): List<WhatHappenedItem> {
    if (moodExplanation.isBlank()) return emptyList()
    val sentences = moodExplanation.split(Regex("(?<=[.!?])\\s+")).filter { it.isNotBlank() }
    return when {
        sentences.size >= 3 -> sentences.take(3).map { WhatHappenedItem(title = "", body = it.trim()) }
        sentences.size == 2 -> listOf(
            WhatHappenedItem(title = "", body = sentences[0].trim()),
            WhatHappenedItem(title = "", body = sentences[1].trim()),
        )
        else -> listOf(WhatHappenedItem(title = "", body = moodExplanation.trim()))
    }
}

/** Return default watch items based on mood when the backend hasn't returned real ones. */
private fun defaultWatchItems(mood: String): List<WatchItem> = when (mood.lowercase()) {
    "bullish", "risk-on" -> listOf(
        WatchItem("📈", "Index breakouts", "Watch SPY and QQQ for sustained moves above resistance."),
        WatchItem("💰", "Growth names", "High-beta growth stocks tend to lead in risk-on conditions."),
        WatchItem("🔔", "Fed speakers", "Any hawkish pivot could cool the rally quickly."),
    )
    "bearish", "risk-off" -> listOf(
        WatchItem("🛡️", "Defensive plays", "Utilities and consumer staples may outperform."),
        WatchItem("📉", "Support levels", "Key technical supports on SPY and QQQ to monitor."),
        WatchItem("💵", "Dollar strength", "Risk-off flows often boost USD and Treasury bonds."),
    )
    "volatile" -> listOf(
        WatchItem("⚡", "VIX moves", "Elevated VIX signals uncertainty — watch for spikes above 20."),
        WatchItem("📊", "Earnings reactions", "Volatile tape amplifies post-earnings moves."),
        WatchItem("🔄", "Sector rotation", "Money rotating between sectors — follow the volume."),
    )
    "cautious" -> listOf(
        WatchItem("👀", "Economic data", "Upcoming macro data could set market direction."),
        WatchItem("🏦", "Bank commentary", "Listen for guidance shifts from major financial institutions."),
        WatchItem("📰", "Headline risk", "Geopolitical or policy news can move markets fast."),
    )
    else -> listOf(
        WatchItem("📊", "Market breadth", "Watch how many stocks are advancing vs declining."),
        WatchItem("🔍", "Sector leaders", "Identify which sectors are setting the pace today."),
        WatchItem("📅", "Upcoming catalysts", "Earnings reports and macro events on the calendar."),
    )
}

private fun briefAgeLabel(datetime: Long): String {
    val age = System.currentTimeMillis() / 1000 - datetime
    return when {
        age < 3600 -> "${age / 60}m"
        age < 86400 -> "${age / 3600}h"
        else -> "${age / 86400}d"
    }
}
