package com.stak.demo.ui.news

import android.content.Intent
import com.stak.demo.ui.theme.FIGMA_LINE_BOX
import com.stak.demo.ui.theme.fractionalSpacedBy
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
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
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import com.stak.demo.R
import com.stak.demo.data.BatchQuote
import com.stak.demo.data.MyStakHoldings
import com.stak.demo.data.NewsArticleDto
import com.stak.demo.data.StockMetrics
import com.stak.demo.data.StockRepository
import com.stak.demo.ui.onboarding.AuthBackCircle
import com.stak.demo.ui.onboarding.figmaUnit
import com.stak.demo.ui.theme.Geist
import com.stak.demo.ui.theme.Sora
import com.stak.demo.ui.theme.StakColors
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import javax.inject.Inject

/** Mailbox: the For You article tapped most recently, read by LiveNewsDetailScreen. */
object LiveNewsHolder {
    var current: NewsArticleDto? = null
}

@HiltViewModel
class LiveNewsDetailViewModel @Inject constructor(
    private val repository: StockRepository,
) : ViewModel() {
    private val _quote = MutableStateFlow<BatchQuote?>(null)
    val quote: StateFlow<BatchQuote?> = _quote

    private val _metrics = MutableStateFlow<StockMetrics?>(null)
    val metrics: StateFlow<StockMetrics?> = _metrics

    init {
        val ticker = LiveNewsHolder.current?.ticker.orEmpty()
        if (ticker.isNotBlank()) {
            viewModelScope.launch {
                runCatching { repository.batchQuotes(listOf(ticker)) }
                    .onSuccess { _quote.value = it.quotes[ticker] }
            }
            viewModelScope.launch {
                runCatching { repository.getStock(ticker) }
                    .onSuccess { _metrics.value = it.metrics }
            }
        }
    }
}

private val LiveCtaGradient = Brush.verticalGradient(
    0.0889f to Color(0xFFA6E4F7),
    0.3919f to Color(0xFF5DA8BF),
    0.7255f to Color(0xFF3C98B4),
    1f to Color(0xFF3C98B4),
)
private val LiveCtaBorder = Brush.verticalGradient(
    0f to Color(0xA1659EAD),
    1f to Color(0x6E16363F),
)

