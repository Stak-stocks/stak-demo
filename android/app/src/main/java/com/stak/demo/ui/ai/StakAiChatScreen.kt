package com.stak.demo.ui.ai

import android.provider.Settings
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.ime
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowForward
import androidx.compose.material.icons.outlined.ThumbDown
import androidx.compose.material.icons.outlined.ThumbUp
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.ArrowUpward
import androidx.compose.material.icons.rounded.AutoAwesome
import androidx.compose.material.icons.rounded.History
import androidx.compose.material.icons.rounded.ThumbDown
import androidx.compose.material.icons.rounded.ThumbUp
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.material3.minimumInteractiveComponentSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.stak.demo.data.BrandNames
import com.stak.demo.data.StakAiContext
import com.stak.demo.data.StakAiSource
import com.stak.demo.data.StakAiEntry
import com.stak.demo.data.StakAiVia
import com.stak.demo.ui.onboarding.AuthBackCircle
import com.stak.demo.ui.onboarding.figmaUnit
import com.stak.demo.ui.theme.FIGMA_LINE_BOX
import com.stak.demo.ui.theme.Geist
import com.stak.demo.ui.theme.PressDim
import com.stak.demo.ui.theme.Sora
import com.stak.demo.ui.theme.StakColors
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale

private val UserBubble = Color(0xFF1C3A4A)
private val Warn = Color(0xFFE5A54B)

/**
 * STAK AI's chat (product decision 2026-10-01: built in the house style, no frame). Opened from the Home/News header
 * sparkle, a stock page, a live article or the Daily Brief, via [StakAiLauncher]. A fixed "educational, not financial
 * advice" line sits under the input on every visit, so answers don't repeat it.
 */
