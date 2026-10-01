package com.stak.demo.ui.ai

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
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
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
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.stak.demo.data.StakAiContext
import com.stak.demo.data.StakAiSource
import com.stak.demo.ui.onboarding.AuthBackCircle
import com.stak.demo.ui.onboarding.figmaUnit
import com.stak.demo.ui.theme.FIGMA_LINE_BOX
import com.stak.demo.ui.theme.Geist
import com.stak.demo.ui.theme.Sora
import com.stak.demo.ui.theme.StakColors
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter

internal val AiCard = Color(0xFF10182B)
internal val AiCardRaised = Color(0xFF172037)
internal val AiBorder = Color(0xFF243049)
internal val AiTeal = Color(0xFF69B3CA)
internal val AiMuted = Color(0xFF819ABB)
internal val AiBody = Color(0xFFC8D2E0)
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
		vm.returnedDraft?.let { if (draft.isBlank()) draft = it; vm.returnedDraft = null }
	}
	// Keep the newest line in view as the conversation grows (and while the typing dots show).
	LaunchedEffect(vm.messages.size, vm.sending) {
		val last = vm.messages.size + (if (vm.sending) 1 else 0) - 1
		if (last >= 0) list.animateScrollToItem(last)
	}
	val submit = {
		if (draft.isNotBlank() && !vm.sending && !vm.outOfQuestions) {
			vm.send(draft)
			draft = ""
		}
	}

	Column(modifier = Modifier.fillMaxSize().background(StakColors.Bg).imePadding()) {
		// Header: back, title, history and a fresh chat.
		Box(modifier = Modifier.fillMaxWidth().statusBarsPadding().padding(top = (8 * u).dp, bottom = (10 * u).dp)) {
			AuthBackCircle(onClick = onBack, modifier = Modifier.align(Alignment.CenterStart).padding(start = (20 * u).dp))
			Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy((6 * u).dp), modifier = Modifier.align(Alignment.Center)) {
				Icon(Icons.Rounded.AutoAwesome, contentDescription = null, tint = AiTeal, modifier = Modifier.size((16 * u).dp))
				Text("STAK AI", style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (17 * u).sp, lineHeight = (22 * u).sp, lineHeightStyle = FIGMA_LINE_BOX), color = Color.White)
			}
			Row(horizontalArrangement = Arrangement.spacedBy((8 * u).dp), modifier = Modifier.align(Alignment.CenterEnd).padding(end = (20 * u).dp)) {
				HeaderIcon(Icons.Rounded.History, "Your chats", onOpenHistory)
				HeaderIcon(Icons.Rounded.Add, "New chat", { vm.newChat(); draft = "" })
			}
		}
		vm.context?.let { ContextChip(it) }

		LazyColumn(
			state = list,
			verticalArrangement = Arrangement.spacedBy((16 * u).dp),
			modifier = Modifier.weight(1f).fillMaxWidth().padding(horizontal = (20 * u).dp),
			contentPadding = androidx.compose.foundation.layout.PaddingValues(top = (12 * u).dp, bottom = (16 * u).dp),
		) {
			if (vm.messages.isEmpty() && !vm.loading && !vm.sending) {
				item { EmptyState(vm.context, enabled = !vm.outOfQuestions) { q -> vm.send(q) } }
			}
			val lastAnswerKey = vm.messages.lastOrNull { !it.fromUser }?.key
			items(vm.messages, key = { it.key }) { m ->
				if (m.fromUser) UserLine(m) else AnswerLine(
					m = m,
					showFollowUps = m.key == lastAnswerKey && !vm.sending && !vm.outOfQuestions,
					onRate = { v -> vm.rate(m, v) },
					onFollowUp = { q -> vm.send(q) },
				)
			}
			if (vm.sending || vm.loading) item { TypingDots() }
		}

		vm.notice?.let { NoticeCard(it, onRetry = vm::retry) }

		// Input, questions left, and the fixed disclaimer.
		Column(modifier = Modifier.fillMaxWidth().navigationBarsPadding().padding(horizontal = (20 * u).dp).padding(top = (8 * u).dp, bottom = (10 * u).dp)) {
			val canType = !vm.outOfQuestions
			Row(
				verticalAlignment = Alignment.Bottom,
				modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape((22 * u).dp)).background(AiCardRaised).border((1 * u).dp, AiBorder, RoundedCornerShape((22 * u).dp)).padding(start = (16 * u).dp, end = (6 * u).dp, top = (6 * u).dp, bottom = (6 * u).dp),
			) {
				Box(modifier = Modifier.weight(1f).heightIn(min = (32 * u).dp).padding(vertical = (6 * u).dp), contentAlignment = Alignment.CenterStart) {
					if (draft.isEmpty()) {
						Text(
							if (canType) "Ask about a stock, the news or a term…" else "You're out of questions for now",
							style = TextStyle(fontFamily = Geist, fontSize = (14 * u).sp), color = AiMuted, maxLines = 1, overflow = TextOverflow.Ellipsis,
						)
					}
					BasicTextField(
						value = draft,
						onValueChange = { if (it.length <= 1000) draft = it },
						enabled = canType,
						textStyle = TextStyle(fontFamily = Geist, fontSize = (14 * u).sp, lineHeight = (20 * u).sp, color = Color.White),
						cursorBrush = SolidColor(AiTeal),
						maxLines = 5,
						keyboardOptions = KeyboardOptions(imeAction = ImeAction.Send),
						keyboardActions = KeyboardActions(onSend = { submit() }),
						modifier = Modifier.fillMaxWidth().semantics { contentDescription = "Ask STAK AI" },
					)
				}
				val ready = draft.isNotBlank() && !vm.sending && canType
				Box(
					contentAlignment = Alignment.Center,
					modifier = Modifier.size((36 * u).dp).clip(CircleShape).background(if (ready) AiTeal else AiBorder)
						.clickable(enabled = ready, interactionSource = remember { MutableInteractionSource() }, indication = com.stak.demo.ui.theme.PressDim) { submit() }
						.semantics { contentDescription = "Send" },
				) {
					Icon(Icons.Rounded.ArrowUpward, contentDescription = null, tint = if (ready) StakColors.Bg else AiMuted, modifier = Modifier.size((18 * u).dp))
				}
			}
			Row(modifier = Modifier.fillMaxWidth().padding(top = (8 * u).dp), horizontalArrangement = Arrangement.SpaceBetween) {
				Text("Educational, not financial advice.", style = TextStyle(fontFamily = Geist, fontSize = (11 * u).sp), color = AiMuted)
				vm.usage?.let { usage ->
					Text(
						"${usage.remaining} of ${usage.limit} questions left",
						style = TextStyle(fontFamily = Geist, fontSize = (11 * u).sp),
						color = if (usage.remaining <= 1) Warn else AiMuted,
					)
				}
			}
		}
	}
}

