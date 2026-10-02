import { memo, useState } from "react";
import { MoreVertical } from "lucide-react";
import { DISC, cu } from "@/components/discover/discoverTheme";
import { DESK, deskFocus } from "@/components/desktop/deskKit";
import { PRESS, focusRing } from "@/components/phone/phone";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { StakAiConversation } from "@/lib/api";
import { ago, type useStakAiHistory } from "./useStakAiHistory";

/** Dark surfaces for the Radix menu and dialogs (their defaults follow the light theme). */
const POPOVER = "border-0 text-white shadow-xl";
const POPOVER_STYLE = { background: DESK.panelRaised, border: `1px solid ${DESK.border}` };
const DIALOG_STYLE = { background: DISC.surfaceAlt, border: `1px solid ${DISC.cardBorder}` };
const TAP = 44;

/**
 * STAK AI's past chats: what each was about, its latest answer and when, with rename and delete behind a ⋯ menu
 * (Radix: Escape, outside clicks, arrow keys and focus return come with it). [activeId] marks the open one. Memoised:
 * the desktop page re-renders with every streamed word, the list needn't.
 */
export const StakAiHistoryList = memo(function StakAiHistoryList({ history, onOpen, variant, activeId, disabled = false }: {
	history: ReturnType<typeof useStakAiHistory>;
	onOpen: (id: string) => void;
	variant: "phone" | "desktop";
	activeId?: string | null;
	/** While an answer is on its way, the list doesn't switch chats. */
	disabled?: boolean;
}) {
	const s = (n: number) => (variant === "phone" ? cu(n) : `${n}px`);
	const focus = variant === "phone" ? PRESS : deskFocus;
	const ring = variant === "phone" ? focusRing : {};
	const card = variant === "phone" ? DISC.cardDark : DESK.panel;
	const body = variant === "phone" ? DISC.body : DESK.body;
	const [renaming, setRenaming] = useState<StakAiConversation | null>(null);
	const [deleting, setDeleting] = useState<StakAiConversation | null>(null);

	if (history.conversations.length === 0) {
		const text = history.loading ? "Loading…" : history.failed ? "Couldn't load your chats." : "No chats yet. Ask STAK AI something and it'll show up here.";
		return (
			<div style={{ borderRadius: s(14), background: card, padding: s(16) }}>
				<p style={{ fontSize: s(13), lineHeight: s(19), color: body }}>{text}</p>
				{history.failed && <button type="button" onClick={history.reload} className={`mt-2 rounded font-semibold ${focus}`} style={{ minHeight: TAP, fontSize: s(13), color: DISC.teal, ...ring }}>Try again</button>}
			</div>
		);
	}

	return (
		<>
			<ul className="flex flex-col" style={{ gap: s(variant === "phone" ? 10 : 6) }}>
				{history.conversations.map((c) => {
					const active = c.id === activeId;
					return (
						<li key={c.id} className="flex items-start" style={{ borderRadius: s(14), background: active ? DESK.panelRaised : card, boxShadow: active ? `inset 2px 0 0 ${DESK.cyan}` : undefined }}>
							<button
								type="button"
								onClick={() => onOpen(c.id)}
								disabled={disabled}
								aria-current={active ? "true" : undefined}
								className={`flex min-w-0 flex-1 flex-col text-left disabled:cursor-wait ${focus}`}
								style={{ gap: s(3), padding: `${s(12)} 0 ${s(12)} ${s(14)}`, borderRadius: s(14), ...ring }}
							>
								<span className="flex w-full items-center" style={{ gap: s(6), fontSize: s(11) }}>
									{c.context_label && <span className="truncate font-medium" style={{ color: DISC.teal }}>{c.context_label}</span>}
									{c.context_label && <span aria-hidden="true" style={{ color: DISC.muted }}>·</span>}
									<span className="shrink-0" style={{ color: DISC.muted }}>{ago(c.updated_at)}</span>
								</span>
								<span className="line-clamp-2 font-medium text-white" style={{ fontSize: s(14), lineHeight: s(19) }}>{c.title}</span>
								{c.preview && <span className="line-clamp-2" style={{ fontSize: s(12), lineHeight: s(17), color: body }}>{c.preview.replace(/\*\*/g, "").replace(/\n/g, " ")}</span>}
							</button>
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<button type="button" aria-label={`More options for ${c.title}`} className={`grid shrink-0 place-items-center rounded-full ${focus}`} style={{ width: TAP, height: TAP, color: DISC.muted, ...ring }}>
										<MoreVertical className="h-[18px] w-[18px]" aria-hidden="true" />
									</button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end" className={POPOVER} style={POPOVER_STYLE}>
									<DropdownMenuItem className="min-h-[40px] text-[13px] text-white focus:bg-white/[0.06] focus:text-white" onSelect={() => setRenaming(c)}>Rename</DropdownMenuItem>
									<DropdownMenuItem className="min-h-[40px] text-[13px] focus:bg-white/[0.06]" style={{ color: DISC.dangerText }} onSelect={() => setDeleting(c)}>Delete</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</li>
					);
				})}
			</ul>
			{history.hasMore && (
				<button type="button" disabled={history.loading} onClick={history.loadMore} className={`w-full rounded font-semibold ${focus}`} style={{ minHeight: TAP + 4, fontSize: s(13), color: DISC.teal, ...ring }}>
					{history.loading ? "Loading…" : "Show older chats"}
				</button>
			)}

			{/* Keyed by chat, so the box starts from that chat's current name each time. */}
			<RenameDialog key={renaming?.id ?? "none"} c={renaming} onClose={() => setRenaming(null)} onSave={(c, t) => history.rename(c, t)} />

			<AlertDialog open={deleting != null} onOpenChange={(open) => { if (!open) setDeleting(null); }}>
				<AlertDialogContent className="max-w-[360px] text-white" style={DIALOG_STYLE}>
					<AlertDialogTitle className="text-[17px]">Delete this chat?</AlertDialogTitle>
					<AlertDialogDescription className="text-[14px]" style={{ color: DISC.body }}>“{deleting?.title}” will be gone for good.</AlertDialogDescription>
					<AlertDialogFooter>
						<AlertDialogCancel className="min-h-[44px] border-0 bg-transparent text-[14px] hover:bg-white/[0.06]" style={{ color: DISC.muted }}>Cancel</AlertDialogCancel>
						<AlertDialogAction className="min-h-[44px] bg-transparent text-[14px] font-semibold hover:bg-white/[0.06]" style={{ color: DISC.dangerText }} onClick={() => { if (deleting) history.remove(deleting); }}>Delete</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
});

function RenameDialog({ c, onClose, onSave }: { c: StakAiConversation | null; onClose: () => void; onSave: (c: StakAiConversation, title: string) => void }) {
	const [title, setTitle] = useState(c?.title ?? "");
	return (
		<Dialog open={c != null} onOpenChange={(open) => { if (!open) onClose(); }}>
			<DialogContent showCloseButton={false} className="max-w-[360px] text-white" style={DIALOG_STYLE}>
				<DialogTitle className="text-[17px]">Rename chat</DialogTitle>
				<form onSubmit={(e) => { e.preventDefault(); if (c && title.trim()) { onSave(c, title); onClose(); } }}>
					<input
						value={title}
						onChange={(e) => setTitle(e.target.value.slice(0, 80))}
						aria-label="Chat name"
						className="h-[44px] w-full rounded-[10px] border border-[#243049] bg-transparent px-3 text-[14px] text-white outline-none focus:border-[#69B3CA]"
					/>
					<DialogFooter className="mt-4">
						<button type="button" onClick={onClose} className={`min-h-[44px] rounded-[8px] px-4 text-[14px] ${deskFocus}`} style={{ color: DISC.muted }}>Cancel</button>
						<button type="submit" disabled={!title.trim()} className={`min-h-[44px] rounded-[8px] px-4 text-[14px] font-semibold disabled:opacity-40 ${deskFocus}`} style={{ color: DISC.teal }}>Save</button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