@Composable
fun StakAiChatScreen(onBack: () -> Unit, onOpenHistory: () -> Unit, vm: StakAiViewModel = hiltViewModel()) {
	val u = figmaUnit()
	var draft by rememberSaveable { mutableStateOf("") }
	val list = rememberLazyListState()
	LaunchedEffect(vm.returnedDraft) {
		vm.consumeReturnedDraft()?.let { if (draft.isBlank()) draft = it }
	}
	// Keep the newest line in view as the conversation grows, while the dots show, and when the keyboard opens.
	var follow by remember { mutableStateOf(true) }
	val keyboardOpen = WindowInsets.ime.getBottom(LocalDensity.current) > 0
	// Asking glides to the question; anything else (words arriving, the finished answer's thumbs and follow-ups, the
	// keyboard opening, a past chat loading) keeps the bottom in view - for someone already there. Where a scroll the
	// person makes comes to rest (within 80dp of the end or not) decides whether they're there.
	val nearEndPx = with(LocalDensity.current) { 80.dp.toPx() }
	LaunchedEffect(list) {
		snapshotFlow { list.isScrollInProgress }.collect { scrolling ->
			if (scrolling) return@collect
			val info = list.layoutInfo
			val end = info.visibleItemsInfo.lastOrNull()
			follow = end == null || (end.index == info.totalItemsCount - 1 && end.offset + end.size - info.viewportEndOffset < nearEndPx)
		}
	}
	val lastLine = vm.messages.lastOrNull()
	// The dots are an item of their own until the first words arrive.
	val dots = vm.sending && lastLine?.streaming != true
	LaunchedEffect(vm.messages.size, vm.sending, keyboardOpen, lastLine?.text?.length) {
		val last = vm.messages.size + (if (dots) 1 else 0) - 1
		if (last < 0) return@LaunchedEffect
		if (vm.sending && lastLine?.fromUser == true) {
			follow = true
			list.animateScrollToItem(last)
		} else if (follow) {
			list.scrollToItem(last, Int.MAX_VALUE)
		}
	}
	val submit = {
		if (draft.isNotBlank() && vm.canAsk) {
			vm.send(draft)
			draft = ""
		}
	}

	Column(modifier = Modifier.fillMaxSize().background(StakColors.Bg).imePadding()) {
		// Header: back, title, history and a fresh chat.
		Box(modifier = Modifier.fillMaxWidth().statusBarsPadding().padding(top = (8 * u).dp, bottom = (6 * u).dp)) {
			AuthBackCircle(onClick = onBack, modifier = Modifier.align(Alignment.CenterStart).padding(start = (20 * u).dp))
			Row(
				verticalAlignment = Alignment.CenterVertically,
				horizontalArrangement = Arrangement.spacedBy((6 * u).dp),
				modifier = Modifier.align(Alignment.Center).semantics(mergeDescendants = true) { heading() },
			) {
				Icon(Icons.Rounded.AutoAwesome, contentDescription = null, tint = StakColors.Teal, modifier = Modifier.size((16 * u).dp))
				Text("STAK AI", style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (17 * u).sp, lineHeight = (22 * u).sp, lineHeightStyle = FIGMA_LINE_BOX), color = Color.White)
			}
			Row(modifier = Modifier.align(Alignment.CenterEnd).padding(end = (12 * u).dp)) {
				CircleButton(Icons.Rounded.History, "Your chats", size = (36 * u).dp, onClick = onOpenHistory)
				CircleButton(Icons.Rounded.Add, "New chat", size = (36 * u).dp, enabled = !vm.sending) { vm.newChat(); draft = "" }
			}
		}
		vm.context?.let { ContextChip(it) }

		LazyColumn(
			state = list,
			verticalArrangement = Arrangement.spacedBy((16 * u).dp),
			modifier = Modifier.weight(1f).fillMaxWidth().padding(horizontal = (20 * u).dp),
			contentPadding = PaddingValues(top = (12 * u).dp, bottom = (16 * u).dp),
		) {
			if (vm.messages.isEmpty() && !vm.loading && !vm.sending && vm.notice != AiNotice.LoadFailed) {
				item { EmptyState(vm.context, enabled = vm.canAsk) { q -> vm.send(q, via = StakAiVia.STARTER) } }
			}
			val lastAnswerKey = vm.messages.lastOrNull { !it.fromUser }?.key
			items(vm.messages, key = { it.key }) { m ->
				if (m.fromUser) {
					UserLine(m, offline = (vm.notice as? AiNotice.Failed)?.offline == true)
				} else {
					val latest = m.key == lastAnswerKey
					AnswerLine(
						m = m,
						latest = latest,
						showFollowUps = latest && vm.canAsk,
						onRate = { v -> vm.rate(m, v) },
						onFollowUp = { q -> vm.send(q, via = StakAiVia.FOLLOWUP) },
					)
				}
			}
			if (vm.loading) item { Text("Loading chat…", style = TextStyle(fontFamily = Geist, fontSize = (13 * u).sp), color = StakColors.Muted) }
			// The dots until the first words arrive; then the answer writes itself out.
			if (dots) item { TypingDots() }
		}

		vm.notice?.let { NoticeCard(it, limit = vm.usage?.limit, onRetry = vm::retry, onRetryOpen = vm::retryOpen, onNewChat = vm::newChat) }

		// Input, questions left, and the fixed disclaimer.
		Column(modifier = Modifier.fillMaxWidth().navigationBarsPadding().padding(horizontal = (20 * u).dp).padding(top = (8 * u).dp, bottom = (6 * u).dp)) {
			val canType = !vm.outOfQuestions && !vm.loading
			Row(
				verticalAlignment = Alignment.CenterVertically,
				modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape((22 * u).dp)).background(StakColors.SurfaceAlt).border((1 * u).dp, StakColors.CardBorder, RoundedCornerShape((22 * u).dp)).padding(start = (16 * u).dp, end = (2 * u).dp),
			) {
				Box(modifier = Modifier.weight(1f).heightIn(min = (32 * u).dp).padding(vertical = (10 * u).dp), contentAlignment = Alignment.CenterStart) {
					if (draft.isEmpty()) {
						Text(
							if (vm.outOfQuestions) "You're out of questions for now" else "Ask about a stock, the news or a term…",
							style = TextStyle(fontFamily = Geist, fontSize = (14 * u).sp), color = StakColors.Muted, maxLines = 1, overflow = TextOverflow.Ellipsis,
						)
					}
					BasicTextField(
						value = draft,
						onValueChange = { if (it.length <= 1000) draft = it },
						enabled = canType,
						textStyle = TextStyle(fontFamily = Geist, fontSize = (14 * u).sp, lineHeight = (20 * u).sp, color = Color.White),
						cursorBrush = SolidColor(StakColors.Teal),
						maxLines = 5,
						keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Sentences, imeAction = ImeAction.Send),
						keyboardActions = KeyboardActions(onSend = { submit() }),
						modifier = Modifier.fillMaxWidth().semantics { contentDescription = "Ask STAK AI" },
					)
				}
				val ready = draft.isNotBlank() && vm.canAsk
				CircleButton(
					Icons.Rounded.ArrowUpward, "Send", size = (36 * u).dp, enabled = ready,
					background = if (ready) StakColors.Teal else StakColors.CardBorder,
					tint = if (ready) StakColors.Bg else StakColors.Muted,
					onClick = submit,
				)
			}
			Row(modifier = Modifier.fillMaxWidth().padding(top = (6 * u).dp), horizontalArrangement = Arrangement.SpaceBetween) {
				Text("Educational, not financial advice.", style = TextStyle(fontFamily = Geist, fontSize = (11 * u).sp), color = StakColors.Muted)
				vm.usage?.let { usage ->
					Text(
						"${usage.remaining} of ${usage.limit} questions left",
						style = TextStyle(fontFamily = Geist, fontSize = (11 * u).sp),
						color = if (usage.remaining <= 1) Warn else StakColors.Muted,
					)
				}
			}
		}
	}
}

