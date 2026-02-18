import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useRef, useEffect, useMemo, type MouseEvent, type TouchEvent } from "react";
import { useAuth } from "../context/AuthContext";
import { updateProfile, saveStak, savePassedBrands } from "@/lib/api";

import {
	INTEREST_OPTIONS,
	MOTIVATION_OPTIONS,
	FAMILIARITY_OPTIONS,
	ONBOARDING_SWIPE_BRAND_IDS,
	INTEREST_TO_BRANDS,
} from "@/data/onboarding";
import { brands as allBrands, getBrandLogoUrl } from "@/data/brands";

export const Route = createFileRoute("/onboarding")({
	component: OnboardingPage,
});

const SWIPE_BRANDS = ONBOARDING_SWIPE_BRAND_IDS.map((id) => {
	const brand = allBrands.find((b) => b.id === id);
	return brand
		? { id: brand.id, name: brand.name, logo: getBrandLogoUrl(brand), ticker: brand.ticker }
		: null;
}).filter(Boolean) as { id: string; name: string; logo: string; ticker: string }[];

// Brand colors for the building step fan cards
const BRAND_COLORS: Record<string, string> = {
	tsla: "#cc0000",
	aapl: "#555555",
	nflx: "#E50914",
	spot: "#1DB954",
	amzn: "#FF9900",
	dis: "#0056A4",
	nke: "#111111",
	googl: "#4285F4",
	msft: "#00A4EF",
	meta: "#0668E1",
	sbux: "#00704A",
	uber: "#000000",
	lyft: "#FF00BF",
	shop: "#96BF48",
	wmt: "#0071CE",
	tgt: "#CC0000",
	cost: "#E31837",
	ko: "#F40009",
	pep: "#004B93",
	ulta: "#E85C2B",
	elf: "#1a1a2e",
	coty: "#1a1a2e",
	rblx: "#E2231A",
	nvda: "#76B900",
	el: "#022169",
	or: "#1a1a2e",
	v: "#1A1F71",
	hood: "#00C805",
	sq: "#1a1a2e",
};

function clearProgress() {
	localStorage.removeItem("onboardingProgress");
}

// ─── Back button ─────────────────────────────────────────────────────────────

function BackButton({ onClick }: { onClick: () => void }) {
	return (
		<button
			type="button"
			onClick={onClick}
			className="absolute top-8 left-6 z-20 p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
		>
			<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
				<path d="M15 18l-6-6 6-6" />
			</svg>
		</button>
	);
}

// ─── Main page ───────────────────────────────────────────────────────────────

function OnboardingPage() {
	const { user, loading } = useAuth();
	const navigate = useNavigate();

	const [step, setStep] = useState(1);
	const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
	const [swipedRight, setSwipedRight] = useState<string[]>([]);
	const [selectedMotivations, setSelectedMotivations] = useState<string[]>([]);
	const [selectedFamiliarity, setSelectedFamiliarity] = useState<string | null>(null);

	useEffect(() => {
		if (!loading && !user) {
			navigate({ to: "/login" });
		}
	}, [user, loading, navigate]);

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-screen bg-[#0f1629]">
				<div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
			</div>
		);
	}

	function goTo(nextStep: number) {
		setStep(nextStep);
	}

	const steps = [
		<WelcomeStep key="welcome" onNext={() => goTo(1)} />,
		<InterestsStep
			key="interests"
			selected={selectedActivities}
			onToggle={(id) =>
				setSelectedActivities((prev) =>
					prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id],
				)
			}
			onNext={() => goTo(2)}
		/>,
		<SwipeStep
			key="swipe"
			selectedInterests={selectedActivities}
			onSwipeRight={(id) => setSwipedRight((prev) => [...prev, id])}
			onNext={() => goTo(3)}
		/>,
		<MotivationStep
			key="motivation"
			selected={selectedMotivations}
			onToggle={(m) =>
				setSelectedMotivations((prev) =>
					prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m],
				)
			}
			onNext={() => goTo(4)}
		/>,
		<FamiliarityStep
			key="familiarity"
			selected={selectedFamiliarity}
			onSelect={setSelectedFamiliarity}
			onNext={() => goTo(5)}
		/>,
		<BuildingStep
			key="building"
			selectedInterests={selectedActivities}
			swipedBrandIds={swipedRight}
			onDone={() => navigate({ to: "/" })}
		/>,
	];

	return (
		<div className="relative flex flex-col items-center justify-center min-h-screen bg-[#0f1629] px-6 overflow-hidden">
			{/* Back button (not on first or building steps) */}
			{step > 1 && step < 5 && <BackButton onClick={() => goTo(step - 1)} />}

			{/* Progress dots */}
			{step < 5 && (
				<div className="absolute top-8 left-1/2 -translate-x-1/2 flex gap-2">
					{[1, 2, 3, 4].map((i) => (
						<div
							key={i}
							className={`w-2 h-2 rounded-full transition-all duration-300 ${
								i === step
									? "bg-orange-400 w-6"
									: i < step
										? "bg-orange-400/60"
										: "bg-slate-600"
							}`}
						/>
					))}
				</div>
			)}

			<div className="relative z-10 w-full max-w-sm">{steps[step]}</div>
		</div>
	);
}

