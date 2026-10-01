package com.stak.demo.ui.ai

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.MoreVert
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.stak.demo.data.StakAiConversation
import com.stak.demo.data.StakAiRenameRequest
import com.stak.demo.data.StockApiService
import com.stak.demo.ui.onboarding.figmaUnit
import com.stak.demo.ui.profile.SettingsScaffold
import com.stak.demo.ui.theme.FIGMA_LINE_BOX
import com.stak.demo.ui.theme.Geist
import com.stak.demo.ui.theme.Sora
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import java.time.Duration
import java.time.Instant
import java.time.OffsetDateTime
import javax.inject.Inject

@HiltViewModel
class StakAiHistoryViewModel @Inject constructor(private val api: StockApiService) : ViewModel() {
	var conversations by mutableStateOf<List<StakAiConversation>>(emptyList())
		private set
	var loading by mutableStateOf(true)
		private set
	var failed by mutableStateOf(false)
		private set
	private var nextBefore: String? = null
	val hasMore: Boolean get() = nextBefore != null

	init { load() }

	/** The first page, or (with [more]) the next older one. */
	fun load(more: Boolean = false) {
		loading = true
		failed = false
		viewModelScope.launch {
			runCatching { api.stakAiConversations(if (more) nextBefore else null) }
				.onSuccess { r ->
					conversations = if (more) conversations + r.conversations else r.conversations
					nextBefore = r.nextBefore
				}
				.onFailure { failed = true }
			loading = false
		}
	}

	/** Renamed on screen at once; put back if the save fails. */
	fun rename(c: StakAiConversation, title: String) {
		val t = title.trim().take(80)
		if (t.isEmpty() || t == c.title) return
		replace(c.id) { it.copy(title = t) }
		viewModelScope.launch {
			runCatching { api.stakAiRename(c.id, StakAiRenameRequest(t)) }.onFailure { replace(c.id) { it.copy(title = c.title) } }
		}
	}

	/** Gone from the list at once; back in its place if the delete fails. */
	fun delete(c: StakAiConversation) {
		val before = conversations
		conversations = conversations.filterNot { it.id == c.id }
		viewModelScope.launch {
			runCatching { api.stakAiDelete(c.id) }.onFailure { conversations = before }
		}
	}

	private fun replace(id: String, change: (StakAiConversation) -> StakAiConversation) {
		conversations = conversations.map { if (it.id == id) change(it) else it }
	}
}

/** STAK AI's past chats, newest first: what each was about, its latest answer, and rename / delete. */
@Composable
fun StakAiHistoryScreen(onBack: () -> Unit, onOpen: (String) -> Unit, vm: StakAiHistoryViewModel = hiltViewModel()) {
	val u = figmaUnit()
	var renaming by remember { mutableStateOf<StakAiConversation?>(null) }
	var deleting by remember { mutableStateOf<StakAiConversation?>(null) }

	SettingsScaffold(title = "Your chats", onBack = onBack) {
		LazyColumn(
			verticalArrangement = Arrangement.spacedBy((10 * u).dp),
			modifier = Modifier.fillMaxSize().navigationBarsPadding().padding(horizontal = (20 * u).dp),
			contentPadding = androidx.compose.foundation.layout.PaddingValues(bottom = (26 * u).dp),
		) {
			when {
				vm.conversations.isEmpty() && vm.loading -> item { Text("Loading…", style = TextStyle(fontFamily = Geist, fontSize = (13 * u).sp), color = AiMuted) }
				vm.conversations.isEmpty() && vm.failed -> item { MessageCard("Couldn't load your chats.", "Try again") { vm.load() } }
				vm.conversations.isEmpty() -> item { MessageCard("No chats yet. Ask STAK AI something and it'll show up here.", null) {} }
				else -> {
					items(vm.conversations, key = { it.id }) { c ->
						ChatRow(c, onOpen = { onOpen(c.id) }, onRename = { renaming = c }, onDelete = { deleting = c })
					}
					if (vm.hasMore) item {
						Text(
							if (vm.loading) "Loading…" else "Show older chats",
							style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.SemiBold, fontSize = (13 * u).sp),
							color = AiTeal,
							modifier = Modifier.fillMaxWidth().clickable(enabled = !vm.loading) { vm.load(more = true) }.padding(vertical = (12 * u).dp),
						)
					}
				}
			}
		}
	}

	renaming?.let { c -> RenameDialog(c, onDismiss = { renaming = null }) { vm.rename(c, it); renaming = null } }
	deleting?.let { c ->
		AlertDialog(
			onDismissRequest = { deleting = null },
			containerColor = AiCardRaised,
			title = { Text("Delete this chat?", style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (17 * u).sp), color = Color.White) },
			text = { Text("\"${c.title}\" will be gone for good.", style = TextStyle(fontFamily = Geist, fontSize = (14 * u).sp), color = AiBody) },
			confirmButton = { TextButton(onClick = { vm.delete(c); deleting = null }) { Text("Delete", color = Color(0xFFE5484D)) } },
			dismissButton = { TextButton(onClick = { deleting = null }) { Text("Cancel", color = AiMuted) } },
		)
	}
}