/** A round icon button: drawn at [size], touchable at 48dp at least (Material's minimum), announced as a button. */
@Composable
private fun CircleButton(
	icon: ImageVector,
	label: String,
	size: Dp,
	enabled: Boolean = true,
	background: Color = StakColors.Surface,
	tint: Color = Color.White,
	onClick: () -> Unit,
) {
	Box(
		contentAlignment = Alignment.Center,
		modifier = Modifier.minimumInteractiveComponentSize()
			.clickable(enabled = enabled, role = Role.Button, onClickLabel = label, interactionSource = remember { MutableInteractionSource() }, indication = PressDim, onClick = onClick)
			.semantics { contentDescription = label },
	) {
		Box(contentAlignment = Alignment.Center, modifier = Modifier.size(size).background(background, CircleShape)) {
			Icon(icon, contentDescription = null, tint = tint, modifier = Modifier.size(size * 0.5f))
		}
	}
}

/** "Asking about NVIDIA" - what the chat was opened from. */
@Composable
private fun ContextChip(ctx: StakAiContext) {
	val u = figmaUnit()
	val label = when (ctx.type) {
		"stock" -> "Asking about ${BrandNames.byTicker[ctx.ticker.orEmpty()] ?: ctx.ticker}"
		"article" -> "About: ${ctx.headline.orEmpty()}"
		else -> "About today's Daily Brief"
	}
	Row(
		verticalAlignment = Alignment.CenterVertically,
		horizontalArrangement = Arrangement.spacedBy((6 * u).dp),
		modifier = Modifier.padding(horizontal = (20 * u).dp).clip(RoundedCornerShape((14 * u).dp)).background(StakColors.Surface).padding(horizontal = (12 * u).dp, vertical = (6 * u).dp),
	) {
		Box(modifier = Modifier.size((6 * u).dp).background(StakColors.Teal, CircleShape))
		Text(label, style = TextStyle(fontFamily = Geist, fontSize = (12 * u).sp), color = StakColors.Body, maxLines = 1, overflow = TextOverflow.Ellipsis)
	}
}

/** Questions to start with, matched to where the chat was opened from. */
internal fun starterQuestions(ctx: StakAiContext?): List<String> = when (ctx?.type) {
	"stock" -> {
		val t = ctx.ticker.orEmpty()
		val name = BrandNames.byTicker[t] ?: t
		listOf("Why is $t moving today?", "How does $name make money?", "What do $t's numbers say?")
	}
	"article" -> listOf("What does this mean for me?", "Explain this in simple terms", "Which companies does this affect?")
	"brief" -> listOf("Explain today's market simply", "Why does this matter to me?", "What's worth keeping an eye on?")
	else -> listOf("Why is Nvidia moving today?", "What is a P/E ratio?", "How do earnings move a stock?")
}

