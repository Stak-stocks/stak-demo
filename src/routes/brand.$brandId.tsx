import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { brands, type BrandProfile } from "@/data/brands";
import { ArrowLeft, TrendingUp, Newspaper } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VibeSliders } from "@/components/VibeSliders";

export const Route = createFileRoute("/brand/$brandId")({
	component: BrandDetailPage,
});

function BrandDetailPage() {
	const { brandId } = Route.useParams();
	const navigate = useNavigate();
	const [brand, setBrand] = useState<BrandProfile | null>(null);

	useEffect(() => {
		const foundBrand = brands.find((b) => b.id === brandId);
		setBrand(foundBrand || null);
	}, [brandId]);

	const handleClose = () => {
		navigate({ to: "/my-stak" });
	};

	if (!brand) {
		return (
			<div className="min-h-screen bg-[#121212] text-white flex items-center justify-center">
				<div className="text-center">
					<h2 className="text-2xl font-bold text-zinc-300 mb-2">
						Brand not found
					</h2>
					<Link
						to="/my-stak"
						className="text-cyan-400 hover:underline"
					>
						Back to My Stak
					</Link>
				</div>
			</div>
		);
	}

	return (
		<div
			className="min-h-screen bg-[#121212] text-white"
			onClick={handleClose}
		>
			<div
				className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12"
				onClick={(e) => e.stopPropagation()}
			>
				<Link
					to="/my-stak"
					className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mb-8"
				>
					<ArrowLeft className="w-5 h-5" />
					<span>Back to My Stak</span>
				</Link>

				<div className="mb-8">
					<div className="flex items-baseline gap-3 mb-2">
						<h1 className="text-4xl font-bold text-white">{brand.name}</h1>
						<span className="text-lg font-mono text-zinc-400 uppercase">
							{brand.ticker}
						</span>
					</div>
					<p className="text-zinc-400 text-lg italic">{brand.bio}</p>
				</div>

				<Tabs defaultValue="vibe" className="w-full">
					<TabsList className="grid w-full grid-cols-3 bg-zinc-900 border border-zinc-800">
						<TabsTrigger
							value="vibe"
							className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400"
						>
							✨ Vibe
						</TabsTrigger>
						<TabsTrigger
							value="numbers"
							className="data-[state=active]:bg-pink-500/20 data-[state=active]:text-pink-400"
						>
							<TrendingUp className="w-4 h-4 mr-2" />
							The Numbers
						</TabsTrigger>
						<TabsTrigger
							value="news"
							className="data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-400"
						>
							<Newspaper className="w-4 h-4 mr-2" />
							News
						</TabsTrigger>
					</TabsList>

					<TabsContent value="vibe" className="mt-6 space-y-6">
						<div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
							<h2 className="text-xl font-bold text-cyan-400 mb-4">
								{brand.culturalContext.title}
							</h2>
							<div className="space-y-6">
								{brand.culturalContext.sections.map((section, index) => (
									<div key={index}>
										<h3 className="font-semibold text-lg text-pink-400 mb-2">
											{section.heading}
										</h3>
										<p className="text-zinc-300 leading-relaxed">
											{section.content}
										</p>
									</div>
								))}
							</div>
						</div>

						<div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
							<h3 className="font-semibold text-lg text-white mb-4">Vibe Metrics</h3>
							<VibeSliders vibes={brand.vibes} />
						</div>
					</TabsContent>

					<TabsContent value="numbers" className="mt-6">
						<div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
							<div className="mb-6">
								<h2 className="text-2xl font-bold text-pink-400 mb-2">
									The Numbers
								</h2>
								<p className="text-zinc-400 text-sm">
									Financial metrics explained in plain language
								</p>
							</div>

							<div className="grid gap-6">
								{Object.entries(brand.financials).map(([key, metric]) => (
									<div
										key={key}
										className="border-l-4 border-pink-500/50 pl-4 py-2"
									>
										<div className="flex items-baseline justify-between mb-1">
											<h3 className="font-semibold text-white">{metric.label}</h3>
											<span className="text-2xl font-bold text-pink-400">
												{metric.value}
											</span>
										</div>
										<p className="text-sm text-zinc-400 mb-2">
											{metric.explanation}
										</p>
										<p className="text-sm text-cyan-400 italic">
											"{metric.culturalTranslation}"
										</p>
									</div>
								))}
							</div>

							<div className="mt-6 p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
								<p className="text-xs text-zinc-500 text-center italic">
									These are real financial metrics, not investment advice. This is
									for learning, not trading decisions.
								</p>
							</div>
						</div>
					</TabsContent>

					<TabsContent value="news" className="mt-6">
						<div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
							<div className="mb-6">
								<h2 className="text-2xl font-bold text-orange-400 mb-2">
									Recent News
								</h2>
								<p className="text-zinc-400 text-sm">
									Current articles about {brand.name}
								</p>
							</div>

							<div className="space-y-4">
								{brand.news.map((article, index) => (
									<div
										key={index}
										className="border-l-4 border-zinc-700 hover:border-orange-500/50 pl-4 py-3 transition-all"
									>
										<div className="flex items-start justify-between gap-4 mb-2">
											<h3 className="font-semibold text-white leading-tight">
												{article.headline}
											</h3>
											<span
												className={`shrink-0 px-2 py-1 text-xs font-semibold rounded ${
													article.sentiment === "Bullish"
														? "bg-green-500/20 text-green-400"
														: article.sentiment === "Bearish"
															? "bg-red-500/20 text-red-400"
															: "bg-zinc-500/20 text-zinc-400"
												}`}
											>
												{article.sentiment}
											</span>
										</div>
										<div className="flex items-center gap-3 text-xs text-zinc-500">
											<span>{article.source}</span>
											<span>•</span>
											<span>{article.timestamp}</span>
										</div>
									</div>
								))}
							</div>

							<div className="mt-6 text-center">
								<button className="text-orange-400 hover:text-orange-300 text-sm font-semibold transition-colors">
									View more news →
								</button>
							</div>
						</div>
					</TabsContent>
				</Tabs>

				<div className="mt-8 p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg">
					<p className="text-xs text-zinc-500 text-center">
						This is cultural context, not financial advice. We're here to explain
						why brands matter, not tell you what to invest in.
					</p>
				</div>
			</div>
		</div>
	);
}