// ─── Step 1: Welcome ────────────────────────────────────────────────────────────

function WelcomeStep({ onNext }: { onNext: () => void }) {
	return (
		<div className="text-center space-y-8 animate-in fade-in duration-500">
			{/* Logo */}
			<div className="flex items-center justify-center gap-2">
				<svg width="48" height="48" viewBox="0 0 24 24" fill="none" className="text-white">
					<path
						d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
					<path
						d="M3.27 6.96 12 12.01l8.73-5.05M12 22.08V12"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
				</svg>
				<span className="text-white text-4xl font-bold tracking-wider">STAK</span>
			</div>

			<div>
				<h1 className="text-3xl font-bold text-white">Welcome to STAK</h1>
				<p className="text-slate-400 mt-3 text-lg">
					Discover stocks through brands you already know
				</p>
			</div>

			<button
				type="button"
				onClick={onNext}
				className="w-full py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-600 hover:to-orange-500 transition-all active:scale-[0.98] shadow-lg shadow-orange-500/25"
			>
				Get Started ►
			</button>
		</div>
	);
}

// ─── Step 2: Activities ─────────────────────────────────────────────────────────

function InterestsStep({
	selected,
	onToggle,
	onNext,
}: {
	selected: string[];
	onToggle: (id: string) => void;
	onNext: () => void;
}) {
	return (
		<div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-400">
			<div className="text-center">
				<h1 className="text-2xl font-bold text-white">What are you into?</h1>
				<p className="text-slate-400 mt-1">Pick the topics that interest you</p>
			</div>

			<div className="grid grid-cols-3 gap-3">
				{INTEREST_OPTIONS.map((interest) => (
					<button
						key={interest.id}
						type="button"
						onClick={() => onToggle(interest.id)}
						className={`flex flex-col items-center gap-2 py-4 px-3 rounded-xl border transition-all active:scale-95 ${
							selected.includes(interest.id)
								? "bg-orange-500/20 border-orange-500 text-white"
								: "bg-[#1a2332] border-slate-700 text-slate-300 hover:border-slate-500"
						}`}
					>
						<span className="text-2xl">{interest.emoji}</span>
						<span className="text-xs font-medium">{interest.label}</span>
					</button>
				))}
			</div>

			<button
				type="button"
				onClick={onNext}
				disabled={selected.length === 0}
				className="w-full py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-600 hover:to-orange-500 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-500/25"
			>
				Continue
			</button>
		</div>
	);
}

// ─── Step 3: Swipe ──────────────────────────────────────────────────────────────

