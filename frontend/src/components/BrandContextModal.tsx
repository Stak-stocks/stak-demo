import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import type { BrandProfile } from "@/data/brands";
import { Plus } from "lucide-react";

interface BrandContextModalProps {
	brand: BrandProfile | null;
	open: boolean;
	onClose: () => void;
	onAddToStak?: (brand: BrandProfile) => void;
}

export function BrandContextModal({
	brand,
	open,
	onClose,
	onAddToStak,
}: BrandContextModalProps) {
	const [dragY, setDragY] = useState(0);
	const dragging = useRef(false);
	const startY = useRef(0);
	const startTime = useRef(0);

	// Lock background scroll when modal is open
	useEffect(() => {
		if (brand && open) {
			document.body.style.overflow = "hidden";
		} else {
			document.body.style.overflow = "";
		}
		return () => { document.body.style.overflow = ""; };
	}, [brand, open]);

	// Reset drag state when modal opens
	useEffect(() => {
		if (open) setDragY(0);
	}, [open]);

	const handleDragStart = useCallback((clientY: number) => {
		dragging.current = true;
		startY.current = clientY;
		startTime.current = Date.now();
	}, []);

	const handleDragMove = useCallback((clientY: number) => {
		if (!dragging.current) return;
		const dy = clientY - startY.current;
		// Only allow dragging downward
		setDragY(Math.max(0, dy));
	}, []);

	const handleDragEnd = useCallback(() => {
		if (!dragging.current) return;
		dragging.current = false;
		const elapsed = Date.now() - startTime.current;
		const velocity = dragY / Math.max(elapsed, 1); // px/ms
		// Close if dragged far enough or flicked fast enough
		if (dragY > 120 || velocity > 0.5) {
			onClose();
		}
		setDragY(0);
	}, [dragY, onClose]);

	if (!brand || !open) return null;

	const handleAddToStak = () => {
		if (onAddToStak && brand) {
			onAddToStak(brand);
		}
	};

	return createPortal(
		<div
			className="fixed inset-0 z-[100] flex flex-col justify-end sm:justify-center sm:items-center"
			onClick={onClose}
		>
			{/* Semi-transparent overlay showing page behind */}
			<div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

			{/* Content sheet */}
			<div
				className="relative w-full sm:max-w-2xl sm:mx-4 bg-[#0b1121] rounded-t-2xl sm:rounded-2xl h-[80vh] sm:h-[70vh] flex flex-col"
				onClick={(e) => e.stopPropagation()}
				style={{
					transform: dragY > 0 ? `translateY(${dragY}px)` : undefined,
					transition: dragging.current ? "none" : "transform 0.3s ease-out",
					opacity: dragY > 0 ? Math.max(0.5, 1 - dragY / 400) : 1,
				}}
			>
				{/* Drag handle – swipe down to close */}
				<div
					className="flex justify-center pt-4 pb-2 sm:hidden cursor-grab active:cursor-grabbing touch-none"
					onTouchStart={(e) => handleDragStart(e.touches[0].clientY)}
					onTouchMove={(e) => handleDragMove(e.touches[0].clientY)}
					onTouchEnd={handleDragEnd}
					onPointerDown={(e) => { handleDragStart(e.clientY); (e.target as HTMLElement).setPointerCapture(e.pointerId); }}
					onPointerMove={(e) => handleDragMove(e.clientY)}
					onPointerUp={handleDragEnd}
				>
					<div className="w-12 h-1.5 bg-zinc-600 rounded-full" />
				</div>

				{/* Scrollable content */}
				<div className="flex-1 overflow-y-auto px-6 pt-2 sm:pt-6 pb-4 space-y-6">
					<div>
						<div className="flex items-baseline gap-3 mb-2">
							<h2 className="text-2xl sm:text-3xl font-bold text-white">{brand.name}</h2>
							<span className="text-sm font-mono text-zinc-400 uppercase tracking-wider">
								{brand.ticker}
							</span>
						</div>
						<p className="text-zinc-400 italic">{brand.bio}</p>
					</div>

					<div>
						<h3 className="text-xl font-bold mb-4 text-cyan-400">
							{brand.culturalContext.title}
						</h3>

						<div className="space-y-6">
							{brand.culturalContext.sections.map((section, index) => (
								<div key={index} className="space-y-2">
									<h4 className="font-semibold text-lg text-pink-400">
										{section.heading}
									</h4>
									<p className="text-zinc-300 leading-relaxed">
										{section.content}
									</p>
								</div>
							))}
						</div>
					</div>

					<div className="pt-4 border-t border-slate-700/50">
						<p className="text-xs text-zinc-500 text-center italic">
							This is cultural context, not financial advice. We're here to explain
							why brands matter, not tell you what to invest in.
						</p>
					</div>
				</div>

				{/* Sticky bottom button */}
				{onAddToStak && (
					<div className="shrink-0 px-6 pb-6 pt-3 bg-[#0b1121] border-t border-slate-700/30">
						<button
							onClick={handleAddToStak}
							className="w-full py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-pink-500 hover:from-cyan-600 hover:to-pink-600 transition-all font-semibold flex items-center justify-center gap-2 text-white active:scale-[0.98]"
						>
							<Plus className="w-5 h-5" />
							Add to My Stak
						</button>
					</div>
				)}
			</div>
		</div>,
		document.body,
	);
}
