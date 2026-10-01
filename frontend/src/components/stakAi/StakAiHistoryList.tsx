import { useState } from "react";
import { MoreVertical } from "lucide-react";
import { DISC, cu } from "@/components/discover/discoverTheme";
import { DESK } from "@/components/desktop/deskKit";
import type { StakAiConversation } from "@/lib/api";
import { ago, type useStakAiHistory } from "./useStakAiHistory";

const FOCUS = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#69B3CA]";
const RED = "#E5484D";

/**
 * STAK AI's past chats: what each was about, its latest answer and when, with rename and delete behind a ⋯ menu.
 * [activeId] marks the open one (desktop's sidebar).
 */
export function StakAiHistoryList({ history, onOpen, variant, activeId }: {
	history: ReturnType<typeof useStakAiHistory>;
	onOpen: (id: string) => void;
	variant: "phone" | "desktop";
	activeId?: string | null;
}) {
	const s = (n: number) => (variant === "phone" ? cu(n) : `${n}px`);
	const [menuFor, setMenuFor] = useState<string | null>(null);
	const [renaming, setRenaming] = useState<StakAiConversation | null>(null);
	const [deleting, setDeleting] = useState<StakAiConversation | null>(null);
	const card = variant === "phone" ? DISC.cardDark : DESK.panel;

	if (history.conversations.length === 0) {
		const text = history.loading ? "Loading…" : history.failed ? "Couldn't load your chats." : "No chats yet. Ask STAK AI something and it'll show up here.";
		return (
			<div style={{ borderRadius: s(14), background: card, padding: s(16) }}>
				<p style={{ fontSize: s(13), lineHeight: s(19), color: DISC.body }}>{text}</p>
				{history.failed && <button type="button" onClick={history.reload} className={`mt-2 rounded font-semibold ${FOCUS}`} style={{ minHeight: 40, fontSize: s(13), color: DISC.teal }}>Try again</button>}
			</div>
		);
	}

	return (
		<>
			<ul className="flex flex-col" style={{ gap: s(variant === "phone" ? 10 : 6) }}>
				{history.conversations.map((c) => (
					<li key={c.id} className="relative">
						<div className="flex items-start" style={{ borderRadius: s(14), background: c.id === activeId ? DESK.panelRaised : card, boxShadow: c.id === activeId ? `inset 2px 0 0 ${DESK.cyan}` : undefined }}>
							<button type="button" onClick={() => onOpen(c.id)} aria-current={c.id === activeId ? "true" : undefined} className={`flex min-w-0 flex-1 flex-col text-left ${FOCUS}`} style={{ gap: s(3), padding: `${s(12)} 0 ${s(12)} ${s(14)}`, borderRadius: s(14) }}>
								<span className="flex items-center" style={{ gap: s(6), fontSize: s(11) }}>
									{c.context_label && <span className="truncate font-medium" style={{ color: DISC.teal }}>{c.context_label}</span>}
									{c.context_label && <span aria-hidden="true" style={{ color: DISC.muted }}>·</span>}
									<span className="shrink-0" style={{ color: DISC.muted }}>{ago(c.updated_at)}</span>
								</span>
								<span className="line-clamp-2 font-medium text-white" style={{ fontSize: s(14), lineHeight: s(19) }}>{c.title}</span>
								{c.preview && <span className="line-clamp-2" style={{ fontSize: s(12), lineHeight: s(17), color: DISC.body }}>{c.preview.replace(/\*\*/g, "").replace(/\n/g, " ")}</span>}
							</button>
							<button type="button" onClick={() => setMenuFor(menuFor === c.id ? null : c.id)} aria-label={`More options for ${c.title}`} aria-haspopup="menu" aria-expanded={menuFor === c.id} className={`grid shrink-0 place-items-center rounded-full ${FOCUS}`} style={{ width: 44, height: 44, color: DISC.muted }}>
								<MoreVertical className="h-[18px] w-[18px]" aria-hidden="true" />
							</button>
						</div>
						{menuFor === c.id && (
							<div role="menu" className="absolute right-2 top-11 z-10 flex flex-col overflow-hidden rounded-[10px] shadow-xl" style={{ background: "#1E2536", border: `1px solid ${DESK.border}`, minWidth: 140 }}>
								<button role="menuitem" type="button" className={`px-4 py-3 text-left text-[13px] text-white hover:bg-white/[0.05] ${FOCUS}`} onClick={() => { setMenuFor(null); setRenaming(c); }}>Rename</button>
								<button role="menuitem" type="button" className={`px-4 py-3 text-left text-[13px] hover:bg-white/[0.05] ${FOCUS}`} style={{ color: RED }} onClick={() => { setMenuFor(null); setDeleting(c); }}>Delete</button>
							</div>
						)}
					</li>
				))}
			</ul>
			{history.hasMore && (
				<button type="button" disabled={history.loading} onClick={history.loadMore} className={`w-full rounded font-semibold ${FOCUS}`} style={{ minHeight: 48, fontSize: s(13), color: DISC.teal }}>
					{history.loading ? "Loading…" : "Show older chats"}
				</button>
			)}
			{renaming && <RenameDialog c={renaming} onCancel={() => setRenaming(null)} onSave={(t) => { history.rename(renaming, t); setRenaming(null); }} />}
			{deleting && (
				<Dialog title="Delete this chat?" onCancel={() => setDeleting(null)}>
					<p className="text-[14px]" style={{ color: DISC.body }}>“{deleting.title}” will be gone for good.</p>
					<DialogActions onCancel={() => setDeleting(null)} confirmLabel="Delete" confirmColor={RED} onConfirm={() => { history.remove(deleting); setDeleting(null); }} />
				</Dialog>
			)}
		</>
	);
}