function SwipeStep({
	selectedInterests,
	onSwipeRight,
	onNext,
}: {
	selectedInterests: string[];
	onSwipeRight: (id: string) => void;
	onNext: () => void;
}) {
	// Derive swipe brands from user's interest selections
	// Round-robin across categories so each interest gets equal representation
	const swipeBrands = useMemo(() => {
		if (selectedInterests.length === 0) return SWIPE_BRANDS;

		// Build per-category brand lists, shuffled so shared brands
		// aren't always claimed by the first selected category
		const categoryBrands = selectedInterests.map(
			(interest) => [...(INTEREST_TO_BRANDS[interest] || [])].sort(() => Math.random() - 0.5),
		);

		// Round-robin pick: take 1 from each category in turn
		const picked = new Set<string>();
		const maxLen = Math.max(...categoryBrands.map((b) => b.length));
		for (let i = 0; i < maxLen && picked.size < 8; i++) {
			for (const brands of categoryBrands) {
				if (i < brands.length && !picked.has(brands[i])) {
					picked.add(brands[i]);
					if (picked.size >= 8) break;
				}
			}
		}

		const mapped = [...picked].map((id) => {
			const brand = allBrands.find((b) => b.id === id);
			return brand
				? { id: brand.id, name: brand.name, logo: getBrandLogoUrl(brand), ticker: brand.ticker }
				: null;
		}).filter(Boolean) as { id: string; name: string; logo: string; ticker: string }[];

		// Pad with defaults if fewer than 4 brands
		return mapped.length >= 4 ? mapped : [...mapped, ...SWIPE_BRANDS.filter((b) => !mapped.some((m) => m.id === b.id))].slice(0, 8);
	}, [selectedInterests]);

	const [currentIndex, setCurrentIndex] = useState(0);
	const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
	const [isDragging, setIsDragging] = useState(false);
	const [isExiting, setIsExiting] = useState(false);
	const dragStartPos = useRef({ x: 0, y: 0 });
	const velocityHistory = useRef<{ x: number; t: number }[]>([]);
	const isProcessingSwipe = useRef(false);

	const done = currentIndex >= swipeBrands.length;

	const FLICK_VELOCITY = 0.4;      // px/ms
	const DISTANCE_THRESHOLD = 60;   // px

	const executeSwipe = (direction: "left" | "right") => {
		if (isProcessingSwipe.current || done) return;
		isProcessingSwipe.current = true;

		const brand = swipeBrands[currentIndex];
		setIsDragging(false);
		setIsExiting(true);

		const exitX = direction === "right" ? 1200 : -1200;
		setDragOffset({ x: exitX, y: 0 });

		if (direction === "right" && brand) {
			onSwipeRight(brand.id);
		}

		setTimeout(() => {
			setCurrentIndex((prev) => prev + 1);
			setDragOffset({ x: 0, y: 0 });
			setIsExiting(false);
			isProcessingSwipe.current = false;
		}, 280);
	};

	const handleDragStart = (clientX: number, clientY: number) => {
		if (done || isProcessingSwipe.current) return;
		setIsDragging(true);
		dragStartPos.current = { x: clientX, y: clientY };
		velocityHistory.current = [{ x: clientX, t: Date.now() }];
	};

	const handleDragMove = (clientX: number, clientY: number) => {
		if (!isDragging) return;
		setDragOffset({
			x: clientX - dragStartPos.current.x,
			y: clientY - dragStartPos.current.y,
		});
		const now = Date.now();
		velocityHistory.current.push({ x: clientX, t: now });
		if (velocityHistory.current.length > 5) velocityHistory.current.shift();
	};

	const handleDragEnd = () => {
		if (!isDragging || isProcessingSwipe.current) return;

		// Calculate velocity
		const history = velocityHistory.current;
		let velocity = 0;
		if (history.length >= 2) {
			const first = history[0];
			const last = history[history.length - 1];
			const dt = last.t - first.t;
			if (dt > 0) velocity = (last.x - first.x) / dt;
		}

		const absDistance = Math.abs(dragOffset.x);
		const absVelocity = Math.abs(velocity);

		const isFlick = absVelocity > FLICK_VELOCITY && absDistance > 20;
		const isDrag = absDistance > DISTANCE_THRESHOLD;

		if (isFlick || isDrag) {
			const direction = (velocity !== 0 ? velocity : dragOffset.x) > 0 ? "right" : "left";
			executeSwipe(direction);
		} else {
			setDragOffset({ x: 0, y: 0 });
			setIsDragging(false);
		}
	};

	const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => { e.preventDefault(); handleDragStart(e.clientX, e.clientY); };
	const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => handleDragMove(e.clientX, e.clientY);
	const handleMouseUp = () => handleDragEnd();
	const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => handleDragStart(e.touches[0].clientX, e.touches[0].clientY);
	const handleTouchMove = (e: TouchEvent<HTMLDivElement>) => handleDragMove(e.touches[0].clientX, e.touches[0].clientY);
	const handleTouchEnd = () => handleDragEnd();

	const visibleBrands = swipeBrands.slice(currentIndex, currentIndex + 1);
	const tintOpacity = Math.min(Math.abs(dragOffset.x) / 120, 0.45);

	return (
		<div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-400">
			<div className="text-center">
				<h1 className="text-2xl font-bold text-white">Swipe to discover</h1>
				{!done && (
					<p className="text-slate-400 text-sm mt-1">Swipe right on brands you like, left to skip</p>
				)}
			</div>

			<div className="relative w-full h-[320px]">
				{done ? (
					<div className="flex items-center justify-center h-full">
						<div className="text-center space-y-3">
							<p className="text-xl font-bold text-white">Nice picks!</p>
							<p className="text-slate-400">Let's keep going</p>
						</div>
					</div>
				) : (
					<div className="relative w-full h-full">
						{visibleBrands.map((brand, index) => {
							const isTopCard = index === 0;
							const scale = isTopCard ? 1 : 0.95;
							const yOffset = index * 8;
							const opacity = isTopCard ? 1 : 0.4;

							const rotation = isTopCard ? dragOffset.x * 0.06 : 0;
							const translateX = isTopCard ? dragOffset.x : 0;
							const translateY = isTopCard ? dragOffset.y * 0.15 : 0;

							return (
								<div
									key={brand.id}
									className="absolute inset-0 flex items-center justify-center select-none"
									style={{
										transform: `translateX(${translateX}px) translateY(${translateY + yOffset}px) scale(${scale}) rotate(${rotation}deg)`,
										opacity,
										transition:
											isTopCard && !isDragging
												? "transform 0.28s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.28s ease"
												: "transform 0s, opacity 0.28s ease",
										zIndex: visibleBrands.length - index,
										pointerEvents: isTopCard ? "auto" : "none",
										touchAction: "none",
										willChange: "transform",
									}}
									onMouseDown={isTopCard ? handleMouseDown : undefined}
									onMouseMove={isTopCard && isDragging ? handleMouseMove : undefined}
									onMouseUp={isTopCard && isDragging ? handleMouseUp : undefined}
									onMouseLeave={isTopCard && isDragging ? handleMouseUp : undefined}
									onTouchStart={isTopCard ? handleTouchStart : undefined}
									onTouchMove={isTopCard && isDragging ? handleTouchMove : undefined}
									onTouchEnd={isTopCard && isDragging ? handleTouchEnd : undefined}
								>
									{/* Swipe tint overlay */}
									{isTopCard && Math.abs(dragOffset.x) > 15 && (
										<div
											className="absolute inset-0 flex items-center justify-center rounded-2xl pointer-events-none z-10"
											style={{
												backgroundColor:
													dragOffset.x > 0
														? `rgba(34, 197, 94, ${tintOpacity})`
														: `rgba(239, 68, 68, ${tintOpacity})`,
											}}
										/>
									)}

									<div className="w-64 h-72 flex flex-col items-center justify-center gap-4 cursor-grab active:cursor-grabbing">
										<img
											src={brand.logo}
											alt={brand.name}
											className="w-28 h-28 rounded-2xl object-contain drop-shadow-[0_0_20px_rgba(255,255,255,0.15)]"
										/>
										<div className="text-center">
											<p className="text-white font-bold text-lg">{brand.name}</p>
											<p className="text-slate-400 text-sm">${brand.ticker}</p>
										</div>
									</div>
								</div>
							);
						})}

						{/* STAK / PASS label */}
						{Math.abs(dragOffset.x) > 30 && (
							<div
								className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50"
								style={{ opacity: Math.min(Math.abs(dragOffset.x) / 80, 1) }}
							>
								<div
									className={`text-4xl font-black px-6 py-4 rounded-2xl border-4 ${
										dragOffset.x > 0
											? "text-green-400 border-green-400 bg-green-400/20 rotate-12"
											: "text-red-500 border-red-500 bg-red-500/20 -rotate-12"
									} shadow-2xl backdrop-blur-sm`}
								>
									{dragOffset.x > 0 ? "STAKED" : "PASS"}
								</div>
							</div>
						)}
					</div>
				)}
			</div>



			{/* Card counter */}
			{!done && (
				<div className="text-center text-sm text-slate-500">
					{currentIndex + 1} / {swipeBrands.length}
				</div>
			)}

			<button
				type="button"
				onClick={onNext}
				className={`w-full py-3.5 rounded-xl font-semibold text-white transition-all active:scale-[0.98] shadow-lg ${
					done
						? "bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-600 hover:to-orange-500 shadow-orange-500/25"
						: "bg-slate-700 hover:bg-slate-600 shadow-none"
				}`}
			>
				{done ? "Continue" : "Skip"}
			</button>
		</div>
	);
}