@Composable
private fun ChatRow(c: StakAiConversation, onOpen: () -> Unit, onRename: () -> Unit, onDelete: () -> Unit) {
	val u = figmaUnit()
	var menu by remember { mutableStateOf(false) }
	Row(
		verticalAlignment = Alignment.Top,
		modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape((14 * u).dp)).background(AiCard)
			.clickable(interactionSource = remember { MutableInteractionSource() }, indication = com.stak.demo.ui.theme.PressDim, onClick = onOpen)
			.padding(start = (14 * u).dp, top = (12 * u).dp, bottom = (12 * u).dp),
	) {
		Column(verticalArrangement = Arrangement.spacedBy((3 * u).dp), modifier = Modifier.weight(1f)) {
			Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy((6 * u).dp)) {
				c.contextLabel?.let {
					Text(it, style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (11 * u).sp), color = AiTeal, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f, fill = false))
					Box(modifier = Modifier.size((3 * u).dp).background(AiMuted, CircleShape))
				}
				Text(ago(c.updatedAt), style = TextStyle(fontFamily = Geist, fontSize = (11 * u).sp), color = AiMuted, maxLines = 1)
			}
			Text(c.title, style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (14 * u).sp, lineHeight = (19 * u).sp, lineHeightStyle = FIGMA_LINE_BOX), color = Color.White, maxLines = 2, overflow = TextOverflow.Ellipsis)
			c.preview?.let {
				Text(it.replace("**", "").replace("\n", " "), style = TextStyle(fontFamily = Geist, fontSize = (12 * u).sp, lineHeight = (17 * u).sp, lineHeightStyle = FIGMA_LINE_BOX), color = AiBody, maxLines = 2, overflow = TextOverflow.Ellipsis)
			}
		}
		Box {
			Box(
				contentAlignment = Alignment.Center,
				modifier = Modifier.size((40 * u).dp).clickable(interactionSource = remember { MutableInteractionSource() }, indication = com.stak.demo.ui.theme.PressDim) { menu = true }
					.semantics { contentDescription = "More options for ${c.title}" },
			) {
				Icon(Icons.Rounded.MoreVert, contentDescription = null, tint = AiMuted, modifier = Modifier.size((18 * u).dp))
			}
			DropdownMenu(expanded = menu, onDismissRequest = { menu = false }, containerColor = AiCardRaised) {
				DropdownMenuItem(text = { Text("Rename", color = Color.White) }, onClick = { menu = false; onRename() })
				DropdownMenuItem(text = { Text("Delete", color = Color(0xFFE5484D)) }, onClick = { menu = false; onDelete() })
			}
		}
	}
}

@Composable
private fun MessageCard(text: String, action: String?, onAction: () -> Unit) {
	val u = figmaUnit()
	Column(
		verticalArrangement = Arrangement.spacedBy((8 * u).dp),
		modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape((16 * u).dp)).background(AiCard).padding((16 * u).dp),
	) {
		Text(text, style = TextStyle(fontFamily = Geist, fontSize = (13 * u).sp, lineHeight = (19 * u).sp, lineHeightStyle = FIGMA_LINE_BOX), color = AiBody)
		action?.let { Text(it, style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.SemiBold, fontSize = (13 * u).sp), color = AiTeal, modifier = Modifier.clickable(onClick = onAction)) }
	}
}

@Composable
private fun RenameDialog(c: StakAiConversation, onDismiss: () -> Unit, onSave: (String) -> Unit) {
	var title by remember { mutableStateOf(c.title) }
	AlertDialog(
		onDismissRequest = onDismiss,
		containerColor = AiCardRaised,
		title = { Text("Rename chat", color = Color.White) },
		text = {
			OutlinedTextField(
				value = title,
				onValueChange = { if (it.length <= 80) title = it },
				singleLine = true,
				colors = OutlinedTextFieldDefaults.colors(focusedTextColor = Color.White, unfocusedTextColor = Color.White, focusedBorderColor = AiTeal, unfocusedBorderColor = AiBorder, cursorColor = AiTeal),
			)
		},
		confirmButton = { TextButton(enabled = title.isNotBlank(), onClick = { onSave(title) }) { Text("Save", color = AiTeal) } },
		dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel", color = AiMuted) } },
	)
}

/** "Just now", "12m ago", "3h ago", "2d ago" or the date, from the server's timestamp. */
internal fun ago(iso: String): String {
	val then = runCatching { OffsetDateTime.parse(iso).toInstant() }.getOrNull() ?: runCatching { Instant.parse(iso) }.getOrNull() ?: return ""
	val d = Duration.between(then, Instant.now())
	return when {
		d.toMinutes() < 1 -> "Just now"
		d.toHours() < 1 -> "${d.toMinutes()}m ago"
		d.toDays() < 1 -> "${d.toHours()}h ago"
		d.toDays() < 7 -> "${d.toDays()}d ago"
		else -> then.atZone(java.time.ZoneId.systemDefault()).format(java.time.format.DateTimeFormatter.ofPattern("MMM d"))
	}
}
