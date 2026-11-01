import StakLogoWhite from "@/assets/stak-logo-icon.svg?react";
import stakLogoColor from "@/assets/stak-logo-color.svg";

interface StakLogoProps {
	size?: number;
	className?: string;
}

export function StakLogo({ size = 28, className = "" }: StakLogoProps) {
	return (
		<>
			<StakLogoWhite width={size} height={size} className={`hidden dark:block ${className}`} />
			<img src={stakLogoColor} alt="STAK" width={size} height={size} className={`block dark:hidden ${className}`} />
		</>
	);
}