@Composable
private fun EmptyState(ctx: StakAiContext?, enabled: Boolean, onAsk: (String) -> Unit) {
	val u = figmaUnit()
	Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth().padding(top = (28 * u).dp)) {
		Box(contentAlignment = Alignment.Center, modifier = Modifier.size((56 * u).dp).background(StakColors.Surface, CircleShape)) {
			Icon(Icons.Rounded.AutoAwesome, contentDescription = null, tint = StakColors.Teal, modifier = Modifier.size((26 * u).dp))
		}
		Text("Ask STAK AI", style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (20 * u).sp), color = Color.White, modifier = Modifier.padding(top = (14 * u).dp))
		Text(
			"Plain-English answers about stocks, the news and investing terms.",
			style = TextStyle(fontFamily = Geist, fontSize = (13 * u).sp, lineHeight = (19 * u).sp, lineHeightStyle = FIGMA_LINE_BOX, textAlign = TextAlign.Center),
			color = StakColors.Muted,
			modifier = Modifier.padding(top = (6 * u).dp, start = (12 * u).dp, end = (12 * u).dp),
		)
		Column(verticalArrangement = Arrangement.spacedBy((8 * u).dp), modifier = Modifier.fillMaxWidth().padding(top = (22 * u).dp)) {
			starterQuestions(ctx).forEach { q -> SuggestionRow(q, enabled) { onAsk(q) } }
		}
		Text(
			"You get 5 questions every 6 hours. When STAK AI can't help, or asks you something back, it doesn't count.",
			style = TextStyle(fontFamily = Geist, fontSize = (11 * u).sp, lineHeight = (16 * u).sp, lineHeightStyle = FIGMA_LINE_BOX, textAlign = TextAlign.Center),
			color = StakColors.Muted,
			modifier = Modifier.padding(top = (16 * u).dp, start = (8 * u).dp, end = (8 * u).dp),
		)
	}
}

@Composable
private fun SuggestionRow(text: String, enabled: Boolean, onClick: () -> Unit) {
	val u = figmaUnit()
	Row(
		verticalAlignment = Alignment.CenterVertically,
		modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp).clip(RoundedCornerShape((12 * u).dp)).background(StakColors.Surface).border((1 * u).dp, StakColors.CardBorder, RoundedCornerShape((12 * u).dp))
			.alpha(if (enabled) 1f else 0.5f)
			.clickable(enabled = enabled, role = Role.Button, interactionSource = remember { MutableInteractionSource() }, indication = PressDim, onClick = onClick)
			.padding(horizontal = (14 * u).dp, vertical = (10 * u).dp),
	) {
		Text(text, style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (13 * u).sp), color = Color.White, modifier = Modifier.weight(1f))
		Icon(Icons.AutoMirrored.Rounded.ArrowForward, contentDescription = null, tint = StakColors.Teal, modifier = Modifier.size((16 * u).dp))
	}
}

