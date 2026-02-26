import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "../context/AuthContext";
import { useEffect, useRef } from "react";

export const Route = createFileRoute("/welcome")({
	component: LandingPage,
});

/* ── Animated starfield / particle background ── */
function ParticleBackground() {
	const canvasRef = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		let animId: number;
		let width = 0;
		let height = 0;

		interface Particle {
			x: number;
			y: number;
			r: number;
			dx: number;
			dy: number;
			opacity: number;
			pulse: number;
			pulseSpeed: number;
			color: string;
		}

		const COLORS = [
			"rgba(139,92,246,",   // purple
			"rgba(6,182,212,",    // cyan
			"rgba(249,115,22,",   // orange
			"rgba(59,130,246,",   // blue
			"rgba(255,255,255,",  // white
			"rgba(255,255,255,",  // white (more white particles)
			"rgba(255,255,255,",
		];

		let particles: Particle[] = [];

		function resize() {
			width = canvas!.width = window.innerWidth;
			height = canvas!.height = window.innerHeight;
			initParticles();
		}

		function initParticles() {
			const count = Math.floor((width * height) / 4000);
			particles = [];
			for (let i = 0; i < count; i++) {
				particles.push({
					x: Math.random() * width,
					y: Math.random() * height,
					r: Math.random() * 1.8 + 0.3,
					dx: (Math.random() - 0.5) * 0.15,
					dy: (Math.random() - 0.5) * 0.1,
					opacity: Math.random() * 0.6 + 0.15,
					pulse: Math.random() * Math.PI * 2,
					pulseSpeed: Math.random() * 0.008 + 0.003,
					color: COLORS[Math.floor(Math.random() * COLORS.length)],
				});
			}
		}

		function draw() {
			ctx!.clearRect(0, 0, width, height);

			// Draw subtle radial glow in center-top area
			const grd = ctx!.createRadialGradient(width / 2, height * 0.25, 0, width / 2, height * 0.25, width * 0.5);
			grd.addColorStop(0, "rgba(139,92,246,0.03)");
			grd.addColorStop(0.5, "rgba(6,182,212,0.015)");
			grd.addColorStop(1, "rgba(0,0,0,0)");
			ctx!.fillStyle = grd;
			ctx!.fillRect(0, 0, width, height);

			for (const p of particles) {
				p.pulse += p.pulseSpeed;
				const flickerOpacity = p.opacity + Math.sin(p.pulse) * 0.15;
				const finalOpacity = Math.max(0.05, Math.min(0.8, flickerOpacity));

				ctx!.beginPath();
				ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
				ctx!.fillStyle = `${p.color}${finalOpacity})`;
				ctx!.fill();

				// Subtle glow for larger particles
				if (p.r > 1.2) {
					ctx!.beginPath();
					ctx!.arc(p.x, p.y, p.r * 3, 0, Math.PI * 2);
					ctx!.fillStyle = `${p.color}${finalOpacity * 0.12})`;
					ctx!.fill();
				}

				p.x += p.dx;
				p.y += p.dy;

				// Wrap around edges
				if (p.x < -5) p.x = width + 5;
				if (p.x > width + 5) p.x = -5;
				if (p.y < -5) p.y = height + 5;
				if (p.y > height + 5) p.y = -5;
			}

			animId = requestAnimationFrame(draw);
		}

		resize();
		draw();

		const resizeObserver = new ResizeObserver(() => resize());
		resizeObserver.observe(document.documentElement);

		return () => {
			cancelAnimationFrame(animId);
			resizeObserver.disconnect();
		};
	}, []);

	return (
		<canvas
			ref={canvasRef}
			className="fixed inset-0 pointer-events-none"
			style={{ zIndex: 0 }}
		/>
	);
}