// ─── Step 4: Motivation ─────────────────────────────────────────────────────────

function MotivationStep({
	selected,
	onToggle,
	onNext,
}: {
	selected: string[];
	onToggle: (m: string) => void;
	onNext: () => void;
}) {
	return (
		<div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-400">
			<div className="text-center">
				<h1 className="text-2xl font-bold text-white">What brings you to STAK?</h1>
			</div>

			<div className="space-y-3">
				{MOTIVATION_OPTIONS.map((option) => (
					<button
						key={option.id}
						type="button"
						onClick={() => onToggle(option.id)}
						className={`w-full flex items-center gap-3 text-left py-4 px-5 rounded-xl transition-all active:scale-[0.98] ${
							selected.includes(option.id)
								? `${option.color} text-white border border-transparent`
								: `${option.color}/20 text-white border border-slate-700 hover:border-slate-500`
						}`}
					>
						<span className="text-lg">{option.icon}</span>
						<span className="font-medium">{option.label}</span>
					</button>
				))}
			</div>

			<button
				type="button"
				onClick={onNext}
				disabled={selected.length === 0}
				className="w-full py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-600 hover:to-orange-500 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-500/25"
			>
				Next
			</button>
		</div>
	);
}

// ─── Step 5: Familiarity ────────────────────────────────────────────────────────