@Composable
fun LiveNewsDetailScreen(
    onBack: () -> Unit,
    onOpenLiveArticle: (NewsArticleDto) -> Unit = {},
    viewModel: LiveNewsDetailViewModel = hiltViewModel(),
) {
    val u = figmaUnit()
    val article = LiveNewsHolder.current ?: run { onBack(); return }
    val quote by viewModel.quote.collectAsStateWithLifecycle()
    val metrics by viewModel.metrics.collectAsStateWithLifecycle()
    val uriHandler = LocalUriHandler.current
    val context = LocalContext.current
    var saved by rememberSaveable { mutableStateOf(MyStakHoldings.tickers.contains(article.ticker)) }
    val stakFullNotice = com.stak.demo.ui.components.rememberStakFullNoticeState()

    // READ NEXT: the 2 articles that follow the current one in feed order (wraps if at end)
    val readNext = remember(article.url) {
        val feed = DailyBriefHolder.news.filter { it.headline.isNotBlank() }
        val idx = feed.indexOfFirst { it.url == article.url }
        if (idx < 0 || feed.size <= 1) emptyList()
        else {
            val start = idx + 1
            (start until start + 2).mapNotNull { i -> feed.getOrNull(i % feed.size) }
                .filter { it.url != article.url }
        }
    }

    Box(modifier = Modifier.fillMaxSize().background(StakColors.Bg)) {
        Column(modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState())) {

            // ── Hero image with overlaid nav ──────────────────────────────────────
            Box(modifier = Modifier.fillMaxWidth().height((240 * u).dp)) {
                if (article.image.isNotBlank()) {
                    coil.compose.AsyncImage(
                        model = article.image,
                        contentDescription = null,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.fillMaxSize(),
                    )
                } else {
                    Box(modifier = Modifier.fillMaxSize().background(Color(0xFF131926)))
                }
                // Top gradient scrim: makes nav buttons readable
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height((100 * u).dp)
                        .align(Alignment.TopCenter)
                        .background(
                            Brush.verticalGradient(
                                0f to Color(0xCC000000),
                                1f to Color(0x00000000),
                            )
                        ),
                )
                // Bottom gradient scrim: blends image into background
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height((80 * u).dp)
                        .align(Alignment.BottomCenter)
                        .background(
                            Brush.verticalGradient(
                                0f to Color(0x00000000),
                                1f to StakColors.Bg,
                            )
                        ),
                )
                // Nav buttons row (overlaid on image)
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier
                        .fillMaxWidth()
                        .statusBarsPadding()
                        .padding(start = (16 * u).dp, end = (18 * u).dp, top = (10 * u).dp)
                        .align(Alignment.TopStart),
                ) {
                    AuthBackCircle(onClick = onBack)
                    Spacer(modifier = Modifier.weight(1f))
                    // Share button
                    Box(
                        contentAlignment = Alignment.Center,
                        modifier = Modifier
                            .size((40 * u).dp)
                            .background(Color(0x80192238), CircleShape)
                            .clickable(
                                interactionSource = remember { MutableInteractionSource() },
                                indication = com.stak.demo.ui.theme.PressDim,
                            ) {
                                val intent = Intent(Intent.ACTION_SEND).apply {
                                    type = "text/plain"
                                    putExtra(Intent.EXTRA_TEXT, article.url)
                                }
                                context.startActivity(Intent.createChooser(intent, "Share"))
                            },
                    ) {
                        Image(
                            painter = painterResource(R.drawable.ic_news_share),
                            contentDescription = "Share",
                            modifier = Modifier.size((20 * u).dp),
                        )
                    }
                }
                // Category chip — overlaid bottom-left of image
                val tag = articleTypeTag(article)
                Box(
                    modifier = Modifier
                        .align(Alignment.BottomStart)
                        .padding(start = (16 * u).dp, bottom = (14 * u).dp),
                ) {
                    LiveArticleTag(text = tag)
                }
            }

            // ── Article content ───────────────────────────────────────────────────
            Column(
                verticalArrangement = fractionalSpacedBy((16 * u).dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .navigationBarsPadding()
                    .padding(horizontal = (20 * u).dp)
                    .padding(bottom = (32 * u).dp),
            ) {
                // Headline
                Text(
                    text = article.headline,
                    style = TextStyle(
                        fontFamily = Sora,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = (20 * u).sp,
                        lineHeight = (30 * u).sp,
                        lineHeightStyle = FIGMA_LINE_BOX,
                    ),
                    color = Color.White,
                )
                // Summary subtitle - only when it says more than the headline above it.
                val subtitle = com.stak.demo.data.NewsText.summaryBeyondHeadline(article.headline, article.summary)
                if (subtitle != null) {
                    Text(
                        text = subtitle,
                        style = TextStyle(
                            fontFamily = Geist,
                            fontWeight = FontWeight.Normal,
                            fontSize = (14 * u).sp,
                            lineHeight = (22 * u).sp,
                            lineHeightStyle = FIGMA_LINE_BOX,
                        ),
                        color = News.Muted,
                    )
                }
                // Byline
                LiveByline(source = article.source, datetime = article.datetime)

                // Add to STAK button
                if (article.ticker.isNotBlank() && !saved) {
                    LiveAddToStakButton(onClick = {
                        // add() refuses at capacity; marking it saved regardless showed a
                        // stock as kept that neither the Stak nor the server holds.
                        if (MyStakHoldings.add(article.ticker)) saved = true else stakFullNotice.show()
                    })
                    if (stakFullNotice.visible) {
                        Text(
                            text = com.stak.demo.ui.components.STAK_FULL_MESSAGE,
                            style = TextStyle(fontFamily = Geist, fontSize = (11 * u).sp),
                            color = News.Muted,
                        )
                    }
                }

                // Stock card
                if (article.ticker.isNotBlank()) {
                    LiveStockCard(ticker = article.ticker, saved = saved, quote = quote, u = u)
                }

                LiveDivider()

                // The gist
                val bullets = parseGistBullets(article.whyItMatters)
                if (bullets.isNotEmpty()) {
                    LiveGistCard(bullets = bullets)
                }

                // Body text with blockquote pullout
                if (article.explanation.isNotBlank()) {
                    val (before, pullquote, after) = splitWithPullquote(article.explanation)
                    if (before.isNotBlank()) {
                        Text(
                            text = before,
                            style = TextStyle(
                                fontFamily = Geist,
                                fontWeight = FontWeight.Normal,
                                fontSize = (14 * u).sp,
                                lineHeight = (23 * u).sp,
                                lineHeightStyle = FIGMA_LINE_BOX,
                            ),
                            color = News.Body,
                        )
                    }
                    if (pullquote.isNotBlank()) {
                        LiveBlockquote(text = pullquote, u = u)
                    }
                    if (after.isNotBlank()) {
                        Text(
                            text = after,
                            style = TextStyle(
                                fontFamily = Geist,
                                fontWeight = FontWeight.Normal,
                                fontSize = (14 * u).sp,
                                lineHeight = (23 * u).sp,
                                lineHeightStyle = FIGMA_LINE_BOX,
                            ),
                            color = News.Body,
                        )
                    }
                }

                // Source link
                if (article.url.isNotBlank()) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy((6 * u).dp),
                        modifier = Modifier
                            .clip(RoundedCornerShape((6 * u).dp))
                            .clickable(
                                interactionSource = remember { MutableInteractionSource() },
                                indication = com.stak.demo.ui.theme.PressDim,
                            ) { uriHandler.openUri(article.url) }
                            .padding(vertical = (4 * u).dp),
                    ) {
                        Text(
                            text = "Source",
                            style = TextStyle(
                                fontFamily = Geist,
                                fontWeight = FontWeight.Medium,
                                fontSize = (13 * u).sp,
                                lineHeight = (18 * u).sp,
                            ),
                            color = News.Muted,
                        )
                        Image(
                            painter = painterResource(R.drawable.ic_arrow_right_small),
                            contentDescription = null,
                            modifier = Modifier.size((14 * u).dp),
                            colorFilter = ColorFilter.tint(News.Muted),
                        )
                        Text(
                            text = article.source,
                            style = TextStyle(
                                fontFamily = Geist,
                                fontWeight = FontWeight.Medium,
                                fontSize = (13 * u).sp,
                                lineHeight = (18 * u).sp,
                            ),
                            color = News.Teal,
                        )
                    }
                }

                // Key stats (when ticker + any data present)
                val hasQuote = quote != null
                val hasPe = metrics?.peRatio != null
                val hasCap = metrics?.marketCap != null
                if (article.ticker.isNotBlank() && (hasQuote || hasPe || hasCap)) {
                    LiveDivider()
                    LiveKeyStats(ticker = article.ticker, quote = quote, metrics = metrics, u = u)
                }

                // Ticker + sentiment tags
                val sentimentTag = when (article.sentiment.lowercase()) {
                    "positive" -> "Bullish signal"
                    "negative" -> "Bearish signal"
                    else -> null
                }
                val isCompany = article.ticker.isNotBlank()
                if (isCompany || sentimentTag != null) {
                    Row(horizontalArrangement = Arrangement.spacedBy((8 * u).dp)) {
                        if (isCompany) LiveArticleTag(text = article.ticker)
                        if (sentimentTag != null) LiveArticleTag(text = sentimentTag)
                    }
                }

                // READ NEXT
                if (readNext.isNotEmpty()) {
                    LiveDivider()
                    Text(
                        text = "READ NEXT",
                        style = TextStyle(
                            fontFamily = Geist,
                            fontWeight = FontWeight.SemiBold,
                            fontSize = (11 * u).sp,
                            lineHeight = (14 * u).sp,
                            letterSpacing = (0.8 * u).sp,
                        ),
                        color = News.Muted,
                    )
                    readNext.forEach { next ->
                        LiveReadNextRow(article = next, u = u, onOpen = {
                            onOpenLiveArticle(next)
                        })
                    }
                }
            }
        }
    }

}

