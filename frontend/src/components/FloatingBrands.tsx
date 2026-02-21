import { useEffect, useRef, useState, useCallback } from "react";

const tv = (slug: string) => `https://s3-symbol-logo.tradingview.com/${slug}--600.png`;

const BRANDS = [
	{ name: "Nike", logo: tv("nike"), s: 44 },
	{ name: "Spotify", logo: tv("spotify-technology"), s: 40 },
	{ name: "Tesla", logo: tv("tesla"), s: 42 },
	{ name: "Apple", logo: tv("apple"), s: 42 },
	{ name: "Meta", logo: tv("meta-platforms"), s: 38 },
	{ name: "Netflix", logo: tv("netflix"), s: 42 },
	{ name: "Google", logo: tv("alphabet"), s: 40 },
	{ name: "Disney", logo: tv("walt-disney"), s: 42 },
	{ name: "Uber", logo: tv("uber"), s: 36 },
	{ name: "Nvidia", logo: tv("nvidia"), s: 40 },
	{ name: "Amazon", logo: tv("amazon"), s: 42 },
	{ name: "Starbucks", logo: tv("starbucks"), s: 38 },
	{ name: "PayPal", logo: tv("paypal"), s: 36 },
	{ name: "Airbnb", logo: tv("airbnb"), s: 38 },
	{ name: "Shopify", logo: tv("shopify"), s: 36 },
	{ name: "Mastercard", logo: tv("mastercard"), s: 38 },
	{ name: "Coinbase", logo: tv("coinbase"), s: 36 },
	{ name: "Adobe", logo: tv("adobe"), s: 38 },
	{ name: "Microsoft", logo: tv("microsoft"), s: 42 },
	{ name: "Robinhood", logo: tv("robinhood"), s: 34 },
	{ name: "Visa", logo: tv("visa"), s: 38 },
	{ name: "Walmart", logo: tv("walmart"), s: 40 },
	{ name: "Costco", logo: tv("costco-wholesale"), s: 38 },
	{ name: "Coca-Cola", logo: tv("coca-cola"), s: 36 },
];

interface IconState {
	homeX: number;   // grid home position
	homeY: number;
	x: number;
	y: number;
	angle: number;   // current wander angle (radians)
	speed: number;   // wander speed
	rot: number;
	vr: number;
	opacity: number;
	fadeIn: number;   // 0→1 fade progress
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

		// Create an even grid that fills the entire space
		const count = BRANDS.length;
		const cols = Math.ceil(Math.sqrt(count * (W / H)));
		const rows = Math.ceil(count / cols);
		const cellW = W / cols;
		const cellH = H / rows;

		// Shuffle indices for variety
		const indices = Array.from({ length: count }, (_, i) => i);
		for (let i = indices.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[indices[i], indices[j]] = [indices[j], indices[i]];
		}

		iconsRef.current = BRANDS.map((brand, origIdx) => {
			const gridIdx = indices[origIdx];
			const col = gridIdx % cols;
			const row = Math.floor(gridIdx / cols);

			// Place in center of cell with random jitter (±30% of cell)
			const jitterX = (Math.random() - 0.5) * cellW * 0.6;
			const jitterY = (Math.random() - 0.5) * cellH * 0.6;
			const homeX = Math.max(brand.s / 2, Math.min(W - brand.s / 2, (col + 0.5) * cellW + jitterX));
			const homeY = Math.max(brand.s / 2, Math.min(H - brand.s / 2, (row + 0.5) * cellH + jitterY));

			return {
				homeX,
				homeY,
				x: homeX,
				y: homeY,
				angle: Math.random() * Math.PI * 2,
				speed: 0.15 + Math.random() * 0.25,
				rot: Math.random() * 20 - 10,
				vr: (Math.random() - 0.5) * 0.15,
				opacity: 0,
				fadeIn: 0,
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

			for (let i = 0; i < icons.length; i++) {
				const ic = icons[i];
				const s = BRANDS[i].s;

				// Fade in gradually
				if (ic.fadeIn < 1) {
					ic.fadeIn = Math.min(1, ic.fadeIn + 0.008);
					ic.opacity = ic.fadeIn * 0.5;
				}

				// Gentle wandering: slowly change direction
				ic.angle += (Math.random() - 0.5) * 0.04;
				ic.x += Math.cos(ic.angle) * ic.speed;
				ic.y += Math.sin(ic.angle) * ic.speed;
				ic.rot += ic.vr;

				// Soft pull back toward home position (keeps them evenly spread)
				const dx = ic.homeX - ic.x;
				const dy = ic.homeY - ic.y;
				const dist = Math.sqrt(dx * dx + dy * dy);
				const cols = Math.ceil(Math.sqrt(BRANDS.length * (W / H)));
				const rows = Math.ceil(BRANDS.length / cols);
				const maxWander = Math.min(W / cols, H / rows) * 0.4;

				if (dist > maxWander * 0.5) {
					// Steer back toward home
					const pullStrength = 0.003 * (dist / maxWander);
					ic.x += dx * pullStrength;
					ic.y += dy * pullStrength;
				}

				// Keep within bounds
				if (ic.x < s / 2) { ic.x = s / 2; ic.angle = Math.PI - ic.angle; }
				if (ic.x > W - s / 2) { ic.x = W - s / 2; ic.angle = Math.PI - ic.angle; }
				if (ic.y < s / 2) { ic.y = s / 2; ic.angle = -ic.angle; }
				if (ic.y > H - s / 2) { ic.y = H - s / 2; ic.angle = -ic.angle; }
			}

			// Apply transforms to DOM
			const children = el.children;
			for (let i = 0; i < icons.length; i++) {
				const child = children[i] as HTMLElement;
				if (!child) continue;
				const ic = icons[i];
				const s = BRANDS[i].s;
				child.style.transform = `translate(${(ic.x - s / 2).toFixed(1)}px, ${(ic.y - s / 2).toFixed(1)}px) rotate(${ic.rot.toFixed(1)}deg)`;
				child.style.opacity = String(ic.opacity.toFixed(2));
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
					<div className="w-full h-full rounded-full bg-white/5 backdrop-blur-[2px] border border-white/[0.06] p-1.5 shadow-lg shadow-black/20">
						<img
							src={brand.logo}
							alt={brand.name}
							className="w-full h-full object-contain rounded-full"
							loading="lazy"
						/>
					</div>
				</div>
			))}
		</div>
	);
}