@Composable
private fun HeaderIcon(icon: ImageVector, label: String, onClick: () -> Unit) {
	val u = figmaUnit()
	Box(
		contentAlignment = Alignment.Center,
		modifier = Modifier.size((36 * u).dp).clip(CircleShape).background(AiCard)
			.clickable(interactionSource = remember { MutableInteractionSource() }, indication = com.stak.demo.ui.theme.PressDim, onClick = onClick)
			.semantics { contentDescription = label },
	) {
		Icon(icon, contentDescription = null, tint = Color.White, modifier = Modifier.size((18 * u).dp))
	}
}

/** "Asking about NVIDIA" - what the chat was opened from. */
@Composable
private fun ContextChip(ctx: StakAiContext) {
	val u = figmaUnit()
	val label = when (ctx.type) {
		"stock" -> "Asking about ${com.stak.demo.data.BrandNames.byTicker[ctx.ticker.orEmpty()] ?: ctx.ticker}"
		"article" -> "About: ${ctx.headline.orEmpty()}"
		else -> "About today's Daily Brief"
	}
	Row(
		verticalAlignment = Alignment.CenterVertically,
		horizontalArrangement = Arrangement.spacedBy((6 * u).dp),
		modifier = Modifier.padding(horizontal = (20 * u).dp).clip(RoundedCornerShape((14 * u).dp)).background(AiCard).padding(horizontal = (12 * u).dp, vertical = (6 * u).dp),
	) {
		Box(modifier = Modifier.size((6 * u).dp).background(AiTeal, CircleShape))
		Text(label, style = TextStyle(fontFamily = Geist, fontSize = (12 * u).sp), color = AiBody, maxLines = 1, overflow = TextOverflow.Ellipsis)
	}
}

