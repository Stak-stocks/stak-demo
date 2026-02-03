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
	if (!brand || !open) return null;

	const handleAddToStak = () => {
		if (onAddToStak && brand) {
			onAddToStak(brand);
		}
	};

	return (
		<div
			className="fixed inset-0 z-[100] flex flex-col justify-end sm:justify-center sm:items-center"
			onClick={onClose}
		>
			{/* Semi-transparent overlay showing page behind */}
			<div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

			{/* Content sheet */}
			<div
				className="relative w-full sm:max-w-2xl sm:mx-4 bg-[#121212] rounded-t-2xl sm:rounded-2xl max-h-[80vh] overflow-y-auto"
				onClick={(e) => e.stopPropagation()}
			>
				{/* Drag handle indicator for mobile */}
				<div className="flex justify-center pt-4 pb-2 sm:hidden">
					<div className="w-12 h-1.5 bg-zinc-600 rounded-full" />
				</div>

				<div className="px-6 pb-6 pt-2 sm:pt-6 space-y-6">
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

					{onAddToStak && (
						<button
							onClick={handleAddToStak}
							className="w-full py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-pink-500 hover:from-cyan-600 hover:to-pink-600 transition-all font-semibold flex items-center justify-center gap-2 text-white"
						>
							<Plus className="w-5 h-5" />
							Add to My Stak
						</button>
					)}

					<div className="pt-4 border-t border-zinc-800">
						<p className="text-xs text-zinc-500 text-center italic">
							This is cultural context, not financial advice. We're here to explain
							why brands matter, not tell you what to invest in.
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}