@Composable
private fun UserLine(m: AiMessage, offline: Boolean) {
	val u = figmaUnit()
	Column(horizontalAlignment = Alignment.End, modifier = Modifier.fillMaxWidth()) {
		Text(
			m.text,
			style = TextStyle(fontFamily = Geist, fontSize = (14 * u).sp, lineHeight = (20 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
			color = Color.White,
			modifier = Modifier.widthIn(max = (290 * u).dp).clip(RoundedCornerShape(topStart = (16 * u).dp, topEnd = (16 * u).dp, bottomStart = (16 * u).dp, bottomEnd = (4 * u).dp))
				.background(UserBubble).alpha(if (m.failed) 0.6f else 1f).padding(horizontal = (14 * u).dp, vertical = (10 * u).dp),
		)
		if (m.failed) Text(if (offline) "Not sent" else "No answer", style = TextStyle(fontFamily = Geist, fontSize = (11 * u).sp), color = Warn, modifier = Modifier.padding(top = (4 * u).dp))
	}
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun AnswerLine(m: AiMessage, latest: Boolean, showFollowUps: Boolean, onRate: (Int) -> Unit, onFollowUp: (String) -> Unit) {
	val u = figmaUnit()
	val uri = LocalUriHandler.current
	Column(
		verticalArrangement = Arrangement.spacedBy((8 * u).dp),
		// The newest answer is announced when it arrives: while it's written it reads only as "STAK AI is answering",
		// so its words are read once, finished, not chunk by chunk.
		modifier = Modifier.fillMaxWidth().then(if (latest) Modifier.semantics { liveRegion = LiveRegionMode.Polite } else Modifier),
	) {
		Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy((6 * u).dp)) {
			Box(contentAlignment = Alignment.Center, modifier = Modifier.size((22 * u).dp).background(StakColors.Surface, CircleShape)) {
				Icon(Icons.Rounded.AutoAwesome, contentDescription = null, tint = StakColors.Teal, modifier = Modifier.size((12 * u).dp))
			}
			Text("STAK AI", style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (12 * u).sp), color = StakColors.Muted)
		}
		if (m.streaming) {
			Column(
				verticalArrangement = Arrangement.spacedBy((8 * u).dp),
				modifier = Modifier.clearAndSetSemantics { contentDescription = "STAK AI is answering" },
			) {
				AiMarkdown(m.text, streaming = true)
				WritingCaret()
			}
		} else {
			Box(Modifier.alpha(if (m.cutOff) 0.6f else 1f)) { AiMarkdown(m.text, streaming = m.cutOff) }
		}
		if (m.cutOff) Text("Cut off. The full answer may be in your chats.", style = TextStyle(fontFamily = Geist, fontSize = (11 * u).sp), color = Warn)
		if (m.kind != "answer") {
			Text("This one didn't count toward your questions.", style = TextStyle(fontFamily = Geist, fontSize = (11 * u).sp), color = StakColors.Muted)
		}
		if (m.sources.isNotEmpty()) Sources(m.sources) { url -> runCatching { uri.openUri(url) } }
		if (m.id != null && m.kind == "answer") {
			Row {
				ThumbButton(if (m.feedback == 1) Icons.Rounded.ThumbUp else Icons.Outlined.ThumbUp, "Helpful", m.feedback == 1) { onRate(1) }
				ThumbButton(if (m.feedback == -1) Icons.Rounded.ThumbDown else Icons.Outlined.ThumbDown, "Not helpful", m.feedback == -1) { onRate(-1) }
			}
		}
		if (showFollowUps && m.followUps.isNotEmpty()) {
			FlowRow(horizontalArrangement = Arrangement.spacedBy((8 * u).dp)) {
				m.followUps.forEach { q ->
					Box(
						contentAlignment = Alignment.Center,
						modifier = Modifier.heightIn(min = 48.dp)
							.clickable(role = Role.Button, interactionSource = remember { MutableInteractionSource() }, indication = PressDim) { onFollowUp(q) },
					) {
						Text(
							q,
							style = TextStyle(fontFamily = Geist, fontSize = (12 * u).sp),
							color = StakColors.Teal,
							modifier = Modifier.clip(RoundedCornerShape((16 * u).dp)).border((1 * u).dp, StakColors.Teal.copy(alpha = 0.45f), RoundedCornerShape((16 * u).dp))
								.padding(horizontal = (12 * u).dp, vertical = (7 * u).dp),
						)
					}
				}
			}
		}
	}
}

@Composable
private fun ThumbButton(icon: ImageVector, label: String, selected: Boolean, onClick: () -> Unit) {
	val u = figmaUnit()
	Box(
		contentAlignment = Alignment.Center,
		modifier = Modifier.minimumInteractiveComponentSize()
			.clickable(role = Role.Button, onClickLabel = label, interactionSource = remember { MutableInteractionSource() }, indication = PressDim, onClick = onClick)
			.semantics {
				contentDescription = label
				this.selected = selected
			},
	) {
		Icon(icon, contentDescription = null, tint = if (selected) StakColors.Teal else StakColors.Muted, modifier = Modifier.size((16 * u).dp))
	}
}

/** "Based on" - the headlines the answer was given, each opening its story. */
@Composable
private fun Sources(sources: List<StakAiSource>, onOpen: (String) -> Unit) {
	val u = figmaUnit()
	Column(modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape((12 * u).dp)).background(StakColors.Surface).padding(horizontal = (12 * u).dp, vertical = (6 * u).dp)) {
		Text("BASED ON", style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.SemiBold, fontSize = (10 * u).sp, letterSpacing = (1 * u).sp), color = StakColors.Muted, modifier = Modifier.padding(vertical = (4 * u).dp))
		sources.forEach { s ->
			val line = remember(s) {
				buildAnnotatedString {
					withStyle(SpanStyle(color = StakColors.Teal, fontWeight = FontWeight.SemiBold)) { append(s.ticker) }
					append("  ")
					append(s.headline)
				}
			}
			val url = s.url
			Box(
				contentAlignment = Alignment.CenterStart,
				modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp)
					.then(if (url != null) Modifier.clickable(role = Role.Button, onClickLabel = "Open story", interactionSource = remember { MutableInteractionSource() }, indication = PressDim) { onOpen(url) } else Modifier),
			) {
				Text(line, style = TextStyle(fontFamily = Geist, fontSize = (12 * u).sp, lineHeight = (17 * u).sp, lineHeightStyle = FIGMA_LINE_BOX), color = StakColors.Body, maxLines = 2, overflow = TextOverflow.Ellipsis)
			}
		}
	}
}

