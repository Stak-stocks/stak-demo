import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useRef, useEffect, type MouseEvent, type TouchEvent } from "react";
import { useAuth } from "../context/AuthContext";
import { updateProfile, saveStak } from "@/lib/api";
import { FloatingBrands } from "@/components/FloatingBrands";
import { brands as allBrands } from "@/data/brands";
import {
	ACTIVITY_OPTIONS,
	MOTIVATION_OPTIONS,
	FAMILIARITY_OPTIONS,
	ACTIVITY_TO_BRANDS,
	ONBOARDING_SWIPE_BRAND_IDS,
} from "@/data/onboarding";

export const Route = createFileRoute("/onboarding")({
	component: OnboardingPage,
});

const fl = (d: string) => `https://www.google.com/s2/favicons?domain=${d}&sz=128`;

const SWIPE_BRANDS = ONBOARDING_SWIPE_BRAND_IDS.map((id) => {
	const brand = allBrands.find((b) => b.id === id);
	return brand
		? { id: brand.id, name: brand.name, image: brand.heroImage, ticker: brand.ticker }
		: null;
}).filter(Boolean) as { id: string; name: string; image: string; ticker: string }[];

// Domain mapping for favicons
const BRAND_DOMAINS: Record<string, string> = {
	tsla: "tesla.com",
	aapl: "apple.com",
	nke: "nike.com",
	spot: "spotify.com",
	nflx: "netflix.com",
	sbux: "starbucks.com",
	amzn: "amazon.com",
	dis: "disney.com",
};

// ─── Progress persistence ────────────────────────────────────────────────────

const PROGRESS_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

interface OnboardingProgress {
	step: number;
	selectedActivities: string[];
	swipedRight: string[];
	selectedMotivations: string[];
	selectedFamiliarity: string | null;
	lastUpdated: number;
}

function loadProgress(): OnboardingProgress | null {
	try {
		const raw = localStorage.getItem("onboardingProgress");
		if (!raw) return null;
		const progress = JSON.parse(raw) as OnboardingProgress;
		// Expire progress older than 1 hour
		if (progress.lastUpdated && Date.now() - progress.lastUpdated > PROGRESS_EXPIRY_MS) {
			localStorage.removeItem("onboardingProgress");
			updateProfile({ onboardingProgress: null }).catch(() => {});
			return null;
		}
		return progress;
	} catch {
		return null;
	}
}

function saveProgress(progress: OnboardingProgress) {
	const withTimestamp = { ...progress, lastUpdated: Date.now() };
	localStorage.setItem("onboardingProgress", JSON.stringify(withTimestamp));
	// Sync to backend for cross-device resume (fire-and-forget)
	updateProfile({ onboardingProgress: withTimestamp }).catch(() => {});
}