// ── Sub-composables ────────────────────────────────────────────────────────────

@Composable
private fun LiveByline(source: String, datetime: Long) {
    val u = figmaUnit()
    val date = remember(datetime) {
        if (datetime > 0L) SimpleDateFormat("MMM d", Locale.US).format(Date(datetime * 1000L)) else ""
    }
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy((8 * u).dp),
        modifier = Modifier.padding(vertical = (2 * u).dp),
    ) {
        Box(
            contentAlignment = Alignment.Center,
            modifier = Modifier.size((24 * u).dp).background(News.ChipBg, CircleShape),
        ) {
            Text(
                text = source.take(1),
                style = TextStyle(
                    fontFamily = Sora,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = (10 * u).sp,
                    lineHeight = (13 * u).sp,
                    lineHeightStyle = FIGMA_LINE_BOX,
                ),
                color = Color(0xFF9EADC7),
            )
        }
        Text(
            text = source + if (date.isNotBlank()) " · $date" else "",
            style = TextStyle(
                fontFamily = Geist,
                fontWeight = FontWeight.Medium,
                fontSize = (12 * u).sp,
                lineHeight = (16 * u).sp,
                lineHeightStyle = FIGMA_LINE_BOX,
            ),
            color = Color.White,
        )
    }
}

@Composable
private fun LiveAddToStakButton(onClick: () -> Unit) {
    val u = figmaUnit()
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy((8 * u).dp, Alignment.CenterHorizontally),
        modifier = Modifier
            .size((150 * u).dp, (52 * u).dp)
            .background(LiveCtaGradient, RoundedCornerShape((6 * u).dp))
            .border((0.36 * u).dp, LiveCtaBorder, RoundedCornerShape((6 * u).dp))
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = com.stak.demo.ui.theme.PressDim,
                onClick = onClick,
            ),
    ) {
        Text(
            text = "Add to STAK",
            style = TextStyle(
                fontFamily = Geist,
                fontWeight = FontWeight.Medium,
                fontSize = (14 * u).sp,
                lineHeight = (20.69 * u).sp,
                lineHeightStyle = FIGMA_LINE_BOX,
            ),
            color = Color.White,
        )
        Image(
            painter = painterResource(R.drawable.ic_plus_small),
            contentDescription = null,
            modifier = Modifier.size((14 * u).dp),
        )
    }
}

