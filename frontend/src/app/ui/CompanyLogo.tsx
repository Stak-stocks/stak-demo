import { useState } from "react";
import { companyInitial, companyName, logoSources } from "@/app/live/catalog";
import { cn } from "@/lib/utils";

type Props = { ticker: string; size: number; rounded?: number; className?: string };

/**
 * A company logo from the catalog's source chain (Brandfetch CDN, then the catalog's own logo,
 * then a favicon); when every image fails, the initial letter on the frames' avatar grey.
 */
export function CompanyLogo({ ticker, size, rounded = 12, className }: Props) {
	const sources = logoSources(ticker);
	const chain = sources ? [sources.primary, sources.fallback, sources.ultimate] : [];
	const [step, setStep] = useState(0);
	const src = chain[step];
	if (!src) {
		return (
			<span
				className={cn("flex shrink-0 items-center justify-center bg-[#242b3d] font-sora font-semibold text-[#9eadc7]", className)}
				style={{ width: size, height: size, borderRadius: rounded, fontSize: Math.round(size * 0.42), lineHeight: 1 }}
				aria-label={companyName(ticker)}
			>
				{companyInitial(ticker)}
			</span>
		);
	}
	return (
		<img
			key={src}
			alt={`${companyName(ticker)} logo`}
			src={src}
			width={size}
			height={size}
			loading="lazy"
			decoding="async"
			referrerPolicy="no-referrer"
			onError={() => setStep((s) => s + 1)}
			className={cn("shrink-0 object-contain", className)}
			style={{ width: size, height: size, borderRadius: rounded }}
		/>
	);
}