/** Questions to start with, matched to where the chat was opened from. */
internal fun starterQuestions(ctx: StakAiContext?): List<String> = when (ctx?.type) {
	"stock" -> {
		val t = ctx.ticker.orEmpty()
		val name = com.stak.demo.data.BrandNames.byTicker[t] ?: t
		listOf("Why is $t moving today?", "How does $name make money?", "What do $t's numbers say?")
	}
	"article" -> listOf("What does this mean for me?", "Explain this in simple terms", "Which companies does this affect?")
	"brief" -> listOf("Explain today's market simply", "Why does this matter to me?", "What's worth keeping an eye on?")
	else -> listOf("Why is Nvidia moving today?", "What is a P/E ratio?", "How do earnings move a stock?")
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun EmptyState(ctx: StakAiContext?, enabled: Boolean, onAsk: (String) -> Unit) {
	val u = figmaUnit()
	Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth().padding(top = (36 * u).dp)) {
		Box(contentAlignment = Alignment.Center, modifier = Modifier.size((56 * u).dp).background(AiCard, CircleShape)) {
			Icon(Icons.Rounded.AutoAwesome, contentDescription = null, tint = AiTeal, modifier = Modifier.size((26 * u).dp))
		}
		Text("Ask STAK AI", style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (20 * u).sp), color = Color.White, modifier = Modifier.padding(top = (14 * u).dp))
		Text(
			"Plain-English answers about stocks, the news and investing terms.",
			style = TextStyle(fontFamily = Geist, fontSize = (13 * u).sp, lineHeight = (19 * u).sp, lineHeightStyle = FIGMA_LINE_BOX, textAlign = androidx.compose.ui.text.style.TextAlign.Center),
			color = AiMuted,
			modifier = Modifier.padding(top = (6 * u).dp, start = (12 * u).dp, end = (12 * u).dp),
		)
		Column(verticalArrangement = Arrangement.spacedBy((8 * u).dp), modifier = Modifier.fillMaxWidth().padding(top = (24 * u).dp)) {
			starterQuestions(ctx).forEach { q -> SuggestionRow(q, enabled) { onAsk(q) } }
		}
	}
}

@Composable
private fun SuggestionRow(text: String, enabled: Boolean, onClick: () -> Unit) {
	val u = figmaUnit()
	Row(
		verticalAlignment = Alignment.CenterVertically,
		modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape((12 * u).dp)).background(AiCard).border((1 * u).dp, AiBorder, RoundedCornerShape((12 * u).dp))
			.alpha(if (enabled) 1f else 0.5f)
			.clickable(enabled = enabled, interactionSource = remember { MutableInteractionSource() }, indication = com.stak.demo.ui.theme.PressDim, onClick = onClick)
			.padding(horizontal = (14 * u).dp, vertical = (12 * u).dp),
	) {
		Text(text, style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (13 * u).sp), color = Color.White, modifier = Modifier.weight(1f))
		Icon(Icons.AutoMirrored.Rounded.ArrowForward, contentDescription = null, tint = AiTeal, modifier = Modifier.size((16 * u).dp))
	}
}