/** Three dots pulsing in turn while the answer is on its way; animated in the draw phase so they don't recompose per frame. */
@Composable
private fun TypingDots() {
	val u = figmaUnit()
	val t = rememberInfiniteTransition(label = "typing")
	Row(horizontalArrangement = Arrangement.spacedBy((5 * u).dp), modifier = Modifier.padding(vertical = (6 * u).dp).semantics { contentDescription = "STAK AI is answering" }) {
		repeat(3) { i ->
			val a = t.animateFloat(0.25f, 1f, infiniteRepeatable(tween(600, delayMillis = i * 150), RepeatMode.Reverse), label = "dot$i")
			Box(modifier = Modifier.size((7 * u).dp).graphicsLayer { alpha = a.value }.background(StakColors.Teal, CircleShape))
		}
	}
}

@Composable
private fun NoticeCard(notice: AiNotice, limit: Int?, onRetry: () -> Unit, onRetryOpen: () -> Unit, onNewChat: () -> Unit) {
	val u = figmaUnit()
	val text = when (notice) {
		is AiNotice.LimitReached -> "You've used your ${limit ?: 5} questions for now. ${nextQuestionText(notice.resetsAt)}"
		is AiNotice.Failed -> if (notice.offline) "You're offline, so that didn't send. It didn't count." else "STAK AI couldn't answer just now. That one didn't count."
		AiNotice.Slow -> "STAK AI is taking longer than usual. Check your chats in a moment before asking again."
		AiNotice.LoadFailed -> "Couldn't open that chat."
	}
	Row(
		verticalAlignment = Alignment.CenterVertically,
		modifier = Modifier.fillMaxWidth().padding(horizontal = (20 * u).dp).clip(RoundedCornerShape((12 * u).dp)).background(StakColors.Surface)
			.semantics(mergeDescendants = true) { liveRegion = LiveRegionMode.Polite }
			.padding(start = (14 * u).dp, end = (4 * u).dp),
	) {
		Text(text, style = TextStyle(fontFamily = Geist, fontSize = (12 * u).sp, lineHeight = (17 * u).sp, lineHeightStyle = FIGMA_LINE_BOX), color = StakColors.Body, modifier = Modifier.weight(1f).padding(vertical = (12 * u).dp))
		when (notice) {
			is AiNotice.Failed -> TextAction("Try again", onRetry)
			AiNotice.LoadFailed -> {
				TextAction("Try again", onRetryOpen)
				TextAction("New chat", onNewChat)
			}
			else -> {}
		}
	}
}

@Composable
private fun TextAction(label: String, onClick: () -> Unit) {
	val u = figmaUnit()
	Box(
		contentAlignment = Alignment.Center,
		modifier = Modifier.minimumInteractiveComponentSize()
			.clickable(role = Role.Button, interactionSource = remember { MutableInteractionSource() }, indication = PressDim, onClick = onClick)
			.padding(horizontal = (10 * u).dp),
	) {
		Text(label, style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.SemiBold, fontSize = (12 * u).sp), color = StakColors.Teal)
	}
}

