const tv = (slug: string) => `https://s3-symbol-logo.tradingview.com/${slug}--600.png`;

/* ── Brand icons with TradingView logos ── */
const BRANDS = [
	{ name: "Nike", logo: tv("nike"), s: 58 },
	{ name: "Spotify", logo: tv("spotify-technology"), s: 52 },
	{ name: "Tesla", logo: tv("tesla"), s: 56 },
	{ name: "Apple", logo: tv("apple"), s: 54 },
	{ name: "Meta", logo: tv("meta-platforms"), s: 50 },
	{ name: "Netflix", logo: tv("netflix"), s: 56 },
	{ name: "Google", logo: tv("alphabet"), s: 52 },
	{ name: "Disney", logo: tv("walt-disney"), s: 54 },
	{ name: "Uber", logo: tv("uber"), s: 48 },
	{ name: "Nvidia", logo: tv("nvidia"), s: 52 },
	{ name: "Amazon", logo: tv("amazon"), s: 56 },
	{ name: "Samsung", logo: tv("samsung-electronics"), s: 50 },
	{ name: "Starbucks", logo: tv("starbucks"), s: 50 },
	{ name: "PayPal", logo: tv("paypal"), s: 48 },
	{ name: "Airbnb", logo: tv("airbnb"), s: 50 },
	{ name: "Shopify", logo: tv("shopify"), s: 48 },
	{ name: "Mastercard", logo: tv("mastercard"), s: 50 },
	{ name: "Snapchat", logo: tv("snap"), s: 46 },
	{ name: "Dropbox", logo: tv("dropbox"), s: 46 },
	{ name: "BMW", logo: tv("bayerische-motoren-werke"), s: 54 },
	{ name: "Coinbase", logo: tv("coinbase-global"), s: 48 },
	{ name: "Adobe", logo: tv("adobe"), s: 50 },
	{ name: "Microsoft", logo: tv("microsoft"), s: 54 },
	{ name: "Robinhood", logo: tv("robinhood-markets"), s: 46 },
];

/* Deterministic seeded RNG so positions stay stable across renders */
function seededRng(seed: number) {
	let s = seed;
	return () => {
		s = (s * 16807 + 0) % 2147483647;
		return (s - 1) / 2147483646;
	};
}

/* Pre-compute scattered positions + unique bounce directions for each icon */
const ICON_DATA = BRANDS.map((_, i) => {
	const rng = seededRng((i + 1) * 7919);
	const r = () => rng();

	// Scatter across full viewport with good distribution
	// Use a grid-based approach with jitter for even spread
	const cols = 5;
	const rows = Math.ceil(BRANDS.length / cols);
	const col = i % cols;
	const row = Math.floor(i / cols);
	const cellW = 100 / cols;
	const cellH = 100 / rows;

	const x = col * cellW + r() * cellW * 0.7 + cellW * 0.15;
	const y = row * cellH + r() * cellH * 0.7 + cellH * 0.15;

	// Random bounce direction (angle in degrees)
	const angle = r() * 360;
	// Bounce distance — how far to travel (in vw units)
	const dist = 3 + r() * 6;
	// Bounce + drift speed
	const duration = 4 + r() * 5;
	// Animation delay so they don't all move in sync
	const delay = r() * -duration;
	// Slight rotation range
	const rot = -15 + r() * 30;

	// dx/dy from angle
	const dx = Math.cos((angle * Math.PI) / 180) * dist;
	const dy = Math.sin((angle * Math.PI) / 180) * dist;

	return { x, y, dx, dy, duration, delay, rot };
});

/* Generate CSS keyframes for each icon's unique bounce path */
const keyframesCSS = ICON_DATA.map((d, i) => {
	return `@keyframes scatter-${i} {
  0%, 100% {
    translate: 0px 0px;
    rotate: 0deg;
    scale: 1;
  }
  25% {
    translate: ${d.dx.toFixed(1)}vw ${(d.dy * 0.6).toFixed(1)}vh;
    rotate: ${(d.rot * 0.5).toFixed(1)}deg;
    scale: 1.05;
  }
  50% {
    translate: ${(d.dx * 0.3).toFixed(1)}vw ${d.dy.toFixed(1)}vh;
    rotate: ${d.rot.toFixed(1)}deg;
    scale: 0.95;
  }
  75% {
    translate: ${(-d.dx * 0.4).toFixed(1)}vw ${(d.dy * 0.2).toFixed(1)}vh;
    rotate: ${(-d.rot * 0.7).toFixed(1)}deg;
    scale: 1.03;
  }
}`;
}).join("\n");

export function FloatingBrands() {
	return (
		<>
			<div className="absolute inset-0 overflow-hidden pointer-events-none select-none" aria-hidden>
				{BRANDS.map((brand, i) => {
					const d = ICON_DATA[i];
					return (
						<div
							key={brand.name}
							className="absolute"
							style={{
								left: `${d.x.toFixed(1)}%`,
								top: `${d.y.toFixed(1)}%`,
								width: brand.s,
								height: brand.s,
								animation: `scatter-${i} ${d.duration.toFixed(1)}s ease-in-out ${d.delay.toFixed(1)}s infinite`,
								opacity: 0.4,
							}}
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
					);
				})}
			</div>
			<style>{keyframesCSS}</style>
		</>
	);
}
