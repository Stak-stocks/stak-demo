import { useEffect, useRef, useState, useCallback } from "react";

const tv = (slug: string) => `https://s3-symbol-logo.tradingview.com/${slug}--600.png`;

const BRANDS = [
	{ name: "Nike", logo: tv("nike"), s: 52 },
	{ name: "Spotify", logo: tv("spotify-technology"), s: 46 },
	{ name: "Tesla", logo: tv("tesla"), s: 50 },
	{ name: "Apple", logo: tv("apple"), s: 48 },
	{ name: "Meta", logo: tv("meta-platforms"), s: 44 },
	{ name: "Netflix", logo: tv("netflix"), s: 50 },
	{ name: "Google", logo: tv("alphabet"), s: 46 },
	{ name: "Disney", logo: tv("walt-disney"), s: 48 },
	{ name: "Uber", logo: tv("uber"), s: 42 },
	{ name: "Nvidia", logo: tv("nvidia"), s: 46 },
	{ name: "Amazon", logo: tv("amazon"), s: 50 },
	{ name: "Starbucks", logo: tv("starbucks"), s: 44 },
	{ name: "PayPal", logo: tv("paypal"), s: 42 },
	{ name: "Airbnb", logo: tv("airbnb"), s: 44 },
	{ name: "Shopify", logo: tv("shopify"), s: 42 },
	{ name: "Mastercard", logo: tv("mastercard"), s: 44 },
	{ name: "Coinbase", logo: tv("coinbase"), s: 42 },
	{ name: "Adobe", logo: tv("adobe"), s: 44 },
	{ name: "Microsoft", logo: tv("microsoft"), s: 48 },
	{ name: "Robinhood", logo: tv("robinhood"), s: 40 },
	{ name: "Visa", logo: tv("visa"), s: 44 },
	{ name: "Walmart", logo: tv("walmart"), s: 46 },
	{ name: "Costco", logo: tv("costco-wholesale"), s: 44 },
	{ name: "Coca-Cola", logo: tv("coca-cola"), s: 42 },
];

interface IconState {
	x: number;       // px
	y: number;       // px
	vx: number;      // velocity px/frame
	vy: number;      // velocity px/frame
	rot: number;     // degrees
	vr: number;      // rotation velocity
	phase: "falling" | "floating";
	opacity: number;
}