/** "Your next one is at 3:40 PM." (or "tomorrow at …") from the window's reset time. */
internal fun nextQuestionText(resetsAt: String?): String {
	val at = resetsAt?.let { runCatching { Instant.parse(it).atZone(ZoneId.systemDefault()) }.getOrNull() } ?: return "Check back in a few hours."
	val time = at.format(DateTimeFormatter.ofPattern("h:mm a", Locale.US))
	return if (at.toLocalDate() == LocalDate.now()) "Your next one is at $time." else "Your next one is tomorrow at $time."
}

private val PARAGRAPH_BREAK = Regex("\n\\s*\n")
private fun isBullet(line: String) = line.startsWith("- ") || line.startsWith("* ") || line.startsWith("• ")

/** An answer split into paragraphs and bullet lists. */
internal sealed interface MdBlock {
	data class Paragraph(val text: AnnotatedString) : MdBlock
	data class Bullets(val items: List<AnnotatedString>) : MdBlock
}

/** Bullets are grouped line by line, so "Here's why:\n- a\n- b" keeps its list under its intro. */
internal fun parseMarkdown(text: String): List<MdBlock> {
	val out = mutableListOf<MdBlock>()
	text.split(PARAGRAPH_BREAK).map { it.trim() }.filter { it.isNotEmpty() }.forEach { block ->
		val para = mutableListOf<String>()
		val bullets = mutableListOf<String>()
		fun flushPara() { if (para.isNotEmpty()) out += MdBlock.Paragraph(boldSpans(para.joinToString(" "))); para.clear() }
		fun flushBullets() { if (bullets.isNotEmpty()) out += MdBlock.Bullets(bullets.map { boldSpans(it) }); bullets.clear() }
		block.lines().map { it.trim() }.filter { it.isNotEmpty() }.forEach { line ->
			if (isBullet(line)) { flushPara(); bullets += line.drop(2).trim() } else { flushBullets(); para += line }
		}
		flushPara()
		flushBullets()
	}
	return out
}

/**
 * A streaming answer, minus what would flash and then change: an unclosed "**" (bold only once it closes) and a list
 * marker on a line with nothing after it yet.
 */
internal fun tidyStreaming(text: String): String {
	var t = UNFINISHED_BULLET.replaceFirst(text, "")
	if (BOLD_MARK.findAll(t).count() % 2 == 1) {
		val at = t.lastIndexOf("**")
		t = t.removeRange(at, at + 2)
	}
	// A lone "*" may be the start of the next "**"; a just-closed "**" stays.
	return if (t.endsWith("*") && !t.endsWith("**")) t.dropLast(1) else t
}

// The web's tidyStreaming (StakAiThread.tsx) uses the same patterns; \z is JavaScript's "$" without the m flag.
private val UNFINISHED_BULLET = Regex("\\n[ \\t]*[-*•]?[ \\t]*\\z")
private val BOLD_MARK = Regex("\\*\\*")

/** A soft caret under an answer still being written: pulsing in the draw phase, steady with animations turned off. */
@Composable
private fun WritingCaret() {
	val u = figmaUnit()
	val resolver = LocalContext.current.contentResolver
	val still = remember { Settings.Global.getFloat(resolver, Settings.Global.ANIMATOR_DURATION_SCALE, 1f) == 0f }
	val pulse = rememberInfiniteTransition(label = "caret").animateFloat(
		initialValue = 1f, targetValue = 0.3f, animationSpec = infiniteRepeatable(tween(600), RepeatMode.Reverse), label = "caret",
	)
	Box(
		Modifier.size(width = (8 * u).dp, height = (16 * u).dp).graphicsLayer { alpha = if (still) 1f else pulse.value }
			.background(StakColors.Teal, RoundedCornerShape((2 * u).dp)),
	)
}