@Composable
private fun LiveDivider() {
    val u = figmaUnit()
    Box(modifier = Modifier.fillMaxWidth().height((1 * u).dp).background(News.Divider))
}

@Composable
private fun LiveStockCard(ticker: String, saved: Boolean, quote: BatchQuote?, u: Float) {
    val price = if (quote != null && quote.price > 0) "$${"%.2f".format(quote.price)}" else "--"
    val pct = if (quote != null) "${if (quote.changePercent >= 0) "+" else ""}${"%.2f".format(quote.changePercent)}% today" else ""
    val isUp = (quote?.changePercent ?: 0.0) >= 0
    Column(
        verticalArrangement = Arrangement.spacedBy((13 * u).dp),
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape((16 * u).dp))
            .background(News.CardBg)
            .padding(start = (16 * u).dp, end = (16 * u).dp, top = (16 * u).dp, bottom = (14 * u).dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier.size((44 * u).dp).background(News.ChipBg, CircleShape),
            ) {
                Text(
                    text = ticker.take(1),
                    style = TextStyle(
                        fontFamily = Sora,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = (18 * u).sp,
                        lineHeight = (23 * u).sp,
                        lineHeightStyle = FIGMA_LINE_BOX,
                    ),
                    color = Color(0xFF9EADC7),
                )
            }
            Spacer(modifier = Modifier.width((12 * u).dp))
            Column(verticalArrangement = Arrangement.spacedBy((3 * u).dp), modifier = Modifier.weight(1f)) {
                Text(
                    text = ticker,
                    style = TextStyle(
                        fontFamily = Sora,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = (15 * u).sp,
                        lineHeight = (19 * u).sp,
                        lineHeightStyle = FIGMA_LINE_BOX,
                    ),
                    color = Color.White,
                )
                Text(
                    text = ticker,
                    style = TextStyle(
                        fontFamily = Geist,
                        fontWeight = FontWeight.Normal,
                        fontSize = (12 * u).sp,
                        lineHeight = (16 * u).sp,
                        lineHeightStyle = FIGMA_LINE_BOX,
                    ),
                    color = News.Muted,
                )
            }
        }
        Row(verticalAlignment = Alignment.Bottom, modifier = Modifier.fillMaxWidth()) {
            Column(verticalArrangement = Arrangement.spacedBy((3 * u).dp)) {
                Text(
                    text = price,
                    style = TextStyle(
                        fontFamily = Sora,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = (26 * u).sp,
                        lineHeight = (33 * u).sp,
                        lineHeightStyle = FIGMA_LINE_BOX,
                    ),
                    color = Color.White,
                )
                if (pct.isNotBlank()) {
                    Text(
                        text = pct,
                        style = TextStyle(
                            fontFamily = Geist,
                            fontWeight = FontWeight.Medium,
                            fontSize = (13 * u).sp,
                            lineHeight = (17 * u).sp,
                            lineHeightStyle = FIGMA_LINE_BOX,
                        ),
                        color = if (isUp) News.Green else Color(0xFFFF5A6A),
                    )
                }
            }
            Spacer(modifier = Modifier.weight(1f))
            if (quote != null) {
                Image(
                    painter = painterResource(if (isUp) R.drawable.news_sparkline else R.drawable.news_sparkline_down),
                    contentDescription = null,
                    modifier = Modifier.size((110 * u).dp, (40 * u).dp),
                )
            }
        }
    }
}