function FamiliarityStep({
	selected,
	onSelect,
	onNext,
}: {
	selected: string | null;
	onSelect: (f: string) => void;
	onNext: () => void;
}) {
	return (
		<div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-400">
			<div className="text-center">
				<h1 className="text-2xl font-bold text-white">How familiar are you with stocks?</h1>
			</div>

			<div className="space-y-3">
				{FAMILIARITY_OPTIONS.map((option) => (
					<button
						key={option.id}
						type="button"
						onClick={() => onSelect(option.id)}
						className={`w-full text-center py-4 px-5 rounded-xl border transition-all active:scale-[0.98] ${
							selected === option.id
								? "bg-orange-500/20 border-orange-500 text-white"
								: "bg-[#1a2332] border-slate-700 text-slate-300 hover:border-slate-500"
						}`}
					>
						<p className="font-semibold">{option.label}</p>
					</button>
				))}
			</div>

			<button
				type="button"
				onClick={onNext}
				disabled={!selected}
				className="w-full py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-600 hover:to-orange-500 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-500/25"
			>
				Continue
			</button>
		</div>
	);
}

// ─── Step 6: Building ───────────────────────────────────────────────────────────

function BuildingStep({
	selectedInterests,
	swipedBrandIds,
	onDone,
}: {
	selectedInterests: string[];
	swipedBrandIds: string[];
	onDone: () => void;
}) {
	// Derive brands from user selections: interests → brand IDs, plus swiped brands
	const userBrandIds = useMemo(() => {
		const fromInterests = selectedInterests.flatMap((interest) => INTEREST_TO_BRANDS[interest] || []);
		const combined = [...swipedBrandIds, ...fromInterests];
		// Deduplicate while preserving order
		const unique = [...new Set(combined)];
		// Only keep brands that exist in our data
		return unique.filter((id) => allBrands.some((b) => b.id === id)).slice(0, 4);
	}, [selectedInterests, swipedBrandIds]);

	// Fallback if user somehow has no selections
	const SHUFFLE_BRANDS = (userBrandIds.length >= 2 ? userBrandIds : ["tsla", "aapl", "spot", "amzn"]).map((id) => {
		const brand = allBrands.find((b) => b.id === id)!;
		return { id: brand.id, name: brand.name, color: BRAND_COLORS[brand.id] || "#3b82f6", logoUrl: getBrandLogoUrl(brand) };
	});

	const [phase, setPhase] = useState<"enter" | "shuffle" | "done">("enter");
	const [order, setOrder] = useState(() => SHUFFLE_BRANDS.map((_, i) => i));
	const shuffleCount = useRef(0);

	useEffect(() => {
		// Save user interests so Discover page can recommend similar brands
		localStorage.setItem("user-interests", JSON.stringify(selectedInterests));

		// Clear any cached deck order and passed brands so Discover starts fresh
		sessionStorage.removeItem("stak-deck-order");
		localStorage.removeItem("passed-brands");

		// Start with an empty stak — users add stocks from Discover
		localStorage.setItem("my-stak", JSON.stringify([]));
		localStorage.setItem("onboardingCompleted", "true");
		clearProgress();

		// Sync to backend (fire-and-forget)
		updateProfile({
			onboardingCompleted: true,
			preferences: { interests: selectedInterests },
		}).catch(() => {});
		saveStak([]).catch(() => {});
		savePassedBrands([]).catch(() => {});

		// Cards enter, then start shuffling
		const enterTimer = setTimeout(() => setPhase("shuffle"), 600);
		return () => clearTimeout(enterTimer);
	}, []);

	// Revolving logic — rotate positions around the orbit
	useEffect(() => {
		if (phase !== "shuffle") return;

		const interval = setInterval(() => {
			shuffleCount.current += 1;
			setOrder((prev) => {
				// Rotate all positions by 1 step around the orbit
				const next = prev.map((_, idx) => prev[(idx + 1) % prev.length]);
				return next;
			});

			// After 10 rotations, finish and redirect
			if (shuffleCount.current >= 10) {
				clearInterval(interval);
				setPhase("done");
				setTimeout(() => onDone(), 800);
			}
		}, 500);

		return () => clearInterval(interval);
	}, [phase, onDone]);

	return (
		<div className="text-center space-y-8 animate-in fade-in duration-500">
			<div>
				<h1 className="text-2xl font-bold text-white">Building your STAK...</h1>
				<p className="text-slate-400 mt-2">
					Finding the best stocks for you
				</p>
			</div>

			{/* Revolving card carousel */}
			<div className="relative h-[220px] w-[280px] mx-auto flex items-center justify-center">
				{SHUFFLE_BRANDS.map((brand, i) => {
					// Each card gets a position on the orbit based on current order
					const pos = order.indexOf(i);
					const total = SHUFFLE_BRANDS.length;
					const angle = (pos / total) * 360;
					const radians = (angle * Math.PI) / 180;

					// Elliptical orbit: wider horizontally, shallower vertically
					const rx = 90; // horizontal radius
					const ry = 30; // vertical radius (creates depth illusion)
					const x = Math.sin(radians) * rx;
					const y = -Math.cos(radians) * ry;

					// Cards in "front" (bottom of orbit) are bigger, cards in "back" are smaller
					const depthFactor = (1 - Math.cos(radians)) / 2; // 0 = back, 1 = front
					const depthScale = 0.55 + 0.65 * depthFactor; // back: 0.55, front: 1.2
					const depthOpacity = 0.4 + 0.6 * depthFactor;
					// Front cards have higher z-index
					const z = Math.round(depthFactor * 100);
					const isFront = depthFactor > 0.85;

					return (
						<div
							key={brand.id}
							className="absolute flex flex-col items-center justify-center gap-2"
							style={{
								transform: phase === "enter"
									? "scale(0) translateY(40px)"
									: `translateX(${x}px) translateY(${y + (isFront ? 10 : 0)}px) scale(${depthScale})`,
								opacity: phase === "enter" ? 0 : (phase === "done" ? (isFront ? 1 : 0.4) : depthOpacity),
								zIndex: z,
								transition: "all 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
								transitionDelay: phase === "enter" ? `${i * 100}ms` : "0ms",
								filter: isFront ? `drop-shadow(0 0 16px ${brand.color}80)` : "none",
							}}
						>
							<img
								src={brand.logoUrl}
								alt={brand.name}
								className="w-16 h-16 object-contain rounded-2xl"
							/>
							<span className="text-white text-[11px] font-bold">{brand.name}</span>
						</div>
					);
				})}
			</div>

			{/* Loading dots */}
			<div className="flex justify-center gap-1.5">
				{[0, 1, 2].map((i) => (
					<div
						key={i}
						className="w-2 h-2 rounded-full bg-blue-400"
						style={{
							animation: `pulse 1s ease-in-out ${i * 0.2}s infinite`,
							opacity: phase === "done" ? 0 : 1,
							transition: "opacity 0.3s",
						}}
					/>
				))}
			</div>
		</div>
	);
}
