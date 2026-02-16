const fl = (d: string) => `https://www.google.com/s2/favicons?domain=${d}&sz=128`;

// Seeded pseudo-random for deterministic values per icon
function seededRandom(seed: number) {
	let s = seed;
	return () => {
		s = (s * 16807 + 0) % 2147483647;
		return (s - 1) / 2147483646;
	};
}

function randRange(rng: () => number, min: number, max: number) {
	return min + rng() * (max - min);
}

const floatingBrands = [
	// Only brands with clear, high-quality favicons
	{ name: "Nike", logo: fl("nike.com"), size: 64, delay: 0 },
	{ name: "Spotify", logo: fl("spotify.com"), size: 56, delay: 1.2 },
	{ name: "Tesla", logo: fl("tesla.com"), size: 62, delay: 0.5 },
	{ name: "Apple", logo: fl("apple.com"), size: 58, delay: 1.8 },
	{ name: "Meta", logo: fl("meta.com"), size: 52, delay: 2.1 },
	{ name: "Netflix", logo: fl("netflix.com"), size: 60, delay: 0.8 },
	{ name: "Google", logo: fl("google.com"), size: 56, delay: 1.5 },
	{ name: "Disney", logo: fl("disney.com"), size: 58, delay: 2.4 },
	{ name: "Uber", logo: fl("uber.com"), size: 52, delay: 0.3 },
	{ name: "Nvidia", logo: fl("nvidia.com"), size: 56, delay: 1.7 },
	{ name: "Amazon", logo: fl("amazon.com"), size: 50, delay: 2 },
	{ name: "Samsung", logo: fl("samsung.com"), size: 54, delay: 2.6 },
	{ name: "Starbucks", logo: fl("starbucks.com"), size: 50, delay: 0.4 },
	{ name: "PayPal", logo: fl("paypal.com"), size: 48, delay: 2.3 },
	{ name: "Airbnb", logo: fl("airbnb.com"), size: 52, delay: 1.1 },
	{ name: "Shopify", logo: fl("shopify.com"), size: 50, delay: 2.8 },
	{ name: "Oracle", logo: fl("oracle.com"), size: 50, delay: 0.9 },
	{ name: "Mastercard", logo: fl("mastercard.com"), size: 54, delay: 1.4 },
	{ name: "Snapchat", logo: fl("snapchat.com"), size: 50, delay: 2.5 },
	{ name: "Reddit", logo: fl("reddit.com"), size: 54, delay: 1.0 },
	{ name: "Pinterest", logo: fl("pinterest.com"), size: 48, delay: 1.8 },
	{ name: "Dropbox", logo: fl("dropbox.com"), size: 48, delay: 1.1 },
	{ name: "Honda", logo: fl("honda.com"), size: 52, delay: 1.6 },
	{ name: "BMW", logo: fl("bmw.com"), size: 58, delay: 0.8 },
	{ name: "Porsche", logo: fl("porsche.com"), size: 54, delay: 2.3 },
	{ name: "Louis Vuitton", logo: fl("louisvuitton.com"), size: 52, delay: 0.3 },
	{ name: "Rolex", logo: fl("rolex.com"), size: 56, delay: 2.1 },
];

// Pre-compute unique wandering paths for each brand
const brandAnimations = floatingBrands.map((_, i) => {
	const rng = seededRandom((i + 1) * 7919);

	// Allow positions to go slightly off-screen (-8 to 95)
	const startX = randRange(rng, -8, 95);
	const startY = randRange(rng, -8, 95);

	const duration = randRange(rng, 20, 40);

	// Waypoints can bleed off edges
	const waypoints = Array.from({ length: 5 }, () => ({
		x: randRange(rng, -10, 98),
		y: randRange(rng, -10, 98),
		rot: randRange(rng, -12, 12),
		scale: randRange(rng, 0.9, 1.1),
	}));

	return { startX, startY, duration, waypoints };
});

// Generate keyframes using viewport positions (vw/vh)
const keyframesCSS = brandAnimations
	.map((anim, i) => {
		const [w1, w2, w3, w4, w5] = anim.waypoints;
		return `@keyframes drift-${i} {
  0% { left: ${anim.startX.toFixed(1)}vw; top: ${anim.startY.toFixed(1)}vh; transform: rotate(0deg) scale(1); }
  20% { left: ${w1.x.toFixed(1)}vw; top: ${w1.y.toFixed(1)}vh; transform: rotate(${w1.rot.toFixed(1)}deg) scale(${w1.scale.toFixed(2)}); }
  40% { left: ${w2.x.toFixed(1)}vw; top: ${w2.y.toFixed(1)}vh; transform: rotate(${w2.rot.toFixed(1)}deg) scale(${w2.scale.toFixed(2)}); }
  60% { left: ${w3.x.toFixed(1)}vw; top: ${w3.y.toFixed(1)}vh; transform: rotate(${w3.rot.toFixed(1)}deg) scale(${w3.scale.toFixed(2)}); }
  80% { left: ${w4.x.toFixed(1)}vw; top: ${w4.y.toFixed(1)}vh; transform: rotate(${w4.rot.toFixed(1)}deg) scale(${w4.scale.toFixed(2)}); }
  100% { left: ${w5.x.toFixed(1)}vw; top: ${w5.y.toFixed(1)}vh; transform: rotate(${w5.rot.toFixed(1)}deg) scale(${w5.scale.toFixed(2)}); }
}`;
	})
	.join("\n");

export function FloatingBrands() {
	return (
		<>
			{floatingBrands.map((brand, i) => {
				const anim = brandAnimations[i];
				return (
					<div
						key={brand.name}
						className="absolute opacity-[0.45] pointer-events-none"
						style={{
							left: `${anim.startX}vw`,
							top: `${anim.startY}vh`,
							width: brand.size,
							height: brand.size,
							animation: `drift-${i} ${anim.duration.toFixed(1)}s ease-in-out infinite alternate`,
							animationDelay: `${brand.delay}s`,
						}}
					>
						<img
							src={brand.logo}
							alt={brand.name}
							className="w-full h-full object-contain rounded-lg"
							loading="lazy"
						/>
					</div>
				);
			})}
			<style>{keyframesCSS}</style>
		</>
	);
}