export function FloatingBrands() {
	const containerRef = useRef<HTMLDivElement>(null);
	const iconsRef = useRef<IconState[]>([]);
	const rafRef = useRef<number>(0);
	const [ready, setReady] = useState(false);

	const init = useCallback(() => {
		const el = containerRef.current;
		if (!el) return;
		const W = el.clientWidth;
		const H = el.clientHeight;

		// Scatter starting X positions evenly with jitter, start above viewport
		const cols = 6;
		const colW = W / cols;

		iconsRef.current = BRANDS.map((brand, i) => {
			const col = i % cols;
			const row = Math.floor(i / cols);
			const x = col * colW + (Math.random() * 0.6 + 0.2) * colW - brand.s / 2;
			const startY = -(brand.s + 40 + row * 80 + Math.random() * 120);

			return {
				x: Math.max(0, Math.min(x, W - brand.s)),
				y: startY,
				vx: 0,
				vy: 1.5 + Math.random() * 2.5, // fall speed
				rot: Math.random() * 30 - 15,
				vr: (Math.random() - 0.5) * 1.5,
				phase: "falling" as const,
				opacity: 0.45,
			};
		});
		setReady(true);
	}, []);

	useEffect(() => {
		init();
		window.addEventListener("resize", init);
		return () => window.removeEventListener("resize", init);
	}, [init]);

	useEffect(() => {
		if (!ready) return;

		const animate = () => {
			const el = containerRef.current;
			if (!el) return;
			const W = el.clientWidth;
			const H = el.clientHeight;
			const icons = iconsRef.current;
			const BOUNCE_ZONE = H * 0.75; // bottom 25% is the "floor"

			for (let i = 0; i < icons.length; i++) {
				const ic = icons[i];

				if (ic.phase === "falling") {
					// Gravity: accelerate downward
					ic.vy += 0.12;
					ic.y += ic.vy;
					ic.rot += ic.vr;

					// Hit the bounce zone → bounce in a random upward direction
					if (ic.y >= BOUNCE_ZONE) {
						ic.y = BOUNCE_ZONE;
						ic.phase = "floating";
						// Random angle: upward-ish (200° to 340° → pointing up-left to up-right)
						const angle = (200 + Math.random() * 140) * (Math.PI / 180);
						const speed = 1 + Math.random() * 1.5;
						ic.vx = Math.cos(angle) * speed;
						ic.vy = Math.sin(angle) * speed;
						ic.vr = (Math.random() - 0.5) * 0.8;
					}
				} else {
					// Floating: gentle drift, bounce off all walls
					ic.x += ic.vx;
					ic.y += ic.vy;
					ic.rot += ic.vr;

					// Add very subtle random wobble for organic feel
					ic.vx += (Math.random() - 0.5) * 0.02;
					ic.vy += (Math.random() - 0.5) * 0.02;

					// Clamp speed so they don't get too fast or too slow
					const speed = Math.sqrt(ic.vx * ic.vx + ic.vy * ic.vy);
					const minSpeed = 0.3;
					const maxSpeed = 1.8;
					if (speed < minSpeed) {
						const scale = minSpeed / Math.max(speed, 0.01);
						ic.vx *= scale;
						ic.vy *= scale;
					} else if (speed > maxSpeed) {
						const scale = maxSpeed / speed;
						ic.vx *= scale;
						ic.vy *= scale;
					}

					// Wall bounces
					const s = BRANDS[i].s;
					if (ic.x <= 0) { ic.x = 0; ic.vx = Math.abs(ic.vx); ic.vr = (Math.random() - 0.5) * 0.6; }
					if (ic.x >= W - s) { ic.x = W - s; ic.vx = -Math.abs(ic.vx); ic.vr = (Math.random() - 0.5) * 0.6; }
					if (ic.y <= 0) { ic.y = 0; ic.vy = Math.abs(ic.vy); ic.vr = (Math.random() - 0.5) * 0.6; }
					if (ic.y >= H - s) { ic.y = H - s; ic.vy = -Math.abs(ic.vy); ic.vr = (Math.random() - 0.5) * 0.6; }
				}
			}

			// Push apart overlapping icons
			for (let a = 0; a < icons.length; a++) {
				for (let b = a + 1; b < icons.length; b++) {
					const ia = icons[a];
					const ib = icons[b];
					const sa = BRANDS[a].s;
					const sb = BRANDS[b].s;
					const ax = ia.x + sa / 2;
					const ay = ia.y + sa / 2;
					const bx = ib.x + sb / 2;
					const by = ib.y + sb / 2;
					const dx = bx - ax;
					const dy = by - ay;
					const dist = Math.sqrt(dx * dx + dy * dy);
					const minDist = (sa + sb) / 2 + 4;
					if (dist < minDist && dist > 0) {
						const push = (minDist - dist) * 0.3;
						const nx = dx / dist;
						const ny = dy / dist;
						if (ia.phase === "floating") { ia.x -= nx * push; ia.y -= ny * push; }
						if (ib.phase === "floating") { ib.x += nx * push; ib.y += ny * push; }
					}
				}
			}

			// Apply transforms to DOM
			const children = el.children;
			for (let i = 0; i < icons.length; i++) {
				const child = children[i] as HTMLElement;
				if (!child) continue;
				const ic = icons[i];
				child.style.transform = `translate(${ic.x.toFixed(1)}px, ${ic.y.toFixed(1)}px) rotate(${ic.rot.toFixed(1)}deg)`;
				child.style.opacity = String(ic.opacity);
			}

			rafRef.current = requestAnimationFrame(animate);
		};

		rafRef.current = requestAnimationFrame(animate);
		return () => cancelAnimationFrame(rafRef.current);
	}, [ready]);

	return (
		<div
			ref={containerRef}
			className="absolute inset-0 overflow-hidden pointer-events-none select-none"
			aria-hidden
		>
			{BRANDS.map((brand) => (
				<div
					key={brand.name}
					className="absolute top-0 left-0 will-change-transform"
					style={{ width: brand.s, height: brand.s, opacity: 0 }}
				>
					<div className="w-full h-full rounded-xl bg-white/5 backdrop-blur-[2px] border border-white/[0.06] p-1.5 shadow-lg shadow-black/20">
						<img
							src={brand.logo}
							alt={brand.name}
							className="w-full h-full object-contain rounded-lg"
							loading="lazy"
						/>
					</div>
				</div>
			))}
		</div>
	);
}