function RenameDialog({ c, onCancel, onSave }: { c: StakAiConversation; onCancel: () => void; onSave: (title: string) => void }) {
	const [title, setTitle] = useState(c.title);
	return (
		<Dialog title="Rename chat" onCancel={onCancel}>
			<form onSubmit={(e) => { e.preventDefault(); if (title.trim()) onSave(title); }}>
				<input value={title} onChange={(e) => setTitle(e.target.value.slice(0, 80))} autoFocus aria-label="Chat name" className="h-[44px] w-full rounded-[10px] bg-transparent px-3 text-[14px] text-white outline-none focus:border-[#69B3CA]" style={{ border: "1px solid #243049" }} />
				<DialogActions onCancel={onCancel} confirmLabel="Save" confirmColor={DISC.teal} confirmDisabled={!title.trim()} submit />
			</form>
		</Dialog>
	);
}

function Dialog({ title, onCancel, children }: { title: string; onCancel: () => void; children: React.ReactNode }) {
	return (
		<div className="fixed inset-0 z-[100] grid place-items-center bg-black/60 px-6" onClick={onCancel} onKeyDown={(e) => { if (e.key === "Escape") onCancel(); }}>
			<div role="dialog" aria-modal="true" aria-label={title} className="w-full max-w-[360px] rounded-[16px] p-5" style={{ background: "#172037" }} onClick={(e) => e.stopPropagation()}>
				<h2 className="mb-3 text-[17px] font-semibold text-white">{title}</h2>
				{children}
			</div>
		</div>
	);
}

function DialogActions({ onCancel, onConfirm, confirmLabel, confirmColor, confirmDisabled, submit }: { onCancel: () => void; onConfirm?: () => void; confirmLabel: string; confirmColor: string; confirmDisabled?: boolean; submit?: boolean }) {
	return (
		<div className="mt-4 flex justify-end gap-2">
			<button type="button" onClick={onCancel} className={`h-[40px] rounded-[8px] px-4 text-[14px] ${FOCUS}`} style={{ color: DISC.muted }}>Cancel</button>
			<button type={submit ? "submit" : "button"} onClick={onConfirm} disabled={confirmDisabled} className={`h-[40px] rounded-[8px] px-4 text-[14px] font-semibold disabled:opacity-40 ${FOCUS}`} style={{ color: confirmColor }}>{confirmLabel}</button>
		</div>
	);
}