function clearProgress() {
	localStorage.removeItem("onboardingProgress");
	// Clear from backend too
	updateProfile({ onboardingProgress: null }).catch(() => {});
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

	// Load saved progress or start fresh
	const saved = loadProgress();
	const [step, setStep] = useState(saved?.step ?? 0);
	const [selectedActivities, setSelectedActivities] = useState<string[]>(saved?.selectedActivities ?? []);
	const [swipedRight, setSwipedRight] = useState<string[]>(saved?.swipedRight ?? []);
	const [selectedMotivations, setSelectedMotivations] = useState<string[]>(saved?.selectedMotivations ?? []);
	const [selectedFamiliarity, setSelectedFamiliarity] = useState<string | null>(saved?.selectedFamiliarity ?? null);

	// Save progress whenever state changes
	useEffect(() => {
		if (step < 5) {
			saveProgress({ step, selectedActivities, swipedRight, selectedMotivations, selectedFamiliarity });
		}
	}, [step, selectedActivities, swipedRight, selectedMotivations, selectedFamiliarity]);

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
		<ActivitiesStep
			key="activities"
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
			selectedActivities={selectedActivities}
			swipedRight={swipedRight}
			onDone={() => navigate({ to: "/" })}
		/>,
	];

	return (
		<div className="relative flex flex-col items-center justify-center min-h-screen bg-[#0f1629] px-6 overflow-hidden">
			<FloatingBrands />

			{/* Back button (not on welcome or building steps) */}
			{step > 0 && step < 5 && <BackButton onClick={() => goTo(step - 1)} />}

			{/* Progress dots */}
			{step < 5 && (
				<div className="absolute top-8 left-1/2 -translate-x-1/2 flex gap-2">
					{[0, 1, 2, 3, 4].map((i) => (
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
					Discover brands you love. Build your portfolio. Compete with friends.
				</p>
			</div>

			<button
				type="button"
				onClick={onNext}
				className="w-full py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-600 hover:to-orange-500 transition-all active:scale-[0.98] shadow-lg shadow-orange-500/25"
			>
				Let's get started
			</button>
		</div>
	);
}

// ─── Step 2: Activities ─────────────────────────────────────────────────────────

function ActivitiesStep({
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
				{ACTIVITY_OPTIONS.map((activity) => (
					<button
						key={activity.id}
						type="button"
						onClick={() => onToggle(activity.id)}
						className={`flex flex-col items-center gap-1.5 py-4 px-2 rounded-xl border transition-all active:scale-95 ${
							selected.includes(activity.id)
								? "bg-orange-500/20 border-orange-500 text-white"
								: "bg-[#1a2332] border-slate-700 text-slate-300 hover:border-slate-500"
						}`}
					>
						<span className="text-2xl">{activity.emoji}</span>
						<span className="text-xs font-medium">{activity.label}</span>
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
	onSwipeRight,
	onNext,
}: {
	onSwipeRight: (id: string) => void;
	onNext: () => void;
}) {
	const [currentIndex, setCurrentIndex] = useState(0);
	const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
	const [isDragging, setIsDragging] = useState(false);
	const dragStartPos = useRef({ x: 0, y: 0 });
	const isProcessing = useRef(false);

	const done = currentIndex >= SWIPE_BRANDS.length;

	const handleDragStart = (clientX: number, clientY: number) => {
		if (done) return;
		setIsDragging(true);
		dragStartPos.current = { x: clientX, y: clientY };
	};

	const handleDragMove = (clientX: number, clientY: number) => {
		if (!isDragging) return;
		setDragOffset({
			x: clientX - dragStartPos.current.x,
			y: clientY - dragStartPos.current.y,
		});
	};

	const handleDragEnd = () => {
		if (!isDragging || isProcessing.current) return;
		const threshold = 80;
		if (Math.abs(dragOffset.x) > threshold) {
			isProcessing.current = true;
			setIsDragging(false);
			const exitDir = dragOffset.x > 0 ? 800 : -800;
			const isRight = dragOffset.x > 0;
			const brand = SWIPE_BRANDS[currentIndex];

			setDragOffset({ x: exitDir, y: dragOffset.y });

			if (isRight && brand) {
				onSwipeRight(brand.id);
			}

			setTimeout(() => {
				setCurrentIndex((prev) => prev + 1);
				setDragOffset({ x: 0, y: 0 });
				isProcessing.current = false;
			}, 250);
		} else {
			setDragOffset({ x: 0, y: 0 });
			setIsDragging(false);
		}
	};

	const onMouseDown = (e: MouseEvent<HTMLDivElement>) => handleDragStart(e.clientX, e.clientY);
	const onMouseMove = (e: MouseEvent<HTMLDivElement>) => handleDragMove(e.clientX, e.clientY);
	const onMouseUp = () => handleDragEnd();
	const onTouchStart = (e: TouchEvent<HTMLDivElement>) => {
		const t = e.touches[0];
		handleDragStart(t.clientX, t.clientY);
	};
	const onTouchMove = (e: TouchEvent<HTMLDivElement>) => {
		const t = e.touches[0];
		handleDragMove(t.clientX, t.clientY);
	};
	const onTouchEnd = () => handleDragEnd();

	const rotation = dragOffset.x * 0.04;
	const tintOpacity = Math.min(Math.abs(dragOffset.x) / 150, 0.4);

	return (
		<div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-400">
			<div className="text-center">
				<h1 className="text-2xl font-bold text-white">Swipe to discover</h1>
				<p className="text-slate-400 mt-1">
					Swipe right on brands you like, left to skip
				</p>
			</div>

			<div className="relative w-full h-[320px] flex items-center justify-center">
				{done ? (
					<div className="text-center space-y-3">
						<p className="text-xl font-bold text-white">Nice picks!</p>
						<p className="text-slate-400">Let's keep going</p>
					</div>
				) : (
					<>
						{/* Stacked cards behind */}
						{SWIPE_BRANDS.slice(currentIndex + 1, currentIndex + 3).map((brand, i) => (
							<div
								key={brand.id}
								className="absolute inset-0 flex items-center justify-center"
								style={{
									transform: `scale(${0.92 - i * 0.04}) translateY(${(i + 1) * 10}px)`,
									opacity: 0.15,
									zIndex: 2 - i,
								}}
							>
								<div className="w-64 h-72 rounded-2xl bg-[#1a2332] border border-slate-700 flex flex-col items-center justify-center gap-4 p-6">
									<img
										src={fl(BRAND_DOMAINS[brand.id] || `${brand.name.toLowerCase()}.com`)}
										alt={brand.name}
										className="w-16 h-16 rounded-xl object-contain"
									/>
									<span className="text-white font-bold text-lg">{brand.name}</span>
								</div>
							</div>
						))}

						{/* Top card */}
						<div
							className="absolute inset-0 flex items-center justify-center cursor-grab active:cursor-grabbing"
							style={{
								transform: `translateX(${dragOffset.x}px) translateY(${dragOffset.y * 0.3}px) rotate(${rotation}deg)`,
								transition: isDragging ? "none" : "transform 0.25s ease-out",
								zIndex: 10,
								touchAction: "none",
							}}
							onMouseDown={onMouseDown}
							onMouseMove={isDragging ? onMouseMove : undefined}
							onMouseUp={isDragging ? onMouseUp : undefined}
							onMouseLeave={isDragging ? onMouseUp : undefined}
							onTouchStart={onTouchStart}
							onTouchMove={isDragging ? onTouchMove : undefined}
							onTouchEnd={isDragging ? onTouchEnd : undefined}
						>
							{/* Swipe tint */}
							{isDragging && Math.abs(dragOffset.x) > 20 && (
								<div
									className="absolute inset-0 flex items-center justify-center rounded-2xl pointer-events-none z-10"
									style={{
										backgroundColor:
											dragOffset.x > 0
												? `rgba(34, 197, 94, ${tintOpacity})`
												: `rgba(239, 68, 68, ${tintOpacity})`,
									}}
								>
									<span
										className={`text-4xl font-black ${
											dragOffset.x > 0 ? "text-green-400" : "text-red-400"
										}`}
										style={{ opacity: Math.min(Math.abs(dragOffset.x) / 100, 1) }}
									>
										{dragOffset.x > 0 ? "STAK" : "PASS"}
									</span>
								</div>
							)}

							<div className="w-64 h-72 rounded-2xl bg-[#1a2332] border border-slate-700 flex flex-col items-center justify-center gap-4 p-6 overflow-hidden">
								<img
									src={SWIPE_BRANDS[currentIndex].image}
									alt={SWIPE_BRANDS[currentIndex].name}
									className="w-full h-40 rounded-xl object-cover"
								/>
								<div className="text-center">
									<p className="text-white font-bold text-lg">
										{SWIPE_BRANDS[currentIndex].name}
									</p>
									<p className="text-slate-400 text-sm">
										${SWIPE_BRANDS[currentIndex].ticker}
									</p>
								</div>
							</div>
						</div>
					</>
				)}
			</div>

			{/* Card counter */}
			{!done && (
				<div className="text-center text-sm text-slate-500">
					{currentIndex + 1} / {SWIPE_BRANDS.length}
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
				<h1 className="text-2xl font-bold text-white">What brings you here?</h1>
				<p className="text-slate-400 mt-1">Select all that apply</p>
			</div>

			<div className="space-y-3">
				{MOTIVATION_OPTIONS.map((option) => (
					<button
						key={option}
						type="button"
						onClick={() => onToggle(option)}
						className={`w-full text-left py-4 px-5 rounded-xl border transition-all active:scale-[0.98] ${
							selected.includes(option)
								? "bg-orange-500/20 border-orange-500 text-white"
								: "bg-[#1a2332] border-slate-700 text-slate-300 hover:border-slate-500"
						}`}
					>
						{option}
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
				<h1 className="text-2xl font-bold text-white">How familiar are you with investing?</h1>
				<p className="text-slate-400 mt-1">No wrong answers here</p>
			</div>

			<div className="space-y-3">
				{FAMILIARITY_OPTIONS.map((option) => (
					<button
						key={option.id}
						type="button"
						onClick={() => onSelect(option.id)}
						className={`w-full text-left py-4 px-5 rounded-xl border transition-all active:scale-[0.98] ${
							selected === option.id
								? "bg-orange-500/20 border-orange-500 text-white"
								: "bg-[#1a2332] border-slate-700 text-slate-300 hover:border-slate-500"
						}`}
					>
						<p className="font-semibold">{option.label}</p>
						<p className="text-sm text-slate-400 mt-0.5">{option.description}</p>
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
	selectedActivities,
	swipedRight,
	onDone,
}: {
	selectedActivities: string[];
	swipedRight: string[];
	onDone: () => void;
}) {
	useEffect(() => {
		// Collect brand IDs from activity selections
		const activityBrandIds = new Set<string>();
		for (const activity of selectedActivities) {
			const brandIds = ACTIVITY_TO_BRANDS[activity];
			if (brandIds) {
				for (const id of brandIds) {
					activityBrandIds.add(id);
				}
			}
		}

		// Combine with swiped-right brands
		for (const id of swipedRight) {
			activityBrandIds.add(id);
		}

		// Find matching full brand objects
		const seededBrands = allBrands.filter((b) => activityBrandIds.has(b.id));

		// Merge with any existing my-stak (don't overwrite)
		const existing = localStorage.getItem("my-stak");
		const existingBrands = existing ? JSON.parse(existing) : [];
		const existingIds = new Set(existingBrands.map((b: { id: string }) => b.id));
		const newBrands = seededBrands.filter((b) => !existingIds.has(b.id));
		const merged = [...existingBrands, ...newBrands];

		localStorage.setItem("my-stak", JSON.stringify(merged));
		localStorage.setItem("onboardingCompleted", "true");
		clearProgress();

		// Sync to backend (fire-and-forget)
		updateProfile({ onboardingCompleted: true }).catch(() => {});
		saveStak(merged.map((b: { id: string }) => b.id)).catch(() => {});

		const timer = setTimeout(onDone, 2500);
		return () => clearTimeout(timer);
	}, [selectedActivities, swipedRight, onDone]);

	return (
		<div className="text-center space-y-8 animate-in fade-in duration-500">
			<div className="flex items-center justify-center">
				<div className="relative">
					<div className="w-20 h-20 border-4 border-orange-400 border-t-transparent rounded-full animate-spin" />
					<div className="absolute inset-0 flex items-center justify-center">
						<svg
							width="32"
							height="32"
							viewBox="0 0 24 24"
							fill="none"
							className="text-orange-400"
						>
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
					</div>
				</div>
			</div>

			<div>
				<h1 className="text-2xl font-bold text-white">Building your STAK...</h1>
				<p className="text-slate-400 mt-2">
					We're curating brands just for you
				</p>
			</div>
		</div>
	);
}
