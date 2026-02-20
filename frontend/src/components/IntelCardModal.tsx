import { useEffect } from "react";
import { createPortal } from "react-dom";
import type { IntelCard } from "@/data/intelCards";

interface IntelCardModalProps {
	readonly card: IntelCard;
	readonly onDismiss: () => void;
}

export function IntelCardModal({ card, onDismiss }: Readonly<IntelCardModalProps>) {
	// Prevent background scrolling while modal is open
	useEffect(() => {
		const original = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		return () => {
			document.body.style.overflow = original;
		};
	}, []);

	return createPortal(
		<dialog
			open
			className="bg-black/70 backdrop-blur-sm"
			style={{
				position: "fixed",
				inset: 0,
				zIndex: 9999,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				width: "100%",
				height: "100%",
				maxWidth: "100%",
				maxHeight: "100%",
				border: "none",
				padding: "1.5rem",
				margin: 0,
			}}
			onClose={onDismiss}
		>
			{/* Backdrop click area */}
			<div
				aria-hidden="true"
				style={{ position: "fixed", inset: 0, zIndex: 0 }}
				onClick={onDismiss}
			/>
			<div
				className="relative w-full max-w-sm rounded-2xl p-7 text-center"
				style={{
					zIndex: 1,
					background: "linear-gradient(160deg, #0d1b35 0%, #0a1628 100%)",
					border: "1px solid rgba(6, 182, 212, 0.35)",
					boxShadow: "0 0 40px rgba(6, 182, 212, 0.15), 0 20px 60px rgba(0,0,0,0.5)",
				}}
			>
				{/* Intel badge */}
				<div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[10px] font-bold tracking-widest uppercase mb-5">
					Intel Card
				</div>

				{/* Title */}
				<h2 className="text-xl font-extrabold text-white leading-tight mb-4">
					{card.title}
				</h2>

				{/* Emoji */}
				<div className="text-5xl mb-5 select-none">{card.emoji}</div>

				{/* Explanation */}
				<p className="text-sm text-slate-300 leading-relaxed mb-5">
					{card.explanation}
				</p>

				{/* Divider */}
				<div className="h-px bg-cyan-500/20 mb-5" />

				{/* Takeaway */}
				<div className="text-left">
					<p className="text-xs font-bold text-yellow-400 tracking-wider uppercase mb-1.5">
						💡 Stak Takeaway:
					</p>
					<p className="text-sm text-slate-300 leading-relaxed">
						{card.takeaway}
					</p>
				</div>

				{/* GOT IT button */}
				<button
					type="button"
					onClick={onDismiss}
					className="mt-6 w-full py-3 rounded-xl border border-slate-500/60 text-white font-bold text-sm tracking-widest uppercase hover:bg-white/5 active:scale-95 transition-all"
				>
					Got It
				</button>
			</div>
		</dialog>,
		document.body,
	);
}