function LandingPage() {
	const { user, loading } = useAuth();
	const navigate = useNavigate();

	// If already logged in, skip to home or onboarding
	useEffect(() => {
		if (!loading && user) {
			if (localStorage.getItem("onboardingCompleted") === "false") {
				navigate({ to: "/onboarding" });
			} else {
				navigate({ to: "/" });
			}
		}
	}, [user, loading, navigate]);

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-screen bg-[#0b0f1a]">
				<div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
			</div>
		);
	}

	return (
		<div className="relative min-h-screen bg-[#0b0f1a] text-white flex flex-col overflow-x-hidden">
			<ParticleBackground />

			{/* All content sits above the canvas */}
			<div className="relative z-10 flex flex-col min-h-screen">

				{/* ── Navbar ── */}
				<nav className="w-full px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
					<div className="flex items-center gap-2">
						<svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-white">
							<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
							<path d="M3.27 6.96 12 12.01l8.73-5.05M12 22.08V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
						</svg>
						<span className="text-white text-xl font-bold tracking-wider">STAK</span>
					</div>

					<div className="hidden md:flex items-center gap-8 text-sm text-slate-300">
						<a href="#home" className="hover:text-white transition-colors">Home</a>
						<a href="#features" className="hover:text-white transition-colors">Features</a>
						<a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
						<a href="#blog" className="hover:text-white transition-colors">Blog</a>
						<a href="#pro" className="hover:text-white transition-colors">Pro</a>
					</div>

					<button
						type="button"
						onClick={() => navigate({ to: "/login" })}
						className="px-5 py-2 rounded-full bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold transition-colors"
					>
						Sign In
					</button>
				</nav>

				{/* ── Hero ── */}
				<section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-16 max-w-3xl mx-auto">
					<h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight">
						Invest in what you love.
					</h1>
					<p className="text-slate-400 mt-4 text-base sm:text-lg max-w-xl">
						Discover stocks through brands you already know and build a personalized investment portfolio with STAK.
					</p>

					<div className="flex items-center gap-4 mt-8">
						<button
							type="button"
							onClick={() => navigate({ to: "/signup" })}
							className="px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-600 hover:to-orange-500 transition-all active:scale-[0.98] shadow-lg shadow-orange-500/25"
						>
							Get Started
						</button>
						<button
							type="button"
							onClick={() => {
								document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
							}}
							className="px-6 py-3 rounded-xl font-semibold text-white border border-slate-600 hover:border-slate-400 transition-all active:scale-[0.98]"
						>
							Learn More
						</button>
					</div>
				</section>

				{/* ── Features ── */}
				<section id="features" className="px-6 py-16 max-w-5xl mx-auto w-full">
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
						<div className="rounded-2xl bg-[#141a2e]/80 backdrop-blur-sm border border-slate-700/50 p-6 flex flex-col gap-3">
							{/* Bar chart icon */}
							<svg width="32" height="32" viewBox="0 0 32 32" fill="none">
								<rect x="4" y="18" width="6" height="10" rx="1" fill="#f97316" />
								<rect x="13" y="10" width="6" height="18" rx="1" fill="#ef4444" />
								<rect x="22" y="4" width="6" height="24" rx="1" fill="#f97316" />
							</svg>
							<h3 className="text-base font-bold">Discover Stocks</h3>
							<p className="text-slate-400 text-sm leading-relaxed">
								Explore stocks through the brands and products you love.
							</p>
						</div>
						<div className="rounded-2xl bg-[#141a2e]/80 backdrop-blur-sm border border-slate-700/50 p-6 flex flex-col gap-3">
							{/* Connected dots icon */}
							<svg width="32" height="32" viewBox="0 0 32 32" fill="none">
								<line x1="8" y1="8" x2="16" y2="20" stroke="#22c55e" strokeWidth="2" />
								<line x1="16" y1="20" x2="24" y2="10" stroke="#22c55e" strokeWidth="2" />
								<line x1="16" y1="20" x2="24" y2="24" stroke="#22c55e" strokeWidth="2" />
								<circle cx="8" cy="8" r="4" fill="#22c55e" />
								<circle cx="16" cy="20" r="4" fill="#16a34a" />
								<circle cx="24" cy="10" r="3" fill="#22c55e" />
								<circle cx="24" cy="24" r="3" fill="#22c55e" />
							</svg>
							<h3 className="text-base font-bold">Personalized Portfolio</h3>
							<p className="text-slate-400 text-sm leading-relaxed">
								Build a portfolio tailored to your preferences and interests.
							</p>
						</div>
						<div className="rounded-2xl bg-[#141a2e]/80 backdrop-blur-sm border border-slate-700/50 p-6 flex flex-col gap-3">
							{/* Lightbulb icon */}
							<svg width="32" height="32" viewBox="0 0 32 32" fill="none">
								<path d="M16 4C11.58 4 8 7.58 8 12c0 2.76 1.4 5.2 3.53 6.63.37.25.6.66.6 1.12V22a2 2 0 002 2h3.74a2 2 0 002-2v-2.25c0-.46.23-.87.6-1.12A8 8 0 0024 12c0-4.42-3.58-8-8-8z" fill="#3b82f6" />
								<rect x="12" y="24" width="8" height="2" rx="1" fill="#60a5fa" />
								<rect x="13" y="27" width="6" height="2" rx="1" fill="#60a5fa" />
								<path d="M14 12h4M16 10v4" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />
							</svg>
							<h3 className="text-base font-bold">Smart Insights</h3>
							<p className="text-slate-400 text-sm leading-relaxed">
								Get real-time insights and expert tips to make informed decisions.
							</p>
						</div>
					</div>
				</section>

				{/* ── App Store Badges ── */}
				<section className="flex flex-col items-center gap-3 px-6 py-8">
					<div className="flex items-center justify-center gap-4">
						<button
							type="button"
							onClick={() => alert("Coming soon! STAK will be available on the App Store.")}
							className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#141a2e]/80 backdrop-blur-sm border border-slate-700/50 hover:border-slate-500 hover:bg-[#1a2340] transition-all active:scale-95 cursor-pointer"
						>
							<svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="currentColor">
								<path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
							</svg>
							<div className="text-left">
								<p className="text-[10px] text-slate-400 leading-none">Download on the</p>
								<p className="text-sm font-semibold leading-tight">App Store</p>
							</div>
						</button>
						<button
							type="button"
							onClick={() => alert("Coming soon! STAK will be available on Google Play.")}
							className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#141a2e]/80 backdrop-blur-sm border border-slate-700/50 hover:border-slate-500 hover:bg-[#1a2340] transition-all active:scale-95 cursor-pointer"
						>
							<svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="currentColor">
								<path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.199l2.302 2.302a1 1 0 010 1.38l-2.302 2.302L15.32 12l2.378-2.492zM5.864 2.658L16.8 9.99l-2.302 2.302-8.634-8.634z" />
							</svg>
							<div className="text-left">
								<p className="text-[10px] text-slate-400 leading-none">Get it on</p>
								<p className="text-sm font-semibold leading-tight">Google Play</p>
							</div>
						</button>
					</div>
					<p className="text-slate-500 text-xs font-medium">Coming Soon</p>
				</section>

				{/* ── Footer ── */}
				<footer className="px-6 py-8 flex flex-col items-center gap-2 border-t border-slate-800/50">
					<div className="flex items-center gap-2">
						<svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-white">
							<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
							<path d="M3.27 6.96 12 12.01l8.73-5.05M12 22.08V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
						</svg>
						<span className="text-white text-lg font-bold tracking-wider">STAK</span>
					</div>
					<p className="text-slate-500 text-xs">&copy; 2026 STAK. All rights reserved.</p>
				</footer>
			</div>
		</div>
	);
}
