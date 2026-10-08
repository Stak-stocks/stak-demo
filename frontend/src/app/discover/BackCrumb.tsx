import { cn } from "@/lib/utils";
import { D } from "./assets";

/** "Frame 1618869185": 40px round Back button, 31px gap, breadcrumb in Geist Medium 16 #819abb (two spaces around the slash). */
export function BackCrumb({ crumb, onBack, className }: { crumb: string; onBack: () => void; className?: string }) {
	return (
		<div className={cn("flex flex-col items-start gap-[31px]", className)}>
			<button
				type="button"
				aria-label="Back"
				onClick={onBack}
				className="flex size-[40px] items-center justify-center overflow-clip rounded-[20px] bg-[#192238]"
			>
				<img alt="" src={D.chevron} className="size-[22px]" />
			</button>
			<p className="whitespace-pre font-geist text-[16px] font-medium leading-[21px] text-[#819abb]">{crumb}</p>
		</div>
	);
}