@Composable
private fun LiveGistCard(bullets: List<String>) {
    val u = figmaUnit()
    Column(
        verticalArrangement = Arrangement.spacedBy((12 * u).dp),
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape((14 * u).dp))
            .background(News.CardBg)
            .padding((16 * u).dp),
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy((8 * u).dp),
        ) {
            Image(
                painter = painterResource(R.drawable.ic_gist_sparkle),
                contentDescription = null,
                modifier = Modifier.size((18 * u).dp),
            )
            Text(
                text = "The gist",
                style = TextStyle(
                    fontFamily = Sora,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = (14 * u).sp,
                    lineHeight = (18 * u).sp,
                    lineHeightStyle = FIGMA_LINE_BOX,
                ),
                color = Color.White,
            )
        }
        bullets.forEach { bullet ->
            Row(
                horizontalArrangement = Arrangement.spacedBy((10 * u).dp),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Image(
                    painter = painterResource(R.drawable.ic_gist_check),
                    contentDescription = null,
                    modifier = Modifier.size((16 * u).dp),
                )
                Text(
                    text = bullet,
                    style = TextStyle(
                        fontFamily = Geist,
                        fontWeight = FontWeight.Normal,
                        fontSize = (13 * u).sp,
                        lineHeight = (19 * u).sp,
                        lineHeightStyle = FIGMA_LINE_BOX,
                    ),
                    color = News.Body,
                    modifier = Modifier.weight(1f),
                )
            }
        }
    }
}