@Composable
private fun UserLine(m: AiMessage) {
	val u = figmaUnit()
	Column(horizontalAlignment = Alignment.End, modifier = Modifier.fillMaxWidth()) {
		Text(
			m.text,
			style = TextStyle(fontFamily = Geist, fontSize = (14 * u).sp, lineHeight = (20 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
			color = Color.White,
			modifier = Modifier.widthIn(max = (290 * u).dp).clip(RoundedCornerShape(topStart = (16 * u).dp, topEnd = (16 * u).dp, bottomStart = (16 * u).dp, bottomEnd = (4 * u).dp))
				.background(UserBubble).alpha(if (m.failed) 0.6f else 1f).padding(horizontal = (14 * u).dp, vertical = (10 * u).dp),
		)
		if (m.failed) Text("Not sent", style = TextStyle(fontFamily = Geist, fontSize = (11 * u).sp), color = Warn, modifier = Modifier.padding(top = (4 * u).dp))
	}
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun AnswerLine(m: AiMessage, showFollowUps: Boolean, onRate: (Int) -> Unit, onFollowUp: (String) -> Unit) {
	val u = figmaUnit()
	val uri = LocalUriHandler.current
	Column(verticalArrangement = Arrangement.spacedBy((10 * u).dp), modifier = Modifier.fillMaxWidth()) {
		Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy((6 * u).dp)) {
			Box(contentAlignment = Alignment.Center, modifier = Modifier.size((22 * u).dp).background(AiCard, CircleShape)) {
				Icon(Icons.Rounded.AutoAwesome, contentDescription = null, tint = AiTeal, modifier = Modifier.size((12 * u).dp))
			}
			Text("STAK AI", style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (12 * u).sp), color = AiMuted)
		}
		AiMarkdown(m.text)
		if (m.kind != "answer") {
			Text("This one didn't count toward your questions.", style = TextStyle(fontFamily = Geist, fontSize = (11 * u).sp), color = AiMuted)
		}
		if (m.sources.isNotEmpty()) Sources(m.sources) { url -> runCatching { uri.openUri(url) } }
		if (m.id != null && m.kind == "answer") {
			Row(horizontalArrangement = Arrangement.spacedBy((4 * u).dp)) {
				ThumbButton(if (m.feedback == 1) Icons.Rounded.ThumbUp else Icons.Outlined.ThumbUp, "Helpful", m.feedback == 1) { onRate(1) }
				ThumbButton(if (m.feedback == -1) Icons.Rounded.ThumbDown else Icons.Outlined.ThumbDown, "Not helpful", m.feedback == -1) { onRate(-1) }
			}
		}
		if (showFollowUps && m.followUps.isNotEmpty()) {
			FlowRow(horizontalArrangement = Arrangement.spacedBy((8 * u).dp), verticalArrangement = Arrangement.spacedBy((8 * u).dp)) {
				m.followUps.forEach { q ->
					Text(
						q,
						style = TextStyle(fontFamily = Geist, fontSize = (12 * u).sp),
						color = AiTeal,
						modifier = Modifier.clip(RoundedCornerShape((16 * u).dp)).border((1 * u).dp, AiTeal.copy(alpha = 0.45f), RoundedCornerShape((16 * u).dp))
							.clickable(interactionSource = remember { MutableInteractionSource() }, indication = com.stak.demo.ui.theme.PressDim) { onFollowUp(q) }
							.padding(horizontal = (12 * u).dp, vertical = (7 * u).dp),
					)
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
		modifier = Modifier.size((30 * u).dp).clip(CircleShape)
			.clickable(interactionSource = remember { MutableInteractionSource() }, indication = com.stak.demo.ui.theme.PressDim, onClick = onClick)
			.semantics { contentDescription = if (selected) "$label, selected" else label },
	) {
		Icon(icon, contentDescription = null, tint = if (selected) AiTeal else AiMuted, modifier = Modifier.size((16 * u).dp))
	}
}

/** "Based on" - the headlines the answer was given, each opening its story. */
@Composable
private fun Sources(sources: List<StakAiSource>, onOpen: (String) -> Unit) {
	val u = figmaUnit()
	Column(
		verticalArrangement = Arrangement.spacedBy((6 * u).dp),
		modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape((12 * u).dp)).background(AiCard).padding((12 * u).dp),
	) {
		Text("BASED ON", style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.SemiBold, fontSize = (10 * u).sp, letterSpacing = (1 * u).sp), color = AiMuted)
		sources.forEach { s ->
			val url = s.url
			Text(
				buildAnnotatedString {
					withStyle(SpanStyle(color = AiTeal, fontWeight = FontWeight.SemiBold)) { append(s.ticker) }
					append("  ")
					append(s.headline)
				},
				style = TextStyle(fontFamily = Geist, fontSize = (12 * u).sp, lineHeight = (17 * u).sp, lineHeightStyle = FIGMA_LINE_BOX),
				color = AiBody,
				maxLines = 2,
				overflow = TextOverflow.Ellipsis,
				modifier = if (url != null) Modifier.clickable(interactionSource = remember { MutableInteractionSource() }, indication = com.stak.demo.ui.theme.PressDim) { onOpen(url) } else Modifier,
			)
		}
	}
}

/** Three dots pulsing in turn while the answer is on its way. */
@Composable
private fun TypingDots() {
	val u = figmaUnit()
	val t = rememberInfiniteTransition(label = "typing")
	Row(horizontalArrangement = Arrangement.spacedBy((5 * u).dp), modifier = Modifier.padding(vertical = (6 * u).dp).semantics { contentDescription = "STAK AI is typing" }) {
		repeat(3) { i ->
			val a by t.animateFloat(0.25f, 1f, infiniteRepeatable(tween(600, delayMillis = i * 150), RepeatMode.Reverse), label = "dot$i")
			Box(modifier = Modifier.size((7 * u).dp).alpha(a).background(AiTeal, CircleShape))
		}
	}
}

@Composable
private fun NoticeCard(notice: AiNotice, onRetry: () -> Unit) {
	val u = figmaUnit()
	val (text, action) = when (notice) {
		is AiNotice.LimitReached -> "You've used your questions for now. ${nextQuestionText(notice.resetsAt)}" to null
		is AiNotice.Failed -> (if (notice.offline) "You're offline, so that didn't send. It didn't count." else "STAK AI couldn't answer just now. That one didn't count.") to "Try again"
		AiNotice.LoadFailed -> "Couldn't open that chat. Check your connection and try again." to null
	}
	Row(
		verticalAlignment = Alignment.CenterVertically,
		modifier = Modifier.fillMaxWidth().padding(horizontal = (20 * u).dp).clip(RoundedCornerShape((12 * u).dp)).background(AiCard).padding(horizontal = (14 * u).dp, vertical = (10 * u).dp),
	) {
		Text(text, style = TextStyle(fontFamily = Geist, fontSize = (12 * u).sp, lineHeight = (17 * u).sp, lineHeightStyle = FIGMA_LINE_BOX), color = AiBody, modifier = Modifier.weight(1f))
		if (action != null) {
			Spacer(modifier = Modifier.size((10 * u).dp))
			Text(
				action,
				style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.SemiBold, fontSize = (12 * u).sp),
				color = AiTeal,
				modifier = Modifier.clickable(interactionSource = remember { MutableInteractionSource() }, indication = com.stak.demo.ui.theme.PressDim, onClick = onRetry).padding((4 * u).dp),
			)
		}
	}
}

/** "Your next one is at 3:40 PM." (or "tomorrow at …") from the window's reset time. */
internal fun nextQuestionText(resetsAt: String?): String {
	val at = resetsAt?.let { runCatching { Instant.parse(it).atZone(ZoneId.systemDefault()) }.getOrNull() } ?: return "Check back in a few hours."
	val time = at.format(DateTimeFormatter.ofPattern("h:mm a"))
	return if (at.toLocalDate() == LocalDate.now()) "Your next one is at $time." else "Your next one is tomorrow at $time."
}

/**
 * The answer's light formatting: paragraphs, "- " bullets and **bold** (all the model is asked to use). Anything
 * else prints as plain text.
 */
@Composable
internal fun AiMarkdown(text: String) {
	val u = figmaUnit()
	val body = TextStyle(fontFamily = Geist, fontSize = (14 * u).sp, lineHeight = (21 * u).sp, lineHeightStyle = FIGMA_LINE_BOX)
	Column(verticalArrangement = Arrangement.spacedBy((8 * u).dp)) {
		text.split(Regex("\n\\s*\n")).map { it.trim() }.filter { it.isNotEmpty() }.forEach { block ->
			val lines = block.lines()
			if (lines.all { it.trimStart().startsWith("- ") || it.trimStart().startsWith("* ") || it.trimStart().startsWith("• ") }) {
				Column(verticalArrangement = Arrangement.spacedBy((4 * u).dp)) {
					lines.forEach { line ->
						Row {
							Text("•", style = body, color = AiTeal, modifier = Modifier.padding(end = (8 * u).dp))
							Text(boldSpans(line.trimStart().drop(2).trim()), style = body, color = AiBody)
						}
					}
				}
			} else {
				Text(boldSpans(lines.joinToString(" ") { it.trim() }), style = body, color = AiBody)
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
fun AskAiHeaderButton(size: androidx.compose.ui.unit.Dp, background: Color, onClick: () -> Unit) {
	Box(
		contentAlignment = Alignment.Center,
		modifier = Modifier.size(size).background(background, CircleShape).clip(CircleShape)
			.clickable(interactionSource = remember { MutableInteractionSource() }, indication = com.stak.demo.ui.theme.PressDim, onClick = onClick)
			.semantics { contentDescription = "Ask STAK AI" },
	) {
		Icon(Icons.Rounded.AutoAwesome, contentDescription = null, tint = AiTeal, modifier = Modifier.size(size * 0.5f))
	}
}

/**
 * The way into STAK AI from a page (a live article, a stock, the Daily Brief): a card saying what you can ask, which
 * opens the chat with that page as its context. [question] asks it straight away.
 */
@Composable
fun AskAiCard(title: String, subtitle: String, context: StakAiContext, onOpen: () -> Unit, modifier: Modifier = Modifier, question: String? = null) {
	val u = figmaUnit()
	Row(
		verticalAlignment = Alignment.CenterVertically,
		horizontalArrangement = Arrangement.spacedBy((12 * u).dp),
		modifier = modifier.fillMaxWidth().clip(RoundedCornerShape((14 * u).dp)).background(AiCard).border((1 * u).dp, AiTeal.copy(alpha = 0.35f), RoundedCornerShape((14 * u).dp))
			.clickable(interactionSource = remember { MutableInteractionSource() }, indication = com.stak.demo.ui.theme.PressDim) {
				StakAiLauncher.reset()
				StakAiLauncher.context = context
				StakAiLauncher.question = question
				onOpen()
			}
			.padding(horizontal = (14 * u).dp, vertical = (12 * u).dp),
	) {
		Box(contentAlignment = Alignment.Center, modifier = Modifier.size((34 * u).dp).background(AiCardRaised, CircleShape)) {
			Icon(Icons.Rounded.AutoAwesome, contentDescription = null, tint = AiTeal, modifier = Modifier.size((17 * u).dp))
		}
		Column(verticalArrangement = Arrangement.spacedBy((2 * u).dp), modifier = Modifier.weight(1f)) {
			Text(title, style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (14 * u).sp), color = Color.White)
			Text(subtitle, style = TextStyle(fontFamily = Geist, fontSize = (12 * u).sp, lineHeight = (16 * u).sp, lineHeightStyle = FIGMA_LINE_BOX), color = AiMuted)
		}
		Icon(Icons.AutoMirrored.Rounded.ArrowForward, contentDescription = null, tint = AiTeal, modifier = Modifier.size((18 * u).dp))
	}
}