/** The answer's light formatting: paragraphs, "- " bullets and **bold** (all the model is asked to use). */
@Composable
internal fun AiMarkdown(text: String, streaming: Boolean = false) {
	val u = figmaUnit()
	val blocks = remember(text, streaming) { parseMarkdown(if (streaming) tidyStreaming(text) else text) }
	val body = TextStyle(fontFamily = Geist, fontSize = (14 * u).sp, lineHeight = (21 * u).sp, lineHeightStyle = FIGMA_LINE_BOX)
	Column(verticalArrangement = Arrangement.spacedBy((8 * u).dp)) {
		blocks.forEach { b ->
			when (b) {
				is MdBlock.Paragraph -> Text(b.text, style = body, color = StakColors.Body)
				is MdBlock.Bullets -> Column(verticalArrangement = Arrangement.spacedBy((4 * u).dp)) {
					b.items.forEach { item ->
						Row {
							Text("•", style = body, color = StakColors.Teal, modifier = Modifier.padding(end = (8 * u).dp))
							Text(item, style = body, color = StakColors.Body)
						}
					}
				}
			}
		}
	}
}

/** "**this**" → bold white; the rest stays as is. */
internal fun boldSpans(line: String): AnnotatedString = buildAnnotatedString {
	var rest = line
	while (true) {
		val start = rest.indexOf("**")
		val end = if (start >= 0) rest.indexOf("**", start + 2) else -1
		if (start < 0 || end < 0) { append(rest); break }
		append(rest.substring(0, start))
		withStyle(SpanStyle(fontWeight = FontWeight.SemiBold, color = Color.White)) { append(rest.substring(start + 2, end)) }
		rest = rest.substring(end + 2)
	}
}

/** The sparkle that opens STAK AI from a screen's header (Home, News), sized and coloured to sit beside its neighbours. */
@Composable
fun AskAiHeaderButton(size: Dp, background: Color, onClick: () -> Unit) {
	Box(
		contentAlignment = Alignment.Center,
		modifier = Modifier.size(size).clip(CircleShape).background(background, CircleShape)
			.clickable(role = Role.Button, onClickLabel = "Ask STAK AI", interactionSource = remember { MutableInteractionSource() }, indication = PressDim, onClick = onClick)
			.semantics { contentDescription = "Ask STAK AI" },
	) {
		Icon(Icons.Rounded.AutoAwesome, contentDescription = null, tint = StakColors.Teal, modifier = Modifier.size(size * 0.5f))
	}
}

/**
 * The way into STAK AI from a page (a live article, a stock, the Daily Brief): a card saying what you can ask, which
 * opens the chat with that page as its context. [context] is only built on tap.
 */
@Composable
fun AskAiCard(title: String, subtitle: String, context: () -> StakAiContext, onOpen: () -> Unit, modifier: Modifier = Modifier) {
	val u = figmaUnit()
	Row(
		verticalAlignment = Alignment.CenterVertically,
		horizontalArrangement = Arrangement.spacedBy((12 * u).dp),
		modifier = modifier.fillMaxWidth().clip(RoundedCornerShape((14 * u).dp)).background(StakColors.Surface).border((1 * u).dp, StakColors.Teal.copy(alpha = 0.35f), RoundedCornerShape((14 * u).dp))
			.clickable(role = Role.Button, interactionSource = remember { MutableInteractionSource() }, indication = PressDim) {
				StakAiLauncher.reset()
				val ctx = context()
				StakAiLauncher.context = ctx
				StakAiLauncher.entry = when (ctx.type) {
					"stock" -> StakAiEntry.STOCK
					"article" -> StakAiEntry.ARTICLE
					else -> StakAiEntry.BRIEF
				}
				onOpen()
			}
			.padding(horizontal = (14 * u).dp, vertical = (12 * u).dp),
	) {
		Box(contentAlignment = Alignment.Center, modifier = Modifier.size((34 * u).dp).background(StakColors.SurfaceAlt, CircleShape)) {
			Icon(Icons.Rounded.AutoAwesome, contentDescription = null, tint = StakColors.Teal, modifier = Modifier.size((17 * u).dp))
		}
		Column(verticalArrangement = Arrangement.spacedBy((2 * u).dp), modifier = Modifier.weight(1f)) {
			Text(title, style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (14 * u).sp), color = Color.White)
			Text(subtitle, style = TextStyle(fontFamily = Geist, fontSize = (12 * u).sp, lineHeight = (16 * u).sp, lineHeightStyle = FIGMA_LINE_BOX), color = StakColors.Muted)
		}
		Icon(Icons.AutoMirrored.Rounded.ArrowForward, contentDescription = null, tint = StakColors.Teal, modifier = Modifier.size((18 * u).dp))
	}
}