@Composable
private fun LiveBlockquote(text: String, u: Float) {
    Row(
        horizontalArrangement = Arrangement.spacedBy((12 * u).dp),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Box(
            modifier = Modifier
                .width((3 * u).dp)
                .height((56 * u).dp)
                .clip(RoundedCornerShape((2 * u).dp))
                .background(News.Teal),
        )
        Text(
            text = "“$text”",
            style = TextStyle(
                fontFamily = Geist,
                fontWeight = FontWeight.Normal,
                fontStyle = FontStyle.Italic,
                fontSize = (15 * u).sp,
                lineHeight = (24 * u).sp,
                lineHeightStyle = FIGMA_LINE_BOX,
            ),
            color = Color.White,
            modifier = Modifier.weight(1f),
        )
    }
}

@Composable
private fun LiveKeyStats(ticker: String, quote: BatchQuote?, metrics: StockMetrics?, u: Float) {
    Column(
        verticalArrangement = Arrangement.spacedBy((4 * u).dp),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
            modifier = Modifier.fillMaxWidth(),
        ) {
            Text(
                text = "Key stats",
                style = TextStyle(
                    fontFamily = Geist,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = (11 * u).sp,
                    lineHeight = (14 * u).sp,
                    letterSpacing = (0.8 * u).sp,
                ),
                color = News.Muted,
            )
            Text(
                text = ticker,
                style = TextStyle(
                    fontFamily = Geist,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = (11 * u).sp,
                    lineHeight = (14 * u).sp,
                    letterSpacing = (0.6 * u).sp,
                ),
                color = News.Teal,
            )
        }
        Spacer(modifier = Modifier.height((4 * u).dp))
        Row(modifier = Modifier.fillMaxWidth()) {
            val marketCap = metrics?.marketCap
            val pe = metrics?.peRatio
            val changePct = quote?.changePercent
            val changeAbs = quote?.change

            StatCell(
                label = "Market cap",
                value = marketCap ?: "--",
                modifier = Modifier.weight(1f),
                u = u,
            )
            StatCell(
                label = "P/E ratio",
                value = if (pe != null) "${"%.1f".format(pe)}" else "--",
                modifier = Modifier.weight(1f),
                u = u,
            )
        }
        Row(modifier = Modifier.fillMaxWidth()) {
            val changePct = quote?.changePercent
            val changeAbs = quote?.change
            StatCell(
                label = "Day change",
                value = if (changeAbs != null) "${if (changeAbs >= 0) "+" else ""}$${"%.2f".format(changeAbs)}" else "--",
                modifier = Modifier.weight(1f),
                u = u,
            )
            StatCell(
                label = "Day change %",
                value = if (changePct != null) "${if (changePct >= 0) "+" else ""}${"%.2f".format(changePct)}%" else "--",
                modifier = Modifier.weight(1f),
                u = u,
            )
        }
    }
}

@Composable
private fun StatCell(label: String, value: String, modifier: Modifier = Modifier, u: Float) {
    Column(
        verticalArrangement = Arrangement.spacedBy((3 * u).dp),
        modifier = modifier.padding(vertical = (8 * u).dp),
    ) {
        Text(
            text = label,
            style = TextStyle(
                fontFamily = Geist,
                fontWeight = FontWeight.Normal,
                fontSize = (11 * u).sp,
                lineHeight = (14 * u).sp,
                lineHeightStyle = FIGMA_LINE_BOX,
            ),
            color = News.Faint,
        )
        Text(
            text = value,
            style = TextStyle(
                fontFamily = Geist,
                fontWeight = FontWeight.Medium,
                fontSize = (14 * u).sp,
                lineHeight = (18 * u).sp,
                lineHeightStyle = FIGMA_LINE_BOX,
            ),
            color = Color.White,
        )
    }
}

