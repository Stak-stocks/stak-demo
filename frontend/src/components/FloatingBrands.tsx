const fl = (d: string) => `https://www.google.com/s2/favicons?domain=${d}&sz=128`;

const floatingBrands = [
	{ name: "Nike", logo: fl("nike.com"), x: 8, y: 12, size: 44, delay: 0 },
	{ name: "Spotify", logo: fl("spotify.com"), x: 25, y: 6, size: 38, delay: 1.2 },
	{ name: "Tesla", logo: fl("tesla.com"), x: 78, y: 8, size: 42, delay: 0.5 },
	{ name: "Apple", logo: fl("apple.com"), x: 90, y: 20, size: 36, delay: 1.8 },
	{ name: "Meta", logo: fl("meta.com"), x: 5, y: 45, size: 34, delay: 2.1 },
	{ name: "Netflix", logo: fl("netflix.com"), x: 88, y: 55, size: 40, delay: 0.8 },
	{ name: "Google", logo: fl("google.com"), x: 15, y: 75, size: 36, delay: 1.5 },
	{ name: "Disney", logo: fl("disney.com"), x: 82, y: 78, size: 38, delay: 2.4 },
	{ name: "AMD", logo: fl("amd.com"), x: 70, y: 15, size: 32, delay: 1 },
	{ name: "Uber", logo: fl("uber.com"), x: 35, y: 85, size: 34, delay: 0.3 },
	{ name: "Nvidia", logo: fl("nvidia.com"), x: 60, y: 88, size: 36, delay: 1.7 },
	{ name: "Amazon", logo: fl("amazon.com"), x: 48, y: 5, size: 32, delay: 2 },
	{ name: "Microsoft", logo: fl("microsoft.com"), x: 42, y: 35, size: 34, delay: 0.7 },
	{ name: "Adidas", logo: fl("adidas.com"), x: 55, y: 60, size: 38, delay: 1.9 },
	{ name: "Samsung", logo: fl("samsung.com"), x: 18, y: 55, size: 36, delay: 2.6 },
	{ name: "Starbucks", logo: fl("starbucks.com"), x: 72, y: 42, size: 32, delay: 0.4 },
	{ name: "PayPal", logo: fl("paypal.com"), x: 38, y: 18, size: 30, delay: 2.3 },
	{ name: "Airbnb", logo: fl("airbnb.com"), x: 65, y: 70, size: 34, delay: 1.1 },
	{ name: "Twitter", logo: fl("x.com"), x: 92, y: 40, size: 30, delay: 1.6 },
	{ name: "Shopify", logo: fl("shopify.com"), x: 3, y: 30, size: 32, delay: 2.8 },
];

export function FloatingBrands() {
	return (
		<>
			{floatingBrands.map((brand) => (
				<div
					key={brand.name}
					className="absolute rounded-2xl opacity-[0.07] dark:opacity-20 overflow-hidden pointer-events-none bg-black/5 dark:bg-white/10 p-1.5"
					style={{
						left: `${brand.x}%`,
						top: `${brand.y}%`,
						width: brand.size,
						height: brand.size,
						animation: `float ${6 + brand.delay}s ease-in-out infinite`,
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
			))}
			<style>{`
				@keyframes float {
					0%, 100% { transform: translateY(0px); }
					50% { transform: translateY(-12px); }
				}
			`}</style>
		</>
	);
}