@Composable
private fun LiveReadNextRow(article: NewsArticleDto, u: Float, onOpen: () -> Unit) {
    val figU = figmaUnit()
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy((12 * figU).dp),
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape((12 * figU).dp))
            .background(News.CardBg)
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = com.stak.demo.ui.theme.PressDim,
                onClick = onOpen,
            )
            .padding((12 * figU).dp),
    ) {
        // Thumbnail
        if (article.image.isNotBlank()) {
            coil.compose.AsyncImage(
                model = article.image,
                contentDescription = null,
                contentScale = ContentScale.Crop,
                modifier = Modifier
                    .size((72 * figU).dp, (54 * figU).dp)
                    .clip(RoundedCornerShape((8 * figU).dp)),
            )
        } else {
            Box(
                modifier = Modifier
                    .size((72 * figU).dp, (54 * figU).dp)
                    .clip(RoundedCornerShape((8 * figU).dp))
                    .background(News.ChipBg),
            )
        }
        Column(
            verticalArrangement = Arrangement.spacedBy((6 * figU).dp),
            modifier = Modifier.weight(1f),
        ) {
            Text(
                text = article.headline,
                style = TextStyle(
                    fontFamily = Geist,
                    fontWeight = FontWeight.Medium,
                    fontSize = (13 * figU).sp,
                    lineHeight = (19 * figU).sp,
                    lineHeightStyle = FIGMA_LINE_BOX,
                ),
                color = Color.White,
                maxLines = 2,
            )
            Text(
                text = article.source,
                style = TextStyle(
                    fontFamily = Geist,
                    fontWeight = FontWeight.Normal,
                    fontSize = (11 * figU).sp,
                    lineHeight = (14 * figU).sp,
                ),
                color = News.Muted,
            )
        }
    }
}

@Composable
private fun LiveArticleTag(text: String) {
    val u = figmaUnit()
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape((12 * u).dp))
            .background(Color(0xCC1A2333))
            .border((0.5 * u).dp, Color(0x40FFFFFF), RoundedCornerShape((12 * u).dp))
            .padding(horizontal = (11 * u).dp, vertical = (5 * u).dp),
    ) {
        Text(
            text = text,
            style = TextStyle(
                fontFamily = Geist,
                fontWeight = FontWeight.Medium,
                fontSize = (11 * u).sp,
                lineHeight = (14 * u).sp,
                lineHeightStyle = FIGMA_LINE_BOX,
            ),
            color = Color.White,
        )
    }
}

// ── Utilities ──────────────────────────────────────────────────────────────────

private fun articleTypeTag(article: NewsArticleDto): String = when (article.type.lowercase()) {
    "company" -> if (article.ticker.isNotBlank()) "${article.ticker} · Stock" else "Stock"
    "sector" -> "Sector"
    "macro" -> "Markets"
    else -> "News"
}

/**
 * Splits explanation into (before, pullquote, after).
 * Picks sentence 2 or 3 as the pullquote if it's 40–130 chars.
 */
private fun splitWithPullquote(text: String): Triple<String, String, String> {
    val sentences = text.split(Regex("(?<=[.!?])\\s+")).filter { it.isNotBlank() }
    if (sentences.size < 3) return Triple(text, "", "")
    // Prefer sentence index 2 or 3 for the pullquote
    val candidateIndices = listOf(2, 1, 3).filter { it < sentences.size }
    val pickIdx = candidateIndices.firstOrNull { i ->
        sentences[i].length in 40..130
    } ?: return Triple(text, "", "")

    val before = sentences.subList(0, pickIdx).joinToString(" ")
    val quote = sentences[pickIdx].trimEnd('.', '!', '?')
    val after = sentences.subList(pickIdx + 1, sentences.size).joinToString(" ")
    return Triple(before, quote, after)
}

/** Splits AI-generated whyItMatters text into up to 3 gist bullet strings. */
private fun parseGistBullets(text: String): List<String> {
    if (text.isBlank()) return emptyList()
    val byNewline = text.split("\n")
        .map { it.trim().trimStart('•', '-', '*', '·').trim() }
        .filter { it.length > 10 }
    if (byNewline.size >= 2) return byNewline.take(3)
    return text.split(". ")
        .map { it.trim() }
        .filter { it.length > 10 }
        .take(3)
}

